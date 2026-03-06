// Moteur JavaScript — Calendrier du Village (équivalent MOD_MOTEUR)
// Licence: usage interne Gilbert FONGA — 2026

function safeMod(a,b){let r=a%b; return r<0? r+b : r}

export class Moteur8J{
  constructor(dataset){
    this.globalAnchor = dataset.globalAnchor || {date:'2026-02-28', index:7};
    this.map = new Map();
    for(const [name, rec] of Object.entries(dataset.villages||{})){
      const key = name.trim().toUpperCase();
      this.map.set(key, {
        dayNames: rec.dayNames.slice(0,8),
        nameToIdx: buildNameIndex(rec.dayNames),
        monthNames: rec.monthNames.slice(0,12),
        forbidden: (rec.forbidden||[]).slice(0,3),
        market: (rec.market||[]).slice(0,3),
        king: rec.king||'',
        marketLabels: rec.marketLabels||[],
        info: rec.info||'',
        anchorDate: rec.anchorDate||null,
        anchorIndex: rec.anchorIndex||null,
      });
    }
  }
  hasVillage(v){return this.map.has(v.trim().toUpperCase())}
  getRec(v){return this.map.get(v.trim().toUpperCase())}

  // Convertit une date -> index J (1..8)
  jIndex(village, dt){
    const rec = this.getRec(village); if(!rec) return 0;
    const aDate = new Date(rec.anchorDate || this.globalAnchor.date);
    const aIdx  = Number(rec.anchorIndex || this.globalAnchor.index);
    const diffDays = Math.floor((toUtcDate(dt) - toUtcDate(aDate)) / 86400000);
    return safeMod(diffDays + (aIdx-1), 8) + 1;
  }
  jName(village, dt){
    const idx = this.jIndex(village, dt); if(!idx) return '';
    const rec = this.getRec(village); return rec.dayNames[idx-1]||'';
  }
  getJNameFromIndex(village, jIndex){
    const rec = this.getRec(village); if(!rec) return '';
    return rec.dayNames[(jIndex-1)|0]||'';
  }
  getTradMonthName(village, m){
    const rec = this.getRec(village); if(!rec) return '';
    if(m<1||m>12) return '';
    return rec.monthNames[m-1]||'';
  }
  getForbidden(village){
    const rec = this.getRec(village); return rec? rec.forbidden : [0,0,0];
  }
  isForbidden(village, jToken){
    const rec = this.getRec(village); if(!rec) return false;
    const idx = this.resolveJIndex(village, jToken); if(!idx) return false;
    const fb = rec.forbidden||[]; return fb.includes(idx);
  }
  getMarkets(village){
    const rec = this.getRec(village); return rec? rec.market : [0,0,0];
  }
  isMarket(village, jToken){
    const rec = this.getRec(village); if(!rec) return false;
    const idx = this.resolveJIndex(village, jToken); if(!idx) return false;
    const mk = rec.market||[]; return mk.includes(idx);
  }
  nextByPredicate(village, dt, predicate, forward=true, includeStart=false){
    const step = forward? 1 : -1;
    for(let k=0;k<=8;k++){
      if(k===0 && !includeStart) continue;
      const d = addDays(dt, step*k);
      if(predicate(this, village, d)) return d;
    }
    return null;
  }
  nextForbidden(village, dt, forward=true, includeStart=false){
    return this.nextByPredicate(village, dt, (self,v,d)=> self.isForbidden(v, d), forward, includeStart);
  }
  nextMarket(village, dt, forward=true, includeStart=false){
    return this.nextByPredicate(village, dt, (self,v,d)=> self.isMarket(v, d), forward, includeStart);
  }
  resolveJIndex(village, token){
    if(token==null) return 0;
    if(typeof token === 'number') return (token>=1&&token<=8)? token:0;
    if(token instanceof Date) return this.jIndex(village, token);
    const s = String(token).trim().toUpperCase();
    if(/^J[1-8]$/.test(s)) return Number(s.substring(1));
    const rec = this.getRec(village); if(!rec) return 0;
    return rec.nameToIdx.get(s)||0;
  }
}

function buildNameIndex(dayNames){
  const m = new Map();
  dayNames.forEach((nm,i)=>{ if(!nm) return; m.set(String(nm).trim().toUpperCase(), i+1); });
  for(let i=1;i<=8;i++) m.set('J'+i, i);
  return m;
}

function toUtcDate(d){
  const x = (d instanceof Date)? d : new Date(d);
  return Date.UTC(x.getFullYear(), x.getMonth(), x.getDate());
}
function addDays(d, n){ const x = new Date(d); x.setDate(x.getDate()+n); return x }

export function dayNameFr(dt){
  const intl = new Intl.DateTimeFormat('fr-FR', {weekday:'long'});
  return intl.format(dt);
}
