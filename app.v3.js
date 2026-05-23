/* ══════════════════════════════════════════
   Calendrier du Village — app.v3.js
   © Gilbert FONGA — fongagilbert@gmail.com
   ══════════════════════════════════════════ */
"use strict";
 
const ANCHOR   = new Date(2026,1,28);
const ANCHOR_J = 0;
const MFR    = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre'];
const SJOURS = ['Lun','Mar','Mer','Jeu','Ven','Sam','Dim'];
const SFULL  = ['Dimanche','Lundi','Mardi','Mercredi','Jeudi','Vendredi','Samedi'];
 
const VILLAGES = [
  {V:'BAFANG',J:[],M:[],INT:[],MKT:[],ROI:"Sa Majesté René KAMGA NGANDJUI",INFO:""},
  {V:'BAFOUSSAM',J:[],M:[],INT:[],MKT:[],ROI:"Sa majesté Njitack Ngompe Pelé",INFO:""},
  {V:'BAHAM',J:[],M:[],INT:[],MKT:[],ROI:"Sa Majesté POUOKAM TEGUIA Max2",INFO:"Superficie de près de 56 km²"},
  {V:'BAKONDJI',J:[],M:[],INT:[],MKT:[],ROI:"Sa Majesté Austère Durand MOUMI 3",INFO:""},
  {V:'BALENG',J:[],M:[],INT:[],MKT:[],ROI:"Sa Majesté Guillaume Alain NEGOU TELA",INFO:""},
  {V:'BALENGOU',J:["Ngèdjou","Ndin'kap","Nzeu'gheu","Ndi'keun","Nzedjio","Ndi'bou","Ndi'kong","Nditcheu"],M:["Nka'gnia","Zeu'gnia","Ti'zoueu","Ti'zoueu","Sou'gnia","Nkap'djap","Tcho'zoueu","Tcho'zoueu","Mbuo'gnia","Zue'Diap","Chui'Kwelè","Tchoua'Kwelè"],INT:["Ndin'kap","Nzedjio"],MKT:[],ROI:"Sa Majesté NGUEMEGNI HAPPI Guy Elvis",INFO:"À compléter"},
  {V:'BAMEKA',J:[],M:[],INT:[],MKT:[],ROI:"Sa Majesté TAKUKAM Jean-Raymond",INFO:""},
  {V:'BAMENA',J:["Li'Nkap","Nze'Ngheu","Li'Ntio","Nze'Jio","Nze'Leung","Li'Nkong","Nta'Sang","Nguè'Ndjou"],M:["Mou'Nka","Nka'Ngneu","Nti'Zueu","Tchie'No","Sou'Ngno","Nwa'Nkou","Njusse'Zue","Tchoh'Zue","Ntse'Zue","Toun'Ndioh","Sougno'Ndong","Mene'Ngweu"],INT:[],MKT:["Ntah","Mbouh","Tountah"],ROI:"Sa Majesté NGIENTCHO",INFO:""},
  {V:'BAMENDJOU',J:[],M:[],INT:[],MKT:[],ROI:"Sa Majesté Jean-Rameau SOUKOUDJOU",INFO:""},
  {V:'BANA',J:[],M:[],INT:[],MKT:[],ROI:"Sa Majesté Sikam Happi 5",INFO:""},
  {V:'BANDREFAM',J:[],M:[],INT:[],MKT:[],ROI:"Sa Majesté GeorgesJIEJIP TCOMGANG",INFO:""},
  {V:'BANGAM',J:[],M:[],INT:[],MKT:[],ROI:"Sa Majesté POUFONG",INFO:""},
  {V:'BANGANGTE',J:["Ntânte","Ntanla","Nsigha","Nsemtè","Nga","Nkôtu","Nzinyam","Ntabu"],M:[],INT:[],MKT:[],ROI:"Sa Majesté Nji Mohnlu Siedou Pokam",INFO:""},
  {V:'BANGOU',J:["Nguèn'Djou","Di'Nkap","Nze'Ngue","Di'Ntouoh","Nze'Djouoh","Nzeu'Leg","Di'Nkong","Ntambeté"],M:[],INT:["Nguèn'Djou","Di'Ntouoh","Nze'Djouoh"],MKT:["Di'Nkap","Di'Nkong","Nzeu'Leg"],ROI:"",INFO:"Di'Nkap = Marché Bangou Carrefour ; Nzeu'Leg = Marché Bangou Chefferie"},
  {V:'BANGOUA',J:[],M:[],INT:[],MKT:[],ROI:"Sa Majesté Yannick Julio DJAMPOU",INFO:""},
  {V:'BANJOUN',J:[],M:[],INT:[],MKT:[],ROI:"Sa Majesté Diomo Kamga Honoré",INFO:""},
  {V:'BANOUNGA',J:[],M:[],INT:[],MKT:[],ROI:"Sa Majesté Louis NGAPMOU",INFO:""},
  {V:'BANSOA',J:[],M:[],INT:[],MKT:[],ROI:"Sa Majesté TCHINDA 2 DJONTU Jean-de-Dieu",INFO:""},
  {V:'BANWA',J:[],M:[],INT:[],MKT:[],ROI:"",INFO:""},
  {V:'BATCHINGOU',J:["Ngue'Ndjou","Dih'Nkap","Nze'Ngheu","Dih'Ntouo","Nze'jouo","Nze'Leuck","Dih'Nkok","Nta'Sia"],M:["Mou'nka","Nka'Ngnia","Nti'zoueh","Chiè'Nô","Sou'Ngno","Nwa'Nkou","Njuisse'Zoueh","Tchôh'Zoueh","Nte'Zoueh","Toun'Djouoh","Sougno'Ndong","Mene'gwe"],INT:["Nze'jouo","Nze'Ngheu"],MKT:[],ROI:"Sa Majesté André Flaubert NANA",INFO:"Sous-villages : Tchougwe, Bangwe, Tousse"},
  {V:'BATIE',J:[],M:[],INT:[],MKT:[],ROI:"Sa Majesté Théodore TCHOUANKAM DADA",INFO:""},
  {V:'BATOUFAM',J:["Ndi'NJou","Lie'Tsue","Kouo'Tsue","Lie'Tioc","Nzee'Nzee","Lie'Tchak","Kouo'Tchak","Nto'Ssack"],M:[],INT:[],MKT:[],ROI:"Sa Majesté NAYANG TOUKAM Innocent",INFO:""},
  {V:'BAYANGAM',J:[],M:[],INT:[],MKT:[],ROI:"Sa Majesté POUOKAM II",INFO:""},
  {V:'BAZOU',J:["Ntàh'Lang","Kàp","Nkoekè","Nkoen","Ndion'Gwe","Mbù","Nkon","Ncoe"],M:["Muh'Nka","Nkah'Ngnia","Nti'Zzwè","Coe'Zwoe","Suh'Ngnia","Nwah'Nkou","Tu'Ngofi","Co'Zwe","Yaa'Zwe","Ku'u Suoe","Suh Ngnia Ndong","Ntun'Ku'u"],INT:["Kàp","Ndion'Gwe","Ncoe"],MKT:[],ROI:"Sa Majesté Marcelin Happy Tchoua",INFO:""},
  {V:'DSCHANG',J:[],M:[],INT:[],MKT:[],ROI:"Sa Majesté Guy Bertrand MOMO SOFFACK 1er",INFO:""},
  {V:'MBOUDA',J:[],M:[],INT:[],MKT:[],ROI:"",INFO:""}
];
 
function jIdx(d){const diff=Math.round((d-ANCHOR)/86400000);return((ANCHOR_J+diff%8+800)%8);}
function getV(n){return VILLAGES.find(v=>v.V===n)||null;}
function matchJ(jt,l){if(!jt||!l.length)return false;const a=jt.toLowerCase().trim();return l.some(i=>{const b=i.toLowerCase().trim();return a===b||a.includes(b)||b.includes(a);});}
function validEmail(e){return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);}
 
let showTrad=true;
const today=new Date();
let curY=today.getFullYear(),curM=today.getMonth()+1;
 
function init(){
  document.getElementById('ia').value=today.getFullYear();
  document.getElementById('im').value=today.getMonth()+1;
  document.getElementById('ia').addEventListener('change',render);
  document.getElementById('im').addEventListener('change',render);
  document.getElementById('iv').addEventListener('change',onVillageChange);
  document.getElementById('if2').addEventListener('change',render);
  document.getElementById('ifs').addEventListener('change',render);
  const p=new URLSearchParams(window.location.search);
  const uV=p.get('village'),uA=parseInt(p.get('annee')),uM=parseInt(p.get('mois'));
  if(uA>=1900&&uA<=2500)document.getElementById('ia').value=uA;
  if(uM>=1&&uM<=12)document.getElementById('im').value=uM;
  const sel=document.getElementById('iv');
  VILLAGES.forEach(v=>{const o=document.createElement('option');o.value=v.V;o.textContent=v.V+(v.J.length?' ✓':' ○');sel.appendChild(o);});
  sel.value=(uV&&VILLAGES.find(v=>v.V===uV))?uV:'BAZOU';
  window.addEventListener('keydown',e=>{if((e.ctrlKey||e.metaKey)&&e.key==='p'){e.preventDefault();demanderImpression();}});
  onVillageChange();
}
 
function onVillageChange(){
  const v=getV(document.getElementById('iv').value);
  const s=document.getElementById('if2');
  s.innerHTML='<option value="tous">— Tous —</option>';
  if(v&&v.J.length)v.J.forEach(j=>{const o=document.createElement('option');o.value=j;o.textContent=j;s.appendChild(o);});
  render();
}
 
function render(){
  const annee=parseInt(document.getElementById('ia').value)||curY;
  const mS=parseInt(document.getElementById('im').value)||curM;
  const vN=document.getElementById('iv').value;
  const fT=document.getElementById('if2').value;
  const fS=document.getElementById('ifs').value;
  curY=annee;curM=mS;
  let m2=mS+1,y2=annee,m3=mS+2;
  if(m2>12){m2-=12;y2++;}if(m3>12){m3-=12;}
  document.getElementById('mt-label').innerHTML=`${MFR[mS-1]} &middot; ${MFR[m2-1]} &middot; ${MFR[m3-1]} <span>${annee}</span>`;
  const vd=getV(vN),g=document.getElementById('trois-mois');
  g.innerHTML='';
  for(let mi=0;mi<3;mi++){let m=mS+mi,y=annee;while(m>12){m-=12;y++;}g.appendChild(buildBloc(y,m,vd,vN,fT,fS));}
  renderVP(vd);
}
 
function buildBloc(y,m,vd,vN,fT,fS){
  const bloc=document.createElement('div');bloc.className='bloc-mois';
  const mT=vd&&vd.M.length?vd.M[m-1]:'';
  bloc.innerHTML=`<div class="bloc-mois-hdr">${mT?`<span class="mtrad">${mT}</span>`:''}<span class="mgreg">${MFR[m-1]} ${y}</span></div><div class="sem-hdr">${SJOURS.map((s,i)=>`<div class="sh${i===6?' di':''}">${s}</div>`).join('')}</div><div class="jours-grid"></div><div class="print-watermark">© Calendrier du Village — Gilbert FONGA — fongagilbert@gmail.com</div>`;
  const jg=bloc.querySelector('.jours-grid');
  const rawFirst=new Date(y,m-1,1).getDay();const off=(rawFirst===0)?6:rawFirst-1;
  for(let i=0;i<off;i++){const e=document.createElement('div');e.className='dc empty';jg.appendChild(e);}
  for(let d=1;d<=new Date(y,m,0).getDate();d++){
    const date=new Date(y,m-1,d),rawDow=date.getDay(),dow=(rawDow===0)?6:rawDow-1,ji=jIdx(date);
    const jt=vd&&vd.J.length?vd.J[ji]:'',mTr=vd&&vd.M.length?vd.M[m-1]:'';
    const isInt=!!(vd&&matchJ(jt,vd.INT)),isMkt=!!(vd&&matchJ(jt,vd.MKT));
    const isToday=date.getFullYear()===today.getFullYear()&&date.getMonth()===today.getMonth()&&date.getDate()===today.getDate();
    const masque=(fT!=='tous'&&jt!==fT)||(fS==='interdits'&&!isInt)||(fS==='marche'&&!isMkt);
    let cls='dc';
    if(!masque){if(isToday)cls+=' today';else if(isInt)cls+=' interdit';else if(isMkt)cls+=' marche';}else cls+=' masked';
    if(dow===6)cls+=' di';
    const cell=document.createElement('div');cell.className=cls;
    cell.innerHTML=`<span class="dn">${d}</span>${showTrad&&jt?`<span class="dt">${jt}</span>`:''}`;
    if(!masque){let st='Jour ordinaire';if(isInt)st='🔴 Jour interdit';else if(isMkt)st='🟢 Jour de marché';if(isToday)st+=" · Aujourd'hui";cell.onclick=()=>openM(d,m,y,jt,mTr,vN,st,dow);}
    jg.appendChild(cell);
  }
  return bloc;
}
 
function renderVP(v){
  const p=document.getElementById('vp');
  if(!v){p.style.display='none';return;}
  p.style.display='block';
  document.getElementById('vn').textContent=v.V;
  document.getElementById('vr').textContent=v.ROI||'Roi non renseigné';
  document.getElementById('vj').innerHTML=v.J.length?v.J.map(j=>`<span class="itag itag-jour">${j}</span>`).join(''):'<span style="color:#ccc;font-size:12px">Données à compléter</span>';
  document.getElementById('vint').innerHTML=v.INT.length?v.INT.map(j=>`<span class="itag itag-int">${j}</span>`).join(''):'<span style="color:#ccc;font-size:12px">—</span>';
  document.getElementById('vmk').innerHTML=v.MKT.length?v.MKT.map(j=>`<span class="itag itag-mkt">${j}</span>`).join(''):'<span style="color:#ccc;font-size:12px">—</span>';
  document.getElementById('vinf').textContent=v.INFO||'—';
}
 
function nav(months){let m=parseInt(document.getElementById('im').value)+months,y=parseInt(document.getElementById('ia').value);while(m>12){m-=12;y++;}while(m<1){m+=12;y--;}document.getElementById('im').value=m;document.getElementById('ia').value=y;render();}
function navToday(){document.getElementById('ia').value=today.getFullYear();document.getElementById('im').value=today.getMonth()+1;render();}
function openM(d,m,y,trad,mT,village,statut,dow){document.getElementById('mg').textContent=d;document.getElementById('mgf').textContent=`${SFULL[dow]} ${d} ${MFR[m-1]} ${y}`;document.getElementById('mt2').textContent=trad||'—';document.getElementById('mm2').textContent=mT||'—';document.getElementById('mv2').textContent=village;document.getElementById('ms2').textContent=statut;document.getElementById('modal').classList.add('on');}
function closeM(){document.getElementById('modal').classList.remove('on');}
 
function demanderImpression(){
  document.getElementById('print-nom').value=localStorage.getItem('cv_print_nom')||'';
  document.getElementById('print-email').value=localStorage.getItem('cv_print_email')||'';
  document.getElementById('err-nom').textContent='';document.getElementById('err-email').textContent='';
  document.getElementById('print-nom').classList.remove('error');document.getElementById('print-email').classList.remove('error');
  document.getElementById('modal-print').classList.add('on');
  setTimeout(()=>document.getElementById('print-nom').focus(),100);
}
function fermerModalImpression(){document.getElementById('modal-print').classList.remove('on');}
function validerImpression(){
  const nom=document.getElementById('print-nom').value.trim();
  const email=document.getElementById('print-email').value.trim();
  const usage=document.getElementById('print-usage').value;
  let ok=true;
  if(!nom||nom.length<2){document.getElementById('err-nom').textContent='Veuillez saisir votre nom complet.';document.getElementById('print-nom').classList.add('error');ok=false;}
  else{document.getElementById('err-nom').textContent='';document.getElementById('print-nom').classList.remove('error');}
  if(!email||!validEmail(email)){document.getElementById('err-email').textContent='Veuillez saisir une adresse e-mail valide.';document.getElementById('print-email').classList.add('error');ok=false;}
  else{document.getElementById('err-email').textContent='';document.getElementById('print-email').classList.remove('error');}
  if(!ok)return;
  localStorage.setItem('cv_print_nom',nom);localStorage.setItem('cv_print_email',email);
  const village=document.getElementById('iv').value,annee=document.getElementById('ia').value;
  const mois=MFR[parseInt(document.getElementById('im').value)-1],ts=new Date().toLocaleString('fr-FR');
  const logs=JSON.parse(localStorage.getItem('cv_print_logs')||'[]');
  logs.push({nom,email,usage,village,periode:`${mois} ${annee}`,date:ts});
  localStorage.setItem('cv_print_logs',JSON.stringify(logs));
  fermerModalImpression();
  window._printAutorise=true;window.print();window._printAutorise=false;
}
 
function toggleTrad(){showTrad=!showTrad;document.getElementById('tbt').textContent=showTrad?'Masquer noms trad.':'Afficher noms trad.';render();}
function doShare(){const v=document.getElementById('iv').value,y=document.getElementById('ia').value,m=document.getElementById('im').value;const url=`https://fongagilbert-beep.github.io/calendrier-du-village/?village=${v}&annee=${y}&mois=${m}`;if(navigator.share){navigator.share({title:'Calendrier du Village',url});}else{navigator.clipboard.writeText(url).then(()=>alert('Lien copié ✓')).catch(()=>prompt('Copiez ce lien :',url));}}
function doCSV(){const v=getV(document.getElementById('iv').value),annee=parseInt(document.getElementById('ia').value),mS=parseInt(document.getElementById('im').value);let csv='Date,Numéro,Jour semaine,Nom trad.,Mois trad.,Interdit,Marché\n';for(let mi=0;mi<3;mi++){let m=mS+mi,y=annee;while(m>12){m-=12;y++;}for(let d=1;d<=new Date(y,m,0).getDate();d++){const date=new Date(y,m-1,d),ji=jIdx(date),jt=v&&v.J.length?v.J[ji]:'',mt=v&&v.M.length?v.M[m-1]:'';const isInt=v&&matchJ(jt,v.INT),isMkt=v&&matchJ(jt,v.MKT);csv+=`${d}/${m}/${y},${d},${SFULL[date.getDay()]},${jt},${mt},${isInt?'Oui':''},${isMkt?'Oui':''}\n`;}}const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8;'}));a.download=`calendrier_village_${annee}_${mS}.csv`;a.click();}
 
document.addEventListener('DOMContentLoaded',init);
