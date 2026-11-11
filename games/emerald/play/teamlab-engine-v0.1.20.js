/* TEAMLAB Emerald v0.1.20
 * Pure read-only analysis helpers. No emulator/save writes.
 * Mechanical inputs come from teamlab-emerald-v0.1.20.json.
 */
(function(root,factory){
  const api=factory();
  if(typeof module!=='undefined'&&module.exports) module.exports=api;
  root.TeamLabEngine=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  const STAT_KEYS=['hp','atk','def','spa','spd','spe'];
  const PHYSICAL_TYPES=new Set(['Normal','Fighting','Flying','Poison','Ground','Rock','Bug','Ghost','Steel']);
  const MOVE_CONST={
    SUB:'MOVE_SUBSTITUTE',SEED:'MOVE_LEECH_SEED',BATON:'MOVE_BATON_PASS',SD:'MOVE_SWORDS_DANCE',CM:'MOVE_CALM_MIND',DD:'MOVE_DRAGON_DANCE',BU:'MOVE_BULK_UP',BD:'MOVE_BELLY_DRUM',AGI:'MOVE_AGILITY',
    RAIN:'MOVE_RAIN_DANCE',SUN:'MOVE_SUNNY_DAY',SPIKES:'MOVE_SPIKES',SPIN:'MOVE_RAPID_SPIN',ROAR:'MOVE_ROAR',WHIRL:'MOVE_WHIRLWIND',RECOVER:'MOVE_RECOVER',WISH:'MOVE_WISH',REST:'MOVE_REST',SLEEPTALK:'MOVE_SLEEP_TALK',
    TWAVE:'MOVE_THUNDER_WAVE',WISP:'MOVE_WILL_O_WISP',SPORE:'MOVE_SPORE',SLEEPPOWDER:'MOVE_SLEEP_POWDER',TOXIC:'MOVE_TOXIC',FOCUSPUNCH:'MOVE_FOCUS_PUNCH'
  };
  const escapeRe=s=>String(s).replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
  const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
  const unique=a=>[...new Set(a)];
  const record=(data,dex)=>data?.species?.[String(Number(dex))]||null;
  const moveByConst=(data,c)=>{const id=data?.moveConstants?.[c];return id!=null?data.moves?.[String(id)]||null:null;};
  const moveConstById=(data,id)=>{id=Number(id);for(const [c,n] of Object.entries(data?.moveConstants||{}))if(Number(n)===id)return c;return null;};

  function typeMultiplier(data,attackType,defTypes){
    let x=1; for(const d of unique(defTypes||[])) x*=Number(data?.typeChart?.[attackType]?.[d]??1); return x;
  }
  function weaknessProfile(data,r){
    const out={}; for(const t of data.types||[]) out[t]=typeMultiplier(data,t,r?.types||[]); return out;
  }
  function stabTargetTypes(data,r){
    const s=new Set(); for(const atk of r?.types||[]) for(const def of data.types||[]) if(Number(data.typeChart?.[atk]?.[def]??1)>1)s.add(def); return s;
  }
  function terminalRecords(data){ return Object.values(data?.species||{}).filter(r=>!r.evolutions?.length); }
  function finalRecords(data,r){ return (r?.finalSpecies||[]).map(d=>record(data,d)).filter(Boolean); }
  function projectedRecord(data,specimen){
    const cur=record(data,specimen?.dexNo); if(!cur)return null;
    const finals=finalRecords(data,cur); if(!finals.length)return cur;
    // For a branch, prefer the best historical tier only as a deterministic display default.
    const tierWeight={Uber:9,OU:8,UUBL:7,UU:6,RUBL:5,RU:5,NUBL:4,NU:4,PUBL:3,PU:3,ZUBL:2,ZU:2,NFE:1,LC:1,'—':0};
    return finals.slice().sort((a,b)=>(tierWeight[b.tier]||0)-(tierWeight[a.tier]||0)||b.stats?.spe-a.stats?.spe)[0];
  }
  function pathToFinal(data,currentDex,finalDex){
    const start=record(data,currentDex); if(!start)return [];
    const seen=new Set();
    function walk(r,path){
      if(!r||seen.has(r.dex))return null;
      if(Number(r.dex)===Number(finalDex))return [...path,r];
      seen.add(r.dex);
      for(const e of r.evolutions||[]){const hit=walk(record(data,e.targetDex),[...path,r]);if(hit)return hit;}
      seen.delete(r.dex);return null;
    }
    return walk(start,[])||[start];
  }
  function evolutionLabel(e){
    const m=e?.method||''; const p=e?.paramLabel||e?.param||'';
    if(m==='EVO_LEVEL')return `Lv${p}`;
    if(m==='EVO_TRADE')return 'Trade';
    if(m==='EVO_TRADE_ITEM')return `Trade · ${p}`;
    if(m==='EVO_ITEM')return `${p}`;
    if(m.includes('FRIENDSHIP'))return m.includes('DAY')?'Friendship · day':m.includes('NIGHT')?'Friendship · night':'Friendship';
    if(m==='EVO_LEVEL_NINJASK')return `Lv${p} · Ninjask branch`;
    if(m==='EVO_LEVEL_SHEDINJA')return `Lv${p} · empty party slot + Poké Ball`;
    if(m==='EVO_LEVEL_SILCOON'||m==='EVO_LEVEL_CASCOON')return `Lv${p} · personality branch`;
    if(m==='EVO_BEAUTY')return `Beauty ≥ ${p}`;
    return `${e?.methodLabel||m.replace(/^EVO_/,'').replaceAll('_',' ')}${p&&p!=='0'?` · ${p}`:''}`;
  }
  function evolutionBranches(data,r){
    const finals=finalRecords(data,r);
    return finals.map(f=>({final:f,path:pathToFinal(data,r.dex,f.dex)}));
  }

  function sourceText(data,src,moveConst){
    if(!src)return '';
    if(src.kind==='level')return `Lv${src.level}${src.speciesName?` · ${src.speciesName}`:''}`;
    if(src.kind==='machine')return `${src.label||'TM/HM'}${src.speciesName?` · ${src.speciesName}`:''}`;
    if(src.kind==='tutor'){
      let loc=String(src.location||'Emerald tutor').replace(/([a-z])([A-Z])/g,'$1 $2').replace(/\s+/g,' ').trim();
      return `${src.label||'Tutor'} · ${loc}`;
    }
    if(src.kind==='egg'){
      const base=record(data,src.speciesDex);
      const parents=base?.breedingParents?.[moveConst]||[];
      return parents.length?`Egg · ${base.name} · father: ${parents.slice(0,3).map(p=>p.name).join(' / ')}`:`Egg · ${base?.name||src.speciesName||'base species'}`;
    }
    return src.kind;
  }
  function bestSource(data,moveEntry){
    const order={level:0,machine:1,tutor:2,egg:3};
    const sources=(moveEntry?.sources||[]).slice().sort((a,b)=>(order[a.kind]??9)-(order[b.kind]??9)||(a.level??999)-(b.level??999));
    return sources[0]||null;
  }
  function familyMoveConsts(r){return new Set((r?.familyMoves?.length?r.familyMoves:(r?.competitiveMoves||[]).map(x=>x.move))||[]);}
  function hasMove(r,c){return familyMoveConsts(r).has(c);}
  function hasArchetype(r,needle){return (r?.archetypes||[]).some(a=>a.label.toLowerCase().includes(needle.toLowerCase()));}

  function moveUsefulness(data,r,moveConst,specimen){
    const m=moveByConst(data,moveConst); if(!m)return {score:0,label:'UTILITY'};
    const entry=(r?.competitiveMoves||[]).find(x=>x.move===moveConst);
    let score=Number(entry?.score||0), type=m.type, category=m.category, power=Number(m.power||0), accuracy=Number(m.accuracy||0);
    if(moveConst==='MOVE_HIDDEN_POWER'&&specimen?.hiddenPower?.type){
      type=specimen.hiddenPower.type; power=Number(specimen.hiddenPower.power||0); category=PHYSICAL_TYPES.has(type)?'Physical':'Special'; accuracy=100;
    }
    if(category!=='Status'){
      const stat=category==='Physical'?r.stats?.atk:r.stats?.spa;
      const statFit=clamp((Number(stat||50)-50)/100,0,1);
      const stab=(r.types||[]).includes(type);
      score=power*(0.45+0.45*statFit)*(accuracy?Math.min(accuracy,100)/100:1)+(stab?26:0);
      if(m.effect==='EFFECT_RECHARGE')score-=42;
      if(['EFFECT_SOLARBEAM','EFFECT_RAZOR_WIND','EFFECT_SKY_ATTACK'].includes(m.effect)&&!hasArchetype(r,'sun'))score-=24;
      if(accuracy&&accuracy<80)score-=8;
      if(m.effect==='EFFECT_HIGH_CRITICAL')score+=9;
      if(moveConst==='MOVE_HIDDEN_POWER'&&power>=65)score+=10;
    }
    if(['MOVE_SUBSTITUTE','MOVE_LEECH_SEED','MOVE_BATON_PASS','MOVE_SPORE','MOVE_SPIKES','MOVE_RAPID_SPIN','MOVE_RECOVER','MOVE_DRAGON_DANCE','MOVE_SWORDS_DANCE','MOVE_CALM_MIND'].includes(moveConst))score=Math.max(score,96);
    else if(category==='Status')score=Math.max(score,entry?.score||72);
    const label=score>=95?'CORE':score>=82?'HIGH':score>=68?'GOOD':'NICHE';
    return {score:Math.round(score*10)/10,label,type,category,power,accuracy};
  }

  function pathTiming(data,path,currentLevel){
    const rows=[];
    for(let i=0;i<path.length;i++){
      const stage=path[i]; let entry=i===0?Number(currentLevel||1):rows[i-1].exit;
      let exit=Infinity,edge=null;
      if(i<path.length-1){edge=(stage.evolutions||[]).find(e=>Number(e.targetDex)===Number(path[i+1].dex))||null;
        if(edge?.method==='EVO_LEVEL'||edge?.method?.startsWith('EVO_LEVEL_')) exit=Number(edge.param)||entry;
        else exit=Math.max(entry,1);
      }
      rows.push({stage,entry,exit,edge});
    }
    return rows;
  }
  function acquisitionRank(src,timing,currentLevel){
    if(!src)return {bucket:99,detail:''};
    if(src.kind==='machine')return {bucket:2,detail:'machine'};
    if(src.kind==='tutor')return {bucket:3,detail:'tutor'};
    if(src.kind==='egg')return {bucket:6,detail:'breed a new specimen'};
    if(src.kind!=='level')return {bucket:9,detail:src.kind};
    const t=timing.find(x=>Number(x.stage.dex)===Number(src.speciesDex));
    if(!t)return {bucket:8,detail:'other family stage'};
    const lvl=Number(src.level||1);
    if(Number(t.stage.dex)===Number(timing[0]?.stage.dex)&&lvl<Number(currentLevel||1))return {bucket:7,detail:'already passed; Move Reminder'};
    if(lvl<t.entry)return {bucket:4,detail:'Move Reminder after evolution'};
    if(lvl<=t.exit)return {bucket:1,detail:'natural level-up'};
    return {bucket:5,detail:'delay evolution'};
  }
  function bestAcquisitionSource(data,specimen,final,entry){
    const cur=record(data,specimen?.dexNo); if(!cur)return bestSource(data,entry);
    const path=pathToFinal(data,cur.dex,final.dex),timing=pathTiming(data,path,specimen?.level||1);
    return (entry?.sources||[]).slice().sort((a,b)=>{
      const aa=acquisitionRank(a,timing,specimen?.level||1),bb=acquisitionRank(b,timing,specimen?.level||1);
      return aa.bucket-bb.bucket||(a.level??999)-(b.level??999);
    })[0]||null;
  }
  function acquisitionNote(data,specimen,final,src){
    const cur=record(data,specimen?.dexNo); if(!cur||!src)return '';
    const path=pathToFinal(data,cur.dex,final.dex),timing=pathTiming(data,path,specimen?.level||1);
    return acquisitionRank(src,timing,specimen?.level||1).detail||'';
  }


  function futureStabRoadmap(data,specimen,finalDex){
    const cur=record(data,specimen?.dexNo), final=record(data,finalDex)||projectedRecord(data,specimen); if(!cur||!final)return [];
    const path=pathToFinal(data,cur.dex,final.dex), timing=pathTiming(data,path,specimen?.level||1), pathDex=new Set(path.map(x=>Number(x.dex)));
    const rows=[];
    for(const entry of final.competitiveMoves||[]){
      const m=moveByConst(data,entry.move); if(!m||m.category==='Status'||!final.types?.includes(m.type))continue;
      const worth=moveUsefulness(data,final,entry.move,specimen); if(worth.score<52)continue;
      const sources=(entry.sources||[]).filter(src=>!src.speciesDex||pathDex.has(Number(src.speciesDex)));
      if(!sources.length)continue;
      const ranked=sources.map(src=>({src,rank:acquisitionRank(src,timing,specimen?.level||1)})).sort((a,b)=>a.rank.bucket-b.rank.bucket||(a.src.level??999)-(b.src.level??999));
      const chosen=ranked[0]; if(!chosen)continue;
      rows.push({stage:record(data,chosen.src.speciesDex)||final,level:chosen.src.kind==='level'?chosen.src.level:null,moveConst:entry.move,move:m,worth,source:chosen.src,routeNote:chosen.rank.detail});
    }
    return rows.sort((a,b)=>{
      const ar=acquisitionRank(a.source,timing,specimen?.level||1).bucket, br=acquisitionRank(b.source,timing,specimen?.level||1).bucket;
      return ar-br||((a.level??999)-(b.level??999))||(b.worth.score-a.worth.score);
    }).slice(0,8);
  }

  function competitiveUnlocks(data,specimen,finalDex){
    const final=record(data,finalDex)||projectedRecord(data,specimen); if(!final)return [];
    const required=new Set(); for(const a of final.archetypes||[])for(const m of a.moves||[])required.add(m);
    ['MOVE_LEAF_BLADE','MOVE_EARTHQUAKE','MOVE_THUNDERBOLT','MOVE_ICE_BEAM','MOVE_SURF','MOVE_PSYCHIC','MOVE_SLUDGE_BOMB','MOVE_ROCK_SLIDE','MOVE_HIDDEN_POWER','MOVE_SUBSTITUTE','MOVE_LEECH_SEED','MOVE_BATON_PASS'].forEach(m=>{if(hasMove(final,m))required.add(m);});
    const all=(final.competitiveMoves||[]).map(entry=>{
      const m=moveByConst(data,entry.move),worth=moveUsefulness(data,final,entry.move,specimen),source=bestAcquisitionSource(data,specimen,final,entry); return {entry,moveConst:entry.move,move:m,worth,source,routeNote:acquisitionNote(data,specimen,final,source)};
    }).filter(x=>x.move&&(required.has(x.moveConst)||x.worth.score>=86));
    all.sort((a,b)=>(required.has(b.moveConst)-required.has(a.moveConst))||(b.worth.score-a.worth.score));
    return all.slice(0,12);
  }


  function offensiveCoverageSpecies(data,team){
    const terminals=terminalRecords(data); if(!team.length)return {covered:0,total:terminals.length,pct:0};
    let covered=0;
    for(const foe of terminals){
      let hit=false;
      for(const mon of team){for(const t of mon.types||[]) if(typeMultiplier(data,t,foe.types)>1){hit=true;break;} if(hit)break;}
      if(hit)covered++;
    }
    return {covered,total:terminals.length,pct:terminals.length?Math.round(covered*1000/terminals.length)/10:0};
  }

  function pairFit(data,a,b){
    if(!a||!b)return {score:-99,label:'—',reasons:[],risks:[],components:{}};
    const wa=weaknessProfile(data,a), wb=weaknessProfile(data,b); let def=0; const reasons=[],risks=[];
    const aCovered=[],bCovered=[],shared=[];
    for(const t of data.types||[]){
      if(wa[t]>1&&wb[t]<1){def+=2;aCovered.push(t);} if(wb[t]>1&&wa[t]<1){def+=2;bCovered.push(t);} if(wa[t]>1&&wb[t]>1){def-=2.4;shared.push(t);}
    }
    if(aCovered.length)reasons.push(`${b.name} covers ${a.name}'s ${aCovered.slice(0,3).join('/')} weakness${aCovered.length>1?'es':''}.`);
    if(bCovered.length)reasons.push(`${a.name} covers ${b.name}'s ${bCovered.slice(0,3).join('/')} weakness${bCovered.length>1?'es':''}.`);
    if(shared.length)risks.push(`Shared weakness: ${shared.slice(0,4).join(', ')}.`);

    const oa=stabTargetTypes(data,a), ob=stabTargetTypes(data,b), union=new Set([...oa,...ob]); const off=union.size-Math.max(oa.size,ob.size);
    if(off>=2)reasons.push(`STABs expand super-effective type reach by ${off} target types.`);

    let stat=0;
    if((a.stats?.spa>=100&&b.stats?.atk>=105)||(b.stats?.spa>=100&&a.stats?.atk>=105)){stat+=2;reasons.push('Adds physical/special pressure instead of duplicating one damage axis.');}
    if((a.stats?.def<75&&b.stats?.def>=105)||(b.stats?.def<75&&a.stats?.def>=105)){stat+=1.5;reasons.push('Physical-bulk profile complements the frailer partner.');}
    if((a.stats?.spd<75&&b.stats?.spd>=105)||(b.stats?.spd<75&&a.stats?.spd>=105)){stat+=1.2;reasons.push('Special-bulk profile covers a softer side of the core.');}

    let synergy=0;
    const aBaton=hasMove(a,MOVE_CONST.BATON), bBaton=hasMove(b,MOVE_CONST.BATON);
    if(aBaton&&(hasMove(a,MOVE_CONST.SD)||a.abilities?.includes('Speed Boost'))&&b.stats?.atk>=100){synergy+=4;reasons.push(`${b.name} can cash in Attack/Speed Baton Pass value from ${a.name}.`);}
    if(bBaton&&(hasMove(b,MOVE_CONST.SD)||b.abilities?.includes('Speed Boost'))&&a.stats?.atk>=100){synergy+=4;reasons.push(`${a.name} can cash in Attack/Speed Baton Pass value from ${b.name}.`);}
    if(hasArchetype(a,'rain')&&hasArchetype(b,'rain')){synergy+=2;reasons.push('Both participate in a Rain game plan.');}
    if(hasArchetype(a,'sun')&&hasArchetype(b,'sun')){synergy+=2;reasons.push('Both participate in a Sun game plan.');}
    if(hasArchetype(a,'subseed')&&(hasMove(b,MOVE_CONST.SPIKES)||b.stats?.def>=110)){synergy+=1.5;reasons.push('Forced switches / seed pressure can feed a bulk or hazard partner.');}
    if(hasArchetype(b,'subseed')&&(hasMove(a,MOVE_CONST.SPIKES)||a.stats?.def>=110)){synergy+=1.5;reasons.push('Forced switches / seed pressure can feed a bulk or hazard partner.');}

    const sameArch=(a.archetypes||[]).map(x=>x.label).filter(x=>(b.archetypes||[]).some(y=>y.label===x)); let overlap=0;
    if(sameArch.length>=3){overlap=-1.5;risks.push('Some role overlap: '+sameArch.slice(0,2).join(', ')+'.');}
    const score=def+off*0.8+stat+synergy+overlap;
    const label=score>=9?'EXCELLENT':score>=6?'STRONG':score>=3?'USEFUL':score>=0?'LOOSE':'RISKY';
    return {score:Math.round(score*10)/10,label,reasons:unique(reasons).slice(0,5),risks:unique(risks).slice(0,4),components:{defensive:Math.round(def*10)/10,offensive:off,stat:Math.round(stat*10)/10,synergy:Math.round(synergy*10)/10}};
  }

  function teamRoles(team){
    const roles=new Set();
    for(const r of team){
      if(hasMove(r,MOVE_CONST.SPIKES))roles.add('Spikes');
      if(hasMove(r,MOVE_CONST.SPIN))roles.add('Rapid Spin');
      if(hasMove(r,MOVE_CONST.ROAR)||hasMove(r,MOVE_CONST.WHIRL))roles.add('Phazing');
      if(hasMove(r,MOVE_CONST.BATON))roles.add('Baton Pass');
      if(hasArchetype(r,'rain'))roles.add('Rain');
      if(hasArchetype(r,'sun'))roles.add('Sun');
      if(hasMove(r,MOVE_CONST.RECOVER)||hasMove(r,MOVE_CONST.WISH)||hasMove(r,MOVE_CONST.REST))roles.add('Recovery');
      if(hasMove(r,MOVE_CONST.SPORE)||hasMove(r,MOVE_CONST.SLEEPPOWDER)||hasMove(r,MOVE_CONST.TWAVE)||hasMove(r,MOVE_CONST.WISP)||hasMove(r,MOVE_CONST.TOXIC))roles.add('Status');
      if(r.stats?.atk>=110)roles.add('Physical pressure');
      if(r.stats?.spa>=110)roles.add('Special pressure');
      if(r.stats?.spe>=110||r.abilities?.includes('Speed Boost')||hasMove(r,MOVE_CONST.DD)||hasMove(r,MOVE_CONST.AGI))roles.add('Speed plan');
      if(r.stats?.def>=110)roles.add('Physical bulk');
      if(r.stats?.spd>=110)roles.add('Special bulk');
    }
    return roles;
  }
  function teamFabric(data,team){
    team=(team||[]).filter(Boolean); const rows=[];
    for(const t of data.types||[]){let weak=0,resist=0,immune=0;for(const r of team){const x=typeMultiplier(data,t,r.types);if(x===0)immune++;else if(x<1)resist++;else if(x>1)weak++;}rows.push({type:t,weak,resist,immune});}
    const shared=rows.filter(x=>x.weak>=Math.max(3,Math.ceil(team.length/2))).sort((a,b)=>b.weak-a.weak);
    const roles=teamRoles(team); const gaps=[];
    if(!roles.has('Physical pressure'))gaps.push('No high-base-Attack physical pressure.');
    if(!roles.has('Special pressure'))gaps.push('No high-base-SpA special pressure.');
    if(!roles.has('Speed plan'))gaps.push('No obvious fast/boosted Speed plan.');
    if(!roles.has('Physical bulk'))gaps.push('No obvious physical-bulk anchor.');
    if(!roles.has('Special bulk'))gaps.push('No obvious special-bulk anchor.');
    if(!roles.has('Spikes'))gaps.push('No Spikes route detected.');
    if(!roles.has('Rapid Spin'))gaps.push('No Rapid Spin route detected.');
    const coverage=offensiveCoverageSpecies(data,team);
    const weather={rain:team.filter(x=>hasArchetype(x,'rain')).length,sun:team.filter(x=>hasArchetype(x,'sun')).length};
    const plan=[];
    if(weather.rain>=2)plan.push(`Rain core detected (${weather.rain} participants).`);
    if(weather.sun>=2)plan.push(`Sun core detected (${weather.sun} participants).`);
    if(roles.has('Baton Pass'))plan.push('Baton Pass handoff route detected.');
    if(roles.has('Spikes')&&roles.has('Phazing'))plan.push('Spikes + forced-switch pressure can form a coherent chip plan.');
    if(roles.has('Status'))plan.push('Status can manufacture turns for setup, recovery or switches.');
    return {rows,shared,roles:[...roles],gaps:gaps.slice(0,6),coverage,weather,plan,slots:team.length};
  }

  function sub101(specimen,finalRecord){
    if(!specimen||!finalRecord)return null; const base=Number(finalRecord.stats?.hp||0); if(base<=1)return {eligible:false,reason:'Fixed 1 HP species.'};
    const iv=Number(specimen.ivs?.hp??0),ev=Number(specimen.evs?.hp??0);
    // Gen III Lv100 HP = 2*Base + IV + floor(EV/4) + 110.
    const noEv=2*base+iv+110, projected=noEv+Math.floor(ev/4), sub=Math.floor(projected/4);
    const quarters=Math.max(0,404-noEv), minEv=quarters<=63?quarters*4:null, achievable=minEv!==null;
    return {eligible:sub>=101,projectedHP:projected,subHP:sub,minEv, currentEv:ev,additionalEv:achievable?Math.max(0,minEv-ev):null,achievable};
  }

  function structuralCandidates(data,specimen,limit=6,tiers=null){
    const a=projectedRecord(data,specimen); if(!a)return [];
    const allowed=tiers?new Set(tiers):null;
    return terminalRecords(data).filter(b=>Number(b.dex)!==Number(a.dex)&&b.tier!=='Uber'&&(!allowed||allowed.has(b.tier))).map(b=>({record:b,fit:pairFit(data,a,b)})).sort((x,y)=>y.fit.score-x.fit.score||Number(x.record.dex)-Number(y.record.dex)).slice(0,limit);
  }
  function nextSlotCandidates(data,team,limit=6){
    team=(team||[]).filter(Boolean); if(!team.length)return [];
    const before=teamFabric(data,team), beforeRoles=new Set(before.roles), used=new Set(team.map(x=>Number(x.dex)));
    const sharedTypes=new Set(before.shared.map(x=>x.type));
    return terminalRecords(data).filter(c=>!used.has(Number(c.dex))&&c.tier!=='Uber').map(c=>{
      const fits=team.map(t=>pairFit(data,t,c)), avg=fits.reduce((a,x)=>a+x.score,0)/fits.length;
      const after=teamFabric(data,[...team,c]); const coverageDelta=after.coverage.pct-before.coverage.pct;
      const cr=weaknessProfile(data,c); let sharedCover=0; for(const t of sharedTypes)if(cr[t]<1)sharedCover+=1;
      const cRoles=teamRoles([c]), addedRoles=[...cRoles].filter(x=>!beforeRoles.has(x));
      const score=avg+coverageDelta*.12+sharedCover*1.5+Math.min(addedRoles.length,3)*.6;
      const reasons=[];
      if(sharedCover)reasons.push(`Resists/blocks ${sharedCover} current shared-pressure type${sharedCover>1?'s':''}.`);
      if(coverageDelta>0)reasons.push(`Adds ${Math.round(coverageDelta*10)/10} points of STAB SE reach.`);
      if(addedRoles.length)reasons.push(`Adds ${addedRoles.slice(0,3).join(', ')}.`);
      const best=fits.slice().sort((a,b)=>b.score-a.score)[0]; if(best?.reasons?.[0])reasons.push(best.reasons[0]);
      return {record:c,score:Math.round(score*10)/10,reasons:unique(reasons).slice(0,4),pairAverage:Math.round(avg*10)/10,coverageDelta:Math.round(coverageDelta*10)/10,addedRoles};
    }).sort((a,b)=>b.score-a.score||Number(a.record.dex)-Number(b.record.dex)).slice(0,limit);
  }


  function partnerRanking(data,specimen,party){
    const a=projectedRecord(data,specimen); if(!a)return [];
    return (party||[]).filter(Boolean).filter(x=>x!==specimen&&x.personality!==specimen.personality).map(x=>{const b=projectedRecord(data,x);return {specimen:x,record:b,fit:pairFit(data,a,b)};}).filter(x=>x.record).sort((x,y)=>y.fit.score-x.fit.score);
  }

  return {STAT_KEYS,MOVE_CONST,record,moveByConst,moveConstById,typeMultiplier,weaknessProfile,stabTargetTypes,terminalRecords,finalRecords,projectedRecord,pathToFinal,evolutionLabel,evolutionBranches,sourceText,bestSource,bestAcquisitionSource,acquisitionNote,hasMove,hasArchetype,moveUsefulness,futureStabRoadmap,competitiveUnlocks,offensiveCoverageSpecies,pairFit,teamRoles,teamFabric,sub101,structuralCandidates,nextSlotCandidates,partnerRanking};
});
