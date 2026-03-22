
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

  roi: '\u2014',
  motif: '\u2014',
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
    .replace(/['ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢`Ãƒâ€šÃ‚Â´]/g, '')
    .trim();
}
function toISO(d){
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}
function pickFirst(row, keys){
  for (const key of keys){
    if (row && row[key] != null && row[key] !== "") return row[key];
  }
  return "";
}
function utcDayNumberFromDate(d){
  return Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / 86400000;
}
function utcDayNumberFromISO(iso){
  const m = String(iso || '').match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return NaN;
  return Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])) / 86400000;
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
function candidateDayNames(rawName){
  const raw = String(rawName || '').trim();
  if (!raw) return [];
  const parts = raw
    .split(/[=:;,]/)
    .map(x => normalizeName(x))
    .filter(Boolean);
  const base = normalizeName(raw);
  return Array.from(new Set([base, ...parts]));
}
function computeIndicesFromNamesPerVillage(namesMap){
  const out = {};
  for (const [vill, arr] of Object.entries(namesMap || {})){
    const v = String(vill || 'ALL').toUpperCase();
    const ref = buildJNameIndexForVillage(v);
    const list = [];
    for (const nm of (arr || [])){
      for (const candidate of candidateDayNames(nm)){
        if (ref[candidate]) {
          list.push(ref[candidate]);
          break;
        }
      }
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
  const startDay = utcDayNumberFromISO(anc.date);
  const currentDay = utcDayNumberFromDate(d);
  if (!Number.isFinite(startDay) || !Number.isFinite(currentDay)) return null;
  const diff = currentDay - startDay;
  return ((anc.j - 1 + ((diff % 8) + 8) % 8) % 8) + 1; // 1..8
}
function listContainsJ(map, village, j){
  const v = String(village || 'ALL').toUpperCase();
  const arr = map[v] || map["ALL"] || [];
  return Array.isArray(arr) ? arr.includes(j) : false;
}

// ----------------------------- Resolution
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
  if (!trad) trad = "Trad \u00B7 G\u00E9n\u00E9ral";

  return { trad, isMarket, isForbidden };
}

// ----------------------------- DonnÃƒÆ’Ã‚Â©es (optionnel)
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

// ----------------------------- Adaptateur rows -> structure canonique
function adaptRowsToCanonical_FR_withLetters(rows) {
  const canonical = {
    traditional_days_8: {},
    traditional_days_anchor: {},
    traditional_months: {},
    forbidden_names: {},
    market_names: {},
    entries: [],
    roi: '\u2014',
    extra_info: '\u2014',
    market_info: [],
    roi_by_village: {},
    motif_by_village: {},
    marche_by_village: {}
  };

  let globalRoiSet = false, globalInfoSet = false, globalMarcheSet = false;

  rows.forEach(r => {
    const vSrc = pickFirst(r, ["Village", "VILLAGE", "village"]);
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

    // Interdits : FR dÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢abord, sinon V/W/X
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

    // Marche : FR d'abord, sinon Z/AA/AB
    const mark = [];
    for (let k=1; k<=3; k++){
      const val = pickFirst(r, [
        `Jour du march\u00E9${k}`,
        `Jour du marche${k}`,
        `Jour du marchÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â©${k}`
      ]);
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

    // MÃƒÆ’Ã‚Â©ta village
    const roi  = pickFirst(r, ["Roi du village:2", "Roi du village:", "Roi du village"]).toString().trim();
    const info = pickFirst(r, ["Informations:", "Informations"]).toString().trim();
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
  const url = "./data.v3.json?v=" + Date.now(); // source principale (export Excel rows)
  try {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) {
      console.error("Chargement des donn\u00E9es \u00E9chou\u00E9:", res.status, res.statusText, "URL:", url);
      return null;
    }
    const raw = await res.json();

    // Optionnel : charger un fichier canonique supplementaire (si present) et fusionner.
    // Utile quand data.v3.json (rows) n'embarque pas les interdits/marches mais qu'un autre export existe.
    async function tryLoadSupplementCanonical() {
      const supUrl = encodeURI("./data.v3 (2).json?v=" + Date.now());
      try {
        const r = await fetch(supUrl, { cache: "no-store" });
        if (!r.ok) return null;
        const j = await r.json();
        if (j && (j.traditional_days_8 || j.traditional_days_anchor || j.traditional_months || j.forbidden_names || j.market_names)) {
          return j;
        }
        return null;
      } catch {
        return null;
      }
    }

    function mergeCanonicalBaseWithSupplement(base, sup) {
      if (!sup) return base;
      const out = base;
      const mergeObj = (k) => {
        out[k] = out[k] || {};
        const src = sup[k] || {};
        for (const [kk, vv] of Object.entries(src)) {
          if (out[k][kk] == null) out[k][kk] = vv;
        }
      };
      const mergeArrObj = (k) => {
        out[k] = out[k] || {};
        const src = sup[k] || {};
        for (const [kk, vv] of Object.entries(src)) {
          if (out[k][kk] == null) out[k][kk] = Array.isArray(vv) ? vv.slice() : vv;
          else if (Array.isArray(out[k][kk]) && Array.isArray(vv) && out[k][kk].length === 0 && vv.length > 0) out[k][kk] = vv.slice();
        }
      };

      // J8 / mois / ancres
      mergeObj("traditional_days_8");
      mergeObj("traditional_months");
      mergeObj("traditional_days_anchor");

      // Interdits / marchÃƒÆ’Ã‚Â©s / mÃƒÆ’Ã‚Â©ta
      mergeArrObj("forbidden_names");
      mergeArrObj("market_names");
      mergeObj("roi_by_village");
      mergeObj("motif_by_village");
      mergeArrObj("marche_by_village");

      // Champs globaux si absents
      if ((out.roi == null || out.roi === "ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â") && sup.roi) out.roi = sup.roi;
      if ((out.extra_info == null || out.extra_info === "ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â") && sup.extra_info) out.extra_info = sup.extra_info;
      if ((!Array.isArray(out.market_info) || out.market_info.length === 0) && Array.isArray(sup.market_info) && sup.market_info.length > 0) {
        out.market_info = sup.market_info.slice();
      }
      return out;
    }

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
          console.log("[DATA] Ancre globale injectÃƒÆ’Ã‚Â©e (canonique):", raw.traditional_days_anchor.ALL);
        }
      }
      const sup = await tryLoadSupplementCanonical();
      const merged = mergeCanonicalBaseWithSupplement(raw, sup);
      return hydrateStateFromCanonical(merged, null);
    }

    // Table rows
    const rows = Array.isArray(raw?.rows) ? raw.rows : (Array.isArray(raw) ? raw : null);
    if (Array.isArray(rows)) {
      const canonical = adaptRowsToCanonical_FR_withLetters(rows);

      // Ancre globale au racine ou dans rows[0]
      let ad = raw["AnchorDate (globale)"] ?? raw.AnchorDate;
      let aj = raw["AnchorJ (1..8)"]      ?? raw.AnchorJ;
      if (!ad && rows[0]) ad = rows[0]["AnchorDate (globale)"] ?? rows[0].AnchorDate;
      if (!aj && rows[0]) aj = rows[0]["AnchorJ (1..8)"]      ?? rows[0].AnchorJ;

      if (ad && aj) {
        const iso = toISODateFromAny(ad);
        const j = Number(aj);
        if (iso && j >= 1 && j <= 8) {
          canonical.traditional_days_anchor.ALL = { date: iso, j };
          console.log("[DATA] Ancre globale injectÃƒÆ’Ã‚Â©e (rows):", canonical.traditional_days_anchor.ALL);
        } else {
          console.warn("[DATA] Ancre globale dÃƒÆ’Ã‚Â©tectÃƒÆ’Ã‚Â©e mais invalide :", ad, aj);
        }
      }

      const sup = await tryLoadSupplementCanonical();
      const merged = mergeCanonicalBaseWithSupplement(canonical, sup);
      return hydrateStateFromCanonical(merged, rows);
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

  state.roi    = data.roi        || '\u2014';
  state.motif  = data.extra_info || '\u2014';
  state.marche = (data.market_info || []);

  console.log("[DATA] j8 villages:", Object.keys(state.j8 || {}));
  console.log("[DATA] anchors villages:", Object.keys(state.j8Anchor || {}));
  console.log("[DATA] months villages:", Object.keys(state.tmonths || {}));
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
                 || "\u2014";
  head.textContent = monthLabel(y, m) + " \u2014 " + tradMonth;
  wrap.appendChild(head);

  const titles = document.createElement("div");
  titles.className = "month-head-row";
  ["Date","Jour gr\u00E9gorien","Jour traditionnel"].forEach(t => {
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

function renderVillageMeta(){
  const vKey = String(state.village || 'ALL').toUpperCase();

  const elRoi       = document.getElementById("roi-village");
  const elMarche    = document.getElementById("marche-village");
  const elMotif     = document.getElementById("motif-village");
  const elInterdits = document.getElementById("interdits-village");

  if (vKey === 'ALL') {
    if (elRoi)       elRoi.textContent       = '\u2014';
    if (elMarche)    elMarche.textContent    = '\u2014';
    if (elMotif)     elMotif.textContent     = '\u2014';
    if (elInterdits) elInterdits.textContent = '\u2014';
    return;
  }

  const roi = (state.roiByVillage && state.roiByVillage[vKey]) || '';
  const marcheArr = (state.marcheByVillage && state.marcheByVillage[vKey]) || [];
  const motif = (state.motifByVillage && state.motifByVillage[vKey]) || '';
  const interditsArr = (state.forbiddenNames && state.forbiddenNames[vKey]) || [];

  if (elRoi) elRoi.textContent = roi || '\u2014';
  if (elMarche) elMarche.textContent = (marcheArr || []).join(' \u2022 ') || '\u2014';
  if (elMotif) elMotif.textContent = motif || '\u2014';
  if (elInterdits) elInterdits.textContent = (interditsArr || []).join(' \u2022 ') || '\u2014';
}

// ----------------------------- Navigation & parametres
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
      const raw = pickFirst(r, ["Village", "VILLAGE", "village"]).toString().trim();
      if (raw) uniques.add(raw.toUpperCase());
    });
  }

  [state.j8, state.j8Anchor, state.tmonths, state.forbiddenNames, state.marketNames].forEach(obj => {
    Object.keys(obj || {}).forEach(k => {
      const v = String(k || '').trim().toUpperCase();
      if (v && v !== 'ALL') uniques.add(v);
    });
  });

  const list = Array.from(uniques).sort();
  if (list.length === 0) console.warn("[Village] Aucun village d\u00E9tect\u00E9.");

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

  console.info(`[Village] Villages dÃƒÆ’Ã‚Â©tectÃƒÆ’Ã‚Â©s: ${list.length}`, list);
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

// ----------------------------- Animations UI (scroll reveal, sans masquer le contenu)
function setupScrollRevealAnimations(){
  const selectors = [
    ".official-index",
    ".site-header",
    ".nav-row",
    ".params",
    "#calendar-9cols",
    ".bloc-infos-final",
    ".month"
  ];
  const els = Array.from(document.querySelectorAll(selectors.join(",")));
  if (!els.length) return;

  // Marqueurs CSS (ne cachent rien, servent juste ÃƒÆ’Ã‚Â  l'animation)
  els.forEach(el => el.classList.add("af-reveal"));

  if (!("IntersectionObserver" in window)) {
    els.forEach(el => el.classList.add("is-visible"));
    return;
  }

  const io = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (entry.isIntersecting) {
        entry.target.classList.add("is-visible");
        io.unobserve(entry.target);
      }
    }
  }, { threshold: 0.12, rootMargin: "40px 0px -10px 0px" });

  els.forEach(el => io.observe(el));
}

// ----------------------------- Init
document.addEventListener("DOMContentLoaded", async () => {
  try {
    wireNav();
    wireParams();
    setupScrollRevealAnimations();

    const data = await loadDataJSON();
    remplirListeVillagesDepuisData(data || {});
    renderNineColumns();
  } catch (e) {
    console.error("[Init] Erreur pendant l'init:", e);
  }
});
