(()=>{'use strict';
const $=id=>document.getElementById(id),world=$('worldCanvas'),wctx=world.getContext('2d'),hatchCanvas=$('hatchCanvas'),hctx=hatchCanvas.getContext('2d'),game=$('gameCanvas'),gctx=game.getContext('2d');
const SAVE_KEY='slopsnake-world-discovery-v1',GAME_INFO={star:{title:'STAR RINGS',icon:'✦',where:'THE SINGING RIFT',instructions:'Fly through 8 rings before the finish. Touch above or below the worm; dodge the dark rocks.'},spheres:{title:'COLOR SPHERES',icon:'🔵',where:'THE CHECKER MOON',instructions:'Tap an adjacent blue sphere. Turn all sixteen red without touching a red sphere or leaving the grid.'},dolphin:{title:'DOLPHIN ECHO',icon:'🐬',where:'INSIDE THE DOLPHIN',instructions:'Swim freely. Dive, build speed and leap over the island to the far lagoon. Tap the water to steer and kick your tail; tap again to build speed. Hold on the water to keep your momentum, drag to change course, and release to glide. (C on keyboard.) Tap in the air for a somersault. ECHO fires from your nose, even above water: aim it at the cliff to paint a boost lane, swim through the glowing trail, then dive and leap. No time limit, no lives: if you miss, keep exploring or use WORLD to leave.'},whale:{title:'WHALE BELLY',icon:'🐋',where:'INSIDE THE WHALE',instructions:'Ride the three alternating currents to gather 3 glow-plums. They dissolve the plug in the blowhole. Swim into the freed upward jet to launch out! Your air runs out after 45 seconds; a failed run simply lets you retry.'},trail:{title:'RAINBOW TRAIL',icon:'🩷',where:'THE PINK DRIFTER',instructions:'Touch the pink ball and draw a Rainbow Slopworm trail to the star cup. Release to roll. Avoid the ink-blots.'},airbridge:{title:'PINK BALL AIRBRIDGE',icon:'🫧',where:'THE FALLING BUBBLE',instructions:'The pink ball is loose! Keep drawing short platforms beneath it. Bounce through three stars, then land in the cloud.'},sling:{title:'STAR SLING',icon:'🌠',where:'THE TWIN STICKS',instructions:'Draw a rope from one stick to the other. Then pull the pink ball down and sideways, and release: TWANG! It flies in a perfectly STRAIGHT line. The camera follows it into the starry sky. Every missed shot flies away harmlessly and a new ball loads. Keep shooting to collect all 40 stars. No lives, power meter or time limit.'},laundry:{title:'LOST IN THE LAUNDRY',icon:'🧺',where:'THE WASHMAN’S HOUSE',instructions:'Watch the worm jump into one of three laundry baskets. Follow the baskets as they shuffle, then tap the right basket. Find the worm three times to win. No lives or harsh timer; wrong guesses let you watch again.'},tilt:{title:'TILT TUNNEL',icon:'🌀',where:'THE TILT MACHINE',instructions:'Drag left/right on the playfield to rotate the maze (desktop: arrows or A/D). Only HOP jumps. Break brown blocks with speed or a jump. Avoid the crosses, collect time stars and reach FINISH. Clear Level 1 to unlock Level 2, where blue clocks automatically activate Bullet Time.'}};
let save={version:1,discovered:[],wins:[],coins:[],tiltLevel2Unlocked:false};try{const x=JSON.parse(localStorage.getItem(SAVE_KEY)||'null');if(x?.version===1)save={...save,...x}}catch(_e){}
// Legacy Tilt winners also retain access to the new second level.
save.tiltLevel2Unlocked=Boolean(save.tiltLevel2Unlocked||save.wins.includes('tilt'));
const persist=()=>{try{localStorage.setItem(SAVE_KEY,JSON.stringify(save))}catch(_e){}};
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n)),dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y),lerp=(a,b,t)=>a+(b-a)*t;
let audio=null,sound=true,tiltCardNextLevel=0;
// iOS Safari can create a suspended Web Audio context on the very first HOLD.
// Unlock synchronously during that first trusted gesture, rather than waiting
// for the first tap/touchend. This also recovers an interrupted context.
function unlockAudio(){
 if(!sound)return;
 try{
  audio??=new (window.AudioContext||window.webkitAudioContext)();
  if(audio.state!=='running'){
   const result=audio.resume();
   result?.catch?.(()=>{});
  }
 }catch(_e){}
}
for(const eventName of ['pointerdown','touchend','keydown'])
 document.addEventListener(eventName,unlockAudio,{capture:true,passive:true});
function tone(freq=440,d=.09,type='sine',vol=.08){
 if(!sound)return;
 try{
  unlockAudio();if(!audio)return;
  const o=audio.createOscillator(),v=audio.createGain();
  o.type=type;o.frequency.value=freq;
  v.gain.setValueAtTime(Math.max(.001,vol),audio.currentTime);
  v.gain.exponentialRampToValueAtTime(.001,audio.currentTime+d);
  o.connect(v).connect(audio.destination);o.start();o.stop(audio.currentTime+d);
 }catch(_e){}
}
function fanfare(){[0,90,180,285].forEach((t,i)=>setTimeout(()=>tone([392,523,659,784][i],.2,'triangle',.1),t))}
let toastTimer;function toast(s){$('toast').textContent=s;$('toast').classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').classList.remove('show'),1700)}
function setHatchHeld(on){if(hatchMode!=='charging')return;hatchHeld=on;$('hatchButton').classList.toggle('holding',on)}
function burstEgg(now,W,H){hatchMode='exploding';hatchBurstAt=now;hatchHeld=false;$('birth').hidden=true;hatchShards=Array.from({length:1200},(_,i)=>{const a=Math.random()*Math.PI*2,s=.18+Math.random()*1.65,r=20+Math.random()*Math.min(W,H)*.28;return{x:W/2+Math.cos(a)*r*.18,y:H*.29+Math.sin(a)*r*.12,vx:Math.cos(a)*s*W,vy:Math.sin(a)*s*H-H*(.25+Math.random()*.55),rot:Math.random()*7,vr:(Math.random()-.5)*13,size:2+Math.random()*9,hue:i%7===0?Math.random()*360:35+Math.random()*35}});fanfare();tone(95,.8,'sawtooth',.13)}
function drawHatchWorm(W,H,now){const p=hatchProgress,cx=W/2,cy=H*.27,limit=clamp((p-.42)/.33,0,1),squeeze=1-p*.18;hctx.save();hctx.translate(cx,cy);if(limit>0){for(let i=4;i>=1;i--){hctx.strokeStyle=`hsla(${now/12+i*55},95%,70%,${limit*(.16+i*.06)})`;hctx.lineWidth=5+i*6;hctx.beginPath();hctx.ellipse(0,0,70+i*20+Math.sin(now/90+i)*8,28+i*11,0,0,7);hctx.stroke()}}for(let i=10;i>=1;i--){const x=-i*13*squeeze,y=Math.sin(i*.8+now/500)*7,hue=(now/18+i*32)%360;hctx.fillStyle=limit>.05?`hsl(${hue} ${45+limit*50}% ${58+limit*15}%)`:'#9fb890';hctx.strokeStyle='#2d2940';hctx.lineWidth=3;hctx.beginPath();hctx.arc(x,y,10-i*.25,0,7);hctx.fill();hctx.stroke()}hctx.scale(1+p*.16,1+p*.1);hctx.fillStyle=limit>.05?`hsl(${(now/16)%360} 92% 72%)`:'#a9c79c';hctx.strokeStyle='#2d2940';hctx.lineWidth=5;hctx.beginPath();hctx.ellipse(0,0,27,21,0,0,7);hctx.fill();hctx.stroke();hctx.fillStyle='#2d2940';hctx.beginPath();hctx.arc(8,-7,3.5,0,7);hctx.arc(8,7,3.5,0,7);hctx.fill();hctx.strokeStyle='#ef729b';hctx.lineWidth=3;hctx.beginPath();hctx.moveTo(23,0);hctx.lineTo(34+p*10,0);hctx.stroke();hctx.restore()}
function drawHatch(now,dt){if(hatched||hatchCanvas.hidden)return;const d=hatchCanvas._d||1,W=hatchCanvas.width/d,H=hatchCanvas.height/d;hctx.setTransform(d,0,0,d,0,0);hctx.clearRect(0,0,W,H);if(hatchMode==='charging'){hatchProgress=clamp(hatchProgress+(hatchHeld?dt/1.45:-dt*.7),0,1);const pulse=Math.sin(now/380)*.04,g=hctx.createRadialGradient(W/2,H*.34,10,W/2,H*.42,Math.max(W,H)*.78);g.addColorStop(0,`hsl(${42+hatchProgress*35} 90% ${77+hatchProgress*8}%)`);g.addColorStop(.58,'#e9b7a7');g.addColorStop(1,'#4a2e55');hctx.fillStyle=g;hctx.fillRect(0,0,W,H);hctx.strokeStyle='#fff4cc2c';hctx.lineWidth=18;for(let i=0;i<9;i++){hctx.beginPath();hctx.ellipse(W/2,H*.42,W*(.48-i*.025),H*(.68-i*.035)+pulse*H,i%2?.08:-.08,0,7);hctx.stroke()}drawHatchWorm(W,H,now);if(hatchProgress>.18){const cracks=Math.floor(hatchProgress*22);hctx.strokeStyle=`rgba(55,39,63,${.2+hatchProgress*.7})`;hctx.lineWidth=2+hatchProgress*3;for(let i=0;i<cracks;i++){const a=i*2.399+now*.00005,r0=Math.min(W,H)*(.18+(i%4)*.06);hctx.beginPath();hctx.moveTo(W/2+Math.cos(a)*r0,H*.31+Math.sin(a)*r0);for(let j=1;j<5;j++){const r=r0+j*20*hatchProgress;hctx.lineTo(W/2+Math.cos(a+j*.13*(i%2?1:-1))*r,H*.31+Math.sin(a+j*.13*(i%2?1:-1))*r)}hctx.stroke()}}$('hatchFill').style.width=`${hatchProgress*100}%`;$('hatchButton').textContent=hatchProgress>.72?'DON’T LET GO — BREAK IT!':hatchProgress>.43?'RAINBOW LIMITBREAK…':'HOLD TO HATCH ✦';if(hatchProgress>.48&&!hatchLimitSound){hatchLimitSound=true;tone(523,.3,'triangle',.12);setTimeout(()=>tone(784,.35,'triangle',.1),120)}if(hatchProgress<.35)hatchLimitSound=false;if(hatchProgress>=1)burstEgg(now,W,H)}else{const e=(now-hatchBurstAt)/1400,fade=clamp(1-e*1.25,0,1);hctx.fillStyle=`rgba(255,225,190,${fade})`;hctx.fillRect(0,0,W,H);for(const s of hatchShards){s.vy+=H*.9*dt;s.x+=s.vx*dt;s.y+=s.vy*dt;s.rot+=s.vr*dt;hctx.save();hctx.translate(s.x,s.y);hctx.rotate(s.rot);hctx.fillStyle=`hsla(${s.hue},85%,${62+Math.min(25,e*20)}%,${clamp(1-e*.7,0,1)})`;hctx.fillRect(-s.size/2,-s.size/3,s.size,s.size*.66);hctx.restore()}if(e>1.05){hatched=true;hatchCanvas.hidden=true;player.trail=[];try{sessionStorage.setItem(WORLD_HATCH_KEY,'1')}catch(_e){}toast('🌈 LIMITBREAK · WELCOME TO SPACE');tone(880,.3,'triangle',.1)}}}
function resize(){const d=Math.min(devicePixelRatio||1,2),rect=world.getBoundingClientRect();world.width=Math.max(1,Math.round(rect.width*d));world.height=Math.max(1,Math.round(rect.height*d));world._d=d;hatchCanvas.width=world.width;hatchCanvas.height=world.height;hatchCanvas._d=d;// clientWidth/clientHeight ignore compensating visual-viewport transforms on iOS.
 const gameWidth=game.clientWidth,gameHeight=game.clientHeight;game.width=Math.max(1,Math.round(gameWidth*d));game.height=Math.max(1,Math.round(gameHeight*d));game._d=d}addEventListener('resize',resize,{passive:true});resize();
const WORLD_HATCH_KEY='slopsnake-world-hatched-session-v1',WORLD_RETURN_KEY='slopsnake-world-return-position-v1';
const map={w:2600,h:1500};let player={x:410,y:670,vx:0,vy:0,facing:0,trail:[]},camera={x:0,y:0},hatched=false,last=performance.now(),near=null,hatchHeld=false,hatchProgress=0,hatchMode='charging',hatchBurstAt=0,hatchLimitSound=false,hatchShards=[];
try{if(sessionStorage.getItem(WORLD_HATCH_KEY)==='1'){hatched=true;hatchCanvas.hidden=true;$('birth').hidden=true;}}catch(_e){}
const POIS=[
 {id:'star',x:390,y:300,r:92,title:'THE SINGING RIFT',text:'The rings are humming.',icon:'✦',game:'star'},
 {id:'spheres',x:1030,y:325,r:105,title:'CHECKER MOON',text:'Blue things. Red consequences.',icon:'🔵',game:'spheres'},
 {id:'trail',x:740,y:620,r:88,title:'THE PINK DRIFTER',text:'It wants you to draw something alive.',icon:'🩷',game:'trail'},
 {id:'airbridge',x:1460,y:410,r:88,title:'THE FALLING BUBBLE',text:'This pink ball has misplaced the floor.',icon:'🫧',game:'airbridge'},
 {id:'sling',x:1870,y:235,r:90,title:'THE TWIN STICKS',text:'Draw a rope, then send straight-line shots through the starry sky.',icon:'🌠',game:'sling'},
 {id:'house',x:2040,y:480,r:150,title:"THE WASHMAN'S HOUSE",text:'A worm vanished into a basket. Follow the shuffle!',icon:'🏠',game:'laundry'},
 {id:'machine',x:2250,y:1020,r:125,title:'THE TILT MACHINE',text:'Spin the maze, roll a ball and leap through breakable blocks!',icon:'🌀',game:'tilt'},
 {id:'whale',x:1260,y:1115,r:185,title:'THE FLOATING WHALE',text:'A plugged blowhole. Three currents are humming inside.',icon:'🐋',game:'whale'},
 {id:'dolphin',x:1760,y:1230,r:105,title:'THE ECHO DOLPHIN',text:'It is carrying a whole room somehow.',icon:'🐬',game:'dolphin'}
];
const coins=Array.from({length:24},(_,i)=>({id:i,x:180+(i*347)%2220,y:170+(i*193)%1120}));
function zone(){return player.y>850?'SLOPWORM OCEAN':player.x>1800?'SLOPWORM GARDEN':'SLOPWORM SPACE'}
function drawWorld(t){const d=world._d||1,W=world.width/d,H=world.height/d;wctx.setTransform(d,0,0,d,0,0);wctx.clearRect(0,0,W,H);camera.x=lerp(camera.x,clamp(player.x-W/2,0,map.w-W),.08);camera.y=lerp(camera.y,clamp(player.y-H/2,0,map.h-H),.08);wctx.save();wctx.translate(-camera.x,-camera.y);
 const sky=wctx.createLinearGradient(0,0,0,map.h);sky.addColorStop(0,'#15112f');sky.addColorStop(.55,'#272052');sky.addColorStop(.57,'#166d89');sky.addColorStop(1,'#073e62');wctx.fillStyle=sky;wctx.fillRect(0,0,map.w,map.h);
 for(let i=0;i<150;i++){const x=(i*193)%map.w,y=(i*83)%820,r=1+(i%3);wctx.fillStyle=`hsla(${180+i%100},90%,85%,${.25+(i%5)/8})`;wctx.beginPath();wctx.arc(x,y,r+(Math.sin(t/500+i)*.5),0,7);wctx.fill()}
 wctx.fillStyle='#24b3c455';wctx.beginPath();wctx.moveTo(0,850);for(let x=0;x<=map.w;x+=45)wctx.lineTo(x,850+Math.sin(x/95+t/750)*15);wctx.lineTo(map.w,map.h);wctx.lineTo(0,map.h);wctx.fill();
 for(let i=0;i<38;i++){const x=(i*271)%map.w,y=890+(i*137)%570;wctx.strokeStyle='#a9f5ff44';wctx.beginPath();wctx.arc(x,y,3+i%8,0,7);wctx.stroke()}
 drawPlanet(1030,325,108,'#86e9e0','#604dc5');drawRift(390,300,t);drawPinkDrifter(t);drawFallingBubble(t);drawTwinSticks(t);drawGarden();drawHouse();drawMachine(t);drawWhale(t);drawDolphin(t);
 for(const c of coins){if(save.coins.includes(c.id))continue;const bob=Math.sin(t/220+c.id)*7;wctx.fillStyle='#ffe267';wctx.strokeStyle='#5f3c54';wctx.lineWidth=3;wctx.beginPath();wctx.arc(c.x,c.y+bob,11,0,7);wctx.fill();wctx.stroke();wctx.fillStyle='#fff6b3';wctx.fillRect(c.x-2,c.y-7+bob,4,9)}
 drawWorm(player.x,player.y,t);if(worldTarget){wctx.strokeStyle='#fff9';wctx.lineWidth=3;wctx.beginPath();wctx.arc(worldTarget.x,worldTarget.y,12+Math.sin(t/130)*3,0,7);wctx.stroke()}wctx.restore();$('zoneName').textContent=zone();$('coinCount').textContent=save.coins.length}
function drawPlanet(x,y,r,a,b){wctx.fillStyle='#0c0924';wctx.beginPath();wctx.arc(x+5,y+8,r+8,0,7);wctx.fill();const g=wctx.createRadialGradient(x-35,y-40,8,x,y,r);g.addColorStop(0,a);g.addColorStop(1,b);wctx.fillStyle=g;wctx.beginPath();wctx.arc(x,y,r,0,7);wctx.fill();wctx.strokeStyle='#f5d6ff88';wctx.lineWidth=16;wctx.beginPath();wctx.ellipse(x,y,r*1.45,r*.28,-.15,0,7);wctx.stroke()}
function drawRift(x,y,t){wctx.save();wctx.translate(x,y);wctx.rotate(t/1800);for(let i=0;i<5;i++){wctx.strokeStyle=`hsl(${i*55+t/30} 90% 70%)`;wctx.lineWidth=8-i;wctx.beginPath();wctx.ellipse(0,0,40+i*13,18+i*7,i*.3,0,7);wctx.stroke()}wctx.restore()}
function drawPinkDrifter(t){wctx.save();wctx.translate(740,620+Math.sin(t/480)*10);wctx.strokeStyle='#ffb7dd77';wctx.lineWidth=5;wctx.beginPath();wctx.arc(0,0,64+Math.sin(t/260)*5,0,7);wctx.stroke();wctx.fillStyle='#ff89bd';wctx.strokeStyle='#2b1c45';wctx.lineWidth=6;wctx.beginPath();wctx.arc(0,0,31,0,7);wctx.fill();wctx.stroke();wctx.fillStyle='#fff8';wctx.beginPath();wctx.arc(-10,-11,8,0,7);wctx.fill();wctx.restore()}
function drawFallingBubble(t){wctx.save();wctx.translate(1460,410);wctx.strokeStyle='#91f4ff99';wctx.lineWidth=5;for(let i=0;i<3;i++){wctx.beginPath();wctx.arc(Math.sin(t/500+i)*18,i*25-25,42-i*7,0,7);wctx.stroke()}wctx.fillStyle='#ff8fc5';wctx.strokeStyle='#2b1c45';wctx.lineWidth=5;wctx.beginPath();wctx.arc(0,Math.sin(t/300)*18,25,0,7);wctx.fill();wctx.stroke();wctx.restore()}
function drawTwinSticks(t){wctx.save();wctx.translate(1870,235);wctx.strokeStyle='#4b3150';wctx.lineWidth=13;wctx.lineCap='round';wctx.beginPath();wctx.moveTo(-55,55);wctx.lineTo(-55,-35);wctx.moveTo(55,55);wctx.lineTo(55,-35);wctx.stroke();wctx.strokeStyle=`hsl(${t/25} 90% 70%)`;wctx.lineWidth=5;wctx.beginPath();wctx.moveTo(-55,-30);wctx.quadraticCurveTo(0,10+Math.sin(t/300)*8,55,-30);wctx.stroke();wctx.fillStyle='#ff87bd';wctx.beginPath();wctx.arc(0,7,22,0,7);wctx.fill();wctx.restore()}
function drawGarden(){wctx.fillStyle='#3e8d68';wctx.beginPath();wctx.ellipse(2110,670,360,185,0,0,7);wctx.fill();for(let i=0;i<16;i++){wctx.fillStyle=i%2?'#ff7fac':'#ffe777';wctx.fillRect(1870+(i*71)%470,620+(i%3)*38,10,18)}}
function drawHouse(){wctx.fillStyle='#332944';wctx.fillRect(1915,420,260,220);wctx.fillStyle='#ffcc91';wctx.fillRect(1900,395,260,220);wctx.fillStyle='#e65f83';wctx.beginPath();wctx.moveTo(1860,405);wctx.lineTo(2030,270);wctx.lineTo(2200,405);wctx.closePath();wctx.fill();wctx.strokeStyle='#332944';wctx.lineWidth=9;wctx.stroke();wctx.fillStyle='#695292';wctx.fillRect(2010,500,70,115);wctx.font='44px system-ui';wctx.fillText('🧺',2110,505)}
function drawMachine(t){wctx.fillStyle='#19162e';wctx.fillRect(2165,890,190,235);wctx.fillStyle='#a86cf0';wctx.fillRect(2150,875,190,235);wctx.fillStyle='#211a3d';wctx.fillRect(2180,910,130,105);wctx.strokeStyle='#67f1d1';wctx.lineWidth=7;wctx.strokeRect(2180,910,130,105);wctx.fillStyle='#ffd968';wctx.beginPath();wctx.arc(2245+Math.sin(t/300)*30,965,18,0,7);wctx.fill();wctx.fillStyle='#d5fa72';wctx.fillRect(2190,1050,110,24);if(save.tiltLevel2Unlocked){const bob=Math.sin(t/330)*7;wctx.save();wctx.shadowColor='#9bfbff';wctx.shadowBlur=19;wctx.fillStyle='#112c4b';wctx.strokeStyle='#8ef6ff';wctx.lineWidth=5;wctx.beginPath();wctx.arc(2290,842+bob,29,0,Math.PI*2);wctx.fill();wctx.stroke();wctx.shadowBlur=0;wctx.fillStyle='#ffffff';wctx.textAlign='center';wctx.textBaseline='middle';wctx.font='1000 31px system-ui';wctx.fillText('2',2290,841+bob);wctx.restore();}}
function drawWhale(t){
 // Larger, readable whale with an actual black open mouth and a visible blowhole.
 const freed=save.wins.includes('whale');
 wctx.save();wctx.translate(1260,1115+Math.sin(t/720)*9);
 wctx.shadowColor='#051d3766';wctx.shadowBlur=24;wctx.shadowOffsetY=11;
 const skin=wctx.createLinearGradient(-140,-95,100,90);skin.addColorStop(0,'#c1fff3');skin.addColorStop(.58,'#7bd4df');skin.addColorStop(1,'#28658e');
 wctx.fillStyle=skin;wctx.strokeStyle='#10354e';wctx.lineWidth=8;wctx.lineJoin='round';
 wctx.beginPath();wctx.moveTo(-182,-9);wctx.bezierCurveTo(-172,-84,-70,-110,39,-92);
 wctx.bezierCurveTo(97,-86,130,-56,152,-26);wctx.lineTo(192,-73);wctx.lineTo(209,-38);wctx.lineTo(229,-5);
 wctx.lineTo(195,4);wctx.lineTo(206,39);wctx.lineTo(156,23);
 wctx.bezierCurveTo(115,92,-16,103,-120,68);wctx.bezierCurveTo(-179,49,-190,20,-182,-9);wctx.closePath();wctx.fill();wctx.stroke();
 wctx.shadowBlur=0;wctx.shadowOffsetY=0;
 // Pale belly and a distinctly open black mouth: it is the entrance.
 wctx.fillStyle='#d7ffeb';wctx.beginPath();wctx.moveTo(-168,30);wctx.bezierCurveTo(-91,75,35,65,121,35);
 wctx.bezierCurveTo(40,100,-95,98,-168,30);wctx.fill();
 wctx.fillStyle='#080d23';wctx.strokeStyle='#163f57';wctx.lineWidth=5;wctx.beginPath();wctx.ellipse(-160,18,32,25,-.15,0,7);wctx.fill();wctx.stroke();
 wctx.strokeStyle='#ebf7df';wctx.lineWidth=3;wctx.beginPath();wctx.moveTo(-184,28);wctx.quadraticCurveTo(-152,45,-132,35);wctx.stroke();
 wctx.fillStyle='#13364c';wctx.beginPath();wctx.arc(-111,-35,7,0,7);wctx.fill();wctx.fillStyle='#fff';wctx.beginPath();wctx.arc(-113,-38,2.5,0,7);wctx.fill();
 wctx.fillStyle='#3284a4';wctx.strokeStyle='#133e58';wctx.lineWidth=5;wctx.beginPath();wctx.moveTo(-8,46);wctx.lineTo(32,101);wctx.lineTo(-38,69);wctx.closePath();wctx.fill();wctx.stroke();
 // Visible opening on top, either plugged or spraying after a win.
 wctx.fillStyle='#071c31';wctx.strokeStyle='#d3fff4';wctx.lineWidth=4;wctx.beginPath();wctx.ellipse(-2,-89,20,10,0,0,7);wctx.fill();wctx.stroke();
 if(freed){
  wctx.strokeStyle='#a7ffffd8';wctx.lineWidth=7;wctx.lineCap='round';
  for(let i=-1;i<=1;i++){wctx.beginPath();wctx.moveTo(-2,-96);wctx.quadraticCurveTo(i*23,-131,i*42,-159+Math.sin(t/300+i)*8);wctx.stroke();}
  for(let i=0;i<11;i++){const x=-58+(i*41)%116,y=-113-(i*17+t*.05)%72;
   wctx.fillStyle='#bafffa';wctx.beginPath();wctx.arc(x,y,2+i%3,0,7);wctx.fill();}
 }else{wctx.fillStyle='#edaa75';wctx.strokeStyle='#472b52';wctx.lineWidth=3;wctx.beginPath();wctx.ellipse(-2,-90,12,6,0,0,7);wctx.fill();wctx.stroke();}
 wctx.restore();
}
function drawDolphin(t){wctx.save();wctx.translate(1760,1230+Math.sin(t/420)*18);wctx.fillStyle='#78f0d6';wctx.strokeStyle='#123953';wctx.lineWidth=7;wctx.beginPath();wctx.ellipse(0,0,92,38,-.12,0,7);wctx.fill();wctx.stroke();wctx.beginPath();wctx.moveTo(75,-5);wctx.lineTo(145,-19);wctx.lineTo(88,16);wctx.closePath();wctx.fill();wctx.stroke();wctx.fillStyle='#123953';wctx.beginPath();wctx.arc(-40,-12,5,0,7);wctx.fill();wctx.restore()}
function drawWorm(x,y,t){const speed=Math.hypot(player.vx,player.vy),moving=speed>3,inhaling=moving&&speed<52,breath=1+Math.sin(t/520)*.11,gap=inhaling?6:moving?5.5+5.5*(.5+.5*Math.sin(t/115)):8+Math.sin(t/520)*.8,bodyScale=inhaling?.88:moving?1:breath;if(!player.trail.length)player.trail=Array.from({length:18},(_,i)=>({x:x-i*gap,y}));player.trail[0].x=x;player.trail[0].y=y;for(let i=1;i<player.trail.length;i++){const lead=player.trail[i-1],p=player.trail[i],dx=lead.x-p.x,dy=lead.y-p.y,d=Math.hypot(dx,dy)||1;if(d>gap){p.x+=dx/d*(d-gap);p.y+=dy/d*(d-gap)}else if(d<gap*.72){p.x-=dx/d*(gap*.72-d);p.y-=dy/d*(gap*.72-d)}}if(bodyScale>.03)for(let i=player.trail.length-1;i>=2;i-=2){const p=player.trail[i],h=(i*22+t/25)%360,r=(12-i*.16)*bodyScale;wctx.fillStyle=`hsl(${h} 85% 69%)`;wctx.strokeStyle='#17122b';wctx.lineWidth=Math.max(1,4*bodyScale);wctx.beginPath();wctx.arc(p.x,p.y,r,0,7);wctx.fill();wctx.stroke()}const a=moving?Math.atan2(player.vy,player.vx):player.facing+Math.sin(t/900)*.04;wctx.save();wctx.translate(x,y+(!moving?Math.sin(t/520)*1.5:0));wctx.rotate(a);wctx.scale(moving?1:breath,moving?1:1+(breath-1)*.65);wctx.fillStyle=`hsl(${(t/20)%360} 85% 72%)`;wctx.strokeStyle='#17122b';wctx.lineWidth=5;wctx.beginPath();wctx.ellipse(0,0,25,20,0,0,7);wctx.fill();wctx.stroke();wctx.fillStyle='#17122b';wctx.beginPath();wctx.arc(7,-7,3.5,0,7);wctx.arc(7,7,3.5,0,7);wctx.fill();wctx.strokeStyle='#ff7aa9';wctx.lineWidth=3;wctx.beginPath();wctx.moveTo(21,0);wctx.lineTo(32,0);wctx.stroke();wctx.restore()}
// World movement is one deliberate wiggle per tap or key press.
// Keep the existing held-key dictionary for INSIDE microgames (dolphin, spheres, etc.).
let keys={},worldTarget=null,worldStep=null,gameTarget=null,dismissedPoi=null;
// Return to the place you visited, so EXIT never sends a hatched worm back to its shell.
try{const saved=JSON.parse(sessionStorage.getItem(WORLD_RETURN_KEY)||'null');if(hatched&&saved&&Number.isFinite(saved.x)&&Number.isFinite(saved.y)){player.x=clamp(saved.x,35,map.w-35);player.y=clamp(saved.y,35,map.h-35);camera.x=clamp(player.x-innerWidth/2,0,Math.max(0,map.w-innerWidth));camera.y=clamp(player.y-innerHeight/2,0,Math.max(0,map.h-innerHeight));dismissedPoi=typeof saved.poi==='string'?saved.poi:null;}sessionStorage.removeItem(WORLD_RETURN_KEY)}catch(_e){}
const WIGGLE_DISTANCE=110,WIGGLE_DURATION=.52;
function canWiggleWorld(){return hatched&&$('gameLayer').hidden&&$('entryConfirm').hidden&&$('collection').hidden&&$('passport').hidden}
function wiggleTo(target){
 if(!canWiggleWorld()||worldStep)return;
 const dx=target.x-player.x,dy=target.y-player.y,d=Math.hypot(dx,dy);
 if(d<10)return;
 const step=Math.min(d,WIGGLE_DISTANCE),x=clamp(player.x+dx/d*step,35,map.w-35),y=clamp(player.y+dy/d*step,35,map.h-35);
 if(Math.hypot(x-player.x,y-player.y)<3)return;
 worldStep={x0:player.x,y0:player.y,x1:x,y1:y,elapsed:0};
 worldTarget={x,y};
 player.facing=Math.atan2(y-player.y,x-player.x);
}
const worldDirections={arrowup:[0,-1],w:[0,-1],arrowdown:[0,1],s:[0,1],arrowleft:[-1,0],a:[-1,0],arrowright:[1,0],d:[1,0]};
addEventListener('keydown',e=>{
 const key=e.key.toLowerCase();keys[key]=true;
 if(['arrowup','arrowdown','arrowleft','arrowright',' '].includes(key))e.preventDefault();
 if(worldDirections[key]&&!e.repeat&&canWiggleWorld()){
  const [dx,dy]=worldDirections[key];wiggleTo({x:player.x+dx*WIGGLE_DISTANCE,y:player.y+dy*WIGGLE_DISTANCE});
 }
 if(e.key==='Enter'&&!e.repeat&&near&&canWiggleWorld())offerEnter();
 if(gameRunning&&activeGame==='tilt'&&!e.repeat&&key===' '){e.preventDefault();tiltJump();}
 if(gameRunning&&activeGame==='laundry'&&!e.repeat&&['1','2','3'].includes(key))laundryChoose(Number(key)-1);
});
addEventListener('keyup',e=>keys[e.key.toLowerCase()]=false);
addEventListener('blur',()=>{keys={}});
function keyVector(){let x=(keys.arrowright||keys.d?1:0)-(keys.arrowleft||keys.a?1:0),y=(keys.arrowdown||keys.s?1:0)-(keys.arrowup||keys.w?1:0),m=Math.hypot(x,y);return m>1?{x:x/m,y:y/m}:{x,y}}
function pointVector(x,y,target,dead=.025){const dx=target?target.x-x:0,dy=target?target.y-y:0,m=Math.hypot(dx,dy);return m<dead?{x:0,y:0}:{x:dx/m,y:dy/m}}
function worldPoint(e){const r=world.getBoundingClientRect();return{x:camera.x+(e.clientX-r.left)/r.width*(world.width/(world._d||1)),y:camera.y+(e.clientY-r.top)/r.height*(world.height/(world._d||1))}}
world.addEventListener('pointerdown',e=>{
 if(!canWiggleWorld()||e.pointerType==='mouse'&&e.button!==0)return;
 // No pointer capture or move handler: holding or dragging cannot steer or accelerate.
 wiggleTo(worldPoint(e));
});
function gamePoint(e){const r=game.getBoundingClientRect();return{x:clamp((e.clientX-r.left)/r.width,0,1),y:clamp((e.clientY-r.top)/r.height,0,1)}}
game.addEventListener('pointerdown',e=>{
 if(!gameRunning||e.pointerType==='mouse'&&e.button!==0)return;
 // Tilt uses its own touch-only rotation listener on gameLayer.
 // Do not capture a tilt tap or turn it into a jump.
 if(activeGame==='tilt')return;
 if(activeGame==='dolphin'&&gs){
  // The ocean itself is the tail control: one tap steers and kicks, holding coasts at speed.
  // A second finger cannot accidentally trigger multiple strokes.
  if(gs.tailPointer!==null)return;
  gs.tailPointer=e.pointerId;
  gs.airTap={x:e.clientX,y:e.clientY,at:performance.now(),air:gs.air};
  if(!gs.air){strokeDolphinTail();syncDolphinTail();}
 }
 game.setPointerCapture(e.pointerId);
 
 handleGamePoint(gamePoint(e),true);
});
game.addEventListener('pointermove',e=>{
 if(activeGame==='tilt')return;
 if(gameRunning&&game.hasPointerCapture(e.pointerId)&&(activeGame!=='dolphin'||gs?.tailPointer===e.pointerId))
  handleGamePoint(gamePoint(e),false);
});
game.addEventListener('pointerup',e=>{
 if(activeGame==='tilt')return;
 if(activeGame==='dolphin'){
  if(gs?.tailPointer!==e.pointerId)return;
  const tap=gs.airTap;
  if(tap?.air&&gs.air&&performance.now()-tap.at<290&&Math.hypot(e.clientX-tap.x,e.clientY-tap.y)<25){startDolphinFlip();gameTarget=null;}
  gs.airTap=null;releaseDolphinPointer(e.pointerId);
 }
 const p=gamePoint(e);
 if(activeGame==='trail'&&gameRunning&&gs?.drawing){gs.drawing=false;if(gs.path.length>5){gs.phase='roll';gs.pathIndex=0}else finishGame(false,'Start on the pink ball and draw a longer trail.');}
 else if(activeGame==='airbridge'&&gameRunning)finishPlatform(p);
 else if(activeGame==='sling'&&gameRunning)finishSlingGesture(p);
 
});
for(const eventName of ['pointercancel','lostpointercapture'])game.addEventListener(eventName,e=>{
 if(activeGame==='dolphin'&&gs?.tailPointer===e.pointerId){gs.airTap=null;releaseDolphinPointer(e.pointerId);}if(activeGame==='sling'&&gs){gs.gesture=null;gs.pulling=false;}
});
// Mobile WKWebView/Safari can ignore user-scalable=no, especially after pinch or
// double-tap. Block native gestures only while Dolphin is open; if the browser
// still zooms, counter-scale the entire game onto the visible viewport.
const defaultViewport=document.querySelector('meta[name="viewport"]')?.content||'';
let dolphinLastTap=0,dolphinTapX=0,dolphinTapY=0;
function fitDolphinViewport(){
 const layer=$('gameLayer'),vv=window.visualViewport;
 if(activeGame!=='dolphin'||layer.hidden||!vv)return;
 const scale=vv.scale||1;
 if(scale>1.01){
  layer.style.left=`${vv.offsetLeft}px`;
  layer.style.top=`${vv.offsetTop}px`;
  layer.style.right='auto';layer.style.bottom='auto';
  layer.style.width=`${vv.width*scale}px`;
  layer.style.height=`${vv.height*scale}px`;
  layer.style.transformOrigin='0 0';
  layer.style.transform=`scale(${1/scale})`;
 }else{
  for(const property of ['left','top','right','bottom','width','height','transformOrigin','transform'])layer.style[property]='';
 }
 // Recalculate the game in its actual CSS coordinate space (not the scaled rect).
 resize();
}
function setDolphinViewport(on){
 const meta=document.querySelector('meta[name="viewport"]');
 if(meta)meta.content=on?'width=device-width,initial-scale=1,minimum-scale=1,maximum-scale=1,user-scalable=no,viewport-fit=cover':defaultViewport;
 if(on)fitDolphinViewport();
 else{
  const layer=$('gameLayer');
  for(const property of ['left','top','right','bottom','width','height','transformOrigin','transform'])layer.style[property]='';
 }
}
window.visualViewport?.addEventListener('resize',fitDolphinViewport,{passive:true});
window.visualViewport?.addEventListener('scroll',fitDolphinViewport,{passive:true});
for(const name of ['gesturestart','gesturechange','gestureend']){
 document.addEventListener(name,e=>{if(activeGame==='dolphin')e.preventDefault()},{passive:false,capture:true});
}
for(const name of ['touchstart','touchmove']){
 document.addEventListener(name,e=>{if(activeGame==='dolphin'&&e.touches.length>1)e.preventDefault()},{passive:false,capture:true});
}
document.addEventListener('touchend',e=>{
 if(activeGame!=='dolphin'||!e.changedTouches.length)return;
 const tap=e.changedTouches[0],now=Date.now();
 if(now-dolphinLastTap<350&&Math.hypot(tap.clientX-dolphinTapX,tap.clientY-dolphinTapY)<38)e.preventDefault();
 dolphinLastTap=now;dolphinTapX=tap.clientX;dolphinTapY=tap.clientY;
},{passive:false,capture:true});
$('gameLayer').addEventListener('dblclick',e=>{if(activeGame==='dolphin')e.preventDefault()},{passive:false});
$('gameLayer').addEventListener('touchmove',e=>{if(activeGame==='dolphin')e.preventDefault()},{passive:false});
addEventListener('keydown',e=>{if(activeGame==='dolphin'&&gameRunning&&!e.repeat&&(e.key.toLowerCase()==='e'||e.key===' ')){e.preventDefault();fireDolphinEcho()}},true);
function handleGamePoint(p,first){if(activeGame==='laundry'){if(first&&p.y>.43&&p.y<.88)laundryChoose(Math.min(2,Math.floor(p.x*3)));return}if(activeGame==='tilt'){return;}if(activeGame==='spheres'){if(first)tapSphere(p);return}if(activeGame==='trail'){drawTrailPoint(p,first);return}if(activeGame==='airbridge'){drawPlatformPoint(p,first);return}if(activeGame==='sling'){slingPoint(p,first);return}if(activeGame==='dolphin'&&gs){gameTarget={x:gs.camera+p.x,y:gs.cameraY+p.y};return}gameTarget=p}
function updateWorld(dt){
 if(!canWiggleWorld())return;
 if(worldStep){
  const step=worldStep,oldX=player.x,oldY=player.y;
  step.elapsed=Math.min(WIGGLE_DURATION,step.elapsed+dt);
  const t=step.elapsed/WIGGLE_DURATION,eased=t*t*(3-2*t);
  player.x=lerp(step.x0,step.x1,eased);
  player.y=lerp(step.y0,step.y1,eased);
  player.vx=(player.x-oldX)/Math.max(dt,.001);
  player.vy=(player.y-oldY)/Math.max(dt,.001);
  if(t>=1){worldStep=null;worldTarget=null;player.vx=player.vy=0}
 }else{player.vx=player.vy=0;}
 for(const c of coins){
  if(!save.coins.includes(c.id)&&Math.hypot(player.x-c.x,player.y-c.y)<35){
   save.coins.push(c.id);persist();tone(300+save.coins.length*22,.12,'triangle');
   toast(`✦ WORLD COIN ${save.coins.length} / 24`);
  }
 }
 const p=POIS.find(p=>dist(player,p)<p.r+55)||null;
 if(p?.id!==near?.id){near=p;renderPrompt()}
 if(!p||dist(player,p)>p.r+70)dismissedPoi=null;
 if(p&&p.id!==dismissedPoi&&dist(player,p)<p.r)offerEnter();
}
function renderPrompt(){const box=$('prompt');box.hidden=!near;$('actionButton').classList.toggle('ready',!!near);if(!near)return;$('promptIcon').textContent=near.icon;$('promptTitle').textContent=near.title;$('promptText').textContent=near.text}
function offerEnter(){if(!near||!$('entryConfirm').hidden)return;worldTarget=worldStep=null;player.vx=player.vy=0;$('confirmIcon').textContent=near.icon;$('confirmName').textContent=near.title;$('entryConfirm').hidden=false}
function enterNear(){if(!near)return;$('entryConfirm').hidden=true;openGame(near.game)}
function cancelEnter(){if(near)dismissedPoi=near.id;$('entryConfirm').hidden=true;worldTarget=worldStep=null}
$('enterButton').onclick=offerEnter;$('actionButton').onclick=offerEnter;$('confirmEnter').onclick=enterNear;$('confirmCancel').onclick=cancelEnter;
function beginHatch(e){if(hatchMode!=='charging')return;e?.preventDefault?.();setHatchHeld(true);tone(160,.12,'triangle',.04)}
$('birth').addEventListener('pointerdown',beginHatch);hatchCanvas.addEventListener('pointerdown',beginHatch);addEventListener('pointerup',()=>setHatchHeld(false));addEventListener('pointercancel',()=>setHatchHeld(false));addEventListener('blur',()=>setHatchHeld(false));addEventListener('keydown',e=>{if(!hatched&&hatchMode==='charging'&&(e.key===' '||e.key==='Enter')){e.preventDefault();setHatchHeld(true)}});addEventListener('keyup',e=>{if(e.key===' '||e.key==='Enter')setHatchHeld(false)});$('soundButton').onclick=()=>{sound=!sound;$('soundButton').textContent=sound?'♫':'×';$('soundButton').setAttribute('aria-pressed',String(sound));tone(440)};
function loop(now){const dt=Math.min(.04,(now-last)/1000);last=now;updateWorld(dt);drawWorld(now);drawHatch(now,dt);if(activeGame&&gameRunning)updateGame(dt,now);requestAnimationFrame(loop)}requestAnimationFrame(loop);
function renderCollection(){const cards=$('discoveryCards');cards.replaceChildren();Object.entries(GAME_INFO).forEach(([id,g])=>{const found=save.discovered.includes(id),won=save.wins.includes(id),d=document.createElement('div');d.className='discovery '+(won?'won':found?'found':'');d.innerHTML=`<span>${found?g.icon:'?'}</span><div><b>${found?g.title:'UNDISCOVERED'}</b><small>${won?'WON · REAL EXTRA SEGMENT':found?'FOUND · NOT YET WON':'SOMEWHERE IN THE WORLD'}</small></div>`;cards.append(d)});$('collectionSummary').textContent=`${save.discovered.filter(id=>GAME_INFO[id]).length} found · ${save.wins.filter(id=>GAME_INFO[id]).length} won · ${save.coins.length} world coins`}
$('collectionButton').onclick=()=>{renderCollection();$('collection').hidden=false};document.querySelector('[data-close="collection"]').onclick=()=>$('collection').hidden=true;
function drawPassportPhoto(){const c=$('passportPhoto'),p=c.getContext('2d'),W=c.width,H=c.height,g=p.createLinearGradient(0,0,W,H);g.addColorStop(0,'#483a82');g.addColorStop(1,'#16132e');p.fillStyle=g;p.fillRect(0,0,W,H);for(let i=0;i<37;i++){p.fillStyle=i%3?'#fff8':'#ffe36d';p.fillRect((i*83)%W,(i*47)%H,2+i%3,2+i%3)}p.save();p.translate(W*.77,H*.53);p.rotate(-.12);for(let i=13;i>=1;i--){p.fillStyle=`hsl(${i*31} 82% 67%)`;p.strokeStyle='#17122b';p.lineWidth=5;p.beginPath();p.arc(-i*17,Math.sin(i*.8)*9,17-i*.25,0,7);p.fill();p.stroke()}p.fillStyle='#ff91c4';p.strokeStyle='#17122b';p.lineWidth=7;p.beginPath();p.ellipse(0,0,38,31,0,0,7);p.fill();p.stroke();p.fillStyle='#17122b';p.beginPath();p.arc(13,-10,5,0,7);p.arc(15,10,5,0,7);p.fill();p.strokeStyle='#ff6e9e';p.lineWidth=4;p.beginPath();p.moveTo(34,2);p.lineTo(55,5);p.stroke();p.restore();p.fillStyle='#ffffff1d';p.fillRect(0,H*.76,W,H*.05);p.fillStyle='#ffd8e4';p.font='1000 12px Trebuchet MS';p.fillText('SUBJECT MOVED',10,H-12)}
$('passportButton').onclick=()=>{drawPassportPhoto();$('passport').hidden=false};document.querySelector('[data-close="passport"]').onclick=()=>$('passport').hidden=true;
let activeGame=null,gameRunning=false,gs=null;
const tiltReplay=document.createElement('button');tiltReplay.id='tiltLevelTwoReplay';tiltReplay.className='secondary';tiltReplay.type='button';tiltReplay.textContent='LEVEL 2 ▶';tiltReplay.hidden=true;$('startGame').after(tiltReplay);tiltReplay.addEventListener('click',()=>{if(activeGame==='tilt'&&save.tiltLevel2Unlocked)tiltStartLevel(2)});
const PINK_BALL_FAMILY=['trail','airbridge','sling'];
function pinkFamilyMessage(id){
 if(!PINK_BALL_FAMILY.includes(id))return '';
 const found=PINK_BALL_FAMILY.filter(key=>save.discovered.includes(key)).length;
 return found===1?'Two more of us are out there in space!':found===2?'One more of us is still out there in space!':'All three of us are together in space!';
}
function openGame(id){initTiltControls();tiltControlsVisible(false);$('gameLayer').classList.toggle('whale-v2',id==='whale');activeGame=id;gameRunning=false;gameTarget=null;gs=null;tiltCardNextLevel=0;if(!save.discovered.includes(id)){save.discovered.push(id);persist();toast(`DISCOVERED: ${GAME_INFO[id].title}`)}const info=GAME_INFO[id];$('gameLayer').hidden=false;if(id==='dolphin')setDolphinViewport(true);else resize();$('gameTitle').textContent=id==='dolphin'?'':info.title;$('gameIcon').textContent=info.icon;$('gameKicker').textContent=save.wins.includes(id)?'DISCOVERED GAME · WON':'NEW WORLD DISCOVERY';$('gameCardTitle').textContent=info.title;$('gameInstructions').textContent=info.instructions+(pinkFamilyMessage(id)?' '+pinkFamilyMessage(id):'');$('startGame').textContent=save.wins.includes(id)?'PLAY AGAIN ▶':'PLAY ▶';$('gameCard').hidden=false;$('sonarButton').hidden=true;$('gameTip').hidden=true;if(id==='tilt'){const replay=$('tiltLevelTwoReplay');replay.hidden=!save.tiltLevel2Unlocked;$('startGame').textContent='LEVEL 1 ▶';if(save.tiltLevel2Unlocked){$('gameKicker').textContent='TILT MACHINE · 2 LEVELS';$('gameInstructions').textContent='Level 1: Tilt Tunnel. Level 2: The Impossible Room. Collect blue clocks to enter Bullet Time automatically.'}}else $('tiltLevelTwoReplay').hidden=true;drawGame(performance.now())}
function leaveGame(){tiltControlsVisible(false);$('gameLayer').classList.remove('whale-v2');const wasDolphin=activeGame==='dolphin';gameRunning=false;activeGame=null;gameTarget=null;tiltCardNextLevel=0;if(wasDolphin)setDolphinViewport(false);if(near)dismissedPoi=near.id;$('entryConfirm').hidden=true;$('gameLayer').hidden=true;$('gameCard').hidden=true;$('sonarButton').hidden=true;releaseDolphinTail();$('gameTip').hidden=true;toast('BACK IN THE WORLD')}$('leaveGame').onclick=leaveGame;$('backToWorld').onclick=leaveGame;$('startGame').onclick=()=>{if(activeGame==='tilt'&&tiltCardNextLevel){tiltStartLevel(tiltCardNextLevel);return;}startMicro(activeGame);};
function startMicro(id){$('gameCard').hidden=true;gameRunning=true;gameTarget=null;const tips={trail:'HOLD THE PINK BALL → DRAW AROUND BLOBS → RELEASE IN THE STAR',airbridge:'DRAW SHORT PLATFORMS UNDER THE FALLING BALL',laundry:'WATCH THE BASKETS → TAP THE WORM’S HIDING PLACE'};$('gameTip').hidden=!tips[id];$('gameTip').classList.toggle('dolphin-tip',id==='dolphin');if(tips[id])$('gameTip').textContent=tips[id];if(id==='star')gs={t:0,y:.5,vy:0,rings:Array.from({length:8},(_,i)=>({x:1.05+i*.18,y:.2+((i*47)%60)/100,hit:false})),rocks:[{x:1.45,y:.18},{x:2.05,y:.72}],hits:0};if(id==='spheres')gs={x:0,y:0,visited:new Set(['0,0']),size:4,t:18,lock:0};if(id==='dolphin'){gs={x:.14,y:.52,vx:0,vy:0,age:0,echoCooldown:0,echoShots:[],echoOrbs:[],echoSeen:false,echoBoosts:0,hits:0,charge:0,air:false,flipAngle:0,camera:0,cameraY:0,splash:0,trail:[],cleared:false,message:'',messageTime:0,heading:-.08,flipStart:0,flipActive:false,flipLatch:false,speedDisplay:0,echoEnergy:0,swimSpeed:0,tailPhase:0,tailHeld:false,tailKeyHeld:false,tailPointer:null,tailGrace:0,tailPulseAt:-1,breachReady:false,entryRecovery:0};$('sonarButton').textContent='🛜 ECHO';$('sonarButton').hidden=false;$('sonarButton').disabled=false;}if(id==='whale')gs={x:.14,y:.79,vx:0,vy:0,t:45,age:0,heading:0,gems:[{x:.77,y:.77},{x:.22,y:.54},{x:.76,y:.30}],got:[],phase:'swim',launchAge:0,launchX:.89,launchY:.19,jetParticles:[]};if(id==='trail')gs={phase:'draw',drawing:false,path:[],pathIndex:0,ball:{x:.1,y:.78},goal:{x:.88,y:.22},t:18,blots:[{x:.4,y:.5,r:.085},{x:.65,y:.68,r:.09}]};if(id==='airbridge')gs={t:20,age:0,ball:{x:.13,y:.16,vx:.08,vy:0},stars:[{x:.32,y:.38},{x:.58,y:.24},{x:.78,y:.43}],got:[],platforms:[],drawing:null,goal:{x:.91,y:.22}};if(id==='laundry')gs=laundryRound(0);if(id==='tilt'){tiltStartLevel(1);return;}if(id==='sling')gs={age:0,phase:'wire',gesture:null,pulling:false,cameraX:0,cameraY:0,shots:0,resetAt:0,launchedAt:0,trail:[],ball:{x:.5,y:.8,vx:0,vy:0},posts:[{x:.32,y:.66},{x:.68,y:.66}],stars:createSlingStars(),got:[]};$('gameStat').textContent=id==='spheres'?'1 / 16':id==='whale'?'':id==='trail'?'DRAW FROM THE BALL':id==='airbridge'?'STARS 0 / 3':id==='sling'?'DRAW ROPE':id==='laundry'?'0/3 · WATCH':id==='dolphin'?'LAGOON →':'GO!';tone(330,.1,'square')}
function finishGame(won,reason){if(!gameRunning)return;if(activeGame==='tilt'&&gs?.level===2)tiltCardNextLevel=2;gameRunning=false;if(activeGame==='tilt')tiltControlsVisible(false);$('sonarButton').hidden=true;releaseDolphinTail();$('gameTip').hidden=true;if(won&&!save.wins.includes(activeGame)){save.wins.push(activeGame);persist()}if(won)fanfare();else tone(120,.35,'sawtooth',.08);const info=GAME_INFO[activeGame];$('gameIcon').textContent=won?'🏆':'💥';$('gameKicker').textContent=won?'DISCOVERY WON · EXTRA SEGMENT SAVED':'THE WORM SURVIVES EVERYTHING';$('gameCardTitle').textContent=won?'YOU FOUND A GAME!':'TRY THAT AGAIN?';$('gameInstructions').textContent=reason+(won&&pinkFamilyMessage(activeGame)?' '+pinkFamilyMessage(activeGame):'');$('startGame').textContent=won?'PLAY AGAIN ▶':'RETRY ▶';$('tiltLevelTwoReplay').hidden=true;$('gameCard').hidden=false;renderCollection()}
function updateGame(dt,now){if(activeGame==='star')updateStar(dt);if(activeGame==='spheres')updateSpheres(dt);if(activeGame==='dolphin')updateDolphin(dt);if(activeGame==='whale')updateWhale(dt);if(activeGame==='trail')updateTrail(dt);if(activeGame==='airbridge')updateAirbridge(dt);if(activeGame==='sling')updateSling(dt);if(activeGame==='laundry')updateLaundry(dt);if(activeGame==='tilt')tiltUpdate(dt);drawGame(now)}
function activeVector(x,y){const k=keyVector();return Math.hypot(k.x,k.y)>.1?k:pointVector(x,y,gameTarget)}
function updateStar(dt){const v=activeVector(.24,gs.y);gs.t+=dt;gs.vy=lerp(gs.vy,v.y*1.25,.12);gs.y=clamp(gs.y+gs.vy*dt,.08,.92);const px=.2+gs.t/9*2.05;for(const r of gs.rings)if(!r.hit&&Math.abs(px-r.x)<.035&&Math.abs(gs.y-r.y)<.105){r.hit=true;tone(420+gs.rings.filter(x=>x.hit).length*45,.12,'triangle')}for(const r of gs.rocks)if(!r.hit&&Math.abs(px-r.x)<.045&&Math.abs(gs.y-r.y)<.1){r.hit=true;gs.hits++;tone(110,.16,'sawtooth')}const got=gs.rings.filter(x=>x.hit).length;$('gameStat').textContent=`RINGS ${got} / 8 · ARMOR ${Math.max(0,2-gs.hits)}`;if(gs.hits>=2)finishGame(false,'Two dark rocks bonked you out of the course. The rings are still humming.');else if(gs.t>=9)finishGame(got>=6,got>=6?`${got} rings sang in sequence. The Singing Rift is yours.`:`Only ${got} rings sang. Thread at least 6 to finish.`)}
function moveSphere(nx,ny){const key=`${nx},${ny}`;if(nx<0||ny<0||nx>=gs.size||ny>=gs.size)return finishGame(false,'You left the checker moon. The route needs all sixteen spheres.');if(gs.visited.has(key))return finishGame(false,'Red sphere! Plan a route that never crosses itself.');gs.x=nx;gs.y=ny;gs.visited.add(key);gs.lock=.18;tone(300+gs.visited.size*18,.08,'square')}
function tapSphere(p){if(!gs||activeGame!=='spheres')return;const W=game.width/(game._d||1),H=game.height/(game._d||1),s=Math.min(W,H)*.16,ox=(W-s*4)/2,oy=(H-s*4)/2,nx=Math.floor((p.x*W-ox)/s),ny=Math.floor((p.y*H-oy)/s);if(Math.abs(nx-gs.x)+Math.abs(ny-gs.y)===1)moveSphere(nx,ny)}
function updateSpheres(dt){gs.t-=dt;gs.lock-=dt;const k=keyVector();if(gs.lock<=0&&Math.hypot(k.x,k.y)>.5){const dx=Math.abs(k.x)>.55?Math.sign(k.x):0,dy=!dx&&Math.abs(k.y)>.55?Math.sign(k.y):0;if(dx||dy)moveSphere(gs.x+dx,gs.y+dy)}$('gameStat').textContent=`${gs.visited.size} / 16 · ${Math.ceil(gs.t)}s`;if(gs.visited.size===16)finishGame(true,'Every blue sphere is red, and no path crossed itself. Clean orbit!');else if(gs.t<=0)finishGame(false,'The blue spheres reset before the route was complete.')}
const walls=[{x:.28,y:.12,w:.07,h:.56},{x:.48,y:.34,w:.07,h:.54},{x:.68,y:.12,w:.07,h:.56}];function blocked(x,y){return walls.some(w=>x>w.x&&x<w.x+w.w&&y>w.y&&y<w.y+w.h)}
// The ocean is a persistent playground: a missed leap is never a death or a reset.
// World-space X is measured in screen widths and Y in screen heights.
// Without echo, the strongest possible deep launch tops out near y=-.10.
// The island crest is above that ballistic ceiling; reflected echo momentum
// is now mechanically necessary instead of an arbitrary win-condition flag.
const ECHO_SURFACE=.36,ECHO_ISLAND={left:1.24,right:1.62,top:-.19},ECHO_END=2.47;
const ECHO_RADIUS=.045;
function dolphinMessage(message,seconds=3){gs.message=message;gs.messageTime=seconds;}
// One authoritative snout angle is used for swimming, drawing and firing.
function turnDolphinToward(angle,rate){
 const delta=Math.atan2(Math.sin(angle-gs.heading),Math.cos(angle-gs.heading));
 gs.heading+=clamp(delta,-rate,rate);
}
function startDolphinFlip(){
 if(!gs||!gs.air||gs.flipActive)return;
 gs.flipStart=gs.age;gs.flipActive=true;gs.flipAngle=0;
 tone(680,.09,'triangle',.04);
}
// Echo traces the nose in pixel-space: same angle as the dolphin silhouette.
// The waterline is NOT a wall. Only the actual cliff face reflects sound.
function fireDolphinEcho(){
 if(activeGame!=='dolphin'||!gameRunning||!gs||gs.echoCooldown>0)return;
 gs.echoCooldown=.9;
 const W=game.width/(game._d||1),H=game.height/(game._d||1);
 const aim=gs.heading+gs.flipAngle;
 const dx=Math.cos(aim),dy=Math.sin(aim)*W/H;
 const nose=Math.max(12,81*clamp(Math.min(W,H)/650,.40,1.05));
 const from={x:gs.x+dx*nose/W,y:gs.y+Math.sin(aim)*nose/H};
 const face=from.x<ECHO_ISLAND.left?ECHO_ISLAND.left-.012:from.x>ECHO_ISLAND.right?ECHO_ISLAND.right+.012:null;
 const reach=face===null||Math.abs(dx)<.12?-1:(face-from.x)/dx;
 const wallY=from.y+dy*reach;
 // Above and below the surface both count, provided the ray strikes rock,
 // not empty sky above the island or the invisible seabed beneath the map.
 const hit=reach>.015&&reach<1.45&&wallY>=ECHO_ISLAND.top+.012&&wallY<.93;
 const wall=hit?{x:face,y:wallY}:{x:clamp(from.x+dx*.82,.02,2.76),y:clamp(from.y+dy*.82,-1.6,.94)};
 const rebound=hit?Math.min(1.02,Math.max(.53,reach*1.35)):.0;
 // Specular bounce on a vertical face: horizontal direction reverses,
 // vertical component stays the same, including through the waterline.
 const back=hit?{x:clamp(wall.x-dx*rebound,.04,2.75),y:clamp(wall.y+dy*rebound,-1.6,.94)}:wall;
 gs.echoShots.push({from,wall,back,born:gs.age,reflected:false,closeEnough:hit});
 gs.echoShots=gs.echoShots.slice(-6);
 tone(hit?720:440,.20,'sine',.10);
}

// Steering is independent of forward speed, like the feel of the classic
// dolphin games. Taps give tail strokes, hold keeps momentum; release coasts.
// Echo lifts the temporary speed ceiling but can never become infinite turbo.
const DOLPHIN_IDLE_CRUISE=.24,DOLPHIN_NORMAL_MAX=.83,DOLPHIN_ECHO_MAX=1.20;
function strokeDolphinTail(){
 if(activeGame!=='dolphin'||!gameRunning||!gs||gs.air)return;
 const cap=gs.echoEnergy>.10?DOLPHIN_ECHO_MAX:DOLPHIN_NORMAL_MAX;
 gs.swimSpeed=Math.min(cap,gs.swimSpeed+.135);
 gs.tailGrace=.85;gs.tailPulseAt=gs.age;
 tone(310+gs.swimSpeed*190,.055,'triangle',.035);
}
function syncDolphinTail(){
 if(gs)gs.tailHeld=gs.tailPointer!==null||gs.tailKeyHeld;
}
function releaseDolphinPointer(pointerId){
 if(gs?.tailPointer===pointerId){gs.tailPointer=null;syncDolphinTail();}
}
function releaseDolphinTail(){
 if(gs){gs.tailPointer=null;gs.tailKeyHeld=false;gs.tailHeld=false;}
}
// Desktop alternative: C has the same press/hold/release behavior as the water.
addEventListener('keydown',e=>{
 if(activeGame!=='dolphin'||!gameRunning||e.key.toLowerCase()!=='c')return;
 e.preventDefault();if(e.repeat)return;
 if(!gs.tailKeyHeld)strokeDolphinTail();
 gs.tailKeyHeld=true;syncDolphinTail();
},true);
addEventListener('keyup',e=>{
 if(e.key.toLowerCase()==='c'&&gs){gs.tailKeyHeld=false;syncDolphinTail();}
},true);
addEventListener('blur',releaseDolphinTail);
function updateDolphin(dt){
 gs.age+=dt;
 gs.echoCooldown=Math.max(0,gs.echoCooldown-dt);
 gs.splash=Math.max(0,gs.splash-dt);
 gs.messageTime=0;
 gs.entryRecovery=Math.max(0,gs.entryRecovery-dt);
 const W=game.width/(game._d||1),H=game.height/(game._d||1),aspect=W/H;
 const k=keyVector(),hasKeys=Math.hypot(k.x,k.y)>.1;
 const target=gameTarget;
 const deltaX=target?target.x-gs.x:0,deltaY=target?target.y-gs.y:0;
 const distance=target?Math.hypot(deltaX,deltaY/aspect):0;
 // Clear the waypoint after reaching it, so it cannot orbit behind the dolphin.
 if(target&&distance<.048){gameTarget=null;}
 const steer=hasKeys?k:gameTarget?pointVector(gs.x,gs.y,gameTarget,.02):{x:0,y:0};
 const thrust=Math.hypot(steer.x,steer.y)>.12;
 const beforeX=gs.x,beforeY=gs.y;
 if(gs.air){
  // Ballistic flight: steering changes the horizontal trajectory only slightly.
  gs.vx=clamp(gs.vx+steer.x*.085*dt,-1.3,1.45);
  gs.vy+=1.80*dt;
  gs.x+=gs.vx*dt;gs.y+=gs.vy*dt;
  if(Math.hypot(gs.vx*W,gs.vy*H)>20)
   turnDolphinToward(Math.atan2(gs.vy*H,gs.vx*W),3.1*dt);
  // Only a fresh tap while airborne starts a flip. A held upward direction
  // must not spin the dolphin over and over.
  if(gs.flipActive){
   const progress=clamp((gs.age-gs.flipStart)/.82,0,1);
   gs.flipAngle=Math.PI*2*(progress*progress*(3-2*progress));
   if(progress>=1){gs.flipActive=false;gs.flipAngle=0;}
  }
  if(gs.y>=ECHO_SURFACE&&gs.vy>0){
   // Water absorbs the fall. No carry-over turbo or instant second leap.
   gs.y=ECHO_SURFACE+.026;gs.air=false;gs.splash=.72;
   gs.vx*=.32;
   gs.vy=Math.min(.095,gs.vy*.12);
   gs.swimSpeed=Math.min(.19,Math.hypot(gs.vx,gs.vy/aspect));
   if(gs.swimSpeed>.025)gs.heading=Math.atan2(gs.vy/aspect,gs.vx);
   gs.entryRecovery=.55;gs.breachReady=false;gs.tailGrace=0;
   gs.charge=0;gs.echoEnergy=0;
   gs.flipActive=false;gs.flipAngle=0;gs.flipLatch=false;
   // Aiming above the surface cannot cause an endless auto-leap on splashdown.
   gameTarget=null;
   tone(230,.16,'sine');
  }
 }else{
  // A waypoint turns the nose, never resets the motor or the green speed bar.
  if(thrust){
   const desiredHeading=Math.atan2(steer.y*H,steer.x*W);
   turnDolphinToward(desiredHeading,(2.9/(1+gs.swimSpeed*.3))*dt);
  }
  gs.echoEnergy=Math.max(0,gs.echoEnergy-.23*dt);
  gs.tailGrace=Math.max(0,gs.tailGrace-dt);
  // Regular swimming starts gently. Extra speed is earned by tail strokes.
  if(thrust&&gs.swimSpeed<DOLPHIN_IDLE_CRUISE){
   gs.swimSpeed=Math.min(DOLPHIN_IDLE_CRUISE,gs.swimSpeed+.28*dt);
  }else if(!gs.tailHeld){
   // The first three quarters of a second after a stroke is true free glide.
   // While following a course, let higher speed bleed away very gradually.
   const drag=gs.tailGrace>0?0:thrust?.060:.115;
   const floor=thrust?DOLPHIN_IDLE_CRUISE:0;
   gs.swimSpeed=Math.max(floor,gs.swimSpeed-drag*dt);
  }
  // Echo excess cannot last permanently, even when holding the tail button.
  const ceiling=DOLPHIN_NORMAL_MAX+Math.min(DOLPHIN_ECHO_MAX-DOLPHIN_NORMAL_MAX,gs.echoEnergy*.32);
  if(gs.swimSpeed>ceiling)
   gs.swimSpeed=Math.max(ceiling,gs.swimSpeed-.23*dt);
  if(!thrust&&!gs.tailHeld&&gs.swimSpeed<.012)gs.swimSpeed=0;
  gs.vx=Math.cos(gs.heading)*gs.swimSpeed;
  gs.vy=Math.sin(gs.heading)*gs.swimSpeed*aspect;
  gs.x+=gs.vx*dt;gs.y+=gs.vy*dt;
  if(gs.y>.58){
   gs.breachReady=true;
   // Diving matters. A skim along the surface does not arm a new jump.
   gs.charge=clamp(gs.charge+dt*.75,0,1);
  }
  // Only a fresh, deep upward approach can breach the surface.
  if(gs.y<ECHO_SURFACE){
   const canLeap=gs.breachReady&&gs.entryRecovery<=0&&gs.charge>.20&&gs.vy<-.14&&gs.swimSpeed>.32;
   if(canLeap){
    gs.y=ECHO_SURFACE;gs.air=true;gs.splash=.65;
    const powered=gs.echoEnergy>.20;
    // Unboosted apex is below the island crest. Echo power is consumed here.
    gs.vy=powered?-1.62-Math.min(.20,gs.echoEnergy*.12):-1.16-Math.min(.11,gs.charge*.11);
    gs.echoEnergy=0;gs.charge=0;gs.breachReady=false;
    gameTarget=null;
    tone(powered?600:340,powered?.23:.13,powered?'triangle':'sine');
   }else{
    gs.y=ECHO_SURFACE+.012;
    gs.vy=0;
    gs.swimSpeed*=.87;
    if(gameTarget&&gameTarget.y<ECHO_SURFACE)gameTarget=null;
   }
  }
  if(gs.y>.91){gs.y=.91;gs.vy=Math.min(0,gs.vy);gs.swimSpeed*=.82;}
  gs.tailPhase+=dt*(gs.swimSpeed>.03?2+gs.swimSpeed*13:1.1);
 }
 // The island is solid but never lethal.
 if(gs.x>ECHO_ISLAND.left-ECHO_RADIUS&&gs.x<ECHO_ISLAND.right+ECHO_RADIUS&&gs.y>ECHO_ISLAND.top-ECHO_RADIUS){
  const fromLeft=beforeX<=ECHO_ISLAND.left||gs.x<(ECHO_ISLAND.left+ECHO_ISLAND.right)/2;
  gs.x=fromLeft?ECHO_ISLAND.left-ECHO_RADIUS:ECHO_ISLAND.right+ECHO_RADIUS;
  gs.vx=fromLeft?Math.min(gs.vx,0)*.2:Math.max(gs.vx,0)*.2;
  if(!gs.air)gs.swimSpeed=Math.min(gs.swimSpeed,.08);
  if(beforeY<=ECHO_ISLAND.top-ECHO_RADIUS){gs.vy=Math.max(gs.vy,.11);gs.air=true;}
  if(gs.age-(gs.lastBonk||-100)>.7){gs.hits++;gs.lastBonk=gs.age;gs.splash=.3;tone(135,.12,'sine');}
 }
 gs.x=clamp(gs.x,.055,2.78);
 if(gs.x<=.055&&gs.vx<0){gs.vx=0;gs.swimSpeed=0;}
 if(gs.x>=2.78&&gs.vx>0){gs.vx=0;gs.swimSpeed=0;}
 // Draw the already-established, snout-aimed echo lane unchanged.
 for(const shot of gs.echoShots){
  if(gs.age-shot.born>.52&&!shot.reflected){
   shot.reflected=true;
   if(shot.closeEnough){
    for(const [a,b,positions] of [
     [shot.from,shot.wall,[.34,.48,.62,.76,.88]],
     [shot.wall,shot.back,[.19,.38,.56,.74,.92]]
    ])for(const u of positions){
     const x=lerp(a.x,b.x,u),y=lerp(a.y,b.y,u);
     if(x>.035&&x<2.77&&y>-1.45&&y<.92)
      gs.echoOrbs.push({x,y,born:gs.age,used:false});
    }
    gs.echoSeen=true;tone(890,.28,'triangle',.09);
   }
  }
 }
 gs.echoShots=gs.echoShots.filter(shot=>gs.age-shot.born<3);
 const sweepX=gs.x-beforeX,sweepY=gs.y-beforeY;
 for(const orb of gs.echoOrbs){
  if(orb.used||gs.age-orb.born>17)continue;
  const u=clamp(((orb.x-beforeX)*sweepX+(orb.y-beforeY)*sweepY)/Math.max(1e-8,sweepX*sweepX+sweepY*sweepY),0,1);
  const dx=(beforeX+u*sweepX-orb.x)/.064,dy=(beforeY+u*sweepY-orb.y)/.079;
  if(dx*dx+dy*dy<1&&Math.hypot(sweepX,sweepY/aspect)>.001){
   orb.used=true;gs.echoBoosts++;
   // The pickup grows a short-lived speed reserve. It cannot pile up
   // unbounded velocity or survive a jump/landing forever.
   gs.echoEnergy=Math.min(1.65,gs.echoEnergy+.35);
   if(!gs.air){gs.swimSpeed=Math.min(DOLPHIN_ECHO_MAX,gs.swimSpeed+.115);gs.tailGrace=.85;}
   gs.charge=clamp(gs.charge+.18,0,1);
   tone(440+(gs.echoBoosts%12)*35,.15,'triangle',.09);
  }
 }
 gs.echoOrbs=gs.echoOrbs.filter(o=>!o.used&&gs.age-o.born<17).slice(-45);
 if(gs.x>ECHO_ISLAND.right+ECHO_RADIUS)gs.cleared=true;
 gs.camera=lerp(gs.camera,clamp(gs.x-.33,0,1.82),1-Math.exp(-5.5*dt));
 const cliffFraming=-.24*clamp((gs.x-.72)/.42,0,1);
 const flightFraming=gs.air?Math.min(0,gs.y-.32):0;
 gs.cameraY=lerp(gs.cameraY,clamp(Math.min(cliffFraming,flightFraming),-1.25,0),1-Math.exp(-6.8*dt));
 gs.trail.unshift({x:gs.x-.045,y:gs.y+.01,age:0});
 if(gs.trail.length>30)gs.trail.length=30;
 for(const p of gs.trail)p.age+=dt;
 $('sonarButton').disabled=gs.echoCooldown>0;
 $('sonarButton').textContent=gs.echoCooldown>0?`🛜 ${gs.echoCooldown.toFixed(1)}s`:'🛜 ECHO';
 $('gameStat').textContent='LAGOON →';
 const currentSpeed=gs.air?Math.hypot(gs.vx,gs.vy*aspect):gs.swimSpeed;
 gs.speedDisplay=lerp(gs.speedDisplay,clamp(currentSpeed/DOLPHIN_ECHO_MAX,0,1),1-Math.exp(-6*dt));
 if(gs.cleared&&gs.x>ECHO_END&&gs.y>ECHO_SURFACE+.005)
  finishGame(true,'You crossed the island with momentum and reached the far lagoon. Your own echoes showed you the way.');
}
$('sonarButton').onclick=fireDolphinEcho;
// The three horizontal rivers alternate right, left, right.
// Their acceleration changes the worm's actual velocity; outside them it coasts.
const WHALE_CURRENTS=[
 {y:.78,half:.095,dir:1,power:.66,color:'#62f9f0'},
 {y:.54,half:.095,dir:-1,power:.68,color:'#e7aeff'},
 {y:.30,half:.095,dir:1,power:.64,color:'#9bffbe'}
];
function whaleFlow(y){
 let force=0,inside=false;
 for(const c of WHALE_CURRENTS){const closeness=clamp(1-Math.abs(y-c.y)/c.half,0,1);
  if(closeness>0){inside=true;force+=c.dir*c.power*closeness;}
 }
 return {force,inside};
}
function updateWhale(dt){
 gs.age+=dt;
 // Give the entire 1.5 second final eruption time to play before awarding victory.
 if(gs.phase==='launch'){
  gs.launchAge+=dt;
  const p=gs.launchAge;
  gs.x=gs.launchX+Math.sin(p*4)*.014;
  gs.y=gs.launchY-1.02*p-.28*p*p;
  gs.heading=-Math.PI/2+Math.sin(p*5)*.15;
  if(p>=1.45)finishGame(true,'The three lights dissolved the plug! You rode the jet and erupted from the whale’s blowhole.');
  return;
 }
 gs.t=Math.max(0,gs.t-dt);
 const v=activeVector(gs.x,gs.y),flow=whaleFlow(gs.y);
 const previous={x:gs.x,y:gs.y};
 // Currents are real velocity, not decoration. Strong steering can escape them,
 // but riding each river is the fast way through the three pickups.
 gs.vx=clamp((gs.vx+(v.x*.47+flow.force)*dt)*Math.exp(-1.7*dt),-.52,.52);
 gs.vy=clamp((gs.vy+v.y*.70*dt)*Math.exp(-2.35*dt),-.37,.37);
 gs.x=clamp(gs.x+gs.vx*dt,.06,.94);
 gs.y=clamp(gs.y+gs.vy*dt,.11,.91);
 if(gs.x===.06&&gs.vx<0||gs.x===.94&&gs.vx>0)gs.vx=0;
 if(gs.y===.11&&gs.vy<0||gs.y===.91&&gs.vy>0)gs.vy=0;
 if(gameTarget&&Math.hypot(gs.x-gameTarget.x,gs.y-gameTarget.y)<.035)gameTarget=null;
 const dx=gs.x-previous.x,dy=gs.y-previous.y;
 if(Math.hypot(dx,dy)>.0003)gs.heading=Math.atan2(dy*1.25,dx);
 for(let i=0;i<gs.gems.length;i++){
  const gem=gs.gems[i];if(gs.got.includes(i))continue;
  if(Math.hypot((gs.x-gem.x)*1.0,(gs.y-gem.y)*1.2)<.075){
   gs.got.push(i);tone(430+gs.got.length*125,.18,'triangle');
   if(gs.got.length===3){tone(930,.32,'triangle');}
  }
 }
 // The plug blocks the exit until ALL lights are collected. No sudden teleport.
 const open=gs.got.length===gs.gems.length;
 if(open&&Math.abs(gs.x-.89)<.105&&gs.y<.275){
  gs.phase='launch';gs.launchAge=0;gs.launchX=.89;gs.launchY=.19;
  gs.x=.89;gs.y=.19;gs.vx=0;gs.vy=-.9;gs.heading=-Math.PI/2;
  tone(380,.32,'sawtooth',.075);tone(750,.4,'triangle',.1);
  return;
 }
 if(gs.t<=0)finishGame(false,`Out of air! You freed ${gs.got.length} of 3 glow-plums. Retry and use the alternating currents to unclog the blowhole.`);
}
function drawTrailPoint(p,first){if(!gs||gs.phase!=='draw')return;if(first){if(Math.hypot(p.x-gs.ball.x,p.y-gs.ball.y)>.13)return;gs.drawing=true;gs.path=[{...gs.ball}]}if(!gs.drawing)return;const last=gs.path[gs.path.length-1];if(Math.hypot(p.x-last.x,p.y-last.y)>.018&&gs.path.length<180)gs.path.push(p)}
function updateTrail(dt){gs.t-=dt;if(gs.phase==='roll'){let remain=dt*.34;while(remain>0&&gs.pathIndex<gs.path.length-1){const a=gs.ball,b=gs.path[gs.pathIndex+1],d=Math.hypot(b.x-a.x,b.y-a.y),step=Math.min(remain,d);if(d>0){a.x+=((b.x-a.x)/d)*step;a.y+=((b.y-a.y)/d)*step}remain-=step;if(step>=d-.0001)gs.pathIndex++}if(gs.blots.some(o=>Math.hypot(gs.ball.x-o.x,gs.ball.y-o.y)<o.r+.035))return finishGame(false,'SPLAT. The pink ball rolled into an ink-blot. Draw the worm around it.');if(gs.pathIndex>=gs.path.length-1){if(Math.hypot(gs.ball.x-gs.goal.x,gs.ball.y-gs.goal.y)<.11)finishGame(true,'The pink ball followed your living rainbow line all the way into the star cup!');else finishGame(false,'The Rainbow Slopworm ended before the star cup. Draw the route all the way in.')}}if(gs.t<=0)finishGame(false,'The pink ball waited too long and drifted away.');$('gameStat').textContent=gs.phase==='draw'?`DRAW · ${Math.ceil(gs.t)}s`:`ROLLING · ${Math.ceil(gs.t)}s`}
function drawPlatformPoint(p,first){if(!gs)return;if(first)gs.drawing={a:p,b:p};else if(gs.drawing){const a=gs.drawing.a,dx=p.x-a.x,dy=p.y-a.y,d=Math.hypot(dx,dy),m=Math.min(1,.36/(d||1));gs.drawing.b={x:a.x+dx*m,y:a.y+dy*m}}}
function finishPlatform(p){if(!gs?.drawing)return;drawPlatformPoint(p,false);const q=gs.drawing,d=Math.hypot(q.b.x-q.a.x,q.b.y-q.a.y);if(d>.055){q.born=gs.age;gs.platforms.push(q);if(gs.platforms.length>7)gs.platforms.shift();tone(360,.08,'triangle')}gs.drawing=null}
function updateAirbridge(dt){gs.t-=dt;gs.age+=dt;gs.platforms=gs.platforms.filter(p=>gs.age-p.born<5);const b=gs.ball,oldY=b.y;b.vy+=.62*dt;b.x+=b.vx*dt;b.y+=b.vy*dt;if(b.x<.035||b.x>.965){b.x=clamp(b.x,.035,.965);b.vx*=-.8}if(b.vy>0)for(const p of gs.platforms){const lo=Math.min(p.a.x,p.b.x)-.035,hi=Math.max(p.a.x,p.b.x)+.035;if(b.x<lo||b.x>hi)continue;const u=clamp((b.x-p.a.x)/((p.b.x-p.a.x)||.001),0,1),lineY=lerp(p.a.y,p.b.y,u);if(oldY+.035<=lineY&&b.y+.035>=lineY){b.y=lineY-.037;b.vy=-.43;b.vx=clamp(b.vx+(p.a.y-p.b.y)*.36,-.28,.28);tone(300+gs.got.length*80,.07,'square');break}}gs.stars.forEach((s,i)=>{if(!gs.got.includes(i)&&Math.hypot(b.x-s.x,b.y-s.y)<.075){gs.got.push(i);tone(500+i*100,.13,'triangle')}});if(b.x>.85&&b.y<.34){if(gs.got.length===3)return finishGame(true,'Three stars, several impossible platforms, and one very relieved pink ball reached the cloud.');b.vx=-Math.max(.12,Math.abs(b.vx));tone(130,.12,'sawtooth')}if(b.y>1.05)return finishGame(false,'The pink ball fell out of the sky. Draw the next platform before it drops past you.');if(gs.t<=0)return finishGame(false,'The last rainbow platform faded before the cloud was reached.');$('gameStat').textContent=`STARS ${gs.got.length} / 3 · ${Math.ceil(gs.t)}s`}
// Star Sling: a rope the player really draws, straight-line projectiles and a
// camera that follows a shot into a sky larger than the screen. No gravity,
// bullet power puzzle, invisible failure boundary, lives or game timer.
const SLING_SPEED_Y=1.75, SLING_AIM_X=3.0;
// Five reproducible straight shooting lanes, eight stars in each. The shots
// can be made with simple diagonal/vertical pull gestures, and all stars persist.
const SLING_AIMS=[.74,.62,.5,.38,.26], SLING_STAR_ROWS=8;
function createSlingStars(){
 const stars=[];
 for(let lane=0;lane<SLING_AIMS.length;lane++){
  const releaseX=SLING_AIMS[lane], slope=(.5-releaseX)*SLING_AIM_X/SLING_SPEED_Y;
  for(let row=0;row<SLING_STAR_ROWS;row++){
   const y=.25-row*.25;
   stars.push({x:releaseX+slope*(.92-y),y,lane});
  }
 }
 return stars;
}
function slingPoint(p,first){
 if(!gs)return;
 if(gs.phase==='wire'){
  if(first)gs.gesture={start:p,current:p};
  else if(gs.gesture)gs.gesture.current=p;
  return;
 }
 if(gs.phase==='pull'){
  if(first&&Math.hypot(p.x-gs.ball.x,p.y-gs.ball.y)<.18)gs.pulling=true;
  if(gs.pulling){gs.ball.x=clamp(p.x,.18,.82);gs.ball.y=clamp(p.y,.76,.95);}
 }
}
function finishSlingGesture(p){
 if(!gs)return;
 if(gs.phase==='wire'&&gs.gesture){
  gs.gesture.current=p;
  const a=gs.gesture.start,b=gs.gesture.current,L=gs.posts[0],R=gs.posts[1];
  const valid=(Math.hypot(a.x-L.x,a.y-L.y)<.18&&Math.hypot(b.x-R.x,b.y-R.y)<.18)||(Math.hypot(a.x-R.x,a.y-R.y)<.18&&Math.hypot(b.x-L.x,b.y-L.y)<.18);
  gs.gesture=null;
  if(valid){gs.phase='pull';tone(420,.13,'triangle',.07);$('gameStat').textContent='PULL BALL · 0/40';}
  else{$('gameStat').textContent='DRAW ROPE';tone(150,.08,'square',.04)}
  return;
 }
 if(gs.phase==='pull'&&gs.pulling){
  gs.pulling=false;
  gs.ball.x=clamp(p.x,.18,.82);gs.ball.y=clamp(p.y,.76,.95);
  if(gs.ball.y<.835){gs.ball.x=.5;gs.ball.y=.8;$('gameStat').textContent='PULL DOWN';return;}
  gs.ball.vx=(.5-gs.ball.x)*SLING_AIM_X;
  gs.ball.vy=-SLING_SPEED_Y;
  gs.phase='flying';gs.launchedAt=gs.age;gs.shots++;gs.trail=[];
  tone(165,.22,'sawtooth',.075);tone(520,.09,'triangle',.055);
 }
}
function slingReset(){
 gs.phase='reloading';gs.resetAt=gs.age;gs.gesture=null;gs.pulling=false;
 gs.ball={x:.5,y:.8,vx:0,vy:0};gs.trail=[];
 tone(290,.08,'triangle',.055);
}
function updateSling(dt){
 gs.age+=dt;
 const ball=gs.ball;
 if(gs.phase==='flying'){
  const previous={x:ball.x,y:ball.y};
  ball.x+=ball.vx*dt;ball.y+=ball.vy*dt; // hard straight line, never any acceleration.
  gs.trail.push({x:ball.x,y:ball.y});if(gs.trail.length>52)gs.trail.shift();
  const dx=ball.x-previous.x,dy=ball.y-previous.y;
  gs.stars.forEach((star,i)=>{
   if(gs.got.includes(i))return;
   const u=clamp(((star.x-previous.x)*dx+(star.y-previous.y)*dy)/Math.max(.000001,dx*dx+dy*dy),0,1);
   if(Math.hypot(star.x-(previous.x+u*dx),star.y-(previous.y+u*dy))<.09){
    gs.got.push(i);tone(470+(gs.got.length%8)*62,.10,'triangle',.06);
   }
  });
  if(gs.got.length===gs.stars.length)return finishGame(true,`All ${gs.stars.length} stars! You built the slingshot and cleared the whole sky in ${gs.shots} straight-line shots.`);
  // The whole scene tracks the ball upward AND sideways, including off-screen stars.
  gs.cameraX=lerp(gs.cameraX,ball.x-.5,.18);
  gs.cameraY=lerp(gs.cameraY,Math.min(0,ball.y-.40),.18);
  // A projectile simply flies into space. It is never a lost life or game over.
  if(ball.y<-2.12||gs.age-gs.launchedAt>3.1)slingReset();
 }else if(gs.phase==='reloading'){
  gs.cameraX=lerp(gs.cameraX,0,.18);gs.cameraY=lerp(gs.cameraY,0,.18);
  if(gs.age-gs.resetAt>.34&&Math.abs(gs.cameraX)<.02&&Math.abs(gs.cameraY)<.02){
   gs.cameraX=gs.cameraY=0;gs.phase='pull';
  }
 }
 $('gameStat').textContent=gs.phase==='wire'?'DRAW ROPE':gs.phase==='pull'?`★ ${gs.got.length}/${gs.stars.length} · PULL`:gs.phase==='reloading'?`★ ${gs.got.length}/${gs.stars.length} · RELOAD`:`★ ${gs.got.length}/${gs.stars.length} · UP!`;
}

function drawGame(now){const d=game._d||1,W=game.width/d,H=game.height/d;gctx.setTransform(d,0,0,d,0,0);gctx.clearRect(0,0,W,H);if(!activeGame){gctx.fillStyle='#100d25';gctx.fillRect(0,0,W,H);return}if(activeGame==='star')drawStar(W,H,now);if(activeGame==='spheres')drawSpheres(W,H);if(activeGame==='dolphin')drawDolphinGame(W,H,now);if(activeGame==='whale')drawWhaleGame(W,H,now);if(activeGame==='trail')drawTrailGame(W,H,now);if(activeGame==='airbridge')drawAirbridge(W,H,now);if(activeGame==='sling')drawSling(W,H,now);if(gs&&activeGame==='laundry')drawLaundry(W,H,now);if(gs&&activeGame==='tilt')drawTilt(W,H,now)}
function drawStar(W,H,t){gctx.fillStyle='#120d30';gctx.fillRect(0,0,W,H);for(let i=0;i<70;i++){gctx.fillStyle='#fff';gctx.globalAlpha=.25+(i%4)/5;gctx.fillRect((i*137-t*.15)%W,(i*79)%H,2,2)}gctx.globalAlpha=1;if(!gs)return;const px=.2+gs.t/9*2.05,scale=W*.7;for(const r of gs.rings){const x=W*.24+(r.x-px)*scale,y=r.y*H;gctx.strokeStyle=r.hit?'#6cf3b4':'#ffe369';gctx.lineWidth=10;gctx.beginPath();gctx.ellipse(x,y,24,45,0,0,7);gctx.stroke()}for(const r of gs.rocks){const x=W*.24+(r.x-px)*scale;gctx.fillStyle='#493c65';gctx.beginPath();gctx.arc(x,r.y*H,32,0,7);gctx.fill()}drawTinyWorm(gctx,W*.24,gs.y*H,t)}
function drawSpheres(W,H){gctx.fillStyle='#241c48';gctx.fillRect(0,0,W,H);if(!gs)return;const s=Math.min(W,H)*.16,ox=(W-s*4)/2,oy=(H-s*4)/2;for(let y=0;y<4;y++)for(let x=0;x<4;x++){const red=gs.visited.has(`${x},${y}`);gctx.fillStyle=red?'#ff6a83':'#59bdf7';gctx.strokeStyle='#120e2d';gctx.lineWidth=5;gctx.beginPath();gctx.arc(ox+(x+.5)*s,oy+(y+.5)*s,s*.32,0,7);gctx.fill();gctx.stroke()}gctx.strokeStyle='#fff';gctx.lineWidth=5;gctx.beginPath();gctx.arc(ox+(gs.x+.5)*s,oy+(gs.y+.5)*s,s*.42,0,7);gctx.stroke()}
// Hand-drawn dolphin silhouette: articulated tail flukes, fins, belly and beak.
// Everything is vector canvas artwork, no emoji or third-party game sprites.
function drawEchoDolphin(c,x,y,pitch,t,scale=1){
 c.save();c.translate(x,y);c.rotate(pitch);c.scale(scale,scale);
 const wag=Math.sin(gs?.tailPhase||t/900)*(gs?.air?.025:(.025+.19*clamp((gs?.swimSpeed||0)/.94,0,1)));
 c.lineJoin='round';c.lineCap='round';c.strokeStyle='#073550';c.lineWidth=3.5;
 // Tail narrows into a moving pair of flukes.
 c.save();c.translate(-57,4);c.rotate(wag);
 c.fillStyle='#2ca5bd';c.beginPath();c.moveTo(7,0);c.quadraticCurveTo(-9,-4,-30,-24);c.quadraticCurveTo(-20,1,-29,16);c.quadraticCurveTo(-6,9,7,3);c.closePath();c.fill();c.stroke();c.restore();
 // Dorsal fin starts in the outline, rather than floating above an oval.
 const body=c.createLinearGradient(0,-34,0,34);body.addColorStop(0,'#a2f7ed');body.addColorStop(.48,'#46c5d3');body.addColorStop(1,'#146b9d');c.fillStyle=body;
 c.beginPath();c.moveTo(-54,-2);c.bezierCurveTo(-44,-16,-23,-25,-8,-26);
 c.quadraticCurveTo(-15,-48,3,-49);c.quadraticCurveTo(9,-39,12,-26);
 c.bezierCurveTo(34,-26,47,-15,57,-10);c.quadraticCurveTo(73,-12,81,-5);
 c.lineTo(81,1);c.quadraticCurveTo(67,7,55,5);
 c.bezierCurveTo(34,26,-3,33,-35,18);c.quadraticCurveTo(-48,14,-54,-2);c.closePath();c.fill();c.stroke();
 // Lighter jaw and belly, with a gently pointed rostrum.
 c.fillStyle='#d1fff0';c.beginPath();c.moveTo(-32,10);c.bezierCurveTo(-2,27,41,14,56,3);c.quadraticCurveTo(69,5,81,1);c.quadraticCurveTo(60,16,36,20);c.bezierCurveTo(-6,36,-33,24,-32,10);c.fill();
 // Articulated near flipper.
 c.fillStyle='#187b9f';c.beginPath();c.moveTo(6,13);c.quadraticCurveTo(-3,35,-27,52);c.quadraticCurveTo(-18,20,0,9);c.closePath();c.fill();c.stroke();
 c.fillStyle='#062d46';c.beginPath();c.ellipse(48,-10,3.6,4,0,0,7);c.fill();
 c.strokeStyle='#126e91';c.lineWidth=1.7;c.beginPath();c.moveTo(65,7);c.quadraticCurveTo(71,9,77,5);c.stroke();
 c.strokeStyle='#e4fff7';c.lineWidth=2.4;c.beginPath();c.moveTo(-24,-12);c.quadraticCurveTo(4,-21,30,-16);c.stroke();
 c.restore();
}
function drawDolphinGame(W,H,t){
 const surface=ECHO_SURFACE*H,cam=gs?.camera||0,sx=x=>(x-cam)*W;
 // Camera translation applies to the entire world (sky, ocean, island, beams
 // and dolphin), not just the dolphin, so high leaps stay visible.
 const cameraY=gs?.cameraY||0;
 gctx.save();gctx.translate(0,-cameraY*H);
 const sky=gctx.createLinearGradient(0,-H*1.6,0,surface);
 sky.addColorStop(0,'#091d45');sky.addColorStop(.60,'#1c497c');
 sky.addColorStop(.84,'#4cb2cf');sky.addColorStop(1,'#c8f8e1');
 gctx.fillStyle=sky;gctx.fillRect(0,-H*2.5,W,surface+H*2.5);
 for(let i=0;i<8;i++){const x=((i*239-cam*W*.17)%(W+260)+W+260)%(W+260)-70;
  gctx.fillStyle='#e7fff03a';gctx.beginPath();gctx.ellipse(x,45+(i%3)*31,85+i*5,11,0,0,7);gctx.fill();}
 const water=gctx.createLinearGradient(0,surface,0,H);water.addColorStop(0,'#16a9c1');water.addColorStop(.28,'#066f9d');water.addColorStop(1,'#061c48');gctx.fillStyle=water;gctx.fillRect(0,surface,W,H*2.5);
 gctx.save();gctx.beginPath();gctx.rect(0,surface,W,H-surface);gctx.clip();
 for(let i=0;i<15;i++){let x=((i*173-cam*W*.27)%(W+350)+W+350)%(W+350)-140;
 gctx.fillStyle='#bafcf50d';gctx.beginPath();gctx.moveTo(x,surface);gctx.lineTo(x+32,surface);gctx.lineTo(x+220,H);gctx.lineTo(x-100,H);gctx.fill();}
 // Parallax shelves, coral towers and moving shafts of light.
 for(let i=0;i<19;i++){let x=sx(i*.17+.08),y=H*(.89+(i%4)*.038);
 gctx.fillStyle=i%3?'#08436d':'#0a5976';gctx.beginPath();gctx.ellipse(x,y,50+(i%5)*16,30+(i%4)*16,0,0,7);gctx.fill();
 if(i%3===0){gctx.strokeStyle='#23a7a977';gctx.lineWidth=8;gctx.beginPath();gctx.moveTo(x,y);gctx.quadraticCurveTo(x-12,y-35,x-5,y-64);gctx.moveTo(x,y-32);gctx.lineTo(x+16,y-51);gctx.stroke();}}
 for(let i=0;i<30;i++){let x=((i*127-t*.021-cam*W*.35)%(W+100)+W+100)%(W+100)-30,y=surface+((i*71-t*.012)%(H-surface)+(H-surface))%(H-surface);
 gctx.strokeStyle='#d9ffff40';gctx.lineWidth=1.5;gctx.beginPath();gctx.arc(x,y,1.5+i%4,0,7);gctx.stroke();}
 // Small schools of tropical fish drift independently of the dolphin.
 // Position in world coordinates so the camera never drags the fish with it.
 for(let school=0;school<7;school++){
  const fy=H*(.47+(school%4)*.105);
  const fx=sx(.13+school*.39)+Math.sin(t/1650+school*2.1)*19;
  for(let fish=0;fish<6;fish++){
   const x=fx+fish*15+(fish%3)*5, y=fy+Math.sin(t/500+fish*.9+school)*5+(fish%2)*9;
   if(x<-40||x>W+40)continue;
   const size=3+(fish%3),dir=school%2?-1:1;
   gctx.fillStyle=['#f8db80','#8ce7d4','#fba88c','#b9ebeb'][school%4];
   gctx.beginPath();gctx.ellipse(x,y,size*1.9,size,0,0,7);gctx.fill();
   gctx.beginPath();gctx.moveTo(x-dir*size*1.5,y);gctx.lineTo(x-dir*size*3,y-size);
   gctx.lineTo(x-dir*size*3,y+size);gctx.fill();
  }
 }
 gctx.restore();
 // Land rises straight out of the seabed: jumping is a real requirement.
 const l=sx(ECHO_ISLAND.left),r=sx(ECHO_ISLAND.right);
 if(r>-95&&l<W+95){const rock=gctx.createLinearGradient(l,0,r,H);rock.addColorStop(0,'#aa9170');rock.addColorStop(.29,'#405e73');rock.addColorStop(1,'#122b4f');gctx.fillStyle=rock;
 gctx.beginPath();gctx.moveTo(l,H);gctx.lineTo(l, ECHO_ISLAND.top*H+16);gctx.quadraticCurveTo(l+(r-l)*.2,ECHO_ISLAND.top*H-11,l+(r-l)*.46,ECHO_ISLAND.top*H+4);
 gctx.quadraticCurveTo(r-(r-l)*.12,ECHO_ISLAND.top*H-17,r,ECHO_ISLAND.top*H+17);gctx.lineTo(r,H);gctx.fill();
 gctx.fillStyle='#eddfac';gctx.beginPath();gctx.ellipse((l+r)/2,ECHO_ISLAND.top*H+4,Math.max(1,(r-l)/2),12,0,Math.PI*1.0,Math.PI*2);gctx.fill();
 gctx.strokeStyle='#473e44';gctx.lineWidth=8;gctx.beginPath();gctx.moveTo((l+r)/2,ECHO_ISLAND.top*H);gctx.quadraticCurveTo((l+r)/2+6,ECHO_ISLAND.top*H-33,(l+r)/2-3,ECHO_ISLAND.top*H-67);gctx.stroke();
 gctx.strokeStyle='#276d55';gctx.lineWidth=7;for(let i=0;i<5;i++){gctx.beginPath();gctx.moveTo((l+r)/2-3,ECHO_ISLAND.top*H-67);gctx.quadraticCurveTo((l+r)/2+(i-2)*19,ECHO_ISLAND.top*H-94,(l+r)/2+(i-2)*30,ECHO_ISLAND.top*H-55+i%2*8);gctx.stroke();}
 }
 // A distant lagoon marker shows where the player has to land.
 const beacon=sx(ECHO_END);if(beacon>-100&&beacon<W+100){gctx.fillStyle='#ffe78d';gctx.beginPath();gctx.arc(beacon,surface-20,14+Math.sin(t/220)*3,0,7);gctx.fill();gctx.font='bold 12px Trebuchet MS';gctx.fillStyle='#fff';gctx.fillText('LAGOON ✦',beacon-27,surface-44);}
 gctx.strokeStyle='#beffed99';gctx.lineWidth=3;gctx.beginPath();gctx.moveTo(0,surface);
 for(let x=0;x<=W+20;x+=10)gctx.lineTo(x,surface+Math.sin(x*.024+t*.003)*3);gctx.stroke();
 if(!gs){gctx.restore();return;}
 for(const p of gs.trail){const age=clamp(1-p.age/.9,0,1),x=sx(p.x),y=p.y*H;
 if(age>0){gctx.fillStyle=`rgba(197,255,244,${age*.34})`;gctx.beginPath();gctx.arc(x,y,Math.max(1,age*4),0,7);gctx.fill();}}
 for(const shot of gs.echoShots){
  const age=gs.age-shot.born,alpha=clamp(1-age/2.8,0,1);
  gctx.strokeStyle=`rgba(135,255,235,${alpha*.9})`;gctx.lineWidth=3;gctx.setLineDash([7,6]);
  gctx.beginPath();gctx.moveTo(sx(shot.from.x),shot.from.y*H);
  gctx.lineTo(sx(shot.wall.x),shot.wall.y*H);
  if(shot.reflected&&shot.closeEnough)gctx.lineTo(sx(shot.back.x),shot.back.y*H);
  gctx.stroke();gctx.setLineDash([]);
  if(shot.reflected&&shot.closeEnough){
   // The bright moving tip makes the return direction legible even without text.
   const progress=clamp((age-.52)/.92,0,1);
   const tipX=sx(lerp(shot.wall.x,shot.back.x,progress));
   const tipY=lerp(shot.wall.y,shot.back.y,progress)*H;
   gctx.strokeStyle=`rgba(225,255,189,${alpha*.85})`;gctx.lineWidth=4;gctx.beginPath();
   gctx.moveTo(sx(shot.wall.x),shot.wall.y*H);gctx.lineTo(tipX,tipY);gctx.stroke();
   gctx.fillStyle=`rgba(246,255,205,${alpha})`;gctx.beginPath();gctx.arc(tipX,tipY,5+Math.sin(t/110)*1.5,0,7);gctx.fill();
   gctx.strokeStyle=`rgba(200,255,240,${alpha})`;gctx.lineWidth=2;gctx.beginPath();gctx.arc(sx(shot.wall.x),shot.wall.y*H,11+Math.sin(t/140)*4,0,7);gctx.stroke();
  }
 }
 for(const orb of gs.echoOrbs){
  const life=clamp((17-(gs.age-orb.born))/17,0,1),x=sx(orb.x),y=orb.y*H;
  gctx.fillStyle=`rgba(124,255,211,${life*.15})`;gctx.beginPath();gctx.arc(x,y,23+Math.sin(t/170+orb.x*8)*3,0,7);gctx.fill();
  gctx.strokeStyle=`rgba(188,255,247,${life*.94})`;gctx.lineWidth=3;gctx.beginPath();gctx.arc(x,y,12+Math.sin(t/190+orb.y*8)*2,0,7);gctx.stroke();
  gctx.fillStyle=`rgba(245,255,198,${life})`;gctx.beginPath();gctx.arc(x,y,4,0,7);gctx.fill();
 }
 // Floating instructional banners intentionally removed for Dolphin Echo.
 if(gs.splash>0){gctx.strokeStyle=`rgba(225,255,246,${gs.splash})`;gctx.lineWidth=3;gctx.beginPath();gctx.ellipse(sx(gs.x),surface,65*(1-gs.splash)+8,8,0,0,7);gctx.stroke();}
 const scale=clamp(Math.min(W,H)/650,.40,1.05),pitch=gs.heading+gs.flipAngle;
 drawEchoDolphin(gctx,sx(gs.x),gs.y*H,pitch,t,scale);
 gctx.restore();
 // Minimal dolphin HUD: speed bar only.
 const barW=Math.min(220,W-155);
 gctx.fillStyle='#17485e';gctx.fillRect(23,H-24,barW,7);
 gctx.fillStyle='#afffd0';gctx.fillRect(23,H-24,barW*gs.speedDisplay,7);
}
function drawWhaleGame(W,H,t){
 const belly=gctx.createLinearGradient(0,0,W,H);belly.addColorStop(0,'#412954');belly.addColorStop(.48,'#93508c');belly.addColorStop(1,'#271e51');gctx.fillStyle=belly;gctx.fillRect(0,0,W,H);
 // Organic membrane ribs behind the actual current lanes.
 for(let i=0;i<10;i++){
  const y=(i+.6)*H/10,swirl=Math.sin(t/700+i)*16;
  gctx.strokeStyle=i%2?'#ffc4ce40':'#83e4dc35';gctx.lineWidth=8+i%3*2;
  gctx.beginPath();gctx.moveTo(-40,y+swirl);gctx.bezierCurveTo(W*.22,y-34,W*.74,y+32,W+45,y-swirl);gctx.stroke();
 }
 // Alternating streams: visible ribbon, particles and arrowheads all travel
 // in the SAME direction as the force used in whaleFlow().
 for(let k=0;k<WHALE_CURRENTS.length;k++){
  const c=WHALE_CURRENTS[k],cy=c.y*H,half=c.half*H;
  const grad=gctx.createLinearGradient(0,cy-half,0,cy+half);
  grad.addColorStop(0,'#85fff000');grad.addColorStop(.4,k===1?'#c6afff38':'#8bfff13c');
  grad.addColorStop(.5,k===1?'#dfbcff45':'#9dffed55');grad.addColorStop(1,'#85fff000');
  gctx.fillStyle=grad;gctx.fillRect(0,cy-half,W,half*2);
  gctx.strokeStyle=c.color+'88';gctx.lineWidth=3;gctx.beginPath();
  for(let x=0;x<=W+12;x+=12){const y=cy+Math.sin(x*.017+t*.002+k)*half*.15;
   if(x===0)gctx.moveTo(x,y);else gctx.lineTo(x,y);
  }gctx.stroke();
  for(let i=0;i<9;i++){
   const travel=(t*.085+i*(W+80)/9)%(W+80),x=c.dir===1?travel-40:W+40-travel;
   const y=cy+Math.sin(i*13.7+k*6)*half*.53;
   gctx.strokeStyle=c.color+'cc';gctx.lineWidth=3;gctx.lineCap='round';
   gctx.beginPath();gctx.moveTo(x-c.dir*11,y-5);gctx.lineTo(x,y);gctx.lineTo(x-c.dir*11,y+5);gctx.stroke();
   gctx.fillStyle='#e6fff6aa';gctx.beginPath();gctx.arc(x-c.dir*23,y,2+(i%2),0,7);gctx.fill();
  }
 }
 for(let i=0;i<21;i++){
  const x=(i*137+t*.019)%(W+70)-35,y=(i*127-t*.023+H*20)%(H+70)-35;
  gctx.strokeStyle='#d6fff64a';gctx.lineWidth=1.5;gctx.beginPath();gctx.arc(x,y,2+i%5,0,7);gctx.stroke();
 }
 const bx=.89*W,by=.19*H,open=gs&&gs.got.length===3;
 // The plugged hole looks blocked until the three lights dissolve it.
 const aura=gctx.createRadialGradient(bx,by,3,bx,by,Math.min(W*.28,115));
 aura.addColorStop(0,open?'#b5fff9e8':'#ffa77b88');aura.addColorStop(1,'#8dfff000');
 gctx.fillStyle=aura;gctx.beginPath();gctx.arc(bx,by,Math.min(W*.28,115),0,7);gctx.fill();
 gctx.fillStyle='#15142e';gctx.strokeStyle='#a7fff3';gctx.lineWidth=5;
 gctx.beginPath();gctx.ellipse(bx,by,Math.min(W*.085,40),Math.min(H*.045,43),0,0,7);gctx.fill();gctx.stroke();
 if(open){
  const jet=gctx.createLinearGradient(bx,by+75,bx,by-150);
  jet.addColorStop(0,'#5affca08');jet.addColorStop(.5,'#83fff1a8');jet.addColorStop(1,'#f6fffb00');
  gctx.fillStyle=jet;gctx.beginPath();gctx.moveTo(bx-19,by+100);gctx.lineTo(bx-36,0);gctx.lineTo(bx+36,0);gctx.lineTo(bx+19,by+100);gctx.closePath();gctx.fill();
  for(let i=0;i<28;i++){
   const y=by+110-((t*.22+i*29)%(by+160)),x=bx+Math.sin(t*.004+i*13)*16*(1+Math.max(0,by-y)/200);
   gctx.fillStyle=i%3?'#b4fff3':'#fff9c8';gctx.beginPath();gctx.arc(x,y,2+i%3,0,7);gctx.fill();
  }
 }else{
  gctx.fillStyle='#c18f76';gctx.strokeStyle='#48324b';gctx.lineWidth=4;
  gctx.beginPath();gctx.ellipse(bx,by,Math.min(W*.064,28),Math.min(H*.028,24),.2,0,7);gctx.fill();gctx.stroke();
  for(let i=0;i<3;i++){gctx.strokeStyle='#ffd1a5';gctx.lineWidth=2;gctx.beginPath();gctx.moveTo(bx-15+i*10,by-4);gctx.lineTo(bx-9+i*10,by+5);gctx.stroke();}
 }
 if(!gs)return;
 gs.gems.forEach((p,i)=>{
  if(gs.got.includes(i))return;
  const x=p.x*W,y=p.y*H,r=11+Math.sin(t/210+i)*3,light=gctx.createRadialGradient(x,y,0,x,y,37);
  light.addColorStop(0,'#faffc3be');light.addColorStop(1,'#ebff8800');
  gctx.fillStyle=light;gctx.beginPath();gctx.arc(x,y,37,0,7);gctx.fill();
  gctx.fillStyle='#f1ff97';gctx.strokeStyle='#fbf5ca';gctx.lineWidth=2;gctx.beginPath();gctx.arc(x,y,r,0,7);gctx.fill();gctx.stroke();
 });
 // Keep an uncluttered bottom HUD below the whale; never collide with the title.
 const hudW=Math.min(W-30,215),left=15,baseY=H-29;
 gctx.fillStyle='#100c2ab8';gctx.fillRect(left-8,baseY-27,hudW+16,42);
 for(let i=0;i<3;i++){
  gctx.fillStyle=gs.got.includes(i)?'#d8ff98':'#816c9f';
  gctx.beginPath();gctx.arc(left+9+i*24,baseY-13,6,0,7);gctx.fill();
 }
 gctx.textAlign='right';gctx.fillStyle=gs.t<10?'#ffd58d':'#e8fff5';gctx.font='bold 12px Trebuchet MS';
 gctx.fillText(`${Math.ceil(gs.t)}s`,left+hudW-2,baseY-9);gctx.textAlign='left';
 gctx.fillStyle='#3b324e';gctx.fillRect(left,baseY-3,hudW-12,6);
 gctx.fillStyle=gs.t<10?'#ffc77d':'#a7ffe2';gctx.fillRect(left,baseY-3,(hudW-12)*gs.t/45,6);
 // A real eruption: movement and splash FX finish BEFORE the result card appears.
 if(gs.phase==='launch'){
  for(let i=0;i<34;i++){
   const p=gs.launchAge,u=(i*0.6180339887)%1,spread=(.18+p*.15)*W;
   const x=bx+(u-.5)*spread,y=by-p*H*.7+(i%8)*17-p*30;
   gctx.fillStyle=i%4?'#c7fff2':'#fffbc0';gctx.beginPath();gctx.arc(x,y,2+(i%4),0,7);gctx.fill();
  }
  gctx.strokeStyle='#f2ffedcf';gctx.lineWidth=5;gctx.beginPath();gctx.arc(bx,by,18+gs.launchAge*80,0,7);gctx.stroke();
 }
 drawTinyWorm(gctx,gs.x*W,gs.y*H,t,gs.heading||0);
}
function drawTrailGame(W,H,t){gctx.fillStyle='#fff1f7';gctx.fillRect(0,0,W,H);for(let i=0;i<25;i++){gctx.fillStyle=i%2?'#decdf255':'#ffbfd455';gctx.beginPath();gctx.arc((i*173)%W,(i*97)%H,4+i%9,0,7);gctx.fill()}if(!gs)return;gs.blots.forEach(o=>{gctx.fillStyle='#302244';gctx.beginPath();gctx.arc(o.x*W,o.y*H,o.r*Math.min(W,H),0,7);gctx.fill();for(let i=0;i<7;i++){gctx.beginPath();gctx.arc((o.x+Math.cos(i)*o.r*1.1)*W,(o.y+Math.sin(i)*o.r*1.1)*H,5+i%3,0,7);gctx.fill()}});if(gs.path.length>1){gctx.lineCap='round';gctx.lineJoin='round';for(let i=1;i<gs.path.length;i++){gctx.strokeStyle=`hsl(${i*13+t/35} 88% 62%)`;gctx.lineWidth=14;gctx.beginPath();gctx.moveTo(gs.path[i-1].x*W,gs.path[i-1].y*H);gctx.lineTo(gs.path[i].x*W,gs.path[i].y*H);gctx.stroke()}}gctx.fillStyle='#ffe36d';gctx.strokeStyle='#39264f';gctx.lineWidth=6;gctx.beginPath();gctx.arc(gs.goal.x*W,gs.goal.y*H,32,0,7);gctx.fill();gctx.stroke();gctx.fillStyle='#39264f';gctx.font='28px system-ui';gctx.textAlign='center';gctx.textBaseline='middle';gctx.fillText('★',gs.goal.x*W,gs.goal.y*H);gctx.fillStyle='#ff7fb4';gctx.beginPath();gctx.arc(gs.ball.x*W,gs.ball.y*H,22,0,7);gctx.fill();gctx.stroke();gctx.fillStyle='#fff8';gctx.beginPath();gctx.arc(gs.ball.x*W-7,gs.ball.y*H-7,6,0,7);gctx.fill();gctx.textAlign='start';gctx.textBaseline='alphabetic'}
function rainbowLine(a,b,W,H,t,width=13){const steps=9;gctx.lineCap='round';for(let i=0;i<steps;i++){const u=i/steps,v=(i+1)/steps;gctx.strokeStyle=`hsl(${t/22+i*38} 88% 62%)`;gctx.lineWidth=width;gctx.beginPath();gctx.moveTo(lerp(a.x,b.x,u)*W,lerp(a.y,b.y,u)*H);gctx.lineTo(lerp(a.x,b.x,v)*W,lerp(a.y,b.y,v)*H);gctx.stroke()}}
function drawAirbridge(W,H,t){const bg=gctx.createLinearGradient(0,0,0,H);bg.addColorStop(0,'#6251ad');bg.addColorStop(1,'#b7edee');gctx.fillStyle=bg;gctx.fillRect(0,0,W,H);for(let i=0;i<18;i++){gctx.fillStyle='#fff5';gctx.beginPath();gctx.arc((i*179)%W,(i*83+t*.02)%H,4+i%8,0,7);gctx.fill()}if(!gs)return;for(const p of gs.platforms)rainbowLine(p.a,p.b,W,H,t+(gs.age-p.born)*80,12);if(gs.drawing)rainbowLine(gs.drawing.a,gs.drawing.b,W,H,t,10);gs.stars.forEach((s,i)=>{if(gs.got.includes(i))return;gctx.fillStyle='#ffe468';gctx.strokeStyle='#4a335f';gctx.lineWidth=4;gctx.font='34px system-ui';gctx.fillText('★',s.x*W-17,s.y*H+13)});gctx.fillStyle='#fff';gctx.strokeStyle='#6c5ca2';gctx.lineWidth=5;gctx.beginPath();gctx.ellipse(gs.goal.x*W,gs.goal.y*H,48,25,0,0,7);gctx.fill();gctx.stroke();gctx.fillStyle='#ff7fb7';gctx.beginPath();gctx.arc(gs.ball.x*W,gs.ball.y*H,20,0,7);gctx.fill();gctx.stroke();gctx.fillStyle='#fff9';gctx.beginPath();gctx.arc(gs.ball.x*W-6,gs.ball.y*H-7,6,0,7);gctx.fill()}
function drawSling(W,H,t){
 const gradient=gctx.createLinearGradient(0,0,0,H);gradient.addColorStop(0,'#100b2a');gradient.addColorStop(1,'#3b2659');gctx.fillStyle=gradient;gctx.fillRect(0,0,W,H);
 if(!gs)return;
 const sx=x=>(x-gs.cameraX)*W,sy=y=>(y-gs.cameraY)*H;
 for(let i=0;i<300;i++){
  const x=-1.9+(i*59%540)/100,y=-2.8+(i*137%410)/100,px=sx(x),py=sy(y);
  if(px<-8||px>W+8||py<-8||py>H+8)continue;
  gctx.fillStyle=i%5?'#ffffff8c':'#ffe2a080';gctx.fillRect(px,py,2+i%2,2+i%2);
 }
 // The light lanes are guides, never parabolic predicted trajectories.
 gctx.strokeStyle='#ad9aff24';gctx.lineWidth=2;
 for(const aimX of SLING_AIMS){
  const slope=(.5-aimX)*SLING_AIM_X/SLING_SPEED_Y;
  gctx.beginPath();gctx.moveTo(sx(aimX),sy(.92));gctx.lineTo(sx(aimX+slope*(.92+1.8)),sy(-1.8));gctx.stroke();
 }
 gs.stars.forEach((star,i)=>{
  if(gs.got.includes(i))return;
  const x=sx(star.x),y=sy(star.y);if(x<-25||x>W+25||y<-25||y>H+25)return;
  gctx.save();gctx.translate(x,y);gctx.rotate(t/800+i*.12);
  gctx.shadowColor='#ffe18a';gctx.shadowBlur=10;gctx.fillStyle='#fff1a9';gctx.strokeStyle='#a66c88';gctx.lineWidth=1.5;
  gctx.beginPath();for(let j=0;j<10;j++){
   const angle=j*Math.PI/5-Math.PI/2,r=j%2?6:13;
   if(j===0)gctx.moveTo(Math.cos(angle)*r,Math.sin(angle)*r);else gctx.lineTo(Math.cos(angle)*r,Math.sin(angle)*r);
  }gctx.closePath();gctx.fill();gctx.stroke();gctx.restore();
 });
 let above=0, left=0,right=0;
 gs.stars.forEach((star,i)=>{if(gs.got.includes(i))return;const x=sx(star.x),y=sy(star.y);if(y<-13)above++;if(x<-13)left++;if(x>W+13)right++;});
 gctx.fillStyle='#fff3ac';gctx.font='bold 13px Trebuchet MS';gctx.textAlign='center';
 if(above)gctx.fillText(`▲ ${above} ★ ABOVE`,W/2,74);
 if(left)gctx.fillText(`◀ ${left} ★`,38,H*.50);
 if(right)gctx.fillText(`${right} ★ ▶`,W-38,H*.50);
 gctx.strokeStyle='#b47b58';gctx.lineWidth=14;gctx.lineCap='round';
 for(const post of gs.posts){gctx.beginPath();gctx.moveTo(sx(post.x),sy(.98));gctx.lineTo(sx(post.x),sy(post.y));gctx.stroke();}
 if(gs.phase==='wire'){
  if(gs.gesture){
   const a={x:gs.gesture.start.x-gs.cameraX,y:gs.gesture.start.y-gs.cameraY};
   const b={x:gs.gesture.current.x-gs.cameraX,y:gs.gesture.current.y-gs.cameraY};
   rainbowLine(a,b,W,H,t,9);
  }
  gctx.strokeStyle='#f8dda5';gctx.lineWidth=2;gctx.setLineDash([5,6]);gctx.beginPath();gctx.moveTo(sx(gs.posts[0].x),sy(gs.posts[0].y));gctx.lineTo(sx(gs.posts[1].x),sy(gs.posts[1].y));gctx.stroke();gctx.setLineDash([]);
 }else if(gs.phase==='pull'){
  const a={x:gs.posts[0].x-gs.cameraX,y:gs.posts[0].y-gs.cameraY};
  const b={x:gs.ball.x-gs.cameraX,y:gs.ball.y-gs.cameraY};
  const c={x:gs.posts[1].x-gs.cameraX,y:gs.posts[1].y-gs.cameraY};
  rainbowLine(a,b,W,H,t,9);rainbowLine(b,c,W,H,t+200,9);
  if(gs.pulling){
   const dx=(.5-gs.ball.x)*SLING_AIM_X/SLING_SPEED_Y;
   gctx.strokeStyle='#f8e9a9bb';gctx.lineWidth=3;gctx.setLineDash([7,9]);
   gctx.beginPath();gctx.moveTo(sx(gs.ball.x),sy(gs.ball.y));gctx.lineTo(sx(gs.ball.x+dx*(gs.ball.y+2.3)),sy(-2.3));gctx.stroke();gctx.setLineDash([]);
  }
 }
 if(gs.trail.length){gctx.strokeStyle='#ff8acb9e';gctx.lineWidth=6;gctx.beginPath();gs.trail.forEach((p,i)=>{if(i)gctx.lineTo(sx(p.x),sy(p.y));else gctx.moveTo(sx(p.x),sy(p.y));});gctx.stroke();}
 if(gs.phase!=='wire'&&gs.phase!=='reloading'){
  const bx=sx(gs.ball.x),by=sy(gs.ball.y);
  gctx.shadowColor='#ff84c9';gctx.shadowBlur=16;gctx.fillStyle='#ff80b7';gctx.strokeStyle='#170e2e';gctx.lineWidth=5;
  gctx.beginPath();gctx.arc(bx,by,19,0,7);gctx.fill();gctx.stroke();gctx.shadowBlur=0;
  gctx.fillStyle='#fff9';gctx.beginPath();gctx.arc(bx-6,by-6,5,0,7);gctx.fill();
 }
 // HUD remains pinned to the display while the world/camera scrolls.
 gctx.textAlign='left';const hud=`★ ${gs.got.length}/${gs.stars.length}  ·  ${gs.shots} SHOTS  ·  ∞ BALLS`;
 gctx.font='bold 13px Trebuchet MS';gctx.fillStyle='#0a0926df';gctx.fillRect(7,H-53,Math.min(W-14,gctx.measureText(hud).width+22),38);
 gctx.fillStyle='#fff4d5';gctx.fillText(hud,17,H-28);
}

function drawTinyWorm(c,x,y,t,heading=0){c.save();c.translate(x,y);c.rotate(heading);for(let i=4;i>=0;i--){c.fillStyle=`hsl(${t/18+i*45} 88% 70%)`;c.strokeStyle='#16122b';c.lineWidth=3;c.beginPath();c.arc(-i*10,Math.sin(i*.9+t/220)*5,12-i,0,7);c.fill();c.stroke()}c.fillStyle='#16122b';c.beginPath();c.arc(5,-4,2.5,0,7);c.arc(5,5,2.5,0,7);c.fill();c.strokeStyle='#ff9cce';c.lineWidth=2;c.beginPath();c.moveTo(10,0);c.lineTo(16,0);c.stroke();c.restore()}
// SlopWorm-only discoveries: neither game uses the original SlopSnake arcade.
const LAUNDRY_SWAPS=[[[0,1],[1,2],[0,2]],[[1,2],[0,1],[0,2],[1,2]],[[0,2],[0,1],[1,2],[0,2],[0,1]]];
function laundryRound(n){
 const target=n%3;
 return{round:n,score:n,phase:'reveal',time:0,target,slots:[0,1,2],moves:LAUNDRY_SWAPS[n],step:0,swap:null,chosen:-1,message:'WATCH THE WORM!',resultSuccess:false};
}
function laundryChoose(slot){
 if(!gameRunning||activeGame!=='laundry'||gs.phase!=='choose'||slot<0||slot>2)return;
 gs.chosen=slot;gs.resultSuccess=gs.slots[gs.target]===slot;
 gs.phase='result';gs.time=0;
 if(gs.resultSuccess){gs.score++;tone(620,.13,'triangle');tone(830,.16,'sine');gs.message='FOUND IT!';}
 else{tone(145,.18,'sawtooth',.05);gs.message='NOPE! WATCH AGAIN.';}
}
function updateLaundry(dt){
 if(gs.phase==='reveal'){
  gs.time+=dt;
  if(gs.time>=1.65){gs.phase='shuffle';gs.time=0;}
 }else if(gs.phase==='shuffle'){
  if(!gs.swap){
   if(gs.step>=gs.moves.length){gs.phase='choose';tone(530,.09,'triangle');}
   else{const [a,b]=gs.moves[gs.step],duration=Math.max(.47,.77-gs.round*.1);gs.swap={a,b,fromA:gs.slots[a],fromB:gs.slots[b],time:0,duration};tone(260+gs.step*45,.08,'triangle',.04);}
  }
  if(gs.swap){const s=gs.swap;s.time=Math.min(s.duration,s.time+dt);if(s.time>=s.duration){gs.slots[s.a]=s.fromB;gs.slots[s.b]=s.fromA;gs.step++;gs.swap=null;}}
 }else if(gs.phase==='result'){
  gs.time+=dt;
  if(gs.time>1.15){
   if(gs.score===3)return finishGame(true,'Three worms recovered from the washing. Nobody went through the spin cycle!');
   const next=laundryRound(gs.resultSuccess?gs.round+1:gs.round);
   if(!gs.resultSuccess)next.message='WATCH CLOSELY. SAME ROUND!';
   gs=next;
  }
 }
 const phase=gs.phase==='reveal'?'LOOK!':gs.phase==='shuffle'?'FOLLOW IT':gs.phase==='choose'?'PICK A BASKET':gs.message;
 $('gameStat').textContent=`${gs.score}/3 · ${phase}`;
}
function drawLaundry(W,H,now){
 const c=gctx;
 const bg=c.createLinearGradient(0,0,0,H);bg.addColorStop(0,'#442c61');bg.addColorStop(1,'#b67d9e');c.fillStyle=bg;c.fillRect(0,0,W,H);
 c.fillStyle='#ffe6b0';c.fillRect(0,H*.78,W,H*.22);
 c.fillStyle='#261e47';c.fillRect(W*.06,H*.13,W*.88,H*.15);
 c.font=`900 ${Math.min(30,W*.07)}px Trebuchet MS`;c.textAlign='center';c.textBaseline='middle';c.fillStyle='#f9f5dd';c.fillText('THE WASHMAN’S HOUSE',W*.5,H*.20);
 c.font=`900 ${Math.min(19,W*.049)}px Trebuchet MS`;c.fillStyle='#fff4dc';c.fillText(gs.phase==='choose'?'WHICH BASKET? TAP 1, 2 OR 3':gs.phase==='result'?gs.message:gs.phase==='reveal'?'LOOK! THE WORM JUMPS IN…':'KEEP YOUR EYES ON THE BASKET!',W*.5,H*.36);
 const positions=[.20,.50,.80];
 const bx=Math.min(W*.17,67),by=H*.65,basketWidth=Math.min(W*.24,115),basketHeight=Math.min(H*.17,105);
 gs.slots.forEach((slot,id)=>{
  let x=positions[slot]*W,vertical=0;
  if(gs.swap&&(gs.swap.a===id||gs.swap.b===id)){
   const s=gs.swap,e=s.time/s.duration,k=e*e*(3-2*e),from=positions[id===s.a?s.fromA:s.fromB]*W,to=positions[id===s.a?s.fromB:s.fromA]*W;
   x=lerp(from,to,k);vertical=(id===s.a?-1:1)*Math.sin(Math.PI*k)*Math.min(44,H*.055);
  }
  const y=by+vertical;
  if((gs.phase==='reveal'&&id===gs.target)||(gs.phase==='result'&&id===gs.target)){
   const pop=gs.phase==='reveal'?(Math.sin(Math.min(1,gs.time/.33)*Math.PI/2)):.95;
   drawTinyWorm(c,x,y-basketHeight*.50-25*pop,now,-Math.PI/2);
  }
  c.save();c.translate(x,y);c.shadowColor='#100d25aa';c.shadowBlur=8;c.shadowOffsetY=8;
  c.fillStyle='#f2bb70';c.strokeStyle='#2b2248';c.lineWidth=4;c.beginPath();c.moveTo(-basketWidth*.45,-basketHeight*.35);c.lineTo(basketWidth*.45,-basketHeight*.35);c.lineTo(basketWidth*.36,basketHeight*.5);c.quadraticCurveTo(0,basketHeight*.7,-basketWidth*.36,basketHeight*.5);c.closePath();c.fill();c.stroke();c.shadowBlur=0;c.shadowOffsetY=0;
  c.fillStyle='#d88958';for(let l=-1;l<=1;l++){c.fillRect(-basketWidth*.38,basketHeight*(l*.19-.07),basketWidth*.76,Math.max(3,basketHeight*.065))}
  c.fillStyle='#fff4e1';c.fillRect(-basketWidth*.35,-basketHeight*.38,basketWidth*.7,6);c.restore();
 });
 if(gs.phase==='choose'||gs.phase==='result'){
  positions.forEach((p,i)=>{c.fillStyle=gs.phase==='result'&&gs.chosen===i?(gs.resultSuccess?'#b9f6a2':'#ff9fae'):'#fff6e6';c.strokeStyle='#28213f';c.lineWidth=3;c.beginPath();c.arc(p*W,by+basketHeight*.82,Math.min(24,W*.047),0,7);c.fill();c.stroke();c.fillStyle='#29213c';c.font='900 19px Trebuchet MS';c.fillText(String(i+1),p*W,by+basketHeight*.82+1);});
 }
 c.textAlign='center';c.font=`900 ${Math.min(18,W*.046)}px Trebuchet MS`;c.fillStyle='#271d44';c.fillText(`FOUND ${gs.score} / 3`,W*.5,H*.91);
 c.textBaseline='alphabetic';c.textAlign='start';
}
// Tilt Machine only. Standalone world discovery; no SlopSnake arcade mechanics.
const TILT_TILE=48,TILT_COLS=82,TILT_ROWS=24;
const TILT_LEVEL1_TIME=60,TILT_LEVEL2_TIME=2.0,TILT_BREAK_SPEED=175;
const TILT_EDGE_FROM=55,TILT_EDGE_TO=77,TILT_EDGE_TOP=3,TILT_EDGE_BOTTOM=7;
function tiltTimeLabel(v){return v<10?`${Math.max(0,v).toFixed(1)}s`:`${Math.ceil(v)}s`}
function tiltBuild(level=1){
 const tiles=Array.from({length:TILT_ROWS},()=>Array(TILT_COLS).fill(0));
 const path=(x0,y0,x1,y1)=>{for(let y=y0;y<=y1;y++)for(let x=x0;x<=x1;x++)tiles[y][x]=1};
 if(level===1){
  path(1,10,11,13);path(9,5,12,13);path(10,4,25,7);
  path(22,4,25,12);path(22,9,42,12);path(39,3,42,12);
  path(40,3,80,6);path(51,2,53,6);path(78,2,81,6);
  const walls=[{x:7,y:10,h:4},{x:17,y:4,h:4},{x:29,y:9,h:4},{x:46,y:3,h:4}];
  const crates=walls.flatMap((w,i)=>Array.from({length:w.h},(_,j)=>({x:w.x,y:w.y+j,id:i*4+j,broken:false})));
  const crosses=[
   {x:5,y:11,penalty:2},{x:13,y:5,penalty:5},{x:23,y:7,penalty:2},
   {x:26,y:10,penalty:5},{x:34,y:10,penalty:2},{x:40,y:8,penalty:5},{x:49,y:5,penalty:2},
   {x:57,y:3,penalty:2,size:2},{x:63,y:5,penalty:5,size:1},
   {x:68,y:5,penalty:5,size:2},{x:74,y:4,penalty:2,size:1}
  ].map(p=>({...p,size:p.size||2,armed:true}));
  const edgeHazards=[];
  for(let x=TILT_EDGE_FROM;x<=TILT_EDGE_TO;x++){
   const chunk=Math.floor((x-TILT_EDGE_FROM)/4);
   for(const side of ['top','bottom'])edgeHazards.push({x,side,penalty:(chunk+(side==='bottom'?1:0))%2?5:2,armed:true});
  }
  const stars=[{x:10,y:8},{x:20,y:5},{x:24,y:11},{x:35,y:11},{x:40,y:5},{x:51,y:5},{x:61,y:5},{x:72,y:3}].map(p=>({...p,got:false}));
  return {
   level,tiles,crates,crosses,edgeHazards,stars,x:3.25*TILT_TILE,y:11.5*TILT_TILE,vx:0,vy:0,angle:0,tilt:0,jump:0,jumpCooldown:0,
   camX:3.25*TILT_TILE,camY:11.5*TILT_TILE,time:TILT_LEVEL1_TIME,startTime:TILT_LEVEL1_TIME,elapsed:0,cracked:0,bonus:0,penalties:0,
   message:'',messageAge:99,bumps:0,crackFX:[],penaltyFX:null,finish:{x0:78,x1:81,y0:2,y1:5},startPad:{x:2,y:10,w:3,h:3},
   finishPad:{x:78,y:2,w:3,h:3},arrows:[[5,12,0],[10,9,-Math.PI/2],[14,6,0],[20,6,0],[23,8,Math.PI/2],[27,11,0],[35,11,0],[40,8,-Math.PI/2],[44,5,0],[50,5,0],[56,5,0],[62,5,0],[69,4,0],[76,5,0]],
   warpReady:false,warpActive:false,warpEnergy:0,warpEnergyMax:0,warpUsed:false
  };
 }
 // Level 2: a long entry chute leads to a tight ring around a SOLID central cross.
 // The two-tile corridors and actual collision of red blocks leave room for the ball.
 path(9,1,11,8);        // approach shaft: react and trigger warp before the arena
 path(4,8,16,19);       // square chamber
 path(9,19,11,22);      // checkerboard exit
 for(let y=10;y<=17;y++)for(let x=6;x<=14;x++)tiles[y][x]=0; // impassable middle
 const crosses=[];
 // Real collision: edge crosses consume entire outer tile, leaving a single-tile lane.
 for(let y=9;y<=18;y++){
  crosses.push({x:4,y,penalty:y%2?2:5,size:1,armed:true,cooldown:0,solid:true});
  crosses.push({x:16,y,penalty:y%2?5:2,size:1,armed:true,cooldown:0,solid:true});
 }
 // Solid 2x2 crosses guard the turn. The y=8 and y=19 lanes remain passable.
 for(const x of [7,12])for(const y of [9,17]){
  crosses.push({x,y,penalty:x===7?5:2,size:2,armed:true,cooldown:0,solid:true});
 }
 // Level 2 clocks form REAL traversable chains around either side of the X.
 // Intermediate clocks at the first corner are necessary: previously the initial
 // 5.6s boost expired before a clean path reached the first side clock.
 const pickups=[
  {x:10.5,y:5.8,got:false},
  {x:8.7,y:8.4,got:false},{x:12.3,y:8.4,got:false},
  {x:5.5,y:9.3,got:false},{x:15.5,y:9.3,got:false},
  {x:5.5,y:12.2,got:false},{x:15.5,y:12.2,got:false},
  {x:5.5,y:15.1,got:false},{x:15.5,y:15.1,got:false},
  {x:5.5,y:18.2,got:false},{x:15.5,y:18.2,got:false},
  {x:8.6,y:19.5,got:false},{x:12.4,y:19.5,got:false}
 ];
 return {
  level,tiles,crates:[],crosses,edgeHazards:[],stars:[],pickups,
  x:10.5*TILT_TILE,y:2.5*TILT_TILE,vx:0,vy:10,angle:0,tilt:0,jump:0,jumpCooldown:0,
  camX:10.5*TILT_TILE,camY:3.5*TILT_TILE,time:TILT_LEVEL2_TIME,startTime:TILT_LEVEL2_TIME,
  elapsed:0,cracked:0,bonus:0,penalties:0,message:'',messageAge:99,bumps:0,crackFX:[],penaltyFX:null,
  finish:{x0:9,x1:12,y0:19,y1:22},startPad:{x:9,y:1,w:3,h:3},
  finishPad:{x:9,y:19,w:3,h:3},arrows:[[10,6,Math.PI/2],[15,9,Math.PI/2],[15,15,Math.PI/2],[10,20,0]],
  warpReady:false,warpCharges:0,warpActive:false,warpEnergy:0,
  warpEnergyMax:7.2,warpUsed:false,warpAge:0,warpTarget:null,warpTrail:[],warpRefills:0
 };
}
function tiltStartLevel(level=1){
 tiltCardNextLevel=0;$('tiltLevelTwoReplay').hidden=true;
 $('gameCard').hidden=true;gameRunning=true;gameTarget=null;
 gs=tiltBuild(level);tiltControlsVisible(true);
 // Do not place an instruction banner over the timer in either level.
 $('gameTip').hidden=true;
 $('gameTip').classList.remove('dolphin-tip');
 tiltUpdateHud(gs);tone(330,.1,'square');
}
function tiltUpdateHud(s){
 if(activeGame!=='tilt'||!s)return;
 $('gameTitle').textContent=s.level===1?'TILT TUNNEL':'TILT TUNNEL · LEVEL 2';
 if(s.level===1)$('gameStat').textContent=`⏱ ${Math.ceil(s.time)}s · ★ ${s.bonus}/${s.stars.length}`;
 else $('gameStat').textContent=`⏱ ${tiltTimeLabel(s.time)} · ${s.warpActive?'BULLET TIME':'CATCH ⏱'}`;
}
function tiltIsFloor(x,y){const tx=Math.floor(x/TILT_TILE),ty=Math.floor(y/TILT_TILE);return !!gs.tiles[ty]?.[tx]}
function tiltCratesAt(x,y,r){return gs.crates.filter(b=>!b.broken&&Math.abs(x-(b.x+.5)*TILT_TILE)<r+TILT_TILE*.47&&Math.abs(y-(b.y+.5)*TILT_TILE)<r+TILT_TILE*.47)}
function tiltBlocked(x,y,r){
 for(const [ox,oy] of [[0,0],[r,0],[-r,0],[0,r],[0,-r],[r*.72,r*.72],[-r*.72,r*.72],[r*.72,-r*.72],[-r*.72,-r*.72]])if(!tiltIsFloor(x+ox,y+oy))return true;
 return false;
}
function tiltHazardHit(s,px,py,r){
 // Collision footprint exactly matches the rendered 1x1 or 2x2 cross.
 // Four-tile crosses are solid in BOTH levels. Small crosses block only level 2.
 for(const h of s.crosses){
  if(!(h.size>=2||s.level===2))continue;
  const inset=h.size===1?4:6;
  const x0=h.x*TILT_TILE+inset,y0=h.y*TILT_TILE+inset;
  const x1=(h.x+h.size)*TILT_TILE-inset,y1=(h.y+h.size)*TILT_TILE-inset;
  if(Math.hypot(px-clamp(px,x0,x1),py-clamp(py,y0,y1))<r)return h;
 }
 return null;
}
function tiltMsg(text){gs.message=text;gs.messageAge=0}
function tiltPenalty(s,amount){
 // Level 1 keeps its original penalties. Level 2 starts with only TWO seconds:
 // subtracting the unscaled 2s/5s on a single graze used to cause instant death,
 // even in the middle of an otherwise clean Bullet Time chain.
 // Time Warp mitigates rather than cancels the penalty: precision still matters.
 const cost=s.level===2&&s.warpActive?amount*.012:amount;
 s.time=Math.max(0,s.time-cost);s.penalties++;
 s.penaltyFX={amount:cost,born:s.elapsed};tone(amount===5?90:150,.20,'sawtooth',.065);
}
function tiltEdgeContact(s,px,py,r){
 const tx=Math.floor(px/TILT_TILE);
 if(tx<TILT_EDGE_FROM||tx>TILT_EDGE_TO)return;
 const top=TILT_EDGE_TOP*TILT_TILE,bottom=TILT_EDGE_BOTTOM*TILT_TILE;
 const side=py-r<top?'top':py+r>bottom?'bottom':null;
 if(!side)return;
 const edge=s.edgeHazards.find(h=>h.x===tx&&h.side===side);
 if(edge?.armed){edge.armed=false;tiltPenalty(s,edge.penalty)}
}
function tiltJump(){if(activeGame!=='tilt'||!gameRunning||!gs||gs.jumpCooldown>0)return;gs.jump=.42;gs.jumpCooldown=.55;const hop=gs.level===2?250:230;const gx=Math.sin(gs.angle),gy=Math.cos(gs.angle);gs.vx+=-gx*hop;gs.vy+=-gy*hop;tone(490,.08,'triangle',.06);}
function tiltWarp(){
 // Only a collected clock can start or renew Bullet Time. No button or key.
 if(activeGame!=='tilt'||!gameRunning||!gs||gs.level!==2)return;
 if(!gs.warpActive){
  // Entering bullet time suspends the plummet without teleporting the ball.
  gs.vx*=.32;gs.vy*=.32;
 }
 gs.warpActive=true;gs.warpAge=0;gs.warpUsed=true;gs.warpTarget=null;
 tone(660,.23,'sine',.09);tiltUpdateHud(gs);
}

// Desktop: arrows / A,D rotate continuously while held.
// Touch: rotate by the finger's exact horizontal displacement, then stop.
// A tap or stationary finger cannot trigger HOP or auto-rotate the board.
let tiltTouchPointer=null,tiltTouchLastX=0;
function tiltReleaseInputs(){
 tiltTouchPointer=null;
 for(const key of ['arrowleft','arrowright','a','d'])keys[key]=false;
 if(gs&&activeGame==='tilt')gs.tilt=0;
}
function tiltControlsVisible(show){
 const root=$('tiltControls');if(!root)return;
 root.hidden=!show;$('gameLayer').classList.toggle('tilt-active',show);
 if(!show)tiltReleaseInputs();
}
function initTiltControls(){
 if($('tiltControls'))return;
 const root=document.createElement('div');root.id='tiltControls';root.className='tilt-controls';root.hidden=true;
 // There are no rotation buttons. The playfield is the rotation surface.
 const jump=document.createElement('button');jump.type='button';jump.className='tilt-jump';jump.textContent='HOP ↥';jump.setAttribute('aria-label','Jump over obstacles');
 jump.addEventListener('pointerdown',e=>{e.preventDefault();e.stopPropagation();tiltJump()});
 root.style.justifyContent='flex-end';root.style.pointerEvents='none';jump.style.pointerEvents='auto';root.append(jump);$('gameLayer').append(root);
 const playfield=$('gameLayer');
 playfield.addEventListener('pointerdown',e=>{
  if(!gameRunning||activeGame!=='tilt'||e.pointerType==='mouse'&&e.button!==0)return;
  // Only the canvas/background rotates. HUD, HOP and result cards stay independent.
  if(e.target!==game&&e.target!==playfield)return;
  if(tiltTouchPointer!==null)return;
  tiltTouchPointer=e.pointerId;tiltTouchLastX=e.clientX;
  try{playfield.setPointerCapture(e.pointerId)}catch(_e){}
  e.preventDefault();
 });
 playfield.addEventListener('pointermove',e=>{
  if(activeGame!=='tilt'||!gameRunning||e.pointerId!==tiltTouchPointer)return;
  e.preventDefault();
  const dx=e.clientX-tiltTouchLastX;
  tiltTouchLastX=e.clientX;
  if(gs&&Math.abs(dx)>0)gs.angle+=dx*.012;
 });
 const stop=e=>{if(e.pointerId===tiltTouchPointer)tiltTouchPointer=null;};
 for(const eventName of ['pointerup','pointercancel','lostpointercapture'])playfield.addEventListener(eventName,stop);
 window.addEventListener('pointerup',stop);
 window.addEventListener('pointercancel',stop);
 window.addEventListener('blur',tiltReleaseInputs);
 window.addEventListener('pagehide',tiltReleaseInputs);
 document.addEventListener('visibilitychange',()=>{if(document.hidden)tiltReleaseInputs()});
}
function tiltLevelOneClearCard(){
 if(!save.tiltLevel2Unlocked){save.tiltLevel2Unlocked=true;persist();}tiltCardNextLevel=2;gameRunning=false;tiltControlsVisible(false);
 $('sonarButton').hidden=true;$('gameTip').hidden=true;releaseDolphinTail();
 $('gameIcon').textContent='🌀';$('gameKicker').textContent='LEVEL 1 CLEAR · LEVEL 2 UNLOCKED';
 $('gameCardTitle').textContent='THE IMPOSSIBLE ROOM';
 $('gameInstructions').textContent=`LEVEL 1: ${gs.time.toFixed(2)}s left! Level 2 is now unlocked permanently. Catch the blue clocks to activate and renew Bullet Time automatically. Steer around the solid red crosses.`;
 $('startGame').textContent='LEVEL 2 ▶';$('tiltLevelTwoReplay').hidden=true;$('gameCard').hidden=false;
}
function tiltUpdate(dt){
 const s=gs;if(!s)return;
 // Desktop keys retain continuous free rotation; touch changes the angle directly by finger movement.
 const left=keys.arrowleft||keys.a,right=keys.arrowright||keys.d;
 const turning=left===right?s.tilt:left?-1:1;
 const warp=s.level===2&&s.warpActive;
 const simDt=warp?dt*.74:dt;
 const clockDt=warp?dt*.025:dt;
 s.angle+=turning*1.78*dt;
 s.time=Math.max(0,s.time-clockDt);s.elapsed+=dt;
 s.jump=Math.max(0,s.jump-dt);s.jumpCooldown=Math.max(0,s.jumpCooldown-dt);s.messageAge+=dt;
 s.crackFX=s.crackFX.filter(f=>s.elapsed-f.born<.58);
 if(s.penaltyFX&&s.elapsed-s.penaltyFX.born>.95)s.penaltyFX=null;
 const top=TILT_EDGE_TOP*TILT_TILE,bottom=TILT_EDGE_BOTTOM*TILT_TILE;
 for(const h of s.edgeHazards){if(h.side==='top'&&s.y>top+27||h.side==='bottom'&&s.y<bottom-27)h.armed=true;}
 // During Bullet Time normal falling is suspended. Tilt steers the floating ball.
 // Inertia survives while the player drags the maze precisely.
 if(warp){
  s.warpAge+=dt;
  const target=s.warpTarget;
  if(target){
   const dx=target.x-s.x,dy=target.y-s.y,dist=Math.hypot(dx,dy);
   if(dist<12){s.warpTarget=null;s.vx*=Math.exp(-3*dt);s.vy*=Math.exp(-3*dt)}
   else{
    const wanted=Math.min(150,Math.max(32,dist*2.2));
    const f=Math.min(1,simDt*5.2);
    s.vx=lerp(s.vx,dx/dist*wanted,f);s.vy=lerp(s.vy,dy/dist*wanted,f);
   }
  }else{
   const gx=Math.sin(s.angle)*330,gy=Math.cos(s.angle)*330;
   s.vx=(s.vx+gx*simDt)*Math.exp(-3.2*simDt);
   s.vy=(s.vy+gy*simDt)*Math.exp(-3.2*simDt);
  }
  const speed=Math.hypot(s.vx,s.vy);
  if(speed>150){s.vx*=150/speed;s.vy*=150/speed;}
 }else{
  const gx=Math.sin(s.angle)*500,gy=Math.cos(s.angle)*500;
  s.vx=(s.vx+gx*dt)*Math.exp(-1.25*dt);
  s.vy=(s.vy+gy*dt)*Math.exp(-1.25*dt);
  const speed=Math.hypot(s.vx,s.vy),cap=s.level===2?270:300;
  if(speed>cap){s.vx*=cap/speed;s.vy*=cap/speed;}
 }
 const r=13;
 for(const axis of ['x','y']){
  const next=s[axis]+s['v'+axis]*simDt,px=axis==='x'?next:s.x,py=axis==='y'?next:s.y;
  const crates=tiltCratesAt(px,py,r);
  if(crates.length&&(s.jump>0||Math.abs(s['v'+axis])>TILT_BREAK_SPEED)){
   for(const b of crates){b.broken=true;s.cracked++;s.crackFX.push({x:(b.x+.5)*TILT_TILE,y:(b.y+.5)*TILT_TILE,born:s.elapsed});tone(170+s.cracked*24,.09,'square',.04)}
  }
  const blocked=tiltBlocked(px,py,r),solid=tiltHazardHit(s,px,py,r);
  if(blocked||tiltCratesAt(px,py,r).length||solid){
   if(blocked){
    if(s.level===2){
     // The giant central red X and outer walls have REAL contact penalties.
     // Charge only when contact begins, never every animation frame.
     s.wallTouchedThisFrame=true;
     if(!s.wallPenaltyLock){
      s.wallPenaltyLock=true;
      tiltPenalty(s,5);
     }
    }else tiltEdgeContact(s,px,py,r);
   }
   if(solid&&(!solid.cooldown||solid.cooldown<=0)){
    solid.armed=false;solid.cooldown=.7;tiltPenalty(s,solid.penalty);
   }
   s['v'+axis]*=s.level===2?-.12:-.18;
  }else s[axis]=next;
 }
 if(s.level===2){
  if(s.wallTouchedThisFrame)s.wallClearAge=0;
  else s.wallClearAge=(s.wallClearAge||0)+dt;
  if(s.wallClearAge>.13)s.wallPenaltyLock=false;
  s.wallTouchedThisFrame=false;
 }
 for(const h of s.crosses){
  h.cooldown=Math.max(0,(h.cooldown||0)-dt);
  const inset=h.size===1?4:6;
  const x0=h.x*TILT_TILE+inset,y0=h.y*TILT_TILE+inset;
  const x1=(h.x+h.size)*TILT_TILE-inset,y1=(h.y+h.size)*TILT_TILE-inset;
  const nearX=clamp(s.x,x0,x1),nearY=clamp(s.y,y0,y1);
  const touching=Math.hypot(s.x-nearX,s.y-nearY)<13;
  if(!touching&&h.cooldown<=0)h.armed=true;
  else if(touching&&h.armed&&h.cooldown<=0){h.armed=false;h.cooldown=.7;tiltPenalty(s,h.penalty)}
 }
 for(const star of s.stars)if(!star.got&&Math.hypot(s.x-(star.x+.5)*TILT_TILE,s.y-(star.y+.5)*TILT_TILE)<27){star.got=true;s.time+=3;s.bonus++;tone(740,.16,'triangle',.08);tiltMsg('★ +3 SECONDS')}
 if(s.level===2){
  for(const p of s.pickups)if(!p.got&&Math.hypot(s.x-p.x*TILT_TILE,s.y-p.y*TILT_TILE)<34){
   p.got=true;s.warpRefills++;
   // Reward the hard-earned chain with a tiny clock top-up, capped at the
   // original two-second budget. The main reward remains a fresh Bullet Time.
   s.time=Math.min(s.startTime,s.time+.10);
   tiltWarp();tone(940,.22,'triangle',.10);
  }
  if(warp){
   s.warpTrail.push({x:s.x,y:s.y,born:s.elapsed});
   s.warpTrail=s.warpTrail.filter(p=>s.elapsed-p.born<.5);
   if(s.warpAge>=s.warpEnergyMax){s.warpActive=false;s.warpTarget=null;}
  }
 }
 s.camX=lerp(s.camX,s.x,Math.min(1,dt*7));s.camY=lerp(s.camY,s.y,Math.min(1,dt*7));
 tiltUpdateHud(s);
 const finishX0=s.finish.x0*TILT_TILE,finishX1=s.finish.x1*TILT_TILE,finishY0=s.finish.y0*TILT_TILE,finishY1=s.finish.y1*TILT_TILE;
 if(s.x>finishX0&&s.x<finishX1&&s.y>finishY0&&s.y<finishY1){
  if(s.level===1)return tiltLevelOneClearCard();
  return finishGame(true,`FINISH! ${Math.max(0,s.time).toFixed(2)}s remaining. ${s.warpRefills} Bullet Time refills found. The red crosses were real obstacles!`);
 }
 if(s.time<=0)finishGame(false,s.level===1?'Time ran out! Rotate the maze, tap HOP to smash blocks, and reach the checkered finish.':'Time ran out! Catch a blue ⏱ to start Bullet Time, then collect the next clock before the floating effect expires.');
}
function drawTilt(W,H,now){
 const c=gctx,s=gs;if(!s)return;
 c.fillStyle='#0c1727';c.fillRect(0,0,W,H);
 c.textAlign='center';c.textBaseline='middle';c.globalAlpha=.13;
 for(let y=-24;y<H+40;y+=68)for(let x=-26;x<W+60;x+=74){c.font='27px system-ui';c.fillText(((x+y)/10|0)%2?'🍎':'🐛',x+(Math.floor(y/68)%2)*28,y)}c.globalAlpha=1;
 if(s.warpActive){c.fillStyle='rgba(116,190,255,.10)';c.fillRect(0,0,W,H);}
 const scale=W<550?1.0:1.25;
 c.save();c.translate(W*.5,H*.5);c.scale(scale,scale);c.rotate(s.angle);c.translate(-s.camX,-s.camY);
 const t=TILT_TILE;
 for(let y=0;y<TILT_ROWS;y++)for(let x=0;x<TILT_COLS;x++)if(s.tiles[y][x]){
  const px=x*t,py=y*t;c.fillStyle=(x+y)%2?'#9b9aa6':'#bbb9c6';c.fillRect(px,py,t+.4,t+.4);
  c.strokeStyle='#777588';c.lineWidth=1.5;c.strokeRect(px+.5,py+.5,t-1,t-1);
  c.fillStyle='#e3dfee60';c.fillRect(px+3,py+3,t-6,3);
  c.strokeStyle=s.level===2?'#f49cf6':'#f4d889';c.lineWidth=3;
  if(!s.tiles[y-1]?.[x]){c.beginPath();c.moveTo(px,py+1);c.lineTo(px+t,py+1);c.stroke()}
  if(!s.tiles[y+1]?.[x]){c.beginPath();c.moveTo(px,py+t-1);c.lineTo(px+t,py+t-1);c.stroke()}
  if(!s.tiles[y]?.[x-1]){c.beginPath();c.moveTo(px+1,py);c.lineTo(px+1,py+t);c.stroke()}
  if(!s.tiles[y]?.[x+1]){c.beginPath();c.moveTo(px+t-1,py);c.lineTo(px+t-1,py+t);c.stroke()}
 }
 c.fillStyle='#202035';c.fillRect(s.startPad.x*t,s.startPad.y*t,s.startPad.w*t,s.startPad.h*t);
 c.fillStyle=s.level===2?'#8de7ff':'#dcfb7b';c.fillRect(s.startPad.x*t+4,s.startPad.y*t+4,s.startPad.w*t-8,s.startPad.h*t-8);
 c.fillStyle='#241930';c.font='900 18px system-ui';c.fillText('START',(s.startPad.x+s.startPad.w/2)*t,(s.startPad.y+s.startPad.h/2)*t);
 for(let yy=s.finishPad.y;yy<s.finishPad.y+s.finishPad.h;yy++)for(let xx=s.finishPad.x;xx<s.finishPad.x+s.finishPad.w;xx++){c.fillStyle=(xx+yy)%2?'#11121d':'#fffbea';c.fillRect(xx*t,yy*t,t,t)}
 c.fillStyle='#fff07b';c.fillRect(s.finishPad.x*t+2,(s.finishPad.y+1)*t+9,s.finishPad.w*t-4,t-18);c.fillStyle='#23182e';c.font='900 18px system-ui';c.fillText('FINISH',(s.finishPad.x+s.finishPad.w/2)*t,(s.finishPad.y+s.finishPad.h/2)*t);
 for(const [x,y,a] of s.arrows){
  c.save();c.translate(x*t+t/2,y*t+t/2);c.rotate(a);c.fillStyle='#493c72';c.beginPath();c.moveTo(15,0);c.lineTo(-8,-12);c.lineTo(-8,-5);c.lineTo(-17,-5);c.lineTo(-17,5);c.lineTo(-8,5);c.lineTo(-8,12);c.closePath();c.fill();c.restore();
 }
 for(const b of s.crates)if(!b.broken){const px=b.x*t,py=b.y*t;c.fillStyle='#8e543e';c.fillRect(px+1,py+1,t-2,t-2);c.strokeStyle='#db9e72';c.lineWidth=3;c.strokeRect(px+4,py+4,t-8,t-8);c.beginPath();c.moveTo(px+5,py+5);c.lineTo(px+t-5,py+t-5);c.moveTo(px+t-5,py+5);c.lineTo(px+5,py+t-5);c.stroke();}
 function drawCross(x,y,sz,penalty,edge=false){
  const heavy=penalty===5,inset=edge?3:sz>t?6:4;
  c.fillStyle='#241b39';c.fillRect(x,y,sz,sz);
  c.strokeStyle=heavy?'#ff424d':'#ffe269';c.lineWidth=edge?5:sz>t?8:5;
  c.strokeRect(x+inset,y+inset,sz-2*inset,sz-2*inset);
  c.strokeStyle=heavy?'#ffe269':'#ff424d';c.lineWidth=edge?6:sz>t?13:7;c.lineCap='square';
  const m=edge?12:sz>t?23:13;
  c.beginPath();c.moveTo(x+m,y+m);c.lineTo(x+sz-m,y+sz-m);
  c.moveTo(x+sz-m,y+m);c.lineTo(x+m,y+sz-m);c.stroke();c.lineCap='butt';
 }
 for(const h of s.edgeHazards)drawCross(h.x*t,(h.side==='top'?TILT_EDGE_TOP-1:TILT_EDGE_BOTTOM)*t,t,h.penalty,true);
 for(const h of s.edgeHazards){c.fillStyle=h.penalty===5?'#ff424d':'#ffe269';c.fillRect(h.x*t,(h.side==='top'?TILT_EDGE_TOP*t:TILT_EDGE_BOTTOM*t-5),t,5);}
 for(const h of s.crosses)drawCross(h.x*t+3,h.y*t+3,h.size*t-6,h.penalty);
 if(s.level===2){
  // Visual cross-marked perimeter, including the outer top and bottom edges.
  for(let x=4;x<=16;x++)for(const y of [7,20]){
   if(x>=9&&x<=11)continue; // entrance and finish stay open
   drawCross(x*t,y*t,t,(x+y)%2?2:5,true);
  }
  c.fillStyle='#1b1434';c.fillRect(6*t,7*t,9*t,5*t);
  c.strokeStyle='#ec5a7d';c.lineWidth=6;c.strokeRect(6*t+4,7*t+4,9*t-8,5*t-8);
  c.fillStyle='#f3d85e';c.font='900 110px system-ui';c.fillText('×',10.5*t,9.5*t);
 }
 for(const fx of s.crackFX){const age=s.elapsed-fx.born,k=age/.58,spread=15+55*k;
  c.globalAlpha=Math.max(0,1-k);c.strokeStyle='#f9cd8d';c.lineWidth=3.5;
  for(let i=0;i<10;i++){const a=i*Math.PI/5,dx=Math.cos(a),dy=Math.sin(a);
   c.beginPath();c.moveTo(fx.x+dx*7,fx.y+dy*7);c.lineTo(fx.x+dx*spread,fx.y+dy*spread);c.stroke();
   c.fillStyle=i%2?'#e5a57d':'#845039';c.fillRect(fx.x+dx*spread-3,fx.y+dy*spread-3,6,6);
  }c.globalAlpha=1;
 }
 for(const b of s.stars)if(!b.got){c.fillStyle='#ffe566';c.font='33px system-ui';c.fillText('★',(b.x+.5)*t,(b.y+.5)*t);}
 if(s.level===2){
  // Cyan clock pick-ups automatically refresh the CURRENT Bullet Time and its meter.
  for(const p of s.pickups)if(!p.got){
   const x=p.x*t,y=p.y*t;
   c.fillStyle='#052d42';c.strokeStyle='#76ebff';c.lineWidth=4;
   c.beginPath();c.arc(x,y,23+Math.sin(now/160+x)*2,0,7);c.fill();c.stroke();
   c.font='29px system-ui';c.fillStyle='#fff';c.fillText('⏱',x,y);
  }
  for(const trace of s.warpTrail){
   c.globalAlpha=Math.max(0,(.5-(s.elapsed-trace.born))/.5)*.32;
   c.fillStyle='#6bddff';c.beginPath();c.arc(trace.x,trace.y,16,0,7);c.fill();
  }c.globalAlpha=1;
 }

 const bob=s.jump>0?Math.sin((.34-s.jump)/.34*Math.PI)*15:0;
 c.fillStyle='#100e2777';c.beginPath();c.ellipse(s.x+2,s.y+6,16,8,0,0,7);c.fill();
 const ball=c.createRadialGradient(s.x-6,s.y-9-bob,1,s.x,s.y-bob,19);ball.addColorStop(0,'#fff');ball.addColorStop(.25,'#9df7e6');ball.addColorStop(.75,'#3869df');ball.addColorStop(1,'#19306d');
 c.fillStyle=ball;c.strokeStyle='#192341';c.lineWidth=3;c.beginPath();c.arc(s.x,s.y-bob,15,0,7);c.fill();c.stroke();c.fillStyle='#fff';c.beginPath();c.arc(s.x-5,s.y-bob-6,3.1,0,7);c.fill();
 c.restore();
 const danger=s.time<=(s.level===2?1.4:30),tw=Math.min(238,W-48),tx=(W-tw)/2;
 c.fillStyle='#12132ceE';c.fillRect(tx,76,tw,83);
 c.strokeStyle=danger?'#ff566b':'#ffdb69';c.lineWidth=3;c.strokeRect(tx+1.5,77.5,tw-3,80);
 c.textAlign='center';c.textBaseline='middle';c.fillStyle='#f8eaca';c.font='900 10px system-ui';c.fillText(s.level===2?'LEVEL 2 · TIME LEFT':'TIME LEFT',W/2,91);
 c.fillStyle=danger?'#ff6677':(s.level===2?'#8de7ff':'#fff2a9');c.font=`900 ${Math.min(39,W*.098)}px system-ui`;c.fillText(tiltTimeLabel(s.time),W/2,122);
 c.fillStyle='#34304c';c.fillRect(tx+14,143,tw-28,6);
 c.fillStyle=danger?'#ff566b':(s.level===2?'#6fe0ff':'#c9ef79');c.fillRect(tx+14,143,(tw-28)*clamp(s.time/s.startTime,0,1),6);
 if(s.level===2){
  c.fillStyle='#111a34dd';c.fillRect(tx,165,tw,34);c.strokeStyle=s.warpActive?'#7bddff':'#5070b7';c.strokeRect(tx+1,166,tw-2,32);
  c.fillStyle='#9adfff';c.font='900 13px system-ui';c.fillText(s.warpActive?'BULLET TIME · FLOAT':'CATCH A BLUE ⏱',W/2,182);
  c.fillStyle='#2b3256';c.fillRect(tx+12,188,tw-24,6);
  const warpFill=s.warpActive?clamp(1-s.warpAge/s.warpEnergyMax,0,1):0;
  c.fillStyle=s.warpActive?'#7bddff':'#4f5c88';c.fillRect(tx+12,188,(tw-24)*warpFill,6);
 }
 if(s.penaltyFX){const f=s.penaltyFX,k=(s.elapsed-f.born)/.95;
  c.globalAlpha=Math.max(0,1-k);c.fillStyle=f.amount===5?'#ff6079':'#ffe16b';c.font='900 25px system-ui';
  c.fillText(`−${Number.isInteger(f.amount)?f.amount:f.amount.toFixed(2)}s`,W/2+Math.min(115,W*.30),112-18*k);c.globalAlpha=1;
 }
 c.textBaseline='alphabetic';
 c.textAlign='start';c.textBaseline='alphabetic';
}

renderCollection();
const replayId=new URLSearchParams(location.search).get('play');
if(replayId&&GAME_INFO[replayId]&&save.wins.includes(replayId)){hatched=true;hatchCanvas.hidden=true;$('birth').hidden=true;openGame(replayId)}
})();
