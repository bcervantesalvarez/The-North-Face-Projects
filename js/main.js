// js/main.js – enhanced entry point with enhancements module

import { renderKPIs } from "./ui/kpis.js";
import { renderTables } from "./ui/tables.js";
import { renderCharts } from "./ui/charts.js";

import {
  initWideButtons,
  attachResizers,
  restoreSizes,
  restoreOrder,
  applyViews,
  bindViewInputs
} from "./ui/layout.js";

import { initSwapButtons, restoreSidebarOrder } from "./ui/swap.js";
import { bindMenus } from "./ui/menus.js";

import { bindExporters } from "./features/exporters.js";
import { bindTemplateDownload } from "./features/template.js";
import { bindTabs } from "./features/tabs.js";
import { bindResets } from "./features/reset.js";

import { startClock, initMisc } from "./init.js";
import { setRenderAll } from "./api.js";

import { initUploadExcel } from "./features/upload-excel.js";
import { initQuickEntry } from "./features/quick-entry.js";
import { initLibrary } from "./features/library.js";
import { initStoreHours } from "./features/store-hours.js";

import { initDemoLoader, loadDemoNow } from "./features/demo.js";
import { state } from "./core/state.js";

// Import the new enhancements
import { initEnhancements } from "./features/enhancements.js";

function renderAll() {
  renderTables();
  renderCharts();
  renderKPIs();
}

function boot() {
  // Initialize enhancements first (includes store hours, users, menus)
  initEnhancements();
  
  // Layout & UI bindings
  initWideButtons();
  document.querySelectorAll(".resizable").forEach(attachResizers);
  restoreSizes();
  restoreOrder();
  restoreSidebarOrder();
  bindViewInputs();
  applyViews();
  initSwapButtons();
  bindMenus();

  // Feature bindings
  bindExporters();
  bindTemplateDownload();
  bindTabs();
  bindResets();
  startClock();
  initMisc();

  // Expose aggregate renderer for dataset loads
  setRenderAll(renderAll);

  // Initialize data features
  initUploadExcel();
  initQuickEntry();
  initLibrary();
  initStoreHours();

  // Demo: button binding + optional auto-load when empty or #demo
  initDemoLoader();
  const wantsAuto = location.hash.includes("demo") || localStorage.getItem("autoDemo") === "1";
  const isEmpty = !state.hourly || state.hourly.length === 0;
  if (wantsAuto || isEmpty) loadDemoNow();
  
  // Set current date if element exists
  const dateEl = document.getElementById('currentDate');
  if (dateEl) {
    const date = new Date();
    dateEl.textContent = date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short', 
      day: 'numeric',
      year: 'numeric'
    });
  }
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", boot);
} else {
  boot();
}