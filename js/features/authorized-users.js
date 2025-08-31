// features/authorized-users.js – Persistent user management
import { $ } from "../core/dom.js";
import { state } from "../core/state.js";

const STORAGE_KEY = 'authorizedUsers:list';

export function loadUsers() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved) {
    try {
      state.authorizedUsers = JSON.parse(saved);
      return state.authorizedUsers;
    } catch (e) {
      console.error('Error loading users:', e);
    }
  }
  
  // Default users
  state.authorizedUsers = [
    { name: 'Store Manager', role: 'Store Manager', id: '001' },
    { name: 'Assistant Manager', role: 'Assistant Manager', id: '002' }
  ];
  
  return state.authorizedUsers;
}

export function saveUsers(users) {
  state.authorizedUsers = users;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(users));
}

function renderUsersList() {
  const container = $("#usersList");
  if (!container) return;
  
  const users = state.authorizedUsers || loadUsers();
  
  if (users.length === 0) {
    container.innerHTML = '<div class="muted">No authorized users yet</div>';
    return;
  }
  
  container.innerHTML = users.map((user, idx) => `
    <div class="user-item">
      <div class="user-info">
        <div class="user-name">${user.name}</div>
        <span class="user-role">${user.role}</span>
      </div>
      <button class="user-remove" onclick="removeUser(${idx})" title="Remove user">✕</button>
    </div>
  `).join('');
}

function addUser() {
  const nameInput = $("#newUserName");
  const roleSelect = $("#newUserRole");
  
  if (!nameInput || !roleSelect) return;
  
  const name = nameInput.value.trim();
  const role = roleSelect.value;
  
  if (!name) {
    alert("Please enter a user name");
    return;
  }
  
  const users = state.authorizedUsers || loadUsers();
  
  // Check for duplicates
  if (users.some(u => u.name.toLowerCase() === name.toLowerCase())) {
    alert("User already exists");
    return;
  }
  
  // Generate unique ID
  const id = Date.now().toString(36) + Math.random().toString(36).substr(2);
  
  users.push({ name, role, id });
  saveUsers(users);
  
  // Clear inputs
  nameInput.value = '';
  roleSelect.selectedIndex = 0;
  
  // Re-render list
  renderUsersList();
  
  // Show feedback
  const chip = $("#statusChip");
  if (chip) {
    chip.textContent = "User added successfully";
    chip.classList.add("ready");
    setTimeout(() => {
      chip.textContent = "● Online";
    }, 2000);
  }
}

function removeUser(idx) {
  const users = state.authorizedUsers || loadUsers();
  
  if (users.length <= 1) {
    alert("Cannot remove all users. At least one authorized user is required.");
    return;
  }
  
  const user = users[idx];
  if (confirm(`Remove ${user.name} from authorized users?`)) {
    users.splice(idx, 1);
    saveUsers(users);
    renderUsersList();
  }
}

function openModal() {
  const modal = $("#authUsersModal");
  if (modal) {
    modal.classList.add("open");
    renderUsersList();
  }
}

function closeModal() {
  const modal = $("#authUsersModal");
  if (modal) {
    modal.classList.remove("open");
  }
}

export function initAuthorizedUsers() {
  // Load users on init
  loadUsers();
  
  // Bind button events
  const btn = $("#authUsersBtn");
  if (btn) {
    btn.addEventListener("click", openModal);
  }
  
  const addBtn = $("#addUserBtn");
  if (addBtn) {
    addBtn.addEventListener("click", addUser);
  }
  
  // Make removeUser globally available for onclick handlers
  window.removeUser = (idx) => {
    removeUser(idx);
  };
  
  // Close modal on outside click
  const modal = $("#authUsersModal");
  if (modal) {
    modal.addEventListener("click", (e) => {
      if (e.target === modal) {
        closeModal();
      }
    });
  }
  
  // Handle Enter key in name input
  const nameInput = $("#newUserName");
  if (nameInput) {
    nameInput.addEventListener("keypress", (e) => {
      if (e.key === "Enter") {
        addUser();
      }
    });
  }
}