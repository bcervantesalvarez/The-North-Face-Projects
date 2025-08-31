// ui/menus.js – Working dropdown menu system
import { $, $$ } from "../core/dom.js";

export function closeMenus() { 
  // Close old style menus
  $$(".actions .menu").forEach(menu => { 
    menu.classList.remove("open"); 
    const trig = $(".menu-trigger", menu);
    trig?.setAttribute("aria-expanded", "false");
  });
  
  // Close new style dropdowns
  $$(".dropdown").forEach(dropdown => {
    dropdown.classList.remove("open");
    const toggle = $(".dropdown-toggle", dropdown);
    if (toggle) toggle.setAttribute("aria-expanded", "false");
  });
}

export function bindMenu(prefix) {
  // Handle old style menus (export, tools, diag)
  const btn = $("#" + prefix + "MenuBtn");
  const panel = $("#" + prefix + "Menu");
  const box = btn?.closest(".menu");
  
  if (btn && panel && box) {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      const open = !box.classList.contains("open");
      closeMenus();
      if (open) {
        box.classList.add("open");
        btn.setAttribute("aria-expanded", "true");
      }
    });
  }
  
  // Handle new style dropdowns (data, settings)
  const dropdown = btn?.closest(".dropdown");
  if (btn && dropdown) {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      const open = !dropdown.classList.contains("open");
      closeMenus();
      if (open) {
        dropdown.classList.add("open");
        btn.setAttribute("aria-expanded", "true");
      }
    });
  }
}

export function bindMenus() {
  // Bind old style menus if they exist
  ["export", "tools", "diag"].forEach(bindMenu);
  
  // Bind new style dropdowns
  ["dataMenu", "settingsMenu"].forEach(bindMenu);
  
  // Close on document click
  document.addEventListener("click", (e) => {
    if (!e.target.closest(".menu") && !e.target.closest(".dropdown")) {
      closeMenus();
    }
  });
  
  // Handle all menu items
  $$(".menu-panel button, .dropdown-menu button").forEach(item => {
    item.addEventListener("click", () => {
      // Let the button do its action, then close menu
      setTimeout(closeMenus, 100);
    });
  });
}