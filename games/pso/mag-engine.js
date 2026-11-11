
(function(){
'use strict';
const C=window.PSO_MAG_CANON;
if(!C){ console.error('PSO_MAG_CANON missing'); return; }

const STAT_KEYS=['DEF','POW','DEX','MIND'];
const STAGE4_NAMES=[...new Set(Object.values(C.evolution.stage4).flat().flatMap(r=>[r.M.mag,r.F.mag]))];
const CLASS_NAMES=C.classes.map(x=>x.name).sort((a,b)=>b.length-a.length);
const SECTION_IDS=C.sectionIds;
const ASSET='./assets/pso/maglab/';
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

window.PSO_MAG_ENGINE={
  canon:C,parseOwner,parseTargetMag,parseCurrentMag,parseCurrentLevel,isPlannerQuery,planFromQuery,deterministicFacts,
  recommendSnack,renderWidget,bindWidget,magImg,clsImg,sidImg,pbImg,
  readEquation,solveCheckpoint,stage4Candidates
};
})();
