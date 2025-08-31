/* Hourly Sales Dashboard — main app
   Updates in this version:
   - Uses your provided SVGs in TNF Red for: swap, drop file, expand plot
   - Hourly Detail (#wrap-table) and Weekly Summary (#wrap-week) load in normal size (not wide)
   - Keeps swap-mode (dashed highlight + tooltip), reset-to-blank, and diagnostics
*/

/* ========== Tiny DOM helpers ========== */
const $  = (sel, p=document) => p.querySelector(sel);
const $$ = (sel, p=document) => Array.from(p.querySelectorAll(sel));

/* ========== Theme / Status ========== */
const TNF_RED = "#EF3224";
const TNF_WHITE = "#FFFFFF";
const statusChip = $("#statusChip");
function setStatus(ok, msg) {
  if (!statusChip) return;
  statusChip.classList.toggle("ready", !!ok);
  statusChip.classList.toggle("error", !ok);
  statusChip.textContent = "Status: " + (ok ? (msg || "Ready") : (msg || "Error"));
}
function libsOk() { return !!window.Chart; }

/* ========== SVGs (TNF Red) ========== */
function svgSwapTNF(size=16){
  return `
  <svg viewBox="0 0 48 48" width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg" fill="${TNF_WHITE}">
    <g id="SVGRepo_iconCarrier">
      <title>Swap position</title>
      <g data-name="icons Q2">
        <path d="M36.4,28.6l-4.9-5a2.1,2.1,0,0,0-2.7-.2,1.9,1.9,0,0,0-.2,3L30.2,28H15a2,2,0,0,0,0,4H30.2l-1.6,1.6a1.9,1.9,0,0,0,.2,3,2.1,2.1,0,0,0,2.7-.2l4.9-5A1.9,1.9,0,0,0,36.4,28.6Z"></path>
        <path d="M33,16H17.8l1.6-1.6a1.9,1.9,0,0,0-.2-3,2.1,2.1,0,0,0-2.7.2l-4.9,5a1.9,1.9,0,0,0,0,2.8l4.9,5a2.1,2.1,0,0,0,2.7.2,1.9,1.9,0,0,0,.2-3L17.8,20H33a2,2,0,0,0,0-4Z"></path>
        <path d="M42,24A18,18,0,1,1,24,6,18.1,18.1,0,0,1,42,24m4,0A22,22,0,1,0,24,46,21.9,21.9,0,0,0,46,24Z"></path>
      </g>
    </g>
  </svg>`;
}
function svgDropFileTNF(size=50){
  return `
  <svg viewBox="0 0 24 24" width="${size}" height="${size}" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M19 15V21M19 21L17 19M19 21L21 19M13 3H8.2C7.0799 3 6.51984 3 6.09202 3.21799C5.71569 3.40973 5.40973 3.71569 5.21799 4.09202C5 4.51984 5 5.0799 5 6.2V17.8C5 18.9201 5 19.4802 5.21799 19.908C5.40973 20.2843 5.71569 20.5903 6.09202 20.782C6.51984 21 7.0799 21 8.2 21H14M13 3L19 9M13 3V7.4C13 7.96005 13 8.24008 13.109 8.45399C13.2049 8.64215 13.3578 8.79513 13.546 8.89101C13.7599 9 14.0399 9 14.6 9H19M19 9V11M9 17H13M9 13H15M9 9H10"
      stroke="${TNF_WHITE}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"></path>
  </svg>`;
}
function svgExpandTNF(size=16){
  return `
  <svg viewBox="0 0 24 24" width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg" fill="${TNF_WHITE}">
    <path d="M2,3V21a1,1,0,0,0,1,1H21a1,1,0,0,0,1-1V3a1,1,0,0,0-1-1H3A1,1,0,0,0,2,3ZM4,4H20V20H10V15a1,1,0,0,0-1-1H4ZM4,16H8v4H4Zm7.293-3.293a1,1,0,0,1,0-1.414L14.086,8.5H13a1,1,0,0,1,0-2h3.5a1,1,0,0,1,.923.618A1.01,1.01,0,0,1,17.5,7.5V11a1,1,0,0,1-2,0V9.914l-2.793,2.793a1,1,0,0,1-1.414,0Z"></path>
  </svg>`;
}

/* ========== Formatters ========== */
const fmt = new Intl.NumberFormat(undefined, { style: "currency", currency: "USD", maximumFractionDigits: 0 });
const num = (v, d=0) => (Number.isFinite(v) ? v.toFixed(d) : "—");
const pct = (v, d=1) => (Number.isFinite(v) ? (v*100).toFixed(d) + "%" : "—");

/* ========== App State ========== */
let hourly = [];
let wtd    = {};
let datasetMeta = {};
const filters = { startIdx: 0, endIdx: 0, minTxn: 0, showTarget: true, showLY: true };

let chartHourly = null, chartCume = null, chartTU = null, chartEff = null;

/* ========== DOM Refs for inputs ========== */
const selStart     = $("#selStart");
const selEnd       = $("#selEnd");
const minTxn       = $("#minTxn");
const optShowTarget= $("#optShowTarget");
const optShowLY    = $("#optShowLY");

/* View toggles */
const viewToggles = {
  "wrap-hourly": $("#toggleHourly"),
  "wrap-cume":   $("#toggleCume"),
  "wrap-tu":     $("#toggleTU"),
  "wrap-eff":    $("#toggleEff"),
  "wrap-table":  $("#toggleTable"),
  "wrap-week":   $("#toggleWeek"),
};

/* ========== Helpers ========== */
function cumulative(a) {
  let s = 0;
  return a.map(v => { if (!Number.isFinite(v)) return NaN; s += v; return s; });
}

/* ========== Time Window + Filters ========== */
function populateTimeWindow() {
  if (!hourly.length || !selStart || !selEnd) return;
  const opts = hourly.map((r, i) => `<option value="${i}">${r.time || ("Hour " + (i+1))}</option>`).join("");
  selStart.innerHTML = opts;
  selEnd.innerHTML   = opts;
  selStart.value = "0";
  selEnd.value   = String(hourly.length-1);
  filters.startIdx = 0;
  filters.endIdx   = hourly.length-1;
}
function readFilters() {
  if (selStart) filters.startIdx = Math.max(0, Number(selStart.value ?? 0));
  if (selEnd)   filters.endIdx   = Math.min(hourly.length-1, Number(selEnd.value ?? hourly.length-1));
  if (filters.endIdx < filters.startIdx) filters.endIdx = filters.startIdx;
  if (minTxn)   filters.minTxn   = Math.max(0, Number(minTxn.value ?? 0));
  filters.showTarget = !!optShowTarget?.checked;
  filters.showLY     = !!optShowLY?.checked;
}
["change","input"].forEach(ev=>{
  selStart?.addEventListener(ev, ()=>{ readFilters(); renderAll(); });
  selEnd  ?.addEventListener(ev, ()=>{ readFilters(); renderAll(); });
  minTxn  ?.addEventListener(ev, ()=>{ readFilters(); renderAll(); });
  optShowTarget?.addEventListener(ev, ()=>{ readFilters(); renderAll(); });
  optShowLY    ?.addEventListener(ev, ()=>{ readFilters(); renderAll(); });
});

/* ========== Tables ========== */
function renderDetailTable() {
  const tbody = $("#tbl tbody");
  if (!tbody) return;
  tbody.innerHTML = "";
  const data     = getFiltered();
  const labels   = data.map(r=>r.time||"");
  const sales    = data.map(r=>r.sales);
  const targetHr = filters.showTarget ? data.map(r=> (Number.isFinite(r.hTarget) ? r.hTarget : NaN)) : data.map(()=>NaN);
  const anyTT    = filters.showTarget && data.some(r=> Number.isFinite(r.tTarget));
  const cSales   = cumulative(sales);
  const cTarget  = filters.showTarget ? (anyTT? data.map(r=> (Number.isFinite(r.tTarget)? r.tTarget : NaN)) : cumulative(targetHr)) : data.map(()=>NaN);
  const ly       = filters.showLY ? data.map(r=>r.ly) : data.map(()=>NaN);
  const txns     = data.map(r=>r.txns);
  const units    = data.map(r=>r.units);
  const ads      = data.map((r,i)=> (Number.isFinite(txns[i])&&txns[i]>0)? r.sales/txns[i] : NaN);
  const upt      = data.map((r,i)=> (Number.isFinite(txns[i])&&txns[i]>0&&Number.isFinite(units[i]))? units[i]/txns[i] : NaN);
  const conv     = data.map((r,i)=> (Number.isFinite(r.traffic)&&r.traffic>0&&Number.isFinite(txns[i]))? txns[i]/r.traffic : NaN);

  for (let i=0;i<labels.length;i++){
    const tr = document.createElement("tr");
    const varHr = (Number.isFinite(sales[i]) && Number.isFinite(targetHr[i])) ? (sales[i]-targetHr[i]) : NaN;
    const varCum= (Number.isFinite(cSales[i]) && Number.isFinite(cTarget[i])) ? (cSales[i]-cTarget[i]) : NaN;
    tr.innerHTML = `
      <td style="text-align:left">${labels[i]}</td>
      <td>${Number.isFinite(sales[i]) ? fmt.format(sales[i]) : "—"}</td>
      <td>${Number.isFinite(targetHr[i]) ? fmt.format(targetHr[i]) : "—"}</td>
      <td>${Number.isFinite(varHr) ? ((varHr>=0?"+":"")+fmt.format(varHr)) : "—"}</td>
      <td>${Number.isFinite(txns[i]) ? num(txns[i]) : "—"}</td>
      <td>${Number.isFinite(units[i]) ? num(units[i]) : "—"}</td>
      <td>${Number.isFinite(ads[i])   ? fmt.format(ads[i]) : "—"}</td>
      <td>${Number.isFinite(upt[i])   ? num(upt[i],2) : "—"}</td>
      <td>${Number.isFinite(conv[i])  ? pct(conv[i]) : "—"}</td>
      <td>${Number.isFinite(cSales[i]) ? fmt.format(cSales[i]) : "—"}</td>
      <td>${Number.isFinite(cTarget[i]) ? fmt.format(cTarget[i]) : "—"}</td>
      <td>${Number.isFinite(varCum) ? ((varCum>=0?"+":"")+fmt.format(varCum)) : "—"}</td>
      <td>${Number.isFinite(ly[i]) ? fmt.format(ly[i]) : "—"}</td>`;
    tbody.appendChild(tr);
  }
}

/* ========== Data accessors ========== */
function getFiltered() {
  const s = filters.startIdx, e = filters.endIdx;
  return hourly.slice(s, e+1).filter(r=>{
    if (!Number.isFinite(filters.minTxn)) return true;
    if (!Number.isFinite(r.txns)) return true;
    return r.txns >= filters.minTxn;
  });
}

/* ========== Charts ========== */
const fmtYAxis = v => fmt.format(v);
function destroyCharts(){
  [chartHourly, chartCume, chartTU, chartEff].forEach(c=>{ try{ c?.destroy(); }catch{} });
  chartHourly = chartCume = chartTU = chartEff = null;
}
function renderAll(){
  setStatus(libsOk());
  renderKPIs();

  if (!hourly.length || !window.Chart){
    destroyCharts(); renderDetailTable();
    return;
  }

  const data     = getFiltered();
  const labels   = data.map(r=>r.time||"");
  const sales    = data.map(r=>r.sales);
  const targetHr = filters.showTarget ? data.map(r=> (Number.isFinite(r.hTarget) ? r.hTarget : NaN)) : data.map(()=>NaN);
  const anyTT    = filters.showTarget && data.some(r=> Number.isFinite(r.tTarget));
  const cSales   = cumulative(sales);
  const cTarget  = filters.showTarget ? (anyTT? data.map(r=> (Number.isFinite(r.tTarget)? r.tTarget : NaN)) : cumulative(targetHr)) : data.map(()=>NaN);
  const ly       = filters.showLY ? data.map(r=>r.ly) : data.map(()=>NaN);
  const txns     = data.map(r=>r.txns);
  const units    = data.map(r=>r.units);
  const ads      = data.map((r,i)=> (Number.isFinite(txns[i])&&txns[i]>0)? r.sales/txns[i] : NaN);
  const upt      = data.map((r,i)=> (Number.isFinite(txns[i])&&txns[i]>0&&Number.isFinite(units[i]))? units[i]/txns[i] : NaN);
  const conv     = data.map((r,i)=> (Number.isFinite(r.traffic)&&r.traffic>0&&Number.isFinite(txns[i]))? txns[i]/r.traffic : NaN);

  destroyCharts();

  chartHourly = new Chart($("#barHourly"), {
    type: "bar",
    data: {
      labels,
      datasets: [
        { label:"Sales", data:sales, backgroundColor:"rgba(239,50,36,.65)", borderRadius:6 },
        { label:"Target (hr)", data:targetHr, type:"line", borderColor:"#FECACA", backgroundColor:"rgba(254,202,202,.18)", fill:true, tension:.2, pointRadius:2 }
      ]
    },
    options:{
      responsive:true, maintainAspectRatio:false,
      plugins:{ legend:{ labels:{ color:"#d5d9df" } } },
      scales:{ x:{ ticks:{color:"#b8bec7"}, grid:{color:"rgba(255,255,255,.05)"} },
               y:{ ticks:{color:"#b8bec7", callback:fmtYAxis}, grid:{color:"rgba(255,255,255,.05)"}, beginAtZero:true } }
    }
  });

  chartCume = new Chart($("#lineCume"), {
    type:"line",
    data:{ labels, datasets:[
      { label:"Cumulative Sales", data:cSales, borderColor:"#60A5FA", backgroundColor:"rgba(96,165,250,.16)", fill:true, tension:.2, pointRadius:2 },
      { label:"Cumulative Target", data:cTarget, borderColor:"#F59E0B", backgroundColor:"rgba(245,158,11,.12)", fill:true, tension:.2, pointRadius:2 },
      { label:"Last Year", data:ly, borderColor:"#A78BFA", backgroundColor:"rgba(167,139,250,.12)", fill:true, tension:.2, pointRadius:2 }
    ]},
    options:{ responsive:true, maintainAspectRatio:false, plugins:{legend:{labels:{color:"#d5d9df"}}},
      scales:{ x:{ ticks:{color:"#b8bec7"}, grid:{color:"rgba(255,255,255,.05)"} },
               y:{ ticks:{color:"#b8bec7", callback:fmtYAxis}, grid:{color:"rgba(255,255,255,.05)"}, beginAtZero:true } } }
  });

  chartTU = new Chart($("#barTU"), {
    type:"bar",
    data:{ labels, datasets:[
      { label:"Transactions", data:txns, backgroundColor:"rgba(239,50,36,.65)", borderRadius:6 },
      { label:"Units",        data:units, backgroundColor:"rgba(239,50,36,.30)", borderColor:"rgba(239,50,36,.8)", borderWidth:1 }
    ]},
    options:{ responsive:true, maintainAspectRatio:false, plugins:{legend:{labels:{color:"#d5d9df"}}},
      scales:{ x:{ticks:{color:"#b8bec7"},grid:{color:"rgba(255,255,255,.05)"}}, y:{ticks:{color:"#b8bec7"},grid:{color:"rgba(255,255,255,.05)"}, beginAtZero:true} } }
  });

  chartEff = new Chart($("#lineEff"), {
    type:"line",
    data:{ labels, datasets:[
      { label:"Conversion %", data:conv.map(v=>Number.isFinite(v)? v*100:NaN), yAxisID:"y",  borderColor:"#93c5fd", backgroundColor:"rgba(147,197,253,.15)", fill:true, tension:.2, pointRadius:2 },
      { label:"ADS ($)",      data:ads,                                      yAxisID:"y1", borderColor:"#f97316", backgroundColor:"rgba(249,115,22,.12)", fill:true, tension:.2, pointRadius:2 },
      { label:"UPT",          data:upt,                                      yAxisID:"y1", borderColor:"#a78bfa", backgroundColor:"rgba(167,139,250,.12)", fill:true, tension:.2, pointRadius:2 },
    ]},
    options:{ responsive:true, maintainAspectRatio:false, plugins:{legend:{labels:{color:"#d5d9df"}}},
      scales:{ x:{ticks:{color:"#b8bec7"},grid:{color:"rgba(255,255,255,.05)"}},
               y:{position:"left",  ticks:{color:"#b8bec7", callback:v=>v+"%"}, grid:{color:"rgba(255,255,255,.05)"}, suggestedMin:0, suggestedMax:100},
               y1:{position:"right", ticks:{color:"#b8bec7"}, grid:{drawOnChartArea:false}, suggestedMin:0} } }
  });

  renderDetailTable();
  requestAnimationFrame(resizeCharts);
}

/* ========== KPIs ========== */
function renderKPIs(){
  const data = getFiltered();
  if (!data.length){
    setKPI("#kpi_day_sales","—"); setKPI("#kpi_day_target","—"); setKPI("#kpi_vs_ly","—");
    setKPI("#kpi_ads","—"); setKPI("#kpi_upt","—"); setKPI("#kpi_conv","—");
    setDelta("#kpi_day_target_var", null); setDelta("#kpi_vs_ly_delta", null);
    $("#kpi_day_target_var2") && ($("#kpi_day_target_var2").textContent="");
    return;
  }
  const sales = data.map(r=>r.sales).filter(Number.isFinite).reduce((s,v)=>s+v,0);
  const targetArr = filters.showTarget ? data.map(r=>r.hTarget).filter(Number.isFinite) : [];
  const lyArr     = filters.showLY ? data.map(r=>r.ly).filter(Number.isFinite) : [];
  const dayTarget = targetArr.length ? targetArr.reduce((s,v)=>s+v,0) : NaN;
  const vsLY      = lyArr.length ? (sales - lyArr.reduce((s,v)=>s+v,0)) : NaN;

  const tx = data.map(r=>r.txns).filter(Number.isFinite).reduce((s,v)=>s+v,0);
  const un = data.map(r=>r.units).filter(Number.isFinite).reduce((s,v)=>s+v,0);
  const tr = data.map(r=>r.traffic).filter(Number.isFinite).reduce((s,v)=>s+v,0);
  const ads = tx>0 ? sales/tx : NaN;
  const upt = tx>0 && Number.isFinite(un) ? un/tx : NaN;
  const conv= tr>0 ? tx/tr : NaN;

  setKPI("#kpi_day_sales", fmt.format(sales));
  setKPI("#kpi_day_target", Number.isFinite(dayTarget)? fmt.format(dayTarget):"—");
  setKPI("#kpi_vs_ly", Number.isFinite(vsLY) ? ((vsLY>=0?"+":"")+fmt.format(vsLY)) : "—");
  setKPI("#kpi_ads", Number.isFinite(ads) ? fmt.format(ads) : "—");
  setKPI("#kpi_upt", Number.isFinite(upt) ? num(upt,2) : "—");
  setKPI("#kpi_conv", Number.isFinite(conv) ? pct(conv) : "—");
  setDelta("#kpi_day_target_var", Number.isFinite(dayTarget) ? (sales - dayTarget) : null);
  setDelta("#kpi_vs_ly_delta", Number.isFinite(vsLY) ? vsLY : null);
}
function setKPI(sel, text){ const el=$(sel); if (el) el.textContent = text; }
function setDelta(sel, val){
  const el=$(sel); if (!el) return;
  if (!Number.isFinite(val)){ el.textContent=""; el.classList.remove("positive","negative"); return; }
  el.textContent = (val>=0?"+":"")+fmt.format(val);
  el.classList.toggle("positive", val>=0);
  el.classList.toggle("negative", val<0);
}

/* ========== Order + View toggles ========== */
const plotsGrid = $("#plotsGrid");
const stash     = $("#stash");
function cardItems(){ return $$(".card-item, .placeholder", plotsGrid).filter(el=>getComputedStyle(el).display!=="none"); }
function saveOrder(){ localStorage.setItem("plots:order", cardItems().map(el=>el.id || "ph:"+el.dataset.target).join(",")); }
const DEFAULT_PLOT_ORDER = ["wrap-tu","wrap-hourly","wrap-eff","wrap-cume","wrap-table","wrap-week"];
function restoreOrder(){
  const list=(localStorage.getItem("plots:order")||"").split(",").filter(Boolean);
  const get=id=>$("#"+id);
  if(!list.length){ DEFAULT_PLOT_ORDER.forEach(id=>{ const el=get(id); if(el) plotsGrid.appendChild(el); }); return; }
  list.forEach(key=>{
    if (key.startsWith("ph:")){
      const ph=plotsGrid.querySelector(`.placeholder[data-target="${key.slice(3)}"]`);
      if(ph) plotsGrid.appendChild(ph);
    }else{
      const el=get(key); if(el) plotsGrid.appendChild(el);
    }
  });
  DEFAULT_PLOT_ORDER.forEach(id=>{ const el=get(id); if(el && el.parentElement!==plotsGrid) plotsGrid.appendChild(el); });
}
function makePlaceholder(forId){
  const ph=document.createElement("div"); ph.className="placeholder card-item"; ph.dataset.target=forId;
  ph.innerHTML=`<div class="ph-text">Empty slot for ${forId.replace("wrap-","")}</div>`; return ph;
}
Object.entries(viewToggles).forEach(([id,input])=>{
  if (!input) return;
  const v=localStorage.getItem("view:"+id);
  if (v!==null) input.checked = v==="1";
  input.addEventListener("change", ()=>{ localStorage.setItem("view:"+id, input.checked?"1":"0"); applyViews(); });
});
function applyViews(){
  Object.entries(viewToggles).forEach(([id,input])=>{
    if (!input) return;
    const card=$("#"+id);
    const existing=plotsGrid.querySelector(`.placeholder[data-target="${id}"]`);
    if (input.checked){
      if (existing){ plotsGrid.insertBefore(card, existing); existing.remove(); }
      else { plotsGrid.appendChild(card); }
      stash.contains(card) && plotsGrid.appendChild(card);
      card.style.display="";
    }else{
      if (!existing){ const ph=makePlaceholder(id); plotsGrid.insertBefore(ph, card); }
      card.style.display="none"; stash.appendChild(card);
    }
  });
  saveOrder(); requestAnimationFrame(resizeCharts);
}

/* ========== Sizing / Resizers ========== */
const MINH=260, DEFAULT_H=380, MAXH=820;
function setCardHeight(el,h){
  const clamped=Math.max(MINH,Math.min(MAXH,Math.round(h))); el.style.height=clamped+"px";
  const key=el?.dataset?.sizeKey; if(key) localStorage.setItem("size:"+key, JSON.stringify({h:clamped}));
  requestAnimationFrame(resizeCharts);
}
function columnWidth(){
  const s=getComputedStyle(plotsGrid), gap=parseFloat(s.gap)||18, total=plotsGrid.getBoundingClientRect().width;
  return (total-gap)/2;
}
function applyWideState(card, wide){
  if (!card) return;
  card.classList.toggle("wide", wide);
  if (card.id) localStorage.setItem("wide:"+card.id, wide?"1":"0");
  requestAnimationFrame(resizeCharts);
}
function initWideButtons(){
  $$(".card-item").forEach(card=>{
    const btn=$(".wide-btn",card); if(!btn) return;
    const saved=localStorage.getItem("wide:"+card.id);
    // No default-to-wide; always respect saved, else start normal size
    if (saved==="1") card.classList.add("wide"); else card.classList.remove("wide");
    btn.addEventListener("click", ()=>applyWideState(card,!card.classList.contains("wide")));
  });
}
function attachResizers(el){
  const nub=$(".resize-nub.r-se",el); if(!nub) return;
  const start={x:0,y:0,h:0,w:0,wide:el.classList.contains("wide")};
  function onMove(ev){
    const dy=ev.clientY-start.y; setCardHeight(el,start.h+dy);
    const dx=ev.clientX-start.x; const desiredW=start.w+dx, single=columnWidth(), hysteresis=40;
    if(!start.wide && desiredW>single+hysteresis){ applyWideState(el,true); start.wide=true; }
    else if(start.wide && desiredW<single-hysteresis){ applyWideState(el,false); start.wide=false; }
  }
  function onUp(ev){ el.classList.remove("resizing"); el.releasePointerCapture?.(ev.pointerId); window.removeEventListener("pointermove",onMove); window.removeEventListener("pointerup",onUp); }
  nub.addEventListener("pointerdown",(ev)=>{ const r=el.getBoundingClientRect(); start.x=ev.clientX; start.y=ev.clientY; start.h=r.height; start.w=r.width; el.classList.add("resizing"); el.setPointerCapture?.(ev.pointerId); window.addEventListener("pointermove",onMove,{passive:true}); window.addEventListener("pointerup",onUp,{passive:true}); });
}
$$(".resizable").forEach(attachResizers);
function restoreSizes(){
  $$(".resizable").forEach(el=>{
    const key=el.dataset.sizeKey, saved=key && localStorage.getItem("size:"+key);
    if(saved){ try{ setCardHeight(el, JSON.parse(saved).h); }catch{ setCardHeight(el,DEFAULT_H);} }
    else setCardHeight(el,DEFAULT_H);
  });
}
const resizeCharts = (()=>{ let raf=false; return ()=>{ if(raf) return; raf=true; requestAnimationFrame(()=>{ [chartHourly,chartCume,chartTU,chartEff].forEach(c=>c&&c.resize()); raf=false; }); }; })();
window.addEventListener("resize", resizeCharts);

/* ========== Menus / actions ========== */
function closeMenus(){
  $$(".actions .menu").forEach(menu=>{
    menu.classList.remove("open");
    const trig=$(".menu-trigger",menu); trig?.setAttribute("aria-expanded","false");
  });
}
function bindMenu(prefix){
  const btn=$("#"+prefix+"MenuBtn"), panel=$("#"+prefix+"Menu"), box=btn?.closest(".menu");
  if(!btn||!panel||!box) return;
  const set=open=>{ box.classList.toggle("open",open); btn.setAttribute("aria-expanded", String(open)); };
  btn.addEventListener("click",e=>{ e.stopPropagation(); closeMenus(); set(!box.classList.contains("open")); });
  panel.addEventListener("click",e=>{ e.stopPropagation(); closeMenus(); });
  document.addEventListener("click", ()=>closeMenus());
  document.addEventListener("keydown",(e)=>{ if(e.key==="Escape") closeMenus(); });
}
bindMenu("export"); bindMenu("diag"); bindMenu("tools");
$("#printBtn")?.addEventListener("click", ()=>{ closeMenus(); window.print(); });

/* Export (combined image) */
async function exportCharts(fmt="png"){
  const canvases = [$("#barTU"),$("#barHourly"),$("#lineEff"),$("#lineCume")].filter(c=>c instanceof HTMLCanvasElement);
  if (!canvases.length){ alert("No charts to export yet."); return; }
  [chartHourly,chartCume,chartTU,chartEff].forEach(c=>c&&c.update());
  await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));
  const widths  = canvases.map(c=>c.width||Math.round(c.getBoundingClientRect().width));
  const heights = canvases.map(c=>c.height||Math.round(c.getBoundingClientRect().height));
  const w = Math.max(...widths), gap=20, h=heights.reduce((s,v)=>s+v,0)+gap*(canvases.length-1)+40;
  const combined=document.createElement("canvas"); combined.width=w; combined.height=h; const ctx=combined.getContext("2d");
  ctx.fillStyle="#0f1012"; ctx.fillRect(0,0,w,h);
  let y=20;
  canvases.forEach(c=>{ const cw=c.width||Math.round(c.getBoundingClientRect().width); const ch=c.height||Math.round(c.getBoundingClientRect().height); const x=Math.floor((w-cw)/2); ctx.drawImage(c,x,y,cw,ch); y+=ch+gap; });
  const mime=(fmt==="jpeg"||fmt==="jpg")? "image/jpeg":"image/png"; const ext=mime==="image/jpeg"?"jpg":"png";
  const a=document.createElement("a"); a.href=combined.toDataURL(mime,0.95); a.download=`sales_charts.${ext}`; document.body.appendChild(a); a.click(); a.remove();
}
$("#exportPng")?.addEventListener("click", ()=>{ exportCharts("png"); closeMenus(); });
$("#exportJpg")?.addEventListener("click", ()=>{ exportCharts("jpeg"); closeMenus(); });

/* ========== Swap Mode (dashed highlight + tooltip) ========== */
(function injectSwapStyles(){
  const css = `
    .swap-mode .card-item { cursor: crosshair; }
    .card-item.is-swap-source, .card-item.is-swap-hover { outline:2px dashed ${TNF_RED}; outline-offset:4px; }
    .reorder-btn.swap-armed, .tile-reorder-btn.swap-armed { outline:2px dashed ${TNF_RED}; }
    .swap-tip { position:fixed; z-index:1000; pointer-events:none; background:#111; color:#e8eaee;
      border:1px dashed ${TNF_RED}; border-radius:8px; padding:6px 8px; font-size:12px; box-shadow:0 6px 18px rgba(0,0,0,.35); }
  `;
  const s = document.createElement("style"); s.textContent = css; document.head.appendChild(s);
})();

const swap = {
  active: false,
  source: null,
  tipEl: null,
  armBtn(btn, on){ btn?.classList.toggle("swap-armed", !!on); },
  tip(msg, x, y){
    if (!this.tipEl){ this.tipEl = document.createElement("div"); this.tipEl.className="swap-tip"; document.body.appendChild(this.tipEl); }
    this.tipEl.textContent = msg || "";
    if (Number.isFinite(x) && Number.isFinite(y)){ this.tipEl.style.left = (x+12)+"px"; this.tipEl.style.top = (y+12)+"px"; }
    this.tipEl.style.display = msg? "block":"none";
  },
  start(sourceCard, btn){
    if (this.active) return;
    this.active = true; this.source = sourceCard;
    document.body.classList.add("swap-mode");
    sourceCard.classList.add("is-swap-source");
    this.armBtn(btn, true);
    this.bind();
  },
  cancel(){
    if (!this.active) return;
    this.active = false;
    document.body.classList.remove("swap-mode");
    this.tip("");
    this.source?.classList.remove("is-swap-source");
    $$(".card-item.is-swap-hover").forEach(el=>el.classList.remove("is-swap-hover"));
    $$(".reorder-btn.swap-armed, .tile-reorder-btn.swap-armed").forEach(b=>b.classList.remove("swap-armed"));
    this.unbind();
    this.source = null;
  },
  swapWith(target){
    const a=this.source, b=target; if (!a||!b||a===b) return;
    const parent = a.parentNode;
    const aNext = a.nextSibling === b ? a : a.nextSibling;
    parent.insertBefore(a, b);
    parent.insertBefore(b, aNext);
    saveOrder();
    this.cancel();
  },
  onMove(e){
    if (!swap.active) return;
    const target = e.target.closest(".card-item");
    $$(".card-item.is-swap-hover").forEach(el=>el.classList.remove("is-swap-hover"));
    if (target && target !== swap.source){ target.classList.add("is-swap-hover"); swap.tip('Swap to this plot?', e.clientX, e.clientY); }
    else { swap.tip('Select a destination…', e.clientX, e.clientY); }
  },
  onClick(e){
    if (!swap.active) return;
    const t = e.target.closest(".card-item");
    if (t && t !== swap.source){ e.preventDefault(); swap.swapWith(t); }
    else if (!e.target.closest(".reorder-btn")) { swap.cancel(); }
  },
  onKey(e){ if (e.key==="Escape") swap.cancel(); },
  bind(){
    plotsGrid?.addEventListener("mousemove", this.onMove);
    plotsGrid?.addEventListener("click", this.onClick);
    document.addEventListener("keydown", this.onKey);
  },
  unbind(){
    plotsGrid?.removeEventListener("mousemove", this.onMove);
    plotsGrid?.removeEventListener("click", this.onClick);
    document.removeEventListener("keydown", this.onKey);
  }
};
function initSwapButtons(){
  // Use your swap SVG (TNF Red) on reorder buttons
  $$(".reorder-btn").forEach(b=>{ b.innerHTML = svgSwapTNF(16); });
  $$(".tile-reorder-btn").forEach(b=>{ b.innerHTML = svgSwapTNF(16); });
  // Click-to-arm
  $$(".reorder-btn").forEach(btn=>{
    btn.addEventListener("click",(e)=>{
      e.stopPropagation();
      if (swap.active){ swap.cancel(); return; }
      const card = e.currentTarget.closest(".card-item"); if (!card) return;
      swap.start(card, e.currentTarget);
    });
  });
}

/* ========== Reset buttons ========== */
const onClick = (id,fn)=>{ const el=$("#"+id); if(el) el.addEventListener("click",fn); };

onClick("resetBtn", ()=>{
  window.quickEntry?.hardReset?.();

  hourly = []; wtd = {}; datasetMeta = {};
  destroyCharts();

  const t1 = $("#tbl tbody");     if (t1) t1.innerHTML = "";
  const t2 = $("#tblWeek tbody"); if (t2) t2.innerHTML = "";

  ["#kpi_day_sales","#kpi_day_target","#kpi_vs_ly","#kpi_ads","#kpi_upt","#kpi_conv","#kpi_day_target_var","#kpi_vs_ly_delta","#kpi_day_target_var2"]
    .forEach(sel=>{ const el=$(sel); if(el) { el.textContent="—"; el.classList?.remove?.("positive","negative"); } });

  if (selStart) selStart.innerHTML="";
  if (selEnd)   selEnd.innerHTML="";
  filters.startIdx = 0; filters.endIdx = 0; filters.minTxn=0;

  setStatus(true, "Ready");
  requestAnimationFrame(resizeCharts);
});

onClick("resetLayout", ()=>{
  window.quickEntry?.hardReset?.();

  localStorage.removeItem("plots:order");
  ["plot-hourly","plot-cume","plot-tu","plot-eff","panel-table","panel-week"].forEach(k=>localStorage.removeItem("size:"+k));
  // Force normal size for Hourly Detail & Weekly Summary
  ["wrap-table","wrap-week"].forEach(id=>{
    localStorage.setItem("wide:"+id, "0");
    $("#"+id)?.classList?.remove("wide");
  });
  restoreOrder(); restoreSizes(); applyViews();
});

/* ========== Diagnostics ========== */
function runDiagnostics(){
  const results = [];
  const ok = (name, cond, info="")=>{ results.push({ name, status: cond?"OK":"FAIL", info }); return !!cond; };
  const info = (name, detail)=>{ results.push({ name, status:"INFO", info:detail }); };

  ok("Chart.js loaded", !!window.Chart);
  info("XLSX (optional)", window.XLSX ? "present" : "not loaded yet");

  const mustHave = ["#plotsGrid","#wrap-hourly","#wrap-cume","#wrap-tu","#wrap-eff","#wrap-table","#wrap-week","#tbl tbody","#tblWeek tbody"];
  ok("Required DOM present", mustHave.every(sel=>!!$(sel)), "checks core containers");

  ok("Reorder buttons found", $$(".reorder-btn").length>0);
  ok("Diagnostics button found", !!$("#runSelfTest"));
  ok("Reset button found", !!$("#resetBtn"));

  let storageOK = false;
  try { const k="__test_"+Date.now(); localStorage.setItem(k,"1"); localStorage.removeItem(k); storageOK=true; } catch {}
  ok("localStorage writable", storageOK);

  const hasData = Array.isArray(hourly) && hourly.length>0;
  info("Dataset", hasData? `rows=${hourly.length}` : "no data loaded");
  if (hasData) {
    const hasTimes = hourly.every(r=>typeof r.time==="string" && r.time.length>0);
    const hasSales = hourly.every(r=>Number.isFinite(r.sales) || r.sales===undefined || Number.isNaN(r.sales));
    ok("Hourly rows shape", hasTimes && hasSales);
  }

  if (hasData && window.Chart){
    renderAll();
    const chartsReady = !!chartHourly && !!chartCume && !!chartTU && !!chartEff;
    ok("Charts rendered", chartsReady);
  } else {
    info("Charts rendered", "skipped (no dataset yet)");
  }

  ok("Swap mode installed", typeof swap.start==="function");
  showDiagPopup(results);
}
function showDiagPopup(items){
  const overlay = document.createElement("div");
  overlay.style.cssText = "position:fixed;inset:0;z-index:2000;background:rgba(0,0,0,.55);display:flex;align-items:center;justify-content:center;";
  const modal = document.createElement("div");
  modal.style.cssText = "width:min(720px,calc(100vw - 32px));background:#0f1012;border:1px solid rgba(255,255,255,.12);border-radius:16px;box-shadow:0 12px 36px rgba(0,0,0,.45);color:#e8eaee;overflow:hidden";
  modal.innerHTML = `
    <div style="display:flex;align-items:center;gap:10px;padding:14px 16px;border-bottom:1px solid rgba(255,255,255,.12);background:linear-gradient(180deg,#121316,#0f1012)">
      <strong>Diagnostics</strong>
      <span style="margin-left:auto;color:#9aa3af;font-size:12px">Summary of checks</span>
      <button id="diagCloseBtn" style="appearance:none;border:1px solid rgba(255,255,255,10);background:#121316;color:#e8eaee;border-radius:10px;padding:6px 10px;cursor:pointer">✕</button>
    </div>
    <div id="diagBody" style="padding:14px;max-height:60vh;overflow:auto"></div>
    <div style="padding:12px;border-top:1px solid rgba(255,255,255,.12);display:flex;justify-content:flex-end">
      <button id="diagOkBtn" class="primary" style="appearance:none;border:1px solid rgba(255,255,255,08);background:${TNF_RED};color:#fff;padding:10px 14px;border-radius:12px;cursor:pointer">OK</button>
    </div>
  `;
  overlay.appendChild(modal);
  document.body.appendChild(overlay);

  const body = $("#diagBody", modal);
  const row = (name, status, info) => {
    const color = status==="OK" ? "#86efac" : status==="FAIL" ? "#fecaca" : "#cfd3d9";
    const emoji = status==="OK" ? "✅" : status==="FAIL" ? "❌" : "ℹ️";
    const div = document.createElement("div");
    div.style.cssText = "display:flex;align-items:start;gap:10px;padding:8px 10px;border:1px dashed rgba(255,255,255,.10);border-radius:10px;margin:6px 0";
    div.innerHTML = `<span>${emoji}</span><div><div style="font-weight:600;color:${color}">${name} — ${status}</div>${info?`<div style="color:#9aa3af;font-size:12px;margin-top:3px">${info}</div>`:""}</div>`;
    return div;
  };
  items.forEach(it=> body.appendChild(row(it.name, it.status, it.info||"")));

  const close = ()=> overlay.remove();
  $("#diagCloseBtn", modal)?.addEventListener("click", close);
  $("#diagOkBtn", modal)?.addEventListener("click", close);
  overlay.addEventListener("mousedown", e=>{ if (e.target===overlay) close(); });
  window.addEventListener("keydown", function esc(e){ if (e.key==="Escape"){ close(); window.removeEventListener("keydown", esc); }});
}
onClick("runSelfTest", ()=>{ closeMenus(); runDiagnostics(); });

/* ========== Decorate icons (Drop File + Expand) ========== */
function decorateIcons(){
  // Swap icons already set in initSwapButtons()
  // Expand / wide toggle buttons
  $$(".wide-btn").forEach(btn=>{
    btn.innerHTML = svgExpandTNF(16);
  });
  // Drop file buttons / areas: try common selectors without breaking listeners
  ["#btnUpload","#filePickerBtn",".drop-btn"].forEach(sel=>{
    $$(sel).forEach(el=>{
      if (!el) return;
      if (!el.querySelector("svg")) el.insertAdjacentHTML("afterbegin", svgDropFileTNF(16));
    });
  });
  // If there is a dedicated icon container in the dropzone
  $$(".drop-icon, .file-drop-icon").forEach(el=>{
    el.innerHTML = svgDropFileTNF(16);
  });
}

/* ========== Public API for other modules ========== */
let dashboardReady=false;
window.dashboardAPI = {
  setHourlyData(rows, meta={}){
    if(!dashboardReady){ setTimeout(()=>this.setHourlyData(rows,meta), 60); return; }
    hourly = Array.isArray(rows)? rows.slice(): [];
    datasetMeta = { ...(datasetMeta||{}), ...(meta||{}) };
    populateTimeWindow(); readFilters(); renderAll(); applyViews(); setStatus(libsOk());
  },
  setWTD(o={}){
    if(!dashboardReady){ setTimeout(()=>this.setWTD(o), 60); return; }
    wtd = { ...(wtd||{}), ...(o||{}) };
    renderKPIs();
  },
  loadDataset(ds){
    if (!ds || typeof ds!=="object"){ alert("Invalid dataset."); return; }
    this.setHourlyData(ds.hourly||[], ds.meta||{});
    this.setWTD(ds.wtd||{});
  },
  getDataset(){ return { hourly: hourly.slice(), wtd: {...wtd}, meta: {...datasetMeta} }; },
  summarizeDataset(ds){
    try{
      const rows = Array.isArray(ds?.hourly)? ds.hourly: [];
      const sales = rows.map(r=>r.sales).filter(Number.isFinite).reduce((s,v)=>s+v,0);
      const target= rows.map(r=>r.hTarget).filter(Number.isFinite).reduce((s,v)=>s+v,0);
      const ly    = rows.map(r=>r.ly).filter(Number.isFinite).reduce((s,v)=>s+v,0);
      const tx    = rows.map(r=>r.txns).filter(Number.isFinite).reduce((s,v)=>s+v,0);
      const un    = rows.map(r=>r.units).filter(Number.isFinite).reduce((s,v)=>s+v,0);
      const trf   = rows.map(r=>r.traffic).filter(Number.isFinite).reduce((s,v)=>s+v,0);
      const ads   = tx>0? sales/tx : NaN;
      const upt   = tx>0? un/tx : NaN;
      const conv  = trf>0? tx/trf : NaN;
      return { sales, target: (Number.isFinite(target)? target: NaN), var: (Number.isFinite(target)? sales-target: NaN), vsLY: (Number.isFinite(ly)? sales-ly: NaN), ads, upt, conv, locked: !!ds?.meta?.locked };
    }catch{ return {}; }
  }
};

/* ========== Bootstrap ========== */
function bootstrap(){
  try { setStatus(libsOk()); } catch {}
  restoreOrder(); restoreSizes(); applyViews(); initWideButtons(); initSwapButtons(); decorateIcons();
  // Ensure Hourly Detail & Weekly Summary are NOT wide on first load (fits with other plots)
  ["wrap-table","wrap-week"].forEach(id=>{
    const el=$("#"+id);
    if (el) applyWideState(el, false);
  });
  dashboardReady=true;
  setStatus(true, "Ready");
}
bootstrap();

/* ========== Optional Demo ========== */
onClick("demoData", ()=>{
  hourly=[
    { time:"11:00 - 12:00pm", sales:1200, txns:8,  units:10, hTarget:1000, ly:900,  traffic:45, tTarget:NaN },
    { time:"12:00 - 1:00pm",  sales:1600, txns:9,  units:14, hTarget:1200, ly:1100, traffic:50, tTarget:NaN },
    { time:"1:00 - 2:00pm",   sales:1400, txns:7,  units:11, hTarget:1300, ly:1300, traffic:42, tTarget:NaN },
    { time:"2:00 - 3:00pm",   sales:2000, txns:10, units:18, hTarget:1500, ly:1500, traffic:55, tTarget:NaN },
    { time:"3:00 - 4:00pm",   sales:1800, txns:12, units:20, hTarget:1400, ly:1200, traffic:60, tTarget:NaN },
    { time:"4:00 - 5:00pm",   sales:2200, txns:15, units:25, hTarget:1600, ly:1400, traffic:65, tTarget:NaN },
    { time:"5:00 - 6:00pm",   sales:1900, txns:11, units:19, hTarget:1350, ly:1350, traffic:58, tTarget:NaN },
    { time:"6:00 - 7:00pm",   sales:1650, txns:9,  units:16, hTarget:1250, ly:1150, traffic:52, tTarget:NaN }
  ];
  populateTimeWindow(); readFilters(); renderAll(); applyViews(); setStatus(libsOk());
});
