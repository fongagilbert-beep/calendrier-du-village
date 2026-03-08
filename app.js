// Fenêtre centrée : M-1 | M | M+1  (M = mois central)
const today = new Date();
const state = {
  anchor: new Date(today.getFullYear(), today.getMonth(), 1), // M = centre
  village: 'ALL',
  filtre: 'all',
  dataMap: new Map(),
  roi: '—', motif: '—', marche: [],
  tmonths: {} // traditional month names per village
};

// === API données dynamiques ===
export function cvUpdateData(entries){ for(const e of entries){ const k = makeKey(e.dateISO, (e.village||'ALL').toUpperCase()); state.dataMap.set(k, { trad: e.trad||'', tags: new Set(e.tags||[]) }); } renderNineColumns(); }
export function cvSetWatermark(text){ document.getElementById('calendar-9cols').setAttribute('data-watermark', (text||'VILLAGE').toUpperCase()); }
export function cvSetVillageMeta({ roi, marche, info }){ if(roi) state.roi = roi; if(Array.isArray(marche)) state.marche = marche; if(info) state.motif = info; renderVillageMeta(); }

// Helpers
function makeKey(dateISO, village){ return `${dateISO}|${village}`; }
function toISO(d){ return d.toISOString().slice(0,10); }
function daysInMonth(y,m){ return new Date(y, m+1, 0).getDate(); }
function isSameDay(a,b){ return a.getFullYear()===b.getFullYear() && a.getMonth()===b.getMonth() && a.getDate()===b.getDate(); }
function monthLabel(y,m){ return new Intl.DateTimeFormat('fr-FR', { month:'long', year:'numeric' }).format(new Date(y,m,1)); }
function formatDayLabel(d){ const wd = new Intl.DateTimeFormat('fr-FR', { weekday:'long' }).format(d); return wd.charAt(0).toUpperCase()+wd.slice(1); }

function getTraditionalMonthName(year, monthIndex, village){ // monthIndex: 0..11
  const vKey = (village||'ALL').toUpperCase();
  const map = state.tmonths[vKey] || state.tmonths['ALL'];
  if (!map) return '—';
  const name = map[String(monthIndex+1)] || map[monthIndex+1] || map[monthIndex] || '—';
  return name;
}

function resolveTraditionalAndTags(d, village){ const iso = toISO(d); let rec = state.dataMap.get(makeKey(iso, (village||'ALL').toUpperCase())); if(!rec) rec = state.dataMap.get(makeKey(iso, 'ALL')); return { trad: rec?.trad || 'Trad · Général', isForbidden: !!rec?.tags?.has('forbidden'), isMarket: !!rec?.tags?.has('market') } }

async function loadDataJSON(){ try{ const res = await fetch('./data.json', { cache:'no-store' }); if(!res.ok) return; const data = await res.json(); if (data?.traditional_months) state.tmonths = data.traditional_months; if(Array.isArray(data?.entries)) cvUpdateData(data.entries); cvSetVillageMeta({ roi: data.roi, marche: data.market_info || [], info: data.extra_info }); } catch(_){} }

function wireNav(){ document.querySelectorAll('.nav-row [data-action]').forEach(btn=>{ btn.addEventListener('click',()=>{ const a=btn.dataset.action; if(a==='prev3') state.anchor=new Date(state.anchor.getFullYear(), state.anchor.getMonth()-3,1); if(a==='next3') state.anchor=new Date(state.anchor.getFullYear(), state.anchor.getMonth()+3,1); if(a==='prevY') state.anchor=new Date(state.anchor.getFullYear()-1, state.anchor.getMonth(),1); if(a==='nextY') state.anchor=new Date(state.anchor.getFullYear()+1, state.anchor.getMonth(),1); if(a==='today') state.anchor=new Date(today.getFullYear(), today.getMonth(),1); syncParamFields(); renderNineColumns(); }); }); }
function wireParams(){ const y=document.getElementById('param-annee'); const m=document.getElementById('param-mois'); const v=document.getElementById('param-village'); const f=document.getElementById('param-filtre'); if(y&&m){ y.addEventListener('change',()=>{ state.anchor=new Date(Number(y.value)||today.getFullYear(), (Number(m.value)||1)-1,1); renderNineColumns(); }); m.addEventListener('change',()=>{ state.anchor=new Date(Number(y.value)||today.getFullYear(), (Number(m.value)||1)-1,1); renderNineColumns(); }); } if(v){ v.addEventListener('change',e=>{ state.village=(e.target.value||'ALL').toUpperCase(); const label = e.target.options[e.target.selectedIndex].text || e.target.value; cvSetWatermark(label); renderNineColumns(); }); } if(f) f.addEventListener('change',e=>{ state.filtre=e.target.value; renderNineColumns(); }); }
function syncParamFields(){ const y=document.getElementById('param-annee'); const m=document.getElementById('param-mois'); if(y) y.value = state.anchor.getFullYear(); if(m) m.value = (state.anchor.getMonth()+1); }

function renderNineColumns(){ const root=document.getElementById('calendar-9cols'); root.setAttribute('aria-busy','true'); root.innerHTML=''; const months=[ new Date(state.anchor.getFullYear(), state.anchor.getMonth()-1, 1), new Date(state.anchor.getFullYear(), state.anchor.getMonth(), 1), new Date(state.anchor.getFullYear(), state.anchor.getMonth()+1, 1) ]; const classes=['mL','mC','mR']; months.forEach((start,i)=>renderOneMonth(root,start,state.village,classes[i])); syncParamFields(); root.setAttribute('aria-busy','false'); renderVillageMeta(); }

function renderOneMonth(root, startOfMonth, village, placeClass){ const y=startOfMonth.getFullYear(); const m=startOfMonth.getMonth(); const nDays=daysInMonth(y,m); const wrap=document.createElement('div'); wrap.className='month '+placeClass; const header=document.createElement('div'); header.className='month-header'; const tradMonth = getTraditionalMonthName(y,m,village); header.textContent = `${monthLabel(y,m)} — ${tradMonth}` + (placeClass==='mC'?' (M)':''); wrap.appendChild(header); const t1=document.createElement('div'); t1.className='col-title'; t1.textContent='Date'; wrap.appendChild(t1); const t2=document.createElement('div'); t2.className='col-title'; t2.textContent='Jour grégorien'; wrap.appendChild(t2); const t3=document.createElement('div'); t3.className='col-title'; t3.textContent='Jour traditionnel'; wrap.appendChild(t3); for(let d=1; d<=nDays; d++){ const cur=new Date(y,m,d); const { trad, isForbidden, isMarket }=resolveTraditionalAndTags(cur, village); if(state.filtre==='forbidden' && !isForbidden) continue; if(state.filtre==='market' && !isMarket) continue; const row=document.createElement('div'); row.className='row'+(isSameDay(cur,today)?' today':'')+(isForbidden?' forbidden':'')+(isMarket?' market':''); const zebra=(d%2===0); const c1=document.createElement('div'); c1.className='cell date'+(zebra?' zebra':''); c1.textContent=String(d); const c2=document.createElement('div'); c2.className='cell greg'+(zebra?' zebra':''); c2.textContent=formatDayLabel(cur); const c3=document.createElement('div'); c3.className='cell tradi'+(zebra?' zebra':''); c3.textContent=trad; row.appendChild(c1); row.appendChild(c2); row.appendChild(c3); wrap.appendChild(row);} root.appendChild(wrap); }

function renderVillageMeta(){ document.getElementById('roi-village').textContent = state.roi || '—'; document.getElementById('motif-village').textContent = state.motif || '—'; document.getElementById('marche-village').textContent = (state.marche||[]).join(', ') || '—'; }

wireNav(); wireParams(); loadDataJSON(); renderNineColumns();

// expose helpers
window.cvUpdateData=cvUpdateData; window.cvSetWatermark=cvSetWatermark; window.cvSetVillageMeta=cvSetVillageMeta;
