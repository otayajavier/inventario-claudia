// ─────────────────────────────────────────────────────────────
// CONFIGURACIÓN — edita solo esta sección
// ─────────────────────────────────────────────────────────────
const CONFIG = {
  // Tomado de tu URL: docs.google.com/spreadsheets/d/ESTE_ID/edit
  SPREADSHEET_ID: "AIzaSyD9dcqg2slJPnkawSjLnLpEVdhVvmmUGrA",

  // Tu API key de Google Cloud (Sheets API habilitada). Ver README.md.
  API_KEY: "AIzaSyD9dcqg2slJPnkawSjLnLpEVdhVvmmUGrA",

  // Rango a leer. Si tu hoja tiene más de 200 filas, sube el número.
  // No hace falta poner el nombre de la pestaña: por defecto lee la primera.
  RANGE: "A1:U500",

  // Cada cuánto se refresca solo (en milisegundos). 60000 = 1 minuto.
  REFRESH_INTERVAL_MS: 60000,
};
