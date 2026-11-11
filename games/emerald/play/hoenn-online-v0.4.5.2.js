/* Emerald · MadeBy Secret Base core v0.3
 * Pure deterministic Emerald save/social codec shared by browser and server tests.
 * BPEE rev0 only. No network or emulator ownership here.
 */
export const CORE_VERSION='0.3.0';
export const SCHEMA='hoenn.online.secret-base';
export const ROM_GAME_CODE='BPEE';
export const ROM_SHA1='f3ae088181bf583e55daf962a92bb46f4f1d07b7';
export const SAVE_SIZE=0x20000, RTC_FOOTER_SIZE=16, SECTOR_SIZE=0x1000, SLOT_SECTORS=14;
export const SECTOR_SIGNATURE=0x08012025;
export const SECTION_SIZES={0:0xF2C,1:0xF80,2:0xF80,3:0xF80,4:0xF08,5:0xF80,6:0xF80,7:0xF80,8:0xF80,9:0xF80,10:0xF80,11:0xF80,12:0xF80,13:0x7D0};
export const SAVEBLOCK1_SIZE=0x3D88;
export const SECRET_BASES_OFFSET=0x1A9C, SECRET_BASE_COUNT=20, SECRET_BASE_SIZE=0xA0;
export const TV_SHOWS_OFFSET=0x27CC, TV_SHOW_COUNT=25, TV_SHOW_SIZE=0x24, TVSHOW_SECRET_BASE_SECRETS=38;
export const VARS_OFFSET=0x139C;
export const VAR_CURRENT_SECRET_BASE=0x4054, VAR_SECRET_BASE_STEP_COUNTER=0x40EC, VAR_SECRET_BASE_LAST_ITEM_USED=0x40ED, VAR_SECRET_BASE_LOW_TV_FLAGS=0x40EE, VAR_SECRET_BASE_HIGH_TV_FLAGS=0x40EF, VAR_SECRET_BASE_IS_NOT_LOCAL=0x40F0;
export const SECRET_BASE_BATTLED_WON=1<<11, SECRET_BASE_BATTLED_LOST=1<<12, SECRET_BASE_DECLINED_BATTLE=1<<13, SECRET_BASE_BATTLED_DRAW=1<<0;
export const PROVENANCE_STATES=['VERIFIED_NATIVE','NETWORK_GIFT','HISTORICAL_EVENT','TRANSFERRED','UNKNOWN','SANDBOX_OR_MODIFIED'];
export const AVATAR_NAMES=['Youngster','Bug Catcher','Rich Boy','Camper','Man','Lass','Girl','Woman','Picnicker','Woman variant'];
const VALID_LOCATION_IDS=new Set([1,2,3,11,12,13,21,22,23,31,32,33,41,42,43,51,52,53,61,62,63,71,72,73,81,82,83,91,92,93,101,102,103,111,112,113,121,122,123,131,132,133,141,142,143,151,152,153,161,162,163,164,171,172,173,174,181,182,183,191,192,193,201,202,203,204,211,212,213,221,222,223,231,232,233]);
const ORDERS=[[0,1,2,3],[0,1,3,2],[0,2,1,3],[0,3,1,2],[0,2,3,1],[0,3,2,1],[1,0,2,3],[1,0,3,2],[2,0,1,3],[3,0,1,2],[2,0,3,1],[3,0,2,1],[1,2,0,3],[1,3,0,2],[2,1,0,3],[3,1,0,2],[2,3,0,1],[3,2,0,1],[1,2,3,0],[1,3,2,0],[2,1,3,0],[3,1,2,0],[2,3,1,0],[3,2,1,0]];
const SB={ID:0x00,FLAGS:0x01,NAME:0x02,TID:0x09,LANG:0x0D,RECEIVED:0x0E,ENTERED:0x10,UNUSED:0x11,DECOR:0x12,POS:0x22,PADDING:0x32,PARTY:0x34};
const P={PERSONALITY:0x34,MOVES:0x4C,SPECIES:0x7C,ITEMS:0x88,LEVELS:0x94,EVS:0x9A};
const NUM_DECORATIONS=120, NUM_SPECIES=412, MOVES_COUNT=355, ITEMS_COUNT=377, MAX_SECRET_BASE_AVG_EV=85;
const SB1_PLAYER_PARTY=0x238, POKEMON_SIZE=100, PARTY_LEVEL_OFFSET=84;

export class HoennSaveError extends Error{constructor(message,code='HOENN_SAVE_ERROR'){super(message);this.name='HoennSaveError';this.code=code}}
function asU8(v){if(v instanceof Uint8Array)return new Uint8Array(v);if(v instanceof ArrayBuffer)return new Uint8Array(v);if(ArrayBuffer.isView(v))return new Uint8Array(v.buffer,v.byteOffset,v.byteLength);if(typeof Buffer!=='undefined'&&Buffer.isBuffer?.(v))return new Uint8Array(v);throw new HoennSaveError('expected byte buffer')}
function u16(b,o){return (b[o]|(b[o+1]<<8))>>>0} function u32(b,o){return (b[o]|(b[o+1]<<8)|(b[o+2]<<16)|(b[o+3]<<24))>>>0}
function put16(b,o,v){b[o]=v&255;b[o+1]=(v>>>8)&255} function put32(b,o,v){b[o]=v&255;b[o+1]=(v>>>8)&255;b[o+2]=(v>>>16)&255;b[o+3]=(v>>>24)&255}
function hex(b){return [...b].map(x=>x.toString(16).padStart(2,'0')).join('')}
function fromHex(s){if(typeof s!=='string'||s.length%2)throw new HoennSaveError('invalid hex');const b=new Uint8Array(s.length/2);for(let i=0;i<b.length;i++)b[i]=parseInt(s.slice(i*2,i*2+2),16);return b}
function bytesEqual(a,b){if(!a||!b||a.length!==b.length)return false;for(let i=0;i<a.length;i++)if(a[i]!==b[i])return false;return true}
export async function sha256(bytes){const b=asU8(bytes);if(globalThis.crypto?.subtle){const h=await crypto.subtle.digest('SHA-256',b);return hex(new Uint8Array(h))}const {createHash}=await import('node:crypto');return createHash('sha256').update(b).digest('hex')}
export function decodeGen3Text(data){let out='';for(const c of data){if(c===0xFF)break;if(c===0){out+=' ';continue}if(c>=0xBB&&c<=0xD4)out+=String.fromCharCode(65+c-0xBB);else if(c>=0xD5&&c<=0xEE)out+=String.fromCharCode(97+c-0xD5);else if(c>=0xA1&&c<=0xAA)out+=String.fromCharCode(48+c-0xA1);else if(c===0xAB)out+='!';else if(c===0xAC)out+='?';else if(c===0xB4)out+="'";else if(c===0xB8)out+=',';else if(c===0xBA)out+='/';else out+='·'}return out.replace(/·+$/,'').trim()}
function checksum(data,size){let total=0>>>0;for(let o=0;o<size;o+=4)total=(total+u32(data,o))>>>0;return (((total>>>16)+total)&0xffff)>>>0}
function counterNewer(a,b){if(a===b)return false;if(a===0&&b===0xffffffff)return true;if(b===0&&a===0xffffffff)return false;return a>b}
function varOffset(id){return VARS_OFFSET+(id-0x4000)*2}
function getVar(sb1,id){return u16(sb1,varOffset(id))}

export class EmeraldSave{
  constructor(raw,{requireBothSlots=false}={}){
    this.raw=asU8(raw);if(![SAVE_SIZE,SAVE_SIZE+RTC_FOOTER_SIZE].includes(this.raw.length))throw new HoennSaveError(`unsupported save size ${this.raw.length}`,'BAD_SIZE');
    this.slots=[this.#parseSlot(0),this.#parseSlot(1)];const valid=this.slots.filter(x=>x.valid);if(!valid.length)throw new HoennSaveError('no valid Emerald save slot','NO_VALID_SLOT');
    if(requireBothSlots&&valid.length!==2)throw new HoennSaveError('both normal save slots must validate before mutation','DEGRADED_SAVE');
    if(valid.length===1)this.activeSlot=valid[0].slot;else this.activeSlot=counterNewer(this.slots[1].counter,this.slots[0].counter)?1:0;
  }
  #parseSlot(slot){const sectors=new Map(),errors=[];let counter=null;for(let p=slot*SLOT_SECTORS;p<(slot+1)*SLOT_SECTORS;p++){const base=p*SECTOR_SIZE,id=u16(this.raw,base+0xff4),stored=u16(this.raw,base+0xff6),sig=u32(this.raw,base+0xff8),ctr=u32(this.raw,base+0xffc);if(!(id in SECTION_SIZES)){errors.push(`physical ${p}: invalid logical id ${id}`);continue}const exp=checksum(this.raw.subarray(base,base+SECTOR_SIZE),SECTION_SIZES[id]);if(sectors.has(id))errors.push(`duplicate logical ${id}`);if(sig!==SECTOR_SIGNATURE)errors.push(`section ${id}: signature`);if(stored!==exp)errors.push(`section ${id}: checksum`);if(counter===null)counter=ctr;else if(counter!==ctr)errors.push('inconsistent counters');sectors.set(id,{physical:p,logicalId:id,counter:ctr,stored,expected:exp,valid:sig===SECTOR_SIGNATURE&&stored===exp})}for(let i=0;i<14;i++)if(!sectors.has(i))errors.push(`missing logical ${i}`);return{slot,valid:errors.length===0&&sectors.size===14,counter,sectors,errors}}
  section(id,slot=this.activeSlot){const inf=this.slots[slot].sectors.get(id);if(!inf)throw new HoennSaveError(`missing section ${id}`);const base=inf.physical*SECTOR_SIZE;return this.raw.slice(base,base+SECTION_SIZES[id])}
  saveblock2(){return this.section(0)}
  saveblock1(){const out=new Uint8Array(SAVEBLOCK1_SIZE);let cursor=0;for(let id=1;id<=4;id++){const s=this.section(id);const n=Math.min(s.length,out.length-cursor);out.set(s.subarray(0,n),cursor);cursor+=n}return out}
  trainerIdentity(){const b=this.saveblock2(),name=b.slice(0,7),tid=b.slice(0x0A,0x0E);return{trainer_name:decodeGen3Text(name),trainer_name_hex:hex(name),gender:b[8],trainer_id_hex:hex(tid),trainer_id_full:u32(tid,0),trainer_id_public:u16(tid,0),trainer_id_secret:u16(tid,2)}}
  secretBase(i){if(i<0||i>=20)throw new HoennSaveError('Secret Base index out of range');const sb1=this.saveblock1(),o=SECRET_BASES_OFFSET+i*SECRET_BASE_SIZE;return sb1.slice(o,o+SECRET_BASE_SIZE)}
  allSecretBases(){return Array.from({length:20},(_,i)=>this.secretBase(i))}
  replaceSecretBase(i,record){if(i===0)throw new HoennSaveError('recipient own base invariant');if(record.length!==160)throw new HoennSaveError('record must be 160 bytes');return this.rewriteSb1(SECRET_BASES_OFFSET+i*160,record)}
  rewriteSb1(offset,payload){const before=this.saveblock1(),after=before.slice();after.set(payload,offset);const changed=[];let cur=0;for(let id=1;id<=4;id++){const size=SECTION_SIZES[id],a=before.slice(cur,cur+size),b=after.slice(cur,cur+size);if(!bytesEqual(a,b)){const inf=this.slots[this.activeSlot].sectors.get(id),base=inf.physical*SECTOR_SIZE;this.raw.set(b,base);put16(this.raw,base+0xff6,checksum(b,size));changed.push(id)}cur+=size}this.slots[this.activeSlot]=this.#parseSlot(this.activeSlot);if(!this.slots[this.activeSlot].valid)throw new HoennSaveError('post-write save validation failed');return changed}
  bytes(){return this.raw.slice()}
}

export function recordFlags(r){const f=r[SB.FLAGS];return{to_register:f&15,gender:(f>>>4)&1,battled_owner_today:(f>>>5)&1,registry_status:(f>>>6)&3}}
function setFlags(r,{toRegister,gender,battled,registry}={}){let f=r[SB.FLAGS];if(toRegister!==undefined)f=(f&0xf0)|(toRegister&15);if(gender!==undefined)f=(f&~0x10)|((gender&1)<<4);if(battled!==undefined)f=(f&~0x20)|((battled&1)<<5);if(registry!==undefined)f=(f&~0xc0)|((registry&3)<<6);r[SB.FLAGS]=f}
export function ownerKey(record){const f=recordFlags(record);return `${hex(record.slice(SB.NAME,SB.NAME+7))}:${hex(record.slice(SB.TID,SB.TID+4))}:${f.gender}`}
function sameOwner(a,b){return ownerKey(a)===ownerKey(b)}
export function vanillaAvatarIndex(record){const f=recordFlags(record);return (record[SB.TID]%5)+(f.gender*5)}
export function summarizeRecord(r){const f=recordFlags(r),party=[];for(let i=0;i<6;i++)party.push({species:u16(r,P.SPECIES+i*2),level:r[P.LEVELS+i],held_item:u16(r,P.ITEMS+i*2),personality:u32(r,P.PERSONALITY+i*4),moves:[0,1,2,3].map(j=>u16(r,P.MOVES+(i*4+j)*2)),average_ev:r[P.EVS+i]});return{secret_base_id:r[SB.ID],trainer_name:decodeGen3Text(r.slice(SB.NAME,SB.NAME+7)),trainer_name_hex:hex(r.slice(SB.NAME,SB.NAME+7)),trainer_id_hex:hex(r.slice(SB.TID,SB.TID+4)),language:r[SB.LANG],...f,num_secret_bases_received:u16(r,SB.RECEIVED),num_times_entered:r[SB.ENTERED],decorations:[...r.slice(SB.DECOR,SB.DECOR+16)],decoration_positions:[...r.slice(SB.POS,SB.POS+16)],party,vanilla_avatar_index:vanillaAvatarIndex(r),vanilla_avatar_name:AVATAR_NAMES[vanillaAvatarIndex(r)]}}
export function validateRecord(r,{requireLocation=true}={}){r=asU8(r);if(r.length!==160)throw new HoennSaveError('Secret Base record must be 160 bytes');const id=r[SB.ID];if(requireLocation&&!id)throw new HoennSaveError('Secret Base has no location');if(id&&!VALID_LOCATION_IDS.has(id))throw new HoennSaveError(`invalid native Secret Base id ${id}`);const f=recordFlags(r);if(f.registry_status===3)throw new HoennSaveError('invalid registryStatus=3');for(let i=0;i<16;i++)if(r[SB.DECOR+i]>NUM_DECORATIONS)throw new HoennSaveError(`invalid decoration ${r[SB.DECOR+i]}`);for(let i=0;i<6;i++){const sp=u16(r,P.SPECIES+i*2),it=u16(r,P.ITEMS+i*2),lv=r[P.LEVELS+i],ev=r[P.EVS+i],per=u32(r,P.PERSONALITY+i*4),moves=[0,1,2,3].map(j=>u16(r,P.MOVES+(i*4+j)*2));if(sp>=NUM_SPECIES)throw new HoennSaveError(`invalid species ${sp}`);if(it>=ITEMS_COUNT)throw new HoennSaveError(`invalid item ${it}`);if(moves.some(m=>m>=MOVES_COUNT))throw new HoennSaveError('invalid move');if(ev>MAX_SECRET_BASE_AVG_EV)throw new HoennSaveError('invalid average EV');if(sp===0&&(per||it||lv||ev||moves.some(Boolean)))throw new HoennSaveError('nonzero empty party slot');if(sp!==0&&(lv<1||lv>100))throw new HoennSaveError('invalid level')}return true}
function decodeBoxMon(raw){const personality=u32(raw,0),otid=u32(raw,4),stored=u16(raw,28);if(!personality&&!otid&&!stored)return null;const key=(personality^otid)>>>0,dec=new Uint8Array(48);for(let i=0;i<12;i++)put32(dec,i*4,(u32(raw,32+i*4)^key)>>>0);let sum=0;for(let i=0;i<24;i++)sum=(sum+u16(dec,i*2))&0xffff;if(sum!==stored)throw new HoennSaveError('Pokemon checksum mismatch');const order=ORDERS[personality%24],block=n=>dec.slice(order[n]*12,order[n]*12+12),g=block(0),a=block(1),e=block(2),m=block(3),iv=u32(m,4);return{personality,species:u16(g,0),held_item:u16(g,2),moves:[0,1,2,3].map(i=>u16(a,i*2)),evs:[...e.slice(0,6)],is_egg:!!((iv>>>30)&1)}}
export function refreshRecordedParty(record,sb1){const out=asU8(record);if(!out[0])return out;out.fill(0,P.PERSONALITY,P.PERSONALITY+24);out.fill(0,P.MOVES,P.MOVES+48);out.fill(0,P.SPECIES,P.SPECIES+12);out.fill(0,P.ITEMS,P.ITEMS+12);out.fill(0,P.LEVELS,P.LEVELS+6);out.fill(0,P.EVS,P.EVS+6);let k=0;for(let i=0;i<6;i++){const raw=sb1.slice(SB1_PLAYER_PARTY+i*POKEMON_SIZE,SB1_PLAYER_PARTY+(i+1)*POKEMON_SIZE),mon=decodeBoxMon(raw.slice(0,80));if(!mon||!mon.species||mon.is_egg)continue;put32(out,P.PERSONALITY+k*4,mon.personality);for(let j=0;j<4;j++)put16(out,P.MOVES+(k*4+j)*2,mon.moves[j]);put16(out,P.SPECIES+k*2,mon.species);put16(out,P.ITEMS+k*2,mon.held_item);out[P.LEVELS+k]=raw[PARTY_LEVEL_OFFSET];out[P.EVS+k]=Math.floor(mon.evs.reduce((a,b)=>a+b,0)/6);k++}return out}
export function canonicalTransportRecord(record){validateRecord(record);const out=asU8(record);setFlags(out,{toRegister:0,battled:0,registry:0});out[SB.UNUSED]=0;out[SB.PADDING]=out[SB.PADDING+1]=0;return out}
export const RELATION_STATES=Object.freeze({NOT_PRESENT:'NOT_PRESENT',PRESENT_CURRENT:'PRESENT_CURRENT',PRESENT_OUTDATED:'PRESENT_OUTDATED',NO_SAFE_SLOT:'NO_SAFE_SLOT',UNKNOWN_REMOTE:'UNKNOWN_REMOTE'});
export function normalizeDeliveredRecord(record){validateRecord(record);const out=asU8(record);setFlags(out,{toRegister:0,battled:0,registry:0});/* recipient-local / merge-recency state is not remote base content */out[SB.RECEIVED]=out[SB.RECEIVED+1]=0;out[SB.ENTERED]=0;out[SB.PADDING]=out[SB.PADDING+1]=0;return out}
export async function relationRecordHash(record){return sha256(normalizeDeliveredRecord(record))}
export const deliveredRecordHash=relationRecordHash
export function ownerKeyFromIdentity({trainer_name_hex='',trainer_id_hex='',gender=0}={}){const name=String(trainer_name_hex||'').toLowerCase(),tid=String(trainer_id_hex||'').toLowerCase();if(!/^[0-9a-f]{14}$/.test(name)||!/^[0-9a-f]{8}$/.test(tid)||![0,1].includes(Number(gender)))return null;return `${name}:${tid}:${Number(gender)}`}
function remoteManifest(remote={}){const summary=remote.record?.summary||remote.summary||{},payload=remote.payload||remote.secret_base_payload||null;let remoteOwnerKey=remote.secret_base_owner_key||remote.owner_key||summary.owner_key||null;let remoteHash=remote.secret_base_relation_hash||remote.relation_hash||null;let remoteId=Number(remote.secret_base_id??summary.secret_base_id??payload?.record?.summary?.secret_base_id??0);if(!remoteOwnerKey)remoteOwnerKey=ownerKeyFromIdentity({trainer_name_hex:remote.trainer_name_hex||summary.trainer_name_hex||payload?.record?.summary?.trainer_name_hex,trainer_id_hex:remote.trainer_id_hex||summary.trainer_id_hex||payload?.record?.summary?.trainer_id_hex,gender:remote.gender??summary.gender??payload?.record?.summary?.gender??0});return{remoteOwnerKey,remoteHash:remoteHash?String(remoteHash).toLowerCase():null,remoteId,payload}}
function manifestSafeSlot(save,manifest){const bases=save.allSecretBases(),trainer=save.trainerIdentity(),remoteOwnerKey=manifest.remoteOwnerKey,remoteId=manifest.remoteId;if(!remoteOwnerKey||!remoteId)return{ok:false,reason:'remote-metadata-missing'};const own=bases[0];if(ownerKeyFromIdentity(trainer)===remoteOwnerKey||ownerKey(own)===remoteOwnerKey)return{ok:false,reason:'refusing-recipient-own-base'};if(own[0]===remoteId)return{ok:false,reason:'incoming-location-collides-with-recipient-own-base'};const sameIdx=bases.findIndex((b,i)=>i>0&&b[0]&&ownerKey(b)===remoteOwnerKey);const locIdx=bases.findIndex((b,i)=>i>0&&b[0]===remoteId);if(sameIdx>0&&locIdx>0&&sameIdx!==locIdx)return{ok:false,reason:'owner-location-split-collision',slot:sameIdx};if(locIdx>0){const f=recordFlags(bases[locIdx]);if((f.registry_status===1||f.to_register)&&sameIdx!==locIdx)return{ok:false,reason:'registered-base-protects-incoming-location'};return{ok:true,slot:locIdx,reason:sameIdx===locIdx?'update-same-owner-same-location':'replace-unregistered-same-location'}}if(sameIdx>0)return{ok:true,slot:sameIdx,reason:'update-same-owner-moved-location'};const empty=bases.findIndex((b,i)=>i>0&&b[0]===0);if(empty>0)return{ok:true,slot:empty,reason:'empty-slot'};return{ok:false,reason:'no-safe-friend-slot'}}
export async function resolveSecretBaseRelation(saveBytes,remote={}){const save=new EmeraldSave(saveBytes,{requireBothSlots:false}),manifest=remoteManifest(remote),bases=save.allSecretBases();if(!manifest.remoteOwnerKey)return{state:RELATION_STATES.UNKNOWN_REMOTE,reason:'missing-owner-key',local_slot:null,remote_hash:manifest.remoteHash};const sameIdx=bases.findIndex((b,i)=>i>0&&b[0]&&ownerKey(b)===manifest.remoteOwnerKey);if(sameIdx>0){const safe=manifestSafeSlot(save,manifest);if(!safe.ok)return{state:RELATION_STATES.NO_SAFE_SLOT,reason:safe.reason,local_slot:sameIdx,remote_hash:manifest.remoteHash};const localHash=await deliveredRecordHash(bases[sameIdx]);let isCurrent=false;if(manifest.remoteHash)isCurrent=localHash===manifest.remoteHash;else if(manifest.payload){try{isCurrent=verifyDeliveredBase(saveBytes,manifest.payload,sameIdx)}catch{isCurrent=false}}if(isCurrent)return{state:RELATION_STATES.PRESENT_CURRENT,reason:'same-owner-same-stable-record',local_slot:sameIdx,local_hash:localHash,remote_hash:manifest.remoteHash,registry_status:recordFlags(bases[sameIdx]).registry_status};return{state:RELATION_STATES.PRESENT_OUTDATED,reason:'same-owner-remote-record-changed',local_slot:sameIdx,local_hash:localHash,remote_hash:manifest.remoteHash,registry_status:recordFlags(bases[sameIdx]).registry_status}}const safe=manifestSafeSlot(save,manifest);if(!safe.ok)return{state:RELATION_STATES.NO_SAFE_SLOT,reason:safe.reason,local_slot:null,remote_hash:manifest.remoteHash};return{state:RELATION_STATES.NOT_PRESENT,reason:safe.reason,local_slot:null,remote_hash:manifest.remoteHash,safe_slot:safe.slot}}
function b64encode(b){if(typeof Buffer!=='undefined')return Buffer.from(b).toString('base64');let s='';for(const x of b)s+=String.fromCharCode(x);return btoa(s)}
function b64decode(s){if(typeof Buffer!=='undefined')return new Uint8Array(Buffer.from(s,'base64'));const bin=atob(s),b=new Uint8Array(bin.length);for(let i=0;i<bin.length;i++)b[i]=bin.charCodeAt(i);return b}
export async function serializeSecretBase(saveBytes,{version=1,avatarOverride=null}={}){const save=new EmeraldSave(saveBytes),raw=save.secretBase(0);validateRecord(raw);const refreshed=refreshRecordedParty(raw,save.saveblock1()),record=canonicalTransportRecord(refreshed);if(version===2){if(avatarOverride!==null&&(!Number.isInteger(avatarOverride)||avatarOverride<0||avatarOverride>9))throw new HoennSaveError('avatar_override must be null or 0..9');record[SB.UNUSED]=avatarOverride===null?0:(0x80|avatarOverride)}else if(version!==1)throw new HoennSaveError('unsupported schema version');const digest=await sha256(record);const p={schema:SCHEMA,version,game:{title:'Pokemon Emerald',game_code:ROM_GAME_CODE,rom_sha1:ROM_SHA1},record:{native_size:160,native_b64:b64encode(record),native_sha256:digest,summary:summarizeRecord(record)}};if(version===2)p.presentation={avatar_override:avatarOverride};return p}
export async function deserializeSecretBase(payload){if(payload?.schema!==SCHEMA||![1,2].includes(payload?.version))throw new HoennSaveError('unsupported Secret Base schema/version');if(payload?.game?.game_code!==ROM_GAME_CODE||payload?.game?.rom_sha1!==ROM_SHA1)throw new HoennSaveError('wrong ROM pin');const r=payload.record||{},raw=b64decode(r.native_b64||'');validateRecord(raw);if(raw.length!==r.native_size||raw.length!==160)throw new HoennSaveError('native size mismatch');if(await sha256(raw)!==r.native_sha256)throw new HoennSaveError('native SHA mismatch');let expectedUnused=0;if(payload.version===2){const a=payload.presentation?.avatar_override??null;if(a!==null&&(!Number.isInteger(a)||a<0||a>9))throw new HoennSaveError('bad avatar override');expectedUnused=a===null?0:(0x80|a)}if(raw[SB.UNUSED]!==expectedUnused)throw new HoennSaveError('avatar override/native unused byte mismatch');const normalized=raw.slice();normalized[SB.UNUSED]=0;if(!bytesEqual(normalized,canonicalTransportRecord(normalized)))throw new HoennSaveError('non-canonical native transport record');if(JSON.stringify(summarizeRecord(raw))!==JSON.stringify(r.summary))throw new HoennSaveError('summary mismatch');return raw}
function belongsToTrainer(r,t){return !!r[0]&&recordFlags(r).gender===t.gender&&hex(r.slice(SB.TID,SB.TID+4))===t.trainer_id_hex&&hex(r.slice(SB.NAME,SB.NAME+7))===t.trainer_name_hex}
export function chooseImportSlot(save,incoming,{allowEvictUnregistered=false}={}){const bases=save.allSecretBases(),trainer=save.trainerIdentity();if(belongsToTrainer(incoming,trainer))throw new HoennSaveError('refusing recipient own base');if(bases[0][0]===incoming[0])throw new HoennSaveError('incoming location collides with recipient own base');const same=bases.findIndex((b,i)=>i>0&&b[0]&&sameOwner(b,incoming)),loc=bases.findIndex((b,i)=>i>0&&b[0]===incoming[0]);const sameIdx=same<0?null:same,locIdx=loc<0?null:loc,preserve=sameIdx!==null&&recordFlags(bases[sameIdx]).registry_status===1?1:0;if(sameIdx!==null&&locIdx!==null&&sameIdx!==locIdx)throw new HoennSaveError('safe merge refuses owner/location split collision');if(locIdx!==null){const f=recordFlags(bases[locIdx]);if((f.registry_status===1||f.to_register)&&sameIdx!==locIdx)throw new HoennSaveError('registered base protects incoming location');return{slot:locIdx,reason:sameIdx===locIdx?'update-same-owner-same-location':'replace-unregistered-same-location',registry:sameIdx===locIdx?preserve:0}}if(sameIdx!==null)return{slot:sameIdx,reason:'update-same-owner-moved-location',registry:preserve};const empty=bases.findIndex((b,i)=>i>0&&b[0]===0);if(empty>0)return{slot:empty,reason:'empty-slot',registry:0};if(allowEvictUnregistered){const e=bases.findIndex((b,i)=>i>0&&recordFlags(b).registry_status===0&&!recordFlags(b).to_register);if(e>0)return{slot:e,reason:'evict-unregistered',registry:0}}throw new HoennSaveError('no safe friend slot')}
export async function insertSecretBase(saveBytes,payload,options={}){const save=new EmeraldSave(saveBytes,{requireBothSlots:true}),incoming=await deserializeSecretBase(payload),pick=chooseImportSlot(save,incoming,options),ownBefore=save.secretBase(0),before=save.bytes(),prepared=asU8(incoming);setFlags(prepared,{toRegister:0,battled:0,registry:pick.registry});prepared[SB.PADDING]=prepared[SB.PADDING+1]=0;const changed=save.replaceSecretBase(pick.slot,prepared),after=save.bytes(),check=new EmeraldSave(after,{requireBothSlots:true});if(!bytesEqual(check.secretBase(0),ownBefore))throw new HoennSaveError('own base changed');if(!bytesEqual(check.secretBase(pick.slot),prepared))throw new HoennSaveError('import did not round-trip');return{bytes:after,report:{destination_slot_index:pick.slot,selection_reason:pick.reason,registry_status:pick.registry,changed_logical_sections:changed,before_sha256:await sha256(before),after_sha256:await sha256(after),incoming:summarizeRecord(prepared)}}}
export async function identityFromSave(saveBytes){const s=new EmeraldSave(saveBytes),t=s.trainerIdentity(),own=s.secretBase(0),fingerprint=await sha256(new TextEncoder().encode(`${ROM_GAME_CODE}|${t.trainer_name_hex}|${t.trainer_id_hex}|${t.gender}`));return{...t,save_fingerprint:fingerprint,secret_base_id:own[0],secret_base_owner_key:own[0]?ownerKey(own):null}}
function tvShowSnapshot(sb1){const out=[];for(let i=0;i<TV_SHOW_COUNT;i++){const o=TV_SHOWS_OFFSET+i*TV_SHOW_SIZE,raw=sb1.slice(o,o+TV_SHOW_SIZE);if(raw[0]===TVSHOW_SECRET_BASE_SECRETS)out.push({slot:i,kind:raw[0],active:!!raw[1],steps:u16(raw,2),base_owner_name_hex:hex(raw.slice(4,11)),flags:u32(raw,0x0c),item:u16(raw,0x10),player_name_hex:hex(raw.slice(0x13,0x1b)),language:raw[0x1b],base_owner_language:raw[0x1c],raw_hex:hex(raw)})}return out}
export async function nativeSocialSnapshot(saveBytes){const s=new EmeraldSave(saveBytes),sb1=s.saveblock1(),bases=s.allSecretBases().map((r,index)=>({index,id:r[0],owner_key:r[0]?ownerKey(r):null,trainer_name:summarizeRecord(r).trainer_name,trainer_name_hex:hex(r.slice(SB.NAME,SB.NAME+7)),trainer_id_hex:hex(r.slice(SB.TID,SB.TID+4)),gender:recordFlags(r).gender,num_times_entered:r[SB.ENTERED],battled_owner_today:recordFlags(r).battled_owner_today,registry_status:recordFlags(r).registry_status}));return{save_sha256:await sha256(saveBytes),trainer:s.trainerIdentity(),bases,current_base_index:getVar(sb1,VAR_CURRENT_SECRET_BASE),secret_base_is_not_local:getVar(sb1,VAR_SECRET_BASE_IS_NOT_LOCAL),step_counter:getVar(sb1,VAR_SECRET_BASE_STEP_COUNTER),last_item_used:getVar(sb1,VAR_SECRET_BASE_LAST_ITEM_USED),low_tv_flags:getVar(sb1,VAR_SECRET_BASE_LOW_TV_FLAGS),high_tv_flags:getVar(sb1,VAR_SECRET_BASE_HIGH_TV_FLAGS),secret_base_tv_shows:tvShowSnapshot(sb1)}}
function resultTypesFromFlags(flags){const lo=flags&0xffff,hi=(flags>>>16)&0xffff,out=[];if(lo&SECRET_BASE_BATTLED_WON)out.push('base_battle_won');if(lo&SECRET_BASE_BATTLED_LOST)out.push('base_battle_lost');if(lo&SECRET_BASE_DECLINED_BATTLE)out.push('base_battle_refused');if(hi&SECRET_BASE_BATTLED_DRAW)out.push('base_battle_drawn');return out}
export function deriveBaseEvents(previous,current){
  if(!previous)return[];
  const out=[],prevByOwner=new Map(previous.bases.filter(b=>b.owner_key).map(b=>[b.owner_key,b]));
  for(const b of current.bases){
    if(!b.owner_key||b.index===0)continue;
    const p=prevByOwner.get(b.owner_key);if(!p)continue;
    if(b.num_times_entered>p.num_times_entered)out.push({type:'base_visited',subject_owner_key:b.owner_key,evidence:{slot:b.index,before:p.num_times_entered,after:b.num_times_entered,source:'SecretBase.numTimesEntered'}});
    if(!p.battled_owner_today&&b.battled_owner_today)out.push({type:'base_challenged',subject_owner_key:b.owner_key,evidence:{slot:b.index,source:'SecretBase.battledOwnerToday'}});
  }
  const idx=current.current_base_index,b=current.bases[idx],prevIdx=previous.current_base_index,prevBase=previous.bases?.[prevIdx];
  const packed=(current.low_tv_flags|((current.high_tv_flags&0xffff)<<16))>>>0,prevPacked=(previous.low_tv_flags|((previous.high_tv_flags&0xffff)<<16))>>>0;
  const prevResultTypes=new Set(resultTypesFromFlags(prevPacked));
  if(b?.owner_key&&idx>0){
    if(current.secret_base_is_not_local&&!previous.secret_base_is_not_local)out.push({type:'base_visited',subject_owner_key:b.owner_key,evidence:{slot:idx,source:'VAR_SECRET_BASE_IS_NOT_LOCAL'}});
    const subjectChanged=prevBase?.owner_key!==b.owner_key;
    for(const type of resultTypesFromFlags(packed))if(subjectChanged||!prevResultTypes.has(type))out.push({type,subject_owner_key:b.owner_key,evidence:{slot:idx,flags:packed,source:'VAR_SECRET_BASE_*_TV_FLAGS'}});
  }
  const prevTv=new Set((previous.secret_base_tv_shows||[]).map(x=>x.raw_hex));
  for(const show of current.secret_base_tv_shows||[]){
    if(show.active)continue;
    if(prevTv.has(show.raw_hex))continue;
    const currentBase=(current.bases||[]).find(x=>x.index>0&&x.trainer_name_hex===show.base_owner_name_hex),subjectKey=currentBase?.owner_key;
    const priorInsideSame=!!(previous.secret_base_is_not_local&&prevBase?.trainer_name_hex===show.base_owner_name_hex);
    if(!priorInsideSame)out.push({type:'base_visited',...(subjectKey?{subject_owner_key:subjectKey}:{subject_owner_name_hex:show.base_owner_name_hex}),evidence:{tv_slot:show.slot,source:'TVSHOW_SECRET_BASE_SECRETS'}});
    for(const type of resultTypesFromFlags(show.flags)){
      if(prevBase?.trainer_name_hex===show.base_owner_name_hex&&prevResultTypes.has(type))continue;
      out.push({type,...(subjectKey?{subject_owner_key:subjectKey}:{subject_owner_name_hex:show.base_owner_name_hex}),evidence:{tv_slot:show.slot,flags:show.flags,source:'TVSHOW_SECRET_BASE_SECRETS'}});
    }
  }
  const seen=new Set();return out.filter(e=>{const subject=e.subject_owner_key||`name:${e.subject_owner_name_hex||''}`,k=`${e.type}|${subject}`;if(seen.has(k))return false;seen.add(k);return true});
}
export function verifyDeliveredBase(saveBytes,payload,slot=null){const s=new EmeraldSave(saveBytes,{requireBothSlots:true}),incoming=b64decode(payload?.record?.native_b64||'');if(incoming.length!==160)return false;let normalizedIncoming;try{normalizedIncoming=normalizeDeliveredRecord(incoming)}catch{return false}const match=(r)=>{if(r.length!==160)return false;return bytesEqual(normalizeDeliveredRecord(r),normalizedIncoming)};if(slot!==null)return slot>0&&slot<20&&match(s.secretBase(slot));return s.allSecretBases().some((r,i)=>i>0&&match(r))}
export function nativePayloadUnusedByte(record){return asU8(record)[SB.UNUSED]}

/* Hoenn TV Network v0.4.5
 * Exact native Record Mixing transport for TVSHOW_SECRET_BASE_SECRETS only.
 * No synthetic dialogue is generated. The 36-byte Emerald TV record is preserved,
 * then adapted exactly like Record Mixing: active=TRUE + recipient routing id.
 */
export const TV_NETWORK_SCHEMA='hoenn.online.native-tv';
export const TV_NETWORK_VERSION=1;
const TV_FIRST_RECORD_MIX_SLOT=5, TV_LAST_RECORD_MIX_SLOT=23;
function tvFromHex(s){if(typeof s!=='string'||s.length!==TV_SHOW_SIZE*2||!/^[0-9a-f]+$/i.test(s))throw new HoennSaveError('INVALID_TV_NATIVE_HEX');const out=new Uint8Array(TV_SHOW_SIZE);for(let i=0;i<out.length;i++)out[i]=parseInt(s.slice(i*2,i*2+2),16);return out}
function validateNativeTvShow(raw){const b=raw instanceof Uint8Array?new Uint8Array(raw):tvFromHex(raw);if(b.length!==TV_SHOW_SIZE)throw new HoennSaveError('INVALID_TV_NATIVE_SIZE');if(b[0]!==TVSHOW_SECRET_BASE_SECRETS)throw new HoennSaveError('UNSUPPORTED_TV_SHOW_KIND');if(b[1]!==0)throw new HoennSaveError('TV_SOURCE_MUST_BE_UNMIXED');const owner=b.slice(4,12),visitor=b.slice(0x13,0x1b);if(!owner.some(x=>x!==0&&x!==0xff)||!owner.includes(0xff))throw new HoennSaveError('TV_BASE_OWNER_INVALID');if(!visitor.some(x=>x!==0&&x!==0xff)||!visitor.includes(0xff))throw new HoennSaveError('TV_VISITOR_INVALID');if(b[0x12]!==0)throw new HoennSaveError('TV_SOURCE_STATE_NOT_FRESH');if(b[0x1b]<1||b[0x1b]>7||b[0x1c]<1||b[0x1c]>7)throw new HoennSaveError('TV_LANGUAGE_INVALID');const flags=(b[0x0c]|(b[0x0d]<<8)|(b[0x0e]<<16)|(b[0x0f]<<24))>>>0;if(flags&0x80000000)throw new HoennSaveError('TV_UNUSED_FLAG_SET');const item=u16(b,0x10);if((flags&(1<<9))&&(item<=0||item>=377))throw new HoennSaveError('TV_ITEM_INVALID');const a=u16(b,0x1e),c=u16(b,0x20),d=u16(b,0x22);if(a!==c||c!==d)throw new HoennSaveError('TV_SOURCE_ROUTING_INVALID');return b}
function canonicalTvShow(raw){const x=new Uint8Array(raw);x[1]=0;x[0x1e]=0;x[0x1f]=0;return x}
function tvShowAt(save,slot){if(slot<0||slot>=TV_SHOW_COUNT)throw new HoennSaveError('TV_SLOT_RANGE');const sb1=save.saveblock1(),o=TV_SHOWS_OFFSET+slot*TV_SHOW_SIZE;return sb1.slice(o,o+TV_SHOW_SIZE)}
function findMatchingTvSlot(save,sourceRaw){const c=canonicalTvShow(sourceRaw);for(let i=TV_FIRST_RECORD_MIX_SLOT;i<=TV_LAST_RECORD_MIX_SLOT;i++){const r=tvShowAt(save,i);if(r[0]&&bytesEqual(canonicalTvShow(r),c))return i}return -1}
function firstEmptyTvSlot(save){for(let i=TV_FIRST_RECORD_MIX_SLOT;i<=TV_LAST_RECORD_MIX_SLOT;i++)if(tvShowAt(save,i)[0]===0)return i;return -1}
function mixTvShowForRecipient(sourceRaw,recipientTrainerId){const out=validateNativeTvShow(sourceRaw);out[1]=1;put16(out,0x1e,Number(recipientTrainerId)&0xffff);return out}
export async function insertNetworkTvShow(saveBytes,payload){if(payload?.schema!==TV_NETWORK_SCHEMA||Number(payload?.version)!==TV_NETWORK_VERSION)throw new HoennSaveError('INVALID_TV_PAYLOAD_SCHEMA');const source=validateNativeTvShow(payload.source_native_hex||'');if(await sha256(source)!==payload.source_sha256)throw new HoennSaveError('TV_PAYLOAD_HASH_MISMATCH');const save=new EmeraldSave(saveBytes,{requireBothSlots:true}),before=save.bytes(),existing=findMatchingTvSlot(save,source);if(existing>=0)return{bytes:before,report:{already_current:true,destination_tv_slot:existing,before_sha256:await sha256(before),after_sha256:await sha256(before),changed_logical_sections:[]}};const slot=firstEmptyTvSlot(save);if(slot<0)throw new HoennSaveError('NO_EMPTY_RECORD_MIX_TV_SLOT');const mixed=mixTvShowForRecipient(source,save.trainerIdentity().trainer_id_public),changed=save.rewriteSb1(TV_SHOWS_OFFSET+slot*TV_SHOW_SIZE,mixed),after=save.bytes(),check=new EmeraldSave(after,{requireBothSlots:true});if(findMatchingTvSlot(check,source)!==slot)throw new HoennSaveError('TV_POST_WRITE_VERIFY_FAILED');return{bytes:after,report:{already_current:false,destination_tv_slot:slot,before_sha256:await sha256(before),after_sha256:await sha256(after),changed_logical_sections:changed}}}
export function verifyNetworkTvShow(saveBytes,payload,slot=null){try{const source=validateNativeTvShow(payload?.source_native_hex||''),save=new EmeraldSave(saveBytes,{requireBothSlots:true}),found=findMatchingTvSlot(save,source);return found>=0&&(slot==null||Number(slot)===found)}catch{return false}}


/* Emerald · MadeBy UI v0.4.5.2 · Human BUZZ
 * HOENN remains the utility/social-state surface. BUZZ turns real Emerald activity
 * into short, human-readable stories. Public Hoenn stories and the signed-in trainer's
 * own recent activity are merged locally; private events are never published by this UI.
 */
const API='https://emerald-api.madeby.re/api/hoenn';
const PUBLIC_API='https://emerald-api.madeby.re/api/hoenn-public';
const STATE={
  open:false,view:'hoenn',me:null,trainers:[],activity:[],buzzActivity:[],buzzScope:'world',buzzError:'',presence:null,presenceSelf:null,presenceTimer:0,locations:new Map(),busy:false,busyAction:'',busySourceId:'',
  publishLocked:false,lastError:'',status:'',statusDetail:'',statusKind:'',publishedLocal:false,localPreview:null,tvInbox:{available:false,broadcast:null},tvBusy:false,
  syncTimer:0,relationTimer:0,unsub:null,relations:new Map(),manifestOverrides:new Map(),relationSaveSha:'',relationEpoch:0
};
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
const bridge=()=>globalThis.JRPGWorldSaveVaultBridge;
const trainerKey=x=>String(x?.owner_account_id??x?.account_id??'');
function routeLabel(id){const x=STATE.locations.get(Number(id));if(!x)return `Secret Base #${id}`;const ev=x.world_events?.[0],map=ev?.map||x.constant||`Base ${id}`;return map.replace(/^Route(\d+)$/,'Route $1').replace(/([a-z])([A-Z])/g,'$1 $2')}
async function loadLocations(){try{const r=await fetch('./hoenn/secret-base-locations.json',{cache:'no-store'}),j=await r.json();STATE.locations=new Map((j.locations||[]).map(x=>[x.id,x]))}catch{}}
async function api(action,{method='GET',body=null,timeoutMs=15000}={}){
  const b=bridge(),sess=b?.getSession?.()||{};
  const controller=typeof AbortController!=='undefined'?new AbortController():null;
  const timer=controller?setTimeout(()=>controller.abort(),timeoutMs):null;
  try{
    const r=await fetch(`${API}?action=${encodeURIComponent(action)}`,{method,credentials:'include',cache:'no-store',signal:controller?.signal,headers:{...(body?{'Content-Type':'application/json'}:{}),...(method!=='GET'&&sess.csrf?{'X-CSRF-Token':sess.csrf}:{})},body:body?JSON.stringify(body):null});
    const text=await r.text();let j={};try{j=text?JSON.parse(text):{}}catch{}
    if(!r.ok)throw new Error(j.error||j.message||`HOENN SERVER HTTP ${r.status}`);
    return j;
  }catch(e){
    if(e?.name==='AbortError')throw new Error('HOENN SERVER TIMEOUT · TRY AGAIN');
    if(e instanceof TypeError)throw new Error('HOENN SERVER UNREACHABLE · CHECK CONNECTION');
    throw e;
  }finally{if(timer)clearTimeout(timer)}
}
async function publicApi(action,{timeoutMs=12000,limit=50}={}){
  const controller=typeof AbortController!=='undefined'?new AbortController():null;
  const timer=controller?setTimeout(()=>controller.abort(),timeoutMs):null;
  try{
    const r=await fetch(`${PUBLIC_API}?action=${encodeURIComponent(action)}&limit=${encodeURIComponent(limit)}`,{method:'GET',credentials:'omit',cache:'no-store',signal:controller?.signal,headers:{'Accept':'application/json'}});
    const text=await r.text();let j={};try{j=text?JSON.parse(text):{}}catch{}
    if(!r.ok)throw new Error(j.error||j.message||`HOENN PUBLIC HTTP ${r.status}`);
    return j;
  }catch(e){
    if(e?.name==='AbortError')throw new Error('HOENN PUBLIC TIMEOUT');
    if(e instanceof TypeError)throw new Error('HOENN PUBLIC WIRE UNREACHABLE');
    throw e;
  }finally{if(timer)clearTimeout(timer)}
}
function updatePresenceIndicator(){
  const button=document.getElementById('emerald-dex-switch');
  if(!button)return;
  const authenticated=Boolean(bridge()?.getSession?.().authenticated);
  const n=authenticated?Number(STATE.presenceSelf?.other_online_now ?? 0):Number(STATE.presence?.counts?.online_now ?? 0);
  button.dataset.presenceLive=n>0?'1':'0';
  button.dataset.presenceCount=String(Math.max(0,n));
  if(button.dataset.mobileAction==='buzz')button.title=n>0?`BUZZ · ${n} other trainer${n===1?'':'s'} online`:'BUZZ · no other trainers online';
}
function currentWorldPosition(){
  try{return globalThis.JRPGWorldEmeraldRuntime?.getWorldPosition?.()||null}catch{return null}
}
async function pingPresence(){
  if(document.hidden||!bridge()?.getSession?.().authenticated)return null;
  try{
    const r=await api('presence_ping',{method:'POST',body:{client_version:'0.4.5.2',surface:'emerald',location:currentWorldPosition()},timeoutMs:7000});
    STATE.presenceSelf=r?.presence||null;updatePresenceIndicator();return STATE.presenceSelf;
  }catch(e){console.warn('Hoenn presence ping',e);return null}
}
async function refreshPresence({ping=true}={}){
  if(ping)await pingPresence();
  try{
    const r=await publicApi('presence',{limit:16,timeoutMs:7000});
    STATE.presence=r?.presence||null;updatePresenceIndicator();
  }catch(e){console.warn('Hoenn public presence',e)}
  if(STATE.open&&STATE.view==='buzz')render();
  return STATE.presence;
}
function schedulePresenceLoop(){
  clearInterval(STATE.presenceTimer);
  setTimeout(()=>refreshPresence({ping:true}).catch(()=>{}),1200);
  STATE.presenceTimer=setInterval(()=>{if(!document.hidden)refreshPresence({ping:true}).catch(()=>{})},60000);
}

function buzzMergeKey(e){
  const n=namesForEvent(e);
  return [eventType(e),String(n.actorName||'').toUpperCase(),String(n.subjectName||'').toUpperCase(),String(e?.created_at||''),eventText(e)].join('|');
}
function mergeBuzzActivity(...lists){
  const out=[],seen=new Set();
  for(const list of lists){for(const e of Array.isArray(list)?list:[]){const k=buzzMergeKey(e);if(seen.has(k))continue;seen.add(k);out.push(e)}}
  return out.sort((a,b)=>Date.parse(b?.created_at||0)-Date.parse(a?.created_at||0));
}
async function refreshBuzz({quiet=true}={}){
  try{
    const world=await publicApi('activity',{limit:50});
    // Merge only in this signed-in browser. This makes the trainer's own fresh
    // adventures visible in BUZZ without publishing private activity globally.
    STATE.buzzActivity=mergeBuzzActivity(world.activity,STATE.activity);
    STATE.buzzScope='world';STATE.buzzError='';
    try{const presence=await publicApi('presence',{limit:16,timeoutMs:7000});STATE.presence=presence?.presence||STATE.presence;updatePresenceIndicator()}catch{}
  }catch(e){
    STATE.buzzActivity=STATE.activity.slice();STATE.buzzScope='connected';STATE.buzzError=e?.message||String(e);
    if(!quiet)STATE.lastError=STATE.buzzError;
  }
  render();
}
function setHoennOpen(open,{view=null}={}){
  const wasOpen=STATE.open;
  if(view==='hoenn'||view==='buzz')STATE.view=view;
  STATE.open=!!open;
  if(STATE.open&&!wasOpen)STATE.publishLocked=false;
  document.documentElement.dataset.hoennOpen=STATE.open?'1':'0';
  document.documentElement.dataset.hoennView=STATE.view;
  render();
  if(STATE.open){refreshAll({quiet:true});if(STATE.view==='buzz')refreshBuzz({quiet:true});}
}
function toggleHoenn(){
  if(STATE.open&&STATE.view==='hoenn'){setHoennOpen(false);return}
  setHoennOpen(true,{view:'hoenn'});
}
function toggleBuzz(){
  if(STATE.open&&STATE.view==='buzz'){setHoennOpen(false);return}
  setHoennOpen(true,{view:'buzz'});
}
function closeHoenn(){setHoennOpen(false)}
function setHoennView(view){if(view!=='hoenn'&&view!=='buzz')return;STATE.view=view;document.documentElement.dataset.hoennView=view;render();if(STATE.open){refreshAll({quiet:true});if(view==='buzz')refreshBuzz({quiet:true})}}
function syncLauncherState(){
  const pressed=STATE.open?'true':'false';
  const desktop=document.getElementById('hoenn-desktop-launch');
  if(desktop){
    desktop.setAttribute('aria-pressed',pressed);
    desktop.setAttribute('aria-label',STATE.open?'Close Emerald · MadeBy':'Open Emerald · MadeBy');
    desktop.title=STATE.open?'Close Emerald · MadeBy':'Open Emerald · MadeBy';
  }
  document.querySelectorAll('[data-gba-btn="Menu"]').forEach(menu=>{
    menu.setAttribute('aria-pressed',pressed);
    menu.setAttribute('aria-label',STATE.open?'Close Emerald · MadeBy':'Open Emerald · MadeBy');
  });
}
function dockDesktopLauncher(){
  const actions=document.querySelector('#pokefield-live-panel .pf-head-actions');
  if(!actions)return false;
  let button=document.getElementById('hoenn-desktop-launch');
  if(!button){
    button=document.createElement('button');
    button.id='hoenn-desktop-launch';
    button.type='button';
    button.className='pf-compact-toggle hoenn-desktop-launch';
    button.textContent='HOENN';
    button.addEventListener('click',ev=>{ev.preventDefault();ev.stopPropagation();toggleHoenn()});
  }
  const compact=actions.querySelector('#pf-compact-toggle');
  if(button.parentElement!==actions || (compact&&button.nextElementSibling!==compact)){
    if(compact)actions.insertBefore(button,compact);else actions.appendChild(button);
  }
  syncLauncherState();
  return true;
}
function scheduleDesktopLauncherDock(){
  // PokéField mounts dynamically. Use a small bounded retry window rather than a
  // persistent DOM observer so emulator/save startup remains untouched.
  let attempts=0;
  const tryDock=()=>{
    attempts++;
    if(dockDesktopLauncher()||attempts>=12)return;
    setTimeout(tryDock,150);
  };
  tryDock();
}
function menuControlFromTarget(target){
  if(!(target instanceof Element))return null;
  const direct=target.closest('[data-gba-btn="Menu"]');
  if(direct)return direct;
  const wrap=target.closest('.sys-btn-wrapper');
  return wrap?.querySelector?.('[data-gba-btn="Menu"]')||null;
}
function installHoennConsoleDelegate(){
  if(document.documentElement.dataset.hoennConsoleDelegate==='1')return;
  document.documentElement.dataset.hoennConsoleDelegate='1';
  let lastTouchAt=0;
  const intercept=ev=>{
    const menu=menuControlFromTarget(ev.target);if(!menu)return;
    const now=Date.now();
    if(ev.type==='click'&&now-lastTouchAt<900){ev.preventDefault();ev.stopPropagation();ev.stopImmediatePropagation?.();return}
    if(ev.type==='touchstart')lastTouchAt=now;
    ev.preventDefault();ev.stopPropagation();ev.stopImmediatePropagation?.();toggleHoenn();
    menu.setAttribute('aria-label',STATE.open?'Close Emerald · MadeBy':'Open Emerald · MadeBy');menu.setAttribute('aria-pressed',STATE.open?'true':'false');
  };
  document.addEventListener('touchstart',intercept,{capture:true,passive:false});document.addEventListener('click',intercept,true);
}
function installPanelDelegate(panel){
  if(panel.dataset.hoennPanelDelegate==='1')return;panel.dataset.hoennPanelDelegate='1';
  panel.addEventListener('click',ev=>{
    const target=ev.target instanceof Element?ev.target.closest('button'):null;if(!target||!panel.contains(target))return;
    if(target.matches('[data-close]')){ev.preventDefault();closeHoenn();return}
    if(target.matches('[data-view]')){ev.preventDefault();setHoennView(target.dataset.view);return}
    if(target.matches('[data-publish]')){ev.preventDefault();publishBase();return}
    if(target.matches('[data-tv-receive]')){ev.preventDefault();receiveTv();return}
    if(target.matches('[data-add]')){ev.preventDefault();addBase(target.dataset.add);return}
  });
}
function ensureUi(){
  if(document.getElementById('hoenn-online-switch')){scheduleDesktopLauncherDock();syncLauncherState();return}
  const btn=document.createElement('button');btn.id='hoenn-online-switch';btn.type='button';btn.textContent='HOENN';btn.hidden=true;btn.style.display='none';btn.setAttribute('aria-hidden','true');document.body.appendChild(btn);
  const escapeBtn=document.createElement('button');escapeBtn.id='hoenn-online-escape';escapeBtn.type='button';escapeBtn.textContent='GAME ×';escapeBtn.hidden=true;escapeBtn.setAttribute('aria-label','Close Emerald · MadeBy and return to Emerald');escapeBtn.addEventListener('click',ev=>{ev.preventDefault();closeHoenn()});document.body.appendChild(escapeBtn);
  const panel=document.createElement('section');panel.id='hoenn-online-panel';panel.setAttribute('aria-label','Emerald · MadeBy');panel.setAttribute('aria-live','polite');document.body.appendChild(panel);installPanelDelegate(panel);installHoennConsoleDelegate();scheduleDesktopLauncherDock();
  document.addEventListener('keydown',ev=>{if(STATE.open&&ev.key==='Escape'){ev.preventDefault();closeHoenn()}},true);render();
}
function remoteManifestForTrainer(x){const over=STATE.manifestOverrides.get(trainerKey(x))||{};return {...x,...over,payload:over.payload||x.payload||x.secret_base_payload||null}}
async function recomputeRelations({snapshot=null,quiet=true}={}){
  const b=bridge();if(!b?.getActiveSnapshot||!b?.getSession?.().authenticated){STATE.relations=new Map();STATE.relationSaveSha='';render();return}
  const epoch=++STATE.relationEpoch;
  try{
    const snap=snapshot?.bytes?snapshot:await b.getActiveSnapshot({serverBackup:false});
    const entries=await Promise.all(STATE.trainers.map(async trainer=>[trainerKey(trainer),await resolveSecretBaseRelation(snap.bytes,remoteManifestForTrainer(trainer))]));
    if(epoch!==STATE.relationEpoch)return;
    STATE.relations=new Map(entries);STATE.relationSaveSha=snap.sha256||await sha256(snap.bytes);
  }catch(e){if(!quiet){STATE.lastError=e?.message||String(e)}}
  render();
}
function relationForTrainer(x){return STATE.relations.get(trainerKey(x))||{state:RELATION_STATES.UNKNOWN_REMOTE,reason:'not-yet-resolved'}}
function relationButton(x){
  const key=trainerKey(x),rel=relationForTrainer(x),busy=STATE.busy,activeBusy=STATE.busySourceId===key;
  if(rel.state===RELATION_STATES.PRESENT_CURRENT)return `<button type="button" class="hoenn-relation-current" disabled>IN MY HOENN ✓</button>`;
  if(rel.state===RELATION_STATES.PRESENT_OUTDATED)return `<button type="button" data-add="${esc(key)}" ${busy?'disabled':''}>${activeBusy?'UPDATING…':'UPDATE IN MY HOENN'}</button>`;
  if(rel.state===RELATION_STATES.NO_SAFE_SLOT)return `<button type="button" class="hoenn-relation-noslot" disabled>NO SAFE SLOT</button>`;
  return `<button type="button" data-add="${esc(key)}" ${busy?'disabled':''}>${activeBusy?'ADDING…':'ADD TO MY HOENN'}</button>`;
}
function relationNote(x){const rel=relationForTrainer(x);if(rel.state===RELATION_STATES.NO_SAFE_SLOT)return `<small class="hoenn-relation-note">No unprotected native friend slot is safe for this record.</small>`;return ''}
function cardTrainer(x){return `<article class="hoenn-trainer" data-relation="${esc(relationForTrainer(x).state)}"><div><b>${esc(x.trainer_name)}</b><small>${esc(routeLabel(x.secret_base_id))}</small>${relationNote(x)}</div>${relationButton(x)}</article>`}
function eventTime(value){
  const t=Date.parse(value||'');if(!Number.isFinite(t))return '';
  const mins=Math.max(0,Math.floor((Date.now()-t)/60000));
  if(mins<1)return 'NOW';if(mins<60)return `${mins}m`;
  const hrs=Math.floor(mins/60);if(hrs<24)return `${hrs}h`;
  return `${Math.floor(hrs/24)}d`;
}
function eventType(e){return String(e?.type||e?.event_type||'event')}
function eventText(e){return String(e?.text||e?.display_text||eventType(e))}
function eventActorId(e){return String(e?.actor?.public_id||e?.actor_account_id||'actor')}
function eventSubjectId(e){return String(e?.subject?.public_id||e?.subject_account_id||eventActorId(e))}
function eventActorName(e){return String(e?.actor?.trainer_name||'').trim()}
function eventSubjectName(e){return String(e?.subject?.trainer_name||'').trim()}
function privateTrainerName(id){id=String(id||'');if(id===String(STATE.me?.account_id||''))return STATE.me?.trainer_name||'';return STATE.trainers.find(t=>trainerKey(t)===id)?.trainer_name||''}
function namesForEvent(e){
  const actorId=eventActorId(e),subjectId=eventSubjectId(e);
  return {actorId,subjectId,actorName:eventActorName(e)||privateTrainerName(actorId)||'TRAINER',subjectName:eventSubjectName(e)||privateTrainerName(subjectId)||'TRAINER'};
}
function eventCounts(events){const out={};for(const e of events){const k=eventType(e);out[k]=(out[k]||0)+1}return out}
function pairKey(e){const {actorId,subjectId}=namesForEvent(e);return actorId===subjectId?actorId:[actorId,subjectId].sort().join('|')}
function buzzStoryText(group){
  const first=group.events[0]||{},n=namesForEvent(first),c=group.counts;
  const actor=n.actorName,subject=n.subjectName,same=n.actorId===n.subjectId;
  if(c.trainer_card_updated){return{title:`${actor} UPDATED THEIR TRAINER CARD`,summary:`${actor} has a fresh Trainer Card in Hoenn.`,accent:'card'}}
  if(same&&c.base_published&&!c.base_updated){return{title:`${actor} OPENED A SECRET BASE`,summary:`${actor}'s Secret Base is now part of Hoenn.`,accent:'base'}}
  if(same&&(c.base_updated||c.base_published)){return{title:`${actor} UPDATED THEIR BASE`,summary:`${actor} made changes to their Secret Base.`,accent:'base'}}
  const visits=c.base_visited||0,challenges=c.base_challenged||0,wins=c.base_battle_won||0,losses=c.base_battle_lost||0,draws=c.base_battle_drawn||0,refused=c.base_battle_refused||0,received=c.base_received||0;
  const battle=challenges+wins+losses+draws+refused;
  const latestBattle=group.events.find(e=>['base_battle_won','base_battle_lost','base_battle_drawn','base_battle_refused','base_challenged'].includes(eventType(e)));
  if(latestBattle){
    const t=eventType(latestBattle);let title=`SECRET BASE BATTLE · ${actor} & ${subject}`,summary=`${actor} challenged ${subject} in a Secret Base battle.`;
    if(t==='base_battle_won'){title=`${actor} DEFEATED ${subject}`;summary=`${actor} won a Secret Base battle against ${subject}.`}
    else if(t==='base_battle_lost'){title=`${subject} DEFEATED ${actor}`;summary=`${actor} was defeated by ${subject} in a Secret Base battle.`}
    else if(t==='base_battle_drawn'){title=`${actor} DREW WITH ${subject}`;summary=`${actor} and ${subject} battled to a draw in a Secret Base.`}
    else if(t==='base_battle_refused'){title=`NO BATTLE THIS TIME`;summary=`${actor} visited ${subject}, but skipped the Secret Base battle.`}
    if(battle>1&&t!=='base_challenged')summary+=` Their recent activity includes ${battle} battle moment${battle===1?'':'s'}.`;
    return{title,summary,accent:'battle'};
  }
  if(visits>1)return{title:`BACK AT ${subject}'S BASE`,summary:`${actor} has visited ${subject}'s Secret Base ${visits} times recently.`,accent:'base'};
  if(visits)return{title:`VISITING ${subject}`,summary:`${actor} visited ${subject}'s Secret Base.`,accent:'base'};
  if(received)return{title:`${subject} JOINED ${actor}'S HOENN`,summary:`${actor} added ${subject}'s Secret Base to their Hoenn.`,accent:'base'};
  return{title:`AROUND ${subject}`,summary:eventText(first),accent:'base'};
}
export function buildBuzzStories(activity=[]){
  const groups=new Map();
  for(const e of activity){
    const key=pairKey(e);if(!groups.has(key))groups.set(key,{key,events:[],counts:{},latest:e?.created_at||''});
    const g=groups.get(key);g.events.push(e);g.counts=eventCounts(g.events);if(Date.parse(e?.created_at||0)>Date.parse(g.latest||0))g.latest=e.created_at;
  }
  return [...groups.values()].map(g=>{g.events.sort((a,b)=>Date.parse(b?.created_at||0)-Date.parse(a?.created_at||0));g.counts=eventCounts(g.events);return{...g,...buzzStoryText(g)}}).sort((a,b)=>Date.parse(b.latest||0)-Date.parse(a.latest||0));
}
function presenceHtml(){
  const p=STATE.presence||{},counts=p.counts||{};
  const authenticated=Boolean(bridge()?.getSession?.().authenticated);
  const self=STATE.presenceSelf||{};
  const online=Number(counts.online_now||0),active=Number(counts.active_15m||0),day=Number(counts.played_24h||0);
  const otherNow=authenticated&&Number.isFinite(Number(self.other_online_now))?Number(self.other_online_now):null;
  const other15=authenticated&&Number.isFinite(Number(self.other_active_15m))?Number(self.other_active_15m):null;
  const otherDay=authenticated&&Number.isFinite(Number(self.other_played_24h))?Number(self.other_played_24h):null;
  const liveCount=otherNow===null?online:otherNow;
  const headline=authenticated?(liveCount?`${liveCount} OTHER TRAINER${liveCount===1?'':'S'} ONLINE`:'NO OTHER TRAINERS ONLINE'):(liveCount?`${liveCount} TRAINER${liveCount===1?'':'S'} ONLINE`:'HOENN IS QUIET RIGHT NOW');
  const a15=other15===null?active:other15,d24=otherDay===null?day:otherDay;
  const meName=String(STATE.me?.trainer_name||'').toUpperCase();
  const recent=(Array.isArray(p.trainers)?p.trainers:[]).filter(t=>!meName||String(t?.trainer_name||'').toUpperCase()!==meName).slice(0,4);
  const trainerLines=recent.length?`<div class="hoenn-presence-trainers">${recent.map(t=>`<span><b>${esc(t.trainer_name||'TRAINER')}${t.location?.route?`<small>${esc(t.location.route)}</small>`:''}</b><i data-status="${esc(t.status||'today')}">${t.status==='online'?'NOW':eventTime(t.last_seen_at)}</i></span>`).join('')}</div>`:`<small class="hoenn-presence-note">${liveCount?'Other active trainers have not published a public Trainer Card or Base yet.':'The next heartbeat from another signed-in Emerald session will appear here.'}</small>`;
  return `<section class="hoenn-presence" data-live="${liveCount>0?'1':'0'}"><div class="hoenn-presence-head"><div><small>HOENN RIGHT NOW</small><b>${esc(headline)}</b></div><span class="hoenn-presence-pulse" aria-hidden="true"></span></div><div class="hoenn-presence-stats"><span><b>${a15}</b> active · 15m</span><span><b>${d24}</b> played · 24h</span></div>${trainerLines}</section>`;
}
function buzzHtml(){
  const source=STATE.buzzActivity.length?STATE.buzzActivity:STATE.activity;
  const stories=buildBuzzStories(source).slice(0,10);
  const scope=STATE.buzzScope==='world'?'AROUND HOENN':'YOUR HOENN';
  if(!stories.length)return `${presenceHtml()}<div class="hoenn-buzz-scope"><b>${scope}</b><span>Real game events</span></div><section class="hoenn-buzz-empty"><b>IT'S QUIET IN HOENN</b><p>Visits, battles, base changes and other real Emerald moments will show up here.</p></section>`;
  return `${presenceHtml()}<div class="hoenn-buzz-scope"><b>${scope}</b><span>${STATE.buzzScope==='world'?'Your adventures + public stories':'Your recent adventures'}</span></div><section class="hoenn-buzz-feed">${stories.map((s,i)=>`<article class="hoenn-buzz-story${i===0?' is-lead':''}" data-accent="${esc(s.accent||'base')}"><div class="hoenn-buzz-meta"><span>${i===0?'TOP STORY':'BUZZ'}</span><time>${esc(eventTime(s.latest))}</time></div><b>${esc(s.title)}</b><p>${esc(s.summary)}</p>${s.events.slice(0,3).map(e=>`<small>${esc(eventText(e))}</small>`).join('')}</article>`).join('')}</section>`;
}
function viewTabs(){return `<nav class="hoenn-view-tabs" aria-label="Hoenn view"><button type="button" data-view="hoenn" aria-pressed="${STATE.view==='hoenn'}">HOENN</button><button type="button" data-view="buzz" aria-pressed="${STATE.view==='buzz'}">BUZZ</button></nav>`}
function statusHtml(){if(STATE.lastError)return `<div class="hoenn-feedback hoenn-error" role="alert"><b>HOENN ERROR</b><span>${esc(STATE.lastError)}</span></div>`;if(!STATE.status)return '';const cls=STATE.statusKind==='success'?' hoenn-success':'';return `<div class="hoenn-feedback${cls}" role="status"><b>${esc(STATE.status)}</b>${STATE.statusDetail?`<span>${esc(STATE.statusDetail)}</span>`:''}</div>`}
function hoennSectionHeading(label,icon,alt=''){
  return `<h3 class="hoenn-section-heading"><img src="./assets/hoenn-sections/${icon}" alt="${esc(alt)}" aria-hidden="true"><span>${esc(label)}</span></h3>`;
}
function tvInboxHtml(){
  const b=STATE.tvInbox?.broadcast||null;
  if(!b)return `<section>${hoennSectionHeading('HOENN TV','hoenn-tv.png')}<p class="hoenn-muted">No new native broadcast is waiting. Visit activity can become TV after Emerald creates a real Secret Base Secrets record.</p></section>`;
  const label=STATE.tvBusy?'TUNING IN…':'SEND TO TV';
  return `<section>${hoennSectionHeading('HOENN TV','hoenn-tv.png')}<div class="hoenn-own"><div><b>${esc(b.category||'SECRET BASE SECRETS')}</b><small>${esc(b.text||'A native Hoenn story is ready.')}</small></div><button type="button" data-tv-receive ${STATE.tvBusy||STATE.busy?'disabled':''}>${label}</button></div><p class="hoenn-muted">Native Emerald broadcast · ${esc(b.actor||'TRAINER')} → ${esc(b.subject||'TRAINER')}</p></section>`;
}
function render(){
  const p=document.getElementById('hoenn-online-panel'),btn=document.getElementById('hoenn-online-switch'),escapeBtn=document.getElementById('hoenn-online-escape');if(!p||!btn||!escapeBtn)return;
  btn.setAttribute('aria-pressed',STATE.open?'true':'false');document.documentElement.dataset.hoennOpen=STATE.open?'1':'0';document.documentElement.dataset.hoennView=STATE.view;p.hidden=!STATE.open;escapeBtn.hidden=!STATE.open;syncLauncherState();if(!STATE.open)return;
  const sess=bridge()?.getSession?.()||{};
  if(STATE.view==='buzz'){
    const sourceLabel=STATE.buzzScope==='world'?'Stories from around Hoenn':'Your recent Hoenn stories';
    p.innerHTML=`<header><div><b>HOENN BUZZ</b><small>${sourceLabel}</small></div><button type="button" data-close aria-label="Close Hoenn Buzz">×</button></header>${viewTabs()}${buzzHtml()}<footer><b>REAL EVENTS, SHORT STORIES.</b> BUZZ turns things that actually happen in Emerald into updates you can read at a glance. <a href="https://madeby.re/games/emerald" target="_blank" rel="noopener">Open Emerald · MadeBy ↗</a></footer>`;
    return;
  }
  if(!sess.authenticated){p.innerHTML=`<header><div><b>EMERALD · MADEBY.RE</b><small>Native Secret Bases</small></div><button type="button" data-close aria-label="Close Emerald · MadeBy">×</button></header>${viewTabs()}<p>Sign in to Save Vault first. Your existing Vault account is your Emerald · MadeBy account.</p>`;return}
  const preview=STATE.localPreview,me=STATE.me;
  const own=me?`<b>${esc(me.trainer_name)}</b><small>${esc(routeLabel(me.secret_base_id))}</small>`:preview?`<b>${esc(preview.trainer_name)}</b><small>${esc(routeLabel(preview.secret_base_id))}</small>`:'<span>Reading your Emerald save…</span>';
  const published=!!(me?.secret_base_payload_hash||STATE.publishedLocal),publishLabel=STATE.busyAction==='publish'?'PUBLISHING…':STATE.publishLocked?'PUBLISHED ✓':(published?'UPDATE BASE':'PUBLISH BASE'),publishDisabled=STATE.busy||STATE.publishLocked;
  p.innerHTML=`<header><div><b>EMERALD · MADEBY.RE</b><small>Native Secret Bases</small></div><button type="button" data-close aria-label="Close Emerald · MadeBy">×</button></header>${viewTabs()}${statusHtml()}<section>${hoennSectionHeading('YOUR BASE','secret-base.png')}<div class="hoenn-own">${own}<button type="button" data-publish ${publishDisabled?'disabled':''}>${publishLabel}</button></div></section>${tvInboxHtml()}<section>${hoennSectionHeading('TRAINERS','trainers.png')}${STATE.trainers.length?STATE.trainers.map(cardTrainer).join(''):'<p class="hoenn-muted">No published trainers yet.</p>'}</section><section>${hoennSectionHeading('ACTIVITY','activity.png')}${STATE.activity.length?STATE.activity.slice(0,12).map(e=>`<p class="hoenn-event">${esc(e.display_text||e.type)}</p>`).join(''):'<p class="hoenn-muted">Native world events will appear here after save sync.</p>'}</section><footer>Emerald remains the world. Emerald · MadeBy only moves native records between saves.</footer>`;
}
async function refreshAll({quiet=false,preserveStatus=false,snapshot=null}={}){
  if(!bridge()?.getSession?.().authenticated)return;
  try{
    const [me,tr,ac,tv]=await Promise.all([api('me',{timeoutMs:9000}),api('trainers',{timeoutMs:9000}),api('activity',{timeoutMs:9000}),api('tv_inbox',{timeoutMs:9000})]);
    STATE.me=me.trainer;STATE.trainers=tr.trainers||[];STATE.activity=ac.activity||[];STATE.tvInbox={available:!!tv.available,broadcast:tv.broadcast||null};if(STATE.buzzScope==='connected')STATE.buzzActivity=STATE.activity.slice();else if(STATE.buzzActivity.length)STATE.buzzActivity=mergeBuzzActivity(STATE.buzzActivity,STATE.activity);
    if(!preserveStatus){STATE.lastError='';if(!quiet){STATE.status='';STATE.statusDetail='';STATE.statusKind=''}}
    await recomputeRelations({snapshot,quiet:true});
  }catch(e){if(!quiet)STATE.lastError=e?.message||String(e);render()}
}
async function publishBase(){
  if(STATE.busy||STATE.publishLocked)return;const b=bridge();
  if(!b?.getActiveSnapshot){STATE.lastError='SAVE VAULT BRIDGE NOT READY';STATE.status='';STATE.statusDetail='';render();return}
  STATE.busy=true;STATE.busyAction='publish';STATE.lastError='';STATE.statusKind='';STATE.statusDetail='';STATE.status='READING ACTIVE EMERALD SAVE…';render();
  try{
    const snap=await b.getActiveSnapshot({serverBackup:false});STATE.status='FOUND SAVE · CHECKING YOUR SECRET BASE…';render();
    const payload=await serializeSecretBase(snap.bytes,{version:2,avatarOverride:null});await deserializeSecretBase(payload);STATE.localPreview=payload.record.summary;
    STATE.status=`FOUND ${payload.record.summary.trainer_name||'TRAINER'} · ${routeLabel(payload.record.summary.secret_base_id)} · PUBLISHING…`;render();
    await api('publish_base',{method:'POST',body:{public_base:true,payload},timeoutMs:15000});STATE.publishedLocal=true;STATE.publishLocked=true;STATE.lastError='';STATE.statusKind='success';STATE.status='BASE PUBLISHED ✓';STATE.statusDetail='Ready for your second save.';render();refreshAll({quiet:true,preserveStatus:true,snapshot:snap}).catch(()=>{});
  }catch(e){STATE.lastError=e?.message||String(e);STATE.status='';STATE.statusDetail='';STATE.statusKind=''}
  finally{STATE.busy=false;STATE.busyAction='';render()}
}
async function addBase(sourceAccountId){
  if(STATE.busy)return;const trainer=STATE.trainers.find(x=>trainerKey(x)===String(sourceAccountId));if(!trainer)return;
  const known=relationForTrainer(trainer);if(known.state===RELATION_STATES.PRESENT_CURRENT)return;
  if(known.state===RELATION_STATES.NO_SAFE_SLOT){STATE.lastError='NO SAFE SLOT · THIS EMERALD SAVE WILL NOT BE CHANGED';render();return}
  const isUpdate=known.state===RELATION_STATES.PRESENT_OUTDATED;
  STATE.busy=true;STATE.busyAction=isUpdate?'update':'add';STATE.busySourceId=String(sourceAccountId);STATE.lastError='';STATE.status=isUpdate?'REQUESTING UPDATED TRAINER BASE…':'REQUESTING TRAINER BASE…';STATE.statusDetail='';STATE.statusKind='';render();
  try{
    const delivery=await api('request_delivery',{method:'POST',body:{source_account_id:sourceAccountId}});STATE.status='CHECKING INCOMING BASE…';render();
    const incoming=await deserializeSecretBase(delivery.payload),sum=summarizeRecord(incoming),override={payload:delivery.payload,secret_base_relation_hash:await relationRecordHash(incoming),secret_base_payload_hash:delivery.payload?.record?.native_sha256,secret_base_owner_key:ownerKey(incoming),secret_base_id:sum.secret_base_id,trainer_name_hex:sum.trainer_name_hex,trainer_id_hex:sum.trainer_id_hex,gender:sum.gender};STATE.manifestOverrides.set(String(sourceAccountId),override);
    const current=await bridge().getActiveSnapshot({serverBackup:false}),pre=await resolveSecretBaseRelation(current.bytes,{...trainer,...override});STATE.relations.set(String(sourceAccountId),pre);render();
    if(pre.state===RELATION_STATES.NO_SAFE_SLOT)throw new Error('NO SAFE SLOT · ALL SAFE NATIVE FRIEND SLOTS ARE PROTECTED OR UNAVAILABLE');
    if(pre.state===RELATION_STATES.PRESENT_CURRENT){
      await api('ack_delivery',{method:'POST',body:{delivery_id:delivery.delivery.id,recipient_slot:pre.local_slot}});STATE.statusKind='success';STATE.status='IN MY HOENN ✓';STATE.statusDetail='This exact published base is already in the active Emerald save.';await refreshAll({quiet:true,preserveStatus:true,snapshot:current});return;
    }
    const action=pre.state===RELATION_STATES.PRESENT_OUTDATED?'update':'add',result=await insertSecretBase(current.bytes,delivery.payload,{allowEvictUnregistered:false});
    STATE.status=action==='update'?'BACKING UP + UPDATING BASE IN EMERALD…':'BACKING UP + ADDING BASE TO EMERALD…';render();
    await bridge().applyMutation(result.bytes,{expectedBeforeSha256:result.report.before_sha256,label:`HOENN · ${delivery.source?.trainer_name||sum.trainer_name||'SECRET BASE'}`});
    const post=await bridge().getActiveSnapshot({serverBackup:false}),postRel=await resolveSecretBaseRelation(post.bytes,{...trainer,...override});
    if(postRel.state!==RELATION_STATES.PRESENT_CURRENT)throw new Error('POST_WRITE_RELATION_VERIFICATION_FAILED');STATE.relations.set(String(sourceAccountId),postRel);render();
    await api('ack_delivery',{method:'POST',body:{delivery_id:delivery.delivery.id,recipient_slot:result.report.destination_slot_index}});await api('sync_events',{method:'POST',body:{}});
    STATE.statusKind='success';STATE.status=action==='update'?'BASE UPDATED ✓':'BASE ADDED ✓';STATE.statusDetail='IN MY HOENN ✓';await refreshAll({quiet:true,preserveStatus:true,snapshot:post});
  }catch(e){STATE.lastError=e?.message||String(e);STATE.status='';STATE.statusDetail='';STATE.statusKind=''}
  finally{STATE.busy=false;STATE.busyAction='';STATE.busySourceId='';render()}
}
async function receiveTv(){
  if(STATE.tvBusy||STATE.busy)return;
  const b=bridge();
  if(!b?.getActiveSnapshot||!b?.applyMutation){STATE.lastError='SAVE VAULT BRIDGE NOT READY';render();return}
  STATE.tvBusy=true;STATE.lastError='';STATE.statusKind='';STATE.status='TUNING HOENN TV…';STATE.statusDetail='Requesting a native Emerald broadcast.';render();
  try{
    const delivery=await api('request_tv',{method:'POST',body:{},timeoutMs:15000});
    const current=await b.getActiveSnapshot({serverBackup:false});
    const result=await insertNetworkTvShow(current.bytes,delivery.payload);
    if(!result.report.already_current){
      STATE.status='BACKING UP + ADDING NATIVE TV RECORD…';STATE.statusDetail='Your save will be validated again before it is committed.';render();
      await b.applyMutation(result.bytes,{expectedBeforeSha256:result.report.before_sha256,label:'HOENN TV · SECRET BASE SECRETS'});
    }
    const post=await b.getActiveSnapshot({serverBackup:false});
    if(!verifyNetworkTvShow(post.bytes,delivery.payload,result.report.destination_tv_slot))throw new Error('TV_POST_WRITE_RELATION_VERIFICATION_FAILED');
    await api('ack_tv',{method:'POST',body:{delivery_id:delivery.delivery.id,recipient_tv_slot:result.report.destination_tv_slot},timeoutMs:15000});
    STATE.statusKind='success';STATE.status='HOENN TV DELIVERED ✓';STATE.statusDetail='Return to Emerald and watch a television.';STATE.tvInbox={available:false,broadcast:null};
    await refreshAll({quiet:true,preserveStatus:true,snapshot:post});
  }catch(e){STATE.lastError=e?.message||String(e);STATE.status='';STATE.statusDetail='';STATE.statusKind=''}
  finally{STATE.tvBusy=false;render()}
}
async function publishTrainerCardSocial(card){
  const sess=bridge()?.getSession?.()||{};
  if(!sess.authenticated)throw new Error('SIGN IN TO SAVE VAULT FIRST');
  const result=await api('publish_trainer_card',{method:'POST',body:{public_card:true,card},timeoutMs:15000});
  if(STATE.open)refreshAll({quiet:true,preserveStatus:true}).catch(()=>{});
  return result;
}
globalThis.HoennOnlineSocial=Object.freeze({
  version:'0.4.5.2',
  publishTrainerCard:publishTrainerCardSocial,
  isAuthenticated:()=>Boolean(bridge()?.getSession?.()?.authenticated),
  openHoenn:()=>setHoennOpen(true,{view:'hoenn'}),
  openBuzz:()=>setHoennOpen(true,{view:'buzz'}),
  toggleBuzz
});
try{window.dispatchEvent(new CustomEvent('hoenn:online-social-ready',{detail:{version:'0.4.5.2'}}));}catch{}

window.addEventListener('hoenn:open-buzz',()=>toggleBuzz());
window.addEventListener('hoenn:live-activity-recorded',()=>{
  if(!STATE.open)return;
  refreshAll({quiet:true,preserveStatus:true}).then(()=>{
    if(STATE.view==='buzz')return refreshBuzz({quiet:true});
  }).catch(()=>{});
});
function scheduleNativeSync(){clearTimeout(STATE.syncTimer);STATE.syncTimer=setTimeout(async()=>{try{if(!bridge()?.getSession?.().authenticated)return;await api('sync_events',{method:'POST',body:{},timeoutMs:9000});if(STATE.open)await refreshAll({quiet:true,preserveStatus:true})}catch(e){console.warn('Hoenn native event sync',e)}},900)}
function scheduleRelationRefresh(detail){clearTimeout(STATE.relationTimer);STATE.relationTimer=setTimeout(()=>{const snap=detail?.bytes?{bytes:new Uint8Array(detail.bytes),sha256:detail.sha256||''}:null;recomputeRelations({snapshot:snap,quiet:true}).catch(()=>{})},120)}
function attachBridge(){const b=bridge();if(!b)return false;if(!STATE.unsub)STATE.unsub=b.onCommittedSave(detail=>{STATE.publishLocked=false;scheduleRelationRefresh(detail);scheduleNativeSync()});return true}
async function boot(){await loadLocations();ensureUi();if(!attachBridge())window.addEventListener('jrpgworld:save-vault-bridge-ready',()=>{attachBridge();refreshAll({quiet:true});refreshPresence({ping:true}).catch(()=>{})},{once:true});document.addEventListener('visibilitychange',()=>{if(!document.hidden)refreshPresence({ping:true}).catch(()=>{})});schedulePresenceLoop();setTimeout(()=>{attachBridge();if(STATE.open)refreshAll({quiet:true});refreshPresence({ping:true}).catch(()=>{})},1800)}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
