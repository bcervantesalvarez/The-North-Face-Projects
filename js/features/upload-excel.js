// upload-excel.js — Drag/drop or picker upload, parse with XLSX, push to dashboardAPI
import { parseWorkbookToDataset, readFileToWorkbook } from "../io/xlsx-helpers.js";

function setStatus(ok, msg){
  const chip = document.getElementById("statusChip");
  chip?.classList.toggle("error", !ok);
  chip?.classList.toggle("ready", !!ok);
  if (chip) chip.textContent = `Status: ${msg}`;
}

async function handleFiles(files){
  if (!files?.length) return;
  try{
    const wb = await readFileToWorkbook(files[0]);
    const ds = parseWorkbookToDataset(wb);
    window.dashboardAPI?.loadDataset?.(ds);
    setStatus(true, "Excel loaded");
  }catch(err){
    console.error(err);
    setStatus(false, "Upload failed");
    alert("Sorry—couldn’t read that Excel file. Check the first sheet’s headers and try again.");
  }
}

function bindPicker(){
  const inp = document.getElementById("fileUpload") || document.querySelector('input[type="file"][data-role="excel-upload"]');
  if (!inp) return;
  inp.addEventListener("change", e => handleFiles(e.target.files));
}

function bindDropzone(){
  const dz = document.getElementById("dropExcel");
  if (!dz) return;
  const stop = e => { e.preventDefault(); e.stopPropagation(); };
  ["dragenter","dragover","dragleave","drop"].forEach(ev => dz.addEventListener(ev, stop, false));
  ["dragenter","dragover"].forEach(() => dz.classList.add("is-drag"));
  ["dragleave","drop"].forEach(() => dz.classList.remove("is-drag"));
  dz.addEventListener("drop", e => handleFiles(e.dataTransfer.files));
  dz.addEventListener("click", ()=>{
    const picker = document.createElement("input");
    picker.type = "file"; picker.accept = ".xlsx,.xls";
    picker.addEventListener("change", e => handleFiles(e.target.files));
    picker.click();
  });
}

export function initUploadExcel(){
  bindPicker();
  bindDropzone();
  // Back-compat global hook
  window.libraryTools = window.libraryTools || {};
  window.libraryTools.uploadExcel = handleFiles;
}
