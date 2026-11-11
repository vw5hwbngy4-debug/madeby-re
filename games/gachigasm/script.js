
import * as THREE from "https://unpkg.com/three@0.164.1/build/three.module.js";

let scene,camera,renderer,car,cfg,areaIndex=0,area,activeAudio,nextAudio,crossfade=null;
let selectedVehicle=2, carMat=null, carTex=null;
let wheelFx=[], wheelSpin=0, boostAura=null, carBaseScale=1;
const rollerSprites=["assets/rollers/muscle_roller_1.png","assets/rollers/muscle_roller_2.png","assets/rollers/muscle_roller_3.png","assets/rollers/muscle_roller_4.png"];
let road=[],laneLines=[],ghosts=[],oceanRibs=[],oceanSheets=[],seaLights=[],envProps=[],finishLine=null,finishLineActive=false,items=[],gates=[],songPortals=[],letterItems=[],sprites=[],lane=1,cash=0,sampleHits=0,started=false,activeSample=null,nextGateTime=35,nextPortalTime=6,routeTrace=[],fieldSplit=null;
let rhythmScore=0,rhythmCombo=0,rhythmBest=0,beatMisses=0,beatDanger=0,gameOver=false;
let beatCache={}, beatWorkId=0, beatBlockEvents=[], beatBlockPool=[], nextBeatBlockEventIndex=0;
let beatRailEvents=[], beatRailPool=[], nextBeatRailEventIndex=0;
let letterWord="DUNGEONMASTER", letterProgress=0, letterChallengeActive=false, letterChallengeFailed=false;
let sampleBufferCache={}, gaybeatPool=[];
const lanes=[-3,0,3], playerZ=5, unitsPerSecond=24, lookAhead=5.0, lookBehind=.75, hitWindow=.36;
const musicA=document.getElementById("musicA"), musicB=document.getElementById("musicB"), el=id=>document.getElementById(id);

init();

async function init(){
  scene=new THREE.Scene();
  scene.background=new THREE.Color(0x050008);
  scene.fog=new THREE.Fog(0x050008,24,140);

  camera=new THREE.PerspectiveCamera(72,innerWidth/innerHeight,.1,1000);
  camera.position.set(0,6.4,12);
  camera.lookAt(0,.2,-20);

  renderer=new THREE.WebGLRenderer({antialias:false,alpha:false,powerPreference:"default"});
  renderer.setPixelRatio(1);
  renderer.setSize(innerWidth,innerHeight);
  renderer.setClearColor(0x050008,1);
  document.body.insertBefore(renderer.domElement, document.body.firstChild);

  scene.add(new THREE.AmbientLight(0xffffff,1.0));
  const light=new THREE.DirectionalLight(0xffffff,1.6);
  light.position.set(0,10,8);
  scene.add(light);

  createRoad();
  createOceanTube();
  createEnvironmentProps();
  createFinishLine();
  createCar();
  createGhosts();

  cfg=await fetch("world.json").then(r=>r.json());
  activeAudio=musicA; nextAudio=musicB;
  bind();
  loadArea(0,false); setTimeout(()=>{musicA.pause(); musicB.pause();},50);
  preventZoom();
  animate();
}

function bind(){
  addEventListener("resize",onResize);
  document.addEventListener("pointerdown", warmAudioUnlocked, {passive:true});
  addEventListener("keydown",onKey);
  el("startBtn").onclick=startPause;
  el("forestBtn").onclick=()=>{ if(started) transitionTo(0); else loadArea(0,false); };
  document.querySelectorAll(".rollerCard").forEach(card=>card.addEventListener("pointerdown",e=>{e.preventDefault();selectRoller(Number(card.dataset.roller));},{passive:false}));
  el("rideBtn").onclick=beginSelectedRide;
  if(el("retryBtn")) el("retryBtn").onclick=()=>{ if(el("gameOverPanel")) el("gameOverPanel").style.display="none"; loadArea(areaIndex,false); started=true; activeAudio.play().catch(()=>{}); };
  el("touchL").addEventListener("pointerdown",e=>{e.preventDefault();move(-1);},{passive:false});
  el("touchR").addEventListener("pointerdown",e=>{e.preventDefault();move(1);},{passive:false});
}
function preventZoom(){["gesturestart","gesturechange","gestureend","touchmove","dblclick","contextmenu"].forEach(type=>document.addEventListener(type,e=>e.preventDefault(),{passive:false,capture:true}));}
function hex(h){return parseInt((h||"#222222").replace("#",""),16)}

function createRoad(){
  const roadMat=new THREE.MeshBasicMaterial({color:0x226633});
  for(let i=0;i<36;i++){
    const m=new THREE.Mesh(new THREE.PlaneGeometry(10,8),roadMat.clone());
    m.rotation.x=-Math.PI/2;
    m.position.set(0,0,-i*8);
    scene.add(m); road.push(m);
  }
  const lineMat=new THREE.MeshBasicMaterial({color:0xffffff,transparent:true,opacity:.25});
  for(let i=0;i<80;i++){
    [-1.65,1.65].forEach(x=>{
      const l=new THREE.Mesh(new THREE.PlaneGeometry(.06,2.6),lineMat.clone());
      l.rotation.x=-Math.PI/2;
      l.position.set(x,.03,-i*3.7);
      scene.add(l); laneLines.push(l);
    });
  }
}


function createOceanTube(){
  const glassMat=new THREE.MeshBasicMaterial({color:0x8feeff,transparent:true,opacity:.28,wireframe:true,depthWrite:false});
  const glowMat=new THREE.MeshBasicMaterial({color:0x66ccff,transparent:true,opacity:.12,side:THREE.DoubleSide,depthWrite:false});
  const waterMat=new THREE.MeshBasicMaterial({color:0x064f72,transparent:true,opacity:.54,side:THREE.DoubleSide});

  // Wide ocean sheets under and beside the road. They create the "above the ocean" feeling without covering the track.
  [-19,19].forEach((x,idx)=>{
    const sheet=new THREE.Mesh(new THREE.PlaneGeometry(30,340),waterMat.clone());
    sheet.rotation.x=-Math.PI/2;
    sheet.position.set(x,-.42,-130);
    sheet.material.opacity=idx? .48:.56;
    scene.add(sheet); oceanSheets.push(sheet);
  });
  const under=new THREE.Mesh(new THREE.PlaneGeometry(70,340),new THREE.MeshBasicMaterial({color:0x043348,transparent:true,opacity:.18,side:THREE.DoubleSide,depthWrite:false}));
  under.rotation.x=-Math.PI/2; under.position.set(0,-.55,-130); scene.add(under); oceanSheets.push(under);

  // Glass ribs: visible as a blue/purple tube corridor around the road.
  for(let i=0;i<18;i++){
    const ring=new THREE.Mesh(new THREE.TorusGeometry(6.25,.035,8,96),glassMat.clone());
    ring.position.set(0,2.05,-i*14-10);
    ring.rotation.z=0;
    ring.scale.y=.72;
    scene.add(ring); oceanRibs.push(ring);
  }

  // Soft vertical glass side panels, like an aquarium wall.
  [-5.55,5.55].forEach(x=>{
    for(let i=0;i<12;i++){
      const pane=new THREE.Mesh(new THREE.PlaneGeometry(.08,3.2),glowMat.clone());
      pane.position.set(x,1.55,-i*22-12);
      pane.rotation.y=x<0?.18:-.18;
      scene.add(pane); seaLights.push(pane);
    }
  });
}

function createEnvironmentProps(){
  const trunkMat=new THREE.MeshBasicMaterial({color:0x18330f});
  const leafMat=new THREE.MeshBasicMaterial({color:0x35ff7a,transparent:true,opacity:.82});
  const lavaMat=new THREE.MeshBasicMaterial({color:0xff4a18,transparent:true,opacity:.78});
  for(let i=0;i<28;i++){
    const group=new THREE.Group();
    const side=i%2===0?-1:1;
    group.position.set(side*(7.2+Math.random()*2.8),0,-i*11-16);
    const trunk=new THREE.Mesh(new THREE.CylinderGeometry(.08,.16,1.7,6),trunkMat.clone());
    trunk.position.y=.75;
    const crown=new THREE.Mesh(new THREE.ConeGeometry(.85,2.1,7),leafMat.clone());
    crown.position.y=2.0;
    const crystal=new THREE.Mesh(new THREE.ConeGeometry(.5,1.6,5),lavaMat.clone());
    crystal.position.y=.9; crystal.rotation.x=Math.PI;
    group.add(trunk,crown,crystal);
    group.userData={trunk,crown,crystal,side};
    scene.add(group); envProps.push(group);
  }
}
function createFinishLine(){
  const group=new THREE.Group();
  const white=new THREE.MeshBasicMaterial({color:0xffffff,transparent:true,opacity:.96,side:THREE.DoubleSide});
  const black=new THREE.MeshBasicMaterial({color:0x050008,transparent:true,opacity:.96,side:THREE.DoubleSide});
  const size=.82, rows=3, cols=12;
  for(let r=0;r<rows;r++) for(let c=0;c<cols;c++){
    const tile=new THREE.Mesh(new THREE.PlaneGeometry(size,size),((r+c)%2?black:white).clone());
    tile.rotation.x=-Math.PI/2;
    tile.position.set((c-(cols-1)/2)*size,.075,(r-(rows-1)/2)*size);
    group.add(tile);
  }
  const railMat=new THREE.MeshBasicMaterial({color:0xffe066,transparent:true,opacity:.9});
  [-5.5,5.5].forEach(x=>{const pole=new THREE.Mesh(new THREE.CylinderGeometry(.055,.055,3.4,8),railMat.clone()); pole.position.set(x,1.65,0); group.add(pole);});
  group.visible=false; group.position.set(0,.05,-90); scene.add(group); finishLine=group;
}
function spawnFinishLine(){
  if(!finishLine) return;
  finishLine.visible=true; finishLineActive=true; finishLine.position.set(0,.05,-54);
}
function updateFinishLine(roadSpeed){
  if(!finishLineActive||!finishLine) return;
  finishLine.position.z += roadSpeed*1.08;
  const curve=Math.sin((finishLine.position.z*.035)+(activeAudio.currentTime||0)*.30)*.8;
  finishLine.position.x=curve;
  if(finishLine.position.z>9){ finishLine.visible=false; finishLineActive=false; showMedalOverlay(); }
}
function showMedalOverlay(){
  const total=rhythmScore + rhythmCombo*25 - beatMisses*220;
  let icon='🥉', rank='BRONZE CLEAR';
  if(beatMisses<=1 && rhythmBest>=24){ icon='🏆'; rank='GOLD CLEAR'; }
  else if(beatMisses<=3 && rhythmBest>=12){ icon='🥈'; rank='SILVER CLEAR'; }
  el('medalIcon').textContent=icon;
  el('medalRank').textContent=rank;
  el('medalStats').textContent=`SCORE ${String(Math.max(0,total)).padStart(6,'0')} · BEST ${rhythmBest} · MISS ${beatMisses}`;
  const box=el('medalOverlay'); box.classList.add('on');
  setTimeout(()=>box.classList.remove('on'),1900);
}
function biomeForArea(a){
  const name=((a&&a.title)||'').toLowerCase();
  if(name.includes('forest')) return 'forest';
  if(name.includes('drum')||name.includes('ass')||name.includes('battle')||name.includes('slave')||name.includes('cum')) return 'lava';
  if(name.includes('mustache')) return 'dream';
  return 'tube';
}
function applyBiome(a){
  const biome=biomeForArea(a);
  const zone=el('zoneLabel');
  const tubeOn=biome==='tube'||biome==='dream';
  oceanRibs.forEach(r=>{r.visible=tubeOn; r.material.color.setHex(biome==='dream'?0xb066ff:0x8feeff); r.material.opacity=biome==='dream'?.27:.24;});
  seaLights.forEach(p=>{p.visible=tubeOn; p.material.color.setHex(biome==='dream'?0xd070ff:0x66ccff);});
  oceanSheets.forEach(w=>{w.material.color.setHex(biome==='lava'?0x3b0502:(biome==='forest'?0x063f27:0x045f86)); w.material.opacity=biome==='lava'?.30:(biome==='forest'?.25:.54);});
  envProps.forEach((g,idx)=>{
    const {trunk,crown,crystal}=g.userData;
    trunk.visible=biome==='forest'; crown.visible=biome==='forest'; crystal.visible=biome==='lava'||biome==='dream';
    if(biome==='forest'){
      trunk.material.color.setHex(0x163817); crown.material.color.setHex(idx%3===0?0x7aff8a:0x1fbf55); crown.material.opacity=.82;
    }else if(biome==='lava'){
      crystal.material.color.setHex(idx%2?0xff3517:0xffb000); crystal.material.opacity=.84;
    }else if(biome==='dream'){
      crystal.material.color.setHex(idx%2?0xb066ff:0x66ccff); crystal.material.opacity=.52;
    }
  });
  if(zone){
    zone.textContent=biome==='forest'?'FOREST DRIVE':biome==='lava'?'LAVA BEATWAY':biome==='dream'?'DREAM TUBE CORRIDOR':'OCEAN TUBE CORRIDOR';
    zone.style.borderColor=biome==='lava'?'rgba(255,120,40,.45)':biome==='forest'?'rgba(120,255,160,.42)':'rgba(150,230,255,.38)';
  }
}
function updateEnvironment(roadSpeed,t){
  for(let i=0;i<envProps.length;i++){
    const g=envProps[i]; g.position.z+=roadSpeed*.9; if(g.position.z>14)g.position.z-=envProps.length*11;
    g.rotation.y=Math.sin(t*.55+i)*.035;
  }
}


function makeWheelSpinTexture(){
  const c=document.createElement('canvas'); c.width=64; c.height=64;
  const ctx=c.getContext('2d');
  ctx.clearRect(0,0,64,64);
  const grd=ctx.createRadialGradient(32,32,4,32,32,31);
  grd.addColorStop(0,'rgba(255,255,255,.15)');
  grd.addColorStop(.45,'rgba(40,40,55,.65)');
  grd.addColorStop(1,'rgba(0,0,0,.95)');
  ctx.fillStyle=grd; ctx.beginPath(); ctx.arc(32,32,30,0,Math.PI*2); ctx.fill();
  ctx.lineWidth=5; ctx.strokeStyle='rgba(210,245,255,.72)';
  ctx.beginPath(); ctx.arc(32,32,21,0,Math.PI*1.35); ctx.stroke();
  ctx.lineWidth=3; ctx.strokeStyle='rgba(255,210,80,.65)';
  for(let i=0;i<4;i++){
    const a=i*Math.PI/2+.45; ctx.beginPath(); ctx.moveTo(32,32); ctx.lineTo(32+Math.cos(a)*27,32+Math.sin(a)*27); ctx.stroke();
  }
  const tex=new THREE.CanvasTexture(c); tex.colorSpace=THREE.SRGBColorSpace; return tex;
}
function makeBoostAuraTexture(){
  const c=document.createElement('canvas'); c.width=128; c.height=128;
  const ctx=c.getContext('2d');
  const grd=ctx.createRadialGradient(64,76,4,64,76,58);
  grd.addColorStop(0,'rgba(255,255,255,.82)');
  grd.addColorStop(.25,'rgba(110,230,255,.55)');
  grd.addColorStop(.55,'rgba(255,94,221,.24)');
  grd.addColorStop(1,'rgba(255,255,255,0)');
  ctx.fillStyle=grd; ctx.fillRect(0,0,128,128);
  const tex=new THREE.CanvasTexture(c); tex.colorSpace=THREE.SRGBColorSpace; return tex;
}
function createKartMotionFx(){
  if(!car) return;
  wheelFx.forEach(w=>car.remove(w)); wheelFx=[];
  const tex=makeWheelSpinTexture();
  const mat=new THREE.MeshBasicMaterial({map:tex,transparent:true,opacity:.38,depthWrite:false,depthTest:false,blending:THREE.AdditiveBlending});
  const geo=new THREE.PlaneGeometry(.56,.56);
  // Rear wheels only: visible from the back, overlaid gently so the original sprite identity stays intact.
  [[-1.02,-.54],[1.02,-.54]].forEach(([x,y])=>{
    const w=new THREE.Mesh(geo,mat.clone());
    w.position.set(x,y,.035); w.renderOrder=30; w.visible=true;
    car.add(w); wheelFx.push(w);
  });
  const aura=new THREE.Mesh(new THREE.PlaneGeometry(3.8,2.45),new THREE.MeshBasicMaterial({map:makeBoostAuraTexture(),transparent:true,opacity:0,depthWrite:false,depthTest:false,blending:THREE.AdditiveBlending}));
  aura.position.set(0,-.05,-.025); aura.renderOrder=20;
  car.add(aura); boostAura=aura;
}
function updateKartMotionFx(roadSpeed,t){
  if(!car) return;
  const boosting=document.body.classList.contains('gachi-boost');
  const speedMul=boosting?3.2:1.0;
  wheelSpin += Math.max(.2,roadSpeed*speedMul)*.82;
  wheelFx.forEach((w,i)=>{
    w.rotation.z=(i? -1:1)*wheelSpin;
    w.material.opacity=boosting?.72:.34+.10*Math.abs(Math.sin(wheelSpin*2.1));
    const pulse=1+(boosting?.16:.04)*Math.sin(wheelSpin*2.8+i);
    w.scale.set(pulse,pulse,1);
  });
  const targetX=lanes[lane];
  const steer=THREE.MathUtils.clamp((targetX-car.position.x)/3,-1,1);
  const bounce=Math.sin((t||performance.now()/1000)*(boosting?18:9))*(boosting?.045:.024);
  car.rotation.y=THREE.MathUtils.lerp(car.rotation.y||0,-steer*.12,.18);
  car.rotation.z=THREE.MathUtils.lerp(car.rotation.z||0,steer*.18,.18);
  car.position.y=1.05+bounce;
  car.scale.setScalar(1+(boosting?.075:.025)*Math.sin(performance.now()/(boosting?80:180))+(boosting?.045:0));
  if(carMat){
    carMat.color = carMat.color || new THREE.Color(0xffffff);
    carMat.color.lerp(new THREE.Color(boosting?0x9fffff:0xffffff),.12);
  }
  if(boostAura){
    boostAura.material.opacity=THREE.MathUtils.lerp(boostAura.material.opacity,boosting?.92:0,.16);
    const aScale=boosting?(1.05+.06*Math.sin(performance.now()/80)):1;
    boostAura.scale.set(aScale,aScale,1);
  }
}

function createCar(){
  const tex=new THREE.TextureLoader().load(rollerSprites[selectedVehicle]);
  tex.colorSpace=THREE.SRGBColorSpace;
  carTex=tex;
  carMat=new THREE.MeshBasicMaterial({map:tex,transparent:true,alphaTest:.05,side:THREE.DoubleSide});
  car=new THREE.Mesh(new THREE.PlaneGeometry(2.7,1.82),carMat);
  car.position.set(lanes[lane],1.05,playerZ);
  car.rotation.x=-0.18;
  scene.add(car);
  createKartMotionFx();
}
function createGhosts(){
  // Beat Block pool. These are the actual rhythm notes on the road.
  // They keep a strong white outline so they never disappear into a biome color.
  const colors=[0xff66cc,0xffe066,0x7dffea,0x9a6bff,0xff5a5a,0x66ff99];
  for(let i=0;i<34;i++){
    const geo=new THREE.BoxGeometry(1.08,.36,1.52);
    const g=new THREE.Mesh(geo,new THREE.MeshBasicMaterial({color:colors[i%colors.length],transparent:true,opacity:.0}));
    const edge=new THREE.LineSegments(new THREE.EdgesGeometry(geo),new THREE.LineBasicMaterial({color:0xffffff,transparent:true,opacity:.92}));
    edge.scale.set(1.035,1.08,1.035);
    g.add(edge); g.userData.edge=edge;
    g.position.set(0,.57,-999);
    g.visible=false;
    g.userData={pool:true,beatBlock:true,active:false,judged:false,event:null,lastZ:-999,baseOpacity:.82,edge};
    scene.add(g); ghosts.push(g); beatBlockPool.push(g);
  }
  // Hold-note rails: longer musical energy streams. They are separate from beat blocks.
  for(let i=0;i<12;i++){
    const geo=new THREE.BoxGeometry(.88,.20,1);
    const r=new THREE.Mesh(geo,new THREE.MeshBasicMaterial({color:0x9ffcff,transparent:true,opacity:0}));
    const edge=new THREE.LineSegments(new THREE.EdgesGeometry(geo),new THREE.LineBasicMaterial({color:0xffffff,transparent:true,opacity:0}));
    edge.scale.set(1.04,1.2,1.02);
    r.add(edge); r.userData.edge=edge;
    r.position.set(0,.62,-999); r.visible=false;
    r.userData={pool:true,beatRail:true,active:false,event:null,started:false,broken:false,lastTick:0};
    scene.add(r); beatRailPool.push(r);
  }
}


function applyArea(a){
  const bg=hex(a.bg), col=hex(a.color);
  scene.background=new THREE.Color(bg);
  scene.fog.color=new THREE.Color(bg);
  for(const r of road) r.material.color.setHex(col);
  for(const l of laneLines){ l.material.color.setHex(0xdffbff); l.material.opacity=.24; }
  for(const r of oceanRibs){ r.material.color.setHex(0x8feeff); r.material.opacity=.24; }
  for(const w of oceanSheets){ w.material.color.setHex(0x045f86); }
  applyBiome(a);
  setFieldMonofield(a);
}


function setFieldMonofield(a){
  document.body.classList.remove("protocol-split","protocol-gradient");
  const ov=el("fieldOverlay"), sky=el("skySplitOverlay");
  if(ov) ov.style.background="transparent";
  if(sky) sky.style.background="transparent";
  document.body.style.background=`radial-gradient(circle at 50% 30%, ${a.color}33 0%, ${a.bg||"#050008"} 62%, #050008 100%)`;
}
function setFieldDualfield(leftArea,rightArea){
  // v0.3.3: never draw a color rectangle over the road.
  // Choice color now lives behind the canvas + in the floating lane gates.
  document.body.classList.remove("protocol-gradient","protocol-split");
  const ov=el("fieldOverlay"), sky=el("skySplitOverlay");
  if(ov) ov.style.background="transparent";
  if(sky) sky.style.background="transparent";
  document.body.style.background=`linear-gradient(90deg, ${leftArea.bg||leftArea.color} 0%, #050008 50%, ${rightArea.bg||rightArea.color} 100%)`;
  scene.background=new THREE.Color(0x050008);
  scene.fog.color=new THREE.Color(0x050008);
  el("worldText").textContent=`${leftArea.title}  ↔  ${rightArea.title}`;
}
function setFieldGradient(fromArea,toArea,p){
  // Crossfade color also stays behind the track. No screen overlay over the road.
  document.body.classList.remove("protocol-split","protocol-gradient");
  const ov=el("fieldOverlay"), sky=el("skySplitOverlay");
  if(ov) ov.style.background="transparent";
  if(sky) sky.style.background="transparent";
  document.body.style.background=`linear-gradient(180deg, ${fromArea.bg||fromArea.color} 0%, ${toArea.bg||toArea.color} 100%)`;
}
function pushRouteColor(a){
  routeTrace.push(a.color); routeTrace=routeTrace.slice(-8);
  const rt=el("routeTrace");
  if(rt) rt.innerHTML=routeTrace.map(c=>`<span style="color:${c}">●</span>`).join(" ");
}

function loadArea(i,play=false){
  areaIndex=(i+cfg.areas.length)%cfg.areas.length; area=cfg.areas[areaIndex];
  activeAudio.pause(); activeAudio.src=area.file; activeAudio.currentTime=0; activeAudio.volume=1;
  lane=1; sampleHits=0; items=[]; gates=[]; songPortals=[]; letterItems=[]; clearSprites(); if(finishLine){finishLine.visible=false;finishLineActive=false;} nextGateTime=999999; nextPortalTime=9; resetLetterChallenge(); rhythmScore=0; rhythmCombo=0; rhythmBest=0; beatMisses=0; beatDanger=0; gameOver=false; beatBlockEvents=[]; beatRailEvents=[]; nextBeatBlockEventIndex=0; nextBeatRailEventIndex=0; resetBeatBlockPool(); resetBeatRailPool();
  applyArea(area); pushRouteColor(area); planItems();
  el("areaName").textContent=area.title; el("worldText").textContent="OCEAN TUBE · "+area.title; updateUI();
  if(play){started=true; activeAudio.play();}
}
function planItems(){
  items=[];
  const dur=(activeAudio&&isFinite(activeAudio.duration)&&activeAudio.duration>20)?activeAudio.duration:(area.duration||150);
  const fallback=makeFallbackBeatTimes(dur);
  buildBeatEggplants(fallback.filter((_,i)=>i%7===3), true);
  beatBlockEvents=makeFairBeatBlockEvents(fallback);
  buildDungeonLetters(fallback);
  nextBeatBlockEventIndex=0; nextBeatRailEventIndex=0;
  resetBeatBlockPool(); resetBeatRailPool();
  /* gaybeat-only overworld */
  prepareBeatItemsForCurrentTrack();
  getSampleBuffer("samples/gaybeat.mp3").catch(()=>{});
}
function makeFallbackBeatTimes(dur){
  const usable=Math.max(34,Math.min(dur||150,220));
  const times=[];
  // Musical fallback: quarter/half/whole-bar feeling without random scatter.
  let t=7.5, step=2.0;
  while(t<usable-8 && times.length<24){
    times.push(Number(t.toFixed(2)));
    t += (times.length%4===0)?4.0:step;
  }
  return times;
}
function buildBeatEggplants(times, provisional=false){
  const lanePattern=[1,0,2,1,2,0,1,0,2,1,0,2,1,2,0,1,2,0,1,0,2,1,2,0];
  const eggplants = times.map((t,i)=>({
    time:t,
    lane:lanePattern[i%lanePattern.length],
    emoji:"🍆",
    sample:"samples/gaybeat.mp3",
    text: provisional ? "Beat Eggplant" : "Gaybeat",
    hit:false,missed:false,mesh:null,audio:null,beat:true, kind:"gaybeat"
  }));
  const classic = items.filter(x=>x.kind==="sample");
  items = eggplants.concat(classic).sort((a,b)=>a.time-b.time);
}
function addClassicSampleDuos(dur){
  return;
  const pack=(cfg&&cfg.samples&&cfg.samples.length?cfg.samples:[]).filter(s=>!String(s.file||"").includes("gaybeat.mp3"));
  if(!pack.length) return;
  const base=(area.collectibles&&area.collectibles.length)?area.collectibles:null;
  const placements=base?base.map((c,i)=>({time:c.time,lane:c.lane,src:c})):makeClassicSampleTimes(dur).map((t,i)=>({time:t,lane:[0,2,1,0,2,1,1,0,2][i%9],src:null}));
  const duos=placements.map((p,i)=>{
    const smp=p.src||pack[i%pack.length];
    const file=smp.sample||smp.file;
    const text=smp.text||file.replace(/^samples\//,"").replace(/\.mp3$/i,"");
    return {
      time:Number((p.time+0.34).toFixed(2)),
      lane:p.lane,
      emoji:"♂",
      sample:file,
      text:text,
      hit:false,missed:false,mesh:null,audio:null,kind:"sample"
    };
  });
  items=items.concat(duos).sort((a,b)=>a.time-b.time);
}
function makeClassicSampleTimes(dur){
  const usable=Math.max(40,Math.min(dur||150,190));
  const times=[];
  let t=10.5;
  while(t<usable-10 && times.length<12){
    times.push(Number(t.toFixed(2)));
    t += (times.length%3===0)?16.0:8.0;
  }
  return times;
}
async function prepareBeatItemsForCurrentTrack(){
  const id=++beatWorkId;
  const file=area.file;
  try{
    const times=await getBeatTimes(file);
    if(id!==beatWorkId || !area || area.file!==file) return;
    clearSprites();
    items=[];
    buildBeatEggplants(makeBonusGaybeatTimes(times), false);
    beatBlockEvents=makeFairBeatBlockEvents(times);
    buildDungeonLetters(times);
    nextBeatBlockEventIndex=0; nextBeatRailEventIndex=0;
    resetBeatBlockPool(); resetBeatRailPool();
    /* gaybeat-only overworld */
    el("worldText").textContent="OCEAN TUBE · "+area.title;
  }catch(err){
    console.warn("Beat analysis fallback",err);
  }
}
async function getBeatTimes(file){
  if(beatCache[file]) return beatCache[file];
  if(!window.__beatCtx) window.__beatCtx=new (window.AudioContext||window.webkitAudioContext)();
  const ctx=window.__beatCtx;
  const ab=await fetch(file).then(r=>r.arrayBuffer());
  const buf=await ctx.decodeAudioData(ab.slice(0));
  const data=buf.getChannelData(0);
  const sr=buf.sampleRate;

  // Essentia-style sensitive onset detector: RMS + spectral-flux + high-frequency percussion energy.
  // This keeps the feel of Essentia onset extraction without requiring a heavy WASM boot in the browser build.
  const frame=1024, hop=256;
  const rms=[], flux=[], hi=[];
  let prev=[];
  for(let i=0;i+frame<data.length;i+=hop){
    let e=0, zc=0, high=0;
    const bands=Array(16).fill(0);
    let last=data[i];
    for(let j=0;j<frame;j++){
      const v=data[i+j]; e+=v*v;
      if((v>=0)!=(last>=0)) zc++; last=v;
      const av=Math.abs(v);
      const b=Math.min(15,Math.floor(j/frame*16)); bands[b]+=av;
      if(j>frame*.55) high+=Math.abs(v-data[i+j-1]||0);
    }
    let fl=0;
    for(let b=0;b<bands.length;b++){ const d=bands[b]-(prev[b]||0); if(d>0) fl+=d; }
    prev=bands;
    rms.push(Math.sqrt(e/frame)); flux.push(fl/frame); hi.push(high/frame + zc/frame*.08);
  }
  const norm=(arr)=>{
    const m=arr.reduce((a,b)=>a+b,0)/Math.max(1,arr.length);
    const sd=Math.sqrt(arr.reduce((a,b)=>a+(b-m)*(b-m),0)/Math.max(1,arr.length))||1;
    return arr.map(v=>(v-m)/sd);
  };
  const nr=norm(rms), nf=norm(flux), nh=norm(hi);
  const onset=[];
  for(let i=4;i<nr.length-4;i++){
    const novelty=nf[i]*.58+nr[i]*.28+nh[i]*.22;
    let local=0; for(let j=-4;j<=4;j++) local+=nf[i+j]*.58+nr[i+j]*.28+nh[i+j]*.22; local/=9;
    const t=i*hop/sr;
    if(t<3.5 || t>buf.duration-2.5) continue;
    const isPeak=novelty>local+.22 && novelty>nf[i-1]*.58+nr[i-1]*.28+nh[i-1]*.22 && novelty>=nf[i+1]*.58+nr[i+1]*.28+nh[i+1]*.22;
    if(isPeak) onset.push({t,score:novelty-local});
  }
  onset.sort((a,b)=>a.t-b.t);

  // Keep many musical events, but quantize close double-hits into a fair playable stream.
  const raw=[];
  for(const p of onset){
    const last=raw[raw.length-1];
    if(!last || p.t-last.t>=0.18) raw.push(p);
    else if(p.score>last.score) raw[raw.length-1]=p;
  }
  // Adaptive density: preserve fast rhythm, but avoid impossible note spam.
  const times=[];
  for(const p of raw){
    const last=times[times.length-1];
    const minGap = (last && p.t-last<0.34) ? 0.34 : 0.24;
    if(!last || p.t-last>=minGap) times.push(Number(p.t.toFixed(3)));
    else if(p.score>.95 && (!last || p.t-last>=0.30)) times.push(Number(p.t.toFixed(3)));
  }
  let finalTimes=times.length>=16?times:makeFallbackBeatTimes(buf.duration);
  finalTimes=finalTimes.filter((t,i,a)=>i===0||t-a[i-1]>=0.20);
  // Never let long tracks run empty: if the analyzer thins out near the end,
  // extend with a fair musical pulse instead of leaving a naked road.
  const dur=buf.duration||0;
  let last=finalTimes[finalTimes.length-1]||6;
  const avgGap=finalTimes.length>4 ? Math.max(.42, Math.min(1.1, (finalTimes[finalTimes.length-1]-finalTimes[0])/finalTimes.length)) : .72;
  while(dur && last < dur-4 && finalTimes.length < 1100){
    last += avgGap;
    finalTimes.push(Number(last.toFixed(3)));
  }
  beatCache[file]=finalTimes;
  return finalTimes;
}

function makeBonusGaybeatTimes(times){
  // Bonus pickups are sparse; Beat Blocks carry the main rhythm.
  return times.filter((_,i)=>i%5===2).slice(0,34);
}
function makeFairBeatBlockEvents(times){
  const events=[];
  beatRailEvents=[];
  let laneNow=1, lastT=-999, lastLane=1;
  // High-contrast palette. White outline is also added in the mesh, so every pad reads on forest/lava/tube roads.
  const colors=[0xffe066,0x7dffea,0xffffff,0xff66cc,0x66ff99,0xff8c3a,0xb88cff];
  for(let i=0;i<times.length;i++){
    const t=Number(times[i]);
    if(!isFinite(t)) continue;
    const gap=t-lastT;
    // If the music sustains for a while, place a playable hold rail in the same lane.
    // It fills empty passages without creating impossible horizontal demands.
    if(events.length && gap>=1.28 && gap<=4.8){
      const st=lastT+.24;
      const en=Math.min(t-.22, st+Math.min(3.2,gap-.48));
      if(en-st>=.75){
        beatRailEvents.push({start:st,end:en,lane:lastLane,color:colors[(i+2)%colors.length],spawned:false,judged:false,broken:false,lastScore:0});
      }
    }
    // One playable note stream: never make parallel notes; never demand instant left→right jumps.
    if(gap<0.20) continue;
    let options=[laneNow];
    if(gap>=0.34){
      options=[laneNow, Math.max(0,laneNow-1), Math.min(2,laneNow+1)].filter((v,idx,a)=>a.indexOf(v)===idx);
    }
    if(gap>=0.92){ options=[0,1,2]; }
    let pick=options[(i*5 + Math.floor(t*8))%options.length];
    if(Math.abs(pick-laneNow)>1 && gap<0.92) pick=laneNow;
    laneNow=pick; lastT=t; lastLane=laneNow;
    events.push({time:t,lane:laneNow,color:colors[i%colors.length],spawned:false,judged:false});
  }
  beatRailEvents.sort((a,b)=>a.start-b.start);
  return events;
}
function resetBeatBlockPool(){
  for(const g of ghosts){
    if(!g) continue;
    g.visible=false; g.position.z=-999;
    if(g.material) g.material.opacity=0; if(g.userData&&g.userData.edge) g.userData.edge.material.opacity=0;
    g.userData={...(g.userData||{}),active:false,judged:false,event:null,lastZ:-999,baseOpacity:.82};
    g.scale.set(1,1,1);
  }
}
function resetBeatRailPool(){
  for(const r of beatRailPool){
    if(!r) continue;
    r.visible=false; r.position.z=-999;
    if(r.material) r.material.opacity=0;
    if(r.userData&&r.userData.edge) r.userData.edge.material.opacity=0;
    r.userData={...(r.userData||{}),active:false,event:null,started:false,broken:false,lastTick:0};
    r.scale.set(1,1,1);
  }
}

function resetLetterChallenge(){
  letterProgress=0; letterChallengeActive=false; letterChallengeFailed=false; letterItems=[]; updateLetterHud();
}
function updateLetterHud(){
  const h=el("letterHud"); if(!h) return;
  let html="";
  for(let i=0;i<letterWord.length;i++){
    const ch=letterWord[i];
    html += `<span class="${letterChallengeFailed?'dead':(i<letterProgress?'got':'')}">${ch}</span>`;
  }
  h.innerHTML=html;
}
function buildDungeonLetters(times){
  // DUNGEON MASTER is now attached to real Beat Blocks.
  // It must never create a second impossible lane-object beside the rhythm pattern.
  // A letter appears above selected Beat Blocks; hit that Beat Block and you collect the letter.
  letterItems=[]; resetLetterChallenge();
  if(!beatBlockEvents || beatBlockEvents.length<28) return;
  const usable=beatBlockEvents.filter(ev=>ev && isFinite(ev.time) && ev.time>10);
  if(usable.length<letterWord.length) return;
  const start=Math.min(10, Math.max(4, Math.floor(usable.length*.10)));
  const spacing=Math.max(4, Math.floor((usable.length-start-6)/letterWord.length));
  let lastTime=-999;
  for(let i=0;i<letterWord.length;i++){
    let idx=Math.min(usable.length-1, start+i*spacing);
    // Keep letters readable and fair: at least ~1.2s apart, and always on an existing beatblock lane.
    while(idx<usable.length-1 && usable[idx].time-lastTime<1.20) idx++;
    const ev=usable[idx];
    lastTime=ev.time;
    ev.letter=letterWord[i];
    letterItems.push({
      time:Number(ev.time.toFixed(3)),
      lane:ev.lane,
      letter:letterWord[i],
      hit:false,
      missed:false,
      mesh:null,
      y:1.95,
      event:ev
    });
  }
}
function makeLetterSprite(e){
  const canvas=document.createElement("canvas"); canvas.width=256; canvas.height=256;
  const ctx=canvas.getContext("2d");
  ctx.fillStyle="rgba(0,0,0,.25)"; ctx.beginPath(); ctx.arc(128,128,100,0,Math.PI*2); ctx.fill();
  ctx.strokeStyle="rgba(255,224,102,.95)"; ctx.lineWidth=8; ctx.beginPath(); ctx.arc(128,128,92,0,Math.PI*2); ctx.stroke();
  ctx.font="1000 118px Arial Black, Arial"; ctx.textAlign="center"; ctx.textBaseline="middle";
  ctx.fillStyle="#fff"; ctx.shadowColor="#ffe066"; ctx.shadowBlur=22; ctx.fillText(e.letter,128,134);
  const tex=new THREE.CanvasTexture(canvas); tex.colorSpace=THREE.SRGBColorSpace;
  const mat=new THREE.SpriteMaterial({map:tex,transparent:true,depthWrite:false,opacity:.96});
  const sp=new THREE.Sprite(mat); sp.scale.set(1.75,1.75,1.75); sp.visible=false;
  scene.add(sp); sprites.push(sp); e.mesh=sp;
}
function updateDungeonLetters(t){
  // Letters are bonus overlays on top of real Beat Blocks.
  // They travel toward the player and never sit permanently on the screen.
  if(letterChallengeFailed){
    for(const e of letterItems){ if(e.mesh) e.mesh.visible=false; }
    return;
  }
  for(const e of letterItems){
    const dt=e.time-t;
    if(e.hit||e.missed){ if(e.mesh)e.mesh.visible=false; continue; }
    if(dt>1.55 || dt<-0.32){
      if(e.mesh)e.mesh.visible=false;
      if(dt<-0.18 && !e.missed){
        e.missed=true;
        letterChallengeFailed=true;
        show('LETTER LOST','miss');
        updateLetterHud();
      }
      continue;
    }
    if(!e.mesh) makeLetterSprite(e);
    e.mesh.visible=true;
    e.mesh.position.set(lanes[e.lane], e.y, zFromTime(e.time,t));
    const p=1+Math.max(0,1-Math.abs(dt))*0.22+Math.sin(performance.now()/95)*.035;
    e.mesh.scale.set(1.55*p,1.55*p,1.55*p);

    // Collect only if the player is on the same lane at the beat timing window.
    // This mirrors the underlying Beat Block, so letters never force a separate movement pattern.
    if(Math.abs(dt)<=hitWindow && lane===e.lane){
      e.hit=true;
      if(letterProgress<letterWord.length) letterProgress++;
      rhythmScore+=350; rhythmCombo+=1; rhythmBest=Math.max(rhythmBest,rhythmCombo);
      show(e.letter,'combo'); updateLetterHud(); updateRhythmHud();
      if(letterProgress>=letterWord.length){
        show('DUNGEON MASTER COMPLETE','combo');
        rhythmScore+=2500; updateRhythmHud();
      }
      if(e.mesh)e.mesh.visible=false;
    }
  }
}


function selectRoller(i){
  selectedVehicle=Math.max(0,Math.min(3,i));
  document.querySelectorAll(".rollerCard").forEach((c,idx)=>c.classList.toggle("selected",idx===selectedVehicle));
  if(carMat){
    const tex=new THREE.TextureLoader().load(rollerSprites[selectedVehicle]);
    tex.colorSpace=THREE.SRGBColorSpace;
    carMat.map=tex; carMat.needsUpdate=true; carTex=tex;
  }
}
async function beginSelectedRide(){
  warmAudioUnlocked();
  getSampleBuffer("samples/gaybeat.mp3").catch(()=>{});
  const randomIndex=Math.floor(Math.random()*cfg.areas.length);
  document.body.classList.add("racing");
  loadArea(randomIndex,false);
  started=true;
  await activeAudio.play().catch(()=>{});
  show("💪 ROLLER READY");
}
async function startPause(){warmAudioUnlocked();getSampleBuffer("samples/gaybeat.mp3").catch(()=>{});document.body.classList.add("racing");started=true;if(activeAudio.paused)await activeAudio.play();else activeAudio.pause();}
function move(d){lane=Math.max(0,Math.min(2,lane+d)); updateUI();}
function onKey(e){if(e.key==="ArrowLeft"||e.key.toLowerCase()==="a")move(-1);if(e.key==="ArrowRight"||e.key.toLowerCase()==="d")move(1);}
function clearSprites(){for(const s of sprites)scene.remove(s);sprites=[];}
function emojiSprite(e,emoji,size=1.5,y=1.2){
  const canvas=document.createElement("canvas"); canvas.width=256; canvas.height=256;
  const ctx=canvas.getContext("2d");
  ctx.textAlign="center"; ctx.textBaseline="middle";
  if(emoji==="♂"){
    ctx.shadowColor="#66ccff"; ctx.shadowBlur=22;
    ctx.font="900 178px Arial, Helvetica, sans-serif";
    ctx.lineWidth=12; ctx.strokeStyle="rgba(0,0,0,.55)"; ctx.strokeText("♂",128,128);
    ctx.fillStyle="#f7fbff"; ctx.fillText("♂",128,128);
  }else{
    ctx.font="150px Apple Color Emoji, Segoe UI Emoji, Arial";
    ctx.fillText(emoji,128,130);
  }
  const tex=new THREE.CanvasTexture(canvas);
  const mat=new THREE.SpriteMaterial({map:tex,transparent:true});
  const sp=new THREE.Sprite(mat);
  sp.scale.set(size,size,size);
  sp.visible=false;
  scene.add(sp); sprites.push(sp); e.mesh=sp; e.y=y;
}
function makeItem(e){emojiSprite(e,e.emoji||"🍆",1.75,1.32); e.audio=new Audio(e.sample); e.audio.preload="auto";}

function portalSprite(p){
  const canvas=document.createElement("canvas"); canvas.width=512; canvas.height=512;
  const ctx=canvas.getContext("2d");
  const g=ctx.createRadialGradient(256,256,20,256,256,235);
  g.addColorStop(0,"rgba(255,255,255,.95)");
  g.addColorStop(.20,"rgba(185,95,255,.95)");
  g.addColorStop(.48,"rgba(67,130,255,.72)");
  g.addColorStop(.72,"rgba(120,20,220,.38)");
  g.addColorStop(1,"rgba(0,0,0,0)");
  ctx.fillStyle=g; ctx.beginPath(); ctx.arc(256,256,236,0,Math.PI*2); ctx.fill();
  ctx.strokeStyle="rgba(230,180,255,.95)"; ctx.lineWidth=20;
  ctx.beginPath(); ctx.ellipse(256,256,142,218,0,0,Math.PI*2); ctx.stroke();
  ctx.strokeStyle="rgba(80,180,255,.70)"; ctx.lineWidth=10;
  ctx.beginPath(); ctx.ellipse(256,256,96,182,0,0,Math.PI*2); ctx.stroke();
  ctx.font="900 46px Arial"; ctx.textAlign="center"; ctx.textBaseline="middle";
  ctx.fillStyle="white"; ctx.shadowColor="#bb66ff"; ctx.shadowBlur=20;
  ctx.fillText(p.icon||"♫",256,246);
  const tex=new THREE.CanvasTexture(canvas); tex.colorSpace=THREE.SRGBColorSpace;
  const mat=new THREE.SpriteMaterial({map:tex,transparent:true,depthWrite:false,opacity:.96});
  const sp=new THREE.Sprite(mat); sp.scale.set(4.2,5.8,1); sp.visible=false;
  scene.add(sp); sprites.push(sp); p.mesh=sp;
}
function makePortal(p){ portalSprite(p); }
function spawnSongPortals(t){
  if(songPortals.some(p=>!p.hit)) return;
  const dur=activeAudio.duration||(area.duration||120);
  if(t<8) return;
  if(t<nextPortalTime && !(dur && t>dur-22)) return;
  const nearEnd = dur && t>dur-26;
  const base=t+4.2;
  songPortals=[
    {time:base,lane:0,title:"Trophy Fireworks",url:"",icon:"🏆",hit:false,mesh:null},
    {time:base,lane:2,title:"Corridors Hybrid",url:"",icon:"♫",hit:false,mesh:null}
  ];
  for(const p of songPortals) makePortal(p);
  nextPortalTime = t + (nearEnd ? 9999 : 24);
  el("portalHud").textContent="🟣 TROPHY  |  CORRIDORS";
  el("portalHud").style.opacity=1;
  setTimeout(()=>{ if(el("portalHud")) el("portalHud").style.opacity=0; },2600);
}
function updateSongPortals(t){
  for(const p of songPortals){
    const dt=p.time-t;
    if(p.hit){ if(p.mesh)p.mesh.visible=false; continue; }
    if(dt>lookAhead||dt<-1.2){ if(p.mesh)p.mesh.visible=false; continue; }
    if(!p.mesh) makePortal(p);
    const m=p.mesh; m.visible=true;
    m.position.set(lanes[p.lane],2.35,zFromTime(p.time,t));
    const wob=1+Math.sin(performance.now()/140)*.06;
    m.scale.set(4.2*wob,5.8*wob,1);
    if(Math.abs(dt)<=hitWindow && lane===p.lane){
      p.hit=true; m.visible=false;
      show("OASIS","good");
    }
  }
}

function makeGate(e){
  const targetArea=cfg.areas[e.target]||area;
  const canvas=document.createElement("canvas"); canvas.width=256; canvas.height=256;
  const ctx=canvas.getContext("2d");
  const c=targetArea.color||"#ffffff";
  const grd=ctx.createRadialGradient(128,128,16,128,128,118);
  grd.addColorStop(0,c+"ee");
  grd.addColorStop(.38,c+"88");
  grd.addColorStop(1,"rgba(0,0,0,0)");
  ctx.fillStyle=grd; ctx.beginPath(); ctx.arc(128,128,116,0,Math.PI*2); ctx.fill();
  ctx.strokeStyle="rgba(255,255,255,.82)"; ctx.lineWidth=7; ctx.beginPath(); ctx.arc(128,128,78,0,Math.PI*2); ctx.stroke();
  ctx.font="78px Apple Color Emoji, Segoe UI Emoji, Arial"; ctx.textAlign="center"; ctx.textBaseline="middle";
  ctx.shadowColor=c; ctx.shadowBlur=18; ctx.fillText("🌈",128,95);
  ctx.font="900 70px Arial"; ctx.fillStyle="rgba(255,255,255,.95)";
  ctx.fillText(e.side==="L"?"‹":"›",128,156);
  const tex=new THREE.CanvasTexture(canvas); tex.colorSpace=THREE.SRGBColorSpace;
  const mat=new THREE.SpriteMaterial({map:tex,transparent:true,depthWrite:false,opacity:.92});
  const sp=new THREE.Sprite(mat);
  sp.scale.set(2.25,2.25,2.25); sp.visible=false;
  scene.add(sp); sprites.push(sp); e.mesh=sp; e.y=1.55;
}
function warmAudioUnlocked(){
  try{
    if(!window.__sampleCtx) window.__sampleCtx=new (window.AudioContext||window.webkitAudioContext)();
    if(window.__sampleCtx.state==='suspended') window.__sampleCtx.resume();
  }catch(err){}
  try{ ensureGaybeatHtmlPool(); }catch(err){}
}
function ensureGaybeatHtmlPool(){
  if(gaybeatPool && gaybeatPool.length>=6) return gaybeatPool;
  gaybeatPool=[];
  for(let i=0;i<6;i++){
    const a=new Audio('samples/gaybeat.mp3');
    a.preload='auto';
    a.volume=.35;
    try{ a.load(); }catch(_){}
    gaybeatPool.push(a);
  }
  return gaybeatPool;
}
function playGaybeatOneShot(){
  try{
    const pool=ensureGaybeatHtmlPool();
    const a=pool.shift(); pool.push(a);
    a.pause(); a.currentTime=0; a.volume=.35;
    const pr=a.play(); if(pr&&pr.catch) pr.catch(()=>{});
    return true;
  }catch(_){ return false; }
}
async function getSampleBuffer(file){
  warmAudioUnlocked();
  if(sampleBufferCache[file]) return sampleBufferCache[file];
  const ctx=window.__sampleCtx;
  const ab=await fetch(file,{cache:'force-cache'}).then(r=>r.arrayBuffer());
  const buf=await ctx.decodeAudioData(ab.slice(0));
  sampleBufferCache[file]=buf;
  return buf;
}
function playSample(e){
  const file=(e&&e.sample)||"samples/gaybeat.mp3";
  const isGaybeat=/gaybeat\.mp3$/i.test(file);
  // v0.12.2 audit: pickup sound must always fire on mobile. The module-scoped function is the real one used by updateItems.
  try{
    const old=activeAudio.volume;
    activeAudio.volume=Math.min(old||1,.82);
    setTimeout(()=>{ try{ activeAudio.volume=old||1; }catch(_){} },260);
  }catch(_){}
  if(isGaybeat) playGaybeatOneShot();
  try{
    warmAudioUnlocked();
    getSampleBuffer(file).then(buf=>{
      const ctx=window.__sampleCtx;
      if(!ctx) return;
      if(ctx.state==='suspended') ctx.resume();
      const src=ctx.createBufferSource();
      const gain=ctx.createGain();
      src.buffer=buf;
      gain.gain.value=isGaybeat ? .35 : .62;
      src.connect(gain).connect(ctx.destination);
      src.start(0);
    }).catch(()=>{
      if(!isGaybeat){ const a=new Audio(file); a.preload='auto'; a.volume=.45; a.currentTime=0; a.play().catch(()=>{}); }
    });
  }catch(err){
    try{ const a=new Audio(file); a.volume=isGaybeat?.35:.45; a.currentTime=0; a.play().catch(()=>{}); }catch(_){}
  }
}
function zFromTime(t,now){return playerZ-(t-now)*unitsPerSecond;}
function updateRhythmHud(){
  const hud=document.querySelector('#rhythmHud .score');
  const cmb=document.querySelector('#rhythmHud .combo');
  if(hud) hud.textContent=String(rhythmScore).padStart(6,'0');
  if(cmb) cmb.textContent='COMBO '+rhythmCombo;
}
function rhythmGrade(dt){
  const a=Math.abs(dt);
  if(a<=0.11) return {label:'PERFECT',points:100,cls:'hit'};
  if(a<=0.24) return {label:'GOOD',points:50,cls:'good'};
  return {label:'HIT',points:25,cls:'good'};
}
function rhythmHit(dt,emoji='🍆'){
  const g=rhythmGrade(dt);
  rhythmCombo++;
  rhythmBest=Math.max(rhythmBest,rhythmCombo);
  rhythmScore += g.points + Math.min(250, rhythmCombo*5);
  show(emoji+' '+g.label, g.cls);
  updateRhythmHud();
}
function rhythmMiss(){
  beatMisses++;
  beatDanger=Math.min(4,beatDanger+1);
  show('MISS','miss');
  rhythmCombo=0;
  pulseDanger(beatDanger>=2);
  if(beatMisses>=6 || beatDanger>=4) triggerGameOver();
  updateRhythmHud();
}
function pulseDanger(heavy=false){
  const d=el("dangerFlash");
  if(!d) return;
  d.classList.add("on");
  setTimeout(()=>d.classList.remove("on"), heavy?420:180);
}
function triggerGameOver(){
  if(gameOver) return;
  gameOver=true;
  try{activeAudio.pause();}catch(_){}
  const panel=el("gameOverPanel"), stats=el("gameOverStats");
  if(stats) stats.textContent=`SCORE ${String(rhythmScore).padStart(6,'0')} · BEST COMBO ${rhythmBest}`;
  if(panel) panel.style.display="flex";
}
function recoverBeatPressure(){
  if(beatDanger>0) beatDanger--;
  if(beatMisses>0 && rhythmCombo>0 && rhythmCombo%8===0) beatMisses--;
}
function beatBlockFeedback(g,dt){
  if(gameOver || !g || !g.userData || g.userData.judged) return;
  g.userData.judged=true;
  if(lane===g.userData.lane){
    const grade=rhythmGrade(dt||0);
    rhythmCombo++;
    rhythmBest=Math.max(rhythmBest,rhythmCombo);
    rhythmScore += grade.points + Math.min(300, rhythmCombo*6);
    beatDanger=Math.max(0,beatDanger-1);
    recoverBeatPressure();
    show(grade.label, grade.cls);
    g.material.opacity=.95;
    g.scale.set(1.35,1.25,1.35);
    setTimeout(()=>{ try{g.material.opacity=g.userData.baseOpacity; g.scale.set(1,1,1);}catch(_){} },120);
    if(rhythmCombo>0 && rhythmCombo%10===0) show(rhythmCombo+' COMBO','combo');
  }else{
    rhythmMiss();
  }
  updateRhythmHud();
}
function updateBeatBlocksFromLegacyGhosts(t,roadSpeed){
  // Real Beat Blocks: spawned from music-analysis events close to the player.
  // They appear about 1.65s ahead and cross the roller exactly at their detected onset time.
  const spawnAhead=1.28, despawnAfter=.42;
  while(nextBeatBlockEventIndex<beatBlockEvents.length && beatBlockEvents[nextBeatBlockEventIndex].time < t-spawnAhead){
    nextBeatBlockEventIndex++;
  }
  for(let i=nextBeatBlockEventIndex;i<beatBlockEvents.length;i++){
    const ev=beatBlockEvents[i];
    const dt=ev.time-t;
    if(dt>spawnAhead) break;
    if(dt>=-despawnAfter && !ev.spawned){
      const g=beatBlockPool.find(x=>!x.userData.active);
      if(g){
        ev.spawned=true;
        g.userData.active=true; g.userData.event=ev; g.userData.judged=false;
        g.material.color.setHex(ev.color); g.material.opacity=.88; if(g.userData.edge) g.userData.edge.material.opacity=.96;
        g.position.x=lanes[ev.lane]; g.position.y=.57; g.position.z=playerZ-dt*unitsPerSecond;
        g.visible=true; g.scale.set(1,1,1);
      }
    }
  }
  for(const g of beatBlockPool){
    if(!g.userData.active) continue;
    const ev=g.userData.event;
    const dt=ev.time-t;
    g.position.x=lanes[ev.lane];
    g.position.z=playerZ-dt*unitsPerSecond;
    g.material.opacity=.72 + Math.max(0,1-Math.abs(dt))*0.24; if(g.userData.edge) g.userData.edge.material.opacity=.80 + Math.max(0,1-Math.abs(dt))*0.18;
    // Pulse on approach; this makes the block feel born from the beat right in front of you.
    const pulse=1+Math.max(0,1-Math.abs(dt))*0.22;
    g.scale.set(pulse,1,pulse);
    if(!g.userData.judged && dt<=0.035){
      // Judge at the timing line: correct lane = hit, wrong lane = miss.
      g.userData.judged=true; ev.judged=true;
      if(lane===ev.lane){
        const grade=rhythmGrade(dt);
        rhythmCombo++; rhythmBest=Math.max(rhythmBest,rhythmCombo);
        rhythmScore += grade.points + Math.min(300, rhythmCombo*6);
        beatDanger=Math.max(0,beatDanger-1); recoverBeatPressure();
        show(grade.label, grade.cls);
        if(rhythmCombo>0 && rhythmCombo%10===0) setTimeout(()=>show(rhythmCombo+' COMBO','combo'),80);
      }else{
        rhythmMiss();
      }
      updateRhythmHud();
    }
    if(dt<-despawnAfter){
      if(!g.userData.judged){ rhythmMiss(); }
      g.userData.active=false; g.userData.event=null; g.visible=false; g.position.z=-999; g.material.opacity=0; if(g.userData.edge) g.userData.edge.material.opacity=0; g.scale.set(1,1,1);
    }
  }
}


function updateBeatRails(t){
  const spawnAhead=1.45, despawnAfter=.55;
  while(nextBeatRailEventIndex<beatRailEvents.length && beatRailEvents[nextBeatRailEventIndex].end < t-spawnAhead){
    nextBeatRailEventIndex++;
  }
  for(let i=nextBeatRailEventIndex;i<beatRailEvents.length;i++){
    const ev=beatRailEvents[i];
    const dtStart=ev.start-t;
    if(dtStart>spawnAhead) break;
    if(ev.end>=t-despawnAfter && !ev.spawned){
      const r=beatRailPool.find(x=>!x.userData.active);
      if(r){
        ev.spawned=true;
        r.userData.active=true; r.userData.event=ev; r.userData.started=false; r.userData.broken=false; r.userData.lastTick=0;
        r.material.color.setHex(ev.color); r.material.opacity=.62;
        if(r.userData.edge) r.userData.edge.material.opacity=.90;
        r.visible=true;
      }
    }
  }
  for(const r of beatRailPool){
    if(!r.userData.active) continue;
    const ev=r.userData.event;
    const mid=(ev.start+ev.end)/2;
    const len=Math.max(.45,(ev.end-ev.start)*unitsPerSecond);
    r.position.x=lanes[ev.lane];
    r.position.y=.63;
    r.position.z=playerZ-(mid-t)*unitsPerSecond;
    r.scale.set(1,1,len);
    const activeWindow=(t>=ev.start-.08 && t<=ev.end+.08);
    const approaching=Math.max(0,1-Math.abs(ev.start-t));
    r.material.opacity=.50+approaching*.22;
    if(r.userData.edge) r.userData.edge.material.opacity=.72+approaching*.18;
    if(activeWindow){
      if(lane===ev.lane && !r.userData.broken){
        if(!r.userData.started){ show('HOLD','good'); r.userData.started=true; }
        if(t-(r.userData.lastTick||0)>.18){
          rhythmCombo++; rhythmBest=Math.max(rhythmBest,rhythmCombo);
          rhythmScore += 14 + Math.min(90,Math.floor(rhythmCombo/3));
          r.userData.lastTick=t;
          updateRhythmHud();
        }
      }else if(!r.userData.broken && t>ev.start+.12 && t<ev.end-.08){
        r.userData.broken=true; rhythmMiss(); show('BROKEN HOLD','miss');
      }
    }
    if(t>ev.end+despawnAfter){
      if(!r.userData.started && !r.userData.broken) rhythmMiss();
      r.userData.active=false; r.userData.event=null; r.visible=false; r.position.z=-999; r.material.opacity=0;
      if(r.userData.edge) r.userData.edge.material.opacity=0;
      r.scale.set(1,1,1);
    }
  }
}

function updateItems(t){
  for(const e of items){
    const dt=e.time-t;
    if(e.hit||e.missed){if(e.mesh)e.mesh.visible=false;continue;}
    if(dt>lookAhead||dt<-lookBehind){if(e.mesh)e.mesh.visible=false;if(dt<-hitWindow&&!e.missed){e.missed=true;}continue;}
    if(!e.mesh)makeItem(e);
    e.mesh.visible=true;
    e.mesh.position.set(lanes[e.lane],e.y,zFromTime(e.time,t));
    const p=1+Math.sin(performance.now()/120)*.08;
    e.mesh.scale.set(1.75*p,1.75*p,1.75*p);
    if(Math.abs(dt)<=hitWindow&&e.lane===lane){
      e.hit=true; sampleHits++; cash+=25; e.mesh.visible=false;
      playSample(e); el("worldText").textContent="🍆"; rhythmHit(dt,"🍆"); updateUI();
    }
  }
}
function maybeSpawnGate(t){
  if(gates.length||crossfade) return;
  const dur=activeAudio.duration||(area.duration||120);
  if(!dur || dur<28) return;
  // v0.3.5 Listen Mode: route choice is only an outro/intermezzo offer.
  // It must never interrupt the middle of a track.
  const offerAt=Math.max(18,dur-24);
  if(t<offerAt || t>dur-8) return;
  const a=(areaIndex+1+Math.floor(Math.random()*(cfg.areas.length-1)))%cfg.areas.length;
  let b=(areaIndex+1+Math.floor(Math.random()*(cfg.areas.length-1)))%cfg.areas.length;
  if(b===a)b=(b+1)%cfg.areas.length;
  gates=[{time:t+6.2,lane:0,target:a,side:"L",hit:false,mesh:null},{time:t+6.2,lane:2,target:b,side:"R",hit:false,mesh:null}];
  fieldSplit={left:a,right:b,start:t,end:t+6.2};
  setFieldDualfield(cfg.areas[a],cfg.areas[b]);
  nextGateTime=999999;
}
function cancelGateChoice(message="NO CHOICE · RIDE CONTINUES"){
  for(const g of gates){ g.hit=true; if(g.mesh)g.mesh.visible=false; }
  gates=[]; fieldSplit=null;
  setFieldMonofield(area);
  el("worldText").textContent=area.title;
  if(message) show(message);
}
function updateGates(t){
  maybeSpawnGate(t);
  if(fieldSplit&&gates.length&&t>fieldSplit.end+0.75&&!gates.some(g=>g.hit)&&!crossfade){
    cancelGateChoice("");
    return;
  }
  if(fieldSplit&&gates.length&&Math.abs((fieldSplit.end)-t)<=hitWindow&&lane===1&&!crossfade){
    cancelGateChoice("");
    return;
  }
  for(const g of gates){
    const dt=g.time-t;
    if(g.hit){if(g.mesh)g.mesh.visible=false;continue;}
    if(dt>lookAhead||dt<-lookBehind){if(g.mesh)g.mesh.visible=false;if(dt<-hitWindow&&!g.hit)g.hit=true;continue;}
    if(!g.mesh)makeGate(g);
    g.mesh.visible=true;
    g.mesh.position.set(lanes[g.lane],g.y,zFromTime(g.time,t));
    if(Math.abs(dt)<=hitWindow&&lane===g.lane){
      gates.forEach(x=>{x.hit=true;if(x.mesh)x.mesh.visible=false;});
      fieldSplit=null;
      rhythmHit(dt,"🌈"); show(cfg.areas[g.target].title,"hit"); transitionTo(g.target);
    }
  }
}
async function transitionTo(target){
  spawnFinishLine();
  const old=activeAudio, inc=nextAudio;
  inc.pause(); inc.src=cfg.areas[target].file; inc.currentTime=0; inc.volume=0;
  await inc.play().catch(()=>{});
  crossfade={from:old,to:inc,start:performance.now()/1000,dur:12,target,fromArea:area,toArea:cfg.areas[target]}; document.body.classList.remove("protocol-split");
  started=true; el("worldText").textContent=cfg.areas[target].title;
}
function updateCrossfade(){
  if(!crossfade)return;
  const p=Math.min(1,(performance.now()/1000-crossfade.start)/crossfade.dur);
  crossfade.from.volume=1-p; crossfade.to.volume=p;
  setFieldGradient(crossfade.fromArea,crossfade.toArea,p);
  if(p>.35)applyArea(cfg.areas[crossfade.target]);
  if(p>=1){
    crossfade.from.pause();crossfade.from.currentTime=0;
    activeAudio=crossfade.to;nextAudio=crossfade.from;
    areaIndex=crossfade.target;area=cfg.areas[areaIndex];
    sampleHits=0;items=[];gates=[];letterItems=[];clearSprites();beatBlockEvents=[];beatRailEvents=[];nextBeatBlockEventIndex=0;nextBeatRailEventIndex=0;resetBeatBlockPool();resetBeatRailPool();planItems();
    pushRouteColor(area);setFieldMonofield(area);
    el("areaName").textContent=area.title;el("worldText").textContent=area.title;
    crossfade=null;updateUI();
  }
}
function animate(){
  requestAnimationFrame(animate);
  const t=activeAudio.currentTime||0; el("time").textContent=t.toFixed(1);
  if(gameOver){ renderer.render(scene,camera); return; }
  const run=started&&!activeAudio.paused; const roadSpeed=run?.72:.20;
  const curve=Math.sin((t||performance.now()/1000)*.22)*1.0;
  for(let i=0;i<road.length;i++){
    const m=road[i]; m.position.z+=roadSpeed; if(m.position.z>8)m.position.z-=road.length*8;
    m.position.x=Math.sin((m.position.z*.035)+t*.30)*curve;
  }
  for(let i=0;i<laneLines.length;i++){
    const l=laneLines[i]; l.position.z+=roadSpeed; if(l.position.z>8)l.position.z-=80*3.7;
    const base=(i%2===0?-1.65:1.65);
    l.position.x=base+Math.sin((l.position.z*.035)+t*.30)*curve;
  }
  updateBeatBlocksFromLegacyGhosts(t,roadSpeed);
  updateBeatRails(t);
  for(let i=0;i<oceanRibs.length;i++){
    const r=oceanRibs[i]; r.position.z+=roadSpeed*.92; if(r.position.z>12)r.position.z-=oceanRibs.length*14;
    r.rotation.z=Math.sin(t*.32+i)*.015;
    r.material.opacity=.20+Math.sin(t*1.2+i)*.055;
  }
  for(let i=0;i<oceanSheets.length;i++){
    const w=oceanSheets[i]; w.position.z+=roadSpeed*.20; if(w.position.z>-50)w.position.z=-150;
    w.position.y=-.50+Math.sin(t*.6+i)*.035;
  }
  for(let i=0;i<seaLights.length;i++){
    const pane=seaLights[i]; pane.position.z+=roadSpeed*.88; if(pane.position.z>12)pane.position.z-=seaLights.length/2*22;
    pane.material.opacity=.08+Math.sin(t*.85+i)*.04;
  }
  updateEnvironment(roadSpeed,t);
  updateFinishLine(roadSpeed);
  updateItems(t); updateDungeonLetters(t); updateSongPortals(t); updateGates(t); updateCrossfade();
  // v0.3.5: never force a route before the listener has heard the track.
  // When the song is actually over, gently continue to a random next ride.
  if(started && !crossfade && activeAudio.duration && activeAudio.ended){
    const next=(areaIndex+1+Math.floor(Math.random()*(cfg.areas.length-1)))%cfg.areas.length;
    show("FINISH LINE");
    transitionTo(next);
  }
  car.position.x+=(lanes[lane]-car.position.x)*.22;
  updateKartMotionFx(roadSpeed,t);
  camera.position.x+=(car.position.x*.18-camera.position.x)*.05;
  renderer.render(scene,camera);
}
function show(txt,cls=''){
  const f=el("feedback");
  f.className=cls||'';
  f.textContent=txt;
  f.style.opacity=1;
  f.style.transform="translate(-50%,-50%) scale(1.05)";
  setTimeout(()=>{f.style.opacity=0;f.style.transform="translate(-50%,-50%) scale(.9)"},650);
}
function updateUI(){if(el("cash")) el("cash").textContent=cash;el("sampleCount").textContent=sampleHits;updateRhythmHud();}
function onResize(){camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);}
