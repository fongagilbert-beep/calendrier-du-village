// =====================================================
// CALENDRIER DU VILLAGE — VERSION MOBILE SAFE (v3)
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
  dataMap: new Map(),

  roi: '—',
  motif: '—',
  marche: [],

  tmonths: {},
  j8: {},
  j8Anchor: {},

  forbiddenNames: {},
  marketNames: {},

  forbiddenFromJ: {},
  marketFromJ: {}
};

// ----------------------------- Utils
function normalizeName(s){
  return String(s || '')
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g,'')
    .replace(/['’`´]/g, '')
    .trim();
}

function toISO(d){
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}
function makeKey(iso, v){ return iso + '|' + v; }
function daysInMonth(y,m){ return new Date(y, m+1, 0).getDate(); }
function isSameDay(a,b){ return a.getFullYear()===b.getFullYear() &amp;&amp; a.getMonth()===b.getMonth() &amp;&amp; a.getDate()===b.getDate(); }
function monthLabel(y,m){ return fmt.monthYear.format(new Date(y,m,1)); }
function formatDayLabel(d){
  const wd = fmt.weekdayLong.format(d);
  return wd.charAt(0).toUpperCase() + wd.slice(1);
}

// ----------------------------- J-cycle
function buildJNameIndexForVillage(village){
  const v = village.toUpperCase();
  const map = state.j8[v] || state.j8[&amp;quot;ALL&amp;quot;];
  const out = {};
  if (!map) return out;
  for (let j=1; j<=8; j++){
    const name = map[String(j)];
    if (name) out[normalizeName(name)] = j;
  }
  return out;
}

function computeIndicesFromNamesPerVillage(namesMap){
  const out = {};
  for (const [vill, arr] of Object.entries(namesMap || {})){
    const v = vill.toUpperCase();
    const ref = buildJNameIndexForVillage(v);
    const list = [];
    for (const nm of (arr || [])){
      const norm = normalizeName(nm);
      if (ref[norm]) list.push(ref[norm]);
    }
    out[v] = Array.from(new Set(list));
  }
  return out;
}

function getAnchorForVillage(v){
  return state.j8Anchor[v] || state.j8Anchor[&amp;quot;ALL&amp;quot;];
}

function getJIndexForDate(d, village){
  const anc = getAnchorForVillage(village);
  if (!anc) return null;
  const start = new Date(anc.date + &amp;quot;T00:00:00&amp;quot;);
  const diff = Math.floor((d - start) / 86400000);
  return ((anc.j - 1 + ((diff % 8) + 8) % 8) % 8) + 1;
}

function listContainsJ(map, village, j){
  const arr = map[village] || map[&amp;quot;ALL&amp;quot;] || [];
  return arr.includes(j);
}

// ----------------------------- Résolution
function resolveTraditionalAndTags(d, village){
  const iso = toISO(d);
  const vKey = village.toUpperCase();

  let rec = state.dataMap.get(makeKey(iso, vKey));
  if (!rec) rec = state.dataMap.get(makeKey(iso, &amp;quot;ALL&amp;quot;));

  const jIdx = getJIndexForDate(d, vKey);

  const isMarket    = jIdx &amp;&amp; listContainsJ(state.marketFromJ, vKey, jIdx);
  const isForbidden = jIdx &amp;&amp; listContainsJ(state.forbiddenFromJ, vKey, jIdx);

  let trad = rec?.trad;
  if (!trad &amp;&amp; state.j8[vKey]){
    const name = state.j8[vKey][String(jIdx)];
    if (name) trad = name;
  }
  if (!trad) trad = &amp;quot;Trad · Général&amp;quot;;

  return { trad, isMarket, isForbidden };
}

// ----------------------------- Données
function cvUpdateData(entries){
  for (const e of entries){
    const vKey = (e.village || &amp;quot;ALL&amp;quot;).toUpperCase();
    const k = makeKey(e.dateISO, vKey);
    const prev = state.dataMap.get(k) || { trad:&amp;quot;&amp;quot;, tags:new Set() };
    const tags = new Set(prev.tags);
    (e.tags || []).forEach(t => tags.add(String(t)));
    state.dataMap.set(k, { trad: e.trad || prev.trad || &amp;quot;&amp;quot;, tags });
  }
}

// ----------------------------- JSON Loader
async function loadDataJSON(){
  try {
    const res = await fetch(&amp;quot;./data.v3.json?v="+ Date.now(), { cache: &amp;quot;no-store"});
    if (!res.ok) return;
    const data = await res.json();

    state.j8       = data.traditional_days_8      || {};
    state.j8Anchor = data.traditional_days_anchor || {};
    state.tmonths  = data.traditional_months      || {};

    state.forbiddenNames = data.forbidden_names || {};
    state.marketNames    = data.market_names    || {};

    state.forbiddenFromJ = computeIndicesFromNamesPerVillage(state.forbiddenNames);
    state.marketFromJ    = computeIndicesFromNamesPerVillage(state.marketNames);

    if (data.entries) cvUpdateData(data.entries);

    state.roi    = data.roi        || '—';
    state.motif  = data.extra_info || '—';
    state.marche = (data.market_info || []);

  } catch(e){
    console.error(&amp;quot;Erreur JSON&amp;quot;, e);
  }
}

// ----------------------------- Watermark
function watermarkForVillage(v){
  return String(v || &amp;quot;ALL&amp;quot;).toUpperCase();
}

// ----------------------------- Rendu
function renderNineColumns(){
  const root = document.getElementById(&amp;quot;calendar-9cols&amp;quot;);
  if (!root) return;
  root.innerHTML = &amp;quot;&amp;quot;;

  const months = [
    new Date(state.anchor.getFullYear(), state.anchor.getMonth() - 1, 1),
    new Date(state.anchor.getFullYear(), state.anchor.getMonth(),     1),
    new Date(state.anchor.getFullYear(), state.anchor.getMonth() + 1, 1)
  ];
  const classes = [&amp;quot;mL&amp;quot;,&amp;quot;mC&amp;quot;,&amp;quot;mR&amp;quot;];

  const frag = document.createDocumentFragment();
  months.forEach((start,i) => renderOneMonth(frag, start, state.village, classes[i]));
  root.appendChild(frag);

  syncParamFields();
  renderVillageMeta();
}

function renderOneMonth(root, start, village, place){
  const y = start.getFullYear(), m = start.getMonth();
  const nDays = daysInMonth(y, m);

  const wrap = document.createElement(&amp;quot;div&amp;quot;);
  wrap.className = &amp;quot;month "+ place;
  wrap.setAttribute('data-watermark', watermarkForVillage(village));

  const head = document.createElement(&amp;quot;div&amp;quot;);
  head.className = &amp;quot;month-header&amp;quot;;
  const tradMonth = state.tmonths[village.toUpperCase()]?.[String(m+1)]
                 || state.tmonths[&amp;quot;ALL&amp;quot;]?.[String(m+1)]
                 || &amp;quot;—&amp;quot;;
  head.textContent = monthLabel(y, m) + "— "+ tradMonth;
  wrap.appendChild(head);

  const titles = document.createElement(&amp;quot;div&amp;quot;);
  titles.className = &amp;quot;month-head-row&amp;quot;;
  [&amp;quot;Date&amp;quot;,&amp;quot;Jour grégorien&amp;quot;,&amp;quot;Jour traditionnel&amp;quot;].forEach(t => {
    const d = document.createElement(&amp;quot;div&amp;quot;);
    d.className = &amp;quot;col-title&amp;quot;;
    d.textContent = t;
    titles.appendChild(d);
  });
  wrap.appendChild(titles);

  const frag = document.createDocumentFragment();

  for (let d=1; d<=nDays; d++){
    const cur = new Date(y, m, d);
    const { trad, isMarket, isForbidden } = resolveTraditionalAndTags(cur, village);

    const row = document.createElement(&amp;quot;div&amp;quot;);
    row.className = &amp;quot;row&amp;quot;
      + (isSameDay(cur, today) ? "today": &amp;quot;&amp;quot;)
      + (isMarket ? "market": &amp;quot;&amp;quot;)
      + (isForbidden ? "forbidden": &amp;quot;&amp;quot;);

    if (shouldHideByFilter({ isMarket, isForbidden })) row.classList.add(&amp;quot;filtered-out&amp;quot;);

    const cell1 = document.createElement(&amp;quot;div&amp;quot;);
    cell1.className = &amp;quot;cell date&amp;quot;;
    cell1.textContent = d;

    const cell2 = document.createElement(&amp;quot;div&amp;quot;);
    cell2.className = &amp;quot;cell greg&amp;quot;;
    const wd = fmt.weekdayLong.format(cur).toLowerCase();
    cell2.setAttribute(&amp;quot;data-day&amp;quot;, wd);
    cell2.textContent = wd.charAt(0).toUpperCase() + wd.slice(1);

    const cell3 = document.createElement(&amp;quot;div&amp;quot;);
    cell3.className = &amp;quot;cell trad&amp;quot;;
    cell3.textContent = trad;

    row.appendChild(cell1);
    row.appendChild(cell2);
    row.appendChild(cell3);
    frag.appendChild(row);
  }

  wrap.appendChild(frag);
  root.appendChild(wrap);
}

function renderVillageMeta(){
  document.getElementById(&amp;quot;roi-village&amp;quot;).textContent     = state.roi || &amp;quot;—&amp;quot;;
  document.getElementById(&amp;quot;marche-village&amp;quot;).textContent  = (state.marche || []).join(&amp;quot;, &amp;quot;) || &amp;quot;—&amp;quot;;
  document.getElementById(&amp;quot;motif-village&amp;quot;).textContent   = state.motif || &amp;quot;—&amp;quot;;
}

// ----------------------------- Navigation &amp; paramètres
function shouldHideByFilter(x){
  const f = state.filtre;
  if (f === &amp;quot;market&amp;quot;)   return !x.isMarket;
  if (f === &amp;quot;forbidden&amp;quot;)return !x.isForbidden;
  return false;
}

function wireNav(){
  document.querySelectorAll(&amp;quot;.nav-row [data-action]&amp;quot;).forEach(btn => {
    btn.addEventListener(&amp;quot;click&amp;quot;, () => {
      if (!state || !state.anchor){
        console.error(&amp;quot;wireNav: state.anchor manquant&amp;quot;);
        return;
      }
      if (typeof renderNineColumns !== &amp;quot;function&amp;quot;){
        console.error(&amp;quot;wireNav: renderNineColumns manquant&amp;quot;);
        return;
      }

      const a = btn.dataset.action;
      const anchor = state.anchor;

      if (a === &amp;quot;prev3&amp;quot;)
        state.anchor = new Date(anchor.getFullYear(), anchor.getMonth() - 3, 1);

      if (a === &amp;quot;next3&amp;quot;)
        state.anchor = new Date(anchor.getFullYear(), anchor.getMonth() + 3, 1);

      if (a === &amp;quot;prevY&amp;quot;)
        state.anchor = new Date(anchor.getFullYear() - 1, anchor.getMonth(), 1);

      if (a === &amp;quot;nextY&amp;quot;)
        state.anchor = new Date(anchor.getFullYear() + 1, anchor.getMonth(), 1);

      if (a === &amp;quot;today&amp;quot;) {
        const now = new Date();
        state.anchor = new Date(now.getFullYear(), now.getMonth(), 1);
      }

      renderNineColumns();
      syncParamFields();
    });
  });
}

function wireParams(){
  const y = document.getElementById(&amp;quot;param-annee&amp;quot;);
  const m = document.getElementById(&amp;quot;param-mois&amp;quot;);
  const v = document.getElementById(&amp;quot;param-village&amp;quot;);
  const f = document.getElementById(&amp;quot;param-filtre&amp;quot;);

  if (y &amp;&amp; m){
    const up = () => {
      state.anchor = new Date(+y.value, take(m.value) - 1, 1);
      renderNineColumns();
    };
    y.addEventListener(&amp;quot;change&amp;quot;, up);
    m.addEventListener(&amp;quot;change&amp;quot;, up);
  }

  if (v){
    v.addEventListener(&amp;quot;change&amp;quot;, e => {
      state.village = e.target.value.toUpperCase();
      renderNineColumns();
    });
  }

  if (f){
    f.addEventListener(&amp;quot;change&amp;quot;, e => {
      const raw = e.target.value.toLowerCase();
      state.filtre =
        raw.includes(&amp;quot;inter&amp;quot;) ? &amp;quot;forbidden":
        raw.includes(&amp;quot;march&amp;quot;) ? &amp;quot;market":
        &amp;quot;all&amp;quot;;
      renderNineColumns();
    });
  }
}

function take(x){ return Number(x) || 1; }

function syncParamFields(){
  const y = document.getElementById(&amp;quot;param-annee&amp;quot;);
  const m = document.getElementById(&amp;quot;param-mois&amp;quot;);
  if (y) y.value = state.anchor.getFullYear();
  if (m) m.value = state.anchor.getMonth() + 1;
}

// ----------------------------- Init
if (document.readyState === &amp;quot;loading&amp;quot;){
  document.addEventListener(&amp;quot;DOMContentLoaded&amp;quot;, () => {
    wireNav();
    wireParams();
    loadDataJSON().then(renderNineColumns);
  });
} else {
  wireNav();
  wireParams();
  loadDataJSON().then(renderNineColumns);
}
