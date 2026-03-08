// === Données dynamiques (tu peux piloter) ===
// Option 1 : fournir window.CV_DATA avant app.js
// Option 2 : data.json (réseau d'abord, fallback cache)

const today = new Date();
const state = {
  anchor: new Date(today.getFullYear(), today.getMonth(), 1),
  village: 'all',
  filtre: 'all',
  dataMap: new Map(), // key: yyyy-mm-dd|village  -> { trad: string, tags: Set('forbidden','market') }
};

// === API pour TOI ===
// 1) Injecter ou mettre à jour les données à chaud
export function cvUpdateData(entries) {
  // entries: [{ dateISO:'2026-03-01', village:'balengou', trad:'Nd...', tags:['market'] }, ...]
  for (const e of entries) {
    const key = makeKey(e.dateISO, e.village||'all');
    state.dataMap.set(key, {
      trad: e.trad || '',
      tags: new Set(e.tags || [])
    });
  }
  renderNineColumns();
}
// 2) Changer le watermark
export function cvSetWatermark(text) {
  const root = document.getElementById('calendar-9cols');
  root.setAttribute('data-watermark', text || 'Calendrier du Village');
}

function makeKey(dateISO, village) { return `${dateISO}|${village}`; }
function toISO(d){ return d.toISOString().slice(0,10); }
function daysInMonth(y,m){ return new Date(y, m+1, 0).getDate(); }
function isSameDay(a,b){ return a.getFullYear()===b.getFullYear() && a.getMonth()===b.getMonth() && a.getDate()===b.getDate(); }

function formatDayLabel(d){
  const wd = new Intl.DateTimeFormat('fr-FR', { weekday: 'long' }).format(d);
  return `${wd.charAt(0).toUpperCase()+wd.slice(1)} – ${new Intl.DateTimeFormat('fr-FR').format(d)}`;
}
function monthLabel(y,m){ return new Intl.DateTimeFormat('fr-FR', { month:'long', year:'numeric' }).format(new Date(y,m,1)); }

// Renvoie {{trad, isForbidden, isMarket}}
function resolveTraditionalAndTags(d, village){
  const iso = toISO(d);
  // 1) spécifique au village
  let rec = state.dataMap.get(makeKey(iso, village));
  // 2) sinon 'all'
  if (!rec) rec = state.dataMap.get(makeKey(iso, 'all'));
  // 3) défaut : aucune info
  const trad = rec?.trad || 'Trad · Général';
  const isForbidden = !!rec?.tags?.has('forbidden');
  const isMarket = !!rec?.tags?.has('market');
  return { trad, isForbidden, isMarket };
}

async function loadDataJSON(){
  try {
    const res = await fetch('./data.json', { cache: 'no-store' }); // réseau d'abord
    if (!res.ok) return;
    const data = await res.json();
    if (Array.isArray(data?.entries)) {
      cvUpdateData(data.entries);
    }
  } catch(_){}
}

function wireNav(){
  document.querySelectorAll('.nav-row [data-action]').forEach(btn => {
    btn.addEventListener('click', () => {
      const a = btn.dataset.action;
      if (a === 'prev') state.anchor = new Date(state.anchor.getFullYear(), state.anchor.getMonth() - 1, 1);
      if (a === 'next') state.anchor = new Date(state.anchor.getFullYear(), state.anchor.getMonth() + 1, 1);
      if (a === 'today') state.anchor = new Date(today.getFullYear(), today.getMonth(), 1);
      if (a === 'prev3') state.anchor = new Date(state.anchor.getFullYear(), state.anchor.getMonth() - 3, 1);
      if (a === 'next3') state.anchor = new Date(state.anchor.getFullYear(), state.anchor.getMonth() + 3, 1);
      syncParamFields();
      renderNineColumns();
    });
  });
}
function wireParams() {
  const y = document.getElementById('param-annee');
  const m = document.getElementById('param-mois');
  const v = document.getElementById('param-village');
  const f = document.getElementById('param-filtre');
  if (y && m) {
    y.addEventListener('change', () => { state.anchor = new Date(Number(y.value)||today.getFullYear(), (Number(m.value)||1)-1, 1); renderNineColumns(); });
    m.addEventListener('change', () => { state.anchor = new Date(Number(y.value)||today.getFullYear(), (Number(m.value)||1)-1, 1); renderNineColumns(); });
  }
  if (v) v.addEventListener('change', e => { state.village = e.target.value; renderNineColumns(); });
  if (f) f.addEventListener('change', e => { state.filtre = e.target.value; renderNineColumns(); });
}
function syncParamFields(){
  const y = document.getElementById('param-annee');
  const m = document.getElementById('param-mois');
  if (y) y.value = state.anchor.getFullYear();
  if (m) m.value = (state.anchor.getMonth()+1);
}

function renderNineColumns(){
  const root = document.getElementById('calendar-9cols');
  root.setAttribute('aria-busy','true');
  root.innerHTML = '';
  const months = [ new Date(state.anchor.getFullYear(), state.anchor.getMonth() - 1, 1), new Date(state.anchor.getFullYear(), state.anchor.getMonth(), 1), new Date(state.anchor.getFullYear(), state.anchor.getMonth() + 1, 1) ];
  months.forEach(start => renderOneMonth(root, start, state.village));
  syncParamFields();
  root.setAttribute('aria-busy','false');
}

function renderOneMonth(root, startOfMonth, village){
  const y = startOfMonth.getFullYear();
  const m = startOfMonth.getMonth();
  const nDays = daysInMonth(y, m);

  const wrap = document.createElement('div');
  wrap.className = 'month';
  const header = document.createElement('div');
  header.className = 'month-header';
  header.textContent = monthLabel(y, m) + (village && village!=='all' ? ` — ${village}` : '');
  wrap.appendChild(header);

  // Column titles
  const hDate = document.createElement('div'); hDate.className = 'cell col-title'; hDate.textContent = 'Date'; wrap.appendChild(hDate);
  const hGreg = document.createElement('div'); hGreg.className = 'cell col-title'; hGreg.textContent = 'Jour'; wrap.appendChild(hGreg);
  const hTrad = document.createElement('div'); hTrad.className = 'cell col-title'; hTrad.textContent = 'Trad.'; wrap.appendChild(hTrad);

  for (let d = 1; d <= nDays; d++){
    const cur = new Date(y, m, d);
    const iso = toISO(cur);
    const { trad, isForbidden, isMarket } = resolveTraditionalAndTags(cur, village);

    // Filtre
    if (state.filtre === 'forbidden' && !isForbidden) continue;
    if (state.filtre === 'market' && !isMarket) continue;

    const row = document.createElement('div');
    row.className = 'day-row row';
    if (isForbidden) row.classList.add('forbidden');
    if (isMarket) row.classList.add('market');
    if (isSameDay(cur, today)) row.classList.add('today');

    const zebra = (d % 2 === 0);

    const cDate = document.createElement('div'); cDate.className = 'cell date' + (zebra?' zebra':''); cDate.textContent = String(d); row.appendChild(cDate);
    const cGreg = document.createElement('div'); cGreg.className = 'cell greg' + (zebra?' zebra':''); cGreg.textContent = formatDayLabel(cur); row.appendChild(cGreg);
    const cTrad = document.createElement('div'); cTrad.className = 'cell tradi' + (zebra?' zebra':''); cTrad.textContent = trad; row.appendChild(cTrad);

    wrap.appendChild(row);
  }

  root.appendChild(wrap);
}

// Boot
wireNav();
wireParams();
loadDataJSON();
renderNineColumns();

// Expose helpers to window for you
window.cvUpdateData = cvUpdateData;
window.cvSetWatermark = cvSetWatermark;
