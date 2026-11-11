(function(){
const E=window.PSO_ENGINE,B=window.PSO_BUNDLE,M=window.PSO_MAG_ENGINE;
const $=s=>document.querySelector(s);
const surface=$('#surface'),input=$('#prompt'),form=$('#askForm'),banner=$('#memoryImg'),audio=$('#bgAudio'),audioBtn=$('#audioBtn');
const PERSONALITY='/pso/assets/pso/personality/';
const RICO_IMG=PERSONALITY+'rico.jpg';
const RAPPY_GIF=PERSONALITY+'rappy-dance.gif';
const TELEPIPE_GIF=PERSONALITY+'telepipe-loading.gif';
const FOOTERS=[
 PERSONALITY+'footer-01.webp',
 PERSONALITY+'footer-02.jpg',
 PERSONALITY+'footer-03.png',
 PERSONALITY+'footer-04.jpg',
 PERSONALITY+'footer-05.png'
];
const footerImg=document.querySelector('#randomFooterImg');
if(footerImg&&FOOTERS.length){
 const shuffled=[...FOOTERS].sort(()=>Math.random()-.5);
 let i=0;
 const tryNext=()=>{
   if(i>=shuffled.length){
     footerImg.removeAttribute('src');
     footerImg.alt='';
     footerImg.closest('.footerFrame')?.classList.add('footerFallback');
     return;
   }
   footerImg.onerror=tryNext;
   footerImg.src=shuffled[i++];
 };
 tryNext();
}
function publicLabel(s){
 s=String(s||'');
 // Hide implementation filenames and internal corpus identifiers.
 s=s.replace(/\b\d+_RICO_[A-Z0-9_]+\.txt\b/gi,'RICO knowledge');
 s=s.replace(/\b(?:KNOWLEDGE_INDEX_QUERY_MAP|IDENTITY_AUTHORITY_PLATFORM_RULES|SECTION_SCAN_CALCULATOR_REFERENCE|RICO_KNOWLEDGE_INDEX_QUERY_MAP)\b/gi,'RICO knowledge');
 s=s.replace(/\.txt\b/gi,'');
 return s;
}
function publicDeep(v){
 if(typeof v==='string')return publicLabel(v);
 if(Array.isArray(v))return v.map(publicDeep);
 if(v&&typeof v==='object'){
  const out={};
  for(const [k,val] of Object.entries(v))out[k]=publicDeep(val);
  return out;
 }
 return v;
}
function ricoCard(){
 return `<aside class="ricoResponder" aria-label="RICO responder">
   <div class="ricoPortraitWrap"><img class="ricoPortrait" src="${RICO_IMG}" alt="RICO"></div>
   <div class="ricoName">RICO</div>
   <div class="ricoRole">PSO EXPERT · RAGOL LINK</div>
   <div class="ricoSignal"><span class="live">● ONLINE</span><br>Answer synthesized from the PSO canon.</div>
 </aside>`;
}
function rappyDivider(){
 return `<div class="rappyDivider" aria-hidden="true"><img src="${RAPPY_GIF}" alt=""></div>`;
}
function loadingSurface(question){
 return `<section class="surfaceShell">
   <div class="ricoLoading">
     <div>
       <div class="telepipe"><img src="${TELEPIPE_GIF}" alt="PSO telepipe loading"></div>
       <div class="loadingTitle">RICO LINKING TO RAGOL<span class="loadingDots"></span></div>
       <div class="loadingSub">${E.esc(question)}</div>
     </div>
   </div>
 </section>`;
}

let bannerIndex=Math.floor(Math.random()*Math.max(1,B.banners.length));
function rotateBanner(){if(!B.banners.length)return;banner.style.opacity='.12';setTimeout(()=>{banner.src=B.banners[bannerIndex%B.banners.length];bannerIndex++;banner.style.opacity='.68'},220)}
rotateBanner();setInterval(rotateBanner,6500);
function playSfx(name){try{const a=new Audio('/pso/assets/pso/sfx/'+name);a.volume=.28;a.play().catch(()=>{})}catch(e){}}
function chip(t,cls=''){return `<span class="chip ${cls}">${E.esc(t)}</span>`}
function shell(intent,title,lead,body,chips='',source=''){return `<section class="surfaceShell"><header class="surfaceHead"><div><div class="eyebrow">PSO · GENERATED SURFACE</div><h1>${E.esc(title)}</h1></div><span class="intent">${E.esc(intent)}</span></header>${lead?`<div class="lead">${lead}</div>`:''}${chips?`<div class="chips">${chips}</div>`:''}${body}${source?`<div class="sourceNote">${E.esc(source)}</div>`:''}</section>`}
function resultCard(r){const img=r.monsterImage?`<div class="resultImage"><img src="${E.esc(r.monsterImage)}" alt="${E.esc(r.monster)}"></div>`:'';return `<article class="resultCard">${img}<div class="resultBody"><h3>${E.esc(r.monster)}</h3><div class="itemName">${E.esc(r.item)}</div><div class="meta">${E.esc(r.episode)} · ${E.esc(r.difficulty)} · ${E.esc(r.area)}<br>${E.esc(r.sectionId)} · ${E.esc(r.platform)}</div><div class="bigRate">${E.esc(r.rate)}</div><div class="prob">Expected kills ≈ ${Number(r.expectedKills||0).toLocaleString(undefined,{maximumFractionDigits:1})}</div></div></article>`}
function renderSectionCalc(p){const gc=E.titleUpper(E.calcSectionId(p.name,p.cls,false));if(window.PSO_HUNT_ROUTER?.setCalculatedSectionId){window.PSO_HUNT_ROUTER.setCalculatedSectionId(gc);}else{window.dispatchEvent(new CustomEvent('pso:section-id-calculated',{detail:{sectionId:gc}}));}const bb=p.cls?E.titleUpper(E.calcSectionId(p.name,p.cls,true)):'';const gcLogo=E.sidLogo(gc);let body=`<div class="sidHero"><img class="sidLogo" src="${gcLogo}" alt="${gc}"><div><div class="eyebrow">GAMECUBE / XBOX</div><div class="sidName">${E.esc(gc)}</div><div class="formula">name: ${E.esc(p.name)}\ncapitalization preserved\nconsole modifier: 5</div></div></div>`;if(p.cls){const bbLogo=E.sidLogo(bb);body+=`<div class="sidHero" style="border-top:1px solid #294b6e"><img class="sidLogo" src="${bbLogo}" alt="${bb}"><div><div class="eyebrow">BLUE BURST · ${E.esc(p.cls)}</div><div class="sidName">${E.esc(bb)}</div><div class="formula">class modifier: ${E.CLASS_MOD[p.cls]}\nname capitalization preserved</div></div></div>`}else{body+=`<div class="evidence"><h3>Blue Burst needs one more input</h3><pre>For Blue Burst the packaged calculator uses the character class modifier. Add a class such as HUmar, RAmarl or FOnewearl to the same prompt.</pre></div>`}return shell('SECTION SCAN',`Section ID: ${p.name}`,`The deterministic Section Scan formula ran locally. No LLM guessed this result.`,body,chip('GameCube / Xbox','gold')+(p.cls?chip('Blue Burst','green'):''),'Deterministic source: packaged PSODrops Section ID calculator.');}
function renderDrop(p){const rows=E.dropRoutes(p);const mode=p.mode==='bb'?'Blue Burst':'GameCube / Xbox';if(!rows.length){let lead=`No exact ${E.esc(mode)} row matches <b>${E.esc(p.item)}</b>${p.sids.length?` on <b>${E.esc(p.sids.join(', '))}</b>`:''}.`;if(p.sids.length)lead+=' The service is not inventing a route.';const all=E.dropRoutes({...p,sids:[],difficulty:''}).slice(0,6);const body=all.length?`<div class="lead">Available routes for the item instead:</div><div class="surfaceGrid">${all.map(resultCard).join('')}</div>`:`<div class="emptySurface">No packaged route found for this item in the selected platform dataset.</div>`;return shell('DROP HUNT',p.item,lead,body,chip(mode,'gold')+(p.sids[0]?chip(p.sids[0]):''),'Deterministic drop records only.');}
const top=rows.slice(0,6),best=top[0];const chance=best?.probabilityAfter?.['100'];const lead=`Best packaged match: <b>${E.esc(best.monster)}</b> in <b>${E.esc(best.area)}</b> at <b>${E.esc(best.rate)}</b>.${chance!=null?` After 100 kills, the packaged cumulative chance is <b>${chance}%</b>.`:''}`;const chips=[chip(mode,'gold'),best?chip(best.difficulty):'',best?chip(best.sectionId):'',top.length>1?chip(`${rows.length} matching routes`,'green'):'' ].join('');const body=`<div class="surfaceGrid">${top.map(resultCard).join('')}</div>`;return shell('DROP HUNT',p.item,lead,body,chips,`Source: ${best?.source||'packaged drop database'}. Platform rows are kept separate.`)}
function renderProfile(p){const s=p.sids[0],x=E.sectionProfile(p),logo=E.sidLogo(s),mode=p.mode==='bb'?'Blue Burst':'GameCube / Xbox';const areas=Object.entries(x.areas).sort((a,b)=>b[1]-a[1]).slice(0,6);const body=`<div class="sidHero"><img class="sidLogo" src="${logo}" alt="${s}"><div><div class="eyebrow">${E.esc(mode)}</div><div class="sidName">${E.esc(s)}</div><div class="meta">${x.rows.length.toLocaleString()} drop rows · ${x.uniq.length.toLocaleString()} distinct item labels</div></div></div><div class="chips">${areas.map(([a,n])=>chip(`${a}: ${n}`)).join('')}</div><div class="surfaceGrid">${x.best.slice(0,6).map(resultCard).join('')}</div>`;return shell('SECTION PROFILE',`${s} at a glance`,`A generated profile assembled from the currently selected deterministic drop dataset.`,body,chip(mode,'gold'),'Profile counts are generated from packaged records, not from model memory.')}
function renderCompare(p){const x=E.compare(p),mode=p.mode==='bb'?'Blue Burst':'GameCube / Xbox';function col(s,arr,count){return `<div class="compareCol"><div class="compareTitle"><img src="${E.sidLogo(s)}" alt="${s}"><div><b>${s}</b><div class="meta">${count} unique-only item labels</div></div></div><ul class="miniList">${arr.map(r=>`<li><b>${E.esc(r.item)}</b><br>${E.esc(r.monster)} · ${E.esc(r.area)} · ${E.esc(r.rate)}</li>`).join('')||'<li>No unique rows in this filtered view.</li>'}</ul></div>`}const body=`<div class="lead">Shared item labels: <b>${x.overlap.length}</b>.</div><div class="compareCols">${col(x.a,x.topA,x.onlyA.length)}${col(x.b,x.topB,x.onlyB.length)}</div>`;return shell('SECTION COMPARE',`${x.a} vs ${x.b}`,`The page was generated from set overlap in the ${E.esc(mode)} drop records.`,body,chip(mode,'gold')+(p.difficulty?chip(p.difficulty):''),'This is computed coverage, not a community-tier judgment.')}
function blockHtml(block,idx=0){
 const heading=block.heading?`<h3>${E.esc(publicLabel(block.heading))}</h3>`:'';
 const text=block.text?`<p>${E.esc(publicLabel(block.text))}</p>`:'';
 const items=Array.isArray(block.items)?block.items:[];
 let html='';
 if(block.type==='sources')return '';
 if(block.type==='steps')html=`<div class="genBlock stepsBlock">${heading}${text}<ol>${items.map(x=>`<li>${E.esc(publicLabel(x.value||x.label||''))}</li>`).join('')}</ol></div>`;
 else if(block.type==='bullets')html=`<div class="genBlock bulletsBlock">${heading}${text}<ul>${items.map(x=>`<li>${E.esc(publicLabel(x.value||x.label||''))}</li>`).join('')}</ul></div>`;
 else if(block.type==='facts')html=`<div class="genBlock factsBlock">${heading}${text}<div class="factGrid">${items.map(x=>`<div class="fact"><b>${E.esc(publicLabel(x.label||''))}</b><span>${E.esc(publicLabel(x.value||''))}</span></div>`).join('')}</div></div>`;
 else if(block.type==='warning')html=`<div class="genBlock warningBlock">${heading}${text}${items.map(x=>`<p><b>${E.esc(publicLabel(x.label||''))}</b>${x.value?`: ${E.esc(publicLabel(x.value))}`:''}</p>`).join('')}</div>`;
 else html=`<div class="genBlock ${E.esc(block.type||'text')}Block">${heading}${text}${items.map(x=>`<p>${x.label?`<b>${E.esc(publicLabel(x.label))}</b> `:''}${E.esc(publicLabel(x.value||''))}</p>`).join('')}</div>`;
 if(idx>0 && idx%2===1)html+=rappyDivider();
 return html;
}
function renderGeneratedSurface(rawSpec,mods,meta={},magPlan=null){
 const spec=publicDeep(rawSpec||{});
 const blocks=(Array.isArray(spec.blocks)?spec.blocks:[]).filter(b=>b&&b.type!=='sources');
 const followups=Array.isArray(spec.followups)?spec.followups:[];
 const magHtml=(magPlan&&M)?M.renderWidget(magPlan,'maglab-main'):'';
 const correctionHtml=(meta&&Array.isArray(meta.corrections)&&meta.corrections.length)
   ?`<div class="ricoCorrection">RICO corrected: ${meta.corrections.map(E.esc).join(' · ')}</div>`:'';
 let body=`<div class="generatedLayout"><div class="generatedMain">
   ${correctionHtml}
   ${magHtml}
   <div class="generatedBlocks">${blocks.map((b,i)=>blockHtml(b,i)).join('')}</div>`;
 if(followups.length)body+=`<div class="followups"><h3>Continue on Ragol</h3>${followups.map(q=>`<button class="followup" data-q="${E.esc(publicLabel(q))}">${E.esc(publicLabel(q))}</button>`).join('')}</div>`;
 body+=`<div class="publicProvenance">${magPlan?'RICO + MAG LAB · PSO canon · platform-scoped evidence':'RICO knowledge · platform-scoped PSO evidence'}</div></div>${ricoCard()}</div>`;
 const intent=magPlan?'MAG LAB / RICO':spec.surface_type==='planner'?'MAG / ROUTE PLAN':spec.surface_type==='comparison'?'COMPARE':spec.surface_type==='guide'?'RICO GUIDE':'RICO ANSWER';
 return shell(intent,publicLabel(spec.title||'PSO answer'),E.esc(publicLabel(spec.lead||'')),body,'','');
}
async function renderRico(p){
 const mods=E.retrieve(p.q);
 const saveCoach=window.PSO_SAVE_MAG_COACH;
 const saveLinked=Boolean(saveCoach?.isLinked?.());
 // General game knowledge is independent of an imported character or MAG.
 const personalMagQuestion=/\b(my|mijn|huidige|current|own|eigen|this|deze|verified|save|linked)\s+(?:\w+\s+){0,2}(?:mag|mags|save|stats|state|character|personage)\b/i.test(p.q);
 const magMatrixRelevant=Boolean(saveLinked&&personalMagQuestion&&M?.isEndpointMatrixQuery?.(p.q));
 const magRelevant=Boolean(M&&p.knowledgeIntent!=='account_router'&&p.knowledgeIntent!=='gear_progression'&&(M.isPlannerQuery(p.q)||p.knowledgeIntent==='mag')); 
 const magPlan=magMatrixRelevant?null:((saveLinked&&personalMagQuestion&&magRelevant)?saveCoach.planForQuery(p.q):((M&&M.isPlannerQuery(p.q))?M.planFromQuery(p.q):null));
 const huntRouter=window.PSO_HUNT_ROUTER;
 const accountRouter=window.PSO_ACCOUNT_ROUTER;
 const gearRouter=window.PSO_GEAR_PROGRESSION;
 const accountRelevant=Boolean(accountRouter?.isQueryRelevant?.(p.q));
 const gearRelevant=Boolean(!accountRelevant&&gearRouter?.isQueryRelevant?.(p.q));
 const saveOverviewRelevant=Boolean(saveLinked&&!accountRelevant&&!gearRelevant&&!magRelevant&&/\b(my save|my character|based on (?:my|the) save|what should i (?:do|focus on|hunt) next|what next|next step|progression|advise me|recommend for me)\b/i.test(p.q));
 const deterministicFacts=[];
 if(saveOverviewRelevant){
   const so=saveCoach?.overviewFacts?.(); if(so)deterministicFacts.push(so);
   const go=gearRouter?.overviewFacts?.(); if(go)deterministicFacts.push(go);
 }
 if(magMatrixRelevant&&!accountRelevant&&!gearRelevant){
   const mf=saveCoach?.ricoFacts?.(p.q);if(mf)deterministicFacts.push(mf);
 } else if(magPlan&&!accountRelevant&&!gearRelevant){
   const mf=(saveLinked&&personalMagQuestion&&M.deterministicFactsFromVerifiedSave)?saveCoach.ricoFacts(p.q):M.deterministicFacts(magPlan);
   if(mf)deterministicFacts.push(mf);
 }
 if(p.knowledgeIntent==='section_strategy'&&E.sectionStrategyFacts){
   const sf=E.sectionStrategyFacts(p);
   if(sf)deterministicFacts.push(sf);
 }
 if(huntRouter?.ricoFactsForQuery&&!accountRelevant&&!gearRelevant){
   const hf=await huntRouter.ricoFactsForQuery(p.q);
   if(hf)deterministicFacts.push(hf);
 }
 if(accountRelevant&&accountRouter?.ricoFactsForQuery){
   const af=accountRouter.ricoFactsForQuery(p.q);
   if(af)deterministicFacts.push(af);
 }
 if(gearRelevant&&gearRouter?.ricoFactsForQuery){
   const gf=await gearRouter.ricoFactsForQuery(p.q);
   if(gf)deterministicFacts.push(gf);
 }
 surface.innerHTML=loadingSurface(p.q);
 try{
  const res=await fetch('api/pso.php',{method:'POST',headers:{'Content-Type':'application/json','Accept':'application/json'},body:JSON.stringify({world:'pso',query:p.q,intent:'rico',platform:p.mode,routed_modules:mods.map(m=>m.file),deterministic_facts:deterministicFacts,verified_player_save:(saveLinked&&(personalMagQuestion||accountRelevant||gearRelevant||saveOverviewRelevant))?saveCoach.ricoSaveState():null})});
  let data={};try{data=await res.json()}catch(_){throw new Error(`Ragol link returned HTTP ${res.status}`)}
  if(!res.ok||!data.ok)throw new Error(data.detail||data.error||`Ragol link returned HTTP ${res.status}`);
  const renderMeta={...(data.meta||{}),corrections:p.corrections||[]};
  surface.innerHTML=renderGeneratedSurface(data.surface,mods,renderMeta,magPlan);
  surface.querySelectorAll('.followup').forEach(b=>b.addEventListener('click',()=>{input.value=b.dataset.q||b.textContent;input.focus();run(input.value)}));
  if(magPlan&&M){
    const root=surface.querySelector('[data-maglab="maglab-main"]');
    M.bindWidget(root,magPlan);
  }
 }catch(err){
  const msg=err&&err.message?err.message:String(err);
  const magFallback=magPlan&&M?M.renderWidget(magPlan,'maglab-main'):'';
  const body=`<div class="generatedLayout"><div class="generatedMain">
    ${magFallback}
    <div class="genBlock warningBlock"><h3>Ragol link interrupted</h3><p>${E.esc(publicLabel(msg))}</p></div>
    <div class="publicProvenance">PSO core remains ready.</div></div>${ricoCard()}</div>`;
  surface.innerHTML=shell(magPlan?'MAG LAB':'RICO LINK',magPlan?'MAG Lab remains available':'Transmission interrupted','The local PSO tools are still available.',body,'','');
  if(magPlan&&M){
    const root=surface.querySelector('[data-maglab="maglab-main"]');
    M.bindWidget(root,magPlan);
  }
 }
}
async function run(q){
 const raw=String(q||'').trim();
 if(!raw)return;

 // v0.5 ROUTING GUARDS:
 // Account topology owns requests that explicitly combine MAG handoffs and hunt coverage.
 // Keep MAG-only and Hunt-only intents isolated so their deterministic UIs do not cross-spawn.
 const forceGear=/\b(gear progression|gear|equipment|loadout|weapon upgrade|upgrade (?:my )?weapon|what can i equip|equip now|next weapon|next gun|best weapon|best gun|farm next weapon|farm a weapon|upgrade first|what should i use|better weapon|gun upgrade|rifle upgrade|handgun upgrade|mechgun upgrade|shot upgrade)\b/i.test(raw);
 const forceAccount=/\b(account router|account route|account topology|character network|alternate characters?|handoff character|merge (?:my )?mag|mag.{0,30}hunt|hunt.{0,30}mag|minimal account|smallest account|one character.{0,20}two jobs)\b/i.test(raw);
 const forceMag=/\b(mag|mags|sato|nidra|rati|diwari|savitri|rukmin|deva|pushan|bhima|feeding|feed|evolution|evolve|photon blast|photon blasts|pb|mag plan|raise a|raise an|mag route|mag build)\b/i.test(raw)
   || (/\b(plan|planner|build|possible|can i|should i|how do i|how can i|starting|starter|goal)\b/i.test(raw)
       && /\b(humar|hunewearl|hucast|hucaseal|ramar|ramarl|racast|racaseal|fomar|fomarl|fonewm|fonewearl|hunter|ranger|force)\b/i.test(raw));
 const forceHunt=/\b(all[- ]?id|all section ids?|hunt router|wishlist|best section id|which section id|alternate section|alternate id|section coverage|fastest hunt|minimum coverage)\b/i.test(raw);
 const forceSaveAdvice=/\b(my save|my character|based on (?:my|the) save|what should i (?:do|focus on|hunt) next|what next|next step|progression|advise me|recommend for me)\b/i.test(raw)&&Boolean(window.PSO_SAVE_MAG_COACH?.isLinked?.());
 const forceRico=forceAccount||forceGear||forceMag||forceHunt||forceSaveAdvice;

 const p=E.parse(raw);
 if(forceRico){
   p.type='rico';
   if(forceAccount)p.knowledgeIntent='account_router';
   else if(forceGear)p.knowledgeIntent='gear_progression';
   else if(forceMag)p.knowledgeIntent='mag';
   else if(forceHunt)p.knowledgeIntent='hunt_router';
 }

 surface.classList.add('loading');
 playSfx('buttonpressaccept.ogg');
 await new Promise(r=>setTimeout(r,120));

 let html='';
 if(p.type==='section_calc')html=renderSectionCalc(p);
 else if(p.type==='drop_hunt')html=renderDrop(p);
 else if(p.type==='section_compare')html=renderCompare(p);
 else if(p.type==='section_profile')html=renderProfile(p);
 else {
   surface.classList.remove('loading');
   await renderRico(p);
   surface.scrollIntoView({behavior:'smooth',block:'start'});
   playSfx('endpointreached.ogg');
   return;
 }
 surface.innerHTML=html;
 surface.classList.remove('loading');
 surface.scrollIntoView({behavior:'smooth',block:'start'});
 playSfx('endpointreached.ogg');
}
form.addEventListener('submit',e=>{e.preventDefault();const q=input.value.trim();if(q)run(q)});document.querySelectorAll('.example').forEach(b=>b.addEventListener('click',()=>{input.value=b.dataset.q;input.focus()}));audioBtn.addEventListener('click',()=>{if(audio.paused){audio.volume=.23;audio.play().then(()=>audioBtn.textContent='♫ PSO MUSIC: ON').catch(()=>{})}else{audio.pause();audioBtn.textContent='♫ PSO MUSIC: OFF'}});
input.focus();
})();