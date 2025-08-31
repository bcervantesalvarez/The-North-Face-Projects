// exporters.js — combine visible charts and export (PNG/JPEG/SVG/PDF), print
import { $, $$ } from "../core/dom.js";

function combinedCanvasFromVisible(){
  const cvs = ["#ch_hourly","#ch_cume","#ch_tu","#ch_eff"].map(sel=>$(sel)).filter(Boolean).map(c=>({c, r:c.getBoundingClientRect()}));
  if(!cvs.length) return null;
  const widths  = cvs.map(o=>o.c.width||o.r.width);
  const heights = cvs.map(o=>o.c.height||o.r.height);
  const w = Math.max(...widths);
  const h = heights.reduce((a,b)=>a+b,0) + 30 * (cvs.length-1);
  const out = document.createElement("canvas"); out.width=w; out.height=h; const g=out.getContext("2d");
  let y=0; cvs.forEach((o,i)=>{ g.fillStyle = i%2?"#0f1113":"#0d0f11"; g.fillRect(0,y,w,o.c.height); g.drawImage(o.c, 0, y); y += o.c.height + 30; });
  return out;
}

function dataURL(filename, mime){
  const c=combinedCanvasFromVisible(); if(!c) return;
  const url=c.toDataURL(mime||"image/png");
  const a=document.createElement("a"); a.href=url; a.download=filename; a.click();
}

function exportSVG(filename){
  const c=combinedCanvasFromVisible(); if(!c) return;
  const png=c.toDataURL("image/png");
  const svg = `<?xml version="1.0" encoding="UTF-8" standalone="no"?>\n<svg xmlns="http://www.w3.org/2000/svg" width="${c.width}" height="${c.height}" viewBox="0 0 ${c.width} ${c.height}">\n  <rect width="100%" height="100%" fill="#0f1012"/>\n  <image href="${png}" x="0" y="0" width="${c.width}" height="${c.height}" />\n</svg>`;
  const blob=new Blob([svg],{type:"image/svg+xml;charset=utf-8"});
  const a=document.createElement("a"); a.href=URL.createObjectURL(blob); a.download=filename; a.click(); URL.revokeObjectURL(a.href);
}

function exportPDF(){
  const c=combinedCanvasFromVisible(); if(!c) return;
  const png=c.toDataURL("image/png");
  const w=window.open("","_blank","noopener,noreferrer");
  w.document.write(`<!doctype html><html><head><title>Dashboard Export</title><style>body{margin:0;background:#0f1012}img{width:100%; height:auto; display:block; print-color-adjust:exact;-webkit-print-color-adjust:exact}</style></head><body><img src="${png}" alt="Dashboard"/></body></html>`);
  w.document.close(); w.focus(); w.print();
}

export function bindExporters(){
  $("#exportPng")?.addEventListener("click", ()=>dataURL("dashboard.png","image/png"));
  $("#exportJpg")?.addEventListener("click", ()=>dataURL("dashboard.jpg","image/jpeg"));
  $("#exportSvg")?.addEventListener("click", ()=>exportSVG("dashboard.svg"));
  $("#exportPdf")?.addEventListener("click", ()=>exportPDF());
  $("#printBtn")?.addEventListener("click", ()=>window.print());
}
