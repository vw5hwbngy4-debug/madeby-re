/* JRPG.WORLD · Pokémon HOME Bridge v0.1.23
 * P0: exact Gen III source capture + provenance capsule.
 * No HOME server calls. No save writes. No fake HOME tracker generation.
 */
(() => {
  'use strict';
  const C=globalThis.JRPGWorldHomeBridgeCore;if(!C){console.warn('HOME Bridge core missing');return;}
  let state=globalThis.JRPGWorldEmeraldState||null,ctx=globalThis.JRPGWorldStrategyContext||{},modal=null,current=null;
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const identity=m=>m&&Number.isInteger(m.personality)&&Number.isInteger(m.otId)?`${m.personality>>>0}:${m.otId>>>0}`:null;
  const ribbonCount=m=>Number(m?.ribbons?.count||0);
  function normalizeRecordRef(recordId){
    const v=String(recordId||'');if(!v)return '';const parts=v.split(':');
    // My Field: PID:OT:Pn or PID:OT:Bbox:slot. TeamLab already uses Pn:PID:OT / Bbox:slot:PID:OT.
    if(parts.length>=3&&/^P\d+$/.test(parts[2]))return `${parts[2]}:${parts[0]}:${parts[1]}`;
    if(parts.length>=4&&/^B\d+$/.test(parts[2]))return `${parts[2]}:${parts[3]}:${parts[0]}:${parts[1]}`;
    return v;
  }
  const sourceRefFor=(mon,context={})=>{
    const api=globalThis.JRPGWorldEmeraldTransfer;
    const normalizedRecord=normalizeRecordRef(context.recordId);if(normalizedRecord&&api?.inspect?.(normalizedRecord))return normalizedRecord;
    if(mon?.transferRef&&api?.inspect?.(mon.transferRef))return mon.transferRef;
    const pid=mon?.personality>>>0,ot=mon?.otId>>>0;
    if(Number.isInteger(context.partySlot)){const r=`P${context.partySlot}:${pid}:${ot}`;if(api?.inspect?.(r))return r;}
    const hit=api?.findRef?.(`${pid}:${ot}`);return hit||'';
  };
  function findMon(context=ctx){
    if(!state)return null;const id=context?.specimenId||'';
    if(context?.recordId){
      const all=[...(state.party||[]),...(state.boxes||[])].filter(Boolean),normalizedRecord=normalizeRecordRef(context.recordId);const byRef=all.find(m=>m.transferRef===normalizedRecord);if(byRef)return byRef;
    }
    if(id){const all=[...(state.party||[]),...(state.boxes||[])].filter(Boolean);const hit=all.find(m=>identity(m)===id);if(hit)return hit;if(state.wild&&identity(state.wild)===id)return state.wild;}
    return state.primary||state.party?.[Number(state.selectedParty||0)]||state.party?.find(Boolean)||null;
  }
  function ensure(){
    if(modal)return;modal=document.createElement('div');modal.id='home-bridge-modal';modal.hidden=true;modal.innerHTML=`<section class="hb-panel" role="dialog" aria-modal="true" aria-label="Pokémon HOME Bridge"><header class="hb-head"><div><small>JRPG.WORLD · EMERALD</small><h2>POKÉMON HOME BRIDGE</h2></div><button class="hb-close" type="button">← BACK</button></header><div class="hb-body" id="hb-body"></div></section>`;document.body.appendChild(modal);modal.querySelector('.hb-close').onclick=close;modal.addEventListener('click',e=>{if(e.target===modal)close();});document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!modal.hidden)close();});
  }
  function close(){if(modal)modal.hidden=true;}
  function sprite(mon){return mon?.dexNo?`<img src="./assets/pokemon/${Number(mon.dexNo)}.png" alt="">`:'';}
  function route(){return `<div class="hb-route"><div class="hb-hop done"><b>EMERALD</b><small>LIVE SAVE ✓</small></div><div class="hb-hop done"><b>EXACT PK3</b><small>SOURCE CAPSULE ✓</small></div><div class="hb-hop next"><b>TRANSFER</b><small>COMPILER NEXT</small></div><div class="hb-hop"><b>BRIDGE GAME</b><small>PENDING</small></div><div class="hb-hop"><b>HOME</b><small>PENDING</small></div></div>`;}
  function hero(mon,extra=''){const origin=mon?.origin?.game||'Generation III';return `<div class="hb-hero">${sprite(mon)}<div><h3>${esc(mon?.species||'Pokémon')}</h3><p>${esc(origin)} origin · Lv${Number(mon?.level||0)} · ${esc(mon?.nature||'')} ${esc(mon?.genderSymbol||'')}</p><div class="hb-badges"><span class="ok">GEN III SOURCE</span><span>PID ${esc(mon?.personalityHex||'')}</span>${mon?.hiddenPower?.type?`<span>HP ${esc(mon.hiddenPower.type)} ${Number(mon.hiddenPower.power)||''}</span>`:''}${extra}</div></div></div>`;}
  function render(){
    ensure();const body=modal.querySelector('#hb-body'),mon=current?.mon;if(!mon){body.innerHTML='<div class="hb-warn">Load Emerald and select one of your Pokémon first.</div>';return;}
    const isWild=mon.kind==='WILD',isEgg=mon.kind==='EGG';
    if(isWild){body.innerHTML=hero(mon,'<span class="wait">WILD</span>')+`<div class="hb-warn" style="margin-top:12px"><strong>CATCH IT FIRST.</strong> The live reader can inspect this encounter, but HOME Bridge only exports Pokémon that are actually part of your save.</div>${route()}<p class="hb-note">Once caught, select the Pokémon from your party or My Field and open HOME Bridge again.</p>`;return;}
    if(isEgg){body.innerHTML=hero(mon,'<span class="wait">EGG</span>')+`<div class="hb-warn" style="margin-top:12px"><strong>HATCH IT FIRST.</strong> Historical transfer routes do not carry an egg forward as an egg. HOME Bridge keeps the source untouched until the Pokémon is eligible for the transfer compiler.</div>${route()}`;return;}
    const ref=sourceRefFor(mon,current?.context||{}),api=globalThis.JRPGWorldEmeraldTransfer,raw=ref&&api?.getExactPK3?.(ref),check=raw?C.inspectPK3(raw):null;
    const ready=!!(raw&&check?.valid),ivs=mon.ivs||{},evs=mon.evs||{};
    body.innerHTML=hero(mon,ready?'<span class="ok">SOURCE VERIFIED</span>':'<span class="wait">LOCATING SOURCE BYTES…</span>')+route()+`
      <div class="hb-card"><h4>ORIGINAL SPECIMEN</h4><div class="hb-grid"><div><small>PID</small><b>${esc(mon.personalityHex||'—')}</b></div><div><small>TRAINER / SECRET ID</small><b>${Number(mon.trainerId)}/${Number(mon.secretId)}</b></div><div><small>GEN III CHECKSUM</small><b>${ready?`0x${Number(check.storedChecksum).toString(16).padStart(4,'0').toUpperCase()} ✓`:'SCANNING'}</b></div><div><small>IVs</small><b>${['hp','atk','def','spa','spd','spe'].map(k=>Number(ivs[k]??0)).join(' / ')}</b></div><div><small>EVs</small><b>${['hp','atk','def','spa','spd','spe'].map(k=>Number(evs[k]??0)).join(' / ')}</b></div><div><small>RIBBONS</small><b>${ribbonCount(mon)}</b></div></div></div>
      <div class="hb-card"><h4>WHAT THIS BUILD GUARANTEES</h4><p class="hb-note" style="margin:0"><strong>v0.1.23 captures the exact 80-byte PK3 entity from the running Emerald session.</strong> It does not rebuild your Pokémon from the values on screen. The transfer pack contains that original entity plus a SHA-256 provenance receipt. The next build will feed this exact source into the generation-transfer compiler.</p></div>
      <div class="hb-actions"><button type="button" id="hb-pack" ${ready?'':'disabled'}>DOWNLOAD SOURCE CAPSULE</button><button type="button" class="secondary" id="hb-refresh">${ready?'VERIFY AGAIN':'RETRY SOURCE SCAN'}</button></div>
      <p class="hb-note"><strong>Not a HOME file yet.</strong> This is deliberately the first irreversible-proof boundary: capture the real Pokémon first, then transform it using audited transfer semantics. No HOME server calls and no invented HOME tracker values are made here.</p>`;
    body.querySelector('#hb-refresh').onclick=()=>{current={...current,mon:findMon(current.context)};render();};
    const packBtn=body.querySelector('#hb-pack');if(packBtn)packBtn.onclick=async()=>{try{packBtn.disabled=true;packBtn.textContent='BUILDING VERIFIED CAPSULE…';const res=await C.makeTransferPack({pk3:raw,mon,sourceRef:ref,sessionBuild:state?.version||'',pkhexReference:'PKHeX source snapshot supplied to project; conversion audit in HOME_BRIDGE_PKHEX_AUDIT_v0.1.23.txt'});download(res.pack,res.filename,'application/zip');toast('SOURCE CAPSULE VERIFIED + EXPORTED ✓');packBtn.textContent='DOWNLOADED ✓';}catch(e){console.error(e);toast(e.message||'Could not build transfer capsule',true);packBtn.textContent='TRY AGAIN';packBtn.disabled=false;}};
  }
  function download(data,name,type){const blob=new Blob([data],{type});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=name;document.body.appendChild(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove();},1500);}
  function toast(msg,bad=false){const el=document.createElement('div');el.className='hb-toast';if(bad)el.style.borderColor='#e98b8b66';el.textContent=msg;document.body.appendChild(el);setTimeout(()=>el.remove(),2600);}
  function open(detail={}){ctx={...ctx,...detail};current={context:{...ctx},mon:findMon(ctx)};ensure();render();modal.hidden=false;}
  window.addEventListener('jrpg:emerald-state',e=>{state=e.detail||state;if(current&&!modal?.hidden){current.mon=findMon(current.context);}});
  window.addEventListener('jrpg:strategy-context',e=>{ctx={...ctx,...(e.detail||{})};});
  window.addEventListener('jrpg:home-bridge-open',e=>open(e.detail||{}));
  globalThis.JRPGWorldHomeBridge={open,close,version:C.BUILD};
})();
