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

  roi: '—',
  motif: '—',
  marche: [],

  roiByVillage: {},
  motifByVillage: {},
  marcheByVillage: {},

  tmonths: {},
  j8: {},
  j8Anchor: {},

  forbiddenNames: {},
  marketNames: {},

  forbiddenFromJ: {},
  marketFromJ: {},

  rowsRaw: null
};

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

function isSameDay(a,b){
  return a.getFullYear()===b.getFullYear()
  && a.getMonth()===b.getMonth()
  && a.getDate()===b.getDate();
}

function monthLabel(y,m){
  return fmt.monthYear.format(new Date(y,m,1));
}

function toISODateFromAny(x) {
  if (!x) return "";
  const s = String(x).trim();
  const m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (m) return `${m[3]}-${m[2].padStart(2,'0')}-${m[1].padStart(2,'0')}`;
  return s;
}

// ----------------------------- Résolution
function resolveTraditionalAndTags(d, village){

  const vKey = String(village || 'ALL').toUpperCase();

  let trad = state.j8[vKey]?.["1"] || "Trad · Général";

  return { trad, isMarket:false, isForbidden:false };
}

// ----------------------------- JSON Loader
async function loadDataJSON(){

  const url = "./data.v3.json";

  const res = await fetch(url,{cache:"no-store"});

  const raw = await res.json();

  const rows = raw.rows || raw;

  state.rowsRaw = rows;

  rows.forEach(r=>{

    const v = (r.Village||"").toUpperCase();

    if(r["Roi du village:"])
      state.roiByVillage[v] = r["Roi du village:"];

    if(r["Informations:"])
      state.motifByVillage[v] = r["Informations:"];

    const forb = [
      r["Jour interdit1"],
      r["Jour interdit2"],
      r["Jour interdit3"]
    ].filter(Boolean);

    if(forb.length)
      state.forbiddenNames[v] = forb;

    const march = [
      r["Jour du marché1"],
      r["Jour du marché2"],
      r["Jour du marché3"]
    ].filter(Boolean);

    if(march.length)
      state.marcheByVillage[v] = march;

    const jmap = {};

    for(let j=1;j<=8;j++){
      const val = r[`J${j}`];
      if(val) jmap[j]=val;
    }

    if(Object.keys(jmap).length)
      state.j8[v]=jmap;

  });

}

// ----------------------------- Rendu
function renderNineColumns(){

  const root = document.getElementById("calendar-9cols");

  root.innerHTML="";

  const months = [
    new Date(state.anchor.getFullYear(), state.anchor.getMonth()-1,1),
    new Date(state.anchor.getFullYear(), state.anchor.getMonth(),1),
    new Date(state.anchor.getFullYear(), state.anchor.getMonth()+1,1)
  ];

  const frag = document.createDocumentFragment();

  months.forEach(start=>renderOneMonth(frag,start,state.village));

  root.appendChild(frag);

  renderVillageMeta();
}

function renderOneMonth(root,start,village){

  const y=start.getFullYear();
  const m=start.getMonth();

  const wrap=document.createElement("div");
  wrap.className="month";

  const head=document.createElement("div");
  head.className="month-header";
  head.textContent=monthLabel(y,m);

  wrap.appendChild(head);

  for(let d=1;d<=daysInMonth(y,m);d++){

    const cur=new Date(y,m,d);

    const {trad}=resolveTraditionalAndTags(cur,village);

    const row=document.createElement("div");
    row.className="row";

    if(isSameDay(cur,today)) row.classList.add("today");

    const c1=document.createElement("div");
    c1.className="cell date";
    c1.textContent=d;

    const c2=document.createElement("div");
    c2.className="cell greg";
    c2.textContent=fmt.weekdayLong.format(cur);

    const c3=document.createElement("div");
    c3.className="cell trad";
    c3.textContent=trad;

    row.appendChild(c1);
    row.appendChild(c2);
    row.appendChild(c3);

    wrap.appendChild(row);

  }

  root.appendChild(wrap);
}

// ----------------------------- BLOC BAS
function renderVillageMeta(){

  const vKey = String(state.village || 'ALL').toUpperCase();

  const elRoi = document.getElementById("roi-village");
  const elMarche = document.getElementById("marche-village");
  const elMotif = document.getElementById("motif-village");
  const elInterdits = document.getElementById("interdits-village");

  // SI TOUS LES VILLAGES
  if(vKey === "ALL"){

    if(elRoi) elRoi.textContent="—";
    if(elMarche) elMarche.textContent="—";
    if(elMotif) elMotif.textContent="—";
    if(elInterdits) elInterdits.textContent="—";

    return;
  }

  if(elRoi)
    elRoi.textContent = state.roiByVillage[vKey] || "—";

  if(elMarche)
    elMarche.textContent =
      (state.marcheByVillage[vKey]||[]).join(", ") || "—";

  if(elInterdits)
    elInterdits.textContent =
      (state.forbiddenNames[vKey]||[]).join(", ") || "—";

  if(elMotif)
    elMotif.textContent =
      state.motifByVillage[vKey] || "—";

}

// ----------------------------- Villages
function remplirListeVillagesDepuisData(){

  const sel=document.getElementById("param-village");

  sel.innerHTML='<option value="ALL">Tous</option>';

  const set=new Set();

  state.rowsRaw.forEach(r=>{
    if(r.Village) set.add(r.Village.toUpperCase());
  });

  [...set].sort().forEach(v=>{
    const opt=document.createElement("option");
    opt.value=v;
    opt.textContent=v;
    sel.appendChild(opt);
  });

}

// ----------------------------- Params
function wireParams(){

  const v=document.getElementById("param-village");

  if(v){

    v.addEventListener("change",e=>{

      state.village=e.target.value.toUpperCase();

      renderNineColumns();

    });

  }

}

// ----------------------------- INIT
document.addEventListener("DOMContentLoaded",async()=>{

  await loadDataJSON();

  remplirListeVillagesDepuisData();

  wireParams();

  renderNineColumns();

});
