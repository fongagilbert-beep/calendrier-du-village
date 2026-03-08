
let DATA = null;
async function loadData(){ const res = await fetch('data.json'); if(!res.ok) throw new Error('Impossible de charger data.json'); DATA = await res.json(); }
function toDateOnly(d){ const z = new Date(d); return new Date(z.getFullYear(), z.getMonth(), z.getDate()); }
function daysBetween(a,b){ const ms=24*60*60*1000; return Math.round((toDateOnly(a)-toDateOnly(b))/ms); }
function getCycleDayNumber(date){ const ref = new Date(DATA.reference.gregorian_date+'T00:00:00'); const n0=DATA.reference.cycle_day; const d=daysBetween(date,ref); const off=(n0-1+d)%8; return ((off+8)%8)+1; }
function getCycleDayName(n){ const it = DATA.cycle_days.find(x=>x.num===n); return it?it.name:`Jour ${n}`; }
function formatFrenchDate(d){ return d.toLocaleDateString('fr-FR',{weekday:'long',year:'numeric',month:'long',day:'numeric'}); }
function getLocalMonthName(m){ return DATA.months_local[String(m)]||''; }
function isForbidden(name){ return (DATA.forbidden_days||[]).includes(name); }
function renderToday(){ const today=new Date();
 document.getElementById('gregorianDate').textContent = formatFrenchDate(today);
 const n=getCycleDayNumber(today); const name=getCycleDayName(n);
 document.getElementById('cycleDayNumber').textContent=n; document.getElementById('cycleDayName').textContent=name;
 const localMonth=getLocalMonthName(today.getMonth()+1); const about=document.querySelector('.info p');
 if(localMonth&&about){ about.innerHTML=`Un calendrier perpétuel africain basé sur un cycle de 8 jours. Village : <strong>${DATA.village}</strong>. Mois traditionnel : <strong>${localMonth}</strong>.`; }
 const result=document.getElementById('result'); if(isForbidden(name)){ result.innerHTML=`<span style="color:#C89B3C">⚠ Jour interdit : <strong>${name}</strong></span>`; } else { result.textContent=''; }
 document.getElementById('year').textContent=today.getFullYear(); }
function setupPicker(){ const input=document.getElementById('datePicker'); const btn=document.getElementById('btnCheck'); const result=document.getElementById('result'); input.valueAsDate=new Date(); btn.addEventListener('click',()=>{ if(!input.value){ result.textContent='Veuillez choisir une date.'; return; } const d=new Date(input.value+'T12:00:00'); const n=getCycleDayNumber(d); const name=getCycleDayName(n); const localMonth=getLocalMonthName(d.getMonth()+1); const forbidden=isForbidden(name)?` — <span style='color:#C89B3C'>⚠ Jour interdit</span>`:''; result.innerHTML=`<strong>${formatFrenchDate(d)}</strong> (${localMonth||'—'}) correspond à <strong>${name}</strong> (jour ${n} du cycle)${forbidden}.`; }); }
let deferredPrompt; function setupInstall(){ const btn=document.getElementById('installBtn'); window.addEventListener('beforeinstallprompt',(e)=>{ e.preventDefault(); deferredPrompt=e; btn.classList.remove('hidden'); }); btn.addEventListener('click', async ()=>{ if(!deferredPrompt) return; deferredPrompt.prompt(); await deferredPrompt.userChoice; deferredPrompt=null; btn.classList.add('hidden'); }); }
function registerSW(){ if('serviceWorker' in navigator){ navigator.serviceWorker.register('./sw.js').catch(console.error); } }
document.addEventListener('DOMContentLoaded', async ()=>{ try{ await loadData(); renderToday(); setupPicker(); setupInstall(); registerSW(); } catch(e){ console.error(e); alert('Erreur de chargement des données.'); } });
