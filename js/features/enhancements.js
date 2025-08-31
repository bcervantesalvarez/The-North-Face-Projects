// features/enhancements.js - Dashboard enhancements module
import { $ } from "../core/dom.js";
import { state } from "../core/state.js";

// Store Hours Management
function initStoreHours() {
  const STORAGE_KEY = 'storeHours:config';
  
  // Load saved hours
  state.storeHours = { open: '10:00', close: '21:00' };
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved) {
    try {
      state.storeHours = JSON.parse(saved);
    } catch (e) {
      console.error('Error loading store hours:', e);
    }
  }
  
  // Apply to inputs if they exist
  const openInput = $('#openTime');
  const closeInput = $('#closeTime');
  if (openInput) openInput.value = state.storeHours.open;
  if (closeInput) closeInput.value = state.storeHours.close;
  
  // Store Hours button
  const storeHoursBtn = $('#storeHoursBtn');
  if (storeHoursBtn) {
    storeHoursBtn.addEventListener('click', () => {
      const modal = $('#storeHoursModal');
      if (modal) modal.classList.add('open');
    });
  }
  
  // Save button
  const saveBtn = $('#saveStoreHours');
  if (saveBtn) {
    saveBtn.addEventListener('click', () => {
      const open = $('#openTime').value;
      const close = $('#closeTime').value;
      
      state.storeHours = { open, close };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state.storeHours));
      
      const modal = $('#storeHoursModal');
      if (modal) modal.classList.remove('open');
      
      // Generate new time options
      updateTimeOptions();
      
      // Update status
      const chip = $('#statusChip');
      if (chip) {
        chip.textContent = 'Store hours saved';
        setTimeout(() => { chip.textContent = '● Online'; }, 2000);
      }
    });
  }
}

// Update time options based on store hours
function updateTimeOptions() {
  if (!state.storeHours) return;
  
  const [openH] = state.storeHours.open.split(':').map(Number);
  const [closeH] = state.storeHours.close.split(':').map(Number);
  
  const times = [];
  for (let h = openH; h <= closeH; h++) {
    times.push(`${h.toString().padStart(2, '0')}:00`);
  }
  
  // Update dropdowns
  const selStart = $('#selStart');
  const selEnd = $('#selEnd');
  
  if (selStart && selEnd) {
    const options = times.map((t, i) => `<option value="${i}">${t}</option>`).join('');
    selStart.innerHTML = options;
    selEnd.innerHTML = options;
    selEnd.value = times.length - 1;
    
    state.filters.startIdx = 0;
    state.filters.endIdx = times.length - 1;
  }
}

// Authorized Users Management
function initAuthorizedUsers() {
  const STORAGE_KEY = 'authorizedUsers:list';
  
  // Initialize users
  if (!state.authorizedUsers) {
    state.authorizedUsers = [
      { name: 'Store Manager', role: 'Store Manager' },
      { name: 'Assistant Manager', role: 'Assistant Manager' }
    ];
  }
  
  // Load saved users
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved) {
    try {
      state.authorizedUsers = JSON.parse(saved);
    } catch (e) {
      console.error('Error loading users:', e);
    }
  }
  
  // Render users function
  function renderUsers() {
    const container = $('#usersList');
    if (!container) return;
    
    if (state.authorizedUsers.length === 0) {
      container.innerHTML = '<div class="muted">No authorized users</div>';
      return;
    }
    
    container.innerHTML = state.authorizedUsers.map((user, idx) => `
      <div class="user-item">
        <div class="user-info">
          <div class="user-name">${user.name}</div>
          <span class="user-role">${user.role}</span>
        </div>
        <button class="user-remove" data-idx="${idx}">✕</button>
      </div>
    `).join('');
    
    // Bind remove buttons
    container.querySelectorAll('.user-remove').forEach(btn => {
      btn.addEventListener('click', () => {
        const idx = parseInt(btn.dataset.idx);
        if (state.authorizedUsers.length > 1) {
          if (confirm(`Remove ${state.authorizedUsers[idx].name}?`)) {
            state.authorizedUsers.splice(idx, 1);
            localStorage.setItem(STORAGE_KEY, JSON.stringify(state.authorizedUsers));
            renderUsers();
          }
        } else {
          alert('Cannot remove all users. At least one user is required.');
        }
      });
    });
  }
  
  // Users button
  const usersBtn = $('#authUsersBtn');
  if (usersBtn) {
    usersBtn.addEventListener('click', () => {
      renderUsers();
      const modal = $('#authUsersModal');
      if (modal) modal.classList.add('open');
    });
  }
  
  // Add User button
  const addBtn = $('#addUserBtn');
  if (addBtn) {
    addBtn.addEventListener('click', () => {
      const nameInput = $('#newUserName');
      const roleSelect = $('#newUserRole');
      
      if (!nameInput || !roleSelect) return;
      
      const name = nameInput.value.trim();
      const role = roleSelect.value;
      
      if (name) {
        state.authorizedUsers.push({ name, role });
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state.authorizedUsers));
        nameInput.value = '';
        renderUsers();
      }
    });
  }
}

// Period Filters
function initPeriodFilters() {
  const buttons = document.querySelectorAll('.period-btn');
  if (!buttons.length) return;
  
  buttons.forEach(btn => {
    btn.addEventListener('click', () => {
      buttons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      
      const period = btn.dataset.period || 'all';
      const selStart = $('#selStart');
      const selEnd = $('#selEnd');
      
      if (!selStart || !selEnd) return;
      
      const totalHours = selStart.options.length;
      if (totalHours === 0) return;
      
      switch(period) {
        case 'morning':
          selStart.value = 0;
          selEnd.value = Math.min(Math.floor(totalHours / 3), totalHours - 1);
          break;
        case 'noon':
          const noonStart = Math.floor(totalHours / 3);
          selStart.value = noonStart;
          selEnd.value = Math.min(noonStart + Math.floor(totalHours / 3), totalHours - 1);
          break;
        case 'evening':
          selStart.value = Math.floor(2 * totalHours / 3);
          selEnd.value = totalHours - 1;
          break;
        default:
          selStart.value = 0;
          selEnd.value = totalHours - 1;
      }
      
      // Trigger change events to update charts
      selStart.dispatchEvent(new Event('change'));
      selEnd.dispatchEvent(new Event('change'));
    });
  });
}

// Enhanced Dropdown Menus
function initEnhancedMenus() {
  // Helper to setup dropdown
  function setupDropdown(btnId) {
    const btn = $('#' + btnId);
    const dropdown = btn?.closest('.dropdown');
    
    if (!btn || !dropdown) return;
    
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const wasOpen = dropdown.classList.contains('open');
      
      // Close all dropdowns
      document.querySelectorAll('.dropdown').forEach(d => {
        d.classList.remove('open');
        const toggle = d.querySelector('.dropdown-toggle');
        if (toggle) toggle.setAttribute('aria-expanded', 'false');
      });
      
      // Toggle this one
      if (!wasOpen) {
        dropdown.classList.add('open');
        btn.setAttribute('aria-expanded', 'true');
      }
    });
  }
  
  // Setup both dropdowns
  setupDropdown('dataMenuBtn');
  setupDropdown('settingsMenuBtn');
  
  // Close on outside click
  document.addEventListener('click', () => {
    document.querySelectorAll('.dropdown').forEach(d => {
      d.classList.remove('open');
      const toggle = d.querySelector('.dropdown-toggle');
      if (toggle) toggle.setAttribute('aria-expanded', 'false');
    });
  });
  
  // Menu items shouldn't close dropdown immediately
  document.querySelectorAll('.dropdown-menu button').forEach(item => {
    item.addEventListener('click', (e) => {
      e.stopPropagation();
      // Close after a delay to allow action to complete
      setTimeout(() => {
        document.querySelectorAll('.dropdown').forEach(d => d.classList.remove('open'));
      }, 100);
    });
  });
}

// Modal handling
function initModals() {
  // Global close function
  window.closeModal = function(modalId) {
    const modal = $('#' + modalId);
    if (modal) modal.classList.remove('open');
  };
  
  // Close on background click
  document.querySelectorAll('.modal').forEach(modal => {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        modal.classList.remove('open');
      }
    });
  });
  
  // Close buttons
  document.querySelectorAll('.modal-close').forEach(btn => {
    btn.addEventListener('click', () => {
      const modal = btn.closest('.modal');
      if (modal) modal.classList.remove('open');
    });
  });
}

// Clear data button
function initClearData() {
  const clearBtn = $('#clearAllData');
  if (clearBtn) {
    clearBtn.addEventListener('click', () => {
      if (confirm('Clear all dashboard data? This cannot be undone.')) {
        state.hourly = [];
        state.wtd = {};
        state.meta = {};
        
        // Trigger re-render if API exists
        if (window.dashboardAPI?.loadDataset) {
          window.dashboardAPI.loadDataset({ hourly: [], wtd: {}, meta: {} });
        }
        
        const chip = $('#statusChip');
        if (chip) {
          chip.textContent = 'Data cleared';
          setTimeout(() => { chip.textContent = '● Online'; }, 2000);
        }
      }
    });
  }
}

// Main initialization function
export function initEnhancements() {
  console.log('Initializing dashboard enhancements...');
  
  // Initialize all features
  initEnhancedMenus();
  initStoreHours();
  initAuthorizedUsers();
  initPeriodFilters();
  initModals();
  initClearData();
  
  // Update time options after store hours load
  updateTimeOptions();
  
  console.log('Dashboard enhancements ready');
}

// Also export individual functions if needed
export {
  initStoreHours,
  initAuthorizedUsers,
  initPeriodFilters,
  initEnhancedMenus,
  initModals
};