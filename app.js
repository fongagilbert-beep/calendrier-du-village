
let DATA = null;

async function loadData(){
  const res = await fetch('data.json');
  if(!res.ok) throw new Error('Impossible de charger data.json');
  DATA = await res.json();
}

function toDateOnly(d){ const z = new Date(d); return new Date(z.getFullYear(), z.getMonth(), z.getDate()); }
function daysBetween(d1,d2){ const ms=24*60*60*1000; return Math.round((toDateOnly(d1)-toDateOnly(d2))/ms); }
function getCycleDayNumber(date){
  const refDate = new Date(DATA.reference.gregorian_date+'T00:00:00');
  const refN = DATA.reference.cycle_day;
  const delta = daysBetween(date, refDate);
  const offset = (refN-1+delta) % 8;
  return ((offset+8)%8)+1;
}
function getCycleDayName(n){ const item = DATA.cycle_days.find(x=>x.num===n); return item?item.name:`Jour ${n}`; }
function isForbidden(name){ return (DATA.forbidden_days||[]).includes(name); }
function getLocalMonthName(m){ return DATA.months_local[String(m)]||''; }
function formatFrenchDate(d){ return d.toLocaleDateString('fr-FR', {weekday:'long', year:'numeric', month:'long', day:'numeric'}); }

function renderToday(){
  const today=new Date();
  document.getElementById('gregorianDate').textContent = formatFrenchDate(today);
  const n=getCycleDayNumber(today); const name=getCycleDayName(n);
  document.getElementById('cycleDayNumber').textContent=n;
  document.getElementById('cycleDayName').textContent=name;
  document.getElementById('year').textContent = today.getFullYear();
}

// 3-month rendering
let startDate = new Date(); // first month shown
startDate.setDate(1);

function monthMeta(year, month){ // month is 0..11
  const first = new Date(year, month, 1);
  const last = new Date(year, month+1, 0);
  const days = last.getDate();
  let startWeekday = first.getDay(); // 0=dim .. 6=sam
  // Convert to Monday-first (0=lun .. 6=dim)
  startWeekday = (startWeekday+6)%7;
  return {first, last, days, startWeekday};
}

const WEEKDAYS = ['L','M','M','J','V','S','D'];

function renderMonth(container, year, month){
  const meta = monthMeta(year, month);
  const local = getLocalMonthName(month+1);
  const title = `${firstCap(new Date(year, month, 1).toLocaleDateString('fr-FR',{month:'long', year:'numeric'}))}`;
  const mEl = document.createElement('div');
  mEl.className='month';
  mEl.innerHTML = `<h3><span>${title}</span><span class="local">${local||''}</span></h3>`;
  const w = document.createElement('div'); w.className='weekdays';
  WEEKDAYS.forEach(d=>{ const e=document.createElement('div'); e.textContent=d; w.appendChild(e); });
  const g = document.createElement('div'); g.className='grid';
  // empty cells before first day
  for(let i=0;i<meta.startWeekday;i++){ const d=document.createElement('div'); g.appendChild(d); }
  const today = toDateOnly(new Date());
  for(let day=1; day<=meta.days; day++){
    const cur = new Date(year, month, day);
    const n = getCycleDayNumber(cur); const name = getCycleDayName(n);
    const cell = document.createElement('div'); cell.className='day';
    if(isForbidden(name)) cell.classList.add('forbidden');
    if(toDateOnly(cur).getTime()===today.getTime()) cell.classList.add('today');
    cell.innerHTML = `<div class="num">${day}</div><div class="cycle">${name} • ${n}</div>`;
    g.appendChild(cell);
  }
  mEl.appendChild(w); mEl.appendChild(g);
  container.appendChild(mEl);
}

function firstCap(s){ return s.charAt(0).toUpperCase()+s.slice(1); }

function renderThreeMonths(){
  const wrap = document.getElementById('monthsWrap');
  wrap.innerHTML='';
  const y = startDate.getFullYear();
  const m = startDate.getMonth();
  renderMonth(wrap, y, m);
  const d2 = new Date(y, m+1, 1);
  renderMonth(wrap, d2.getFullYear(), d2.getMonth());
  const d3 = new Date(y, m+2, 1);
  renderMonth(wrap, d3.getFullYear(), d3.getMonth());
}

function setupNav(){
  document.getElementById('prevYearBtn').onclick = ()=>{ startDate = new Date(startDate.getFullYear()-1, startDate.getMonth(), 1); renderThreeMonths(); };
  document.getElementById('prev3Btn').onclick = ()=>{ startDate = new Date(startDate.getFullYear(), startDate.getMonth()-3, 1); renderThreeMonths(); };
  document.getElementById('prev1Btn').onclick = ()=>{ startDate = new Date(startDate.getFullYear(), startDate.getMonth()-1, 1); renderThreeMonths(); };
  document.getElementById('next1Btn').onclick = ()=>{ startDate = new Date(startDate.getFullYear(), startDate.getMonth()+1, 1); renderThreeMonths(); };
  document.getElementById('next3Btn').onclick = ()=>{ startDate = new Date(startDate.getFullYear(), startDate.getMonth()+3, 1); renderThreeMonths(); };
  document.getElementById('nextYearBtn').onclick = ()=>{ startDate = new Date(startDate.getFullYear()+1, startDate.getMonth(), 1); renderThreeMonths(); };
  document.getElementById('todayBtn').onclick = ()=>{ const now=new Date(); startDate = new Date(now.getFullYear(), now.getMonth(), 1); renderThreeMonths(); };
}

function setupPicker(){
  const input = document.getElementById('datePicker');
  const btn = document.getElementById('btnCheck');
  const result = document.getElementById('result');
  input.valueAsDate = new Date();
  btn.addEventListener('click', ()=>{
    if(!input.value){ result.textContent='Veuillez choisir une date.'; return; }
    const d=new Date(input.value+'T12:00:00');
    const n=getCycleDayNumber(d); const name=getCycleDayName(n);
    const localMonth=getLocalMonthName(d.getMonth()+1);
    const forbidden=isForbidden(name)?` — <span style="color:#C89B3C">⚠ Jour interdit</span>`:'';
    result.innerHTML = `<strong>${d.toLocaleDateString('fr-FR',{weekday:'long',year:'numeric',month:'long',day:'numeric'})}</strong> (${localMonth||'—'}) correspond à <strong>${name}</strong> (jour ${n} du cycle)${forbidden}.`;
  });
}

let deferredPrompt;
function setupInstall(){
  const btn = document.getElementById('installBtn');
  window.addEventListener('beforeinstallprompt', (e)=>{ e.preventDefault(); deferredPrompt=e; btn.classList.remove('hidden'); });
  btn.addEventListener('click', async ()=>{ if(!deferredPrompt) return; deferredPrompt.prompt(); await deferredPrompt.userChoice; deferredPrompt=null; btn.classList.add('hidden'); });
}

function registerSW(){ if('serviceWorker' in navigator){ navigator.serviceWorker.register('./sw.js').catch(console.error); } }

document.addEventListener('DOMContentLoaded', async ()=>{
  try{
    await loadData();
    renderToday();
    setupNav();
    renderThreeMonths();
    setupPicker();
    setupInstall();
    registerSW();
  }catch(err){ console.error(err); alert('Erreur de chargement des données.'); }
});
