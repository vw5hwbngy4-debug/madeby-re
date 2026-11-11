// LUNA EDIT SURFACE: encounter variety only.
// Keep this file pure: no DOM, THREE, network, storage, assets, or game-source duplication.

export const KLOOJO_PLAYER_SPAWNS=Object.freeze([
 {id:'CITY_START',pos:[0,.2,25],yaw:Math.PI,difficulty:1},
 {id:'PIPE_DROP',pos:[-43,.15,8],yaw:Math.PI,difficulty:2},
 {id:'RUNNER_FINISH',pos:[29,8.4,-42],yaw:Math.PI,difficulty:4}
]);

export const KLOOJO_BAG_SPAWNS=Object.freeze([
 {id:'START_PLAZA',pos:[0,.58,25],difficulty:1},
 {id:'CENTER_LINE',pos:[0,.58,8],difficulty:1},
 {id:'WEST_STREET',pos:[-44,.58,22],difficulty:2},
 {id:'EAST_STREET',pos:[44,.58,22],difficulty:2},
 {id:'NORTH_APPROACH',pos:[0,.58,43],difficulty:2},
 {id:'SOUTH_APPROACH',pos:[0,.58,-25],difficulty:2},
 {id:'FENCE_TOP',pos:[0,5.72,56],difficulty:3},
 {id:'RUNNER_START',pos:[30,8.04,-42],difficulty:3},
 {id:'CLIMB_TOP',pos:[42,7.62,-12],difficulty:4},
 {id:'RUNNER_FINISH',pos:[-26,8.04,-42],difficulty:4},
 {id:'ORIGINAL_TABLE',pos:[-52,5.74,46],difficulty:5}
]);

export const CHALLENGE_POLICY=Object.freeze({
 schema:'kys.encounter.v2',
 difficulty:[1,5],
 introMs:1000,
 untimedChance:.27,
 noRespawn:{minimumDifficulty:5,chance:.55},
 // cumulative probability bands; change these to alter feed mix without touching the game kernel.
 families:[
  {type:'bag',until:.22},
  {type:'graffiti',until:.44},
  {type:'coins',until:.64},
  {type:'combo',until:.80},
  {type:'score',until:.91},
  {type:'speed',until:1}
 ]
});

function hash(input=''){let h=2166136261>>>0;for(const c of String(input)){h^=c.charCodeAt(0);h=Math.imul(h,16777619)}return h>>>0}
function random(seed){let a=hash(seed);return()=>{a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
function shuffle(items,seed){const out=items.slice(),rnd=random(seed);for(let i=out.length-1;i>0;i--){const j=Math.floor(rnd()*(i+1));[out[i],out[j]]=[out[j],out[i]]}return out}
function chooseAllowed(list,difficulty,seed){const allowed=list.filter(x=>(x.difficulty||1)<=difficulty);return shuffle(allowed.length?allowed:list,seed)[0]}
function clampDifficulty(value,rnd){const [min,max]=CHALLENGE_POLICY.difficulty;return Math.max(min,Math.min(max,Number(value)||min+Math.floor(rnd()*(max-min+1))))}
function familyFor(value){return CHALLENGE_POLICY.families.find(f=>value<f.until)?.type||'speed'}

export function graffitiDifficulty(id,requiresWallRide=false){
 if(requiresWallRide||id==='RUNNER_HIGH_WALL')return 5;
 if(id==='CLIMB_TOP_FLOOR_TAG')return 4;
 if(['RUNNER_WHITE_RADIO_FLOOR','RUNNER_START_FLOOR_TAG','WALLJUMP_BLUE_SIDE'].includes(id))return 3;
 if(['WALLJUMP_RED_SIDE','RUNNER_HIDEOUT','FENCE_N_LEFT'].includes(id))return 2;
 return 1;
}

export function generateKloojoEncounterFromCatalog({seed=Date.now(),requestedDifficulty=null,graffiti=[],coins=[]}={}){
 const seedString=String(seed),rnd=random(seedString),difficulty=clampDifficulty(requestedDifficulty,rnd);
 const type=familyFor(rnd()),timed=rnd()>=CHALLENGE_POLICY.untimedChance;
 const playerSpawn=chooseAllowed(KLOOJO_PLAYER_SPAWNS,difficulty,seedString+':player');
 const base={
  schema:CHALLENGE_POLICY.schema,seed:seedString,type,difficulty,introMs:CHALLENGE_POLICY.introMs,
  leaderboard:{metric:'elapsedMs',direction:'asc'},setup:{playerSpawn:playerSpawn.id},
  constraints:{noRespawn:difficulty>=CHALLENGE_POLICY.noRespawn.minimumDifficulty&&rnd()<CHALLENGE_POLICY.noRespawn.chance}
 };
 const allowedGraffiti=graffiti.filter(g=>graffitiDifficulty(g.id,g.requiresWallRide)<=difficulty);
 const graffitiPool=allowedGraffiti.length?allowedGraffiti:graffiti;
 if(type==='bag'){
  const bag=chooseAllowed(KLOOJO_BAG_SPAWNS,difficulty,seedString+':bag');
  return {...base,title:'GET THE SECRET BAG!',subtitle:base.constraints.noRespawn?'NO BAILS. FIND IT.':'THE BAG MOVED. FIND IT.',timeLimitMs:timed?Math.round((26+bag.difficulty*9-difficulty*2)*1000):null,setup:{...base.setup,bagSpawn:bag.id},objectives:[{id:'bag',type:'event_count',event:'bag.collected',target:1}]};
 }
 if(type==='graffiti'){
  const count=Math.min(1+difficulty,2+Math.floor(rnd()*4),graffitiPool.length),ids=shuffle(graffitiPool.map(g=>g.id),seedString+':graffiti').slice(0,count);
  return {...base,title:`TAG ${count} GRAFFITI!`,subtitle:base.constraints.noRespawn?'FOLLOW THE CYAN SIGNALS · NO BAILS':'FOLLOW THE CYAN SIGNALS',timeLimitMs:timed?Math.round((32+count*18+difficulty*5)*1000):null,setup:{...base.setup,graffitiIds:ids,shuffleGraffitiArt:true},objectives:[{id:'tags',type:'event_count',event:'graffiti.tagged',target:count}]};
 }
 if(type==='coins'){
  const count=Math.min(3+difficulty*2,coins.length),ids=shuffle(coins.map(c=>c.id),seedString+':coins').slice(0,count);
  return {...base,title:`GET ${count} COINS!`,subtitle:base.constraints.noRespawn?'ONE RUN · NO BAILS':'CHASE THE ACTIVE COIN LINE',timeLimitMs:timed?Math.round((24+count*3.8+difficulty*3)*1000):null,setup:{...base.setup,coinIds:ids},objectives:[{id:'coins',type:'event_count',event:'coin.collected',target:count}]};
 }
 if(type==='score'){
  const target=1200+difficulty*650;
  return {...base,title:`SCORE ${target}!`,subtitle:base.constraints.noRespawn?'TRICKS, TAGS, COINS · NO BAILS':'ANY KLOOJO MECHANIC COUNTS',timeLimitMs:timed?Math.round((42+difficulty*6)*1000):null,objectives:[{id:'score',type:'metric',metric:'scoreDelta',target}]};
 }
 if(type==='speed'){
  const target=24+difficulty*6;
  return {...base,title:`HIT ${target} KM/H!`,subtitle:base.constraints.noRespawn?'FIND A FAST LINE · NO BAILS':'RAMPS, RAILS OR STREET — YOUR CALL',timeLimitMs:timed?Math.round((28+difficulty*5)*1000):null,objectives:[{id:'speed',type:'metric',metric:'maxSpeedKmh',target}]};
 }
 const graffitiCount=Math.min(1+Math.floor(difficulty/2),4,graffitiPool.length),graffitiIds=shuffle(graffitiPool.map(g=>g.id),seedString+':combo-tags').slice(0,graffitiCount),bag=chooseAllowed(KLOOJO_BAG_SPAWNS,difficulty,seedString+':combo-bag');
 return {...base,title:`GET THE BAG + TAG ${graffitiCount}!`,subtitle:'TWO OBJECTIVES. ANY ORDER.',timeLimitMs:timed?Math.round((50+graffitiCount*18+bag.difficulty*8)*1000):null,setup:{...base.setup,bagSpawn:bag.id,graffitiIds,shuffleGraffitiArt:true},objectives:[{id:'bag',type:'event_count',event:'bag.collected',target:1},{id:'tags',type:'event_count',event:'graffiti.tagged',target:graffitiCount}]};
}
