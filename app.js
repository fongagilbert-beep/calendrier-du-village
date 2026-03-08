
let DATA=null; let currentVillage=null;

const defaultData = {
  reference: { gregorian_date: "2026-02-28", cycle_day: 1 },
  months_local: {
    1: "Nka'gnia", 2: "Zeu'gnia", 3: "Ti'zoueu", 4: "Ti'zoueu",
    5: "Sou'gnia", 6: "Nkap'djap", 7: "Tcho'zoueu", 8: "Tcho'zoueu",
    9: "Mbuo'gnia", 10: "Zue'Diap", 11: "Chui'Kwelè", 12: "Tchoua'Kwelè"
  },
  villages: {
    BALENGOU: {
      chief: "Sa Majesté NGUEMEGNI HAPPI Guy Elvis",
      cycle_days: [
        { num:1, name:"Ngèdjou" }, { num:2, name:"Ndin'kap" },
        { num:3, name:"Nzeu'gheu" }, { num:4, name:"Ndi'keun" },
        { num:5, name:"Nzedjio" }, { num:6, name:"Ndi'bou" },
        { num:7, name:"Ndi'kong" }, { num:8, name:"Nditcheu" }
      ],
      forbidden_days: ["Ndin'kap","Nzedjio"],
      market_days: [],
      infos: ""
    }
  }
};

async function loadData(){
  const statusEl = document.getElementById('dataStatus');
  try {
    const res = await fetch('data.json?v=' + Date.now(), { cache: 'no-store' });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    DATA = await res.json();
    statusEl.textContent = '';
  } catch (e) {
    // Fallback secours
    DATA = defaultData;
    statusEl.textContent = 'Mode secours : data.json indisponible (utilisation des données par défaut).';
    console.warn('Fallback DATA used:', e);
  }
  const villages = Object.keys(DATA.villages || {});
  const saved = localStorage.getItem('village');
  currentVillage = (saved && villages.includes(saved)) ? saved : (villages[0] || 'BALENGOU');
}

function getVillageData(){ return DATA.villages[currentVillage]; }
function getCycleDayName(n){ const v=getVillageData(); const it=v.cycle_days.find(x=>x.num===n); return it?it.name:`Jour ${n}`; }
function isForbidden(name){ const v=getVillageData(); return (v.forbidden_days||[]).includes(name); }
function getLocalMonthName(m){ return DATA.months_local[String(m)] || DATA.months_local[m] || ''; }
function toDateOnly(d){ const z=new Date(d); return new Date(z.getFullYear(), z.getMonth(), z.getDate()); }
function daysBetween(a,b){ const ms=86400000; return Math.round((toDateOnly(a)-toDateOnly(b))/ms); }
function getCycleDayNumber(date){ const ref=new Date(DATA.reference.gregorian_date+'T00:00:00'); const refN=DATA.reference.cycle_day; const delta=daysBetween(date,ref); const off=(refN-1+delta)%8; return ((off+8)%8)+1; }
function firstCap(s){ return s? s.charAt(0).toUpperCase()+s.slice(1): s; }

let startDate=new Date(); startDate.setDate(1);
function monthMeta(y,m){ const first=new Date(y,m,1); const last=new Date(y,m+1,0); return { first,last,days:last.getDate() }; }

function renderMonth(container, y, m){
  const meta=monthMeta(y,m); const local=getLocalMonthName(m+1); const title=firstCap(new Date(y,m,1).toLocaleDateString('fr-FR',{month:'long',year:'numeric'}));
  const mEl=document.createElement('div'); mEl.className='month';
  const header=document.createElement('div'); header.className='header'; header.innerHTML=`<div class="greg">${title}</div><div class="local">${local||''}</div>`; mEl.appendChild(header);
  const table=document.createElement('table'); table.className='table'; table.innerHTML=`<thead><tr><th style="width:24%">Date</th><th style="width:30%">Jour</th><th>Trad.</th></tr></thead><tbody></tbody>`; const tbody=table.querySelector('tbody');
  const today=toDateOnly(new Date());
  for(let d=1; d<=meta.days; d++){
    const cur=new Date(y,m,d); const tr=document.createElement('tr');
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

function renderThreeMonths(){
  const wrap=document.getElementById('monthsWrap'); wrap.innerHTML='';
  const y=startDate.getFullYear(); const m=startDate.getMonth();
  const prev=new Date(y,m-1,1); renderMonth(wrap, prev.getFullYear(), prev.getMonth());
  renderMonth(wrap, y, m);
  const next=new Date(y,m+1,1); renderMonth(wrap, next.getFullYear(), next.getMonth());
}

function updateVillageUI(){
  document.getElementById('watermark').textContent = `Calendrier du Village — ${currentVillage}`;
  const v=getVillageData();
  document.getElementById('chief').textContent = v.chief || '—';
  document.getElementById('market').textContent = (v.market_days||[]).join(', ') || '—';
  document.getElementById('moreInfos').textContent = v.infos || '—';
  document.getElementById('forbidden').textContent = (v.forbidden_days||[]).join(', ') || '—';
}

function populateSelectors(){
  const selV=document.getElementById('villageSelect'); selV.innerHTML='';
  Object.keys(DATA.villages).forEach(name=>{ const o=document.createElement('option'); o.value=name; o.textContent=name; selV.appendChild(o); });
  selV.value=currentVillage; selV.onchange=()=>{ currentVillage=selV.value; localStorage.setItem('village', currentVillage); updateVillageUI(); renderThreeMonths(); };

  const yi=document.getElementById('yearInput'); yi.value=startDate.getFullYear(); yi.onchange=()=>{ const y=parseInt(yi.value||startDate.getFullYear(),10); startDate=new Date(y, startDate.getMonth(), 1); renderThreeMonths(); };

  const monthSel=document.getElementById('monthSelect'); monthSel.innerHTML='';
  const gregNames=new Intl.DateTimeFormat('fr-FR',{month:'long'});
  for(let i=0;i<12;i++){ const o=document.createElement('option'); o.value=String(i); o.textContent=gregNames.format(new Date(2026,i,1)); monthSel.appendChild(o); }
  monthSel.value=String(startDate.getMonth());
  monthSel.onchange=()=>{ startDate=new Date(startDate.getFullYear(), parseInt(monthSel.value,10), 1); renderThreeMonths(); };

  const tradSel=document.getElementById('tradSelect'); tradSel.innerHTML='';
  for(let i=1;i<=12;i++){ const o=document.createElement('option'); o.value=String(i-1); o.textContent=DATA.months_local[String(i)]||String(i); tradSel.appendChild(o); }
  tradSel.value=String(startDate.getMonth());
  tradSel.onchange=()=>{ startDate=new Date(startDate.getFullYear(), parseInt(tradSel.value,10), 1); renderThreeMonths(); monthSel.value=tradSel.value; };
}

function renderAll(){ updateVillageUI(); populateSelectors(); renderThreeMonths(); document.getElementById('year').textContent=(new Date()).getFullYear(); }

document.addEventListener('DOMContentLoaded', async ()=>{
  try{
    await loadData(); renderAll();
  }catch(err){ console.error(err); alert('Erreur de chargement des données.'); }
});
