/* JRPG.WORLD · Emerald verified transfer files v0.1.24.8.2
 * Truthful boundary: extracts the exact PK3 and locally compiles audited PK4 + PK5 files.
 * It does NOT send anything to Switch, Pokémon HOME, Bank, a 3DS, or any server.
 */
(() => {
  'use strict';
  const C=globalThis.JRPGWorldHomeBridgeCore,T=globalThis.JRPGWorldTransferCompiler;
  if(!C||!T){console.warn('Transfer-file core/compiler missing');return;}
  let state=globalThis.JRPGWorldEmeraldState||null,ctx=globalThis.JRPGWorldStrategyContext||{},modal=null,current=null;
  const cache=new Map();
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const identity=m=>m&&Number.isInteger(m.personality)&&Number.isInteger(m.otId)?`${m.personality>>>0}:${m.otId>>>0}`:null;
  const ribbonCount=m=>Number(m?.ribbons?.count||0);
  function normalizeRecordRef(recordId){
    const v=String(recordId||'');if(!v)return '';const parts=v.split(':');
    if(parts.length>=3&&/^P\d+$/.test(parts[2]))return `${parts[2]}:${parts[0]}:${parts[1]}`;
    if(parts.length>=4&&/^B\d+$/.test(parts[2]))return `${parts[2]}:${parts[3]}:${parts[0]}:${parts[1]}`;
    return v;
  }
  const sourceRefFor=(mon,context={})=>{
    const api=globalThis.JRPGWorldEmeraldTransfer,normalizedRecord=normalizeRecordRef(context.recordId);
    if(normalizedRecord&&api?.inspect?.(normalizedRecord))return normalizedRecord;
    if(mon?.transferRef&&api?.inspect?.(mon.transferRef))return mon.transferRef;
    const pid=mon?.personality>>>0,ot=mon?.otId>>>0;
    if(Number.isInteger(context.partySlot)){const r=`P${context.partySlot}:${pid}:${ot}`;if(api?.inspect?.(r))return r;}
    return api?.findRef?.(`${pid}:${ot}`)||'';
  };
  function findMon(context=ctx){
    if(!state)return null;const id=context?.specimenId||'';
    if(context?.recordId){const all=[...(state.party||[]),...(state.boxes||[])].filter(Boolean),r=normalizeRecordRef(context.recordId),hit=all.find(m=>m.transferRef===r);if(hit)return hit;}
    if(id){const all=[...(state.party||[]),...(state.boxes||[])].filter(Boolean),hit=all.find(m=>identity(m)===id);if(hit)return hit;if(state.wild&&identity(state.wild)===id)return state.wild;}
    return state.primary||state.party?.[Number(state.selectedParty||0)]||state.party?.find(Boolean)||null;
  }
  function cleanupLegacy(){
    document.querySelector('#home-bridge-modal')?.remove();
    document.querySelectorAll('button,a').forEach(el=>{if(/^SEND TO SWITCH$/i.test((el.textContent||'').trim()))el.remove();});
    document.querySelectorAll('[id*="switch-bridge"],[class*="switch-bridge"],[data-switch-bridge]').forEach(el=>el.remove());
    try{delete globalThis.JRPGWorldSwitchBridge;}catch(_){globalThis.JRPGWorldSwitchBridge=undefined;}
  }
  function ensure(){
    cleanupLegacy();
    if(modal&&document.body.contains(modal))return;
    modal=document.createElement('div');modal.id='transfer-files-modal';modal.hidden=true;
    modal.innerHTML=`<section class="tf-panel" role="dialog" aria-modal="true" aria-label="Gen III transfer files"><header class="tf-head"><div><small>JRPG.WORLD · EMERALD</small><h2>TRANSFER FILES</h2><p>VERIFIED LOCAL EXPORT · PK3 → PK4 → PK5</p></div><button class="tf-close" type="button">← BACK</button></header><div class="tf-body" id="tf-body"></div></section>`;
    document.body.appendChild(modal);
    modal.querySelector('.tf-close').onclick=close;
    modal.addEventListener('click',e=>{if(e.target===modal)close();});
  }
  function close(){if(modal)modal.hidden=true;document.documentElement.classList.remove('transfer-files-open');document.body?.classList.remove('transfer-files-open');}
  function sprite(mon){return mon?.dexNo?`<img src="./assets/pokemon/${Number(mon.dexNo)}.png" alt="">`:'';}
  function route(compiled=false){return `<div class="tf-route"><div class="tf-hop done"><b>EMERALD</b><small>LIVE SAVE ✓</small></div><div class="tf-hop done"><b>PK3</b><small>EXACT SOURCE ✓</small></div><div class="tf-hop ${compiled?'done':'next'}"><b>PK4</b><small>${compiled?'PAL PARK ✓':'EXPORTABLE'}</small></div><div class="tf-hop ${compiled?'done':'next'}"><b>PK5</b><small>${compiled?'POKÉ TRANSFER ✓':'EXPORTABLE'}</small></div></div>`;}
  function hero(mon,extra=''){const origin=mon?.origin?.game||'Generation III';return `<div class="tf-hero">${sprite(mon)}<div><h3>${esc(mon?.species||'Pokémon')}</h3><p>${esc(origin)} origin · Lv${Number(mon?.level||0)} · ${esc(mon?.nature||'')} ${esc(mon?.genderSymbol||'')}</p><div class="tf-badges"><span class="ok">GEN III SOURCE</span><span>PID ${esc(mon?.personalityHex||'')}</span>${mon?.hiddenPower?.type?`<span>HP ${esc(mon.hiddenPower.type)} ${Number(mon.hiddenPower.power)||''}</span>`:''}${extra}</div></div></div>`;}
  function shortHash(v){return v?`${v.slice(0,12)}…${v.slice(-8)}`:'—';}
  function compiledCard(res){if(!res)return '';const a=res.audit,t=res.transformations;return `<div class="tf-card compiled"><div class="tf-card-title"><h4>LOCAL FILES COMPILED ✓</h4><span>PK4 + PK5 VERIFIED</span></div><div class="tf-grid"><div><small>PK4</small><b>${shortHash(res.hashes?.pk4)}</b><em>Pal Park conversion</em></div><div><small>PK5</small><b>${shortHash(res.hashes?.pk5)}</b><em>Poké Transfer conversion</em></div><div><small>PID THROUGH GEN 5</small><b>${a.identity.pidPreservedThroughGen5?'PRESERVED ✓':'FAIL'}</b></div><div><small>GEN III HMs REMOVED</small><b>${t.gen3HMsRemoved.length?t.gen3HMsRemoved.join(', '):'NONE ✓'}</b></div></div></div>`;}
  function render(){
    ensure();const body=modal.querySelector('#tf-body'),mon=current?.mon;
    if(!mon){body.innerHTML='<div class="tf-warn">Load Emerald and select one of your Pokémon first.</div>';return;}
    const isWild=mon.kind==='WILD',isEgg=mon.kind==='EGG';
    if(isWild){body.innerHTML=hero(mon,'<span class="wait">WILD</span>')+`<div class="tf-warn"><strong>CATCH IT FIRST.</strong> Transfer-file export only works from a Pokémon actually stored in your save.</div>`;return;}
    if(isEgg){body.innerHTML=hero(mon,'<span class="wait">EGG</span>')+`<div class="tf-warn"><strong>HATCH IT FIRST.</strong> This compiler does not export an egg as a later-generation transfer entity.</div>`;return;}
    const ref=sourceRefFor(mon,current?.context||{}),api=globalThis.JRPGWorldEmeraldTransfer,raw=ref&&api?.getExactPK3?.(ref),check=raw?C.inspectPK3(raw):null,ready=!!(raw&&check?.valid),key=identity(mon),compiled=key?cache.get(key):null,ivs=mon.ivs||{},evs=mon.evs||{};
    body.innerHTML=hero(mon,ready?'<span class="ok">SOURCE VERIFIED</span>':'<span class="wait">LOCATING SOURCE BYTES…</span>')+route(!!compiled)+`
      <div class="tf-card"><h4>ORIGINAL SPECIMEN</h4><div class="tf-grid"><div><small>PID</small><b>${esc(mon.personalityHex||'—')}</b></div><div><small>TRAINER / SECRET ID</small><b>${Number(mon.trainerId)}/${Number(mon.secretId)}</b></div><div><small>GEN III CHECKSUM</small><b>${ready?`0x${Number(check.storedChecksum).toString(16).padStart(4,'0').toUpperCase()} ✓`:'SCANNING'}</b></div><div><small>IVs</small><b>${['hp','atk','def','spa','spd','spe'].map(k=>Number(ivs[k]??0)).join(' / ')}</b></div><div><small>EVs</small><b>${['hp','atk','def','spa','spd','spe'].map(k=>Number(evs[k]??0)).join(' / ')}</b></div><div><small>RIBBONS</small><b>${ribbonCount(mon)}</b></div></div></div>
      <div class="tf-card"><div class="tf-card-title"><h4>WHAT THIS ACTUALLY DOES</h4><span>LOCAL ONLY</span></div><p class="tf-note">Reads the exact PK3 from your Emerald save and can download verified PK4 and PK5 conversions using the audited project compiler. <strong>It does not send a Pokémon to Switch, Pokémon HOME, Bank, a 3DS, or any online service.</strong></p></div>
      ${compiledCard(compiled)}
      <div class="tf-actions"><button type="button" id="tf-compile" ${ready?'':'disabled'}>${compiled?'REBUILD PK4 + PK5 ZIP':'BUILD PK4 + PK5 ZIP'}</button><button type="button" class="secondary" id="tf-source" ${ready?'':'disabled'}>DOWNLOAD EXACT PK3</button><button type="button" class="secondary" id="tf-refresh">${ready?'VERIFY SOURCE AGAIN':'RETRY SOURCE SCAN'}</button></div>`;
    body.querySelector('#tf-refresh').onclick=()=>{current={...current,mon:findMon(current.context)};render();};
    body.querySelector('#tf-source').onclick=()=>{try{const stem=String(mon.species||'pokemon').replace(/[^a-z0-9_-]+/gi,'_');download(raw,`${stem}_${String(mon.personalityHex||'').replace(/^0x/i,'')}.pk3`,'application/octet-stream');toast('EXACT PK3 DOWNLOADED ✓');}catch(e){console.error(e);toast(e.message||'Could not export PK3',true);}};
    body.querySelector('#tf-compile').onclick=async()=>{const btn=body.querySelector('#tf-compile');try{btn.disabled=true;btn.textContent='BUILDING PK4 + PK5…';const res=await T.makeCompilerPack({pk3:raw,mon,date:new Date()});if(key)cache.set(key,res);download(res.pack,res.filename,'application/zip');toast('PK4 + PK5 FILES VERIFIED ✓');render();}catch(e){console.error(e);toast(e.message||'Transfer-file compilation failed',true);btn.disabled=false;btn.textContent='TRY AGAIN';}};
  }
  function download(data,name,type){const blob=new Blob([data],{type});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=name;document.body.appendChild(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove();},1500);}
  function toast(msg,bad=false){const el=document.createElement('div');el.className='tf-toast'+(bad?' bad':'');el.textContent=msg;document.body.appendChild(el);setTimeout(()=>el.remove(),3000);}
  function open(detail={}){cleanupLegacy();ctx={...ctx,...detail};current={context:{...ctx},mon:findMon(ctx)};ensure();render();modal.hidden=false;document.documentElement.classList.add('transfer-files-open');document.body?.classList.add('transfer-files-open');}
  window.addEventListener('jrpg:emerald-state',e=>{state=e.detail||state;if(current&&!modal?.hidden){current.mon=findMon(current.context);render();}});
  window.addEventListener('jrpg:strategy-context',e=>{ctx={...ctx,...(e.detail||{})};});
  window.addEventListener('jrpg:transfer-files-open',e=>open(e.detail||{}));
  document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!modal?.hidden)close();});
  cleanupLegacy();
  const guard=new MutationObserver(()=>cleanupLegacy());guard.observe(document.documentElement,{childList:true,subtree:true});
  globalThis.JRPGWorldTransferFiles={open,close,version:'0.1.24.8.2',compiler:T};
})();
