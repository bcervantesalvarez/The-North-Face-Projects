// tabs.js — Upload vs Track Sales toggle
import { $ } from "../core/dom.js";

export function bindTabs(){
  const tabUpload=$("#tabUpload"), tabQuick=$("#tabQuick"), paneUpload=$("#paneUpload"), paneQuick=$("#paneQuick");
  function activate(which){
    const isUpload = which==="upload";
    tabUpload?.classList.toggle("is-active", isUpload);
    tabQuick ?.classList.toggle("is-active", !isUpload);
    paneUpload?.classList.toggle("is-active", isUpload);
    paneQuick ?.classList.toggle("is-active", !isUpload);
    if(!isUpload){ window.quickEntry?.ensureRowsFromStoreHours?.(); }
  }
  tabUpload?.addEventListener("click", ()=>activate("upload"));
  tabQuick ?.addEventListener("click", ()=>activate("quick"));
}
