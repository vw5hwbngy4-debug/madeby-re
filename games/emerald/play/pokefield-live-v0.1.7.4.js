const POKEFIELD_BUILD = 'Emerald Live v0.1.7 · TRAINER CARD STATE BRIDGE';

// Exact US/EU Emerald symbols for BPEE / SHA-1 f3ae088181bf583e55daf962a92bb46f4f1d07b7.
const EMERALD = Object.freeze({
  gameCode: 'BPEE',
  playerPartyCount: 0x020244E9,
  playerParty: 0x020244EC,
  enemyParty: 0x02024744,
  inBattleByte: 0x030026F9,
  battleTypeFlags: 0x02022AAE,
  pokemonSize: 100,
  partySize: 6,
});

// ABI facts recovered from the exact @thenick775/mgba-wasm 2.4.1 binary shipped by mgba-web.
const MGBA_WASM_ABI = Object.freeze({
  rendererGlobalPtrSlot: 320256,
  coreBusRead8Offset: 4720,
  coreBusRead16Offset: 4724,
  coreBusRead32Offset: 4728,
});

const BATTLE_TYPE_TRAINER = 1 << 3;
const IN_BATTLE_MASK = 0x02;
const NATURES = [
  'Hardy','Lonely','Brave','Adamant','Naughty',
  'Bold','Docile','Relaxed','Impish','Lax',
  'Timid','Hasty','Serious','Jolly','Naive',
  'Modest','Mild','Quiet','Bashful','Rash',
  'Calm','Gentle','Sassy','Careful','Quirky'
];
const HP_TYPES = ['Fighting','Flying','Poison','Ground','Rock','Bug','Ghost','Steel','Fire','Water','Grass','Electric','Psychic','Ice','Dragon','Dark'];
const ORDERS = [
 [0,1,2,3],[0,1,3,2],[0,2,1,3],[0,3,1,2],[0,2,3,1],[0,3,2,1],
 [1,0,2,3],[1,0,3,2],[2,0,1,3],[3,0,1,2],[2,0,3,1],[3,0,2,1],
 [1,2,0,3],[1,3,0,2],[2,1,0,3],[3,1,0,2],[2,3,0,1],[3,2,0,1],
 [1,2,3,0],[1,3,2,0],[2,1,3,0],[3,1,2,0],[2,3,1,0],[3,2,1,0]
];

let dex = null;
let selectedParty = 0;
let lastWildKey = '';
let lastRenderKey = '';
let bootStartedAt = Date.now();
let lastDirectInput = 'none';
let directControlsBound = false;
let audioRecoveryArmed = false;
let audioRecoveryInFlight = false;
let lastAudioState = 'unknown';
let lastAudioRecovery = 'not needed';

function audioContext(){
  const M = moduleReady();
  return M?.SDL2?.audioContext || null;
}

function updateAudioRecoveryUI(){
  const pill=document.getElementById('pf-audio-recover');
  const ctx=audioContext();
  lastAudioState=ctx?.state || 'unavailable';
  if(!pill) return;
  // Do not trust Safari's "running" state after a background interruption.
  // If we explicitly armed recovery, keep the control visible until a real user gesture performs a hard wake.
  const needs=audioRecoveryArmed || (ctx && ctx.state!=='running');
  pill.hidden=!needs;
  pill.classList.toggle('show',!!needs);
}

function safariAudioUnlockPulse(ctx){
  if(!ctx) return;
  try{
    // A zero-volume, one-sample source makes the user gesture reach Web Audio's render graph.
    // This is deliberately inaudible and does not modify mGBA's mixer or game volume.
    const buffer=ctx.createBuffer(1,1,22050);
    const source=ctx.createBufferSource();
    const gain=ctx.createGain();
    gain.gain.value=0;
    source.buffer=buffer;
    source.connect(gain);
    gain.connect(ctx.destination);
    source.start(0);
    source.stop(ctx.currentTime+0.01);
  }catch(e){}
}

async function restoreIOSAudio(reason='gesture', hard=false){
  if(audioRecoveryInFlight || document.hidden) return false;
  audioRecoveryInFlight=true;
  const input=globalThis.__POKEFIELD_INPUT_MGBA__;
  let ctx=audioContext();
  try{
    try{ input?.resumeGame?.(); }catch(e){}

    // Non-gesture foreground events are not allowed to claim success on Safari.
    // Keep recovery armed until a real tap/pointer gesture arrives.
    if(!hard){
      lastAudioState=ctx?.state || 'unavailable';
      lastAudioRecovery=`${reason}: waiting for gesture`;
      updateAudioRecoveryUI();
      return false;
    }

    // IMPORTANT: resume/unlock is initiated immediately inside the user's gesture task.
    let resumePromise=null;
    if(ctx){
      try{
        if(ctx.state!=='running') resumePromise=ctx.resume();
      }catch(e){}
      safariAudioUnlockPulse(ctx);
    }

    if(resumePromise){
      try{ await resumePromise; }catch(e){}
    }

    // Safari can leave SDL's audio device logically resumed while its output is stale.
    // Force a clean pause/resume edge without touching the emulator core, save data or RAM bridge.
    if(input){
      let volume=null;
      try{ volume=input.getVolume?.(); }catch(e){}
      try{ input.pauseAudio?.(); }catch(e){}
      try{ input.resumeAudio?.(); }catch(e){}
      if(Number.isFinite(volume)){
        try{ input.setVolume?.(volume); }catch(e){}
      }
    }

    // Re-fetch because SDL/WebAudio may have recreated or rebound its context/device.
    ctx=audioContext();
    if(ctx){
      try{
        if(ctx.state!=='running') await ctx.resume();
      }catch(e){}
      safariAudioUnlockPulse(ctx);
    }
    if(input){ try{ input.resumeAudio?.(); }catch(e){} }

    lastAudioState=audioContext()?.state || 'unavailable';
    // There is no browser API that can prove audible samples reached the iPhone speaker.
    // A completed user-gesture hard wake is our success boundary; future backgrounding re-arms it.
    audioRecoveryArmed=false;
    lastAudioRecovery=`${reason}: hard wake (${lastAudioState})`;
    updateAudioRecoveryUI();
    return true;
  } finally {
    audioRecoveryInFlight=false;
  }
}

function installIOSAudioRecovery(){
  if(document.documentElement.dataset.pfAudioRecovery==='1') return;
  document.documentElement.dataset.pfAudioRecovery='1';

  const arm=()=>{
    const input=globalThis.__POKEFIELD_INPUT_MGBA__;
    if(document.hidden){
      audioRecoveryArmed=true;
      lastAudioRecovery='backgrounded';
      // Put SDL audio into a known paused state before iOS suspends/interupts Web Audio.
      try{ input?.pauseAudio?.(); }catch(e){}
      updateAudioRecoveryUI();
      return;
    }
    // Resume game state, but do NOT pretend audio is fixed without a fresh user gesture.
    if(audioRecoveryArmed) restoreIOSAudio('foreground',false);
    updateAudioRecoveryUI();
  };

  document.addEventListener('visibilitychange',arm,{passive:true});
  window.addEventListener('pageshow',()=>{
    audioRecoveryArmed=true;
    restoreIOSAudio('pageshow',false);
  },{passive:true});
  window.addEventListener('focus',()=>{
    if(audioRecoveryArmed) restoreIOSAudio('focus',false);
  },{passive:true});

  const gesture=(event)=>{
    // The dedicated recovery button has its own handler so it cannot race the global capture handler.
    if(event?.target?.closest?.('#pf-audio-recover')) return;
    const ctx=audioContext();
    if(audioRecoveryArmed || (ctx && ctx.state!=='running')) restoreIOSAudio('game gesture',true);
  };

  // Capture phase wakes audio before A/B/D-pad/Start reaches the emulator.
  document.addEventListener('touchstart',gesture,{capture:true,passive:true});
  document.addEventListener('pointerdown',gesture,{capture:true,passive:true});
}

function installDirectSystemControls(){
  const input = globalThis.__POKEFIELD_INPUT_MGBA__;
  if (!input || typeof input.buttonPress !== 'function' || typeof input.buttonUnpress !== 'function') return false;
  let boundAny = false;
  for (const name of ['Start','Select','L','R']) {
    document.querySelectorAll(`[data-gba-btn="${name}"]`).forEach(btn => {
      const hit = btn.closest('.sys-btn-wrapper') || btn;
      if (hit.dataset.pfDirectInput === name) return;
      hit.dataset.pfDirectInput = name;
      hit.classList.add('pf-direct-system-hit');
      let watchdog = 0;
      const press = (ev) => {
        if (ev.cancelable) ev.preventDefault();
        try { input.buttonPress(name); } catch(e) { return; }
        btn.classList.add('pressed');
        lastDirectInput = `${name.toUpperCase()} ↓`;
        clearTimeout(watchdog);
        watchdog = setTimeout(() => {
          try { input.buttonUnpress(name); } catch(e) {}
          btn.classList.remove('pressed');
          lastDirectInput = `${name.toUpperCase()} ↑ (watchdog)`;
        }, 900);
      };
      const release = (ev) => {
        if (ev.cancelable) ev.preventDefault();
        clearTimeout(watchdog);
        try { input.buttonUnpress(name); } catch(e) {}
        btn.classList.remove('pressed');
        lastDirectInput = `${name.toUpperCase()} ↑`;
      };
      // Native touch listeners bypass the upstream rectangle scanner for the small system keys.
      hit.addEventListener('touchstart', press, {passive:false});
      hit.addEventListener('touchend', release, {passive:false});
      hit.addEventListener('touchcancel', release, {passive:false});
      // Desktop/mouse fallback for testing the exact same bridge.
      hit.addEventListener('mousedown', press);
      hit.addEventListener('mouseup', release);
      hit.addEventListener('mouseleave', ev => { if (ev.buttons) release(ev); });
      boundAny = true;
    });
  }
  directControlsBound = directControlsBound || boundAny;
  return directControlsBound;
}

function u16(b,o){ return b[o] | (b[o+1] << 8); }
function u32(b,o){ return (b[o] | (b[o+1]<<8) | (b[o+2]<<16) | (b[o+3]<<24)) >>> 0; }
function put32(b,o,v){ b[o]=v&255;b[o+1]=(v>>>8)&255;b[o+2]=(v>>>16)&255;b[o+3]=(v>>>24)&255; }

function moduleReady(){
  const M = globalThis.__POKEFIELD_MGBA__;
  return M && M.HEAPU32 && M.__pokefieldTable ? M : null;
}

function corePtr(M){
  const rendererPtr = M.HEAPU32[MGBA_WASM_ABI.rendererGlobalPtrSlot >>> 2] >>> 0;
  if (!rendererPtr) return 0;
  return M.HEAPU32[rendererPtr >>> 2] >>> 0;
}

function busRead8(M, address){
  const core = corePtr(M);
  if (!core) throw new Error('mGBA core is not loaded');
  const idx = M.HEAPU32[(core + MGBA_WASM_ABI.coreBusRead8Offset) >>> 2] >>> 0;
  const fn = M.__pokefieldTable.get(idx);
  if (!fn) throw new Error('mGBA busRead8 function pointer unavailable');
  return fn(core, address >>> 0) & 0xFF;
}

function readBytes(M,address,length){
  const out = new Uint8Array(length);
  for(let i=0;i<length;i++) out[i]=busRead8(M,(address+i)>>>0);
  return out;
}
function readU32Guest(M,address){
  const b=readBytes(M,address,4); return u32(b,0);
}
function readAscii(M,address,length){
  const b=readBytes(M,address,length);
  return Array.from(b, x => (x>=32 && x<=126) ? String.fromCharCode(x) : '').join('').replace(/\0/g,'').trim();
}

function decryptBox(raw){
  if (!raw || raw.length < 80) return null;
  const personality=u32(raw,0), otId=u32(raw,4), storedChecksum=u16(raw,28);
  if (personality===0 && otId===0 && storedChecksum===0) return null;
  const key=(personality ^ otId) >>> 0;
  const dec=new Uint8Array(48);
  for(let i=0;i<12;i++) put32(dec,i*4,(u32(raw,32+i*4)^key)>>>0);
  let sum=0;
  for(let i=0;i<24;i++) sum=(sum+u16(dec,i*2))&0xFFFF;
  if(sum!==storedChecksum) return null;
  const ord=ORDERS[personality%24];
  const block=(logical)=>dec.slice(ord[logical]*12,ord[logical]*12+12);
  const growth=block(0), attacks=block(1), evc=block(2), misc=block(3);
  const species=u16(growth,0);
  if(species<=0 || species>411) return null;
  const ivWord=u32(misc,4);
  const ivs={
    hp:ivWord&31,
    atk:(ivWord>>>5)&31,
    def:(ivWord>>>10)&31,
    spe:(ivWord>>>15)&31,
    spa:(ivWord>>>20)&31,
    spd:(ivWord>>>25)&31,
  };
  return {
    personality,otId,species,heldItem:u16(growth,2),experience:u32(growth,4),friendship:growth[9],
    moves:[u16(attacks,0),u16(attacks,2),u16(attacks,4),u16(attacks,6)],
    pp:[attacks[8],attacks[9],attacks[10],attacks[11]],
    evs:{hp:evc[0],atk:evc[1],def:evc[2],spe:evc[3],spa:evc[4],spd:evc[5]},
    ivs,isEgg:!!((ivWord>>>30)&1),abilityNum:(ivWord>>>31)&1,checksum:storedChecksum,
  };
}

function hiddenPower(ivs){
  const typeBits=(ivs.hp&1)+2*(ivs.atk&1)+4*(ivs.def&1)+8*(ivs.spe&1)+16*(ivs.spa&1)+32*(ivs.spd&1);
  const powerBits=((ivs.hp>>1)&1)+2*((ivs.atk>>1)&1)+4*((ivs.def>>1)&1)+8*((ivs.spe>>1)&1)+16*((ivs.spa>>1)&1)+32*((ivs.spd>>1)&1);
  return {type:HP_TYPES[Math.floor(typeBits*15/63)],power:Math.floor(powerBits*40/63)+30};
}
function nationalDex(internal){
  if(internal>=1 && internal<=251) return internal;
  if(internal>=277 && internal<=411) return internal-25;
  if(internal>=252 && internal<=276) return 201;
  return null;
}

const GENDER = Object.freeze({ MALE: 'Male', FEMALE: 'Female', GENDERLESS: 'Genderless' });
function genderFromRatio(personality, ratioRaw){
  if(ratioRaw===0) return GENDER.MALE;
  if(ratioRaw===254) return GENDER.FEMALE;
  if(ratioRaw===255 || ratioRaw==null) return GENDER.GENDERLESS;
  return ratioRaw > (personality & 0xFF) ? GENDER.FEMALE : GENDER.MALE;
}
function canonicalFemaleRatio(ratioRaw){
  // Gen III SpeciesInfo stores canonical ratios as integer thresholds.
  // Keep display labels canonical rather than presenting the threshold/256 implementation detail as a new probability.
  const common={0:0,31:12.5,63:25,127:50,191:75,223:87.5,254:100,255:null};
  if(Object.prototype.hasOwnProperty.call(common,ratioRaw)) return common[ratioRaw];
  if(ratioRaw==null || ratioRaw===255) return null;
  return Math.round((ratioRaw/255)*1000)/10;
}
function genderSymbol(gender){ return gender===GENDER.FEMALE?'♀':gender===GENDER.MALE?'♂':'◇'; }
function isBreedable(meta){
  const groups=meta?.eggGroups||[];
  return groups.length>0 && !groups.some(x=>String(x).toLowerCase().includes('no eggs'));
}
function titleName(name){
  return String(name||'Unknown').toLowerCase().replace(/(^|[\s-])([a-z])/g,(_,a,b)=>a+b.toUpperCase());
}
function enrich(mon,raw100){
  const meta=dex?.species?.[String(mon.species)] || {};
  const hp=hiddenPower(mon.ivs);
  const ability=(meta.abilities||[])[mon.abilityNum] || (meta.abilities||[])[0] || 'Unknown';
  const level=raw100?.length>=85 ? raw100[84] : 0;
  const current={
    status:raw100?.length>=84?u32(raw100,80):0,
    level,
    hp:raw100?.length>=88?u16(raw100,86):0,
    maxHP:raw100?.length>=90?u16(raw100,88):0,
    atk:raw100?.length>=92?u16(raw100,90):0,
    def:raw100?.length>=94?u16(raw100,92):0,
    spe:raw100?.length>=96?u16(raw100,94):0,
    spa:raw100?.length>=98?u16(raw100,96):0,
    spd:raw100?.length>=100?u16(raw100,98):0,
  };
  const moveNames=mon.moves.filter(Boolean).map((id,i)=>({id,name:titleName(dex?.moves?.[id]||`Move ${id}`),pp:mon.pp[i]}));
  const totalIV=Object.values(mon.ivs).reduce((a,b)=>a+b,0);
  const perfect=Object.entries(mon.ivs).filter(([,v])=>v===31).map(([k])=>k.toUpperCase());
  const nearPerfect=Object.values(mon.ivs).filter(v=>v>=28).length;
  let ivSignal='PASS';
  if(perfect.length>=2 || nearPerfect>=4) ivSignal='KEEP';
  else if(totalIV>=145 || nearPerfect>=3) ivSignal='CHECK';
  const gender=genderFromRatio(mon.personality,meta.genderRatioRaw);
  const femaleRatio=canonicalFemaleRatio(meta.genderRatioRaw);
  const rareFemale=gender===GENDER.FEMALE && femaleRatio!=null && femaleRatio<=25 && isBreedable(meta);
  let signal=ivSignal;
  // Preserve IV assessment but stop a breeding-valuable rare female from being dismissed as a plain PASS.
  if(rareFemale && signal==='PASS') signal='CHECK';
  else if(rareFemale && signal==='CHECK') signal='KEEP';
  const breedingSignal=rareFemale?'RARE FEMALE':(gender===GENDER.FEMALE && isBreedable(meta)?'FEMALE':'');
  return {...mon,meta,hp,ability,nature:NATURES[mon.personality%25],current,moveNames,totalIV,perfect,nearPerfect,ivSignal,signal,gender,genderSymbol:genderSymbol(gender),femaleRatio,rareFemale,breedingSignal,dexNo:nationalDex(mon.species)};
}
function stableReadMon(M,address){
  // Two reads + Gen III checksum. If the emulation thread mutates the mon mid-read, discard it.
  for(let attempt=0;attempt<2;attempt++){
    const a=readBytes(M,address,EMERALD.pokemonSize);
    const m=decryptBox(a);
    if(m) return enrich(m,a);
  }
  return null;
}

// Public, read-only product state for additive JRPG.WORLD features such as Trainer Cards.
// This intentionally publishes only decoded gameplay facts. It does not expose or add write access to mGBA.
function publicMon(mon,kind){
  if(!mon) return null;
  const evTotal=Object.values(mon.evs).reduce((a,b)=>a+b,0);
  return {
    id:`${mon.personality}:${mon.checksum}`,
    personality:mon.personality,
    checksum:mon.checksum,
    dexNo:mon.dexNo,
    species: titleName(mon.meta?.name || `Species ${mon.species}`),
    speciesInternal:mon.species,
    level:mon.current?.level || 0,
    gender:mon.gender,
    genderSymbol:mon.genderSymbol,
    nature:mon.nature,
    ability:titleName(mon.ability),
    kind,
    signal:mon.signal,
    ivSignal:mon.ivSignal,
    ivs:{...mon.ivs},
    evs:{...mon.evs},
    evTotal,
    ivTotal:mon.totalIV,
    ivAverage:Math.round((mon.totalIV/6)*10)/10,
    hiddenPower:{type:mon.hp.type,power:mon.hp.power},
    rareFemale:!!mon.rareFemale,
    femaleRatio:mon.femaleRatio,
    perfect:[...(mon.perfect||[])],
    moves:(mon.moveNames||[]).map(m=>({id:m.id,name:m.name,pp:m.pp}))
  };
}
function publishProductState(code,wild,party,inBattle,battleFlags){
  const state={
    version:'0.1.7',
    gameCode:code,
    connected:code===EMERALD.gameCode,
    inBattle:!!inBattle,
    battleFlags:battleFlags>>>0,
    selectedParty,
    wild:publicMon(wild,'WILD'),
    party:party.map((m,i)=>publicMon(m,m?.isEgg?'EGG':'OWNED')),
    primary:publicMon(wild,'WILD') || publicMon(party[selectedParty],party[selectedParty]?.isEgg?'EGG':'OWNED')
  };
  globalThis.JRPGWorldEmeraldState=state;
  try{ window.dispatchEvent(new CustomEvent('jrpg:emerald-state',{detail:state})); }catch(e){}
}

function ensureUI(){
  if(document.getElementById('pokefield-live-panel')) return;
  document.documentElement.classList.add('pf-mobile-first');
  document.body.classList.add('pf-mobile-first');
  const panel=document.createElement('aside');
  panel.id='pokefield-live-panel';
  panel.innerHTML=`
    <div class="pf-head">
      <div class="pf-brand"><strong>POKÉFIELD</strong><span>LIVE</span></div>
      <small>${POKEFIELD_BUILD}</small>
    </div>
    <div id="pf-status" class="pf-status">Waiting for mGBA…</div>
    <button id="pf-audio-recover" class="pf-audio-recover" type="button" hidden>🔊 TAP TO RESTART SOUND</button>
    <div id="pf-primary" class="pf-primary"></div>
    <details id="pf-owned-drawer" class="pf-drawer">
      <summary><span>MY PARTY</span><small id="pf-party-summary">live save data</small></summary>
      <div id="pf-party" class="pf-party"></div>
      <div id="pf-selected"></div>
    </details>
    <details class="pf-drawer pf-tech">
      <summary><span>TECH</span><small>read-only bridge</small></summary>
      <div id="pf-debug" class="pf-debug"></div>
    </details>
    <div class="pf-explainer"><strong>Not a normal emulator.</strong> PokéField reads your running Emerald game locally and reveals the competitive data the game hides: IVs, EVs, Nature, Ability, Gender and Hidden Power the moment a Pokémon exists. In-game saves persist locally in this browser. Your ROM is not uploaded.</div>`;
  document.body.appendChild(panel);
  const audioRecoverButton=panel.querySelector('#pf-audio-recover');
  audioRecoverButton?.addEventListener('pointerdown',()=>restoreIOSAudio('audio button',true),{passive:true});
  audioRecoverButton?.addEventListener('touchstart',()=>restoreIOSAudio('audio button',true),{passive:true});
  audioRecoverButton?.addEventListener('click',()=>{ if(audioRecoveryArmed) restoreIOSAudio('audio button click',true); });
  installIOSAudioRecovery();
  const style=document.createElement('style');
  style.textContent=`
  #pokefield-live-panel{position:fixed;right:12px;top:12px;width:min(390px,calc(100vw - 24px));max-height:calc(100vh - 24px);overflow:auto;z-index:99999;background:rgba(6,10,18,.97);color:#f7fbff;border:1px solid rgba(255,255,255,.15);border-radius:18px;padding:14px;box-shadow:0 18px 60px #0009;font:14px/1.35 system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;backdrop-filter:blur(14px);-webkit-backdrop-filter:blur(14px);touch-action:pan-y}
  .pf-head{display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;gap:8px}.pf-brand{display:flex;align-items:center}.pf-head strong{font-size:17px;letter-spacing:.08em}.pf-head span{margin-left:7px;font-size:9px;padding:3px 6px;border-radius:999px;background:#33e58b;color:#04150d;font-weight:900}.pf-head small{opacity:.44;font-size:9px;text-align:right}.pf-status{padding:7px 9px;border-radius:9px;background:#ffffff0b;margin-bottom:8px;color:#b8c2d6;font-size:12px}.pf-status.ok{color:#71f0aa}.pf-status.bad{color:#ff8b8b}.pf-audio-recover{display:none;width:100%;margin:-1px 0 7px;border:1px solid #6ef0a855;background:#183124;color:#8dffba;border-radius:9px;padding:7px 9px;font:800 10px/1 system-ui,-apple-system,sans-serif;letter-spacing:.08em}.pf-audio-recover.show{display:block}.pf-explainer{margin-top:10px;padding:9px 3px 1px;border-top:1px solid #ffffff12;color:#8d96a6;font-size:9px;line-height:1.5}.pf-explainer strong{color:#b7c0cf;font-weight:800}.pf-primary:empty{display:none}.pf-kicker{font-size:9px;letter-spacing:.16em;opacity:.48;margin:8px 2px 4px;font-weight:800}.pf-card{position:relative;border:1px solid #ffffff1c;background:#ffffff08;border-radius:15px;padding:11px;margin:7px 0}.pf-card.wild{border-color:#6ef0a866;box-shadow:0 0 28px #39e58b17}.pf-title{display:flex;align-items:center;gap:10px}.pf-sprite{width:62px;height:62px;image-rendering:pixelated;object-fit:contain;flex:0 0 auto}.pf-ident{min-width:0;flex:1}.pf-name{font-size:19px;font-weight:900;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.pf-sub{opacity:.72;margin-top:2px;font-size:12px}.pf-gender-symbol{font-weight:900}.pf-gender-symbol.female{color:#ff9acb}.pf-gender-symbol.male{color:#8fc7ff}.pf-gender-symbol.genderless{color:#c8ced8}.pf-breed-note{display:inline-flex;align-items:center;gap:5px;margin-top:5px;padding:3px 6px;border-radius:999px;background:#ff9acb12;border:1px solid #ff9acb38;font-size:9px;font-weight:800;letter-spacing:.04em;color:#ffd0e7}.pf-signal{margin-left:auto;font-weight:900;border-radius:999px;padding:5px 8px;font-size:11px}.pf-signal.KEEP{background:#43e58b;color:#04140c}.pf-signal.CHECK{background:#ffd166;color:#1b1200}.pf-signal.PASS{background:#ffffff16;color:#cad1dc}
  .pf-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:5px;margin-top:9px}.pf-stat{background:#0004;border-radius:8px;padding:6px}.pf-stat b{display:block;font-size:16px}.pf-stat em{font-style:normal;opacity:.55;font-size:9px;letter-spacing:.06em}.pf-perfect b{color:#6ef0a8}.pf-hp{margin-top:8px;padding:8px 9px;background:#755cff18;border:1px solid #937fff3d;border-radius:9px}.pf-hp strong{color:#c1b7ff}.pf-ev-quick{margin-top:7px;font-size:11px;opacity:.82;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.pf-detail{margin-top:8px;border-top:1px solid #ffffff12;padding-top:6px}.pf-detail summary{cursor:pointer;list-style:none;font-size:10px;letter-spacing:.12em;font-weight:800;opacity:.65;padding:3px 0}.pf-detail summary::-webkit-details-marker{display:none}.pf-detail summary:after{content:' +';float:right}.pf-detail[open] summary:after{content:' −'}.pf-ev{margin-top:7px;font-size:11px;opacity:.82}.pf-moves{display:flex;flex-wrap:wrap;gap:5px;margin-top:7px}.pf-move{font-size:10px;background:#ffffff0d;border-radius:7px;padding:4px 6px}
  .pf-drawer{border-top:1px solid #ffffff14;margin-top:9px;padding-top:3px}.pf-drawer>summary{cursor:pointer;list-style:none;display:flex;justify-content:space-between;align-items:center;padding:8px 2px 5px;font-size:10px;letter-spacing:.14em;font-weight:900;opacity:.7}.pf-drawer>summary::-webkit-details-marker{display:none}.pf-drawer>summary small{font-size:9px;letter-spacing:0;font-weight:500;opacity:.55}.pf-party{display:grid;grid-template-columns:repeat(3,1fr);gap:5px;margin:5px 0}.pf-party button{appearance:none;border:1px solid #ffffff18;background:#ffffff08;color:#fff;border-radius:10px;padding:6px;min-width:0}.pf-party button.active{border-color:#8ea7ff;background:#718cff20}.pf-party img{width:34px;height:34px;object-fit:contain;image-rendering:pixelated;vertical-align:middle}.pf-party small{display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font-size:9px}.pf-debug{font:9px/1.45 ui-monospace,SFMono-Regular,Menlo,monospace;opacity:.4;margin:5px 0 2px;word-break:break-all}
  .pf-direct-system-hit{position:relative!important;touch-action:none!important;-webkit-tap-highlight-color:transparent!important}
  .pf-direct-system-hit::after{content:"";position:absolute;inset:-12px -14px;z-index:5;background:transparent;pointer-events:auto}
  @media(max-width:800px){
    html.pf-mobile-first,body.pf-mobile-first{width:100%;max-width:100%;overflow-x:hidden!important;overscroll-behavior-y:auto}
    body.pf-mobile-first{display:block!important;min-height:100svh!important;overflow-y:auto!important;touch-action:pan-y!important;padding:0 0 env(safe-area-inset-bottom,0)!important}
    body.pf-mobile-first #root{min-height:auto!important;width:100%!important}
    body.pf-mobile-first .app-container{width:100%!important;max-width:100%!important;min-height:auto!important;margin:0!important}
    body.pf-mobile-first:has(.game-playing) header{display:none!important}
    body.pf-mobile-first header{padding:.55rem!important;font-size:.72rem!important;box-shadow:none!important}
    body.pf-mobile-first .drop-zone{width:calc(100% - 20px)!important;max-width:440px!important;margin:10px!important;padding:2rem .9rem!important;border-width:2px!important;border-radius:14px!important;font-size:1rem!important;min-height:180px!important}.drop-zone .btn{font-size:1rem!important;padding:.65rem 1rem!important}
    body.pf-mobile-first .main-content{padding:0!important;width:100%!important;min-height:0!important;flex:none!important}
    body.pf-mobile-first .emulator-container{width:100%!important;max-width:100vw!important;height:auto!important;min-height:0!important;padding:0!important;border-radius:0!important;transform:none!important}
    body.pf-mobile-first .emulator-layout{touch-action:none!important}
    body.pf-mobile-first .emulator-layout.with-touch{width:100vw!important;max-width:100vw!important;height:auto!important;min-height:0!important;flex:none!important;margin:0!important;padding:.35rem .35rem .65rem!important;border-width:2px 0 0!important;border-radius:0!important;gap:.2rem .45rem!important;grid-template:"center center" auto "left right" 118px/1fr 1fr!important;box-shadow:none!important}
    body.pf-mobile-first .console-center{width:100%!important;min-width:0!important}
    body.pf-mobile-first .screen-bezel{width:100%!important;max-width:100vw!important;margin:0!important;padding:.18rem .2rem .48rem!important;border:0!important;border-radius:0!important;box-shadow:none!important;background:#090b10!important}
    body.pf-mobile-first .bezel-logo{font-size:.55rem!important;margin-top:.18rem!important;line-height:1!important}.bezel-logo .advance-italic{font-size:.62rem!important}
    body.pf-mobile-first .power-indicator{display:none!important}
    body.pf-mobile-first .canvas-wrapper{width:100%!important;max-width:100vw!important;height:auto!important}
    body.pf-mobile-first canvas{width:100%!important;max-width:100vw!important;height:auto!important;object-fit:contain!important}
    body.pf-mobile-first .console-wing{min-height:108px!important;height:108px!important;padding:.15rem .3rem!important;justify-content:center!important}
    body.pf-mobile-first .dpad{--dpad-scale:.82}
    body.pf-mobile-first .action-buttons{--btn-scale:.84}
    body.pf-mobile-first .bumper-btn{--lr-scale:.92}
    body.pf-mobile-first .menu-buttons-container{margin-top:.2rem!important;gap:.55rem!important}
    body.pf-mobile-first .menu-buttons{gap:.6rem!important}
    body.pf-mobile-first .sys-btn-wrapper{--sys-btn-scale:.86}
    body.pf-mobile-first .speaker-grille{display:none!important}
    #pokefield-live-panel{position:relative;inset:auto;width:calc(100% - 12px);max-height:none;margin:6px 6px 10px;padding:9px 9px 10px;border-radius:14px;box-shadow:0 8px 30px #0007;overflow:visible;background:rgba(6,10,18,.985)}
    .pf-head{margin-bottom:5px}.pf-head small{display:none}.pf-status{margin-bottom:5px;padding:6px 8px;font-size:10px}.pf-card{margin:5px 0;padding:9px;border-radius:13px}.pf-sprite{width:54px;height:54px}.pf-name{font-size:17px}.pf-sub{font-size:10px}.pf-breed-note{font-size:8px;margin-top:4px}.pf-signal{font-size:9px;padding:4px 7px}
    .pf-grid{grid-template-columns:repeat(6,1fr);gap:3px;margin-top:7px}.pf-stat{padding:5px 2px;text-align:center}.pf-stat b{font-size:14px}.pf-stat em{font-size:7px;letter-spacing:0}.pf-hp{display:flex;justify-content:space-between;gap:6px;padding:7px 8px;margin-top:6px;font-size:11px}.pf-ev-quick{font-size:10px;margin-top:5px}.pf-detail{margin-top:6px}.pf-party{grid-template-columns:repeat(6,1fr);gap:3px}.pf-party button{padding:4px 1px}.pf-party img{width:28px;height:28px}.pf-party small{font-size:7px}.pf-tech{margin-bottom:3px}.pf-explainer{font-size:8.5px;margin-bottom:calc(env(safe-area-inset-bottom,0) + 3px)}
  }
  @media(max-width:390px){
    body.pf-mobile-first .emulator-layout.with-touch{grid-template:"center center" auto "left right" 108px/1fr 1fr!important;padding-bottom:.45rem!important}
    body.pf-mobile-first .console-wing{min-height:100px!important;height:100px!important}.pf-name{font-size:16px}.pf-grid{gap:2px}.pf-stat b{font-size:13px}
  }
  @media(max-height:520px) and (orientation:landscape){
    #pokefield-live-panel{position:fixed;right:6px;top:6px;width:min(310px,40vw);max-height:calc(100vh - 12px);overflow:auto;margin:0}.pf-head small{display:none}.pf-grid{grid-template-columns:repeat(6,1fr)}
  }
  `;
  document.head.appendChild(style);
  // Upstream mGBA-Web caches touch hitboxes. Reflow and force a refresh after our mobile CSS lands.
  requestAnimationFrame(()=>{ window.dispatchEvent(new Event('resize')); setTimeout(()=>window.dispatchEvent(new Event('resize')),180); });
}

function ivGrid(mon){
 const rows=[['HP','hp'],['ATK','atk'],['DEF','def'],['SPA','spa'],['SPD','spd'],['SPE','spe']];
 return `<div class="pf-grid">${rows.map(([l,k])=>`<div class="pf-stat ${mon.ivs[k]===31?'pf-perfect':''}"><em>${l} IV</em><b>${mon.ivs[k]}${mon.ivs[k]===31?' ★':''}</b></div>`).join('')}</div>`;
}
function card(mon,kind){
 if(!mon) return '';
 const sprite=mon.dexNo?`./assets/pokemon/${mon.dexNo}.png`:'';
 const evTotal=Object.values(mon.evs).reduce((a,b)=>a+b,0);
 const evShort=`HP ${mon.evs.hp} · A ${mon.evs.atk} · D ${mon.evs.def} · SA ${mon.evs.spa} · SD ${mon.evs.spd} · S ${mon.evs.spe}`;
 const genderClass=mon.gender===GENDER.FEMALE?'female':mon.gender===GENDER.MALE?'male':'genderless';
 const ratioText=mon.femaleRatio==null?'genderless species':`${mon.femaleRatio}% female species ratio`;
 const breedNote=mon.rareFemale?`<div class="pf-breed-note">♀ RARE FEMALE · ${mon.femaleRatio}% · BREEDING VALUE</div>`:'';
 return `<div class="pf-card ${kind==='WILD'?'wild':''}">
   <div class="pf-title">${sprite?`<img class="pf-sprite" src="${sprite}" alt="">`:''}<div class="pf-ident"><div class="pf-name">${mon.isEgg?'EGG · ':''}${titleName(mon.meta.name||`Species ${mon.species}`)} <span class="pf-gender-symbol ${genderClass}">${mon.genderSymbol}</span> ${mon.current.level?`Lv${mon.current.level}`:''}</div><div class="pf-sub">${mon.nature} · ${titleName(mon.ability)} · ${kind}</div>${breedNote}</div><div class="pf-signal ${mon.signal}">${mon.signal}</div></div>
   ${ivGrid(mon)}
   <div class="pf-hp"><strong>Hidden Power ${mon.hp.type}</strong><span>${mon.hp.power} power</span></div>
   <div class="pf-ev-quick">EV · ${evShort}</div>
   <details class="pf-detail"><summary>DETAILS</summary>
     <div class="pf-ev">Gender ${mon.gender} · ${ratioText}${mon.meta.eggGroups?.length?`<br>Egg groups ${mon.meta.eggGroups.join(' / ')}`:''}<br>IV assessment ${mon.ivSignal}${mon.rareFemale?' · overall raised for rare-female breeding value':''}<br>EV total ${evTotal}/510 · remaining ${Math.max(0,510-evTotal)}<br>${evShort}</div>
     ${mon.moveNames.length?`<div class="pf-moves">${mon.moveNames.map(m=>`<span class="pf-move">${m.name} · ${m.pp} PP</span>`).join('')}</div>`:''}
   </details>
 </div>`;
}

function render(M){
 ensureUI();
 const status=document.getElementById('pf-status'), primaryEl=document.getElementById('pf-primary'), partyEl=document.getElementById('pf-party'), selectedEl=document.getElementById('pf-selected'), dbg=document.getElementById('pf-debug'), drawer=document.getElementById('pf-owned-drawer'), partySummary=document.getElementById('pf-party-summary');
 let code='';
 try{ code=readAscii(M,0x080000AC,4); }catch{}
 if(!code){globalThis.JRPGWorldEmeraldState={version:'0.1.7',gameCode:'',connected:false,primary:null,wild:null,party:[]};status.className='pf-status';status.textContent='Load your Emerald ROM to begin.';return;}
 if(code!==EMERALD.gameCode){globalThis.JRPGWorldEmeraldState={version:'0.1.7',gameCode:code,connected:false,primary:null,wild:null,party:[]};status.className='pf-status bad';status.textContent=`Unsupported ROM (${code||'unknown'}). Emerald Live is pinned to Pokémon Emerald BPEE.`;return;}
 status.className='pf-status ok';status.textContent='Pokémon Emerald detected · live RAM connected · read-only';
 const count=Math.min(busRead8(M,EMERALD.playerPartyCount),6);
 const party=[];
 for(let i=0;i<count;i++) party.push(stableReadMon(M,EMERALD.playerParty+i*100));
 if(selectedParty>=count) selectedParty=Math.max(0,count-1);
 const inBattle=(busRead8(M,EMERALD.inBattleByte)&IN_BATTLE_MASK)!==0;
 const battleFlags=readU32Guest(M,EMERALD.battleTypeFlags);
 const isWild=inBattle && !(battleFlags&BATTLE_TYPE_TRAINER);
 const wild=isWild?stableReadMon(M,EMERALD.enemyParty):null;
 const wildKey=wild?`${wild.personality}:${wild.checksum}:${wild.current.level}`:'';
 if(wildKey && wildKey!==lastWildKey){lastWildKey=wildKey;}
 const renderKey=JSON.stringify([code,count,wildKey,party.map(x=>x&&[x.personality,x.checksum,x.evs]),selectedParty,inBattle,battleFlags]);
 if(renderKey===lastRenderKey) return; lastRenderKey=renderKey;
 primaryEl.innerHTML=wild?`<div class="pf-kicker">LIVE WILD SPECIMEN</div>${card(wild,'WILD')}`:(party[selectedParty]?`<div class="pf-kicker">LIVE OWNED POKÉMON</div>${card(party[selectedParty],party[selectedParty].isEgg?'EGG':'OWNED')}`:'');
 partyEl.innerHTML=party.map((m,i)=>m?`<button data-party="${i}" class="${i===selectedParty?'active':''}"><img src="./assets/pokemon/${m.dexNo}.png" alt=""><small>${titleName(m.meta.name)} ${m.genderSymbol}</small><small>Lv${m.current.level} · ${m.signal}</small></button>`:'').join('') || '<small style="opacity:.5">No party data yet.</small>';
 partySummary.textContent=count?`${count} Pokémon · tap to inspect`:'no party data';
 partyEl.querySelectorAll('button[data-party]').forEach(b=>b.onclick=()=>{selectedParty=Number(b.dataset.party);lastRenderKey='';render(M)});
 selectedEl.innerHTML=wild && party[selectedParty]?card(party[selectedParty],party[selectedParty].isEgg?'EGG':'OWNED'):'';
 if(!wild && drawer && window.matchMedia('(max-width:800px)').matches) drawer.open=false;
 publishProductState(code,wild,party,inBattle,battleFlags);
 dbg.textContent=`BPEE · party 0x${EMERALD.playerParty.toString(16)} · enemy 0x${EMERALD.enemyParty.toString(16)} · battle=${inBattle?'1':'0'} flags=0x${battleFlags.toString(16)} · checksum-gated · system bridge=${directControlsBound?'ready':'waiting'} · last input=${lastDirectInput} · audio=${lastAudioState} · audio recovery=${lastAudioRecovery}`;
}

async function boot(){
 ensureUI();
 try{dex=await fetch('./data/emerald-live-dex.json').then(r=>r.json());}catch(e){console.error(e);}
 const tick=()=>{
   const M=moduleReady();
   installDirectSystemControls();
   updateAudioRecoveryUI();
   if(M){try{render(M);}catch(e){const s=document.getElementById('pf-status');if(s){s.className='pf-status bad';s.textContent=`Live reader: ${e.message}`;}}}
   else if(Date.now()-bootStartedAt>3500){
     const s=document.getElementById('pf-status');
     if(s){
       s.className='pf-status bad';
       s.textContent = globalThis.crossOriginIsolated
         ? 'mGBA core not connected. Hard-refresh this page after deploying v0.1.6.'
         : 'mGBA needs cross-origin isolation. Enable COOP/COEP headers for /emerald/.';
     }
   }
   setTimeout(tick,200);
 };
 tick();
}
if (typeof document !== 'undefined') boot();

// Export pure functions for forensic/unit testing in a browser console.
globalThis.PokeFieldLive={decryptBox,hiddenPower,nationalDex,genderFromRatio,canonicalFemaleRatio,GENDER,EMERALD,MGBA_WASM_ABI};
