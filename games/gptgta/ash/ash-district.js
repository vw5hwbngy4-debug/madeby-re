'use strict';
// Ash District v0.13.1 — cache-safe rescue bootfix from v0.13.

(() => {
function showBootError(err){
  try{
    const msg = (err && (err.stack || err.message)) ? (err.stack || err.message) : String(err);
    let box = document.getElementById('bootError');
    if(!box){
      box = document.createElement('div');
      box.id = 'bootError';
      box.style.cssText = 'position:fixed;left:10px;right:10px;top:10px;z-index:99999;background:rgba(20,0,0,.94);border:2px solid #ff6b6b;color:#ffdede;padding:10px;font:12px monospace;white-space:pre-wrap;max-height:42vh;overflow:auto;';
      document.body.appendChild(box);
    }
    box.textContent = 'Ash District boot error:\n' + msg;
  }catch(e){}
}
window.addEventListener('error', e => showBootError(e.error || e.message));
window.addEventListener('unhandledrejection', e => showBootError(e.reason || e));
const $ = (id) => document.getElementById(id);
const canvas = $('game');
const ctx = canvas.getContext('2d', { alpha:false });
ctx.imageSmoothingEnabled = false;

let DPR = 1, SW = 0, SH = 0;
function resize(){
  DPR = Math.min(window.devicePixelRatio || 1, 1.6);
  SW = innerWidth|0; SH = innerHeight|0;
  canvas.width = (SW * DPR)|0; canvas.height = (SH * DPR)|0;
  canvas.style.width = SW + 'px'; canvas.style.height = SH + 'px';
  ctx.setTransform(DPR,0,0,DPR,0,0); ctx.imageSmoothingEnabled = false;
}
addEventListener('resize', resize, {passive:true}); resize();

const ASSET_BASE = window.ASH_ASSET_BASE || 'assets/';
const AUDIO_BASE = window.ASH_AUDIO_BASE || 'audio/';
const IMG = {};
const ASSETS = {
  player:'player.png',
  playerWalk:'player_walk.png',
  zombie:'fallen.png',
  gang:'boss.png',
  roadH:'road_h.png', roadV:'road_v.png', roadX:'road_x.png', cracked:'cracked_road.png', dirty:'dirty_road.png',
  asphalt:'asphalt.png', sidewalk:'sidewalk.png', concrete:'concrete.png', grass:'dark_grass.png', lawn:'gptgta/gtagpt_plain_base_tiles/park_lawn.png', dirt:'gptgta/gtagpt_plain_base_tiles/dry_dirt.png', plainAsphalt:'gptgta/gtagpt_plain_base_tiles/plain_asphalt.png',
  roof:'roof_dirty.png', roof2:'roof_gravel.png', wallH:'wall_h.png', wallV:'wall_v.png',
  storeGun:'shop_armory.png', storePawn:'shop_pawn.png', storeDiner:'shop_diner.png',
  sedan:'car_sedan.png', taxi:'car_taxi.png', police:'car_enforcer.png', van:'car_van.png', bus:'car_bus.png',
  dumpster:'dumpster.png', barrel:'barrel.png', tire:'tires.png', barrier:'barrier.png', cone:'cone.png',
  blood:'blood.png', smoke:'smoke.png', explosion:'explosion.png', sparks:'sparks.png',
  blood2:'gptgta/gta_combat_effects/blood_splatter/blood_splatter_0.png', blood3:'gptgta/micro_detail_overlays/blood_stains.png',
  deadTree:'gptgta/environmental_props/gta_park_nature_props/64x64/dead_tree_dead.png', pineTree:'gptgta/environmental_props/gta_park_nature_props/64x64/pine_tree_large.png', largeTree:'gptgta/environmental_props/gta_park_nature_props/64x64/large_tree_dead.png',
  bushDead:'gptgta/environmental_props/gta_park_nature_props/32x32/bush_dead.png', bushDark:'gptgta/environmental_props/gta_park_nature_props/32x32/forest_bush_dark.png',
  gunShop:'gptgta/buildings/storefronts/gun_shop/gun_shop_open.png', pawnShop:'gptgta/buildings/storefronts/pawn_shop/pawn_shop_open.png', convShop:'gptgta/buildings/storefronts/convenience_store/convenience_store_open.png', dinerShop:'gptgta/buildings/storefronts/diner/diner_open.png',
  atm:'gptgta/environmental_props/gta_street_furniture/atm_machine/atm_machine_clean.png', vending:'gptgta/environmental_props/gta_street_furniture/vending_machine/vending_machine_clean.png', streetlight:'gptgta/environmental_props/gta_street_furniture/streetlight/streetlight_clean.png', bench:'gptgta/environmental_props/gta_street_furniture/metal_bench/metal_bench_clean.png',
  crate:'gptgta/environmental_props/trash_urban_clutter/wooden_crate_clean.png', burnBarrel:'gptgta/environmental_props/slum_ghetto_detail/burning_barrel.png', stripedBarrier:'gptgta/environmental_props/construction_zone/striped_barriers.png'
};
function loadAssets(){
  const tasks = Object.entries(ASSETS).map(([k,p]) => new Promise(res => {
    const im = new Image();
    let done = false;
    const finish = ok => { if(done) return; done = true; IMG[k] = ok ? im : null; res(ok); };
    im.onload = () => finish(true);
    im.onerror = () => finish(false);
    // Safari/mobile can occasionally leave a missing image pending; never let boot hang.
    setTimeout(() => finish(false), 2200);
    im.src = ASSET_BASE + p;
  }));
  return Promise.all(tasks);
}


// Browser audio must be unlocked by a real user gesture on Safari/iOS.
// The game is direct-start, so music is queued and begins on the first tap/key.
const AUDIO_PATHS = {
  bg:'bgmusic.mp3',
  pistol:'pistol.mp3',
  uzi:'uzi.mp3',
  shotgun:'pistol.mp3',
  melee:'melee_attack.mp3',
  blade:'knive.mp3',
  explosion:'big_explosion.mp3',
  zombieGrowl:'zombie_growl.mp3',
  zombieKilled:'zombie_killed_sound.mp3',
  leaderKilled:'zombie_leader_killed_sound.mp3'
};
const AudioSys = {
  enabled:true,
  unlocked:false,
  music:null,
  pool:{},
  last:{},
  init(){
    for(const [k,file] of Object.entries(AUDIO_PATHS)){
      const a = new Audio(AUDIO_BASE + file);
      a.preload = k==='bg' ? 'auto' : 'metadata';
      if(k==='bg'){
        a.loop = true; a.volume = .26; this.music = a;
      }else{
        a.volume = .55; this.pool[k] = a;
      }
    }
    this.updateButton();
  },
  updateButton(){
    const b = $('audioBtn');
    if(!b) return;
    b.textContent = this.enabled ? (this.unlocked ? 'MUSIC ON' : 'TAP FOR SOUND') : 'MUTED';
    b.classList.toggle('muted', !this.enabled);
  },
  async unlock(){
    if(this.unlocked || !this.enabled) return;
    this.unlocked = true;
    try{
      if(this.music){
        this.music.currentTime = this.music.currentTime || 0;
        await this.music.play();
      }
    }catch(err){
      this.unlocked = false;
    }
    this.updateButton();
  },
  toggle(){
    this.enabled = !this.enabled;
    if(!this.enabled){
      if(this.music) this.music.pause();
    }else{
      this.unlock();
    }
    this.updateButton();
  },
  sfx(name, volume=.58, rate=1, throttle=.035){
    if(!this.enabled || !this.unlocked) return;
    const t = now();
    if(this.last[name] && t-this.last[name] < throttle) return;
    this.last[name] = t;
    const src = this.pool[name]; if(!src) return;
    try{
      const a = src.cloneNode(true);
      a.volume = clamp(volume,0,1);
      a.playbackRate = clamp(rate, .72, 1.42);
      a.play().catch(()=>{});
    }catch(err){}
  },
  musicDuck(amount=.16, ms=360){
    if(!this.music || !this.enabled || !this.unlocked) return;
    const target = clamp(amount, .06, .4), base=.26;
    this.music.volume = target;
    clearTimeout(this.duckTimer);
    this.duckTimer = setTimeout(()=>{ if(this.music) this.music.volume = base; }, ms);
  }
};
function sfx(name, volume, rate, throttle){ AudioSys.sfx(name, volume, rate, throttle); }
function unlockAudioSoon(){ AudioSys.unlock(); }
function weaponSfxName(def, item){
  const base = item?.base || '';
  if(def.type==='melee') return ['machete','katana','fireaxe'].includes(base) ? 'blade' : 'melee';
  if(base==='uzi') return 'uzi';
  if(base==='shotgun') return 'shotgun';
  if(def.type==='throw') return 'melee';
  return 'pistol';
}

function clamp(v,a,b){ return v<a?a:v>b?b:v; }
function rand(a,b){ return a + Math.random()*(b-a); }
function irand(a,b){ return Math.floor(rand(a,b+1)); }
function choose(a){ return a[(Math.random()*a.length)|0]; }
function dist(ax,ay,bx,by){ return Math.hypot(ax-bx, ay-by); }
function angleTo(ax,ay,bx,by){ return Math.atan2(by-ay, bx-ax); }
function overlap(a,b){ return a.x < b.x+b.w && a.x+a.w > b.x && a.y < b.y+b.h && a.y+a.h > b.y; }
function rectFromCircle(x,y,r){ return {x:x-r,y:y-r,w:r*2,h:r*2}; }
function now(){ return performance.now()/1000; }

const WORLD = { w: 3000, h: 2600 };
const TILE = 32;
const roadW = 100;
const roadsX = [250, 720, 1160, 1640, 2140, 2600];
const roadsY = [220, 600, 980, 1390, 1760, 2180];
const camera = {x:0,y:0};
function viewScale(){ return SW < 760 ? 0.60 : 0.68; }
function viewWorldW(){ return SW / viewScale(); }
function viewWorldH(){ return SH / viewScale(); }
let gameStarted = false;
let paused = false;
let last = 0;
let frame = 0;
let mouse = {x:0,y:0,worldX:0,worldY:0,down:false};
let aim = { angle: 0, pointerActive: false, pointerT: 0 };
let fireHeld = false;
let centerTimer = 0;

const input = {x:0,y:0,joyX:0,joyY:0};
const keys = new Set();

const RARITIES = [
  {key:'common', label:'Common', color:'#f4f4f4', weight:58, mult:1.00},
  {key:'uncommon', label:'Uncommon', color:'#72ff92', weight:25, mult:1.16},
  {key:'rare', label:'Rare', color:'#74baff', weight:12, mult:1.36},
  {key:'epic', label:'Epic', color:'#d98cff', weight:4, mult:1.68},
  {key:'legendary', label:'Legendary', color:'#ffae42', weight:1, mult:2.12}
];
const rarityByKey = Object.fromEntries(RARITIES.map(r=>[r.key,r]));
function rollRarity(){
  const total = RARITIES.reduce((s,r)=>s+r.weight,0); let n = rand(0,total);
  for(const r of RARITIES){ if((n-=r.weight) <= 0) return r; }
  return RARITIES[0];
}

const WEAPONS = {
  fists:{slot:'weapon', type:'melee', name:'Fists', damage:7, fireRate:2.2, range:38, ammoType:null, spread:0, pellets:1, speed:0, knockback:18, desc:'Bare hands. Emergency only.'},
  bat:{slot:'weapon', type:'melee', name:'Baseball Bat', damage:16, fireRate:1.75, range:58, ammoType:null, spread:0, pellets:1, speed:0, knockback:70, desc:'No ammo. Short range, reliable knockback.'},
  crowbar:{slot:'weapon', type:'melee', name:'Crowbar', damage:20, fireRate:1.55, range:56, ammoType:null, spread:0, pellets:1, speed:0, knockback:82, desc:'Heavy street tool. Opens skulls, not doors yet.'},
  machete:{slot:'weapon', type:'melee', name:'Machete', damage:25, fireRate:1.82, range:62, ammoType:null, spread:0, pellets:1, speed:0, knockback:42, desc:'Fast blade with reliable close-range damage.'},
  katana:{slot:'weapon', type:'melee', name:'Katana', damage:32, fireRate:1.65, range:74, ammoType:null, spread:0, pellets:1, speed:0, knockback:38, desc:'Long melee reach. High damage, no ammo.'},
  fireaxe:{slot:'weapon', type:'melee', name:'Fire Axe', damage:42, fireRate:1.05, range:66, ammoType:null, spread:0, pellets:1, speed:0, knockback:110, desc:'Slow brutal two-handed chop.'},
  pistol:{slot:'weapon', type:'ranged', name:'Pistol', damage:15, fireRate:2.8, range:620, ammoType:'bullets', spread:0.035, pellets:1, speed:720, knockback:35, desc:'Basic ranged weapon.'},
  uzi:{slot:'weapon', type:'ranged', name:'Uzi', damage:8, fireRate:8.5, range:500, ammoType:'bullets', spread:0.11, pellets:1, speed:760, knockback:18, desc:'Fast fire, low damage.'},
  shotgun:{slot:'weapon', type:'ranged', name:'Shotgun', damage:10, fireRate:1.15, range:380, ammoType:'shells', spread:0.26, pellets:6, speed:700, knockback:48, desc:'Spread burst. Brutal close range.'},
  molotov:{slot:'throwable', type:'throw', name:'Molotov', damage:7, fireRate:0.8, range:420, ammoType:'throwables', spread:0, pellets:1, speed:420, knockback:0, desc:'Throws a small burning area.'}
};

const player = {
  x:1490,y:970,r:13,angle:0,
  level:1,xp:0,xpToNext:80,hp:110,maxHp:110,baseMaxHp:110,
  armor:0,moveSpeed:172,baseMoveSpeed:172,critChance:.05,fireRateBonus:0,damageBonus:0,pickupRadius:46,
  stamina:100,maxStamina:100,baseMaxStamina:100,sprinting:false,skillPoints:0,skills:{firepath:0},firepathActive:false,firepathTimer:0,firepathDropT:0,
  money:0,ammo:{bullets:90,shells:18,throwables:4},
  equipped:{weapon:null,offhand:null,helm:null,vest:null,gloves:null,boots:null,ring1:null,ring2:null,necklace:null,throwable:null},
  inventory:[],cooldown:0,hitCooldown:0,dead:false,regenTimer:0
};

function starterItem(){
  return {id:cryptoId(), kind:'weapon', slot:'weapon', base:'pistol', name:'Street Pistol', rarity:'common', level:1, prefix:'Street', suffix:'', affixes:['Starting sidearm'], mods:{damage:0}, desc:'Starting sidearm.'};
}
function starterArmor(){
  return {id:cryptoId(), kind:'armor', slot:'vest', name:'Bloodstained Jacket', rarity:'common', level:1, prefix:'Bloodstained', suffix:'', affixes:['+armor', '+maximum life'], mods:{armor:2,maxHp:12}, desc:'Thin street armor. Better than a T-shirt.'};
}
function cryptoId(){ return Math.random().toString(36).slice(2) + Date.now().toString(36); }
function resetPlayer(){
  player.x=safeZone.x+safeZone.w/2; player.y=safeZone.y+safeZone.h/2; player.level=1; player.xp=0; player.xpToNext=80; player.baseMaxHp=110; player.maxHp=110; player.hp=110;
  player.armor=0; player.baseMoveSpeed=172; player.moveSpeed=172; player.critChance=.05; player.fireRateBonus=0; player.damageBonus=0; player.pickupRadius=46;
  player.stamina=100; player.baseMaxStamina=100; player.maxStamina=100; player.sprinting=false; player.skillPoints=0; player.skills={firepath:0}; player.firepathActive=false; player.firepathTimer=0; player.firepathDropT=0;
  player.money=0; player.ammo={bullets:90,shells:18,throwables:4}; player.inventory=[]; player.cooldown=0; player.hitCooldown=0; player.dead=false;
  player.equipped.weapon = starterItem();
  player.equipped.offhand = null;
  player.equipped.helm = null;
  player.equipped.vest = starterArmor();
  player.equipped.gloves = null;
  player.equipped.boots = null;
  player.equipped.ring1 = null;
  player.equipped.ring2 = null;
  player.equipped.necklace = null;
  player.equipped.throwable = {id:cryptoId(),kind:'throwable',slot:'throwable',base:'molotov',name:'Gas Station Molotov',rarity:'common',level:1,prefix:'Gas Station',suffix:'',affixes:['burning area'],mods:{damage:0},desc:'Throwable fire bottle.'};
  recalcStats();
}

let buildings=[], decor=[], cars=[], safeZone={x:1110,y:1180,w:760,h:520};
const citySafeZone={x:2310,y:1830,w:420,h:300};
let stash = [];
let campObjects=[], forestObjects=[], travelObjects=[], terrainPatches=[];
let vehicle=null;
let contextAction=null;
let zombies=[], projectiles=[], enemyProjectiles=[], loot=[], effects=[];
let dangerLevel=1, spawnTimer=0, kills=0, packSerial=0;
let shopStock={Healer:[],Armorer:[],Supplier:[]};
let activeVendor=null;
let selectedItemRef={origin:'bag',id:null};
let selectedVendorIndex=0;
const BAG_SLOTS=35, STASH_SLOTS=35;

function makeMap(){
  buildings=[]; decor=[]; cars=[]; campObjects=[]; forestObjects=[]; travelObjects=[]; terrainPatches=[];
  const cells = [];
  for(let yi=0; yi<roadsY.length-1; yi++){
    for(let xi=0; xi<roadsX.length-1; xi++){
      const x1=roadsX[xi]+roadW/2+28, x2=roadsX[xi+1]-roadW/2-28;
      const y1=roadsY[yi]+roadW/2+28, y2=roadsY[yi+1]-roadW/2-28;
      if(x2-x1>120 && y2-y1>120) cells.push({x:x1,y:y1,w:x2-x1,h:y2-y1});
    }
  }
  for(const c of cells){
    if(overlap(c,safeZone)) continue;
    const cols = Math.max(1, Math.floor(c.w/180));
    const rows = Math.max(1, Math.floor(c.h/150));
    for(let r=0;r<rows;r++) for(let col=0;col<cols;col++){
      if(Math.random()<.2) continue;
      const pad=18;
      const bw = clamp(c.w/cols - pad*2, 86, 170);
      const bh = clamp(c.h/rows - pad*2, 70, 140);
      const bx = c.x + col*(c.w/cols) + pad + rand(-8,8);
      const by = c.y + r*(c.h/rows) + pad + rand(-8,8);
      const cx=bx+bw/2, cy=by+bh/2;
      const cityArea = cx>1900 && cy>1080;
      const towerArea = nearStoryPath(cx,cy,250);
      const campForest = nearAnySafeZone(cx,cy,650) || nearStoryPath(cx,cy,140);
      if(!cityArea && !towerArea && (campForest || Math.random()<.82)) continue;
      const b={x:bx,y:by,w:bw,h:bh,roof:Math.random()<.5?'roof':'roof2',store:Math.random()<.22?choose(['gunShop','pawnShop','dinerShop','convShop','storeGun','storePawn','storeDiner']):null};
      if(!overlap(b,safeZone) && !nearStoryPath(cx,cy,72)) buildings.push(b);
    }
  }
  // Infected plaza, open enough for fighting.
  for(let i=0;i<140;i++){
    const kind=choose(['dumpster','barrel','tire','barrier','cone']);
    let o={x:rand(80,WORLD.w-120),y:rand(80,WORLD.h-120),w:kind==='barrier'?44:32,h:kind==='barrier'?22:32,kind,rot:rand(0,Math.PI*2)};
    if(isBlocked(o.x+o.w/2,o.y+o.h/2,Math.max(o.w,o.h)/2+8) || overlap(o,safeZone) || nearStoryPath(o.x+o.w/2,o.y+o.h/2,78)) continue;
    decor.push(o);
  }
  for(let i=0;i<20;i++){ /* static abandoned vehicles only; no driving context */
    let type=choose(['sedan','taxi','police','van','bus']);
    let x=choose(roadsX)+rand(-roadW/2+20,roadW/2-20), y=rand(80,WORLD.h-90);
    if(Math.random()<.5){ x=rand(80,WORLD.w-90); y=choose(roadsY)+rand(-roadW/2+20,roadW/2-20); }
    const car={x,y,w:type==='bus'?44:34,h:type==='bus'?70:52,type,rot:Math.random()<.5?0:Math.PI/2};
    if(!overlap(car,safeZone) && !nearStoryPath(car.x,car.y,82)) cars.push(car);
  }
  createFirstTown();
  createSecondTown();
  createForestEdges();
  createTerrainPatches();
}

function createFirstTown(){
  const z=safeZone, cx=z.x+z.w/2, cy=z.y+z.h/2;
  // Camp structures. These are visual/service objects; the whole camp remains walkable and safe.
  campObjects.push({kind:'campfire',x:cx-22,y:cy-22,w:44,h:44,label:'Campfire'});
  campObjects.push({kind:'stash',x:z.x+70,y:z.y+z.h-128,w:76,h:58,label:'Stash Chest'});
  campObjects.push({kind:'vendor',role:'Healer',x:z.x+190,y:z.y+z.h-136,w:42,h:42,label:'Healer'});
  campObjects.push({kind:'vendor',role:'Armorer',x:cx-24,y:z.y+72,w:42,h:42,label:'Armorer'});
  campObjects.push({kind:'vendor',role:'Supplier',x:z.x+z.w-230,y:z.y+z.h-136,w:42,h:42,label:'Supplier'});
  campObjects.push({kind:'prop',sprite:'vending',x:z.x+z.w-178,y:z.y+z.h-126,w:30,h:38,label:''});
  campObjects.push({kind:'prop',sprite:'bench',x:z.x+262,y:z.y+z.h-96,w:46,h:28,label:''});
  campObjects.push({kind:'prop',sprite:'streetlight',x:z.x+z.w-92,y:z.y+88,w:26,h:44,label:''});
  campObjects.push({kind:'prop',sprite:'crate',x:z.x+100,y:z.y+z.h-86,w:34,h:34,label:''});
  campObjects.push({kind:'tent',x:z.x+92,y:z.y+74,w:122,h:72,label:'Tent'});
  campObjects.push({kind:'tent',x:z.x+z.w-230,y:z.y+84,w:132,h:78,label:'Tent'});
  campObjects.push({kind:'tent',x:cx-88,y:z.y+z.h-116,w:112,h:64,label:'Depot'});
  campObjects.push({kind:'gate',x:cx-78,y:z.y-8,w:156,h:34,label:'North Gate'});
  campObjects.push({kind:'gate',x:cx-78,y:z.y+z.h-26,w:156,h:34,label:'South Gate'});
  // Barricade props around the camp perimeter with gate gaps.
  const gapL=cx-90, gapR=cx+90;
  for(let x=z.x+20;x<z.x+z.w-20;x+=54){
    if(x>gapL && x<gapR) continue;
    campObjects.push({kind:'barricade',x,y:z.y-12,w:48,h:20,rot:0});
    campObjects.push({kind:'barricade',x,y:z.y+z.h-8,w:48,h:20,rot:0});
  }
  for(let y=z.y+28;y<z.y+z.h-28;y+=54){
    campObjects.push({kind:'barricade',x:z.x-10,y,w:20,h:48,rot:Math.PI/2});
    campObjects.push({kind:'barricade',x:z.x+z.w-10,y,w:20,h:48,rot:Math.PI/2});
  }
}


function createSecondTown(){
  const z=citySafeZone, cx=z.x+z.w/2, cy=z.y+z.h/2;
  campObjects.push({kind:'campfire',x:cx-18,y:cy-16,w:36,h:36,label:'Oil Fire',zone:'city'});
  campObjects.push({kind:'stash',x:z.x+32,y:z.y+z.h-92,w:64,h:48,label:'City Stash',zone:'city'});
  campObjects.push({kind:'vendor',role:'Lookout',x:z.x+z.w-92,y:z.y+z.h-94,w:42,h:42,label:'Lookout',zone:'city'});
  campObjects.push({kind:'vendor',role:'Scout',x:cx-22,y:z.y+54,w:42,h:42,label:'Scout',zone:'city'});
  for(let x=z.x+18;x<z.x+z.w-18;x+=52){ campObjects.push({kind:'barricade',x,y:z.y-10,w:46,h:18,rot:0,zone:'city'}); campObjects.push({kind:'barricade',x,y:z.y+z.h-8,w:46,h:18,rot:0,zone:'city'}); }
  for(let y=z.y+24;y<z.y+z.h-24;y+=52){ campObjects.push({kind:'barricade',x:z.x-10,y,w:18,h:46,rot:Math.PI/2,zone:'city'}); campObjects.push({kind:'barricade',x:z.x+z.w-8,y,w:18,h:46,rot:Math.PI/2,zone:'city'}); }
  const tower=towerPortalRect();
  travelObjects.push({kind:'portal',label:'Skyspine Tower',x:tower.x,y:tower.y,w:tower.w,h:tower.h,to:'city'});
  travelObjects.push({kind:'portal',label:'Tower Corridor',x:citySafeZone.x-235,y:citySafeZone.y+citySafeZone.h/2-64,w:170,h:124,to:'camp'});
}

function createForestEdges(){
  // Sparse grove around the first town, so the safe camp feels like Act I before the dead city.
  const z=safeZone;
  for(let i=0;i<90;i++){
    let side=irand(0,3), x, y;
    if(side===0){ x=rand(z.x-260,z.x+z.w+260); y=rand(z.y-330,z.y-90); }
    else if(side===1){ x=rand(z.x-260,z.x+z.w+260); y=rand(z.y+z.h+90,z.y+z.h+330); }
    else if(side===2){ x=rand(z.x-330,z.x-90); y=rand(z.y-170,z.y+z.h+170); }
    else { x=rand(z.x+z.w+90,z.x+z.w+330); y=rand(z.y-170,z.y+z.h+170); }
    if(x<60||y<60||x>WORLD.w-60||y>WORLD.h-60) continue;
    if(isRoad(x,y) || circleTouchesRect(x,y,28,z)) continue;
    const kind=Math.random()<.72?'tree':'bush';
    const sprite = kind==='tree' ? choose(['pineTree','deadTree','largeTree']) : choose(['bushDark','bushDead']);
    forestObjects.push({x,y,r:rand(15,30),kind,sprite});
  }
}

function createTerrainPatches(){
  terrainPatches=[];
  for(let i=0;i<42;i++){
    const x=rand(80,WORLD.w-80), y=rand(60,WORLD.h-80);
    if(circleTouchesRect(x,y,70,safeZone) || circleTouchesRect(x,y,70,citySafeZone)) continue;
    terrainPatches.push({x,y,rx:rand(90,260),ry:rand(50,180),rot:rand(0,Math.PI),color:choose(['rgba(22,50,28,.38)','rgba(16,38,23,.42)','rgba(48,42,25,.22)','rgba(8,24,16,.32)'])});
  }
}
function isRoad(x,y){
  if(nearStoryPath(x,y,60)) return true;
  const city = x>1900 && y>1080;
  if(city){
    for(const rx of roadsX) if(Math.abs(x-rx)<roadW/2) return true;
    for(const ry of roadsY) if(Math.abs(y-ry)<roadW/2) return true;
  }
  return false;
}
function isBlocked(x,y,r=10,ignoreCars=false){
  if(x<20||y<20||x>WORLD.w-20||y>WORLD.h-20) return true;
  const box = {x:x-r,y:y-r,w:r*2,h:r*2};
  for(const b of buildings) if(overlap(box,b)) return true;
  if(!ignoreCars) for(const c of cars) if(overlap(box,c)) return true;
  return false;
}
function pointInRect(x,y,r){ return x >= r.x && x <= r.x+r.w && y >= r.y && y <= r.y+r.h; }
function circleTouchesRect(x,y,rad,r){ return x+rad>r.x && x-rad<r.x+r.w && y+rad>r.y && y-rad<r.y+r.h; }
function safeZones(){ return [safeZone, citySafeZone]; }
function inSafeZone(x=player.x,y=player.y,rad=player.r){ return safeZones().some(z=>circleTouchesRect(x,y,rad,z)); }
function currentSafeName(x=player.x,y=player.y,rad=player.r){ if(circleTouchesRect(x,y,rad,safeZone)) return 'EMBER CAMP'; if(circleTouchesRect(x,y,rad,citySafeZone)) return 'CITY OUTPOST'; return 'wilds'; }
function nearestSafeRect(x,y){ let best=safeZone,bd=Infinity; for(const z of safeZones()){ const cx=clamp(x,z.x,z.x+z.w), cy=clamp(y,z.y,z.y+z.h); const d=dist(x,y,cx,cy); if(d<bd){bd=d; best=z;} } return best; }
function nearAnySafeZone(x,y,margin=360){ return safeZones().some(z=> x>z.x-margin && x<z.x+z.w+margin && y>z.y-margin && y<z.y+z.h+margin); }
function nearestSafeEdge(x,y){
  const z=nearestSafeRect(x,y);
  const left=Math.abs(x-z.x), right=Math.abs(x-(z.x+z.w)), top=Math.abs(y-z.y), bottom=Math.abs(y-(z.y+z.h));
  const m=Math.min(left,right,top,bottom);
  if(m===left) return {x:z.x-12,y:clamp(y,z.y,z.y+z.h)};
  if(m===right) return {x:z.x+z.w+12,y:clamp(y,z.y,z.y+z.h)};
  if(m===top) return {x:clamp(x,z.x,z.x+z.w),y:z.y-12};
  return {x:clamp(x,z.x,z.x+z.w),y:z.y+z.h+12};
}
function tryMoveZombie(z,dx,dy){
  const nx=clamp(z.x+dx,z.r,WORLD.w-z.r), ny=clamp(z.y+dy,z.r,WORLD.h-z.r);
  if(inSafeZone(nx,ny,z.r+2)){
    // Town borders repel monsters; they drift away instead of queueing at the fence.
    const edge=nearestSafeEdge(z.x,z.y);
    const a=angleTo(edge.x,edge.y,z.x,z.y);
    z.x=clamp(z.x+Math.cos(a)*Math.max(1,Math.abs(dx||1))*2.0,z.r,WORLD.w-z.r);
    z.y=clamp(z.y+Math.sin(a)*Math.max(1,Math.abs(dy||1))*2.0,z.r,WORLD.h-z.r);
    z.roamTarget=null; z.roamT=0;
    return;
  }
  z.x=nx; z.y=ny;
}
function moveCircle(ent,dx,dy,r){
  const nx = ent.x + dx;
  if(!isBlocked(nx,ent.y,r)) ent.x=nx;
  const ny = ent.y + dy;
  if(!isBlocked(ent.x,ny,r)) ent.y=ny;
  ent.x=clamp(ent.x,r,WORLD.w-r); ent.y=clamp(ent.y,r,WORLD.h-r);
}
function moveFree(ent,dx,dy,r){
  ent.x = clamp(ent.x + dx, r, WORLD.w-r);
  ent.y = clamp(ent.y + dy, r, WORLD.h-r);
}

function storyPathPoints(){
  const z=safeZone, cx=z.x+z.w/2;
  // Longer Act-I style journey: Ember Camp -> forest road -> Skyspine Tower.
  return [
    {x:cx, y:z.y-18},
    {x:cx-28, y:z.y-185},
    {x:cx+64, y:z.y-360},
    {x:cx-72, y:z.y-550},
    {x:cx+46, y:z.y-740},
    {x:cx-18, y:z.y-920},
    {x:cx+10, y:z.y-1060}
  ];
}
function towerPortalRect(){
  const pts=storyPathPoints(); const end=pts[pts.length-1];
  return {x:end.x-92,y:end.y-82,w:184,h:168};
}
function distPointSegment(px,py,ax,ay,bx,by){
  const vx=bx-ax, vy=by-ay, wx=px-ax, wy=py-ay;
  const c=clamp((wx*vx+wy*vy)/Math.max(.001,vx*vx+vy*vy),0,1);
  const x=ax+vx*c, y=ay+vy*c;
  return dist(px,py,x,y);
}
function nearStoryPath(x,y,margin=92){
  const pts=storyPathPoints();
  for(let i=0;i<pts.length-1;i++) if(distPointSegment(x,y,pts[i].x,pts[i].y,pts[i+1].x,pts[i+1].y)<margin) return true;
  const t=towerPortalRect();
  return x>t.x-margin && x<t.x+t.w+margin && y>t.y-margin && y<t.y+t.h+margin;
}
function randomStoryPathPoint(spread=170){
  const pts=storyPathPoints(); const i=irand(0,pts.length-2); const a=pts[i], b=pts[i+1]; const t=Math.random();
  return {x:lerp(a.x,b.x,t)+rand(-spread,spread), y:lerp(a.y,b.y,t)+rand(-spread,spread)};
}
function lerp(a,b,t){ return a+(b-a)*t; }

function recalcStats(){
  let maxHp = player.baseMaxHp, armor=0, move=player.baseMoveSpeed, crit=.05, dmg=0, fire=0, pickup=46;
  const items = Object.values(player.equipped).filter(Boolean);
  for(const it of items){
    const m=it.mods||{}; maxHp += m.maxHp||0; armor += m.armor||0; move += m.moveSpeed||0; crit += m.critChance||0; dmg += m.damage||0; fire += m.fireRate||0; pickup += m.pickupRadius||0;
  }
  const sk = player.skills || {firepath:0};
  // v0.11 keeps character math simple: Firepath is an active skill, not a passive stat blob.
  // Old skill keys may exist in older saves but are ignored safely.
  player.maxStamina = Math.round(player.baseMaxStamina||100);
  player.maxHp = Math.max(1, Math.round(maxHp)); player.armor = Math.round(armor); player.moveSpeed = move; player.critChance = clamp(crit,0,.65); player.damageBonus = dmg; player.fireRateBonus=fire; player.pickupRadius=pickup;
  if(player.hp > player.maxHp) player.hp = player.maxHp;
  if(player.stamina > player.maxStamina) player.stamina = player.maxStamina;
}
function equippedWeapon(){ return player.equipped.weapon || starterItem(); }
function weaponDef(item){ return WEAPONS[item.base || 'pistol'] || WEAPONS.pistol; }


const PREFIX_AFFIXES = [
  {name:'Savage', mods:{damage:4}, text:'+damage'},
  {name:'Quick', mods:{fireRate:.10}, text:'+fire rate'},
  {name:'Vicious', mods:{critChance:.035}, text:'+critical chance'},
  {name:'Guarded', mods:{armor:3}, text:'+armor'},
  {name:'Vital', mods:{maxHp:18}, text:'+maximum life'},
  {name:'Fleet', mods:{moveSpeed:12}, text:'+movement speed'},
  {name:'Magnetic', mods:{pickupRadius:24}, text:'+pickup radius'}
];
const SUFFIX_AFFIXES = [
  {name:'of Cinders', mods:{burnChance:.08}, text:'chance to burn'},
  {name:'of Knockback', mods:{knockback:18}, text:'chance to knockback'},
  {name:'of Bleeding', mods:{bleedChance:.08}, text:'chance to bleed'},
  {name:'of the Fox', mods:{moveSpeed:10}, text:'+movement speed'},
  {name:'of the Ox', mods:{maxHp:22}, text:'+maximum life'},
  {name:'of Reach', mods:{pickupRadius:18}, text:'+pickup radius'},
  {name:'of Focus', mods:{critChance:.025, fireRate:.04}, text:'+crit and fire rate'}
];
function mergeMods(base, extra, mult=1){
  for(const [k,v] of Object.entries(extra||{})){
    if(typeof v === 'number') base[k] = +( (base[k]||0) + v*mult ).toFixed(3);
  }
}
function rollItemAffixes(kind, rarity, level){
  const tier = {common:0, uncommon:1, rare:2, epic:3, legendary:4}[rarity.key] || 0;
  const affixes=[]; const mods={}; let prefix='', suffix='';
  const prefixChance = [.18,.65,.85,.95,1][tier];
  const suffixChance = [.08,.35,.65,.86,1][tier];
  if(Math.random()<prefixChance){ const a=choose(PREFIX_AFFIXES); prefix=a.name; mergeMods(mods,a.mods,rarity.mult*(1+level*.035)); affixes.push(a.text); }
  if(Math.random()<suffixChance){ const a=choose(SUFFIX_AFFIXES); suffix=a.name; mergeMods(mods,a.mods,rarity.mult*(1+level*.03)); affixes.push(a.text); }
  if(tier>=3 && Math.random()<.72){ const a=choose(PREFIX_AFFIXES); mergeMods(mods,a.mods,rarity.mult*.75); affixes.push(a.text); }
  return {prefix,suffix,affixes,mods};
}
function makeItem(kind, level=1){
  const rarity = rollRarity(); const mult = rarity.mult;
  const aff = rollItemAffixes(kind, rarity, level);
  if(kind==='weapon'){
    const base = choose(['bat','crowbar','machete','katana','fireaxe','pistol','uzi','shotgun']); const def = WEAPONS[base];
    const baseLabel = ({bat:'Bat',crowbar:'Crowbar',machete:'Machete',katana:'Katana',fireaxe:'Fire Axe',uzi:'Uzi',shotgun:'Shotgun',pistol:'Pistol'})[base] || 'Weapon';
    const material = choose(['Rusty','Police','Mall','Riot','Neon','Street','Graveyard','Station','Butcher','Camp']);
    const mods={damage:Math.round((level*1.2 + rand(0,5))*mult), fireRate:Math.random()<.35?+(rand(.04,.16)*mult).toFixed(2):0, critChance:Math.random()<.28?+(rand(.01,.05)*mult).toFixed(2):0};
    mergeMods(mods, aff.mods, 1);
    const name = `${aff.prefix ? aff.prefix+' ' : ''}${material} ${baseLabel}${aff.suffix ? ' '+aff.suffix : ''}`;
    return {id:cryptoId(),kind:'weapon',slot:'weapon',base,name,rarity:rarity.key,level,prefix:aff.prefix,suffix:aff.suffix,affixes:aff.affixes,mods,desc:def.desc};
  }
  if(kind==='armor'){
    const slot = choose(['helm','vest','gloves','boots','offhand']);
    const names = {
      helm:['Bike Helmet','Riot Helmet','Hooded Mask','Welding Mask','Camp Cowl'],
      vest:['Riot Vest','Bloodstained Jacket','Firefighter Coat','Barricade Hoodie','Metro Guard Vest','Apartment Block Coat'],
      offhand:['Trashcan Lid','Riot Shield','Barricade Board','Steel Buckler','Street Sign Shield'],
      gloves:['Runner Gloves','Mechanic Gloves','Grip Wraps','Brawler Gloves','Scavenger Mitts'],
      boots:['Lucky Sneakers','Road Boots','Safehouse Boots','Runner Shoes','Steel-Toe Boots']
    };
    const baseName=choose(names[slot]);
    const mods={armor:Math.round((slot==='vest'?2.5:slot==='offhand'?2.2:slot==='helm'?1.7:1.2)+level*.75+rand(0,4)*mult), maxHp:Math.round((slot==='vest'?8:slot==='offhand'?5:3)+level*1.6+rand(0,9)*mult)};
    if(slot==='boots' || Math.random()<.24) mods.moveSpeed = Math.round(rand(4,15)*mult);
    if(slot==='gloves' && Math.random()<.55) mods.fireRate = +(rand(.04,.12)*mult).toFixed(2);
    mergeMods(mods, aff.mods, 1);
    const name = `${aff.prefix ? aff.prefix+' ' : ''}${baseName}${aff.suffix ? ' '+aff.suffix : ''}`;
    return {id:cryptoId(),kind:'armor',slot,name,rarity:rarity.key,level,prefix:aff.prefix,suffix:aff.suffix,affixes:aff.affixes,mods,desc:`Equippable ${slot} armor against bites.`};
  }
  const slot = choose(['ring','ring','necklace']);
  const baseName=slot==='ring'?choose(['Safehouse Ring','Broken Signet','Neon Ring','Street Ring','Rust Ring']):choose(['Zombie Tooth Necklace','Street Charm','Broken Badge','Neon Keychain','Ash Pendant']);
  const mods={};
  if(Math.random()<.55) mods.moveSpeed=Math.round(rand(5,18)*mult);
  if(Math.random()<.62) mods.critChance=+(rand(.015,.06)*mult).toFixed(2);
  if(Math.random()<.48) mods.pickupRadius=Math.round(rand(10,36)*mult);
  if(Math.random()<.38) mods.damage=Math.round(rand(2,7)*mult);
  if(Object.keys(mods).length===0) mods.maxHp=Math.round(rand(8,24)*mult);
  mergeMods(mods, aff.mods, 1);
  const name = `${aff.prefix ? aff.prefix+' ' : ''}${baseName}${aff.suffix ? ' '+aff.suffix : ''}`;
  return {id:cryptoId(),kind:'accessory',slot,name,rarity:rarity.key,level,prefix:aff.prefix,suffix:aff.suffix,affixes:aff.affixes,mods,desc:`Equippable ${slot} with survival stats.`};
}
function makeConsumable(type, amount=1){ return {id:cryptoId(),kind:'consumable',type,name:type==='medkit'?'Medkit':type==='bullets'?'Bullet Box':type==='shells'?'Shell Pack':'Money',rarity:'common',amount,desc:'Pickup'}; }
function itemPowerText(it){
  const m=it.mods||{}; const parts=[];
  if(m.damage) parts.push(`+${Math.round(m.damage)} dmg`); if(m.fireRate) parts.push(`+${Math.round(m.fireRate*100)}% fire`); if(m.maxHp) parts.push(`+${Math.round(m.maxHp)} HP`); if(m.armor) parts.push(`+${Math.round(m.armor)} armor`); if(m.moveSpeed) parts.push(`+${Math.round(m.moveSpeed)} speed`); if(m.critChance) parts.push(`+${Math.round(m.critChance*100)}% crit`); if(m.pickupRadius) parts.push(`+${Math.round(m.pickupRadius)} pickup`); if(m.burnChance) parts.push(`${Math.round(m.burnChance*100)}% burn`); if(m.knockback) parts.push(`+${Math.round(m.knockback)} knockback`); if(m.bleedChance) parts.push(`${Math.round(m.bleedChance*100)}% bleed`);
  return parts.join(' · ') || 'utility';
}


function itemScore(it){
  if(!it) return 0;
  const m=it.mods||{};
  if(it.kind==='weapon'){
    const def=weaponDef(it); const dmg=(def.damage+(m.damage||0)); const rate=def.fireRate*(1+(m.fireRate||0));
    return Math.round(dmg*rate*(def.pellets||1) + (m.critChance||0)*180 + (m.knockback||0)*.25 + (m.burnChance||0)*90 + (m.bleedChance||0)*90);
  }
  if(it.kind==='armor') return Math.round((m.armor||0)*9 + (m.maxHp||0) + (m.moveSpeed||0)*.8 + (m.pickupRadius||0)*.35);
  if(it.kind==='accessory') return Math.round((m.damage||0)*8 + (m.moveSpeed||0)*1.2 + (m.critChance||0)*220 + (m.pickupRadius||0)*.55 + (m.maxHp||0)*.7 + (m.armor||0)*8);
  if(it.kind==='throwable') return Math.round((weaponDef(it).damage+(m.damage||0))*weaponDef(it).fireRate*6);
  return 0;
}
function equipSlotForItem(it){
  if(!it) return null;
  if(it.slot==='ring'){
    if(!player.equipped.ring1) return 'ring1';
    if(!player.equipped.ring2) return 'ring2';
    return itemScore(player.equipped.ring1) <= itemScore(player.equipped.ring2) ? 'ring1' : 'ring2';
  }
  return it.slot || it.kind;
}
function compareTargetForItem(it){
  if(!it) return null;
  if(it.slot==='ring'){
    const a=player.equipped.ring1, b=player.equipped.ring2;
    if(!a || !b) return null;
    return itemScore(a) <= itemScore(b) ? a : b;
  }
  return player.equipped[it.slot||it.kind];
}
function slotLabel(slot){
  return ({weapon:'Weapon',offhand:'Off-hand',helm:'Helm',vest:'Armor',gloves:'Gloves',boots:'Boots',ring1:'Ring I',ring2:'Ring II',ring:'Ring',necklace:'Amulet',throwable:'Throwable'})[slot] || slot;
}
function compareText(it){
  if(!it || it.kind==='consumable') return '';
  const cur=compareTargetForItem(it); const delta=itemScore(it)-itemScore(cur);
  if(!cur) return 'empty slot';
  return delta===0 ? 'same power' : `${delta>0?'+':''}${delta} power vs equipped`;
}
function affixText(it){
  const a=(it.affixes||[]).filter(Boolean);
  return a.length ? a.join(' · ') : (it.prefix||it.suffix ? [it.prefix,it.suffix].filter(Boolean).join(' · ') : 'no special affix');
}
function dropLoot(x,y,zombie){
  const chance = zombie.leader ? 1 : zombie.type==='brute' ? .78 : .50;
  if(Math.random()>chance) return;
  let drops = zombie.leader ? irand(3,6) : 1;
  while(drops--){
    let item;
    const roll=Math.random();
    if(roll<.20) item=makeConsumable('money', irand(5,22) * (zombie.leader?4:1));
    else if(roll<.32) item=makeConsumable('medkit', irand(16,32));
    else if(roll<.47) item=makeConsumable('bullets', irand(12,42));
    else if(roll<.56) item=makeConsumable('shells', irand(4,14));
    else if(roll<.76) item=makeItem('weapon', Math.max(1,player.level + (zombie.leader?1:0)));
    else if(roll<.91) item=makeItem('armor', Math.max(1,player.level + (zombie.leader?1:0)));
    else item=makeItem('accessory', Math.max(1,player.level + (zombie.leader?1:0)));
    loot.push({x:x+rand(-26,26),y:y+rand(-26,26),r:9,item,t:0});
  }
}
function pickupLoot(l){
  const it = l.item;
  if(it.kind==='consumable'){
    if(it.type==='money'){ player.money += it.amount; toast(`+$${it.amount}`, 'good'); }
    else if(it.type==='medkit'){ player.hp = Math.min(player.maxHp, player.hp + it.amount); toast(`Medkit +${it.amount} HP`, 'good'); }
    else { player.ammo[it.type] = (player.ammo[it.type]||0) + it.amount; toast(`${it.name} +${it.amount}`, 'good'); }
    return;
  }
  if(player.inventory.length>=BAG_SLOTS){ toast('Bag full. Sell, store or equip items first.', 'bad'); return false; }
  player.inventory.push(it);
  const rar = rarityByKey[it.rarity] || rarityByKey.common;
  toast(`${rar.label}: ${it.name}`, it.rarity);
  renderInventory();
}
function gainXp(n){
  player.xp += n;
  while(player.xp >= player.xpToNext){
    player.xp -= player.xpToNext; player.level++; player.xpToNext = Math.round(player.xpToNext*1.34 + 35);
    player.baseMaxHp += 12; player.hp = player.maxHp + 12; player.baseMoveSpeed += 2; player.baseMaxStamina += 4; player.skillPoints += 1; recalcStats(); player.stamina = player.maxStamina;
    recalcStats(); player.hp = player.maxHp;
    center(`LEVEL ${player.level}`); toast(`Level up: ${player.level} · +1 Firepath point`, 'legendary'); updateSkillButton();
  }
}

function fieldLevel(){ return Math.max(1, Math.floor(kills/10) + Math.floor(player.level*0.8)); }
function randomFieldPoint(minFromPlayer=520){
  let x=0,y=0;
  for(let i=0;i<80;i++){
    if(Math.random()<.58){
      const p=randomStoryPathPoint(260); x=p.x; y=p.y;
    } else if(Math.random()<.72){
      x = rand(1980, WORLD.w-120); y = rand(1120, WORLD.h-120);
    } else {
      x = rand(80, WORLD.w-80); y = rand(80, WORLD.h-80);
    }
    if(!inSafeZone(x,y,24) && !nearAnySafeZone(x,y,410) && !isBlocked(x,y,22) && dist(x,y,player.x,player.y)>minFromPlayer) return {x,y};
  }
  const p=randomStoryPathPoint(430); return {x:clamp(p.x,80,WORLD.w-80),y:clamp(p.y,80,WORLD.h-80)};
}
function spawnZombieAt(x,y,type=null,leader=false,packId=null){
  const t = type || choose(['walker','walker','walker','walker','runner','brute','spitter']);
  const lvl = fieldLevel(); dangerLevel = lvl;
  const scale = 1 + lvl*.07;
  const base = {
    walker:{hp:36, speed:18, damage:8, r:13, xp:12, color:'#79a86d'},
    runner:{hp:25, speed:32, damage:7, r:12, xp:14, color:'#8fdc6e'},
    brute:{hp:92, speed:13, damage:18, r:18, xp:28, color:'#a88862'},
    spitter:{hp:42, speed:17, damage:8, r:13, xp:22, color:'#9ae471'}
  }[t] || {hp:38,speed:18,damage:8,r:13,xp:12,color:'#79a86d'};
  const mult = leader ? 2.8 : 1;
  const z={x,y,r:leader?Math.max(22,base.r+8):base.r,type:t,leader,packId,hp:Math.round(base.hp*scale*mult),maxHp:Math.round(base.hp*scale*mult),speed:base.speed*(leader?.82:1),damage:Math.round(base.damage*scale*(leader?1.35:1)),xp:Math.round(base.xp*scale*(leader?4:1)),color:leader?'#ffb347':base.color,attackCd:0,spitCd:rand(1.6,3.6),flash:0,dead:false,roamTarget:null,roamT:rand(.2,2.6)};
  zombies.push(z); return z;
}
function spawnPack(forceLeader=false){
  if(inSafeZone(player.x,player.y,player.r) && zombies.length>18) return;
  const p=randomFieldPoint(inSafeZone()?620:500);
  const packId=++packSerial;
  const leader = forceLeader || Math.random()<.32;
  const size = leader ? irand(4,8) : irand(3,7);
  if(leader) spawnZombieAt(p.x+rand(-12,12),p.y+rand(-12,12),choose(['brute','walker','spitter']),true,packId);
  for(let i=0;i<size;i++){
    const type = i===0 && !leader ? choose(['walker','walker','runner']) : choose(['walker','walker','walker','runner','brute','spitter']);
    spawnZombieAt(p.x+rand(-70,70),p.y+rand(-70,70),type,false,packId);
  }
}
function updateRoamingSpawns(dt){
  dangerLevel = fieldLevel();
  spawnTimer -= dt;
  const maxZ = clamp(20 + player.level*3 + Math.floor(kills/8), 22, 46);
  if(zombies.length < maxZ && spawnTimer<=0){
    spawnPack(Math.random()<.22);
    spawnTimer = rand(5.0,9.0) * (inSafeZone()?1.25:1);
  }
}

function setPointerAim(clientX, clientY){
  mouse.x=clientX; mouse.y=clientY;
  mouse.worldX=camera.x+mouse.x/viewScale(); mouse.worldY=camera.y+mouse.y/viewScale();
  if(dist(player.x,player.y,mouse.worldX,mouse.worldY)>18){
    aim.angle=angleTo(player.x,player.y,mouse.worldX,mouse.worldY);
    aim.pointerActive=true; aim.pointerT=now();
  }
}
function setMoveAim(mx,my){
  if(Math.hypot(mx,my)>.08){
    aim.angle=Math.atan2(my,mx);
    if(!mouse.down && now()-aim.pointerT>1.2) aim.pointerActive=false;
  }
}
function preferredAimAngle(){
  const pointerFresh = aim.pointerActive && now()-aim.pointerT<2.2 && dist(player.x,player.y,mouse.worldX,mouse.worldY)>24;
  if(pointerFresh) return angleTo(player.x,player.y,mouse.worldX,mouse.worldY);
  let mx=input.x + input.joyX, my=input.y + input.joyY;
  const m=Math.hypot(mx,my);
  if(m>.08) return Math.atan2(my,mx);
  return Number.isFinite(player.angle) ? player.angle : (aim.angle||0);
}
function attack(){
  unlockAudioSoon();
  if(player.dead || !gameStarted) return;
  const item = equippedWeapon(); const def = weaponDef(item);
  const fireRate = def.fireRate * (1 + player.fireRateBonus);
  if(player.cooldown>0) return;
  player.cooldown = 1 / fireRate;
  const px=player.x, py=player.y;
  const targetA = preferredAimAngle();
  player.angle = targetA;
  aim.angle = targetA;
  const totalDamage = def.damage + (item.mods?.damage||0) + player.damageBonus + Math.max(0, player.level-1)*1.5;
  if(def.type==='melee'){
    sfx(weaponSfxName(def,item), .54, rand(.94,1.08), .08);
    let hit=false;
    for(const z of zombies){
      const d=dist(px,py,z.x,z.y);
      if(d < def.range+z.r){
        const a=angleTo(px,py,z.x,z.y); const diff=Math.abs(Math.atan2(Math.sin(a-targetA), Math.cos(a-targetA)));
        if(diff<1.25){ damageZombie(z,totalDamage,def.knockback,targetA); hit=true; }
      }
    }
    effects.push({type:'slash',x:px+Math.cos(targetA)*34,y:py+Math.sin(targetA)*34,r:34,t:.14,max:.14,a:targetA});
    if(hit) toast('Bat hit', 'good');
    return;
  }
  if(def.ammoType){
    if((player.ammo[def.ammoType]||0)<=0){ toast(`${def.ammoType} empty`, 'bad'); return; }
    player.ammo[def.ammoType]--;
  }
  if(def.type==='throw'){
    sfx('melee', .42, .88, .08);
    projectiles.push({x:px,y:py,vx:Math.cos(targetA)*def.speed,vy:Math.sin(targetA)*def.speed,r:8,life:def.range/def.speed,damage:totalDamage,kind:'molotov',owner:'player'});
    return;
  }
  const shotSfx=weaponSfxName(def,item);
  const shotThrottle = shotSfx==='uzi' ? .20 : (def.pellets>1 ? .16 : .075);
  sfx(shotSfx, def.pellets>1?.72:.55, rand(.94,1.05), shotThrottle);
  for(let i=0;i<def.pellets;i++){
    const a=targetA + rand(-def.spread,def.spread);
    projectiles.push({x:px+Math.cos(a)*18,y:py+Math.sin(a)*18,vx:Math.cos(a)*def.speed,vy:Math.sin(a)*def.speed,r:4,life:def.range/def.speed,damage:totalDamage,knockback:def.knockback,kind:'bullet',owner:'player'});
  }
}
function damageZombie(z,dmg,knock=0,a=0){
  const wep = equippedWeapon(); const mods = wep.mods || {};
  const crit = Math.random()<player.critChance; let final = Math.round(dmg*(crit?1.75:1));
  if(mods.burnChance && Math.random()<mods.burnChance){ final += Math.round(6 + player.level*1.5); effects.push({type:'fire',x:z.x,y:z.y,r:26,t:.65,max:.65}); }
  if(mods.bleedChance && Math.random()<mods.bleedChance){ final += Math.round(8 + player.level*2); }
  z.hp -= final; z.flash=.12;
  const totalKnock = knock + (mods.knockback||0);
  if(totalKnock){ z.x += Math.cos(a)*totalKnock*.06; z.y += Math.sin(a)*totalKnock*.06; }
  effects.push({type:'hit',x:z.x,y:z.y,r:crit?22:14,t:.2,max:.2,crit});
  if(z.hp<=0 && !z.dead){ killZombie(z); }
}
function killZombie(z){
  z.dead=true; kills++; gainXp(z.xp); dropLoot(z.x,z.y,z);
  sfx(z.leader?'leaderKilled':'zombieKilled', z.leader?.78:.52, rand(.92,1.08), .02);
  if(z.leader) AudioSys.musicDuck(.13, 520);
  effects.push({type:'corpse',x:z.x,y:z.y,r:z.r,t:180,max:180,leader:z.leader,boss:z.leader});
  const corpses=effects.filter(e=>e.type==='corpse'); if(corpses.length>90) corpses[0].t=0;
  zombies = zombies.filter(o=>o!==z);
}
function fireEnemySpit(z){
  const a=angleTo(z.x,z.y,player.x,player.y);
  enemyProjectiles.push({x:z.x,y:z.y,vx:Math.cos(a)*230,vy:Math.sin(a)*230,r:6,life:2.4,damage:11+dangerLevel*.7,kind:'acid'});
}
function hurtPlayer(amount){
  if(player.hitCooldown>0 || player.dead) return;
  const reduced = Math.max(1, Math.round(amount * (100/(100+player.armor*6))));
  player.hp -= reduced; player.hitCooldown=.55; effects.push({type:'hurt',x:player.x,y:player.y,r:28,t:.24,max:.24});
  if(player.hp<=0){ player.hp=0; player.dead=true; center('YOU DIED'); toast('Press R to restart.', 'bad'); }
}

function update(dt){
  if(!gameStarted || paused) return;
  frame++;
  if(centerTimer>0){ centerTimer-=dt; if(centerTimer<=0) $('centerMsg').classList.remove('showCenter'); }
  updateInputVector();
  if(player.cooldown>0) player.cooldown-=dt;
  if(player.hitCooldown>0) player.hitCooldown-=dt;
  if(!player.dead){
    let mx=input.x + input.joyX, my=input.y + input.joyY;
    const m=Math.hypot(mx,my); if(m>1){mx/=m;my/=m;}
    const wantsSprint = (keys.has('shift') || Math.hypot(input.joyX,input.joyY)>.93) && m>.05 && player.stamina>2;
    player.sprinting = !!wantsSprint;
    const speed = player.moveSpeed * (wantsSprint ? 1.35 : 1);
    if(wantsSprint) player.stamina = Math.max(0, player.stamina - 34*dt);
    else player.stamina = Math.min(player.maxStamina, player.stamina + 22*dt);
    moveCircle(player, mx*speed*dt, my*speed*dt, player.r);
    const moving = m>.05;
    if(moving){ player.angle = Math.atan2(my,mx); setMoveAim(mx,my); }
    updateFirepath(dt,moving);
    if((fireHeld || mouse.down || keys.has(' ')) && !document.body.classList.contains('inventoryOpen')) attack();
    const inSafe=inSafeZone(player.x,player.y,player.r);
    if(inSafe){ player.regenTimer+=dt; if(player.regenTimer>.6){ player.regenTimer=0; player.hp=Math.min(player.maxHp,player.hp+2); } } else player.regenTimer=0;
  }
  updateRoamingSpawns(dt);
  for(const z of zombies){
    if(z.flash>0) z.flash-=dt;
    if(z.attackCd>0) z.attackCd-=dt;
    if(z.roamT>0) z.roamT-=dt;
    const d=dist(z.x,z.y,player.x,player.y);
    const playerSafe = inSafeZone(player.x,player.y,player.r);
    const playerNearTownEdge = nearAnySafeZone(player.x,player.y,190);
    const aggro = z.leader ? 540 : 430;
    if(!playerSafe && d<360 && Math.random()<dt*(z.leader?.06:.025)) sfx('zombieGrowl', z.leader?.38:.22, rand(.84,1.16), .75);
    let target;
    if(!playerSafe && !playerNearTownEdge && d<aggro) target = player;
    else {
      if(!z.roamTarget || z.roamT<=0 || dist(z.x,z.y,z.roamTarget.x,z.roamTarget.y)<28 || nearAnySafeZone(z.x,z.y,220)){
        const p=randomFieldPoint(0); z.roamTarget={x:p.x,y:p.y}; z.roamT=rand(4.0,9.0);
      }
      target = z.roamTarget;
    }
    if(z.type==='spitter' && d<520 && !playerSafe && !playerNearTownEdge){ z.spitCd-=dt; if(z.spitCd<=0){ z.spitCd=rand(3.0,5.2); fireEnemySpit(z); } }
    const a=angleTo(z.x,z.y,target.x,target.y);
    const moveMult = (!playerSafe && !playerNearTownEdge && d<aggro) ? 1.0 : .52;
    if(d>z.r+player.r+4 || playerSafe) tryMoveZombie(z,Math.cos(a)*z.speed*moveMult*dt,Math.sin(a)*z.speed*moveMult*dt,z.r);
    if(!playerSafe && d<z.r+player.r+7 && z.attackCd<=0){ z.attackCd=z.leader?.72:.98; hurtPlayer(z.damage); }
  }
  for(const p of projectiles){
    p.x+=p.vx*dt; p.y+=p.vy*dt; p.life-=dt;
    if(p.kind==='molotov' && p.life<=0){ explodeFire(p.x,p.y,p.damage); p.dead=true; }
    else if(p.life<=0 || isBlocked(p.x,p.y,p.r)) p.dead=true;
    else {
      for(const z of zombies){ if(dist(p.x,p.y,z.x,z.y)<p.r+z.r){ damageZombie(z,p.damage,p.knockback||0,Math.atan2(p.vy,p.vx)); p.dead=true; if(p.kind==='molotov') explodeFire(p.x,p.y,p.damage); break; } }
    }
  }
  projectiles=projectiles.filter(p=>!p.dead);
  for(const p of enemyProjectiles){ p.x+=p.vx*dt; p.y+=p.vy*dt; p.life-=dt; if(p.life<=0 || isBlocked(p.x,p.y,p.r)) p.dead=true; if(!inSafeZone(player.x,player.y,player.r) && dist(p.x,p.y,player.x,player.y)<p.r+player.r){ p.dead=true; hurtPlayer(p.damage); } }
  enemyProjectiles=enemyProjectiles.filter(p=>!p.dead);
  for(const l of loot){ l.t+=dt; if(dist(l.x,l.y,player.x,player.y)<player.pickupRadius){ if(pickupLoot(l)!==false) l.dead=true; } }
  loot=loot.filter(l=>!l.dead);
  updateFirepathDamage(dt);
  for(const e of effects){ e.t-=dt; } effects=effects.filter(e=>e.t>0);
  camera.x = clamp(player.x - viewWorldW()/2, 0, Math.max(0,WORLD.w-viewWorldW())); camera.y = clamp(player.y - viewWorldH()/2, 0, Math.max(0,WORLD.h-viewWorldH()));
  updateHud();
  updateContextUI();
}
function explodeFire(x,y,damage){
  sfx('explosion', .72, rand(.88,1.04), .14);
  AudioSys.musicDuck(.12, 420);
  effects.push({type:'fire',x,y,r:82,t:2.2,max:2.2});
  for(const z of zombies){ if(dist(x,y,z.x,z.y)<86+z.r) damageZombie(z,damage*3,0,0); }
}


function nearestCar(maxD=74){
  if(vehicle) return null;
  let best=null,bd=maxD;
  for(const c of cars){ const d=dist(player.x,player.y,c.x,c.y); if(d<bd){bd=d; best=c;} }
  return best;
}
function enterVehicle(c){
  if(!c || vehicle || inSafeZone()) { if(inSafeZone()) toast('Cars stay outside town gates.', 'bad'); return; }
  vehicle={type:c.type,w:c.w,h:c.h,rot:c.rot||0,ramCd:0};
  cars=cars.filter(o=>o!==c);
  center('VEHICLE'); toast('Drive: move keys/joystick. E exits. Run over infected.', 'good');
}
function exitVehicle(){
  if(!vehicle) return;
  cars.push({x:player.x,y:player.y,w:vehicle.w,h:vehicle.h,type:vehicle.type,rot:vehicle.rot||player.angle});
  vehicle=null; toast('Exited vehicle.', 'good');
}
function moveVehicle(dx,dy,dt){
  if(!vehicle) return;
  const r=22; const nx=player.x+dx, ny=player.y+dy;
  if(!isBlocked(nx,player.y,r,true)) player.x=nx;
  if(!isBlocked(player.x,ny,r,true)) player.y=ny;
  player.x=clamp(player.x,r,WORLD.w-r); player.y=clamp(player.y,r,WORLD.h-r);
  const sp=Math.hypot(dx,dy)/Math.max(dt,.001); if(sp>10) vehicle.rot=Math.atan2(dy,dx)+Math.PI/2;
  if(vehicle.ramCd>0) vehicle.ramCd-=dt;
  for(const z of zombies){
    if(dist(player.x,player.y,z.x,z.y)<r+z.r+10){
      damageZombie(z, Math.max(24, sp*.14 + 18 + player.level*2), 180, Math.atan2(dy,dx));
      if(vehicle.ramCd<=0){ sfx('melee', .38, .78, .15); vehicle.ramCd=.16; }
    }
  }
}
function firepathLevel(){ return Math.max(0, Math.min(10, (player.skills&&player.skills.firepath)||0)); }
function upgradeFirepath(silent=false){
  if(player.skillPoints<=0){ if(!silent) toast('Level up to earn a Firepath point.', 'bad'); return false; }
  if(!player.skills) player.skills={firepath:0};
  if(firepathLevel()>=10){ if(!silent) toast('Firepath is already maxed.', 'legendary'); return false; }
  player.skills.firepath=firepathLevel()+1;
  player.skillPoints--;
  recalcStats();
  updateSkillButton();
  if(!silent) toast(`Firepath ${firepathLevel()}/10`, 'legendary');
  renderInventory();
  return true;
}
function activateFirepath(){
  unlockAudioSoon();
  if(player.dead || !gameStarted || paused) return;
  if(firepathLevel()<=0){
    if(player.skillPoints>0 && upgradeFirepath(true)){ center('FIREPATH'); toast('Firepath learned. Sprint to draw burning ground.', 'legendary'); }
    else { toast('Firepath needs a skill point.', 'bad'); return; }
  }
  player.firepathActive=true;
  player.firepathTimer=5.5 + firepathLevel()*.8;
  player.firepathDropT=0;
  sfx('explosion', .28, 1.18, .35);
  toast('Firepath primed. Sprint to burn the trail.', 'legendary');
  updateSkillButton();
}
function updateFirepath(dt,moving){
  if(!player.firepathActive) return;
  player.firepathTimer-=dt;
  if(player.firepathTimer<=0 || player.stamina<=1){ player.firepathActive=false; updateSkillButton(); return; }
  const lvl=firepathLevel();
  if(player.sprinting && moving){
    player.stamina=Math.max(0, player.stamina-(6+lvl*1.2)*dt);
    player.firepathDropT-=dt;
    if(player.firepathDropT<=0){
      player.firepathDropT=.115;
      const backA=player.angle+Math.PI;
      effects.push({type:'firepath',x:player.x+Math.cos(backA)*15,y:player.y+Math.sin(backA)*15,r:26+lvl*2,t:1.85+lvl*.08,max:1.85+lvl*.08,damage:7+lvl*3});
    }
  }
}
function updateFirepathDamage(dt){
  for(const e of effects){
    if(e.type!=='firepath') continue;
    const pulse=(e.damage||8)*dt;
    for(const z of zombies){
      if(dist(e.x,e.y,z.x,z.y)<e.r+z.r){
        z.hp-=pulse; z.flash=Math.max(z.flash||0,.05);
        if(z.hp<=0 && !z.dead) killZombie(z);
      }
    }
  }
}
function updateSkillButton(){
  const btn=$('skillBtn'); if(!btn) return;
  const lvl=firepathLevel();
  btn.textContent = lvl>0 ? 'PATH' : (player.skillPoints>0 ? '+PATH' : 'PATH');
  btn.classList.toggle('ready', !!player.firepathActive);
  btn.dataset.lvl = String(lvl);
}

function throwMolotov(){
  unlockAudioSoon();
  if(player.dead || !gameStarted || paused) return;
  const it=player.equipped.throwable; if(!it){ toast('No throwable equipped.', 'bad'); return; }
  const def=WEAPONS[it.base||'molotov'] || WEAPONS.molotov;
  if((player.ammo.throwables||0)<=0){ toast('No bottles left.', 'bad'); return; }
  if(player.cooldown>0) return;
  const a=preferredAimAngle(); player.angle=a; aim.angle=a; player.cooldown=1/Math.max(.5,def.fireRate);
  player.ammo.throwables--; sfx('melee', .42, .88, .08);
  const dmg=def.damage+(it.mods?.damage||0)+player.damageBonus*.35+player.level;
  projectiles.push({x:player.x+Math.cos(a)*16,y:player.y+Math.sin(a)*16,vx:Math.cos(a)*def.speed,vy:Math.sin(a)*def.speed,r:8,life:def.range/def.speed,damage:dmg,kind:'molotov',owner:'player'});
}
function nearestPortal(maxD=120){
  let best=null,bd=maxD;
  for(const p of travelObjects){ const d=dist(player.x,player.y,p.x+p.w/2,p.y+p.h/2); if(d<bd){bd=d; best=p;} }
  return best;
}
function usePortal(p){
  if(!p) return;
  if(p.to==='city'){ player.x=citySafeZone.x+citySafeZone.w/2; player.y=citySafeZone.y+citySafeZone.h/2; center('CITY OUTPOST'); toast('You crossed the tower corridor into the dead city.', 'legendary'); }
  else { player.x=safeZone.x+safeZone.w/2; player.y=safeZone.y+safeZone.h/2; center('EMBER CAMP'); toast('Returned to Ember Camp through the tower.', 'good'); }
  camera.x=clamp(player.x-viewWorldW()/2,0,Math.max(0,WORLD.w-viewWorldW())); camera.y=clamp(player.y-viewWorldH()/2,0,Math.max(0,WORLD.h-viewWorldH()));
}
function contextInfo(){
  if(document.body.classList.contains('inventoryOpen') || document.body.classList.contains('vendorOpen')) return null;
  const portal=nearestPortal(); if(portal) return {label:portal.to==='city'?'Enter Skyspine Tower':'Return through tower',action:()=>usePortal(portal),kind:'portal'};
  const v=nearestVendor(); if(v) return {label:v.kind==='stash'?'Open stash':`Talk to ${v.role}`,action:()=>v.kind==='stash'?openInventory():talkToCampNpc(v.role),kind:v.kind};
  return null;
}
function updateContextUI(){
  const box=$('contextPanel'), btn=$('contextBtn'); if(!box||!btn) return;
  const info=contextInfo(); contextAction=info;
  if(!info){ box.classList.remove('showContext'); return; }
  btn.textContent = `E · ${info.label}`;
  box.classList.add('showContext');
}
function performContextAction(){
  const info=contextInfo(); if(info && info.action) { info.action(); return true; }
  return false;
}

function nearestVendor(){
  if(!inSafeZone()) return null;
  let best=null, bestD=9999;
  for(const o of campObjects){
    if(o.kind!=='vendor' && o.kind!=='stash') continue;
    const d=dist(player.x,player.y,o.x+o.w/2,o.y+o.h/2);
    if(d<bestD){ best=o; bestD=d; }
  }
  return bestD<150 ? best : null;
}
function talkToCampNpc(role){
  const lines={
    Healer:'Healer: Stay near the fire when you are hurt. The road north is quieter than it looks.',
    Armorer:'Armorer: Keep your best weapon ready. Leaders carry better gear, but they rarely walk alone.',
    Supplier:'Supplier: Save your shells for packs. Most of what you need is found outside, not bought.',
    Lookout:'Lookout: The streets past the tower are worse, but the outpost still holds.',
    Scout:'Scout: Return through the tower if the city presses too hard.'
  };
  toast(lines[role]||`${role}: Keep moving and come back alive.`, 'good');
}
function campInteract(){
  if(!inSafeZone()){ toast('Return to Ember Camp for stash and safety.', 'bad'); return; }
  const v=nearestVendor();
  if(!v){ toast('Move close to a person or stash chest.', 'bad'); return; }
  if(v.kind==='stash') return openInventory();
  talkToCampNpc(v.role);
}
function buyTownSupplies(){ campInteract(); }
function shopPrice(it){ return Math.max(8, Math.round(itemScore(it)*1.55 + (it.level||1)*12 + ({common:0,uncommon:20,rare:55,epic:120,legendary:260}[it.rarity]||0))); }
function sellPrice(it){ return Math.max(3, Math.round(itemScore(it)*0.65 + (it.level||1)*4)); }
function shopWeapon(base, level=player.level){ const it=makeItem('weapon',level); it.base=base; it.name=({bat:'Camp Bat',crowbar:'Iron Crowbar',machete:'Machete',katana:'Mall Katana',fireaxe:'Fire Axe',pistol:'Street Pistol',uzi:'Rusty Uzi',shotgun:'Police Shotgun'})[base]||it.name; it.desc=WEAPONS[base].desc; return it; }
function generateShopStock(){
  shopStock={
    Healer:[{type:'service',name:'Healer blessing',desc:'Restore all life.',price:25,apply:()=>{player.hp=player.maxHp;}},{type:'consumable',kind:'medkit',name:'Medkit',desc:'Instant field healing item.',amount:42,price:34}],
    Supplier:[{type:'ammo',name:'Bullet Bundle',desc:'+55 bullets',ammoType:'bullets',amount:55,price:28},{type:'ammo',name:'Shell Pack',desc:'+14 shells',ammoType:'shells',amount:14,price:34},{type:'ammo',name:'Bottle Kit',desc:'+3 throwables',ammoType:'throwables',amount:3,price:45},{type:'item',item:shopWeapon('crowbar',player.level),price:0},{type:'item',item:shopWeapon('machete',player.level),price:0},{type:'item',item:shopWeapon('shotgun',player.level),price:0},{type:'item',item:shopWeapon('uzi',player.level),price:0}],
    Armorer:[{type:'item',item:makeItem('armor',player.level),price:0},{type:'item',item:makeItem('armor',player.level),price:0},{type:'item',item:makeItem('accessory',player.level),price:0},{type:'item',item:makeItem('accessory',player.level),price:0}]
  };
  for(const list of Object.values(shopStock)) for(const g of list) if(g.type==='item'&&!g.price) g.price=shopPrice(g.item);
}
function openVendor(role){ activeVendor=role; paused=true; document.body.classList.add('vendorOpen'); renderVendor(); }
function closeVendor(){ document.body.classList.remove('vendorOpen'); activeVendor=null; paused=false; }
function vendorGlyph(g){
  if(g.item) return itemGlyph(g.item);
  if(g.type==='service') return '✚';
  if(g.type==='ammo') return g.ammoType==='shells'?'S':g.ammoType==='throwables'?'F':'B';
  return '+';
}
function vendorGoodCell(g,i){
  const it=g.item; const rar=it?it.rarity:'common'; const name=it?it.name:g.name;
  const detail=it?`Power ${itemScore(it)} · ${itemPowerText(it)} · ${affixText(it)}`:g.desc;
  const round=g.type==='service'?' round':'';
  return `<div class="vendorCell ${rar}${round}" data-buy="${i}" title="${name}\n$${g.price}\n${detail.replace(/"/gptgta/g,'&quot;')}"><span>${vendorGlyph(g)}</span><small>$${g.price}</small></div>`;
}
function renderVendor(){
  const title=$('vendorTitle'), body=$('vendorGoods'); if(!title||!body) return;
  const intro={Healer:'Healing, recovery and field medkits.',Armorer:'Armor, shields, rings and amulets.',Supplier:'Ammo, melee weapons and firearms.'}[activeVendor]||'Camp services';
  title.textContent=`${activeVendor} · Ember Camp`;
  const goods=shopStock[activeVendor]||[];
  if(selectedVendorIndex>=goods.length) selectedVendorIndex=0;
  const selected=goods[selectedVendorIndex];
  const selectedDetail=selected ? (selected.item ? `<div class="vendorDetail"><div class="itemName ${selected.item.rarity}">${selected.item.name}</div><div>Price <b>$${selected.price}</b> · Power <b>${itemScore(selected.item)}</b></div><div>${itemPowerText(selected.item)}</div><div class="affixLine">${affixText(selected.item)}</div><div class="muted">${selected.item.desc||''}</div></div>` : `<div class="vendorDetail"><div class="itemName common">${selected.name}</div><div>Price <b>$${selected.price}</b></div><div class="muted">${selected.desc||''}</div></div>`) : '';
  body.innerHTML = `<div class="vendorIntro">${intro}<br>Money: <b>$${player.money}</b><br><span class="muted">Click your bag squares to sell. Click merchant squares to buy.</span></div>
  <div class="tradeBoard">
    <section><h3>Your Bag <span class="muted">sell</span></h3><div id="vendorBagGrid" class="vendorMiniGrid">${renderGrid(player.inventory,'vendorbag',BAG_SLOTS)}</div></section>
    <section><h3>${activeVendor} Stock <span class="muted">buy</span></h3><div id="merchantGrid" class="vendorMiniGrid merchantGrid">${goods.map((g,i)=>vendorGoodCell(g,i)).join('')}</div>${selectedDetail}</section>
  </div>`;
  for(const el of body.querySelectorAll('.vendorCell[data-buy]')) el.addEventListener('click',()=>{ selectedVendorIndex=+el.dataset.buy; buyVendorItem(selectedVendorIndex); });
  for(const el of body.querySelectorAll('#vendorBagGrid .itemTile')) el.addEventListener('click',()=>sellItem(el.dataset.id));
}
function buyVendorItem(i){
  const goods=shopStock[activeVendor]||[], g=goods[i]; if(!g) return;
  if(player.money<g.price){ toast('Not enough money.', 'bad'); return; }
  if(g.type==='item' && player.inventory.length>=BAG_SLOTS){ toast('Bag full.', 'bad'); return; }
  player.money-=g.price;
  if(g.type==='service') g.apply();
  else if(g.type==='ammo') player.ammo[g.ammoType]=(player.ammo[g.ammoType]||0)+g.amount;
  else if(g.type==='consumable') player.hp=Math.min(player.maxHp, player.hp+(g.amount||20));
  else if(g.type==='item'){ player.inventory.push(g.item); selectedItemRef={origin:'bag',id:g.item.id}; goods.splice(i,1); }
  toast(`Bought ${g.item?g.item.name:g.name}`, 'good'); updateHud(); renderInventory(); renderVendor();
}
function sellItem(id){
  if(!inSafeZone()){ toast('Sell items in Ember Camp.', 'bad'); return; }
  const idx=player.inventory.findIndex(i=>i.id===id); if(idx<0) return;
  const [it]=player.inventory.splice(idx,1); const value=sellPrice(it); player.money+=value; selectedItemRef={origin:'bag',id:null}; renderInventory(); updateHud(); updateContextUI(); if(activeVendor) renderVendor(); toast(`Sold ${it.name} for $${value}`, 'good');
}

function updateInputVector(){
  let x=0,y=0;
  if(keys.has('a')||keys.has('arrowleft')) x--;
  if(keys.has('d')||keys.has('arrowright')) x++;
  if(keys.has('w')||keys.has('arrowup')) y--;
  if(keys.has('s')||keys.has('arrowdown')) y++;
  const m=Math.hypot(x,y); input.x=m?x/m:0; input.y=m?y/m:0;
}

function draw(){
  ctx.fillStyle='#0b0d0e'; ctx.fillRect(0,0,SW,SH);
  ctx.save(); const s=viewScale(); ctx.scale(s,s); ctx.translate(-camera.x,-camera.y);
  drawMap();
  for(const l of loot) drawLoot(l);
  for(const p of projectiles) drawProjectile(p);
  for(const p of enemyProjectiles) drawEnemyProjectile(p);
  for(const z of zombies) drawZombie(z);
  drawPlayer();
  for(const e of effects) drawEffect(e);
  ctx.restore();
  drawVignette();
  requestAnimationFrame(loop);
}
function drawMap(){
  drawTerrainBase();
  drawStoryPath();
  // The second act is still an urban field: asphalt blocks and hard roads begin after the tower corridor.
  ctx.fillStyle='rgba(31,33,35,.82)'; ctx.fillRect(1980,1120,940,850);
  for(const rx of roadsX.filter(x=>x>1900)){ drawRoadRect(rx-roadW/2,1120,roadW,880,true); }
  for(const ry of roadsY.filter(y=>y>1080)){ drawRoadRect(1900,ry-roadW/2,1000,roadW,false); }
  for(const rx of roadsX.filter(x=>x>1900)) for(const ry of roadsY.filter(y=>y>1080)){ drawSprite('roadX',rx-roadW/2,ry-roadW/2,roadW,roadW,0,1); }
  ctx.strokeStyle='rgba(210,205,180,.18)'; ctx.lineWidth=14;
  for(const b of buildings){ if(b.x>1900||b.y>1080) ctx.strokeRect(b.x-7,b.y-7,b.w+14,b.h+14); }
  drawForestObjects();
  drawFirstTown();
  drawSecondTown();
  drawTravelObjects();
  for(const b of buildings) drawBuilding(b);
  for(const c of cars) drawCar(c);
  for(const d of decor) drawDecor(d);
}
function drawTerrainBase(){
  ctx.fillStyle='#102016'; ctx.fillRect(0,0,WORLD.w,WORLD.h);
  for(const p of terrainPatches){
    ctx.save(); ctx.translate(p.x,p.y); ctx.rotate(p.rot||0); ctx.fillStyle=p.color; ctx.beginPath(); ctx.ellipse(0,0,p.rx,p.ry,0,0,Math.PI*2); ctx.fill(); ctx.restore();
  }
  // subtle non-grid grain
  ctx.fillStyle='rgba(255,230,150,.025)';
  for(let i=0;i<90;i++){ const x=(i*173)%WORLD.w, y=(i*97)%WORLD.h; ctx.beginPath(); ctx.ellipse(x,y,80+(i%5)*26,22+(i%7)*8,(i%9)*.2,0,Math.PI*2); ctx.fill(); }
}
function drawWidePath(points,width,fill,stroke){
  ctx.lineJoin='round'; ctx.lineCap='round'; ctx.strokeStyle=fill; ctx.lineWidth=width; ctx.beginPath(); ctx.moveTo(points[0].x,points[0].y); for(const p of points.slice(1)) ctx.lineTo(p.x,p.y); ctx.stroke();
  ctx.strokeStyle=stroke; ctx.lineWidth=Math.max(2,width*.06); ctx.beginPath(); ctx.moveTo(points[0].x,points[0].y); for(const p of points.slice(1)) ctx.lineTo(p.x,p.y); ctx.stroke();
}
function drawStoryPath(){
  const pts=storyPathPoints();
  drawWidePath(pts,92,'#3b3121','rgba(226,182,98,.20)');
  drawWidePath(pts,48,'#5a4529','rgba(0,0,0,.10)');
  // small edge stones so the road reads as a corridor without a tile grid.
  ctx.fillStyle='rgba(170,133,77,.38)';
  for(let i=0;i<pts.length-1;i++){
    const a=pts[i], b=pts[i+1], len=dist(a.x,a.y,b.x,b.y), ang=angleTo(a.x,a.y,b.x,b.y);
    const nx=Math.cos(ang+Math.PI/2), ny=Math.sin(ang+Math.PI/2);
    for(let t=30;t<len;t+=70){ const x=lerp(a.x,b.x,t/len), y=lerp(a.y,b.y,t/len); ctx.fillRect(x+nx*50-4,y+ny*50-4,8,8); ctx.fillRect(x-nx*50-4,y-ny*50-4,8,8); }
  }
}
function drawForestObjects(){
  for(const o of forestObjects){
    if(o.x<camera.x-80||o.x>camera.x+viewWorldW()+80||o.y<camera.y-80||o.y>camera.y+viewWorldH()+80) continue;
    if(o.kind==='tree') { if(o.sprite && IMG[o.sprite]) drawSprite(o.sprite,o.x-o.r,o.y-o.r,o.r*2,o.r*2,0,.95); else drawTree(o.x,o.y,o.r); } else { if(o.sprite && IMG[o.sprite]) drawSprite(o.sprite,o.x-o.r*.7,o.y-o.r*.7,o.r*1.4,o.r*1.4,0,.95); else drawBush(o.x,o.y,o.r); }
  }
}
function drawFirstTown(){
  const z=safeZone, cx=z.x+z.w/2, cy=z.y+z.h/2;
  if(IMG.asphalt){
    for(let yy=z.y; yy<z.y+z.h; yy+=64) for(let xx=z.x; xx<z.x+z.w; xx+=64) ctx.drawImage(IMG.asphalt,xx,yy,64,64);
  } else { ctx.fillStyle='#252729'; ctx.fillRect(z.x,z.y,z.w,z.h); }
  ctx.fillStyle='rgba(34,39,37,.48)'; ctx.fillRect(z.x,z.y,z.w,z.h);
  ctx.fillStyle='rgba(232,214,132,.10)'; ctx.beginPath(); ctx.ellipse(cx,cy+34,220,118,0,0,Math.PI*2); ctx.fill();
  ctx.strokeStyle='rgba(27,14,9,.92)'; ctx.lineWidth=9; ctx.strokeRect(z.x-4,z.y-4,z.w+8,z.h+8);
  ctx.strokeStyle='rgba(216,154,72,.88)'; ctx.lineWidth=3; ctx.strokeRect(z.x+5,z.y+5,z.w-10,z.h-10);
  for(const o of campObjects) drawCampObject(o);
  ctx.fillStyle='#efffe7'; ctx.font='900 20px monospace'; ctx.fillText('EMBER CAMP',cx-74,z.y+40);
  ctx.font='800 12px monospace'; ctx.fillText('SAFE TOWN · STASH · CAMPFIRE · NORTH ROAD',cx-154,z.y+60);
  ctx.fillStyle='rgba(0,0,0,.45)'; ctx.fillRect(cx-72,z.y-24,144,22);
  ctx.fillRect(cx-72,z.y+z.h+4,144,22);
  ctx.fillStyle='#ffd45a'; ctx.font='900 11px monospace'; ctx.fillText('NORTH GATE',cx-42,z.y-9);
  ctx.fillText('SOUTH GATE',cx-42,z.y+z.h+19);
}

function drawSecondTown(){
  const z=citySafeZone, cx=z.x+z.w/2;
  ctx.fillStyle='#202326'; ctx.fillRect(z.x,z.y,z.w,z.h);
  if(IMG.asphalt){ for(let yy=z.y; yy<z.y+z.h; yy+=64) for(let xx=z.x; xx<z.x+z.w; xx+=64) ctx.drawImage(IMG.asphalt,xx,yy,64,64); }
  ctx.fillStyle='rgba(0,0,0,.18)'; ctx.fillRect(z.x,z.y,z.w,z.h);
  ctx.strokeStyle='rgba(0,0,0,.92)'; ctx.lineWidth=8; ctx.strokeRect(z.x-4,z.y-4,z.w+8,z.h+8);
  ctx.strokeStyle='rgba(216,154,72,.78)'; ctx.lineWidth=2; ctx.strokeRect(z.x+5,z.y+5,z.w-10,z.h-10);
  ctx.fillStyle='#efffe7'; ctx.font='900 17px monospace'; ctx.fillText('CITY OUTPOST',cx-68,z.y+32);
}
function drawTravelObjects(){
  for(const p of travelObjects){
    const roof=p.to==='city'?'roof2':'roof';
    drawBuilding({x:p.x,y:p.y,w:p.w,h:p.h,roof,store:p.to==='city'?'convShop':'dinerShop'});
    if(p.to==='city'){
      ctx.fillStyle='rgba(150,170,190,.18)'; ctx.fillRect(p.x+18,p.y+16,p.w-36,p.h-44);
      ctx.strokeStyle='rgba(230,240,255,.18)'; ctx.lineWidth=2; for(let yy=p.y+28; yy<p.y+p.h-42; yy+=26){ ctx.beginPath(); ctx.moveTo(p.x+24,yy); ctx.lineTo(p.x+p.w-24,yy); ctx.stroke(); }
      drawLabel('SKYSPINE TOWER  E',p.x+p.w/2,p.y-10);
    } else drawLabel('TOWER CORRIDOR  E',p.x+p.w/2,p.y-8);
  }
}
function drawDirtRoadRect(x,y,w,h,vertical){
  ctx.fillStyle='#3b3121'; ctx.fillRect(x,y,w,h);
  if(IMG.dirt){ const step=64; for(let yy=Math.floor(y/step)*step; yy<y+h; yy+=step) for(let xx=Math.floor(x/step)*step; xx<x+w; xx+=step) ctx.drawImage(IMG.dirt,xx,yy,64,64); }
  ctx.strokeStyle='rgba(208,166,90,.20)'; ctx.lineWidth=2;
  if(vertical){ ctx.beginPath(); ctx.moveTo(x+w/2,y); ctx.lineTo(x+w/2,y+h); ctx.stroke(); }
  else { ctx.beginPath(); ctx.moveTo(x,y+h/2); ctx.lineTo(x+w,y+h/2); ctx.stroke(); }
}

function drawCampObject(o){
  if(o.kind==='barricade'){ drawSprite(IMG.stripedBarrier?'stripedBarrier':'barrier',o.x,o.y,o.w,o.h,o.rot||0,.96); return; }
  if(o.kind==='gate'){ ctx.fillStyle='rgba(0,0,0,.35)'; ctx.fillRect(o.x,o.y,o.w,o.h); ctx.strokeStyle='#ffd45a'; ctx.lineWidth=2; ctx.strokeRect(o.x,o.y,o.w,o.h); return; }
  if(o.kind==='campfire'){
    ctx.fillStyle='rgba(255,120,30,.16)'; ctx.beginPath(); ctx.arc(o.x+o.w/2,o.y+o.h/2,58+Math.sin(frame*.08)*5,0,Math.PI*2); ctx.fill();
    drawSprite(IMG.burnBarrel?'burnBarrel':'barrel',o.x+2,o.y+2,40,40,0,.85);
    ctx.fillStyle='#ff7628'; ctx.beginPath(); ctx.arc(o.x+o.w/2,o.y+o.h/2,16+Math.sin(frame*.12)*3,0,Math.PI*2); ctx.fill();
    ctx.fillStyle='#ffe073'; ctx.beginPath(); ctx.arc(o.x+o.w/2+3,o.y+o.h/2-3,8,0,Math.PI*2); ctx.fill();
    drawLabel(o.label,o.x+o.w/2,o.y-8); return;
  }
  if(o.kind==='tent'){
    ctx.fillStyle='#5f4130'; ctx.beginPath(); ctx.moveTo(o.x,o.y+o.h); ctx.lineTo(o.x+o.w/2,o.y); ctx.lineTo(o.x+o.w,o.y+o.h); ctx.closePath(); ctx.fill();
    ctx.strokeStyle='#e0b267'; ctx.lineWidth=2; ctx.stroke();
    ctx.fillStyle='rgba(0,0,0,.38)'; ctx.fillRect(o.x+o.w/2-12,o.y+o.h-26,24,26); return;
  }
  if(o.kind==='stash'){ drawSprite('dumpster',o.x,o.y,o.w,o.h,0,.9); drawLabel('STASH  E',o.x+o.w/2,o.y-8); return; }
  if(o.kind==='prop'){ drawSprite(o.sprite,o.x,o.y,o.w,o.h,0,.95); return; }
  if(o.kind==='vendor'){
    const colors={Healer:'#72ff92',Armorer:'#74baff',Supplier:'#ffd45a'};
    ctx.save(); ctx.translate(o.x+o.w/2,o.y+o.h/2);
    drawHumanFallback(0,0,colors[o.role]||'#fff','#f4c194',1.05);
    ctx.restore();
    drawLabel(o.role+'  E',o.x+o.w/2,o.y-8); return;
  }
}
function drawTree(x,y,r){
  ctx.fillStyle='rgba(0,0,0,.28)'; ctx.beginPath(); ctx.ellipse(x,y+r*.65,r*.85,r*.28,0,0,Math.PI*2); ctx.fill();
  ctx.fillStyle='#2d5c35'; ctx.beginPath(); ctx.arc(x-r*.22,y-r*.12,r*.72,0,Math.PI*2); ctx.arc(x+r*.25,y-r*.18,r*.78,0,Math.PI*2); ctx.arc(x,y+r*.2,r*.68,0,Math.PI*2); ctx.fill();
  ctx.fillStyle='#6f4a28'; ctx.fillRect(x-3,y+r*.2,6,r*.62);
}
function drawBush(x,y,r){ ctx.fillStyle='#315f3a'; ctx.beginPath(); ctx.arc(x-r*.32,y,r*.45,0,Math.PI*2); ctx.arc(x+r*.26,y-r*.08,r*.5,0,Math.PI*2); ctx.arc(x,y+r*.16,r*.48,0,Math.PI*2); ctx.fill(); }
function drawLabel(text,x,y){ ctx.fillStyle='rgba(0,0,0,.6)'; const w=Math.max(44,text.length*8+12); ctx.fillRect(x-w/2,y-14,w,17); ctx.fillStyle='#fff1a5'; ctx.font='900 11px monospace'; ctx.fillText(text,x-w/2+6,y-2);
}
function drawRoadRect(x,y,w,h,vertical){
  ctx.fillStyle='#222426'; ctx.fillRect(x,y,w,h);
  const im=vertical?IMG.roadV:IMG.roadH;
  if(im){
    const step=64;
    for(let yy=Math.floor(y/step)*step; yy<y+h; yy+=step) for(let xx=Math.floor(x/step)*step; xx<x+w; xx+=step){ ctx.drawImage(im,xx,yy,64,64); }
  }
  ctx.strokeStyle='rgba(255,210,80,.32)'; ctx.lineWidth=2;
  if(vertical){ ctx.beginPath(); ctx.moveTo(x+w/2,y); ctx.lineTo(x+w/2,y+h); ctx.stroke(); }
  else { ctx.beginPath(); ctx.moveTo(x,y+h/2); ctx.lineTo(x+w,y+h/2); ctx.stroke(); }
}
function drawBuilding(b){
  ctx.fillStyle='#08090a'; ctx.fillRect(b.x+7,b.y+9,b.w,b.h);
  drawSprite(b.roof,b.x,b.y,b.w,b.h,0,1);
  ctx.fillStyle='rgba(10,12,14,.42)'; ctx.fillRect(b.x,b.y+b.h-18,b.w,18);
  if(b.store) drawSprite(b.store,b.x+b.w/2-32,b.y+b.h-34,64,32,0,1);
  ctx.strokeStyle='rgba(0,0,0,.7)'; ctx.lineWidth=2; ctx.strokeRect(b.x,b.y,b.w,b.h);
  ctx.strokeStyle='rgba(255,255,255,.08)'; ctx.lineWidth=1; ctx.strokeRect(b.x+4,b.y+4,b.w-8,b.h-8);
}
function drawCar(c){ drawSprite(c.type,c.x-c.w/2,c.y-c.h/2,c.w,c.h,c.rot,.82); }
function drawDecor(d){ drawSprite(d.kind,d.x,d.y,d.w,d.h,d.rot,.82); }
function drawPlayer(){
  const moving = Math.hypot(input.x+input.joyX,input.y+input.joyY)>.1;
  ctx.save(); ctx.translate(player.x,player.y); ctx.rotate(player.angle+Math.PI/2);
  ctx.globalAlpha = player.hitCooldown>0 ? .55 + Math.sin(performance.now()/35)*.35 : 1;
  if(IMG[moving?'playerWalk':'player']) ctx.drawImage(IMG[moving?'playerWalk':'player'],-16,-20,32,40); else drawHumanFallback(0,0,'#3b82f6','#f4c194');
  ctx.restore();
  // aim line
  if(!player.dead){ ctx.strokeStyle='rgba(255,212,90,.24)'; ctx.lineWidth=2; ctx.beginPath(); ctx.moveTo(player.x,player.y); ctx.lineTo(player.x+Math.cos(player.angle)*34,player.y+Math.sin(player.angle)*34); ctx.stroke(); }
}
function drawZombie(z){
  ctx.save(); ctx.translate(z.x,z.y); ctx.rotate(angleTo(z.x,z.y,player.x,player.y)+Math.PI/2);
  const scale=z.r/13;
  ctx.globalAlpha=1;
  if(IMG.zombie || IMG.gang){
    const im = z.leader ? (IMG.gang||IMG.zombie) : IMG.zombie;
    ctx.drawImage(im,-16*scale,-20*scale,32*scale,40*scale);
    ctx.globalCompositeOperation='source-atop'; ctx.fillStyle=z.flash>0?'rgba(255,255,255,.85)':(z.leader?'rgba(255,176,54,.48)':'rgba(70,220,80,.42)'); ctx.fillRect(-18*scale,-22*scale,36*scale,44*scale);
    ctx.globalCompositeOperation='source-over';
  } else drawHumanFallback(0,0,z.flash>0?'#fff':z.color,'#b8d590',scale);
  ctx.restore();
  if(z.leader){ ctx.strokeStyle='rgba(255,174,66,.45)'; ctx.lineWidth=2; ctx.beginPath(); ctx.arc(z.x,z.y,z.r+10+Math.sin(frame*.08)*3,0,Math.PI*2); ctx.stroke(); drawLabel('Leader',z.x,z.y-z.r-24); }
  // hp bar
  const pct=clamp(z.hp/z.maxHp,0,1); ctx.fillStyle='rgba(0,0,0,.65)'; ctx.fillRect(z.x-18,z.y-z.r-18,36,5); ctx.fillStyle=z.leader?'#ffae42':'#72ff92'; ctx.fillRect(z.x-18,z.y-z.r-18,36*pct,5);
}
function drawHumanFallback(x,y,shirt,skin,scale=1){
  ctx.fillStyle=shirt; ctx.fillRect(-8*scale,-8*scale,16*scale,22*scale); ctx.fillStyle=skin; ctx.fillRect(-7*scale,-18*scale,14*scale,12*scale); ctx.fillStyle='rgba(0,0,0,.8)'; ctx.fillRect(-7*scale,-21*scale,14*scale,4*scale);
}
function drawProjectile(p){ ctx.fillStyle=p.kind==='molotov'?'#ffae42':'#f7e38d'; ctx.beginPath(); ctx.arc(p.x,p.y,p.r,0,Math.PI*2); ctx.fill(); }
function drawEnemyProjectile(p){ ctx.fillStyle='#9cff72'; ctx.beginPath(); ctx.arc(p.x,p.y,p.r,0,Math.PI*2); ctx.fill(); ctx.strokeStyle='rgba(255,255,255,.4)'; ctx.stroke(); }
function drawLoot(l){
  const it=l.item, rar=rarityByKey[it.rarity]||rarityByKey.common; const bob=Math.sin(l.t*5)*2;
  ctx.fillStyle='rgba(0,0,0,.45)'; ctx.beginPath(); ctx.ellipse(l.x,l.y+11,12,5,0,0,Math.PI*2); ctx.fill();
  ctx.fillStyle=it.kind==='consumable'?(it.type==='money'?'#ffd45a':it.type==='medkit'?'#ff5c5c':'#d8d2a0'):rar.color;
  ctx.strokeStyle='rgba(0,0,0,.7)'; ctx.lineWidth=2;
  if(it.kind==='weapon'){ ctx.fillRect(l.x-12,l.y-4+bob,24,8); ctx.strokeRect(l.x-12,l.y-4+bob,24,8); }
  else if(it.kind==='armor'){ ctx.beginPath(); ctx.moveTo(l.x,l.y-12+bob); ctx.lineTo(l.x+12,l.y-2+bob); ctx.lineTo(l.x+8,l.y+12+bob); ctx.lineTo(l.x-8,l.y+12+bob); ctx.lineTo(l.x-12,l.y-2+bob); ctx.closePath(); ctx.fill(); ctx.stroke(); }
  else { ctx.beginPath(); ctx.arc(l.x,l.y+bob,9,0,Math.PI*2); ctx.fill(); ctx.stroke(); }
}
function drawEffect(e){
  const p=clamp(e.t/e.max,0,1);
  if(e.type==='corpse'){ ctx.globalAlpha=.72; drawSprite(IMG.blood2?'blood2':'blood',e.x-e.r*1.7,e.y-e.r*1.35,e.r*3.4,e.r*2.7,0,1); ctx.globalAlpha=.48; ctx.fillStyle='rgba(25,20,15,.92)'; ctx.beginPath(); ctx.ellipse(e.x,e.y,e.r*.82,e.r*1.28,.4,0,Math.PI*2); ctx.fill(); ctx.globalAlpha=1; return; }
  if(e.type==='fire'){ ctx.globalAlpha=.24*p; ctx.fillStyle='#ff5c20'; ctx.beginPath(); ctx.arc(e.x,e.y,e.r*(1.1-p*.2),0,Math.PI*2); ctx.fill(); ctx.globalAlpha=1; drawSprite('explosion',e.x-34,e.y-34,68,68,0,.7*p); return; }
  if(e.type==='firepath'){ ctx.globalAlpha=.32*p; ctx.fillStyle='#ff7a25'; ctx.beginPath(); ctx.ellipse(e.x,e.y,e.r*1.15,e.r*.72,.35,0,Math.PI*2); ctx.fill(); ctx.globalAlpha=.22*p; ctx.fillStyle='#ffe066'; ctx.beginPath(); ctx.arc(e.x,e.y,e.r*.35,0,Math.PI*2); ctx.fill(); ctx.globalAlpha=1; return; }
  if(e.type==='slash'){ ctx.strokeStyle=`rgba(255,235,140,${p})`; ctx.lineWidth=5; ctx.beginPath(); ctx.arc(e.x,e.y,e.r,e.a-.8,e.a+.8); ctx.stroke(); return; }
  ctx.globalAlpha=p; ctx.fillStyle=e.crit?'#ffae42':e.type==='hurt'?'#ff3333':'#fff'; ctx.beginPath(); ctx.arc(e.x,e.y,e.r*(1-p*.5),0,Math.PI*2); ctx.fill(); ctx.globalAlpha=1;
}
function drawVignette(){
  const g=ctx.createRadialGradient(SW/2,SH/2,Math.min(SW,SH)*.25,SW/2,SH/2,Math.max(SW,SH)*.72);
  g.addColorStop(0,'rgba(0,0,0,0)'); g.addColorStop(1,'rgba(0,0,0,.55)'); ctx.fillStyle=g; ctx.fillRect(0,0,SW,SH);
}
function drawSprite(key,x,y,w,h,rot=0,alpha=1){
  const im=IMG[key];
  if(!im){ ctx.save(); ctx.globalAlpha=alpha; ctx.fillStyle='#34383d'; ctx.fillRect(x,y,w,h); ctx.strokeStyle='rgba(255,255,255,.1)'; ctx.strokeRect(x,y,w,h); ctx.restore(); return; }
  ctx.save(); ctx.globalAlpha=alpha; ctx.translate(x+w/2,y+h/2); if(rot) ctx.rotate(rot); ctx.drawImage(im,-w/2,-h/2,w,h); ctx.restore();
}

function updateHud(){
  const hpPct=clamp(player.hp/player.maxHp,0,1), xpPct=clamp(player.xp/player.xpToNext,0,1), stPct=clamp(player.stamina/player.maxStamina,0,1);
  $('hpFill').style.width = `${hpPct*100}%`; $('hpText').textContent = `${Math.round(player.hp)} / ${player.maxHp} HP`;
  $('xpFill').style.width = `${xpPct*100}%`; $('xpText').textContent = `LV ${player.level} · ${Math.round(player.xp)} / ${player.xpToNext} XP`;
  const lifeOrb=$('lifeOrb'), lifeOrbText=$('lifeOrbText'), xpOrb=$('xpOrb'), xpOrbText=$('xpOrbText'), stamFill=$('stamFill'), stamText=$('stamText');
  if(lifeOrb){ lifeOrb.style.height=`${hpPct*100}%`; lifeOrbText.textContent=`${Math.round(player.hp)}`; }
  if(xpOrb){ xpOrb.style.height=`${xpPct*100}%`; xpOrbText.textContent=`LV ${player.level}`; }
  if(stamFill){ stamFill.style.width=`${stPct*100}%`; stamText.textContent=`STAMINA ${Math.round(player.stamina)}/${player.maxStamina}`; }
  const wep = equippedWeapon(); const def=weaponDef(wep); const ammo = def.ammoType ? `${player.ammo[def.ammoType]||0} ${def.ammoType}` : 'no ammo';
  $('hudRows').innerHTML = `<span>Weapon <b>${wep.name}</b></span><span>Power <b>${itemScore(wep)}</b></span><span>Ammo <b>${ammo}</b></span><span>Threat <b>${dangerLevel}</b></span><span>Hostiles <b>${zombies.length}</b></span><span>Money <b>$${player.money}</b></span><span>Armor <b>${player.armor}</b></span><span>Stamina <b>${Math.round(player.stamina)}</b></span><span>Area <b>${currentSafeName()}</b></span><span>Stash <b>${stash.length}</b></span>`;
}
function toast(text, cls=''){ const box=$('toast'); const el=document.createElement('div'); el.className='toast '+cls; el.textContent=text; box.prepend(el); setTimeout(()=>{el.style.opacity='0'; el.style.transform='translateX(8px)';},2600); setTimeout(()=>el.remove(),3300); }
function center(text){ const el=$('centerMsg'); el.textContent=text; el.classList.add('showCenter'); centerTimer=1.8; }

function openInventory(){ paused=true; document.body.classList.add('inventoryOpen'); renderInventory(); }
function closeInventory(){ document.body.classList.remove('inventoryOpen'); paused=false; }
function toggleInventory(){ document.body.classList.contains('inventoryOpen') ? closeInventory() : openInventory(); }
function renderSkills(){
  const panel=$('skillPanel'); if(!panel) return;
  const lvl=firepathLevel();
  panel.innerHTML = `<div class="skill firepathSkill"><div class="skillTop"><span class="skillName">Firepath</span><span class="skillLvl">${lvl}/10</span></div><div class="muted">Active skill. Press F / PATH, then sprint to draw burning ground. On mobile this replaces the bag button.</div><button data-skill="firepath" ${player.skillPoints<=0 || lvl>=10?'disabled':''}>Spend point</button></div>`;
  for(const btn of panel.querySelectorAll('button[data-skill]')) btn.addEventListener('click',()=>upgradeSkill(btn.dataset.skill));
}
function upgradeSkill(key){
  if(key!=='firepath') return;
  upgradeFirepath(false);
}
function rarityClass(it){ return it?.rarity || 'common'; }
function itemGlyph(it){
  if(!it) return '';
  if(it.kind==='weapon') return ({bat:'B',crowbar:'C',machete:'M',katana:'K',fireaxe:'A',pistol:'P',uzi:'U',shotgun:'S',molotov:'F'})[it.base] || 'W';
  if(it.kind==='armor') return ({helm:'H',vest:'V',offhand:'O',gloves:'G',boots:'T'})[it.slot] || 'A';
  if(it.kind==='accessory') return it.slot==='ring' ? '○' : '◇';
  if(it.kind==='throwable') return '✦';
  if(it.kind==='consumable') return it.type==='money'?'$':it.type==='medkit'?'+':'·';
  return '?';
}
function gridItemCell(it, origin){
  const title = it ? `${it.name}\n${slotLabel(it.slot||it.kind)} · Power ${itemScore(it)}\n${itemPowerText(it)}\n${affixText(it)}` : '';
  const shape = it?.kind==='accessory' || it?.type==='money' ? ' round' : '';
  return `<div class="item itemTile ${rarityClass(it)}${shape}" draggable="true" data-origin="${origin}" data-id="${it.id}" title="${title.replace(/"/gptgta/g,'&quot;')}"><span>${itemGlyph(it)}</span></div>`;
}
function emptyCell(origin){ return `<div class="itemCell emptyCell" data-origin="${origin}"></div>`; }
function renderGrid(items, origin, slots){
  const cells = items.slice(0, slots).map(it=>gridItemCell(it,origin));
  while(cells.length < slots) cells.push(emptyCell(origin));
  return cells.join('');
}
function findItemRef(origin,id){
  if(origin==='stash') return stash.find(i=>i.id===id) || null;
  return player.inventory.find(i=>i.id===id) || null;
}
function selectedItem(){ return selectedItemRef?.id ? findItemRef(selectedItemRef.origin, selectedItemRef.id) : null; }
function ensureSelection(){
  if(selectedItem()) return;
  if(player.inventory.length) selectedItemRef={origin:'bag',id:player.inventory[0].id};
  else if(inSafeZone() && stash.length) selectedItemRef={origin:'stash',id:stash[0].id};
  else selectedItemRef={origin:'bag',id:null};
}
function selectedItemPanel(){
  ensureSelection();
  const it=selectedItem();
  if(!it){
    return `<div class="selectedBox emptySelect"><b>Character</b><br>Level ${player.level}<br>Life ${Math.round(player.hp)} / ${player.maxHp}<br>Armor ${player.armor}<br>Money $${player.money}<br><span class="muted">Pick up loot outside town. Tap a square, then tap the other grid to move it. Desktop: drag between bag and stash.</span></div>`;
  }
  const origin=selectedItemRef.origin;
  const store = origin==='bag' && inSafeZone() ? `<button data-detail-store="${it.id}">Store</button>` : '';
  const take = origin==='stash' && inSafeZone() ? `<button data-detail-take="${it.id}">Take</button>` : '';
  const equip = it.kind!=='consumable' ? `<button data-detail-equip="${it.id}">Equip</button>` : '';
  const sell = origin==='bag' && inSafeZone() && it.kind!=='consumable' ? `<button data-detail-sell="${it.id}">Sell $${sellPrice(it)}</button>` : '';
  return `<div class="selectedBox"><div class="itemType">${slotLabel(it.slot||it.kind)} · Lv ${it.level||1}</div><div class="itemName ${it.rarity}">${it.name}</div><div class="powerLine">Power ${itemScore(it)} · ${compareText(it)}</div><div>${itemPowerText(it)}</div><div class="affixLine">${affixText(it)}</div><div class="muted">${it.desc||''}</div><div class="detailActions">${equip}${store}${take}${sell}</div></div>`;
}
function renderInventory(){
  recalcStats();
  const stats=`<div class="charStats">Level <b>${player.level}</b> · Money <b>$${player.money}</b><br>Life <b>${Math.round(player.hp)} / ${player.maxHp}</b> · Armor <b>${player.armor}</b><br>Damage <b>+${Math.round(player.damageBonus)}</b> · Crit <b>${Math.round(player.critChance*100)}%</b><br>Skill points <b>${player.skillPoints}</b></div>`;
  $('statBlock').innerHTML = stats + selectedItemPanel();
  const slotOrder=['helm','necklace','weapon','vest','offhand','gloves','ring1','ring2','boots','throwable'];
  $('slots').className='equipmentFrame';
  $('slots').innerHTML = slotOrder.map(slot=>{
    const it=player.equipped[slot];
    return `<div class="slot ${slot}" data-slot="${slot}"><div class="slotLabel">${slotLabel(slot)}</div><div class="slotIcon ${it?it.rarity:''}">${it?itemGlyph(it):''}</div><div class="slotName ${it?it.rarity:''}">${it?it.name:'empty'}</div><div class="powerLine">${it?'Pwr '+itemScore(it):''}</div></div>`;
  }).join('');
  const bag=$('bagGrid'); bag.className='grid diabloGrid'; bag.dataset.origin='bag';
  bag.innerHTML = renderGrid(player.inventory,'bag',BAG_SLOTS);
  const stashGrid=$('stashGrid');
  if(stashGrid){
    stashGrid.className='grid diabloGrid stashGrid'; stashGrid.dataset.origin='stash';
    stashGrid.innerHTML = !inSafeZone() ? '<div class="emptyBag">Stash is only available inside Ember Camp.</div>' : renderGrid(stash,'stash',STASH_SLOTS);
  }
  renderSkills();
  installInventoryGridHandlers();
  for(const btn of document.querySelectorAll('[data-detail-equip]')) btn.addEventListener('click',()=> selectedItemRef.origin==='stash'?equipStashItem(btn.dataset.detailEquip):equipItem(btn.dataset.detailEquip));
  for(const btn of document.querySelectorAll('[data-detail-store]')) btn.addEventListener('click',()=>storeItem(btn.dataset.detailStore));
  for(const btn of document.querySelectorAll('[data-detail-take]')) btn.addEventListener('click',()=>takeStashItem(btn.dataset.detailTake));
  for(const btn of document.querySelectorAll('[data-detail-sell]')) btn.addEventListener('click',()=>sellItem(btn.dataset.detailSell));
}
function installInventoryGridHandlers(){
  for(const el of document.querySelectorAll('.itemTile')){
    const id=el.dataset.id, origin=el.dataset.origin;
    el.classList.toggle('selected', selectedItemRef.id===id && selectedItemRef.origin===origin);
    el.addEventListener('click',()=>{ selectedItemRef={origin,id}; renderInventory(); });
    el.addEventListener('dblclick',()=> origin==='stash'?takeStashItem(id):equipItem(id));
    el.addEventListener('dragstart',ev=>{
      dragItemRef={origin,id};
      ev.dataTransfer.setData('text/plain', JSON.stringify(dragItemRef));
      ev.dataTransfer.effectAllowed='move';
    });
    el.addEventListener('dragend',()=>{ dragItemRef=null; });
  }
  const dropTargets=[...document.querySelectorAll('#bagGrid,#stashGrid,.emptyCell,.itemTile')];
  for(const target of dropTargets){
    target.addEventListener('dragover',ev=>{ ev.preventDefault(); ev.dataTransfer.dropEffect='move'; });
    target.addEventListener('drop',ev=>{
      ev.preventDefault();
      const to=(target.dataset.origin || target.closest('[data-origin]')?.dataset.origin || target.closest('#bagGrid,#stashGrid')?.dataset.origin);
      let ref=dragItemRef;
      try{ ref=JSON.parse(ev.dataTransfer.getData('text/plain')||'null') || ref; }catch(_){}
      if(ref&&to) moveItemToGrid(ref.origin,to,ref.id);
    });
  }
  for(const empty of document.querySelectorAll('.emptyCell')){
    empty.addEventListener('click',()=>{
      if(!selectedItemRef?.id) return;
      const to=empty.dataset.origin;
      if(to && to!==selectedItemRef.origin) moveItemToGrid(selectedItemRef.origin,to,selectedItemRef.id);
    });
  }
}
function moveItemToGrid(from,to,id){
  if(from===to || !id) return;
  if(from==='bag' && to==='stash') return storeItem(id);
  if(from==='stash' && to==='bag') return takeStashItem(id);
}

function equipItem(id){
  const idx=player.inventory.findIndex(i=>i.id===id); if(idx<0) return;
  const it=player.inventory[idx]; let slot = equipSlotForItem(it);
  if(!slot || !Object.prototype.hasOwnProperty.call(player.equipped, slot)) return;
  player.inventory.splice(idx,1);
  if(player.equipped[slot]) player.inventory.push(player.equipped[slot]);
  player.equipped[slot]=it; recalcStats(); renderInventory(); toast(`Equipped ${it.name}`, it.rarity||'good');
}
function storeItem(id){
  if(!inSafeZone()){ toast('Return to Ember Camp to use the stash.', 'bad'); return; }
  const idx=player.inventory.findIndex(i=>i.id===id); if(idx<0) return;
  if(stash.length>=STASH_SLOTS){ toast('Stash is full.', 'bad'); return; }
  const [it]=player.inventory.splice(idx,1); stash.push(it); selectedItemRef={origin:'stash',id:it.id}; renderInventory(); toast(`Stored ${it.name}`, 'good');
}
function takeStashItem(id){
  if(!inSafeZone()){ toast('Stash access is only inside Ember Camp.', 'bad'); return; }
  const idx=stash.findIndex(i=>i.id===id); if(idx<0) return;
  if(player.inventory.length>=BAG_SLOTS){ toast('Bag full.', 'bad'); return; }
  const [it]=stash.splice(idx,1); player.inventory.push(it); selectedItemRef={origin:'bag',id:it.id}; renderInventory(); toast(`Took ${it.name}`, 'good');
}
function equipStashItem(id){
  if(!inSafeZone()){ toast('Equip from stash inside Ember Camp.', 'bad'); return; }
  const idx=stash.findIndex(i=>i.id===id); if(idx<0) return;
  if(player.inventory.length>=BAG_SLOTS){ toast('Bag full. Free one slot before equipping from stash.', 'bad'); return; }
  const [it]=stash.splice(idx,1); player.inventory.push(it); equipItem(it.id);
}
function cycleWeapon(){
  const weapons = [player.equipped.weapon, ...player.inventory.filter(i=>i.kind==='weapon')].filter(Boolean);
  if(weapons.length<2) return toast('No second weapon in bag.', 'bad');
  const next = weapons[1];
  const idx = player.inventory.findIndex(i=>i.id===next.id); if(idx>=0){ player.inventory.splice(idx,1); player.inventory.push(player.equipped.weapon); player.equipped.weapon=next; recalcStats(); toast(`Swapped to ${next.name}`, next.rarity); }
}


function installTouchZoomGuards(){
  const block = e => { e.preventDefault(); };
  ['gesturestart','gesturechange','gestureend'].forEach(name => addEventListener(name, block, {passive:false}));
  addEventListener('dblclick', block, {passive:false});
  let lastTouchEnd=0;
  addEventListener('touchend', e=>{ const t=Date.now(); if(t-lastTouchEnd<360) e.preventDefault(); lastTouchEnd=t; }, {passive:false});
  addEventListener('touchmove', e=>{
    const inInventory = e.target && e.target.closest && e.target.closest('#inventory');
    if(e.touches.length>1 || !inInventory) e.preventDefault();
  }, {passive:false});
}
function setupControls(){
  installTouchZoomGuards();
  AudioSys.init();
  const audioBtn=$('audioBtn'); if(audioBtn) audioBtn.addEventListener('click', e=>{ e.preventDefault(); if(AudioSys.enabled && !AudioSys.unlocked) AudioSys.unlock(); else AudioSys.toggle(); }, {passive:false});
  addEventListener('keydown',e=>{
    unlockAudioSoon();
    const k=e.key.toLowerCase(); keys.add(k);
    if(['w','a','s','d','arrowup','arrowdown','arrowleft','arrowright',' ','i','b','r','e','q','f','c','escape'].includes(k)) e.preventDefault();
    if(k==='i'||k==='b') toggleInventory();
    if(k==='escape'){ if(document.body.classList.contains('vendorOpen')) closeVendor(); else if(document.body.classList.contains('inventoryOpen')) closeInventory(); }
    if(k==='r') startGame();
    if(k==='e') { if(!performContextAction()) campInteract(); }
    if(k==='q') throwMolotov();
    if(k==='f') activateFirepath();
    if(k==='c') cycleWeapon();
    if(k==='1') equipFirstBase('bat'); if(k==='2') equipFirstBase('pistol'); if(k==='3') equipFirstBase('uzi'); if(k==='4') equipFirstBase('shotgun'); if(k==='5' && player.equipped.throwable) { toast('Throwable ready on FIRE when equipped from bag.', 'good'); }
  }, {passive:false});
  addEventListener('keyup',e=>keys.delete(e.key.toLowerCase()), {passive:true});
  canvas.addEventListener('pointermove',e=>{ setPointerAim(e.clientX,e.clientY); }, {passive:true});
  canvas.addEventListener('pointerdown',e=>{ e.preventDefault(); unlockAudioSoon(); mouse.down=true; setPointerAim(e.clientX,e.clientY); if(gameStarted&&!paused) attack(); }, {passive:false});
  addEventListener('pointerup',()=>{ mouse.down=false; }, {passive:true});
  const startBtn = $('startBtn'); if(startBtn) startBtn.addEventListener('click', startGame);
  $('closeInv').addEventListener('click', closeInventory);
  const closeVendorBtn=$('closeVendor'); if(closeVendorBtn) closeVendorBtn.addEventListener('click', closeVendor);
  const skillBtn=$('skillBtn'); if(skillBtn) skillBtn.addEventListener('pointerdown',e=>{e.preventDefault();unlockAudioSoon();activateFirepath();});
  $('fireBtn').addEventListener('pointerdown',e=>{e.preventDefault();unlockAudioSoon(); fireHeld=true;});
  $('fireBtn').addEventListener('pointerup',()=>fireHeld=false); $('fireBtn').addEventListener('pointercancel',()=>fireHeld=false);
  $('swapBtn').addEventListener('pointerdown',e=>{e.preventDefault();unlockAudioSoon();cycleWeapon();});
  const ctxBtn=$('contextBtn'); if(ctxBtn) ctxBtn.addEventListener('pointerdown',e=>{e.preventDefault();unlockAudioSoon();performContextAction();});
  const pad=$('pad'), knob=$('knob'); let padId=null, padRect=null;
  pad.addEventListener('pointerdown',e=>{unlockAudioSoon();padId=e.pointerId; pad.setPointerCapture(padId); padRect=pad.getBoundingClientRect(); updateJoy(e, padRect, knob);});
  pad.addEventListener('pointermove',e=>{if(e.pointerId===padId) updateJoy(e,padRect,knob);});
  function endJoy(){ padId=null; input.joyX=0; input.joyY=0; knob.style.left='37px'; knob.style.top='37px'; }
  pad.addEventListener('pointerup',endJoy); pad.addEventListener('pointercancel',endJoy);
}
function updateJoy(e, r, knob){
  const cx=r.left+r.width/2, cy=r.top+r.height/2; let dx=e.clientX-cx, dy=e.clientY-cy; const m=Math.hypot(dx,dy), max=42; if(m>max){dx=dx/m*max; dy=dy/m*max;}
  input.joyX=dx/max; input.joyY=dy/max; knob.style.left=(37+dx)+'px'; knob.style.top=(37+dy)+'px';
  if(Math.hypot(input.joyX,input.joyY)>.08){ aim.angle=Math.atan2(input.joyY,input.joyX); player.angle=aim.angle; aim.pointerActive=false; }
}
function equipFirstBase(base){
  if(player.equipped.weapon?.base===base) return;
  const idx=player.inventory.findIndex(i=>i.kind==='weapon'&&i.base===base);
  if(idx>=0) equipItem(player.inventory[idx].id);
}

function seedDepot(){
  stash.push(makeItem('weapon',1));
  stash.push(makeItem('armor',1));
  stash.push(makeItem('accessory',1));
}
function startGame(){
  const boot = $('boot'); if(boot) boot.style.display='none'; gameStarted=true; paused=false; resetPlayer(); vehicle=null; stash=[]; seedDepot(); generateShopStock(); zombies=[]; projectiles=[]; enemyProjectiles=[]; loot=[]; effects=[]; kills=0; dangerLevel=1; spawnTimer=1.5; packSerial=0; for(let i=0;i<4;i++) spawnPack(Math.random()<.25); center('EMBER CAMP'); toast('Firepath replaces Bag on mobile. Stash uses tap-move or drag/drop.', 'good'); renderInventory(); updateHud(); updateContextUI(); updateSkillButton();
}
function loop(t){
  const ts=t/1000; const dt=Math.min(.033, ts-(last||ts)); last=ts;
  if(aim.pointerActive && (mouse.x||mouse.y)){ mouse.worldX=camera.x+mouse.x/viewScale(); mouse.worldY=camera.y+mouse.y/viewScale(); }
  update(dt); drawFrameOnly();
}
function drawFrameOnly(){
  ctx.fillStyle='#0b0d0e'; ctx.fillRect(0,0,SW,SH);
  ctx.save(); const s=viewScale(); ctx.scale(s,s); ctx.translate(-camera.x,-camera.y);
  drawMap();
  for(const l of loot) drawLoot(l);
  for(const p of projectiles) drawProjectile(p);
  for(const p of enemyProjectiles) drawEnemyProjectile(p);
  for(const e of effects.filter(e=>e.type==='corpse'||e.type==='fire'||e.type==='firepath')) drawEffect(e);
  for(const z of zombies) drawZombie(z);
  drawPlayer();
  for(const e of effects.filter(e=>e.type!=='corpse'&&e.type!=='fire'&&e.type!=='firepath')) drawEffect(e);
  ctx.restore(); drawVignette();
  requestAnimationFrame(loop);
}

loadAssets().then(()=>{
  makeMap(); setupControls(); startGame();
  camera.x=clamp(player.x-viewWorldW()/2,0,Math.max(0,WORLD.w-viewWorldW()));
  camera.y=clamp(player.y-viewWorldH()/2,0,Math.max(0,WORLD.h-viewWorldH()));
  updateHud(); requestAnimationFrame(loop);
}).catch(err=>{
  showBootError(err);
  try{ makeMap(); setupControls(); startGame(); updateHud(); requestAnimationFrame(loop); }catch(e){ showBootError(e); }
});

})();
