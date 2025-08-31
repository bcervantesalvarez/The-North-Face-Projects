// features/period-filters.js – Time period filtering (Morning/Noon/Evening)
import { $, $ } from "../core/dom.js";
import { state } from "../core/state.js";
import { renderCharts, renderHeatmap, renderForecast } from "../ui/charts.js";
import { renderKPIs } from "../ui/kpis.js";
import { renderTables } from "../ui/tables.js";

const PERIOD_DEFINITIONS = {
  all: { name: 'All Day', start: null, end: null },
  morning: { name: 'Morning', startHour: 6, endHour: 12 },
  noon: { name: 'Noon', startHour: 12, endHour: 15 },
  evening: { name: 'Evening', startHour: 15, endHour: 24 }
};

export function initPeriodFilters() {
  // Find all period toggle buttons
  const buttons = $$(".period-btn");
  
  buttons.forEach(btn => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      
      // Update active state
      buttons.forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      
      // Apply filter
      const period = btn.dataset.period || 'all';
      applyPeriodFilter(period);
    });
  });
  
  // Also bind change events to manual time selectors
  const startSel = $("#selStart");
  const endSel = $("#selEnd");
  
  if (startSel) {
    startSel.addEventListener("change", () => {
      state.filters.startIdx = parseInt(startSel.value) || 0;
      updateChartsAndKPIs();
      // Clear period button selection when manually changing
      $$(".period-btn").forEach(b => b.classList.remove("active"));
    });
  }
  
  if (endSel) {
    endSel.addEventListener("change", () => {
      state.filters.endIdx = parseInt(endSel.value) || (state.hourly.length - 1);
      updateChartsAndKPIs();
      // Clear period button selection when manually changing
      $$(".period-btn").forEach(b => b.classList.remove("active"));
    });
  }
  
  // Min transactions filter
  const minTxn = $("#minTxn");
  if (minTxn) {
    minTxn.addEventListener("change", () => {
      state.filters.minTxn = parseInt(minTxn.value) || 0;
      updateChartsAndKPIs();
    });
  }
}

function applyPeriodFilter(period) {
  const definition = PERIOD_DEFINITIONS[period];
  
  if (!definition || period === 'all') {
    // Reset to full day
    state.filters.startIdx = 0;
    state.filters.endIdx = state.hourly.length - 1;
  } else {
    // Find indices based on hour definitions
    const startIdx = findHourIndex(definition.startHour, true);
    const endIdx = findHourIndex(definition.endHour, false);
    
    if (startIdx !== -1 && endIdx !== -1) {
      state.filters.startIdx = startIdx;
      state.filters.endIdx = endIdx;
    }
  }
  
  // Update the select dropdowns to reflect the change
  const startSel = $("#selStart");
  const endSel = $("#selEnd");
  
  if (startSel) startSel.value = state.filters.startIdx;
  if (endSel) endSel.value = state.filters.endIdx;
  
  // Trigger updates
  updateChartsAndKPIs();
  
  // Add visual feedback
  highlightPeriod(period);
}

function findHourIndex(targetHour, isStart) {
  for (let i = 0; i < state.hourly.length; i++) {
    const time = state.hourly[i].time;
    if (!time) continue;
    
    const hour = parseInt(time.split(':')[0]);
    
    if (isStart) {
      // Find first occurrence >= targetHour
      if (hour >= targetHour) return i;
    } else {
      // Find last occurrence < targetHour
      if (hour >= targetHour && i > 0) return i - 1;
    }
  }
  
  // If not found, return boundary
  return isStart ? 0 : state.hourly.length - 1;
}

function updateChartsAndKPIs() {
  // Re-render all visualizations with new filter
  renderCharts();
  renderHeatmap();
  renderForecast();
  renderKPIs();
  renderTables();
  
  // Show period info in status
  showPeriodStatus();
}

function highlightPeriod(period) {
  const definition = PERIOD_DEFINITIONS[period];
  
  // Add subtle animation to the affected chart
  const hourlyChart = $("#wrap-hourly");
  if (hourlyChart) {
    hourlyChart.classList.add("highlight");
    setTimeout(() => {
      hourlyChart.classList.remove("highlight");
    }, 300);
  }
}

function showPeriodStatus() {
  const chip = $("#statusChip");
  if (!chip) return;
  
  const start = state.filters.startIdx;
  const end = state.filters.endIdx;
  
  if (start === 0 && end === state.hourly.length - 1) {
    chip.textContent = "● Online";
  } else {
    const startTime = state.hourly[start]?.time || '';
    const endTime = state.hourly[end]?.time || '';
    chip.textContent = `Viewing: ${startTime} - ${endTime}`;
  }
  
  chip.classList.add("ready");
}