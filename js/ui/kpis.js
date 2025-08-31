// ui/kpis.js – Enhanced KPI computations and rendering
import { $, fmtMoney, fmtPct } from "../core/dom.js";
import { state } from "../core/state.js";

export function computeDerived() {
  const s = state.filters.startIdx || 0;
  const e = state.filters.endIdx || (state.hourly.length ? state.hourly.length - 1 : 0);
  const rows = state.hourly.slice(s, e + 1);
  
  const sales = rows.map(r => Number(r.sales) || 0);
  const txns = rows.map(r => Number(r.txns) || 0);
  const units = rows.map(r => Number(r.units) || 0);
  const hTgt = rows.map(r => Number(r.hTarget) || 0);
  const ly = rows.map(r => Number(r.ly) || 0);
  const traffic = rows.map(r => Number(r.traffic) || 0);

  const tSales = sales.reduce((a, b) => a + b, 0);
  const tTxns = txns.reduce((a, b) => a + b, 0);
  const tUnits = units.reduce((a, b) => a + b, 0);
  const tTarget = hTgt.reduce((a, b) => a + b, 0);
  const tLY = ly.reduce((a, b) => a + b, 0);
  const tTraffic = traffic.reduce((a, b) => a + b, 0);
  
  const vsLY = tSales - tLY;
  const vsTarget = tSales - tTarget;
  const ads = tTxns > 0 ? tSales / tTxns : 0;
  const upt = tTxns > 0 ? tUnits / tTxns : 0;
  const conv = tTraffic > 0 ? (tTxns / tTraffic) * 100 : 0;
  
  // Additional metrics
  const targetCoverage = tTarget > 0 ? (tSales / tTarget) * 100 : 0;
  const lyGrowth = tLY > 0 ? ((tSales - tLY) / tLY) * 100 : 0;
  
  return { 
    rows, 
    tSales, 
    tTarget, 
    vsLY, 
    vsTarget, 
    ads, 
    upt, 
    conv, 
    tTxns, 
    tTraffic,
    targetCoverage,
    lyGrowth
  };
}

export function renderKPIs() {
  const data = computeDerived();
  
  // Primary KPI - Day Sales
  const daySalesEl = $("#kpi_day_sales");
  if (daySalesEl) {
    daySalesEl.textContent = fmtMoney.format(data.tSales);
  }
  
  // Day Sales Delta (vs Target)
  const dayDeltaEl = $("#kpi_day_delta");
  if (dayDeltaEl) {
    if (data.tTarget > 0) {
      const variance = data.vsTarget;
      const pct = (variance / data.tTarget) * 100;
      dayDeltaEl.textContent = `${variance >= 0 ? '+' : ''}${fmtMoney.format(variance)} (${pct >= 0 ? '+' : ''}${pct.toFixed(1)}%) vs target`;
      dayDeltaEl.className = variance >= 0 ? 'kpi-delta positive' : 'kpi-delta negative';
    } else {
      dayDeltaEl.textContent = 'No target set';
      dayDeltaEl.className = 'kpi-delta';
    }
  }
  
  // VS Last Year
  const vsLYEl = $("#kpi_vs_ly");
  if (vsLYEl) {
    const diff = data.vsLY;
    vsLYEl.textContent = `${diff >= 0 ? '+' : ''}${fmtMoney.format(diff)}`;
  }
  
  const lyDeltaEl = $("#kpi_ly_delta");
  if (lyDeltaEl) {
    if (data.lyGrowth !== 0 && !isNaN(data.lyGrowth)) {
      lyDeltaEl.textContent = `${data.lyGrowth >= 0 ? '+' : ''}${data.lyGrowth.toFixed(1)}% YoY growth`;
      lyDeltaEl.className = data.lyGrowth >= 0 ? 'kpi-delta positive' : 'kpi-delta negative';
    } else {
      lyDeltaEl.textContent = 'vs last year';
      lyDeltaEl.className = 'kpi-delta';
    }
  }
  
  // Conversion Rate
  const convEl = $("#kpi_conv");
  if (convEl) {
    convEl.textContent = `${data.conv.toFixed(1)}%`;
  }
  
  const convDeltaEl = $("#kpi_conv_delta");
  if (convDeltaEl) {
    if (data.tTraffic > 0) {
      convDeltaEl.textContent = `${data.tTxns} of ${data.tTraffic} visitors`;
    } else {
      convDeltaEl.textContent = `${data.tTxns} transactions`;
    }
    convDeltaEl.className = 'kpi-delta';
  }
  
  // Efficiency (ADS/UPT)
  const effEl = $("#kpi_efficiency");
  if (effEl) {
    effEl.textContent = `${fmtMoney.format(data.ads)} / ${data.upt.toFixed(1)}`;
  }
  
  const effDeltaEl = $("#kpi_eff_delta");
  if (effDeltaEl) {
    // Calculate efficiency score (simplified)
    const effScore = (data.ads / 100) * data.upt; // Normalize ADS to 100 scale
    if (effScore > 2) {
      effDeltaEl.textContent = 'High efficiency';
      effDeltaEl.className = 'kpi-delta positive';
    } else if (effScore > 1) {
      effDeltaEl.textContent = 'Good efficiency';
      effDeltaEl.className = 'kpi-delta';
    } else {
      effDeltaEl.textContent = 'Needs improvement';
      effDeltaEl.className = 'kpi-delta negative';
    }
  }
  
  // Refresh button animation
  const refreshBtn = $("#refreshKPIs");
  if (refreshBtn) {
    refreshBtn.addEventListener("click", () => {
      refreshBtn.style.transform = "rotate(360deg)";
      setTimeout(() => {
        refreshBtn.style.transform = "";
        renderKPIs();
      }, 300);
    });
  }
}