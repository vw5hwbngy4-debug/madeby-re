export const WORLD_STATE_KEY='KLOOJO_WORLD_STATE';
export const SCHEMA_VERSION=3;
export const CANONICAL_EQUIPMENT_KEYS=['hair','hats','accessories','top','bottom','skates','soles','laces'];

export function defaultWorldState(){return{
  schemaVersion:SCHEMA_VERSION,
  player:{name:'PLAYER 01',score:0,equipment:Object.fromEntries(CANONICAL_EQUIPMENT_KEYS.map(k=>[k,0])),currentZone:'development',entryGate:'default'},
  progression:{discoveredDistricts:['development']},
  zones:{development:{coins:[],graffiti:[],runnerBags:[],secrets:{}},runtimeTest:{graffiti:[],secrets:{}}},
  transition:null,updatedAt:0
}}
const object=v=>v&&typeof v==='object'&&!Array.isArray(v)?v:{};
const strings=v=>Array.isArray(v)?v.filter(x=>typeof x==='string'):[];
const finite=(v,f=0)=>Number.isFinite(Number(v))?Number(v):f;
export function migrateWorldState(input){const base=defaultWorldState(),raw=object(input),p=object(raw.player),zones=object(raw.zones),dev=object(zones.development),test=object(zones.runtimeTest),oldEquipment=object(p.equipment),equipment={};for(const key of CANONICAL_EQUIPMENT_KEYS)equipment[key]=Math.max(0,Math.floor(finite(oldEquipment[key],0)));const discovered=strings(object(raw.progression).discoveredDistricts).filter(z=>z==='development'||z==='runtimeTest');if(!discovered.includes('development'))discovered.unshift('development');return{
  schemaVersion:SCHEMA_VERSION,
  player:{name:(typeof p.name==='string'?p.name:base.player.name).slice(0,16),score:Math.max(0,finite(p.score)),equipment,currentZone:p.currentZone==='runtimeTest'?'runtimeTest':'development',entryGate:typeof p.entryGate==='string'?p.entryGate:'default'},
  progression:{discoveredDistricts:discovered},
  zones:{development:{coins:strings(dev.coins),graffiti:strings(dev.graffiti),runnerBags:strings(dev.runnerBags),secrets:object(dev.secrets)},runtimeTest:{graffiti:strings(test.graffiti),secrets:object(test.secrets)}},
  transition:raw.transition&&typeof raw.transition==='object'?raw.transition:null,updatedAt:finite(raw.updatedAt)
}}
export class LocalWorldStore{constructor(storage=globalThis.localStorage){this.storage=storage}load(){try{const raw=this.storage?.getItem(WORLD_STATE_KEY),state=migrateWorldState(raw?JSON.parse(raw):null);this.save(state);return state}catch(error){console.warn('[KLOOJO] Recovered malformed world state.',error);const state=defaultWorldState();try{this.save(state)}catch{}return state}}save(input){const state=migrateWorldState(input);state.updatedAt=Date.now();this.storage?.setItem(WORLD_STATE_KEY,JSON.stringify(state));return state}update(mutator){const state=this.load();mutator(state);return this.save(state)}clear(){this.storage?.removeItem(WORLD_STATE_KEY)}}
export const worldStore=new LocalWorldStore();

