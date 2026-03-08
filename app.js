
let DATA = null;
let currentVillage = null;

async function loadData(){
  const res = await fetch('data.json');
  if(!res.ok) throw new Error('Impossible de charger data.json');
  DATA = await res.json();
  const villages = Object.keys(DATA.villages || {});
  const saved = localStorage.getItem('village');
  currentVillage = (saved && villages.includes(saved)) ? saved : (villages[0] || 'BALENGOU');
}

function getVillageData(){ return DATA.villages[currentVillage]; }
function getCycleDayName(n){ const v=getVillageData(); const it=v.cycle_days.find(x=>x.num===n); return it?it.name:`Jour ${n}`; }
function isForbidden(name){ const v=getVillageData(); return (v.forbidden_days||[]).includes(name); }
function getLocalMonthName(m){ return DATA.months_local[String(m)] || ''; }
function toDateOnly(d){ const z=new Date(d); return new Date(z.getFullYear(), z.getMonth(), z.getDate()); }
function daysBetween(d1,d2){ const ms=24*60*60*1000; return Math.round((toDateOnly(d1)-toDateOnly(d2))/ms); }
function getCycleDayNumber(date){ const ref=new Date(DATA.reference.gregorian_date+'T00:00:00'); const refN=DATA.reference.cycle_day; const delta=daysBetween(date,ref); const off=(refN-1+delta)%8; return ((off+8)%8)+1; }
function formatFrenchDate(d){ return d.toLocaleDateString('fr-FR',{weekday:'long',year:'numeric',month:'long',day:'numeric'}); }
function firstCap(s){ return s? s.charAt(0).toUpperCase()+s.slice(1): s; }

function updateVillageUI(){
  document.getElementById('watermark').textContent = `Calendrier du Village — ${currentVillage}`;
  const v=getVillageData();
  document.getElementById('chief').textContent = v.chief || '—';
  document.getElementById('market').textContent = (v.market_days||[]).join(', ') || '—';
  document.getElementById('moreInfos').textContent = v.infos || '—';
  document.getElementById('forbidden').textContent = (v.forbidden_days||[]).join(', ') || '—';
  const sel=document.getElementById('villageSelect');
  if(sel && !sel.options.length){ Object.keys(DATA.villages).forEach(name=>{const o=document.createElement('option');o.value=name;o.textContent=name;sel.appendChild(o);}); sel.value=currentVillage; sel.addEventListener('change',()=>{currentVillage=sel.value; localStorage.setItem('village',currentVillage); renderAll();}); } else if(sel){ sel.value=currentVillage; }
}

function renderToday(){ const today=new Date(); document.getElementById('gregorianDate').textContent=formatFrenchDate(today); const n=getCycleDayNumber(today); document.getElementById('cycleDayNumber').textContent=n; document.getElementById('cycleDayName').textContent=getCycleDayName(n); document.getElementById('year').textContent=today.getFullYear(); }

let startDate=new Date(); startDate.setDate(1);
function monthMeta(y,m){ const f=new Date(y,m,1); const l=new Date(y,m+1,0); return {first:f,last:l,days:l.getDate()}; }

function renderMonth(container, year, month){
  const meta=monthMeta(year,month); const local=getLocalMonthName(month+1); const title=firstCap(new Date(year,month,1).toLocaleDateString('fr-FR',{month:'long',year:'numeric'}));
  const mEl=document.createElement('div'); mEl.className='month';
  const header=document.createElement('div'); header.className='header'; header.innerHTML=`<div class="greg">${title}</div><div class="local">${local||''}</div>`; mEl.appendChild(header);
  const table=document.createElement('table'); table.className='table'; table.innerHTML=`<thead><tr><th style="width:24%">Date</th><th style="width:30%">Jour</th><th>Trad.</th></tr></thead><tbody></tbody>`; const tbody=table.querySelector('tbody');
  const today=toDateOnly(new Date());
  for(let d=1; d<=meta.days; d++){
    const cur=new Date(year,month,d); const tr=document.createElement('tr');
    const wd=cur.toLocaleDateString('fr-FR',{weekday:'long'}); const n=getCycleDayNumber(cur); const trad=getCycleDayName(n);
    if(toDateOnly(cur).getTime()===today.getTime()) tr.classList.add('today');
    if(isForbidden(trad)) tr.classList.add('forbidden');
    const tdDate=document.createElement('td'); tdDate.textContent=`${d} ${firstCap(wd)}`;
    const tdJour=document.createElement('td'); tdJour.textContent=firstCap(wd);
    const tdTrad=document.createElement('td'); tdTrad.textContent=trad;
    tr.appendChild(tdDate); tr.appendChild(tdJour); tr.appendChild(tdTrad); tbody.appendChild(tr);
  }
  mEl.appendChild(table); container.appendChild(mEl);
}

// IMPORTANT: render months as (month-1, month, month+1)
function renderThreeMonths(){
  const wrap=document.getElementById('monthsWrap');
  wrap.innerHTML='';
  const y=startDate.getFullYear();
  const m=startDate.getMonth();
  const prev=new Date(y, m-1, 1);
  renderMonth(wrap, prev.getFullYear(), prev.getMonth());
  renderMonth(wrap, y, m);
  const next=new Date(y, m+1, 1);
  renderMonth(wrap, next.getFullYear(), next.getMonth());
}

function setupNav(){
  document.getElementById('prevYearBtn').onclick = ()=>{ startDate=new Date(startDate.getFullYear()-1,startDate.getMonth(),1); renderThreeMonths(); };
  document.getElementById('prev3Btn').onclick   = ()=>{ startDate=new Date(startDate.getFullYear(),startDate.getMonth()-3,1); renderThreeMonths(); };
  document.getElementById('prev1Btn').onclick   = ()=>{ startDate=new Date(startDate.getFullYear(),startDate.getMonth()-1,1); renderThreeMonths(); };
  document.getElementById('next1Btn').onclick   = ()=>{ startDate=new Date(startDate.getFullYear(),startDate.getMonth()+1,1); renderThreeMonths(); };
  document.getElementById('next3Btn').onclick   = ()=>{ startDate=new Date(startDate.getFullYear(),startDate.getMonth()+3,1); renderThreeMonths(); };
  document.getElementById('nextYearBtn').onclick= ()=>{ startDate=new Date(startDate.getFullYear()+1,startDate.getMonth(),1); renderThreeMonths(); };
  document.getElementById('todayBtn').onclick   = ()=>{ const now=new Date(); startDate=new Date(now.getFullYear(),now.getMonth(),1); renderThreeMonths(); };
}

function setupPicker(){ const input=document.getElementById('datePicker'); const btn=document.getElementById('btnCheck'); const result=document.getElementById('result'); input.valueAsDate=new Date(); btn.addEventListener('click',()=>{ if(!input.value){ result.textContent='Veuillez choisir une date.'; return; } const d=new Date(input.value+'T12:00:00'); const n=getCycleDayNumber(d); const name=getCycleDayName(n); const localMonth=getLocalMonthName(d.getMonth()+1); const forbidden=isForbidden(name)?' — ⚠ Jour interdit':''; result.innerHTML=`<strong>${formatFrenchDate(d)}</strong> (${localMonth||'—'}) correspond à <strong>${name}</strong> (jour ${n} du cycle)${forbidden}.`; }); }

function renderAll(){ updateVillageUI(); renderToday(); renderThreeMonths(); }

document.addEventListener('DOMContentLoaded', async ()=>{ try{ await loadData(); setupNav(); setupPicker(); renderAll(); if('serviceWorker' in navigator){ navigator.serviceWorker.register('./sw.js').catch(console.error); } let dp; window.addEventListener('beforeinstallprompt', e=>{ e.preventDefault(); dp=e; document.getElementById('installBtn').classList.remove('hidden'); }); document.getElementById('installBtn').addEventListener('click', async ()=>{ if(!dp) return; dp.prompt(); await dp.userChoice; dp=null; document.getElementById('installBtn').classList.add('hidden'); }); }catch(err){ console.error(err); alert('Erreur de chargement des données.'); } });
