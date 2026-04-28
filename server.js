/**
 * Marketplace simple de reventa de entradas - Mundial 2026
 *
 * - GET  /api/matches           -> listado de los 104 partidos
 * - GET  /api/listings          -> listings activos (no vencidos)
 * - GET  /api/listings?match=36 -> filtrado por número de partido
 * - POST /api/listings          -> publica una nueva venta
 *
 * Cada listing se borra automáticamente a las 24 hs de creado.
 *
 * Ordenamiento:
 *   1) por número de partido (ascendente)
 *   2) por categoría según ranking explícito (Categoría 4 primero, Hospitality último)
 *   3) por precio (de menor a mayor)
 */

const express = require('express');
const path = require('path');
const fs = require('fs');
const MATCHES = require('./data/matches');

const PORT = process.env.PORT || 3000;
const DB_PATH = process.env.DB_PATH || path.join(__dirname, 'data', 'tickets.json');
const TTL_MS = 24 * 60 * 60 * 1000; // 24 horas

// Categorías válidas. El orden del array define el "rank" para ordenar.
// El usuario pidió este orden: Cat 4 primero, después Cat 3, Cat 3 Front Row, etc.
const CATEGORIES = [
  'Categoría 4',
  'Categoría 3',
  'Categoría 3 Front Row',
  'Categoría 2',
  'Categoría 2 Front Row',
  'Categoría 1',
  'Categoría 1 Front Row',
  'Hospitality',
];
const CATEGORY_RANK = Object.fromEntries(CATEGORIES.map((c, i) => [c, i]));

// ---------- Store JSON ----------
let store = { nextId: 1, listings: [] };

function loadStore() {
  try {
    if (fs.existsSync(DB_PATH)) {
      const raw = fs.readFileSync(DB_PATH, 'utf8');
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') {
        store.nextId = Number.isInteger(parsed.nextId) ? parsed.nextId : 1;
        store.listings = Array.isArray(parsed.listings) ? parsed.listings : [];
      }
    } else {
      fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
      saveStore();
    }
  } catch (err) {
    console.warn('[store] error leyendo DB, arranco vacio:', err.message);
    store = { nextId: 1, listings: [] };
  }
}

function saveStore() {
  const tmp = DB_PATH + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(store, null, 2));
  fs.renameSync(tmp, DB_PATH);
}

function cleanupExpired() {
  const now = Date.now();
  const before = store.listings.length;
  store.listings = store.listings.filter(l => l.expires_at > now);
  if (store.listings.length !== before) {
    console.log('[cleanup] borrados ' + (before - store.listings.length) + ' listings vencidos');
    saveStore();
  }
}

loadStore();
cleanupExpired();
setInterval(cleanupExpired, 5 * 60 * 1000);

// Comparador: por partido asc, después por rank de categoría asc, después por precio asc
function compareListings(a, b) {
  if (a.match_num !== b.match_num) return a.match_num - b.match_num;
  const rankA = CATEGORY_RANK[a.category] ?? 999;
  const rankB = CATEGORY_RANK[b.category] ?? 999;
  if (rankA !== rankB) return rankA - rankB;
  if (a.price_usd !== b.price_usd) return a.price_usd - b.price_usd;
  return a.created_at - b.created_at;
}

// ---------- App ----------
const app = express();
app.use(express.json({ limit: '50kb' }));
app.use(express.static(path.join(__dirname, 'public')));

app.get('/api/matches', (req, res) => {
  res.json(MATCHES);
});

app.get('/api/categories', (req, res) => {
  res.json(CATEGORIES);
});

app.get('/api/listings', (req, res) => {
  cleanupExpired();
  const matchNum = req.query.match ? parseInt(req.query.match, 10) : null;
  let rows = store.listings;
  if (matchNum && !Number.isNaN(matchNum)) {
    rows = rows.filter(l => l.match_num === matchNum);
  }
  rows = [...rows].sort(compareListings);
  res.json(rows.map(enrichListing));
});

app.post('/api/listings', (req, res) => {
  const b = req.body || {};
  const errors = [];

  const matchNum = parseInt(b.match_num, 10);
  if (!matchNum || !MATCHES.find(m => m.num === matchNum)) errors.push('partido inválido');
  const tickets = parseInt(b.tickets, 10);
  if (!tickets || tickets < 1 || tickets > 20) errors.push('cantidad de entradas inválida');
  const category = String(b.category || '').trim();
  if (!CATEGORIES.includes(category)) errors.push('categoría inválida');
  const price = parseFloat(b.price_usd);
  if (!price || price < 1) errors.push('precio inválido');
  const sellerName = String(b.seller_name || '').trim();
  if (!sellerName || sellerName.length > 80) errors.push('nombre inválido');
  let whatsapp = String(b.whatsapp || '').trim();
  whatsapp = whatsapp.replace(/[^\d+]/g, '');
  if (!whatsapp || whatsapp.replace(/\D/g, '').length < 8) errors.push('WhatsApp inválido');

  if (errors.length) return res.status(400).json({ error: errors.join(', ') });

  const now = Date.now();
  const listing = {
    id: store.nextId++,
    created_at: now,
    expires_at: now + TTL_MS,
    match_num: matchNum,
    tickets: tickets,
    category: category,
    block: String(b.block || '').trim().slice(0, 30) || null,
    row: String(b.row || '').trim().slice(0, 30) || null,
    seats: normalizeSeats(b.seats),
    price_usd: price,
    seller_name: sellerName,
    whatsapp: whatsapp,
    comments: String(b.comments || '').trim().slice(0, 500) || null,
  };
  store.listings.push(listing);
  saveStore();
  res.status(201).json(enrichListing(listing));
});

// Normaliza la lista de asientos: separados por coma, sin espacios sobrantes.
function normalizeSeats(raw) {
  const s = String(raw || '').trim();
  if (!s) return null;
  const parts = s.split(',').map(p => p.trim()).filter(Boolean);
  return parts.length ? parts.join(', ').slice(0, 120) : null;
}

function enrichListing(row) {
  const match = MATCHES.find(m => m.num === row.match_num) || null;
  return Object.assign({}, row, { match: match });
}

app.listen(PORT, () => {
  console.log('Server escuchando en http://localhost:' + PORT);
});
