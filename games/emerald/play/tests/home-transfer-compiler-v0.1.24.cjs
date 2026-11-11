const fs=require('fs');
const path=require('path');
globalThis.JRPGWorldHomeBridgeCore=require('../home-bridge-core-v0.1.24.js');
const T=require('../home-transfer-compiler-v0.1.24.js');
const ORDERS=[
 [0,1,2,3],[0,1,3,2],[0,2,1,3],[0,3,1,2],[0,2,3,1],[0,3,2,1],
 [1,0,2,3],[1,0,3,2],[2,0,1,3],[3,0,1,2],[2,0,3,1],[3,0,2,1],
 [1,2,0,3],[1,3,0,2],[2,1,0,3],[3,1,0,2],[2,3,0,1],[3,2,0,1],
 [1,2,3,0],[1,3,2,0],[2,1,3,0],[3,1,2,0],[2,3,1,0],[3,2,1,0]
];
const w16=(b,o,v)=>{b[o]=v&255;b[o+1]=(v>>>8)&255};
const w32=(b,o,v)=>{b[o]=v&255;b[o+1]=(v>>>8)&255;b[o+2]=(v>>>16)&255;b[o+3]=(v>>>24)&255};
const u16=(b,o)=>(b[o]|b[o+1]<<8)>>>0;
const u32=(b,o)=>(b[o]|b[o+1]<<8|b[o+2]<<16|b[o+3]<<24)>>>0;
const encAscii=s=>{
 const out=new Uint8Array(10);out.fill(0xFF);
 for(let i=0;i<s.length&&i<10;i++){
  const c=s[i]; if(c>='A'&&c<='Z')out[i]=0xBB+(c.charCodeAt(0)-65);
  else if(c>='a'&&c<='z')out[i]=0xD5+(c.charCodeAt(0)-97);
  else if(c>='0'&&c<='9')out[i]=0xA1+(c.charCodeAt(0)-48);
  else if(c===' ')out[i]=0;
 }
 return out;
};
function makeTreecko(orderIndex=7){
 const pid=(0x12345600+orderIndex)>>>0,oid=0x89abcdef>>>0,key=(pid^oid)>>>0;
 const logical=[new Uint8Array(12),new Uint8Array(12),new Uint8Array(12),new Uint8Array(12)];
 // Growth: Treecko internal 277 -> National 252, Potion item 13 just to exercise item mapping, EXP, PP Ups, friendship.
 w16(logical[0],0,277);w16(logical[0],2,13);w32(logical[0],4,135);logical[0][8]=0b00011011;logical[0][9]=70;
 // Moves include Gen3 HM Cut; compiler must remove it and compact/heal remaining moves.
 w16(logical[1],0,15);w16(logical[1],2,1);w16(logical[1],4,71);w16(logical[1],6,98);logical[1].set([1,2,3,4],8);
 // EV order HP, Atk, Def, Spe, SpA, SpD + contest stats.
 logical[2].set([4,255,0,255,0,2,10,20,30,40,50,60],0);
 // Pokerus, met location, origins, IVs + ribbon word.
 logical[3][0]=0x21;logical[3][1]=16;const origins=(5|(3<<7)|(4<<11));w16(logical[3],2,origins);
 const ivs=[31,3,27,30,31,29];let ivw=(ivs[0]|ivs[1]<<5|ivs[2]<<10|ivs[3]<<15|ivs[4]<<20|ivs[5]<<25)>>>0;w32(logical[3],4,ivw);
 // Cool=2, Beauty=1, ChampionG3 bit15, Effort bit19, Fateful bit31.
 const ribbons=(2|(1<<3)|(1<<15)|(1<<19)|0x80000000)>>>0;w32(logical[3],8,ribbons);
 const physical=[new Uint8Array(12),new Uint8Array(12),new Uint8Array(12),new Uint8Array(12)];ORDERS[orderIndex].forEach((physicalIndex,logicalIndex)=>physical[physicalIndex]=logical[logicalIndex]);
 const dec=new Uint8Array(48);physical.forEach((x,i)=>dec.set(x,i*12));let checksum=0;for(let i=0;i<48;i+=2)checksum=(checksum+(dec[i]|dec[i+1]<<8))&0xffff;
 const raw=new Uint8Array(80);w32(raw,0,pid);w32(raw,4,oid);raw.set(encAscii('TREECKO'),8);raw[18]=2;raw[19]=2;raw.set(encAscii('RAYNOR').slice(0,7),20);raw[27]=0b0101;w16(raw,28,checksum);
 for(let i=0;i<12;i++){const v=u32(dec,i*4);w32(raw,32+i*4,(v^key)>>>0)}
 const mon={species:'Treecko',dexNo:252,level:5,kind:'OWNED',personality:pid,otId:oid,trainerId:oid&0xffff,secretId:oid>>>16,gender:'Male',nature:'Hardy',ability:'Overgrow',ivs:{hp:31,atk:3,def:27,spa:31,spd:29,spe:30},evs:{hp:4,atk:255,def:0,spa:0,spd:2,spe:255},ribbons:{count:3},moves:[]};
 return {raw,mon,pid,oid};
}
(async()=>{
 for(let i=0;i<24;i++){
  const {raw,mon,pid,oid}=makeTreecko(i); const r=T.compile({pk3:raw,mon,date:new Date('2026-09-09T12:00:00Z')});
  if(r.source.species!==252)throw new Error(`perm ${i}: species map`);
  if(r.source.nickname!=='TREECKO'||r.source.ot!=='RAYNOR')throw new Error(`perm ${i}: strings ${r.source.nickname}/${r.source.ot}`);
  if(r.source.isNicknamed)throw new Error(`perm ${i}: default Gen3 species name incorrectly flagged as nicknamed`);
  if((u32(r.pk4.decrypted,0x38)>>>31)!==0)throw new Error(`perm ${i}: PK4 nicknamed bit incorrectly set`);
  if(u32(r.pk4.decrypted,0)!==pid||u32(r.pk5.decrypted,0)!==pid)throw new Error(`perm ${i}: PID`);
  if(u32(r.pk4.decrypted,0x0c)!==oid||u32(r.pk5.decrypted,0x0c)!==oid)throw new Error(`perm ${i}: OID`);
  if(u16(r.pk4.decrypted,0x80)!==0x37)throw new Error(`perm ${i}: Pal Park location`);
  if(u16(r.pk5.decrypted,0x80)!==30001)throw new Error(`perm ${i}: Poké Transfer location`);
  if(u16(r.pk4.decrypted,0x28)===15||u16(r.pk5.decrypted,0x28)===15)throw new Error(`perm ${i}: HM not removed`);
  if(u16(r.pk4.decrypted,0x28)!==1)throw new Error(`perm ${i}: move compact`);
  if(r.pk5.decrypted[0x41]!==pid%25)throw new Error(`perm ${i}: Gen5 nature`);
  if(r.pk4.decrypted[0x15]!==65)throw new Error(`perm ${i}: Overgrow ability ID`);
  if(!T.verify45(r.pk4.stored).valid||!T.verify45(r.pk5.stored).valid)throw new Error(`perm ${i}: encrypted roundtrip/checksum`);
  if(r.audit.boundary.pk6Binary!=='WITHHELD'||r.pk6Prebind.status!=='TARGET_BIND_REQUIRED')throw new Error(`perm ${i}: safety boundary`);
  if(r.pk6Prebind.evs[1]!==252||r.pk6Prebind.evs[3]!==252)throw new Error(`perm ${i}: Gen6 EV cap`);
 }
 // Exact Gen3 nickname semantics: a real nickname must set PK4 bit31.
 {const {raw,mon}=makeTreecko();raw.set(encAscii('SPROUT'),8);const r=T.compile({pk3:raw,mon});if(!r.source.isNicknamed)throw new Error('custom nickname not detected');if((u32(r.pk4.decrypted,0x38)>>>31)!==1)throw new Error('PK4 nicknamed bit not set');}
 // Mismatch guard.
 {const {raw,mon}=makeTreecko();let threw=false;try{T.compile({pk3:raw,mon:{...mon,dexNo:253}})}catch(e){threw=true}if(!threw)throw new Error('species mismatch accepted');}
 const {raw,mon}=makeTreecko(); const pack=await T.makeCompilerPack({pk3:raw,mon,date:new Date('2026-09-09T12:00:00Z')});
 if(!pack.pack.length||!pack.hashes.pk4||pack.manifest.stage!=='TRANSFER_COMPILED_TO_PK5')throw new Error('compiler pack failed');
 const tmp=path.join(__dirname,'transfer-compiler-pack-test.zip');fs.writeFileSync(tmp,pack.pack);if(fs.statSync(tmp).size!==pack.pack.length)throw new Error('pack write failed');fs.unlinkSync(tmp);
 console.log('PASS v0.1.24 transfer compiler: 24/24 PK3 permutations + PK4/PK5 native crypto/checksum + transforms + PK6 target-bind boundary + ZIP');
})();
