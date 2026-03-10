// =====================================================
//  CALENDRIER DU VILLAGE — VERSION STABILISÉE (NON-MODULE)
//  Correctifs fuseau horaire, filtres, performances
//  -> A coller tel quel dans app.js
// =====================================================

// Fenêtre centrée : M-1 | M | M+1 (M = mois central)
const today = new Date();

// Cache de formateurs (perf)
const fmt = {
  monthYear: new Intl.DateTimeFormat('fr-FR', { month: 'long', year: 'numeric' }),
  weekdayLong: new Intl.DateTimeFormat('fr-FR', { weekday: 'long' })
};

const state = {
  anchor: new Date(today.getFullYear(), today.getMonth(), 1),
  village: 'ALL',
  filtre: 'all',
  dataMap: new Map(),
  roi: '—',
  motif: '—',
  marche: [],
  tmonths: {}
};


 j8: {},                 // { VILLAGE: {"1":..., ..."8":...}, ALL:{...} }
  j8Anchor: {},           // { ALL: { date:"YYYY-MM-DD", j:1..8 }, VILLAGE? ... }


// =====================================================
//  Utilitaires robustes
// =====================================================

// Format ISO local yyyy-mm-dd SANS UTC (évite les décalages d’un jour)
function toISO(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function makeKey(dateISO, village) {
  return `${dateISO}|${village}`;
}

function daysInMonth(y, m) {
  return new Date(y, m + 1, 0).getDate();
}

function isSameDay(a, b) {
  return a.getFullYear() === b.getFullYear()
    && a.getMonth() === b.getMonth()
    && a.getDate() === b.getDate();
}

function monthLabel(y, m) {
  return fmt.monthYear.format(new Date(y, m, 1));
}

function formatDayLabel(d) {
  const wd = fmt.weekdayLong.format(d);
  return wd.charAt(0).toUpperCase() + wd.slice(1);
}

function normalizeDay(s){
  return String(s||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim();
}
function isMarketByRoot(d){
  // Utilise state.marche qui est déjà alimenté depuis data.market_info via cvSetVillageMeta
  const wd = normalizeDay(formatDayLabel(d));
  const list = Array.isArray(state.marche) ? state.marche.map(normalizeDay) : [];
  return list.includes(wd);
}

// J1..J8 par village
if (data?.traditional_days_8){
  const out = {};
  for (const [vill, map] of Object.entries(data.traditional_days_8)){
    const vKey = (vill || 'ALL').toUpperCase();
    out[vKey] = {};
    for (const [k,val] of Object.entries(map || {})){
      const n = Number(k);
      if (n>=1 && n<=8) out[vKey][String(n)] = String(val||'').trim();
    }
  }
  state.j8 = out;
}

// Anchor { date, j }
if (data?.traditional_days_anchor){
  const out = {};
  for (const [vill, payload] of Object.entries(data.traditional_days_anchor)){
    const vKey = (vill || 'ALL').toUpperCase();
    if (typeof payload === 'string') {
      // rétro-compat: parfois on n’envoyait qu’une date
      out[vKey] = { date: payload, j: 1 };
    } else if (payload && /^\d{4}-\d{2}-\d{2}$/.test(String(payload.date))) {
      const jj = Math.min(8, Math.max(1, parseInt(payload.j ?? 1, 10) || 1));
      out[vKey] = { date: String(payload.date), j: jj };
    }
  }
  state.j8Anchor = out;
}

// Normalisation déjà effectuée au chargement
function getTraditionalMonthName(year, monthIndex, village) {
  const vKey = (village || 'ALL').toUpperCase();
  const map = state.tmonths[vKey] || state.tmonths['ALL'];
  if (!map) return '—';

  const oneBased = String(((monthIndex % 12) + 12) % 12 + 1);
  return map[oneBased] || '—';
}

function resolveTraditionalAndTags(d, village) {
  const iso = toISO(d);
  const vKey = (village || 'ALL').toUpperCase();
  let rec = state.dataMap.get(makeKey(iso, vKey));

  if (!rec) rec = state.dataMap.get(makeKey(iso, 'ALL'));

  return {
    trad: rec?.trad || 'Trad · Général',
    isForbidden: !!rec?.tags?.has('forbidden'),
    isMarket: !!rec?.tags?.has('market')
  };
}

return {
  trad: rec?.trad || 'Trad · Général',
  isForbidden: !!rec?.tags?.has('forbidden'),
  isMarket: ( !!rec?.tags?.has('market') || isMarketByRoot(d) )
};

// =====================================================
//  API (exposée via window.* en bas du fichier)
// =====================================================

function cvUpdateData(entries) {
  for (const e of entries) {
    const vKey = (e.village || 'ALL').toUpperCase();
    const k = makeKey(e.dateISO, vKey);

    const prev = state.dataMap.get(k) || { trad: '', tags: new Set() };
    const nextTags = new Set(prev.tags);

    if (Array.isArray(e.tags)) {
      for (const t of e.tags) nextTags.add(String(t));
    }

    state.dataMap.set(k, {
      trad: e.trad || prev.trad || '',
      tags: nextTags
    });
  }
  renderNineColumns();
}

function cvSetWatermark(text) {
  const el = document.getElementById('calendar-9cols');
  if (el) el.setAttribute('data-watermark', (text || 'VILLAGE').toUpperCase());
}

function cvSetVillageMeta({ roi, marche, info }) {
  if (roi) state.roi = roi;
  if (Array.isArray(marche)) state.marche = marche;
  if (info) state.motif = info;
  renderVillageMeta();
}

// =====================================================
//  Chargement du JSON + normalisation
// =====================================================

async function loadDataJSON() {
  try {
    const res = await fetch('./data.json', { cache: 'no-store' });
    if (!res.ok) return;
    const data = await res.json();

    // Normalisation des mois traditionnels : 1..12
    if (data?.traditional_months) {
      const out = {};
      for (const [villageRaw, months] of Object.entries(data.traditional_months)) {
        const key = (villageRaw || 'ALL').toUpperCase();
        out[key] = {};
        for (const [k, name] of Object.entries(months || {})) {
          const idx = Number(k);
          const normalized = ((idx % 12) + 12) % 12; // 0..11
          const oneBased = String(normalized + 1); // 1..12
          out[key][oneBased] = name || '—';
        }
      }
      state.tmonths = out;
    }

// dans const state = { ... }
  j8: {},                 // { VILLAGE: {"1":..., ..."8":...}, ALL:{...} }
  j8Anchor: {},           // { ALL: { date:"YYYY-MM-DD", j:1..8 }, VILLAGE? ... }

    
    if (Array.isArray(data?.entries)) cvUpdateData(data.entries);
    cvSetVillageMeta({
      roi: data.roi,
      marche: data.market_info || [],
      info: data.extra_info
    });

  } catch (e) {
    console.error('Erreur JSON:', e);
  }
}

// =====================================================
//  Filtre
// =====================================================

function getFilterValue(){
  const sel = document.getElementById('param-filtre');
  if (!sel) return 'all';
  const raw = String(sel.value || sel.options[sel.selectedIndex]?.text || '').toLowerCase().trim();
  if (raw.includes('interdit')) return 'forbidden';
  if (raw.includes('march'))   return 'market';
  return 'all';
}

function shouldHideByFilter({isForbidden, isMarket}){
  const f = getFilterValue();  // <- lecture directe, normalisée
  if (f === 'forbidden') return !isForbidden; // grise tout sauf les interdits
  if (f === 'market')   return !isMarket;     // grise tout sauf les marchés
  return false;                                // all -> ne grise rien
}

// =====================================================
//  Rendu
// =====================================================

function renderNineColumns() {
  const root = document.getElementById('calendar-9cols');
  if (!root) return;

  root.setAttribute('aria-busy', 'true');
  root.innerHTML = '';

  const frag = document.createDocumentFragment();
  const months = [
    new Date(state.anchor.getFullYear(), state.anchor.getMonth() - 1, 1),
    new Date(state.anchor.getFullYear(), state.anchor.getMonth(), 1),
    new Date(state.anchor.getFullYear(), state.anchor.getMonth() + 1, 1)
  ];
  const classes = ['mL', 'mC', 'mR'];

  months.forEach((start, i) => renderOneMonth(frag, start, state.village, classes[i]));

  // --- purge défensive des traces de filtre (facultatif)
  frag.querySelectorAll('.row.filtered-out').forEach(el => el.classList.remove('filtered-out'));

  root.appendChild(frag);
  syncParamFields();
  root.setAttribute('aria-busy', 'false');
  renderVillageMeta();
} // <-- ne pas supprimer cette accolade !

function renderOneMonth(root, startOfMonth, village, placeClass) {
  const y = startOfMonth.getFullYear();
  const m = startOfMonth.getMonth();
  const nDays = daysInMonth(y, m);

  const wrap = document.createElement('div');
  wrap.className = 'month ' + placeClass;
  wrap.setAttribute('role', 'rowgroup');

  const header = document.createElement('div');
  header.className = 'month-header';
  const tradMonth = getTraditionalMonthName(y, m, village);
  header.textContent = `${monthLabel(y, m)} — ${tradMonth}` + (placeClass === 'mC' ? ' (M)' : '');
  wrap.setAttribute('data-watermark', village);
  wrap.appendChild(header);

  // Titres colonnes — regroupés dans une ligne
  const head = document.createElement('div');
  head.className = 'month-head-row';

  const t1 = document.createElement('div');
  t1.className = 'col-title';
  t1.textContent = 'Date';

  const t2 = document.createElement('div');
  t2.className = 'col-title';
  t2.textContent = 'Jour grégorien';

  const t3 = document.createElement('div');
  t3.className = 'col-title';
  t3.textContent = 'Jour traditionnel';

  head.appendChild(t1);
  head.appendChild(t2);
  head.appendChild(t3);

  // Ajout du nouveau groupe
  wrap.appendChild(head);

  const frag = document.createDocumentFragment();

  for (let d = 1; d <= nDays; d++) {
    const cur = new Date(y, m, d);
    const { trad, isForbidden, isMarket } = resolveTraditionalAndTags(cur, village);

    const row = document.createElement('div');
    row.className = 'row'
      + (isSameDay(cur, today) ? ' today' : '')
      + (isForbidden ? ' forbidden' : '')
      + (isMarket ? ' market' : '');

    if (shouldHideByFilter({ isForbidden, isMarket }))
      row.classList.add('filtered-out');

    const zebra = (d % 2 === 0);

    const c1 = document.createElement('div');
    c1.className = 'cell date' + (zebra ? ' zebra' : '');
    c1.textContent = String(d);

    const c2 = document.createElement('div');
    c2.className = 'cell greg' + (zebra ? ' zebra' : '');
    c2.textContent = formatDayLabel(cur);
    c2.setAttribute('data-day', formatDayLabel(cur).toLowerCase()); // repérage week-end

    const c3 = document.createElement('div');
    c3.className = 'cell tradi' + (zebra ? ' zebra' : '');
    c3.textContent = trad;

    row.appendChild(c1);
    row.appendChild(c2);
    row.appendChild(c3);

    frag.appendChild(row);
  }

  wrap.appendChild(frag);
  root.appendChild(wrap);
}

// =====================================================
//  Métadonnées village
// =====================================================

function renderVillageMeta() {
  const r = document.getElementById('roi-village');
  const m = document.getElementById('motif-village');
  const mk = document.getElementById('marche-village');

  if (r) r.textContent = state.roi || '—';
  if (m) m.textContent = state.motif || '—';
  if (mk) mk.textContent = (state.marche || []).join(', ') || '—';
}

// =====================================================
//  Navigation
// =====================================================

function wireNav() {
  document.querySelectorAll('.nav-row [data-action]').forEach(btn => {
    btn.addEventListener('click', () => {
      const a = btn.dataset.action;

      if (a === 'prev3') state.anchor = new Date(state.anchor.getFullYear(), state.anchor.getMonth() - 3, 1);
      if (a === 'next3') state.anchor = new Date(state.anchor.getFullYear(), state.anchor.getMonth() + 3, 1);
      if (a === 'prevY') state.anchor = new Date(state.anchor.getFullYear() - 1, state.anchor.getMonth(), 1);
      if (a === 'nextY') state.anchor = new Date(state.anchor.getFullYear() + 1, state.anchor.getMonth(), 1);
      if (a === 'today') state.anchor = new Date(today.getFullYear(), today.getMonth(), 1);

      syncParamFields();
      renderNineColumns();
    });
  });
}

// =====================================================
//  Paramètres
// =====================================================

function wireParams() {
  const y = document.getElementById('param-annee');
  const m = document.getElementById('param-mois');
  const v = document.getElementById('param-village');
  const f = document.getElementById('param-filtre');

  if (y && m) {
    const update = () => {
      state.anchor = new Date(Number(y.value) || today.getFullYear(), (Number(m.value) || 1) - 1, 1);
      renderNineColumns();
    };
    y.addEventListener('change', update);
    m.addEventListener('change', update);
  }

  if (v) {
    v.addEventListener('change', e => {
      state.village = (e.target.value || 'ALL').toUpperCase();
      const label = e.target.options[e.target.selectedIndex]?.text || e.target.value;
      cvSetWatermark(label);
      renderNineColumns();
    });
  }

  if (f) {
    f.addEventListener('change', e => {
      const raw = String(e.target.value || 'all').toLowerCase();
      state.filtre =
        (raw === 'tous') ? 'all' :
        (raw === 'marché' || raw === 'marche') ? 'market' :
        (raw === 'interdits' || raw === 'interdit') ? 'forbidden' :
        raw;
      renderNineColumns();
    });
  }
}

function syncParamFields() {
  const y = document.getElementById('param-annee');
  const m = document.getElementById('param-mois');
  if (y) y.value = state.anchor.getFullYear();
  if (m) m.value = state.anchor.getMonth() + 1;
}

// =====================================================
//  Initialisation
// =====================================================

wireNav();
wireParams();
loadDataJSON();
renderNineColumns();

// Helpers exposés globalement
window.cvUpdateData = cvUpdateData;
window.cvSetWatermark = cvSetWatermark;
window.cvSetVillageMeta = cvSetVillageMeta;

const state = {
  // ...
  vmeta: {},            // roi, market_info[], forbidden_days[], extra_info
  j8: {},               // { VILLAGE: { "1":"J1", ... "8":"J8" } }
};

