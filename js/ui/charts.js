// ui/charts.js – enhanced with crosshair plugin and new chart types
import { $, $$ } from "../core/dom.js";
import { state } from "../core/state.js";

// Register crosshair plugin for line traces
const crosshairPlugin = {
  id: 'crosshair',
  afterDraw: (chart) => {
    if (chart.tooltip?._active?.length) {
      const ctx = chart.ctx;
      const x = chart.tooltip._active[0].element.x;
      const topY = chart.scales.y.top;
      const bottomY = chart.scales.y.bottom;

      ctx.save();
      ctx.beginPath();
      ctx.moveTo(x, topY);
      ctx.lineTo(x, bottomY);
      ctx.lineWidth = 1;
      ctx.strokeStyle = 'rgba(239,50,36,0.3)';
      ctx.setLineDash([5, 5]);
      ctx.stroke();
      ctx.restore();
    }
  }
};

// Register the plugin globally
if (typeof Chart !== 'undefined') {
  Chart.register(crosshairPlugin);
}

export function destroyCharts(){
  Object.values(state.charts).forEach(c => { 
    try{ c?.destroy?.(); } catch{} 
  });
  state.charts = {};
}

function getFilteredData() {
  const startIdx = state.filters.startIdx || 0;
  const endIdx = state.filters.endIdx || (state.hourly.length - 1);
  const minTxn = state.filters.minTxn || 0;
  
  return state.hourly
    .slice(startIdx, endIdx + 1)
    .filter(r => (r.txns || 0) >= minTxn);
}

export function renderCharts(){
  const data = getFilteredData();
  const labels = data.map(r => r.time || "");
  const sales = data.map(r => Number(r.sales) || 0);
  const hTgt = data.map(r => Number(r.hTarget) || 0);
  const txns = data.map(r => Number(r.txns) || 0);
  const units = data.map(r => Number(r.units) || 0);
  const traffic = data.map(r => Number(r.traffic) || 0);
  const ly = data.map(r => Number(r.ly) || 0);

  const ctxH = $("#ch_hourly");
  const ctxC = $("#ch_cume");
  const ctxTU = $("#ch_tu");
  const ctxE = $("#ch_eff");

  destroyCharts();

  // Configure chart defaults
  Chart.defaults.color = '#8b9097';
  Chart.defaults.borderColor = 'rgba(255,255,255,0.1)';
  Chart.defaults.font.size = 11;

  // Hourly Sales Chart with enhanced visuals
  if (ctxH) {
    state.charts.hourly = new Chart(ctxH, {
      type: "bar",
      data: { 
        labels, 
        datasets: [
          {
            label: "Sales",
            data: sales,
            backgroundColor: (ctx) => {
              const value = ctx.raw;
              const max = Math.max(...sales);
              const intensity = value / max;
              return `rgba(239,50,36,${0.3 + intensity * 0.4})`;
            },
            borderColor: "#EF3224",
            borderWidth: 1,
            borderRadius: 4
          },
          {
            label: "Hour Target",
            data: hTgt,
            type: "line",
            borderColor: "#7ac6ff",
            backgroundColor: "rgba(122,198,255,0.1)",
            tension: 0.3,
            fill: true,
            borderWidth: 2,
            pointRadius: 3,
            pointHoverRadius: 5
          }
        ]
      },
      options: {
        maintainAspectRatio: false,
        interaction: {
          mode: 'index',
          intersect: false
        },
        plugins: {
          legend: {
            display: true,
            labels: {
              usePointStyle: true,
              padding: 10
            }
          },
          tooltip: {
            mode: 'index',
            intersect: false,
            backgroundColor: 'rgba(20,22,24,0.95)',
            borderColor: 'rgba(255,255,255,0.1)',
            borderWidth: 1
          }
        },
        scales: {
          x: {
            grid: { display: false }
          },
          y: {
            beginAtZero: true,
            grid: { color: 'rgba(255,255,255,0.04)' }
          }
        }
      }
    });
  }

  // Cumulative Chart with enhanced styling
  if (ctxC) {
    let cum = 0, cumT = 0, cumLY = 0;
    const cumY = sales.map(v => cum += v);
    const cumTy = hTgt.map(v => cumT += v);
    const cumLYy = ly.map(v => cumLY += v);
    
    state.charts.cume = new Chart(ctxC, {
      type: "line",
      data: {
        labels,
        datasets: [
          {
            label: "TTD Sales",
            data: cumY,
            borderColor: "#EF3224",
            backgroundColor: "rgba(239,50,36,0.1)",
            tension: 0.3,
            fill: true,
            borderWidth: 2
          },
          {
            label: "TTD Target",
            data: cumTy,
            borderColor: "#7ac6ff",
            borderDash: [5, 5],
            tension: 0.3,
            borderWidth: 2,
            fill: false
          },
          {
            label: "TTD Last Year",
            data: cumLYy,
            borderColor: "#f59e0b",
            borderDash: [2, 2],
            tension: 0.3,
            borderWidth: 1,
            fill: false
          }
        ]
      },
      options: {
        maintainAspectRatio: false,
        interaction: {
          mode: 'index',
          intersect: false
        },
        plugins: {
          legend: {
            display: true,
            labels: { usePointStyle: true }
          },
          tooltip: {
            mode: 'index',
            intersect: false
          }
        },
        scales: {
          x: { grid: { display: false } },
          y: {
            beginAtZero: true,
            grid: { color: 'rgba(255,255,255,0.04)' }
          }
        }
      }
    });
  }

  // Transactions & Units Chart
  if (ctxTU) {
    state.charts.tu = new Chart(ctxTU, {
      type: "bar",
      data: {
        labels,
        datasets: [
          {
            label: "Transactions",
            data: txns,
            backgroundColor: "rgba(40,62,141,0.5)",
            borderColor: "#283E8D",
            borderWidth: 1,
            borderRadius: 4,
            yAxisID: 'y'
          },
          {
            label: "Units",
            data: units,
            backgroundColor: "rgba(34,197,94,0.5)",
            borderColor: "#16a34a",
            borderWidth: 1,
            borderRadius: 4,
            yAxisID: 'y1'
          }
        ]
      },
      options: {
        maintainAspectRatio: false,
        plugins: {
          legend: { display: true }
        },
        scales: {
          x: { grid: { display: false } },
          y: {
            type: 'linear',
            display: true,
            position: 'left',
            beginAtZero: true,
            grid: { color: 'rgba(255,255,255,0.04)' }
          },
          y1: {
            type: 'linear',
            display: true,
            position: 'right',
            beginAtZero: true,
            grid: { drawOnChartArea: false }
          }
        }
      }
    });
  }

  // Efficiency Chart with three metrics
  if (ctxE) {
    const ads = data.map((r, i) => txns[i] > 0 ? sales[i] / txns[i] : null);
    const upt = data.map((r, i) => txns[i] > 0 ? units[i] / txns[i] : null);
    const conv = data.map((r, i) => traffic[i] > 0 ? (txns[i] / traffic[i]) * 100 : null);
    
    state.charts.eff = new Chart(ctxE, {
      type: "line",
      data: {
        labels,
        datasets: [
          {
            label: "ADS ($)",
            data: ads,
            borderColor: "#f59e0b",
            backgroundColor: "rgba(245,158,11,0.1)",
            tension: 0.3,
            fill: true,
            yAxisID: 'y'
          },
          {
            label: "UPT",
            data: upt,
            borderColor: "#16a34a",
            tension: 0.3,
            yAxisID: 'y1'
          },
          {
            label: "Conv %",
            data: conv,
            borderColor: "#8b5cf6",
            tension: 0.3,
            yAxisID: 'y2'
          }
        ]
      },
      options: {
        maintainAspectRatio: false,
        interaction: {
          mode: 'index',
          intersect: false
        },
        plugins: {
          legend: { display: true }
        },
        scales: {
          x: { grid: { display: false } },
          y: {
            type: 'linear',
            display: true,
            position: 'left',
            title: { display: true, text: 'ADS ($)' }
          },
          y1: {
            type: 'linear',
            display: true,
            position: 'right',
            title: { display: true, text: 'UPT' },
            grid: { drawOnChartArea: false }
          },
          y2: {
            type: 'linear',
            display: false
          }
        }
      }
    });
  }
}

// NEW: Render Sales Heatmap
export function renderHeatmap() {
  const ctx = $("#ch_heatmap");
  if (!ctx) return;
  
  // Generate heatmap data (simulate weekly pattern)
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const hours = state.hourly.map(r => r.time || '');
  
  const heatmapData = [];
  days.forEach((day, dayIdx) => {
    hours.forEach((hour, hourIdx) => {
      // Simulate sales intensity based on day and hour
      const baseSales = state.hourly[hourIdx]?.sales || 0;
      const dayMultiplier = dayIdx >= 4 ? 1.5 : 1; // Weekend boost
      const intensity = baseSales * dayMultiplier * (0.8 + Math.random() * 0.4);
      
      heatmapData.push({
        x: hourIdx,
        y: dayIdx,
        v: Math.round(intensity)
      });
    });
  });
  
  // Destroy existing chart if present
  if (state.charts.heatmap) {
    state.charts.heatmap.destroy();
  }
  
  state.charts.heatmap = new Chart(ctx, {
    type: 'scatter',
    data: {
      datasets: [{
        label: 'Sales Intensity',
        data: heatmapData,
        backgroundColor: (ctx) => {
          const value = ctx.raw.v;
          const max = Math.max(...heatmapData.map(d => d.v));
          const intensity = value / max;
          return `rgba(239,50,36,${0.2 + intensity * 0.6})`;
        },
        pointRadius: 15,
        pointHoverRadius: 18
      }]
    },
    options: {
      maintainAspectRatio: false,
      scales: {
        x: {
          type: 'linear',
          position: 'bottom',
          min: -0.5,
          max: hours.length - 0.5,
          ticks: {
            stepSize: 1,
            callback: (value) => hours[value] || ''
          },
          title: { display: true, text: 'Hour' }
        },
        y: {
          type: 'linear',
          min: -0.5,
          max: 6.5,
          ticks: {
            stepSize: 1,
            callback: (value) => days[value] || ''
          },
          title: { display: true, text: 'Day of Week' }
        }
      },
      plugins: {
        tooltip: {
          callbacks: {
            label: (ctx) => {
              const day = days[ctx.raw.y];
              const hour = hours[ctx.raw.x];
              return `${day} ${hour}: $${ctx.raw.v.toLocaleString()}`;
            }
          }
        },
        legend: { display: false }
      }
    }
  });
}

// NEW: Render Sales Forecast
export function renderForecast() {
  const ctx = $("#ch_forecast");
  if (!ctx) return;
  
  const data = getFilteredData();
  const historicalSales = data.map(r => Number(r.sales) || 0);
  const labels = data.map(r => r.time || '');
  
  // Simple linear regression for forecast
  const n = historicalSales.length;
  if (n < 2) return;
  
  const indices = Array.from({length: n}, (_, i) => i);
  const sumX = indices.reduce((a, b) => a + b, 0);
  const sumY = historicalSales.reduce((a, b) => a + b, 0);
  const sumXY = indices.reduce((sum, x, i) => sum + x * historicalSales[i], 0);
  const sumX2 = indices.reduce((sum, x) => sum + x * x, 0);
  
  const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
  const intercept = (sumY - slope * sumX) / n;
  
  // Generate forecast for next 3 periods
  const forecastLabels = [];
  const forecastValues = [];
  for (let i = 0; i < 3; i++) {
    const nextIdx = n + i;
    const nextHour = parseInt(labels[n - 1]) + i + 1;
    forecastLabels.push(`${nextHour}:00`);
    const forecastValue = Math.max(0, intercept + slope * nextIdx);
    // Add some randomness for realism
    forecastValues.push(forecastValue * (0.9 + Math.random() * 0.2));
  }
  
  // Destroy existing chart if present
  if (state.charts.forecast) {
    state.charts.forecast.destroy();
  }
  
  state.charts.forecast = new Chart(ctx, {
    type: 'line',
    data: {
      labels: [...labels, ...forecastLabels],
      datasets: [
        {
          label: 'Actual Sales',
          data: [...historicalSales, ...Array(forecastLabels.length).fill(null)],
          borderColor: '#EF3224',
          backgroundColor: 'rgba(239,50,36,0.1)',
          tension: 0.3,
          fill: true
        },
        {
          label: 'Forecast',
          data: [...Array(n - 1).fill(null), historicalSales[n - 1], ...forecastValues],
          borderColor: '#7ac6ff',
          borderDash: [5, 5],
          backgroundColor: 'rgba(122,198,255,0.1)',
          tension: 0.3,
          fill: true
        },
        {
          label: 'Trend Line',
          data: indices.map(i => intercept + slope * i).concat(
            forecastLabels.map((_, i) => intercept + slope * (n + i))
          ),
          borderColor: 'rgba(255,255,255,0.3)',
          borderDash: [2, 2],
          borderWidth: 1,
          fill: false,
          pointRadius: 0
        }
      ]
    },
    options: {
      maintainAspectRatio: false,
      interaction: {
        mode: 'index',
        intersect: false
      },
      plugins: {
        legend: { display: true },
        annotation: {
          annotations: {
            line1: {
              type: 'line',
              xMin: n - 1,
              xMax: n - 1,
              borderColor: 'rgba(255,255,255,0.2)',
              borderWidth: 1,
              borderDash: [2, 2],
              label: {
                content: 'Forecast Start',
                enabled: true,
                position: 'start'
              }
            }
          }
        }
      },
      scales: {
        x: { grid: { display: false } },
        y: {
          beginAtZero: true,
          grid: { color: 'rgba(255,255,255,0.04)' }
        }
      }
    }
  });
}

export function resizeChartsSoon(){
  requestAnimationFrame(() => {
    Object.values(state.charts).forEach(c => c && c.resize())
  });
}