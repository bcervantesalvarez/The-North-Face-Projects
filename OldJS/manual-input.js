/* ============================================================================
   FILE: manual-input.js
   PURPOSE (1/2):
   - Owns the “Track Sales” Quick Entry modal (open/close, grid build, keyboard
     nav, paste from Excel, apply-to-dashboard).
   - Adds a robust Excel import path with drag-and-drop and click-to-open for
     the Upload panel; parses .xlsx using XLSX and loads the dataset via
     window.dashboardAPI.loadDataset(...).

   PURPOSE (2/2):
   - Implements sidebar tile swapping (same interaction pattern as plot swap)
     and aligns with your design: dashed highlight, TNF_BLUE border, ESC to
     cancel. Also wires the sidebar “minimize” buttons and preserves order in
     localStorage. No theme changes beyond what's required for alignment/UX.
   ========================================================================== */

(() => {
  "use strict";

  // ---------- tiny DOM helpers ----------
  const $  = (s, sc=document) => sc.querySelector(s);
  const $$ = (s, sc=document) => Array.from(sc.querySelectorAll(s));

  // ---------- numbers ----------
  const toNum = v => {
    if (v == null) return NaN;
    return Number(String(v).replace(/[,\s$]/g, "")) || NaN;
  };

  // ---------- Upload Excel: open picker + drag/drop + parse ----------
  const fileInput = $("#file");                 // hidden <input type="file">
  const dropArea  = $("#paneUpload .drop");     // big “Drop or choose file” area
  const tabUpload = $("#tabUpload");
  const tabQuick  = $("#tabQuick");

  // Make the big drop area open the system file picker
  if (dropArea && fileInput) {
    dropArea.addEventListener("click", () => fileInput.click());
    dropArea.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") { e.preventDefault(); fileInput.click(); }
    });
    // Drag & drop
    ["dragenter","dragover"].forEach(ev =>
      dropArea.addEventListener(ev, e => { e.preventDefault(); dropArea.classList.add("is-hover"); }, {passive:false}));
    ["dragleave","drop"].forEach(ev =>
      dropArea.addEventListener(ev, e => { e.preventDefault(); dropArea.classList.remove("is-hover"); }, {passive:false}));
    dropArea.addEventListener("drop", e => {
      const f = e.dataTransfer?.files?.[0]; if (f) handleFile(f);
    });
  }

  // Also allow clicking the Upload tab to open the picker immediately
  tabUpload?.addEventListener("dblclick", (e)=>{ e.preventDefault(); fileInput?.click(); });

  fileInput?.addEventListener("change", () => {
    const f = fileInput.files?.[0]; if (f) handleFile(f);
  });

  async function handleFile(file){
    try{
      const buf = await file.arrayBuffer();
      const ds  = parseWorkbook(buf, file.name);
      if (!Array.isArray(ds.hourly) || !ds.hourly.length) {
        alert("No usable hourly rows found. Check header names and sheet.");
        return;
      }
      window.dashboardAPI.loadDataset(ds);  // re-renders + saves as your app dictates
      // Switch the tab back to Upload view so the user sees the library/save controls
      setTabs("upload");
    }catch(err){
      console.error("Excel import failed:", err);
      alert("Import failed. Make sure it’s an .xlsx with a header row.");
    }
  }

  // Accept flexible headers; map variants to canonical keys used by the app.
  function headerKey(s){
    return String(s||"")
      .toLowerCase()
      .replace(/[^a-z0-9]/g,"")
      .replace(/transactions|txn|tx|txns/,"txns")
      .replace(/^hourtarget|htarget|hourlytarget$/,"htarget")
      .replace(/^cumulative(target)?|ctarget|cumtarget|ttarget$/,"ttarget");
  }

  function parseWorkbook(arrayBuf, filename=""){
    const wb = XLSX.read(arrayBuf, { type:"array" });

    // Prefer a sheet named “Hourly”, else first visible sheet.
    const hourlySheetName = wb.SheetNames.find(n => /^hourly$/i.test(n)) || wb.SheetNames[0];
    const sh = wb.Sheets[hourlySheetName];
    const rows = XLSX.utils.sheet_to_json(sh, { header:1, blankrows:false });

    if (!rows.length) return { hourly: [], wtd:{}, meta:{ filename } };

    const hdr = rows[0].map(headerKey);
    const idx = (k) => hdr.findIndex(h => h===k);

    const H = {
      time:   idx("time"),
      sales:  idx("sales"),
      txns:   idx("txns"),
      units:  idx("units"),
      hTarget:idx("htarget"),
      ly:     idx("ly"),
      traffic:idx("traffic"),
      tTarget:idx("ttarget")
    };

    const hourly = [];
    for (let i=1; i<rows.length; i++){
      const r = rows[i] || [];
      // Require at least time or sales to consider it a row
      const t = r[H.time];
      const s = toNum(r[H.sales]);
      if (!t && !Number.isFinite(s)) continue;
      hourly.push({
        time:    t || "",
        sales:   Number.isFinite(s) ? s : NaN,
        txns:    toNum(r[H.txns]),
        units:   toNum(r[H.units]),
        hTarget: toNum(r[H.hTarget]),
        ly:      toNum(r[H.ly]),
        traffic: toNum(r[H.traffic]),
        tTarget: toNum(r[H.tTarget])
      });
    }

    // Minimal WTD/KPIs derivable from hourly (the page already computes most KPIs)
    const dayTarget = hourly.reduce((acc,r)=>acc + (Number.isFinite(r.hTarget)? r.hTarget : 0), 0) || NaN;
    const vsLY      = hourly.reduce((acc,r)=>acc + (Number.isFinite(r.sales)&&Number.isFinite(r.ly)? r.sales - r.ly : 0), 0) || NaN;
    const wtd = { day_target: dayTarget, vs_ly: vsLY };

    return { hourly, wtd, meta:{ filename } };
  }

  // ---------- Sidebar tile “Swap” (TNF_BLUE outline) + Minimize ----------
  const inputsGrid = $("#inputsGrid");
  const TNF_BLUE = "#283E8D";

  // Persist/reapply sidebar order
  function saveTileOrder(){
    if (!inputsGrid) return;
    const order = $$("#inputsGrid > .input-tile").map(n=>n.id).filter(Boolean);
    localStorage.setItem("tileOrder:v1", JSON.stringify(order));
  }
  (function restoreTileOrder(){
    try{
      const order = JSON.parse(localStorage.getItem("tileOrder:v1") || "[]");
      if (!order.length || !inputsGrid) return;
      order.forEach(id=>{
        const el = document.getElementById(id);
        if (el) inputsGrid.appendChild(el);
      });
    }catch{}
  })();

  // Minimize/expand bodies
  $$("#inputsGrid .collapse-btn").forEach(btn=>{
    btn.addEventListener("click", ()=>{
      const tile = btn.closest(".input-tile");
      const body = $(".tile-body", tile);
      if (!body) return;
      const isOpen = !body.hasAttribute("hidden");
      if (isOpen) body.setAttribute("hidden","true"); else body.removeAttribute("hidden");
    });
  });

  // Swap behavior for tiles (mirrors the plot swap UX)
  const tileSwap = {
    active:false, source:null, tipEl:null,
    start(tile, trigger){
      if (this.active) return;
      this.active = true; this.source = tile;
      tile.classList.add("swap-source","swap-hover");
      document.body.classList.add("swap-mode");
      trigger?.classList.add("swap-armed");
      this.bind();
      this.tip("Click destination tile…");
    },
    cancel(){
      this.active = false;
      $$(".input-tile").forEach(el=>el.classList.remove("swap-source","swap-hover"));
      document.body.classList.remove("swap-mode");
      $$(".tile-reorder-btn").forEach(b=>b.classList.remove("swap-armed"));
      this.hideTip();
      this.unbind();
      this.source = null;
    },
    tip(text, x, y){
      if (!this.tipEl){
        this.tipEl = document.createElement("div");
        this.tipEl.className = "swap-tip is-visible";
        document.body.appendChild(this.tipEl);
      }
      this.tipEl.textContent = text;
      if (x!=null && y!=null) { this.tipEl.style.left = (x+12)+"px"; this.tipEl.style.top = (y+12)+"px"; }
    },
    hideTip(){ this.tipEl?.remove(); this.tipEl = null; },
    onMove(e){
      if (!tileSwap.active) return;
      const t = e.target.closest(".input-tile");
      $$(".input-tile.swap-hover").forEach(el=>el.classList.remove("swap-hover"));
      if (t && t !== tileSwap.source){ t.classList.add("swap-hover"); tileSwap.tip("Swap to this tile?", e.clientX, e.clientY); }
      else { tileSwap.tip("Click destination tile…", e.clientX, e.clientY); }
    },
    swapWith(target){
      const a = this.source, b = target; if (!a || !b || a===b) return;
      const p = a.parentNode;
      const aNext = a.nextSibling === b ? a : a.nextSibling;
      p.insertBefore(a, b);
      p.insertBefore(b, aNext);
      a.classList.add("swap-anim"); b.classList.add("swap-anim");
      saveTileOrder();
      this.cancel();
    },
    onClick(e){
      if (!tileSwap.active) return;
      const t = e.target.closest(".input-tile");
      if (t && t !== tileSwap.source){ e.preventDefault(); tileSwap.swapWith(t); }
      else if (!e.target.closest(".tile-reorder-btn")) { tileSwap.cancel(); }
    },
    onKey(e){ if (e.key === "Escape") tileSwap.cancel(); },
    bind(){
      inputsGrid?.addEventListener("mousemove", this.onMove);
      inputsGrid?.addEventListener("click", this.onClick);
      document.addEventListener("keydown", this.onKey);
    },
    unbind(){
      inputsGrid?.removeEventListener("mousemove", this.onMove);
      inputsGrid?.removeEventListener("click", this.onClick);
      document.removeEventListener("keydown", this.onKey);
    }
  };

  // Arm the tile swap on button click
  $$("#inputsGrid .tile-reorder-btn").forEach(btn=>{
    btn.addEventListener("click",(e)=>{
      e.stopPropagation();
      const tile = btn.closest(".input-tile"); if (!tile) return;
      if (tileSwap.active) { tileSwap.cancel(); return; }
      tileSwap.start(tile, btn);
    });
  });

  // ---------- Quick Entry modal (Track Sales) ----------
  const overlay   = $("#quickOverlay");
  const mount     = $("#quickMount");
  const paneQuick = $("#paneQuick");      // rendered inside sidebar by default
  const paneUpload= $("#paneUpload");
  const btnClose  = $("#quickClose");
  const btnAddRow = $("#btnQuickAddRow");
  const btnClear  = $("#btnQuickClear");
  const btnApply  = $("#btnQuickApply");
  const tbody     = $("#quickGrid tbody");
  let homeParent = paneQuick?.parentNode || null;
  let homeNext   = paneQuick?.nextSibling || null;
  let lastFocusEl = null;

  function setTabs(which){
    const up = which==="upload", qk = which==="quick";
    tabUpload?.classList.toggle("is-active", up);
    tabQuick ?.classList.toggle("is-active", qk);
    tabUpload?.setAttribute("aria-selected", String(up));
    tabQuick ?.setAttribute("aria-selected", String(qk));
    paneUpload?.classList.toggle("is-active", up);
    // keep paneQuick hidden in sidebar; it is moved into modal when open
  }

  function openModal(){
    if (overlay.classList.contains("is-open")) return;
    lastFocusEl = document.activeElement;
    mount.appendChild(paneQuick); paneQuick.hidden=false;
    overlay.classList.add("is-open"); overlay.inert=false; overlay.removeAttribute("aria-hidden");
    document.body.classList.add("modal-open"); setTabs("quick");
    ensureRows(); updateIndices(); refreshSigners(); focusFirstCell();
  }
  function closeModal(){
    if (!overlay.classList.contains("is-open")) return;
    overlay.classList.remove("is-open"); overlay.setAttribute("aria-hidden","true"); overlay.inert=true;
    document.body.classList.remove("modal-open");
    if (homeParent && !homeParent.contains(paneQuick)){ homeParent.insertBefore(paneQuick, homeNext); }
    paneQuick.hidden = true;
    setTabs("upload");
    try{ lastFocusEl?.focus({preventScroll:true}); }catch{}
  }

  window.quickEntry = {
    open: openModal, close: closeModal,
    hardReset(){ clearRows(); ensureRows(); updateIndices(); closeModal(); },
    fillTimes(times){ clearRows(); times.forEach(t=>makeRow([t])); updateIndices(); openModal(); focusFirstCell(); }
  };

  tabQuick?.addEventListener("click", e=>{ e.preventDefault(); openModal(); });
  tabUpload?.addEventListener("click", e=>{ e.preventDefault(); closeModal(); });
  btnClose?.addEventListener("click", closeModal);
  overlay.addEventListener("mousedown", e=>{ if (e.target===overlay) closeModal(); });
  window.addEventListener("keydown", e=>{ if (e.key==="Escape" && overlay.classList.contains("is-open")) closeModal(); });

  function signerSelectHTML(value=""){
    const users = (window.Toolbox?.users() || []);
    const opts  = ['<option value="">(select)</option>', ...users.map(n=>`<option value="${n}" ${n===value?'selected':''}>${n}</option>`)].join("");
    return `<select class="qe-signer">${opts}</select>`;
  }

  function makeRow(vals=[]){
    const v=(i,d="")=>vals[i]??d;
    const tr=document.createElement("tr");
    tr.innerHTML = `
      <td><input class="qe-inp qe-time"   inputmode="text"     placeholder="e.g. 11—12pm" value="${v(0)}"></td>
      <td><input class="qe-inp qe-money"  inputmode="decimal"  placeholder="0"            value="${v(1)}"></td>
      <td><input class="qe-inp qe-int"    inputmode="numeric"  placeholder="0"            value="${v(2)}"></td>
      <td><input class="qe-inp qe-int"    inputmode="numeric"  placeholder="0"            value="${v(3)}"></td>
      <td><input class="qe-inp qe-money"  inputmode="decimal"  placeholder="(opt)"        value="${v(4)}"></td>
      <td><input class="qe-inp qe-money"  inputmode="decimal"  placeholder="(opt)"        value="${v(5)}"></td>
      <td><input class="qe-inp qe-int"    inputmode="numeric"  placeholder="(opt)"        value="${v(6)}"></td>
      <td><input class="qe-inp qe-money"  inputmode="decimal"  placeholder="(opt)"        value="${v(7)}"></td>
      <td class="qe-actions">${signerSelectHTML(v(8))}<button class="row-del" aria-label="Delete row">✕</button></td>`;
    tbody.appendChild(tr);
  }
  function ensureRows(){ if (!tbody.children.length){ for(let i=0;i<8;i++) makeRow(); } }
  function clearRows(){ tbody.innerHTML=""; }
  function updateIndices(){
    try{
      $$("#quickGrid tbody tr").forEach((tr,r)=>{
        $$(".qe-inp",tr).forEach((inp,c)=>{ inp.dataset.row=r; inp.dataset.col=c; });
        const signer = $(".qe-signer", tr); if (signer) signer.setAttribute("data-row", String(r));
      });
    }catch(e){ console.error("updateIndices error:", e); }
  }
  function focusFirstCell(){ const first=$("#quickGrid tbody tr .qe-inp"); first?.focus({preventScroll:true}); }
  function refreshSigners(){
    try{
      $$("#quickGrid tbody tr .qe-actions").forEach(td=>{
        const prev= $(".qe-signer", td); const val=prev?.value||"";
        prev?.remove(); td.insertAdjacentHTML("afterbegin", signerSelectHTML(val));
      });
    }catch(e){ console.error("refreshSigners error:", e); }
  }

  // Paste a block from Excel/Sheets into the grid
  const grid = $("#quickGrid");
  grid.addEventListener("paste", e=>{
    const target=e.target.closest(".qe-inp"); if(!target) return;
    const text=e.clipboardData?.getData("text")??""; if(!text || (!text.includes("\t") && !text.includes("\n"))) return; e.preventDefault();
    const startR=+target.dataset.row||0, startC=+target.dataset.col||0;
    const rows=text.replace(/\r/g,"").split("\n").filter(Boolean).map(r=>r.split("\t"));
    while (tbody.children.length < startR + rows.length) makeRow();
    rows.forEach((cols,i)=>{
      const tr=tbody.children[startR+i]; if(!tr) return;
      for(let j=0;j<cols.length && startC+j<8;j++){
        const inp=$$(".qe-inp",tr)[startC+j]; if(inp) inp.value=cols[j].trim();
      }
    });
    updateIndices();
  });

  grid.addEventListener("keydown", e=>{
    const inp=e.target.closest(".qe-inp"); if(!inp) return;
    const r=+inp.dataset.row||0, c=+inp.dataset.col||0;
    const tr=tbody.children[r]; const nextRow = (rr)=>tbody.children[rr];
    const move=(rr,cc)=>{ const row=nextRow(rr); if(!row) return; const el=$$(".qe-inp",row)[cc]; el?.focus(); };
    if (e.key==="Enter"){ e.preventDefault(); move(r+1, c); }
    if (e.key==="ArrowDown"){ e.preventDefault(); move(r+1, c); }
    if (e.key==="ArrowUp"){ e.preventDefault(); move(r-1, c); }
    if (e.key==="ArrowLeft" && c>0){ e.preventDefault(); move(r, c-1); }
    if (e.key==="ArrowRight" && c<8-1){ e.preventDefault(); move(r, c+1); }
    if (e.key==="Tab"){ updateIndices(); }
  });

  tbody.addEventListener("click", e=>{
    const btn=e.target.closest(".row-del"); if(!btn) return;
    const tr=btn.closest("tr"); tr?.remove(); updateIndices();
  });

  btnAddRow?.addEventListener("click", ()=>{ makeRow(); updateIndices(); });
  btnClear ?.addEventListener("click", ()=>{ clearRows(); ensureRows(); updateIndices(); });

  btnApply ?.addEventListener("click", ()=>{
    const rows=$$("#quickGrid tbody tr").map(tr=>{
      const v = sel => { const el=sel; if(!el) return ""; return el.value?.trim()||""; };
      const cells=$$(".qe-inp", tr);
      const signer=$(".qe-signer", tr)?.value || "";
      return {
        time: v(cells[0]),
        sales: toNum(v(cells[1])),
        txns:  toNum(v(cells[2])),
        units: toNum(v(cells[3])),
        hTarget: toNum(v(cells[4])),
        ly:     toNum(v(cells[5])),
        traffic:toNum(v(cells[6])),
        tTarget:toNum(v(cells[7])),
        signedBy: signer
      };
    }).filter(r=>r.time || Number.isFinite(r.sales));
    if (!rows.length){ alert("No rows to apply."); return; }
    window.dashboardAPI.setHourlyData(rows, {});  // render + autosave handled inside your app
    closeModal();
  });

})();
