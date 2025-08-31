// reset.js — Reset data and layout
import { $, onClick } from "../core/dom.js";
import { state } from "../core/state.js";
import { destroyCharts, renderCharts } from "../ui/charts.js";
import { renderTables } from "../ui/tables.js";
import { renderKPIs } from "../ui/kpis.js";
import { restoreOrder, restoreSizes } from "../ui/layout.js";

function resetStatus(){
  const chip = $("#statusChip");
  chip?.classList?.remove("error");
  chip?.classList?.add("ready");
  if (chip) chip.textContent = "Status: Ready";
}

export function bindResets(){
  onClick("resetBtn", ()=>{
    try{ window.quickEntry?.hardReset?.(); }catch{}
    state.hourly=[]; state.wtd={}; state.meta={};
    destroyCharts();
    const t1=$("#tbl tbody"); if(t1) t1.innerHTML="";
    const t2=$("#tblWeek tbody"); if(t2) t2.innerHTML="";
    ["#kpi_day_sales","#kpi_day_target","#kpi_vs_ly","#kpi_ads","#kpi_upt","#kpi_conv","#kpi_day_target_var","#kpi_vs_ly_delta","#kpi_day_target_var2"]
      .forEach(sel=>{ const el=$(sel); if(el){ el.textContent="—"; el.classList.remove("positive","negative"); } });
    const selStart = $("#selStart"), selEnd = $("#selEnd");
    if(selStart) selStart.innerHTML=""; if(selEnd) selEnd.innerHTML="";
    state.filters.startIdx=0; state.filters.endIdx=0; state.filters.minTxn=0;
    resetStatus();
  });

  onClick("resetLayout", ()=>{
    try{ window.quickEntry?.hardReset?.(); }catch{}
    localStorage.removeItem("plots:order");
    ["plot-hourly","plot-cume","plot-tu","plot-eff","panel-table","panel-week"].forEach(k=>localStorage.removeItem("size:"+k));
    ["wrap-table","wrap-week","wrap-hourly","wrap-cume","wrap-tu","wrap-eff"].forEach(id=>{
      localStorage.setItem("wide:"+id,"0"); $("#"+id)?.classList?.remove("wide"); localStorage.removeItem("view:"+id);
    });
    localStorage.removeItem("sidebarW"); document.documentElement.style.removeProperty("--sidebarW");
    localStorage.removeItem("tileOrder:v1");
    restoreOrder(); restoreSizes();
    const chip = $("#statusChip"); if (chip) { chip.classList.add("ready"); chip.textContent = "Status: Layout reset"; }
  });
}
