# Reventa Mundial 2026 — App simple

Marketplace mínimo para que la gente publique entradas que tiene a la venta y otros usuarios las puedan ver, ordenadas por precio (de menor a mayor) y agrupadas por partido del Mundial FIFA 2026. **Las publicaciones se borran solas a las 24 hs.**

## Qué incluye

- **Backend**: Node.js + Express. Persistencia en archivo JSON (puro JS, sin dependencias nativas — corre en Windows / Mac / Linux sin compilar nada).
- **Frontend**: HTML/CSS/JS estático (sin frameworks).
- **Calendario completo**: 104 partidos con fecha y sede oficial.
- **Auto-borrado**: cada 5 minutos limpia los listings vencidos (>24 hs).
- **Contacto**: botón "Contactar por WhatsApp" con mensaje pre-armado (no muestra el número en texto plano).

## Estructura

```
worldcup-tickets/
├── package.json
├── server.js               # API + estáticos
├── data/
│   ├── matches.js          # Calendario oficial 2026 (104 partidos)
│   └── tickets.json        # Base de datos local (se crea solo)
└── public/
    ├── index.html          # Vista pública: lista + filtros
    ├── vender.html         # Formulario de carga
    ├── styles.css
    ├── app.js              # Lógica de la vista pública
    └── sell.js             # Lógica del formulario
```

## Cómo correrlo en tu máquina

Necesitás Node.js 18+ instalado.

```bash
cd worldcup-tickets
npm install
npm start
```

Y abrís:

- Listado público: <http://localhost:3000>
- Formulario para publicar: <http://localhost:3000/vender.html>

El link que compartís con la gente es el del listado público (`/`). El formulario lo pueden encontrar desde el botón "Publicar entradas" en el header.

## Cómo deployarlo gratis

Cualquiera de estos servicios alcanza:

- **Render.com**: New → Web Service → conectá el repo. Build: `npm install`. Start: `npm start`. Gratis con sleep tras inactividad.
- **Railway / Fly.io**: similar, gratis con créditos mensuales.
- **VPS propio**: subí la carpeta y corré `npm install && npm start` detrás de nginx o Caddy.

> ⚠️ Si deployás en un servicio con disco efímero (Render free, Heroku, Vercel), `data/tickets.json` se reinicia en cada redeploy. Como las publicaciones igual viven solo 24 hs, eso casi nunca es problema. Si querés persistencia real, montá un volumen.

## Endpoints de la API

| Método | URL | Descripción |
| --- | --- | --- |
| GET | `/api/matches` | Lista los 104 partidos |
| GET | `/api/listings` | Listings activos (orden por precio asc) |
| GET | `/api/listings?match=36` | Filtra por número de partido |
| POST | `/api/listings` | Crea un listing nuevo |

Ejemplo de POST:

```json
{
  "match_num": 36,
  "tickets": 4,
  "category": "Categoría 3",
  "block": "248",
  "row": "X",
  "seats": "11-14",
  "price_usd": 500,
  "seller_name": "Charly",
  "whatsapp": "+5491122223333",
  "comments": "Puedo encontrarme en Austin TX o Monterrey"
}
```

## Personalización rápida

- **Editar partidos**: `data/matches.js` — modificá los nombres de equipos cuando se confirme el sorteo o si querés ajustar alguna sede/fecha.
- **Cambiar duración antes de borrar**: en `server.js`, constante `TTL_MS`.
- **Cambiar mensaje pre-armado de WhatsApp**: en `public/app.js`, función `buildWhatsAppLink`.
- **Sumar más categorías** (ej. "VIP"): editá tanto el `<select>` en `vender.html` como el array en `server.js`.

## Próximos pasos sugeridos

- Captcha en el formulario (hCaptcha es gratis) para evitar spam.
- Login simple por email + token (one-time link) para que el vendedor pueda **eliminar** o **renovar** su publicación antes de las 24 hs.
- Push de Telegram/WhatsApp Bot cuando aparezca una entrada nueva en un partido que el usuario está siguiendo.
