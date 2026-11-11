/* Emerald v0.1.24.9 · Coverage-aware Strategy DEX lens
 * Presentation + context bridge only. DEX is a live layout mode inside the SAME document.
 * Switching modes never navigates, reloads or recreates the emulator.
 */
(() => {
  'use strict';
  let panel=null,nav=null,bar=null,snapshot=null,state=globalThis.JRPGWorldEmeraldState||null,knowledge=null;
  const E=globalThis.TeamLabEngine;
  const ctx=globalThis.JRPGWorldStrategyContext||{specimenId:null,recordId:null,partySlot:null,dexNo:null,species:'',location:'',source:'live'};
  globalThis.JRPGWorldStrategyContext=ctx;
  const isDex=()=>document.documentElement.dataset.emeraldMode==='dex';
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const identity=m=>m&&Number.isInteger(m.personality)&&Number.isInteger(m.otId)?`${m.personality>>>0}:${m.otId>>>0}`:null;
  const activeMode=()=>nav?.querySelector('button[aria-pressed="true"]')?.dataset.mode||'live';
  const fmtMult=n=>n===0?'0×':n===.25?'¼×':n===.5?'½×':n===1?'1×':n===2?'2×':n===4?'4×':`${n}×`;
  function coverageText(cov){if(!cov)return{weak:'—',safe:'—'};const weak=cov.weak.length?cov.weak.map(x=>`${x.type} ${fmtMult(x.multiplier)}`).join(' · '):'No type weakness';const safe=[...cov.immune.map(x=>x.abilityOverride?`${x.type} 0× (${x.ability})`:`${x.type} 0×`),...cov.resist.map(x=>`${x.type} ${fmtMult(x.multiplier)}`)].join(' · ')||'No resistances / immunities';return{weak,safe}}
  function sourceLabel(s){return s==='field'?'MY FIELD':s==='teamlab'?'TEAM LAB':'LIVE';}
  function findOwnedById(id){if(!id||!state)return null;const [pid,ot]=String(id).split(':').map(Number);return [...(state.party||[]),...(state.boxes||[])].filter(Boolean).find(m=>(m.personality>>>0)===(pid>>>0)&&(m.otId>>>0)===(ot>>>0))||null;}
  function projectedName(mon){try{const r=E&&knowledge&&mon?E.projectedRecord(knowledge,mon):null;return r&&r.name!==mon.species?r.name:'';}catch(e){return'';}}
  function updateBar(){
    // v0.1.24.8.6: shared specimen chrome was visually leaking LIVE context into FIELD,
    // TEAM LAB and TRAINER CARD. Keep the shared context as state only, not as a global card.
    if(bar)bar.hidden=true;
    if(!isDex()){if(snapshot)snapshot.hidden=true;return;}
    const mon=findOwnedById(ctx.specimenId)||(state?.wild&&identity(state.wild)===ctx.specimenId?state.wild:null)||state?.primary||null;
    updateSnapshot(mon);
  }
  function updateSnapshot(mon){
    if(!snapshot)return;
    snapshot.hidden=!isDex()||activeMode()!=='live';
    if(snapshot.hidden)return;
    if(!E||!knowledge){snapshot.innerHTML='<div class="spx-snapshot-empty">DEX analysis is loading.</div>';return;}
    try{
      const current=mon?E.record(knowledge,mon.dexNo):(ctx.dexNo?E.record(knowledge,ctx.dexNo):null),final=mon?(E.projectedRecord(knowledge,mon)||current):current;
      if(!current||!final){snapshot.innerHTML='<div class="spx-snapshot-empty">Select a Pokémon in Emerald or PokéField to inspect its DEX coverage.</div>';return;}
      const roles=E.roleProfile(knowledge,final,mon).slice(0,3),cov=E.coverageForRecord?E.coverageForRecord(knowledge,current,mon):null,ct=coverageText(cov);
      const hp=mon?.hiddenPower?.type?`Exact HP ${mon.hiddenPower.type} ${mon.hiddenPower.power??''} · ${E.gen3Category?E.gen3Category(mon.hiddenPower.type):''}`:'Species context';
      const position=final?.tier||'EMERALD',development=mon&&final.name!==mon.species?`Projects to ${final.name}`:'Final-form context';
      snapshot.innerHTML=`<article><small>ADV POSITION</small><b>${esc(position)}</b><span>${esc(development)}</span></article><article class="spx-coverage-card"><small>COVERAGE · DEFENSE</small><b>${esc(ct.weak)}</b><span>${esc(ct.safe)}</span></article><article><small>ADV LENS</small><b>${esc(roles.map(r=>r.role).join(' · ')||'Developing')}</b><span>${esc(hp)}</span></article>`;
    }catch(e){snapshot.innerHTML='';}
  }

  function setContext(detail={}){if(detail.specimenId!==undefined)ctx.specimenId=detail.specimenId;if(detail.recordId!==undefined)ctx.recordId=detail.recordId;if(detail.partySlot!==undefined)ctx.partySlot=detail.partySlot;if(detail.dexNo!==undefined)ctx.dexNo=detail.dexNo;if(detail.species!==undefined)ctx.species=detail.species;if(detail.location!==undefined)ctx.location=detail.location;if(detail.source)ctx.source=detail.source;updateBar();}
  function followLive(){if(activeMode()!=='live')return;const mon=state?.primary||state?.wild||state?.party?.[Number(state?.selectedParty||0)]||state?.party?.find(Boolean)||null;if(!mon){setContext({source:'live',specimenId:null,recordId:null,dexNo:null,species:'',location:''});return;}setContext({source:'live',specimenId:identity(mon),partySlot:mon.kind==='OWNED'?Number(state?.selectedParty||0):null,dexNo:mon.dexNo,species:mon.species,location:mon.kind==='WILD'?'WILD · LIVE':mon.kind==='OWNED'?`PARTY ${Number(state?.selectedParty||0)+1}`:''});}
  async function loadKnowledge(){try{const r=await fetch('./data/teamlab-emerald-v0.1.21.json?v=0.1.23',{cache:'force-cache'});if(r.ok)knowledge=await r.json();}catch(e){}updateBar();}
  function wrapAdvanced(){if(!isDex())return;const tl=document.getElementById('teamlab');if(!tl)return;[['.tl-threat-card','MATCHUPS & EV BENCHMARKS','Exact speed, damage, survival and EV tools'],['.tl-optimizer-card','TEAM OPTIMIZER','Six-stack search when you actually need it']].forEach(([sel,title,note])=>{const card=tl.querySelector(sel);if(!card||card.closest('.spx-collapsible'))return;const d=document.createElement('details');d.className='spx-collapsible';const s=document.createElement('summary');s.innerHTML=`<span>${title}</span><small>${note}</small>`;card.parentNode.insertBefore(d,card);d.append(s,card);});}
  function unwrapAdvanced(){document.querySelectorAll('#teamlab .spx-collapsible').forEach(d=>{const card=d.querySelector(':scope > .tl-card');if(card)d.replaceWith(card);else d.remove();});}
  function updateGameClass(){const playing=!!document.querySelector('.emulator-container.game-playing');document.body?.classList.toggle('spx-game-playing',isDex()&&playing);}
  function syncMode(){
    if(isDex()){
      wrapAdvanced();
      if(activeMode()==='live')followLive();else updateBar();
    }else{
      unwrapAdvanced();
      if(bar)bar.hidden=true;if(snapshot)snapshot.hidden=true;
    }
    updateGameClass();
  }
  function attach(){
    panel=document.getElementById('pokefield-live-panel');nav=panel?.querySelector('.opf-nav');if(!panel||!nav)return false;
    if(!bar){bar=document.createElement('section');bar.id='spx-context';bar.className='spx-context';bar.setAttribute('aria-live','polite');bar.hidden=true;nav.insertAdjacentElement('afterend',bar);snapshot=document.createElement('section');snapshot.id='spx-live-snapshot';snapshot.className='spx-live-snapshot';snapshot.hidden=true;const primary=document.getElementById('pf-primary');if(primary)primary.insertAdjacentElement('afterend',snapshot);else bar.insertAdjacentElement('afterend',snapshot);nav.addEventListener('click',()=>setTimeout(()=>{if(isDex()&&activeMode()==='live')followLive();updateBar();},0));loadKnowledge();}
    const tl=document.getElementById('teamlab');if(tl&&!tl.dataset.spxObserved){tl.dataset.spxObserved='1';new MutationObserver(()=>{if(isDex())wrapAdvanced();}).observe(tl,{childList:true,subtree:true});}
    syncMode();return true;
  }
  window.addEventListener('jrpg:emerald-state',e=>{state=e.detail||state;if(isDex()&&(activeMode()==='live'||!ctx.specimenId))followLive();else if(isDex())updateBar();updateGameClass();});
  window.addEventListener('jrpg:strategy-context',e=>setContext(e.detail||{}));
  window.addEventListener('jrpg:emerald-modechange',()=>syncMode());
  window.addEventListener('resize',updateGameClass,{passive:true});
  if(!attach()){const ob=new MutationObserver(()=>{if(attach())ob.disconnect();});ob.observe(document.documentElement,{childList:true,subtree:true});}
  new MutationObserver(()=>{updateGameClass();if(!panel)attach();}).observe(document.documentElement,{childList:true,subtree:true,attributes:true,attributeFilter:['class']});
})();
