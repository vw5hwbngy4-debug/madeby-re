import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.161.0/build/three.module.js';
import {sweptCollectsPoint,rampShellDescriptor,portalClearsRamp,decayHalfpipeEnergy,halfpipeRotationTier,shouldHalfpipeNeutral,shouldHalfpipeLongitudinalExit,halfpipeSlopeAssist,halfpipeDirectionalPumpDelta} from './hardening.js';
import {canReachLedge,chooseClimbNeighbor,recoveredHorizontalSpeed,suitableWallApproach,transferVelocity,vaultArc} from './traversal.js';
import {createKYSChallengeEngine,seededShuffle} from './kys-challenge-engine.js';
import {KLOOJO_PLAYER_SPAWNS,KLOOJO_BAG_SPAWNS,graffitiDifficulty,generateKloojoEncounterFromCatalog} from '../luna/challenge-generator.js';
import {normalizeWinnerTraces} from '../luna/creation-grammar.js';
window.KLOOJO_BOOT_DIAG.stage='module';

const KLOOJO_ZONE_ID=document.documentElement.dataset.kloojoZone==='runtime-test'?'runtimeTest':'development';
const KLOOJO_ZONE_LABEL=KLOOJO_ZONE_ID==='runtimeTest'?'RUNTIME TEST':'DEVELOPMENT ZONE';
let sharedWorldState={
 player:{name:'PLAYER',score:0,entryGate:'development_gate',equipment:{},currentZone:'development'},
 zones:{
  development:{graffiti:[],coins:[],runnerBags:[],secrets:{skylinePortalUnlocked:false,bonusCoinLineCompleted:false,bonusReturnTagEverCompleted:false,districtPortalSummoned:false}},
  runtimeTest:{graffiti:[],coins:[],runnerBags:[],secrets:{}}
 }
};

const touch=matchMedia('(pointer:coarse)').matches||'ontouchstart' in window;if(touch)document.documentElement.classList.add('touch');
['gesturestart','gesturechange','gestureend'].forEach(n=>addEventListener(n,e=>e.preventDefault()));document.addEventListener('touchmove',e=>e.preventDefault(),{passive:false});
const renderer=new THREE.WebGLRenderer({antialias:true,powerPreference:'high-performance'});renderer.setPixelRatio(Math.min(devicePixelRatio,1.65));renderer.setSize(innerWidth,innerHeight);renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;document.body.prepend(renderer.domElement);
const scene=new THREE.Scene();
const camera=new THREE.PerspectiveCamera(68,innerWidth/innerHeight,.08,700);const hemi=new THREE.HemisphereLight(0xffffff,0x7b8e88,2.75);scene.add(hemi);const sun=new THREE.DirectionalLight(0xfff4d2,4.55);sun.position.set(-90,125,60);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);sun.shadow.camera.left=-120;sun.shadow.camera.right=120;sun.shadow.camera.top=120;sun.shadow.camera.bottom=-120;scene.add(sun);scene.fog=new THREE.Fog(0xcdd8d5,130,470);
const C={pink:0xff42ba,cyan:0x31eaff,yellow:0xffdf35,green:0x5eff6d,purple:0x8757ff,orange:0xff7547,red:0xff454d,blue:0x356bff,white:0xf8fbff,ink:0x15162c,skin:0xf3b58a,hair:0x19162a,concrete:0xdbe2f2,asphalt:0x343955};
const toon={};for(const [k,v] of Object.entries(C))toon[k]=new THREE.MeshToonMaterial({color:v});

// ---------- v0.6 DEVELOPMENT ZONE MATERIAL KIT ----------
const DEV_TEX_DATA = {
  road: 'assets/world/road.webp',
  foot: 'assets/world/foot.webp',
  foot2: 'assets/world/foot2.webp',
  walk: 'assets/world/walk.webp',
  walkLower: 'assets/world/walk-lower.webp',
  windows: 'assets/world/windows.webp',
  billboards: 'assets/world/billboards.webp',
  center: 'assets/world/center.webp',
  vent: 'assets/world/vent.webp',
  scatter: 'assets/world/scatter.webp'
};
function devTexture(key,rx=1,ry=1){const t=new THREE.TextureLoader().load(DEV_TEX_DATA[key]);t.colorSpace=THREE.SRGBColorSpace;t.wrapS=t.wrapT=THREE.RepeatWrapping;t.repeat.set(rx,ry);t.anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());return t}
function canvasPatternTexture(kind,rx=1,ry=1){const c=document.createElement('canvas');c.width=256;c.height=256;const x=c.getContext('2d');
  if(kind==='orangePanel'){
    x.fillStyle='#d89210';x.fillRect(0,0,256,256);
    for(let i=0;i<8;i++){x.fillStyle=i%2?'#cf8410':'#e8ab1b';x.fillRect(i*32,0,24,256);x.fillStyle='rgba(255,240,180,.22)';x.fillRect(i*32+2,0,4,256)}
    x.strokeStyle='#745210';x.lineWidth=6;for(let y=0;y<=256;y+=64){x.beginPath();x.moveTo(0,y);x.lineTo(256,y);x.stroke()}
    x.strokeStyle='rgba(50,35,10,.55)';x.lineWidth=3;for(let x0=0;x0<=256;x0+=32){x.beginPath();x.moveTo(x0,0);x.lineTo(x0,256);x.stroke()}
    const whitePanels=[[16,18,32,18],[110,74,24,16],[178,146,36,18],[42,210,28,16],[208,42,20,14]];
    for(const [px,py,pw,ph] of whitePanels){x.fillStyle='#f3f0dc';x.fillRect(px,py,pw,ph);x.strokeStyle='rgba(90,70,25,.6)';x.lineWidth=2;x.strokeRect(px,py,pw,ph)}
  } else if(kind==='blueChecker'){
    const cols=['#67d8ff','#55bfff','#8f6cff','#ff63d8'];
    for(let yy=0;yy<8;yy++)for(let xx=0;xx<8;xx++){x.fillStyle=cols[(xx+yy)%cols.length];x.fillRect(xx*32,yy*32,32,32)}
    const redPanels=[[32,32,32,32],[160,64,32,32],[96,160,32,32],[224,192,32,32],[0,224,32,32]];
    for(const [px,py,pw,ph] of redPanels){x.fillStyle='#d54532';x.fillRect(px,py,pw,ph);x.fillStyle='rgba(255,180,170,.18)';x.fillRect(px+2,py+2,pw-4,6)}
    x.strokeStyle='rgba(240,250,255,.20)';x.lineWidth=2;for(let i=0;i<=256;i+=32){x.beginPath();x.moveTo(i,0);x.lineTo(i,256);x.stroke();x.beginPath();x.moveTo(0,i);x.lineTo(256,i);x.stroke()}
    x.fillStyle='rgba(255,255,255,.08)';x.fillRect(0,0,256,24);x.fillRect(0,128,256,16)
  } else if(kind==='neonRainbow'){
    const cols=['#ff4fcf','#8d61ff','#34e8ff','#ffad33','#ffe95b','#ff5a66'];
    for(let yy=0;yy<4;yy++)for(let xx=0;xx<4;xx++){
      x.fillStyle=cols[(xx+yy*2)%cols.length];x.fillRect(xx*64,yy*64,64,64);
      x.fillStyle='rgba(255,255,255,.10)';x.fillRect(xx*64+6,yy*64+6,52,10)
    }
    x.strokeStyle='rgba(20,14,34,.55)';x.lineWidth=4;
    for(let i=0;i<=256;i+=64){x.beginPath();x.moveTo(i,0);x.lineTo(i,256);x.stroke();x.beginPath();x.moveTo(0,i);x.lineTo(256,i);x.stroke()}
  } else if(kind==='magentaPanels'){
    x.fillStyle='#241d36';x.fillRect(0,0,256,256);
    const cols=['#ff4ec8','#da57ff','#7e6cff','#44ddff'];
    for(let i=0;i<8;i++){x.fillStyle=cols[i%cols.length];x.fillRect(i*32,0,24,256);x.fillStyle='rgba(255,255,255,.14)';x.fillRect(i*32+2,0,4,256)}
    const accent=[[18,22,30,16],[82,86,22,14],[146,150,34,18],[206,54,24,16],[52,206,28,16]];
    for(const [px,py,pw,ph] of accent){x.fillStyle='#f7f3ff';x.fillRect(px,py,pw,ph);x.strokeStyle='rgba(36,29,54,.65)';x.lineWidth=2;x.strokeRect(px,py,pw,ph)}
    x.strokeStyle='rgba(14,10,24,.5)';x.lineWidth=3;for(let i=0;i<=256;i+=32){x.beginPath();x.moveTo(i,0);x.lineTo(i,256);x.stroke()}
  } else if(kind==='grayTiles'){
    x.fillStyle='#a9aba7';x.fillRect(0,0,256,256);
    const cols=['#aeb0ac','#9ea19d','#b7b9b5','#a4a6a2'];
    const tile=64;
    for(let yy=0;yy<4;yy++)for(let xx=0;xx<4;xx++){
      x.fillStyle=cols[(xx*3+yy*5)%cols.length];x.fillRect(xx*tile+3,yy*tile+3,tile-6,tile-6);
      x.fillStyle='rgba(255,255,255,.10)';x.fillRect(xx*tile+7,yy*tile+7,tile-14,4);
    }
    x.strokeStyle='#737672';x.lineWidth=4;
    for(let i=0;i<=256;i+=tile){x.beginPath();x.moveTo(i,0);x.lineTo(i,256);x.stroke();x.beginPath();x.moveTo(0,i);x.lineTo(256,i);x.stroke()}
  } else if(kind==='infoPanel'){
    x.fillStyle='#111722';x.fillRect(0,0,256,256);
    x.fillStyle='#ef9f0c';x.fillRect(0,0,256,38);x.fillRect(0,218,256,38);
    x.fillStyle='#2fdbe5';x.fillRect(20,60,216,136);
    x.strokeStyle='#0a1020';x.lineWidth=8;x.strokeRect(20,60,216,136);
    x.fillStyle='#0a1020';x.font='900 34px Arial Black';x.textAlign='center';x.textBaseline='middle';x.fillText('DEV ZONE',128,112);x.font='900 20px Arial Black';x.fillText('KLOOJO',128,146);
  }
  const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;t.wrapS=t.wrapT=THREE.RepeatWrapping;t.repeat.set(rx,ry);t.anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());return t}
function devToon(key,rx=1,ry=1,opts={}){return new THREE.MeshToonMaterial({map:devTexture(key,rx,ry),color:opts.color??0xffffff,transparent:!!opts.transparent,alphaTest:opts.alphaTest??0,side:opts.side??THREE.FrontSide})}
function patternToon(kind,rx=1,ry=1,opts={}){return new THREE.MeshToonMaterial({map:canvasPatternTexture(kind,rx,ry),color:opts.color??0xffffff,transparent:!!opts.transparent,alphaTest:opts.alphaTest??0,side:opts.side??THREE.FrontSide})}
const devMat={
  road:devToon('road',4,4,{color:0x7d8064}),
  foot:devToon('foot',3,3,{color:0xf2ff7a}),
  foot2:devToon('foot2',2,3,{color:0xe8ff61}),
  walk:patternToon('orangePanel',2,2,{color:0xffd86f}),
  walkLower:patternToon('orangePanel',2,2,{color:0xf3c73c}),
  windows:patternToon('blueChecker',1,2,{color:0xf0fbff}),
  center:patternToon('orangePanel',1,1,{color:0xffef88}),
  vent:patternToon('neonRainbow',1,1,{color:0xffffff}),
  scatter:patternToon('magentaPanels',1,1,{color:0xffffff}),
  billboard:new THREE.MeshBasicMaterial({map:canvasPatternTexture('infoPanel',1,1),transparent:false,side:THREE.DoubleSide})
};
const sidewalkTop=new THREE.MeshToonMaterial({map:canvasPatternTexture('grayTiles',2,2),color:0xffffff});
const sidewalkEdge=new THREE.MeshToonMaterial({color:0x76ff18,emissive:0x1f7200,emissiveIntensity:.72});
const sidewalkBottom=new THREE.MeshToonMaterial({color:0x3b403a});
const sidewalkMaterials=[sidewalkEdge,sidewalkEdge,sidewalkTop,sidewalkBottom,sidewalkEdge,sidewalkEdge];
const devSteel=new THREE.MeshToonMaterial({color:0xcc5123}),devDarkSteel=new THREE.MeshToonMaterial({color:0x202628}),devSafety=new THREE.MeshToonMaterial({color:0x26c9c4,transparent:true,opacity:.68,side:THREE.DoubleSide});
function buildSkyTexture(){
  const c=document.createElement('canvas');c.width=2048;c.height=1024;const x=c.getContext('2d');
  const g=x.createLinearGradient(0,0,0,c.height);
  g.addColorStop(0,'#8eaabd');g.addColorStop(.28,'#a9bdca');g.addColorStop(.52,'#c6d1d5');g.addColorStop(.76,'#d8ddd8');g.addColorStop(1,'#efe2bf');
  x.fillStyle=g;x.fillRect(0,0,c.width,c.height);
  const sunGlow=x.createRadialGradient(c.width*.77,c.height*.30,0,c.width*.77,c.height*.30,230);
  sunGlow.addColorStop(0,'rgba(255,248,226,.58)');sunGlow.addColorStop(.45,'rgba(255,245,220,.18)');sunGlow.addColorStop(1,'rgba(255,245,220,0)');
  x.fillStyle=sunGlow;x.fillRect(0,0,c.width,c.height);
  function cloud(cx,cy,scale,alpha){
    for(let i=0;i<12;i++){
      const dx=(Math.random()-.5)*scale*1.4,dy=(Math.random()-.5)*scale*.55,r=scale*(.22+Math.random()*.24);
      const cg=x.createRadialGradient(cx+dx,cy+dy,0,cx+dx,cy+dy,r);
      cg.addColorStop(0,'rgba(255,255,255,'+alpha+')');cg.addColorStop(.55,'rgba(255,255,255,'+(alpha*.55)+')');cg.addColorStop(1,'rgba(255,255,255,0)');
      x.fillStyle=cg;x.beginPath();x.arc(cx+dx,cy+dy,r,0,Math.PI*2);x.fill();
    }
  }
  for(let i=0;i<28;i++)cloud(Math.random()*c.width,90+Math.random()*390,90+Math.random()*120,.18+Math.random()*.16);
  x.fillStyle='rgba(255,255,255,.08)';for(let i=0;i<16;i++)x.fillRect(0,640+i*8,c.width,2);
  const tex=new THREE.CanvasTexture(c);tex.colorSpace=THREE.SRGBColorSpace;return tex;
}
const skyTex=buildSkyTexture();
skyTex.mapping=THREE.EquirectangularReflectionMapping;
scene.background=skyTex;
const skyDome=new THREE.Mesh(new THREE.SphereGeometry(480,32,24),new THREE.MeshBasicMaterial({map:skyTex,side:THREE.BackSide,depthWrite:false}));skyDome.renderOrder=-10;scene.add(skyDome);
function devBeam(a,b,r=.09,mat=devSteel){const A=new THREE.Vector3(...a),B=new THREE.Vector3(...b),mid=A.clone().add(B).multiplyScalar(.5),len=A.distanceTo(B);const m=new THREE.Mesh(new THREE.CylinderGeometry(r,r,len,6),mat);m.position.copy(mid);m.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),B.clone().sub(A).normalize());addMesh(m,true,true);return m}
function developmentWrap(pos,size,seed=0){const [cx,cy,cz]=pos,[w,h,d]=size,base=cy-h/2+.2,pad=.65,xs=[cx-w/2-pad,cx+w/2+pad],zs=[cz-d/2-pad,cz+d/2+pad];for(const x of xs)for(const z of zs)devBeam([x,base,z],[x,base+h+2,z],.10,devSteel);const levels=Math.max(2,Math.floor(h/5));for(let k=1;k<=levels;k++){const y=base+Math.min(h+1,k*5);devBeam([xs[0],y,zs[0]],[xs[1],y,zs[0]],.08,devDarkSteel);devBeam([xs[0],y,zs[1]],[xs[1],y,zs[1]],.08,devDarkSteel);devBeam([xs[0],y,zs[0]],[xs[0],y,zs[1]],.08,devDarkSteel);devBeam([xs[1],y,zs[0]],[xs[1],y,zs[1]],.08,devDarkSteel);if(k%2){devBeam([xs[0],y-4,zs[0]],[xs[1],y,zs[0]],.065,devSteel);devBeam([xs[1],y-4,zs[1]],[xs[0],y,zs[1]],.065,devSteel)}}const mesh=new THREE.Mesh(new THREE.PlaneGeometry(Math.max(4,w*.82),Math.min(h*.7,12)),devSafety);mesh.position.set(cx,base+Math.min(h*.48,8),cz+(seed%2?d/2+pad+.03:-d/2-pad-.03));if(seed%2===0)mesh.rotation.y=Math.PI;addMesh(mesh,false,false)}
function developmentBillboard(pos,rotY=0,s=1){const m=new THREE.Mesh(new THREE.PlaneGeometry(10*s,10*s),devMat.billboard);m.position.set(...pos);m.rotation.y=rotY;addMesh(m,false,false);return m}
function developmentCrane(cx,cz,height=34,arm=28,rot=0){box('DEV_CRANE_MAST',[cx,height/2,cz],[1.1,height,1.1],devSteel,{cast:true});for(let y=3;y<height;y+=4){devBeam([cx-.65,y,cz-.65],[cx+.65,y+3,cz+.65],.055,devDarkSteel);devBeam([cx+.65,y,cz-.65],[cx-.65,y+3,cz+.65],.055,devDarkSteel)}const top=new THREE.Group();top.position.set(cx,height,cz);top.rotation.y=rot;scene.add(top);const boom=new THREE.Mesh(new THREE.BoxGeometry(arm,.45,.55),devSteel);boom.position.x=arm*.30;top.add(boom);const counter=new THREE.Mesh(new THREE.BoxGeometry(5,1.6,1.8),devDarkSteel);counter.position.x=-4.2;top.add(counter);const cable=new THREE.Mesh(new THREE.CylinderGeometry(.035,.035,11,5),devDarkSteel);cable.position.set(arm*.43,-5.5,0);top.add(cable);top.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true}});return top}
function addDevelopmentDeck(cx,cz,y,w=18,d=8){addNeonEdgedBox('TEMP_DECK',[cx,y,cz],[w,.45,d],calmMat.orange,{platform:true,solid:true,front:'z+',edgeColor:0x76ff18,detailColor:0x23e7ff,topEdges:true,verticalEdges:false});for(const sx of[-1,1])for(const sz of[-1,1])devBeam([cx+sx*w*.46,0,cz+sz*d*.43],[cx+sx*w*.46,y-.2,cz+sz*d*.43],.11,devDarkSteel)}

const platforms=[],rails=[],walls=[],solids=[],voidZones=[],coins=[],runnerBags=[],tagWalls=[],sparks=[],turnClouds=[],traversalSurfaces=[],climbHolds=[];let coinsCollected=0,runnerBagsCollected=0,audioCtx=null,running=false,zone=KLOOJO_ZONE_LABEL;
let kysChallengeEngine=null,kysChallengeSession=false,kysChallengeBaseSnapshot=null,kysRunStats={respawns:0,maxSpeedKmh:0,scoreStart:0};let kysFeedPaused=false,kysMuted=false,kysResumeRunning=false,kysLegacyHost=false,kysLegacyChallenge=null;
let skylinePortalUnlocked=KLOOJO_ZONE_ID==='development'&&!!sharedWorldState.zones.development.secrets.skylinePortalUnlocked;
let skylinePortalReveal=skylinePortalUnlocked?1:0,skylineUnlockTag=null,bonusCoinsCollected=0,bonusCoinLineCompleted=false,bonusReturnTag=null,bonusReturnTagEverCompleted=false,allGraffitiRewarded=false;

function addMesh(mesh,cast=true,receive=true){mesh.castShadow=cast;mesh.receiveShadow=receive;scene.add(mesh);return mesh}
function box(name,pos,size,color='pink',o={}){const mat=Array.isArray(color)?color:(color&&color.isMaterial?color:(toon[color]||new THREE.MeshToonMaterial({color})));const m=new THREE.Mesh(new THREE.BoxGeometry(...size),mat);m.position.set(...pos);m.name=name;addMesh(m,o.cast!==false,o.receive!==false);const half=new THREE.Vector3(size[0]/2,size[1]/2,size[2]/2),zName=o.zone||'city';if(o.platform)platforms.push({mesh:m,half:half.clone(),zone:zName});if(o.solid){const s={mesh:m,half:half.clone(),zone:zName,ride:o.ride!==false};solids.push(s);if(s.ride)registerSolidRideWalls(s)}return m}
const calmMat={gray:new THREE.MeshToonMaterial({color:0xb8b7b4}),purple:new THREE.MeshToonMaterial({color:0x7e6ac1}),orange:patternToon('orangePanel',1,1,{color:0xf6dda0}),blue:patternToon('blueChecker',1,1,{color:0xe9f7ff}),charcoal:new THREE.MeshToonMaterial({color:0x52585b}),lilac:new THREE.MeshToonMaterial({color:0xa38ae6}),white:new THREE.MeshToonMaterial({color:0xf2f3f4})};
const neonEdgePalette=[0x76ff18,0x23e7ff,0xff3fb4,0x8f6cff,0xff9d18];
const neonAccentCache=new Map();
function neonAccentMat(color){const k=color.toString(16);if(!neonAccentCache.has(k))neonAccentCache.set(k,new THREE.MeshToonMaterial({color,emissive:color,emissiveIntensity:.42}));return neonAccentCache.get(k)}
function accentBlock(pos,size,mat){const m=new THREE.Mesh(new THREE.BoxGeometry(...size),mat);m.position.set(...pos);addMesh(m,true,true);return m}
function addNeonEdgedBox(name,pos,size,baseMat,opt={}){
  const base=box(name,pos,size,baseMat,opt);
  const [cx,cy,cz]=pos,[w,h,d]=size;
  const edgeColor=opt.edgeColor??0x76ff18,detailColor=opt.detailColor??0x23e7ff,front=opt.front??'z+',topEdges=opt.topEdges!==false,verticalEdges=opt.verticalEdges!==false;
  const edgeMat=neonAccentMat(edgeColor),detailMat=neonAccentMat(detailColor);
  const edgeT=Math.min(.24,Math.max(.08,Math.min(w,d)*.045));
  const topY=cy+h/2+edgeT*.55;
  if(topEdges){
    accentBlock([cx,topY,cz-d/2],[w+edgeT,edgeT,edgeT],edgeMat);
    accentBlock([cx,topY,cz+d/2],[w+edgeT,edgeT,edgeT],edgeMat);
    accentBlock([cx-w/2,topY,cz],[edgeT,edgeT,d+edgeT],edgeMat);
    accentBlock([cx+w/2,topY,cz],[edgeT,edgeT,d+edgeT],edgeMat);
  }
  if(verticalEdges){
    const postY=cy,postH=h+edgeT*.15,postT=edgeT*.92;
    for(const sx of[-1,1])for(const sz of[-1,1])accentBlock([cx+sx*w/2,postY,cz+sz*d/2],[postT,postH,postT],edgeMat);
  }
  const stripT=Math.max(.10,edgeT*.8),stripH=Math.max(.14,Math.min(.34,h*.07)),longW=Math.max(1.1,Math.min(w*.46,w-1.1)),longD=Math.max(1.1,Math.min(d*.46,d-1.1));
  if(front==='z+'||front==='z-'){const sgn=front==='z+'?1:-1;accentBlock([cx,cy+h*.12,cz+sgn*(d/2+stripT*.32)],[longW,stripH,stripT],detailMat);accentBlock([cx+(w*.22),cy-h*.08,cz+sgn*(d/2+stripT*.34)],[Math.max(.28,w*.08),Math.max(.28,h*.14),stripT],edgeMat);}
  if(front==='x+'||front==='x-'){const sgn=front==='x+'?1:-1;accentBlock([cx+sgn*(w/2+stripT*.32),cy+h*.12,cz],[stripT,stripH,longD],detailMat);accentBlock([cx+sgn*(w/2+stripT*.34),cy-h*.08,cz+(d*.22)],[stripT,Math.max(.28,h*.14),Math.max(.28,d*.08)],edgeMat);}
  return base;
}
function registerTraversal(surface){const tagged={...surface,zone:'runtimeTest'};traversalSurfaces.push(tagged);return tagged}
function addClimbHold(id,position,color,neighbors=[]){const mesh=new THREE.Mesh(new THREE.SphereGeometry(.34,10,7),neonAccentMat(color));mesh.position.set(...position);mesh.scale.set(1.35,.72,.48);addMesh(mesh,true,true);const hold={id,kind:'climbHold',position:{x:position[0],y:position[1],z:position[2]},neighbors,mesh,zone:'runtimeTest'};climbHolds.push(hold);traversalSurfaces.push(hold);return hold}
function registerSolidRideWalls(s){const q=s.mesh.position,h=s.half,b=q.y-h.y,t=q.y+h.y;walls.push(
 {axis:'x',coord:q.x-h.x,min:q.z-h.z,max:q.z+h.z,bottom:b,top:t,mesh:s.mesh,solid:s,ride:true},
 {axis:'x',coord:q.x+h.x,min:q.z-h.z,max:q.z+h.z,bottom:b,top:t,mesh:s.mesh,solid:s,ride:true},
 {axis:'z',coord:q.z-h.z,min:q.x-h.x,max:q.x+h.x,bottom:b,top:t,mesh:s.mesh,solid:s,ride:true},
 {axis:'z',coord:q.z+h.z,min:q.x-h.x,max:q.x+h.x,bottom:b,top:t,mesh:s.mesh,solid:s,ride:true}
)}
function cyl(name,pos,r,h,color='yellow',segments=20){const m=new THREE.Mesh(new THREE.CylinderGeometry(r,r,h,segments),toon[color]);m.position.set(...pos);addMesh(m);return m}
const SHOW_DEV_FLOATING_LABELS=false;
function label(text,pos,color='#ffffff',scale=1){if(!SHOW_DEV_FLOATING_LABELS)return null;const c=document.createElement('canvas');c.width=512;c.height=128;const x=c.getContext('2d');x.clearRect(0,0,512,128);x.font='900 58px Arial Black';x.textAlign='center';x.textBaseline='middle';x.lineWidth=14;x.strokeStyle='#15162c';x.strokeText(text,256,64);x.fillStyle=color;x.fillText(text,256,64);const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;const s=new THREE.Sprite(new THREE.SpriteMaterial({map:t,transparent:true}));s.position.set(...pos);s.scale.set(10*scale,2.5*scale,1);scene.add(s);return s}
// ---------- KLOOJO NEON STREETLIGHTS ----------
const neonLampPalette=[0x7cff16,0x23e7ff,0xff3fb4,0xff9d18];
function addNeonStreetlight(x,z,rot=0,color=0x7cff16,height=6.4,arm=2.25){
  const g=new THREE.Group();g.position.set(x,.18,z);g.rotation.y=rot;scene.add(g);
  const poleMat=new THREE.MeshToonMaterial({color,emissive:color,emissiveIntensity:.32});
  const darkMat=new THREE.MeshToonMaterial({color:0x1d2529});
  const glowMat=new THREE.MeshBasicMaterial({color,transparent:true,opacity:.95});
  const pts=[
    new THREE.Vector3(0,0,0),
    new THREE.Vector3(0,height*.82,0),
    new THREE.Vector3(.05,height*.94,0),
    new THREE.Vector3(.32,height+0.30,0),
    new THREE.Vector3(.82,height+0.52,0),
    new THREE.Vector3(arm,height+0.52,0)
  ];
  const curve=new THREE.CatmullRomCurve3(pts,false,'catmullrom',.32);
  const pole=new THREE.Mesh(new THREE.TubeGeometry(curve,42,.105,8,false),poleMat);pole.castShadow=true;pole.receiveShadow=true;g.add(pole);
  const collar=new THREE.Mesh(new THREE.CylinderGeometry(.18,.24,.32,10),darkMat);collar.position.set(0,.16,0);g.add(collar);
  const lampRoot=new THREE.Group();lampRoot.position.set(arm,height+.44,0);g.add(lampRoot);
  const hood=new THREE.Mesh(new THREE.BoxGeometry(.78,.22,.52),darkMat);hood.position.y=.02;hood.rotation.z=-.08;lampRoot.add(hood);
  const bulb=new THREE.Mesh(new THREE.BoxGeometry(.54,.055,.34),glowMat);bulb.position.y=-.125;lampRoot.add(bulb);
  const halo=new THREE.Mesh(new THREE.SphereGeometry(.44,12,8),new THREE.MeshBasicMaterial({color,transparent:true,opacity:.12,depthWrite:false}));halo.position.set(0,-.19,0);lampRoot.add(halo);
  const light=new THREE.PointLight(color,2.25,12,2);light.position.set(0,-.28,0);lampRoot.add(light);
  return g;
}
function ensureAudio(){if(!audioCtx)audioCtx=new (window.AudioContext||window.webkitAudioContext)();if(audioCtx.state==='suspended'&&!kysFeedPaused&&!kysMuted)audioCtx.resume()}
function blip(freq=750,dur=.08,gain=.08,type='sine'){if(!audioCtx)return;const now=audioCtx.currentTime,o=audioCtx.createOscillator(),g=audioCtx.createGain();o.type=type;o.frequency.setValueAtTime(freq,now);g.gain.setValueAtTime(gain,now);g.gain.exponentialRampToValueAtTime(.0001,now+dur);o.connect(g).connect(audioCtx.destination);o.start(now);o.stop(now+dur)}
function say(s){const el=document.getElementById('message');el.textContent=s;el.classList.add('on');clearTimeout(say.t);say.t=setTimeout(()=>el.classList.remove('on'),1350)}

const canonicalWorldContentStart=scene.children.length;

// ---------- CITY HUB: one large square, readable movement toys ----------
// visual asphalt slabs leave real openings for both sunken pipe geometries
box('GROUND_SOUTH',[0,-.65,-61],[180,1.3,58],devMat.road,{platform:false});
box('GROUND_PIPE_W',[-73.5,-.65,-8],[33,1.3,48],devMat.road,{platform:false});
box('GROUND_PIPE_E',[30.5,-.65,-8],[119,1.3,48],devMat.road,{platform:false});
box('GROUND_WALLPIPE_W',[-29.75,-.65,27],[120.5,1.3,22],devMat.road,{platform:false});
box('GROUND_WALLPIPE_E',[75.75,-.65,27],[28.5,1.3,22],devMat.road,{platform:false});
box('GROUND_NORTH',[0,-.65,64],[180,1.3,52],devMat.road,{platform:false});
box('CENTER_PLAZA',[0,.03,0],[48,.18,42],sidewalkMaterials,{platform:true});
// Keep the sidewalk physically OUT of the SUNKEN_PIPE bowl.
// The old SIDEWALK_W box overlapped the bowl from x=-44..-29 and acted like a shelf at the coping.
box('SIDEWALK_W_EAST_STRIP',[-27,.09,0],[2,.30,42],sidewalkMaterials,{platform:true});
box('SIDEWALK_W_NORTH_CAP',[-35,.09,19.1],[18,.30,3.8],sidewalkMaterials,{platform:true});
// The east sidewalk also stops before WALL_PIPE, whose rotated bowl begins at z=16.
box('SIDEWALK_E_SOUTH',[35,.09,-3],[18,.30,36],sidewalkMaterials,{platform:true});
// Move the west lamps onto the narrow strip beside the bowl instead of suspending them over its skating surface.
[[-27,-16,0],[-27,-5,1],[-27,6,2],[-27,17,3],[42,-16,1],[42,-5,2],[42,6,3],[42,14,0]].forEach(([x,z,c],i)=>{
  const towardCenter=x<0?0:Math.PI;
  addNeonStreetlight(x,z,towardCenter,neonLampPalette[c],6.2+(i%2)*.35,2.35);
});
// Canonical perimeter. The district link is now an always-visible portal BETWEEN the two purple north buildings,
// so no unrelated west-wall hole or street geometry is required.
for(const [p,s,m] of [[[-84,3,0],[8,7,180],devMat.center],[[84,4,0],[8,9,180],devMat.windows],[[0,4,-84],[180,9,8],devMat.vent],[[0,3,84],[180,7,8],devMat.walkLower]])box('EDGE',p,s,m,{platform:false,solid:true});
// skyline blocks around perimeter, leaving skating space open
for(let i=0;i<18;i++){if([5,7,10,13].includes(i))continue;const side=i%4,along=-68+(i*19)%136,h=10+(i*7)%25,w=10+(i*5)%16;let p;if(side===0)p=[-73,h/2,along];if(side===1)p=[73,h/2,along];if(side===2)p=[along,h/2,-73];if(side===3)p=[along,h/2,73];const size=[side<2?10:w,h,side<2?w:10],m=[calmMat.blue,calmMat.orange,calmMat.gray,calmMat.purple,calmMat.blue,calmMat.orange][i%6],front=side===0?'x+':side===1?'x-':side===2?'z+':'z-';addNeonEdgedBox('BLDG_'+i,p,size,m,{platform:true,solid:true,front,edgeColor:neonEdgePalette[i%neonEdgePalette.length],detailColor:neonEdgePalette[(i+2)%neonEdgePalette.length]});if([1,2,3,6,7,10,13,14,17].includes(i))developmentWrap(p,size,i);}
// chunky street props
for(let i=0;i<14;i++){if([1,3,10,11,13].includes(i))continue;const x=-54+(i*17)%108,z=-56+(i*29)%112;const base=[calmMat.charcoal,calmMat.gray,calmMat.purple,calmMat.orange][i%4];addNeonEdgedBox('BLOCK_PROP_'+i,[x,.55,z],[3,1.1,3],base,{platform:true,solid:true,front:i%2?'z+':'x+',edgeColor:neonEdgePalette[(i+1)%neonEdgePalette.length],detailColor:neonEdgePalette[(i+3)%neonEdgePalette.length],topEdges:true,verticalEdges:i%3!==0});}
// ---------- GRAFFITI SIGNAL RUNTIME (BOOT ORDER FIX: initialized before addWall(...graffiti=true) can call makeTagWall) ----------
function buildGraffitiSignalTexture(){
 const c=document.createElement('canvas');c.width=512;c.height=128;const x=c.getContext('2d');x.clearRect(0,0,512,128);
 x.lineCap='round';x.lineJoin='round';
 // JSRF-like interaction grammar, deliberately symbol-only: no SPRAY text on the world surface.
 const cyan='#38eaff',blue='#3177ff',white='rgba(255,255,255,.92)';
 x.strokeStyle='rgba(18,29,67,.72)';x.lineWidth=26;x.beginPath();x.moveTo(52,64);x.lineTo(460,64);x.stroke();
 x.strokeStyle=cyan;x.lineWidth=9;
 for(let i=0;i<5;i++){const cx=72+i*92;x.beginPath();x.arc(cx,64,24,0,Math.PI*2);x.stroke();if(i<4){x.beginPath();x.moveTo(cx+35,64);x.lineTo(cx+63,64);x.stroke();}}
 x.strokeStyle=blue;x.lineWidth=11;x.beginPath();x.moveTo(35,64);x.lineTo(55,44);x.moveTo(35,64);x.lineTo(55,84);x.moveTo(477,64);x.lineTo(457,44);x.moveTo(477,64);x.lineTo(457,84);x.stroke();
 x.strokeStyle=white;x.lineWidth=3;for(let i=0;i<5;i++){x.beginPath();x.arc(72+i*92,64,13,0,Math.PI*2);x.stroke();}
 const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;t.minFilter=THREE.LinearFilter;t.magFilter=THREE.LinearFilter;return t;
}
const GRAFFITI_SIGNAL_TEXTURE=buildGraffitiSignalTexture();
function makeGraffitiSignal(width=10.5){
 const g=new THREE.Group();
 const m=new THREE.Mesh(new THREE.PlaneGeometry(width,2.05),new THREE.MeshBasicMaterial({map:GRAFFITI_SIGNAL_TEXTURE,transparent:true,opacity:.88,depthWrite:false,side:THREE.DoubleSide}));
 g.add(m);g.userData.signalMesh=m;return g;
}
function pulseGraffitiSignal(signal,d,nowMs){if(!signal||!signal.visible)return;const close=d<9,p=.5+.5*Math.sin(nowMs*.006);const sc=(close?1.02:.92)+(close?.06:.035)*p;signal.scale.setScalar(sc);const mesh=signal.userData.signalMesh;if(mesh?.material)mesh.material.opacity=close?.98:.68;}



// fences / graffiti surfaces
function addWall(name,axis,coord,min,max,bottom,top,color='white',graffiti=false,ride=true){const len=max-min,mid=(min+max)/2,thickness=.55;const pos=axis==='x'?[coord,(bottom+top)/2,mid]:[mid,(bottom+top)/2,coord];const size=axis==='x'?[thickness,top-bottom,len]:[len,top-bottom,thickness];const m=box(name,pos,size,color,{platform:false});walls.push({axis,coord,min,max,bottom,top,mesh:m,ride,thickness});if(graffiti)makeTagWall(axis==='x'?[coord-(coord>0?.31:-.31),(bottom+top)/2,mid]:[mid,(bottom+top)/2,coord-(coord>0?.31:-.31)],axis==='x'?Math.PI/2:0,false);return m}
addWall('GRAFFITI_FENCE_N','z',56,-36,36,0,4.7,'white',true);addWall('WALLJUMP_RED','x',-25,-17,7,0,8,'red',false);addWall('WALLJUMP_BLUE','x',-19,-17,7,0,11,'blue',false);
addWall('BACK_ALLEY_WALL','z',-54,-24,14,0,6.5,'green',false); // R6: keep this occluded green wall clean; its redundant tag point was relocated
// physical square boundary: also valid wall-jump surfaces
walls.push(
 {axis:'x',coord:-84,min:-90,max:44.5,bottom:-2,top:80,mesh:null,ride:false,thickness:.55},
 {axis:'x',coord:-84,min:59.5,max:90,bottom:-2,top:80,mesh:null,ride:false,thickness:.55},
 {axis:'x',coord:84,min:-90,max:90,bottom:-2,top:80,mesh:null,ride:false,thickness:.55},
 {axis:'z',coord:-84,min:-90,max:90,bottom:-2,top:80,mesh:null,ride:false,thickness:.55},
 {axis:'z',coord:84,min:-90,max:90,bottom:-2,top:80,mesh:null,ride:false,thickness:.55}
);
// stairs + grindable handrail
for(let i=0;i<10;i++)box('STAIR_'+i,[29,.18+i*.23,35-i*1.25],[12,.36,1.35],sidewalkMaterials,{platform:true});
// runner-climb grammar: three mantleable ledges, each about one body-height higher.
addNeonEdgedBox('CLIMB_1',[42,1.2,4],[9,2.4,7],calmMat.gray,{platform:true,solid:true,front:'z-',edgeColor:0x76ff18,detailColor:0x23e7ff});
addNeonEdgedBox('CLIMB_2',[42,2.4,-4],[9,4.8,7],calmMat.orange,{platform:true,solid:true,front:'z-',edgeColor:0xff3fb4,detailColor:0xff9d18});
addNeonEdgedBox('CLIMB_3',[42,3.6,-12],[9,7.2,7],calmMat.blue,{platform:true,solid:true,front:'z-',edgeColor:0x8f6cff,detailColor:0x23e7ff});
box('CLIMB_RED_1',[42,2.05,.45],[6,.42,.18],'red',{platform:false});
box('CLIMB_RED_2',[42,4.05,-7.55],[6,.42,.18],'red',{platform:false});
box('CLIMB_RED_3',[42,6.05,-15.55],[6,.42,.18],'red',{platform:false});
label('RED = RUNNER LINE',[42,9.2,-6],'#ff454d',.56);

// ---------- SIGNATURE SPIRAL TOWER ----------
// Revert the hub to the calmer v0.10.3 state and keep just one strong vertical object:
// a readable green tower with a spiral route that can carry the skater from bottom to top.
const towerShellMat=new THREE.MeshToonMaterial({color:0xc8ff29});
const towerBandMat=new THREE.MeshToonMaterial({color:0x1f2b31});
const towerTrimMat=new THREE.MeshToonMaterial({color:0x11161c});
const towerGlowMat=new THREE.MeshToonMaterial({color:0xeaff84});
const towerCX=64,towerCZ=48,towerH=30,towerR=7.8;
const towerBody=new THREE.Mesh(new THREE.CylinderGeometry(towerR,towerR,towerH,22),towerShellMat);
towerBody.position.set(towerCX,towerH/2,towerCZ);addMesh(towerBody,true,true);
const towerCap=new THREE.Mesh(new THREE.CylinderGeometry(towerR+1.0,towerR+.6,1.4,22),towerTrimMat);
towerCap.position.set(towerCX,towerH+.7,towerCZ);addMesh(towerCap,true,true);
const towerTopGlow=new THREE.Mesh(new THREE.CylinderGeometry(towerR-.9,towerR-.9,.65,22),towerGlowMat);
towerTopGlow.position.set(towerCX,towerH+1.3,towerCZ);addMesh(towerTopGlow,true,true);
for(const y of [4.4,8.9,13.4,17.9,22.4,26.9]){
  const band=new THREE.Mesh(new THREE.TorusGeometry(towerR+.06,.34,8,30),towerTrimMat);
  band.position.set(towerCX,y,towerCZ);band.rotation.x=Math.PI/2;addMesh(band,true,true);
  const windowRing=new THREE.Mesh(new THREE.TorusGeometry(towerR-.78,.21,8,30),towerBandMat);
  windowRing.position.set(towerCX,y+.18,towerCZ);windowRing.rotation.x=Math.PI/2;addMesh(windowRing,true,true);
}
for(const a of [0,Math.PI*.5,Math.PI,Math.PI*1.5]){
  const sx=Math.cos(a)*(towerR+.04),sz=Math.sin(a)*(towerR+.04);
  const seam=box('TOWER_SEAM_'+a,[towerCX+sx,15,towerCZ+sz],[.34,30,.34],towerTrimMat,{platform:false});
}
addNeonEdgedBox('SPIRAL_LOOKOUT',[towerCX,towerH+2.2,towerCZ],[15,1.0,15],calmMat.blue,{platform:true,solid:true,front:'z-',edgeColor:0x76ff18,detailColor:0xffffff,topEdges:true,verticalEdges:false});
label('SPIRAL TOWER',[towerCX,towerH+5.7,towerCZ],'#cfff17',.54);
label('GRIND UP',[towerCX-13,3.2,towerCZ-10],'#ffffff',.44);

// Tower access is intentionally obvious: a long straight feeder lane from open ground merges into
// the spiral itself. No raised start pad or blocker sits in front of the catch point.
box('SPIRAL_APPROACH_MARK',[towerCX,.035,towerCZ-27],[10,.07,38],'cyan',{platform:false,solid:false});
label('TOWER LINE →',[towerCX,2.2,towerCZ-36],'#ffffff',.40);
const spiralPts=[
  new THREE.Vector3(towerCX,1.00,towerCZ-33.0),
  new THREE.Vector3(towerCX,1.02,towerCZ-25.0),
  new THREE.Vector3(towerCX,1.08,towerCZ-17.0)
];
const turns=2.50;
const startA=-Math.PI/2;
const startY=1.22,endY=towerH+1.45;
for(let i=0;i<=38;i++){
  const u=i/38;
  const a=startA-u*(Math.PI*2*turns);
  const r=towerR+2.55+.24*Math.sin(u*Math.PI*3.0);
  const x=towerCX+Math.cos(a)*r;
  const z=towerCZ+Math.sin(a)*r;
  const y=startY+(endY-startY)*u+.12*Math.sin(u*Math.PI*4.0);
  spiralPts.push(new THREE.Vector3(x,y,z));
}
// Curl the final metres inward over the lookout instead of ejecting the skater beyond the roof.
const endA=startA-Math.PI*2*turns;
for(const [r,y] of [[8.4,towerH+1.60],[6.0,towerH+1.92],[3.5,towerH+2.08]]){
  spiralPts.push(new THREE.Vector3(towerCX+Math.cos(endA)*r,y,towerCZ+Math.sin(endA)*r));
}
const spiralRail=addRail('SPIRAL_TOWER_RAIL',spiralPts,'yellow',.17,'city',12);
for(const z of [towerCZ-28,towerCZ-22,towerCZ-16,towerCZ-10])box('SPIRAL_HINT_'+z,[towerCX,.13,z],[3.6,.18,.18],'red',{platform:false});

// ---------- DEVELOPMENT ZONE SET DRESSING ----------
label('DEVELOPMENT ZONE',[-52,13,61],'#ffe33b',.82);
label('SITE 04 // OPEN ROUTE',[55,12,-61],'#ffffff',.42);
developmentCrane(-52,62,37,31,.15);developmentCrane(58,-62,43,34,-.55);
developmentBillboard([-78,8,38],Math.PI/2,.72);developmentBillboard([78,8,-8],-Math.PI/2,.72);developmentBillboard([4,9,79],Math.PI,.65);
addDevelopmentDeck(-52,46,5.2,18,8);addDevelopmentDeck(22,58,6.5,16,7);
addNeonEdgedBox('DEV_SERVICE_BRIDGE',[2,5.4,61],[30,.55,5.5],calmMat.purple,{platform:true,solid:true,front:'z+',edgeColor:0x76ff18,detailColor:0xff3fb4,topEdges:true,verticalEdges:false});for(const x of[-13,13])devBeam([x,0,61],[x,5.1,61],.12,devDarkSteel);for(let x=-12;x<=12;x+=4)devBeam([x,5.75,58.4],[x,5.75,63.6],.055,devSteel);label('TEMP ACCESS // KEEP MOVING',[2,8.6,61],'#ff7547',.46);

// ---------- CURVED SKATE SURFACES ----------
const halfpipes=[];
function addHalfpipe(name,cx,cz,width,length,depth,rot=0,color='purple'){
 const seg=96,verts=[],idx=[];for(let j=0;j<=1;j++){const z=(j-.5)*length;for(let i=0;i<=seg;i++){const u=-1+2*i/seg;const x=u*width/2;const y=-depth+depth*u*u;verts.push(x,y,z)}}for(let i=0;i<seg;i++){const a=i,b=i+1,c=(seg+1)+i,d=c+1;idx.push(a,c,b,b,c,d)}
 const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(verts,3));g.setIndex(idx);g.computeVertexNormals();const m=new THREE.Mesh(g,toon[color]);m.position.set(cx,0,cz);m.rotation.y=rot;addMesh(m,true,true);halfpipes.push({name,cx,cz,width,length,depth,rot});return m
}
addHalfpipe('SUNKEN_PIPE',-43,-8,28,48,5.2,0,'purple');label('SUNKEN HALFPIPE',[-43,3.3,16],'#ffe33b',.7);
addHalfpipe('WALL_PIPE',46,27,22,31,4.0,Math.PI/2,'cyan');label('WALL PIPE',[46,5.4,44],'#ffffff',.55);
const HALFPIPE_COLLISION_U_MAX=1.03;
// v0.10.6L: only a narrow collision tolerance extends beyond the visible lip.
// Low-energy edge contact is resolved by forceHalfpipeRimEscape(), not by a wide invisible deck.
function halfpipeSurface(h,x,z){const dx=x-h.cx,dz=z-h.cz,c=Math.cos(-h.rot),s=Math.sin(-h.rot),lx=dx*c-dz*s,lz=dx*s+dz*c;if(Math.abs(lz)>h.length/2)return null;const rawU=lx/(h.width/2);if(Math.abs(rawU)>HALFPIPE_COLLISION_U_MAX)return null;const u=THREE.MathUtils.clamp(rawU,-1,1),y=-h.depth+h.depth*u*u,dydx=2*h.depth*u/(h.width/2),nx=-dydx*c,nz=dydx*s;return {y,normal:new THREE.Vector3(nx,1,nz).normalize(),kind:'halfpipe',half:h,u,rawU,rimBand:Math.abs(rawU)>.90}}
// simple kicker ramps as planar platforms
const ramps=[];function addRamp(name,cx,cz,w,l,h,rot=0,color='orange'){
 const y0=0,y1=h,b=-.30,x0=-w/2,x1=w/2,z0=-l/2,z1=l/2;
 const verts=[x0,y0,z0,x1,y0,z0,x1,y1,z1,x0,y1,z1,x0,b,z0,x1,b,z0,x1,b,z1,x0,b,z1];
 const idx=[0,2,1,0,3,2,4,6,5,4,7,6,0,4,5,0,5,1,3,2,6,3,6,7,0,3,7,0,7,4,1,5,6,1,6,2];
 const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(verts,3));g.setIndex(idx);g.computeVertexNormals();
 const rampMat=toon[color].clone();rampMat.side=THREE.DoubleSide;const m=new THREE.Mesh(g,rampMat);m.position.set(cx,.1,cz);m.rotation.y=rot;m.name=name;addMesh(m);
 ramps.push({name,cx,cz,w,l,h,rot,visualTopLow:.1,visualTopHigh:.1+h,topFaceWinding:'UP',doubleSided:true});return m
}
addRamp('KICKER_A',10,22,10,16,5.8,0,'orange');addRamp('ROOF_LAUNCH',53,-28,11,18,7.5,Math.PI,'green');addRamp('BONUS_LAUNCH',0,-61,14,20,9.5,Math.PI,'pink');
function rampSurface(r,x,z){const dx=x-r.cx,dz=z-r.cz,c=Math.cos(-r.rot),s=Math.sin(-r.rot),lx=dx*c-dz*s,lz=dx*s+dz*c;if(Math.abs(lx)>r.w/2||Math.abs(lz)>r.l/2)return null;const t=(lz+r.l/2)/r.l;return {y:.1+t*r.h,normal:new THREE.Vector3(0,1,-r.h/r.l).applyAxisAngle(new THREE.Vector3(0,1,0),r.rot).normalize(),kind:'ramp',ramp:r}}

// ---------- GRIND SYSTEM: low rails, handrail, vertical pole -> roof rail ----------
function addRail(name,points,color='cyan',radius=.16,zoneName='city',coinCount=0){const curve=points.length===2?new THREE.LineCurve3(points[0],points[1]):new THREE.CatmullRomCurve3(points,false,'catmullrom',.35);const mesh=new THREE.Mesh(new THREE.TubeGeometry(curve,Math.max(24,points.length*38),radius,8,false),toon[color]);addMesh(mesh,true,true);const r={name,curve,mesh,length:curve.getLength(),zone:zoneName,coinCount,coping:name.startsWith('PIPE_LIP_')};rails.push(r);if(coinCount)spawnRailCoins(r,coinCount);return r}
addRail('CENTER_LOW',[new THREE.Vector3(-18,1.0,8),new THREE.Vector3(18,1.0,8)],'cyan',.17,'city',7);
addRail('STAIR_HANDRAIL',[new THREE.Vector3(24,1.2,40),new THREE.Vector3(24,3.9,27)],'yellow',.16,'city',5);
const verticalToRoofRail=addRail('VERTICAL_TO_ROOF',[new THREE.Vector3(52,.6,12),new THREE.Vector3(52,4.5,12),new THREE.Vector3(51,8.2,11),new THREE.Vector3(46,10,7),new THREE.Vector3(35,10,-2),new THREE.Vector3(28,10,-9)],'white',.18,'city',8);
const roofCurveRail=addRail('ROOF_CURVE',[new THREE.Vector3(28,10,-9),new THREE.Vector3(14,11,-14),new THREE.Vector3(3,12,-23),new THREE.Vector3(-10,11,-31)],'blue',.18,'city',7);

const railConnections={
  'VERTICAL_TO_ROOF:end':{to:'ROOF_CURVE',t:.002,dir:1},
  'ROOF_CURVE:start':{to:'VERTICAL_TO_ROOF',t:.998,dir:-1}
};
function tryRailConnection(r,endpoint){const link=railConnections[r.name+':'+endpoint];if(!link)return false;const target=rails.find(q=>q.name===link.to);if(!target)return false;player.grind=target;player.grindT=link.t;player.grindDir=link.dir;player.grindSpeed=Math.max(9,player.grindSpeed*.985);const p=target.curve.getPointAt(link.t);player.pos.copy(p).add(new THREE.Vector3(0,.72,0));const tan=target.curve.getTangentAt(link.t).normalize().multiplyScalar(link.dir);player.yaw=Math.atan2(tan.x,tan.z);player.grindCooldown=0;player.comboName='RAIL LINK';say(r.name.replaceAll('_',' ')+' → '+target.name.replaceAll('_',' '));return true;}
addRail('FENCE_TOP',[new THREE.Vector3(-34,5.2,56),new THREE.Vector3(34,5.2,56)],'green',.18,'city',8);
addRamp('FENCE_ACCESS',0,45,12,18,5.2,0,'orange');
box('FENCE_ACCESS_MARK',[0,.035,37],[14,.07,16],'cyan',{platform:false,solid:false});
label('FENCE TOP ACCESS',[0,2.2,33],'#ffffff',.38);
addRamp('ALLEY_ACCESS',-7,-57,8,10,6.6,0,'orange');
box('ALLEY_ACCESS_MARK',[-7,.035,-68],[10,.07,14],'cyan',{platform:false,solid:false});
label('ALLEY SECRET ACCESS',[-7,2.3,-69],'#ffffff',.36);
addRail('ALLEY_SECRET',[new THREE.Vector3(-7,6.7,-54),new THREE.Vector3(3,9.2,-54),new THREE.Vector3(13,9.2,-54)],'orange',.18,'city',6);


// ---------- RUNNER GAP: normal jump is intentionally too short; wall ride is the bridge ----------
// v0.5.2 FLOORFIX: do NOT carve an invisible death/void rectangle through the rendered asphalt.
// The elevated RUNNER_START / RUNNER_FINISH route still creates the intended skill gap,
// but if the player drops to the visibly rendered street below, the street now remains solid.
// (The old voidZones.push({minX:-16,maxX:22,minZ:-54,maxZ:-30}) caused the exact
//  "fall through a floor that is visibly there" bug in front of NORMAL JUMP = SHORT.)
box('RUNNER_START',[30,6.9,-42],[16,1.5,22],'concrete',{platform:true,solid:false,ride:false}); // VIDEO-REPRO: top is collidable, front box face is not
box('RUNNER_FINISH',[-26,6.9,-42],[20,1.5,22],'concrete',{platform:true,solid:true,ride:false});
addRamp('RUNNER_ASCENT',30,-22,15,18,7.55,Math.PI,'orange');
addWall('RUNNER_WALL','z',-53.55,-17,23,-7,15,'white',false,true);
box('RUNNER_RED_STRIPE',[3,10.4,-53.18],[40,.55,.18],'red',{platform:false});
for(let i=0;i<7;i++)box('RUNNER_RED_DASH',[19-i*5.8,8.6+Math.sin(i/6*Math.PI)*3.0,-53.05],[2.2,.28,.12],'red',{platform:false});
label('WALL RIDE GAP',[3,16.5,-52.7],'#ff454d',.72);
label('NORMAL JUMP = SHORT',[-.5,3.2,-35],'#ffffff',.42);

// ---------- SKYLINE BONUS: old floating grammar becomes an optional high-speed route ----------
const bonusOrigin=new THREE.Vector3(0,88,-145);box('BONUS_START',[0,87,-145],[22,2,18],'cyan',{platform:true,zone:'bonus'});label('SKYLINE BONUS',[0,94,-145],'#ffe33b',.85);
const bonusPts=[new THREE.Vector3(0,89,-151),new THREE.Vector3(-7,94,-175),new THREE.Vector3(8,100,-200),new THREE.Vector3(-5,108,-229),new THREE.Vector3(9,117,-260),new THREE.Vector3(0,126,-292)];
const bonusRail=addRail('SKYLINE_HERO',bonusPts,'cyan',.22,'bonus',22);
for(let i=0;i<12;i++){const t=i/11,p=bonusRail.curve.getPointAt(t);box('BONUS_BLOCK_'+i,[p.x+(i%2?8:-8),p.y-2,p.z],[8,2,7],['pink','yellow','green','purple','orange','cyan'][i%6],{platform:true,zone:'bonus'});}
box('BONUS_FINISH',[0,126,-300],[22,2,15],'white',{platform:true,zone:'bonus'});makeTagWall([0,130,-307],0,true);bonusReturnTag=tagWalls[tagWalls.length-1];bonusReturnTag.tagId='BONUS_RETURN';label('TAG TO RETURN',[0,135,-306],'#ff42ba',.65);
// invisible guardrails around the gravity return wall so the player can safely line up the spray.
// Open on the front side only: left, right and back are protected.
walls.push(
  {axis:'x',coord:-11.2,min:-306.35,max:-292.0,bottom:125.0,top:138.0,mesh:null,ride:false,thickness:.20,zone:'bonus'},
  {axis:'x',coord: 11.2,min:-306.35,max:-292.0,bottom:125.0,top:138.0,mesh:null,ride:false,thickness:.20,zone:'bonus'},
  {axis:'z',coord:-306.25,min:-11.2,max:11.2,bottom:125.0,top:138.0,mesh:null,ride:false,thickness:.24,zone:'bonus'}
);
// SECRET SKYLINE PORTAL: progression-gated floating jump gate above the high end of BONUS_LAUNCH.
// The player must actually ride up the pink ramp and become airborne to enter it.
// Before the UP tag is completed there is no visible entrance, FX, label or active trigger.
const SKYLINE_PORTAL_RAMP=ramps.find(r=>r.name==='BONUS_LAUNCH');
const SKYLINE_PORTAL_LIP_T=.95;
function skylineRampWorldPoint(r,t){
 const localZ=-r.l/2+r.l*t,c=Math.cos(r.rot),sn=Math.sin(r.rot);
 return new THREE.Vector3(r.cx-localZ*sn,.1+t*r.h,r.cz+localZ*c);
}
const SKYLINE_PORTAL_LAUNCH_POINT=SKYLINE_PORTAL_RAMP?skylineRampWorldPoint(SKYLINE_PORTAL_RAMP,SKYLINE_PORTAL_LIP_T):new THREE.Vector3(0,9.1,-70);
const SKYLINE_PORTAL_POSITION=SKYLINE_PORTAL_LAUNCH_POINT.clone().add(new THREE.Vector3(0,3.35,0));
const SKYLINE_PORTAL_MIN_AIR_Y=SKYLINE_PORTAL_LAUNCH_POINT.y+1.35;
const portal=box('BONUS_PORTAL',[SKYLINE_PORTAL_POSITION.x,SKYLINE_PORTAL_POSITION.y,SKYLINE_PORTAL_POSITION.z],[8.8,7.0,.16],'pink',{platform:false,solid:false,ride:false});
// The box is trigger geometry only. The visible portal is the circular FX group below.
portal.material.transparent=true;portal.material.opacity=0;portal.material.depthWrite=false;
const skylinePortalLabelA=label('SKYLINE BONUS ↑',[SKYLINE_PORTAL_POSITION.x,SKYLINE_PORTAL_POSITION.y+5.1,SKYLINE_PORTAL_POSITION.z],'#ffffff',.6);
const skylinePortalLabelB=label('SECRET SKY PORTAL',[SKYLINE_PORTAL_POSITION.x,SKYLINE_PORTAL_POSITION.y+7.1,SKYLINE_PORTAL_POSITION.z],'#ff42ba',.48);
const portalFx={g:new THREE.Group(),rings:[],sparks:[]};
portalFx.g.position.copy(SKYLINE_PORTAL_POSITION);scene.add(portalFx.g);
// Vertical halo and luminous center, so the portal reads as an airborne gate instead of a floor decal.
const portalFloor=new THREE.Mesh(new THREE.RingGeometry(3.2,5.05,32),new THREE.MeshBasicMaterial({color:0x2bf7ff,transparent:true,opacity:.28,side:THREE.DoubleSide,depthWrite:false}));
portalFloor.rotation.set(0,0,0);portalFx.g.add(portalFloor);portalFx.floor=portalFloor;
const portalDisc=new THREE.Mesh(new THREE.CircleGeometry(3.0,28),new THREE.MeshBasicMaterial({color:0xffffff,transparent:true,opacity:.08,side:THREE.DoubleSide,depthWrite:false}));
portalDisc.rotation.set(0,0,0);portalDisc.position.z=.025;portalFx.g.add(portalDisc);portalFx.disc=portalDisc;
for(let i=0;i<3;i++){const r=new THREE.Mesh(new THREE.TorusGeometry(2.55+i*.78,.14,10,40),new THREE.MeshBasicMaterial({color:[0xffffff,0xff42ba,0x2bf7ff][i],transparent:true,opacity:.72-i*.14,depthWrite:false}));r.rotation.y=0;r.position.y=(i-1)*.10;portalFx.g.add(r);portalFx.rings.push(r)}
for(let i=0;i<8;i++){const s=new THREE.Mesh(new THREE.SphereGeometry(.12,8,8),new THREE.MeshBasicMaterial({color:i%2?0xff42ba:0xffffff,transparent:true,opacity:.85,depthWrite:false}));portalFx.g.add(s);portalFx.sparks.push({m:s,phase:i/8*Math.PI*2,height:(i%3-1)*.45,radius:3.35+(i%2)*.55})}
// Name retained for QA compatibility: it now verifies the portal is over the high-end launch corridor, not lying on the ramp surface.
function skylinePortalSitsOnBonusRamp(){const r=SKYLINE_PORTAL_RAMP;if(!r)return false;const s=rampSurface(r,portal.position.x,portal.position.z);if(!s)return false;const dx=portal.position.x-r.cx,dz=portal.position.z-r.cz,c=Math.cos(-r.rot),sn=Math.sin(-r.rot),lz=dx*sn+dz*c,t=(lz+r.l/2)/r.l;return t>.88&&t<=1.02&&portal.position.y-s.y>2.8&&portal.position.y-s.y<4.2}
function applySkylinePortalState(){
 const on=!!skylinePortalUnlocked;
 portal.visible=on;portalFx.g.visible=on;
 if(skylinePortalLabelA)skylinePortalLabelA.visible=on;
 if(skylinePortalLabelB)skylinePortalLabelB.visible=on;
 if(!on)skylinePortalReveal=0;
 document.querySelectorAll('.spot[data-drop="bonus"]').forEach(el=>el.style.display=on?'grid':'none');
 document.querySelectorAll('.cityCard').forEach(el=>{if(el.querySelector('[data-drop="bonus"]'))el.style.display=on?'block':'none'});
}
function skylineUnlockChime(){blip(523,.11,.07,'triangle');setTimeout(()=>blip(659,.12,.065,'triangle'),70);setTimeout(()=>blip(784,.16,.07,'sine'),145);setTimeout(()=>blip(1047,.20,.055,'sine'),230)}
function unlockSkylinePortal(){if(skylinePortalUnlocked)return false;skylinePortalUnlocked=true;skylinePortalReveal=0;applySkylinePortalState();addScore(750,'SKYLINE UNLOCKED');say('UP TAG COMPLETE · SECRET SKY PORTAL OPEN!');skylineUnlockChime();persistRuntimeState();return true}
function updatePortalFx(dt,now=t){if(!skylinePortalUnlocked){portalFx.g.visible=false;portal.visible=false;return}portal.visible=true;portalFx.g.visible=true;skylinePortalReveal=Math.min(1,skylinePortalReveal+dt*1.45);const reveal=skylinePortalReveal*skylinePortalReveal*(3-2*skylinePortalReveal),pulse=.72+Math.sin(now*4.6)*.08,spin=now*1.2;portalFx.g.scale.setScalar(.20+.80*reveal);portalFx.floor.material.opacity=reveal*(.20+.10*Math.sin(now*3.4));portalFx.floor.scale.setScalar(1+.03*Math.sin(now*2.6));portalFx.disc.material.opacity=reveal*(.05+.03*Math.sin(now*2.1+1.2));portalFx.rings.forEach((r,i)=>{r.rotation.z=spin*(i%2?1:-1)*(.65+i*.14);r.position.y=(i-1)*.10+.10*Math.sin(now*2.2+i*.8);const s=1+.06*Math.sin(now*3.2+i*1.1);r.scale.setScalar(s);r.material.opacity=reveal*(.30+.18*Math.sin(now*3.1+i*.8)+(.20-i*.04))});portalFx.sparks.forEach((p,i)=>{const a=spin*(.7+i*.05)+p.phase,rad=p.radius+.25*Math.sin(now*2.8+i),x=Math.cos(a)*rad,y=Math.sin(a)*rad*.72;p.m.position.set(x,y+p.height,.08*Math.sin(now*3.6+i*1.7));const ps=.8+.45*Math.sin(now*4.4+i*.9);p.m.scale.setScalar(ps*pulse);p.m.material.opacity=reveal*(.35+.35*Math.sin(now*5.1+i*1.3))});}
applySkylinePortalState();

function spawnRailCoins(r,n){for(let i=1;i<=n;i++){const t=i/(n+1),p=r.curve.getPointAt(t).add(new THREE.Vector3(0,.9,0));const g=new THREE.Group(),isSkyline=r.name==='SKYLINE_HERO';const ringMat=isSkyline?new THREE.MeshBasicMaterial({color:0xffe33b,transparent:true,opacity:.98}):toon.yellow;const ring=new THREE.Mesh(new THREE.TorusGeometry(isSkyline?.44:.38,isSkyline?.15:.13,8,18),ringMat);ring.rotation.y=Math.PI/2;g.add(ring);const core=new THREE.Mesh(new THREE.CircleGeometry(isSkyline?.29:.25,18),new THREE.MeshBasicMaterial({color:isSkyline?0xffffff:0xfff08b,side:THREE.DoubleSide,transparent:isSkyline,opacity:isSkyline?.92:1}));core.rotation.y=Math.PI/2;g.add(core);if(isSkyline){const halo=new THREE.Mesh(new THREE.TorusGeometry(.57,.035,6,20),new THREE.MeshBasicMaterial({color:0x2bf7ff,transparent:true,opacity:.72,depthWrite:false}));halo.rotation.y=Math.PI/2;g.add(halo)}g.position.copy(p);g.userData={collected:false,rail:r.name,zone:r.zone,bonusRail:isSkyline,coinIndex:i-1};scene.add(g);coins.push(g)}}
// extra discovery coins. The old standalone ALLEY_SECRET / white-wall coin was removed: it floated too high above the intended route.
for(const p of [[-24,8,-12],[-20,10,-16],[-16,12,-22],[52,9,4],[47,11,0],[0,10,57]]){const g=new THREE.Mesh(new THREE.TorusGeometry(.4,.14,8,18),toon.yellow);g.position.set(...p);g.rotation.y=Math.PI/2;g.userData={collected:false};scene.add(g);coins.push(g)}
for(let i=0;i<8;i++){const u=i/7,x=19-u*34,y=9.0+Math.sin(u*Math.PI)*3.2,z=-52.45;const g=new THREE.Mesh(new THREE.TorusGeometry(.4,.14,8,18),toon.yellow);g.position.set(x,y,z);g.rotation.y=Math.PI/2;g.userData={collected:false};scene.add(g);coins.push(g)}
document.getElementById('coinTotal').textContent=coins.length;document.getElementById('bagCount').textContent=runnerBagsCollected;document.getElementById('bagTotal').textContent='1';

function makeRunnerBag(pos,rotY=0,zone='city'){
 const g=new THREE.Group();g.position.set(...pos);g.rotation.set(-Math.PI/2+.08,rotY,.06);g.scale.setScalar(1.42);
 const bodyMat=new THREE.MeshToonMaterial({color:0xe34152}),pocketMat=new THREE.MeshToonMaterial({color:0xb1263e}),strapMat=new THREE.MeshToonMaterial({color:0xf4f1d8}),trimMat=new THREE.MeshToonMaterial({color:0xffd84a}),paperMat=new THREE.MeshToonMaterial({color:0xf4f4f4}),inkMat=new THREE.MeshToonMaterial({color:0x17162a});
 const body=new THREE.Mesh(new THREE.BoxGeometry(.95,.52,.42),bodyMat);body.position.set(0,.26,0);body.rotation.z=.16;body.castShadow=body.receiveShadow=true;g.add(body);
 const pocket=new THREE.Mesh(new THREE.BoxGeometry(.56,.24,.10),pocketMat);pocket.position.set(.12,.17,.23);pocket.rotation.set(.08,0,.16);pocket.castShadow=pocket.receiveShadow=true;g.add(pocket);
 const flap=new THREE.Mesh(new THREE.BoxGeometry(.82,.12,.30),bodyMat);flap.position.set(-.03,.54,.03);flap.rotation.z=.12;flap.castShadow=flap.receiveShadow=true;g.add(flap);
 const strap=new THREE.Mesh(new THREE.TorusGeometry(.30,.04,8,22,Math.PI*1.15),strapMat);strap.rotation.set(1.2,0,.45);strap.position.set(-.18,.53,-.06);g.add(strap);
 const buckle=new THREE.Mesh(new THREE.BoxGeometry(.15,.08,.05),trimMat);buckle.position.set(.18,.20,.285);buckle.rotation.z=.16;g.add(buckle);
 const note=new THREE.Mesh(new THREE.PlaneGeometry(.42,.30),paperMat);note.position.set(.58,.03,.18);note.rotation.set(-Math.PI/2.1,-.35,.12);note.receiveShadow=true;g.add(note);
 const scribble=new THREE.Mesh(new THREE.PlaneGeometry(.22,.14),inkMat);scribble.position.set(.60,.032,.18);scribble.rotation.copy(note.rotation);g.add(scribble);
 scene.add(g);g.userData={collected:false,zone};runnerBags.push(g);return g;
}
function playRunnerBagSound(){[659,784,1047].forEach((f,i)=>setTimeout(()=>blip(f,.12,.07,i<2?'triangle':'sine'),i*78))}
function playAllGraffitiComplete(){[1319,1568,2093,2637].forEach((f,i)=>setTimeout(()=>blip(f,.14+i*.02,Math.max(.035,.07-i*.008),i<2?'triangle':'sine'),i*95))}
function permanentGraffitiTotal(){return driveByGraffitiSpots.length}
function permanentGraffitiDone(){let n=0;for(const s of driveByGraffitiSpots)if(s.done)n++;return n}
function updateGraffitiCounter(){const kysTargets=kysChallengeSession&&KLOOJO_ZONE_ID==='development'?driveByGraffitiSpots.filter(s=>s.kysActive):null;const n=kysTargets?kysTargets.filter(s=>s.done).length:(KLOOJO_ZONE_ID==='runtimeTest'?tagWalls.filter(s=>s.done).length:permanentGraffitiDone()),total=kysTargets?kysTargets.length:(KLOOJO_ZONE_ID==='runtimeTest'?tagWalls.length:permanentGraffitiTotal());const c=document.getElementById('graffitiCount'),t=document.getElementById('graffitiTotal');if(c)c.textContent=n;if(t)t.textContent=total;return n}
function maybeRewardAllGraffiti(){if(allGraffitiRewarded)return false;if(permanentGraffitiDone()>=permanentGraffitiTotal()){allGraffitiRewarded=true;addScore(1500,'ALL GRAFFITI');playAllGraffitiComplete();const icon=document.getElementById('graffitiCounterIcon');if(icon){icon.classList.remove('counterHit');void icon.offsetWidth;icon.classList.add('counterHit')}return true}return false}
function collectRunnerBags(){for(const b of runnerBags){if(kysChallengeSession&&b.userData.kysActive===false)continue;if(b.userData.collected)continue;if(b.userData.zone&&b.userData.zone!==player.zone)continue;if(b.position.distanceTo(player.pos)<1.65){b.userData.collected=true;b.visible=false;runnerBagsCollected++;document.getElementById('bagCount').textContent=runnerBagsCollected;addScore(750,'RUNNER BAG');say('RUNNER BAG FOUND!');playRunnerBagSound();kysChallengeEngine?.event('bag.collected',{id:b.userData.kysSpawnId||b.userData.persistId||'runner_bag',position:b.position.toArray()});kysLegacyProgress('bag.collected');persistRuntimeState();}}}
// One hard-to-reach runner bag, deliberately staged on the lime-edged orange table beside the north graffiti fence.
// It sits near the middle of the tabletop so the player can spot it from below, then work out how to reach it.
makeRunnerBag([-52.0,5.74,46.0],.42,'city');

function graffitiTexture(seed){const c=document.createElement('canvas');c.width=512;c.height=256;const x=c.getContext('2d');x.fillStyle='#fff';x.fillRect(0,0,c.width,c.height);x.lineJoin='round';x.lineCap='round';const cols=['#ff3fb4','#2bf7ff','#ffe33b','#5eff6d','#8757ff','#ff7547'];for(let i=0;i<16;i++){x.strokeStyle=cols[(seed+i)%cols.length];x.lineWidth=15+((i*7)%22);x.beginPath();x.moveTo(25+Math.sin(i)*45,130+Math.cos(i*2)*60);x.bezierCurveTo(100+i*12,20+(i*31)%210,310-i*5,235-(i*27)%175,485,60+(i*21)%130);x.stroke()}x.fillStyle='#17162a';x.font='900 74px Arial Black';x.textAlign='center';x.textBaseline='middle';x.fillText(seed===99?'BACK 2 CITY':['SKATE','FLOW','CITY','UP!'][seed%4],256,132);const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;return t}
function makeTagWall(pos,rotY=0,isBonus=false){
 const g=new THREE.Group();const base=new THREE.Mesh(new THREE.BoxGeometry(9,5.4,.55),toon.white);base.castShadow=true;base.receiveShadow=true;g.add(base);
 // The tag itself stays completely hidden until the player paints it.
 const face=new THREE.Mesh(new THREE.PlaneGeometry(8.3,4.7),new THREE.MeshBasicMaterial({map:graffitiTexture(isBonus?99:tagWalls.length),transparent:true,opacity:0,depthWrite:false}));face.position.z=.286;g.add(face);
 const indicator=makeGraffitiSignal(7.8);indicator.position.set(0,0,.325);g.add(indicator);
 g.position.set(...pos);g.rotation.y=rotY;scene.add(g);tagWalls.push({g,face,indicator,done:false,progress:0,isBonus});return g
}
// The UP mural remains the discovery key, but its actual art is hidden until sprayed.
makeTagWall([68,3.2,-10],-Math.PI/2,false);skylineUnlockTag=tagWalls[tagWalls.length-1];skylineUnlockTag.unlocksPortal=true;skylineUnlockTag.tagId='UP_PORTAL_UNLOCK';skylineUnlockTag.noIndicator=true;if(skylineUnlockTag.indicator)skylineUnlockTag.indicator.visible=false;
if(skylinePortalUnlocked){skylineUnlockTag.done=true;skylineUnlockTag.progress=1;skylineUnlockTag.face.material.opacity=1;skylineUnlockTag.indicator.visible=false;}

// ---------- DRIVE-BY GRAFFITI v0.2: 23 HIDDEN TAGS ----------
// Every user-supplied graffiti asset lives somewhere in the city. Before completion only the cyan/blue signal is visible.
const DRIVEBY_GRAFFITI_ASSETS=[
"assets/graffiti/tag-01.webp",
"assets/graffiti/tag-02.webp",
"assets/graffiti/tag-03.webp",
"assets/graffiti/tag-04.webp",
"assets/graffiti/tag-05.webp",
"assets/graffiti/tag-06.webp",
"assets/graffiti/tag-07.webp",
"assets/graffiti/tag-08.webp",
"assets/graffiti/tag-09.webp",
"assets/graffiti/tag-10.webp",
"assets/graffiti/tag-11.webp",
"assets/graffiti/tag-12.webp",
"assets/graffiti/tag-13.webp",
"assets/graffiti/tag-14.webp",
"assets/graffiti/tag-15.webp",
"assets/graffiti/tag-16.webp",
"assets/graffiti/tag-17.webp",
"assets/graffiti/tag-18.webp",
"assets/graffiti/tag-19.webp",
"assets/graffiti/tag-20.webp",
"assets/graffiti/tag-21.webp",
"assets/graffiti/tag-22.webp",
"assets/graffiti/tag-23.webp"
];
const DRIVEBY_GRAFFITI_CONFIGS=[
  {id:"RUNNER_HIDEOUT",pos:[30,3.1,-52.92],rotY:0,size:[10.9,4.75],panelColor:"#d92e37",radius:7.0,dyLimit:7.5,asset:0},
  {id:"BLDG_00_WEST",pos:[-67.94,3.0,-68],rotY:Math.PI/2,size:[8.4,4.4],panelColor:null,radius:6.2,dyLimit:6.0,asset:1},
  {id:"BLDG_01_EAST",pos:[67.94,3.0,-49],rotY:-Math.PI/2,size:[8.4,4.4],panelColor:null,radius:6.2,dyLimit:6.0,asset:2},
  {id:"BLDG_02_SOUTH",pos:[-30,3.0,-67.94],rotY:0,size:[9.6,4.4],panelColor:null,radius:6.2,dyLimit:6.0,asset:3},
  {id:"BLDG_03_NORTH",pos:[-11,3.0,67.94],rotY:Math.PI,size:[10.2,4.4],panelColor:null,radius:6.2,dyLimit:6.0,asset:4},
  {id:"BLDG_04_WEST",pos:[-67.94,3.0,8],rotY:Math.PI/2,size:[8.8,4.4],panelColor:null,radius:6.2,dyLimit:6.0,asset:5},
  {id:"BLDG_06_SOUTH",pos:[46,3.0,-67.94],rotY:0,size:[10.0,4.4],panelColor:null,radius:6.2,dyLimit:6.0,asset:6},
  {id:"BLDG_08_WEST",pos:[-67.94,3.0,-52],rotY:Math.PI/2,size:[9.6,4.4],panelColor:null,radius:6.2,dyLimit:6.0,asset:7},
  {id:"BLDG_09_EAST",pos:[67.94,3.0,-33],rotY:-Math.PI/2,size:[10.2,4.4],panelColor:null,radius:6.2,dyLimit:6.0,asset:8},
  {id:"BLDG_11_NORTH",pos:[5,3.0,67.94],rotY:Math.PI,size:[9.2,4.4],panelColor:null,radius:6.2,dyLimit:6.0,asset:9},
  {id:"BLDG_12_WEST",pos:[-67.94,3.0,24],rotY:Math.PI/2,size:[10.0,4.4],panelColor:null,radius:6.2,dyLimit:6.0,asset:10},
  {id:"BLDG_14_SOUTH",pos:[62,3.0,-67.94],rotY:0,size:[8.8,4.4],panelColor:null,radius:6.2,dyLimit:6.0,asset:11},
  {id:"BLDG_15_NORTH",pos:[-55,3.0,67.94],rotY:Math.PI,size:[9.6,4.4],panelColor:null,radius:6.2,dyLimit:6.0,asset:12},
  {id:"BLDG_16_WEST",pos:[-67.94,3.0,-36],rotY:Math.PI/2,size:[8.6,4.4],panelColor:null,radius:6.2,dyLimit:6.0,asset:13},
  {id:"BLDG_17_EAST",pos:[67.94,3.0,-17],rotY:-Math.PI/2,size:[8.8,4.4],panelColor:null,radius:6.2,dyLimit:6.0,asset:14},
  {id:"FENCE_N_LEFT",pos:[-29,2.35,55.68],rotY:Math.PI,size:[7.2,3.7],panelColor:null,radius:5.8,dyLimit:5.0,asset:15},
  {id:"RUNNER_WHITE_RADIO_FLOOR",pos:[-26.0,7.69,-42.0],rotY:0,rotX:-Math.PI/2,size:[7.2,3.7],panelColor:null,radius:5.8,dyLimit:2.4,asset:16,surface:"floor",platform:"RUNNER_FINISH"},
  {id:"WALLRIDE_BLUE_HIGH",pos:[-18.68,4.8,-4.0],rotY:Math.PI/2,size:[6.4,3.7],panelColor:null,radius:4.8,dyLimit:3.2,asset:17,requiresWallRide:true},
  // R6 relocation: these two assets used to sit on the green BACK_ALLEY_WALL behind foreground geometry.
  // Keep all 23 collectibles, but move the hidden art to clean, readable traversal surfaces.
  {id:"RUNNER_START_FLOOR_TAG",pos:[30.0,7.69,-42.0],rotY:0,rotX:-Math.PI/2,size:[6.8,3.5],panelColor:null,radius:5.8,dyLimit:2.5,asset:18,surface:"floor",platform:"RUNNER_START"},
  {id:"CLIMB_TOP_FLOOR_TAG",pos:[42.0,7.24,-12.0],rotY:0,rotX:-Math.PI/2,size:[6.0,3.2],panelColor:null,radius:5.2,dyLimit:2.6,asset:19,surface:"floor",platform:"CLIMB_3"},
  {id:"WALLJUMP_RED_SIDE",pos:[-24.68,3.0,-8],rotY:Math.PI/2,size:[7.0,4.4],panelColor:null,radius:5.8,dyLimit:5.5,asset:20},
  {id:"WALLJUMP_BLUE_SIDE",pos:[-18.68,4.5,2],rotY:Math.PI/2,size:[7.0,4.4],panelColor:null,radius:5.8,dyLimit:6.0,asset:21},
  {id:"RUNNER_HIGH_WALL",pos:[3,10.6,-53.18],rotY:0,size:[10.0,4.4],panelColor:null,radius:6.2,dyLimit:5.5,asset:22}
];
const driveByGraffitiSpots=[];let driveBySprayCooldown=0,driveByHintSpot=null;
let kysWinnerTraces=[],kysWinnerTexture=null;
function kysTraceText(value,max){return String(value??'').replace(/[\u0000-\u001f\u007f]/g,' ').replace(/\s+/g,' ').trim().slice(0,max)}
function kysWinnerGraffitiTexture(trace,seed='winner'){
 const tag=kysTraceText(trace?.personalization?.tag_text||trace?.personalization?.label||'',18)||'KYS';
 const direction=kysTraceText(trace?.personalization?.direction||'',140),key=tag+'|'+direction+'|'+seed;let h=2166136261;for(let i=0;i<key.length;i++){h^=key.charCodeAt(i);h=Math.imul(h,16777619)}h>>>=0;
 const palettes=[['#ff2d55','#ffffff','#101010'],['#5b5cff','#f5f2ff','#111111'],['#00c2a8','#ffffff','#101010'],['#ff8a00','#fff4d6','#101010'],['#f72585','#ffffff','#210024']];const pal=palettes[h%palettes.length];
 const canvas=document.createElement('canvas');canvas.width=1024;canvas.height=512;const ctx=canvas.getContext('2d');ctx.clearRect(0,0,canvas.width,canvas.height);
 ctx.textAlign='center';ctx.textBaseline='middle';ctx.lineJoin='round';ctx.lineCap='round';let size=218;ctx.font=`1000 ${size}px system-ui,-apple-system,sans-serif`;while(ctx.measureText(tag).width>840&&size>82){size-=8;ctx.font=`1000 ${size}px system-ui,-apple-system,sans-serif`;}
 const wobble=((h>>>8)%31)-15;ctx.save();ctx.translate(512,250);ctx.rotate(wobble*Math.PI/180/8);ctx.font=`1000 ${size}px system-ui,-apple-system,sans-serif`;ctx.strokeStyle=pal[2];ctx.lineWidth=Math.max(18,size*.13);ctx.strokeText(tag,0,0);ctx.strokeStyle=pal[1];ctx.lineWidth=Math.max(9,size*.065);ctx.strokeText(tag,0,0);ctx.fillStyle=pal[0];ctx.fillText(tag,0,0);ctx.restore();
 const tex=new THREE.CanvasTexture(canvas);tex.colorSpace=THREE.SRGBColorSpace;tex.minFilter=THREE.LinearFilter;tex.magFilter=THREE.LinearFilter;tex.needsUpdate=true;return tex;
}
function kysApplyWinnerTrace(encounter){
 if(kysWinnerTexture){try{kysWinnerTexture.dispose()}catch{}kysWinnerTexture=null}
 const traces=kysWinnerTraces.filter(t=>t?.type==='graffiti_tag'&&kysTraceText(t?.personalization?.tag_text,18));const active=driveByGraffitiSpots.filter(g=>g.kysActive);if(!traces.length||!active.length)return;
 const trace=seededShuffle(traces,String(encounter?.seed||'0')+':winner-trace')[0],spot=seededShuffle(active,String(encounter?.seed||'0')+':winner-slot')[0];if(!trace||!spot)return;
 const tex=kysWinnerGraffitiTexture(trace,encounter?.seed);kysWinnerTexture=tex;spot.kysWinnerTrace={id:kysTraceText(trace.id,40),tag:kysTraceText(trace.personalization?.tag_text,18),creator:kysTraceText(trace.creator?.username,40),rank:Number(trace.rank)||0};spot.face.material.map=tex;spot.face.material.needsUpdate=true;spot.textureState='ready';
}

function ensureDriveByTexture(s){
 if(!s||s.textureState==='ready'||s.textureState==='loading')return;
 s.textureState='loading';
 new THREE.TextureLoader().load(DRIVEBY_GRAFFITI_ASSETS[s.asset],tex=>{tex.colorSpace=THREE.SRGBColorSpace;tex.minFilter=THREE.LinearFilter;tex.magFilter=THREE.LinearFilter;s.face.material.map=tex;s.face.material.needsUpdate=true;s.textureState='ready';if(s.done)s.face.material.opacity=1;},undefined,()=>{s.textureState='error';});
}
function makeDriveByGraffitiSpot(cfg){
 const g=new THREE.Group();g.position.set(...cfg.pos);g.rotation.y=cfg.rotY||0;scene.add(g);
 const floorSpot=cfg.surface==='floor'||Math.abs(cfg.rotX||0)>.01;
 if(cfg.panelColor){const panel=new THREE.Mesh(new THREE.PlaneGeometry(cfg.size[0]+1.1,cfg.size[1]+.7),new THREE.MeshToonMaterial({color:new THREE.Color(cfg.panelColor),side:THREE.DoubleSide}));if(floorSpot){panel.rotation.x=cfg.rotX||-Math.PI/2;panel.position.y=.012}else panel.position.z=.012;g.add(panel);}
 const face=new THREE.Mesh(new THREE.PlaneGeometry(cfg.size[0],cfg.size[1]),new THREE.MeshBasicMaterial({transparent:true,opacity:0,depthWrite:false,side:THREE.DoubleSide}));if(floorSpot){face.rotation.x=cfg.rotX||-Math.PI/2;face.position.y=.04}else face.position.z=.04;g.add(face);
 const indicator=makeGraffitiSignal(Math.min(cfg.size[0],10.5));if(floorSpot){indicator.rotation.x=-Math.PI/2;indicator.position.y=.16;indicator.position.z=0}else indicator.position.z=.085;g.add(indicator);
 const spot={...cfg,g,face,indicator,pos:new THREE.Vector3(...cfg.pos),done:false,hint:false,textureState:'idle'};driveByGraffitiSpots.push(spot);return spot;
}
for(const cfg of DRIVEBY_GRAFFITI_CONFIGS)makeDriveByGraffitiSpot(cfg);
const KLOOJO_SPRAY_CAN_ICON="assets/ui/spray-can.webp";
updateGraffitiCounter();
function graffitiWorldToScreen(worldPos){
 const p=worldPos.clone().project(camera);
 const visible=Number.isFinite(p.x)&&Number.isFinite(p.y)&&p.z>-1.3&&p.z<1.3;
 return visible?{x:(p.x*.5+.5)*innerWidth,y:(-.5*p.y+.5)*innerHeight}:{x:innerWidth*.5,y:innerHeight*.48};
}
function flyGraffitiCanToCounter(worldPos){
 const target=document.getElementById('graffitiCounterIcon');if(!target)return;
 const start=graffitiWorldToScreen(worldPos||player.pos),tr=target.getBoundingClientRect(),tx=tr.left+tr.width*.5,ty=tr.top+tr.height*.5;
 const img=document.createElement('img');img.src=KLOOJO_SPRAY_CAN_ICON;img.className='graffitiFlyCan';img.setAttribute('aria-hidden','true');img.style.left=start.x+'px';img.style.top=start.y+'px';img.style.setProperty('--dx',(tx-start.x)+'px');img.style.setProperty('--dy',(ty-start.y)+'px');document.body.appendChild(img);
 requestAnimationFrame(()=>img.classList.add('go'));
 setTimeout(()=>{img.remove();target.classList.remove('counterHit');void target.offsetWidth;target.classList.add('counterHit')},700);
 setTimeout(()=>target.classList.remove('counterHit'),1080);
}

function nearestDriveByGraffitiSpot(){let best=null,bd=Infinity;for(const s of driveByGraffitiSpots){if(kysChallengeSession&&s.kysActive===false)continue;if(s.done||player.zone!=='city')continue;const dx=player.pos.x-s.pos.x,dz=player.pos.z-s.pos.z,dy=Math.abs(player.pos.y-s.pos.y),d=Math.hypot(dx,dz);const floorOK=s.surface!=='floor'||(player.pos.y>s.pos.y-1.25&&player.pos.y<s.pos.y+2.8);if(d<bd&&d<15&&dy<s.dyLimit&&floorOK){best=s;bd=d}}return best?{spot:best,d:bd}:null}
function completeDriveByGraffiti(s){if(!s||s.done||driveBySprayCooldown>0)return false;const flyFrom=s.pos.clone();s.done=true;s.roomDone=false;driveBySprayCooldown=.55;ensureDriveByTexture(s);if(s.textureState==='ready')s.face.material.opacity=1;s.indicator.visible=false;addScore(650,'DRIVE-BY TAG');updateGraffitiCounter();flyGraffitiCanToCounter(flyFrom);say('DRIVE-BY TAG +650');blip(330,.06,.08,'square');setTimeout(()=>blip(520,.07,.07,'sawtooth'),60);setTimeout(()=>blip(760,.10,.06,'triangle'),130);if(!kysChallengeSession)maybeRewardAllGraffiti();kysChallengeEngine?.event('graffiti.tagged',{id:s.id,asset:s.asset,position:s.pos.toArray(),requiresWallRide:!!s.requiresWallRide,winnerTrace:s.kysWinnerTrace||null});kysLegacyProgress('graffiti.tagged');if(!kysChallengeSession)multiplayer?.publishWorldAction('graffitiPlace',s.id,KLOOJO_ZONE_ID);persistRuntimeState();return true}
function updateDriveByGraffiti(dt,nowMs){
 driveBySprayCooldown=Math.max(0,driveBySprayCooldown-dt);const near=nearestDriveByGraffitiSpot();driveByHintSpot=near?.spot||null;
 for(const s of driveByGraffitiSpots){if(kysChallengeSession&&s.kysActive===false){if(s.indicator)s.indicator.visible=false;continue}if(s.done)continue;const d=Math.hypot(player.pos.x-s.pos.x,player.pos.z-s.pos.z);pulseGraffitiSignal(s.indicator,d,nowMs);if(d<12&&Math.abs(player.pos.y-s.pos.y)<s.dyLimit+2)ensureDriveByTexture(s);}
 // Discovery grammar: the in-world cyan signal is the ONLY pre-spray hint. No HUD tutorial, no proximity text.
 if(near&&near.d<near.spot.radius&&player.action&&(!near.spot.requiresWallRide||!!player.wallRide))completeDriveByGraffiti(near.spot);
}

// Runtime Test is a surgical projection of the canonical runtime: remove only the
// already-created Development world meshes, then rebuild a tiny course exclusively
// through the canonical helpers above. The character, controls and physics below
// are shared byte-for-byte with Development.
// Development link sits in the real gap between purple BLDG_15 (x≈-55) and BLDG_3 (x≈-11), beside the north crane.
let districtGate={axis:'z',coord:77.2,center:-34,span:4.7,direction:1,spawn:[-34,.2,70.6],yaw:Math.PI};
if(KLOOJO_ZONE_ID==='runtimeTest'){
 for(const child of scene.children.slice(canonicalWorldContentStart))scene.remove(child);
 for(const list of[platforms,rails,walls,solids,voidZones,coins,runnerBags,tagWalls,sparks,turnClouds,halfpipes,ramps,driveByGraffitiSpots,traversalSurfaces,climbHolds])list.length=0;
 coinsCollected=0;runnerBagsCollected=0;skylineUnlockTag=null;bonusReturnTag=null;skylinePortalUnlocked=false;skylinePortalReveal=0;
 box('RUNTIME_FLOOR',[0,-.65,0],[120,1.3,120],devMat.road,{platform:false});
 addRamp('RUNTIME_RAMP',0,10,10,16,5.8,Math.PI,'orange');
 addHalfpipe('RUNTIME_HALFPIPE',-20,0,18,28,3.6,0,'purple');
 addRail('RUNTIME_TEST_RAIL',[new THREE.Vector3(12,1,15),new THREE.Vector3(12,1,-12)],'cyan',.17,'city',3);
 addWall('RUNTIME_WALLRIDE','x',22,-18,20,0,10,'blue',false,true);
 addWall('RUNTIME_GRAFFITI','z',-28,-10,10,0,6,'white',true,true);
 const runtimeTag=tagWalls[tagWalls.length-1];if(runtimeTag)runtimeTag.tagId='RUNTIME_TEST_TAG';
 // Compact opt-in traversal laboratory. Only the descriptors registered below may attach.
 addNeonEdgedBox('TRAVERSE_VAULT',[35,.72,20],[7,1.44,1.15],calmMat.orange,{platform:true,solid:true,front:'z+',edgeColor:0x76ff18,detailColor:0x23e7ff,verticalEdges:false});
 registerTraversal({id:'TRAVERSE_VAULT',kind:'vaultable',axis:'z',coord:20,min:31.5,max:38.5,bottom:0,top:1.44,normal:{x:0,z:1},depth:1.15});
 addWall('TRAVERSE_WALLRUN_A','x',38,3,15,0,7,'purple',false,false);registerTraversal({id:'TRAVERSE_WALLRUN_A',kind:'wallrun',axis:'x',coord:38,min:3,max:15,bottom:.4,top:6.8,normal:{x:-1,z:0}});
 addWall('TRAVERSE_WALLRUN_B','x',32,-3,8,0,7,'blue',false,false);registerTraversal({id:'TRAVERSE_WALLRUN_B',kind:'wallrun',axis:'x',coord:32,min:-3,max:8,bottom:.4,top:6.8,normal:{x:1,z:0}});
 addWall('TRAVERSE_WALLCLIMB','z',-5,29,37,0,5.5,'orange',false,false);registerTraversal({id:'TRAVERSE_WALLCLIMB',kind:'wallclimb',axis:'z',coord:-5,min:29,max:37,bottom:0,top:5.5,normal:{x:0,z:1}});registerTraversal({id:'TRAVERSE_LEDGE',kind:'ledge',axis:'z',coord:-5,min:29.3,max:36.7,bottom:3.2,top:5.5,normal:{x:0,z:1}});
 addNeonEdgedBox('TRAVERSE_TOP',[33,5.15,-9],[9,.7,8],calmMat.blue,{platform:true,solid:true,front:'z+',edgeColor:0xff3fb4,detailColor:0x23e7ff,verticalEdges:false});
 addRail('TRAVERSE_EXIT_RAIL',[new THREE.Vector3(33,6,-9),new THREE.Vector3(33,2,-21)],'green',.17,'city',0);
 devBeam([47,6,-18],[55,6,-18],.17,neonAccentMat(0xffdf35));registerTraversal({id:'TRAVERSE_SWING',kind:'swing',a:{x:47,y:6,z:-18},b:{x:55,y:6,z:-18},radius:1.65});
 addWall('TRAVERSE_CLIMB_WALL','z',-32,44,56,0,9,calmMat.charcoal,false,false);registerTraversal({id:'TRAVERSE_CLIMB_FACE',kind:'mantleable',axis:'z',coord:-32,min:44,max:56,bottom:0,top:9,normal:{x:0,z:1}});
 addNeonEdgedBox('TRAVERSE_CLIMB_TOP',[50,8.7,-35],[13,.7,6],calmMat.gray,{platform:true,solid:true,front:'z+',edgeColor:0x76ff18,detailColor:0xff3fb4,verticalEdges:false});
 addClimbHold('H0',[47,1.6,-31.64],0x23e7ff,['H1','H2']);addClimbHold('H1',[46,3.4,-31.64],0xff3fb4,['H0','H3']);addClimbHold('H2',[49.2,3,-31.64],0x76ff18,['H0','H3','H4']);addClimbHold('H3',[48.1,5.1,-31.64],0xff9d18,['H1','H2','H5']);addClimbHold('H4',[51.2,4.7,-31.64],0x8f6cff,['H2','H5','H6']);addClimbHold('H5',[50,6.8,-31.64],0x23e7ff,['H3','H4','H6']);addClimbHold('H6',[52,8,-31.64],0x76ff18,['H4','H5']);
 districtGate={axis:'z',coord:50,center:0,span:7.2,direction:1,spawn:[0,.2,25],yaw:Math.PI};
 document.getElementById('coinTotal').textContent=String(coins.length);document.getElementById('coinCount').textContent='0';
 document.getElementById('bagTotal').textContent='0';document.getElementById('bagCount').textContent='0';
}
const gateMat=neonAccentMat(KLOOJO_ZONE_ID==='runtimeTest'?C.cyan:C.yellow);
let districtPortalFx=null,districtPortalSummonFx=null,districtPortalReveal=0;
let districtPortalSummoned=KLOOJO_ZONE_ID==='development'&&!!sharedWorldState.zones.development.secrets.districtPortalSummoned;
const DISTRICT_PORTAL_WALL_POS=new THREE.Vector3(-34,3.35,79.56);
const DISTRICT_PORTAL_SUMMON_POS=new THREE.Vector3(-34,.12,72.7);
function createDistrictPortalFx(cx,cy,cz){
 const fx={g:new THREE.Group(),rings:[],sparks:[]};fx.g.position.set(cx,cy,cz);fx.g.scale.set(1.18,.78,1);scene.add(fx.g);
 const halo=new THREE.Mesh(new THREE.RingGeometry(3.45,4.55,40),new THREE.MeshBasicMaterial({color:0x2bf7ff,transparent:true,opacity:.26,side:THREE.DoubleSide,depthWrite:false}));halo.position.z=.045;fx.g.add(halo);fx.halo=halo;
 const disc=new THREE.Mesh(new THREE.CircleGeometry(3.3,40),new THREE.MeshBasicMaterial({color:0x10132b,transparent:true,opacity:.24,side:THREE.DoubleSide,depthWrite:false}));disc.position.z=.02;fx.g.add(disc);fx.disc=disc;
 for(let i=0;i<3;i++){const r=new THREE.Mesh(new THREE.TorusGeometry(2.25+i*.72,.13,10,48),new THREE.MeshBasicMaterial({color:[0xffffff,0xff42ba,0x2bf7ff][i],transparent:true,opacity:.78-i*.13,depthWrite:false}));r.position.z=.08+i*.018;fx.g.add(r);fx.rings.push(r)}
 for(let i=0;i<10;i++){const q=new THREE.Mesh(new THREE.SphereGeometry(.11,8,8),new THREE.MeshBasicMaterial({color:i%3===0?0xffffff:i%2?0xff42ba:0x2bf7ff,transparent:true,opacity:.86,depthWrite:false}));q.position.z=.14;fx.g.add(q);fx.sparks.push({m:q,phase:i/10*Math.PI*2,radius:3.2+(i%2)*.55})}
 fx.g.visible=false;return fx;
}
function createDistrictPortalSummonFx(){
 const fx={g:new THREE.Group()};fx.g.position.copy(DISTRICT_PORTAL_SUMMON_POS);scene.add(fx.g);
 const ring=new THREE.Mesh(new THREE.RingGeometry(2.7,3.55,32),new THREE.MeshBasicMaterial({color:0x2bf7ff,transparent:true,opacity:.38,side:THREE.DoubleSide,depthWrite:false}));ring.rotation.x=-Math.PI/2;fx.g.add(ring);fx.ring=ring;
 const signal=makeGraffitiSignal(5.8);signal.rotation.x=-Math.PI/2;signal.position.y=.035;signal.scale.set(.78,.78,.78);fx.g.add(signal);fx.signal=signal;
 return fx;
}
function applyDistrictPortalState(){
 if(KLOOJO_ZONE_ID!=='development')return;
 if(districtPortalFx)districtPortalFx.g.visible=districtPortalSummoned;
 if(districtPortalSummonFx)districtPortalSummonFx.g.visible=!districtPortalSummoned;
 if(!districtPortalSummoned)districtPortalReveal=0;
}
function summonDistrictPortal(){
 if(KLOOJO_ZONE_ID!=='development'||districtPortalSummoned)return false;
 districtPortalSummoned=true;districtPortalReveal=0;applyDistrictPortalState();
 addScore(300,'DISTRICT GATE');say('DISTRICT GATE SUMMONED');blip(420,.08,.09,'square');setTimeout(()=>blip(690,.10,.08,'triangle'),70);setTimeout(()=>blip(920,.14,.07,'sine'),150);persistRuntimeState();return true;
}
function updateDistrictPortalSummon(dt,now){
 if(KLOOJO_ZONE_ID!=='development')return;
 if(!districtPortalSummoned&&districtPortalSummonFx){
  const d=Math.hypot(player.pos.x-DISTRICT_PORTAL_SUMMON_POS.x,player.pos.z-DISTRICT_PORTAL_SUMMON_POS.z),pulse=.5+.5*Math.sin(now*5.4);
  districtPortalSummonFx.ring.material.opacity=.28+.20*pulse;districtPortalSummonFx.ring.rotation.z=now*.38;districtPortalSummonFx.signal.scale.setScalar(.74+.07*pulse);
  if(player.zone==='city'&&d<4.25&&Math.abs(player.pos.y-DISTRICT_PORTAL_SUMMON_POS.y)<2.8&&player.action)summonDistrictPortal();
 }
}
function updateDistrictPortalFx(now){
 if(!districtPortalFx||KLOOJO_ZONE_ID!=='development')return;
 const fx=districtPortalFx;if(!districtPortalSummoned){fx.g.visible=false;return}fx.g.visible=true;
 districtPortalReveal=Math.min(1,districtPortalReveal+.035);const reveal=districtPortalReveal*districtPortalReveal*(3-2*districtPortalReveal),pulse=.76+Math.sin(now*4.8)*.08,spin=now*1.15;
 fx.g.scale.set(1.18*reveal,.78*reveal,reveal);fx.halo.material.opacity=reveal*(.18+.10*Math.sin(now*3.3));fx.disc.material.opacity=reveal*(.18+.07*Math.sin(now*2.0+1.2));
 fx.rings.forEach((r,i)=>{r.rotation.z=spin*(i%2?1:-1)*(.62+i*.16);const q=1+.055*Math.sin(now*3.1+i);r.scale.setScalar(q);r.material.opacity=reveal*(.48+.22*Math.sin(now*2.7+i*.9))});
 fx.sparks.forEach((q,i)=>{const a=spin*(.72+i*.035)+q.phase,rad=q.radius+.22*Math.sin(now*2.4+i);q.m.position.set(Math.cos(a)*rad,Math.sin(a)*rad*.72,.14+.04*Math.sin(now*4+i));q.m.scale.setScalar((.74+.38*Math.sin(now*4.3+i*.8))*pulse);q.m.material.opacity=reveal*(.38+.34*Math.sin(now*4.7+i))});
}
if(KLOOJO_ZONE_ID==='runtimeTest'){
 if(districtGate.axis==='z'){
  box('DISTRICT_GATE_LEFT',[-7,4,districtGate.coord],[1,8,1],gateMat,{platform:false});box('DISTRICT_GATE_RIGHT',[7,4,districtGate.coord],[1,8,1],gateMat,{platform:false});box('DISTRICT_GATE_TOP',[0,8,districtGate.coord],[15,1,1],gateMat,{platform:false});
 }else{
  box('DISTRICT_GATE_LEFT',[districtGate.coord,4,districtGate.center-7],[1,8,1],gateMat,{platform:false});box('DISTRICT_GATE_RIGHT',[districtGate.coord,4,districtGate.center+7],[1,8,1],gateMat,{platform:false});box('DISTRICT_GATE_TOP',[districtGate.coord,8,districtGate.center],[1,1,15],gateMat,{platform:false});
 }
}else{
 // Correct gap between the two purple buildings, now farther back and wall-attached to the orange north boundary.
 // Before discovery only the floor spray signal is visible. Spraying it summons the rotating save-point gate.
 districtPortalFx=createDistrictPortalFx(DISTRICT_PORTAL_WALL_POS.x,DISTRICT_PORTAL_WALL_POS.y,DISTRICT_PORTAL_WALL_POS.z);
 districtPortalSummonFx=createDistrictPortalSummonFx();applyDistrictPortalState();
}
if(KLOOJO_ZONE_ID==='development'){
 const saved=sharedWorldState.zones.development;
 coins.forEach((coin,index)=>{coin.userData.persistId=coin.userData.rail?`${coin.userData.rail}:${coin.userData.coinIndex}`:`CITY_COIN_${index}`;if(saved.coins.includes(coin.userData.persistId)){coin.userData.collected=true;coin.visible=false;coinsCollected++}});
 runnerBags.forEach((bag,index)=>{bag.userData.persistId=`CITY_RUNNER_BAG_${index}`;if(saved.runnerBags.includes(bag.userData.persistId)){bag.userData.collected=true;bag.visible=false;runnerBagsCollected++}});
 driveByGraffitiSpots.forEach(spot=>{if(saved.graffiti.includes(spot.id)){spot.done=true;ensureDriveByTexture(spot);spot.indicator.visible=false}});
 tagWalls.forEach((tag,index)=>{tag.persistId=tag.tagId||`CITY_TAG_${index}`;if(saved.graffiti.includes(tag.persistId)){tag.done=true;tag.progress=1;tag.face.material.opacity=1;if(tag.indicator)tag.indicator.visible=false}});
 document.getElementById('coinCount').textContent=coinsCollected;document.getElementById('bagCount').textContent=runnerBagsCollected;updateGraffitiCounter();
}else{
 const saved=sharedWorldState.zones.runtimeTest;tagWalls.forEach((tag,index)=>{tag.persistId=tag.tagId||`RUNTIME_TAG_${index}`;if(saved.graffiti.includes(tag.persistId)){tag.done=true;tag.progress=1;tag.face.material.opacity=1;if(tag.indicator)tag.indicator.visible=false}});updateGraffitiCounter();
}

// ---------- CHARACTER RIG v1: articulated chibi inline skater ----------
// Design rule: keep the large readable chibi head and torso, but give the limbs enough length
// and joints to communicate skating. Shoulders -> elbows and hips -> knees -> ankles are separate pivots.
const lookMat={
 top:new THREE.MeshToonMaterial({color:C.pink}), accent:new THREE.MeshToonMaterial({color:C.cyan}), skin:new THREE.MeshToonMaterial({color:C.skin}), hair:new THREE.MeshToonMaterial({color:C.hair}),
 bottom:new THREE.MeshToonMaterial({color:C.blue}), skateBoot:new THREE.MeshToonMaterial({color:C.ink}), skateSole:new THREE.MeshToonMaterial({color:C.yellow}), laces:new THREE.MeshToonMaterial({color:0xffffff}), wheel:new THREE.MeshToonMaterial({color:C.cyan}), pack:new THREE.MeshToonMaterial({color:C.purple}), hat:new THREE.MeshToonMaterial({color:C.yellow}), accessory:new THREE.MeshToonMaterial({color:C.cyan})
};
const jetMetal=new THREE.MeshToonMaterial({color:0x30364c}),jetHot=new THREE.MeshBasicMaterial({color:0xff8b3d}),jetGlowMat=new THREE.MeshBasicMaterial({color:0xffe35a,transparent:true,opacity:.72,depthWrite:false});
const skater=new THREE.Group();scene.add(skater);const rig=new THREE.Group();skater.add(rig);
function part(geo,mat,pos,scale=[1,1,1],rot=[0,0,0],parent=rig){const m=new THREE.Mesh(geo,mat);m.position.set(...pos);m.scale.set(...scale);m.rotation.set(...rot);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m}

// Torso stays compact and toy-like. Limbs are deliberately slimmer and longer than the old version.
const torso=part(new THREE.BoxGeometry(1,1,1),lookMat.top,[0,2.08,0],[1.13,1.08,.68]);
part(new THREE.BoxGeometry(1,1,1),lookMat.accent,[0,1.86,-.365],[1.18,.16,.045]);
part(new THREE.CylinderGeometry(.16,.19,.24,10),lookMat.skin,[0,2.69,0]);
const head=part(new THREE.SphereGeometry(.7,18,14),lookMat.skin,[0,3.25,0],[1,1.04,.92]);
// Dark hair shell fully covers the crown so no skin-colored "cap" peeks through.
const hairCap=part(new THREE.SphereGeometry(.735,16,12),lookMat.hair,[0,3.53,.025],[1.035,.50,.98]);
const hairSpikes=[];for(let i=0;i<7;i++){const a=(i/7)*Math.PI*2;hairSpikes.push(part(new THREE.ConeGeometry(.20,.62,6),lookMat.hair,[Math.cos(a)*.44,3.86,Math.sin(a)*.32],[1,1,1],[.20*Math.cos(a),0,-.42*Math.sin(a)]))}
const eyeMat=new THREE.MeshBasicMaterial({color:0x17162a});for(const x of[-.23,.23])part(new THREE.SphereGeometry(.055,8,6),eyeMat,[x,3.34,-.64],[1,1,.35]);part(new THREE.BoxGeometry(.34,.07,.035),eyeMat,[0,3.08,-.675]);

// Articulated arms: shoulder pivot + elbow pivot + hand.
const leftArm=new THREE.Group(),rightArm=new THREE.Group(),leftForeArm=new THREE.Group(),rightForeArm=new THREE.Group();rig.add(leftArm,rightArm);leftArm.position.set(-.72,2.43,0);rightArm.position.set(.72,2.43,0);
part(new THREE.CapsuleGeometry(.145,.38,4,8),lookMat.top,[0,-.27,0],[1,1,1],[0,0,.10],leftArm);part(new THREE.CapsuleGeometry(.145,.38,4,8),lookMat.top,[0,-.27,0],[1,1,1],[0,0,-.10],rightArm);
leftForeArm.position.set(-.035,-.58,0);rightForeArm.position.set(.035,-.58,0);leftArm.add(leftForeArm);rightArm.add(rightForeArm);
part(new THREE.CapsuleGeometry(.125,.43,4,8),lookMat.skin,[0,-.29,0],undefined,[0,0,.035],leftForeArm);part(new THREE.CapsuleGeometry(.125,.43,4,8),lookMat.skin,[0,-.29,0],undefined,[0,0,-.035],rightForeArm);
part(new THREE.SphereGeometry(.15,10,8),lookMat.skin,[0,-.58,0],[1,.9,.92],[0,0,0],leftForeArm);part(new THREE.SphereGeometry(.15,10,8),lookMat.skin,[0,-.58,0],[1,.9,.92],[0,0,0],rightForeArm);

// Articulated legs: hip pivot + knee pivot + ankle/skate pivot.
const leftLeg=new THREE.Group(),rightLeg=new THREE.Group(),leftShin=new THREE.Group(),rightShin=new THREE.Group();rig.add(leftLeg,rightLeg);leftLeg.position.set(-.35,1.52,0);rightLeg.position.set(.35,1.52,0);
part(new THREE.CapsuleGeometry(.18,.44,4,8),lookMat.bottom,[0,-.31,0],undefined,[0,0,-.015],leftLeg);part(new THREE.CapsuleGeometry(.18,.44,4,8),lookMat.bottom,[0,-.31,0],undefined,[0,0,.015],rightLeg);
leftShin.position.set(0,-.70,0);rightShin.position.set(0,-.70,0);leftLeg.add(leftShin);rightLeg.add(rightShin);
part(new THREE.SphereGeometry(.18,10,8),lookMat.bottom,[0,.015,0],undefined,[0,0,0],leftShin);part(new THREE.SphereGeometry(.18,10,8),lookMat.bottom,[0,.015,0],undefined,[0,0,0],rightShin);
part(new THREE.CapsuleGeometry(.16,.38,4,8),lookMat.bottom,[0,-.29,0],undefined,[0,0,0],leftShin);part(new THREE.CapsuleGeometry(.16,.38,4,8),lookMat.bottom,[0,-.29,0],undefined,[0,0,0],rightShin);

// True inline skates: one wheel line under each foot, not a skateboard and not quad skates.
const skates=[],skateRoots=[],jetGlows=[];
function makeSkate(parent){
 const s=new THREE.Group();parent.add(s);s.position.set(0,-.61,-.08);skateRoots.push(s);
 part(new THREE.BoxGeometry(.66,.31,1.42),lookMat.skateBoot,[0,.36,-.04],[1,1,1],[.03,0,0],s);
 part(new THREE.BoxGeometry(.59,.48,.72),lookMat.skateBoot,[0,.62,.19],[1,1,1],[-.10,0,0],s);
 part(new THREE.BoxGeometry(.70,.12,1.52),lookMat.skateSole,[0,.18,-.03],[1,1,1],[0,0,0],s);
 // Three clear lace bars keep the boot readable at phone scale.
 for(const z of[-.35,-.08,.18])part(new THREE.BoxGeometry(.50,.045,.075),lookMat.laces,[0,.57,z],[1,1,1],[0,0,0],s);
 // Thin central frame and FOUR inline wheels.
 part(new THREE.BoxGeometry(.16,.22,1.30),jetMetal,[0,.04,-.02],[1,1,1],[0,0,0],s);
 for(const z of[-.54,-.18,.18,.54]){const axle=new THREE.Group();axle.position.set(0,-.055,z);axle.rotation.z=Math.PI/2;s.add(axle);const w=part(new THREE.CylinderGeometry(.18,.18,.13,14),lookMat.wheel,[0,0,0],[1,1,1],[0,0,0],axle);skates.push(w)}
 // Heel jet: a small readable nozzle. It glows only while PUSH is active.
 part(new THREE.CylinderGeometry(.17,.20,.20,12),jetMetal,[0,.37,.77],[1,1,1],[Math.PI/2,0,0],s);
 part(new THREE.CylinderGeometry(.10,.12,.205,12),jetHot,[0,.37,.79],[1,1,1],[Math.PI/2,0,0],s);
 const glow=part(new THREE.SphereGeometry(.12,10,8),jetGlowMat,[0,.37,.93],[1,1,1],[0,0,0],s);glow.visible=false;glow.castShadow=false;glow.receiveShadow=false;jetGlows.push(glow);
 return s
}
makeSkate(leftShin);makeSkate(rightShin);
// Compact back module, secondary to the skate jets.
part(new THREE.BoxGeometry(.72,.76,.28),lookMat.pack,[0,2.05,.50],[1,1,1],[0,0,0]);

// Optional wearables. Default is deliberately NO CAP.
const hatGroup=new THREE.Group();rig.add(hatGroup);hatGroup.visible=false;
part(new THREE.CylinderGeometry(.52,.62,.34,12),lookMat.hat,[0,3.89,0],[1,1,1],[0,0,0],hatGroup);
part(new THREE.BoxGeometry(.72,.08,.66),lookMat.hat,[0,3.80,-.48],[1,1,1],[-.08,0,0],hatGroup);
const glassesGroup=new THREE.Group();rig.add(glassesGroup);glassesGroup.visible=false;
for(const x of[-.25,.25])part(new THREE.TorusGeometry(.17,.035,6,12),lookMat.accessory,[x,3.34,-.67],[1,1,.35],[0,0,0],glassesGroup);
part(new THREE.BoxGeometry(.18,.035,.035),lookMat.accessory,[0,3.34,-.69],[1,1,1],[0,0,0],glassesGroup);

const shadow=new THREE.Mesh(new THREE.CircleGeometry(.78,24),new THREE.MeshBasicMaterial({color:0x11162d,transparent:true,opacity:.20,depthWrite:false}));shadow.rotation.x=-Math.PI/2;scene.add(shadow);

const player={pos:new THREE.Vector3(0,.2,25),vel:new THREE.Vector3(),yaw:Math.PI,grounded:false,groundKind:'ground',grind:null,grindT:0,grindDir:1,grindSpeed:0,grindCooldown:0,balance:0,balanceVel:0,balanceDanger:0,balanceSide:0,wallRide:null,mantle:null,vertAir:null,vertPopWindow:0,halfpipeMode:'vert',halfpipeHalf:null,halfpipeGutterHold:0,halfpipeDropCarry:0,halfpipeCrossSign:1,halfpipeRimLock:0,halfpipeRimArmed:true,halfpipeRimHalf:null,halfpipeRimSide:0,halfpipeRimStall:0,halfpipeRimTransition:null,halfpipeRimEscapeCooldown:0,turnHold:false,action:false,slideTurn:null,brakeTurn:null,naturalStop:null,stopPose:null,steerLock:0,lastTurnSign:1,lastSafe:new THREE.Vector3(0,.2,25),score:0,combo:0,comboName:'',airTime:0,airTricks:0,spin:0,spinVel:0,trickTimer:0,trickDuration:.62,trickStyle:0,trickCooldown:0,pumpEnergy:0,lastWall:0,zone:'city',portalCooldown:0,jumpReleaseRequired:false,actionReleaseRequired:false};let cameraYaw=Math.PI,cameraPitch=.16,cameraManualUntil=0,cameraOrbitLock=false;
player.score=sharedWorldState.player.score;
const initialEntry=new URLSearchParams(location.search).get('entry')||sharedWorldState.player.entryGate;
if(KLOOJO_ZONE_ID==='runtimeTest'){player.pos.set(0,.2,25);player.lastSafe.copy(player.pos)}
else if(initialEntry==='runtime_test_return'){player.pos.set(...districtGate.spawn);player.lastSafe.copy(player.pos);player.yaw=districtGate.yaw;cameraYaw=districtGate.yaw}
const input={x:0,y:0,jump:false};let prevJump=false,prevAction=false;
const frameStartPlayerPos=player.pos.clone();
player.handplant=null;
const vertFreedom={half:null,energy:0,rotation:0,airFromHalfpipe:false,pumping:false,settled:false,lastAction:false,lastTier:0,jumpBuffer:0,jumpIntent:false,jumpSide:0,turnSuppressed:false,savedTurnHold:false,popStage:0,lastPopSide:0,lastPopAt:0,popHalf:null};
const VERT_POP_HEIGHT_FRACTIONS=[.20,.40,.80,1.00];
function resetVertPopProgression(){vertFreedom.popStage=0;vertFreedom.lastPopSide=0;vertFreedom.lastPopAt=0;vertFreedom.popHalf=null;vertFreedom.jumpSide=0}
function hardeningWish(){const camF=new THREE.Vector3(Math.sin(cameraYaw),0,Math.cos(cameraYaw)),camR=new THREE.Vector3(-Math.cos(cameraYaw),0,Math.sin(cameraYaw));return camF.multiplyScalar(-input.y).add(camR.multiplyScalar(input.x))}
function startHandplant(surface){if(!surface||surface.kind!=='halfpipe'||!player.grounded||Math.abs(surface.u)<.88||player.handplant)return false;const h=surface.half,ax=halfpipeAxes(h),side=Math.sign(surface.u)||1,local=new THREE.Vector3(player.pos.x-h.cx,0,player.pos.z-h.cz),alongOffset=local.dot(ax.along),u=side*.972;player.handplant={half:h,side,alongOffset,time:0,duration:.82,releaseEnergy:Math.max(6.8,vertFreedom.energy*.82)};player.pos.x=h.cx+ax.along.x*alongOffset+ax.cross.x*u*(h.width*.5);player.pos.z=h.cz+ax.along.z*alongOffset+ax.cross.z*u*(h.width*.5);player.pos.y=-h.depth+h.depth*u*u;player.vel.set(0,0,0);player.grounded=false;player.vertAir=null;player.trickTimer=0;player.comboName='HANDPLANT';addScore(320,'HANDPLANT');say('HANDPLANT · HOLD THE COPING');return true}
function updateHandplant(dt){const hp=player.handplant;if(!hp)return false;hp.time+=dt;const h=hp.half,ax=halfpipeAxes(h),u=hp.side*.972;player.pos.x=h.cx+ax.along.x*hp.alongOffset+ax.cross.x*u*(h.width*.5);player.pos.z=h.cz+ax.along.z*hp.alongOffset+ax.cross.z*u*(h.width*.5);player.pos.y=-h.depth+h.depth*u*u;player.vel.set(0,0,0);player.grounded=false;player.groundKind='halfpipe';prevAction=!!player.action;const release=hp.time>=hp.duration||(!player.action&&hp.time>.28);if(release){const safeU=hp.side*.84;player.pos.x=h.cx+ax.along.x*hp.alongOffset+ax.cross.x*safeU*(h.width*.5);player.pos.z=h.cz+ax.along.z*hp.alongOffset+ax.cross.z*safeU*(h.width*.5);player.pos.y=-h.depth+h.depth*safeU*safeU;player.vel.copy(ax.cross).multiplyScalar(-hp.side*hp.releaseEnergy);player.handplant=null;player.grounded=true;player.halfpipeHalf=h;player.halfpipeMode='vert';player.halfpipeRimArmed=false;player.halfpipeRimEscapeCooldown=.38;player.actionReleaseRequired=!!player.action;vertFreedom.energy=Math.max(vertFreedom.energy,hp.releaseEnergy);player.comboName='HANDPLANT RELEASE'}return true}
function hardenHalfpipeBefore(dt){
 const actionPressed=player.action&&!vertFreedom.lastAction;vertFreedom.lastAction=!!player.action;
 vertFreedom.jumpBuffer=Math.max(0,(vertFreedom.jumpBuffer||0)-dt);
 const freshJump=input.jump&&!prevJump&&!player.jumpReleaseRequired;
 // SIMPLE HALFPIPE RULE: no Shift/TURN. A JUMP request near the upper wall is remembered long enough
 // to survive mobile timing and BOTH sides of BOTH halfpipes. Reaching the coping with that intent = vertical pop.
 // In a halfpipe, JUMP is a coping/vert command, not an ordinary cross-bowl bunny hop.
 // Arm the intent on the current wall and suppress the canonical ground jump while the request is buffered.
 if(freshJump){vertFreedom.jumpBuffer=.95;const js=surfaceAt(player.pos.x,player.pos.y+1,player.pos.z);if(player.grounded&&js?.kind==='halfpipe')vertFreedom.jumpSide=Math.sign(js.rawU??js.u)||Math.sign(player.vel.dot(halfpipeAxes(js.half).cross))||1;}
 if(input.jump&&!player.jumpReleaseRequired)vertFreedom.jumpBuffer=Math.max(vertFreedom.jumpBuffer,.26);
 vertFreedom.jumpIntent=vertFreedom.jumpBuffer>0||input.jump&&!player.jumpReleaseRequired;
 if(player.handplant)return updateHandplant(dt);
 let surf=surfaceAt(player.pos.x,player.pos.y+1,player.pos.z);
 // At the exact coping surfaceAt() can flip to flat ground for one frame. Recover the recent halfpipe
 // geometrically so the turquoise/purple sides obey the same JUMP rule instead of becoming timing-sensitive.
 if((!surf||surf.kind!=='halfpipe')&&player.grounded){
   const h=player.halfpipeHalf||vertFreedom.half;
   if(h){const ax=halfpipeAxes(h),local=new THREE.Vector3(player.pos.x-h.cx,0,player.pos.z-h.cz),alongOffset=local.dot(ax.along),rawU=local.dot(ax.cross)/(h.width*.5);if(Math.abs(alongOffset)<=h.length*.5+1.2&&Math.abs(rawU)>=.64&&Math.abs(rawU)<=1.10){const u=THREE.MathUtils.clamp(rawU,-1,1);surf={kind:'halfpipe',half:h,u,rawU,y:-h.depth+h.depth*u*u,syntheticRim:true}}}
 }
 if(actionPressed&&startHandplant(surf))return true;
 if(!player.grounded||!surf||surf.kind!=='halfpipe')return false;
 const ax=halfpipeAxes(surf.half),wish=hardeningWish(),inputCross=wish.dot(ax.cross),inputAlong=wish.dot(ax.along),cross=player.vel.dot(ax.cross),side=Math.sign(surf.rawU??surf.u)||1,outward=side*cross,rimU=Math.abs(surf.rawU??surf.u);
 if(vertFreedom.half!==surf.half){vertFreedom.half=surf.half;vertFreedom.energy=Math.max(3.5,Math.abs(cross));vertFreedom.settled=false;if(vertFreedom.popHalf&&vertFreedom.popHalf!==surf.half)resetVertPopProgression()}
 const nowMs=performance.now();if(vertFreedom.lastPopAt&&nowMs-vertFreedom.lastPopAt>9000)resetVertPopProgression();
 // TURN/Shift is NOT a pump button. Keep it out of the frozen halfpipe step while wheels are on the bowl.
 if(!vertFreedom.turnSuppressed){vertFreedom.savedTurnHold=!!player.turnHold;vertFreedom.turnSuppressed=true;player.turnHold=false}
 // Exact control rule: reach the lip with JUMP intent -> vertical pop. Reach it without JUMP -> roll out.
 const atLip=rimU>.90,notClearlyDescending=outward>-.85,sameJumpSide=!vertFreedom.jumpSide||vertFreedom.jumpSide===side;
 if(vertFreedom.jumpIntent&&atLip&&notClearlyDescending&&sameJumpSide){
   const alongOffset=new THREE.Vector3(player.pos.x-surf.half.cx,0,player.pos.z-surf.half.cz).dot(ax.along),lipU=side*.994;
   player.pos.x=surf.half.cx+ax.along.x*alongOffset+ax.cross.x*lipU*(surf.half.width*.5);
   player.pos.z=surf.half.cz+ax.along.z*alongOffset+ax.cross.z*lipU*(surf.half.width*.5);
   player.pos.y=-surf.half.depth+surf.half.depth*(lipU*lipU);
   const stage=Math.max(0,Math.min(3,vertFreedom.popStage|0)),heightFraction=VERT_POP_HEIGHT_FRACTIONS[stage];
   const incoming=Math.max(0,outward,Math.abs(cross)*.42,vertFreedom.energy*.52),maxLaunch=THREE.MathUtils.clamp(18.5+incoming*.58+Math.min(4.4,vertFreedom.energy*.16),20.0,31.0);
   // Ballistic height scales with velocity squared, so sqrt() produces approximately 20/40/80/100% height.
   const launch=Math.max(8.8,maxLaunch*Math.sqrt(heightFraction));
   player.vel.copy(ax.along).multiplyScalar(THREE.MathUtils.clamp(player.vel.dot(ax.along),-1.1,1.1)*.10);player.vel.y=launch;
   player.grounded=false;player.vertAir={half:surf.half,side,energy:Math.max(Math.abs(cross),vertFreedom.energy),popStage:stage,heightFraction};player.vertPopWindow=0;player.airTime=.01;player.airTricks=0;player.combo++;player.comboName='VERT POP';
   player.halfpipeRimArmed=false;player.halfpipeRimEscapeCooldown=.24;player.jumpReleaseRequired=!!input.jump;prevJump=!!input.jump;vertFreedom.jumpBuffer=0;vertFreedom.jumpIntent=false;vertFreedom.jumpSide=0;vertFreedom.airFromHalfpipe=true;
   if(!vertFreedom.lastPopSide||vertFreedom.lastPopSide!==side)vertFreedom.popStage=Math.min(3,stage+1);vertFreedom.lastPopSide=side;vertFreedom.lastPopAt=nowMs;vertFreedom.popHalf=surf.half;
   player.pumpEnergy*=.72;addScore(260+stage*80,'VERT POP');say(`VERT POP · ${Math.round(heightFraction*100)}% LINE`);blip(700+stage*70,.10,.085,'square');return true;
 }
 if(!vertFreedom.jumpIntent&&rimU>.91&&outward>.15){
   const u=side*1.065,local=new THREE.Vector3(player.pos.x-surf.half.cx,0,player.pos.z-surf.half.cz),alongOffset=local.dot(ax.along),outSpeed=THREE.MathUtils.clamp(Math.max(2.8,Math.abs(cross)),2.8,13.0),along=THREE.MathUtils.clamp(player.vel.dot(ax.along),-5,5);
   player.pos.x=surf.half.cx+ax.along.x*alongOffset+ax.cross.x*u*(surf.half.width*.5);
   player.pos.z=surf.half.cz+ax.along.z*alongOffset+ax.cross.z*u*(surf.half.width*.5);player.pos.y=.02;
   player.vel.copy(ax.cross).multiplyScalar(side*outSpeed).add(ax.along.clone().multiplyScalar(along*.45));
   player.grounded=true;player.groundKind='ground';player.halfpipeHalf=null;player.halfpipeMode='gutter';player.vertAir=null;player.halfpipeRimArmed=false;player.halfpipeRimEscapeCooldown=.28;vertFreedom.half=null;vertFreedom.settled=true;resetVertPopProgression();player.comboName='COPING EXIT';return true;
 }
 if(rimU>.66)player.halfpipeRimArmed=false;
 // Critical R7 rule: while a halfpipe JUMP is armed, do not let updatePlayer interpret the same
 // press as a normal grounded jump that carries cross-bowl velocity to the opposite wall.
 // Mark it consumed for the frozen canonical jump edge while still allowing normal skating physics to run.
 if(vertFreedom.jumpIntent&&player.grounded&&surf?.kind==='halfpipe')prevJump=!!input.jump||prevJump;
 return false
}
function hardenHalfpipeAfter(dt,wasGrounded){
 // Restore the physical TURN button immediately after the frozen canonical movement step.
 if(vertFreedom.turnSuppressed){player.turnHold=vertFreedom.savedTurnHold;vertFreedom.turnSuppressed=false}
 const surf=surfaceAt(player.pos.x,player.pos.y+1,player.pos.z),wish=hardeningWish();
 if(player.handplant)return;
 if(player.grounded&&surf.kind==='halfpipe'){
   const ax=halfpipeAxes(surf.half),inputCross=wish.dot(ax.cross),inputAlong=wish.dot(ax.along);
   let cross=player.vel.dot(ax.cross),along=player.vel.dot(ax.along);
   if(vertFreedom.half!==surf.half){vertFreedom.half=surf.half;vertFreedom.energy=Math.max(3.5,Math.abs(cross))}
   // Physical bowl pass: the frozen canonical function already supplies part of the slope force.
   // Add the missing gravity feel instead of clamping downhill speed back to an abstract energy meter.
   if(player.halfpipeMode==='vert')cross+=halfpipeSlopeAssist(surf.u,dt);
   const pumpDelta=halfpipeDirectionalPumpDelta({inputCross,cross,u:surf.u,energy:vertFreedom.energy,dt});
   const pumping=Math.abs(pumpDelta)>1e-8;
   vertFreedom.pumping=pumping;
   if(pumping){cross+=pumpDelta;player.pumpEnergy=Math.min(10,player.pumpEnergy+4.8*dt);player.comboName='PUMP'}
   // Passive riding slowly loses total amplitude. Active directional pumping loses less and adds energy,
   // so repeated well-timed passes converge on a bounded high line rather than perpetual acceleration.
   cross*=Math.exp(-(pumping?.055:.145)*dt);
   cross=THREE.MathUtils.clamp(cross,-29.5,29.5);
   const envelopeDecay=Math.exp(-(pumping?.045:.18)*dt);
   vertFreedom.energy=Math.min(29.5,Math.max(Math.abs(cross),vertFreedom.energy*envelopeDecay));
   if(shouldHalfpipeLongitudinalExit({u:surf.u,cross,inputAlong})){
     player.halfpipeMode='gutter';cross*=Math.exp(-5.5*dt);along+=inputAlong*9.2*dt;vertFreedom.energy=Math.min(vertFreedom.energy,Math.abs(cross)+2.2)
   }
   if(shouldHalfpipeNeutral({u:surf.u,cross,energy:vertFreedom.energy})){
     player.halfpipeMode='gutter';cross*=Math.exp(-7.5*dt);if(Math.abs(cross)<.12)cross=0;along+=inputAlong*8.4*dt;vertFreedom.settled=Math.abs(cross)<.25;player.vertAir=null;player.trickTimer=0;player.spinVel=0;vertFreedom.energy=Math.min(vertFreedom.energy,Math.abs(cross)+1.0)
   }else vertFreedom.settled=false;
   player.vel.copy(ax.cross.clone().multiplyScalar(cross)).add(ax.along.clone().multiplyScalar(along));
   if(!wasGrounded&&vertFreedom.airFromHalfpipe){
     const tier=halfpipeRotationTier(vertFreedom.rotation);vertFreedom.lastTier=tier;if(tier){addScore(tier*2,`${tier} SPIN`);player.comboName=`${tier} SPIN`;say(`${tier} SPIN · LANDED`)}vertFreedom.rotation=0;vertFreedom.airFromHalfpipe=false;player.handplant=null
   }
 }else if(!player.grounded){
   if(player.vertAir||vertFreedom.airFromHalfpipe){vertFreedom.airFromHalfpipe=true;vertFreedom.rotation+=Math.abs(player.spinVel)*dt;vertFreedom.energy=decayHalfpipeEnergy(vertFreedom.energy,dt,false)}
 }else{
   if(vertFreedom.half||vertFreedom.popHalf)resetVertPopProgression();vertFreedom.half=null;vertFreedom.energy=0;vertFreedom.pumping=false;vertFreedom.settled=false;
   if(!wasGrounded&&vertFreedom.airFromHalfpipe){const tier=halfpipeRotationTier(vertFreedom.rotation);vertFreedom.lastTier=tier;if(tier){addScore(tier*2,`${tier} SPIN`);player.comboName=`${tier} SPIN`;say(`${tier} SPIN · LANDED`)}vertFreedom.rotation=0;vertFreedom.airFromHalfpipe=false}
   player.handplant=null
 }
}
function applyHardeningPose(){if(player.handplant){const q=Math.sin(Math.PI*Math.min(1,player.handplant.time/player.handplant.duration));rig.rotation.z=player.handplant.side*1.28;rig.rotation.x=-.42;rig.position.y=.18*q;leftArm.rotation.set(-2.35,0,player.handplant.side*.35);rightArm.rotation.set(-1.75,0,-player.handplant.side*.55);leftForeArm.rotation.x=-.9;rightForeArm.rotation.x=-.55;leftLeg.rotation.x=.72;rightLeg.rotation.x=.60;leftShin.rotation.x=-1.0;rightShin.rotation.x=-.92}}

player.traversal=null;player.coil=false;
const traversalRuntime={transferWindow:0,lastWall:null,events:[],lastImpact:0,recoveryTimed:false};
function traversalEvent(name){traversalRuntime.events.push(name);if(traversalRuntime.events.length>32)traversalRuntime.events.shift();player.comboName=name.replaceAll('_',' ');say(player.comboName)}
function traversalFacing(){const h=Math.hypot(player.vel.x,player.vel.z);return h>.25?new THREE.Vector3(player.vel.x/h,0,player.vel.z/h):new THREE.Vector3(Math.sin(player.yaw),0,Math.cos(player.yaw))}
function traversalNormal(s){return new THREE.Vector3(s.normal?.x||0,0,s.normal?.z||0).normalize()}
function traversalTangent(s,velocity=player.vel){const n=traversalNormal(s),a=new THREE.Vector3(n.z,0,-n.x),b=a.clone().negate();return a.dot(velocity)>=b.dot(velocity)?a:b}
function setAtTraversalPlane(s,normalOffset=.78){const n=traversalNormal(s);if(s.axis==='x')player.pos.x=s.coord+n.x*normalOffset;else player.pos.z=s.coord+n.z*normalOffset}
function beginVault(s){const facing=traversalFacing(),speed=Math.max(8,Math.hypot(player.vel.x,player.vel.z)*.9),start=player.pos.clone(),end=start.clone().addScaledVector(facing,(s.depth||1)+3.4);player.traversal={kind:'vault',surface:s,time:0,duration:.54,start,end,height:Math.max(1.15,s.top-start.y+1.0),facing,speed};player.grounded=false;player.vel.set(0,0,0);prevJump=true;player.jumpReleaseRequired=true;traversalEvent('VAULT');return true}
function tryBeginVault(jumpPressed){if(!jumpPressed||!player.grounded)return false;const facing=traversalFacing();for(const s of traversalSurfaces){if(s.kind!=='vaultable')continue;const along=s.axis==='x'?player.pos.z:player.pos.x,dist=(s.axis==='x'?s.coord-player.pos.x:s.coord-player.pos.z),toward=-facing.dot(traversalNormal(s));if(along>=s.min-1&&along<=s.max+1&&Math.abs(dist)<2.4&&toward>.45)return beginVault(s)}return false}
function beginWallrun(s){const tangent=traversalTangent(s),speed=Math.max(8,Math.hypot(player.vel.x,player.vel.z)*.92);player.traversal={kind:'wallrun',surface:s,time:0,duration:1.25,tangent,speed,vertical:Math.max(1.7,player.vel.y*.32)};setAtTraversalPlane(s,.72);player.vel.copy(tangent).multiplyScalar(speed);player.grounded=false;player.wallRide=null;traversalRuntime.lastWall=s.id;traversalRuntime.transferWindow=0;traversalEvent(traversalRuntime.events.includes('WALLRUN')?'DOUBLE_WALLRUN':'WALLRUN');return true}
function beginWallclimb(s){player.traversal={kind:'wallclimb',surface:s,time:0,duration:.92,startY:player.pos.y,vertical:Math.max(7.2,Math.min(10.2,Math.hypot(player.vel.x,player.vel.z)*.62+player.vel.y*.25))};setAtTraversalPlane(s,.74);player.vel.set(0,0,0);player.grounded=false;traversalEvent('WALLCLIMB');return true}
function beginLedgeGrab(s){const n=traversalNormal(s),along=s.axis==='x'?THREE.MathUtils.clamp(player.pos.z,s.min+.45,s.max-.45):THREE.MathUtils.clamp(player.pos.x,s.min+.45,s.max-.45);if(s.axis==='x'){player.pos.x=s.coord+n.x*.76;player.pos.z=along}else{player.pos.z=s.coord+n.z*.76;player.pos.x=along}player.pos.y=s.top-2.15;player.vel.set(0,0,0);player.grounded=false;player.traversal={kind:'ledge',surface:s,time:0,along};prevJump=!!input.jump;traversalEvent('LEDGE_GRAB');return true}
function nearestSwing(){let best=null,bd=1.7;for(const s of traversalSurfaces){if(s.kind!=='swing')continue;const ax=s.a.x,ay=s.a.y,az=s.a.z,bx=s.b.x,by=s.b.y,bz=s.b.z,dx=bx-ax,dy=by-ay,dz=bz-az,l=dx*dx+dy*dy+dz*dz,t=l?THREE.MathUtils.clamp(((player.pos.x-ax)*dx+(player.pos.y-ay)*dy+(player.pos.z-az)*dz)/l,0,1):0,p=new THREE.Vector3(ax+dx*t,ay+dy*t,az+dz*t),d=player.pos.distanceTo(p);if(d<bd){bd=d;best={surface:s,anchor:p}}}return best}
function beginSwing(found){const rel=player.pos.clone().sub(found.anchor),length=THREE.MathUtils.clamp(rel.length(),2.2,3.2),angle=Math.atan2(rel.z,-rel.y);player.traversal={kind:'swing',surface:found.surface,time:0,anchor:found.anchor,length,angle,angular:THREE.MathUtils.clamp(player.vel.z/length,-3.5,3.5),jumpLatched:!!input.jump};player.vel.set(0,0,0);player.grounded=false;traversalEvent('SWING_GRAB');return true}
function beginHold(hold){player.pos.set(hold.position.x,hold.position.y-1.2,hold.position.z+.72);player.vel.set(0,0,0);player.grounded=false;player.traversal={kind:'hold',hold,time:0,moveCooldown:.18,jumpLatched:!!input.jump};traversalEvent('CLIMB_HOLD');return true}
function releaseTraversal(velocity,label){player.traversal=null;player.vel.copy(velocity);player.grounded=false;player.jumpReleaseRequired=!!input.jump;prevJump=!!input.jump;if(label)traversalEvent(label)}
function startPullup(s){const n=traversalNormal(s),start=player.pos.clone(),end=player.pos.clone().addScaledVector(n,-1.75);end.y=s.top+.12;player.traversal={kind:'pullup',surface:s,time:0,duration:.58,start,end};prevJump=true;player.jumpReleaseRequired=true;traversalEvent('PULL_UP')}
function updateTraversalState(dt){const st=player.traversal;if(!st)return false;st.time+=dt;const jumpPressed=input.jump&&!prevJump&&!player.jumpReleaseRequired;prevJump=!!input.jump;
 if(st.kind==='vault'){const p=vaultArc(st.start,st.end,st.height,st.time/st.duration);player.pos.set(p.x,p.y,p.z);player.yaw=Math.atan2(st.facing.x,st.facing.z);if(st.time>=st.duration)releaseTraversal(st.facing.clone().multiplyScalar(st.speed).add(new THREE.Vector3(0,-.4,0)),'VAULT_EXIT');return true}
 if(st.kind==='wallrun'){st.vertical-=6.8*dt;st.speed=Math.max(6.2,st.speed-1.8*dt);player.pos.addScaledVector(st.tangent,st.speed*dt);player.pos.y+=st.vertical*dt;setAtTraversalPlane(st.surface,.72);player.vel.copy(st.tangent).multiplyScalar(st.speed);player.vel.y=st.vertical;player.yaw=Math.atan2(st.tangent.x,st.tangent.z);if((player.turnHold&&Math.hypot(input.x,input.y)>.22)||jumpPressed){const v=transferVelocity(player.vel,st.surface.normal,st.tangent.dot(new THREE.Vector3(st.surface.normal.z,0,-st.surface.normal.x))>=0?1:-1);releaseTraversal(new THREE.Vector3(v.x,v.y,v.z),'WALL_TRANSFER');traversalRuntime.transferWindow=.72}else if(st.time>=st.duration||player.pos.y<.4)releaseTraversal(player.vel.clone(),'WALLRUN_EXIT');return true}
 if(st.kind==='wallclimb'){st.vertical-=9.2*dt;player.pos.y+=Math.max(1.8,st.vertical)*dt;setAtTraversalPlane(st.surface,.74);if(player.turnHold&&Math.hypot(input.x,input.y)>.22){const v=transferVelocity({x:0,y:st.vertical,z:0},st.surface.normal,Math.sign(input.x)||1);releaseTraversal(new THREE.Vector3(v.x,v.y,v.z),'WALL_TRANSFER');traversalRuntime.transferWindow=.72}else if(player.pos.y>=st.surface.top-1.5){const ledge=traversalSurfaces.find(s=>s.kind==='ledge'&&s.axis===st.surface.axis&&s.coord===st.surface.coord);if(ledge)beginLedgeGrab(ledge);else releaseTraversal(traversalNormal(st.surface).multiplyScalar(3).setY(2),'WALLCLIMB_EXIT')}else if(st.time>=st.duration)releaseTraversal(traversalNormal(st.surface).multiplyScalar(2).setY(-1),'WALLCLIMB_FALL');return true}
 if(st.kind==='ledge'){const s=st.surface,n=traversalNormal(s),wish=hardeningWish(),alongAxis=s.axis==='x'?new THREE.Vector3(0,0,1):new THREE.Vector3(1,0,0),shimmy=wish.dot(alongAxis);st.along=THREE.MathUtils.clamp(st.along+shimmy*2.7*dt,s.min+.4,s.max-.4);if(s.axis==='x'){player.pos.x=s.coord+n.x*.76;player.pos.z=st.along}else{player.pos.z=s.coord+n.z*.76;player.pos.x=st.along}player.pos.y=s.top-2.15;if(input.y>.58){releaseTraversal(n.clone().multiplyScalar(1.4).setY(-1.5),'LEDGE_DROP')}else if(jumpPressed||input.y<-.62)startPullup(s);return true}
 if(st.kind==='pullup'){const p=vaultArc(st.start,st.end,.7,st.time/st.duration);player.pos.set(p.x,p.y,p.z);if(st.time>=st.duration){const n=traversalNormal(st.surface);player.traversal=null;player.grounded=true;player.groundKind='platform';player.vel.copy(n).multiplyScalar(-7.8);player.jumpReleaseRequired=!!input.jump;traversalEvent('PULL_UP_EXIT')}return true}
 if(st.kind==='swing'){st.angular+=(-9.81/st.length*Math.sin(st.angle)-.32*st.angular)*dt;st.angle+=st.angular*dt;player.pos.copy(st.anchor).add(new THREE.Vector3(0,-Math.cos(st.angle)*st.length,Math.sin(st.angle)*st.length));if(!input.jump)st.jumpLatched=false;if((input.jump&&!st.jumpLatched)||st.time>2.5){const v=new THREE.Vector3(0,Math.sin(st.angle)*st.angular*st.length,Math.cos(st.angle)*st.angular*st.length);releaseTraversal(v,'SWING_RELEASE')}return true}
 if(st.kind==='hold'){const h=st.hold;st.moveCooldown=Math.max(0,st.moveCooldown-dt);player.pos.set(h.position.x,h.position.y-1.2,h.position.z+.72);if(!input.jump)st.jumpLatched=false;if(input.y>.62){releaseTraversal(new THREE.Vector3(0,-1.5,1.2),'CLIMB_DROP');return true}const wish=hardeningWish(),dir={x:wish.x,y:-input.y,z:wish.z};if((input.jump&&!st.jumpLatched||Math.hypot(input.x,input.y)>.58)&&st.moveCooldown<=0){const next=chooseClimbNeighbor(h,climbHolds,dir);if(next){st.hold=next;st.moveCooldown=.22;st.jumpLatched=!!input.jump;traversalEvent('CLIMB_REACH')}else if(input.y<-.5&&h.position.y>7){const face=traversalSurfaces.find(s=>s.id==='TRAVERSE_CLIMB_FACE');startPullup({...face,kind:'ledge'});traversalEvent('CLIMB_TOP')}}return true}
 if(st.kind==='recovery'){const k=1-Math.exp(-5.2*dt);player.pos.addScaledVector(st.direction,st.speed*dt);st.speed=THREE.MathUtils.lerp(st.speed,Math.max(2,st.endSpeed),k);player.vel.copy(st.direction).multiplyScalar(st.speed);player.grounded=true;if(st.time>=st.duration){player.traversal=null;traversalEvent('SKATE_RECOVERY_EXIT')}return true}
 return false}
function tryTraversalAttach(){const facing=traversalFacing();for(const s of traversalSurfaces){if(s.kind==='wallrun'&&s.id!==traversalRuntime.lastWall&&suitableWallApproach(s,player.pos,player.vel,{minSpeed:6.5})&&(traversalRuntime.transferWindow>0||input.jump))return beginWallrun(s)}for(const s of traversalSurfaces){if(s.kind==='wallclimb'&&input.jump&&suitableWallApproach(s,player.pos,player.vel,{minSpeed:5.5,minNormalSpeed:2}))return beginWallclimb(s)}for(const s of traversalSurfaces){if(s.kind==='ledge'&&player.vel.y<=2&&canReachLedge(s,player.pos,facing,{vertical:2.35+(player.coil?.2:0)}))return beginLedgeGrab(s)}if(input.jump){const swing=nearestSwing();if(swing)return beginSwing(swing);let best=null,bd=1.45;for(const h of climbHolds){const d=Math.hypot(player.pos.x-h.position.x,player.pos.y-h.position.y,player.pos.z-h.position.z);if(d<bd){bd=d;best=h}}if(best)return beginHold(best)}return false}
function hardenTraversalBefore(dt){if(KLOOJO_ZONE_ID!=='runtimeTest')return false;traversalRuntime.transferWindow=Math.max(0,traversalRuntime.transferWindow-dt);if(player.traversal)return updateTraversalState(dt);const jumpPressed=input.jump&&!prevJump&&!player.jumpReleaseRequired;if(tryBeginVault(jumpPressed))return true;if(!player.grounded&&tryTraversalAttach())return true;return false}
function hardenTraversalAfter(dt,wasGrounded,preVertical){if(KLOOJO_ZONE_ID!=='runtimeTest')return;player.coil=!player.grounded&&!player.traversal&&input.y>.58;if(!wasGrounded&&player.grounded&&preVertical<-10&&!player.traversal){const speed=Math.hypot(player.vel.x,player.vel.z),timed=input.y>.48,direction=traversalFacing(),endSpeed=recoveredHorizontalSpeed(speed,timed);traversalRuntime.lastImpact=-preVertical;traversalRuntime.recoveryTimed=timed;player.traversal={kind:'recovery',time:0,duration:timed?.48:.7,direction,speed,endSpeed};traversalEvent(timed?'SKATE_RECOVERY':'HARD_LANDING');}}
function applyTraversalPose(){const st=player.traversal;if(player.coil){rig.rotation.x=.5;leftLeg.rotation.x=.95;rightLeg.rotation.x=.92;leftShin.rotation.x=-1.25;rightShin.rotation.x=-1.2}if(!st)return;if(st.kind==='vault'){rig.rotation.x=-.36;leftArm.rotation.x=-1.2;rightArm.rotation.x=-1.0;leftLeg.rotation.x=.85;rightLeg.rotation.x=-.15}else if(st.kind==='wallrun'){rig.rotation.z=st.surface.normal.x*.34+st.surface.normal.z*.18;leftArm.rotation.z=.95;rightArm.rotation.z=-.8}else if(st.kind==='wallclimb'||st.kind==='ledge'||st.kind==='hold'){leftArm.rotation.x=-2.45;rightArm.rotation.x=-2.25;leftForeArm.rotation.x=-.65;rightForeArm.rotation.x=-.5;leftLeg.rotation.x=.45;rightLeg.rotation.x=-.25}else if(st.kind==='pullup'){rig.rotation.x=-.55;leftArm.rotation.x=-2.2;rightArm.rotation.x=-2.0}else if(st.kind==='swing'){leftArm.rotation.x=-2.75;rightArm.rotation.x=-2.75;leftForeArm.rotation.x=-.25;rightForeArm.rotation.x=-.25}else if(st.kind==='recovery'){rig.rotation.x=.72;rig.rotation.z=.18;leftLeg.rotation.x=1.05;rightLeg.rotation.x=.72;leftShin.rotation.x=-1.2;rightShin.rotation.x=-1.05}}

const PLAYER_RADIUS=.78,PLAYER_HEAD=4.02,PLATFORM_EDGE_PAD=.12,MAX_STEP_UP=.34;
const rampCollisionShells=ramps.map(rampShellDescriptor);
function rampLocalPoint(r,p){const dx=p.x-r.cx,dz=p.z-r.cz,c=Math.cos(-r.rot),s=Math.sin(-r.rot);return{x:dx*c-dz*s,z:dx*s+dz*c}}
function setRampLocalPosition(r,lx,lz){const c=Math.cos(r.rot),s=Math.sin(r.rot);player.pos.x=r.cx+lx*c-lz*s;player.pos.z=r.cz+lx*s+lz*c}
function resolveRampShell(oldPos){
 for(const r of ramps){const now=rampLocalPoint(r,player.pos),old=rampLocalPoint(r,oldPos),xLimit=r.w/2+PLAYER_RADIUS,zLow=-r.l/2-PLAYER_RADIUS,zHigh=r.l/2+PLAYER_RADIUS;if(Math.abs(now.x)>xLimit||now.z<zLow||now.z>zHigh||player.pos.y+PLAYER_HEAD<-.2)continue;const t=THREE.MathUtils.clamp((now.z+r.l/2)/r.l,0,1),top=.1+t*r.h;if(player.pos.y>=top-.14)continue;if(top-player.pos.y<=MAX_STEP_UP+.08){player.pos.y=top;player.vel.y=Math.max(0,player.vel.y);player.grounded=true;player.groundKind='ramp';continue}const sidePen=xLimit-Math.abs(now.x),highPen=zHigh-now.z,oldOutsideSide=Math.abs(old.x)>=xLimit-.05,oldOutsideHigh=old.z>=zHigh-.05;if(oldOutsideHigh||(!oldOutsideSide&&highPen<=sidePen)){now.z=zHigh;setRampLocalPosition(r,now.x,now.z);const normal=new THREE.Vector3(0,0,1).applyAxisAngle(new THREE.Vector3(0,1,0),r.rot),vn=player.vel.dot(normal);if(vn<0)player.vel.addScaledVector(normal,-vn)}else{now.x=(now.x<0?-1:1)*xLimit;setRampLocalPosition(r,now.x,now.z);const normal=new THREE.Vector3(now.x<0?-1:1,0,0).applyAxisAngle(new THREE.Vector3(0,1,0),r.rot),vn=player.vel.dot(normal);if(vn<0)player.vel.addScaledVector(normal,-vn)}}
}
function platformFloor(x,y,z){let best=-999,hit=null;for(const p of platforms){if((player.zone==='bonus')!==(p.zone==='bonus'))continue;const q=p.mesh.position,h=p.half;if(Math.abs(x-q.x)<=h.x+PLATFORM_EDGE_PAD&&Math.abs(z-q.z)<=h.z+PLATFORM_EDGE_PAD){const top=q.y+h.y;
  // A platform may be below the feet (landing) or only a small curb-height step above them.
  // Never treat a roof several metres overhead as the player's floor.
  if(top<=y+MAX_STEP_UP&&top>best){best=top;hit={y:top,normal:new THREE.Vector3(0,1,0),kind:'platform',platform:p}}}}return hit}
function inVoid(x,z){return voidZones.some(v=>x>v.minX&&x<v.maxX&&z>v.minZ&&z<v.maxZ)}
function terrainSurfaceAt(x,y,z){let best=null;if(player.zone==='city'){
  let insidePipe=false;for(const h of halfpipes){const s=halfpipeSurface(h,x,z);if(s){insidePipe=true;if(!best||s.y>best.y)best=s}}
  if(!insidePipe&&!inVoid(x,z))best={y:0,normal:new THREE.Vector3(0,1,0),kind:'ground'};
  for(const r of ramps){const s=rampSurface(r,x,z);if(s&&s.y<=y+MAX_STEP_UP&&(!best||s.y>best.y))best=s}
 }
 return best||{y:-999,normal:new THREE.Vector3(0,1,0),kind:'void'}
}
function surfaceAt(x,y,z){let best=terrainSurfaceAt(x,y,z);const p=platformFloor(x,y,z);if(p&&(best.y<=-900||p.y>best.y))best=p;return best}
function halfpipeAxes(h){return {cross:new THREE.Vector3(Math.cos(h.rot),0,Math.sin(h.rot)),along:new THREE.Vector3(-Math.sin(h.rot),0,Math.cos(h.rot))}}
function beginHalfpipeRimTransition(h,side,alongOffset,incomingY=0,reason='RIM TRANSITION'){
 if(!h)return false;side=side||1;const ax=halfpipeAxes(h),local=new THREE.Vector3(player.pos.x-h.cx,0,player.pos.z-h.cz),currentU=THREE.MathUtils.clamp(local.dot(ax.cross)/(h.width*.5),-1,1),along=player.vel.dot(ax.along),cross=player.vel.dot(ax.cross),fall=Math.max(0,-incomingY);
 const startU=side*Math.max(.92,Math.min(1,Math.abs(currentU))),endU=side*.74,exitSpeed=Math.max(8.8,Math.min(18.0,Math.max(-side*cross,fall*.72+6.4)));
 player.halfpipeRimTransition={half:h,side,time:0,duration:.22,startU,endU,alongOffset,alongVel:along*.30,exitSpeed,reason};
 player.vertAir=null;player.vertPopWindow=0;player.halfpipeMode='vert';player.halfpipeHalf=h;player.halfpipeGutterHold=0;player.halfpipeDropCarry=.70;player.halfpipeCrossSign=-side;
 player.halfpipeRimLock=.54;player.halfpipeRimArmed=false;player.halfpipeRimHalf=h;player.halfpipeRimSide=side;player.halfpipeRimStall=0;player.grounded=true;player.groundKind='halfpipe';player.comboName=reason;
 return true;
}
function updateHalfpipeRimTransition(dt,jumpPressed){
 const tr=player.halfpipeRimTransition;if(!tr)return false;const h=tr.half,ax=halfpipeAxes(h),inward=-tr.side;
 if(jumpPressed){player.halfpipeRimTransition=null;player.vel.copy(ax.cross.clone().multiplyScalar(inward*Math.max(5.5,tr.exitSpeed*.66))).add(ax.along.clone().multiplyScalar(tr.alongVel));player.vel.y=8.6;player.grounded=false;player.airTime=.01;player.comboName='RIM HOP';return true}
 tr.time+=dt;tr.alongOffset+=tr.alongVel*dt;const q=THREE.MathUtils.clamp(tr.time/tr.duration,0,1),e=q*q*(3-2*q),u=THREE.MathUtils.lerp(tr.startU,tr.endU,e),crossPos=u*(h.width*.5);
 player.pos.x=h.cx+ax.along.x*tr.alongOffset+ax.cross.x*crossPos;player.pos.z=h.cz+ax.along.z*tr.alongOffset+ax.cross.z*crossPos;player.pos.y=-h.depth+h.depth*u*u;
 player.vel.set(0,0,0);player.grounded=true;player.groundKind='halfpipe';player.halfpipeRimLock=Math.max(player.halfpipeRimLock,.20);
 if(q>=1){player.halfpipeRimTransition=null;player.vel.copy(ax.cross.clone().multiplyScalar(inward*tr.exitSpeed)).add(ax.along.clone().multiplyScalar(tr.alongVel));player.halfpipeCrossSign=inward;player.halfpipeDropCarry=.72;player.halfpipeRimSide=tr.side;player.comboName='RIM ROLL-IN';}
 return true;
}
const HALFPIPE_DROP_IN_MIN_FALL=2.2;
// v0.10.6H HALFPIPE VERT AXIS RULE:
// A vertical drop belongs to the cross-bowl vert line, even when it lands near u=0.
// We choose one cross direction once, preserve it through the center, and suppress accidental
// along-pipe drift. Gutter mode is opt-in later, never an automatic center-brake.
function applyHalfpipeDropIn(s,incomingY){
 if(s.kind!=='halfpipe'||player.vertAir||incomingY>-HALFPIPE_DROP_IN_MIN_FALL)return false;
 const ax=halfpipeAxes(s.half),fall=-incomingY,along=player.vel.dot(ax.along),cross=player.vel.dot(ax.cross),side=Math.sign(s.u);
 const facing=new THREE.Vector3(Math.sin(player.yaw),0,Math.cos(player.yaw)),facingCross=facing.dot(ax.cross);
 let dir=0;
 if(Math.abs(s.u)>.10)dir=-Math.sign(s.u);                 // wall/shoulder drop: go through center
 else if(Math.abs(cross)>1.1)dir=Math.sign(cross);         // keep an existing cross-bowl choice
 else if(Math.abs(facingCross)>.15)dir=Math.sign(facingCross); // airborne steering/facing chooses side
 else dir=player.halfpipeCrossSign||1;
 const existing=Math.max(0,dir*cross),dropInMomentum=THREE.MathUtils.clamp(fall*1.16+4.8,9.5,27.5),carry=Math.max(existing,dropInMomentum);
 player.vel.copy(ax.cross.clone().multiplyScalar(dir*carry)).add(ax.along.clone().multiplyScalar(along*.32));
 player.halfpipeMode='vert';player.halfpipeHalf=s.half;player.halfpipeGutterHold=0;player.halfpipeDropCarry=1.05;player.halfpipeCrossSign=dir;
 player.pumpEnergy=Math.min(10,player.pumpEnergy+fall*.22);player.comboName='DROP IN';
 if(fall>5.5)say('DROP IN · ACROSS THE PIPE');
 return true;
}
function forceHalfpipeRimEscape(h,side,alongOffset,incomingY=0,reason='RIM ESCAPE'){
 if(!h||player.halfpipeRimEscapeCooldown>0)return false;
 side=side||1;const ax=halfpipeAxes(h),safeU=side*.80,crossPos=safeU*(h.width*.5),fall=Math.max(0,-incomingY),cross=player.vel.dot(ax.cross),along=player.vel.dot(ax.along),inward=-side;
 const exitSpeed=THREE.MathUtils.clamp(Math.max(8.8,Math.abs(cross)*.72,fall*.68+6.6),8.8,18.5);
 player.pos.x=h.cx+ax.along.x*alongOffset+ax.cross.x*crossPos;player.pos.z=h.cz+ax.along.z*alongOffset+ax.cross.z*crossPos;player.pos.y=-h.depth+h.depth*(safeU*safeU);
 player.vel.copy(ax.cross.clone().multiplyScalar(inward*exitSpeed)).add(ax.along.clone().multiplyScalar(THREE.MathUtils.clamp(along,-3,3)*.18));player.vel.y=0;
 player.vertAir=null;player.vertPopWindow=0;player.halfpipeRimTransition=null;player.halfpipeMode='vert';player.halfpipeHalf=h;player.halfpipeGutterHold=0;player.halfpipeDropCarry=.72;player.halfpipeCrossSign=inward;
 player.halfpipeRimEscapeCooldown=.42;player.halfpipeRimLock=.42;player.halfpipeRimArmed=false;player.halfpipeRimHalf=h;player.halfpipeRimSide=side;player.halfpipeRimStall=0;player.grounded=true;player.groundKind='halfpipe';player.comboName=reason;
 return true;
}
function stabilizeHalfpipeRimLanding(s,incomingY){
 if(s.kind!=='halfpipe'||incomingY>-.8||Math.abs(s.rawU??s.u)<.90)return false;
 const h=s.half,ax=halfpipeAxes(h),side=Math.sign(s.rawU??s.u)||1,alongOffset=new THREE.Vector3(player.pos.x-h.cx,0,player.pos.z-h.cz).dot(ax.along);
 return forceHalfpipeRimEscape(h,side,alongOffset,incomingY,'RIM RE-ENTRY');
}
// v0.10.8C: TURN was accidentally acting as a recovery button because it cleared stale vertAir.
// Recontact is now automatic: once a descending VERT AIR skater is back on/very near the same
// halfpipe surface, the AIR state ends before normal halfpipe movement is evaluated.
const HALFPIPE_VERT_RECONTACT_GAP=.32;
function tryResolveVertAirRecontact(){
 const va=player.vertAir;if(!va||player.zone!=='city'||!va.half)return false;
 const s=halfpipeSurface(va.half,player.pos.x,player.pos.z);if(!s)return false;
 const gap=player.pos.y-s.y;if(gap>HALFPIPE_VERT_RECONTACT_GAP||gap<-.18||player.vel.y>1.4)return false;
 const ax=halfpipeAxes(va.half),along=player.vel.dot(ax.along),cross=player.vel.dot(ax.cross),fall=Math.max(0,-player.vel.y),side=Math.sign(s.u)||va.side||1;
 const inward=THREE.MathUtils.clamp(Math.max(-side*cross,fall*.92+va.energy*.22,7.8),7.8,25);
 player.pos.y=s.y;
 player.vel.copy(ax.along.clone().multiplyScalar(along*.96)).add(ax.cross.clone().multiplyScalar(-side*inward));player.vel.y=0;
 player.grounded=true;player.groundKind='halfpipe';player.vertAir=null;player.vertPopWindow=0;
 player.halfpipeHalf=va.half;player.halfpipeMode='vert';player.halfpipeGutterHold=0;player.halfpipeCrossSign=-side;player.halfpipeDropCarry=Math.max(player.halfpipeDropCarry,.22);
 player.jumpReleaseRequired=player.jumpReleaseRequired||!!input.jump;player.actionReleaseRequired=player.actionReleaseRequired||!!player.action;
 player.comboName='VERT RECONTACT';
 return true;
}
function resolveFloorSwept(oldPos){
 const queryY=Math.max(oldPos.y,player.pos.y),s=surfaceAt(player.pos.x,queryY,player.pos.z);
 if(s.y<=-900)return false;
 const crossed=oldPos.y>=s.y-.12&&player.pos.y<=s.y+.04;
 const penetration=s.y-player.pos.y;
 const shallowBuried=penetration>.02&&penetration<=MAX_STEP_UP+.10&&oldPos.y>=s.y-(MAX_STEP_UP+.10);
 if((crossed||shallowBuried)&&player.vel.y<=1.5){
  const incomingY=player.vel.y,wasAirborne=!player.grounded||player.airTime>.04||!!player.vertAir||player.trickTimer>0||Math.abs(player.spinVel)>.08;player.pos.y=s.y;player.grounded=true;player.groundKind=s.kind;
  if(wasAirborne){player.jumpReleaseRequired=!!input.jump;player.actionReleaseRequired=!!player.action;player.trickTimer=0;player.spinVel=0;}
  if(stabilizeHalfpipeRimLanding(s,incomingY)){/* coping/top landing gets one stable inward re-entry, never a same-frame relaunch */}
  else if(s.kind==='halfpipe'&&player.vertAir&&player.vertAir.half===s.half&&incomingY<-.5&&Math.abs(s.u)>.68){
   const ax=halfpipeAxes(s.half),along=player.vel.dot(ax.along),fall=-incomingY,side=Math.sign(s.u)||player.vertAir.side||1;
   const inward=THREE.MathUtils.clamp(fall*.92+player.vertAir.energy*.22,9.5,25);
   player.vel.copy(ax.along.multiplyScalar(along*.96)).add(ax.cross.multiplyScalar(-side*inward));
   player.pumpEnergy=Math.min(10,player.pumpEnergy+fall*.16);player.vertAir=null;player.vertPopWindow=0;player.comboName='VERT RE-ENTRY';
   if(fall>10)say('VERT RE-ENTRY · KEEP THE SPEED!');
  }else if(applyHalfpipeDropIn(s,incomingY)){/* vertical fall converted into bowl momentum */}
  else if(incomingY<0)player.vel.y=0;
  if(player.zone==='city'&&s.y>-6&&!inVoid(player.pos.x,player.pos.z))player.lastSafe.set(player.pos.x,player.pos.y+.03,player.pos.z);
  if(player.zone==='bonus')player.lastSafe.set(player.pos.x,player.pos.y+.03,player.pos.z);
  return true;
 }
 return false
}
function groundSanity(){
 // Emergency catch is TERRAIN ONLY. Airborne roofs/platforms are intentionally excluded,
 // otherwise walking underneath a climb platform can teleport the skater onto its top.
 if(player.zone!=='city'||inVoid(player.pos.x,player.pos.z))return;
 const floor=terrainSurfaceAt(player.pos.x,player.pos.y+1.0,player.pos.z);
 if(floor.y<=-900)return;
 if(player.pos.y<floor.y-1.2){
  player.pos.y=floor.y;player.vel.y=Math.max(0,player.vel.y);player.grounded=true;player.groundKind=floor.kind;player.vertAir=null;
  player.lastSafe.set(player.pos.x,player.pos.y+.03,player.pos.z);say('GROUND CATCH');
 }
}
function canCatchRail(r,t){
 if(!r.coping)return true;
 // Coping has two verbs. During a vert cycle it belongs to the HALFPIPE, not the grind system.
 // This remains true all the way back down until the curved surface catches the re-entry.
 if(player.vertAir)return false;
 const tangent=r.curve.getTangentAt(t).clone();tangent.y=0;
 const hv=new THREE.Vector3(player.vel.x,0,player.vel.z),hs=hv.length();
 if(tangent.lengthSq()<.0001||hs<2.4)return false;
 tangent.normalize();hv.normalize();
 const alignment=Math.abs(hv.dot(tangent));
 // You only grind coping when travelling substantially ALONG it.
 // Crossing it from the bowl is intentionally rejected so vert gets priority.
 return alignment>=.72;
}
function closestRail(maxD=1.55){if(player.grindCooldown>0)return null;let best=null,bd=maxD;for(const r of rails){if(r.zone!==player.zone)continue;const samples=Math.max(30,Math.floor(r.length*3));for(let i=0;i<=samples;i++){const t=i/samples,p=r.curve.getPointAt(t),d=p.distanceTo(player.pos);if(d<bd&&canCatchRail(r,t)){best={r,t,p};bd=d}}}return best}
function enterGrind(hit){if(player.grind||!hit||!canCatchRail(hit.r,hit.t))return false;const tangent=hit.r.curve.getTangentAt(hit.t).normalize();const v=new THREE.Vector3(player.vel.x,player.vel.y*.25,player.vel.z);let dir=v.dot(tangent)>=0?1:-1;if(v.length()<2)dir=1;player.grind=hit.r;player.grindT=hit.t;player.grindDir=dir;player.grindSpeed=Math.max(8,Math.hypot(player.vel.x,player.vel.z),Math.abs(player.vel.y)*.75);player.balance=(Math.random()-.5)*.10;player.balanceVel=0;player.balanceDanger=0;player.balanceSide=0;player.vel.set(0,0,0);player.combo++;player.comboName='GRIND';say(hit.r.name.replaceAll('_',' ')+' · GRIND');blip(560,.06,.06,'square');return true}
function exitGrind(jump=true,endpoint=false){if(!player.grind)return;const r=player.grind,t=THREE.MathUtils.clamp(player.grindT,0,1),rawDir=r.curve.getTangentAt(t).normalize().multiplyScalar(player.grindDir),speed=player.grindSpeed;
  // Manual JUMP is the only normal way to launch off a rail. Reaching an endpoint produces a
  // deterministic rollout, so a correct grind transports the player to the other side instead of
  // randomly throwing them into space.
  if(endpoint){
    if(r.name==='SPIRAL_TOWER_RAIL'&&t>.98){
      player.pos.set(towerCX,towerH+2.72,towerCZ+3.45);
      player.vel.set(0,0,-THREE.MathUtils.clamp(speed*.28,4.8,7.0));
      player.yaw=Math.PI;player.grounded=true;player.airTime=0;player.comboName='TOWER TOP';say('SPIRAL COMPLETE · TOWER TOP');
    }else if(r.name==='SKYLINE_HERO'&&t>.98){
      player.pos.set(0,127.06,-294.1);
      player.vel.set(0,0,-THREE.MathUtils.clamp(speed*.28,5.0,7.5));
      player.yaw=Math.PI;player.grounded=true;player.airTime=0;player.comboName='SKYLINE FINISH';say('SKYLINE COMPLETE · TAG THE WALL');
    }else{
      const d=rawDir.clone();d.y=0;if(d.lengthSq()<.001)d.set(Math.sin(player.yaw),0,Math.cos(player.yaw));d.normalize();
      const rollout=THREE.MathUtils.clamp(speed*.62,5.5,14);player.vel.copy(d.multiplyScalar(rollout));player.vel.y=0;player.pos.addScaledVector(d,1.35);player.airTime=.01;player.comboName='RAIL ROLLOUT';say('RAIL COMPLETE');
    }
    player.grind=null;player.grindCooldown=.58;player.balance=0;player.balanceVel=0;player.balanceDanger=0;player.balanceSide=0;player.combo++;return;
  }
  player.vel.copy(rawDir.multiplyScalar(speed));if(jump)player.vel.y=Math.max(player.vel.y,7.1+Math.min(2,speed*.05));player.grind=null;player.grindCooldown=.28;player.balanceDanger=0;player.balanceSide=0;player.airTime=.01;player.combo++;player.comboName=jump?'GRIND JUMP':'BALANCE LOST';if(jump)say('GRIND JUMP!');}
function wallHalfThickness(w){return (w.thickness||0)*.5}
function wallClearance(w,radius=PLAYER_RADIUS){return radius+wallHalfThickness(w)}
function nearWall(maxD=1.2,pos=player.pos){let best=null,bd=maxD;for(const w of walls){if(w.ride===false)continue;const along=w.axis==='x'?pos.z:pos.x;if(along<w.min-.65||along>w.max+.65||pos.y<w.bottom-.35||pos.y>w.top+1.25)continue;const coord=w.axis==='x'?pos.x:pos.z,centerD=Math.abs(coord-w.coord),d=Math.max(0,centerD-wallHalfThickness(w));if(d<bd){const sign=(coord-w.coord)>=0?1:-1;best={w,d,normal:w.axis==='x'?new THREE.Vector3(sign,0,0):new THREE.Vector3(0,0,sign)};bd=d}}return best}
function wallTangent(hit){const t=new THREE.Vector3(-hit.normal.z,0,hit.normal.x);if(t.dot(player.vel)<0)t.negate();return t}
function tryStartWallRide(hit,wish){if(!hit||performance.now()-player.lastWall<180||player.wallRide||player.mantle)return false;const speed=Math.hypot(player.vel.x,player.vel.z),t=wallTangent(hit),along=Math.abs(player.vel.dot(t)),into=wish.dot(hit.normal);if(speed<9.0||along<6.5||into>-.12)return false;const rideSpeed=THREE.MathUtils.clamp(Math.max(along,speed*.9)+1.8,10,31);player.wallRide={w:hit.w,normal:hit.normal.clone(),tangent:t.clone(),time:0,duration:1.65,speed:rideSpeed,vy:5.8+Math.min(2.6,speed*.075)};const coord=hit.w.coord+(hit.w.axis==='x'?hit.normal.x:hit.normal.z)*wallClearance(hit.w,.82);if(hit.w.axis==='x')player.pos.x=coord;else player.pos.z=coord;player.vel.copy(t.multiplyScalar(rideSpeed));player.vel.y=player.wallRide.vy;player.grounded=false;player.airTime=Math.max(.01,player.airTime);player.combo++;player.comboName='WALL RIDE';player.score+=180;say('WALL RIDE · HOLD THE LINE');blip(720,.09,.08,'square');return true}
function exitWallRide(kick=false){const wr=player.wallRide;if(!wr)return;player.vel.copy(wr.tangent).multiplyScalar(wr.speed);player.vel.y=wr.vy;if(kick){player.vel.addScaledVector(wr.normal,8.2);player.vel.y=Math.max(8.4,wr.vy+4.5);player.combo++;player.comboName='WALL KICK';player.score+=220;say('WALL KICK!')}else player.vel.addScaledVector(wr.normal,1.6);player.wallRide=null;player.lastWall=performance.now()}
function updateWallRide(dt,jumpPressed,actionPressed){const wr=player.wallRide;if(!wr)return false;wr.time+=dt;wr.speed=THREE.MathUtils.clamp(wr.speed,9,33);wr.vy-=13.2*dt;player.pos.addScaledVector(wr.tangent,wr.speed*dt);player.pos.y+=wr.vy*dt;const coord=wr.w.coord+(wr.w.axis==='x'?wr.normal.x:wr.normal.z)*wallClearance(wr.w,.82);if(wr.w.axis==='x')player.pos.x=coord;else player.pos.z=coord;player.vel.copy(wr.tangent).multiplyScalar(wr.speed);player.vel.y=wr.vy;player.yaw=Math.atan2(wr.tangent.x,wr.tangent.z);player.airTime+=dt;player.score+=22*dt;if(Math.random()<dt*34)spawnSpark(player.pos,true);const along=wr.w.axis==='x'?player.pos.z:player.pos.x,out=along<wr.w.min-.7||along>wr.w.max+.7||player.pos.y<wr.w.bottom-.5||player.pos.y>wr.w.top+1.2;if(actionPressed)doAirTrick();if(jumpPressed&&wr.time>.10){exitWallRide(true);return true}if(wr.time>=wr.duration||out){exitWallRide(false);return true}return true}
function wallJump(hit=nearWall(1.15)){if(!hit||performance.now()-player.lastWall<220)return false;const speed=Math.hypot(player.vel.x,player.vel.z),t=wallTangent(hit);player.vel.addScaledVector(hit.normal,7.6+Math.min(2.7,speed*.12));player.vel.y=Math.max(player.vel.y,9.1);player.vel.addScaledVector(t,2.0);player.grounded=false;player.lastWall=performance.now();player.combo++;player.comboName='WALL JUMP';player.score+=180;say('WALL JUMP!');blip(820,.09,.08,'square');return true}
function tryMantle(hit,wish){if(!hit?.w?.solid||player.mantle||player.wallRide)return false;const s=hit.w.solid,q=s.mesh.position,h=s.half,top=q.y+h.y,reach=top-player.pos.y;if(reach<.35||reach>3.0||wish.dot(hit.normal)>-.08)return false;const to=player.pos.clone().addScaledVector(hit.normal,-1.15);to.y=top+.04;to.x=THREE.MathUtils.clamp(to.x,q.x-h.x+.65,q.x+h.x-.65);to.z=THREE.MathUtils.clamp(to.z,q.z-h.z+.65,q.z+h.z-.65);player.mantle={from:player.pos.clone(),to,time:0,duration:.34};player.vel.set(0,0,0);player.grounded=false;player.combo++;player.comboName='MANTLE';player.score+=140;say('CLIMB · MANTLE');return true}
function updateMantle(dt){const m=player.mantle;if(!m)return false;m.time+=dt;const u=THREE.MathUtils.clamp(m.time/m.duration,0,1),e=u*u*(3-2*u);player.pos.lerpVectors(m.from,m.to,e);player.pos.y+=Math.sin(Math.PI*u)*.65;player.yaw+=0;if(u>=1){player.pos.copy(m.to);player.mantle=null;player.grounded=true;player.vel.set(0,0,0);player.lastSafe.copy(player.pos)}return true}
function resolveSolidCollisions(oldPos){const radius=PLAYER_RADIUS,head=PLAYER_HEAD;for(const s of solids){if((player.zone==='bonus')!==(s.zone==='bonus'))continue;const q=s.mesh.position,h=s.half,left=q.x-h.x-radius,right=q.x+h.x+radius,front=q.z-h.z-radius,back=q.z+h.z+radius,bottom=q.y-h.y,top=q.y+h.y;if(player.pos.y>=top-.04||player.pos.y+head<=bottom||player.pos.x<=left||player.pos.x>=right||player.pos.z<=front||player.pos.z>=back)continue;const px=Math.min(player.pos.x-left,right-player.pos.x),pz=Math.min(player.pos.z-front,back-player.pos.z);if(px<pz){const side=oldPos.x<q.x?-1:1;player.pos.x=q.x+side*(h.x+radius);const n=new THREE.Vector3(side,0,0),vn=player.vel.dot(n);if(vn<0)player.vel.addScaledVector(n,-vn)}else{const side=oldPos.z<q.z?-1:1;player.pos.z=q.z+side*(h.z+radius);const n=new THREE.Vector3(0,0,side),vn=player.vel.dot(n);if(vn<0)player.vel.addScaledVector(n,-vn)}}}
function resolveThinWalls(oldPos){for(const w of walls){if(w.solid)continue;if(w.zone&&w.zone!==player.zone)continue;const clearance=wallClearance(w),along=w.axis==='x'?player.pos.z:player.pos.x;if(along<w.min-.4||along>w.max+.4||player.pos.y+PLAYER_HEAD<w.bottom||player.pos.y>w.top)continue;const now=w.axis==='x'?player.pos.x:player.pos.z,old=w.axis==='x'?oldPos.x:oldPos.z,crossed=(old-w.coord)*(now-w.coord)<=0;if(Math.abs(now-w.coord)<clearance||crossed){const side=(old-w.coord)>=0?1:-1,n=w.axis==='x'?new THREE.Vector3(side,0,0):new THREE.Vector3(0,0,side);if(w.axis==='x')player.pos.x=w.coord+side*clearance;else player.pos.z=w.coord+side*clearance;const vn=player.vel.dot(n);if(vn<0)player.vel.addScaledVector(n,-vn)}}}
function keepWithinWorld(oldPos){
  if(player.zone!=='city')return;
  const minX=-82.2,maxX=82.2,minZ=-82.2,maxZ=82.2,rebound=.18;
  if(player.pos.x<minX){player.pos.x=minX;player.vel.x=Math.max(0,Math.abs(player.vel.x)*rebound)}
  else if(player.pos.x>maxX){player.pos.x=maxX;player.vel.x=-Math.max(0,Math.abs(player.vel.x)*rebound)}
  if(player.pos.z<minZ){player.pos.z=minZ;player.vel.z=Math.max(0,Math.abs(player.vel.z)*rebound)}
  else if(player.pos.z>maxZ){player.pos.z=maxZ;player.vel.z=-Math.max(0,Math.abs(player.vel.z)*rebound)}
}
function addScore(n,labelText=''){player.score+=Math.round(n);if(labelText){player.combo++;player.comboName=labelText}}
function doAirTrick(){if(player.grounded||player.grind||player.mantle||player.trickCooldown>0||player.airTricks>=8)return false;const hs=Math.hypot(player.vel.x,player.vel.z),style=player.airTricks%2,name=style===0?'JET TUCK GRAB':'SCISSOR TWIST',dir=(Math.abs(input.x)>.12?Math.sign(input.x):1);player.airTricks++;player.trickStyle=style;player.trickDuration=style===0?.64:.76;player.trickTimer=player.trickDuration;player.trickCooldown=.12;player.spinVel+=dir*(style===0?4.8:11.6);addScore((style===0?220:280)+hs*7+player.airTricks*62,name);say(name+' · AIR x'+player.airTricks);blip((style===0?930:1080)+player.airTricks*42,.07,.075,'triangle');return true}
function maybePlant(){if(player.groundKind!=='halfpipe'||!player.grounded)return false;const hp=halfpipes.find(h=>surfaceAt(player.pos.x,player.pos.y+1,player.pos.z).half===h);const surf=surfaceAt(player.pos.x,player.pos.y+1,player.pos.z);if(!hp||!surf||Math.abs(surf.u)<.83)return false;player.vel.y=7.4;player.vel.x*=-.82;player.vel.z*=-.82;player.grounded=false;player.vertAir=null;player.halfpipeRimArmed=false;player.halfpipeRimLock=.22;player.airTime=.01;addScore(320,'ONE ARM PLANT');say('ONE ARM PLANT!');return true}
function spawnSpark(pos,good=false){const heading=player.grind?player.grind.curve.getTangentAt(THREE.MathUtils.clamp(player.grindT,0,1)).normalize().multiplyScalar(player.grindDir):new THREE.Vector3(Math.sin(player.yaw),0,Math.cos(player.yaw));const right=new THREE.Vector3(-heading.z,0,heading.x),count=player.grind?2:1;for(let k=0;k<count;k++){const size=good?.14:.11,sparkColor=(good&&k===1)?0x51dfff:0xffffff,m=new THREE.Mesh(new THREE.OctahedronGeometry(size,0),new THREE.MeshBasicMaterial({color:sparkColor,transparent:true,opacity:1,depthWrite:false}));m.position.copy(pos).addScaledVector(right,(k?1:-1)*(.30+Math.random()*.12)).add(new THREE.Vector3(0,-.18,0)).addScaledVector(heading,-.28);m.scale.set(2.1,.62,.62);m.rotation.y=player.yaw;scene.add(m);const back=heading.clone().multiplyScalar(-(4+Math.random()*5)),side=right.clone().multiplyScalar((Math.random()-.5)*4);sparks.push({m,v:back.add(side).add(new THREE.Vector3(0,1.2+Math.random()*2.5,0)),life:.28+.16*Math.random()})}}
function updateSparks(dt){for(let i=sparks.length-1;i>=0;i--){const s=sparks[i];s.life-=dt;s.v.y-=8*dt;s.m.position.addScaledVector(s.v,dt);s.m.material.opacity=Math.max(0,s.life*4);if(s.life<=0){scene.remove(s.m);sparks.splice(i,1)}}}
// Faceted cel-shaded skate dust is thrown OUTSIDE the arc, not glued behind the character.
function spawnTurnCloud(sign=1,intensity=1,kind='slide'){
 const f=new THREE.Vector3(Math.sin(player.yaw),0,Math.cos(player.yaw)),side=new THREE.Vector3(-f.z,0,f.x).multiplyScalar(-sign),move=Math.hypot(player.vel.x,player.vel.z)>.2?new THREE.Vector3(player.vel.x,0,player.vel.z).normalize():f.clone(),g=new THREE.Group();
 const matA=new THREE.MeshToonMaterial({color:0xf7fbff,transparent:true,opacity:.84,depthWrite:false}),matB=new THREE.MeshToonMaterial({color:kind==='brake'?0xd9eef4:0xcfe8ef,transparent:true,opacity:.70,depthWrite:false});
 const lobes=[[0,0,0,.27],[-.22,.05,.04,.22],[.20,.07,.02,.20],[.03,.12,.13,.18]];
 for(let i=0;i<lobes.length;i++){const a=lobes[i],m=new THREE.Mesh(new THREE.IcosahedronGeometry(a[3]*(.76+.30*intensity),0),i===3?matB:matA);m.position.set(a[0],a[1],a[2]);m.scale.set(1.34,.72,1);g.add(m)}
 g.position.copy(player.pos).add(new THREE.Vector3(0,.16,0)).addScaledVector(move,-.32).addScaledVector(side,.34+.24*intensity);
 g.rotation.y=player.yaw+(Math.random()-.5)*.4;scene.add(g);
 const outward=kind==='brake'?(2.6+Math.random()*2.3):(2.0+Math.random()*2.6),back=kind==='brake'?.75:.35;
 const drift=side.multiplyScalar(outward).addScaledVector(move,-back*(1+Math.random())).add(new THREE.Vector3(0,.55+Math.random()*.62,0));
 turnClouds.push({g,v:drift,life:kind==='brake'?.52:.44,max:kind==='brake'?.52:.44,spin:(Math.random()-.5)*3.4,mats:[matA,matB]});
}
function updateTurnClouds(dt){for(let i=turnClouds.length-1;i>=0;i--){const c=turnClouds[i];c.life-=dt;c.v.y+=.25*dt;c.g.position.addScaledVector(c.v,dt);c.g.rotation.y+=c.spin*dt;const q=Math.max(0,c.life/c.max);c.g.scale.setScalar(.82+(1-q)*.82);for(const m of c.mats)m.opacity=q*q*.84;if(c.life<=0){scene.remove(c.g);for(const ch of c.g.children)ch.geometry?.dispose();for(const m of c.mats)m.dispose();turnClouds.splice(i,1)}}}
function startSlideTurn(sign){
 if(player.slideTurn||player.brakeTurn||player.grind||player.wallRide||player.mantle||!player.grounded)return false;
 const hs=Math.hypot(player.vel.x,player.vel.z);if(hs<2.2)return false;
 player.lastTurnSign=sign||player.lastTurnSign||1;player.slideTurn={time:0,sign:player.lastTurnSign,startYaw:player.yaw,angle:0,puff:0,slip:0,entrySpeed:hs};player.naturalStop=null;player.stopPose=null;player.comboName='POWER CARVE';blip(520,.06,.06,'square');return true;
}
function finishSlideTurn(){
 const s=player.slideTurn;if(!s)return;const deg=Math.round(Math.abs(s.angle)*180/Math.PI/15)*15;
 if(deg>=30){player.score+=Math.round(20+deg*.7);player.comboName=(deg>=315?'SPIN CARVE':deg>=150?'180 CARVE':deg>=75?'POWER CARVE':'CUT CARVE')+' '+deg+'°'}
 player.steerLock=.10;player.slideTurn=null;
}
function updateSlideTurn(dt,wish){
 const s=player.slideTurn;if(!s)return false;s.time+=dt;
 if(Math.abs(input.x)>.18){const requested=-Math.sign(input.x);if(requested!==s.sign&&s.time>.12){s.sign=requested;s.startYaw=player.yaw;s.angle=0}s.sign=requested;player.lastTurnSign=requested}
 const hs=Math.hypot(player.vel.x,player.vel.z),speed01=THREE.MathUtils.clamp(hs/19,0,1),strength=THREE.MathUtils.clamp(Math.abs(input.x),.18,1),rate=THREE.MathUtils.lerp(2.55,4.45,speed01)*(.52+.48*strength);
 const delta=s.sign*rate*dt;player.yaw+=delta;s.angle+=delta;
 const f=new THREE.Vector3(Math.sin(player.yaw),0,Math.cos(player.yaw)),vflat=new THREE.Vector3(player.vel.x,0,player.vel.z),vdir=hs>.05?vflat.clone().normalize():f.clone();
 const slipAngle=Math.acos(THREE.MathUtils.clamp(vdir.dot(f),-1,1)),slipTarget=Math.sin(Math.min(Math.PI*.5,slipAngle));s.slip+=(slipTarget-s.slip)*(1-Math.exp(-10*dt));
 // Rally grammar: yaw turns first. Momentum is only caught progressively by the wheels.
 const entry=THREE.MathUtils.clamp(s.time/.58,0,1),catchRate=THREE.MathUtils.lerp(.82,2.45,entry),speedLoss=Math.exp(-(.10+.34*s.slip)*dt),desiredSpeed=Math.max(3.4,hs*speedLoss),desired=f.clone().multiplyScalar(desiredSpeed);
 player.vel.x*=speedLoss;player.vel.z*=speedLoss;const catchBlend=1-Math.exp(-catchRate*dt);player.vel.x=THREE.MathUtils.lerp(player.vel.x,desired.x,catchBlend);player.vel.z=THREE.MathUtils.lerp(player.vel.z,desired.z,catchBlend);
 if(wish.lengthSq()>.01){const drive=3.0*(.35+.65*Math.min(1,Math.hypot(input.x,input.y)));player.vel.addScaledVector(f,drive*dt)}
 s.puff-=dt;if(s.puff<=0&&s.slip>.18){spawnTurnCloud(s.sign,THREE.MathUtils.clamp(.50+s.slip*.75+hs/34,0,1.55),'slide');s.puff=.045+(1-s.slip)*.045}
 return true;
}
function startBrakeTurn(wish){
 if(player.brakeTurn||player.grind||player.wallRide||player.mantle||!player.grounded)return false;
 const hs=Math.hypot(player.vel.x,player.vel.z);if(hs<5.0)return false;const move=new THREE.Vector3(player.vel.x,0,player.vel.z).normalize(),side=Math.abs(input.x)>.18?Math.sign(input.x):(player.lastTurnSign||1);
 if(player.slideTurn)finishSlideTurn();player.lastTurnSign=side;player.brakeTurn={time:0,duration:THREE.MathUtils.clamp(.50-hs*.006,.36,.47),sign:side,startYaw:player.yaw,startSpeed:hs,moveDir:move,puff:0};player.naturalStop=null;player.stopPose=null;player.comboName='180 BRAKE';player.score+=55+Math.round(hs*2);say('180 BRAKE · HOLD BACK TO REVERSE');blip(390,.09,.085,'square');return true;
}
function updateBrakeTurn(dt,wish){
 const b=player.brakeTurn;if(!b)return false;b.time+=dt;const u=THREE.MathUtils.clamp(b.time/b.duration,0,1),e=u*u*(3-2*u);player.yaw=b.startYaw+b.sign*Math.PI*e;
 const f=new THREE.Vector3(Math.sin(player.yaw),0,Math.cos(player.yaw)),held=wish.lengthSq()>.08&&input.y>.42;
 // The old travel vector survives the first half of the brake, then the wheels catch the new 180° heading.
 const oldSpeed=b.startSpeed*(1-.78*(1-Math.pow(1-u,1.55))),oldV=b.moveDir.clone().multiplyScalar(oldSpeed),rollSpeed=held?THREE.MathUtils.clamp(b.startSpeed*.27,3.5,6.4):0,target=f.clone().multiplyScalar(rollSpeed),catchLate=ease01(THREE.MathUtils.clamp((u-.54)/.46,0,1));
 player.vel.lerpVectors(oldV,target,catchLate);
 b.puff-=dt;if(b.puff<=0&&u>.06){spawnTurnCloud(b.sign,THREE.MathUtils.clamp(.75+b.startSpeed/28,0,1.6),'brake');b.puff=.032+.028*(1-u)}
 if(u>=1){if(held){player.vel.copy(f).multiplyScalar(rollSpeed);player.comboName='REVERSE ROLL';player.steerLock=.14;say('REVERSE ROLL')}else{player.vel.x=0;player.vel.z=0;player.comboName='STYLE STOP';player.stopPose={time:0,duration:.24,sign:b.sign};dance.idleFor=.14;dance.blend=Math.max(dance.blend,.10);say('STYLE STOP')};player.brakeTurn=null}
 return true;
}
function beginNaturalStop(){
 if(player.naturalStop||player.slideTurn||player.brakeTurn)return;const hs=Math.hypot(player.vel.x,player.vel.z);if(hs<.4)return;player.naturalStop={time:0,startSpeed:hs,puff:0,sign:player.lastTurnSign||1};player.comboName=hs>7?'SKATE STOP':player.comboName;
}
function updateNaturalStop(dt){
 const n=player.naturalStop;if(!n)return false;n.time+=dt;const hs=Math.hypot(player.vel.x,player.vel.z);if(hs<=.22){player.vel.x=0;player.vel.z=0;player.naturalStop=null;player.stopPose={time:0,duration:.18,sign:n.sign};dance.idleFor=.16;dance.blend=Math.max(dance.blend,.12);return true}
 const decel=7.2+Math.min(4.6,hs*.22),next=Math.max(0,hs-decel*dt),k=hs>0?next/hs:0;player.vel.x*=k;player.vel.z*=k;
 n.puff-=dt;if(n.puff<=0&&hs>3.1){spawnTurnCloud(n.sign,.44+Math.min(.45,hs/30),'stop');n.puff=.15}
 return true;
}
function playSkylineCoinSound(n){const scale=[880,988,1175,1319,1480,1760],f=scale[(n-1)%scale.length];blip(f,.085,.07,'sine');setTimeout(()=>blip(f*1.5,.075,.045,'triangle'),42);if(n%6===0)setTimeout(()=>blip(f*2,.10,.04,'sine'),88)}
function playSkylineCoinComplete(){[1047,1319,1568,2093].forEach((f,i)=>setTimeout(()=>blip(f,.16+i*.02,.07-i*.008,i<2?'triangle':'sine'),i*85))}
function collectCoins(){for(const c of coins){if(kysChallengeSession&&c.userData.kysActive===false)continue;if(c.userData.collected)continue;if(sweptCollectsPoint(frameStartPlayerPos,player.pos,c.position,1.9)){c.userData.collected=true;c.userData.roomCollected=false;c.visible=false;coinsCollected++;addScore(100,c.userData.bonusRail?'SKY COIN':'COIN LINE');document.getElementById('coinCount').textContent=coinsCollected;kysChallengeEngine?.event('coin.collected',{id:c.userData.kysId||c.userData.persistId||`${c.userData.rail||'coin'}:${c.userData.coinIndex??coins.indexOf(c)}`,rail:c.userData.rail||null,position:c.position.toArray()});kysLegacyProgress('coin.collected');if(c.userData.bonusRail){bonusCoinsCollected++;playSkylineCoinSound(bonusCoinsCollected);player.comboName='SKYLINE COINS '+bonusCoinsCollected+'/22';if(bonusCoinsCollected===22&&!bonusCoinLineCompleted){bonusCoinLineCompleted=true;addScore(2200,'SKYLINE COIN LINE');say('SKYLINE COIN LINE · 22/22!');playSkylineCoinComplete()}}else{blip(900+(coinsCollected%5)*80,.12,.09,'sine');if(!kysChallengeSession&&c.userData.persistId)multiplayer?.publishWorldAction('coinCollect',c.userData.persistId,KLOOJO_ZONE_ID)}persistRuntimeState()}}}
function respawn(toHub=false){if(kysChallengeSession){kysRunStats.respawns++;kysChallengeEngine?.event('player.respawn',{toHub:!!toHub});if(kysChallengeEngine?.encounter?.constraints?.noRespawn)kysChallengeEngine.fail('BAILED');}if(toHub){player.zone='city';zone=KLOOJO_ZONE_LABEL;document.getElementById('zone').textContent=zone;player.pos.set(0,.2,25);player.lastSafe.copy(player.pos)}else player.pos.copy(player.lastSafe).add(new THREE.Vector3(0,.35,0));player.vel.set(0,0,0);player.grind=null;player.wallRide=null;player.mantle=null;player.handplant=null;player.traversal=null;player.coil=false;player.slideTurn=null;player.brakeTurn=null;player.naturalStop=null;player.stopPose=null;player.vertAir=null;player.vertPopWindow=0;player.halfpipeRimLock=0;player.halfpipeRimArmed=true;player.halfpipeRimHalf=null;player.halfpipeRimSide=0;player.halfpipeRimStall=0;player.halfpipeRimTransition=null;player.halfpipeRimEscapeCooldown=0;player.balance=0;player.balanceDanger=0;player.balanceSide=0;player.airTime=0;player.airTricks=0;player.spin=0;player.spinVel=0;player.trickTimer=0;player.trickCooldown=0;player.jumpReleaseRequired=!!input.jump;player.actionReleaseRequired=!!player.action;vertFreedom.rotation=0;vertFreedom.airFromHalfpipe=false;vertFreedom.energy=0;traversalRuntime.transferWindow=0;traversalRuntime.lastWall=null;say(toHub?'BACK TO '+KLOOJO_ZONE_LABEL:'BACK ON SKATES')}
function enterBonus(){player.zone='bonus';zone='SKYLINE BONUS';document.getElementById('zone').textContent=zone;player.pos.copy(bonusOrigin);player.vel.set(0,0,-10);player.lastSafe.copy(bonusOrigin);player.portalCooldown=1.5;if(bonusReturnTag){bonusReturnTag.done=false;bonusReturnTag.progress=0;bonusReturnTag.face.material.opacity=0;if(bonusReturnTag.indicator)bonusReturnTag.indicator.visible=true;}say('SKYLINE BONUS · HIT THE FINAL TAG!');}
function nearTagWall(){if(kysChallengeSession)return null;let best=null,bd=3.6;for(const w of tagWalls){if(w.done&&!w.isBonus)continue;if(w.isBonus&&player.zone!=='bonus')continue;if(!w.isBonus&&player.zone!=='city')continue;const d=player.pos.distanceTo(w.g.position);if(d<bd){bd=d;best=w}}return best}
function updateGraffiti(dt){const now=performance.now();for(const q of tagWalls){if(kysChallengeSession){if(q.indicator)q.indicator.visible=false;continue}if(q.noIndicator){if(q.indicator)q.indicator.visible=false;continue}if(q.done&&!q.isBonus){if(q.indicator)q.indicator.visible=false;continue}const d=player.pos.distanceTo(q.g.position);pulseGraffitiSignal(q.indicator,d,now)}const w=nearTagWall();if(player.action&&w&&player.grounded){if(w.isBonus&&w.done){setTimeout(()=>respawn(true),120);return}w.progress=Math.min(1,w.progress+dt*.9);w.face.material.opacity=w.progress;if(w.progress>=1&&!w.done){w.done=true;if(w.indicator)w.indicator.visible=false;addScore(500,'TAG COMPLETE');if(w.unlocksPortal){unlockSkylinePortal();w.face.material.opacity=1}else{say(w.isBonus?'BONUS TAG COMPLETE!':'TAG COMPLETE +500');blip(430,.18,.11,'sawtooth')}if(w.isBonus){bonusReturnTagEverCompleted=true;maybeRewardAllGraffiti();setTimeout(()=>respawn(true),500)}else maybeRewardAllGraffiti();persistRuntimeState();}}}

function updatePlayer(dt){if(player.jumpReleaseRequired&&!input.jump)player.jumpReleaseRequired=false;if(player.actionReleaseRequired&&!player.action)player.actionReleaseRequired=false;const rawJumpPressed=input.jump&&!prevJump,rawActionPressed=player.action&&!prevAction,jumpPressed=rawJumpPressed&&!player.jumpReleaseRequired,actionPressed=rawActionPressed&&!player.actionReleaseRequired;prevJump=input.jump;prevAction=player.action;player.portalCooldown=Math.max(0,player.portalCooldown-dt);player.vertPopWindow=Math.max(0,player.vertPopWindow-dt);player.trickCooldown=Math.max(0,player.trickCooldown-dt);player.trickTimer=Math.max(0,player.trickTimer-dt);player.steerLock=Math.max(0,player.steerLock-dt);player.grindCooldown=Math.max(0,player.grindCooldown-dt);player.halfpipeRimEscapeCooldown=Math.max(0,player.halfpipeRimEscapeCooldown-dt);
 if(player.halfpipeRimTransition)player.halfpipeRimTransition=null; // legacy animated transition disabled: it could chatter at the rim
 if(updateMantle(dt))return;
 if(player.wallRide){updateWallRide(dt,jumpPressed,actionPressed);return}
 if(player.grind){const r=player.grind,t=THREE.MathUtils.clamp(player.grindT,0,1),tan=r.curve.getTangentAt(t).normalize().multiplyScalar(player.grindDir),spiral=r.name==='SPIRAL_TOWER_RAIL';const uphill=tan.y;
   // Once caught, the rail path itself is 100% deterministic. Balance can make you FALL, but it can
   // never steer the player off the geometric rail or change which endpoint is reached.
   const railDrive=spiral?7.2:2.0;player.grindSpeed+=(-uphill*(spiral?4.0:7.0)+railDrive)*dt;player.grindSpeed=THREE.MathUtils.clamp(player.grindSpeed,spiral?10.5:6.5,spiral?30:36);
   // Balance is deliberately slower and readable: a wandering needle that the player corrects with
   // left/right. Only the red extremes fail the grind.
   const now=performance.now(),drift=Math.sin(now*.00125+r.length*.13)*.30+Math.sin(now*.00063+r.length*.31)*.15;
   const balanceCounterSteer=input.x*2.18; // LEFT needle (<0) needs RIGHT stick (>0), and vice versa
   player.balanceVel+=(drift+balanceCounterSteer-player.balance*.18)*dt;player.balanceVel*=Math.exp(-1.32*dt);player.balance+=player.balanceVel*dt;player.balance*=Math.exp(-.020*dt);
   // BALANCE MINIGAME: the rail path is automatic, but staying near an extreme builds danger.
   // A quick excursion is recoverable. Lingering there is what makes the skater actually fall.
   const absBalance=Math.abs(player.balance),BALANCE_DANGER_START=.86,BALANCE_DANGER_SECONDS=.72;
   if(absBalance>BALANCE_DANGER_START){const severity=THREE.MathUtils.clamp((absBalance-BALANCE_DANGER_START)/.28,0,1);player.balanceDanger+=dt*(1+severity*1.35);player.balanceSide=Math.sign(player.balance)||player.balanceSide||1;}
   else{player.balanceDanger=Math.max(0,player.balanceDanger-dt*2.45);if(player.balanceDanger<=.001)player.balanceSide=0;}
   const good=absBalance<.20;if(good){player.grindSpeed=Math.min(spiral?31:38,player.grindSpeed+(spiral?3.2:4.2)*dt);player.score+=20*dt}if(Math.random()<dt*(good?62:42))spawnSpark(player.pos,good);
   const nextT=player.grindT+player.grindDir*(player.grindSpeed/r.length)*dt;if(nextT<=0||nextT>=1){const endpoint=nextT<=0?'start':'end';player.grindT=nextT<=0?0:1;const p=r.curve.getPointAt(player.grindT);player.pos.copy(p).add(new THREE.Vector3(0,.72,0));player.yaw=Math.atan2(tan.x,tan.z);if(tryRailConnection(r,endpoint))return;exitGrind(false,true);return}
   player.grindT=nextT;const p=r.curve.getPointAt(player.grindT);player.pos.copy(p).add(new THREE.Vector3(0,.72,0));player.yaw=Math.atan2(tan.x,tan.z);if(actionPressed)doAirTrick();if(jumpPressed){exitGrind(true,false);return}if(player.balanceDanger>BALANCE_DANGER_SECONDS){const fallSign=player.balanceSide||Math.sign(player.balance)||1,railRight=new THREE.Vector3(-tan.z,0,tan.x).normalize().multiplyScalar(fallSign);say(fallSign>0?'BALANCE LOST · FALL RIGHT!':'BALANCE LOST · FALL LEFT!');exitGrind(false,false);player.vel.addScaledVector(railRight,5.8);player.vel.y=3.2;return}return;
 }
 const camF=new THREE.Vector3(Math.sin(cameraYaw),0,Math.cos(cameraYaw)),camR=new THREE.Vector3(-Math.cos(cameraYaw),0,Math.sin(cameraYaw));const wish=camF.multiplyScalar(-input.y).add(camR.multiplyScalar(input.x));if(wish.lengthSq()>1)wish.normalize();
 const surf=surfaceAt(player.pos.x,player.pos.y,player.pos.z);player.grounded=surf.y>-900&&player.pos.y<=surf.y+.22&&player.vel.y<=1.4;player.groundKind=surf.kind;
 // If we are physically back on the bowl but vertAir survived, end AIR now. TURN must never be the recovery mechanism.
 tryResolveVertAirRecontact();
 // Halfpipe has two explicit verbs. VERT is the default and owns cross-bowl momentum.
 // GUTTER only activates after deliberate sustained along-pipe input near the center at low cross speed.
 if(player.grounded&&surf.kind==='halfpipe'){
   const ax=halfpipeAxes(surf.half),cross=player.vel.dot(ax.cross),along=player.vel.dot(ax.along),inputCross=wish.dot(ax.cross),inputAlong=wish.dot(ax.along);
   if(player.halfpipeHalf!==surf.half){player.halfpipeHalf=surf.half;player.halfpipeMode='vert';player.halfpipeGutterHold=0;player.halfpipeRimLock=0;player.halfpipeRimArmed=true;player.halfpipeRimHalf=surf.half;player.halfpipeRimSide=0;player.halfpipeRimStall=0;}
   const deliberateGutter=player.halfpipeDropCarry<=0&&Math.abs(surf.u)<.22&&Math.abs(cross)<4.2&&Math.abs(inputAlong)>.72&&Math.abs(inputCross)<.34;
   if(deliberateGutter){player.halfpipeGutterHold+=dt;if(player.halfpipeGutterHold>.38)player.halfpipeMode='gutter';}
   else player.halfpipeGutterHold=Math.max(0,player.halfpipeGutterHold-dt*2.6);
   if(player.halfpipeDropCarry>0||Math.abs(inputCross)>.44||Math.abs(cross)>5.0||Math.abs(surf.u)>.38){player.halfpipeMode='vert';player.halfpipeGutterHold=0;}
   if(Math.abs(cross)>1.5)player.halfpipeCrossSign=Math.sign(cross);
 }else if(!player.vertAir){player.halfpipeHalf=null;player.halfpipeGutterHold=0;player.halfpipeDropCarry=0;player.halfpipeRimLock=0;player.halfpipeRimArmed=true;player.halfpipeRimHalf=null;player.halfpipeRimSide=0;player.halfpipeRimStall=0;}
 const flatGround=player.grounded&&surf.kind!=='halfpipe',intentMag=Math.min(1,Math.hypot(input.x,input.y)),hsBefore=Math.hypot(player.vel.x,player.vel.z),moveDir=hsBefore>.05?new THREE.Vector3(player.vel.x,0,player.vel.z).normalize():new THREE.Vector3(Math.sin(player.yaw),0,Math.cos(player.yaw)),wishDir=wish.lengthSq()>.01?wish.clone().normalize():null;
 const hardBack=flatGround&&hsBefore>5.0&&input.y>.56&&intentMag>.64&&wishDir&&wishDir.dot(moveDir)<-.52;
 if(!flatGround){player.slideTurn=null;player.brakeTurn=null;player.naturalStop=null}
 if(flatGround&&hardBack&&!player.brakeTurn)startBrakeTurn(wish);
 if(player.brakeTurn){updateBrakeTurn(dt,wish)}else{
   const wantsSlide=flatGround&&player.turnHold&&Math.abs(input.x)>.18&&hsBefore>2.2;
   if(wantsSlide){if(!player.slideTurn)startSlideTurn(-Math.sign(input.x)||player.lastTurnSign);updateSlideTurn(dt,wish);player.naturalStop=null}
   else{
     if(player.slideTurn)finishSlideTurn();
     if(wish.lengthSq()>.01){player.naturalStop=null;player.stopPose=null;const targetYaw=Math.atan2(wish.x,wish.z),yawDelta=Math.atan2(Math.sin(targetYaw-player.yaw),Math.cos(targetYaw-player.yaw));if(Math.abs(input.x)>.12)player.lastTurnSign=Math.sign(input.x);const baseTurn=flatGround?THREE.MathUtils.lerp(7.5,3.85,THREE.MathUtils.clamp(hsBefore/20,0,1)):8,turnRate=player.steerLock>0?baseTurn*.22:baseTurn;player.yaw+=yawDelta*Math.min(1,dt*turnRate);
       if(flatGround){
         // Normal skating: strong wheel grip, readable carves, almost no lateral ice drift.
         const f=new THREE.Vector3(Math.sin(player.yaw),0,Math.cos(player.yaw)),r=new THREE.Vector3(-f.z,0,f.x);let fs=player.vel.dot(f),ss=player.vel.dot(r);ss*=Math.exp(-(7.0+Math.min(2.6,Math.abs(fs)*.10))*dt);fs*=Math.exp(-.06*dt);player.vel.x=f.x*fs+r.x*ss;player.vel.z=f.z*fs+r.z*ss;const drive=10.6*(.48+.52*intentMag);player.vel.addScaledVector(f,drive*dt);
       }else if(player.grounded&&surf.kind==='halfpipe'){
         const ax=halfpipeAxes(surf.half),inputCross=wish.dot(ax.cross),inputAlong=wish.dot(ax.along);
         if(player.halfpipeMode==='gutter'){
           player.vel.addScaledVector(ax.along,inputAlong*10.0*dt);player.vel.addScaledVector(ax.cross,inputCross*2.2*dt);
         }else{
           // In vert mode, input encourages the current cross-bowl line. Accidental opposite camera
           // projection is heavily softened so simply trying to ride the other wall cannot brake the cycle.
           const crossNow=player.vel.dot(ax.cross),sameCross=Math.sign(inputCross)===Math.sign(crossNow)||Math.abs(crossNow)<2.0,vertSteer=inputCross*(sameCross?5.2:.85);
           player.vel.addScaledVector(ax.cross,vertSteer*dt);player.vel.addScaledVector(ax.along,inputAlong*.65*dt);
         }
       }else{const accel=player.grounded?10:(player.vertAir?.55:5.4);player.vel.x+=wish.x*accel*dt;player.vel.z+=wish.z*accel*dt}
     }else if(player.grounded){
       if(flatGround){beginNaturalStop();updateNaturalStop(dt)}else if(surf.kind==='halfpipe'){const drag=Math.exp(-(player.halfpipeMode==='gutter'?.12:.035)*dt);player.vel.x*=drag;player.vel.z*=drag}else{const drag=Math.exp(-.24*dt);player.vel.x*=drag;player.vel.z*=drag}
     }
   }
 }
 let hs=Math.hypot(player.vel.x,player.vel.z),max=surf.kind==='halfpipe'?29.5:26.5;if(hs>max){player.vel.x*=max/hs;player.vel.z*=max/hs;hs=max}
 // TRUE VERT GRAMMAR:
 // 1) oscillation carries speed through the bowl;
 // 2) the coping is a deterministic converter from cross-speed -> Y-speed;
 // 3) a timed jump at/just after the coping adds a larger vertical pop;
 // 4) while vertAir is active, horizontal steering is deliberately tiny so the skater comes back into the same wall.
 let jumpConsumed=false;
 player.pumpEnergy=Math.max(0,player.pumpEnergy-dt*.42);
 const vertDropRequested=player.vertAir&&!player.grounded&&(input.y>.58||player.turnHold);
 if(vertDropRequested){player.vertAir=null;player.vertPopWindow=0;player.pumpEnergy*=.35;player.vel.y=Math.min(player.vel.y,.35);if(wishDir){player.vel.x+=wishDir.x*2.8;player.vel.z+=wishDir.z*2.8}player.comboName='VERT DROP';say('VERT DROP · FREE AIR');}
 if(player.vertAir&&!player.grounded){const lock=Math.exp(-7.5*dt);player.vel.x*=lock;player.vel.z*=lock}
 if(player.grounded&&surf.kind==='halfpipe'){
   const ax=halfpipeAxes(surf.half),inputCross=wish.dot(ax.cross),inputAlong=wish.dot(ax.along);let cross=player.vel.dot(ax.cross),along=player.vel.dot(ax.along),side=Math.sign(surf.u)||1;
   player.halfpipeDropCarry=Math.max(0,player.halfpipeDropCarry-dt);
   player.halfpipeRimLock=Math.max(0,player.halfpipeRimLock-dt);
   if(player.halfpipeRimHalf!==surf.half){player.halfpipeRimHalf=surf.half;player.halfpipeRimArmed=true;player.halfpipeRimSide=0;player.halfpipeRimLock=0;player.halfpipeRimStall=0;}
   if(!player.halfpipeRimArmed&&Math.abs(surf.u)<.72&&!player.jumpReleaseRequired&&!player.actionReleaseRequired){player.halfpipeRimArmed=true;player.halfpipeRimSide=0;player.halfpipeRimStall=0;}
   // v0.10.6L: a low-energy lip is not a valid resting state. Escape it ONCE, immediately.
   // This deliberately avoids an animated transition and any frame-to-frame sign flipping.
   const rimU=surf.rawU??surf.u,rimSide=Math.sign(rimU)||1,rimOutward=rimSide*cross;
   if(player.halfpipeMode==='vert'&&Math.abs(rimU)>.885&&rimOutward<6.8&&!player.vertAir&&player.halfpipeRimEscapeCooldown<=0){
     const alongOffset=new THREE.Vector3(player.pos.x-surf.half.cx,0,player.pos.z-surf.half.cz).dot(ax.along);
     if(forceHalfpipeRimEscape(surf.half,rimSide,alongOffset,0,'RIM ROLL-IN'))return;
   }
   player.halfpipeRimStall=0;
   if(player.halfpipeMode==='gutter'){
     // Deliberate drainage-line ride. Only this explicit mode is allowed to damp cross speed at center.
     const gutterGrip=Math.max(0,1-Math.abs(inputCross)*1.4);cross*=Math.exp(-(5.8*gutterGrip)*dt);along+=inputAlong*(6.4*gutterGrip)*dt;
     if(Math.abs(inputCross)>.44||Math.abs(cross)>5.0||Math.abs(surf.u)>.32){player.halfpipeMode='vert';player.halfpipeGutterHold=0;}
   }else{
     // CLEAN FAST: only tiny center chatter is neutralized. Normal/high-speed VERT is the proven baseline.
     const noOscillationCenter=Math.abs(surf.u)<.12&&Math.abs(cross)<1.25&&Math.abs(inputCross)<.22&&player.halfpipeDropCarry<=0&&player.halfpipeRimLock<=0;
     if(noOscillationCenter){cross*=Math.exp(-8.5*dt);if(Math.abs(cross)<.07)cross=0;along*=Math.exp(-1.2*dt);}
     else{
       // VERT CYCLE: preserve cross-bowl energy and kill accidental longitudinal ejection.
       cross+=(-surf.u*15.2)*dt;
       const sameCross=Math.sign(inputCross)===Math.sign(cross)||Math.abs(cross)<2.0;cross+=inputCross*(sameCross?2.6:.45)*dt;
       along*=Math.exp(-3.4*dt);
       if(player.halfpipeDropCarry>0&&Math.abs(surf.u)<.42){const dir=player.halfpipeCrossSign||Math.sign(cross)||1,minCarry=THREE.MathUtils.lerp(9.2,11.6,player.halfpipeDropCarry);if(Math.sign(cross)===dir||Math.abs(cross)<1.2)cross=dir*Math.max(Math.abs(cross),minCarry);}
       if(player.halfpipeRimLock>0&&player.halfpipeRimSide){const inward=-player.halfpipeRimSide;cross=inward*Math.max(5.8,Math.abs(cross));along*=Math.exp(-7.0*dt);}
     }
   }
   player.vel.copy(ax.cross.clone().multiplyScalar(cross)).add(ax.along.clone().multiplyScalar(along));
   if(Math.abs(cross)>1.5)player.halfpipeCrossSign=Math.sign(cross);
   const outward=side*cross;
   if(player.turnHold&&player.halfpipeMode==='vert'&&Math.abs(surf.u)<.50&&Math.abs(cross)>3){const d=Math.sign(cross)||1;player.vel.addScaledVector(ax.cross,d*(13.5+player.pumpEnergy*.25)*dt);player.pumpEnergy=Math.min(10,player.pumpEnergy+6.8*dt);player.score+=10*dt;player.comboName='PUMP'}
   if(player.halfpipeRimArmed&&player.halfpipeRimLock<=0&&player.halfpipeRimStall<=.001&&Math.abs(surf.u)>.925&&outward>6.8){
     const timedPop=jumpPressed,extra=timedPop?(5.8+Math.min(2.2,player.pumpEnergy*.18)):0;
     const launch=THREE.MathUtils.clamp(10.8+outward*.58+player.pumpEnergy*.92+extra,12.8,timedPop?29.0:23.0);
     // Snap just inside the coping and kill BOTH forward directions. Only a tiny longitudinal residue remains.
     const alongOffset=new THREE.Vector3(player.pos.x-surf.half.cx,0,player.pos.z-surf.half.cz).dot(ax.along);
     const lipU=.995,lipCross=side*(surf.half.width*.5*lipU);
     player.pos.x=surf.half.cx+ax.along.x*alongOffset+ax.cross.x*lipCross;
     player.pos.z=surf.half.cz+ax.along.z*alongOffset+ax.cross.z*lipCross;
     player.pos.y=-surf.half.depth+surf.half.depth*(lipU*lipU);
     const tinyAlong=THREE.MathUtils.clamp(along,-1.1,1.1)*.12;
     player.vel.copy(ax.along.multiplyScalar(tinyAlong));player.vel.y=launch;
     player.grounded=false;player.vertAir={half:surf.half,side,energy:outward+player.pumpEnergy*.9};
     player.vertPopWindow=timedPop?0:.18;player.airTime=.01;player.airTricks=0;player.combo++;player.comboName=timedPop?'VERT POP':'VERT AIR';
     if(timedPop){jumpConsumed=true;addScore(260,'VERT POP');say('VERT POP! · '+Math.round(launch*3.6)+' km/h UP')}else say('VERT AIR · JUMP NOW FOR EXTRA POP');
     player.pumpEnergy*=.60;blip(timedPop?760:620,.11,.09,'square');
   }}
 // Forgiving 180 ms coyote window: a jump just after auto-vert still becomes extra HEIGHT, not a trick.
 if(jumpPressed&&!jumpConsumed&&player.vertAir&&!player.grounded&&player.vertPopWindow>0){
   player.vel.y=Math.min(29.0,player.vel.y+6.4+Math.min(1.8,player.vertAir.energy*.045));player.vertPopWindow=0;jumpConsumed=true;addScore(260,'VERT POP');say('VERT POP! · GO HIGH');blip(780,.10,.085,'square');
 }
 if(jumpPressed&&(player.slideTurn||player.brakeTurn||player.naturalStop)){player.slideTurn=null;player.brakeTurn=null;player.naturalStop=null;player.stopPose=null}
 const preJumpWall=nearWall(1.28);
 if(jumpPressed&&!jumpConsumed){if(player.grounded){if(preJumpWall&&tryStartWallRide(preJumpWall,wish))return;if(!maybePlant()){player.vel.y=8.35+Math.min(3.8,hs*.075+player.pumpEnergy*.28);player.grounded=false;player.airTime=.01;player.airTricks=0;player.comboName='AIR'}}else{const wh=nearWall(1.18);if(wh&&tryStartWallRide(wh,wish))return;if(wh&&tryMantle(wh,wish))return;if(wh&&hs<11&&wallJump(wh))return;doAirTrick()}}
 if(actionPressed&&!player.grounded)doAirTrick();
 // High-speed airborne skaters can naturally catch a wall ride while actively steering into the wall.
 if(!player.grounded&&hs>9.5){const wh=nearWall(1.0);if(wh&&tryStartWallRide(wh,wish))return}
 if(!player.grounded){player.airTime+=dt;player.spin+=player.spinVel*dt;player.spinVel*=Math.exp(-1.8*dt);player.vel.y-=18.2*dt;if(player.vel.y<4.7){const hit=closestRail(1.55+Math.min(.55,hs*.02));if(hit)enterGrind(hit)}}else{if(player.airTime>.15){const airBonus=Math.round(player.airTime*110+Math.abs(player.spin)*28+player.airTricks*70);addScore(airBonus,player.comboName||'LAND');if(player.airTime>.65)say('LAND +'+airBonus);player.airTime=0;player.airTricks=0;player.spin=0;player.spinVel=0}}
 const oldPos=player.pos.clone();player.pos.addScaledVector(player.vel,dt);
 // Catch recontact in the same frame the descending VERT trajectory reaches the curved surface.
 tryResolveVertAirRecontact();
 // Ledge catch: when hands can reach a solid top and input is into it, convert the collision into a mantle.
 if(!player.grounded&&player.vel.y>-5){const wh=nearWall(.82);if(wh&&tryMantle(wh,wish))return}
 if(!player.wallRide&&!player.mantle){resolveSolidCollisions(oldPos);resolveThinWalls(oldPos);keepWithinWorld(oldPos)}
 // Skate contact follows continuous ramps/halfpipes downhill as well as uphill. Without this, curved surfaces become tiny accidental hops.
 if(player.grounded&&!player.vertAir){const follow=surfaceAt(player.pos.x,Math.max(oldPos.y,player.pos.y),player.pos.z),delta=follow.y-player.pos.y;if(follow.y>-900&&delta<1.05&&delta>-1.75){player.pos.y=follow.y;player.vel.y=0;player.groundKind=follow.kind}}
 resolveFloorSwept(oldPos);groundSanity();
 if(player.zone==='city'&&skylinePortalUnlocked&&player.portalCooldown<=0&&!player.grounded&&player.pos.y>=SKYLINE_PORTAL_MIN_AIR_Y&&hs>7&&sweptCollectsPoint(frameStartPlayerPos,player.pos,SKYLINE_PORTAL_POSITION,3.15))enterBonus();
 if(player.pos.y<(player.zone==='bonus'?65:-16)||Math.abs(player.pos.x)>155||player.pos.z>150||player.pos.z<-345)respawn(false);
}

// Idle dance is retained, but locomotion now uses a real inline-skate stance and articulated joints.
const dance={idleFor:0,time:0,blend:0},skateMotion={phase:0,turn:0},TAU=Math.PI*2;function ease01(v){v=THREE.MathUtils.clamp(v,0,1);return v*v*(3-2*v)}
function idleDancePose(time){const p={la:[0,0,0],ra:[0,0,0],ll:[0,0,0],rl:[0,0,0],body:[0,0,0],pos:[0,0,0],lLegPos:[0,0,0],rLegPos:[0,0,0],torsoX:0};const loop=16,local=((time%loop)+loop)%loop,seg=Math.floor(local/2),u=(local%2)/2,e=ease01(u),beat=local*TAU*1.55,bounce=(1-Math.cos(beat*2))*.5;if(seg===0){const s=Math.sin(beat);p.body[2]=s*.10;p.body[1]=-s*.12;p.pos[0]=s*.10;p.pos[1]=bounce*.07;p.la=[.18+s*.34,0,.42+s*.24];p.ra=[-.18-s*.34,0,-.42+s*.24];p.ll=[-.08-s*.12,0,-s*.08];p.rl=[.08+s*.12,0,s*.08]}else if(seg===1){const q=Math.sin(u*TAU),c=Math.cos(u*TAU);p.body[1]=q*.30;p.body[2]=c*.08;p.pos[1]=bounce*.065;p.la=[.65+c*.42,.18,-.95+q*.42];p.ra=[-.25-q*.28,-.12,.55+c*.38];p.torsoX=.06*c}else if(seg===2){const q=Math.sin(beat),a=Math.abs(Math.sin(beat));p.pos[0]=q*.15;p.pos[1]=a*.08;p.body[1]=-q*.22;p.la=[q*.34,0,.55];p.ra=[-q*.34,0,-.55];p.ll=[-.25*q,0,.12*q];p.rl=[.25*q,0,-.12*q];p.lLegPos=[-.08*q,-.03*a,.12*q];p.rLegPos=[.08*q,-.03*(1-a),-.12*q]}else if(seg===3){const a=u*TAU,c=Math.cos(a),sn=Math.sin(a);p.pos[1]=bounce*.06;p.body[1]=-sn*.34;p.body[2]=c*.08;p.la=[.42+sn*.72,0,1.30*c];p.ra=[-.42-sn*.72,0,-1.30*c]}else if(seg===4){const hit=Math.sin(beat*2)>=0?1:-1,pop=Math.abs(Math.sin(beat*2));p.pos[1]=pop*.07;p.body[1]=hit*.24;p.la=[hit*.35,hit*.22,hit>0?1.12:-.72];p.ra=[-hit*.35,-hit*.18,hit>0?-.72:1.12]}else if(seg===5){const q=Math.sin(beat),a=Math.abs(q);p.pos[0]=q*.12;p.pos[1]=-.07+a*.08;p.body[2]=-q*.16;p.la=[-.15+q*.24,0,.88-q*.18];p.ra=[.15-q*.24,0,-.88-q*.18]}else if(seg===6){const lift=Math.sin(Math.PI*u),spin=e*TAU;p.pos[1]=lift*.10;p.body[1]=spin;p.la=[-.15-lift*.30,0,.35+lift*2.15];p.ra=[.15+lift*.30,0,-.35-lift*2.15]}else{const hold=Math.sin(Math.PI*e);p.pos[1]=hold*.05;p.body[1]=-.28*hold;p.body[2]=.12*hold;p.la=[-.22,0,2.40*hold];p.ra=[.38,0,-.78*hold]}return p}
function updateRig(dt,t){
 skater.position.copy(player.pos);skater.rotation.y=player.yaw+Math.PI;const sf=surfaceAt(player.pos.x,player.pos.y+4,player.pos.z);shadow.position.set(player.pos.x,Math.max(-10,sf.y+.025),player.pos.z);
 const hs=Math.hypot(player.vel.x,player.vel.z),speed01=THREE.MathUtils.clamp(hs/18,0,1),intent=Math.min(1,Math.hypot(input.x,input.y)),groundMove=player.grounded&&!player.grind&&!player.wallRide&&!player.mantle;
 // Wheels roll on their own axle. Four wheels per foot are aligned in one line.
 const wheelSpin=hs*dt*4.25;skates.forEach(w=>w.rotation.y-=wheelSpin);
 // Heel jets punctuate committed TURN / BRAKE movement, never a skateboard-like prop.
 const jetOn=(player.turnHold||player.slideTurn||player.brakeTurn)&&hs>2.2&&!player.mantle;jetGlows.forEach((g,i)=>{g.visible=jetOn;const pulse=1+(Math.sin(t*.025+i*1.7)+1)*.28;g.scale.set(.72,pulse*.72,pulse*1.65);g.material.opacity=.48+.30*Math.sin(t*.02+i)});

 // The skating cycle is lateral weight transfer, not a running walk cycle.
 if(groundMove&&hs>.45&&intent>.05)skateMotion.phase+=dt*(4.0+Math.min(4.8,hs*.26));
 skateMotion.turn+=(THREE.MathUtils.clamp(input.x,-1,1)*speed01-skateMotion.turn)*(1-Math.exp(-8*dt));
 const ph=skateMotion.phase,s=Math.sin(ph),leftPush=Math.max(0,s),rightPush=Math.max(0,-s),glide=Math.cos(ph),pushScale=speed01,turn=skateMotion.turn;
 const committed=(player.slideTurn||player.brakeTurn)?1:0,crouch=groundMove?(.24+.16*speed01+.11*committed):(!player.grounded?.16:.20),baseKnee=.50+crouch*.62;
 const strideActive=groundMove&&hs>.55?1:0;
 const lOut=leftPush*.34*pushScale*strideActive,rOut=rightPush*.34*pushScale*strideActive;
 const lBack=leftPush*.14*pushScale*strideActive,rBack=rightPush*.14*pushScale*strideActive;
 const weightShift=(rightPush-leftPush)*.065*strideActive;

 // Base skate stance: one foot subtly ahead, knees forward, shoulders slightly forward.
 leftLeg.position.set(-.35-lOut*.10+weightShift,1.52-crouch*.08,-.055-lBack+glide*.035*strideActive);
 rightLeg.position.set(.35+rOut*.10+weightShift,1.52-crouch*.08,.055-rBack-glide*.035*strideActive);
 leftLeg.rotation.set(.20+crouch*.22-leftPush*.08,turn*.045,-lOut-.035*turn);
 rightLeg.rotation.set(.20+crouch*.22-rightPush*.08,turn*.045,rOut-.035*turn);
 leftShin.rotation.set(-baseKnee+leftPush*.22-rightPush*.08,0,.02+lOut*.18);
 rightShin.rotation.set(-baseKnee+rightPush*.22-leftPush*.08,0,-.02-rOut*.18);
 skateRoots[0].rotation.set(.08+crouch*.08-leftPush*.07,-leftPush*.15+turn*.10,-turn*.12-lOut*.08);
 skateRoots[1].rotation.set(.08+crouch*.08-rightPush*.07,rightPush*.15+turn*.10,-turn*.12+rOut*.08);

 // Arms counter the skating stride, with visible elbow bends for a readable athletic silhouette.
 const armSwing=.26*speed01*strideActive,armBalance=.14+.18*speed01;
 leftArm.rotation.set(-.18-armSwing*s,0,.16+armBalance+turn*.10);
 rightArm.rotation.set(-.18+armSwing*s,0,-.16-armBalance+turn*.10);
 leftForeArm.rotation.set(.60+.16*speed01-leftPush*.10,0,.06);
 rightForeArm.rotation.set(.60+.16*speed01-rightPush*.10,0,-.06);

 // Carving is shown through the whole body and both skate edges. Skating stays low and calm rather than bobbing like a jog.
 const balanceVisualLean=player.grind?THREE.MathUtils.clamp(player.balance*.52+player.balanceVel*.20,-.62,.62):0,grindLean=balanceVisualLean,rideLean=player.wallRide?.normal?(player.wallRide.normal.x+player.wallRide.normal.z)*-.58:0,airLean=!player.grounded?-.11:0;
 rig.rotation.x=airLean-(groundMove?.055+.065*speed01:0);rig.rotation.y=player.spin;rig.rotation.z=grindLean+rideLean-turn*.17;
 rig.position.x=weightShift-turn*.025;rig.position.y=groundMove?Math.abs(Math.sin(ph*2))*.012*speed01:0;
 torso.rotation.x=-.04-.06*speed01-.055*committed;

 // Variable TURN powerslide: the hips move outside the arc while the wheels visibly lag and re-grip.
 if(player.slideTurn){const st=player.slideTurn,sgn=st.sign,slide=THREE.MathUtils.clamp(.32+st.slip*.92,0,1),pulse=.78+.22*Math.sin(Math.min(Math.PI,st.time*5));
   rig.rotation.z-=sgn*(.24+.20*speed01)*slide;rig.rotation.x-=.08*slide;torso.rotation.x-=.12*slide;rig.position.x-=sgn*.13*slide;
   const outerRight=sgn<0;if(outerRight){rightLeg.rotation.x+=.30*slide;rightShin.rotation.x-=.34*slide;leftLeg.rotation.x+=.17*slide;leftShin.rotation.x-=.18*slide}else{leftLeg.rotation.x+=.30*slide;leftShin.rotation.x-=.34*slide;rightLeg.rotation.x+=.17*slide;rightShin.rotation.x-=.18*slide}
   leftLeg.rotation.z-=sgn*.14*slide;rightLeg.rotation.z-=sgn*.14*slide;skateRoots[0].rotation.y+=sgn*(.28+.20*st.slip)*slide;skateRoots[1].rotation.y+=sgn*(.34+.20*st.slip)*slide;skateRoots[0].rotation.z-=sgn*.23*slide;skateRoots[1].rotation.z-=sgn*.26*slide;
   leftArm.rotation.z+=sgn*.68*slide*pulse;rightArm.rotation.z+=sgn*.82*slide*pulse;leftForeArm.rotation.x+=.26*slide;rightForeArm.rotation.x+=.30*slide;
 }
 // Hard-back brake: low knees, one foot shoots ahead, both skates go broadside, then the torso completes the 180.
 if(player.brakeTurn){const br=player.brakeTurn,u=THREE.MathUtils.clamp(br.time/br.duration,0,1),sgn=br.sign,hit=Math.sin(Math.PI*u),cross=Math.sin(Math.PI*THREE.MathUtils.clamp(u*1.12,0,1));
   rig.rotation.x-=.17*hit;rig.rotation.z-=sgn*.22*hit;torso.rotation.x-=.18*hit;rig.position.x-=sgn*.08*hit;
   leftLeg.rotation.x+=.34*hit;rightLeg.rotation.x+=.40*hit;leftShin.rotation.x-=.38*hit;rightShin.rotation.x-=.42*hit;
   leftLeg.position.z-=sgn>0?.02:.22*hit;rightLeg.position.z-=sgn>0?.22*hit:.02;skateRoots[0].rotation.y+=sgn*1.12*cross;skateRoots[1].rotation.y+=sgn*1.22*cross;skateRoots[0].rotation.z-=sgn*.17*hit;skateRoots[1].rotation.z-=sgn*.20*hit;
   leftArm.rotation.z+=sgn*.70*hit;rightArm.rotation.z+=sgn*.70*hit;leftForeArm.rotation.x+=.34*hit;rightForeArm.rotation.x+=.34*hit;
 }
 // Releasing movement at speed performs a short natural skate stop instead of a long shopping-cart coast.
 if(player.naturalStop){const ns=player.naturalStop,sgn=ns.sign,k=THREE.MathUtils.clamp(Math.hypot(player.vel.x,player.vel.z)/Math.max(.1,ns.startSpeed),0,1),stop=1-k;
   rig.rotation.x-=.08*stop;rig.rotation.z-=sgn*.10*stop;rightLeg.rotation.x+=.16*stop;rightShin.rotation.x-=.24*stop;skateRoots[1].rotation.y+=sgn*.42*stop;skateRoots[1].rotation.z-=sgn*.12*stop;rightArm.rotation.z+=sgn*.22*stop;
 }
 if(player.stopPose){player.stopPose.time+=dt;const sp=player.stopPose,u=THREE.MathUtils.clamp(sp.time/sp.duration,0,1),hold=1-ease01(u),sgn=sp.sign;rig.rotation.z-=sgn*.12*hold;rig.rotation.y+=sgn*.20*hold;skateRoots[0].rotation.y+=sgn*.26*hold;skateRoots[1].rotation.y+=sgn*.42*hold;leftArm.rotation.z+=sgn*.26*hold;rightArm.rotation.z+=sgn*.36*hold;if(u>=1)player.stopPose=null}
 // Grinds get a deliberately stable, wide, bent-knee stance with free arms.
 if(player.grind){const bal=THREE.MathUtils.clamp(player.balance,-1,1),danger=THREE.MathUtils.clamp(player.balanceDanger/.72,0,1);leftLeg.rotation.x=.42;rightLeg.rotation.x=.42;leftLeg.rotation.z=-.11-bal*.12;rightLeg.rotation.z=.11-bal*.12;leftShin.rotation.x=-.72;rightShin.rotation.x=-.72;leftArm.rotation.set(-.15,0,.92-bal*.58-danger*.10*Math.sign(bal||1));rightArm.rotation.set(-.15,0,-.92-bal*.58-danger*.10*Math.sign(bal||1));leftForeArm.rotation.x=.42+Math.max(0,bal)*.18;rightForeArm.rotation.x=.42+Math.max(0,-bal)*.18;skateRoots[0].rotation.z=-.10-bal*.14;skateRoots[1].rotation.z=.10-bal*.14;rig.position.x+=bal*.13;torso.rotation.z=-bal*.10}
 // In normal airtime the legs tuck slightly and the arms open before a trick overrides the pose below.
 if(!player.grounded&&!player.grind&&!player.wallRide&&!player.mantle){leftLeg.rotation.x=.38;rightLeg.rotation.x=.34;leftShin.rotation.x=-.72;rightShin.rotation.x=-.68;leftArm.rotation.z=.68;rightArm.rotation.z=-.68;leftForeArm.rotation.x=.45;rightForeArm.rotation.x=.45}

 // Idle dance blends over the athletic base only after the skater has truly stopped.
 const noIntent=Math.abs(input.x)<.06&&Math.abs(input.y)<.06&&!input.jump&&!player.turnHold&&!player.action,canDance=player.grounded&&!player.grind&&!player.wallRide&&!player.mantle&&!player.slideTurn&&!player.brakeTurn&&hs<.34&&noIntent;dance.idleFor=canDance?dance.idleFor+dt:0;const want=dance.idleFor>.08?1:0;dance.blend+=(want-dance.blend)*(1-Math.exp(-(want?13.5:14)*dt));if(want||dance.blend>.03)dance.time+=dt;else dance.time=0;
 const d=idleDancePose(dance.time),b=dance.blend,L=THREE.MathUtils.lerp;if(b>.001){leftArm.rotation.x=L(leftArm.rotation.x,d.la[0],b);leftArm.rotation.y=L(leftArm.rotation.y,d.la[1],b);leftArm.rotation.z=L(leftArm.rotation.z,d.la[2],b);rightArm.rotation.x=L(rightArm.rotation.x,d.ra[0],b);rightArm.rotation.y=L(rightArm.rotation.y,d.ra[1],b);rightArm.rotation.z=L(rightArm.rotation.z,d.ra[2],b);leftLeg.rotation.x=L(leftLeg.rotation.x,d.ll[0],b);leftLeg.rotation.z=L(leftLeg.rotation.z,d.ll[2],b);rightLeg.rotation.x=L(rightLeg.rotation.x,d.rl[0],b);rightLeg.rotation.z=L(rightLeg.rotation.z,d.rl[2],b);leftLeg.position.x=L(leftLeg.position.x,-.35+d.lLegPos[0],b);leftLeg.position.y=L(leftLeg.position.y,1.52+d.lLegPos[1],b);leftLeg.position.z=L(leftLeg.position.z,d.lLegPos[2],b);rightLeg.position.x=L(rightLeg.position.x,.35+d.rLegPos[0],b);rightLeg.position.y=L(rightLeg.position.y,1.52+d.rLegPos[1],b);rightLeg.position.z=L(rightLeg.position.z,d.rLegPos[2],b);rig.rotation.y=L(rig.rotation.y,d.body[1],b);rig.rotation.z=L(rig.rotation.z,d.body[2],b);rig.position.x=L(rig.position.x,d.pos[0],b);rig.position.y=L(rig.position.y,d.pos[1],b);torso.rotation.x=L(torso.rotation.x,d.torsoX,b);leftShin.rotation.x=L(leftShin.rotation.x,-.42,b);rightShin.rotation.x=L(rightShin.rotation.x,-.42,b);leftForeArm.rotation.x=L(leftForeArm.rotation.x,.52,b);rightForeArm.rotation.x=L(rightForeArm.rotation.x,.52,b)}

 if(player.trickTimer>0&&!player.grounded){const u=1-player.trickTimer/player.trickDuration;
   if(player.trickStyle===0){
     // JET TUCK GRAB: articulated knees come toward the chest and hands reach down toward the skates.
     const grab=Math.sin(Math.PI*THREE.MathUtils.clamp(u*1.08,0,1));
     leftArm.rotation.x+=1.25*grab;leftArm.rotation.z+=.42*grab;rightArm.rotation.x+=1.20*grab;rightArm.rotation.z-=.42*grab;leftForeArm.rotation.x+=1.10*grab;rightForeArm.rotation.x+=1.10*grab;
     leftLeg.rotation.x+=.74*grab;rightLeg.rotation.x+=.68*grab;leftShin.rotation.x-=.86*grab;rightShin.rotation.x-=.82*grab;leftLeg.rotation.z+=.22*grab;rightLeg.rotation.z-=.22*grab;
     rig.rotation.x-=.34*grab;rig.position.y+=.16*grab;
   }else{
     // SCISSOR TWIST: open silhouette, opposite legs, free arms and visible ankle separation.
     const phase=u*TAU,sc=Math.sin(phase),flare=Math.sin(Math.PI*THREE.MathUtils.clamp(u,0,1));
     leftArm.rotation.z+=1.24*flare;rightArm.rotation.z-=1.24*flare;leftArm.rotation.x+=.30*sc;rightArm.rotation.x-=.30*sc;leftForeArm.rotation.x=.35+.35*flare;rightForeArm.rotation.x=.35+.35*flare;
     leftLeg.rotation.x+=.68*sc*flare;rightLeg.rotation.x-=.68*sc*flare;leftLeg.rotation.z+=.42*flare;rightLeg.rotation.z-=.42*flare;leftShin.rotation.x=-.45-.30*flare;rightShin.rotation.x=-.45-.30*flare;
     skateRoots[0].rotation.z+=.32*flare;skateRoots[1].rotation.z-=.32*flare;rig.rotation.z+=.42*sc*flare;rig.rotation.x+=.14*flare;
   }}
 if(player.mantle){const u=THREE.MathUtils.clamp(player.mantle.time/player.mantle.duration,0,1),pull=Math.sin(Math.PI*u);leftArm.rotation.x=-1.55*pull;rightArm.rotation.x=-1.55*pull;leftForeArm.rotation.x=-.85*pull;rightForeArm.rotation.x=-.85*pull;leftLeg.rotation.x=.42*pull;rightLeg.rotation.x=.42*pull;leftShin.rotation.x=-.75*pull;rightShin.rotation.x=-.75*pull;rig.rotation.x=-.25*pull}
}
function updateCamera(dt){const speed=player.grind?player.grindSpeed:Math.hypot(player.vel.x,player.vel.z);let dir;if(player.grind)dir=player.grind.curve.getTangentAt(THREE.MathUtils.clamp(player.grindT,0,1)).normalize().multiplyScalar(player.grindDir);else if(player.wallRide)dir=player.wallRide.tangent.clone();else if(speed>1.2)dir=new THREE.Vector3(player.vel.x,0,player.vel.z).normalize();else dir=new THREE.Vector3(Math.sin(player.yaw),0,Math.cos(player.yaw));dir.y=0;if(dir.lengthSq()<.01)dir.set(Math.sin(player.yaw),0,Math.cos(player.yaw));dir.normalize();
 const cameraMoveIntent=Math.hypot(input.x,input.y);if(cameraOrbitLock&&cameraMoveIntent>.25&&speed>2.4)cameraOrbitLock=false;const chaseYaw=Math.atan2(dir.x,dir.z),idleShowcase=!player.grind&&!player.wallRide&&!player.mantle&&!player.vertAir&&!player.slideTurn&&!player.brakeTurn&&cameraMoveIntent<.14&&speed<2.25,manual=cameraOrbitLock||idleShowcase||performance.now()<cameraManualUntil,autoRate=player.grind?11:player.wallRide?9:speed>12?5.8:speed>5?3.1:1.25;
 // IDLE CAMERA OWNERSHIP: once the skater is effectively stopped, never steal the orbit back.
 // This lets the player rotate to the front/side and watch the full dance indefinitely.
 if(!manual){const delta=Math.atan2(Math.sin(chaseYaw-cameraYaw),Math.cos(chaseYaw-cameraYaw));cameraYaw+=delta*(1-Math.exp(-autoRate*dt))}
 const chaseF=new THREE.Vector3(Math.sin(cameraYaw),0,Math.cos(cameraYaw)),grind=!!player.grind,distance=grind?7.25:idleShowcase?8.0:8.6+Math.min(3.1,speed*.085),pitch=grind?.10:idleShowcase?cameraPitch:THREE.MathUtils.lerp(cameraPitch,.145,Math.min(1,speed/22)),flat=Math.cos(pitch),lead=grind?1.65:idleShowcase?0:Math.min(2.5,speed*.075),target=player.pos.clone().add(new THREE.Vector3(0,grind?1.25:idleShowcase?1.68:1.75,0)).addScaledVector(dir,lead),desired=target.clone().add(new THREE.Vector3(-chaseF.x*distance*flat,Math.sin(pitch)*distance+(grind?1.05:idleShowcase?1.35:1.65),-chaseF.z*distance*flat));
 const smoothing=1-Math.exp(-(grind?10.5:idleShowcase?7.5:speed>8?7.2:5.2)*dt);camera.position.lerp(desired,smoothing);camera.lookAt(target);const wantedFov=grind?74:idleShowcase?64:68+Math.min(9,speed*.32);camera.fov+=(wantedFov-camera.fov)*(1-Math.exp(-(idleShowcase?6:4.5)*dt));camera.updateProjectionMatrix()}
function updateHUD(){const raw=player.grind?player.grindSpeed:Math.hypot(player.vel.x,player.vel.z);document.getElementById('speed').textContent=Math.round(raw*3.6);document.getElementById('score').textContent=Math.floor(player.score).toLocaleString();document.getElementById('comboText').textContent=player.wallRide?'WALL RIDE':player.mantle?'CLIMB':player.grind?'GRIND x'+Math.max(1,player.combo):player.combo>1?'LINE x'+player.combo:'FREE SKATE';document.getElementById('trickText').textContent=player.comboName||'BUILD A LINE';const bw=document.getElementById('balanceWrap'),bn=document.getElementById('balanceNeedle'),bl=document.getElementById('balanceLabel');bw.classList.toggle('on',!!player.grind);bn.style.left=(50+THREE.MathUtils.clamp(player.balance,-1,1)*46)+'%';if(player.grind&&player.balanceDanger>.18){const d=THREE.MathUtils.clamp(player.balanceDanger/.72,0,1),side=player.balance<0?'LEFT':player.balance>0?'RIGHT':'CENTER',correct=player.balance<0?'RIGHT':player.balance>0?'LEFT':'CENTER';bl.textContent=d>.72?`DANGER · LEAN ${side} → STICK ${correct}!`:`RECENTER · LEAN ${side} → STICK ${correct}`;bw.style.filter=`drop-shadow(0 0 ${4+10*d}px rgba(255,80,90,${.25+.55*d}))`;}else{bl.textContent='GRIND BALANCE · COUNTER-STEER THE LEAN';bw.style.filter='none'}}


// ---------- LEAN CHALLENGE RUNTIME ----------
// Feed build: no garage, crew, multiplayer, persistence, QA harness or zone transitions.
let multiplayer=null;
function persistRuntimeState(){return sharedWorldState}
function updateDistrictGate(){}

const keys={};
addEventListener('keydown',e=>{keys[e.code]=true;if(e.code==='Space')e.preventDefault();if(e.code==='KeyE')player.action=true});
addEventListener('keyup',e=>{keys[e.code]=false;if(e.code==='KeyE')player.action=false});
function desktopInput(){input.x=(keys.KeyD?1:0)-(keys.KeyA?1:0);input.y=(keys.KeyS?1:0)-(keys.KeyW?1:0);input.jump=!!keys.Space;player.turnHold=!!keys.ShiftLeft||!!keys.ShiftRight}
let dragging=false,lastX=0,lastY=0;
renderer.domElement.addEventListener('pointerdown',e=>{if(touch)return;dragging=true;cameraOrbitLock=true;cameraManualUntil=performance.now()+1400;lastX=e.clientX;lastY=e.clientY});
addEventListener('pointerup',()=>dragging=false);
addEventListener('pointermove',e=>{if(!dragging||touch)return;const dx=e.clientX-lastX,dy=e.clientY-lastY;lastX=e.clientX;lastY=e.clientY;cameraOrbitLock=true;cameraManualUntil=performance.now()+1400;cameraYaw-=dx*.0045;cameraPitch=THREE.MathUtils.clamp(cameraPitch-dy*.003,-.30,.60)});
const stickBase=document.getElementById('stickBase'),stick=document.getElementById('stick'),lookPad=document.getElementById('lookPad');
let stickId=null,lookId=null,center={x:0,y:0},lookLast={x:0,y:0};
function stickMove(e){const dx=e.clientX-center.x,dy=e.clientY-center.y,lim=43,l=Math.hypot(dx,dy),s=l>lim?lim/l:1,nx=dx*s,ny=dy*s;stick.style.transform=`translate(${nx}px,${ny}px)`;input.x=nx/lim;input.y=ny/lim}
stickBase.addEventListener('pointerdown',e=>{stickId=e.pointerId;stickBase.setPointerCapture(e.pointerId);const r=stickBase.getBoundingClientRect();center={x:r.left+r.width/2,y:r.top+r.height/2};stickMove(e)});
stickBase.addEventListener('pointermove',e=>{if(e.pointerId===stickId)stickMove(e)});
function stickUp(e){if(e.pointerId!==stickId)return;stickId=null;input.x=input.y=0;stick.style.transform=''}
stickBase.addEventListener('pointerup',stickUp);stickBase.addEventListener('pointercancel',stickUp);
lookPad.addEventListener('pointerdown',e=>{lookId=e.pointerId;cameraOrbitLock=true;cameraManualUntil=performance.now()+1400;lookPad.setPointerCapture(e.pointerId);lookLast={x:e.clientX,y:e.clientY}});
lookPad.addEventListener('pointermove',e=>{if(e.pointerId!==lookId)return;const dx=e.clientX-lookLast.x,dy=e.clientY-lookLast.y;lookLast={x:e.clientX,y:e.clientY};cameraOrbitLock=true;cameraManualUntil=performance.now()+1400;cameraYaw-=dx*.006;cameraPitch=THREE.MathUtils.clamp(cameraPitch-dy*.004,-.30,.60)});
lookPad.addEventListener('pointerup',e=>{if(e.pointerId===lookId)lookId=null});
function hold(id,set){const el=document.getElementById(id);const on=e=>{e.preventDefault();set(true);el.classList.add('active');el.setPointerCapture?.(e.pointerId)};const off=e=>{e.preventDefault();set(false);el.classList.remove('active')};el.addEventListener('pointerdown',on);el.addEventListener('pointerup',off);el.addEventListener('pointercancel',off)}
hold('jumpBtn',v=>input.jump=v);hold('boostBtn',v=>player.turnHold=v);hold('sprayBtn',v=>player.action=v);

// ---------- KNOW YOUR SLOP CHALLENGE ADAPTER v2 ----------
// Kloojo exposes semantic gameplay events once. KYS can then create/replay seeded encounters
// without rewriting the game source. Challenge sessions are ephemeral and never write profile/progression state.
const KYS_KLOOJO_VERSION='kloojo-kys-v2.2.0';
const KYS_LAUNCH=new URLSearchParams(location.search);
const KYS_REQUESTED=KLOOJO_ZONE_ID==='development'&&(KYS_LAUNCH.get('kys')==='1'||KYS_LAUNCH.get('mode')==='challenge');
const KYS_PLAYER_SPAWNS=KLOOJO_PLAYER_SPAWNS;
const KYS_BAG_SPAWNS=KLOOJO_BAG_SPAWNS;

function kysCoinId(c,index){return c.userData.kysId||(c.userData.kysId=`${c.userData.rail||'DISCOVERY'}:${c.userData.coinIndex??index}`)}
coins.forEach(kysCoinId);

function kysCaptureBase(){
 return {
  player:{pos:player.pos.toArray(),lastSafe:player.lastSafe.toArray(),yaw:player.yaw,score:player.score,zone:player.zone},
  coinsCollected,runnerBagsCollected,allGraffitiRewarded,
  coins:coins.map((c,i)=>({id:kysCoinId(c,i),collected:!!c.userData.collected,visible:c.visible,kysActive:c.userData.kysActive})),
  bags:runnerBags.map(b=>({pos:b.position.toArray(),rot:b.rotation.toArray(),collected:!!b.userData.collected,visible:b.visible,kysActive:b.userData.kysActive,kysSpawnId:b.userData.kysSpawnId})),
  graffiti:driveByGraffitiSpots.map(g=>({id:g.id,done:!!g.done,roomDone:!!g.roomDone,asset:g.asset,opacity:g.face.material.opacity,map:g.face.material.map,indicator:g.indicator?.visible??false,kysActive:g.kysActive,textureState:g.textureState,kysWinnerTrace:g.kysWinnerTrace||null})),
  tagIndicators:tagWalls.map(t=>t.indicator?.visible??false)
 };
}
function kysResetMotion(){
 player.vel.set(0,0,0);player.grind=null;player.wallRide=null;player.mantle=null;player.handplant=null;player.traversal=null;player.coil=false;
 player.slideTurn=null;player.brakeTurn=null;player.naturalStop=null;player.stopPose=null;player.vertAir=null;player.vertPopWindow=0;player.halfpipeRimLock=0;
 player.halfpipeRimArmed=true;player.halfpipeRimHalf=null;player.halfpipeRimSide=0;player.halfpipeRimStall=0;player.halfpipeRimTransition=null;player.halfpipeRimEscapeCooldown=0;
 player.balance=0;player.balanceDanger=0;player.balanceSide=0;player.airTime=0;player.airTricks=0;player.spin=0;player.spinVel=0;player.trickTimer=0;player.trickCooldown=0;
 player.jumpReleaseRequired=!!input.jump;player.actionReleaseRequired=!!player.action;vertFreedom.rotation=0;vertFreedom.airFromHalfpipe=false;vertFreedom.energy=0;
 traversalRuntime.transferWindow=0;traversalRuntime.lastWall=null;
}
function kysRestoreBase(){
 const b=kysChallengeBaseSnapshot;if(!b)return;
 coinsCollected=b.coinsCollected;runnerBagsCollected=b.runnerBagsCollected;allGraffitiRewarded=b.allGraffitiRewarded;
 player.pos.fromArray(b.player.pos);player.lastSafe.fromArray(b.player.lastSafe);player.yaw=b.player.yaw;player.score=b.player.score;player.zone=b.player.zone;kysResetMotion();
 coins.forEach((c,i)=>{const x=b.coins[i];if(!x)return;c.userData.collected=x.collected;c.visible=x.visible;c.userData.kysActive=x.kysActive});
 runnerBags.forEach((bag,i)=>{const x=b.bags[i];if(!x)return;bag.position.fromArray(x.pos);bag.rotation.fromArray(x.rot);bag.userData.collected=x.collected;bag.visible=x.visible;bag.userData.kysActive=x.kysActive;bag.userData.kysSpawnId=x.kysSpawnId});
 driveByGraffitiSpots.forEach((g,i)=>{const x=b.graffiti[i];if(!x)return;g.done=x.done;g.roomDone=x.roomDone;g.asset=x.asset;g.face.material.opacity=x.opacity;g.face.material.map=x.map||null;g.face.material.needsUpdate=true;g.indicator.visible=x.indicator;g.kysActive=x.kysActive;g.textureState=x.textureState;g.kysWinnerTrace=x.kysWinnerTrace||null});
 tagWalls.forEach((t,i)=>{if(t.indicator)t.indicator.visible=b.tagIndicators[i]??false});
 document.getElementById('coinCount').textContent=coinsCollected;document.getElementById('coinTotal').textContent=coins.length;
 document.getElementById('bagCount').textContent=runnerBagsCollected;document.getElementById('bagTotal').textContent=runnerBags.length;
 updateGraffitiCounter();updateHUD();
}
function kysChooseAllowed(list,difficulty,seed){const allowed=list.filter(x=>(x.difficulty||1)<=Math.max(1,Number(difficulty)||3));return seededShuffle(allowed.length?allowed:list,seed)[0]}
function kysGraffitiPool(difficulty){const d=Math.max(1,Number(difficulty)||3),allowed=driveByGraffitiSpots.filter(g=>graffitiDifficulty(g.id,!!g.requiresWallRide)<=d);return allowed.length?allowed:driveByGraffitiSpots}
function generateKloojoEncounter(seed=Date.now(),requestedDifficulty=null){
 return generateKloojoEncounterFromCatalog({
  seed,requestedDifficulty,
  graffiti:driveByGraffitiSpots.map(g=>({id:g.id,requiresWallRide:!!g.requiresWallRide})),
  coins:coins.filter(c=>!c.userData.bonusRail&&(c.userData.zone||'city')==='city').map((c,i)=>({id:kysCoinId(c,coins.indexOf(c))}))
 });
}

function kysPrepareEncounter(encounter){
 if(!kysChallengeBaseSnapshot)kysChallengeBaseSnapshot=kysCaptureBase();
 kysChallengeSession=false;running=false;kysRestoreBase();kysChallengeSession=true;
 const setup=encounter.setup||{},difficulty=encounter.difficulty||3;
 player.score=0;kysRunStats={respawns:0,maxSpeedKmh:0,scoreStart:0};
 const spawn=KYS_PLAYER_SPAWNS.find(x=>x.id===setup.playerSpawn)||kysChooseAllowed(KYS_PLAYER_SPAWNS,difficulty,encounter.seed+':fallback-player');
 player.zone='city';zone=KLOOJO_ZONE_LABEL;document.getElementById('zone').textContent=zone;player.pos.set(...spawn.pos);player.lastSafe.copy(player.pos);player.yaw=spawn.yaw;kysResetMotion();
 // Challenge collectibles are an ephemeral projection. Inactive objects disappear; retry rebuilds the same projection from the seed.
 coinsCollected=0;const coinIds=new Set(setup.coinIds||[]);coins.forEach((c,i)=>{const active=coinIds.has(kysCoinId(c,i));c.userData.kysActive=active;c.userData.collected=!active;c.userData.roomCollected=false;c.visible=active});
 document.getElementById('coinCount').textContent='0';document.getElementById('coinTotal').textContent=String(coinIds.size);
 runnerBagsCollected=0;runnerBags.forEach(b=>{b.userData.kysActive=false;b.userData.collected=true;b.visible=false});
 const bagSpawn=KYS_BAG_SPAWNS.find(x=>x.id===setup.bagSpawn);if(bagSpawn&&runnerBags[0]){const b=runnerBags[0];b.position.set(...bagSpawn.pos);b.userData.kysSpawnId=bagSpawn.id;b.userData.kysActive=true;b.userData.collected=false;b.visible=true;}
 document.getElementById('bagCount').textContent='0';document.getElementById('bagTotal').textContent=bagSpawn?'1':'0';
 const graffitiIds=new Set(setup.graffitiIds||[]),artOrder=seededShuffle(DRIVEBY_GRAFFITI_CONFIGS.map(x=>x.asset),encounter.seed+':art');let artIndex=0;
 driveByGraffitiSpots.forEach(g=>{const active=graffitiIds.has(g.id);g.kysActive=active;g.kysWinnerTrace=null;g.face.material.opacity=0;if(active){g.done=false;g.roomDone=false;g.indicator.visible=true;if(setup.shuffleGraffitiArt){g.asset=artOrder[artIndex++%artOrder.length];g.textureState='idle';g.face.material.map=null;g.face.material.needsUpdate=true;}}else if(g.indicator)g.indicator.visible=false});
 kysApplyWinnerTrace(encounter);
 tagWalls.forEach(t=>{if(t.indicator)t.indicator.visible=false});updateGraffitiCounter();
 document.getElementById('start').classList.add('hidden');updateHUD();
}

function kysFinishEncounter(result){
 running=false;
 // Result payload is sufficient for server leaderboards: exact challenge fingerprint + seed + elapsed milliseconds.
 if(result?.success)blip(1047,.14,.08,'triangle');
 if(kysLegacyHost&&window.parent&&window.parent!==window){try{window.parent.postMessage({type:result?.success?'kys:artifact:challenge-complete':'kys:artifact:challenge-fail',detail:{reason:result?.reason||'',elapsed_ms:result?.elapsedMs||0,seed:result?.seed,challenge_id:result?.challengeId,metrics:result?.metrics||{}}},'*')}catch{}}
}

function kysStopEncounter(){
 kysChallengeSession=false;kysRestoreBase();kysChallengeSession=false;running=false;kysLegacyHost=false;kysLegacyChallenge=null;
}

kysChallengeEngine=createKYSChallengeEngine({
 gameId:'kloojo',gameVersion:KYS_KLOOJO_VERSION,
 onPrepare:kysPrepareEncounter,
 onRunStart:()=>{ensureAudio();running=!kysFeedPaused;cameraManualUntil=performance.now()+300},
 onFinish:kysFinishEncounter,
 onStop:kysStopEncounter,
 getMetrics:()=>({scoreDelta:Math.max(0,Math.floor(player.score-kysRunStats.scoreStart)),respawns:kysRunStats.respawns,maxSpeedKmh:Math.round(kysRunStats.maxSpeedKmh),coins:coinsCollected,bags:runnerBagsCollected,graffiti:updateGraffitiCounter()})
});

function loadKloojoChallenge(encounterOrOptions={}){
 const encounter=encounterOrOptions.objectives?encounterOrOptions:generateKloojoEncounter(encounterOrOptions.seed??Date.now(),encounterOrOptions.difficulty??null);
 document.getElementById('start').classList.add('hidden');kysChallengeEngine.load(encounter,{autoStart:encounterOrOptions.autoStart!==false});return encounter;
}

function kysLegacyChallengeToEncounter(challenge={}){
 const config=challenge.config&&typeof challenge.config==='object'?challenge.config:{};
 if(config.kysEncounter&&typeof config.kysEncounter==='object')return {...config.kysEncounter,seed:String(config.kysEncounter.seed??config.seed??challenge.id??challenge.key??'legacy')};
 const seed=String(config.seed??challenge.id??challenge.key??'legacy'),difficulty=Math.max(1,Math.min(5,Number(config.difficulty)||3));
 const key=String(challenge.template_key||challenge.template?.key||'CUSTOM').toUpperCase(),instruction=String(challenge.instruction||'CHALLENGE').toUpperCase(),target=Math.max(1,Number(challenge.target_count)||1),timeLimitMs=Number(challenge.time_limit_ms)||null;
 const playerSpawn=kysChooseAllowed(KYS_PLAYER_SPAWNS,difficulty,seed+':legacy-player');
 const base={schema:'kys.encounter.v2',seed,type:'legacy',difficulty,title:instruction,subtitle:'',timeLimitMs,leaderboard:{metric:key==='SCORE'?'scoreDelta':'elapsedMs',direction:key==='SCORE'?'desc':'asc'},setup:{playerSpawn:playerSpawn.id},constraints:{noRespawn:!!config.noRespawn}};
 const words=instruction.toLowerCase();
 if(key==='SCORE')return {...base,type:'score',objectives:[{type:'metric',metric:'scoreDelta',target}]};
 if(key==='COLLECT'||key==='CUSTOM'){
  if(words.includes('bag')){const bag=kysChooseAllowed(KYS_BAG_SPAWNS,difficulty,seed+':legacy-bag');return {...base,type:'bag',setup:{...base.setup,bagSpawn:bag.id},objectives:[{type:'event_count',event:'bag.collected',target:1}]};}
  if(words.includes('graffiti')||words.includes('tag')){const graffitiPool=kysGraffitiPool(difficulty),count=Math.min(target,graffitiPool.length),graffitiIds=seededShuffle(graffitiPool.map(g=>g.id),seed+':legacy-tags').slice(0,count);return {...base,type:'graffiti',setup:{...base.setup,graffitiIds,shuffleGraffitiArt:true},objectives:[{type:'event_count',event:'graffiti.tagged',target:count}]};}
  const pool=coins.filter(c=>!c.userData.bonusRail&&(c.userData.zone||'city')==='city'),count=Math.min(target,pool.length),coinIds=seededShuffle(pool.map((c,i)=>kysCoinId(c,coins.indexOf(c))),seed+':legacy-coins').slice(0,count);return {...base,type:'coins',setup:{...base.setup,coinIds},objectives:[{type:'event_count',event:'coin.collected',target:count}]};
 }
 const generated=generateKloojoEncounter(seed,difficulty);return {...generated,title:instruction,timeLimitMs:timeLimitMs??generated.timeLimitMs};
}

function kysLegacyProgress(name){
 if(!kysLegacyHost||!kysChallengeEngine?.encounter)return;const objectives=kysChallengeEngine.encounter.objectives||[],obj=objectives.find(o=>o.event===name);if(!obj)return;const value=kysChallengeEngine.eventCounts.get(name)||0,target=Number(obj.target)||1;
 try{window.parent?.postMessage({type:'kys:artifact:challenge-progress',detail:{value,target}},'*')}catch{}
}

function kysChallengeTick(){
 if(!kysChallengeSession||!kysChallengeEngine)return;
 kysRunStats.maxSpeedKmh=Math.max(kysRunStats.maxSpeedKmh,Math.hypot(player.vel.x,player.vel.z)*3.6);
 kysChallengeEngine.update();
}

window.KLOOJO_KYS={
 schema:'kys.adapter.v2',gameId:'kloojo',version:KYS_KLOOJO_VERSION,
 capabilities:{events:['bag.collected','graffiti.tagged','coin.collected','player.respawn'],state:['scoreDelta','respawns','maxSpeedKmh','coins','bags','graffiti'],setups:['playerSpawn','bagSpawn','graffitiIds','coinIds'],seeded:true,deterministicRetry:true,leaderboardResult:true,winnerPersonalization:'graffiti_tag'},
 spawns:{players:KYS_PLAYER_SPAWNS,bags:KYS_BAG_SPAWNS,graffiti:()=>driveByGraffitiSpots.map(g=>g.id),coins:()=>coins.filter(c=>!c.userData.bonusRail).map((c,i)=>kysCoinId(c,coins.indexOf(c)))},
 generate:generateKloojoEncounter,load:loadKloojoChallenge,retry:()=>kysChallengeEngine.retry(),stop:()=>kysChallengeEngine.stop(),get encounter(){return kysChallengeEngine.publicEncounter()},get result(){return kysChallengeEngine.result}
};

addEventListener('message',event=>{
 if(event.source!==window.parent)return;const d=event.data;if(!d||typeof d!=='object')return;
 if(d.type==='KYS_CHALLENGE_LOAD'){document.getElementById('start')?.classList.add('hidden');kysLegacyHost=false;loadKloojoChallenge(d.encounter||d.payload||{});}
 else if(d.type==='KYS_CHALLENGE_RETRY')kysChallengeEngine.retry();
 else if(d.type==='KYS_CHALLENGE_STOP')kysChallengeEngine.stop('host');
 else if(d.type==='KYS_CHALLENGE_GENERATE'){document.getElementById('start')?.classList.add('hidden');kysLegacyHost=false;loadKloojoChallenge({seed:d.seed??d.payload?.seed??Date.now(),difficulty:d.difficulty??d.payload?.difficulty});}
 else if(d.type==='KYS_WINNER_TRACES'){kysWinnerTraces=normalizeWinnerTraces(d.payload?.traces);}
 else if(d.type==='KYS_CHALLENGE_LEADERBOARD')kysChallengeEngine.setLeaderboard(d.payload||d.leaderboard||{});
 else if(d.type==='kys:challenge:start'){kysLegacyHost=true;kysLegacyChallenge=d.challenge||{};const encounter=kysLegacyChallengeToEncounter(kysLegacyChallenge);document.getElementById('start').classList.add('hidden');kysChallengeEngine.load(encounter,{skipIntro:true,autoStart:true});}
 else if(d.type==='kys:challenge:stop'){kysChallengeEngine.stop(d.reason||'legacy-host');}
 else if(d.type==='kys:pause'){if(!kysFeedPaused){kysFeedPaused=true;kysResumeRunning=running;running=false;kysChallengeEngine.pause();try{audioCtx?.suspend()}catch{}}}
 else if(d.type==='kys:resume'){if(kysFeedPaused){kysFeedPaused=false;kysChallengeEngine.resume();running=kysChallengeSession?kysChallengeEngine.phase==='running':kysResumeRunning;kysResumeRunning=false;if(!kysMuted)try{audioCtx?.resume()}catch{}}}
 else if(d.type==='kys:mute'){kysMuted=!!d.muted;if(kysMuted){try{audioCtx?.suspend()}catch{}}else if(!kysFeedPaused){try{audioCtx?.resume()}catch{}}}
});
try{if(window.parent&&window.parent!==window){const payload={gameId:'kloojo',gameVersion:KYS_KLOOJO_VERSION,schema:'kys.adapter.v2',capabilities:window.KLOOJO_KYS.capabilities};window.parent.postMessage({type:'KYS_ARTIFACT_READY',payload},'*');window.parent.postMessage({type:'kys:artifact:ready',detail:payload},'*')}}catch{}

window.KLOOJO_BOOT_DIAG.stage='ready';
const startGame=()=>{
 ensureAudio();document.getElementById('start')?.classList.add('hidden');document.getElementById('kysBoot')?.remove();
 if(KYS_REQUESTED){loadKloojoChallenge({seed:KYS_LAUNCH.get('seed')||Date.now(),difficulty:KYS_LAUNCH.get('difficulty')||null,autoStart:true});return}
 running=true;say('KLOOJO CORE ONLINE');
};
document.getElementById('enter').onclick=startGame;
const launchParams=new URLSearchParams(location.search);
if(KYS_REQUESTED||launchParams.has('autostart'))setTimeout(startGame,KYS_REQUESTED?0:80);
addEventListener('resize',()=>{renderer.setSize(innerWidth,innerHeight);camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix()});

window.KLOOJO_RUNTIME={
 zoneId:KLOOJO_ZONE_ID,player,input,skater,rig,lookMat,skates,vertFreedom,traversalRuntime,kys:window.KLOOJO_KYS,
 functions:{updatePlayer,updateCamera,updateRig,updateHUD,collectCoins,updateGraffiti,ensureAudio,blip},
 world:{platforms,rails,walls,solids,halfpipes,ramps,tagWalls,driveByGraffitiSpots,traversalSurfaces,climbHolds}
};

const clock=new THREE.Clock();let t=0;
function loop(){
 requestAnimationFrame(loop);const dt=Math.min(clock.getDelta(),.04);t+=dt*1000;
 if(running){
  if(!touch)desktopInput();
  frameStartPlayerPos.copy(player.pos);const wasGrounded=player.grounded,preVertical=player.vel.y,traversalHandled=hardenTraversalBefore(dt);
  if(!traversalHandled&&!hardenHalfpipeBefore(dt))updatePlayer(dt);if(!traversalHandled)hardenHalfpipeAfter(dt,wasGrounded);hardenTraversalAfter(dt,wasGrounded,preVertical);
  resolveRampShell(frameStartPlayerPos);updateDistrictPortalSummon(dt,t*.001);updateDriveByGraffiti(dt,t);updateGraffiti(dt);collectCoins();collectRunnerBags();
  updateSparks(dt);updateTurnClouds(dt);updatePortalFx(dt,t*.001);updateDistrictPortalFx(t*.001);updateCamera(dt);updateRig(dt,t);applyHardeningPose();applyTraversalPose();updateHUD();kysChallengeTick();
  for(const c of coins)if(c.visible)c.rotation.y+=dt*2.4;
 }else{updatePortalFx(dt,t*.001);updateDistrictPortalFx(t*.001);updateRig(dt,t);applyHardeningPose();applyTraversalPose();updateCamera(dt)}
 renderer.render(scene,camera);
}
updateCamera(.016);loop();
