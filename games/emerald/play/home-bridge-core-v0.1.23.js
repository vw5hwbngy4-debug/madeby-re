/* JRPG.WORLD · HOME BRIDGE CORE v0.1.23
 * Browser-local source capsule utilities.
 * This module does NOT claim to perform the later generation conversion yet.
 */
(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports) module.exports=api;
  root.JRPGWorldHomeBridgeCore=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  const enc=new TextEncoder();
  const BUILD='0.1.23';

  function u16(b,o){return (b[o]|(b[o+1]<<8))>>>0;}
  function u32(b,o){return (b[o]|(b[o+1]<<8)|(b[o+2]<<16)|(b[o+3]<<24))>>>0;}
  function write16(b,o,v){b[o]=v&255;b[o+1]=(v>>>8)&255;}
  function write32(b,o,v){b[o]=v&255;b[o+1]=(v>>>8)&255;b[o+2]=(v>>>16)&255;b[o+3]=(v>>>24)&255;}
  function bytes(v){
    if(v instanceof Uint8Array)return new Uint8Array(v);
    if(v instanceof ArrayBuffer)return new Uint8Array(v);
    if(ArrayBuffer.isView(v))return new Uint8Array(v.buffer,v.byteOffset,v.byteLength);
    return null;
  }
  function hex32(v){return `0x${(Number(v)>>>0).toString(16).padStart(8,'0').toUpperCase()}`;}
  function safeStem(v){return String(v||'pokemon').normalize('NFKD').replace(/[^A-Za-z0-9._-]+/g,'_').replace(/^_+|_+$/g,'').slice(0,64)||'pokemon';}

  // Gen III stored Pokémon verification: decrypt the 48-byte payload with PID ^ OTID,
  // then compare the additive 16-bit checksum used by the game.
  function inspectPK3(input){
    const raw=bytes(input);
    if(!raw||raw.length<80)return {valid:false,reason:'PK3 must contain at least 80 bytes'};
    const b=raw.subarray(0,80),pid=u32(b,0),otId=u32(b,4),stored=u16(b,28),key=(pid^otId)>>>0;
    if(pid===0&&otId===0&&stored===0)return {valid:false,reason:'Empty Gen III slot'};
    const dec=new Uint8Array(48);
    for(let i=0;i<12;i++)write32(dec,i*4,(u32(b,32+i*4)^key)>>>0);
    let calc=0;for(let i=0;i<48;i+=2)calc=(calc+u16(dec,i))&0xFFFF;
    return {valid:calc===stored,pid,otId,trainerId:otId&0xFFFF,secretId:(otId>>>16)&0xFFFF,storedChecksum:stored,calculatedChecksum:calc,size:80,reason:calc===stored?'':'Gen III checksum mismatch'};
  }

  async function sha256(input){
    const b=bytes(input);if(!b)throw new Error('No bytes supplied');
    const subtle=globalThis.crypto&&globalThis.crypto.subtle;
    if(!subtle)throw new Error('Web Crypto SHA-256 unavailable');
    const h=await subtle.digest('SHA-256',b);
    return [...new Uint8Array(h)].map(x=>x.toString(16).padStart(2,'0')).join('');
  }

  let crcTable=null;
  function crc32(input){
    const b=bytes(input)||new Uint8Array();
    if(!crcTable){crcTable=new Uint32Array(256);for(let n=0;n<256;n++){let c=n;for(let k=0;k<8;k++)c=(c&1)?(0xEDB88320^(c>>>1)):(c>>>1);crcTable[n]=c>>>0;}}
    let c=0xFFFFFFFF;for(const x of b)c=crcTable[(c^x)&255]^(c>>>8);return (c^0xFFFFFFFF)>>>0;
  }
  function dosTimeDate(date=new Date()){
    const year=Math.max(1980,date.getFullYear());
    const time=((date.getHours()&31)<<11)|((date.getMinutes()&63)<<5)|((Math.floor(date.getSeconds()/2))&31);
    const day=((year-1980)&127)<<9|((date.getMonth()+1)&15)<<5|(date.getDate()&31);
    return {time,day};
  }
  function concat(parts){let n=0;for(const p of parts)n+=p.length;const out=new Uint8Array(n);let o=0;for(const p of parts){out.set(p,o);o+=p.length;}return out;}

  // Tiny ZIP writer, STORE method only. Keeps the transfer pack dependency-free and browser-local.
  function zipStore(files){
    const locals=[],centrals=[];let offset=0;const now=dosTimeDate();
    for(const file of files){
      const name=enc.encode(file.name),data=bytes(file.data)||enc.encode(String(file.data??'')),crc=crc32(data),flag=0x0800;
      const local=new Uint8Array(30+name.length);write32(local,0,0x04034B50);write16(local,4,20);write16(local,6,flag);write16(local,8,0);write16(local,10,now.time);write16(local,12,now.day);write32(local,14,crc);write32(local,18,data.length);write32(local,22,data.length);write16(local,26,name.length);write16(local,28,0);local.set(name,30);
      locals.push(local,data);
      const central=new Uint8Array(46+name.length);write32(central,0,0x02014B50);write16(central,4,20);write16(central,6,20);write16(central,8,flag);write16(central,10,0);write16(central,12,now.time);write16(central,14,now.day);write32(central,16,crc);write32(central,20,data.length);write32(central,24,data.length);write16(central,28,name.length);write16(central,30,0);write16(central,32,0);write16(central,34,0);write16(central,36,0);write32(central,38,0);write32(central,42,offset);central.set(name,46);centrals.push(central);
      offset+=local.length+data.length;
    }
    const centralOffset=offset,centralBlock=concat(centrals),end=new Uint8Array(22);write32(end,0,0x06054B50);write16(end,4,0);write16(end,6,0);write16(end,8,files.length);write16(end,10,files.length);write32(end,12,centralBlock.length);write32(end,16,centralOffset);write16(end,20,0);
    return concat([...locals,centralBlock,end]);
  }

  function compactSpecimen(mon){
    if(!mon)return null;
    return {
      species:mon.species||'',dexNo:mon.dexNo??null,level:mon.level??null,kind:mon.kind||'',gender:mon.gender||'',nature:mon.nature||'',ability:mon.ability||'',
      personality:Number(mon.personality)>>>0,personalityHex:mon.personalityHex||hex32(mon.personality),trainerId:mon.trainerId??(Number(mon.otId)&0xFFFF),secretId:mon.secretId??((Number(mon.otId)>>>16)&0xFFFF),
      ivs:mon.ivs||null,evs:mon.evs||null,hiddenPower:mon.hiddenPower||null,origin:mon.origin||null,language:mon.language||'',friendship:mon.friendship??null,heldItem:mon.heldItem||'',
      shiny:mon.shiny||null,pokerus:mon.pokerus||null,ribbons:mon.ribbons||null,moves:Array.isArray(mon.moves)?mon.moves:[]
    };
  }

  async function makeTransferPack({pk3,mon,sourceRef='',sessionBuild='',pkhexReference=''}){
    const raw=bytes(pk3);if(!raw)throw new Error('Exact PK3 source bytes are unavailable');
    const check=inspectPK3(raw);if(!check.valid)throw new Error(check.reason||'Invalid PK3');
    const hash=await sha256(raw),stamp=new Date().toISOString(),spec=compactSpecimen(mon),stem=safeStem(`${spec?.species||'pokemon'}_${check.pid.toString(16).padStart(8,'0')}`);
    const manifest={
      schema:'jrpg.world.home-bridge.source-capsule.v0.1',createdAt:stamp,bridgeBuild:BUILD,sessionBuild:sessionBuild||'',stage:'SOURCE_CAPTURE',
      source:{sessionGame:'Pokémon Emerald',gameCode:'BPEE',entityFormat:'PK3',entityBytes:80,sourceRef:sourceRef||'',processing:'browser-local'},
      specimen:spec,
      integrity:{verifiedGen3Checksum:true,storedChecksum:check.storedChecksum,calculatedChecksum:check.calculatedChecksum,pk3Sha256:hash},
      researchReference:pkhexReference||'',
      route:{source:'Emerald / Gen III',next:'generation-transfer compiler',bridgeTarget:'supported official bridge game',destination:'Pokémon HOME',status:'SOURCE_READY'},
      notice:'This source capsule preserves the exact Gen III Pokémon entity. v0.1.23 does not yet create a HOME-importable file or write to Pokémon HOME.'
    };
    const readme=[
      'JRPG.WORLD · POKÉMON HOME BRIDGE · SOURCE CAPSULE',
      '',`Pokémon: ${spec?.species||'Unknown'}`,`PID: ${spec?.personalityHex||hex32(check.pid)}`,`PK3 SHA-256: ${hash}`,
      '', 'STATUS', 'SOURCE CAPTURE: VERIFIED', 'TRANSFER COMPILER: NEXT PHASE', 'POKÉMON HOME: NOT WRITTEN BY THIS BUILD',
      '', 'The .pk3 file in this archive is the exact 80-byte Generation III stored Pokémon entity read from the running Emerald session.',
      'Keep this capsule unchanged. Later bridge stages should derive from it rather than reconstructing the Pokémon from displayed stats.',
      '', 'JRPG.WORLD processes this source capsule locally in the browser.'
    ].join('\r\n');
    const pack=zipStore([{name:`${stem}.pk3`,data:raw.subarray(0,80)},{name:'manifest.json',data:enc.encode(JSON.stringify(manifest,null,2))},{name:'README.txt',data:enc.encode(readme)}]);
    return {pack,manifest,filename:`JRPG_WORLD_HOME_BRIDGE_${stem}.zip`,pk3Filename:`${stem}.pk3`};
  }

  return {BUILD,inspectPK3,sha256,crc32,zipStore,makeTransferPack,safeStem,compactSpecimen};
});
