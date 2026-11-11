
(function(){
'use strict';
const C=window.PSO_MAG_CANON;
if(!C){ console.error('PSO_MAG_CANON missing'); return; }

const STAT_KEYS=['DEF','POW','DEX','MIND'];
const STAGE4_NAMES=[...new Set(Object.values(C.evolution.stage4).flat().flatMap(r=>[r.M.mag,r.F.mag]))];
const CLASS_NAMES=C.classes.map(x=>x.name).sort((a,b)=>b.length-a.length);
const SECTION_IDS=C.sectionIds;
const ASSET='/pso/assets/pso/maglab/';
const COST_RANK={Monomate:1,Monofluid:1,Antidote:1,Antiparalysis:1,Dimate:2,Difluid:2,Trimate:3,Trifluid:3,SolAtomizer:3,MoonAtomizer:3,StarAtomizer:4};

const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
const slug=s=>String(s).toLowerCase().replace(/'/g,'').replace(/[^a-z0-9]/g,'');
const magImg=n=>`${ASSET}mags/${slug(n)}.gif`;
const clsImg=n=>`${ASSET}classes/${slug(n)}.png`;
const sidImg=n=>`${ASSET}sectionids/${slug(n)}.png`;
const pbImg=n=>{
  const m={'None':0,'Farlla':1,'Estlla':2,'Leilla':3,'Golla':4,'Pilla':5,'Mylla & Youlla':6,'Mylla':6};
  return `${ASSET}pbs/${m[n]??0}.png`;
};

function classMeta(name){return C.classes.find(x=>x.name.toLowerCase()===String(name||'').toLowerCase())||null}
function genericOwner(type,gender){
  return C.classes.filter(x=>(!type||x.type===type)&&(!gender||x.gender===gender)).map(x=>x.name);
}
function sectionStage3Group(sid){return C.sectionGroups.stage3A.includes(sid)?'A':'B'}
function sectionCnd(sid){
  return ['GPO','VBRW','SKY'].find(g=>C.sectionGroups[g].includes(sid))||'';
}
function readEquation(eq){
  return eq==='DEFDEX-POWMIND'?'DEF + DEX = POW + MIND':
         eq==='DEFPOW-DEXMIND'?'DEF + POW = DEX + MIND':
         eq==='DEFMIND-POWDEX'?'DEF + MIND = POW + DEX':eq;
}
function equationOK(eq,s){
  if(eq==='DEFDEX-POWMIND')return s.DEF+s.DEX===s.POW+s.MIND;
  if(eq==='DEFPOW-DEXMIND')return s.DEF+s.POW===s.DEX+s.MIND;
  if(eq==='DEFMIND-POWDEX')return s.DEF+s.MIND===s.POW+s.DEX;
  return false;
}
function sumStats(s){return STAT_KEYS.reduce((a,k)=>a+(Number(s[k])||0),0)}
function scaledTarget(target,level=100){
  const total=sumStats(target)||200, out={};
  STAT_KEYS.forEach(k=>out[k]=(target[k]||0)*level/total);
  return out;
}
function solveCheckpoint(eq,target){
  const scaled=scaledTarget(target,100);
  const attempts=[
    {lockDef:(target.DEF===5?5:null),lockMind:(target.MIND===0?0:null)},
    {lockDef:(target.DEF===5?5:null),lockMind:null},
    {lockDef:null,lockMind:null}
  ];
  for(const attempt of attempts){
    let best=null;
    for(let DEF=5;DEF<=70;DEF++){
      if(attempt.lockDef!==null&&DEF!==attempt.lockDef)continue;
      for(let POW=0;POW<=95;POW++){
        for(let DEX=0;DEX<=95;DEX++){
          const MIND=100-DEF-POW-DEX;
          if(MIND<0)continue;
          if(attempt.lockMind!==null&&MIND!==attempt.lockMind)continue;
          const st={DEF,POW,DEX,MIND};
          if(!equationOK(eq,st))continue;
          const score=
            Math.pow(DEF-scaled.DEF,2)*5+
            Math.pow(POW-scaled.POW,2)+
            Math.pow(DEX-scaled.DEX,2)+
            Math.pow(MIND-scaled.MIND,2)*3;
          if(!best||score<best.score)best={stats:st,score};
        }
      }
    }
    if(best)return best.stats;
  }
  return null;
}
function targetTemplate(owner,targetName,explicit){
  if(explicit)return explicit;
  if(owner.type==='FO')return {...C.templates.force_mind.target};
  if(owner.type==='RA')return {...C.templates.physical_accuracy.target};
  return {...C.templates.physical_power.target};
}
function stage4Candidates(targetName){
  const out=[];
  for(const [type,rows] of Object.entries(C.evolution.stage4)){
    for(const row of rows){
      for(const gender of ['M','F']){
        if(row[gender].mag===targetName){
          out.push({
            type,gender,cnd:row.cnd,equation:row.equation,
            target:targetName,ids:[...C.sectionGroups[row.cnd]],
            classes:C.classes.filter(c=>c.type===type&&c.gender===gender).map(c=>c.name)
          });
        }
      }
    }
  }
  return out;
}
function chooseStage4(targetName,owner,finalTarget){
  const cands=stage4Candidates(targetName);
  let best=null;
  for(const c of cands){
    const checkpoint=solveCheckpoint(c.equation,finalTarget);
    let score=0;
    if(owner.sectionId && c.ids.includes(owner.sectionId))score-=35;
    if(owner.type===c.type)score-=8;
    if(owner.gender===c.gender)score-=3;
    if(checkpoint){
      const scaled=scaledTarget(finalTarget,100);
      score+=STAT_KEYS.reduce((a,k)=>a+Math.abs(checkpoint[k]-scaled[k]),0);
    } else score+=999;
    const sid=(owner.sectionId&&c.ids.includes(owner.sectionId))?owner.sectionId:c.ids[0];
    const row={...c,checkpoint,chosenSectionId:sid,score};
    if(!best||score<best.score)best=row;
  }
  return best;
}
function parseStats(q){
  const m=String(q).match(/\b(\d{1,3})\s*\/\s*(\d{1,3})\s*\/\s*(\d{1,3})\s*\/\s*(\d{1,3})\b/);
  if(!m)return null;
  return {DEF:+m[1],POW:+m[2],DEX:+m[3],MIND:+m[4]};
}
function parseOwner(q){
  const low=String(q).toLowerCase();
  let className=CLASS_NAMES.find(n=>low.includes(n.toLowerCase()))||null;
  let type=className?classMeta(className).type:null;
  let gender=className?classMeta(className).gender:null;
  if(!type){
    if(/\bhunter\b/.test(low))type='HU';
    else if(/\branger\b/.test(low))type='RA';
    else if(/\bforce\b/.test(low))type='FO';
  }
  if(!gender){
    if(/\bmale\b|\bman\b/.test(low))gender='M';
    if(/\bfemale\b|\bwoman\b/.test(low))gender='F';
  }
  const sectionId=SECTION_IDS.find(s=>new RegExp(`\\b${s}\\b`,'i').test(q))||null;
  return {className,type,gender,sectionId,candidates:genericOwner(type,gender)};
}
function parseTargetMag(q){
  const names=[...STAGE4_NAMES].sort((a,b)=>b.length-a.length);
  return names.find(n=>new RegExp(`\\b${n.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')}\\b`,'i').test(q))||null;
}
function parsePlatform(q){
  if(/\b(blue burst|ephinea|bb)\b/i.test(q))return 'bb';
  return 'gcx';
}
function inferFreshRoute(owner,stage4){
  const s3A=C.sectionGroups.stage3A;
  let lv50=null;
  if(owner.type==='HU' && owner.sectionId && s3A.includes(owner.sectionId)){
    lv50={holder:owner.className||`${owner.gender==='M'?'male ':owner.gender==='F'?'female ':''}Hunter`,sectionId:owner.sectionId,result:'Ila',pb:'Mylla & Youlla',condition:'DEX > POW > MIND'};
  } else if(owner.type==='RA' && owner.sectionId && !s3A.includes(owner.sectionId)){
    lv50={holder:owner.className||'Ranger',sectionId:owner.sectionId,result:'Kaitabha',pb:'Mylla & Youlla',condition:'DEX ≥ POW > MIND'};
  } else {
    lv50={holder:'Hunter',sectionId:'Viridia / Skyly / Purplenum / Redria / Yellowboze',result:'Ila',pb:'Mylla & Youlla',condition:'DEX > POW > MIND'};
  }
  return [
    {level:10,title:'Secure Estlla',holder:'Ranger',sectionId:'any',condition:'Ranger performs the feed that reaches Lv10',result:'Kalki',pb:'Estlla'},
    {level:35,title:'Secure Pilla',holder:'keep the Kalki route',sectionId:'any',condition:'DEX is dominant when Lv35 is reached',result:'Mitra',pb:'Pilla'},
    {level:50,title:'Secure Mylla & Youlla',...lv50},
    stage4?{
      level:100,title:`Trigger ${stage4.target}`,
      holder:stage4.classes.join(' / '),
      sectionId:stage4.chosenSectionId,
      condition:`${readEquation(stage4.equation)} at Lv100`,
      result:stage4.target,pb:'keeps the three PBs learned before Lv100'
    }:null
  ].filter(Boolean);
}
function freshMonomateCount(){
  let raw={DEF:500,POW:0,DEX:0,MIND:0}, n=0;
  const row=C.feedingTables.ep2['0'].find(r=>r.item==='Monomate');
  while(rawLevel(raw)<10 && n<100){raw=applyRaw(raw,row);n++}
  return {count:n,raw};
}
function rawLevel(raw){return STAT_KEYS.reduce((a,k)=>a+Math.floor((raw[k]||0)/100),0)}
function decimalStats(raw){
  const out={};STAT_KEYS.forEach(k=>out[k]=Math.round((raw[k]||0))/100);return out;
}
function rawFromStats(s){
  const out={};STAT_KEYS.forEach(k=>out[k]=Math.round((Number(s[k])||0)*100));return out;
}
function applyRaw(raw,row,times=1){
  let out={...raw};
  for(let n=0;n<times;n++){
    for(const k of STAT_KEYS){
      const cur=out[k]||0, base=Math.floor(cur/100)*100, prog=cur-base;
      let next=prog+(Number(row[k])||0);
      if(next<0)next=0; // progress can fall to zero, never below the earned stat level
      out[k]=base+next;
    }
  }
  return out;
}
function inferForm(level,plan){
  if(level<10)return 'Mag';
  if(level<35)return 'Kalki';
  if(level<50)return 'Mitra';
  if(level<100)return (plan.checkpoints.find(x=>x.level===50)?.result||'Ila');
  return plan.targetMag||plan.checkpoints.find(x=>x.level===50)?.result||'Ila';
}
function targetForPhase(level,plan){
  if(level<10)return {DEF:5,POW:5,DEX:0,MIND:0};
  if(level<35)return {DEF:5,POW:12,DEX:18,MIND:0};
  if(level<50)return {DEF:5,POW:20,DEX:25,MIND:0};
  if(level<100)return plan.stage4?.checkpoint||scaledTarget(plan.finalTarget,100);
  return plan.finalTarget;
}
function feedRows(magName){
  const m=C.mags[magName]||C.mags.Mag;
  return C.feedingTables.ep2[String(m.feedingTableId)]||C.feedingTables.ep2['0'];
}
function recommendSnack(state,plan){
  const raw=rawFromStats(state.stats);
  const level=rawLevel(raw);
  const magName=state.magName||inferForm(level,plan);
  const rows=feedRows(magName);
  if(level<10){
    const mono=rows.find(r=>r.item==='Monomate')||rows[0];
    let rr={...raw},count=0;
    while(rawLevel(rr)<10&&count<50){rr=applyRaw(rr,mono);count++}
    return {item:mono.item,count:Math.max(1,count),magName,level,targetLevel:10,reason:'Simple fresh-console opening. The Ranger must hold the feed that actually crosses Lv10.',delta:mono,next:decimalStats(rr)};
  }
  // Known physical route heuristics before 50 are deliberately conservative.
  if(level<35){
    const r=rows.find(x=>x.item==='Antidote')||rows[0];
    return {item:r.item,count:10,magName,level,targetLevel:35,reason:'Build DEX cleanly for the Mitra / Pilla checkpoint. Recheck every small batch.',delta:r,next:decimalStats(applyRaw(raw,r,10))};
  }
  if(level<50){
    const ints=decimalStats(raw);
    const wantPow=(ints.DEX-ints.POW)>=6;
    const r=rows.find(x=>x.item===(wantPow?'Dimate':'Antidote'))||rows[0];
    return {item:r.item,count:10,magName,level,targetLevel:50,reason:wantPow?'DEX already leads, so start adding POW without surrendering the Lv50 DEX > POW route.':'Protect the DEX lead until the Mylla & Youlla handoff.',delta:r,next:decimalStats(applyRaw(raw,r,10))};
  }

  const target=targetForPhase(level,plan);
  const cur=decimalStats(raw);
  let best=null;
  for(const row of rows){
    let score=0;
    for(const k of STAT_KEYS){
      const deficit=Math.max(0,(target[k]||0)-cur[k]);
      const gain=(row[k]||0)/100;
      if(deficit>0&&gain>0)score+=Math.min(deficit,gain)*38;
      if(deficit<=0&&gain>0)score-=gain*22;
      if((target[k]||0)===0&&gain>0)score-=gain*80;
      if(gain<0 && deficit>0)score+=gain*18;
    }
    score-=(COST_RANK[row.item]||2)*.35;
    if(!best||score>best.score)best={row,score};
  }
  const row=best?.row||rows[0];
  const deficits=STAT_KEYS.map(k=>[k,Math.max(0,(target[k]||0)-cur[k])]).sort((a,b)=>b[1]-a[1]);
  const main=deficits[0], gain=Math.max(0,(row[main[0]]||0)/100);
  const count=gain>0?Math.max(1,Math.min(10,Math.ceil(Math.min(main[1],2.5)/gain))):5;
  return {item:row.item,count,magName,level,targetLevel:level<100?100:200,reason:level<100?'Move toward the exact Lv100 rare-MAG equation without inventing feed counts beyond the current bars.':'Finish the final spread after the rare MAG has locked.',delta:row,next:decimalStats(applyRaw(raw,row,count))};
}

function isPlannerQuery(q){
  const low=String(q||'').toLowerCase();
  const hasTarget=STAGE4_NAMES.some(n=>low.includes(n.toLowerCase()));
  const asksPlan=/\b(plan|planner|raise|raising|feed|feeding|handoff|cross[- ]?plan|what item|what should i give|what do i give|build)\b/i.test(q);
  const hasState=/\b(lv|level)\s*\d+|\b\d{1,3}\s*\/\s*\d{1,3}\s*\/\s*\d{1,3}\s*\/\s*\d{1,3}\b/i.test(q);
  return parsePlatform(q)==='gcx' && (hasTarget || asksPlan || hasState);
}

function isEndpointMatrixQuery(q){
  const low=String(q||'').toLowerCase();
  const rareMag=/(?:4th|fourth)[ -]?(?:evo(?:lution)?|evolution)|rare[ -]?mags?|fourth[ -]?form/.test(low);
  const plural=/\b(all|which|what|options?|choices?|possible|reachable|available|other|every|list)\b/.test(low)||/\bmags\b/.test(low);
  const topology=/\b(handoff|hand-off|holder|class|classes|gender|male|female|hunter|ranger|force|section ids?|other ids?|alternate ids?|different ids?)\b/.test(low);
  return parsePlatform(q)==='gcx' && rareMag && (plural||topology);
}


function parseCurrentMag(q,targetMag=null){
  const low=String(q||'').toLowerCase();
  const names=Object.keys(C.mags).sort((a,b)=>b.length-a.length);
  const found=names.find(n=>low.includes(n.toLowerCase()))||null;
  return found&&found!==targetMag?found:null;
}
function parseCurrentLevel(q){
  const m=String(q||'').match(/\b(?:lv|level)\s*\.?\s*(\d{1,3})\b/i);
  return m?Number(m[1]):null;
}

function planFromQuery(q){
  const owner=parseOwner(q);
  const targetMag=parseTargetMag(q);
  const explicit=parseStats(q);
  const currentMag=parseCurrentMag(q,targetMag);
  const currentLevel=parseCurrentLevel(q);
  const finalTarget=targetTemplate(owner,targetMag,explicit);
  const stage4=targetMag?chooseStage4(targetMag,owner,finalTarget):null;
  const checkpoints=inferFreshRoute(owner,stage4);
  const fresh=freshMonomateCount();
  const plan={
    kind:'mag_plan',
    platform:parsePlatform(q),
    owner,targetMag,finalTarget,stage4,checkpoints,
    currentMag,currentLevel,
    feedingTimeSeconds:C.feedingTimeSeconds,
    freshStart:{mag:'Mag',stats:C.startingMag.stats,firstSnack:{item:'Monomate',count:fresh.count,next:decimalStats(fresh.raw)}},
    routeStatus:targetMag?(stage4?'deterministic rare-MAG handoff resolved':'target not in stat-evolution rare-MAG table'):'general MAG guidance',
    caveats:[
      'Exact feed counts after the fresh opening depend on the current MAG form and hidden progress bars.',
      'Photon Blast handoffs are checkpoint-sensitive: the character holding the MAG on the feed that crosses the checkpoint matters.',
      'The common 5/145/50/0 physical spread is a community baseline, not a universal optimum.'
    ]
  };
  const isFresh=!currentMag && (!currentLevel || currentLevel<=5);
  plan.defaultState={magName:currentMag||'Mag',stats:isFresh?{DEF:5,POW:0,DEX:0,MIND:0}:null};
  plan.snack=isFresh?recommendSnack(plan.defaultState,plan):null;
  plan.needsCurrentBars=!isFresh;
  return plan;
}

function deterministicFacts(plan){
  if(!plan)return null;
  return {
    kind:'MAG_PLANNER_CANON',
    platform:plan.platform==='gcx'?'GameCube / Xbox':'Blue Burst',
    owner:plan.owner,
    targetMag:plan.targetMag,
    finalTarget:plan.finalTarget,
    level100Requirement:plan.stage4?{
      holderClasses:plan.stage4.classes,
      holderSectionIds:plan.stage4.ids,
      chosenSectionId:plan.stage4.chosenSectionId,
      equation:readEquation(plan.stage4.equation),
      checkpoint:plan.stage4.checkpoint
    }:null,
    photonBlastRoute:plan.checkpoints.slice(0,3).map(x=>({level:x.level,holder:x.holder,sectionId:x.sectionId,condition:x.condition,result:x.result,pb:x.pb})),
    freshStart:plan.freshStart,
    currentState:plan.currentMag||plan.currentLevel?{mag:plan.currentMag,level:plan.currentLevel,needsCurrentBars:plan.needsCurrentBars}:null,
    feedingTimeSeconds:plan.feedingTimeSeconds,
    sourceStatus:'Mechanics from packaged MAG canon; PB route is a verified route skeleton; exact later feed counts require current progress.'
  };
}

function statLine(s){return `${s.DEF}/${s.POW}/${s.DEX}/${s.MIND}`}
function holderVisual(cp){
  const candidate=(cp.holder||'').split(' / ')[0];
  const cls=CLASS_NAMES.find(n=>candidate.includes(n));
  const sid=SECTION_IDS.find(n=>String(cp.sectionId).includes(n));
  return `<div class="magHolderVisual">
    ${cls?`<img src="${clsImg(cls)}" alt="${esc(cls)}">`:''}
    ${sid?`<img src="${sidImg(sid)}" alt="${esc(sid)}">`:''}
  </div>`;
}
function checkpointCard(cp){
  return `<article class="magCheckpoint">
    <div class="magLv">LV ${cp.level}</div>
    <div class="magCheckpointIcon"><img src="${magImg(cp.result)}" alt="${esc(cp.result)}"></div>
    <div class="magCheckpointBody">
      <b>${esc(cp.title)}</b>
      <span>${esc(cp.holder)}${cp.sectionId&&cp.sectionId!=='any'?` · ${esc(cp.sectionId)}`:''}</span>
      <small>${esc(cp.condition)}</small>
      <div class="magResult">${esc(cp.result)}${cp.pb?` · ${esc(cp.pb)}`:''}</div>
    </div>
    ${holderVisual(cp)}
  </article>`;
}
function selectOptions(arr,current,labeler=x=>x){
  return arr.map(x=>`<option value="${esc(x)}"${x===current?' selected':''}>${esc(labeler(x))}</option>`).join('');
}
function renderWidget(plan,uid='maglab'){
  if(!plan)return '';
  const ownerClass=plan.owner.className||'';
  const ownerDisplay=plan.owner.className||(plan.owner.candidates.length?plan.owner.candidates.join(' / '):(plan.owner.type||'character'));
  const sid=plan.owner.sectionId||'Redria';
  const target=plan.targetMag||'Sato';
  const targetMag=C.mags[target]?target:'Sato';
  const s4=plan.stage4;
  const snack=plan.snack;
  const checkpoint=s4?.checkpoint;
  const stateStats=plan.defaultState.stats||{DEF:5,POW:0,DEX:0,MIND:0};
  const delta=snack.delta||{};
  return `<section class="magLab" data-maglab="${uid}">
    <header class="magLabHead">
      <div class="magLabHero"><img src="${magImg(targetMag)}" alt="${esc(targetMag)}"></div>
      <div>
        <div class="magLabKicker">RICO MAG LAB · CROSS-PLANNER</div>
        <h2>${esc(targetMag)} route</h2>
        <div class="magLabSub">${esc(ownerDisplay)} · ${esc(sid)} · target ${statLine(plan.finalTarget)}</div>
      </div>
      <div class="magLabBadge">GC/XBOX<br>MAG GPS</div>
    </header>

    <div class="magLabSetup">
      <label>Owner class<select class="magOwnerClass">${ownerClass?'':`<option value="" selected>${esc(ownerDisplay)} · choose exact class</option>`}${selectOptions(CLASS_NAMES,ownerClass)}</select></label>
      <label>Section ID<select class="magOwnerSid">${selectOptions(SECTION_IDS,sid)}</select></label>
      <label>Rare MAG<select class="magTarget">${selectOptions(STAGE4_NAMES.sort(),targetMag)}</select></label>
      <label>Final stats<input class="magFinalStats" value="${statLine(plan.finalTarget)}" inputmode="numeric"></label>
      <button class="magReplan" type="button">REPLAN</button>
    </div>

    ${s4?`<div class="magRareRule">
      <div><span>LV100 HOLDER</span><b>${esc(s4.classes.join(' / '))}</b></div>
      <div><span>SECTION ID</span><b>${esc(s4.chosenSectionId)}${s4.ids.length>1?' · alternates available':''}</b></div>
      <div><span>EQUATION</span><b>${esc(readEquation(s4.equation))}</b></div>
      <div><span>VALID CHECKPOINT</span><b>${checkpoint?statLine(checkpoint):'needs route input'}</b></div>
    </div>`:''}

    <div class="magCheckpointRail">${plan.checkpoints.map(checkpointCard).join('')}</div>

    <div class="magToolsGrid">
      <section class="magSnack">
        <div class="magToolTitle">FEED GPS · NEXT SNACK</div>
        ${snack?`
        <div class="magSnackAction"><img src="${magImg(snack.magName)}" alt=""><div><b>${esc(snack.item)} × ${snack.count}</b><span>then recheck</span></div></div>
        <p>${esc(snack.reason)}</p>
        <div class="magDelta">per feed · DEF ${snack.delta.DEF>=0?'+':''}${snack.delta.DEF||0} · POW ${snack.delta.POW>=0?'+':''}${snack.delta.POW||0} · DEX ${snack.delta.DEX>=0?'+':''}${snack.delta.DEX||0} · MIND ${snack.delta.MIND>=0?'+':''}${snack.delta.MIND||0}</div>
        `:`
        <div class="magSnackAction needsBars"><img src="${magImg(plan.currentMag||'Mag')}" alt=""><div><b>READ CURRENT BARS</b><span>${esc(plan.currentMag||'current MAG')}${plan.currentLevel?` · Lv${plan.currentLevel}`:''}</span></div></div>
        <p>This is already an in-progress MAG. I will not pretend it is fresh. Enter the current DEF / POW / DEX / MIND values below and the Feed GPS will choose a small safe snack from the correct feeding table.</p>
        `}
        <details class="magCurrent"${plan.needsCurrentBars?' open':''}>
          <summary>I’m already raising it · enter current bars</summary>
          <div class="magStateGrid">
            <label>Current MAG<select class="magCurrentForm">${selectOptions(Object.keys(C.mags).sort(),plan.currentMag||'Mag')}</select></label>
            ${STAT_KEYS.map(k=>`<label>${k}<input class="magStat" data-stat="${k}" type="number" step=".01" min="0" max="200" value="${stateStats[k]}"></label>`).join('')}
          </div>
          <button class="magNextSnack" type="button">CALCULATE NEXT FEED</button>
          <div class="magSnackLive"></div>
        </details>
      </section>

      <section class="magTimer">
        <div class="magToolTitle">MAG TIMER · 2003 MODE</div>
        <div class="magTimerFace" data-seconds="${plan.feedingTimeSeconds}">03:30</div>
        <div class="magTimerButtons">
          <button type="button" class="magTimerStart">FED · START</button>
          <button type="button" class="magTimerReset">RESET</button>
        </div>
        <small>Default feeding interval: ${Math.floor(plan.feedingTimeSeconds/60)}:${String(plan.feedingTimeSeconds%60).padStart(2,'0')}.</small>
      </section>
    </div>

    <div class="magTruthNote">MECHANICS LOCKED TO PSO MAG CANON · CHECKPOINT HANDOFFS ARE THE FEEDS THAT CROSS LV10 / 35 / 50 / 100</div>
  </section>`;
}

const timers=new WeakMap();
function bindWidget(root,plan){
  if(!root)return;
  const replan=()=>{
    const cls=root.querySelector('.magOwnerClass')?.value;
    const sid=root.querySelector('.magOwnerSid')?.value;
    const target=root.querySelector('.magTarget')?.value;
    const stats=root.querySelector('.magFinalStats')?.value||'';
    const genericOwner=plan.owner.type==='HU'?(plan.owner.gender==='M'?'male Hunter':plan.owner.gender==='F'?'female Hunter':'Hunter'):
                       plan.owner.type==='RA'?(plan.owner.gender==='M'?'male Ranger':plan.owner.gender==='F'?'female Ranger':'Ranger'):
                       plan.owner.type==='FO'?(plan.owner.gender==='M'?'male Force':plan.owner.gender==='F'?'female Force':'Force'):'';
    const q=`${cls||genericOwner} ${sid} ${target} ${stats}`;
    const np=planFromQuery(q);
    root.outerHTML=renderWidget(np,root.dataset.maglab||'maglab');
    const nr=document.querySelector(`[data-maglab="${root.dataset.maglab||'maglab'}"]`);
    bindWidget(nr,np);
  };
  root.querySelector('.magReplan')?.addEventListener('click',replan);

  root.querySelector('.magNextSnack')?.addEventListener('click',()=>{
    const stats={};
    root.querySelectorAll('.magStat').forEach(el=>stats[el.dataset.stat]=Number(el.value||0));
    const magName=root.querySelector('.magCurrentForm')?.value||'Mag';
    const snack=recommendSnack({magName,stats},plan);
    const d=snack.delta||{};
    const out=root.querySelector('.magSnackLive');
    if(out)out.innerHTML=`<b>${esc(snack.item)} × ${snack.count}</b><br><span>${esc(snack.reason)}</span><small>After this snack: ${statLine(snack.next)} · per feed POW ${d.POW>=0?'+':''}${d.POW||0}, DEX ${d.DEX>=0?'+':''}${d.DEX||0}</small>`;
  });

  const face=root.querySelector('.magTimerFace');
  const start=root.querySelector('.magTimerStart');
  const reset=root.querySelector('.magTimerReset');
  const defaultSecs=Number(face?.dataset.seconds||210);
  let end=0, tick=null;
  const paint=()=>{
    let remain=end?Math.max(0,Math.ceil((end-Date.now())/1000)):defaultSecs;
    if(face){
      if(end&&remain<=0){face.textContent='FEED NOW';face.classList.add('ready')}
      else{face.textContent=`${String(Math.floor(remain/60)).padStart(2,'0')}:${String(remain%60).padStart(2,'0')}`;face.classList.remove('ready')}
    }
    if(end&&remain<=0&&tick){clearInterval(tick);tick=null}
  };
  start?.addEventListener('click',()=>{
    end=Date.now()+defaultSecs*1000;
    if(tick)clearInterval(tick);
    tick=setInterval(paint,250);paint();
  });
  reset?.addEventListener('click',()=>{
    end=0;if(tick){clearInterval(tick);tick=null}paint();
  });
  paint();
}



// ---------------------------------------------------------------------------
// v0.2 SAVE -> MAG COACH
// The binary is validated by pso-character-link.js. These functions only accept
// the already-decoded trusted object and never mutate the save.
// ---------------------------------------------------------------------------
function magNameById(id){
  const hit=Object.entries(C.mags).find(([,m])=>Number(m.id)===Number(id));
  return hit?hit[0]:null;
}
function saveOwner(decoded){
  const className=decoded?.character?.class?.name||null;
  const meta=classMeta(className)||{};
  return {className,type:meta.type||null,gender:meta.gender||null,sectionId:decoded?.character?.section_id?.name||null,candidates:genericOwner(meta.type||null,meta.gender||null)};
}
function verifiedSaveMagState(decoded){
  if(!decoded?.valid||!decoded?.trusted||!decoded?.integrity?.valid||!decoded?.mag)return null;
  const m=decoded.mag;
  const raw={DEF:Number(m.def_raw)||0,POW:Number(m.pow_raw)||0,DEX:Number(m.dex_raw)||0,MIND:Number(m.mind_raw)||0};
  const stats=decimalStats(raw);
  const pbs=(m.photon_blasts||[]).filter(x=>x&&x.id!==null&&x.name).map(x=>x.name);
  return {
    source:'verified_xbox_pso_save',owner:saveOwner(decoded),magName:magNameById(m.type_id)||m.name||'Mag',magId:Number(m.type_id),
    raw,stats,level:rawLevel(raw),storedLevel:Number(m.stored_level),synchro:Number(m.synchro)||0,iq:Number(m.iq)||0,color:m.color_name||null,pbs,
    meseta:Number(decoded?.character?.meseta)||0,terminalRare:STAGE4_NAMES.includes(magNameById(m.type_id)||'')
  };
}
function equationPairs(eq){
  if(eq==='DEFDEX-POWMIND')return [['DEF','DEX'],['POW','MIND']];
  if(eq==='DEFPOW-DEXMIND')return [['DEF','POW'],['DEX','MIND']];
  if(eq==='DEFMIND-POWDEX')return [['DEF','MIND'],['POW','DEX']];
  return null;
}
function wholeStats(state){const o={};STAT_KEYS.forEach(k=>o[k]=Math.floor(Number(state?.stats?.[k])||0));return o}
function earliestRareLevel(eq,state){
  const pairs=equationPairs(eq);if(!pairs)return null;
  const cur=wholeStats(state),curLevel=sumStats(cur);
  let start=Math.max(100,Math.ceil(curLevel/10)*10);
  for(let level=start;level<=200;level+=10){
    if(level===curLevel&&!equationOK(eq,cur))continue;
    const half=level/2;
    const a=cur[pairs[0][0]]+cur[pairs[0][1]],b=cur[pairs[1][0]]+cur[pairs[1][1]];
    if(a<=half&&b<=half)return level;
  }
  return null;
}
function solveCheckpointFromState(eq,target,state,level){
  const pairs=equationPairs(eq);if(!pairs||!level)return null;
  const lo=wholeStats(state),half=level/2,scaled=scaledTarget(target,level);
  let best=null;
  const [a,b]=pairs[0],[c,d]=pairs[1];
  for(let av=lo[a];av<=half-lo[b];av++){
    const bv=half-av;if(bv<lo[b])continue;
    for(let cv=lo[c];cv<=half-lo[d];cv++){
      const dv=half-cv;if(dv<lo[d])continue;
      const st={};st[a]=av;st[b]=bv;st[c]=cv;st[d]=dv;
      // MAG stat levels cannot be lowered later. A rare checkpoint that already
      // exceeds the selected Lv200 endpoint is a mathematical dead end.
      if(STAT_KEYS.some(k=>Number.isFinite(Number(target[k]))&&st[k]>Number(target[k])))continue;
      const score=STAT_KEYS.reduce((s,k)=>s+Math.pow(st[k]-scaled[k],2)*(k==='DEF'?5:k==='MIND'?3:1),0);
      if(!best||score<best.score)best={stats:st,score};
    }
  }
  return best?.stats||null;
}
function solveAnyCheckpointFromState(eq,state,level,preferredTarget=null){
  const pairs=equationPairs(eq);if(!pairs||!level)return null;
  const lo=wholeStats(state),half=level/2,scaled=scaledTarget(preferredTarget||{DEF:5,POW:125,DEX:70,MIND:0},level);
  let best=null;const [a,b]=pairs[0],[c,d]=pairs[1];
  for(let av=lo[a];av<=half-lo[b];av++){
    const bv=half-av;if(bv<lo[b])continue;
    for(let cv=lo[c];cv<=half-lo[d];cv++){
      const dv=half-cv;if(dv<lo[d])continue;
      const st={};st[a]=av;st[b]=bv;st[c]=cv;st[d]=dv;
      const score=STAT_KEYS.reduce((sum,k)=>sum+Math.pow(st[k]-scaled[k],2)*(k==='DEF'?5:k==='MIND'?3:1),0);
      if(!best||score<best.score)best={stats:st,score};
    }
  }
  return best?.stats||null;
}
function feedingResourcesFromSave(decoded){
  const alias=s=>String(s||'').replace(/\s+/g,'').replace('SolAtomizer','SolAtomizer').replace('MoonAtomizer','MoonAtomizer').replace('StarAtomizer','StarAtomizer');
  const out={};
  const add=(name,count,where)=>{
    const key=alias(name);if(!key||!C.itemCosts[key])return;
    out[key]??={item:key,inventory:0,bank:0,total:0,cost:Number(C.itemCosts[key])||0};
    out[key][where]+=Math.max(0,Number(count)||0);out[key].total=out[key].inventory+out[key].bank;
  };
  for(const it of decoded?.inventory||[]){if(it?.tool)add(it.friendly_name,it.tool.amount_byte||1,'inventory')}
  for(const it of decoded?.bank?.items||[]){if(it?.tool)add(it.friendly_name,it.amount||it.tool.amount_byte||1,'bank')}
  return out;
}
function endpointRouteMatrixFromSave(decoded,preferredTarget=null){
  const state=verifiedSaveMagState(decoded);if(!state)return [];
  const owner=state.owner,targetBase=preferredTarget||targetTemplate(owner,null,null),rows=[];
  for(const target of [...STAGE4_NAMES].sort()){
    if(state.terminalRare){
      rows.push({target,reachable:state.magName===target,terminal:true,self:state.magName===target,sameSectionId:state.magName===target,handoffRequired:false,holderType:owner.type,holderGender:owner.gender,holderClasses:[owner.className].filter(Boolean),sectionIds:[owner.sectionId].filter(Boolean),equation:null,equationText:null,earliestLevel:state.level,checkpoint:null,reason:state.magName===target?'This MAG is already locked as this fourth evolution.':`Already locked as ${state.magName}; fourth evolutions are terminal.`});
      continue;
    }
    const cands=stage4Candidates(target);let added=false;
    for(const cand of cands){
      const level=earliestRareLevel(cand.equation,state);if(!level)continue;
      // Matrix mode answers "what can this MAG still become?". It must not discard
      // a legal fourth-evolution route merely because it does not fit one default
      // Lv200 template. A precise chosen-target plan can optimize the spread later.
      const checkpoint=solveAnyCheckpointFromState(cand.equation,state,level,targetBase);if(!checkpoint)continue;
      const self=Boolean(owner.className&&cand.classes.includes(owner.className)&&owner.sectionId&&cand.ids.includes(owner.sectionId));
      const sameSectionId=Boolean(owner.sectionId&&cand.ids.includes(owner.sectionId));
      const score=(self?-1000:sameSectionId?-250:0)+level+STAT_KEYS.reduce((sum,k)=>sum+Math.abs(checkpoint[k]-(scaledTarget(targetBase,level)[k]||0)),0);
      rows.push({target,reachable:true,terminal:false,self,sameSectionId,handoffRequired:!self,holderType:cand.type,holderGender:cand.gender,holderClasses:[...cand.classes],sectionIds:[...cand.ids],equation:cand.equation,equationText:readEquation(cand.equation),earliestLevel:level,checkpoint,score});
      added=true;
    }
    if(!added)rows.push({target,reachable:false,terminal:false,self:false,sameSectionId:false,handoffRequired:true,holderType:null,holderGender:null,holderClasses:[],sectionIds:[],equation:null,equationText:null,earliestLevel:null,checkpoint:null,reason:'No valid rare-evolution checkpoint remains at or below Lv200 from the current whole-stat state.'});
  }
  return rows;
}
function endpointMatrixFromSave(decoded,finalTarget=null){
  const state=verifiedSaveMagState(decoded);if(!state)return [];
  const owner=state.owner;const targetBase=finalTarget||targetTemplate(owner,null,null);
  return [...STAGE4_NAMES].sort().map(target=>{
    if(state.terminalRare){
      return {target,reachable:state.magName===target,terminal:true,self:state.magName===target,handoffRequired:false,reason:state.magName===target?'This MAG is already locked as this fourth evolution.':`Already locked as ${state.magName}; fourth evolutions are terminal.`};
    }
    let best=null;
    for(const cand of stage4Candidates(target)){
      const level=earliestRareLevel(cand.equation,state);if(!level)continue;
      const checkpoint=solveCheckpointFromState(cand.equation,targetBase,state,level);if(!checkpoint)continue;
      const self=Boolean(owner.className&&cand.classes.includes(owner.className)&&owner.sectionId&&cand.ids.includes(owner.sectionId));
      const score=(self?-1000:0)+level+STAT_KEYS.reduce((sum,k)=>sum+Math.abs(checkpoint[k]-(scaledTarget(targetBase,level)[k]||0)),0);
      const row={target,reachable:true,terminal:false,self,handoffRequired:!self,holderClasses:[...cand.classes],sectionIds:[...cand.ids],equation:cand.equation,equationText:readEquation(cand.equation),earliestLevel:level,checkpoint,score};
      if(!best||row.score<best.score)best=row;
    }
    return best||{target,reachable:false,terminal:false,self:false,handoffRequired:true,reason:'No valid rare-evolution checkpoint remains at or below Lv200 from the current whole-stat state.'};
  });
}
function bestDefaultEndpoint(decoded){
  const rows=endpointMatrixFromSave(decoded);const self=rows.filter(x=>x.reachable&&x.self).sort((a,b)=>a.earliestLevel-b.earliestLevel);if(self[0])return self[0].target;
  const any=rows.filter(x=>x.reachable).sort((a,b)=>a.earliestLevel-b.earliestLevel);return any[0]?.target||null;
}
function routeStatus(cp,state){
  if(cp.level>state.level)return 'planned';
  if(cp.pb&&state.pbs.includes(cp.pb))return 'complete';
  if(cp.result===state.magName)return 'complete';
  return 'recovery';
}
function saveRouteCheckpoints(state,endpoint){
  if(!endpoint?.reachable)return [];
  const stage4={target:endpoint.target,classes:endpoint.holderClasses||[],chosenSectionId:endpoint.sectionIds?.[0]||'',equation:endpoint.equation};
  const base=inferFreshRoute(state.owner,stage4).map(x=>({...x}));
  const rare=base.find(x=>x.level===100);
  if(rare){rare.level=endpoint.earliestLevel;rare.sectionId=(endpoint.sectionIds||[]).join(' / ');rare.holder=(endpoint.holderClasses||[]).join(' / ');rare.condition=`${endpoint.equationText} at Lv${endpoint.earliestLevel}`;rare.checkpoint=endpoint.checkpoint}
  return base.map(cp=>({...cp,status:routeStatus(cp,state)}));
}
function applyFeedDetailed(state,row,times=1){
  let raw={...state.raw},synchro=Number(state.synchro)||0,iq=Number(state.iq)||0;
  for(let n=0;n<times;n++){raw=applyRaw(raw,row,1);synchro=Math.max(0,Math.min(120,synchro+(Number(row.synchro)||0)));iq=Math.max(0,Math.min(200,iq+(Number(row.iq)||0)))}
  return {raw,stats:decimalStats(raw),level:rawLevel(raw),synchro,iq};
}
function nextEvolutionBoundary(level,rareLevel){
  const fixed=[10,35,50].find(x=>x>level);if(fixed)return fixed;
  if(level>=50){const n=Math.ceil((level+1)/5)*5;return rareLevel&&rareLevel<n?rareLevel:n}
  return rareLevel||200;
}
function targetForSavePhase(state,plan){
  if(state.level<10)return {DEF:5,POW:1,DEX:4,MIND:0};
  if(state.level<35)return {DEF:5,POW:10,DEX:20,MIND:0};
  if(state.level<50)return {DEF:5,POW:20,DEX:25,MIND:0};
  if(plan.endpoint?.checkpoint&&state.level<plan.endpoint.earliestLevel)return plan.endpoint.checkpoint;
  return plan.finalTarget;
}
function currentOwnerQualifiesForCheckpoint(state,cp,endpoint){
  if(cp===10)return state.owner.type==='RA';
  if(cp===35)return true;
  if(cp===50){
    const s3A=C.sectionGroups.stage3A.includes(state.owner.sectionId);
    return (state.owner.type==='HU'&&s3A)||(state.owner.type==='RA'&&!s3A);
  }
  if(endpoint&&cp===endpoint.earliestLevel)return endpoint.self;
  return true;
}
function recommendSaveFeed(decoded,plan){
  const state=verifiedSaveMagState(decoded);if(!state||!plan?.endpoint?.reachable||state.terminalRare&&state.magName!==plan.targetMag)return null;
  const mag=C.mags[state.magName]||C.mags.Mag,rows=C.feedingTables.ep2[String(mag.feedingTableId)]||C.feedingTables.ep2['0'];
  const resources=feedingResourcesFromSave(decoded),target=targetForSavePhase(state,plan),cur=state.stats;
  let best=null;
  for(const row of rows){
    const sim=applyFeedDetailed(state,row,1);let score=0;
    for(const k of STAT_KEYS){
      const deficit=Math.max(0,(Number(target[k])||0)-(Number(cur[k])||0));
      const afterDef=Math.max(0,(Number(target[k])||0)-(Number(sim.stats[k])||0));
      score+=(deficit-afterDef)*60;
      if(deficit<=0&&sim.stats[k]>cur[k])score-=(sim.stats[k]-cur[k])*24;
      if((plan.finalTarget[k]||0)===0&&sim.stats[k]>cur[k])score-=(sim.stats[k]-cur[k])*120;
    }
    if(state.level<35)score+=(sim.stats.DEX-cur.DEX)*45-(sim.stats.MIND-cur.MIND)*40;
    if(state.level>=35&&state.level<50)score+=(sim.stats.DEX-cur.DEX)*25+(sim.stats.POW-cur.POW)*8-(sim.stats.MIND-cur.MIND)*50;
    const res=resources[row.item];if(res?.total>0)score+=3;score-=(COST_RANK[row.item]||2)*.25;
    if(!best||score>best.score)best={row,score};
  }
  if(!best)return null;
  const row=best.row,boundary=nextEvolutionBoundary(state.level,plan.endpoint.earliestLevel);let sim=state,count=0,handoffBefore=false;
  for(let n=1;n<=3;n++){
    const nxt=applyFeedDetailed(sim,row,1);
    if(nxt.level>=boundary&&boundary>state.level&&!currentOwnerQualifiesForCheckpoint(state,boundary,plan.endpoint)){
      handoffBefore=true;break;
    }
    sim={...state,...nxt};count=n;
    if(nxt.level>=boundary&&boundary>state.level)break;
  }
  const resource=resources[row.item]||{item:row.item,inventory:0,bank:0,total:0,cost:Number(C.itemCosts[row.item])||0};
  resource.affordable=resource.cost?Math.floor(state.meseta/resource.cost):null;
  const delta={DEF:row.DEF,POW:row.POW,DEX:row.DEX,MIND:row.MIND,synchro:row.synchro,iq:row.iq};
  if(count===0&&handoffBefore)return {action:'handoff',item:row.item,count:0,boundary,resource,reason:`The next safe feed can cross Lv${boundary}. Hand the MAG to the required checkpoint holder before feeding.`};
  return {action:'feed',item:row.item,count:Math.max(1,count),boundary,resource,delta,after:sim.stats,afterLevel:sim.level,afterSynchro:sim.synchro,afterIq:sim.iq,handoffBeforeNext:handoffBefore,reason:state.level<35?'Build DEX while protecting the Estlla → Pilla route.':state.level<50?'Protect the Lv50 Mylla & Youlla route while moving toward the rare checkpoint.':`Move toward the exact ${plan.targetMag} equality checkpoint without pretending the fractional bars are integers.`};
}
function planFromVerifiedSave(decoded,targetMag=null){
  const state=verifiedSaveMagState(decoded);if(!state)return null;
  const finalTarget=targetTemplate(state.owner,targetMag,null),matrix=endpointMatrixFromSave(decoded,finalTarget),chosen=(targetMag?matrix.find(x=>x.target===targetMag):null)||matrix.find(x=>x.target===bestDefaultEndpoint(decoded))||matrix.find(x=>x.reachable);
  if(!chosen)return {kind:'save_mag_coach',saveLinked:true,state,endpoint:null,targetMag:null,finalTarget,matrix,checkpoints:[],nextFeed:null};
  const stage4=chosen.reachable?{target:chosen.target,classes:chosen.holderClasses,ids:chosen.sectionIds,chosenSectionId:chosen.sectionIds?.[0],equation:chosen.equation,checkpoint:chosen.checkpoint}:null;
  const plan={kind:'save_mag_coach',platform:'gcx',saveLinked:true,state,owner:state.owner,targetMag:chosen.target,finalTarget,stage4,endpoint:chosen,matrix,checkpoints:saveRouteCheckpoints(state,chosen),feedingTimeSeconds:C.feedingTimeSeconds,defaultState:{magName:state.magName,stats:state.stats},currentMag:state.magName,currentLevel:state.level,needsCurrentBars:false,routeStatus:chosen.reachable?'verified save state → computed endpoint':'endpoint unreachable'};
  plan.nextFeed=recommendSaveFeed(decoded,plan);plan.snack=plan.nextFeed?.action==='feed'?{item:plan.nextFeed.item,count:plan.nextFeed.count,magName:state.magName,level:state.level,targetLevel:plan.nextFeed.boundary,reason:plan.nextFeed.reason,delta:plan.nextFeed.delta,next:plan.nextFeed.after}:null;
  return plan;
}
function deterministicFactsFromVerifiedSave(decoded,targetMag=null){
  const p=planFromVerifiedSave(decoded,targetMag);if(!p)return null;
  return {kind:'VERIFIED_SAVE_MAG_COACH',source:'verified_xbox_pso_save',saveTruth:true,character:{name:decoded.character.name,class:decoded.character.class.name,sectionId:decoded.character.section_id.name},currentMag:{name:p.state.magName,level:p.state.level,stats:p.state.stats,raw:p.state.raw,synchro:p.state.synchro,iq:p.state.iq,color:p.state.color,photonBlasts:p.state.pbs},target:p.targetMag,endpoint:p.endpoint?{reachable:p.endpoint.reachable,self:p.endpoint.self,handoffRequired:p.endpoint.handoffRequired,holderClasses:p.endpoint.holderClasses,sectionIds:p.endpoint.sectionIds,equation:p.endpoint.equationText,earliestLevel:p.endpoint.earliestLevel,checkpoint:p.endpoint.checkpoint}:null,route:p.checkpoints.map(x=>({level:x.level,status:x.status,holder:x.holder,sectionId:x.sectionId,result:x.result,pb:x.pb,condition:x.condition,checkpoint:x.checkpoint||null})),nextFeed:p.nextFeed?{action:p.nextFeed.action,item:p.nextFeed.item,count:p.nextFeed.count,boundary:p.nextFeed.boundary,reason:p.nextFeed.reason,resource:p.nextFeed.resource,after:p.nextFeed.after||null}:null,rule:'Verified save fields are immutable factual state. Route calculations use packaged GameCube/Xbox MAG canon.'};
}

function deterministicEndpointMatrixFacts(decoded){
  const state=verifiedSaveMagState(decoded);if(!state)return null;
  const routes=endpointRouteMatrixFromSave(decoded),targets=[...STAGE4_NAMES].sort().map(target=>{
    const rr=routes.filter(x=>x.target===target),reachable=rr.filter(x=>x.reachable);
    const compact=reachable.map(x=>({holderType:x.holderType,holderGender:x.holderGender,holderClasses:x.holderClasses,sectionIds:x.sectionIds,equation:x.equationText,earliestLevel:x.earliestLevel,checkpoint:x.checkpoint,self:x.self,sameSectionId:x.sameSectionId,handoffRequired:x.handoffRequired}));
    return {target,reachable:reachable.length>0,selfReachable:reachable.some(x=>x.self),sameSectionIdReachable:reachable.some(x=>x.sameSectionId),routes:compact,reason:reachable.length?null:(rr[0]?.reason||'No valid route remains.')};
  });
  const reachable=targets.filter(x=>x.reachable);
  return {kind:'VERIFIED_SAVE_MAG_MATRIX',version:'0.5.2',source:'verified_xbox_pso_save',saveTruth:true,character:{name:decoded.character.name,class:decoded.character.class.name,sectionId:decoded.character.section_id.name,level:decoded.character.level},currentMag:{name:state.magName,level:state.level,stats:state.stats,raw:state.raw,synchro:state.synchro,iq:state.iq,color:state.color,photonBlasts:state.pbs},reachableTargetCount:reachable.length,reachableTargets:reachable.map(x=>x.target),targets,rule:'This is the complete standard rare fourth-evolution possibility matrix from the verified save state. Answer every reachable target requested; include self, same-Section-ID handoffs, alternate Section-ID routes, holder class/gender, equality and checkpoint. Never collapse a matrix question to the default endpoint.'};
}
function minimalVerifiedSaveState(decoded){
  const s=verifiedSaveMagState(decoded);if(!s)return null;return {source:'verified_xbox_pso_save',integrity:{valid:true,checksumValid:true,payload_crc:decoded.integrity.payload_crc,character_signature:decoded.integrity.character_signature},character:{name:decoded.character.name,class:decoded.character.class.name,section_id:decoded.character.section_id.name,level:decoded.character.level,meseta:decoded.character.meseta},mag:{name:s.magName,type_id:s.magId,level:s.level,stats:s.stats,raw:s.raw,synchro:s.synchro,iq:s.iq,color:s.color,photon_blasts:s.pbs},feeding_resources:feedingResourcesFromSave(decoded)};
}

window.PSO_MAG_ENGINE={
  canon:C,parseOwner,parseTargetMag,parseCurrentMag,parseCurrentLevel,isPlannerQuery,planFromQuery,deterministicFacts,
  recommendSnack,renderWidget,bindWidget,magImg,clsImg,sidImg,pbImg,
  readEquation,solveCheckpoint,stage4Candidates,
  magNameById,verifiedSaveMagState,feedingResourcesFromSave,endpointRouteMatrixFromSave,endpointMatrixFromSave,bestDefaultEndpoint,
  isEndpointMatrixQuery,planFromVerifiedSave,deterministicFactsFromVerifiedSave,deterministicEndpointMatrixFacts,minimalVerifiedSaveState,recommendSaveFeed
};
})();
