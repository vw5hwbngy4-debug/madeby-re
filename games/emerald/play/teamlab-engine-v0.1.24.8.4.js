/* TEAMLAB Emerald v0.1.21.1
 * Pure read-only analysis helpers. No emulator/save writes.
 * Mechanical inputs come from teamlab-emerald-v0.1.21.json.
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
  function hiddenPowerProfile(r,specimen=null){
    const hp=specimen?.hiddenPower||r?.hiddenPower||null;
    if(!hp?.type)return null;
    const type=String(hp.type),power=Number(hp.power||0),category=PHYSICAL_TYPES.has(type)?'Physical':'Special';
    return {type,power,category};
  }

  // Gen III damage category is type-based, not move-based.
  // Physical: Normal/Fighting/Flying/Poison/Ground/Rock/Bug/Ghost/Steel.
  // All other damaging types are Special. Hidden Power inherits its rolled type.
  function gen3Category(type){return PHYSICAL_TYPES.has(String(type||''))?'Physical':'Special';}
  function moveAccuracyFactor(m){const a=Number(m?.accuracy||0);return !a?1:clamp(a/100,0,1);}
  function moveTempoFactor(m){
    const e=String(m?.effect||'');
    if(e==='EFFECT_RECHARGE')return .55;
    if(e==='EFFECT_SEMI_INVULNERABLE')return .55;
    if(['EFFECT_SOLARBEAM','EFFECT_RAZOR_WIND','EFFECT_SKY_ATTACK'].includes(e))return .55;
    if(['EFFECT_EXPLOSION','EFFECT_SELF_DESTRUCT'].includes(e))return .68;
    return 1;
  }
  function stabCandidate(r,moveConst,m,{type=null,power=null,name=null,potential=false,exact=false}={}){
    type=type||m?.type; power=Number((power??m?.power)||0); if(!type||power<=0||!r?.types?.includes(type))return null;
    const category=gen3Category(type),statKey=category==='Physical'?'atk':'spa',stat=Number(r?.stats?.[statKey]||0),stabBp=power*1.5;
    const accuracy=potential?100:Number(m?.accuracy||0),accuracyFactor=potential?1:moveAccuracyFactor(m),tempoFactor=potential?1:moveTempoFactor(m);
    // Pressure index is a transparent neutral-target comparison, not a damage calc:
    // STAB-adjusted BP × relevant base offensive stat / 100 × accuracy × tempo.
    const pressure=stabBp*stat/100*accuracyFactor*tempoFactor;
    return {moveConst,name:name||m?.name||moveConst,type,category,power,stabBp:Math.round(stabBp*10)/10,statKey,stat,accuracy:accuracy||100,accuracyFactor,tempoFactor,pressure:Math.round(pressure*10)/10,potential,exact,effect:m?.effect||''};
  }
  function stabProfile(data,r,specimen=null,mode='species'){
    if(!r)return {axis:'—',best:null,bestPhysical:null,bestSpecial:null,candidates:[]};
    const candidates=[];
    for(const c of familyMoveConsts(r)){
      if(c==='MOVE_HIDDEN_POWER')continue;
      const m=moveByConst(data,c); if(!m||m.category==='Status'||!r.types?.includes(m.type)||Number(m.power||0)<=0)continue;
      const x=stabCandidate(r,c,m); if(x)candidates.push(x);
    }
    const hpEntry=familyMoveConsts(r).has('MOVE_HIDDEN_POWER')?moveByConst(data,'MOVE_HIDDEN_POWER'):null;
    if(hpEntry){
      if(mode==='species'){
        for(const type of r.types||[]){if(type==='Normal')continue;const x=stabCandidate(r,'MOVE_HIDDEN_POWER',hpEntry,{type,power:70,name:`Hidden Power ${type}`,potential:true});if(x)candidates.push(x)}
      } else {
        const hp=hiddenPowerProfile(r,specimen); if(hp&&r.types?.includes(hp.type)){const x=stabCandidate(r,'MOVE_HIDDEN_POWER',hpEntry,{type:hp.type,power:hp.power,name:`Hidden Power ${hp.type}`,exact:true});if(x)candidates.push(x)}
      }
    }
    candidates.sort((a,b)=>b.pressure-a.pressure||b.stabBp-a.stabBp||a.name.localeCompare(b.name));
    const bestPhysical=candidates.find(x=>x.category==='Physical')||null,bestSpecial=candidates.find(x=>x.category==='Special')||null,best=candidates[0]||null;
    let axis='—'; if(bestPhysical&&bestSpecial){const hi=Math.max(bestPhysical.pressure,bestSpecial.pressure),lo=Math.min(bestPhysical.pressure,bestSpecial.pressure);axis=hi&&((hi-lo)/hi)<.06?'Mixed':bestPhysical.pressure>bestSpecial.pressure?'Physical':'Special';}else if(bestPhysical)axis='Physical';else if(bestSpecial)axis='Special';
    return {axis,best,bestPhysical,bestSpecial,candidates};
  }
  function offensiveTargetTypes(data,r){
    const s=stabTargetTypes(data,r); const hp=hiddenPowerProfile(r);
    if(hp)for(const def of data.types||[])if(Number(data.typeChart?.[hp.type]?.[def]??1)>1)s.add(def);
    return s;
  }
  function terminalRecords(data){ return Object.values(data?.species||{}).filter(r=>!r.evolutions?.length); }
  function finalRecords(data,r){ return (r?.finalSpecies||[]).map(d=>record(data,d)).filter(Boolean); }
  function projectedRecord(data,specimen){
    const cur=record(data,specimen?.dexNo); if(!cur)return null;
    const finals=finalRecords(data,cur);
    const tierWeight={Uber:9,OU:8,UUBL:7,UU:6,RUBL:5,RU:5,NUBL:4,NU:4,PUBL:3,PU:3,ZUBL:2,ZU:2,NFE:1,LC:1,'—':0};
    const chosen=finals.length?finals.slice().sort((a,b)=>(tierWeight[b.tier]||0)-(tierWeight[a.tier]||0)||b.stats?.spe-a.stats?.spe)[0]:cur;
    // Preserve exact specimen facts that remain relevant after evolution. This lets
    // pair/team analysis use the IV-derived Hidden Power and the currently held item.
    return {...chosen,hiddenPower:specimen?.hiddenPower?{...specimen.hiddenPower}:null,heldItem:String(specimen?.heldItem||''),specimenAbility:String(specimen?.ability||''),specimenNature:String(specimen?.nature||''),specimenMoves:(specimen?.moves||[]).map(x=>String(x?.name||''))};
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
      if(m.effect==='EFFECT_SEMI_INVULNERABLE')score-=30;
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

    const oa=offensiveTargetTypes(data,a), ob=offensiveTargetTypes(data,b), union=new Set([...oa,...ob]); const off=union.size-Math.max(oa.size,ob.size);
    if(off>=2)reasons.push(`STAB + exact Hidden Power coverage expands super-effective reach by ${off} target types.`);
    const ahp=hiddenPowerProfile(a),bhp=hiddenPowerProfile(b);if(ahp)reasons.push(`${a.name} carries exact Hidden Power ${ahp.type} ${ahp.power}${ahp.category?` · ${ahp.category}`:''} coverage.`);if(bhp)reasons.push(`${b.name} carries exact Hidden Power ${bhp.type} ${bhp.power}${bhp.category?` · ${bhp.category}`:''} coverage.`);

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

  function roleProfile(data,r,specimen=null){
    if(!r)return[];const roles=[];const atk=Number(r.stats?.atk||0),spa=Number(r.stats?.spa||0),def=Number(r.stats?.def||0),spd=Number(r.stats?.spd||0),hp=Number(r.stats?.hp||0),spe=Number(r.stats?.spe||0);
    const exactHp=hiddenPowerProfile(r,specimen),item=String(specimen?.heldItem||r.heldItem||''),routes=(r.smogon?.routes||[]).map(x=>String(x)),summary=String(r.smogon?.summary||''),arch=(r.archetypes||[]).map(x=>String(x.label||''));
    const tactical=`${routes.join(' ')} ${summary} ${arch.join(' ')}`;const moves=bestDamagingMoves(data,r,24,exactHp?{hiddenPower:exactHp}:specimen),physical=moves.filter(x=>x.worth?.category==='Physical'),special=moves.filter(x=>x.worth?.category==='Special');
    const physSetup=hasMove(r,MOVE_CONST.SD)||hasMove(r,MOVE_CONST.BU)||hasMove(r,MOVE_CONST.DD)||hasMove(r,MOVE_CONST.BD)||hasMove(r,'MOVE_CURSE');
    const specSetup=hasMove(r,MOVE_CONST.CM);const speedTool=spe>=100||r.abilities?.includes('Speed Boost')||hasMove(r,MOVE_CONST.DD)||hasMove(r,MOVE_CONST.AGI)||r.abilities?.includes('Swift Swim')||r.abilities?.includes('Chlorophyll');
    const add=(role,score,evidence,kind='core')=>{if(!roles.some(x=>x.role===role))roles.push({role,score,evidence,kind});};
    if(atk>=100&&physical.length&&(spe>=85||speedTool||physSetup))add('Physical Sweeper',Math.min(100,64+(atk-100)*.7+(spe-70)*.25+(physSetup?12:0)),`${atk} Atk · ${spe} Spe${physSetup?' · setup access':''}`);
    if(atk>=110&&physical.length)add('Physical Breaker',Math.min(100,62+(atk-110)*.8),`${atk} Atk · ${physical[0]?.move?.name||'physical coverage'}`);
    if(spa>=100&&special.length&&(spe>=85||speedTool||specSetup))add('Special Sweeper',Math.min(100,64+(spa-100)*.7+(spe-70)*.25+(specSetup?12:0)),`${spa} SpA · ${spe} Spe${specSetup?' · setup access':''}`);
    if(spa>=110&&special.length)add('Special Breaker',Math.min(100,62+(spa-110)*.8),`${spa} SpA · ${special[0]?.move?.name||'special coverage'}`);
    if(def>=105&&hp>=55)add('Physical Wall',Math.min(100,58+(def-105)*.8+(hp-55)*.2),`${hp} HP · ${def} Def${/recover|resttalk|wish/i.test(tactical)?' · longevity route':''}`);
    if(spd>=105&&hp>=60)add('Special Wall',Math.min(100,58+(spd-105)*.8+(hp-60)*.18),`${hp} HP · ${spd} SpD${/recover|resttalk|wish/i.test(tactical)?' · longevity route':''}`);
    const leadRoute=routes.some(x=>/lead/i.test(x)),bandOpen=item==='Choice Band'&&spe>=85&&(atk>=105||spa>=105);
    if(spe>=100||r.abilities?.includes('Speed Boost')||leadRoute||bandOpen)add('Opener',Math.min(100,60+(spe>=100?Math.min(25,(spe-100)*.5+12):0)+(leadRoute?12:0)+(bandOpen?8:0)),leadRoute?'Smogon lead route':r.abilities?.includes('Speed Boost')?'Speed Boost creates immediate tempo':bandOpen?`Choice Band + ${spe} base Speed opening pressure`:`${spe} base Speed`);
    const phaze=hasMove(r,MOVE_CONST.ROAR)||hasMove(r,MOVE_CONST.WHIRL),phazePlan=/phaz|roar|whirlwind/i.test(tactical)||(phaze&&(def>=105||spd>=105));
    if(phaze&&phazePlan)add('Phaser',92,[hasMove(r,MOVE_CONST.ROAR)?'Roar':null,hasMove(r,MOVE_CONST.WHIRL)?'Whirlwind':null].filter(Boolean).join(' + '));
    if(hasMove(r,MOVE_CONST.SPIKES)&&(/spikes/i.test(tactical)||def>=100))add('Spiker',94,'Spikes access');
    if(hasMove(r,MOVE_CONST.SPIN)&&(/rapid spin/i.test(tactical)||def>=90||spd>=90))add('Rapid Spinner',90,'Rapid Spin access');
    if(hasMove(r,MOVE_CONST.BATON)&&(/baton pass/i.test(tactical)||r.abilities?.includes('Speed Boost')))add('Baton Passer',92,`${r.abilities?.includes('Speed Boost')?'Speed Boost · ':''}${physSetup?'physical boosts · ':''}${specSetup?'Calm Mind · ':''}Baton Pass`);
    if(hasMove(r,MOVE_CONST.RAIN)&&(/rain/i.test(tactical)||r.abilities?.includes('Swift Swim')))add('Rain Setter',70,'Rain Dance access','theme');
    if(r.abilities?.includes('Swift Swim'))add('Rain Sweeper',90,'Swift Swim','theme');
    if(hasMove(r,MOVE_CONST.SUN)&&(/sun/i.test(tactical)||r.abilities?.includes('Chlorophyll')))add('Sun Setter',70,'Sunny Day access','theme');
    if(r.abilities?.includes('Chlorophyll'))add('Sun Sweeper',88,'Chlorophyll','theme');
    if(/status pressure|hypnosis|spore|will-o-wisp|toxic pressure|paralysis/i.test(tactical))add('Status / Disruptor',76,'competitive status route','utility');
    if(/recover|resttalk|wish/i.test(tactical))add('Recovery / Longevity',68,'competitive longevity route','utility');
    if(r.abilities?.includes('Magnet Pull')||/trapper|trap/i.test(tactical))add('Trapper',82,r.abilities?.includes('Magnet Pull')?'Magnet Pull':'trapping route','utility');
    if(exactHp)add('Hidden Power Coverage',Math.min(100,70+Math.max(0,exactHp.power-60)),`${exactHp.type} ${exactHp.power} · ${exactHp.category}`,'coverage');
    else if(hasMove(r,'MOVE_HIDDEN_POWER'))add('Hidden Power Flex',62,'ADV coverage slot available; exact type depends on IVs','coverage');
    return roles.sort((a,b)=>b.score-a.score||a.role.localeCompare(b.role));
  }

  function teamRoles(team,data=null){
    const roles=new Set();
    for(const r of team||[]){
      if(data){for(const x of roleProfile(data,r))if(x.score>=60&&(x.kind==='core'||x.kind==='theme'||x.role==='Status / Disruptor'||x.role==='Trapper'))roles.add(x.role);}
      else{
        if(hasMove(r,MOVE_CONST.SPIKES))roles.add('Spiker');if(hasMove(r,MOVE_CONST.SPIN))roles.add('Rapid Spinner');if(hasMove(r,MOVE_CONST.ROAR)||hasMove(r,MOVE_CONST.WHIRL))roles.add('Phaser');if(hasMove(r,MOVE_CONST.BATON))roles.add('Baton Passer');
        if(r.stats?.atk>=110)roles.add('Physical Breaker');if(r.stats?.spa>=110)roles.add('Special Breaker');if(r.stats?.spe>=100||r.abilities?.includes('Speed Boost'))roles.add('Opener');if(r.stats?.def>=110)roles.add('Physical Wall');if(r.stats?.spd>=110)roles.add('Special Wall');
      }
    }
    return roles;
  }

  function teamFabric(data,team){
    team=(team||[]).filter(Boolean); const rows=[];
    for(const t of data.types||[]){let weak=0,resist=0,immune=0;for(const r of team){const x=typeMultiplier(data,t,r.types);if(x===0)immune++;else if(x<1)resist++;else if(x>1)weak++;}rows.push({type:t,weak,resist,immune});}
    const shared=rows.filter(x=>x.weak>=Math.max(3,Math.ceil(team.length/2))).sort((a,b)=>b.weak-a.weak);
    const roles=teamRoles(team,data); const gaps=[];
    if(!roles.has('Physical Sweeper')&&!roles.has('Physical Breaker'))gaps.push('No physical sweeper/breaker pressure.');
    if(!roles.has('Special Sweeper')&&!roles.has('Special Breaker'))gaps.push('No special sweeper/breaker pressure.');
    if(!roles.has('Opener'))gaps.push('No obvious opener / early tempo role.');
    if(!roles.has('Physical Wall'))gaps.push('No obvious physical wall.');
    if(!roles.has('Special Wall'))gaps.push('No obvious special wall.');
    if(!roles.has('Spiker'))gaps.push('No Spikes route detected.');
    if(!roles.has('Rapid Spinner'))gaps.push('No Rapid Spin route detected.');
    const coverage=offensiveCoverageSpecies(data,team);
    const weather={rain:team.filter(x=>hasArchetype(x,'rain')).length,sun:team.filter(x=>hasArchetype(x,'sun')).length};
    const plan=[];
    if(weather.rain>=2)plan.push(`Rain core detected (${weather.rain} participants).`);
    if(weather.sun>=2)plan.push(`Sun core detected (${weather.sun} participants).`);
    if(roles.has('Baton Passer'))plan.push('Baton Pass handoff route detected.');
    if(roles.has('Spiker')&&roles.has('Phaser'))plan.push('Spikes + phazing can form a coherent forced-switch chip plan.');
    if(roles.has('Status / Disruptor'))plan.push('Status can manufacture turns for setup, recovery or switches.');
    const hiddenPowers=(team||[]).map(r=>({name:r.name,hp:hiddenPowerProfile(r)})).filter(x=>x.hp);if(hiddenPowers.length)plan.push(`Exact Hidden Power coverage: ${hiddenPowers.map(x=>`${x.name} ${x.hp.type} ${x.hp.power}`).join(' · ')}.`);
    return {rows,shared,roles:[...roles],gaps:gaps.slice(0,6),coverage,weather,plan,hiddenPowers,slots:team.length};
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
      const cRoles=teamRoles([c],data), addedRoles=[...cRoles].filter(x=>!beforeRoles.has(x));
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


  // ---------------------------------------------------------------------------
  // v0.1.21 THREAT LAB + EXACT BENCHMARK CORE
  // These formulas are Gen III-specific. Mechanical assumptions are explicit so
  // a heuristic threat score is never confused with an exact damage benchmark.
  // ---------------------------------------------------------------------------
  const NATURE_EFFECTS={
    Hardy:{},Lonely:{up:'atk',down:'def'},Brave:{up:'atk',down:'spe'},Adamant:{up:'atk',down:'spa'},Naughty:{up:'atk',down:'spd'},
    Bold:{up:'def',down:'atk'},Docile:{},Relaxed:{up:'def',down:'spe'},Impish:{up:'def',down:'spa'},Lax:{up:'def',down:'spd'},
    Timid:{up:'spe',down:'atk'},Hasty:{up:'spe',down:'def'},Serious:{},Jolly:{up:'spe',down:'spa'},Naive:{up:'spe',down:'spd'},
    Modest:{up:'spa',down:'atk'},Mild:{up:'spa',down:'def'},Quiet:{up:'spa',down:'spe'},Bashful:{},Rash:{up:'spa',down:'spd'},
    Calm:{up:'spd',down:'atk'},Gentle:{up:'spd',down:'def'},Sassy:{up:'spd',down:'spe'},Careful:{up:'spd',down:'spa'},Quirky:{}
  };
  function natureModifier(nature,key){const e=NATURE_EFFECTS[nature]||{};return e.up===key?1.1:(e.down===key?0.9:1);}
  // Mirrors Pokemon Showdown Battle#modify fixed-point rounding used by RSE mechanics.
  function modifyRSE(value,numerator,denominator=1){const modifier=Math.trunc(Number(numerator)*4096/Number(denominator));return Math.trunc((Math.trunc(Number(value)*modifier)+2047)/4096);}
  function statAtLevel(base,iv=31,ev=0,level=100,nature='Hardy',key='hp'){
    base=Number(base)||0;iv=clamp(Number(iv)||0,0,31);ev=clamp(Number(ev)||0,0,255);level=clamp(Number(level)||1,1,100);
    if(key==='hp')return base===1?1:Math.floor(((2*base+iv+Math.floor(ev/4))*level)/100)+level+10;
    let raw=Math.floor(((2*base+iv+Math.floor(ev/4))*level)/100)+5;
    const mod=natureModifier(nature,key); if(mod===1.1)raw=Math.floor(raw*110/100);else if(mod===0.9)raw=Math.floor(raw*90/100);return raw;
  }
  function statsAtLevel(r,{ivs={},evs={},level=100,nature='Hardy'}={}){
    const out={};for(const key of STAT_KEYS)out[key]=statAtLevel(r?.stats?.[key],ivs?.[key]??31,evs?.[key]??0,level,nature,key);return out;
  }
  function specimenStats(r,specimen,{level=100,evs=null,nature=null}={}){
    const ivs=specimen?.ivs||{};const useEvs=evs||specimen?.evs||{};return statsAtLevel(r,{ivs,evs:useEvs,level,nature:nature||specimen?.nature||'Hardy'});
  }
  function stageStat(value,stage=0){stage=clamp(Math.trunc(Number(stage)||0),-6,6);return stage>=0?Math.floor(value*(2+stage)/2):Math.floor(value*2/(2-stage));}
  function effectiveSpeed(raw,{stage=0,ability='',weather='',status=''}={}){
    let n=stageStat(Number(raw)||0,stage);if((ability==='Swift Swim'&&weather==='rain')||(ability==='Chlorophyll'&&weather==='sun'))n*=2;if(status==='par')n=Math.max(1,Math.floor(n/4));return Math.min(999,n);
  }
  function theoreticalSpread(r,{level=100,nature='Hardy',mode='offense',category=null}={}){
    const ivs={hp:31,atk:31,def:31,spa:31,spd:31,spe:31},evs={hp:0,atk:0,def:0,spa:0,spd:0,spe:0};
    if(mode==='bulky'){evs.hp=252;if(category==='Physical')evs.def=252;else if(category==='Special')evs.spd=252;else (r.stats?.def>=r.stats?.spd?evs.def=252:evs.spd=252);}
    else {const physical=category?category==='Physical':Number(r.stats?.atk||0)>=Number(r.stats?.spa||0);evs[physical?'atk':'spa']=252;evs.spe=252;}
    return {level,nature,ivs,evs,stats:statsAtLevel(r,{ivs,evs,level,nature})};
  }
  function bestDamagingMoves(data,r,limit=10,specimen=null){
    if(!r)return[];const seen=new Set(),rows=[];
    for(const c of r.familyMoves||[]){if(seen.has(c))continue;seen.add(c);const m=moveByConst(data,c);if(!m||m.category==='Status')continue;const fixed=['MOVE_SEISMIC_TOSS','MOVE_NIGHT_SHADE','MOVE_DRAGON_RAGE','MOVE_SONIC_BOOM'].includes(c);if(!(Number(m.power)>0||fixed||c==='MOVE_HIDDEN_POWER'))continue;const w=moveUsefulness(data,r,c,specimen);rows.push({moveConst:c,move:m,worth:w,stab:(r.types||[]).includes(c==='MOVE_HIDDEN_POWER'&&specimen?.hiddenPower?.type?specimen.hiddenPower.type:m.type)});}
    return rows.sort((a,b)=>(Number(b.stab)-Number(a.stab))||(b.worth.score-a.worth.score)||((b.move.power||0)-(a.move.power||0))).slice(0,limit);
  }
  function immunityByAbility(moveType,defenderAbility,effectiveness){
    if(defenderAbility==='Levitate'&&moveType==='Ground')return true;
    if(defenderAbility==='Flash Fire'&&moveType==='Fire')return true;
    if(defenderAbility==='Volt Absorb'&&moveType==='Electric')return true;
    if(defenderAbility==='Water Absorb'&&moveType==='Water')return true;
    if(defenderAbility==='Wonder Guard'&&effectiveness<=1)return true;
    return false;
  }
  function applyAttackStatModifiers(n,{category='Physical',ability='',item='',status='',species='',moveType='',pinch=false}={}){
    let x=Math.max(1,Number(n)||1);
    if(category==='Physical'){
      if(ability==='Huge Power'||ability==='Pure Power')x=modifyRSE(x,2);
      if(ability==='Guts'&&status&&status!=='none')x=modifyRSE(x,1.5);
      if(ability==='Hustle')x=modifyRSE(x,1.5);
      if(item==='Choice Band')x=modifyRSE(x,1.5);
      if(item==='Thick Club'&&['Cubone','Marowak'].includes(species))x=modifyRSE(x,2);
      if(item==='Light Ball'&&species==='Pikachu')x=modifyRSE(x,2);
    }else if(item==='Deep Sea Tooth'&&species==='Clamperl')x=modifyRSE(x,2);
    if(pinch&&((ability==='Overgrow'&&moveType==='Grass')||(ability==='Blaze'&&moveType==='Fire')||(ability==='Torrent'&&moveType==='Water')||(ability==='Swarm'&&moveType==='Bug')))x=modifyRSE(x,1.5);
    return Math.max(1,x);
  }
  function applyDefenseStatModifiers(n,{category='Physical',item='',species=''}={}){
    let x=Math.max(1,Number(n)||1);if(category==='Special'&&item==='Deep Sea Scale'&&species==='Clamperl')x=modifyRSE(x,2);return x;
  }
  function damageRange(data,{attackerRecord,defenderRecord,attackerStats,defenderStats,moveConst=null,move=null,attackerLevel=100,attackerAbility='',defenderAbility='',attackerItem='',defenderItem='',attackerStatus='',weather='',attackerTypes=null,defenderTypes=null,attackerSpecies='',defenderSpecies='',pinch=false,reflect=false,lightScreen=false,spread=false,critical=false,hiddenPower=null,attackStage=0,defenseStage=0}={}){
    if(!attackerRecord||!defenderRecord)return null;move=move||moveByConst(data,moveConst);if(!move)return null;moveConst=moveConst||moveConstById(data,move.id);
    let type=move.type,category=move.category,power=Number(move.power)||0;
    if(moveConst==='MOVE_HIDDEN_POWER'&&hiddenPower?.type){type=hiddenPower.type;power=Number(hiddenPower.power)||70;category=PHYSICAL_TYPES.has(type)?'Physical':'Special';}
    const aTypes=attackerTypes||attackerRecord.types||[],dTypes=defenderTypes||defenderRecord.types||[];const eff=typeMultiplier(data,type,dTypes);
    if(immunityByAbility(type,defenderAbility,eff)||eff===0)return {min:0,max:0,rolls:[0],effectiveness:0,type,category,power,fixed:false,immune:true,supported:true};
    const fixed=moveConst==='MOVE_SEISMIC_TOSS'||moveConst==='MOVE_NIGHT_SHADE'?Number(attackerLevel)||100:moveConst==='MOVE_DRAGON_RAGE'?40:moveConst==='MOVE_SONIC_BOOM'?20:null;
    if(fixed!=null){const hp=Number(defenderStats?.hp)||1;return {min:Math.min(fixed,hp),max:Math.min(fixed,hp),rolls:[Math.min(fixed,hp)],effectiveness:1,type,category,power:0,fixed:true,immune:false,supported:true,pctMin:Math.round(Math.min(fixed,hp)*1000/hp)/10,pctMax:Math.round(Math.min(fixed,hp)*1000/hp)/10};}
    // Variable-power and stateful moves are intentionally rejected rather than given fake precision.
    if(power<=0||['MOVE_RETURN','MOVE_FRUSTRATION','MOVE_FLAIL','MOVE_REVERSAL','MOVE_LOW_KICK','MOVE_MAGNITUDE','MOVE_PRESENT'].includes(moveConst))return {unsupported:true,supported:false,reason:'Variable-power move needs an explicit battle state.',type,category,power};
    const atkKey=category==='Physical'?'atk':'spa',defKey=category==='Physical'?'def':'spd';
    let attack=stageStat(attackerStats?.[atkKey],attackStage),defense=stageStat(defenderStats?.[defKey],defenseStage);
    attack=applyAttackStatModifiers(attack,{category,ability:attackerAbility,item:attackerItem,status:attackerStatus,species:attackerSpecies||attackerRecord.name,moveType:type,pinch});
    defense=applyDefenseStatModifiers(defense,{category,item:defenderItem,species:defenderSpecies||defenderRecord.name});
    if(['MOVE_EXPLOSION','MOVE_SELF_DESTRUCT'].includes(moveConst)&&category==='Physical')defense=Math.max(1,Math.floor(defense/2));
    const L=Number(attackerLevel)||100;
    // RSE base damage before modifiers. Every division truncates.
    let base=Math.floor(Math.floor(Math.floor(Math.floor(2*L/5+2)*power*attack)/Math.max(1,defense))/50);
    if(attackerStatus==='brn'&&category==='Physical'&&attackerAbility!=='Guts')base=modifyRSE(base,.5);
    if((reflect&&category==='Physical')||(lightScreen&&category==='Special'))base=modifyRSE(base,.5);
    if(spread)base=modifyRSE(base,.5);
    if(weather==='rain'){if(type==='Water')base=modifyRSE(base,1.5);else if(type==='Fire')base=modifyRSE(base,.5);}else if(weather==='sun'){if(type==='Fire')base=modifyRSE(base,1.5);else if(type==='Water')base=modifyRSE(base,.5);}
    if(category==='Physical'&&!Math.floor(base))base=1;base+=2;if(critical)base=modifyRSE(base,2);
    // Thick Fat is a phase-2 damage modifier in the supported model.
    if(defenderAbility==='Thick Fat'&&(type==='Fire'||type==='Ice'))base=modifyRSE(base,.5);
    if(aTypes.includes(type))base=modifyRSE(base,1.5);
    for(const d of unique(dTypes)){const x=Number(data?.typeChart?.[type]?.[d]??1);if(x===0)return {min:0,max:0,rolls:[0],effectiveness:0,type,category,power,fixed:false,immune:true,supported:true};if(x>1)base*=2;else if(x<1)base=Math.floor(base/2);}
    // Showdown's Gen III randomizer is trunc(trunc(base * (100-rand[0..15])))/100.
    const rolls=[];for(let r=85;r<=100;r++)rolls.push(Math.max(1,Math.floor(Math.floor(base*r)/100)));const min=Math.min(...rolls),max=Math.max(...rolls),hp=Math.max(1,Number(defenderStats?.hp)||1);
    return {min,max,rolls,effectiveness:eff,type,category,power,fixed:false,immune:false,supported:true,pctMin:Math.round(min*1000/hp)/10,pctMax:Math.round(max*1000/hp)/10,ohko:min>=hp,possibleOhko:max>=hp,twohko:min*2>=hp};
  }
  function evCandidates(current=0){current=clamp(Math.trunc(Number(current)||0),0,252);const a=[current];for(let q=Math.floor(current/4);q<=63;q++){const e=Math.max(current,q*4);if(e<=252)a.push(e);}return unique(a).sort((x,y)=>x-y);}
  function minimumSpeedEv(data,specimen,r,targetSpeed,{level=100,weather='',stage=0,status=''}={}){
    if(!specimen||!r)return null;const cur=Number(specimen.evs?.spe||0);for(const ev of evCandidates(cur)){const st=specimenStats(r,specimen,{level,evs:{...(specimen.evs||{}),spe:ev}});const speed=effectiveSpeed(st.spe,{stage,ability:r.abilities?.[0]||specimen.ability||'',weather,status});if(speed>targetSpeed)return {ev,speed,additional:ev-cur,target:targetSpeed};}return {ev:null,speed:null,additional:null,target:targetSpeed,impossible:true};
  }
  function minimumOffenseEv(data,specimen,r,defenderRecord,defenderBuild,moveConst,{level=100,weather='',hits=1,defenderAbility='',defenderItem=''}={}){
    const move=moveByConst(data,moveConst);if(!move||!specimen||!r)return null;let category=move.category;if(moveConst==='MOVE_HIDDEN_POWER'&&specimen.hiddenPower?.type)category=PHYSICAL_TYPES.has(specimen.hiddenPower.type)?'Physical':'Special';const key=category==='Physical'?'atk':'spa',cur=Number(specimen.evs?.[key]||0);
    for(const ev of evCandidates(cur)){const evs={...(specimen.evs||{}),[key]:ev};const ast=specimenStats(r,specimen,{level,evs});const d=damageRange(data,{attackerRecord:r,defenderRecord,attackerStats:ast,defenderStats:defenderBuild.stats,moveConst,attackerLevel:level,attackerAbility:specimen.ability||r.abilities?.[0]||'',attackerItem:specimen.heldItem||'',weather,attackerTypes:r.types,defenderTypes:defenderRecord.types,attackerSpecies:r.name,defenderSpecies:defenderRecord.name,hiddenPower:specimen.hiddenPower});if(d&&!d.unsupported&&d.min*hits>=defenderBuild.stats.hp)return {stat:key,ev,additional:ev-cur,damage:d,hits};}
    return {stat:key,ev:null,additional:null,impossible:true,hits};
  }
  function minimumSurvivalEvs(data,specimen,r,attackerRecord,attackerBuild,moveConst,{level=100,weather='',attackerAbility='',attackerItem='',attackerStatus='',budget=510}={}){
    const move=moveByConst(data,moveConst);if(!move||!specimen||!r)return null;let category=move.category;const defKey=category==='Physical'?'def':'spd',baseEvs={...(specimen.evs||{})},curHP=Number(baseEvs.hp||0),curDef=Number(baseEvs[defKey]||0);let best=null;
    for(const hpEv of evCandidates(curHP)){for(const defEv of evCandidates(curDef)){const evs={...baseEvs,hp:hpEv,[defKey]:defEv};const total=STAT_KEYS.reduce((s,k)=>s+Number(evs[k]||0),0);if(total>budget)continue;const dst=specimenStats(r,specimen,{level,evs});const d=damageRange(data,{attackerRecord,defenderRecord:r,attackerStats:attackerBuild.stats,defenderStats:dst,moveConst,attackerLevel:attackerBuild.level||level,attackerAbility:attackerAbility||attackerRecord.abilities?.[0]||'',defenderAbility:specimen.ability||r.abilities?.[0]||'',attackerItem,defenderItem:specimen.heldItem||'',attackerStatus,weather,attackerTypes:attackerRecord.types,defenderTypes:r.types,attackerSpecies:attackerRecord.name,defenderSpecies:r.name});if(!d||d.unsupported)continue;if(d.max<dst.hp){const added=(hpEv-curHP)+(defEv-curDef);if(!best||added<best.additional||(added===best.additional&&dst.hp>best.stats.hp))best={hpEv,defStat:defKey,defEv,additional:added,stats:dst,damage:d,total};}}
    }return best||{impossible:true,defStat:defKey};
  }
  function mergeEvPlan(specimen,{speed=null,offense=null,survival=null}={}){
    const evs={hp:0,atk:0,def:0,spa:0,spd:0,spe:0};for(const k of STAT_KEYS)evs[k]=clamp(Number(specimen?.evs?.[k]||0),0,252);
    if(speed?.ev!=null)evs.spe=Math.max(evs.spe,Number(speed.ev));
    if(offense?.ev!=null&&offense.stat)evs[offense.stat]=Math.max(evs[offense.stat],Number(offense.ev));
    if(survival&&!survival.impossible){evs.hp=Math.max(evs.hp,Number(survival.hpEv||0));if(survival.defStat)evs[survival.defStat]=Math.max(evs[survival.defStat],Number(survival.defEv||0));}
    const total=STAT_KEYS.reduce((n,k)=>n+evs[k],0),currentTotal=STAT_KEYS.reduce((n,k)=>n+Number(specimen?.evs?.[k]||0),0);
    return {evs,total,currentTotal,additional:Math.max(0,total-currentTotal),remaining:510-total,legalTotal:total<=510,overBy:Math.max(0,total-510)};
  }
  function offenseNatureFor(r,moveConst,data){const m=moveByConst(data,moveConst);let cat=m?.category;if(moveConst==='MOVE_HIDDEN_POWER')cat='Special';return cat==='Physical'?'Adamant':'Modest';}
  function speedNatureFor(r){return Number(r?.stats?.atk||0)>=Number(r?.stats?.spa||0)?'Jolly':'Timid';}
  function threatProfiles(data,r,moveConst=null){
    if(!r)return null;const move=moveConst?moveByConst(data,moveConst):null;const category=move?.category||((r.stats?.atk||0)>=(r.stats?.spa||0)?'Physical':'Special');
    const speedNature=speedNatureFor(r),offenseNature=category==='Physical'?'Adamant':'Modest';
    return {
      maxSpeed:theoreticalSpread(r,{level:100,nature:speedNature,mode:'offense',category}),
      maxOffense:theoreticalSpread(r,{level:100,nature:offenseNature,mode:'offense',category}),
      bulky:theoreticalSpread(r,{level:100,nature:'Hardy',mode:'bulky',category})
    };
  }
  function threatPool(data,tiers=['OU','UUBL']){const allowed=new Set(tiers);return terminalRecords(data).filter(r=>allowed.has(r.tier));}
  function structuralThreatCoverage(data,team,tiers=['OU','UUBL']){
    // Conservative structural screen. Exact set claims belong in Threat Lab.
    team=(team||[]).filter(Boolean);const pool=threatPool(data,tiers),holes=[],answers=[];let answered=0;
    for(const foe of pool){let hit=null;for(const mon of team){
      const foeStabs=foe.types||[], mults=foeStabs.map(t=>typeMultiplier(data,t,mon.types));
      const immune=mults.some(x=>x===0),resists=mults.some(x=>x>0&&x<1),weakOther=mults.some(x=>x>1);
      const bulky=Math.max(Number(mon.stats?.hp||0)+Number(mon.stats?.def||0),Number(mon.stats?.hp||0)+Number(mon.stats?.spd||0))>=175;
      const defensive=immune||(resists&&!weakOther&&bulky);
      let bestCoverage=null;for(const cm of mon.competitiveMoves||[]){const mv=moveByConst(data,cm.move);if(!mv||mv.category==='Status')continue;let moveType=mv.type,power=Number(mv.power||0),moveName=mv.name;if(cm.move==='MOVE_HIDDEN_POWER'){const exact=hiddenPowerProfile(mon);if(!exact)continue;moveType=exact.type;power=exact.power;moveName=`Hidden Power ${exact.type}`;}if(power<=0)continue;const mult=typeMultiplier(data,moveType,foe.types);if(mult>1){const score=power*mult;if(!bestCoverage||score>bestCoverage.score)bestCoverage={move:moveName,score,type:moveType};}}
      const speedEdge=Number(mon.stats?.spe||0)>Number(foe.stats?.spe||0);
      const speedPlan=mon.abilities?.includes('Speed Boost')||mon.abilities?.includes('Swift Swim')||mon.abilities?.includes('Chlorophyll')||hasMove(mon,MOVE_CONST.DD)||hasMove(mon,MOVE_CONST.AGI);
      const revenge=!!bestCoverage&&(speedEdge||speedPlan);
      if(defensive||revenge){hit={mon:mon.name,kind:defensive&&revenge?'switch + pressure':defensive?'structural switch':'revenge pressure',move:bestCoverage?.move||''};break;}
    }
    if(hit){answered++;answers.push({foe:foe.name,...hit});}else holes.push(foe);}
    return {answered,total:pool.length,pct:pool.length?Math.round(answered*1000/pool.length)/10:0,holes:holes.slice(0,12),answers};
  }
  function themeRecordScore(r,theme='balance'){
    if(!r)return-99;theme=String(theme||'balance').toLowerCase();let s=0;
    if(theme==='rain'){if(hasMove(r,MOVE_CONST.RAIN))s+=5;if(r.abilities?.includes('Swift Swim'))s+=6;if(r.types?.includes('Water'))s+=2;if(hasMove(r,'MOVE_THUNDER'))s+=1.5;if(r.types?.includes('Fire'))s-=1;if(r.abilities?.includes('Sand Stream'))s-=14;if(r.abilities?.includes('Drought'))s-=14;}
    else if(theme==='sun'){if(hasMove(r,MOVE_CONST.SUN))s+=5;if(r.abilities?.includes('Chlorophyll'))s+=6;if(r.types?.includes('Fire'))s+=2;if(hasMove(r,'MOVE_SOLAR_BEAM'))s+=2;if(r.abilities?.includes('Sand Stream'))s-=14;if(r.abilities?.includes('Drizzle'))s-=14;}
    else if(theme==='baton'){if(hasMove(r,MOVE_CONST.BATON))s+=7;if(hasMove(r,MOVE_CONST.SD)||hasMove(r,MOVE_CONST.CM)||hasMove(r,MOVE_CONST.DD)||hasMove(r,MOVE_CONST.AGI)||r.abilities?.includes('Speed Boost'))s+=3;if(r.stats?.atk>=110||r.stats?.spa>=110)s+=2;}
    else if(theme==='subseed'){if(hasArchetype(r,'subseed'))s+=9;if(hasMove(r,MOVE_CONST.SPIKES)||hasMove(r,MOVE_CONST.ROAR)||hasMove(r,MOVE_CONST.WHIRL))s+=2;if(r.stats?.def>=105||r.stats?.spd>=105)s+=1.5;}
    else if(theme==='spikes'){if(hasMove(r,MOVE_CONST.SPIKES))s+=9;if(hasMove(r,MOVE_CONST.ROAR)||hasMove(r,MOVE_CONST.WHIRL))s+=4;if(hasMove(r,MOVE_CONST.SPIN))s+=2;if(r.stats?.def>=110)s+=1;}
    else {if(r.stats?.atk>=105)s+=1;if(r.stats?.spa>=105)s+=1;if(r.stats?.spe>=100)s+=1;if(r.stats?.def>=100)s+=1;if(r.stats?.spd>=100)s+=1;}
    if(r.tier==='OU')s+=2.5;else if(r.tier==='UUBL')s+=1.5;else if(r.tier==='UU')s+=.5;return s;
  }
  function themeSatisfied(team,theme='balance'){
    theme=String(theme||'balance').toLowerCase();if(theme==='rain')return team.some(r=>hasMove(r,MOVE_CONST.RAIN))&&team.filter(r=>hasArchetype(r,'rain')||r.abilities?.includes('Swift Swim')).length>=2;
    if(theme==='sun')return team.some(r=>hasMove(r,MOVE_CONST.SUN))&&team.filter(r=>hasArchetype(r,'sun')||r.abilities?.includes('Chlorophyll')).length>=2;
    if(theme==='baton')return team.some(r=>hasMove(r,MOVE_CONST.BATON))&&team.some(r=>r.stats?.atk>=105||r.stats?.spa>=105);
    if(theme==='subseed')return team.some(r=>hasArchetype(r,'subseed'));
    if(theme==='spikes')return team.some(r=>hasMove(r,MOVE_CONST.SPIKES));return true;
  }
  function fastTeamScore(data,team,theme='balance'){
    let score=team.reduce((s,r)=>s+themeRecordScore(r,theme),0),pairs=0;for(let i=0;i<team.length;i++)for(let j=i+1;j<team.length;j++){score+=pairFit(data,team[i],team[j]).score*.35;pairs++;}
    const rows=[];for(const t of data.types||[]){let w=0,r=0;for(const mon of team){const x=typeMultiplier(data,t,mon.types);if(x>1)w++;else if(x<1)r++;}if(w>=3)score-=(w-r)*1.4;rows.push([t,w,r]);}
    const coreRoles=teamRoles(team,data);score+=Math.min(coreRoles.size,12)*.55;if(coreRoles.has('Physical Sweeper')||coreRoles.has('Physical Breaker'))score+=.7;if(coreRoles.has('Special Sweeper')||coreRoles.has('Special Breaker'))score+=.7;for(const wanted of ['Physical Wall','Special Wall','Opener'])if(coreRoles.has(wanted))score+=.7;if(team.length===6&&themeSatisfied(team,theme))score+=8;else if(team.length===6)score-=12;return score;
  }
  function optimizeSix(data,{pool=null,pinned=[],theme='balance',beamWidth=28,candidateLimit=52,nodeAdjustments={}}={}){
    const all=(pool&&pool.length?pool:terminalRecords(data)).filter(r=>r&&r.tier!=='Uber');const pinMap=new Map();for(const r of (pinned||[]).filter(Boolean))if(!pinMap.has(Number(r.dex)))pinMap.set(Number(r.dex),r);const pins=[...pinMap.values()].slice(0,6);const usedPins=new Set(pins.map(r=>Number(r.dex)));
    const candidates=all.filter(r=>!usedPins.has(Number(r.dex))).sort((a,b)=>themeRecordScore(b,theme)-themeRecordScore(a,theme)||Number(a.dex)-Number(b.dex)).slice(0,candidateLimit);
    const adj=team=>(team||[]).reduce((n,r)=>n+Number(nodeAdjustments?.[String(r.dex)]||0),0);
    let beam=[{team:pins,score:fastTeamScore(data,pins,theme)+adj(pins)}];while(beam[0]?.team.length<6){const next=[];for(const node of beam){const used=new Set(node.team.map(r=>Number(r.dex)));for(const c of candidates){if(used.has(Number(c.dex)))continue;const team=[...node.team,c];next.push({team,score:fastTeamScore(data,team,theme)+adj(team)});}}if(!next.length)break;next.sort((a,b)=>b.score-a.score);beam=next.slice(0,beamWidth);}
    const seen=new Set();
    const finals=beam.filter(x=>x.team.length===6).map(x=>{const f=teamFabric(data,x.team),th=structuralThreatCoverage(data,x.team);const score=x.score+f.coverage.pct*.04+th.pct*.07;return {...x,score:Math.round(score*10)/10,fabric:f,threats:th,themeSatisfied:themeSatisfied(x.team,theme)};}).sort((a,b)=>(Number(b.themeSatisfied)-Number(a.themeSatisfied))||b.score-a.score).filter(x=>{const key=x.team.map(r=>Number(r.dex)).sort((a,b)=>a-b).join(',');if(seen.has(key))return false;seen.add(key);return true;});
    const constrained=String(theme||'balance').toLowerCase()==='balance'?finals:finals.filter(x=>x.themeSatisfied);
    return (constrained.length?constrained:finals).slice(0,3);
  }

  return {STAT_KEYS,MOVE_CONST,NATURE_EFFECTS,record,moveByConst,moveConstById,typeMultiplier,weaknessProfile,stabTargetTypes,hiddenPowerProfile,gen3Category,stabProfile,offensiveTargetTypes,terminalRecords,finalRecords,projectedRecord,pathToFinal,evolutionLabel,evolutionBranches,sourceText,bestSource,bestAcquisitionSource,acquisitionNote,hasMove,hasArchetype,moveUsefulness,futureStabRoadmap,competitiveUnlocks,offensiveCoverageSpecies,pairFit,roleProfile,teamRoles,teamFabric,sub101,structuralCandidates,nextSlotCandidates,partnerRanking,natureModifier,statAtLevel,statsAtLevel,specimenStats,stageStat,effectiveSpeed,theoreticalSpread,bestDamagingMoves,damageRange,minimumSpeedEv,minimumOffenseEv,minimumSurvivalEvs,mergeEvPlan,offenseNatureFor,speedNatureFor,threatProfiles,threatPool,structuralThreatCoverage,themeRecordScore,themeSatisfied,optimizeSix,modifyRSE};
});
