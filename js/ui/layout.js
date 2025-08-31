// ui/layout.js – Fixed view toggles and layout management
import { $, $$, ensureStash } from "../core/dom.js";
import { state, ORDER_DEFAULT } from "../core/state.js";
import { resizeChartsSoon } from "./charts.js";

const MINH = 260, DEFAULT_H = 380, MAXH = 820;

export function setCardHeight(el, h) {
  const clamped = Math.max(MINH, Math.min(MAXH, Math.round(h)));
  el.style.height = clamped + "px";
  const key = el?.dataset?.sizeKey;
  if (key) localStorage.setItem("size:" + key, JSON.stringify({h: clamped}));
  resizeChartsSoon();
}

function columnWidth() {
  const plotsGrid = $("#plotsGrid");
  const s = getComputedStyle(plotsGrid), gap = parseFloat(s.gap) || 18;
  const total = plotsGrid.getBoundingClientRect().width;
  return (total - gap) / 2;
}

export function applyWideState(card, wide) {
  if (!card) return;
  card.classList.toggle("wide", wide);
  if (card.id) localStorage.setItem("wide:" + card.id, wide ? "1" : "0");
  resizeChartsSoon();
}

export function initWideButtons() {
  $$(".card-item").forEach(card => {
    const btn = $(".wide-btn", card);
    if (!btn) return;
    const saved = localStorage.getItem("wide:" + card.id);
    if (saved === "1") card.classList.add("wide"); 
    else card.classList.remove("wide");
    btn.addEventListener("click", () => applyWideState(card, !card.classList.contains("wide")));
  });
}

export function attachResizers(el) {
  const nub = $(".resize-nub.r-se", el);
  if (!nub) return;
  
  const start = {x: 0, y: 0, h: 0, w: 0, wide: el.classList.contains("wide")};
  
  function onMove(ev) {
    const dy = ev.clientY - start.y;
    setCardHeight(el, start.h + dy);
    const dx = ev.clientX - start.x;
    const desiredW = start.w + dx, single = columnWidth(), hysteresis = 40;
    if (!start.wide && desiredW > single + hysteresis) {
      applyWideState(el, true);
      start.wide = true;
    }
    else if (start.wide && desiredW < single - hysteresis) {
      applyWideState(el, false);
      start.wide = false;
    }
  }
  
  function onUp(ev) {
    el.classList.remove("resizing");
    el.releasePointerCapture?.(ev.pointerId);
    window.removeEventListener("pointermove", onMove);
    window.removeEventListener("pointerup", onUp);
  }
  
  nub.addEventListener("pointerdown", (ev) => {
    const r = el.getBoundingClientRect();
    start.x = ev.clientX;
    start.y = ev.clientY;
    start.h = r.height;
    start.w = r.width;
    el.classList.add("resizing");
    el.setPointerCapture?.(ev.pointerId);
    window.addEventListener("pointermove", onMove, {passive: true});
    window.addEventListener("pointerup", onUp, {passive: true});
  });
}

export function restoreSizes() {
  $$(".resizable").forEach(el => {
    const key = el.dataset.sizeKey;
    const saved = key && localStorage.getItem("size:" + key);
    if (saved) {
      try {
        setCardHeight(el, JSON.parse(saved).h);
      } catch {
        setCardHeight(el, DEFAULT_H);
      }
    } else {
      setCardHeight(el, DEFAULT_H);
    }
  });
}

export function cardItems() {
  const plotsGrid = $("#plotsGrid");
  return $$(".card-item", plotsGrid).filter(el => getComputedStyle(el).display !== "none");
}

export function saveOrder() {
  localStorage.setItem("plots:order", cardItems().map(el => el.id).join(","));
}

export function restoreOrder() {
  const plotsGrid = $("#plotsGrid");
  const list = (localStorage.getItem("plots:order") || "").split(",").filter(Boolean);
  const get = id => $("#" + id);
  
  if (!list.length) {
    // Default order including new charts
    const defaultOrder = [...ORDER_DEFAULT, "wrap-heatmap", "wrap-forecast"];
    defaultOrder.forEach(id => {
      const el = get(id);
      if (el) plotsGrid.appendChild(el);
    });
    return;
  }
  
  list.forEach(id => {
    const el = get(id);
    if (el) plotsGrid.appendChild(el);
  });
}

// Fixed view toggles that actually hide/show charts
export function applyViews() {
  const viewMap = {
    "wrap-hourly": $("#viewHourly"),
    "wrap-cume": $("#viewCume"),
    "wrap-tu": $("#viewTU") || $("#viewTransactions"),
    "wrap-eff": $("#viewEff") || $("#viewEfficiency"),
    "wrap-heatmap": $("#viewHeatmap"),
    "wrap-forecast": $("#viewForecast"),
    "wrap-table": $("#viewTable")
  };
  
  Object.entries(viewMap).forEach(([cardId, checkbox]) => {
    if (!checkbox) return;
    
    const card = $("#" + cardId);
    if (!card) return;
    
    if (checkbox.checked) {
      card.style.display = "";
    } else {
      card.style.display = "none";
    }
  });
  
  saveOrder();
  resizeChartsSoon();
}

export function bindViewInputs() {
  const viewMap = {
    "wrap-hourly": $("#viewHourly"),
    "wrap-cume": $("#viewCume") || $("#viewCumulative"),
    "wrap-tu": $("#viewTU") || $("#viewTransactions"),
    "wrap-eff": $("#viewEff") || $("#viewEfficiency"),
    "wrap-heatmap": $("#viewHeatmap"),
    "wrap-forecast": $("#viewForecast"),
    "wrap-table": $("#viewTable")
  };
  
  Object.entries(viewMap).forEach(([cardId, checkbox]) => {
    if (!checkbox) return;
    
    // Load saved state
    const saved = localStorage.getItem("view:" + cardId);
    if (saved !== null) {
      checkbox.checked = saved === "1";
    }
    
    // Bind change event
    checkbox.addEventListener("change", () => {
      localStorage.setItem("view:" + cardId, checkbox.checked ? "1" : "0");
      applyViews();
    });
  });
}

export function bindSidebarResizer() {
  const bar = $("#colResizer");
  if (!bar) return;
  
  const root = document.documentElement;
  const saved = localStorage.getItem("sidebarW");
  if (saved) root.style.setProperty("--sidebarW", saved);
  
  function onMove(e) {
    const grid = $(".layout-2col");
    const min = 280, max = 640;
    const gridLeft = grid.getBoundingClientRect().left;
    const x = e.clientX - gridLeft;
    const w = Math.max(min, Math.min(max, x));
    root.style.setProperty("--sidebarW", `${w}px`);
  }
  
  function onUp() {
    document.body.classList.remove("is-resizing");
    window.removeEventListener("pointermove", onMove);
    window.removeEventListener("pointerup", onUp);
    const val = getComputedStyle(root).getPropertyValue("--sidebarW").trim();
    localStorage.setItem("sidebarW", val);
  }
  
  bar.addEventListener("pointerdown", () => {
    document.body.classList.add("is-resizing");
    window.addEventListener("pointermove", onMove, {passive: true});
    window.addEventListener("pointerup", onUp, {passive: true});
  });
}