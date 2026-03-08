
/* ============================================
   Calendrier du Village — JS de base
   - Nav au-dessus (ligne 1)
   - Paramètres en dessous (ligne 2)
   - Watermark = {VILLAGE} (MAJUSCULES), diagonal, gris, clip
   ============================================ */

(function(){
  // ======= Sélecteurs =======
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

  // ======= État =======
  const now = new Date();
  const state = {
    year: now.getFullYear(),
    month: now.getMonth(),  // 0..11
    village: ($villageSel?.value || 'BALENGOU')
  };

  // ======= Utilitaires =======
  const MONTHS_FR = [
    'janvier','février','mars','avril','mai','juin',
    'juillet','août','septembre','octobre','novembre','décembre'
  ];

  function pad2(n){ return n < 10 ? '0'+n : ''+n; }

  // ======= Watermark =======
  function formatWatermark(village){
    return String(village || '').toUpperCase();
  }

  function updateWatermark(){
    if (!$watermark) return;
    const v = (state.village || '').trim();
    $watermark.textContent = v ? formatWatermark(v) : '';
  }

  // ======= Rendu des 3 mois (exemple simple et propre) =======
  function renderThreeMonths(){
    if (!$monthsWrap) return;

    // Nettoie
    $monthsWrap.innerHTML = '';

    // On dessine le mois courant + 2 suivants
    for (let k=0; k<3; k++){
      const d = new Date(state.year, state.month + k, 1);
      const y = d.getFullYear();
      const m = d.getMonth();

      const $m = document.createElement('div');
      $m.className = 'month';

      const $h = document.createElement('h3');
      // ex. "mars 2026"
      $h.textContent = `${MONTHS_FR[m]} ${y}`;
      $m.appendChild($h);

      // Table simple des jours
      const $table = document.createElement('table');
      $table.style.width = '100%';
      $table.style.borderCollapse = 'collapse';
      $table.style.fontSize = '0.9rem';

      const $thead = document.createElement('thead');
      const $trh = document.createElement('tr');
      ['lu','ma','me','je','ve','sa','di'].forEach(lbl=>{
        const th = document.createElement('th');
        th.textContent = lbl;
        th.style.textAlign = 'center';
        th.style.fontWeight = '600';
        th.style.padding = '4px 0';
        $trh.appendChild(th);
      });
      $thead.appendChild($trh);
      $table.appendChild($thead);

      const $tbody = document.createElement('tbody');

      const firstDay = new Date(y, m, 1);
      const startDow = (firstDay.getDay() + 6) % 7; // Lundi=0,... Dimanche=6
      const daysInMonth = new Date(y, m+1, 0).getDate();

      let day = 1;
      for (let r=0; r<6; r++){
        const tr = document.createElement('tr');
        for (let c=0; c<7; c++){
          const td = document.createElement('td');
          td.style.textAlign = 'center';
          td.style.padding = '4px';
          td.style.borderTop = '1px dashed #eee';

          const cellIndex = r*7 + c;
          if (cellIndex >= startDow && day <= daysInMonth){
            const isToday = (y===now.getFullYear() && m===now.getMonth() && day===now.getDate());
            td.textContent = day;
            if (isToday){
              td.style.fontWeight = '700';
              td.style.color = '#1a73e8';
            }
            day++;
          } else {
            td.textContent = '';
          }
          tr.appendChild(td);
        }
        $tbody.appendChild(tr);
      }

      $table.appendChild($tbody);
      $m.appendChild($table);

      $monthsWrap.appendChild($m);
    }
  }

  // ======= Rendu global =======
  function render(){
    // Synchronise les contrôles si présents
    if ($yearInput)   $yearInput.value = state.year;
    if ($monthSelect) $monthSelect.value = String(state.month);

    renderThreeMonths();   // redessine les 3 mois
    updateWatermark();     // met à jour le watermark
  }

  // ======= Navigation =======
  function shiftMonths(delta){
    const d = new Date(state.year, state.month + delta, 1);
    state.year = d.getFullYear();
    state.month = d.getMonth();
    render();
  }
  function shiftYears(delta){
    state.year += delta;
    render();
  }
  function goToday(){
    const t = new Date();
    state.year = t.getFullYear();
    state.month = t.getMonth();
    render();
  }

  // ======= Initialisation des sélecteurs =======
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
    // Placeholder : remplis selon tes données (mois traditionnels)
    if (!$tradSelect) return;
    $tradSelect.innerHTML = '';
    ['M1','M2','M3','M4','M5','M6','M7','M8','M9','M10','M11','M12'].forEach((lbl,i)=>{
      const opt = document.createElement('option');
      opt.value = String(i);
      opt.textContent = lbl;
      $tradSelect.appendChild(opt);
    });
  }

  // ======= Listeners =======
  function bindEvents(){
    $prevYearBtn && $prevYearBtn.addEventListener('click', ()=> shiftYears(-1));
    $nextYearBtn && $nextYearBtn.addEventListener('click', ()=> shiftYears(+1));
    $prev3Btn    && $prev3Btn.addEventListener('click',   ()=> shiftMonths(-3));
    $next3Btn    && $next3Btn.addEventListener('click',   ()=> shiftMonths(+3));
    $todayBtn    && $todayBtn.addEventListener('click',   goToday);

    $villageSel && $villageSel.addEventListener('change', (e)=>{
      state.village = (e.target.value || '').trim();
      updateWatermark();
    });

    $yearInput && $yearInput.addEventListener('change', (e)=>{
      const v = parseInt(e.target.value, 10);
      if (!isNaN(v)) { state.year = v; render(); }
    });

    $monthSelect && $monthSelect.addEventListener('change', (e)=>{
      const v = parseInt(e.target.value, 10);
      if (!isNaN(v)) { state.month = v; render(); }
    });
  }

  // ======= Démarrage =======
  document.addEventListener('DOMContentLoaded', ()=>{
    // Footer année
    if ($footerYear) $footerYear.textContent = String(new Date().getFullYear());

    // Init contrôles
    if ($villageSel && !$villageSel.value) $villageSel.value = state.village;
    state.village = ($villageSel?.value || state.village);

    if ($yearInput) $yearInput.value = state.year;

    initMonthSelect();
    initTradSelect();

    bindEvents();
    render();
  });
})();
