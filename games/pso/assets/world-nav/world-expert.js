(()=>{
'use strict';
const cfg={
  'xenosaga-en':{
    name:'Xenosaga I+II DS', lang:'English', expert:'KOS-MOS',
    placeholder:'Ask about lore, mechanics, enemies, maps, or the JP / EN / NL localization…',
    idle:'KOS-MOS is standing by.', submitting:'KOS-MOS is receiving your query…',
    loading:'KOS-MOS is routing this through the canonical game model…',
    ready:'KOS-MOS response ready.', error:'KOS-MOS link interrupted.'
  },
  'xenosaga-nl':{
    name:'Xenosaga I+II DS', lang:'Nederlands', expert:'KOS-MOS',
    placeholder:'Vraag over lore, mechanics, vijanden, maps of de JP / EN / NL-localisatie…',
    idle:'KOS-MOS staat klaar.', submitting:'KOS-MOS ontvangt je vraag…',
    loading:'KOS-MOS verwerkt dit via het canonieke gamemodel…',
    ready:'KOS-MOS antwoord staat klaar.', error:'KOS-MOS verbinding onderbroken.'
  },
  'gloria':{
    name:'Gloria Union', lang:'English', expert:'BLUE OCEAN COMPANION',
    placeholder:'Ask about battles, cards, characters, or paste a line from the game…',
    idle:'Pinger’s on deck.', submitting:'Pinger caught your question…',
    loading:'Pinger is rummaging through the ship’s log…',
    ready:'Found it. Have a look!', error:'Whoops — the logbook slipped overboard.'
  },
  'nova':{
    name:'Phantasy Star Nova', lang:'English', expert:'NOVA EXPERT',
    placeholder:'Ask about story, quests, tutorials, systems, the translation or release…',
    idle:'NOVA EXPERT is standing by.', submitting:'NOVA EXPERT is receiving your query…',
    loading:'NOVA EXPERT is synthesizing this world…',
    ready:'NOVA EXPERT response ready.', error:'NOVA EXPERT link interrupted.'
  }
};

const root=document.querySelector('[data-world-expert]'); if(!root)return;
const id=root.dataset.worldExpert, c=cfg[id]; if(!c)return;
const q=root.querySelector('[data-expert-query]');
const btn=root.querySelector('[data-expert-send]');
const out=root.querySelector('[data-expert-output]');
if(!out)return;
if(q&&c.placeholder)q.placeholder=c.placeholder;

const XENO_READER_ASSETS=[
  '/pso/assets/xenosaga/expert/kosmos-new-world.jpg',
  '/pso/assets/xenosaga/expert/kosmos-sophia.jpg',
  '/pso/assets/xenosaga/expert/kosmos-drift.jpg',
  '/pso/assets/xenosaga/expert/kosmos-orbit.webp'
];
const XENO_DIVIDER_GIF='/pso/assets/xenosaga/expert/kosmos-drift.gif';
const XENO_QUERY_GIF='/pso/assets/xenosaga/expert/kosmos-query-loading.gif';
const GLORIA_QUERY_GIF='/pso/assets/gloria/companion/pinger-loading.gif';
const GLORIA_READER_ASSETS=[
  '/pso/assets/gloria/companion/chapter-one.jpg',
  '/pso/assets/gloria/companion/pirate-character.jpg',
  '/pso/assets/gloria/companion/yggdra.webp'
];
const isXeno=id.startsWith('xenosaga');
const isGloria=id==='gloria';

root.classList.add('jw-expert-response-only');
if(isGloria)root.classList.add('jw-gloria-expert');
root.dataset.expertState='idle';
root.setAttribute('aria-busy','false');
out.setAttribute('aria-live','polite');
out.setAttribute('aria-atomic','false');

const responseSurface=document.createElement('div');
responseSurface.className='jw-expert-response-surface';
responseSurface.setAttribute('data-expert-response-surface','');
responseSurface.setAttribute('tabindex','-1');

const runtimeStatus=document.createElement('div');
runtimeStatus.className='jw-expert-runtime-status';
runtimeStatus.setAttribute('data-expert-runtime-status','');
runtimeStatus.setAttribute('role','status');
runtimeStatus.setAttribute('aria-live','polite');
runtimeStatus.innerHTML=isXeno
  ? `<div class="jw-expert-runtime-avatar jw-expert-runtime-avatar-xeno" aria-hidden="true"><img src="${XENO_QUERY_GIF}" alt=""></div><div class="jw-expert-runtime-copy"><small>KOS-MOS // RESPONSE LINK</small><strong data-expert-state-text>${c.idle}</strong><span data-expert-state-detail>Submit once from the composer above. The answer appears here.</span></div>`
  : isGloria
    ? `<div class="jw-expert-runtime-avatar jw-expert-runtime-avatar-gloria" aria-hidden="true"><img src="${GLORIA_QUERY_GIF}" alt=""></div><div class="jw-expert-runtime-copy"><small>BLUE OCEAN // COMPANION</small><strong data-expert-state-text>${c.idle}</strong><span data-expert-state-detail>Story trouble, battle trouble, suspicious pirates — ask away.</span></div>`
    : `<div class="jw-expert-runtime-avatar" aria-hidden="true"><span class="jw-expert-runtime-symbol">◈</span></div><div class="jw-expert-runtime-copy"><small>${c.expert} // RESPONSE LINK</small><strong data-expert-state-text>${c.idle}</strong><span data-expert-state-detail>Submit once from the composer above. The answer appears here.</span></div>`;

out.parentNode.insertBefore(responseSurface,out);
responseSurface.append(runtimeStatus,out);
const stateText=runtimeStatus.querySelector('[data-expert-state-text]');
const stateDetail=runtimeStatus.querySelector('[data-expert-state-detail]');

let state='idle';
let busy=false;
let activePromise=null;
let lastQuery='';

function emitState(next,message,detail=''){
  state=next;
  root.dataset.expertState=next;
  root.setAttribute('aria-busy',next==='submitting'||next==='loading'?'true':'false');
  if(stateText)stateText.textContent=message||c[next]||c.idle;
  if(stateDetail){
    if(detail) stateDetail.textContent=detail;
    else if(isGloria && next==='idle') stateDetail.textContent='Story trouble, battle trouble, suspicious pirates — ask away.';
    else if(isGloria && next==='submitting') stateDetail.textContent='One moment. Pinger’s got the question.';
    else if(isGloria && next==='loading') stateDetail.textContent='Digging through the voyage notes…';
    else if(isGloria && next==='ready') stateDetail.textContent='Want to keep going? Ask another question above.';
    else if(isGloria && next==='error') stateDetail.textContent='Give it another go from the question box above.';
    else if(next==='idle') stateDetail.textContent='Submit once from the composer above. The answer appears here.';
    else if(next==='submitting') stateDetail.textContent='Request accepted. Opening the response surface…';
    else if(next==='loading') stateDetail.textContent=lastQuery;
    else if(next==='ready') stateDetail.textContent='Ready for a follow-up from the top composer or the chips below.';
    else if(next==='error') stateDetail.textContent='You can retry from the top composer.';
  }
  window.dispatchEvent(new CustomEvent('jrpg:expert-state',{detail:{world:id,state:next,message:message||c[next]||'',query:lastQuery}}));
}

function escHtml(value){
  return String(value??'').replace(/[&<>"']/g,ch=>({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
  })[ch]);
}
function inlineXeno(text){
  let s=escHtml(text);
  s=s.replace(/`([^`]+)`/g,'<code>$1</code>');
  s=s.replace(/\*\*([^*]+)\*\*/g,'<strong>$1</strong>');
  s=s.replace(/\*([^*]+)\*/g,'<em>$1</em>');
  s=s.replace(/→/g,'<span class="jw-xeno-arrow">→</span>');
  return s;
}
function sectionKind(title){
  const t=String(title||'').toLowerCase();
  if(/explicit|canon|bewezen|evidence/.test(t))return 'canon';
  if(/interpret|implic|symbol|pattern|beteken/.test(t))return 'interpretation';
  if(/niet bewezen|grens|limit|uncertain|onzeker|niet weten/.test(t))return 'limits';
  if(/guide|mechanic|formation|enemy|ether|tech|item|map|progress/.test(t))return 'guide';
  if(/translation|vertal|japan|english|dutch|rom|technical|technisch/.test(t))return 'rom';
  return 'neutral';
}
function parseXenoMarkdown(raw){
  const lines=String(raw||'').replace(/\r/g,'').split('\n');
  const frag=document.createDocumentFragment();
  let current=null, list=null, listType='';
  const ensureSection=(title='',level=3)=>{
    current=document.createElement('section');
    current.className='jw-xeno-reader-section '+sectionKind(title);
    if(title){
      const h=document.createElement(level<=2?'h2':'h3');
      h.innerHTML=inlineXeno(title);
      current.appendChild(h);
    }
    frag.appendChild(current);
    list=null; listType='';
    return current;
  };
  const ensureCurrent=()=>current||ensureSection('',3);
  const closeList=()=>{list=null;listType='';};

  for(let i=0;i<lines.length;i++){
    const line=lines[i].trim();
    if(!line){ closeList(); continue; }
    const heading=line.match(/^(#{1,4})\s+(.+)$/);
    if(heading){ ensureSection(heading[2].trim(),heading[1].length); continue; }
    if(/^[-*_]{3,}$/.test(line)){
      closeList(); const hr=document.createElement('hr'); hr.className='jw-xeno-rule'; ensureCurrent().appendChild(hr); continue;
    }
    const bullet=line.match(/^[-*•]\s+(.+)$/);
    const numbered=line.match(/^\d+[.)]\s+(.+)$/);
    if(bullet||numbered){
      const type=numbered?'ol':'ul';
      if(!list||listType!==type){ closeList(); list=document.createElement(type); list.className='jw-xeno-reader-list'; ensureCurrent().appendChild(list); listType=type; }
      const li=document.createElement('li'); li.innerHTML=inlineXeno((bullet||numbered)[1]); list.appendChild(li); continue;
    }
    const arrow=line.match(/^[→↳]\s*(.+)$/);
    if(arrow){ closeList(); const callout=document.createElement('div'); callout.className='jw-xeno-reader-callout'; callout.innerHTML='<span>→</span><p>'+inlineXeno(arrow[1])+'</p>'; ensureCurrent().appendChild(callout); continue; }
    const quote=line.match(/^>\s*(.+)$/);
    if(quote){ closeList(); const bq=document.createElement('blockquote'); bq.innerHTML=inlineXeno(quote[1]); ensureCurrent().appendChild(bq); continue; }
    const jp=line.match(/^\*?JP:\s*(.+?)\*?$/i);
    if(jp){ closeList(); const p=document.createElement('p'); p.className='jw-xeno-jp-label'; p.innerHTML='<span>JP</span> '+inlineXeno(jp[1]); ensureCurrent().appendChild(p); continue; }
    closeList(); const p=document.createElement('p'); p.innerHTML=inlineXeno(line); ensureCurrent().appendChild(p);
  }
  return frag;
}
function xenoResponderCard(){
  const aside=document.createElement('aside');
  aside.className='jw-xeno-responder';
  aside.innerHTML=`
    <div class="jw-xeno-responder-art"><img src="/pso/assets/xenosaga/expert/kosmos-orbit.webp" alt="KOS-MOS"></div>
    <div class="jw-xeno-responder-name">KOS-MOS</div>
    <div class="jw-xeno-responder-role">XENOSAGA I+II · GAME EXPERT</div>
    <div class="jw-xeno-responder-signal"><span>● CANON LINK ACTIVE</span><br>LORE · GUIDE · TRANSLATION / ROM</div>`;
  return aside;
}
function insertXenoVisualBreaks(container){
  const sections=[...container.querySelectorAll('.jw-xeno-reader-section')];
  sections.forEach((section,index)=>{
    if(index===0||index%2!==0)return;
    const visual=document.createElement('figure');
    visual.className='jw-xeno-memory-break';
    const src=XENO_READER_ASSETS[(index/2-1)%XENO_READER_ASSETS.length];
    visual.innerHTML=`<img src="${src}" alt="" loading="lazy"><figcaption>XENOSAGA MEMORY // CANON SURFACE</figcaption>`;
    section.before(visual);
  });
  if(sections.length>1){
    const divider=document.createElement('div');
    divider.className='jw-xeno-gif-divider';
    divider.innerHTML=`<span></span><img src="${XENO_DIVIDER_GIF}" alt="" loading="lazy"><span></span>`;
    sections[0].after(divider);
  }
}
function renderXeno(data){
  out.textContent='';
  const meta=document.createElement('div'); meta.className='jw-xeno-answer-meta';
  const mode=document.createElement('strong'); mode.textContent=data.mode||'XENOSAGA EXPERT';
  const ev=document.createElement('span'); ev.textContent=`${Number(data.evidence_count||0)} canon references`; meta.append(mode,ev);
  const layout=document.createElement('div'); layout.className='jw-xeno-generated-layout';
  const main=document.createElement('div'); main.className='jw-xeno-generated-main';
  const reader=document.createElement('div'); reader.className='jw-xeno-answer-text jw-xeno-reader'; reader.appendChild(parseXenoMarkdown(data.answer||'')); insertXenoVisualBreaks(reader);
  const provenance=document.createElement('div'); provenance.className='jw-xeno-provenance'; provenance.textContent='KOS-MOS · Xenosaga I+II DS canon · generated reader surface';
  main.append(meta,reader,provenance); layout.append(main,xenoResponderCard()); out.append(layout);
}
function gloriaModeLabel(mode){
  const m=String(mode||'').toUpperCase();
  if(m.includes('TRANSLATION'))return 'THE WORDS BEHIND THE SCENE';
  if(m.includes('BATTLE')||m.includes('GUIDE'))return 'BATTLE HELP';
  if(m.includes('TECHNICAL'))return 'BEHIND THE CURTAIN';
  if(m.includes('STORY'))return 'STORY & CHARACTERS';
  return 'BLUE OCEAN COMPANION';
}
function gloriaResponderCard(){
  const aside=document.createElement('aside');
  aside.className='jw-xeno-responder jw-gloria-responder';
  aside.innerHTML=`
    <div class="jw-xeno-responder-art"><img src="/pso/assets/gloria/companion/blue-ocean-crew.png" alt="" loading="lazy"></div>
    <div class="jw-xeno-responder-name">BLUE OCEAN COMPANION</div>
    <div class="jw-xeno-responder-role">STORY · BATTLES · CHARACTERS</div>
    <div class="jw-xeno-responder-signal"><span>● PINGER ON DECK</span><br>Ask another question whenever you like.</div>`;
  return aside;
}
function insertGloriaVisualBreaks(container){
  const sections=[...container.querySelectorAll('.jw-xeno-reader-section')];
  if(sections.length<2)return;
  const visual=document.createElement('figure');
  visual.className='jw-gloria-memory-break';
  const src=GLORIA_READER_ASSETS[Math.abs(lastQuery.length)%GLORIA_READER_ASSETS.length];
  visual.innerHTML=`<img src="${src}" alt="" loading="lazy">`;
  sections[0].after(visual);
}
function renderGloria(data){
  out.textContent='';
  const layout=document.createElement('div'); layout.className='jw-xeno-generated-layout jw-gloria-generated-layout';
  const main=document.createElement('div'); main.className='jw-xeno-generated-main jw-gloria-generated-main';
  const meta=document.createElement('div'); meta.className='jw-gloria-answer-kicker';
  meta.textContent=gloriaModeLabel(data.mode);
  const reader=document.createElement('div'); reader.className='jw-xeno-answer-text jw-xeno-reader jw-gloria-reader';
  reader.appendChild(parseXenoMarkdown(data.answer||''));
  insertGloriaVisualBreaks(reader);
  main.append(meta,reader); layout.append(main,gloriaResponderCard()); out.append(layout);
}
function renderGeneric(data){
  out.textContent='';
  const answer=document.createElement('div');
  answer.className='jw-expert-answer-text';
  answer.textContent=data.answer||'';
  out.append(answer);
}
function reveal(){
  responseSurface.scrollIntoView({behavior:'smooth',block:'start'});
  window.setTimeout(()=>responseSurface.focus({preventScroll:true}),180);
}
function currentPlayerContext(options={}){
  if(!isGloria)return options.context||null;
  const progress=document.querySelector('[data-jw-gloria-progress]')?.value?.trim()||'';
  const spoilerButton=document.querySelector('[data-jw-gloria-spoiler]');
  const spoilerSafe=spoilerButton?spoilerButton.getAttribute('aria-pressed')!=='false':true;
  return Object.assign({progress,spoiler_safe:spoilerSafe},options.context||{});
}

async function ask(query,options={}){
  const text=String(query??'').trim();
  if(!text)return null;
  if(busy&&activePromise)return activePromise;

  lastQuery=text;
  if(q){ q.value=text; q.dispatchEvent(new Event('input',{bubbles:true})); }
  busy=true;
  if(btn)btn.disabled=true;
  if(q)q.disabled=true;
  out.hidden=false;
  out.textContent='';
  emitState('submitting',c.submitting,text);
  reveal();

  activePromise=(async()=>{
    await new Promise(resolve=>setTimeout(resolve,120));
    emitState('loading',c.loading,text);
    try{
      const res=await fetch('/pso/api/world-expert.php',{
        method:'POST',
        headers:{'Content-Type':'application/json','Accept':'application/json'},
        body:JSON.stringify({world:id,query:text,intent:root.dataset.expertIntent||'general',context:currentPlayerContext(options)})
      });
      let data={};
      try{ data=await res.json(); }catch(_){ throw new Error(`Expert returned HTTP ${res.status}`); }
      if(!res.ok||!data.ok)throw new Error(data.detail||data.error||'Expert unavailable');
      if(isXeno)renderXeno(data); else if(isGloria)renderGloria(data); else renderGeneric(data);
      emitState('ready',c.ready,text);
      return data;
    }catch(e){
      const message=e?.message||String(e);
      out.textContent='Expert link interrupted: '+message;
      emitState('error',c.error,message);
      throw e;
    }finally{
      busy=false;
      activePromise=null;
      if(btn)btn.disabled=false;
      if(q)q.disabled=false;
    }
  })();
  return activePromise;
}

root.querySelectorAll('[data-expert-prompt]').forEach(chip=>chip.addEventListener('click',()=>{
  const text=chip.dataset.expertPrompt||chip.textContent.trim();
  if(!text)return;
  // These are follow-up shortcuts now, not a second composer.
  ask(text,{source:'expert-chip'}).catch(()=>{});
}));
if(btn)btn.addEventListener('click',()=>ask(q?.value||'',{source:'debug-composer'}).catch(()=>{}));
if(q)q.addEventListener('keydown',e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();ask(q.value,{source:'debug-composer'}).catch(()=>{});}});

document.addEventListener('jrpg:expert-query',e=>{
  const d=e.detail||{};
  if(d.world&&d.world!==id)return;
  ask(d.query||'',{source:d.source||'event'}).catch(()=>{});
});

window.JRPGWorldExpert={
  world:id,
  root,
  responseSurface,
  ask,
  reveal,
  getState:()=>state,
  isBusy:()=>busy
};
window.dispatchEvent(new CustomEvent('jrpg:expert-ready',{detail:{world:id}}));
emitState('idle',c.idle);
})();
