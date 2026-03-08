(function(){
  // Sélecteurs
  const $watermark=document.getElementById('watermark');
  const $monthsWrap=document.getElementById('monthsWrap');
  const $villageSel=document.getElementById('villageSelect');
  const $yearInput=document.getElementById('yearInput');
  const $monthSelect=document.getElementById('monthSelect');
  const $tradSelect=document.getElementById('tradSelect');
  const $prevYearBtn=document.getElementById('prevYearBtn');
  const $prev3Btn=document.getElementById('prev3Btn');
  const $todayBtn=document.getElementById('todayBtn');
  const $next3Btn=document.getElementById('next3Btn');
  const $nextYearBtn=document.getElementById('nextYearBtn');
  const $footerYear=document.getElementById('year');

  // État
  const now=new Date();
  const state={year:now.getFullYear(),month:now.getMonth(),village:($villageSel?.value||'BALENGOU')};

  // Constantes
  const MONTHS_FR=['janvier','février','mars','avril','mai','juin','juillet','août','septembre','octobre','novembre','décembre'];

  // Watermark
  function formatWatermark(v){return String(v||'').toUpperCase()}
  function updateWatermark(){ if(!$watermark) return; const v=(state.village||'').trim(); $watermark.textContent=v?formatWatermark(v):''; }

  // Rendu 3 mois : m-1 | m | m+1 (vue simple)
  function renderThreeMonths(){
    if(!$monthsWrap) return; $monthsWrap.innerHTML='';
    const start=new Date(state.year,state.month-1,1);
    for(let k=0;k<3;k++){
      const d=new Date(start.getFullYear(),start.getMonth()+k,1);
      const y=d.getFullYear(); const m=d.getMonth();

      const $m=document.createElement('div'); $m.className='month';
      const $h=document.createElement('h3'); $h.textContent=`${MONTHS_FR[m]} ${y}`; $m.appendChild($h);

      const $table=document.createElement('table');
      const $thead=document.createElement('thead'); const $trh=document.createElement('tr');
      ;['lu','ma','me','je','ve','sa','di'].forEach(lbl=>{const th=document.createElement('th'); th.textContent=lbl; $trh.appendChild(th)});
      $thead.appendChild($trh); $table.appendChild($thead);

      const $tbody=document.createElement('tbody');
      const firstDay=new Date(y,m,1); const startDow=(firstDay.getDay()+6)%7; const daysInMonth=new Date(y,m+1,0).getDate();
      let day=1; for(let r=0;r<6;r++){
        const tr=document.createElement('tr');
        for(let c=0;c<7;c++){
          const td=document.createElement('td');
          const cellIndex=r*7+c;
          if(cellIndex>=startDow && day<=daysInMonth){
            const isToday=(y===now.getFullYear()&&m===now.getMonth()&&day===now.getDate());
            td.textContent=day; if(isToday){ td.style.fontWeight='700'; td.style.color='#1a73e8'; }
            day++;
          } else { td.textContent=''; }
          tr.appendChild(td);
        }
        $tbody.appendChild(tr);
      }
      $table.appendChild($tbody); $m.appendChild($table); $monthsWrap.appendChild($m);
    }
  }

  function render(){ if($yearInput)$yearInput.value=state.year; if($monthSelect)$monthSelect.value=String(state.month); renderThreeMonths(); updateWatermark(); }
  function shiftMonths(d){ const dd=new Date(state.year,state.month+d,1); state.year=dd.getFullYear(); state.month=dd.getMonth(); render(); }
  function shiftYears(d){ state.year+=d; render(); }
  function goToday(){ const t=new Date(); state.year=t.getFullYear(); state.month=t.getMonth(); render(); }

  function initMonthSelect(){ if(!$monthSelect)return; $monthSelect.innerHTML=''; MONTHS_FR.forEach((name,i)=>{const opt=document.createElement('option'); opt.value=String(i); opt.textContent=name[0].toUpperCase()+name.slice(1); $monthSelect.appendChild(opt);}); $monthSelect.value=String(state.month); }
  function initTradSelect(){ if(!$tradSelect)return; $tradSelect.innerHTML=''; for(let i=0;i<12;i++){ const opt=document.createElement('option'); opt.value=String(i); opt.textContent='M'+(i+1); $tradSelect.appendChild(opt);} }

  function bindEvents(){
    $prevYearBtn&&$prevYearBtn.addEventListener('click',()=>shiftYears(-1));
    $nextYearBtn&&$nextYearBtn.addEventListener('click',()=>shiftYears(+1));
    $prev3Btn&&$prev3Btn.addEventListener('click',()=>shiftMonths(-3));
    $next3Btn&&$next3Btn.addEventListener('click',()=>shiftMonths(+3));
    $todayBtn&&$todayBtn.addEventListener('click',goToday);
    $villageSel&&$villageSel.addEventListener('change',e=>{state.village=(e.target.value||'').trim(); updateWatermark();});
    $yearInput&&$yearInput.addEventListener('change',e=>{const v=parseInt(e.target.value,10); if(!isNaN(v)){ state.year=v; render(); }});
    $monthSelect&&$monthSelect.addEventListener('change',e=>{const n=Number(e.target.value); if(Number.isFinite(n)){ state.month=n; render(); }});
    $tradSelect&&$tradSelect.addEventListener('change',()=>{/* à brancher plus tard si nécessaire */});
  }

  document.addEventListener('DOMContentLoaded',()=>{
    if($footerYear)$footerYear.textContent=String(new Date().getFullYear());
    if($villageSel&&!$villageSel.value)$villageSel.value=state.village; state.village=($villageSel?.value||state.village);
    if($yearInput)$yearInput.value=state.year;
    initMonthSelect(); initTradSelect(); bindEvents(); render();
  });
})();
