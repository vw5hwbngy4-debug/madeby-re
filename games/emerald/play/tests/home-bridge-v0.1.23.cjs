const fs=require('fs');
const path=require('path');
const C=require('../home-bridge-core-v0.1.23.js');
const ORDERS=[
 [0,1,2,3],[0,1,3,2],[0,2,1,3],[0,3,1,2],[0,2,3,1],[0,3,2,1],
 [1,0,2,3],[1,0,3,2],[2,0,1,3],[3,0,1,2],[2,0,3,1],[3,0,2,1],
 [1,2,0,3],[1,3,0,2],[2,1,0,3],[3,1,0,2],[2,3,0,1],[3,2,0,1],
 [1,2,3,0],[1,3,2,0],[2,1,3,0],[3,1,2,0],[2,3,1,0],[3,2,1,0]
];
const w16=(b,o,v)=>{b[o]=v&255;b[o+1]=(v>>>8)&255};
const w32=(b,o,v)=>{b[o]=v&255;b[o+1]=(v>>>8)&255;b[o+2]=(v>>>16)&255;b[o+3]=(v>>>24)&255};
function makeMon(orderIndex=7){
 const personality=(0x12345600+orderIndex)>>>0,ot=0x89abcdef>>>0,key=(personality^ot)>>>0;
 const logical=[new Uint8Array(12),new Uint8Array(12),new Uint8Array(12),new Uint8Array(12)];
 w16(logical[0],0,392);w32(logical[0],4,12345);logical[0][9]=70;
 w16(logical[1],0,94);w16(logical[1],2,347);logical[1][8]=10;logical[1][9]=20;
 logical[2].set([4,252,0,252,0,2],0);
 const ivs=[31,3,27,30,31,29];let ivw=(ivs[0]|ivs[1]<<5|ivs[2]<<10|ivs[3]<<15|ivs[4]<<20|ivs[5]<<25)>>>0;ivw|=0x80000000;w32(logical[3],4,ivw>>>0);
 const physical=[new Uint8Array(12),new Uint8Array(12),new Uint8Array(12),new Uint8Array(12)];ORDERS[orderIndex].forEach((physicalIndex,logicalIndex)=>physical[physicalIndex]=logical[logicalIndex]);
 const dec=new Uint8Array(48);physical.forEach((x,i)=>dec.set(x,i*12));let checksum=0;for(let i=0;i<48;i+=2)checksum=(checksum+(dec[i]|dec[i+1]<<8))&0xffff;
 const raw=new Uint8Array(80);w32(raw,0,personality);w32(raw,4,ot);raw[18]=2;raw[19]=2;w16(raw,28,checksum);for(let i=0;i<12;i++){const v=(dec[i*4]|dec[i*4+1]<<8|dec[i*4+2]<<16|dec[i*4+3]<<24)>>>0;w32(raw,32+i*4,(v^key)>>>0)}return raw;
}
(async()=>{
 const raw=makeMon();const check=C.inspectPK3(raw);if(!check.valid)throw new Error('valid PK3 rejected');
 const corrupt=new Uint8Array(raw);corrupt[44]^=1;if(C.inspectPK3(corrupt).valid)throw new Error('corrupt PK3 accepted');
 const res=await C.makeTransferPack({pk3:raw,mon:{species:'Deoxys',dexNo:386,level:50,kind:'OWNED',personality:check.pid,otId:check.otId,trainerId:check.trainerId,secretId:check.secretId,ivs:{hp:31,atk:3,def:27,spa:31,spd:29,spe:30},evs:{hp:4,atk:252,def:0,spa:0,spd:2,spe:252},hiddenPower:{type:'Ice',power:68},ribbons:{count:0},moves:[]},sourceRef:'P0:test'});
 if(res.pack.length<raw.length||!res.manifest.integrity.verifiedGen3Checksum||res.manifest.stage!=='SOURCE_CAPTURE')throw new Error('pack generation failed');
 const tmp=path.join(__dirname,'home-bridge-pack-test.zip');fs.writeFileSync(tmp,res.pack);if(!fs.existsSync(tmp)||fs.statSync(tmp).size!==res.pack.length)throw new Error('zip write failed');fs.unlinkSync(tmp);console.log('PASS v0.1.23 source capsule: PK3 checksum reject/accept + provenance ZIP build');
})();
