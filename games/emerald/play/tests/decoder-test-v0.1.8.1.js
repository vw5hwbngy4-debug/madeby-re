require('../pokefield-live-v0.1.8.1.js');
const {decryptBox,hiddenPower,nationalDex,genderFromRatio,canonicalFemaleRatio,heldItemName,GENDER}=globalThis.PokeFieldLive;
const ORDERS=[
 [0,1,2,3],[0,1,3,2],[0,2,1,3],[0,3,1,2],[0,2,3,1],[0,3,2,1],
 [1,0,2,3],[1,0,3,2],[2,0,1,3],[3,0,1,2],[2,0,3,1],[3,0,2,1],
 [1,2,0,3],[1,3,0,2],[2,1,0,3],[3,1,0,2],[2,3,0,1],[3,2,0,1],
 [1,2,3,0],[1,3,2,0],[2,1,3,0],[3,1,2,0],[2,3,1,0],[3,2,1,0]
];
const w16=(b,o,v)=>{b[o]=v&255;b[o+1]=v>>>8};
const w32=(b,o,v)=>{b[o]=v&255;b[o+1]=v>>>8;b[o+2]=v>>>16;b[o+3]=v>>>24};
function makeMon(orderIndex){
 const personality=(0x12345600+orderIndex)>>>0, ot=0x89abcdef>>>0, key=(personality^ot)>>>0;
 const logical=[new Uint8Array(12),new Uint8Array(12),new Uint8Array(12),new Uint8Array(12)];
 w16(logical[0],0,392); w16(logical[0],2,191); w32(logical[0],4,12345); logical[0][9]=70;
 w16(logical[1],0,94); w16(logical[1],2,347); logical[1][8]=10; logical[1][9]=20;
 logical[2].set([4,252,0,252,0,2],0);
 const ivs=[31,3,27,30,31,29];
 let ivw=(ivs[0]|ivs[1]<<5|ivs[2]<<10|ivs[3]<<15|ivs[4]<<20|ivs[5]<<25)>>>0;
 ivw|=0x80000000; w32(logical[3],4,ivw>>>0);
 const physical=[new Uint8Array(12),new Uint8Array(12),new Uint8Array(12),new Uint8Array(12)];
 ORDERS[orderIndex].forEach((physicalIndex,logicalIndex)=>physical[physicalIndex]=logical[logicalIndex]);
 const dec=new Uint8Array(48); physical.forEach((x,i)=>dec.set(x,i*12));
 let checksum=0; for(let i=0;i<48;i+=2) checksum=(checksum+(dec[i]|dec[i+1]<<8))&0xffff;
 const raw=new Uint8Array(80); w32(raw,0,personality);w32(raw,4,ot);w16(raw,28,checksum);
 for(let i=0;i<12;i++){let v=(dec[i*4]|dec[i*4+1]<<8|dec[i*4+2]<<16|dec[i*4+3]<<24)>>>0;w32(raw,32+i*4,(v^key)>>>0)}
 return raw;
}
for(let i=0;i<24;i++){
 const m=decryptBox(makeMon(i));
 if(!m) throw new Error('decode failed order '+i);
 if(m.species!==392 || m.heldItem!==191 || m.ivs.hp!==31 || m.ivs.spa!==31 || m.ivs.spe!==30 || m.evs.atk!==252 || m.evs.spe!==252 || m.abilityNum!==1) throw new Error('wrong decode order '+i+': '+JSON.stringify(m));
}
const hp=hiddenPower({hp:31,atk:31,def:31,spe:31,spa:31,spd:31});
if(hp.type!=='Dark'||hp.power!==70) throw new Error('Hidden Power 31s failed '+JSON.stringify(hp));
if(nationalDex(277)!==252 || nationalDex(411)!==386 || nationalDex(25)!==25) throw new Error('National mapping failed');
const corrupt=makeMon(7);corrupt[40]^=1;if(decryptBox(corrupt)!==null) throw new Error('checksum did not reject corruption');
if(genderFromRatio(0x00000000,31)!==GENDER.FEMALE) throw new Error('starter female boundary low=0 failed');
if(genderFromRatio(0x0000001e,31)!==GENDER.FEMALE) throw new Error('starter female boundary low=30 failed');
if(genderFromRatio(0x0000001f,31)!==GENDER.MALE) throw new Error('starter male boundary low=31 failed');
if(genderFromRatio(0x12345678,0)!==GENDER.MALE) throw new Error('male-only failed');
if(genderFromRatio(0x12345678,254)!==GENDER.FEMALE) throw new Error('female-only failed');
if(genderFromRatio(0x12345678,255)!==GENDER.GENDERLESS) throw new Error('genderless failed');
if(canonicalFemaleRatio(31)!==12.5 || canonicalFemaleRatio(127)!==50) throw new Error('canonical gender ratio labels failed');
if(heldItemName(191)!=='Soul Dew' || heldItemName(139)!=='Oran Berry' || heldItemName(200)!=='Leftovers' || heldItemName(0)!=='') throw new Error('held item mapping failed');
console.log('PASS: 24/24 permutations, checksum rejection, IV/EV/held-item decode, held-item names, Hidden Power, national mapping, Gen III gender');
