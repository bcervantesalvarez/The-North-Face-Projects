// js/features/demo.js
function buildDemo() {
  let times = [];
  try { times = JSON.parse(localStorage.getItem("storeHours:times") || "[]"); } catch {}
  if (!Array.isArray(times) || !times.length) {
    times = ["10:00","11:00","12:00","13:00","14:00","15:00","16:00","17:00","18:00","19:00"];
  }
  const n = times.length;
  const hourly = times.map((t, i) => {
    const x = (i - (n - 1) / 2) / (n / 4);
    const sales = Math.round(600 * Math.exp(-0.5 * x * x));
    const txns  = Math.max(1, Math.round(sales / 45));
    const units = Math.round(txns * 1.6);
    const hTarget = Math.round(sales * 1.05);
    const ly      = Math.round(sales * 0.92);
    const traffic = Math.round(txns * 3.3);
    return { time: t, sales, txns, units, hTarget, ly, traffic, tTarget: NaN };
  });
  const day_target = hourly.reduce((a,r)=>a+(Number.isFinite(r.hTarget)?r.hTarget:0),0) || NaN;
  const vs_ly      = hourly.reduce((a,r)=>a+(Number.isFinite(r.sales)&&Number.isFinite(r.ly)?r.sales-r.ly:0),0) || NaN;
  return { hourly, wtd:{ day_target, vs_ly }, meta:{ source:"demo" } };
}

export function loadDemoNow() {
  const ds = buildDemo();
  window.dashboardAPI?.loadDataset?.(ds);
  const chip = document.getElementById("statusChip");
  if (chip) { chip.classList.add("ready"); chip.textContent = "Status: Demo loaded"; }
}

export function initDemoLoader() {
  const btn =
    document.getElementById("loadDemo") ||
    document.querySelector('[data-act="load-demo"], #load-demo, #demoBtn');
  if (btn) btn.addEventListener("click", loadDemoNow);
}
