/* Presentation only: no changes to emulator layout, input or save ownership. */
(() => {
  const modes=['compact','expanded'];
  let panel,control,glance,current=globalThis.JRPGWorldEmeraldState;
  let selected='expanded';try{selected=localStorage.getItem('pf-presentation-v18')||selected;}catch{}
  if(selected==='collapsed')selected='compact';
  if(!modes.includes(selected))selected='expanded';
  function summary(){
    if(!glance)return;
    const m=current?.primary;
    glance.replaceChildren();
    if(!m){glance.textContent='Your Pokémon will appear here.';return;}
    const n=globalThis.PokeFieldNotability.assess(m);
    const sprite=document.createElement('img');sprite.src=`./assets/pokemon/${Number(m.dexNo)||0}.png`;sprite.alt='';sprite.className='pf-glance-sprite';glance.appendChild(sprite);
    const line=document.createElement('div');line.className='pf-glance-line';
    const full=`${m.species} ${m.genderSymbol||''} · Lv${m.level} · ${m.nature} · ${m.ability} · IV ${m.ivTotal} · HP ${m.hiddenPower?.type} ${m.hiddenPower?.power} · ${n.explanation}`;
    glance.title=full;glance.setAttribute('aria-label',full);
    const facts=[`${m.species} ${m.genderSymbol||''} L${m.level}`,`IV${m.ivTotal}`,n.flags.map(f=>f.label.split(' ')[0]).join(''),`${m.nature}`,`HP ${m.hiddenPower?.type?.slice(0,3)||'—'}${m.hiddenPower?.power??''}`,`★${Object.values(m.ivs||{}).filter(v=>v===31).length}×31`,m.ability];
    facts.filter(Boolean).forEach((text,i)=>{const el=document.createElement('span');el.textContent=text;el.dataset.priority=i;line.appendChild(el);});
    glance.appendChild(line);fit();
  }
  function fit(){
    const line=glance?.querySelector('.pf-glance-line');if(!line||!line.clientWidth)return;
    const items=[...line.children];items.forEach(el=>el.hidden=false);
    for(let i=items.length-1;i>1&&line.scrollWidth>line.clientWidth;i--)items[i].hidden=true;
  }

  function set(next){
    selected=next;globalThis.PokeFieldLive?.setCompactMode(next==='compact');
    panel.dataset.presentation=next;control.textContent=next==='compact'?'COMPACT':'EXPAND';control.setAttribute('aria-label',next==='compact'?'Compact view. Click to expand.':'Expanded view. Click to compact.');control.setAttribute('title',next==='compact'?'Compact view · click to expand':'Expanded view · click to compact');control.setAttribute('aria-expanded',String(next==='expanded'));requestAnimationFrame(fit);
    try{localStorage.setItem('pf-presentation-v18',next);}catch{}
    window.dispatchEvent(new Event('resize'));
  }
  function attach(){
    panel=document.getElementById('pokefield-live-panel');if(!panel)return false;
    control=document.createElement('button');control.type='button';control.id='pf-presentation';
    panel.querySelector('.pf-head-actions').prepend(control);control.onclick=()=>set(selected==='compact'?'expanded':'compact');
    glance=document.createElement('div');glance.id='pf-glance';panel.querySelector('#pf-updates').insertAdjacentElement('afterend',glance);
    if(globalThis.ResizeObserver)new ResizeObserver(fit).observe(glance);
    summary();set(selected);return true;
  }
  window.addEventListener('jrpg:emerald-state',e=>{current=e.detail;summary();});
  if(!attach()){const observer=new MutationObserver(()=>{if(attach())observer.disconnect();});observer.observe(document.documentElement,{childList:true,subtree:true});}
})();
