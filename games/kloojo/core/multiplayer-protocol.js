import {REMOTE_MOVEMENT_STATES,SOCIAL_APPEARANCE_FIELDS} from './social-presence.js';

export const ROOM_CODE_PATTERN=/^[A-Z2-9]{4,6}$/;
export const MOVEMENT_STATES=new Set(REMOTE_MOVEMENT_STATES);
export const WORLD_ACTION_KINDS=new Set(['coinCollect','graffitiPlace']);
export const DEFAULT_APPEARANCE=Object.freeze({avatarVariant:'canonical-default',hair:'canonical-default',mask:'none',top:'canonical-default',bottom:'canonical-default',backAccessory:'none',skates:'canonical-default',wheelStyle:'canonical-default',trail:'none'});
export const MAX_PACKET_BYTES=16*1024;
export const MAX_WORLD_ITEMS=512;

export function normalizeRoomCode(value=''){return String(value).toUpperCase().replace(/[^A-Z2-9]/g,'').slice(0,6)}
export function validRoomCode(value){return ROOM_CODE_PATTERN.test(String(value).toUpperCase())}
export function createRoomCode(random=Math.random,length=4){const alphabet='ABCDEFGHJKLMNPQRSTUVWXYZ23456789';let out='';for(let i=0;i<length;i++)out+=alphabet[Math.floor(random()*alphabet.length)%alphabet.length];return out}
export function cleanNetworkName(value='PLAYER 01'){return String(value).replace(/[^a-zA-Z0-9 _-]/g,'').trim().slice(0,16).toUpperCase()||'PLAYER 01'}
export function relayUrlFromLocation(locationLike,override=''){if(override){const url=new URL(override,locationLike.href);if(!['ws:','wss:'].includes(url.protocol))throw new Error('Relay URL must use ws:// or wss://');return url.href}const hostname=String(locationLike.hostname||String(locationLike.host||'').split(':')[0]).toLowerCase();if(hostname==='kloojo.com'||hostname==='www.kloojo.com')return 'wss://multiplayer.kloojo.com/kloojo-ws';const protocol=locationLike.protocol==='https:'?'wss:':'ws:';return `${protocol}//${locationLike.host}/kloojo-ws`}
export function cleanNetworkId(value=''){return String(value||'').replace(/[^a-zA-Z0-9_-]/g,'').slice(0,64)}
export function cleanWorldItemId(value=''){return String(value||'').replace(/[^a-zA-Z0-9_:\-.]/g,'').slice(0,96)}
const finiteNumber=(value,limit=10000)=>Math.max(-limit,Math.min(limit,Number.isFinite(Number(value))?Number(value):0));
export function sanitizeAppearance(raw={}){return{...DEFAULT_APPEARANCE,...Object.fromEntries(SOCIAL_APPEARANCE_FIELDS.map(key=>[key,cleanNetworkId(raw?.[key]||DEFAULT_APPEARANCE[key])]))}}
export function sanitizeProfile(raw={}){return{playerName:cleanNetworkName(raw.playerName),appearance:sanitizeAppearance(raw.appearance),revision:Math.max(1,Math.floor(finiteNumber(raw.revision??raw.profileRevision??1,Number.MAX_SAFE_INTEGER)))}}
export function sanitizeMovement(raw={}){const position=Array.isArray(raw.position)?raw.position:[0,0,0],velocity=Array.isArray(raw.velocity)?raw.velocity:[0,0,0];return{zoneId:raw.zoneId==='runtimeTest'?'runtimeTest':'development',position:[finiteNumber(position[0]),finiteNumber(position[1]),finiteNumber(position[2])],rotation:finiteNumber(raw.rotation,Math.PI*8),velocity:[finiteNumber(velocity[0],200),finiteNumber(velocity[1],200),finiteNumber(velocity[2],200)],movementState:MOVEMENT_STATES.has(raw.movementState)?raw.movementState:'idle',sequence:Math.max(0,Math.floor(finiteNumber(raw.sequence,Number.MAX_SAFE_INTEGER))),sentAt:Math.max(0,finiteNumber(raw.sentAt,Number.MAX_SAFE_INTEGER))}}
export function sanitizePresence(raw={}){const profile=sanitizeProfile(raw.profile||raw),movement=sanitizeMovement(raw.state||raw);return{playerId:cleanNetworkId(raw.playerId),sessionId:cleanNetworkId(raw.sessionId),roomId:normalizeRoomCode(raw.roomId),...profile,profileRevision:profile.revision,...movement}}
export function sanitizeWorldAction(raw={}){const kind=WORLD_ACTION_KINDS.has(raw.kind)?raw.kind:'',itemId=cleanWorldItemId(raw.itemId),zoneId=raw.zoneId==='runtimeTest'?'runtimeTest':'development';return{kind,itemId,zoneId}}
export function sanitizeWorldSnapshot(raw={}){const coins=Array.isArray(raw.coins)?raw.coins.map(cleanWorldItemId).filter(Boolean).slice(0,MAX_WORLD_ITEMS):[],graffiti=Array.isArray(raw.graffiti)?raw.graffiti.map(cleanWorldItemId).filter(Boolean).slice(0,MAX_WORLD_ITEMS):[];return{coins:[...new Set(coins)],graffiti:[...new Set(graffiti)]}}
