// =====================================================
//  CALENDRIER DU VILLAGE — VERSION MOBILE SAFE
//  - Dépendances: data.v3.json (voir schéma proposé)
//  - Dérivation marché/interdits depuis indices J1..J8
// =====================================================

const today = new Date();

const fmt = {
  monthYear: new Intl.DateTimeFormat('fr-FR', { month: 'long', year: 'numeric' }),
  weekdayLong: new Intl.DateTimeFormat('fr-FR', { weekday: 'long' })
};

const state = {
  anchor: new Date(today.getFullYear(), today.getMonth(), 1),
  village: 'ALL',
  filtre: 'all',
  dataMap: new Map(),      // carte dateISO|VILLAGE -> { trad, tags:Set }
  roi: '—',
  motif: '—',
  marche: [],              // texte lisible (facultatif pour affichage)
  tmonths: {},             // { VILLAGE: { "1": "NomM1", ..., "12": "NomM12" } }
  j8: {},                  // { VILLAGE: { "1":"NomJ1", ..., "8":"NomJ8" } }
  j8Anchor: {},            // { VILLAGE: { date:"YYYY-MM-DD", j:1..8 } }
  marketFromJ: {},         // { VILLAGE: [2,6] } (indices)
  forbiddenFromJ: {}       // { VILLAGE: [3] }   (indices)
};

// ---------------------- Utils

function normalizeName(s) {
  return String(s || '')
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // sans accents
    .replace(/['’`´]/g, '') // apostrophes
    .replace(/\s+/g, ' ')   // espaces multiples
    .trim();
}


function toISO(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2,'0');
  const day = String(d.getDate()).padStart(2,'0');
  return `${y}-${m}-${day}`;
}
function makeKey(dateISO, village) { return `${dateISO}|${village}`; }
function daysInMonth(y, m) { return new Date(y, m+1, 0).getDate(); }
function isSameDay(a,b){ return a.getFullYear()===b.getFullYear() && a.getMonth()===b.getMonth() && a.getDate()===b.getDate(); }
function monthLabel(y,m){ return fmt.monthYear.format(new Date(y,m,1)); }
function formatDayLabel(d){ const wd = fmt.weekdayLong.format(d); return wd.charAt(0).toUpperCase()+wd.slice(1); }

// ---------------------- J-cycle helpers
function getAnchorForVillage(village){
  const v = (village || 'ALL').toUpperCase();
  return state.j8Anchor[v] || state.j8Anchor['ALL'] || null;
}
// Calcule J (1..8) pour une date donnée en fonction de l’ancre {date, j}
function getJIndexForDate(d, village){
  const anc = getAnchorForVillage(village);
  if (!anc || !/^\d{4}-\d{2}-\d{2}$/.test(anc.date)) return null;
  const start = new Date(anc.date + 'T00:00:00'); // local midnight
  const dayDiff = Math.floor((d - start) / 86400000);
  // Remettre dans le cycle 1..8 en partant de anc.j
  const base = ((anc.j - 1 + ((dayDiff % 8) + 8) % 8) % 8) + 1;
  return base; // 1..8
}

function listContainsJ(villageMap, village, jIdx){
  const v = (village || 'ALL').toUpperCase();
  const list = villageMap[v] || villageMap['ALL'] || [];
  return Array.isArray(list) && list.includes(jIdx);
}

function getTraditionalMonthName(year, monthIndex, village) {
  const vKey = (village || 'ALL').toUpperCase();
  const map = state.tmonths[vKey] || state.tmonths['ALL'];
  if (!map) return '—';
  const oneBased = String(((monthIndex % 12) + 12) % 12 + 1);
  return map[oneBased] || '—';
}

// Résout la donnée du jour courant (trad, tags) + dérivation marché/interdit par J
function resolveTraditionalAndTags(d, village) {
  const iso = toISO(d);
  const vKey = (village || 'ALL').toUpperCase();
  let rec = state.dataMap.get(makeKey(iso, vKey));
  if (!rec) rec = state.dataMap.get(makeKey(iso, 'ALL'));

  // J courant
  const jIdx = getJIndexForDate(d, vKey);

  // Dérivation marché/interdit via indices J
  const derivedMarket   = (jIdx!=null) && listContainsJ(state.marketFromJ, vKey, jIdx);
  const derivedForbidden= (jIdx!=null) && listContainsJ(state.forbiddenFromJ, vKey, jIdx);

  // Fusion: tags explicites (entries) priment, mais on “OR” avec dérivés
  const tagMarket    = !!(rec?.tags?.has('market')   || derivedMarket);
  const tagForbidden = !!(rec?.tags?.has('forbidden')|| derivedForbidden);

  // Libellé J si pas de trad explicite
  let tradLabel = rec?.trad;
  if (!tradLabel && state.j8[vKey]) {
    const nameJ = state.j8[vKey][String(jIdx || '')];
    if (nameJ) tradLabel = nameJ;
  }
  if (!tradLabel) tradLabel = 'Trad · Général';

  return { trad: tradLabel, isMarket: tagMarket, isForbidden: tagForbidden };
}

// ---------------------- Données
function cvUpdateData(entries) {
  for (const e of entries) {
    const vKey = (e.village || 'ALL').toUpperCase();
    const k = makeKey(e.dateISO, vKey);
    const prev = state.dataMap.get(k) || { trad: '', tags: new Set() };
    const nextTags = new Set(prev.tags);
    if (Array.isArray(e.tags)) for (const t of e.tags) nextTags.add(String(t));
    state.dataMap.set(k, { trad: e.trad || prev.trad || '', tags: nextTags });
  }
  renderNineColumns();
}

function cvSetWatermark(text) {
  const el = document.getElementById('calendar-9cols');
  if (el) el.setAttribute('data-watermark', (text || 'VILLAGE').toUpperCase());
}

function cvSetVillageMeta({ roi, marche, info }) {
  if (roi) state.roi = roi;
  if (Array.isArray(marche)) state.marche = marche; // lisible pour l’UI
  if (info) state.motif = info;
  renderVillageMeta();
}

// ---------------------- Chargement JSON
async function loadDataJSON() {
  try {
    const res = await fetch('./data.v3.json?v=' + Date.now(), { cache: 'no-store' });
    if (!res.ok) return;
    const data = await res.json();

    // Mois traditionnels 1..12
    if (data?.traditional_months) {
      const out = {};
      for (const [villageRaw, months] of Object.entries(data.traditional_months)) {
        const key = (villageRaw || 'ALL').toUpperCase();
        out[key] = {};
        for (const [k, name] of Object.entries(months || {})) {
          const idx = Number(k);
          const normalized = ((idx % 12) + 12) % 12; // 0..11
          const oneBased = String(normalized + 1);   // 1..12
          out[key][oneBased] = name || '—';
        }
      }
      state.tmonths = out;
    }

    // J1..J8
    if (data?.traditional_days_8) {
      const out = {};
      for (const [vill, map] of Object.entries(data.traditional_days_8)) {
        const vKey = (vill || 'ALL').toUpperCase();
        out[vKey] = {};
        for (const [k, val] of Object.entries(map || {})) {
          const n = Number(k);
          if (n>=1 && n<=8) out[vKey][String(n)] = String(val||'').trim();
        }
      }
      state.j8 = out;
    }

    // Anchor J
    if (data?.traditional_days_anchor) {
      const out = {};
      for (const [vill, payload] of Object.entries(data.traditional_days_anchor)) {
        const vKey = (vill || 'ALL').toUpperCase();
        if (typeof payload === 'string') {
          out[vKey] = { date: payload, j: 1 };
        } else if (payload && /^\d{4}-\d{2}-\d{2}$/.test(String(payload.date))) {
          const jj = Math.min(8, Math.max(1, parseInt(payload.j ?? 1, 10) || 1));
          out[vKey] = { date: String(payload.date), j: jj };
        }
      }
      state.j8Anchor = out;
      // Option: synchroniser l’ancre du calendrier sur l’anchor global:
      const g = out['ALL'];
      if (g) state.anchor = new Date(g.date + 'T00:00:00');
    }

    // Dérivations J -> marché/interdit (indices)
    if (data?.market_from_j) {
      const out = {};
      for (const [vill, list] of Object.entries(data.market_from_j)) {
        const vKey = (vill || 'ALL').toUpperCase();
        out[vKey] = (list || []).map(n => parseInt(n,10)).filter(n => n>=1 && n<=8);
      }
      state.marketFromJ = out;
    }
    if (data?.forbidden_from_j) {
      const out = {};
      for (const [vill, list] of Object.entries(data.forbidden_from_j)) {
        const vKey = (vill || 'ALL').toUpperCase();
        out[vKey] = (list || []).map(n => parseInt(n,10)).filter(n => n>=1 && n<=8);
      }
      state.forbiddenFromJ = out;
    }

    // Entries spécifiques
    if (Array.isArray(data?.entries)) cvUpdateData(data.entries);

    // Métadonnées lisibles pour l’UI
    cvSetVillageMeta({
      roi: data.roi,
      marche: data.market_info || [],
      info: data.extra_info
    });

  } catch (e) {
    console.error('Erreur JSON:', e);
  }
}

// ---------------------- Filtre
function getFilterValue(){
  const sel = document.getElementById('param-filtre');
  if (!sel) return 'all';
  const raw = String(sel.value || sel.options[sel.selectedIndex]?.text || '').toLowerCase().trim();
  if (raw.includes('interdit')) return 'forbidden';
  if (raw.includes('march'))   return 'market';
  return 'all';
}
function shouldHideByFilter({isForbidden, isMarket}){
  const f = getFilterValue();
  if (f === 'forbidden') return !isForbidden;
  if (f === 'market')    return !isMarket;
  return false;
}

// ---------------------- Rendu
function renderNineColumns() {
  const root = document.getElementById('calendar-9cols');
  if (!root) return;
  root.setAttribute('aria-busy','true');
  root.innerHTML = '';

  const frag = document.createDocumentFragment();
  const months = [
    new Date(state.anchor.getFullYear(), state.anchor.getMonth() - 1, 1),
    new Date(state.anchor.getFullYear(), state.anchor.getMonth(), 1),
    new Date(state.anchor.getFullYear(), state.anchor.getMonth() + 1, 1)
  ];
  const classes = ['mL','mC','mR'];

  months.forEach((start, i) => renderOneMonth(frag, start, state.village, classes[i]));

  root.appendChild(frag);
  syncParamFields();
  root.setAttribute('aria-busy','false');
  renderVillageMeta();
}

function renderOneMonth(root, startOfMonth, village, placeClass){
  const y = startOfMonth.getFullYear();
  const m = startOfMonth.getMonth();
  const nDays = daysInMonth(y, m);

  const wrap = document.createElement('div');
  wrap.className = 'month ' + placeClass;
  wrap.setAttribute('role','rowgroup');

  const header = document.createElement('div');
  header.className = 'month-header';
  const tradMonth = getTraditionalMonthName(y, m, village);
  header.textContent = `${monthLabel(y,m)} — ${tradMonth}` + (placeClass==='mC' ? ' (M)' : '');
  wrap.setAttribute('data-watermark', village);
  wrap.appendChild(header);

  const head = document.createElement('div');
  head.className = 'month-head-row';
  for (const t of ['Date','Jour grégorien','Jour traditionnel']) {
    const el = document.createElement('div');
    el.className = 'col-title';
    el.textContent = t;
    head.appendChild(el);
  }
  wrap.appendChild(head);

  const f = document.createDocumentFragment();

  for (let d = 1; d <= nDays; d++){
    const cur = new Date(y, m, d);
    const { trad, isForbidden, isMarket } = resolveTraditionalAndTags(cur, village);

    const row = document.createElement('div');
    row.className = 'row'
      + (isSameDay(cur, today) ? ' today' : '')
      + (isForbidden ? ' forbidden' : '')
      + (isMarket ? ' market' : '');

    if (shouldHideByFilter({ isForbidden, isMarket })) row.classList.add('filtered-out');

    const zebra = (d % 2 === 0);

    const c1 = document.createElement('div');
    c1.className = 'cell date' + (zebra ? ' zebra' : '');
    c1.textContent = String(d);

    const c2 = document.createElement('div');
    c2.className = 'cell greg' + (zebra ? ' zebra' : '');
    const lbl = formatDayLabel(cur);
    c2.textContent = lbl;
    c2.setAttribute('data-day', lbl.toLowerCase());

    const c3 = document.createElement('div');
    c3.className = 'cell tradi' + (zebra ? ' zebra' : '');
    c3.textContent = trad;

    row.appendChild(c1); row.appendChild(c2); row.appendChild(c3);
    f.appendChild(row);
  }

  wrap.appendChild(f);
  root.appendChild(wrap);
}

// ---------------------- Métadonnées village
function renderVillageMeta(){
  const r = document.getElementById('roi-village');
  const m = document.getElementById('motif-village');
  const mk = document.getElementById('marche-village');
  if (r) r.textContent = state.roi || '—';
  if (m) m.textContent = state.motif || '—';
  if (mk) mk.textContent = (state.marche || []).join(', ') || '—';
}

// ---------------------- Navigation & paramètres
function wireNav(){
  document.querySelectorAll('.nav-row [data-action]').forEach(btn => {
    btn.addEventListener('click', () => {
      const a = btn.dataset.action;
      if (a==='prev3') state.anchor = new Date(state.anchor.getFullYear(), state.anchor.getMonth()-3, 1);
      if (a==='next3') state.anchor = new Date(state.anchor.getFullYear(), state.anchor.getMonth()+3, 1);
      if (a==='prevY') state.anchor = new Date(state.anchor.getFullYear()-1, state.anchor.getMonth(), 1);
      if (a==='nextY') state.anchor = new Date(state.anchor.getFullYear()+1, state.anchor.getMonth(), 1);
      if (a==='today') state.anchor = new Date(today.getFullYear(), today.getMonth(), 1);
      syncParamFields();
      renderNineColumns();
    });
  });
}

function wireParams(){
  const y = document.getElementById('param-annee');
  const m = document.getElementById('param-mois');
  const v = document.getElementById('param-village');
  const f = document.getElementById('param-filtre');

  if (y && m) {
    const update = () => {
      state.anchor = new Date(Number(y.value)||today.getFullYear(), (Number(m.value)||1)-1, 1);
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
        (raw==='tous') ? 'all' :
        (raw==='marché' || raw==='marche') ? 'market' :
        (raw==='interdits' || raw==='interdit') ? 'forbidden' :
        raw;
      renderNineColumns();
    });
  }
}
function syncParamFields(){
  const y = document.getElementById('param-annee');
  const m = document.getElementById('param-mois');
  if (y) y.value = state.anchor.getFullYear();
  if (m) m.value = state.anchor.getMonth()+1;
}

// ---------------------- Init
wireNav();
wireParams();
loadDataJSON().then(() => renderNineColumns());

// Exposition API
window.cvUpdateData = cvUpdateData;
window.cvSetWatermark = cvSetWatermark;
window.cvSetVillageMeta = cvSetVillageMeta;
