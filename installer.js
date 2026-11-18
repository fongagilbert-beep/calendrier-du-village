/* Installation du calendrier sur telephone - (c) Gilbert FONGA */
(function(){
  var ua=navigator.userAgent||'';
  var standalone=(window.matchMedia&&matchMedia('(display-mode: standalone)').matches)||navigator.standalone===true;
  if(standalone)return;
  var KEY='cv_install_masque';
  try{var t=parseInt(localStorage.getItem(KEY)||'0',10);if(t&&Date.now()-t<7*864e5)return;}catch(e){}
  var isIOS=/iPhone|iPad|iPod/.test(ua)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1);
  var isAndroid=/Android/i.test(ua);
  if(!isIOS&&!isAndroid)return;
  var inApp=/FBAN|FBAV|Instagram|Line\/|MicroMessenger|TikTok|wv\)/i.test(ua);
  var isSafari=isIOS&&/Safari/.test(ua)&&!/CriOS|FxiOS|EdgiOS|OPiOS/.test(ua)&&!inApp;
  var evt=null;

  var css=document.createElement('style');
  css.textContent='#cv-inst{position:fixed;left:10px;right:10px;bottom:10px;z-index:9999;background:#1A4A7A;color:#fff;'
   +'border-radius:14px;padding:12px 14px;box-shadow:0 4px 18px rgba(0,0,0,.35);font-family:Tahoma,Verdana,sans-serif;font-size:15px;line-height:1.4;max-width:520px;margin:0 auto}'
   +'#cv-inst b{display:block;font-size:16px;margin-bottom:4px}'
   +'#cv-inst ol{margin:6px 0 4px 20px;padding:0}#cv-inst li{margin:3px 0}'
   +'#cv-inst .r{display:flex;gap:8px;margin-top:8px;flex-wrap:wrap}'
   +'#cv-inst button{border:0;border-radius:9px;padding:9px 14px;font-size:15px;font-family:inherit;cursor:pointer}'
   +'#cv-inst .ok{background:#F5D58A;color:#4a1010;font-weight:700}'
   +'#cv-inst .no{background:rgba(255,255,255,.18);color:#fff}';
  document.head.appendChild(css);

  function fermer(){var e=document.getElementById('cv-inst');if(e)e.remove();try{localStorage.setItem(KEY,String(Date.now()));}catch(x){}}

  function montrer(){
    if(document.getElementById('cv-inst'))return;
    var d=document.createElement('div');d.id='cv-inst';d.setAttribute('role','dialog');
    var h='<b>\ud83d\udcf1 Installer le calendrier sur votre t\u00e9l\u00e9phone</b>';
    if(inApp){
      h+='Pour installer, ouvrez ce lien dans '+(isIOS?'<b style="display:inline">Safari</b>':'<b style="display:inline">Chrome</b>')+' (menu \u22ee ou bouton \u00ab Ouvrir dans le navigateur \u00bb).';
    }else if(evt){
      h+='Acc\u00e8s direct depuis l\'\u00e9cran d\'accueil, m\u00eame sans connexion.';
    }else if(isIOS){
      if(isSafari){h+='<ol><li>Touchez le bouton <b style="display:inline">Partager</b> (carr\u00e9 avec une fl\u00e8che \u2191)</li><li>Touchez <b style="display:inline">\u00ab Sur l\'\u00e9cran d\'accueil \u00bb</b></li><li>Touchez <b style="display:inline">Ajouter</b></li></ol>';}
      else{h+='Sur iPhone, ouvrez ce lien dans <b style="display:inline">Safari</b> pour pouvoir l\'installer.';}
    }else{
      h+='<ol><li>Touchez les <b style="display:inline">3 points \u22ee</b> en haut \u00e0 droite de Chrome</li><li>Touchez <b style="display:inline">\u00ab Installer l\'application \u00bb</b> ou <b style="display:inline">\u00ab Ajouter \u00e0 l\'\u00e9cran d\'accueil \u00bb</b></li></ol>';
    }
    h+='<div class="r">';
    if(evt&&!inApp)h+='<button class="ok" id="cv-go">Installer</button>';
    h+='<button class="no" id="cv-x">Plus tard</button></div>';
    d.innerHTML=h;document.body.appendChild(d);
    var x=document.getElementById('cv-x');if(x)x.onclick=fermer;
    var g=document.getElementById('cv-go');
    if(g)g.onclick=function(){evt.prompt();evt.userChoice.then(function(){evt=null;fermer();});};
  }

  window.addEventListener('beforeinstallprompt',function(e){e.preventDefault();evt=e;var o=document.getElementById('cv-inst');if(o)o.remove();montrer();});
  window.addEventListener('appinstalled',fermer);
  window.addEventListener('load',function(){setTimeout(montrer,2500);});
})();
