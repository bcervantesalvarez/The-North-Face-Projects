// dom.js — tiny DOM and format helpers (no side effects)
export const $  = (s, sc = document) => sc.querySelector(s);
export const $$ = (s, sc = document) => Array.from(sc.querySelectorAll(s));

export const fmtMoney = new Intl.NumberFormat(undefined, {
  style: "currency", currency: "USD", maximumFractionDigits: 0
});
export const fmtPct = new Intl.NumberFormat(undefined, {
  style: "percent", maximumFractionDigits: 1
});

export const onClick = (id, fn) => { const el = $(`#${id}`); if (el) el.addEventListener("click", fn); };

export function ensureStash() {
  let stash = $("#stash");
  if (!stash) {
    stash = document.createElement("div");
    stash.id = "stash";
    stash.style.display = "none";
    document.body.appendChild(stash);
  }
  return stash;
}
