
// =====================================================
// CALENDRIER DU VILLAGE — VERSION MOBILE SAFE (v3)
// Patch 2026-03-15c : Durcissement debug/UX
//  - logs détaillés sur JSON (URL, CT, statut)
//  - messages #debug sur erreurs/vides
//  - meilleure robustesse de "Village" & rendu
// =====================================================

(function(){
  if (window.__CAL_V3_INITED__) {
    console.warn('[Calendrier] Script déjà initialisé — on ignore ce second chargement.');
    return;
  }
  window.__CAL_V3_INITED__ = true;

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

    /* Infos village */
    roiByVillage: {},
    motifByVillage: {},
    marcheByVillage: {},

    /* J1..J8 + mois traditionnels */
    tmonths: {},
    j8: {},
    j8Anchor: {},

    /* Interdits et marchés */
    forbiddenNames: {},
    marketNames: {},
    forbiddenFromJ: {},
    marketFromJ: {},

    /* Données brutes */
    rowsRaw: null
  };

  // +++ util #debug
  function showDebug(msg) {
    const el = document.getElementById('debug');
    if (el) {
      const time = new Date().toLocaleTimeString('fr-FR');
      el.textContent = `[${time}] ${msg}`;
    }
  }

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
    if (!x) return '';
    if (x instanceof Date && !isNaN(x)) {
      const y = x.getFullYear();
      const m = String(x.getMonth()+1).padStart(2,'0');
      const d = String(x.getDate()).padStart(2,'0');
      return `${y}-${m}-${d}`;
    }
    const s = String(x).trim();
    const m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (m) return `${m[3]}-${m[2].padStart(2,'0')}-${m[1].padStart(2,'0')}`;
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
    const t = new Date(s);
    if (!isNaN(t)) {
      const y = t.getFullYear();
      const mm = String(t.getMonth()+1).padStart(2,'0');
      const d = String(t.getDate()).padStart(2,'0');
      return `${y}-${mm}-${d}`;
    }
    return '';
  }

  // ----------------------------- J-cycle
  function buildJNameIndexForVillage(village){
    const v = String(village || 'ALL').toUpperCase();
    const map = state.j8[v] || state.j8['ALL'];
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
    return state.j8Anchor[key] || state.j8Anchor['ALL'];
  }

  function getJIndexForDate(d, village){
    const anc = getAnchorForVillage(village);
    if (!anc) return null;
    const start = new Date(String(anc.date) + 'T00:00:00');
    const diff = Math.floor((d - start) / 86400000);
    return ((anc.j - 1 + ((diff % 8) + 8) % 8) % 8) + 1;
  }

  function listContainsJ(map, village, j){
    const v = String(village || 'ALL').toUpperCase();
    const arr = map[v] || map['ALL'] || [];
    return Array.isArray(arr) ? arr.includes(j) : false;
  }

  // ----------------------------- Résolution
  function resolveTraditionalAndTags(d, village){
    const iso = toISO(d);
    const vKey = String(village || 'ALL').toUpperCase();

    let rec = state.dataMap.get(makeKey(iso, vKey));
    if (!rec) rec = state.dataMap.get(makeKey(iso, 'ALL'));

    const jIdx = getJIndexForDate(d, vKey);

    const isMarket    = jIdx && listContainsJ(state.marketFromJ, vKey, jIdx);
    const isForbidden = jIdx && listContainsJ(state.forbiddenFromJ, vKey, jIdx);

    let trad = rec?.trad;
    if (!trad && jIdx){
      trad = state.j8[vKey]?.[String(jIdx)] || state.j8.ALL?.[String(jIdx)] || null;
    }
    if (!trad) trad = 'Trad · Général';

    return { trad, isMarket, isForbidden };
  }

  // ----------------------------- Données optionnelles
  function cvUpdateData(entries){
    if (!Array.isArray(entries)) return;
    for (const e of entries){
      const vKey = (e.village || 'ALL').toString().toUpperCase();
      const dateISO = e.dateISO || e.date || e.DateISO;
      if (!dateISO) continue;
      const k = makeKey(dateISO, vKey);
      const prev = state.dataMap.get(k) || { trad:'', tags:new Set() };
      const tags = new Set(prev.tags);
      (e.tags || []).forEach(t => tags.add(String(t)));
      state.dataMap.set(k, { trad: e.trad || prev.trad || '', tags });
    }
  }

  // ----------------------------- Adaptation rows -> canonical
  function adaptRowsToCanonical_FR_withLetters(rows) {
    const canonical = {
      traditional_days_8: {},
      traditional_days_anchor: {},
      traditional_months: {},
      forbidden_names: {},
      market_names: {},
      roi_by_village: {},
      motif_by_village: {},
      marche_by_village: {}
    };

    rows.forEach(r => {
      const vSrc = r['Village'] || r.village || '';
      if (!vSrc) return;
      const vUpper = String(vSrc).trim().toUpperCase();

      // J1..J8
      const jmap = {};
      for (let j = 1; j <= 8; j++){
        const txt = (r[`J${j}`] ?? '').toString().trim();
        if (txt) jmap[String(j)] = txt;
      }
      canonical.traditional_days_8[vUpper] = jmap;

      // M1..M12
      const mmap = {};
      for (let m = 1; m <= 12; m++){
        const txt = (r[`M${m}`] ?? '').toString().trim();
        if (txt) mmap[String(m)] = txt;
      }
      canonical.traditional_months[vUpper] = mmap;

      // Ancre J par village (optionnelle)
      const anchorDateRaw = r['Ancre date'] || r['Anchor Date'] || r['AnchorDate'] || '';
      const anchorJRaw    = r['Ancre J']    || r['Anchor J']    || r['AnchorJ']    || '';
      const dateISO = toISODateFromAny(anchorDateRaw);
      let jStart = parseInt(anchorJRaw, 10);
      if (dateISO && jStart >= 1 && jStart <= 8) {
        canonical.traditional_days_anchor[vUpper] = { date: dateISO, j: jStart };
      }

      // Interdits
      const forb = [];
      for (let k=1; k<=3; k++){
        const txt = (r[`Jour interdit${k}`] ?? '').toString().trim();
        if (txt) forb.push(txt);
      }
      ['V','W','X'].forEach(col => {
        const txt = (r[col] ?? '').toString().trim();
        if (txt) forb.push(txt);
      });
      canonical.forbidden_names[vUpper] = forb;

      // Marchés
      const mark = [];
      for (let k=1; k<=3; k++){
        const txt = (r[`Jour du marché${k}`] ?? '').toString().trim();
        if (txt) mark.push(txt);
      }
      ['Z','AA','AB'].forEach(col => {
        const txt = (r[col] ?? '').toString().trim();
        if (txt) mark.push(txt);
      });
      canonical.market_names[vUpper] = mark;

      // Roi / Infos
      const roi  = (r['Roi du village:'] || r['Roi du village:2'] || '').toString().trim();
      const info = (r['Informations:'] || '').toString().trim();

      canonical.roi_by_village[vUpper] = roi;
      canonical.motif_by_village[vUpper] = info;
      canonical.marche_by_village[vUpper] = mark;
    });

    return canonical;
  }

  // ----------------------------- JSON Loader (robuste + ancre globale)
  async function loadDataJSON(){
    const url = './data.v3.json?v=' + Date.now();
    try {
      console.log('[Calendrier] Chargement JSON depuis', url);
      showDebug('Chargement des données…');

      const res = await fetch(url, { cache:'no-store' });
      console.log('[Calendrier] Statut JSON =', res.status, res.statusText);
      if (!res.ok) throw new Error('HTTP ' + res.status);

      const ct = (res.headers.get('content-type') || '').toLowerCase();
      console.log('[Calendrier] Content-Type =', ct);
      if (!ct.includes('application/json')) {
        const text = await res.text();
        console.error('[data.v3.json] Réponse non JSON. CT=', ct, 'Extrait=', text.slice(0, 200));
        throw new Error('Réponse non JSON depuis data.v3.json (voir console).');
      }

      const raw = await res.json();
      console.log('[Calendrier] JSON reçu (racine type):', Array.isArray(raw) ? 'array' : typeof raw);

      // Cas API "canonique"
      if (raw && raw.traditional_days_8) {
        const dISO = toISODateFromAny(
          raw['AnchorDate (globale)'] || raw['AnchorDate'] || raw['Ancre date globale'] || raw['AnchorDateGlobal'] || ''
        );
        const jStart = parseInt(
          raw['AnchorJ (1..8)'] || raw['AnchorJ'] || raw['Ancre J globale'] || raw['AnchorJGlobal'] || '',
          10
        );
        if (dISO && jStart >= 1 && jStart <= 8) {
          raw.traditional_days_anchor = raw.traditional_days_anchor || {};
          if (!raw.traditional_days_anchor.ALL) {
            raw.traditional_days_anchor.ALL = { date: dISO, j: jStart };
          }
        }
        showDebug('Données chargées (format canonique).');
        return hydrateStateFromCanonical(raw, raw.rows || null);
      }

      // Sinon rows[]
      const rows = Array.isArray(raw?.rows) ? raw.rows :
                   (Array.isArray(raw) ? raw : null);

      if (Array.isArray(rows)) {
        const canonical = adaptRowsToCanonical_FR_withLetters(rows);

        // Lire l'ancre globale
        const dISO = toISODateFromAny(
          raw?.['AnchorDate (globale)'] || raw?.['AnchorDate'] || raw?.['Ancre date globale'] || raw?.['AnchorDateGlobal'] || ''
        );
        const jStart = parseInt(
          raw?.['AnchorJ (1..8)'] || raw?.['AnchorJ'] || raw?.['Ancre J globale'] || raw?.['AnchorJGlobal'] || '',
          10
        );
        if (dISO && jStart >= 1 && jStart <= 8) {
          canonical.traditional_days_anchor = canonical.traditional_days_anchor || {};
          canonical.traditional_days_anchor.ALL = { date: dISO, j: jStart };
        }

        showDebug('Données chargées (format rows[]).');
        return hydrateStateFromCanonical(canonical, rows);
      }

      throw new Error('Format data.v3.json invalide (ni canonique, ni rows[]).');

    } catch (e) {
      console.error('Erreur JSON', e);
      showDebug('❌ data.v3.json : ' + e.message + '\nVérifie le chemin, le Content-Type et le format JSON.');
      return null;
    }
  }

  // ----------------------------- Injection dans state
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

    // Fallback d'ancre — garantit un calcul J1..J8
    if (!state.j8Anchor || !state.j8Anchor.ALL) {
      const keys = Object.keys(state.j8Anchor || {}).filter(k => k !== 'ALL');
      if (keys.length) {
        state.j8Anchor.ALL = { ...state.j8Anchor[keys[0]] };
      } else {
        state.j8Anchor.ALL = { date: '2026-01-01', j: 1 };
      }
    }

    return data;
  }

  // ----------------------------- Watermark auto-fit
  function fitWatermarks(){
    const measurer = document.createElement('span');
    measurer.style.cssText = [
      'position:absolute','visibility:hidden','white-space:nowrap',
      'font-weight:700','letter-spacing:.08em',
      'font-size:36px','line-height:1',
      'font-family: system-ui, -apple-system, Segoe UI, Roboto, Arial, Noto Sans, sans-serif'
    ].join(';');
    document.body.appendChild(measurer);

    document.querySelectorAll('.month').forEach(card => {
      const text = card.getAttribute('data-watermark') || '';
      measurer.textContent = text;

      const textWidth = measurer.getBoundingClientRect().width;
      const cardH = card.clientHeight * 0.90; // 10% de marge

      const scale = textWidth > 0 ? Math.min(1, cardH / textWidth) : 1;
      card.style.setProperty('--wm-scale', String(scale));
    });

    document.body.removeChild(measurer);
  }

  /* ----------------------------- Rendu des 3 mois */
  function renderNineColumns(){
    const root = document.getElementById('calendar-9cols');
    if (!root) { showDebug('❌ Élément #calendar-9cols introuvable.'); return; }
    root.innerHTML = '';

    // +++ garde-fou : données minimales ?
    const hasAnyVillage = Object.keys(state.j8 || {}).length > 0 ||
                          Object.keys(state.tmonths || {}).length > 0 ||
                          Array.isArray(state.rowsRaw);
    if (!hasAnyVillage) {
      showDebug('⚠️ Aucune donnée de village détectée. Vérifie data.v3.json.');
    }

    const months = [
      new Date(state.anchor.getFullYear(), state.anchor.getMonth() - 1, 1),
      new Date(state.anchor.getFullYear(), state.anchor.getMonth(),     1),
      new Date(state.anchor.getFullYear(), state.anchor.getMonth() + 1, 1)
    ];
    const classes = ['mL','mC','mR'];

    const frag = document.createDocumentFragment();
    months.forEach((start,i) => renderOneMonth(frag, start, state.village, classes[i]));
    root.appendChild(frag);

    syncParamFields();
    renderVillageMeta();

    // Ajuster les watermarks APRÈS rendu
    fitWatermarks();
  }

  /* ----------------------------- BLOC INFOS DU VILLAGE */
  function renderVillageMeta(){
    const vKey = String(state.village || 'ALL').toUpperCase();

    const elRoi       = document.getElementById('roi-village');
    const elInterdits = document.getElementById('interdits-village');
    const elMarche    = document.getElementById('marche-village');
    const elInfos     = document.getElementById('motif-village');
    const blocInfos   = document.getElementById('bloc-infos-final');

    if (!blocInfos) return;

    if (vKey === 'ALL') {
      blocInfos.style.display = 'none';
      if (elRoi)       elRoi.textContent       = '—';
      if (elInterdits) elInterdits.textContent = '—';
      if (elMarche)    elMarche.textContent    = '—';
      if (elInfos)     elInfos.textContent     = '—';
      return;
    }

    blocInfos.style.display = '';

    if (elRoi)       elRoi.textContent       = state.roiByVillage?.[vKey]    || '—';
    if (elInterdits) elInterdits.textContent = (state.forbiddenNames?.[vKey] || []).join(' • ') || '—';
    if (elMarche)    elMarche.textContent    = (state.marcheByVillage?.[vKey] || []).join(' • ') || '—';
    if (elInfos)     elInfos.textContent     = state.motifByVillage?.[vKey]  || '—';
  }

  /* ----------------------------- Rendu d'un mois */
  function renderOneMonth(root, start, village, place){
    const y = start.getFullYear(), m = start.getMonth();
    const nDays = daysInMonth(y, m);

    const wrap = document.createElement('div');
    wrap.className = 'month ' + place;

    // Watermark dynamique (utilisé par le CSS ::before)
    wrap.setAttribute('data-watermark', String(village || '').toUpperCase());

    const head = document.createElement('div');
    head.className = 'month-header';
    const tradMonth =
      state.tmonths[String(village || '').toUpperCase()]?.[String(m+1)] ||
      state.tmonths['ALL']?.[String(m+1)] || '—';
    head.textContent = monthLabel(y, m) + ' — ' + tradMonth;
    wrap.appendChild(head);

    const titles = document.createElement('div');
    titles.className = 'month-head-row';
    ['Date','Jour grégorien','Jour traditionnel'].forEach(t => {
      const d = document.createElement('div');
      d.className = 'col-title';
      d.textContent = t;
      titles.appendChild(d);
    });
    wrap.appendChild(titles);

    const frag = document.createDocumentFragment();

    for (let d=1; d<=nDays; d++){
      const cur = new Date(y, m, d);
      const { trad, isMarket, isForbidden } = resolveTraditionalAndTags(cur, village);

      const row = document.createElement('div');
      row.className =
        'row' +
        (isSameDay(cur, today) ? ' today' : '') +
        (isMarket ? ' market' : '') +
        (isForbidden ? ' forbidden' : '');

      if (shouldHideByFilter({ isMarket, isForbidden })) {
        row.classList.add('filtered-out');
      }

      const cell1 = document.createElement('div');
      cell1.className = 'cell date';
      cell1.textContent = String(d);

      const cell2 = document.createElement('div');
      cell2.className = 'cell greg';
      const wd = fmt.weekdayLong.format(cur).toLowerCase();
      cell2.setAttribute('data-day', wd);
      cell2.textContent = wd.charAt(0).toUpperCase() + wd.slice(1);

      // Cellule "Jour traditionnel"
      const cell3 = document.createElement('div');
      cell3.className = 'cell trad';

      const label = document.createElement('span');
      label.className = 'trad-label';
      label.textContent = trad;

      const icons = document.createElement('span');
      icons.className = 'trad-icons';
      if (isMarket) {
        const mI = document.createElement('span');
        mI.className = 'ico ico-market';
        mI.title = 'Jour de marché';
        mI.setAttribute('aria-label', 'Jour de marché');
        icons.appendChild(mI);
      }
      if (isForbidden) {
        const fI = document.createElement('span');
        fI.className = 'ico ico-forbidden';
        fI.title = 'Jour interdit';
        fI.setAttribute('aria-label', 'Jour interdit');
        icons.appendChild(fI);
      }

      cell3.appendChild(label);
      cell3.appendChild(icons);

      row.appendChild(cell1);
      row.appendChild(cell2);
      row.appendChild(cell3);
      frag.appendChild(row);
    }

    wrap.appendChild(frag);
    root.appendChild(wrap);
  }

  /* ----------------------------- Filtre */
  function shouldHideByFilter(x){
    const f = state.filtre;
    if (f === 'market')    return !x.isMarket;
    if (f === 'forbidden') return !x.isForbidden;
    return false;
  }

  /* ----------------------------- Village select */
  function remplirListeVillagesDepuisData(data) {
    const sel = document.getElementById('param-village');
    if (!sel) { console.warn('⚠️ #param-village introuvable'); return; }

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
    console.log('[Calendrier] Villages détectés =', list.length, list);

    const frag = document.createDocumentFragment();
    list.forEach(vUpper => {
      const opt = document.createElement('option');
      opt.value = vUpper;
      opt.textContent = vUpper;
      frag.appendChild(opt);
    });
    sel.appendChild(frag);

    if (!list.includes(state.village)) {
      state.village = 'ALL';
    }
    sel.value = state.village;

    if (!list.length) {
      showDebug('⚠️ Aucun village détecté dans data.v3.json. Vérifie les colonnes (Village, J1..J8, M1..M12…).');
    }
  }

  /* ----------------------------- Navigation */
  function wireNav(){
    document.querySelectorAll('.nav-row [data-action]').forEach(btn => {
      btn.addEventListener('click', () => {
        const a = btn.dataset.action;

        if (a === 'prev3')
          state.anchor = new Date(state.anchor.getFullYear(), state.anchor.getMonth() - 3, 1);
        if (a === 'next3')
          state.anchor = new Date(state.anchor.getFullYear(), state.anchor.getMonth() + 3, 1);
        if (a === 'prevY')
          state.anchor = new Date(state.anchor.getFullYear() - 1, state.anchor.getMonth(), 1);
        if (a === 'nextY')
          state.anchor = new Date(state.anchor.getFullYear() + 1, state.anchor.getMonth(), 1);
        if (a === 'today') {
          const now = new Date();
          state.anchor = new Date(now.getFullYear(), now.getMonth(), 1);
        }

        renderNineColumns();
      });
    });
  }

  /* ----------------------------- Paramètres */
  function wireParams(){
    const y = document.getElementById('param-annee');
    const m = document.getElementById('param-mois');
    const v = document.getElementById('param-village');
    const f = document.getElementById('param-filtre');

    if (y && m){
      const up = () => {
        state.anchor = new Date(+y.value, Number(m.value) - 1, 1);
        renderNineColumns();
        renderVillageMeta();
      };
      y.addEventListener('change', up);
      m.addEventListener('change', up);
    }

    if (v){
      v.addEventListener('change', e => {
        const next = String(e.target.value || 'ALL').toUpperCase();

        if (next === 'ALL') {
          state.village = 'ALL';
          state.filtre  = 'all';

          const now = new Date();
          state.anchor = new Date(now.getFullYear(), now.getMonth(), 1);

          const fSel = document.getElementById('param-filtre');
          if (fSel) fSel.value = 'Tous';

          const url = new URL(location.href);
          url.searchParams.delete('village');
          history.replaceState(null, '', url.toString());

          renderNineColumns();
          return;
        }

        state.village = next;

        const url = new URL(location.href);
        url.searchParams.set('village', next);
        history.replaceState(null, '', url.toString());

        renderNineColumns();
      });
    }

    if (f){
      f.addEventListener('change', e => {
        const raw = String(e.target.value || '').toLowerCase();
        state.filtre =
          raw.includes('inter') ? 'forbidden' :
          raw.includes('march') ? 'market' :
          'all';
        renderNineColumns();
        renderVillageMeta();
      });
    }
  }

  /* ----------------------------- Sync champ Année + Mois */
  function syncParamFields(){
    const y = document.getElementById('param-annee');
    const m = document.getElementById('param-mois');
    if (y) y.value = state.anchor.getFullYear();
    if (m) m.value = state.anchor.getMonth() + 1;
  }

  /* ----------------------------- INIT FINAL */
  document.addEventListener('DOMContentLoaded', async () => {
    try {
      console.log('[Calendrier] app.v3.js chargé ✓', new Date().toISOString());

      wireNav();
      wireParams();

      const qs = new URLSearchParams(location.search);
      const fromUrl = qs.get('village');
      if (fromUrl) state.village = String(fromUrl).toUpperCase();

      const data = await loadDataJSON();
      remplirListeVillagesDepuisData(data || {});

      renderNineColumns();
      renderVillageMeta();

      // Recalibrer après chargement des polices (si disponibles)
      if (document.fonts && document.fonts.ready) {
        document.fonts.ready.then(() => fitWatermarks());
      }

      // Recalibrer sur resize (debounce)
      let __wm_t;
      window.addEventListener('resize', () => {
        clearTimeout(__wm_t);
        __wm_t = setTimeout(fitWatermarks, 150);
      });

      // +++ si l'URL contient ?village=XXX, on force l’update UI
      if (fromUrl) {
        const vSel = document.getElementById('param-village');
        if (vSel) vSel.value = state.village;
        renderNineColumns();
      }

    } catch (e) {
      console.error('[Init] Erreur pendant l\'init:', e);
      showDebug('❌ Erreur pendant l’init : ' + e.message);
    }
  });
})();
