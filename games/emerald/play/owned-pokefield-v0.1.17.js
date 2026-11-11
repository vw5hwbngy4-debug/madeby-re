/* Party-only projection of the published Emerald state. No emulator or save access. */
(() => {
  'use strict';
  const debug = typeof location !== 'undefined' && new URLSearchParams(location.search).get('debug') === '1';
  const stats = {hp:'HP IV',atk:'ATTACK IV',def:'DEFENSE IV',spa:'SP. ATK IV',spd:'SP. DEF IV',spe:'SPEED IV'};
  const metrics = {ivTotal:'TOTAL IV',...stats,evTotal:'EV TOTAL',level:'LEVEL',friendship:'FRIENDSHIP',ribbons:'RIBBONS'};
  function adapt(state) {
    return (Array.isArray(state?.party) ? state.party : []).slice(0,6).flatMap((m,partySlot) => {
      if (!m || !Number.isInteger(m.personality) || !Number.isInteger(m.otId)) return [];
      return [{...structuredClone(m),specimenId:`${m.personality >>> 0}:${m.otId >>> 0}`,partySlot,speciesId:m.dexNo,sprite:`./assets/pokemon/${Number(m.dexNo)||0}.png`,egg:m.kind==='EGG',rawReference:m}];
    });
  }
  function value(m,key) { return m.egg ? null : key in stats ? m.ivs?.[key] : key==='ribbons' ? m.ribbons?.count : m[key]; }
  function matches(m,p) {
    if(p.category==='PARTY') return p.value==='ALL' || (p.value==='EGGS' ? m.egg : m.partySlot===Number(p.value));
    if(m.egg) return false;
    switch(p.category) {
      case 'SPECIES': return m.species===p.value;
      case 'NATURE': return m.nature===p.value;
      case 'HIDDEN POWER': return m.hiddenPower?.type===p.value;
      case 'POKÉRUS': return m.pokerus?.state===p.value;
      case 'RIBBONS': return (m.ribbons?.count||0)>0;
      case 'SHINY': return m.shiny?.isShiny===true;
      case 'EV': return Number(m.evTotal)>0;
      default: { const n=value(m,p.metric); return Number.isFinite(n) && (p.op==='=' ? n===p.number : p.op==='<=' ? n<=p.number : n>=p.number); }
    }
  }
  class Field {
    constructor(){this.records=[];this.focus=null;this.calls=[];this.rank=null;}
    update(state){this.records=adapt(state);}
    active(){return this.records.filter(m=>this.focus===null || this.focus.has(m.specimenId));}
    responders(){return this.active().filter(m=>this.calls.every(p=>matches(m,p)));}
    call(p){this.calls.push({...p});}
    focusResponses(){this.focus=new Set(this.responders().map(m=>m.specimenId));this.calls=[];}
    scatter(){this.focus=null;this.calls=[];this.rank=null;}
    ordered(){return this.active().slice().sort((a,b)=>this.rank ? (value(b,this.rank)??-Infinity)-(value(a,this.rank)??-Infinity)||a.partySlot-b.partySlot : a.partySlot-b.partySlot);}
  }
  if(typeof module!=='undefined') module.exports={adapt,matches,value,Field};
  if(typeof document==='undefined') return;
  const model=new Field(); let panel,section,nav,fixture=false;
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const options=items=>items.map(([v,l])=>`<option value="${esc(v)}">${esc(l)}</option>`).join('');
  function mode(next){
    panel.classList.toggle('opf-show',next==='field'); section.hidden=next!=='field';
    nav.querySelectorAll('button').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.mode===next)));
    const tc=globalThis.JRPGWorldEmeraldTrainerCard;
    if(next==='trainer') tc?.flipToTrainer(); else tc?.flipToLive();
  }
  function picker(){
    const category=section.querySelector('#opf-category').value;
    let items=[];
    if(category==='SPECIES'||category==='NATURE') items=[...new Set(model.records.filter(m=>!m.egg).map(m=>m[category==='SPECIES'?'species':'nature']).filter(Boolean))].sort().map(x=>[x,x]);
    if(category==='HIDDEN POWER') items='Fighting Flying Poison Ground Rock Bug Ghost Steel Fire Water Grass Electric Psychic Ice Dragon Dark'.split(' ').map(x=>[x,x]);
    if(category==='POKÉRUS') items=[['active','ACTIVE'],['cured','CURED'],['none','NONE']];
    if(category==='PARTY') items=[['ALL','ALL'],['EGGS','EGGS'],...model.records.map(m=>[m.partySlot,`PARTY ${m.partySlot+1}`])];
    if(category==='IV') items=Object.entries({ivTotal:'TOTAL IV',...stats});
    if(category==='LEVEL') items=[['level','LEVEL']];
    const numeric=['IV','LEVEL'].includes(category);
    section.querySelector('#opf-value').innerHTML=options(items);
    section.querySelector('#opf-value').hidden=!items.length;
    section.querySelector('#opf-numeric').hidden=!numeric;
    section.querySelector('#opf-hint').textContent=category==='EV'?'EV TRAINED · EV total greater than 0':'';
  }
  function render(){
    if(!section) return;
    const responders=new Set(model.responders().map(m=>m.specimenId)),ordered=model.ordered();
    section.querySelector('#opf-count').textContent=`${ordered.length} in field${model.calls.length?` · ${responders.size} answering`:''}`;
    section.querySelector('#opf-chain').textContent=model.calls.map(p=>p.label).join(' → ');
    section.querySelector('#opf-focus').disabled=!model.calls.length;
    section.querySelector('#opf-cells').classList.toggle('opf-ranked',!!model.rank);
    section.querySelector('#opf-cells').innerHTML=ordered.map((m,i)=>`<button type="button" class="opf-cell ${model.calls.length?(responders.has(m.specimenId)?'answer':'subdued'):''}" data-slot="${m.partySlot}" data-specimen="${esc(m.specimenId)}" aria-label="${esc(m.egg?'Egg':m.species)} ${esc(m.genderSymbol)} level ${m.level}, party ${m.partySlot+1}, open details"><span class="opf-hex">${m.egg?'<span class="opf-egg">🥚</span>':`<img src="${m.sprite}" alt="" loading="lazy">`}</span><strong>${esc(m.egg?'EGG':m.species)} ${m.egg?'':esc(m.genderSymbol)}</strong><small>${m.egg?'EGG':`Lv${esc(m.level)}`}</small>${model.rank?`<span class="opf-score">${i+1} · ${esc(value(m,model.rank)??'—')} ${metrics[model.rank]}</span>`:''}</button>`).join('')||`<p class="opf-empty">${model.records.length?'No specimens in this focus. SCATTER to return to your party.':'Your field is waiting. Pokémon in your party will appear here.'}</p>`;
    section.querySelectorAll('[data-slot]').forEach(b=>b.onclick=()=>{
      if(fixture){section.querySelector('#opf-hint').textContent='Fixture preview only. Return to LIVE DATA to open a real passport.';return;}
      mode('live'); window.dispatchEvent(new CustomEvent('jrpg:emerald-select-party',{detail:{partySlot:Number(b.dataset.slot),specimenId:b.dataset.specimen}}));
    });
    if(debug) section.querySelector('#opf-debug-state').textContent=JSON.stringify({specimens:model.records.map(m=>({specimenId:m.specimenId,partySlot:m.partySlot})),calls:model.calls,focus:model.focus&&[...model.focus],rank:model.rank},null,2);
  }
  function attach(){
    panel=document.getElementById('pokefield-live-panel'); if(!panel)return false;if(section)return true;
    nav=document.createElement('nav');nav.className='opf-nav';nav.setAttribute('aria-label','PokéField views');nav.innerHTML=['live','field','trainer'].map((x,i)=>`<button type="button" data-mode="${x}" aria-pressed="${i===0}">${['LIVE','MY FIELD','TRAINER CARD'][i]}</button>`).join('');
    panel.querySelector('#pf-updates').insertAdjacentElement('afterend',nav);
    section=document.createElement('section');section.id='owned-pokefield';section.hidden=true;
    section.innerHTML=`<div class="opf-heading"><strong>MY FIELD</strong><small>PARTY ONLY</small></div><p id="opf-count" aria-live="polite"></p><div id="opf-cells"></div><p id="opf-chain"></p><form id="opf-call"><div class="opf-pickers"><select id="opf-category" aria-label="Call category">${options(['SPECIES','NATURE','IV','EV','HIDDEN POWER','POKÉRUS','RIBBONS','SHINY','LEVEL','PARTY'].map(x=>[x,x]))}</select><select id="opf-value" aria-label="Call value"></select><span id="opf-numeric" hidden><select id="opf-op" aria-label="Comparison"><option>>=</option><option>=</option><option><=</option></select><input id="opf-number" aria-label="Threshold" type="number" min="0" max="186" value="25" required></span></div><button type="submit">CALL</button></form><p id="opf-hint"></p><div class="opf-actions"><button id="opf-focus" type="button">FOCUS</button><button id="opf-scatter" type="button">SCATTER</button></div><form id="opf-rank-form"><select id="opf-rank" aria-label="Rank metric">${options(Object.entries(metrics))}</select><button type="submit">RANK</button></form>${debug?'<details><summary>DEBUG FIXTURES</summary><select id="opf-fixture" aria-label="Fixture"><option value="live">LIVE DATA</option><option value="six">SIX SPECIMENS</option><option value="one">ONE SPECIMEN</option><option value="zero">ZERO PARTY</option></select><pre id="opf-debug-state"></pre></details>':''}`;
    nav.insertAdjacentElement('afterend',section);
    nav.querySelectorAll('button').forEach(b=>b.onclick=()=>mode(b.dataset.mode));
    // Let the existing Trainer Card controls keep their own flip behavior.
    panel.addEventListener('click',e=>{if(e.target.closest('#tc-header-button,#tc-flip-primary,#tc-back-live')){panel.classList.remove('opf-show');section.hidden=true;queueMicrotask(()=>nav.querySelectorAll('button').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.mode===(panel.querySelector('#tc-stage.tc-flipped')?'trainer':'live')))));}});
    section.querySelector('#opf-category').onchange=picker;
    section.querySelector('#opf-call').onsubmit=e=>{e.preventDefault();const category=section.querySelector('#opf-category').value,v=section.querySelector('#opf-value').value,op=section.querySelector('#opf-op').value,number=Number(section.querySelector('#opf-number').value);model.call({category,value:v,metric:v,op,number,label:`${category} ${['IV','LEVEL'].includes(category)?`${metrics[v]} ${op} ${number}`:category==='EV'?'TRAINED':v}`});render();};
    section.querySelector('#opf-focus').onclick=()=>{model.focusResponses();render();};
    section.querySelector('#opf-scatter').onclick=()=>{model.scatter();render();};
    section.querySelector('#opf-rank-form').onsubmit=e=>{e.preventDefault();model.rank=section.querySelector('#opf-rank').value;render();};
    if(debug)section.querySelector('#opf-fixture').onchange=async e=>{const choice=e.target.value;fixture=choice!=='live';model.scatter();if(fixture){const {fixtures}=await import('./owned-pokefield-fixtures-v0.1.17.js');model.update({party:fixtures(choice)});}else model.update(globalThis.JRPGWorldEmeraldState);picker();render();};
    model.update(globalThis.JRPGWorldEmeraldState);picker();render();return true;
  }
  window.addEventListener('jrpg:emerald-state',e=>{if(!fixture){const before=JSON.stringify(model.records.map(m=>[m.species,m.nature,m.partySlot]));model.update(e.detail);if(section && before!==JSON.stringify(model.records.map(m=>[m.species,m.nature,m.partySlot])))picker();render();}});
  if(!attach()){const observer=new MutationObserver(()=>{if(attach())observer.disconnect();});observer.observe(document.documentElement,{childList:true,subtree:true});}
})();
