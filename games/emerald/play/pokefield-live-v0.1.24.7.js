const POKEFIELD_BUILD = 'Emerald v0.1.24.7 · FIELD GRAMMAR + IDENTITY FIX';
const POKEFIELD_DEBUG_UI = new URLSearchParams(location.search).get('debug') === '1';

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
  // Exact BPEE runtime pointer table. Emerald moves storage with save-block ASLR,
  // so this pointer is re-read continuously rather than caching the pointed address.
  pokemonStoragePtr: 0x03005D94,
  totalBoxes: 14,
  boxSlots: 30,
  boxPokemonSize: 80,
  boxesOffset: 1,
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

// Gen III held-item names used by Emerald's Pokémon data.
// The numeric heldItem field is already decoded from the encrypted Growth substructure.
// Names below cover every item observed in the exact Emerald species held-item extraction,
// plus the complete Gen III berry and battle-held ranges. Unknown/manual items still surface by ID.
const BERRY_ITEM_NAMES = Object.freeze([
  'Cheri Berry','Chesto Berry','Pecha Berry','Rawst Berry','Aspear Berry','Leppa Berry','Oran Berry','Persim Berry','Lum Berry','Sitrus Berry',
  'Figy Berry','Wiki Berry','Mago Berry','Aguav Berry','Iapapa Berry','Razz Berry','Bluk Berry','Nanab Berry','Wepear Berry','Pinap Berry',
  'Pomeg Berry','Kelpsy Berry','Qualot Berry','Hondew Berry','Grepa Berry','Tamato Berry','Cornn Berry','Magost Berry','Rabuta Berry','Nomel Berry',
  'Spelon Berry','Pamtre Berry','Watmel Berry','Durin Berry','Belue Berry','Liechi Berry','Ganlon Berry','Salac Berry','Petaya Berry','Apicot Berry',
  'Lansat Berry','Starf Berry','Enigma Berry'
]);
const BATTLE_HELD_ITEM_NAMES = Object.freeze([
  'Bright Powder','White Herb','Macho Brace','Exp. Share','Quick Claw','Soothe Bell','Mental Herb','Choice Band','King\'s Rock','Silver Powder',
  'Amulet Coin','Cleanse Tag','Soul Dew','Deep Sea Tooth','Deep Sea Scale','Smoke Ball','Everstone','Focus Band','Lucky Egg','Scope Lens',
  'Metal Coat','Leftovers','Dragon Scale','Light Ball','Soft Sand','Hard Stone','Miracle Seed','Black Glasses','Black Belt','Magnet',
  'Mystic Water','Sharp Beak','Poison Barb','Never-Melt Ice','Spell Tag','Twisted Spoon','Charcoal','Dragon Fang','Silk Scarf','Up-Grade',
  'Shell Bell','Sea Incense','Lax Incense','Lucky Punch','Metal Powder','Thick Club','Stick'
]);
const OTHER_HELD_ITEM_NAMES = Object.freeze({
  29:'Moomoo Milk',45:'Sacred Ash',48:'Red Shard',49:'Blue Shard',50:'Yellow Shard',51:'Green Shard',
  93:'Sun Stone',94:'Moon Stone',95:'Fire Stone',96:'Thunder Stone',97:'Water Stone',98:'Leaf Stone',
  103:'Tiny Mushroom',104:'Big Mushroom',106:'Pearl',107:'Big Pearl',108:'Stardust',109:'Star Piece',110:'Nugget',111:'Heart Scale'
});
function heldItemName(id){
  const n=Number(id)||0;
  if(!n) return '';
  if(n>=133 && n<=175) return BERRY_ITEM_NAMES[n-133] || `Item #${n}`;
  if(n>=179 && n<=225) return BATTLE_HELD_ITEM_NAMES[n-179] || `Item #${n}`;
  return OTHER_HELD_ITEM_NAMES[n] || `Item #${n}`;
}

// v0.1.9 specimen-passport dictionaries and deterministic Gen III helpers.
// Field layouts follow pret/pokeemerald's 12-byte Growth / Attacks / EV-Condition / Misc substructures.
const ORIGIN_GAMES = Object.freeze({1:'Sapphire',2:'Ruby',3:'Emerald',4:'FireRed',5:'LeafGreen',7:'HeartGold',8:'SoulSilver',10:'Diamond',11:'Pearl',12:'Platinum',15:'GameCube'});
const LANGUAGES = Object.freeze({1:'Japanese',2:'English',3:'French',4:'Italian',5:'German',6:'Korean (unused)',7:'Spanish'});
const BALL_NAMES = Object.freeze({1:'Master Ball',2:'Ultra Ball',3:'Great Ball',4:'Poké Ball',5:'Safari Ball',6:'Net Ball',7:'Dive Ball',8:'Nest Ball',9:'Repeat Ball',10:'Timer Ball',11:'Luxury Ball',12:'Premier Ball'});
const CONTEST_RANKS = Object.freeze(['None','Normal','Super','Hyper','Master']);
const HOENN_MET_LOCATIONS = Object.freeze([
  'Littleroot Town','Oldale Town','Dewford Town','Lavaridge Town','Fallarbor Town','Verdanturf Town','Pacifidlog Town','Petalburg City','Slateport City','Mauville City','Rustboro City','Fortree City','Lilycove City','Mossdeep City','Sootopolis City','Ever Grande City',
  'Route 101','Route 102','Route 103','Route 104','Route 105','Route 106','Route 107','Route 108','Route 109','Route 110','Route 111','Route 112','Route 113','Route 114','Route 115','Route 116','Route 117','Route 118','Route 119','Route 120','Route 121','Route 122','Route 123','Route 124','Route 125','Route 126','Route 127','Route 128','Route 129','Route 130','Route 131','Route 132','Route 133','Route 134',
  'Underwater (Route 124)','Underwater (Route 126)','Underwater (Route 127)','Underwater (Route 128)','Underwater (Sootopolis)','Granite Cave','Mt. Chimney','Safari Zone','Battle Frontier','Petalburg Woods','Rusturf Tunnel','Abandoned Ship','New Mauville','Meteor Falls','Meteor Falls','Mt. Pyre','Aqua Hideout','Shoal Cave','Seafloor Cavern','Underwater (Seafloor Cavern)','Victory Road','Mirage Island','Cave of Origin','Southern Island','Fiery Path','Fiery Path','Jagged Pass','Jagged Pass','Sealed Chamber','Underwater (Sealed Chamber)','Scorched Slab','Island Cave','Desert Ruins','Ancient Tomb','Inside of Truck','Sky Pillar','Secret Base','Dynamic / special map'
]);
const RIBBON_BOOLEAN_FIELDS = Object.freeze([
  ['champion','Champion'],['winning','Winning'],['victory','Victory'],['artist','Artist'],['effort','Effort'],
  ['marine','Marine'],['land','Land'],['sky','Sky'],['country','Country'],['national','National'],['earth','Earth'],['world','World']
]);
function hex32(v){ return `0x${(Number(v)>>>0).toString(16).padStart(8,'0').toUpperCase()}`; }
function shinyValue(otId,personality){ return (((otId>>>16)^(otId&0xFFFF)^(personality>>>16)^(personality&0xFFFF))&0xFFFF)>>>0; }
function shinyInfo(otId,personality){ const value=shinyValue(otId,personality); return {value,isShiny:value<8,oddsThreshold:8}; }
function originGameName(id){ return ORIGIN_GAMES[id] || `Game #${id}`; }
function languageName(id){ return LANGUAGES[id] || `Language #${id}`; }
function ballName(id){ return BALL_NAMES[id] || (id?`Ball #${id}`:'Unknown Ball'); }
function metLocationName(id){
  const n=Number(id)&255;
  if(n===0xFD) return 'Special Egg';
  if(n===0xFE) return 'In-game Trade';
  if(n===0xFF) return 'Fateful Encounter';
  return HOENN_MET_LOCATIONS[n] || `Location #${n}`;
}
function friendshipLabel(v){
  const n=Number(v)||0;
  if(n===255) return 'Max';
  if(n>=200) return 'Very high';
  if(n>=150) return 'High';
  if(n>=100) return 'Warm';
  if(n>=50) return 'Low';
  if(n>=1) return 'Very low';
  return 'None';
}
function pokerusInfo(raw){
  const value=Number(raw)&255, strain=(value>>>4)&15, days=value&15;
  if(!value) return {raw:0,strain:0,days:0,state:'none',label:'Never infected'};
  if(days) return {raw:value,strain,days,state:'active',label:`Active · ${days} day${days===1?'':'s'} left · strain ${strain}`};
  return {raw:value,strain,days:0,state:'cured',label:`Cured / immune · strain ${strain}`};
}
function ppUpCounts(byte){ const n=Number(byte)&255; return [n&3,(n>>>2)&3,(n>>>4)&3,(n>>>6)&3]; }
function decodeRibbonWord(word){
  const w=Number(word)>>>0;
  const contest={cool:w&7,beauty:(w>>>3)&7,cute:(w>>>6)&7,smart:(w>>>9)&7,tough:(w>>>12)&7};
  const special={champion:!!((w>>>15)&1),winning:!!((w>>>16)&1),victory:!!((w>>>17)&1),artist:!!((w>>>18)&1),effort:!!((w>>>19)&1),marine:!!((w>>>20)&1),land:!!((w>>>21)&1),sky:!!((w>>>22)&1),country:!!((w>>>23)&1),national:!!((w>>>24)&1),earth:!!((w>>>25)&1),world:!!((w>>>26)&1)};
  const unused=(w>>>27)&15, modernFatefulEncounter=!!((w>>>31)&1);
  const count=Object.values(contest).reduce((a,b)=>a+b,0)+Object.values(special).filter(Boolean).length;
  const names=[];
  for(const [key,label] of [['cool','Cool'],['beauty','Beauty'],['cute','Cute'],['smart','Smart'],['tough','Tough']]){
    const rank=contest[key]; if(rank) names.push(`${label} ${CONTEST_RANKS[rank]||`Rank ${rank}`}`);
  }
  for(const [key,label] of RIBBON_BOOLEAN_FIELDS) if(special[key]) names.push(label);
  return {raw:w,contest,special,unused,modernFatefulEncounter,count,names};
}
function decodeMetData(word){
  const w=Number(word)&0xFFFF;
  const metLevel=w&0x7F, metGame=(w>>>7)&0xF, pokeball=(w>>>11)&0xF, otGender=(w>>>15)&1;
  return {raw:w,metLevel,metGame,pokeball,otGender,originGame:originGameName(metGame),ball:ballName(pokeball),otGenderName:otGender?'Female':'Male'};
}
function statusLabel(raw){
  const s=Number(raw)>>>0;
  if(!s) return 'Healthy';
  if(s&0x80) return 'Badly poisoned';
  if(s&0x08) return 'Poisoned';
  if(s&0x10) return 'Burned';
  if(s&0x20) return 'Frozen';
  if(s&0x40) return 'Paralyzed';
  if(s&0x07) return `Asleep · ${s&7} turn${(s&7)===1?'':'s'}`;
  return `Status ${hex32(s)}`;
}

const DISPLAY_MODE_KEY = 'jrpg.world.emerald.live-display-mode.v1';
// Mobile is game-first: every fresh page load starts COMPACT so the live
// intelligence surface cannot swallow the game or global save controls.
// Desktop keeps the user's explicit display choice.
const MOBILE_DISPLAY = typeof matchMedia === 'function' ? matchMedia('(max-width: 959px)') : {matches:false};
let compactMode = !!MOBILE_DISPLAY.matches;
try {
  const savedDisplayMode = localStorage.getItem(DISPLAY_MODE_KEY);
  if (!MOBILE_DISPLAY.matches) compactMode = savedDisplayMode === 'compact';
} catch(e) {}
function setCompactMode(next){
  compactMode = !!next;
  const panel=document.getElementById('pokefield-live-panel');
  panel?.classList.toggle('pf-compact',compactMode);
  const button=document.getElementById('pf-compact-toggle');
  if(button){
    button.textContent=compactMode?'EXPAND':'COMPACT';
    button.setAttribute('aria-pressed',compactMode?'true':'false');
    button.setAttribute('aria-label',compactMode?'Expand PokéField details.':'Compact PokéField to one-line live intelligence.');
  }
  try { localStorage.setItem(DISPLAY_MODE_KEY,compactMode?'compact':'full'); } catch(e) {}
  try { window.dispatchEvent(new CustomEvent('jrpg:emerald-display-mode',{detail:{mode:compactMode?'compact':'full'}})); } catch(e) {}
}
function toggleCompactMode(){ setCompactMode(!compactMode); }


const EV_STATS = Object.freeze([['hp','HP'],['atk','ATK'],['def','DEF'],['spa','SPA'],['spd','SPD'],['spe','SPE']]);
const EV_PLAN_STORAGE_KEY = 'jrpg.world.emerald.ev-coach.v0.1.19';
const EV_ASSET_BASE = './assets/pokesprite';
const EV_GUIDE = Object.freeze({
  hp:{vitamin:'HP Up',vitaminIcon:`${EV_ASSET_BASE}/hp-up.png`,berry:'Pomeg Berry',berryIcon:`${EV_ASSET_BASE}/pomeg.png`},
  atk:{vitamin:'Protein',vitaminIcon:`${EV_ASSET_BASE}/protein.png`,berry:'Kelpsy Berry',berryIcon:`${EV_ASSET_BASE}/kelpsy.png`},
  def:{vitamin:'Iron',vitaminIcon:`${EV_ASSET_BASE}/iron.png`,berry:'Qualot Berry',berryIcon:`${EV_ASSET_BASE}/qualot.png`},
  spa:{vitamin:'Calcium',vitaminIcon:`${EV_ASSET_BASE}/calcium.png`,berry:'Hondew Berry',berryIcon:`${EV_ASSET_BASE}/hondew.png`},
  spd:{vitamin:'Zinc',vitaminIcon:`${EV_ASSET_BASE}/zinc.png`,berry:'Grepa Berry',berryIcon:`${EV_ASSET_BASE}/grepa.png`},
  spe:{vitamin:'Carbos',vitaminIcon:`${EV_ASSET_BASE}/carbos.png`,berry:'Tamato Berry',berryIcon:`${EV_ASSET_BASE}/tamato.png`}
});
const FRIENDSHIP_ICON = `${EV_ASSET_BASE}/friendship.png`;
const SOOTHE_BELL_ICON = `${EV_ASSET_BASE}/soothe-bell.png`;
const MACHO_BRACE_ICON = `${EV_ASSET_BASE}/macho-brace.png`;
const PKRS_BADGE = '<span class="pf-pkrs-badge" aria-hidden="true">PKRS</span>';
let evCoachPlans = (()=>{try{return JSON.parse(localStorage.getItem(EV_PLAN_STORAGE_KEY)||'{}')||{};}catch(e){return {};}})();
const evSnapshots = new Map();
const evLastGain = new Map();
function specimenKey(mon){ return mon?`${Number(mon.personality)>>>0}:${Number(mon.otId)>>>0}`:''; }
function plainEvs(evs){ return {hp:Number(evs?.hp||0),atk:Number(evs?.atk||0),def:Number(evs?.def||0),spa:Number(evs?.spa||0),spd:Number(evs?.spd||0),spe:Number(evs?.spe||0)}; }
function evTotal(evs){ const n=plainEvs(evs); return EV_STATS.reduce((sum,[key])=>sum+n[key],0); }
function normalizeEvPlan(plan){
  const evs={};
  for(const [key] of EV_STATS){
    const value = Number(plan?.[key] ?? plan?.evs?.[key] ?? 0);
    evs[key]=Math.max(0,Math.min(252,Number.isFinite(value)?Math.trunc(value):0));
  }
  const total = evTotal(evs);
  return {evs,total,valid:total<=510};
}
function saveEvCoachPlans(){ try{ localStorage.setItem(EV_PLAN_STORAGE_KEY, JSON.stringify(evCoachPlans)); }catch(e){} }
function getEvPlan(mon){
  const key=specimenKey(mon); if(!key || !evCoachPlans[key]) return null;
  return normalizeEvPlan(evCoachPlans[key]);
}
function setEvPlanByKey(key, plan){ if(!key) return null; const norm=normalizeEvPlan(plan); evCoachPlans[key]=norm.evs; saveEvCoachPlans(); return norm; }
function clearEvPlanByKey(key){ if(!key) return; delete evCoachPlans[key]; saveEvCoachPlans(); }
window.addEventListener('jrpg:emerald-set-ev-plan',event=>{
  const d=event.detail||{},p=Number(d.personality),o=Number(d.otId);
  if(!Number.isInteger(p)||!Number.isInteger(o)||!d.evs)return;
  setEvPlanByKey(`${p>>>0}:${o>>>0}`,d.evs);
  lastRenderKey='';
  try{const M=moduleReady();if(M)render(M);}catch(e){}
});
function evDelta(prev,next){
  const delta={}; let changed=false;
  for(const [key] of EV_STATS){ const d=(Number(next?.[key]||0)-Number(prev?.[key]||0)); if(d){delta[key]=d; changed=true;} }
  return changed?delta:null;
}
function trackEvSnapshot(mon){
  const key=specimenKey(mon); if(!key || !mon?.evs) return;
  const next=plainEvs(mon.evs); const prev=evSnapshots.get(key);
  if(prev){ const delta=evDelta(prev,next); if(delta) evLastGain.set(key,{delta,at:Date.now()}); }
  evSnapshots.set(key,next);
}
function formatEvDelta(delta){
  if(!delta) return '';
  return EV_STATS.filter(([key])=>delta[key]).map(([key,label])=>`${label} ${delta[key]>0?'+':''}${delta[key]}`).join(' · ');
}
function iconChip(icon,label,tone=''){ return `<span class="pf-icon-chip ${tone}">${icon?`<img src="${icon}" alt="" loading="lazy">`:''}<span>${label}</span></span>`; }
function natureShort(label){ return String(label||'').replace('Very ','').replace(' / immune',''); }
function friendshipPercent(mon){ return Math.max(0,Math.min(100,Math.round((Number(mon?.friendship||0)/255)*100))); }
function evRemainder(evs){ const n=plainEvs(evs); return EV_STATS.reduce((sum,[key])=>sum+(n[key]%4),0); }
function parseEvSpread(text){
  const evs={hp:0,atk:0,def:0,spa:0,spd:0,spe:0};
  const aliases={hp:'hp',atk:'atk',attack:'atk',def:'def',defense:'def',spa:'spa',spatk:'spa','special attack':'spa',spd:'spd',spdef:'spd','special defense':'spd',spe:'spe',speed:'spe'};
  const source=String(text||'').trim(); if(!source) return null;
  const re=/(\d{1,3})\s*(HP|Atk|Attack|Def|Defense|SpA|SpAtk|Special\s+Attack|SpD|SpDef|Special\s+Defense|Spe|Speed)\b/gi;
  let match,count=0;
  while((match=re.exec(source))){
    const token=match[2].toLowerCase().replace(/\s+/g,' '), key=aliases[token];
    if(!key) continue;
    evs[key]=Math.max(0,Math.min(252,Math.trunc(Number(match[1])||0))); count++;
  }
  return count?normalizeEvPlan(evs):null;
}
function battleEvMultiplier(mon,heldName){ return (heldName==='Macho Brace'?2:1)*(mon?.pokerusInfo?.state==='active'?2:1); }
function evPlanSummary(mon, plan){
  const current=plainEvs(mon?.evs); const active=[]; const complete=[]; const correction=[];
  if(!plan || !plan.valid) return {remaining:0,active,complete,correction,totalTarget:plan?.total||0,over:false};
  for(const [key,label] of EV_STATS){
    const target=Number(plan.evs[key]||0), cur=current[key]||0;
    if(target>0 && cur>target) correction.push(`${label} +${cur-target}`);
    else if(target>cur) active.push(`${label} ${target-cur}`);
    else if(target && cur===target) complete.push(label);
    else if(target===0 && cur>0) correction.push(`${label} ${cur}`);
  }
  return {remaining:active.length,active,complete,correction,totalTarget:plan.total,over:plan.total>510};
}
function bindEvCoach(scope){
  scope?.querySelectorAll('.pf-ev-plan-form').forEach(form=>{
    if(form.dataset.bound==='1') return; form.dataset.bound='1';
    form.addEventListener('submit',event=>{
      event.preventDefault();
      const key=form.dataset.specimen||'';
      const plan={}; for(const [stat] of EV_STATS){ plan[stat]=Number(form.elements[stat]?.value||0); }
      const norm=normalizeEvPlan(plan);
      if(!norm.valid){ const msg=form.querySelector('.pf-plan-summary'); if(msg) msg.textContent=`Spread total ${norm.total}/510 · too high`; return; }
      setEvPlanByKey(key,norm.evs); lastRenderKey=''; const M=moduleReady(); if(M) render(M);
    });
    form.querySelector('[data-ev-fill="current"]')?.addEventListener('click',()=>{
      const current=form.dataset.current?JSON.parse(form.dataset.current):{};
      for(const [stat] of EV_STATS){ if(form.elements[stat]) form.elements[stat].value=Number(current[stat]||0)||0; }
      const summary=form.querySelector('.pf-plan-summary'); if(summary) summary.textContent='Current live EVs copied into the plan. Save to lock them in.';
    });
    const applySpread=()=>{
      const input=form.querySelector('[data-ev-spread-input]'), summary=form.querySelector('.pf-plan-summary');
      const parsed=parseEvSpread(input?.value||'');
      if(!parsed){ if(summary) summary.textContent='Could not read that spread. Example: 252 SpA / 252 Spe / 4 HP'; return; }
      for(const [stat] of EV_STATS){ if(form.elements[stat]) form.elements[stat].value=parsed.evs[stat]||0; }
      if(summary) summary.textContent=`Parsed ${parsed.total}/510 · review, then SAVE PLAN.`;
    };
    form.querySelector('[data-ev-parse="1"]')?.addEventListener('click',applySpread);
    form.querySelector('[data-ev-spread-input]')?.addEventListener('keydown',event=>{ if(event.key==='Enter'){event.preventDefault();applySpread();} });
    form.querySelector('[data-ev-clear="1"]')?.addEventListener('click',()=>{ clearEvPlanByKey(form.dataset.specimen||''); lastRenderKey=''; const M=moduleReady(); if(M) render(M); });
  });
}


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
  const met=decodeMetData(u16(misc,2));
  const ribbons=decodeRibbonWord(u32(misc,8));
  const boxFlags=raw[19]||0;
  return {
    personality,otId,species,heldItem:u16(growth,2),experience:u32(growth,4),ppBonuses:growth[8],friendship:growth[9],
    moves:[u16(attacks,0),u16(attacks,2),u16(attacks,4),u16(attacks,6)],
    pp:[attacks[8],attacks[9],attacks[10],attacks[11]],
    ppUps:ppUpCounts(growth[8]),
    evs:{hp:evc[0],atk:evc[1],def:evc[2],spe:evc[3],spa:evc[4],spd:evc[5]},
    contest:{cool:evc[6],beauty:evc[7],cute:evc[8],smart:evc[9],tough:evc[10],sheen:evc[11]},
    pokerus:misc[0],metLocation:misc[1],...met,
    ivs,isEgg:!!((ivWord>>>30)&1),abilityNum:(ivWord>>>31)&1,ribbons,checksum:storedChecksum,
    language:raw[18]||0,languageName:languageName(raw[18]||0),markings:raw[27]||0,
    boxFlags:{raw:boxFlags,isBadEgg:!!(boxFlags&1),hasSpecies:!!(boxFlags&2),isEgg:!!(boxFlags&4),blockBoxRS:!!(boxFlags&8)}
  };
}

function hiddenPower(ivs){
  const typeBits=(ivs.hp&1)+2*(ivs.atk&1)+4*(ivs.def&1)+8*(ivs.spe&1)+16*(ivs.spa&1)+32*(ivs.spd&1);
  const powerBits=((ivs.hp>>1)&1)+2*((ivs.atk>>1)&1)+4*((ivs.def>>1)&1)+8*((ivs.spe>>1)&1)+16*((ivs.spa>>1)&1)+32*((ivs.spd>>1)&1);
  return {type:HP_TYPES[Math.floor(typeBits*15/63)],power:Math.floor(powerBits*40/63)+30};
}
const INTERNAL_TO_NATIONAL={"1":1,"2":2,"3":3,"4":4,"5":5,"6":6,"7":7,"8":8,"9":9,"10":10,"11":11,"12":12,"13":13,"14":14,"15":15,"16":16,"17":17,"18":18,"19":19,"20":20,"21":21,"22":22,"23":23,"24":24,"25":25,"26":26,"27":27,"28":28,"29":29,"30":30,"31":31,"32":32,"33":33,"34":34,"35":35,"36":36,"37":37,"38":38,"39":39,"40":40,"41":41,"42":42,"43":43,"44":44,"45":45,"46":46,"47":47,"48":48,"49":49,"50":50,"51":51,"52":52,"53":53,"54":54,"55":55,"56":56,"57":57,"58":58,"59":59,"60":60,"61":61,"62":62,"63":63,"64":64,"65":65,"66":66,"67":67,"68":68,"69":69,"70":70,"71":71,"72":72,"73":73,"74":74,"75":75,"76":76,"77":77,"78":78,"79":79,"80":80,"81":81,"82":82,"83":83,"84":84,"85":85,"86":86,"87":87,"88":88,"89":89,"90":90,"91":91,"92":92,"93":93,"94":94,"95":95,"96":96,"97":97,"98":98,"99":99,"100":100,"101":101,"102":102,"103":103,"104":104,"105":105,"106":106,"107":107,"108":108,"109":109,"110":110,"111":111,"112":112,"113":113,"114":114,"115":115,"116":116,"117":117,"118":118,"119":119,"120":120,"121":121,"122":122,"123":123,"124":124,"125":125,"126":126,"127":127,"128":128,"129":129,"130":130,"131":131,"132":132,"133":133,"134":134,"135":135,"136":136,"137":137,"138":138,"139":139,"140":140,"141":141,"142":142,"143":143,"144":144,"145":145,"146":146,"147":147,"148":148,"149":149,"150":150,"151":151,"152":152,"153":153,"154":154,"155":155,"156":156,"157":157,"158":158,"159":159,"160":160,"161":161,"162":162,"163":163,"164":164,"165":165,"166":166,"167":167,"168":168,"169":169,"170":170,"171":171,"172":172,"173":173,"174":174,"175":175,"176":176,"177":177,"178":178,"179":179,"180":180,"181":181,"182":182,"183":183,"184":184,"185":185,"186":186,"187":187,"188":188,"189":189,"190":190,"191":191,"192":192,"193":193,"194":194,"195":195,"196":196,"197":197,"198":198,"199":199,"200":200,"201":201,"202":202,"203":203,"204":204,"205":205,"206":206,"207":207,"208":208,"209":209,"210":210,"211":211,"212":212,"213":213,"214":214,"215":215,"216":216,"217":217,"218":218,"219":219,"220":220,"221":221,"222":222,"223":223,"224":224,"225":225,"226":226,"227":227,"228":228,"229":229,"230":230,"231":231,"232":232,"233":233,"234":234,"235":235,"236":236,"237":237,"238":238,"239":239,"240":240,"241":241,"242":242,"243":243,"244":244,"245":245,"246":246,"247":247,"248":248,"249":249,"250":250,"251":251,"277":252,"278":253,"279":254,"280":255,"281":256,"282":257,"283":258,"284":259,"285":260,"286":261,"287":262,"288":263,"289":264,"290":265,"291":266,"292":267,"293":268,"294":269,"295":270,"296":271,"297":272,"298":273,"299":274,"300":275,"301":290,"302":291,"303":292,"304":276,"305":277,"306":285,"307":286,"308":327,"309":278,"310":279,"311":283,"312":284,"313":320,"314":321,"315":300,"316":301,"317":352,"318":343,"319":344,"320":299,"321":324,"322":302,"323":339,"324":340,"325":370,"326":341,"327":342,"328":349,"329":350,"330":318,"331":319,"332":328,"333":329,"334":330,"335":296,"336":297,"337":309,"338":310,"339":322,"340":323,"341":363,"342":364,"343":365,"344":331,"345":332,"346":361,"347":362,"348":337,"349":338,"350":298,"351":325,"352":326,"353":311,"354":312,"355":303,"356":307,"357":308,"358":333,"359":334,"360":360,"361":355,"362":356,"363":315,"364":287,"365":288,"366":289,"367":316,"368":317,"369":357,"370":293,"371":294,"372":295,"373":366,"374":367,"375":368,"376":359,"377":353,"378":354,"379":336,"380":335,"381":369,"382":304,"383":305,"384":306,"385":351,"386":313,"387":314,"388":345,"389":346,"390":347,"391":348,"392":280,"393":281,"394":282,"395":371,"396":372,"397":373,"398":374,"399":375,"400":376,"401":377,"402":378,"403":379,"404":382,"405":383,"406":384,"407":380,"408":381,"409":385,"410":386,"411":358};
function nationalDex(internal){
  return INTERNAL_TO_NATIONAL[Number(internal)] || null;
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
function levelFromExperience(meta,experience){
  const idx=Number(meta?.growthRateIndex ?? 0), table=dex?.experienceTables?.[idx];
  if(!Array.isArray(table)) return 0;
  const exp=Number(experience)||0; let level=1;
  for(let n=2;n<=100;n++){ if(Number(table[n])<=exp) level=n; else break; }
  return level;
}
function natureStatModifier(nature,key){
  const map={Hardy:{},Lonely:{up:'atk',down:'def'},Brave:{up:'atk',down:'spe'},Adamant:{up:'atk',down:'spa'},Naughty:{up:'atk',down:'spd'},Bold:{up:'def',down:'atk'},Docile:{},Relaxed:{up:'def',down:'spe'},Impish:{up:'def',down:'spa'},Lax:{up:'def',down:'spd'},Timid:{up:'spe',down:'atk'},Hasty:{up:'spe',down:'def'},Serious:{},Jolly:{up:'spe',down:'spa'},Naive:{up:'spe',down:'spd'},Modest:{up:'spa',down:'atk'},Mild:{up:'spa',down:'def'},Quiet:{up:'spa',down:'spe'},Bashful:{},Rash:{up:'spa',down:'spd'},Calm:{up:'spd',down:'atk'},Gentle:{up:'spd',down:'def'},Sassy:{up:'spd',down:'spe'},Careful:{up:'spd',down:'spa'},Quirky:{}};
  const e=map[nature]||{}; return e.up===key?1.1:(e.down===key?0.9:1);
}
function boxedCalculatedStats(meta,mon,level,nature){
  const b=meta?.baseStats||{}; const base={hp:b.hp,atk:b.attack,def:b.defense,spe:b.speed,spa:b.sp_attack,spd:b.sp_defense}; const out={};
  for(const key of ['hp','atk','def','spe','spa','spd']){
    const rawBase=Number(base[key]||0),iv=Number(mon.ivs?.[key]||0),ev=Number(mon.evs?.[key]||0);
    if(key==='hp') out.hp=rawBase===1?1:Math.floor(((2*rawBase+iv+Math.floor(ev/4))*level)/100)+level+10;
    else { const raw=Math.floor(((2*rawBase+iv+Math.floor(ev/4))*level)/100)+5; out[key]=Math.floor(raw*natureStatModifier(nature,key)); }
  }
  return out;
}

function enrich(mon,raw100){
  const meta=dex?.species?.[String(mon.species)] || {};
  const hp=hiddenPower(mon.ivs);
  const ability=(meta.abilities||[])[mon.abilityNum] || (meta.abilities||[])[0] || 'Unknown';
  const nature=NATURES[mon.personality%25];
  const level=raw100?.length>=85 ? raw100[84] : levelFromExperience(meta,mon.experience);
  const boxedStats=!raw100&&level?boxedCalculatedStats(meta,mon,level,nature):null;
  const current={
    status:raw100?.length>=84?u32(raw100,80):0,
    level,
    hp:raw100?.length>=88?u16(raw100,86):(boxedStats?.hp||0),
    maxHP:raw100?.length>=90?u16(raw100,88):(boxedStats?.hp||0),
    atk:raw100?.length>=92?u16(raw100,90):(boxedStats?.atk||0),
    def:raw100?.length>=94?u16(raw100,92):(boxedStats?.def||0),
    spe:raw100?.length>=96?u16(raw100,94):(boxedStats?.spe||0),
    spa:raw100?.length>=98?u16(raw100,96):(boxedStats?.spa||0),
    spd:raw100?.length>=100?u16(raw100,98):(boxedStats?.spd||0),
  };
  const moveNames=mon.moves.map((id,i)=>id?({id,name:titleName(dex?.moves?.[id]||`Move ${id}`),pp:mon.pp[i],ppUps:mon.ppUps?.[i]||0}):null).filter(Boolean);
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
  const shiny=shinyInfo(mon.otId,mon.personality);
  const pokerus=pokerusInfo(mon.pokerus);
  const origin={gameId:mon.metGame,game:mon.originGame,locationId:mon.metLocation,location:metLocationName(mon.metLocation),metLevel:mon.metLevel,ballId:mon.pokeball,ball:mon.ball,otGender:mon.otGenderName,fateful:!!mon.ribbons?.modernFatefulEncounter};
  const notability=globalThis.PokeFieldNotability.assess({...mon,hp,shiny,pokerusInfo:pokerus,origin,rareFemale});
  signal=notability.status;
  return {...mon,notability,meta,hp,ability,nature,current:{...current,statusName:statusLabel(current.status),mail:raw100?.length>=86?raw100[85]:255},moveNames,totalIV,perfect,nearPerfect,ivSignal,signal,gender,genderSymbol:genderSymbol(gender),femaleRatio,rareFemale,breedingSignal,heldItemName:heldItemName(mon.heldItem),dexNo:nationalDex(mon.species),shiny,pokerusInfo:pokerus,origin,friendshipLabel:friendshipLabel(mon.friendship)};
}
function stableReadMon(M,address){
  // Two reads + Gen III checksum. If the emulation thread mutates the mon mid-read, discard it.
  for(let attempt=0;attempt<2;attempt++){
    const a=readBytes(M,address,EMERALD.pokemonSize);
    const m=decryptBox(a);
    if(m){ const out=enrich(m,a); out._pk3Raw=new Uint8Array(a.slice(0,EMERALD.boxPokemonSize)); return out; }
  }
  return null;
}

// v0.1.21 PC BOX bridge: 14 × 30 BoxPokemon records from Emerald's moving PokemonStorage.
const pcBoxCache=Array.from({length:EMERALD.totalBoxes},()=>Array(EMERALD.boxSlots).fill(null));
const transferRawRegistry=new Map();
function registerTransferRaw(ref,mon){
  if(!ref||!mon?._pk3Raw||mon._pk3Raw.length<EMERALD.boxPokemonSize)return;
  const raw=new Uint8Array(mon._pk3Raw.slice(0,EMERALD.boxPokemonSize));
  if(!decryptBox(raw))return;
  transferRawRegistry.set(String(ref),{ref:String(ref),personality:mon.personality>>>0,otId:mon.otId>>>0,checksum:Number(mon.checksum)||0,bytes:raw,updatedAt:Date.now()});
}
function findTransferRefBySpecimen(specimenId){
  const [pid,ot]=String(specimenId||'').split(':').map(Number);if(!Number.isFinite(pid)||!Number.isFinite(ot))return '';
  const matches=[...transferRawRegistry.values()].filter(x=>(x.personality>>>0)===(pid>>>0)&&(x.otId>>>0)===(ot>>>0));
  return matches.length===1?matches[0].ref:(matches[0]?.ref||'');
}
globalThis.JRPGWorldEmeraldTransfer={
  version:'0.1.24.3',
  getExactPK3(refOrSpecimen){let e=transferRawRegistry.get(String(refOrSpecimen||''));if(!e){const r=findTransferRefBySpecimen(refOrSpecimen);if(r)e=transferRawRegistry.get(r);}return e?new Uint8Array(e.bytes):null;},
  inspect(refOrSpecimen){let e=transferRawRegistry.get(String(refOrSpecimen||''));if(!e){const r=findTransferRefBySpecimen(refOrSpecimen);if(r)e=transferRawRegistry.get(r);}return e?{ref:e.ref,personality:e.personality,otId:e.otId,checksum:e.checksum,size:e.bytes.length,updatedAt:e.updatedAt}:null;},
  findRef:findTransferRefBySpecimen,
  list(){return [...transferRawRegistry.values()].map(e=>({ref:e.ref,personality:e.personality,otId:e.otId,checksum:e.checksum,size:e.bytes.length,updatedAt:e.updatedAt}));}
};
let pcBoxScanCursor=0,pcBoxRevision=0,lastStoragePtr=0,currentPcBox=0;
function validEwramPtr(ptr){ return Number.isInteger(ptr) && ptr>=0x02000000 && ptr<0x02040000; }
function storagePointer(M){
  const ptr=readU32Guest(M,EMERALD.pokemonStoragePtr)>>>0;
  if(!validEwramPtr(ptr)) return 0;
  const current=busRead8(M,ptr); if(current>=EMERALD.totalBoxes) return 0;
  currentPcBox=current; return ptr;
}
function boxSignature(mon){return mon?`${mon.personality>>>0}:${mon.otId>>>0}:${mon.checksum}:${mon.experience}:${mon.heldItem}`:'';}
function scanOnePcBox(M){
  const ptr=storagePointer(M); if(!ptr) return false;
  if(lastStoragePtr && lastStoragePtr!==ptr){ /* pointer moved; content remains valid but force one complete refresh cycle */ pcBoxScanCursor=0; }
  lastStoragePtr=ptr;
  const box=pcBoxScanCursor, next=[]; let changed=false;
  for(let slot=0;slot<EMERALD.boxSlots;slot++){
    const address=ptr+EMERALD.boxesOffset+(box*EMERALD.boxSlots+slot)*EMERALD.boxPokemonSize;
    const raw=readBytes(M,address,EMERALD.boxPokemonSize), dec=decryptBox(raw);
    const mon=dec && !dec.boxFlags?.isBadEgg ? enrich(dec,null) : null;
    if(mon) mon._pk3Raw=new Uint8Array(raw);
    next.push(mon);
  }
  // Reject a scan if ASLR moved the pointer while this box was being read.
  const ptrAfter=readU32Guest(M,EMERALD.pokemonStoragePtr)>>>0;
  if(ptrAfter!==ptr) return false;
  for(let i=0;i<EMERALD.boxSlots;i++) if(boxSignature(next[i])!==boxSignature(pcBoxCache[box][i])){changed=true;break;}
  if(changed){pcBoxCache[box]=next;pcBoxRevision++;}
  pcBoxScanCursor=(pcBoxScanCursor+1)%EMERALD.totalBoxes;
  return changed;
}
function publicBoxMon(mon,box,slot){
  const ref=mon?`B${box}:${slot}:${mon.personality>>>0}:${mon.otId>>>0}`:'';if(mon)registerTransferRaw(ref,mon);
  const p=publicMon(mon,mon?.isEgg?'EGG':'BOXED'); if(!p)return null;
  return {...p,transferRef:ref,storage:{box,slot,label:`BOX ${box+1} · SLOT ${slot+1}`}};
}
function flattenedPcBoxes(){
  const out=[];for(let box=0;box<pcBoxCache.length;box++)for(let slot=0;slot<pcBoxCache[box].length;slot++){const mon=pcBoxCache[box][slot];if(mon)out.push(publicBoxMon(mon,box,slot));}return out;
}

// Public, read-only product state for additive JRPG.WORLD features such as Trainer Cards.
// This intentionally publishes only decoded gameplay facts. It does not expose or add write access to mGBA.
function publicMon(mon,kind){
  if(!mon) return null;
  const evTotal=Object.values(mon.evs).reduce((a,b)=>a+b,0);
  return {
    id:`${mon.personality}:${mon.checksum}`,
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
    notability:structuredClone(mon.notability),
    mirageValue:mon.personality & 0xFFFF,
    ivSignal:mon.ivSignal,
    ivs:{...mon.ivs},
    evs:{...mon.evs},
    evTotal,
    ivTotal:mon.totalIV,
    ivAverage:Math.round((mon.totalIV/6)*10)/10,
    hiddenPower:{type:mon.hp.type,power:mon.hp.power},
    heldItemId:Number(mon.heldItem||0),
    heldItem:mon.heldItem?heldItemName(mon.heldItem):'',
    friendship:Number(mon.friendship||0),
    friendshipLabel:mon.friendshipLabel,
    experience:Number(mon.experience||0),
    shiny:{...mon.shiny},
    personality:mon.personality>>>0,
    personalityHex:hex32(mon.personality),
    otId:mon.otId>>>0,
    trainerId:mon.otId&0xFFFF,
    secretId:(mon.otId>>>16)&0xFFFF,
    languageId:Number(mon.language||0),
    language:mon.languageName,
    markings:Number(mon.markings||0),
    pokerus:{...mon.pokerusInfo},
    contest:{...mon.contest},
    ribbons:JSON.parse(JSON.stringify(mon.ribbons||{})),
    origin:{...mon.origin},
    current:{...mon.current},
    boxFlags:{...mon.boxFlags},
    ppBonuses:Number(mon.ppBonuses||0),
    rareFemale:!!mon.rareFemale,
    femaleRatio:mon.femaleRatio,
    perfect:[...(mon.perfect||[])],
    moves:(mon.moveNames||[]).map(m=>({id:m.id,name:m.name,pp:m.pp,ppUps:m.ppUps||0}))
  };
}
function publishProductState(code,wild,party,inBattle,battleFlags){
  const partyPublic=party.map((m,i)=>{if(!m)return null;const ref=`P${i}:${m.personality>>>0}:${m.otId>>>0}`;registerTransferRaw(ref,m);return {...publicMon(m,m?.isEgg?'EGG':'OWNED'),transferRef:ref};});
  const state={
    version:'0.1.24',
    gameCode:code,
    connected:code===EMERALD.gameCode,
    inBattle:!!inBattle,
    battleFlags:battleFlags>>>0,
    selectedParty,
    currentPcBox,
    pcBoxRevision,
    wild:publicMon(wild,'WILD'),
    party:partyPublic,
    boxes:flattenedPcBoxes(),
    primary:publicMon(wild,'WILD') || partyPublic[selectedParty] || null
  };
  [state.primary,state.wild,...state.party,...state.boxes].filter(Boolean).forEach(trackEvSnapshot);
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
      <div class="pf-head-actions"><button id="pf-compact-toggle" class="pf-compact-toggle" type="button" aria-pressed="false">COMPACT</button><small>${POKEFIELD_BUILD}</small></div>
    </div>
    <div id="pf-status" class="pf-status">Waiting for mGBA…</div>
    <details id="pf-updates" class="pf-updates">
      <summary><span class="pf-update-dot" aria-hidden="true"></span><strong>UPDATED 12 SEP · v0.1.24.6</strong><small>RECENT</small></summary>
      <div class="pf-update-list">
        <div><b>v0.1.24.7</b><span>POKÉFIELD SPECIES FIELD RESET · complete 386-species field · owned specimens as semantic metadata · CALL / FOCUS / SCATTER · vertical tier RANK · mobile one-line compact</span></div><div><b>v0.1.24.6</b><span>MY FIELD · CALL / FOCUS / SCATTER restored · full owned population · exact internal→National Dex identity mapping · shiny Gen III sprites</span></div><div><b>v0.1.24.5</b><span>SAVE SWITCH + MOBILE FLOW · Vault moved below game · normal page scrolling restored · save switching now verifies runtime before swapping slots · duplicate-recovery path</span></div><div><b>v0.1.24.4</b><span>MOBILE UX · start compact · single Trainer Card entry · clearer saved-find language</span></div><div><b>v0.1.24.3</b><span>SAVE VAULT IMPORT · durable iOS file picker outside re-rendered slots · server round-trip verification · imported slot must become visible</span></div><div><b>v0.1.24.2</b><span>SAVE VAULT IMPORT · iOS-safe file read order · inline import progress/errors · visible server response</span></div><div><b>v0.1.24.1</b><span>SAVE VAULT HARD LOAD · stop old SRAM → verified .sav swap → restart same ROM</span></div><div><b>v0.1.24</b><span>TRANSFER COMPILER · exact PK3 → PK4 → PK5 · Pal Park string/trash-byte parity · PK6 target-bind safety boundary</span></div><div><b>v0.1.23</b><span>HOME BRIDGE P0 · exact PK3 source capsule + provenance receipt · no HOME writes yet</span></div><div><b>v0.1.22.2</b><span>Seamless REGULAR ↔ DEX switch · same live emulator/ROM session · no reload</span></div><div><b>v0.1.22.1</b><span>Regular mode restored · optional DEX Strategy Pokédex mode</span></div><div><b>v0.1.21.1</b><span>TeamLab EV → Live Coach handshake + ADV role grammar + exact Hidden Power coverage</span></div><div><b>v0.1.21</b><span>PC BOXES + Reactive My Field + Threat Lab + exact Gen III benchmarks + EV & theme team optimizers</span></div><div><b>v0.1.20</b><span>TEAM LAB · evolution roadmaps, worthwhile STAB, acquisition routes, partner fit and six-Pokémon fabric</span></div><div><b>v0.1.19</b><span>Detail Polish + LIVE EV COACH · EV plans, progress bars, item/berry hints and cleaner passport cards</span></div><div><b>v0.1.18.2</b><span>Display state labels · COMPACT / EXPAND + cache-safe presentation module</span></div><div><b>v0.1.18.1</b><span>Live panel height sync for expanded DETAILS</span></div><div><b>v0.1.18</b><span>MY FIELD · CALL, tiers and specimen flags</span></div><div><b>v0.1.17</b><span>MY POKÉFIELD · Owned party specimens · CALL / FOCUS / RANK</span></div><div><b>v0.1.16</b><span>Desktop live panel cleanup</span></div><div><b>v0.1.15</b><span>Desktop keyboard · Z Select · X B · C A</span></div><div><b>v0.1.14</b><span>Desktop Compact + Trainer Card flip repair</span></div><div><b>v0.1.13</b><span>Save Vault · public UI polish</span></div><div><b>v0.1.11</b><span>Save Vault reliability</span></div><div><b>v0.1.9</b><span>Specimen Passport · ribbons + Pokérus</span></div>
        <div><b>v0.1.8.1</b><span>Live update trail</span></div>
        <div><b>v0.1.8</b><span>Compact mode + held items</span></div>
        <div><b>v0.1.7.4</b><span>Safari sound recovery</span></div>
        <div><b>v0.1.7.3</b><span>Trainer Card runtime freeze fix</span></div>
      </div>
    </details>
    <button id="pf-audio-recover" class="pf-audio-recover" type="button" hidden>🔊 TAP TO RESTART SOUND</button>
    <div id="pf-primary" class="pf-primary"></div>
    <details id="pf-owned-drawer" class="pf-drawer">
      <summary><span>MY PARTY</span><small id="pf-party-summary">live save data</small></summary>
      <div id="pf-party" class="pf-party"></div>
      <div id="pf-selected"></div>
    </details>
    ${POKEFIELD_DEBUG_UI ? `<details class="pf-drawer pf-tech">
      <summary><span>DEBUG</span><small>developer diagnostics</small></summary>
      <div id="pf-debug" class="pf-debug"></div>
    </details>` : `<div id="pf-debug" hidden></div>`}`;
  document.body.appendChild(panel);
  panel.querySelector('#pf-compact-toggle')?.addEventListener('click',toggleCompactMode);
  setCompactMode(compactMode);
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
 const sprite=mon.dexNo?(mon.shiny?.isShiny?`./assets/pokemon-shiny/${mon.dexNo}.png`:`./assets/pokemon/${mon.dexNo}.png`):'';
 const total=evTotal(mon.evs);
 const evShort=`HP ${mon.evs.hp} · A ${mon.evs.atk} · D ${mon.evs.def} · SA ${mon.evs.spa} · SD ${mon.evs.spd} · S ${mon.evs.spe}`;
 const genderClass=mon.gender===GENDER.FEMALE?'female':mon.gender===GENDER.MALE?'male':'genderless';
 const ratioText=mon.femaleRatio==null?'Genderless species':`${mon.femaleRatio}% female species ratio`;
 const breedNote=mon.rareFemale?`<div class="pf-breed-note">♀ RARE FEMALE · ${mon.femaleRatio}% · BREEDING VALUE</div>`:'';
 const heldName=mon.heldItem?heldItemName(mon.heldItem):'';
 const heldChip=heldName?`<div class="pf-held-item">🎒 HELD · ${heldName}</div>`:'';
 const passportBadges=(mon.notability?.flags||[]).map(f=>f.label);
 const badgeRow=passportBadges.length?`<div class="pf-passport-badges">${passportBadges.map(x=>`<span>${x}</span>`).join('')}</div>`:'';
 const avg=(mon.totalIV/6).toFixed(1);
 const perfectCount=(mon.perfect||[]).length;
 const compactFacts=`<div class="pf-compact-facts"><span>IV AVG ${avg}</span>${perfectCount?`<span class="pf-compact-perfect">★ ${perfectCount}×31</span>`:''}<span>HP ${mon.hp.type} ${mon.hp.power}</span>${heldName?`<span class="pf-compact-item">🎒 ${heldName}</span>`:''}</div>`;
 const plan=getEvPlan(mon);
 const planState=evPlanSummary(mon,plan);
 const lastGain=evLastGain.get(specimenKey(mon));
 const friendPct=friendshipPercent(mon);
 const coachBadges=[];
 const evMultiplier=battleEvMultiplier(mon,heldName);
 if(heldName==='Macho Brace') coachBadges.push(iconChip(MACHO_BRACE_ICON,'Macho Brace ×2','active'));
 if(mon.pokerusInfo.state==='active') coachBadges.push(`<span class="pf-icon-chip active">${PKRS_BADGE}<span>Pokérus ×2</span></span>`);
 if(evMultiplier===4) coachBadges.push(`<span class="pf-mini-badge pf-x4-badge">BATTLE EVs ×4</span>`);
 if(heldName==='Soothe Bell') coachBadges.push(iconChip(SOOTHE_BELL_ICON,'Soothe Bell · friendship gains','support'));
 const overviewChips=[
   iconChip(FRIENDSHIP_ICON,`Friendship ${mon.friendship}/255 · ${mon.friendshipLabel}`,'support'),
   `<span class="pf-icon-chip ${mon.pokerusInfo.state}">${PKRS_BADGE}<span>${mon.pokerusInfo.label}</span></span>`,
   heldName?iconChip(heldName==='Soothe Bell'?SOOTHE_BELL_ICON:heldName==='Macho Brace'?MACHO_BRACE_ICON:'',heldName,'support'):''
 ].filter(Boolean).join('');
 const detailRows = `
   <div class="pf-kv-grid">
     <section class="pf-info-card"><h4>OVERVIEW</h4>
       <div class="pf-kv"><span>Held item</span><strong>${heldName||'None'}</strong></div>
       <div class="pf-kv"><span>Gender</span><strong>${mon.gender} · ${ratioText}</strong></div>
       <div class="pf-kv"><span>Egg groups</span><strong>${mon.meta.eggGroups?.length?mon.meta.eggGroups.join(' / '):'—'}</strong></div>
       <div class="pf-kv"><span>Hidden Power</span><strong>${mon.hp.type} · ${mon.hp.power} power</strong></div>
       <div class="pf-kv"><span>IV signal</span><strong>${mon.notability.explanation}</strong></div>
       <div class="pf-kv"><span>EV total</span><strong>${total}/510 · remaining ${Math.max(0,510-total)}</strong></div>
     </section>
     <section class="pf-info-card"><h4>SPECIMEN</h4>
       <div class="pf-kv"><span>PID</span><strong>${hex32(mon.personality)} · Mirage ${mon.personality & 0xFFFF}</strong></div>
       <div class="pf-kv"><span>Shiny value</span><strong>${mon.shiny?.value}${mon.shiny?.isShiny?' · SHINY':''}</strong></div>
       <div class="pf-kv"><span>TID / SID</span><strong>${mon.otId&0xFFFF} / ${(mon.otId>>>16)&0xFFFF} · ${mon.languageName}</strong></div>
       <div class="pf-kv"><span>Status</span><strong>${mon.current.statusName}</strong></div>
       <div class="pf-kv"><span>Experience</span><strong>${mon.experience.toLocaleString()}</strong></div>
       <div class="pf-kv"><span>Markings</span><strong>0x${Number(mon.markings||0).toString(16).toUpperCase()}</strong></div>
     </section>
     <section class="pf-info-card"><h4>ORIGIN</h4>
       <div class="pf-kv"><span>Game</span><strong>${mon.origin.game}</strong></div>
       <div class="pf-kv"><span>Met</span><strong>${mon.origin.location} · Lv${mon.origin.metLevel}</strong></div>
       <div class="pf-kv"><span>Ball / OT</span><strong>${mon.origin.ball} · OT ${mon.origin.otGender}${mon.origin.fateful?' · Fateful encounter':''}</strong></div>
       <div class="pf-kv"><span>IDs</span><strong>Game ${mon.origin.gameId} · Location ${mon.origin.locationId}</strong></div>
     </section>
     <section class="pf-info-card"><h4>POKÉRUS & BOND</h4>
       <div class="pf-kv"><span>Pokérus</span><strong>${mon.pokerusInfo.label} · raw 0x${Number(mon.pokerus||0).toString(16).padStart(2,'0').toUpperCase()}</strong></div>
       <div class="pf-kv"><span>Friendship</span><strong>${mon.friendship}/255 · ${mon.friendshipLabel}</strong></div>
       <div class="pf-meter" aria-hidden="true"><span style="width:${friendPct}%"></span></div>
       ${heldName==='Soothe Bell'?`<div class="pf-kv pf-kv-note"><span>Support</span><strong><img src="${SOOTHE_BELL_ICON}" alt=""> Soothe Bell equipped</strong></div>`:''}
     </section>
     <section class="pf-info-card pf-span-2"><h4>CONTEST CONDITION</h4><div class="pf-condition-grid">${[['Cool','cool'],['Beauty','beauty'],['Cute','cute'],['Smart','smart'],['Tough','tough'],['Sheen','sheen']].map(([label,key])=>`<span><b>${mon.contest[key]}</b><small>${label}</small></span>`).join('')}</div></section>
     <section class="pf-info-card pf-span-2"><h4>RIBBONS · ${mon.ribbons.count}</h4>${mon.ribbons.names.length?`<div class="pf-ribbons">${mon.ribbons.names.map(r=>`<span>${r}</span>`).join('')}</div>`:'<p class="pf-muted-copy">None</p>'}${mon.ribbons.modernFatefulEncounter?'<p class="pf-muted-copy">Modern fateful encounter bit set.</p>':''}</section>
   </div>`;
 const evRows = EV_STATS.map(([key,label])=>{
   const cur=Number(mon.evs[key]||0), target=Number(plan?.evs?.[key]||0);
   const denom=target>0?target:255;
   const pct=Math.max(0,Math.min(100,Math.round((cur/Math.max(1,denom))*100)));
   const over=target>0 && cur>target;
   const remaining=target>0?Math.max(0,target-cur):0;
   const guide=EV_GUIDE[key];
   return `<div class="pf-ev-row ${target>0&&cur>=target?'done':''} ${over?'over':''}">
     <div class="pf-ev-label"><b>${label}</b><small>${target>0?`${cur} / ${target}`:`${cur} / 255`}</small></div>
     <div class="pf-ev-track" aria-hidden="true"><span style="width:${pct}%"></span></div>
     <div class="pf-ev-hint">${over?`Over by ${cur-target}`:target>0?remaining?`${remaining} left`:'Complete':'Live current EVs'}</div>
     <div class="pf-ev-tools"><span class="${cur>=100?'is-disabled':''}" title="${guide.vitamin}: +10 ${label} EV; in Gen III vitamins cannot raise this stat beyond 100 EV." aria-label="${guide.vitamin}: plus 10 ${label} EV, usable below 100 EV in Generation 3"><img src="${guide.vitaminIcon}" alt="" loading="lazy"></span><span class="${cur<=0?'is-disabled':''}" title="${guide.berry}: −10 ${label} EV in Emerald and raises friendship." aria-label="${guide.berry}: minus 10 ${label} EV in Emerald and raises friendship"><img src="${guide.berryIcon}" alt="" loading="lazy"></span></div>
   </div>`;
 }).join('');
 const planInputs = EV_STATS.map(([key,label])=>`<label><span>${label}</span><input type="number" name="${key}" min="0" max="252" step="1" value="${plan?.evs?.[key]??''}" placeholder="0"></label>`).join('');
 const planWaste=plan?evRemainder(plan.evs):0;
 const planSummary = plan ? (plan.valid?`Target ${plan.total}/510${planState.active.length?` · Remaining ${planState.active.join(' · ')}`:''}${planState.correction.length?` · Off-target ${planState.correction.join(' · ')}`:''}${planWaste?` · ${planWaste} remainder EV${planWaste===1?'':'s'} outside full 4-EV blocks`:''}`:`Target ${plan.total}/510 · too high`) : 'Set or paste a Smogon-style EV spread to track live progress while you play.';
 return `<div class="pf-card ${kind==='WILD'?'wild':''}">
   <div class="pf-title">${sprite?`<img class="pf-sprite" src="${sprite}" alt="">`:''}<div class="pf-ident"><div class="pf-name">${mon.isEgg?'EGG · ':''}${mon.shiny?.isShiny?'✦ ':''}${titleName(mon.meta.name||`Species ${mon.species}`)} <span class="pf-gender-symbol ${genderClass}">${mon.genderSymbol}</span> ${mon.current.level?`Lv${mon.current.level}`:''}</div><div class="pf-sub">${mon.nature} · ${titleName(mon.ability)} · ${kind}</div>${heldChip}${badgeRow}${breedNote}</div><div class="pf-signal ${mon.signal}">${mon.signal}</div></div>
   ${compactFacts}
   ${ivGrid(mon)}
   <div class="pf-hp"><strong>Hidden Power ${mon.hp.type}</strong><span>${mon.hp.power} power</span></div>
   <div class="pf-ev-quick">EV · ${evShort}</div>
   <details class="pf-detail"><summary>DETAILS</summary>
     <div class="pf-detail-stack">
       <div class="pf-detail-chips">${overviewChips}</div>
       <section class="pf-info-card pf-ev-coach-card pf-span-2">
         <div class="pf-section-head"><h4>LIVE EV COACH</h4><div class="pf-section-badges"><span class="pf-mini-badge">${total}/510 total</span>${coachBadges.join('')}</div></div>
         ${lastGain?`<div class="pf-last-gain">Last EV change · ${formatEvDelta(lastGain.delta)}</div>`:''}
         <div class="pf-ev-rows">${evRows}</div>
         <form class="pf-ev-plan-form" data-specimen="${specimenKey(mon)}" data-current='${JSON.stringify(plainEvs(mon.evs))}'>
           <div class="pf-spread-paste"><input type="text" data-ev-spread-input autocomplete="off" spellcheck="false" placeholder="Paste spread · 252 SpA / 252 Spe / 4 HP" aria-label="Paste EV spread"><button type="button" data-ev-parse="1">APPLY SPREAD</button></div>
           <div class="pf-plan-grid">${planInputs}</div>
           <div class="pf-plan-actions"><button type="submit">SAVE PLAN</button><button type="button" data-ev-fill="current">USE CURRENT</button><button type="button" data-ev-clear="1">CLEAR</button></div>
           <p class="pf-plan-summary">${planSummary}</p>
           <p class="pf-ev-rules">GEN III · 255 can be stored per stat, but 252 is the useful competitive cap. Vitamins add 10 only below 100 EV. Emerald EV berries remove 10 and raise friendship. Macho Brace and active Pokérus stack to ×4 battle EVs.</p>
         </form>
       </section>
       ${detailRows}
       ${mon.moveNames.length?`<div class="pf-moves">${mon.moveNames.map(m=>`<span class="pf-move">${m.name} · ${m.pp} PP${m.ppUps?` · ${m.ppUps} PP Up${m.ppUps===1?'':'s'}`:''}</span>`).join('')}</div>`:''}
     </div>
   </details>
 </div>`;
}

function render(M){
 ensureUI();
 const status=document.getElementById('pf-status'), primaryEl=document.getElementById('pf-primary'), partyEl=document.getElementById('pf-party'), selectedEl=document.getElementById('pf-selected'), dbg=document.getElementById('pf-debug'), drawer=document.getElementById('pf-owned-drawer'), partySummary=document.getElementById('pf-party-summary');
 let code='';
 try{ code=readAscii(M,0x080000AC,4); }catch{}
 if(!code){globalThis.JRPGWorldEmeraldState={version:'0.1.24',gameCode:'',connected:false,primary:null,wild:null,party:[],boxes:[]};window.dispatchEvent(new CustomEvent('jrpg:emerald-state',{detail:globalThis.JRPGWorldEmeraldState}));status.className='pf-status';status.textContent='Load your Emerald ROM to begin.';return;}
 if(code!==EMERALD.gameCode){globalThis.JRPGWorldEmeraldState={version:'0.1.24',gameCode:code,connected:false,primary:null,wild:null,party:[],boxes:[]};window.dispatchEvent(new CustomEvent('jrpg:emerald-state',{detail:globalThis.JRPGWorldEmeraldState}));status.className='pf-status bad';status.textContent=`Unsupported ROM (${code||'unknown'}). Emerald Live is pinned to Pokémon Emerald BPEE.`;return;}
 status.className='pf-status ok';status.textContent='PokéField Live';
 const boxChanged=scanOnePcBox(M);
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
 const renderKey=JSON.stringify([code,count,wildKey,party.map(x=>x&&[x.personality,x.checksum,x.evs,x.current]),selectedParty,inBattle,battleFlags,pcBoxRevision]);
 if(renderKey===lastRenderKey) return; lastRenderKey=renderKey;
 [wild,...party].filter(Boolean).forEach(trackEvSnapshot);
 primaryEl.innerHTML=wild?`<div class="pf-kicker">LIVE WILD SPECIMEN</div>${card(wild,'WILD')}`:(party[selectedParty]?`<div class="pf-kicker">LIVE OWNED POKÉMON</div>${card(party[selectedParty],party[selectedParty].isEgg?'EGG':'OWNED')}`:'');
 partyEl.innerHTML=party.map((m,i)=>m?`<button data-party="${i}" class="${i===selectedParty?'active':''}"><img src="./assets/pokemon/${m.dexNo}.png" alt=""><small>${titleName(m.meta.name)} ${m.genderSymbol}</small><small>Lv${m.current.level} · ${m.signal}</small></button>`:'').join('') || '<small style="opacity:.5">No party data yet.</small>';
 partySummary.textContent=count?`${count} Pokémon · tap to inspect`:'no party data';
 partyEl.querySelectorAll('button[data-party]').forEach(b=>b.onclick=()=>{selectedParty=Number(b.dataset.party);lastRenderKey='';render(M)});
 selectedEl.innerHTML=wild && party[selectedParty]?card(party[selectedParty],party[selectedParty].isEgg?'EGG':'OWNED'):'';
 if(!wild && drawer && window.matchMedia('(max-width:800px)').matches) drawer.open=false;
 bindEvCoach(primaryEl); bindEvCoach(selectedEl);
 publishProductState(code,wild,party,inBattle,battleFlags);
 if(dbg) dbg.textContent=`BPEE · party 0x${EMERALD.playerParty.toString(16)} · enemy 0x${EMERALD.enemyParty.toString(16)} · battle=${inBattle?'1':'0'} flags=0x${battleFlags.toString(16)} · checksum-gated · boxes=${flattenedPcBoxes().length}/420 storage=0x${lastStoragePtr.toString(16)} · system bridge=${directControlsBound?'ready':'waiting'} · last input=${lastDirectInput} · audio=${lastAudioState} · audio recovery=${lastAudioRecovery}`;
}

// Additive P0 selection bridge: reuse the live renderer and its canonical passport.
if (typeof window !== 'undefined') window.addEventListener('jrpg:emerald-select-party', event => {
  const slot=event.detail?.partySlot, mon=globalThis.JRPGWorldEmeraldState?.party?.[slot];
  if(!Number.isInteger(slot) || slot<0 || slot>5 || !mon) return;
  if(event.detail.specimenId && event.detail.specimenId!==`${mon.personality>>>0}:${mon.otId>>>0}`) return;
  const M=moduleReady(); if(!M) return;
  selectedParty=slot; lastRenderKey=''; render(M);
  globalThis.JRPGWorldEmeraldTrainerCard?.flipToLive();
  const selected=document.getElementById('pf-selected');
  const target=selected?.querySelector('.pf-card') ? selected : document.getElementById('pf-primary');
  if(target===selected) document.getElementById('pf-owned-drawer').open=true;
  target?.querySelectorAll('.pf-detail').forEach(detail=>detail.open=true);
  target?.scrollIntoView({block:'nearest'});
});
async function boot(){
 ensureUI();
 try{dex=await fetch('./data/emerald-live-dex.json').then(r=>r.json());}catch(e){console.error(e);}
 const tick=()=>{
   const M=moduleReady();
   installDirectSystemControls();
   updateAudioRecoveryUI();
   if(M){try{render(M);}catch(e){const s=document.getElementById('pf-status');if(s){s.className='pf-status bad';s.textContent=POKEFIELD_DEBUG_UI?`Live reader: ${e.message}`:'Waiting for your Pokémon…';}}}
   else if(Date.now()-bootStartedAt>3500){
     const s=document.getElementById('pf-status');
     if(s){
       s.className='pf-status bad';
       s.textContent = !POKEFIELD_DEBUG_UI ? 'Load your Emerald game to begin.' : globalThis.crossOriginIsolated
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
globalThis.PokeFieldLive={decryptBox,hiddenPower,nationalDex,genderFromRatio,canonicalFemaleRatio,heldItemName,shinyValue,shinyInfo,decodeRibbonWord,decodeMetData,pokerusInfo,ppUpCounts,metLocationName,originGameName,ballName,languageName,statusLabel,levelFromExperience,storagePointer,scanOnePcBox,flattenedPcBoxes,setCompactMode,toggleCompactMode,GENDER,EMERALD,MGBA_WASM_ABI};
