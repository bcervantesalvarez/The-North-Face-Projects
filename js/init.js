// init.js — boot, clock, and sidebar resizer
import { $, $$ } from "./core/dom.js";
import { bindSidebarResizer } from "./ui/layout.js";

export function startClock(){
  const el=$("#nowClock"); if(!el) return;
  const tick=()=>{ const d=new Date(); el.textContent = d.toLocaleString(); };
  tick(); setInterval(tick,1000);
}

export function initMisc(){
  bindSidebarResizer();
}
