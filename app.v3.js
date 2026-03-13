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
function isSameDay(a,b){ return a.getFullYear()===b.getFullYear() && a.getMonth()===b.getMonth() && a.getDate()===b.getDate(); }
function monthLabel(y,m){ return fmt.monthYear.format(new Date(y,m,1)); }
function formatDayLabel(d){
  const wd = fmt.weekdayLong.format(d);
  return wd.charAt(0).toUpperCase() + wd.slice(1);
}

// ----------------------------- J-cycle
function buildJNameIndexForVillage(village){
  const v = village.toUpperCase();
  const map = state.j8[v] || state.j8["ALL"];
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
  return state.j8Anchor[v] || state.j8Anchor["ALL"];
}

function getJIndexForDate(d, village){
  const anc = getAnchorForVillage(village);
  if (!anc) return null;
  const start = new Date(anc.date + "T00:00:00");
  const diff = Math.floor((d - start) / 86400000);
  return ((anc.j - 1 + ((diff % 8) + 8) % 8) % 8) + 1;
}

function listContainsJ(map, village, j){
  const arr = map[village] || map["ALL"] || [];
  return arr.includes(j);
}

// ----------------------------- Résolution
function resolveTraditionalAndTags(d, village){
  const iso = toISO(d);
  const vKey = village.toUpperCase();

  let rec = state.dataMap.get(makeKey(iso, vKey));
  if (!rec) rec = state.dataMap.get(makeKey(iso, "ALL"));

  const jIdx = getJIndexForDate(d, vKey);

  const isMarket    = jIdx && listContainsJ(state.marketFromJ, vKey, jIdx);
  const isForbidden = jIdx && listContainsJ(state.forbiddenFromJ, vKey, jIdx);

  let trad = rec?.trad;
  if (!trad && state.j8[vKey]){
    const name = state.j8[vKey][String(jIdx)];
    if (name) trad = name;
  }
  if (!trad) trad = "Trad · Général";

  return { trad, isMarket, isForbidden };
}

// ----------------------------- Données
function cvUpdateData(entries){
  for (const e of entries){
    const vKey = (e.village || "ALL").toUpperCase();
    const k = makeKey(e.dateISO, vKey);
    const prev = state.dataMap.get(k) || { trad:'', tags:new Set() };
    const tags = new Set(prev.tags);
    (e.tags || []).forEach(t => tags.add(String(t)));
    state.dataMap.set(k, { trad: e.trad || prev.trad || '', tags });
  }
}

// ----------------------------- JSON Loader
async function loadDataJSON(){
  try {
    const res = await fetch("./data.v3.json?v=" + Date.now(), { cache: "no-store" });
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
    console.error("Erreur JSON", e);
  }
}

// ----------------------------- Rendu
function renderNineColumns(){
  const root = document.getElementById("calendar-9cols");
  if (!root) return;
  root.innerHTML = "";

  const months = [
    new Date(state.anchor.getFullYear(), state.anchor.getMonth() - 1, 1),
    new Date(state.anchor.getFullYear(), state.anchor.getMonth(),     1),
    new Date(state.anchor.getFullYear(), state.anchor.getMonth() + 1, 1)
  ];
  const classes = ["mL","mC","mR"];

  const frag = document.createDocumentFragment();
  months.forEach((start,i) => renderOneMonth(frag, start, state.village, classes[i]));
  root.appendChild(frag);

  syncParamFields();
  renderVillageMeta();
}

function renderOneMonth(root, start, village, place){
  const y = start.getFullYear(), m = start.getMonth();
  const nDays = daysInMonth(y, m);

  const wrap = document.createElement("div");
  wrap.className = "month " + place;
  wrap.setAttribute('data-watermark', village.toUpperCase());

  const head = document.createElement("div");
  head.className = "month-header";
  const tradMonth = state.tmonths[village.toUpperCase()]?.[String(m+1)]
                 || state.tmonths["ALL"]?.[String(m+1)]
                 || "—";
  head.textContent = monthLabel(y, m) + " — " + tradMonth;
  wrap.appendChild(head);

  const titles = document.createElement("div");
  titles.className = "month-head-row";
  ["Date","Jour grégorien","Jour traditionnel"].forEach(t => {
    const d = document.createElement("div");
    d.className = "col-title";
    d.textContent = t;
    titles.appendChild(d);
  });
  wrap.appendChild(titles);

  const frag = document.createDocumentFragment();

  for (let d=1; d<=nDays; d++){
    const cur = new Date(y, m, d);
    const { trad, isMarket, isForbidden } = resolveTraditionalAndTags(cur, village);

    const row = document.createElement("div");
    row.className = "row"
      + (isSameDay(cur, today) ? " today" : "")
      + (isMarket ? " market" : "")
      + (isForbidden ? " forbidden" : "");

    if (shouldHideByFilter({ isMarket, isForbidden })) row.classList.add("filtered-out");

    const cell1 = document.createElement("div");
    cell1.className = "cell date";
    cell1.textContent = d;

    const cell2 = document.createElement("div");
    cell2.className = "cell greg";
    const wd = fmt.weekdayLong.format(cur).toLowerCase(); // "lundi"…"dimanche"
    cell2.setAttribute("data-day", wd);
    cell2.textContent = wd.charAt(0).toUpperCase() + wd.slice(1);

    const cell3 = document.createElement("div");
    cell3.className = "cell trad";
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
  document.getElementById("roi-village").textContent     = state.roi || "—";
  document.getElementById("marche-village").textContent  = (state.marche || []).join(", ") || "—";
  document.getElementById("motif-village").textContent   = state.motif || "—";
}

// ----------------------------- Navigation & paramètres
function shouldHideByFilter(x){
  const f = state.filtre;
  if (f === "market")   return !x.isMarket;
  if (f === "forbidden")return !x.isForbidden;
  return false;
}

// ----------------------------- Villages : remplissage du select
function remplirListeVillages(rows) {
  const sel = document.getElementById("param-village");
  if (!sel) return;

  sel.innerHTML = '<option value="ALL">Tous</option>';

  const uniques = new Set();

  rows.forEach(r => {
    const v = (r.Village || "").trim();
    if (v && !uniques.has(v.toUpperCase())) {
      uniques.add(v.toUpperCase());
      const opt = document.createElement("option");
      opt.value = v.toUpperCase();
      opt.textContent = v;
      sel.appendChild(opt);
    }
  });
}

function wireNav(){
  document.querySelectorAll(".nav-row [data-action]").forEach(btn => {
    btn.addEventListener("click", () => {
      if (!state || !state.anchor){
        console.error("wireNav: state.anchor manquant");
        return;
      }
      if (typeof renderNineColumns !== "function"){
        console.error("wireNav: renderNineColumns manquant");
        return;
      }

      const a = btn.dataset.action;
      const anchor = state.anchor;

      if (a === "prev3")
        state.anchor = new Date(anchor.getFullYear(), anchor.getMonth() - 3, 1);

      if (a === "next3")
        state.anchor = new Date(anchor.getFullYear(), anchor.getMonth() + 3, 1);

      if (a === "prevY")
        state.anchor = new Date(anchor.getFullYear() - 1, anchor.getMonth(), 1);

      if (a === "nextY")
        state.anchor = new Date(anchor.getFullYear() + 1, anchor.getMonth(), 1);

      if (a === "today") {
        const now = new Date();
        state.anchor = new Date(now.getFullYear(), now.getMonth(), 1);
      }

      renderNineColumns();
      syncParamFields();
    });
  });
}

function wireParams(){
  const y = document.getElementById("param-annee");
  const m = document.getElementById("param-mois");
  const v = document.getElementById("param-village");
  const f = document.getElementById("param-filtre");

  if (y && m){
    const up = () => {
      state.anchor = new Date(+y.value, take(m.value) - 1, 1);
      renderNineColumns();
    };
    y.addEventListener("change", up);
    m.addEventListener("change", up);
  }

  if (v){
    v.addEventListener("change", e => {
      state.village = e.target.value.toUpperCase();
      renderNineColumns();
    });
  }

  if (f){
    f.addEventListener("change", e => {
      const raw = e.target.value.toLowerCase();
      state.filtre =
        raw.includes("inter") ? "forbidden" :
        raw.includes("march") ? "market" :
        "all";
      renderNineColumns();
    });
  }
}

function take(x){ return Number(x) || 1; }

function syncParamFields(){
  const y = document.getElementById("param-annee");
  const m = document.getElementById("param-mois");
  if (y) y.value = state.anchor.getFullYear();
  if (m) m.value = state.anchor.getMonth() + 1;
}

// ----------------------------- Init unifiée
document.addEventListener("DOMContentLoaded", async () => {
  try {
    wireNav();
    wireParams();

    // Chargement unique du JSON (peuple state.*)
    const data = await loadDataJSON(); // peut retourner null si échec

    // Remplit la liste des villages après le chargement
    remplirListeVillagesDepuisData(data || {});

    // Premier rendu
    renderNineColumns();
  } catch (e) {
    console.error("[Init] Erreur pendant l'init:", e);
  }
});
