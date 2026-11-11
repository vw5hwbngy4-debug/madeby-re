
(()=>{
'use strict';
const WORLDS=[
  {
    id:'pso',
    name:'Phantasy Star Online Ep. I&II',
    short:'PSO Ep. I&II',
    category:'Save + Strategy',
    type:'SAVE-AWARE',
    expert:true,
    path:'/pso/',
    icon:'/pso/assets/pso/ui/class_portraits/HUmar_pressed.png',
    sub:'RICO · saves · MAGs · hunts · gear'
  },
  {
    id:'emerald',
    name:'Pokémon Emerald',
    short:'Emerald',
    category:'Play + Live',
    type:'LIVE',
    expert:false,
    path:'/emerald/',
    icon:'/pso/assets/world-nav/app-icons/emerald-live.svg',
    sub:'Play your own ROM · live competitive data'
  },
  {
    id:'xeno-en',
    name:'Xenosaga I+II DS',
    short:'Xeno EN',
    category:'Localizations',
    type:'LOCALIZATION',
    expert:true,
    path:'/xenosaga/',
    icon:'/pso/assets/world-nav/app-icons/xeno-en.jpg',
    sub:'English fan translation',
    lang:'EN'
  },
  {
    id:'xeno-nl',
    name:'Xenosaga I+II DS',
    short:'Xeno NL',
    category:'Localizations',
    type:'LOCALIZATION',
    expert:true,
    path:'/xenosaga-nederlands/',
    icon:'/pso/assets/world-nav/app-icons/xeno-nl.jpg',
    sub:'Nederlandse vertaling',
    lang:'NL'
  },
  {
    id:'gloria',
    name:'Gloria Union',
    short:'Gloria',
    category:'Localizations',
    type:'LOCALIZATION',
    expert:true,
    path:'/gloria/',
    icon:'/pso/assets/world-nav/app-icons/gloria.jpg',
    sub:'English fan translation',
    lang:'EN'
  },
  {
    id:'nova',
    name:'Phantasy Star Nova',
    short:'PS Nova',
    category:'Localizations',
    type:'LOCALIZATION',
    expert:true,
    path:'/phantasy-star-nova/',
    icon:'/pso/assets/world-nav/app-icons/nova.jpg',
    sub:'Complete English text build',
    lang:'EN'
  },
  {
    id:'zero-hunt',
    name:'Zero Hunt',
    short:'Zero Hunt',
    category:'Playable',
    type:'GAME',
    expert:true,
    path:'/games/zero-hunt/index.html',
    icon:'/pso/assets/world-nav/app-icons/zero-hunt.jpg',
    sub:'Playable experiment · September 2026',
    requiresUnlock:false
  }
];

const KEY='jrpg.world.openWorldTabs.v2';
const OLDKEY='jrpg.world.openWorldTabs.v1';
const GOTM_KEY='jrpg.world.gotm.2026-09';
const INIT_ALL_KEY='jrpg.world.openWorldTabs.all.v098';
const EMERALD_INIT_KEY='jrpg.world.openWorldTabs.emerald.v1';
const MRU_KEY='jrpg.world.openWorldTabs.mru.v1';
function gotmUnlocked(){try{return localStorage.getItem(GOTM_KEY)==='1'}catch(_){return false}}
const hosts=[...document.querySelectorAll('[data-jw-world-tabs]')];
if(!hosts.length)return;
if(!document.querySelector('.jw-site-nav')){
  const p=location.pathname;
  const nav=document.createElement('nav');
  nav.className='jw-site-nav';
  nav.setAttribute('aria-label','JRPG.WORLD');
  const items=[['WORLD','/landing/'],['GAMES','/landing/#worlds'],['RELEASES','/pso/releases/'],['ABOUT','/about/']];
  nav.innerHTML=items.map(([label,url])=>{
    const current=(url==='/landing/'&&(p==='/landing/'||p==='/'))||(url==='/pso/releases/'&&p.startsWith('/pso/releases/'))||(url==='/about/'&&p.startsWith('/about/'));
    return `<a href="${url}"${current?' aria-current="page"':''}>${label}</a>`;
  }).join('');
  hosts[0].insertAdjacentElement('beforebegin',nav);
}

function currentId(){
  const p=(location.pathname.replace(/\/+$/,'/')||'/');
  if(p.startsWith('/games/zero-hunt/'))return 'zero-hunt';
  if(p.startsWith('/landing/') && location.hash==='#game-of-month' && gotmUnlocked())return 'zero-hunt';
  if(p.startsWith('/landing/')||p.startsWith('/about/')||p.startsWith('/pso/releases/'))return null;
  return [...WORLDS].sort((a,b)=>b.path.length-a.path.length)
    .find(w=>w.path==='/'?p==='/':p.startsWith(w.path))?.id || null;
}
function load(){
  try{
    let raw=localStorage.getItem(KEY);
    if(raw===null) raw=localStorage.getItem(OLDKEY);
    const v=JSON.parse(raw||'[]');
    return Array.isArray(v)?v.filter(id=>WORLDS.some(w=>w.id===id)):[];
  }catch(_){return[]}
}
function save(ids){
  try{localStorage.setItem(KEY,JSON.stringify(ids))}catch(_){}
}
function loadMru(){
  try{
    const v=JSON.parse(localStorage.getItem(MRU_KEY)||'[]');
    return Array.isArray(v)?v.filter(id=>WORLDS.some(w=>w.id===id)):[];
  }catch(_){return[]}
}
function saveMru(ids){
  try{localStorage.setItem(MRU_KEY,JSON.stringify(ids))}catch(_){}
}
let active=currentId();
let open=load();

/* v0.9.8: one-time migration. First launch after this update opens every
   currently available canonical world. A locked monthly game stays hidden
   until the user has actually unlocked it. Once the migration is done,
   closing a tab remains respected. */
try{
  if(localStorage.getItem(INIT_ALL_KEY)!=='1'){
    open=WORLDS
      .filter(w=>!w.requiresUnlock||gotmUnlocked())
      .map(w=>w.id);
    localStorage.setItem(INIT_ALL_KEY,'1');
  }
}catch(_){
  if(!open.length)open=WORLDS.filter(w=>!w.requiresUnlock||gotmUnlocked()).map(w=>w.id);
}
/* v1.8: show the new Emerald live app once to existing users without
   permanently overriding their tab choices. Closing it afterwards is respected. */
try{
  if(localStorage.getItem(EMERALD_INIT_KEY)!=='1'){
    if(!open.includes('emerald'))open.push('emerald');
    localStorage.setItem(EMERALD_INIT_KEY,'1');
  }
}catch(_){if(!open.includes('emerald'))open.push('emerald')}
if(!open.length)open=['pso'];
if(active&&(!WORLDS.find(w=>w.id===active)?.requiresUnlock||gotmUnlocked())&&!open.includes(active))open.push(active);
open=[...new Set(open)];
save(open);

let mru=loadMru();
function touchMru(id){
  if(!id)return;
  mru=[id,...mru.filter(x=>x!==id)].filter(x=>open.includes(x));
  for(const x of open)if(!mru.includes(x))mru.push(x);
  saveMru(mru);
}
function forgetMru(id){
  mru=mru.filter(x=>x!==id);saveMru(mru);
}
for(const x of open)if(!mru.includes(x))mru.push(x);
if(active)touchMru(active);else saveMru(mru);

function tab(w){
  const isActive=w.id===active;
  const isRunningGame=isActive&&w.type==='GAME';
  const cls=(isActive?' is-active':'')+(isRunningGame?' is-running-game':'');
  const aria=isActive?' aria-current="page"':'';
  const lang=w.lang?`<span class="jw-tab-lang">${w.lang}</span>`:'';
  const typeShort=w.type==='SAVE-AWARE'?'SAVE':w.type==='GAME'?'GAME':w.type==='LIVE'?'LIVE':'LOCAL';
  const close=open.length>1
    ?`<button type="button" class="jw-tab-close" data-close-world="${w.id}" aria-label="${isRunningGame?'Close running game':'Close'} ${w.name}" title="${isRunningGame?'Close running game':'Close app'}">×</button>`
    :'';
  const running=isRunningGame?`<span class="jw-running-label">RUNNING</span>`:'';
  return `<a class="jw-app-tab${cls}" href="${w.path}" data-world-id="${w.id}"${aria}>
    <span class="jw-app-icon"><img src="${w.icon}" alt=""></span>
    <span class="jw-app-copy"><b>${w.short}</b><small>${w.sub}</small></span>
    <span class="jw-tab-type">${typeShort}</span>
    ${lang}${running}${close}
  </a>`;
}
function visibleCapacity(host){
  const width=host.getBoundingClientRect().width||window.innerWidth;

  // Keep the ribbon visually dense without ever forcing horizontal scroll.
  // Desktop target: six full app tabs + optional stack + one add (+) button.
  if(width<520)return 2;
  if(width<760)return 3;
  if(width<980)return 4;
  if(width<1180)return 5;

  return 6;
}
function orderedOpenWorlds(){
  const rank=[...mru.filter(id=>open.includes(id)),...open.filter(id=>!mru.includes(id))];
  if(active&&open.includes(active)){
    return [active,...rank.filter(id=>id!==active)]
      .map(id=>WORLDS.find(w=>w.id===id)).filter(Boolean);
  }
  return rank.map(id=>WORLDS.find(w=>w.id===id)).filter(Boolean);
}
function stackMarkup(hiddenWorlds){
  const count=hiddenWorlds.length;
  const disabled=count===0;
  return `<div class="jw-tab-stack${disabled?' is-empty':''}">
    <button type="button"
      class="jw-stack-button${disabled?' is-disabled':''}"
      data-tab-stack
      aria-expanded="false"
      aria-label="${disabled?'No stacked worlds':count+' more open worlds'}"
      ${disabled?'disabled':''}>
      <span class="jw-stack-cards" aria-hidden="true"><i></i><i></i><i></i></span>
      <b>${disabled?'0':'+'+count}</b>
    </button>
  </div>`;
}
function stackTrayMarkup(hiddenWorlds){
  if(!hiddenWorlds.length)return '';
  return `<div class="jw-stack-tray" data-stack-tray hidden>
    <div class="jw-stack-tray-head"><b>OPEN WORLDS</b><span>${hiddenWorlds.length} stacked</span></div>
    ${hiddenWorlds.map(w=>`
      <div class="jw-stack-row${w.id===active?' is-active':''}">
        <a href="${w.path}" data-world-id="${w.id}">
          <img src="${w.icon}" alt="">
          <span><b>${w.short}</b><small>${w.type==='GAME'?'GAME':w.lang?`${w.lang} · ${w.type}`:w.type}</small></span>
        </a>
        ${open.length>1?`<button type="button" data-close-world="${w.id}" aria-label="Close ${w.name}">×</button>`:''}
      </div>`).join('')}
  </div>`;
}
function plusSlot(){
  return `<button type="button" class="jw-add-tab" data-add-world aria-label="Open another world">+</button>`;
}
function renderHost(host){
  const ordered=orderedOpenWorlds();
  const cap=visibleCapacity(host);
  const visible=ordered.slice(0,cap);
  const hidden=ordered.slice(cap);
  host.innerHTML=`<div class="jw-tabbar">
    <a class="jw-home-app" href="/landing/" aria-label="JRPG.WORLD landing">
      <img src="/pso/assets/world-nav/app-icons/jrpg.jpg" alt="JRPG.WORLD">
    </a>
    <div class="jw-tabs-viewport" aria-label="Open worlds">
      <div class="jw-tabs-ribbon">${visible.map(tab).join('')}${stackMarkup(hidden)}${plusSlot()}</div>
    </div>
    ${stackTrayMarkup(hidden)}
  </div>`;
}
hosts.forEach(renderHost);

let picker=document.querySelector('#jwWorldPicker');
if(!picker){
  picker=document.createElement('div');
  picker.id='jwWorldPicker';
  picker.className='jw-picker-backdrop';
  picker.setAttribute('aria-hidden','true');
  picker.innerHTML=`<section class="jw-picker" role="dialog" aria-modal="true" aria-labelledby="jwPickerTitle">
    <header class="jw-picker-head">
      <div><small>JRPG.WORLD</small><h2 id="jwPickerTitle">Open a world</h2></div>
      <button class="jw-picker-x" type="button" aria-label="Close">×</button>
    </header>
    <div class="jw-launch-categories" role="tablist" aria-label="World categories">
      <button type="button" class="jw-launch-category is-active" data-cat="All">All</button>
      <button type="button" class="jw-launch-category" data-cat="Save + Strategy">Save + Strategy</button>
      <button type="button" class="jw-launch-category" data-cat="Localizations">Localizations</button>
      <button type="button" class="jw-launch-category" data-cat="Play + Live">Play + Live</button>
      <button type="button" class="jw-launch-category" data-cat="Playable">Playable</button>
    </div>
    <div class="jw-app-grid" data-app-grid></div>
    <div class="jw-picker-note">Tap an app once to open it. Open worlds stay in the ribbon like browser tabs. If they no longer fit, older tabs fold into a compact +N stack instead of scrolling.</div>
  </section>`;
  document.body.appendChild(picker);
}


const CATEGORY_COPY={
  'All':{title:'JRPG.WORLD catalog',text:'Original games, live state, real saves and localizations. Open any world like an app.'},
  'Save + Strategy':{title:'Save + Strategy',text:'Tools that start from a real character or save state. PSO combines RICO, Ragol Link, MAG planning, hunt routing and gear progression.'},
  'Localizations':{title:'Localizations',text:'Playable fan-localization releases with patches, proof, technical notes and runtime context kept together.'},
  'Play + Live':{title:'Play + Live',text:'The original game runs in the browser while JRPG.WORLD reads live state and turns it into useful play-time context.'},
  'Playable':{title:'Playable experiments',text:'Small playable projects built inside JRPG.WORLD.'}
};

function renderApps(category='All'){
  const grid=picker.querySelector('[data-app-grid]');
  const visible=WORLDS.filter(w=>(!w.requiresUnlock||gotmUnlocked())&&(category==='All'||w.category===category));
  const c=CATEGORY_COPY[category]||CATEGORY_COPY.All;
  grid.innerHTML=visible.map(w=>{
    const typeClass=w.type==='SAVE-AWARE'?' is-expert':w.type==='LIVE'?' is-live':w.type==='GAME'?' is-game':' is-translation';
    const badge=w.type==='SAVE-AWARE'
      ? 'SAVE-AWARE'
      : w.type==='GAME'
        ? 'PLAYABLE'
        : w.type==='LIVE'
          ? 'PLAY + LIVE'
          : `${w.lang ? w.lang+' · ' : ''}LOCALIZATION`;
    return `<button type="button" class="jw-launch-app${typeClass}" data-pick-world="${w.id}" data-category="${w.category}">
      <span class="jw-launch-icon-wrap">
        <span class="jw-launch-art"><img src="${w.icon}" alt=""></span>
        <span class="jw-launch-edge"><span class="jw-edge-chip jw-edge-primary">${badge}</span></span>
      </span>
      <span class="jw-launch-name">${w.name}</span>
      <span class="jw-launch-sub">${w.sub}</span>
    </button>`;
  }).join('')+`<aside class="jw-grid-context" data-category-note aria-live="polite">
      <b>${c.title}</b><span>${c.text}</span>
    </aside>`;
}
function setCategory(cat){
  picker.querySelectorAll('.jw-launch-category').forEach(b=>b.classList.toggle('is-active',b.dataset.cat===cat));
  renderApps(cat);
}
function openPicker(){
  setCategory('All');
  picker.classList.add('is-open');
  picker.setAttribute('aria-hidden','false');
  picker.querySelector('.jw-picker-x')?.focus();
}
function closePicker(){
  picker.classList.remove('is-open');
  picker.setAttribute('aria-hidden','true');
}

document.addEventListener('click',e=>{
  const stack=e.target.closest('[data-tab-stack]');
  if(stack){
    e.preventDefault();e.stopPropagation();
    if(stack.disabled||stack.classList.contains('is-disabled'))return;
    const bar=stack.closest('.jw-tabbar');
    const tray=bar?.querySelector('[data-stack-tray]');
    if(tray){
      const willOpen=tray.hasAttribute('hidden');
      document.querySelectorAll('[data-stack-tray]').forEach(t=>t.setAttribute('hidden',''));
      document.querySelectorAll('[data-tab-stack]').forEach(b=>b.setAttribute('aria-expanded','false'));
      if(willOpen){tray.removeAttribute('hidden');stack.setAttribute('aria-expanded','true')}
    }
    return;
  }

  const worldLink=e.target.closest('[data-world-id]');
  if(worldLink&&!e.target.closest('[data-close-world]')){
    touchMru(worldLink.dataset.worldId);
  }

  const add=e.target.closest('[data-add-world]');
  if(add){e.preventDefault();openPicker();return}

  const cat=e.target.closest('[data-cat]');
  if(cat){e.preventDefault();setCategory(cat.dataset.cat);return}

  const close=e.target.closest('[data-close-world]');
  if(close){
    e.preventDefault();e.stopPropagation();
    const id=close.dataset.closeWorld;
    if(open.length<=1)return;
    const pos=open.indexOf(id);
    open=open.filter(x=>x!==id);
    save(open);forgetMru(id);
    window.dispatchEvent(new CustomEvent('jrpgworld:world-closed',{detail:{id}}));
    if(id===active){
      const next=open[Math.min(pos,open.length-1)]||'pso';
      location.href=WORLDS.find(w=>w.id===next)?.path||'/';
    }else{
      hosts.forEach(renderHost);
    }
    return;
  }

  const app=e.target.closest('[data-pick-world]');
  if(app){
    e.preventDefault();
    const id=app.dataset.pickWorld;
    if(!open.includes(id)){open.push(id);save(open)}
    touchMru(id);
    const w=WORLDS.find(x=>x.id===id);
    if(w)location.href=w.path;
    return;
  }

  if(e.target===picker||e.target.closest('.jw-picker-x')){closePicker();return}

  if(!e.target.closest('.jw-tabbar')){
    document.querySelectorAll('[data-stack-tray]').forEach(t=>t.setAttribute('hidden',''));
    document.querySelectorAll('[data-tab-stack]').forEach(b=>b.setAttribute('aria-expanded','false'));
  }
});
document.addEventListener('keydown',e=>{
  if(e.key==='Escape'){
    closePicker();
    document.querySelectorAll('[data-stack-tray]').forEach(t=>t.setAttribute('hidden',''));
    document.querySelectorAll('[data-tab-stack]').forEach(b=>b.setAttribute('aria-expanded','false'));
  }
});
let resizeTimer=0;
window.addEventListener('resize',()=>{
  clearTimeout(resizeTimer);
  resizeTimer=setTimeout(()=>hosts.forEach(renderHost),100);
});

/* translation-world footer: one random supplied JRPG.WORLD banner */
const FOOTERS=[
  '/pso/assets/world-footers/world-footer-01.png',
  '/pso/assets/world-footers/world-footer-02.png',
  '/pso/assets/world-footers/world-footer-03.png',
  '/pso/assets/world-footers/world-footer-04.png'
];
document.querySelectorAll('[data-jw-random-footer]').forEach(img=>{
  const order=[...FOOTERS].sort(()=>Math.random()-.5);
  let i=0;
  const next=()=>{
    if(i>=order.length){img.removeAttribute('src');img.alt='';return}
    img.onerror=next;
    img.src=order[i++];
  };
  next();
});

requestAnimationFrame(()=>hosts.forEach(renderHost));
window.JRPGWorldTabs={
  unlockMonthlyGame(){
    try{localStorage.setItem(GOTM_KEY,'1')}catch(_){}
    if(!open.includes('zero-hunt'))open.push('zero-hunt');
    open=[...new Set(open)];save(open);touchMru('zero-hunt');hosts.forEach(renderHost);
    window.dispatchEvent(new CustomEvent('jrpgworld:world-opened',{detail:{id:'zero-hunt'}}));
    return true;
  },
  isWorldOpen(id){return open.includes(id)},
  closeWorld(id){
    if(!open.includes(id)||open.length<=1)return false;
    open=open.filter(x=>x!==id);save(open);forgetMru(id);hosts.forEach(renderHost);
    window.dispatchEvent(new CustomEvent('jrpgworld:world-closed',{detail:{id}}));
    return true;
  },
  openMonthlyGame(){
    this.unlockMonthlyGame();
    location.href='/games/zero-hunt/index.html';
  }
};
})();
