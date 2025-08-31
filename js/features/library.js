// library.js — Save/load/delete local datasets ("Saved Library")
function getList(){
  const keys = Object.keys(localStorage).filter(k => k.startsWith("ds:"));
  return keys.map(k => ({key:k, name:k.slice(3)})).sort((a,b)=>a.name.localeCompare(b.name));
}

function renderList(){
  const box = document.getElementById("libList");
  if (!box) return;
  const items = getList();
  if (!items.length){ box.innerHTML = `<div class="muted">No saved datasets yet.</div>`; return; }
  box.innerHTML = items.map(({key,name}) => `
    <div class="lib-item">
      <span class="lib-name">${name}</span>
      <div class="lib-actions">
        <button class="btn btn-mini" data-act="load" data-key="${key}">Load</button>
        <button class="btn btn-mini danger" data-act="del" data-key="${key}">Delete</button>
      </div>
    </div>`).join("");

  box.querySelectorAll("button[data-act='load']").forEach(b => b.addEventListener("click", ()=>loadByKey(b.dataset.key)));
  box.querySelectorAll("button[data-act='del']").forEach(b => b.addEventListener("click", ()=>delByKey(b.dataset.key)));
}

function saveCurrent(){
  const nameInp = document.getElementById("libName") || { value: new Date().toISOString().replace(/[:.]/g,"-") };
  const name = String(nameInp.value||"").trim();
  if (!name){ alert("Name required to save."); return; }
  const ds = window.dashboardAPI?.getDataset?.();
  if (!ds || !Array.isArray(ds.hourly)){ alert("Nothing to save yet."); return; }
  localStorage.setItem("ds:"+name, JSON.stringify(ds));
  renderList();
}

function loadByKey(key){
  try{
    const raw = localStorage.getItem(key);
    if (!raw) return;
    const ds = JSON.parse(raw);
    window.dashboardAPI?.loadDataset?.(ds);
    const chip = document.getElementById("statusChip");
    if (chip){ chip.classList.add("ready"); chip.textContent = `Status: Loaded “${key.slice(3)}”`; }
  }catch(err){ console.error(err); alert("Could not load that saved dataset."); }
}

function delByKey(key){
  localStorage.removeItem(key);
  renderList();
}

export function initLibrary(){
  document.getElementById("libSaveBtn")?.addEventListener("click", saveCurrent);
  renderList();
  // Back-compat namespace
  window.libraryTools = window.libraryTools || {};
  window.libraryTools.saveCurrent = saveCurrent;
  window.libraryTools.renderList = renderList;
  window.libraryTools.loadByKey  = loadByKey;
}
