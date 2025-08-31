/* ============================================================================
   FILE: library-tools.js (V16.0)
   PURPOSE (1/2):
   - Provides a robust local “library” for saved day trackers with Month→Week→Day
     navigation, uniqueness checks by date, and an automatic “lock at 11:59pm”
     safeguard so past days can’t be overwritten or deleted.
   - Exposes a small DSLib API for listing/saving/loading/deleting entries and
     UI bindings to your sidebar’s Save/Load controls.

   PURPOSE (2/2):
   - Implements two Tools: (a) Set Store Hours (generates time slots and pipes
     them into Track Sales), and (b) Authorized Users (manages signer names).
     Also includes a one-time migration path from the older storage namespace.
   ========================================================================== */

(() => {
  "use strict";
  const $  = (s,sc=document)=>sc.querySelector(s);
  const $$ = (s,sc=document)=>Array.from(sc.querySelectorAll(s));
  const todayISO = () => new Date().toISOString().slice(0,10);
  const endOfDay = (iso) => { const d=new Date(iso+"T23:59:59"); return d.getTime(); };
  const isPastDayLocked = (iso) => Date.now() > endOfDay(iso);
  const monthKey = (iso) => iso.slice(0,7); // YYYY-MM
  function isoWeekKey(isoDate){
    const d = new Date(isoDate+"T12:00:00"); d.setHours(0,0,0,0);
    const th = new Date(d); th.setDate(d.getDate()+3-((d.getDay()+6)%7));
    const week1 = new Date(th.getFullYear(),0,4);
    const weekNo = 1 + Math.round(((th - week1)/86400000 - 3 + ((week1.getDay()+6)%7)) / 7);
    const y = th.getFullYear(); return `${y}-W${String(weekNo).padStart(2,"0")}`;
  }

  /* ---------- Storage ---------- */
  const NS="tnf:v2:"; const KEY_INDEX = NS+"index"; const K_FOR = k => NS+"item:"+k;
  const readIndex  = () => { try{ return JSON.parse(localStorage.getItem(KEY_INDEX)||"[]"); }catch{return [];} };
  const writeIndex = (a) => localStorage.setItem(KEY_INDEX, JSON.stringify(a));
  const loadEntry  = (key) => { const s=localStorage.getItem(K_FOR(key)); return s? JSON.parse(s): null; };
  const saveEntry  = (obj) => { const key = String(Date.now()); localStorage.setItem(K_FOR(key), JSON.stringify(obj)); return key; };
  const deleteEntry= (key) => { localStorage.removeItem(K_FOR(key)); writeIndex(readIndex().filter(e=>e.key!==key)); };

  // One-time migration from legacy namespace (best-effort)
  (function migrateV1IfAny(){
    try{
      const LEG_NS="tnf:hourly:";
      const oldIndex = JSON.parse(localStorage.getItem(LEG_NS+"index")||"[]");
      if (!oldIndex || !oldIndex.length) return;
      oldIndex.forEach(ent=>{
        const old = JSON.parse(localStorage.getItem(LEG_NS+"item:"+ent.key) || "null");
        if (!old) return;
        const date = old?.meta?.date || todayISO();
        const locked = isPastDayLocked(date);
        const key = saveEntry({ hourly: old.hourly||[], wtd: old.wtd||{}, meta:{ date, locked } });
        const idx = readIndex(); idx.push({ key, date, label: ent.label || date, ts: Date.now(), locked }); writeIndex(idx);
      });
      localStorage.removeItem(LEG_NS+"index");
    }catch{}
  })();

  /* ---------- Public DSLib API ---------- */
  window.DSLib = {
    entries(){ return readIndex().slice().sort((a,b)=>b.ts-a.ts); },
    monthKeys(){ const set=new Set(readIndex().map(e=>monthKey(e.date))); return Array.from(set).sort().reverse(); },
    weeksInMonth(mkey){ const set=new Set(readIndex().filter(e=>monthKey(e.date)===mkey).map(e=>isoWeekKey(e.date))); return Array.from(set).sort(); },
    entriesByWeek(weekKey){ return readIndex().filter(e=> isoWeekKey(e.date)===weekKey); },
    loadEntry,
    saveNew(ds, isoDate, label){
      const date = isoDate || todayISO();
      const idx = readIndex();
      if (idx.some(e=>e.date===date)) return { ok:false, reason:"duplicate" };
      const locked = isPastDayLocked(date);
      const meta = { ...(ds.meta||{}), date, locked };
      const key = saveEntry({ hourly: ds.hourly||[], wtd: ds.wtd||{}, meta });
      idx.push({ key, date, label: label || date, ts: Date.now(), locked });
      writeIndex(idx);
      return { ok:true, key };
    },
    delete(key){
      const ent = readIndex().find(e=>e.key===key);
      if (!ent) return { ok:false, reason:"missing" };
      if (isPastDayLocked(ent.date)) return { ok:false, reason:"locked" };
      deleteEntry(key);
      return { ok:true };
    }
  };

  /* ---------- Library UI ---------- */
  const selMonth=$("#selMonth"), selWeek=$("#selWeek"), selDay=$("#selDay");
  const btnSave=$("#saveCurrent"), btnLoad=$("#loadSaved"), btnDelete=$("#deleteSaved"), inputDate=$("#saveDate");

  function refreshMonths(){
    if (!selMonth || !selWeek || !selDay) return;
    const months = window.DSLib.monthKeys();
    selMonth.innerHTML = months.map(m=>`<option value="${m}">${new Date(m+"-01").toLocaleDateString(undefined,{month:"long", year:"numeric"})}</option>`).join("");
    if (!months.length){ selMonth.innerHTML=""; selWeek.innerHTML=""; selDay.innerHTML=""; return; }
    refreshWeeks();
  }
  function refreshWeeks(){
    if (!selMonth || !selWeek) return;
    const mkey = selMonth.value || window.DSLib.monthKeys()[0];
    if (!mkey){ selWeek.innerHTML=""; if (selDay) selDay.innerHTML=""; return; }
    const weeks = window.DSLib.weeksInMonth(mkey);
    selWeek.innerHTML = weeks.map(w=>`<option value="${w}">${w}</option>`).join("");
    refreshDays();
    window.dispatchEvent(new CustomEvent("dslib:weekChanged", { detail:{weekKey: selWeek.value} }));
  }
  function refreshDays(){
    if (!selWeek || !selDay) return;
    const wkey = selWeek.value;
    const ents = window.DSLib.entriesByWeek(wkey).sort((a,b)=>a.date.localeCompare(b.date));
    selDay.innerHTML = ents.map(e=>`<option value="${e.key}">${new Date(e.date).toLocaleDateString(undefined,{weekday:"long", month:"short", day:"numeric"})}${e.locked?"  🔒":""}</option>`).join("");
  }
  selMonth?.addEventListener("change", refreshWeeks);
  selWeek ?.addEventListener("change", ()=>{ refreshDays(); window.dispatchEvent(new CustomEvent("dslib:weekChanged", { detail:{weekKey: selWeek.value} })); });

  btnLoad?.addEventListener("click", ()=>{
    const key = selDay?.value; if(!key){ alert("Select a saved day."); return; }
    const ds = window.DSLib.loadEntry(key); if(!ds){ alert("Missing dataset."); return; }
    window.dashboardAPI.loadDataset(ds);
  });
  btnDelete?.addEventListener("click", ()=>{
    const key = selDay?.value; if (!key) return;
    const ent = window.DSLib.entries().find(e=>e.key===key);
    if (!ent) return;
    if (isPastDayLocked(ent.date)){ alert("This day is locked and cannot be deleted."); return; }
    if (confirm("Delete selected saved day?")){ const r = window.DSLib.delete(key); if (r.ok){ refreshMonths(); } else { alert("Delete blocked."); } }
  });
  btnSave?.addEventListener("click", ()=>{
    const ds = window.dashboardAPI.getDataset();
    if (!Array.isArray(ds.hourly) || !ds.hourly.length){ alert("Nothing to save yet."); return; }
    const iso = inputDate?.value || todayISO();
    const label = new Date(iso).toLocaleDateString(undefined,{weekday:"long", month:"short", day:"numeric"});
    const r = window.DSLib.saveNew(ds, iso, label);
    if (!r.ok){
      if (r.reason==="duplicate"){ alert("A tracker already exists for that date. Delete it first if you need to replace it."); }
      else { alert("Save failed."); }
      return;
    }
    refreshMonths();
    if (selMonth){ selMonth.value = monthKey(iso); refreshWeeks(); }
    if (selWeek ){ selWeek.value  = isoWeekKey(iso); refreshDays(); }
  });
  if (inputDate) inputDate.value = todayISO();
  refreshMonths();

  /* ---------- Tools ---------- */
  const KEY_USERS = NS+"users"; // array of strings "First Last"
  const readUsers = () => { try{ return JSON.parse(localStorage.getItem(KEY_USERS)||"[]"); }catch{return [];} };
  const writeUsers= (a) => localStorage.setItem(KEY_USERS, JSON.stringify(a));
  window.Toolbox = { users(){ return readUsers(); } };

  function openStoreHours(){
    const wrap=document.createElement("div");
    wrap.className="qe-overlay is-open";
    wrap.innerHTML = `
      <div class="qe-modal" role="dialog" aria-modal="true" aria-label="Set Store Hours">
        <div class="qe-hdr"><strong>Set Store Hours</strong><button class="qe-close" id="shClose" aria-label="Close">✕</button></div>
        <div class="qe-body">
          <div class="field" style="grid-template-columns:160px 1fr; margin-bottom:8px"><label>Open</label><input id="shOpen" type="time" value="11:00"></div>
          <div class="field" style="grid-template-columns:160px 1fr; margin-bottom:8px"><label>Close</label><input id="shCloseT" type="time" value="19:00"></div>
          <div class="field" style="grid-template-columns:160px 1fr; margin-bottom:8px"><label>Slot (minutes)</label><input id="shSlot" type="number" min="30" step="30" value="60"></div>
          <button id="shApply" class="primary">Fill Track Sales</button>
        </div>
      </div>`;
    document.body.appendChild(wrap);
    $("#shClose",wrap).addEventListener("click", ()=>wrap.remove());
    wrap.addEventListener("mousedown",(e)=>{ if(e.target===wrap) wrap.remove(); });

    $("#shApply",wrap).addEventListener("click", ()=>{
      const toM=(s)=>{const [h,m]=s.split(":").map(Number); return h*60+m;};
      const open=toM($("#shOpen",wrap).value), close=toM($("#shCloseT",wrap).value), slot=Math.max(30, Number($("#shSlot",wrap).value)||60);
      const times=[]; for(let t=open; t<close; t+=slot){
        const fmt=(min)=>{ const h=((Math.floor(min/60)+11)%12)+1; const m=String(min%60).padStart(2,"0"); const ampm = Math.floor(min/60)%24<12? "am":"pm"; return `${h}:${m}${ampm}`; };
        const start=fmt(t), end=fmt(Math.min(t+slot, close)); times.push(`${start} - ${end}`);
      }
      window.quickEntry?.fillTimes(times);
      wrap.remove();
    });
  }

  function openUsers(){
    const wrap=document.createElement("div");
    wrap.className="qe-overlay is-open";
    const list = readUsers();
    wrap.innerHTML = `
      <div class="qe-modal" role="dialog" aria-modal="true" aria-label="Authorized Users">
        <div class="qe-hdr"><strong>Authorized Users</strong><button class="qe-close" id="auClose" aria-label="Close">✕</button></div>
        <div class="qe-body">
          <div class="field" style="grid-template-columns:160px 1fr"><label>First Name</label><input id="auFirst" type="text"></div>
          <div class="field" style="grid-template-columns:160px 1fr"><label>Last Name</label><input id="auLast" type="text"></div>
          <button id="auAdd" class="primary">Add</button>
          <hr style="border-color:rgba(255,255,255,.08); margin:12px 0">
          <div id="auList"></div>
        </div>
      </div>`;
    document.body.appendChild(wrap);
    const render=()=>{ const box=$("#auList",wrap); box.innerHTML = list.map((n,i)=>`<div style="display:flex;align-items:center;justify-content:space-between;border:1px solid rgba(255,255,255,.12);border-radius:10px;padding:8px 10px;margin:6px 0"><span>${n}</span><button data-i="${i}" class="row-del" title="Remove">✕</button></div>`).join(""); $$("#auList .row-del",wrap).forEach(b=>b.addEventListener("click",()=>{ list.splice(Number(b.dataset.i),1); writeUsers(list); render(); window.quickEntry?.open(); })); };
    render();
    $("#auAdd",wrap).addEventListener("click", ()=>{ const f=$("#auFirst",wrap).value.trim(), l=$("#auLast",wrap).value.trim(); if(!f||!l) return; list.push(`${f} ${l}`); writeUsers(list); render(); window.quickEntry?.open(); });
    $("#auClose",wrap).addEventListener("click", ()=>wrap.remove());
    wrap.addEventListener("mousedown",(e)=>{ if(e.target===wrap) wrap.remove(); });
  }

  $("#toolStoreHours")?.addEventListener("click", openStoreHours);
  $("#toolUsers")?.addEventListener("click", openUsers);
})();
