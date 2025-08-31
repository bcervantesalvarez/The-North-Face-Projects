// features/store-hours.js – Persistent store hours management
import { $ } from "../core/dom.js";
import { state } from "../core/state.js";

const STORAGE_KEY = 'storeHours:config';

export function loadStoreHours() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved) {
    try {
      const config = JSON.parse(saved);
      state.storeHours = config;
      return config;
    } catch (e) {
      console.error('Error loading store hours:', e);
    }
  }
  
  // Default hours
  state.storeHours = {
    open: '10:00',
    close: '21:00',
    days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
  };
  return state.storeHours;
}

export function saveStoreHours(config) {
  state.storeHours = config;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
  
  // Generate new time options based on hours
  generateTimeOptions();
  
  // Show success feedback
  const chip = $("#statusChip");
  if (chip) {
    chip.textContent = "Store hours updated";
    chip.classList.add("ready");
    setTimeout(() => {
      chip.textContent = "● Online";
    }, 2000);
  }
}

function generateTimeOptions() {
  const config = state.storeHours || loadStoreHours();
  const [openH] = config.open.split(':').map(Number);
  const [closeH] = config.close.split(':').map(Number);
  
  const times = [];
  for (let h = openH; h <= closeH; h++) {
    times.push(`${h.toString().padStart(2, '0')}:00`);
  }
  
  // Update state with time slots
  if (!state.hourly || state.hourly.length === 0) {
    state.hourly = times.map(time => ({
      time,
      sales: 0,
      txns: 0,
      units: 0,
      hTarget: 0,
      ly: 0,
      traffic: 0,
      tTarget: NaN
    }));
  }
  
  // Update time selectors
  updateTimeSelectors(times);
  
  return times;
}

function updateTimeSelectors(times) {
  const selStart = $("#selStart");
  const selEnd = $("#selEnd");
  
  if (!selStart || !selEnd) return;
  
  const options = times.map((t, i) => `<option value="${i}">${t}</option>`).join("");
  
  selStart.innerHTML = options;
  selEnd.innerHTML = options;
  
  // Set defaults
  state.filters.startIdx = 0;
  state.filters.endIdx = times.length - 1;
  selEnd.value = times.length - 1;
}

function openModal() {
  const modal = $("#storeHoursModal");
  if (modal) {
    modal.classList.add("open");
    
    // Populate current values
    const config = state.storeHours || loadStoreHours();
    const openInput = $("#openTime");
    const closeInput = $("#closeTime");
    
    if (openInput) openInput.value = config.open;
    if (closeInput) closeInput.value = config.close;
  }
}

function closeModal() {
  const modal = $("#storeHoursModal");
  if (modal) {
    modal.classList.remove("open");
  }
}

function handleSave() {
  const openInput = $("#openTime");
  const closeInput = $("#closeTime");
  
  if (!openInput || !closeInput) return;
  
  const open = openInput.value;
  const close = closeInput.value;
  
  // Validate times
  const [openH] = open.split(':').map(Number);
  const [closeH] = close.split(':').map(Number);
  
  if (closeH <= openH) {
    alert("Closing time must be after opening time");
    return;
  }
  
  saveStoreHours({
    open,
    close,
    days: state.storeHours?.days || ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
  });
  
  closeModal();
  
  // Trigger re-render if we have the API
  if (window.dashboardAPI?.loadDataset && state.hourly.length > 0) {
    const dataset = {
      hourly: state.hourly,
      wtd: state.wtd,
      meta: state.meta
    };
    window.dashboardAPI.loadDataset(dataset);
  }
}

export function initStoreHours() {
  // Load saved hours on init
  loadStoreHours();
  generateTimeOptions();
  
  // Bind button events
  const btn = $("#storeHoursBtn");
  if (btn) {
    btn.addEventListener("click", openModal);
  }
  
  const saveBtn = $("#saveStoreHours");
  if (saveBtn) {
    saveBtn.addEventListener("click", handleSave);
  }
  
  // Close modal on X or outside click
  const modal = $("#storeHoursModal");
  if (modal) {
    modal.addEventListener("click", (e) => {
      if (e.target === modal) {
        closeModal();
      }
    });
  }
  
  // Make closeModal globally available for onclick handlers
  window.closeModal = (id) => {
    const modal = $("#" + id);
    if (modal) modal.classList.remove("open");
  };
}