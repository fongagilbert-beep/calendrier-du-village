 // =====================================================
// CALENDRIER DU VILLAGE — VERSION MOBILE SAFE (v3)
// Loader rows + ancre globale + M1..M12 + J1..J8 + V/W/X & Z/AA/AB
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

  roiByVillage: {},
  motifByVillage: {},
  marcheByVillage: {},

  tmonths: {},
  j8: {},
  j8Anchor: {},

  forbiddenNames: {},
  marketNames: {},

  forbiddenFromJ: {},
  marketFromJ: {},

  rowsRaw: null
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

function toISODateFromAny(x) {
  if (!x) return "";
  if (x instanceof Date && !isNaN(x)) {
    const y = x.getFullYear();
    const m = String(x.getMonth()+1).padStart(2,'0');
    const d = String(x.getDate()).padStart(2,'0');
    return `${y}-${m}-${d}`;
  }
  const s = String(x).trim();
  const m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/); // dd/MM/yyyy
  if (m) return `${m[3]}-${m[2].padStart(2,'0')}-${m[1].padStart(2,'0')}`;
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  const t = new Date(s);
  if (!isNaN(t)) {
    const y = t.getFullYear();
    const mm = String(t.getMonth()+1).padStart(2,'0');
    const d = String(t.getDate()).padStart(2,'0');
    return `${y}-${mm}-${d}`;
  }
  return "";
}

// ----------------------------- J-cycle
function buildJNameIndexForVillage(village){
  const v = String(village || 'ALL').toUpperCase();
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
    const v = String(vill || 'ALL').toUpperCase();
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
  const key = String(v || 'ALL').toUpperCase();
  return state.j8Anchor[key] || state.j8Anchor["ALL"];
}
function getJIndexForDate(d, village){
  const anc = getAnchorForVillage(village);
  if (!anc) return null;
  const start = new Date(String(anc.date) + "T00:00:00");
  const diff = Math.floor((d - start) / 86400000);
  return ((anc.j - 1 + ((diff % 8) + 8) % 8) % 8) + 1;
}
function listContainsJ(map, village, j){
  const v = String(village || 'ALL').toUpperCase();
  const arr = map[v] || map["ALL"] || [];
  return Array.isArray(arr) ? arr.includes(j) : false;
}

// ----------------------------- Résolution
function resolveTraditionalAndTags(d, village){
  const iso = toISO(d);
  const vKey = String(village || 'ALL').toUpperCase();

  let rec = state.dataMap.get(makeKey(iso, vKey));
  if (!rec) rec = state.dataMap.get(makeKey(iso, "ALL"));

  const jIdx = getJIndexForDate(d, vKey);

  const isMarket    = jIdx && listContainsJ(state.marketFromJ, vKey, jIdx);
  const isForbidden = jIdx && listContainsJ(state.forbiddenFromJ, vKey, jIdx);

  let trad = rec?.trad;
  if (!trad && jIdx){
    trad = state.j8[vKey]?.[String(jIdx)] || state.j8.ALL?.[String(jIdx)] || null;
  }
  if (!trad) trad = "Trad · Général";

  return { trad, isMarket, isForbidden };
}

// ----------------------------- Données (optionnel)
function cvUpdateData(entries){
  if (!Array.isArray(entries)) return;
  for (const e of entries){
    const vKey = (e.village || "ALL").toString().toUpperCase();
    const dateISO = e.dateISO || e.date || e.DateISO;
    if (!dateISO) continue;
    const k = makeKey(dateISO, vKey);
    const prev = state.dataMap.get(k) || { trad:'', tags:new Set() };
    const tags = new Set(prev.tags);
    (e.tags || []).forEach(t => tags.add(String(t)));
    state.dataMap.set(k, { trad: e.trad || prev.trad || '', tags });
  }
}

// ----------------------------- Adaptateur rows → structure canonique
function adaptRowsToCanonical_FR_withLetters(rows) {
  const canonical = {
    traditional_days_8: {},
    traditional_days_anchor: {},
    traditional_months: {},
    forbidden_names: {},
    market_names: {},
    entries: [],
    roi: '—',
    extra_info: '—',
    market_info: [],
    roi_by_village: {},
    motif_by_village: {},
    marche_by_village: {}
  };

  let globalRoiSet = false, globalInfoSet = false, globalMarcheSet = false;

  rows.forEach(r => {
    const vSrc = r["Village"] || r.village || "";
    if (!vSrc) return;
    const vUpper = String(vSrc).trim().toUpperCase();

    // J1..J8
    const jmap = {};
    for (let j = 1; j <= 8; j++) {
      const val = r[`J${j}`];
      const txt = (val == null ? "" : String(val)).trim();
      if (txt) jmap[String(j)] = txt;
    }
    if (Object.keys(jmap).length > 0) canonical.traditional_days_8[vUpper] = jmap;

    // M1..M12
    const mMap = {};
    for (let m = 1; m <= 12; m++) {
      const val = r[`M${m}`];
      const txt = (val == null ? "" : String(val)).trim();
      if (txt) mMap[String(m)] = txt;
    }
    if (Object.keys(mMap).length > 0) canonical.traditional_months[vUpper] = mMap;

    // Interdits : FR d’abord, sinon V/W/X
    const forb = [];
    for (let k=1; k<=3; k++){
      const val = r[`Jour interdit${k}`];
      const txt = (val == null ? "" : String(val)).trim();
      if (txt) forb.push(txt);
    }
    if (forb.length === 0) ["V","W","X"].forEach(col => {
      const v = (r[col] == null ? "" : String(r[col])).trim();
      if (v) forb.push(v);
    });
    if (forb.length > 0) canonical.forbidden_names[vUpper] = forb;

    // Marché : FR d’abord, sinon Z/AA/AB
    const mark = [];
    for (let k=1; k<=3; k++){
      const val = r[`Jour du marché${k}`];
      const txt = (val == null ? "" : String(val)).trim();
      if (txt) mark.push(txt);
    }
    if (mark.length === 0) ["Z","AA","AB"].forEach(col => {
      const v = (r[col] == null ? "" : String(r[col])).trim();
      if (v) mark.push(v);
    });
    if (mark.length > 0) {
      canonical.market_names[vUpper] = mark;
      canonical.marche_by_village[vUpper] = mark.slice();
      if (!globalMarcheSet) { canonical.market_info = mark.slice(); globalMarcheSet = true; }
    }

    // Méta village
    const roi  = (r["Roi du village:2"] || r["Roi du village:"] || "").toString().trim();
    const info = (r["Informations:"] || "").toString().trim();
    if (roi)  { canonical.roi_by_village[vUpper] = roi;  if (!globalRoiSet)  { canonical.roi = roi;   globalRoiSet  = true; } }
    if (info) { canonical.motif_by_village[vUpper] = info; if (!globalInfoSet) { canonical.extra_info = info; globalInfoSet = true; } }
  });

  if (!canonical.forbidden_names["ALL"]) canonical.forbidden_names["ALL"] = [];
  if (!canonical.market_names["ALL"])    canonical.market_names["ALL"]    = [];

  console.log("[ADAPT] Villages (J8):", Object.keys(canonical.traditional_days_8));
  console.log("[ADAPT] Villages (Mois):", Object.keys(canonical.traditional_months));
  return canonical;
}

// ----------------------------- JSON Loader
async function loadDataJSON(){
  const url = "./data.v3.json?v=" + Date.now();
  try {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) {
      console.error("Chargement des données échoué:", res.status, res.statusText, "URL:", url);
      return null;
    }
    const raw = await res.json();

    // Canonique ?
    if (raw && (raw.traditional_days_8 || raw.traditional_days_anchor || raw.traditional_months)) {
      let ad = raw["AnchorDate (globale)"] ?? raw.AnchorDate;
      let aj = raw["AnchorJ (1..8)"]      ?? raw.AnchorJ;
      if (ad && aj && (!raw.traditional_days_anchor || !raw.traditional_days_anchor.ALL)) {
        const iso = toISODateFromAny(ad);
        const j = Number(aj);
        raw.traditional_days_anchor = raw.traditional_days_anchor || {};
        if (iso && j >= 1 && j <= 8) {
          raw.traditional_days_anchor.ALL = { date: iso, j };
        }
      }
      return hydrateStateFromCanonical(raw, null);
    }

    // Table rows
    const rows = Array.isArray(raw?.rows)
      ? raw.rows
      : (Array.isArray(raw) ? raw : null);

    if (Array.isArray(rows)) {
      const canonical = adaptRowsToCanonical_FR_withLetters(rows);

      let ad = raw["AnchorDate (globale)"] ?? raw.AnchorDate;
      let aj = raw["AnchorJ (1..8)"]      ?? raw.AnchorJ;
      if (!ad && rows[0]) ad = rows[0]["AnchorDate (globale)"] ?? rows[0].AnchorDate;
      if (!aj && rows[0]) aj = rows[0]["AnchorJ (1..8)"]      ?? rows[0].AnchorJ;

      if (ad && aj) {
        const iso = toISODateFromAny(ad);
        const j = Number(aj);
        if (iso && j >= 1 && j <= 8) {
          canonical.traditional_days_anchor.ALL = { date: iso, j };
        }
      }

      return hydrateStateFromCanonical(canonical, rows);
    }

    console.warn("[DATA] Structure inconnue (ni canonique, ni rows).");
    return null;

  } catch(e){
    console.error("Erreur JSON", e);
    return null;
  }
}

// Hydrate 'state'
function hydrateStateFromCanonical(data, rowsRaw) {
  state.j8       = data.traditional_days_8      || {};
  state.j8Anchor = data.traditional_days_anchor || {};
  state.tmonths  = data.traditional_months      || {};

  state.forbiddenNames = data.forbidden_names || {};
  state.marketNames    = data.market_names    || {};

  state.roiByVillage    = data.roi_by_village    || {};
  state.motifByVillage  = data.motif_by_village  || {};
  state.marcheByVillage = data.marche_by_village || {};

  state.rowsRaw = Array.isArray(rowsRaw) ? rowsRaw : null;

  state.forbiddenFromJ = computeIndicesFromNamesPerVillage(state.forbiddenNames);
  state.marketFromJ    = computeIndicesFromNamesPerVillage(state.marketNames);

  if (data.entries) cvUpdateData(data.entries);

  state.roi    = data.roi        || '—';
  state.motif  = data.extra_info || '—';
  state.marche = data.market_info || [];

  return data;
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
  wrap.setAttribute('data-watermark', String(village || '').toUpperCase());

  const head = document.createElement("div");
  head.className = "month-header";
  const tradMonth = state.tmonths[String(village || '').toUpperCase()]?.[String(m+1)]
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
    cell1.textContent = String(d);

    const cell2 = document.createElement("div");
    cell2.className = "cell greg";
    const wd = fmt.weekdayLong.format(cur).toLowerCase();
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

//
// ⭐⭐⭐ VERSION CORRIGÉE DE renderVillageMeta() ⭐⭐⭐
//
function renderVillageMeta(){
  const vKey = String(state.village || 'ALL').toUpperCase();

  const elRoi       = document.getElementById("roi-village");
  const elMarche    = document.getElementById("marche-village");
  const elMotif     = document.getElementById("motif-village");
  const elInterdits = document.getElementById("interdits-village");
  const blocInfos   = document.getElementById("bloc-infos-final");

  // CAS ALL → on masque
  if (vKey === 'ALL') {
    if (elRoi)       elRoi.textContent = '—';
    if (elMarche)    elMarche.textContent = '—';
    if (elMotif)     elMotif.textContent = '—';
    if (elInterdits) elInterdits.textContent = '—';
    if (blocInfos)   blocInfos.style.display = 'none';
    return;
  }

  // CAS VILLAGE
  if (blocInfos) blocInfos.style.display = '';

  const roi        = state.roiByVillage[vKey]    || "—";
  const marcheArr  = state.marcheByVillage[vKey] || [];
  const motif      = state.motifByVillage[vKey]  || "—";

  if (elRoi)       elRoi.textContent = roi;
  if (elMarche)    elMarche.textContent = marcheArr.join(", ") || "—";
  if (elMotif)     elMotif.textContent = motif;
  if (elInterdits) elInterdits.textContent = 
      (state.forbiddenNames[vKey] || []).join(" • ") || "—";
}

// ----------------------------- Navigation & paramètres
function shouldHideByFilter(x){
  const f = state.filtre;
  if (f === "market")    return !x.isMarket;
  if (f === "forbidden") return !x.isForbidden;
  return false;
}

// ----------------------------- Villages : remplissage du select
function remplirListeVillagesDepuisData(data) {
  const sel = document.getElementById("param-village");
  if (!sel) {
    console.error("[Village] <select id='param-village'> introuvable");
    return;
  }

  sel.innerHTML = '<option value="ALL">Tous</option>';

  const uniques = new Set();

  if (Array.isArray(state.rowsRaw)) {
    state.rowsRaw.forEach(r => {
      const raw = (r.Village || r.village || '').toString().trim();
      if (raw) uniques.add(raw.toUpperCase());
    });
  }

  [state.j8, state.j8Anchor, state.tmonths, state.forbiddenNames, state.marketNames]
    .forEach(obj => {
      Object.keys(obj || {}).forEach(k => {
        const v = String(k || '').trim().toUpperCase();
        if (v && v !== 'ALL') uniques.add(v);
      });
    });

  const list = Array.from(uniques).sort();

  const frag = document.createDocumentFragment();
  list.forEach(vUpper => {
    const opt = document.createElement("option");
    opt.value = vUpper;
    opt.textContent = vUpper;
    frag.appendChild(opt);
  });
  sel.appendChild(frag);

  if (!list.includes(state.village)) {
    state.village = "ALL";
    sel.value = "ALL";
  }
}

function wireNav(){
  document.querySelectorAll(".nav-row [data-action]").forEach(btn => {
    btn.addEventListener("click", () => {
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
      state.anchor = new Date(+y.value, Number(m.value) - 1, 1);
      renderNineColumns();
    };
    y.addEventListener("change", up);
    m.addEventListener("change", up);
  }

  if (v){
    v.addEventListener("change", e => {
      state.village = e.target.value.toUpperCase();
      renderNineColumns();
      renderVillageMeta();
    });
  }

  if (f){
    f.addEventListener("change", e => {
      const raw = String(e.target.value || '').toLowerCase();
      state.filtre =
        raw.includes("inter") ? "forbidden" :
        raw.includes("march") ? "market" :
        "all";
      renderNineColumns();
    });
  }
}

function syncParamFields(){
  const y = document.getElementById("param-annee");
  const m = document.getElementById("param-mois");
  if (y) y.value = String(state.anchor.getFullYear());
  if (m) m.value = String(state.anchor.getMonth() + 1);
}

// ----------------------------- Init
document.addEventListener("DOMContentLoaded", async () => {
  try {
    wireNav();
    wireParams();

    const data = await loadDataJSON();
    remplirListeVillagesDepuisData(data || {});

    renderNineColumns();
  } catch (e) {
    console.error("[Init] Erreur pendant l'init:", e);
  }
});
