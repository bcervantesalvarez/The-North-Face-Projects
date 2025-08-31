// tables.js — render Hourly Table (and clear Weekly; weekly filled elsewhere)
import { $, fmtMoney } from "../core/dom.js";
import { state } from "../core/state.js";

export function renderTables() {
  const tbody = $("#tbl tbody"); if(!tbody) return;
  tbody.innerHTML = "";
  let cum = 0, cumTgt = 0;

  state.hourly.forEach(r=>{
    const s = Number(r.sales)||0;
    const t = r.time||"";
    const tx= Number(r.txns)||0;
    const u = Number(r.units)||0;
    const hT= Number(r.hTarget)||0;
    const ly= Number(r.ly)||0;
    const traf=Number(r.traffic)||0;
    const tt= Number(r.tTarget)||0;

    cum += s; cumTgt += hT;
    const ads = tx? s/tx:NaN;
    const upt = tx? u/tx:NaN;
    const dHT = Number.isFinite(hT)&&Number.isFinite(s)? s-hT:NaN;
    const dTT = Number.isFinite(cumTgt)&&Number.isFinite(cum)? cum-cumTgt:NaN;

    const tr=document.createElement("tr");
    tr.innerHTML = `<td>${t}</td>
      <td>${Number.isFinite(s)?fmtMoney.format(s):""}</td>
      <td>${tx||""}</td>
      <td>${u||""}</td>
      <td>${Number.isFinite(ads)?fmtMoney.format(ads):""}</td>
      <td>${Number.isFinite(upt)?upt.toFixed(2):""}</td>
      <td>${Number.isFinite(hT)?fmtMoney.format(hT):""}</td>
      <td>${Number.isFinite(dHT)?(dHT>=0?"+":"")+fmtMoney.format(dHT):""}</td>
      <td>${Number.isFinite(ly)?fmtMoney.format(ly):""}</td>
      <td>${traf||""}</td>
      <td>${Number.isFinite(tt)?fmtMoney.format(tt):""}</td>
      <td>${fmtMoney.format(cum)}</td>
      <td>${Number.isFinite(dTT)?(dTT>=0?"+":"")+fmtMoney.format(dTT):""}</td>`;
    tbody.appendChild(tr);
  });

  const tbodyW = $("#tblWeek tbody"); if (tbodyW) tbodyW.innerHTML = "";
}
