// ui/swap.js – Fixed swap/reorder functionality
import { $, $$ } from "../core/dom.js";
import { saveOrder } from "./layout.js";
import { resizeChartsSoon } from "./charts.js";

let swapState = {
  active: false,
  source: null,
  onMove: null,
  onClick: null,
  onKey: null
};

function startSwap(card) {
  if (swapState.active) return;
  
  swapState.active = true;
  swapState.source = card;
  card.classList.add("swap-source");
  document.body.classList.add("swap-mode");
  document.body.style.cursor = "crosshair";
  
  bindSwapEvents();
}

function endSwap() {
  if (!swapState.active) return;
  
  swapState.active = false;
  if (swapState.source) {
    swapState.source.classList.remove("swap-source");
  }
  
  $$(".swap-hover").forEach(el => el.classList.remove("swap-hover"));
  document.body.classList.remove("swap-mode");
  document.body.style.cursor = "";
  
  unbindSwapEvents();
  swapState.source = null;
}

function bindSwapEvents() {
  swapState.onMove = (e) => {
    if (!swapState.active) return;
    const target = e.target.closest(".card-item");
    
    $$(".card-item").forEach(card => {
      card.classList.toggle("swap-hover", card === target && card !== swapState.source);
    });
  };
  
  swapState.onClick = (e) => {
    if (!swapState.active) return;
    
    const target = e.target.closest(".card-item");
    
    if (!target || target === swapState.source) {
      endSwap();
      return;
    }
    
    // Perform the swap
    const parent = swapState.source.parentElement;
    const sourceNext = swapState.source.nextElementSibling;
    const targetNext = target.nextElementSibling;
    
    if (sourceNext === target) {
      // Adjacent elements, just swap
      parent.insertBefore(target, swapState.source);
    } else if (targetNext === swapState.source) {
      // Adjacent elements, reverse order
      parent.insertBefore(swapState.source, target);
    } else {
      // Non-adjacent, use placeholder
      const temp = document.createElement("div");
      parent.insertBefore(temp, swapState.source);
      parent.insertBefore(swapState.source, targetNext);
      parent.insertBefore(target, temp);
      temp.remove();
    }
    
    // Save new order
    saveOrder();
    
    // Add visual feedback
    target.classList.add("swap-flash");
    swapState.source.classList.add("swap-flash");
    setTimeout(() => {
      target.classList.remove("swap-flash");
      swapState.source.classList.remove("swap-flash");
    }, 300);
    
    endSwap();
    resizeChartsSoon();
  };
  
  swapState.onKey = (e) => {
    if (e.key === "Escape") {
      endSwap();
    }
  };
  
  document.addEventListener("mousemove", swapState.onMove);
  document.addEventListener("click", swapState.onClick);
  document.addEventListener("keydown", swapState.onKey);
}

function unbindSwapEvents() {
  if (swapState.onMove) {
    document.removeEventListener("mousemove", swapState.onMove);
  }
  if (swapState.onClick) {
    document.removeEventListener("click", swapState.onClick);
  }
  if (swapState.onKey) {
    document.removeEventListener("keydown", swapState.onKey);
  }
}

export function initSwapButtons() {
  // Add CSS for swap effects if not present
  if (!$("#swap-styles")) {
    const style = document.createElement("style");
    style.id = "swap-styles";
    style.textContent = `
      .swap-mode * { cursor: crosshair !important; }
      .swap-source { 
        outline: 2px solid #EF3224 !important; 
        outline-offset: 2px;
      }
      .swap-hover { 
        outline: 2px dashed #7ac6ff !important; 
        outline-offset: 2px;
      }
      .swap-flash {
        animation: flashSwap 0.3s ease-out;
      }
      @keyframes flashSwap {
        0% { transform: scale(1.02); opacity: 0.8; }
        100% { transform: scale(1); opacity: 1; }
      }
    `;
    document.head.appendChild(style);
  }
  
  // Bind reorder buttons
  $$(".reorder-btn").forEach(btn => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      
      if (swapState.active) {
        endSwap();
        return;
      }
      
      const card = btn.closest(".card-item");
      if (card) {
        startSwap(card);
      }
    });
  });
}

export function restoreSidebarOrder() {
  // This function can be expanded later for sidebar tile ordering
  // For now, just ensure the sidebar exists
  const sidebar = $("#sidebar");
  if (!sidebar) {
    console.warn("Sidebar not found");
  }
}