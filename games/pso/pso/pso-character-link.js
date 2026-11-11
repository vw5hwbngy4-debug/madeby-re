
export const PROFILE="pso_xbox_ep12_mu_character_0x28e8_v1";
const FILE_SIZE=0x10000, HEADER=0x6048, PAYLOAD_SIZE=0x28E8, SEED_OFF=0x28E4, CHAR=4, SIG=0xC87ED5B1;
const SECTIONS=["Viridia","Greennill","Skyly","Bluefull","Purplenum","Pinkal","Redria","Oran","Yellowboze","Whitill"];
const CLASSES=["HUmar","HUnewearl","HUcast","RAmar","RAcast","RAcaseal","FOmarl","FOnewm","FOnewearl","HUcaseal","FOmar","RAmarl"];
const LANGS=["Japanese","English","German","French","Spanish","Simplified Chinese","Traditional Chinese","Korean"];
const TECHS=["Foie","Gifoie","Rafoie","Barta","Gibarta","Rabarta","Zonde","Gizonde","Razonde","Grants","Deband","Jellen","Zalure","Shifta","Ryuker","Resta","Anti","Reverser","Megid"];
const MAG_COLORS=["red","blue","yellow","green","purple","black","white","cyan","brown","orange","light-blue","olive","turquoise","fuchsia","grey","cream","pink","dark-green","costume"];
const PBS=["Farlla","Estlla","Golla","Pilla","Leilla","Mylla & Youlla"];
const DIFFS=["Normal","Hard","Very Hard","Ultimate"];

function B(x){if(x instanceof Uint8Array)return x;if(x instanceof ArrayBuffer)return new Uint8Array(x);if(ArrayBuffer.isView(x))return new Uint8Array(x.buffer,x.byteOffset,x.byteLength);throw new TypeError("Expected ArrayBuffer or Uint8Array")}
function V(b){return new DataView(b.buffer,b.byteOffset,b.byteLength)}
function u16(b,o){return V(b).getUint16(o,true)}
function i16(b,o){return V(b).getInt16(o,true)}
function u32(b,o){return V(b).getUint32(o,true)}
function h32(n){return "0x"+(n>>>0).toString(16).toUpperCase().padStart(8,"0")}
function hx(b){return Array.from(b,x=>x.toString(16).padStart(2,"0")).join("")}
function zero(b){for(const x of b)if(x!==0)return false;return true}
function hms(s){const h=Math.floor(s/3600),m=Math.floor((s%3600)/60);return `${h}:${String(m).padStart(2,"0")}:${String(s%60).padStart(2,"0")}`}
function ascii(b){let e=b.indexOf(0);if(e<0)e=b.length;const s=b.subarray(0,e);for(const x of s)if(!((x>=0x20&&x<0x7F)||x===9||x===10||x===13))return null;return new TextDecoder("ascii").decode(s)}

const CT=(()=>{const t=new Uint32Array(256);for(let n=0;n<256;n++){let c=n;for(let k=0;k<8;k++)c=(c&1)?(0xEDB88320^(c>>>1)):(c>>>1);t[n]=c>>>0}return t})();
export function crc32(input){const b=B(input);let c=0xFFFFFFFF;for(const x of b)c=CT[(c^x)&255]^(c>>>8);return(c^0xFFFFFFFF)>>>0}

export class PSOV2Encryption{
  constructor(seed){this.s=new Uint32Array(0x39);this.o=0;let a=1>>>0,b=seed>>>0;this.s[0x37]=b;for(let vi=0x15;vi<=0x36*0x15;vi+=0x15){this.s[vi%0x37]=a;const c=(b-a)>>>0;b=a;a=c}for(let i=0;i<5;i++)this.update()}
  update(){for(let z=1;z<0x19;z++)this.s[z]=(this.s[z]-this.s[z+0x1F])>>>0;for(let z=0x19;z<0x38;z++)this.s[z]=(this.s[z]-this.s[z-0x18])>>>0;this.o=1}
  next(){if(this.o===0x38)this.update();return this.s[this.o++]>>>0}
  cryptLE(input){const out=new Uint8Array(B(input)),v=V(out),words=Math.floor(out.length/4);for(let i=0;i<words;i++){const o=i*4;v.setUint32(o,(v.getUint32(o,true)^this.next())>>>0,true)}const extra=out.length%4;if(extra){const o=words*4,tmp=new Uint8Array(4);tmp.set(out.subarray(o));const tv=V(tmp);tv.setUint32(0,(tv.getUint32(0,true)^this.next())>>>0,true);out.set(tmp.subarray(0,extra),o)}return out}
}

function primary(d){const c=d[0];if(c===4)return 0x04000000;if(c===2)return(0x02000000|(d[1]<<16))>>>0;if(c===3&&d[1]===2)return(0x03020000|(d[4]<<8)|d[2])>>>0;return((c<<24)|(d[1]<<16)|(d[2]<<8))>>>0}
function nameItem(d){
  if(d[0]===0&&d[2]===0)return new Map([[1,"Saber"],[2,"Sword"],[3,"Dagger"],[4,"Partisan"],[5,"Slicer"],[6,"Handgun"],[7,"Rifle"],[8,"Mechgun"],[9,"Shot"],[10,"Cane"],[11,"Rod"],[12,"Wand"]]).get(d[1])??null;
  if(d[0]===1&&d[2]===0){if(d[1]===1)return"Frame";if(d[1]===2)return"Barrier";if(d[1]===3)return"Unit"}
  if(d[0]===2&&d[1]===0)return"Mag";
  if(d[0]===3&&d[1]===2){const n=TECHS[d[4]]??`Technique ${d[4]}`;return`Disk:${n} Lv.${d[2]+1}`}
  if(d[0]===3){return new Map([["0:0","Monomate"],["0:1","Dimate"],["0:2","Trimate"],["1:0","Monofluid"],["1:1","Difluid"],["1:2","Trifluid"],["3:0","Antidote"],["3:1","Antiparalysis"],["4:0","Sol Atomizer"],["5:0","Moon Atomizer"],["6:0","Star Atomizer"],["7:0","Telepipe"],["8:0","Trap Vision"]]).get(`${d[1]}:${d[2]}`)??null}
  if(d[0]===4)return"Meseta";return null
}
function pb(d1,d2,slot){const f=d2[2],n=d1[3];if(slot===0)return(f&1)?(n&7):null;if(slot===1)return(f&2)?((n&0x38)>>3):null;if(slot===2){if(!(f&4))return null;const used=(1<<(n&7))|(1<<((n>>3)&7));let left=(n>>6)&3;for(let z=0;z<6;z++)if(!(used&(1<<z))){if(left===0)return z;left--}}return null}
function item(data20,state=null,flags=null,ext1=null,ext2=null){
  const d1=data20.subarray(0,12),d2=data20.subarray(16,20),id=u32(data20,12),c=d1[0];
  const r={raw_hex:hx(data20),data1_hex:hx(d1),data2_hex:hx(d2),item_id:id,item_id_hex:h32(id),primary_identifier:h32(primary(d1)),item_class:c,item_class_name:({0:"weapon",1:"armor_shield_unit",2:"mag",3:"tool",4:"meseta"})[c]??"unknown",friendly_name:nameItem(d1)};
  if(state!==null){r.state=state;r.state_name=({0:"floor",1:"inventory",2:"inventory_equipped",3:"destroying"})[state]??"unknown"}if(flags!==null){r.flags=h32(flags);r.equipped=Boolean(flags&8)}if(ext1!==null)r.extension_data1=ext1;if(ext2!==null)r.extension_data2=ext2;
  if(c===0)r.weapon={type:d1[1],subtype:d1[2],grind:d1[3],special_flags:d1[4],attributes_raw_hex:hx(d1.subarray(6,12))};
  else if(c===1){const st=d1[1],o={subtype:st,subtype_name:({1:"armor",2:"shield",3:"unit"})[st]??"unknown"};if(st===1||st===2){o.slot_count=st===1?d1[5]:null;o.defense_bonus=u16(d1,6);o.evasion_bonus=u16(d1,8)}else if(st===3){o.equipped_unit_slot_index=d1[4];o.modifier=i16(d1,6)}r.armor_shield_unit=o}
  else if(c===2){const D=u16(d1,4),P=u16(d1,6),X=u16(d1,8),M=u16(d1,10),lv=Math.floor(D/100)+Math.floor(P/100)+Math.floor(X/100)+Math.floor(M/100);r.mag={type_id:d1[1],stored_level:d1[2],computed_level:lv,level_consistent:d1[2]===lv,def_raw:D,pow_raw:P,dex_raw:X,mind_raw:M,def:D/100,pow:P/100,dex:X/100,mind:M/100,photon_blast_encoding:d1[3],synchro:d2[0],iq:d2[1],flags:d2[2],color_id:d2[3],color_name:MAG_COLORS[d2[3]]??null,photon_blasts:["center","right","left"].map((s,i)=>{const id=pb(d1,d2,i);return{slot:s,id,name:id!==null&&id<PBS.length?PBS[id]:null}})}}
  else if(c===3){if(d1[1]===2){const t=d1[4];r.tech_disk={technique_id:t,technique_name:TECHS[t]??null,level_index:d1[2],level:d1[2]+1}}else r.tool={type:d1[1],subtype:d1[2],amount_byte:d1[5]}}
  else if(c===4)r.meseta_amount=u32(d2,0);return r
}
function slot(it){if(!it.equipped)return null;if(it.item_class===0)return"weapon";if(it.item_class===2)return"mag";if(it.item_class===1){const s=it.armor_shield_unit?.subtype;if(s===1)return"armor";if(s===2)return"shield";if(s===3){const i=it.armor_shield_unit?.equipped_unit_slot_index;return Number.isInteger(i)&&i>=0&&i<4?`unit_${i+1}`:"unit_unknown"}}return null}
function bitset(raw){const a=[];for(let i=0;i<raw.length*8;i++)if(raw[i>>3]&(1<<(i&7)))a.push(i);return a}
function bad(code,message,more={}){return{valid:false,trusted:false,profile:PROFILE,error:{code,message,...more}}}

export function decodeXboxPSOMemoryUnit(input,{seedOverride}={}){
  let src;try{src=B(input)}catch(e){return bad("BAD_INPUT",e.message)}
  if(src.length!==FILE_SIZE)return bad("UNSUPPORTED_FILE_SIZE","This does not appear to be a supported Xbox PSO Memory Unit character save.",{actual:src.length,expected:FILE_SIZE});
  const sourceSize=u32(src,0x14),dataSize=u32(src,0x6040),headExp=u32(src,0x6044),headData=new Uint8Array(0x2048);headData.set(src.subarray(0x4000,0x6044));const headGot=crc32(headData);
  if(sourceSize!==src.length-0x4000)return bad("SOURCE_SIZE_MISMATCH","Xbox save container size validation failed.");
  if(dataSize!==PAYLOAD_SIZE)return bad("UNSUPPORTED_PAYLOAD_SIZE","Unsupported Xbox PSO Memory Unit payload profile.",{actual:dataSize,expected:PAYLOAD_SIZE});
  if(headExp!==headGot)return bad("HEADER_CRC_FAILED","Xbox save header integrity validation failed. No character data was trusted.");
  const end=HEADER+dataSize;if(end>src.length)return bad("PAYLOAD_OUT_OF_RANGE","Xbox save payload exceeds file bounds.");const enc=src.subarray(HEADER,end);if(!zero(src.subarray(end)))return bad("NONZERO_PADDING","Xbox save container padding validation failed. No character data was trusted.");
  const stored=u32(enc,SEED_OFF),seed=seedOverride===undefined?stored:(seedOverride>>>0),pre=new PSOV2Encryption(seed).cryptLE(enc.subarray(0,SEED_OFF)),dec=new Uint8Array(PAYLOAD_SIZE);dec.set(pre);dec.set(enc.subarray(SEED_OFF),SEED_OFF);
  const crcExp=u32(dec,0),check=new Uint8Array(dec);check.fill(0,0,4);const crcGot=crc32(check);if(crcExp!==crcGot)return bad("PAYLOAD_CRC_FAILED","PSO character detected, but integrity validation failed. No character data was trusted.");
  const rt=new PSOV2Encryption(seed).cryptLE(dec.subarray(0,SEED_OFF));if(rt.some((x,i)=>x!==enc[i]))return bad("CRYPTO_ROUNDTRIP_FAILED","PSO V2 crypto roundtrip validation failed. No character data was trusted.");
  const signature=u32(dec,CHAR+0x424);if(signature!==SIG)return bad("CHARACTER_SIGNATURE_FAILED","PSO character structural signature validation failed. No character data was trusted.",{actual:h32(signature)});
  const num=dec[CHAR],lang=dec[CHAR+3],inventory=[];for(let i=0;i<Math.min(num,30);i++){const o=CHAR+4+i*0x1C,it=item(dec.subarray(o+8,o+0x1C),dec[o],u32(dec,o+4),dec[o+2],dec[o+3]);Object.assign(it,{index:i,unknown_a1:dec[o+1]});inventory.push(it)}
  const equipment={},dups=[];for(const it of inventory){const s=slot(it);if(!s)continue;if(equipment[s])dups.push(s);else equipment[s]={inventory_index:it.index,item_id:it.item_id_hex,name:it.friendly_name,primary_identifier:it.primary_identifier}}
  const disp=CHAR+0x34C,stats={};["ATP","MST","EVP","HP","DFP","ATA","LCK"].forEach((n,i)=>stats[n]=u16(dec,disp+i*2));stats.ESP=u16(dec,disp+0x0E);
  const levelIndex=u32(dec,disp+0x18),exp=u32(dec,disp+0x1C),meseta=u32(dec,disp+0x20),visual=disp+0x24,nameRaw=dec.subarray(visual,visual+0x10),name=ascii(nameRaw),sh=visual+0x10,sec=dec[sh+0x20],cls=dec[sh+0x21],play=u32(dec,CHAR+0x428),saveCount=u32(dec,CHAR+0x430),deathCount=u32(dec,CHAR+0x660);
  const techniques=[];for(let i=0;i<20;i++){const base=dec[disp+0xBC+i],ext=dec[CHAR+4+i*0x1C+2],idx=base===0xFF?null:base+ext;techniques.push({index:i,name:TECHS[i]??null,base_level_index:base,extension:ext,level_index:idx,level:idx===null?null:idx+1,learned:idx!==null})}
  const qflags={};DIFFS.forEach((d,i)=>{const r=dec.subarray(CHAR+0x460+i*0x80,CHAR+0x460+(i+1)*0x80);qflags[d]={set_flag_indices:bitset(r),raw_hex:hx(r)}});const qc=[];for(let i=0;i<16;i++)qc.push(u32(dec,CHAR+0x277C+i*4));
  const bo=CHAR+0x664,bn=u32(dec,bo),bm=u32(dec,bo+4),bi=[];for(let i=0;i<Math.min(bn,200);i++){const o=bo+8+i*0x18,it=item(dec.subarray(o,o+0x14));Object.assign(it,{index:i,amount:u16(dec,o+0x14),present:u16(dec,o+0x16)});bi.push(it)}
  const mags=inventory.filter(x=>x.item_class===2),struct=num<=30&&lang<LANGS.length&&sec<SECTIONS.length&&cls<CLASSES.length&&levelIndex<=199&&bn<=200&&inventory.every(x=>x.item_class>=0&&x.item_class<=4)&&inventory.every(x=>x.state===1||x.state===2)&&dups.length===0&&mags.every(x=>x.mag?.level_consistent)&&name!==null;
  if(!struct)return bad("STRUCTURAL_VALIDATION_FAILED","PSO character integrity passed cryptographically, but structural validation failed. No character data was trusted.");
  const mi=mags[0]??null,mag=mi?{...mi.mag,inventory_index:mi.index,item_id:mi.item_id_hex,name:mi.friendly_name}:null;
  return{valid:true,trusted:true,source:"verified_xbox_pso_save",profile:PROFILE,integrity:{valid:true,checksumValid:true,file_size:"pass",source_size:"pass",container_crc:"pass",zero_padding:"pass",payload_crc:"pass",crypto_roundtrip:"pass",character_signature:"pass",structure:"pass",header_checksum_expected:h32(headExp),header_checksum_computed:h32(headGot),payload_checksum_expected:h32(crcExp),payload_checksum_computed:h32(crcGot),effective_v2_seed:h32(seed),character_signature_value:h32(signature)},character:{name,name_raw_hex:hx(nameRaw),class:{id:cls,name:CLASSES[cls]},section_id:{id:sec,name:SECTIONS[sec]},language:{id:lang,name:LANGS[lang]},level_index:levelIndex,level:levelIndex+1,exp,meseta,play_time_seconds:play,play_time_hms:hms(play),save_count:saveCount,death_count:deathCount,stats},equipment,inventory,mag,techniques,bank:{num_items:bn,meseta:bm,items:bi},quests:{flags:qflags,counters:qc}}
}

function eocd(b){const min=Math.max(0,b.length-22-0xFFFF);for(let o=b.length-22;o>=min;o--)if(u32(b,o)===0x06054B50)return o;return-1}
async function inflateRaw(c){if(typeof DecompressionStream!=="function")throw new Error("Browser lacks DecompressionStream; bundle a tiny inflater such as fflate.");const ds=new DecompressionStream("deflate-raw"),s=new Blob([c]).stream().pipeThrough(ds);return new Uint8Array(await new Response(s).arrayBuffer())}
export async function extractPSOCharacterFromZip(input){
  const b=B(input),e=eocd(b);if(e<0)throw new Error("ZIP end-of-central-directory record not found.");if(u16(b,e+4)!==0||u16(b,e+6)!==0)throw new Error("Multi-disk ZIP is not supported.");
  const count=u16(b,e+10),cdSize=u32(b,e+12),cdOff=u32(b,e+16);if(cdOff===0xFFFFFFFF||cdSize===0xFFFFFFFF||count===0xFFFF)throw new Error("ZIP64 is not supported.");if(cdOff+cdSize>b.length)throw new Error("ZIP central directory exceeds archive bounds.");
  const td=new TextDecoder("utf-8");let o=cdOff;
  for(let i=0;i<count;i++){if(o+46>b.length||u32(b,o)!==0x02014B50)throw new Error("Malformed ZIP central directory.");const flags=u16(b,o+8),method=u16(b,o+10),crc=u32(b,o+16),cs=u32(b,o+20),us=u32(b,o+24),nl=u16(b,o+28),el=u16(b,o+30),cl=u16(b,o+32),lo=u32(b,o+42),name=td.decode(b.subarray(o+46,o+46+nl));if(name.split("/").pop()==="PSO_CHARACTER"){if(flags&1)throw new Error("Encrypted ZIP entries are not supported.");if(lo+30>b.length||u32(b,lo)!==0x04034B50)throw new Error("Malformed PSO_CHARACTER local header.");const lnl=u16(b,lo+26),lel=u16(b,lo+28),start=lo+30+lnl+lel,end=start+cs;if(end>b.length)throw new Error("ZIP entry exceeds archive bounds.");let out;if(method===0)out=new Uint8Array(b.subarray(start,end));else if(method===8)out=await inflateRaw(b.subarray(start,end));else throw new Error(`Unsupported ZIP compression method ${method}.`);if(out.length!==us)throw new Error("ZIP PSO_CHARACTER size mismatch.");if(crc32(out)!==crc)throw new Error("ZIP PSO_CHARACTER CRC32 failed.");return{bytes:out,entryName:name}}o+=46+nl+el+cl}
  throw new Error("ZIP does not contain PSO_CHARACTER.")
}
export async function decodeXboxPSOInput(input,{fileName="",seedOverride}={}){
  const b=B(input),zip=fileName.toLowerCase().endsWith(".zip")||(b.length>=4&&u32(b,0)===0x04034B50);
  if(zip){try{const f=await extractPSOCharacterFromZip(b),r=decodeXboxPSOMemoryUnit(f.bytes,{seedOverride});if(r.valid)r.input={kind:"zip",entry_name:f.entryName};return r}catch(e){return{valid:false,trusted:false,error:{code:"ZIP_INPUT_FAILED",message:e.message}}}}
  const r=decodeXboxPSOMemoryUnit(b,{seedOverride});if(r.valid)r.input={kind:"direct",entry_name:fileName||"PSO_CHARACTER"};return r
}

export function buildRicoSaveTruth(d){
  if(!d?.valid||!d?.trusted||!d?.integrity?.valid)return null;
  return{source:"verified_xbox_pso_save",profile:d.profile,integrity:{valid:true,checksumValid:true,container_crc:d.integrity.container_crc,payload_crc:d.integrity.payload_crc,crypto_roundtrip:d.integrity.crypto_roundtrip,character_signature:d.integrity.character_signature,structure:d.integrity.structure},authority_instruction:"VERIFIED PLAYER SAVE STATE is authoritative factual state for the current player. Never invent, replace, correct, or contradict values supplied by this block. Use canonical PSO knowledge only to interpret, compare, explain, route, and advise around this state.",character:d.character,equipment:d.equipment,inventory:d.inventory.map(x=>({index:x.index,item_id:x.item_id,item_id_hex:x.item_id_hex,primary_identifier:x.primary_identifier,name:x.friendly_name,item_class:x.item_class_name,equipped:Boolean(x.equipped),weapon:x.weapon,armor_shield_unit:x.armor_shield_unit,mag:x.mag,tool:x.tool,tech_disk:x.tech_disk})),mag:d.mag,bank:d.bank,techniques:d.techniques,quests:d.quests}
}
export function playerSpecificStarters(d){if(!d?.valid)return[];return["What should I do next?","What should I upgrade first?","How should I raise my MAG?","Which items should I keep?",`What useful ${d.character.section_id.name.toUpperCase()} drops can I get?`,"What can I equip soon?","Is anything in my inventory valuable?"]}

function esc(s){return String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]))}
export function mountXboxPSOCharacterLink(root,hooks={}){
  if(typeof root==="string")root=document.querySelector(root);if(!root)throw new Error("Character Link mount target not found");let decoded=null;
  root.innerHTML=`<section class="pso-link-panel"><div class="pso-link-kicker">RAGOL LINK</div><h2>CONNECT YOUR CHARACTER</h2><p>Upload your Xbox PSO Episode I &amp; II Memory Unit save. Rico can read your verified character state and use it to help you.</p><p class="pso-link-trust">Read-only · Local parsing · Your save is never modified</p><label class="pso-link-drop"><input type="file" accept=".zip,application/zip,application/octet-stream" hidden><strong>Choose or drop PSO_CHARACTER / Xbox export ZIP</strong><span>Nothing is uploaded just to inspect the save.</span></label><div class="pso-link-status" role="status" aria-live="polite"></div><div class="pso-link-result"></div></section>`;
  const input=root.querySelector("input"),drop=root.querySelector(".pso-link-drop"),status=root.querySelector(".pso-link-status"),result=root.querySelector(".pso-link-result");
  async function handle(file){if(!file)return;status.textContent="Reading and validating locally…";result.innerHTML="";const r=await decodeXboxPSOInput(await file.arrayBuffer(),{fileName:file.name});if(!r.valid){decoded=null;status.textContent=r.error?.message||"Unsupported save.";hooks.onUnlinked?.();return}decoded=r;const c=r.character;status.textContent="";result.innerHTML=`<article class="pso-character-card"><div class="pso-save-truth">SAVE TRUTH ACTIVE ✓</div><div class="pso-card-kicker">RAGOL LINK ACTIVE</div><h3>${esc(c.name)}</h3><div class="pso-card-sub">${esc(c.class.name)} · ${esc(c.section_id.name.toUpperCase())} · Lv. ${c.level}</div><div class="pso-verified">Save integrity verified ✓</div><dl class="pso-card-metrics"><div><dt>EXP</dt><dd>${c.exp.toLocaleString()}</dd></div><div><dt>Meseta</dt><dd>${c.meseta.toLocaleString()}</dd></div><div><dt>Playtime</dt><dd>${esc(c.play_time_hms)}</dd></div></dl><details><summary>Stats</summary><pre>${esc(JSON.stringify(c.stats,null,2))}</pre></details><details><summary>Equipment</summary><pre>${esc(JSON.stringify(r.equipment,null,2))}</pre></details><details><summary>Inventory (${r.inventory.length})</summary><pre>${esc(JSON.stringify(r.inventory,null,2))}</pre></details><details><summary>MAG</summary><pre>${esc(JSON.stringify(r.mag,null,2))}</pre></details><details><summary>Techniques</summary><pre>${esc(JSON.stringify(r.techniques,null,2))}</pre></details><details><summary>Bank</summary><pre>${esc(JSON.stringify(r.bank,null,2))}</pre></details><details><summary>Quest progress</summary><pre>${esc(JSON.stringify(r.quests,null,2))}</pre></details></article>`;hooks.onLinked?.({decoded:r,saveTruth:buildRicoSaveTruth(r),starters:playerSpecificStarters(r)})}
  input.addEventListener("change",()=>handle(input.files?.[0]));["dragenter","dragover"].forEach(e=>drop.addEventListener(e,x=>{x.preventDefault();drop.classList.add("is-dragging")}));["dragleave","drop"].forEach(e=>drop.addEventListener(e,x=>{x.preventDefault();drop.classList.remove("is-dragging")}));drop.addEventListener("drop",e=>handle(e.dataTransfer?.files?.[0]));
  return{getDecoded:()=>decoded,getSaveTruth:()=>buildRicoSaveTruth(decoded),unlink:()=>{decoded=null;result.innerHTML="";status.textContent="Character link cleared.";input.value="";hooks.onUnlinked?.()}}
}
