// xlsx-helpers.js — XLSX <-> dataset conversion (no UI side effects)
// Keeps your dataset shape: [{time, sales, txns, units, hTarget, ly, traffic, tTarget}, ...]

const NAME_MAP = {
  time: ["time","hour","timestamp"],
  sales: ["sales","revenue","amount"],
  txns: ["txns","transactions","tickets","orders"],
  units: ["units","qty","quantity","items"],
  hTarget: ["hour target","h target","hourly target","target hour","target_h"],
  ly: ["ly","last year","sales ly","sales_ly"],
  traffic: ["traffic","foot traffic","visits"],
  tTarget: ["ttd target","t target","cume target","cum target","target ttd","target_day"]
};

function norm(s){ return String(s||"").trim().toLowerCase().replace(/\s+/g," "); }

function colIndex(headerRow, want){
  const H = headerRow.map(h => norm(h));
  for (const key of want) {
    const idx = H.indexOf(norm(key));
    if (idx !== -1) return idx;
  }
  return -1;
}

export function parseWorkbookToDataset(workbook){
  const ws = workbook.Sheets[workbook.SheetNames[0]];
  const aoa = XLSX.utils.sheet_to_json(ws, {header:1, defval:null});
  if (!aoa.length) return {hourly:[], wtd:{}, meta:{}};

  const header = aoa[0];
  const idx = {};
  for (const [k, aliases] of Object.entries(NAME_MAP)) idx[k] = colIndex(header, aliases);

  const rows = [];
  for (let r = 1; r < aoa.length; r++){
    const row = aoa[r];
    if (!row || row.every(v => v===null || v==="")) continue;
    const rec = {
      time    : idx.time    >=0 ? row[idx.time]    : row[0],
      sales   : idx.sales   >=0 ? row[idx.sales]   : null,
      txns    : idx.txns    >=0 ? row[idx.txns]    : null,
      units   : idx.units   >=0 ? row[idx.units]   : null,
      hTarget : idx.hTarget >=0 ? row[idx.hTarget] : null,
      ly      : idx.ly      >=0 ? row[idx.ly]      : null,
      traffic : idx.traffic >=0 ? row[idx.traffic] : null,
      tTarget : idx.tTarget >=0 ? row[idx.tTarget] : null
    };
    // Normalize types where helpful
    ["sales","txns","units","hTarget","ly","traffic","tTarget"].forEach(k=>{
      const v = rec[k];
      rec[k] = (v===null || v==="") ? null : Number(v);
    });
    rec.time = String(rec.time ?? "");
    rows.push(rec);
  }
  return { hourly: rows, wtd:{}, meta:{} };
}

export async function readFileToWorkbook(file){
  const buf = await file.arrayBuffer();
  return XLSX.read(buf, {type:"array"});
}

export function makeTemplateSheet(times){
  const header=["Time","Sales","Txns","Units","Hour Target","LY","Traffic","TTD Target"];
  const data = [header, ...times.map(t => [t,null,null,null,null,null,null,null])];
  const ws = XLSX.utils.aoa_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Hourly");
  return wb;
}
