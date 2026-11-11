/* JRPG.WORLD · Pokémon HOME Bridge v0.1.24
 * P1: exact PK3 source + audited sequential transfer compiler.
 * Emits encrypted/checksummed PK4 + PK5 and a PK6 pre-bind contract.
 * No HOME server calls. No save writes. No fabricated HOME tracker or Gen6 handler/geo.
 */
(() => {
  'use strict';
  const C=globalThis.JRPGWorldHomeBridgeCore,T=globalThis.JRPGWorldTransferCompiler;
  if(!C||!T){console.warn('HOME Bridge core/compiler missing');return;}
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
  function ensure(){
    if(modal)return;modal=document.createElement('div');modal.id='home-bridge-modal';modal.hidden=true;
    modal.innerHTML=`<section class="hb-panel" role="dialog" aria-modal="true" aria-label="Pokémon HOME Bridge"><header class="hb-head"><div><small>JRPG.WORLD · EMERALD</small><h2>POKÉMON HOME BRIDGE</h2><p>TRANSFER COMPILER · v0.1.24</p></div><button class="hb-close" type="button">← BACK</button></header><div class="hb-body" id="hb-body"></div></section>`;
    document.body.appendChild(modal);modal.querySelector('.hb-close').onclick=close;modal.addEventListener('click',e=>{if(e.target===modal)close();});document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!modal.hidden)close();});
  }
  function close(){if(modal)modal.hidden=true;}
  function sprite(mon){return mon?.dexNo?`<img src="./assets/pokemon/${Number(mon.dexNo)}.png" alt="">`:'';}
  function route(compiled=false){return `<div class="hb-route hb-route-six"><div class="hb-hop done"><b>EMERALD</b><small>LIVE SAVE ✓</small></div><div class="hb-hop done"><b>PK3</b><small>EXACT SOURCE ✓</small></div><div class="hb-hop ${compiled?'done':'next'}"><b>PK4</b><small>${compiled?'PAL PARK ✓':'READY'}</small></div><div class="hb-hop ${compiled?'done':'next'}"><b>PK5</b><small>${compiled?'POKÉ TRANSFER ✓':'READY'}</small></div><div class="hb-hop next"><b>PK6</b><small>TARGET BIND NEXT</small></div><div class="hb-hop"><b>HOME</b><small>PENDING</small></div></div>`;}
  function hero(mon,extra=''){const origin=mon?.origin?.game||'Generation III';return `<div class="hb-hero">${sprite(mon)}<div><h3>${esc(mon?.species||'Pokémon')}</h3><p>${esc(origin)} origin · Lv${Number(mon?.level||0)} · ${esc(mon?.nature||'')} ${esc(mon?.genderSymbol||'')}</p><div class="hb-badges"><span class="ok">GEN III SOURCE</span><span>PID ${esc(mon?.personalityHex||'')}</span>${mon?.hiddenPower?.type?`<span>HP ${esc(mon.hiddenPower.type)} ${Number(mon.hiddenPower.power)||''}</span>`:''}${extra}</div></div></div>`;}
  function shortHash(v){return v?`${v.slice(0,12)}…${v.slice(-8)}`:'—';}
  function compiledCard(res){if(!res)return '';
    const a=res.audit,t=a.transformations,p=res.pk6Prebind;
    return `<div class="hb-card hb-compiled"><div class="hb-card-title"><h4>TRANSFER COMPILED ✓</h4><span class="hb-pass">PK4 + PK5 + STRING PARITY VERIFIED</span></div><div class="hb-grid"><div><small>PK4</small><b>${shortHash(res.hashes?.pk4)}</b><em>Met 0x0037 · Pal Park</em></div><div><small>PK5</small><b>${shortHash(res.hashes?.pk5)}</b><em>Met 30001 · Poké Transfer</em></div><div><small>PID THROUGH GEN 5</small><b>${a.identity.pidPreservedThroughGen5?'PRESERVED ✓':'FAIL'}</b></div><div><small>GEN III HMs REMOVED</small><b>${t.gen3HMsRemoved.length?t.gen3HMsRemoved.join(', '):'NONE ✓'}</b></div><div><small>PK6 EC</small><b>0x${Number(p.encryptionConstant).toString(16).padStart(8,'0').toUpperCase()}</b></div><div><small>PK6 PID RULE</small><b>${p.shinyRuleBitFlip?'BIT FLIP REQUIRED':'PRESERVED ✓'}</b></div></div><div class="hb-bind"><strong>PK6 TARGET BIND REQUIRED</strong><span>Handler name, 3DS country/region, base friendship and resolved Gen6 ability must come from the destination Gen6 save. This build refuses to invent them.</span></div></div>`;
  }
  function render(){
    ensure();const body=modal.querySelector('#hb-body'),mon=current?.mon;if(!mon){body.innerHTML='<div class="hb-warn">Load Emerald and select one of your Pokémon first.</div>';return;}
    const isWild=mon.kind==='WILD',isEgg=mon.kind==='EGG';
    if(isWild){body.innerHTML=hero(mon,'<span class="wait">WILD</span>')+`<div class="hb-warn" style="margin-top:12px"><strong>CATCH IT FIRST.</strong> The reader can inspect this encounter, but the transfer compiler only works from a Pokémon stored in your save.</div>${route(false)}<p class="hb-note">Catch it, then select it from Party or My Field.</p>`;return;}
    if(isEgg){body.innerHTML=hero(mon,'<span class="wait">EGG</span>')+`<div class="hb-warn" style="margin-top:12px"><strong>HATCH IT FIRST.</strong> The historical transfer path does not carry this specimen forward as an egg.</div>${route(false)}`;return;}
    const ref=sourceRefFor(mon,current?.context||{}),api=globalThis.JRPGWorldEmeraldTransfer,raw=ref&&api?.getExactPK3?.(ref),check=raw?C.inspectPK3(raw):null,ready=!!(raw&&check?.valid),key=identity(mon),compiled=key?cache.get(key):null,ivs=mon.ivs||{},evs=mon.evs||{};
    body.innerHTML=hero(mon,ready?'<span class="ok">SOURCE VERIFIED</span>':'<span class="wait">LOCATING SOURCE BYTES…</span>')+route(!!compiled)+`
      <div class="hb-card"><h4>ORIGINAL SPECIMEN</h4><div class="hb-grid"><div><small>PID</small><b>${esc(mon.personalityHex||'—')}</b></div><div><small>TRAINER / SECRET ID</small><b>${Number(mon.trainerId)}/${Number(mon.secretId)}</b></div><div><small>GEN III CHECKSUM</small><b>${ready?`0x${Number(check.storedChecksum).toString(16).padStart(4,'0').toUpperCase()} ✓`:'SCANNING'}</b></div><div><small>IVs</small><b>${['hp','atk','def','spa','spd','spe'].map(k=>Number(ivs[k]??0)).join(' / ')}</b></div><div><small>EVs</small><b>${['hp','atk','def','spa','spd','spe'].map(k=>Number(evs[k]??0)).join(' / ')}</b></div><div><small>RIBBONS</small><b>${ribbonCount(mon)}</b></div></div></div>
      <div class="hb-card"><div class="hb-card-title"><h4>v0.1.24 · TRANSFER COMPILER</h4><span>PKHeX-GROUNDED</span></div><p class="hb-note" style="margin:0">The exact PK3 is decrypted and transformed sequentially using the supplied PKHeX conversion rules: <strong>PK3 → PK4</strong> sets the Pal Park transfer location, reproduces PKHeX's language-aware Gen III→IV glyph conversion and Pal Park buffer-reuse/trash bytes, converts held-item IDs, expands Gen III ribbons, removes Gen III HMs and heals PP. <strong>PK4 → PK5</strong> stores nature explicitly, changes the transfer location to Poké Transfer, updates strings and heals PP again. Both emitted entities are checksummed and encrypted in their native stored format.</p></div>
      ${compiledCard(compiled)}
      <div class="hb-actions"><button type="button" id="hb-compile" ${ready?'':'disabled'}>${compiled?'RECOMPILE + DOWNLOAD':'COMPILE TRANSFER PATH'}</button><button type="button" class="secondary" id="hb-source" ${ready?'':'disabled'}>SOURCE CAPSULE</button><button type="button" class="secondary" id="hb-refresh">${ready?'VERIFY AGAIN':'RETRY SOURCE SCAN'}</button></div>
      <p class="hb-note"><strong>Hard boundary:</strong> v0.1.24 does not emit a fake “HOME-ready PK6”. PKHeX's Gen5→Gen6 transfer binds the Pokémon to a destination trainer and 3DS region context. The next bridge-binder build must read those fields from a user-supplied compatible Gen6 save. No HOME tracker or server history is fabricated.</p>`;
    body.querySelector('#hb-refresh').onclick=()=>{current={...current,mon:findMon(current.context)};render();};
    body.querySelector('#hb-source').onclick=async()=>{try{const btn=body.querySelector('#hb-source');btn.disabled=true;btn.textContent='BUILDING…';const res=await C.makeTransferPack({pk3:raw,mon,sourceRef:ref,sessionBuild:state?.version||'',pkhexReference:'User-supplied PKHeX source snapshot; v0.1.24 compiler audit included in build.'});download(res.pack,res.filename,'application/zip');toast('EXACT PK3 SOURCE CAPSULE EXPORTED ✓');btn.textContent='SOURCE EXPORTED ✓';}catch(e){console.error(e);toast(e.message||'Could not export source capsule',true);render();}};
    body.querySelector('#hb-compile').onclick=async()=>{const btn=body.querySelector('#hb-compile');try{btn.disabled=true;btn.textContent='COMPILING PK3 → PK4 → PK5…';const res=await T.makeCompilerPack({pk3:raw,mon,date:new Date()});if(key)cache.set(key,res);download(res.pack,res.filename,'application/zip');toast('TRANSFER PATH COMPILED + VERIFIED ✓');render();}catch(e){console.error(e);toast(e.message||'Transfer compilation failed',true);btn.disabled=false;btn.textContent='TRY COMPILER AGAIN';}};
  }
  function download(data,name,type){const blob=new Blob([data],{type});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=name;document.body.appendChild(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove();},1500);}
  function toast(msg,bad=false){const el=document.createElement('div');el.className='hb-toast';if(bad)el.style.borderColor='#e98b8b66';el.textContent=msg;document.body.appendChild(el);setTimeout(()=>el.remove(),3000);}
  function open(detail={}){ctx={...ctx,...detail};current={context:{...ctx},mon:findMon(ctx)};ensure();render();modal.hidden=false;}
  window.addEventListener('jrpg:emerald-state',e=>{state=e.detail||state;if(current&&!modal?.hidden){current.mon=findMon(current.context);render();}});
  window.addEventListener('jrpg:strategy-context',e=>{ctx={...ctx,...(e.detail||{})};});
  window.addEventListener('jrpg:home-bridge-open',e=>open(e.detail||{}));
  globalThis.JRPGWorldHomeBridge={open,close,version:T.BUILD,compiler:T};
})();
