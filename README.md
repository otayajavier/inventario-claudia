# Portafolio de Inmuebles — Inventario en vivo

Dashboard estático que lee directamente tu Google Sheet de inventario y lo
muestra como gráficos + tabla filtrable. Se actualiza solo cada minuto (y con
el botón "Actualizar ahora"), así que siempre refleja los cambios que hagas
en la hoja.

No usa backend ni build: es HTML + CSS + JS puro, así que se aloja gratis en
GitHub Pages.

## 1. Habilitar la Google Sheets API y crear tu API key

1. Ve a [Google Cloud Console](https://console.cloud.google.com/) y crea un
   proyecto (o usa el mismo que usaste para la API de Maps).
2. Ve a **APIs y servicios → Biblioteca**, busca **Google Sheets API** y
   haz clic en **Habilitar**.
3. Ve a **APIs y servicios → Credenciales → Crear credenciales → Clave de API**.
4. Copia la clave generada.
5. **Restringe la clave** (importante, ya que quedará visible en el código del
   sitio):
   - En "Restricciones de API": limita la clave solo a **Google Sheets API**.
   - En "Restricciones de la aplicación": elige **Referentes HTTP** y agrega
     tu dominio de GitHub Pages, por ejemplo:
     `tuusuario.github.io/inventario-inmuebles/*`
     (mientras pruebas en tu computador, puedes agregar temporalmente
     `localhost/*` o `127.0.0.1/*`).

## 2. Compartir tu Google Sheet

La API key permite *leer* datos, pero solo si la hoja es visible sin iniciar
sesión:

1. Abre tu Sheet → botón **Compartir**.
2. En "Acceso general" elige **Cualquier persona con el enlace** → rol
   **Lector**.

Como acordamos, esto está bien porque el inventario puede ser público.

## 3. Configurar el proyecto

Abre `js/config.js` y reemplaza:

```js
API_KEY: "PEGA_AQUI_TU_API_KEY",
```

por tu clave real. El `SPREADSHEET_ID` ya viene puesto con el de tu hoja.

Si tu hoja tiene una sola pestaña con los datos, no necesitas tocar `RANGE`.
Si tiene más de 500 filas, sube ese número.

## 4. Probar en tu computador

Puedes abrir `index.html` directamente en el navegador, pero algunos
navegadores bloquean `fetch` en archivos locales (`file://`). Si ves errores,
sirve la carpeta con un servidor simple:

```bash
cd inventario-inmuebles
python3 -m http.server 8080
```

Y abre `http://localhost:8080`.

## 5. Subir a GitHub y activar GitHub Pages

```bash
cd inventario-inmuebles
git init
git add .
git commit -m "Dashboard de inventario de inmuebles"
git branch -M main
git remote add origin https://github.com/TU-USUARIO/inventario-inmuebles.git
git push -u origin main
```

Luego en GitHub:

1. Ve a tu repo → **Settings → Pages**.
2. En "Build and deployment" → **Source**: elige **Deploy from a branch**.
3. Branch: **main**, carpeta **/ (root)** → **Save**.
4. En 1-2 minutos tu sitio queda en:
   `https://TU-USUARIO.github.io/inventario-inmuebles/`

No olvides volver al paso 1 y agregar esa URL exacta a las restricciones de
tu API key.

## Estructura del proyecto

```
inventario-inmuebles/
├── index.html        ← estructura del dashboard
├── css/style.css      ← estilos (tema tipo plano arquitectónico)
├── js/config.js       ← tu ID de hoja + API key (edítalo)
├── js/app.js           ← lógica: fetch, gráficos, tabla, filtros
└── README.md
```

## Notas

- Como es un sitio 100% estático, la API key queda visible en el código
  fuente del navegador. Por eso se restringe por dominio (paso 1) y por
  eso solo tiene sentido para datos que estás de acuerdo en que sean
  públicos, tal como me confirmaste.
- Si cambias los encabezados de columna en el Sheet, `app.js` los detecta
  por palabras clave (por ejemplo cualquier columna que contenga "precio",
  "barrio", "habitacion", etc.), así que no es necesario que coincidan
  exactamente con el orden original.
- Si algún día quieres datos privados de verdad, el siguiente paso sería
  un backend pequeño (p. ej. una función serverless) que guarde las
  credenciales del lado del servidor — puedo ayudarte con eso cuando
  llegue el momento.
