(function(){
  // =======================
  // Sélecteurs
  // =======================
  const $watermark   = document.getElementById('watermark');
  const $monthsWrap  = document.getElementById('monthsWrap');

  const $villageSel  = document.getElementById('villageSelect');
  const $yearInput   = document.getElementById('yearInput');
  const $monthSelect = document.getElementById('monthSelect');
  const $tradSelect  = document.getElementById('tradSelect');

  const $prevYearBtn = document.getElementById('prevYearBtn');
  const $prev3Btn    = document.getElementById('prev3Btn');
  const $todayBtn    = document.getElementById('todayBtn');
  const $next3Btn    = document.getElementById('next3Btn');
  const $nextYearBtn = document.getElementById('nextYearBtn');

  const $footerYear  = document.getElementById('year');

  // =======================
  // État
  // =======================
  const now = new Date();
  const state = {
    year: now.getFullYear(),
    month: now.getMonth(),                // 0..11 (mois central = m)
    village: ($villageSel?.value || 'BALENGOU')
  };

  // =======================
  // Constantes utilitaires
  // =======================
  const MONTHS_FR = [
    'janvier','février','mars','avril','mai','juin',
    'juillet','août','septembre','octobre','novembre','décembre'
  ];
  const WEEKDAYS = ['Lundi','Mardi','Mercredi','Jeudi','Vendredi','Samedi','Dimanche'];
  const weekdayName = d => WEEKDAYS[(d.getDay() + 6) % 7]; // 0=Dim..6=Sam -> Lundi..Dimanche

  // Cycle 8 (placeholder) — remplace par les vrais noms quand tu me les donnes
  const TRAD8 = ['T1','T2','T3','T4','T5','T6','T7','T8'];

  // =======================
  // Watermark
  // =======================
  function formatWatermark(village){ return String(village || '').toUpperCase(); }
  function updateWatermark(){
    if (!$watermark) return;
    const v = (state.village || '').trim();
    $watermark.textContent = v ? formatWatermark(v) : '';
  }

  // =======================
  // MTrad → Grégorien (adapter si nécessaire)
  // =======================
  // Par défaut: M1..M12 → Jan..Déc (0..11)
  const MTRAD_TO_GREG = { 0:0,1:1,2:2,3:3,4:4,5:5,6:6,7:7,8:8,9:9,10:10,11:11 };

  // =======================
  // Coloration par village (placeholder)
  // =======================
  // Donne-moi tes vraies règles et je remplace ces valeurs.
  const VILLAGE_RULES = {
    'BALENGOU': {
      forbiddenTradIdx: [1,4,6], // T2, T5, T7 (indices 0..7)
      marketTradIdx:    [2],     // T3
      // marketWeekday: 6,       // (option) Samedi = marché (0=Dim..6=Sam)
    },
    // 'BANDA': {...}, 'N’DJAM': {...}, etc.
  };

  function applyRowColoring(tr, ctx){
    const vName = String(state.village || '').toUpperCase();
    const rules = VILLAGE_RULES[vName];
    if (!rules) return;

    const { tradIndex, dow } = ctx;

    if (Array.isArray(rules.forbiddenTradIdx) && rules.forbiddenTradIdx.includes(tradIndex)){
      tr.classList.add('row--forbidden');
    }
    if (Array.isArray(rules.marketTradIdx) && rules.marketTradIdx.includes(tradIndex)){
      tr.classList.add('row--market');
    }
    if (typeof rules.marketWeekday === 'number' && rules.marketWeekday === dow){
      tr.classList.add('row--market');
    }
  }


// ====== CHARGEMENT DYNAMIQUE DE LA CONFIG ======

// (1) Déclarations "vivantes" pilotables par le JSON
let TRAD8 = ['T1','T2','T3','T4','T5','T6','T7','T8'];  // sera remplacé si _meta.tradNames est fourni
let VILLAGE_RULES = {};                                  // sera rempli depuis le JSON

// (2) Petites aides de parsing
const WEEKDAY_FR_TO_IDX = {
  'dimanche': 0, 'lundi': 1, 'mardi': 2, 'mercredi': 3,
  'jeudi': 4, 'vendredi': 5, 'samedi': 6
};
function toWeekdayIndex(v) {
  if (v === null || v === undefined) return undefined;
  if (typeof v === 'number' && v >= 0 && v <= 6) return v;
  const s = String(v).trim().toLowerCase();
  return WEEKDAY_FR_TO_IDX.hasOwnProperty(s) ? WEEKDAY_FR_TO_IDX[s] : undefined;
}
function toIntArray(val){
  // "1,4,6"  ou  [1,4,6]  -> [1,4,6]
  if (Array.isArray(val)) return val.map(n => Number(n)).filter(n => Number.isFinite(n));
  if (val === null || val === undefined) return [];
  return String(val).split(',').map(x => Number(x.trim())).filter(n => Number.isFinite(n));
}

// (3) Appliquer le JSON dans nos structures JS
function hydrateFromConfig(cfg){
  if (!cfg || typeof cfg !== 'object') return;

  // Option globale des noms du cycle 8 (dans une clé spéciale _meta.tradNames)
  if (cfg._meta && Array.isArray(cfg._meta.tradNames) && cfg._meta.tradNames.length === 8) {
    TRAD8 = cfg._meta.tradNames.map(s => String(s));
  }

  // Règles par village (clés = noms de villages)
  // Format attendu pour chaque village (ce que ta macro JSON produit déjà) :
  // {
  //   "BALENGOU": {
  //      "chief":"...", "marketDay":6 ou "samedi",
  //      "forbiddenTradIdx":[1,4,6], "marketTradIdx":[2], "moreInfos":"..."
  //   },
  //   "BANDA": {...}
  // }
  const out = {};
  Object.keys(cfg).forEach(key => {
    if (key === '_meta') return; // ignore la section meta
    const entry = cfg[key] || {};
    const villageName = String(key).toUpperCase();

    const forbidden = toIntArray(entry.forbiddenTradIdx);
    const marketIdx = toIntArray(entry.marketTradIdx);      // facultatif dans ton JSON exporté
    const weekday   = toWeekdayIndex(entry.marketDay);      // accepte 0..6 ou "samedi"

    out[villageName] = {
      forbiddenTradIdx: forbidden,
      marketTradIdx: marketIdx,          // si vide -> ignoré
      marketWeekday: weekday             // si undefined -> ignoré
    };
  });

  VILLAGE_RULES = out;
}

// (4) Charger le JSON (avec anti-cache)
async function loadVillageConfig(){
  const url = './data/village-config.json?ts=' + Date.now();
  const res = await fetch(url);
  if (!res.ok) {
    console.warn('Config villages non trouvée :', res.status);
    return;
  }
  const cfg = await res.json();
  hydrateFromConfig(cfg);
}

  
  // =======================
  // Rendu 3 mois : m-1 | m | m+1
  //  -> vue "Excel" : une ligne = un jour (Date | Jour | Trad.)
  // =======================
  function renderThreeMonths(){
    if (!$monthsWrap) return;
    $monthsWrap.innerHTML = '';

    // Départ = m-1
    const start = new Date(state.year, state.month - 1, 1);

    for (let k=0; k<3; k++){
      const d0 = new Date(start.getFullYear(), start.getMonth() + k, 1);
      const y  = d0.getFullYear();
      const m  = d0.getMonth();

      // Carte mois
      const $card = document.createElement('div');
      $card.className = 'month';

      // En-tête simple
      const $h = document.createElement('h3');
      $h.textContent = `${MONTHS_FR[m]} ${y}`;
      $card.appendChild($h);

      // Tableau Excel
      const $table = document.createElement('table');
      $table.className = 'month__table'; // la classe est stylée via CSS ci-dessous


// juste après: const $table = document.createElement('table');
$table.className = 'month__table';

// === colonne fixes : Date | Jour | Trad. ===
const colgroup = document.createElement('colgroup');
const colDate = document.createElement('col'); colDate.className = 'col-date';
const colJour = document.createElement('col'); // auto
const colTrad = document.createElement('col'); colTrad.className = 'col-trad';
colgroup.appendChild(colDate);
colgroup.appendChild(colJour);
colgroup.appendChild(colTrad);
$table.appendChild(colgroup);

      
      // THEAD
      const $thead = document.createElement('thead');
      const $trh = document.createElement('tr');
      ['Date','Jour','Trad.'].forEach((lbl, idx) => {
        const th = document.createElement('th');
        th.textContent = lbl;
        if (idx === 1) th.style.width = '38%';   // Jour
        if (idx === 2) th.style.width = '22%';   // Trad.
        $trh.appendChild(th);
      });
      $thead.appendChild($trh);
      $table.appendChild($thead);

      // TBODY
      const $tbody = document.createElement('tbody');
      const daysInMonth = new Date(y, m+1, 0).getDate();

      for (let day=1; day<=daysInMonth; day++){
        const d  = new Date(y, m, day);
        const dow = d.getDay(); // 0=Dim..6=Sam
        const tr = document.createElement('tr');

        // Col 1 : Date (n°)
        const tdDate = document.createElement('td');
        tdDate.textContent = String(day);
        const isToday = (y===now.getFullYear() && m===now.getMonth() && day===now.getDate());
        if (isToday) tdDate.classList.add('is-today');
        tr.appendChild(tdDate);

        // Col 2 : Jour
        const tdJour = document.createElement('td');
        tdJour.textContent = weekdayName(d);
        if (dow === 6) tdJour.classList.add('is-sat');
        if (dow === 0) tdJour.classList.add('is-sun');
        tr.appendChild(tdJour);

        // Col 3 : Trad. (cycle 8 — placeholder)
        const tdTrad = document.createElement('td');
        const tradIndex = (day - 1) % 8;
        tdTrad.textContent = TRAD8[tradIndex];
        tr.appendChild(tdTrad);

        // Coloration selon règles village
        applyRowColoring(tr, { y, m, day, tradIndex, dow });

        $tbody.appendChild(tr);
      }

      $table.appendChild($tbody);
      $card.appendChild($table);
      $monthsWrap.appendChild($card);
    }
  }

  // =======================
  // Rendu global & navigation
  // =======================
  function render(){
    if ($yearInput)   $yearInput.value = state.year;
    if ($monthSelect) $monthSelect.value = String(state.month);
    renderThreeMonths();
    updateWatermark();
  }
  function shiftMonths(delta){
    const d = new Date(state.year, state.month + delta, 1);
    state.year  = d.getFullYear();
    state.month = d.getMonth();
    render();
  }
  function shiftYears(delta){ state.year += delta; render(); }
  function goToday(){
    const t = new Date();
    state.year  = t.getFullYear();
    state.month = t.getMonth();
    render();
  }

  // =======================
  // Inits selects
  // =======================
  function initMonthSelect(){
    if (!$monthSelect) return;
    $monthSelect.innerHTML = '';
    MONTHS_FR.forEach((name, i) => {
      const opt = document.createElement('option');
      opt.value = String(i);
      opt.textContent = name[0].toUpperCase() + name.slice(1);
      $monthSelect.appendChild(opt);
    });
    $monthSelect.value = String(state.month);
  }
  function initTradSelect(){
    if (!$tradSelect) return;
    $tradSelect.innerHTML = '';
    // Placeholder M1..M12 (adapter labels si besoin)
    for (let i=0; i<12; i++){
      const opt = document.createElement('option');
      opt.value = String(i);
      opt.textContent = 'M' + (i+1);
      $tradSelect.appendChild(opt);
    }
  }

  // =======================
  // Changement MTrad / Mois → recentrer sur m (mois central)
  // =======================
  function onTradChange(idx){
    const n = Number(idx);
    if (!Number.isFinite(n)) return;
    const greg = MTRAD_TO_GREG[n] ?? state.month;
    state.month = greg;         // m devient le mois choisi
    render();
  }
  function onMonthChange(idx){
    const n = Number(idx);
    if (!Number.isFinite(n)) return;
    state.month = n;            // m devient le mois choisi
    render();
  }

  // =======================
  // Bind events
  // =======================
  function bindEvents(){
    // Nav
    $prevYearBtn && $prevYearBtn.addEventListener('click', ()=> shiftYears(-1));
    $nextYearBtn && $nextYearBtn.addEventListener('click', ()=> shiftYears(+1));
    $prev3Btn    && $prev3Btn.addEventListener('click',   ()=> shiftMonths(-3));
    $next3Btn    && $next3Btn.addEventListener('click',   ()=> shiftMonths(+3));
    $todayBtn    && $todayBtn.addEventListener('click',   goToday);

    // Paramètres
    $villageSel  && $villageSel.addEventListener('change', e => { state.village = (e.target.value || '').trim(); updateWatermark(); });
    $yearInput   && $yearInput.addEventListener('change', e => { const v = parseInt(e.target.value, 10); if (!isNaN(v)) { state.year = v; render(); } });
    $monthSelect && $monthSelect.addEventListener('change', e => onMonthChange(e.target.value));
    $tradSelect  && $tradSelect.addEventListener('change', e => onTradChange(e.target.value));
  }

  // =======================
  // Démarrage
  // =======================
  document.addEventListener('DOMContentLoaded', async () => {
  if ($footerYear) $footerYear.textContent = String(new Date().getFullYear());
  if ($villageSel && !$villageSel.value) $villageSel.value = state.village;
  state.village = ($villageSel?.value || state.village);

  // 1) Charger la configuration JSON AVANT d'initialiser/rendre
  try { await loadVillageConfig(); } catch(e){ console.warn(e); }

  // 2) Init UI + événements
  initMonthSelect();
  initTradSelect();
  bindEvents();

  // 3) Premier rendu (utilisera TRAD8 + VILLAGE_RULES issus du JSON)
  render();
});
