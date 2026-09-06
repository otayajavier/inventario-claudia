// ─────────────────────────────────────────────────────────────
// Paleta compartida con css/style.css (Chart.js no lee variables CSS)
// ─────────────────────────────────────────────────────────────
const PALETTE = {
  paper: "#ece5d6",
  paperDim: "#9aa5ac",
  line: "rgba(236, 229, 214, 0.14)",
  brick: "#c05a35",
  brickDim: "#8a4127",
  sage: "#8ca07d",
  gold: "#cf9d4f",
  series: ["#c05a35", "#8ca07d", "#cf9d4f", "#6f8fa8", "#a8748a", "#7a8471"],
};

Chart.defaults.font.family = "'IBM Plex Mono', monospace";
Chart.defaults.color = PALETTE.paperDim;

let charts = {};
let allRows = [];

// ─────────────────────────────────────────────────────────────
// Utilidades
// ─────────────────────────────────────────────────────────────
function normalizeHeader(h) {
  return (h || "")
    .toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "") // quita tildes
    .trim();
}

function findCol(headers, ...keywords) {
  return headers.findIndex((h) => keywords.some((k) => h.includes(k)));
}

function parseCOP(raw) {
  if (!raw) return 0;
  const cleaned = String(raw).replace(/[^\d]/g, "");
  return cleaned ? parseInt(cleaned, 10) : 0;
}

function formatCOP(value) {
  if (!value) return "—";
  return "$" + Math.round(value).toLocaleString("es-CO");
}

function formatCOPShort(value) {
  if (!value) return "$0";
  if (value >= 1e9) return "$" + (value / 1e9).toFixed(1) + "mil M";
  if (value >= 1e6) return "$" + (value / 1e6).toFixed(0) + "M";
  return "$" + value.toLocaleString("es-CO");
}

// ─────────────────────────────────────────────────────────────
// Carga de datos desde Google Sheets API
// ─────────────────────────────────────────────────────────────
async function fetchSheetData() {
  if (!CONFIG.API_KEY || CONFIG.API_KEY === "AIzaSyD9dcqg2slJPnkawSjLnLpEVdhVvmmUGrA") {
    document.getElementById("setup-overlay").classList.add("visible");
    setStatus("err", "falta configurar API key");
    return null;
  }

  const url = `https://sheets.googleapis.com/v4/spreadsheets/${CONFIG.SPREADSHEET_ID}/values/${encodeURIComponent(CONFIG.RANGE)}?key=${CONFIG.API_KEY}`;

  const res = await fetch(url);
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body?.error?.message || `Error HTTP ${res.status}`);
  }
  const data = await res.json();
  return data.values || [];
}

function rowsToObjects(values) {
  if (!values || values.length < 2) return [];
  const headers = values[0].map(normalizeHeader);

  const col = {
    origen: findCol(headers, "origen"),
    tipo: findCol(headers, "tipo"),
    nombre: findCol(headers, "proyecto", "nombre"),
    barrio: findCol(headers, "barrio", "zona"),
    precio: headers.findIndex((h) => h.includes("precio") && !h.includes("arriendo")),
    canon: findCol(headers, "canon", "arriendo"),
    area: findCol(headers, "area"),
    habitaciones: findCol(headers, "habitacion"),
    banos: findCol(headers, "bano"),
    parqueadero: findCol(headers, "parqueadero"),
    piso: findCol(headers, "piso"),
    estrato: findCol(headers, "estrato"),
    estado: findCol(headers, "estado"),
    servicio: findCol(headers, "servicio"),
    encargado: findCol(headers, "encargado"),
    link: findCol(headers, "link", "ficha"),
  };

  return values
    .slice(1)
    .filter((row) => row.some((cell) => cell && cell.trim && cell.trim() !== ""))
    .map((row) => ({
      origen: row[col.origen] || "",
      tipo: row[col.tipo] || "Sin tipo",
      nombre: row[col.nombre] || "(sin nombre)",
      barrio: row[col.barrio] || "Sin zona",
      precio: parseCOP(row[col.precio]),
      canon: parseCOP(row[col.canon]),
      area: parseFloat(row[col.area]) || 0,
      habitaciones: parseInt(row[col.habitaciones], 10) || 0,
      banos: parseInt(row[col.banos], 10) || 0,
      piso: row[col.piso] || "",
      estrato: row[col.estrato] || "",
      estado: row[col.estado] || "Sin estado",
      servicio: row[col.servicio] || "Sin dato",
      encargado: row[col.encargado] || "",
      link: row[col.link] || "",
    }))
    .filter((r) => r.tipo !== "Sin tipo" || r.nombre !== "(sin nombre)");
}

// ─────────────────────────────────────────────────────────────
// KPIs
// ─────────────────────────────────────────────────────────────
function renderKPIs(rows) {
  const enVenta = rows.filter((r) => r.precio > 0);
  const total = rows.length;
  const valorTotal = enVenta.reduce((sum, r) => sum + r.precio, 0);
  const promedio = enVenta.length ? valorTotal / enVenta.length : 0;
  const areaProm = rows.filter((r) => r.area > 0);
  const areaAvg = areaProm.length ? areaProm.reduce((s, r) => s + r.area, 0) / areaProm.length : 0;

  document.getElementById("kpi-total").textContent = total;
  document.getElementById("kpi-valor").textContent = formatCOPShort(valorTotal);
  document.getElementById("kpi-promedio").textContent = formatCOPShort(promedio);
  document.getElementById("kpi-area").textContent = areaAvg ? areaAvg.toFixed(0) + " m²" : "—";
  document.getElementById("corner-count").textContent = total + " UDS";
}

// ─────────────────────────────────────────────────────────────
// Gráficos
// ─────────────────────────────────────────────────────────────
function countBy(rows, key) {
  const map = {};
  rows.forEach((r) => {
    const k = r[key] || "Sin dato";
    map[k] = (map[k] || 0) + 1;
  });
  return map;
}

function destroyChart(id) {
  if (charts[id]) charts[id].destroy();
}

function renderChartTipo(rows) {
  const counts = countBy(rows, "tipo");
  destroyChart("tipo");
  charts.tipo = new Chart(document.getElementById("chart-tipo"), {
    type: "doughnut",
    data: {
      labels: Object.keys(counts),
      datasets: [{ data: Object.values(counts), backgroundColor: PALETTE.series, borderColor: "#1b2833", borderWidth: 2 }],
    },
    options: {
      plugins: { legend: { position: "bottom", labels: { boxWidth: 12, padding: 14 } } },
    },
  });
}

function renderChartServicio(rows) {
  const counts = countBy(rows, "servicio");
  destroyChart("servicio");
  charts.servicio = new Chart(document.getElementById("chart-servicio"), {
    type: "doughnut",
    data: {
      labels: Object.keys(counts),
      datasets: [{ data: Object.values(counts), backgroundColor: [PALETTE.brick, PALETTE.sage, PALETTE.gold], borderColor: "#1b2833", borderWidth: 2 }],
    },
    options: {
      plugins: { legend: { position: "bottom", labels: { boxWidth: 12, padding: 14 } } },
    },
  });
}

function renderChartBarrio(rows) {
  const counts = countBy(rows, "barrio");
  const top = Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 10);
  destroyChart("barrio");
  charts.barrio = new Chart(document.getElementById("chart-barrio"), {
    type: "bar",
    data: {
      labels: top.map((t) => t[0]),
      datasets: [{ data: top.map((t) => t[1]), backgroundColor: PALETTE.brick, borderRadius: 2 }],
    },
    options: {
      indexAxis: "y",
      plugins: { legend: { display: false } },
      scales: {
        x: { grid: { color: PALETTE.line }, ticks: { precision: 0 } },
        y: { grid: { display: false } },
      },
    },
  });
}

function renderChartPrecio(rows) {
  const precios = rows.map((r) => r.precio).filter((p) => p > 0);
  const buckets = [
    [0, 150e6, "<150M"],
    [150e6, 250e6, "150–250M"],
    [250e6, 400e6, "250–400M"],
    [400e6, 600e6, "400–600M"],
    [600e6, 900e6, "600–900M"],
    [900e6, Infinity, "900M+"],
  ];
  const counts = buckets.map(([min, max]) => precios.filter((p) => p >= min && p < max).length);
  destroyChart("precio");
  charts.precio = new Chart(document.getElementById("chart-precio"), {
    type: "bar",
    data: {
      labels: buckets.map((b) => b[2]),
      datasets: [{ data: counts, backgroundColor: PALETTE.gold, borderRadius: 2 }],
    },
    options: {
      plugins: { legend: { display: false } },
      scales: {
        x: { grid: { display: false } },
        y: { grid: { color: PALETTE.line }, ticks: { precision: 0 } },
      },
    },
  });
}

// ─────────────────────────────────────────────────────────────
// Tabla filtrable
// ─────────────────────────────────────────────────────────────
let sortState = { key: null, dir: 1 };
let filterState = { search: "", tipo: "", barrio: "", servicio: "" };

function populateFilterOptions(rows) {
  fillSelect("filter-tipo", [...new Set(rows.map((r) => r.tipo))].sort(), "Todos los tipos");
  fillSelect("filter-barrio", [...new Set(rows.map((r) => r.barrio))].sort(), "Todas las zonas");
  fillSelect("filter-servicio", [...new Set(rows.map((r) => r.servicio))].sort(), "Venta y Arriendo");
}

function fillSelect(id, values, placeholder) {
  const el = document.getElementById(id);
  const current = el.value;
  el.innerHTML = `<option value="">${placeholder}</option>` + values.map((v) => `<option value="${v}">${v}</option>`).join("");
  if (values.includes(current)) el.value = current;
}

function applyFiltersAndSort(rows) {
  let out = rows.filter((r) => {
    if (filterState.tipo && r.tipo !== filterState.tipo) return false;
    if (filterState.barrio && r.barrio !== filterState.barrio) return false;
    if (filterState.servicio && r.servicio !== filterState.servicio) return false;
    if (filterState.search) {
      const s = filterState.search.toLowerCase();
      const hay = `${r.nombre} ${r.barrio} ${r.encargado} ${r.tipo}`.toLowerCase();
      if (!hay.includes(s)) return false;
    }
    return true;
  });
  if (sortState.key) {
    out = out.slice().sort((a, b) => {
      const va = a[sortState.key], vb = b[sortState.key];
      if (typeof va === "number") return (va - vb) * sortState.dir;
      return String(va).localeCompare(String(vb)) * sortState.dir;
    });
  }
  return out;
}

function renderTable(rows) {
  const filtered = applyFiltersAndSort(rows);
  const body = document.getElementById("tabla-body");
  body.innerHTML = filtered
    .map(
      (r) => `<tr>
        <td>${escapeHtml(r.tipo)}</td>
        <td>${r.link ? `<a href="${escapeHtml(r.link)}" target="_blank" rel="noopener" style="color:inherit">${escapeHtml(r.nombre)}</a>` : escapeHtml(r.nombre)}</td>
        <td>${escapeHtml(r.barrio)}</td>
        <td class="num">${formatCOP(r.precio)}</td>
        <td class="num">${r.area || "—"}</td>
        <td class="num">${r.habitaciones || "—"}</td>
        <td class="num">${r.banos || "—"}</td>
        <td class="num">${escapeHtml(r.piso) || "—"}</td>
        <td>${escapeHtml(r.estado)}</td>
        <td>${escapeHtml(r.encargado)}</td>
      </tr>`
    )
    .join("");
  document.getElementById("table-count").textContent = `${filtered.length} de ${rows.length} inmuebles`;
}

function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

// ─────────────────────────────────────────────────────────────
// Estado / orquestación
// ─────────────────────────────────────────────────────────────
function setStatus(kind, text) {
  document.getElementById("status-dot").className = "status-dot " + kind;
  document.getElementById("status-text").textContent = text;
}

async function loadAndRender() {
  try {
    setStatus("", "actualizando…");
    const values = await fetchSheetData();
    if (!values) return;
    allRows = rowsToObjects(values);

    renderKPIs(allRows);
    renderChartTipo(allRows);
    renderChartServicio(allRows);
    renderChartBarrio(allRows);
    renderChartPrecio(allRows);
    populateFilterOptions(allRows);
    renderTable(allRows);

    setStatus("ok", "en vivo");
    document.getElementById("last-updated").textContent = new Date().toLocaleTimeString("es-CO");
  } catch (err) {
    console.error(err);
    setStatus("err", "error: " + err.message);
  }
}

function wireControls() {
  document.getElementById("search").addEventListener("input", (e) => {
    filterState.search = e.target.value;
    renderTable(allRows);
  });
  ["tipo", "barrio", "servicio"].forEach((key) => {
    document.getElementById(`filter-${key}`).addEventListener("change", (e) => {
      filterState[key] = e.target.value;
      renderTable(allRows);
    });
  });
  document.querySelectorAll("th[data-key]").forEach((th) => {
    th.addEventListener("click", () => {
      const key = th.dataset.key;
      sortState.dir = sortState.key === key ? -sortState.dir : 1;
      sortState.key = key;
      renderTable(allRows);
    });
  });
  document.getElementById("btn-refresh").addEventListener("click", loadAndRender);
}

wireControls();
loadAndRender();
setInterval(loadAndRender, CONFIG.REFRESH_INTERVAL_MS);
