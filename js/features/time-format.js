// features/time-format.js - Time format controls with AM/PM
import { $, $$ } from "../core/dom.js";
import { state } from "../core/state.js";

let timeSettings = {
  format: '12hr', // '12hr' or '24hr'
  timezone: 'local' // 'local' or specific timezone
};

export function initTimeFormatControls() {
  // Load saved settings
  const saved = localStorage.getItem('timeSettings');
  if (saved) {
    try {
      timeSettings = { ...timeSettings, ...JSON.parse(saved) };
    } catch (e) {}
  }
  
  // Add format toggle to Time Window section
  addFormatControls();
  
  // Update existing time displays
  updateAllTimeDisplays();
}

function addFormatControls() {
  const timeSection = $('#tile-filters');
  if (!timeSection) return;
  
  // Check if controls already exist
  if ($('.time-format-toggle', timeSection)) return;
  
  // Create format toggle
  const formatControl = document.createElement('div');
  formatControl.className = 'time-control-group';
  formatControl.innerHTML = `
    <label style="font-size: 10px; color: var(--muted);">Time Format</label>
    <div class="time-format-toggle">
      <button class="time-format-btn ${timeSettings.format === '12hr' ? 'active' : ''}" data-format="12hr">12hr</button>
      <button class="time-format-btn ${timeSettings.format === '24hr' ? 'active' : ''}" data-format="24hr">24hr</button>
    </div>
  `;
  
  // Insert after the title
  const title = $('.tile-h', timeSection);
  if (title && title.nextSibling) {
    title.parentNode.insertBefore(formatControl, title.nextSibling);
  }
  
  // Bind format toggle buttons
  formatControl.querySelectorAll('.time-format-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      timeSettings.format = btn.dataset.format;
      
      // Update active state
      formatControl.querySelectorAll('.time-format-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      
      // Save setting
      localStorage.setItem('timeSettings', JSON.stringify(timeSettings));
      
      // Update displays
      updateAllTimeDisplays();
    });
  });
}

function formatTime(time24) {
  if (!time24) return '';
  
  if (timeSettings.format === '24hr') {
    return time24;
  }
  
  // Convert to 12hr format with AM/PM
  const [hourStr, minuteStr] = time24.split(':');
  let hour = parseInt(hourStr);
  const minute = minuteStr || '00';
  
  const period = hour >= 12 ? 'PM' : 'AM';
  
  if (hour === 0) {
    hour = 12; // Midnight
  } else if (hour > 12) {
    hour = hour - 12;
  }
  
  return `${hour}:${minute} ${period}`;
}

function parse24HourTime(time12) {
  if (!time12) return '';
  
  // If already in 24hr format, return as is
  if (!time12.includes('AM') && !time12.includes('PM')) {
    return time12;
  }
  
  const match = time12.match(/(\d+):(\d+)\s*(AM|PM)/i);
  if (!match) return time12;
  
  let hour = parseInt(match[1]);
  const minute = match[2];
  const period = match[3].toUpperCase();
  
  if (period === 'PM' && hour !== 12) {
    hour += 12;
  } else if (period === 'AM' && hour === 12) {
    hour = 0;
  }
  
  return `${hour.toString().padStart(2, '0')}:${minute}`;
}

function updateAllTimeDisplays() {
  // Update time dropdowns
  updateTimeSelectors();
  
  // Update table times
  updateTableTimes();
  
  // Update chart labels
  updateChartLabels();
}

function updateTimeSelectors() {
  const selStart = $('#selStart');
  const selEnd = $('#selEnd');
  
  if (!selStart || !selEnd) return;
  
  // Save current values
  const currentStart = selStart.value;
  const currentEnd = selEnd.value;
  
  // Update option texts
  selStart.querySelectorAll('option').forEach(option => {
    const originalTime = state.hourly[option.value]?.time;
    if (originalTime) {
      option.textContent = formatTime(originalTime);
    }
  });
  
  selEnd.querySelectorAll('option').forEach(option => {
    const originalTime = state.hourly[option.value]?.time;
    if (originalTime) {
      option.textContent = formatTime(originalTime);
    }
  });
  
  // Restore values
  selStart.value = currentStart;
  selEnd.value = currentEnd;
}

function updateTableTimes() {
  const tbody = $('#tbl tbody');
  if (!tbody) return;
  
  tbody.querySelectorAll('tr').forEach((row, idx) => {
    const timeCell = row.querySelector('td:first-child');
    if (timeCell && state.hourly[idx]) {
      timeCell.textContent = formatTime(state.hourly[idx].time);
    }
  });
}

function updateChartLabels() {
  // Update chart labels if charts exist
  if (state.charts?.hourly) {
    state.charts.hourly.data.labels = state.hourly.map(h => formatTime(h.time));
    state.charts.hourly.update('none');
  }
  
  if (state.charts?.cume) {
    state.charts.cume.data.labels = state.hourly.map(h => formatTime(h.time));
    state.charts.cume.update('none');
  }
  
  if (state.charts?.tu) {
    state.charts.tu.data.labels = state.hourly.map(h => formatTime(h.time));
    state.charts.tu.update('none');
  }
  
  if (state.charts?.eff) {
    state.charts.eff.data.labels = state.hourly.map(h => formatTime(h.time));
    state.charts.eff.update('none');
  }
}

// Export for use in other modules
export function getTimeFormat() {
  return timeSettings.format;
}

export function formatTimeDisplay(time24) {
  return formatTime(time24);
}