// template.js — Download Excel template, honoring saved store hours
export function bindTemplateDownload(){
  const btn = document.getElementById("downloadTemplate");
  if(!btn) return;
  btn.addEventListener("click", ()=>{
    try{
      const header=["Time","Sales","Txns","Units","Hour Target","LY","Traffic","TTD Target"];
      let times=[]; try{ times = JSON.parse(localStorage.getItem("storeHours:times")||"[]"); }catch{}
      if(!Array.isArray(times) || !times.length){
        times = ["10:00","11:00","12:00","13:00","14:00","15:00","16:00","17:00"];
      }
      const rows=[header, ...times.map(t=>[t,null,null,null,null,null,null,null])];
      const ws=XLSX.utils.aoa_to_sheet(rows);
      const wb=XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Hourly");
      XLSX.writeFile(wb, "TNF-Hourly-Template.xlsx");
    }catch(err){ alert("Template download failed."); console.error(err); }
  });
}
