// quick-entry.js — Manual entry grid that honors stored store hours and pushes dataset
function getTimesFromStoreHours(){
  try{
    const arr = JSON.parse(localStorage.getItem("storeHours:times") || "[]");
    if (Array.isArray(arr) && arr.length) return arr.map(String);
  }catch{}
  return ["10:00","11:00","12:00","13:00","14:00","15:00","16:00","17:00","18:00","19:00","20:00"];
}

function ensureTable(){
  const tb = document.querySelector("#qeTable tbody");
  if (tb) return tb;
  const phantom = document.createElement("tbody");
  phantom.id = "qeTablePhantom";
  return phantom;
}

function rowHTML(t){
  return `<tr>
    <td class="qe-time">${t}</td>
    <td><input type="number" step="1" inputmode="numeric" class="qe-sales" placeholder="0"></td>
    <td><input type="number" step="1" inputmode="numeric" class="qe-txns"  placeholder="0"></td>
    <td><input type="number" step="1" inputmode="numeric" class="qe-units" placeholder="0"></td>
    <td><input type="number" step="1" inputmode="numeric" class="qe-htgt"  placeholder="0"></td>
    <td><input type="number" step="1" inputmode="numeric" class="qe-ly"    placeholder="0"></td>
    <td><input type="number" step="1" inputmode="numeric" class="qe-traf"  placeholder="0"></td>
    <td><input type="number" step="1" inputmode="numeric" class="qe-ttgt"  placeholder="0"></td>
  </tr>`;
}

function ensureRowsFromStoreHours(){
  const times = getTimesFromStoreHours();
  const tb = ensureTable();
  tb.innerHTML = times.map(rowHTML).join("");
}

function readGridToDataset(){
  const rows = Array.from(document.querySelectorAll("#qeTable tbody tr"));
  const hourly = rows.map(tr => {
    const val = sel => {
      const el = tr.querySelector(sel);
      const v = el?.value ?? "";
      if (v === "") return null;
      return Number(v);
    };
    return {
      time: tr.querySelector(".qe-time")?.textContent?.trim() || "",
      sales:   val(".qe-sales"),
      txns:    val(".qe-txns"),
      units:   val(".qe-units"),
      hTarget: val(".qe-htgt"),
      ly:      val(".qe-ly"),
      traffic: val(".qe-traf"),
      tTarget: val(".qe-ttgt")
    };
  });
  return { hourly, wtd:{}, meta:{} };
}

function bindApply(){
  const btn = document.getElementById("quickApplyBtn");
  if (!btn) return;
  btn.addEventListener("click", ()=>{
    const ds = readGridToDataset();
    window.dashboardAPI?.loadDataset?.(ds);
    const chip = document.getElementById("statusChip");
    if (chip){ chip.classList.add("ready"); chip.textContent = "Status: Manual entries applied"; }
  });
}

function hardReset(){
  const tb = ensureTable();
  tb.innerHTML = "";
}

export function initQuickEntry(){
  ensureRowsFromStoreHours();
  bindApply();
  // Back-compat global API
  window.quickEntry = { ensureRowsFromStoreHours, hardReset };
}
