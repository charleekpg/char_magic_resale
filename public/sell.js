// Frontend del formulario de carga.

const $matchSearch = document.getElementById('match-search');
const $matchSelect = document.getElementById('match_num');
const $matchDetail = document.getElementById('match-detail');
const $categorySelect = document.getElementById('category');
const $form = document.getElementById('sell-form');
const $status = document.getElementById('form-status');

let MATCHES = [];
let CATEGORIES = [];

async function init() {
  const [matches, categories] = await Promise.all([
    fetch('/api/matches').then(r => r.json()),
    fetch('/api/categories').then(r => r.json()).catch(() => [
      'Categoría 4', 'Categoría 3', 'Categoría 3 Front Row',
      'Categoría 2', 'Categoría 2 Front Row',
      'Categoría 1', 'Categoría 1 Front Row', 'Hospitality',
    ]),
  ]);
  MATCHES = matches;
  CATEGORIES = categories;
  renderMatchOptions();
  renderCategoryOptions();

  // Si llegan a /vender.html?match=36 lo preseleccionamos
  const params = new URLSearchParams(location.search);
  const pre = params.get('match');
  if (pre) {
    $matchSelect.value = pre;
    showDetail(parseInt(pre, 10));
  }
}

function renderCategoryOptions() {
  const placeholder = '<option value="">Elegí una opción</option>';
  const opts = CATEGORIES.map(c => `<option value="${escapeHtml(c)}">${escapeHtml(c)}</option>`).join('');
  $categorySelect.innerHTML = placeholder + opts;
}

function renderMatchOptions() {
  const q = ($matchSearch.value || '').trim().toLowerCase();
  const selected = $matchSelect.value;
  const filtered = MATCHES.filter(m => {
    if (!q) return true;
    return [
      m.num, m.home, m.away, m.venue, m.city, m.country, m.stage, m.group || ''
    ].join(' ').toLowerCase().includes(q);
  });
  $matchSelect.innerHTML = filtered.map(m => {
    const label = `Partido ${m.num} · ${m.home} vs ${m.away} · ${fmtDate(m.date)} · ${m.city}, ${m.country}`;
    return `<option value="${m.num}">${escapeHtml(label)}</option>`;
  }).join('');
  if (selected && filtered.find(m => String(m.num) === selected)) {
    $matchSelect.value = selected;
  }
}

function showDetail(num) {
  const m = MATCHES.find(x => x.num === num);
  if (!m) { $matchDetail.innerHTML = ''; return; }
  $matchDetail.innerHTML = `
    <strong>Partido ${m.num}</strong> — ${escapeHtml(m.stage)}${m.group ? ' (Grupo ' + m.group + ')' : ''}<br>
    ${escapeHtml(m.home)} vs ${escapeHtml(m.away)} · ${fmtDate(m.date)}<br>
    ${escapeHtml(m.venue)} — ${escapeHtml(m.city)}, ${escapeHtml(m.country)}
  `;
}

$matchSearch.addEventListener('input', renderMatchOptions);
$matchSelect.addEventListener('change', () => showDetail(parseInt($matchSelect.value, 10)));

$form.addEventListener('submit', async (e) => {
  e.preventDefault();
  $status.textContent = '';
  const data = Object.fromEntries(new FormData($form).entries());
  data.match_num = parseInt($matchSelect.value, 10);
  if (!data.match_num) { $status.textContent = 'Elegí un partido'; return; }

  const btn = $form.querySelector('button[type=submit]');
  btn.disabled = true;
  $status.textContent = 'Publicando...';

  try {
    const res = await fetch('/api/listings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    const body = await res.json();
    if (!res.ok) {
      $status.textContent = '✕ ' + (body.error || 'Error inesperado');
      return;
    }
    $status.textContent = '✓ Publicación creada. Vence en 24 hs.';
    $form.reset();
    renderCategoryOptions();
    $matchDetail.innerHTML = '';
  } catch (err) {
    $status.textContent = '✕ No se pudo publicar: ' + err.message;
  } finally {
    btn.disabled = false;
  }
});

function fmtDate(iso) {
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

function escapeHtml(s) {
  return String(s ?? '').replace(/[&<>"']/g, ch => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[ch]));
}

init();
