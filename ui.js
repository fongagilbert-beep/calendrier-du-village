import {Moteur8J, dayNameFr} from './moteur.js';

let moteur; let dataset; let state = {year:0, month:0, village:''};

async function loadData(){
  const res = await fetch('./data/villages.json');
  dataset = await res.json();
  moteur = new Moteur8J(dataset);
}

function readPrefs(){
  const y = Number(localStorage.getItem('pref_year')) || new Date().getFullYear();
  const m = Number(localStorage.getItem('pref_month')) || (new Date().getMonth()+1);
  const v = localStorage.getItem('pref_village') || Object.keys(dataset.villages)[0];
  state = {year:y, month:m, village:v};
}
function savePrefs(){
  localStorage.setItem('pref_year', String(state.year));
  localStorage.setItem('pref_month', String(state.month));
  localStorage.setItem('pref_village', state.village);
}

function buildSelectors(){
  const selVillage = document.querySelector('#village');
  selVillage.innerHTML = '';
  for(const v of Object.keys(dataset.villages)){
    const opt = document.createElement('option'); opt.value=v; opt.textContent=v; selVillage.appendChild(opt);
  }
  selVillage.value = state.village;
  document.querySelector('#year').value = state.year;
  document.querySelector('#month').value = state.month;

  selVillage.onchange = ()=>{state.village=selVillage.value; savePrefs(); refresh();};
  document.querySelector('#year').onchange = (e)=>{state.year=Number(e.target.value)||state.year; savePrefs(); refresh();};
  document.querySelector('#month').onchange = (e)=>{state.month=Number(e.target.value)||state.month; savePrefs(); refresh();};
}

function ymToDate(y,m){return new Date(y, m-1, 1)}
function addMonths(d, n){const x=new Date(d); x.setMonth(x.getMonth()+n); return x}

function renderMonth(container, y, m){
  const d0 = new Date(y, m-1, 1);
  const daysIn = new Date(y, m, 0).getDate();
  const title = new Intl.DateTimeFormat('fr-FR',{month:'long', year:'numeric'}).format(d0);
  const trad = moteur.getTradMonthName(state.village, m);

  container.innerHTML = `
  <div class="card">
    <header>${title}${trad? ' — '+trad: ''}</header>
    <table class="table">
      <thead><tr><th>Date</th><th>Jour</th><th>Trad.</th></tr></thead>
      <tbody></tbody>
    </table>
  </div>`;
  const tbody = container.querySelector('tbody');
  for(let d=1; d<=daysIn; d++){
    const dt = new Date(y, m-1, d);
    const jTrad = moteur.jName(state.village, dt);
    const jIdx = moteur.jIndex(state.village, dt);
    const isForbidden = moteur.getForbidden(state.village).includes(jIdx);

    const tr = document.createElement('tr');
    const wd = dt.getDay(); // 0=dimanche
    if(wd===0) tr.classList.add('row-sunday');
    if(isSameDate(dt, new Date())) tr.classList.add('row-today');

    const tdD = document.createElement('td'); tdD.textContent = String(d);
    const tdJ = document.createElement('td'); tdJ.textContent = capitalize(dayNameFr(dt));
    const tdT = document.createElement('td'); tdT.textContent = jTrad; tdT.classList.add('cell-trad');
    if(isForbidden) tdT.classList.add('cell-forbidden');

    tr.append(tdD, tdJ, tdT); tbody.appendChild(tr);
  }
}

function isSameDate(a,b){return a.getFullYear()===b.getFullYear() && a.getMonth()===b.getMonth() && a.getDate()===b.getDate()}
function capitalize(s){return s? s.charAt(0).toUpperCase()+s.slice(1):s}

function refresh(){
  const grid = document.querySelector('#grid');
  const d0 = ymToDate(state.year, state.month);
  const prev = addMonths(d0,-1), next = addMonths(d0,1);
  const slots = grid.querySelectorAll('.slot');
  renderMonth(slots[0], prev.getFullYear(), prev.getMonth()+1);
  renderMonth(slots[1], d0.getFullYear(), d0.getMonth()+1);
  renderMonth(slots[2], next.getFullYear(), next.getMonth()+1);
  renderVillagePanel();
}

function renderVillagePanel(){
  const rec = dataset.villages[state.village];
  const el = document.querySelector('#village-panel');
  const [m1,m2,m3] = rec.marketLabels||['','',''];
  el.innerHTML = `
    <div class="village-panel">
      <div class="logo">
        <img src="./assets/logo-placeholder.png" alt="logo"/>
        <div>
          <div><strong>Roi du village:</strong> ${rec.king||''}</div>
          <div><strong>Jour de marché:</strong> ${[m1,m2,m3].filter(Boolean).join(' — ')}</div>
        </div>
      </div>
      <div><strong>Informations:</strong> ${rec.info||''}</div>
    </div>`;
  document.querySelector('#watermark').textContent = `Calendrier du village ${state.village} — © ${new Date().getFullYear()}  ·  Proposé par G.FONGA`;
}

function attachNav(){
  document.querySelector('#prev3').onclick = ()=>{ shiftMonths(-3) };
  document.querySelector('#next3').onclick = ()=>{ shiftMonths(3) };
  document.querySelector('#prevY').onclick = ()=>{ state.year -= 1; savePrefs(); refresh(); };
  document.querySelector('#nextY').onclick = ()=>{ state.year += 1; savePrefs(); refresh(); };
  document.querySelector('#today').onclick = ()=>{ const t=new Date(); state.year=t.getFullYear(); state.month=t.getMonth()+1; savePrefs(); refresh(); };
}
function shiftMonths(n){
  const d = new Date(state.year, state.month-1, 1); d.setMonth(d.getMonth()+n);
  state.year=d.getFullYear(); state.month=d.getMonth()+1; savePrefs(); refresh();
}

export async function bootstrap(){
  await loadData();
  readPrefs();
  buildSelectors();
  attachNav();
  refresh();
}
