/* Emerald v0.1.24.8.4 · Shared Context / Strategy Pokédex + verified transfer-files handoff
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
  function sourceLabel(s){return s==='field'?'MY FIELD':s==='teamlab'?'TEAM LAB':'LIVE';}
  function findOwnedById(id){if(!id||!state)return null;const [pid,ot]=String(id).split(':').map(Number);return [...(state.party||[]),...(state.boxes||[])].filter(Boolean).find(m=>(m.personality>>>0)===(pid>>>0)&&(m.otId>>>0)===(ot>>>0))||null;}
  function projectedName(mon){try{const r=E&&knowledge&&mon?E.projectedRecord(knowledge,mon):null;return r&&r.name!==mon.species?r.name:'';}catch(e){return'';}}
  function updateBar(){
    if(!bar)return;
    if(!isDex()){bar.hidden=true;if(snapshot)snapshot.hidden=true;return;}
    bar.hidden=false;
    const mon=findOwnedById(ctx.specimenId)||(state?.wild&&identity(state.wild)===ctx.specimenId?state.wild:null)||state?.primary||null;
    const sprite=Number(mon?.dexNo||ctx.dexNo)||0,species=mon?.species||ctx.species||'No active specimen',final=projectedName(mon),hp=mon?.hiddenPower?.type?`HP ${mon.hiddenPower.type}${Number.isFinite(mon.hiddenPower.power)?` ${mon.hiddenPower.power}`:''}`:'',loc=ctx.location||((mon?.kind==='WILD')?'WILD · LIVE':'');
    const bits=[final?`→ ${final}`:'',hp,loc].filter(Boolean);
    bar.innerHTML=`<div class="spx-label"><span>STRATEGY CONTEXT</span><small>${esc(sourceLabel(ctx.source))}</small></div><div class="spx-mon">${sprite?`<img src="./assets/pokemon/${sprite}.png" alt="">`:''}<div><strong>${esc(species)}</strong><small>${esc(bits.join(' · ')||'Play Emerald or select a specimen')}</small></div></div><div class="spx-actions"><button type="button" data-spx-go="field">MY FIELD</button><button type="button" data-spx-go="teamlab">TEAM LAB</button><button type="button" data-spx-go="transfer">TRANSFER</button></div>`;
    updateSnapshot(mon);
    const teamBtn=bar.querySelector('[data-spx-go="teamlab"]'),transferBtn=bar.querySelector('[data-spx-go="transfer"]');if(teamBtn&&!ctx.specimenId)teamBtn.disabled=true;if(transferBtn&&!mon)transferBtn.disabled=true;
    bar.querySelector('[data-spx-go="field"]')?.addEventListener('click',()=>{nav?.querySelector('[data-mode="field"]')?.click();if(ctx.specimenId)setTimeout(()=>globalThis.JRPGWorldMyField?.selectSpecimen?.(ctx.specimenId),0);});
    teamBtn?.addEventListener('click',()=>{if(ctx.specimenId)globalThis.JRPGWorldTeamLab?.openSpecimen?.(ctx.specimenId);});
    transferBtn?.addEventListener('click',()=>{if(mon)window.dispatchEvent(new CustomEvent('jrpg:transfer-files-open',{detail:{...ctx,specimenId:identity(mon),dexNo:mon.dexNo,species:mon.species,partySlot:ctx.partySlot,recordId:ctx.recordId,source:ctx.source}}));});
  }
  function updateSnapshot(mon){
    if(!snapshot)return;
    snapshot.hidden=!isDex()||activeMode()!=='live';if(snapshot.hidden)return;
    if(!mon||!E||!knowledge){snapshot.innerHTML='<div class="spx-snapshot-empty">Live Strategy Pokédex wakes up as soon as Emerald exposes a Pokémon.</div>';return;}
    try{const final=E.projectedRecord(knowledge,mon)||E.record(knowledge,mon.dexNo),roles=final?E.roleProfile(knowledge,final,mon).slice(0,3):[],speciesStab=final&&E.stabProfile?E.stabProfile(knowledge,final,mon,'species'):null,exactStab=final&&E.stabProfile?E.stabProfile(knowledge,final,mon,'exact'):null,best=speciesStab?.best,exact=exactStab?.best,axis=speciesStab?.axis||'—',fit=best?`${best.category.toUpperCase()} · STAB ${best.stabBp} BP · ${best.statKey==='atk'?'ATK':'SP.ATK'} ${best.stat} · pressure ${best.pressure}`:'No damaging STAB surfaced',exactNote=exact&&best&&exact.name!==best.name?`This specimen: ${exact.name} · ${exact.category} · ${exact.stabBp} STAB BP`:best?.potential?'Species ceiling · Hidden Power requires matching IV pattern':'Current legal move';snapshot.innerHTML=`<article><small>FUTURE</small><b>${esc(final?.name||mon.species)}</b><span>${esc(final?.tier||'EMERALD')}</span></article><article><small>ADV LENS</small><b>${esc(roles.map(r=>r.role).join(' · ')||'Developing')}</b><span>${esc(mon.hiddenPower?.type?`Exact HP ${mon.hiddenPower.type} ${mon.hiddenPower.power??''} · ${E.gen3Category?E.gen3Category(mon.hiddenPower.type):''}`:'exact specimen context')}</span></article><article><small>BEST STAB FIT · ${esc(axis.toUpperCase())}</small><b>${esc(best?.name||'No damaging STAB surfaced')}</b><span>${esc(fit)}${exactNote?` · ${esc(exactNote)}`:''}</span></article>`;}catch(e){snapshot.innerHTML='';}
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
    if(!bar){bar=document.createElement('section');bar.id='spx-context';bar.className='spx-context';bar.setAttribute('aria-live','polite');bar.hidden=true;nav.insertAdjacentElement('afterend',bar);snapshot=document.createElement('section');snapshot.id='spx-live-snapshot';snapshot.className='spx-live-snapshot';snapshot.hidden=true;bar.insertAdjacentElement('afterend',snapshot);nav.addEventListener('click',()=>setTimeout(()=>{if(isDex()&&activeMode()==='live')followLive();updateBar();},0));loadKnowledge();}
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
