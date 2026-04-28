// Frontend de la página pública: lista los partidos y muestra los listings
// activos por partido (orden: categoría según ranking + precio asc).

const $list = document.getElementById('match-list');
const $filterText = document.getElementById('filter-text');
const $filterStage = document.getElementById('filter-stage');
const $filterCountry = document.getElementById('filter-country');
const $filterOnlyAvailable = document.getElementById('filter-only-available');

let MATCHES = [];
let LISTINGS_BY_MATCH = new Map();

async function load() {
  const [m, l] = await Promise.all([
    fetch('/api/matches').then(r => r.json()),
    fetch('/api/listings').then(r => r.json()),
  ]);
  MATCHES = m;
  LISTINGS_BY_MATCH = new Map();
  // El server ya los devuelve ordenados (por partido + categoria + precio)
  for (const item of l) {
    if (!LISTINGS_BY_MATCH.has(item.match_num)) LISTINGS_BY_MATCH.set(item.match_num, []);
    LISTINGS_BY_MATCH.get(item.match_num).push(item);
  }
  render();
}

function fmtDate(iso) {
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

function fmtPrice(n) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n);
}

function teamsLabel(match) {
  return `${match.home} vs ${match.away}`;
}

function buildWhatsAppLink(listing) {
  const phone = listing.whatsapp.replace(/\D/g, '');
  const m = listing.match || {};
  const fecha = fmtDate(m.date || '');
  const text = encodeURIComponent(
    `¡Hola ${listing.seller_name}! Vi tu publicación en la web de reventa Mundial 2026. ` +
    `Me interesa el partido ${listing.match_num} (${teamsLabel(m)}, ${fecha} en ${m.city}). ` +
    `¿Sigue disponible?`
  );
  return `https://wa.me/${phone}?text=${text}`;
}

function matchPassesFilters(match) {
  const text = ($filterText.value || '').trim().toLowerCase();
  const stage = $filterStage.value;
  const country = $filterCountry.value;
  if (stage && match.stage !== stage) return false;
  if (country && match.country !== country) return false;
  if (text) {
    const haystack = [
      match.num, match.home, match.away, match.venue, match.city,
      match.country, match.stage, match.group || ''
    ].join(' ').toLowerCase();
    if (!haystack.includes(text)) return false;
  }
  return true;
}

function render() {
  const onlyAvailable = $filterOnlyAvailable && $filterOnlyAvailable.checked;
  const filtered = MATCHES
    .filter(matchPassesFilters)
    .filter(m => !onlyAvailable || LISTINGS_BY_MATCH.has(m.num))
    .sort((a, b) => a.num - b.num); // siempre ordenado por número de partido

  if (filtered.length === 0) {
    $list.innerHTML = `<p class="muted">No hay partidos que coincidan con tu búsqueda.</p>`;
    return;
  }

  $list.innerHTML = filtered.map(renderCard).join('');

  // listeners para abrir/cerrar
  $list.querySelectorAll('.match-head').forEach(el => {
    el.addEventListener('click', () => {
      el.parentElement.classList.toggle('open');
    });
  });
}

function renderCard(match) {
  const listings = LISTINGS_BY_MATCH.get(match.num) || [];
  const summary = listings.length > 0
    ? `<div class="price-from">desde ${fmtPrice(listings[listings.length - 1].price_usd)}</div>
       <div class="count">${listings.length} publicación${listings.length === 1 ? '' : 'es'}</div>`
    : `<div class="none">Sin publicaciones</div>`;
  // Nota: como ordenamos por categoría primero, "desde" no es necesariamente el más barato global.
  // Calculamos el mínimo real para mostrarlo en el resumen:
  const minPrice = listings.length ? Math.min(...listings.map(l => l.price_usd)) : null;
  const summary2 = listings.length > 0
    ? `<div class="price-from">desde ${fmtPrice(minPrice)}</div>
       <div class="count">${listings.length} publicación${listings.length === 1 ? '' : 'es'}</div>`
    : `<div class="none">Sin publicaciones</div>`;

  const tableRows = listings.length === 0
    ? `<tr class="empty-row"><td colspan="7">Todavía no hay entradas publicadas para este partido.</td></tr>`
    : listings.map(l => `
        <tr>
          <td>${escapeHtml(l.category)}</td>
          <td class="price">${fmtPrice(l.price_usd)}</td>
          <td>${l.tickets}</td>
          <td>${escapeHtml(l.block || '-')}</td>
          <td>${escapeHtml(l.row || '-')} / ${escapeHtml(l.seats || '-')}</td>
          <td>${escapeHtml(l.comments || '')}</td>
          <td>
            <a class="btn-wa" target="_blank" rel="noopener" href="${buildWhatsAppLink(l)}">
              <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M20.52 3.48A11.86 11.86 0 0 0 12 0a12 12 0 0 0-10.4 17.95L0 24l6.22-1.62A12 12 0 1 0 20.52 3.48ZM12 21.8a9.79 9.79 0 0 1-5-1.36l-.36-.21-3.69.96.99-3.59-.24-.37A9.8 9.8 0 1 1 21.8 12 9.81 9.81 0 0 1 12 21.8Zm5.4-7.34c-.3-.15-1.76-.87-2.03-.97s-.47-.15-.67.15-.77.97-.94 1.16-.34.22-.64.07a8.05 8.05 0 0 1-2.36-1.45 8.84 8.84 0 0 1-1.63-2.03c-.17-.3 0-.45.13-.6s.3-.34.45-.52a2 2 0 0 0 .3-.5.55.55 0 0 0 0-.52c-.07-.15-.67-1.62-.92-2.21s-.49-.5-.67-.5h-.57a1.1 1.1 0 0 0-.8.37 3.34 3.34 0 0 0-1.04 2.48 5.79 5.79 0 0 0 1.21 3.07 13.27 13.27 0 0 0 5.07 4.49c.71.31 1.27.49 1.7.62a4.1 4.1 0 0 0 1.88.12 3.07 3.07 0 0 0 2-1.41 2.48 2.48 0 0 0 .17-1.41c-.07-.13-.27-.21-.57-.36Z"/>
              </svg>
              WhatsApp
            </a>
          </td>
        </tr>
      `).join('');

  return `
    <article class="match-card">
      <header class="match-head">
        <div class="match-num">#${match.num}<small>partido</small></div>
        <div class="match-info">
          <div class="teams">${escapeHtml(match.home)} vs ${escapeHtml(match.away)}</div>
          <div class="meta">
            <span class="tag stage">${escapeHtml(match.stage)}${match.group ? ' · Grupo ' + match.group : ''}</span>
            <span class="tag">${fmtDate(match.date)}</span>
            <span class="tag">${escapeHtml(match.venue)} · ${escapeHtml(match.city)}, ${escapeHtml(match.country)}</span>
          </div>
        </div>
        <div class="match-summary">${summary2}<span class="chev">›</span></div>
      </header>
      <div class="match-body">
        <table class="listings">
          <thead>
            <tr>
              <th>Categoría</th>
              <th>Precio por entrada (USD)</th>
              <th>Cant.</th>
              <th>Sector</th>
              <th>Fila / Asientos</th>
              <th>Comentarios</th>
              <th>Contacto</th>
            </tr>
          </thead>
          <tbody>${tableRows}</tbody>
        </table>
      </div>
    </article>
  `;
}

function escapeHtml(s) {
  return String(s ?? '').replace(/[&<>"']/g, ch => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[ch]));
}

[$filterText, $filterStage, $filterCountry].forEach(el => el && el.addEventListener('input', render));
if ($filterOnlyAvailable) $filterOnlyAvailable.addEventListener('change', render);

load();
// refrescamos cada 60s para reflejar nuevas publicaciones / vencimientos
setInterval(load, 60000);
