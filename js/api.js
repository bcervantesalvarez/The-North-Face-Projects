// api.js — stable surface for other scripts (manual-input.js, library-tools.js)
import { $ } from "./core/dom.js";
import { state } from "./core/state.js";

let renderAllHook = ()=>{};
export function setRenderAll(fn){ renderAllHook = fn || (()=>{}); }

function populateTimeFilters(){
  const selStart = $("#selStart"), selEnd = $("#selEnd");
  if(!selStart || !selEnd) return;
  selStart.innerHTML = state.hourly.map((r,i)=>`<option value="${i}">${r.time||""}</option>`).join("");
  selEnd.innerHTML   = state.hourly.map((r,i)=>`<option value="${i}">${r.time||""}</option>`).join("");
  state.filters.startIdx=0; state.filters.endIdx=state.hourly.length?state.hourly.length-1:0;
}

function setStatus(ok,msg){
  const chip = $("#statusChip");
  chip?.classList?.toggle("error", !ok);
  chip?.classList?.toggle("ready", !!ok);
  if (chip) chip.textContent = `Status: ${msg}`;
}

window.dashboardAPI = {
  loadDataset(ds){
    state.hourly = Array.isArray(ds?.hourly)? ds.hourly.slice(): [];
    state.wtd    = ds?.wtd || {};
    state.meta   = ds?.meta || {};
    populateTimeFilters();
    renderAllHook();
    setStatus(true, "Ready");
  },
  getDataset(){ return { hourly:state.hourly.slice(), wtd: {...state.wtd}, meta:{...state.meta} }; }
};
