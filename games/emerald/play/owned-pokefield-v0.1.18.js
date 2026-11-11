/* Party-only projection of the published Emerald state. No emulator or save access. */
(() => {
  'use strict';
  const debug = typeof location !== 'undefined' && new URLSearchParams(location.search).get('debug') === '1';
  const stats = {hp:'HP IV',atk:'ATTACK IV',def:'DEFENSE IV',spa:'SP. ATK IV',spd:'SP. DEF IV',spe:'SPEED IV'};
  const metrics = {ivTotal:'TOTAL IV',...stats,hpPower:'HIDDEN POWER POWER',evTotal:'EV TOTAL',level:'LEVEL',friendship:'FRIENDSHIP',ribbons:'RIBBONS'};
  const bands={ivTotal:[186,156,126,96,66,0],hpPower:[70,65,60,50,40,30],evTotal:[510,408,306,204,102,0],level:[100,80,60,40,20,1],friendship:[255,220,180,130,70,0],ribbons:[32,24,16,8,1,0]};
  const tiers=['S','A','B','C','D','E'];
  function tier(m,key){const n=value(m,key);if(!Number.isFinite(n))return '—';return tiers[(key in stats?[31,26,21,16,11,0]:bands[key]).findIndex(min=>n>=min)]||'—';}
  function bandLabel(key,i){const mins=key in stats?[31,26,21,16,11,0]:bands[key];return i===0?`${mins[0]}${key==='ribbons'?'+':''}`:`${mins[i]}–${mins[i-1]-1}`;}
  const facet=p=>p.category==='IV'?`IV:${p.metric}`:p.category;
  function adapt(state) {
    return (Array.isArray(state?.party) ? state.party : []).slice(0,6).flatMap((m,partySlot) => {
      if (!m || !Number.isInteger(m.personality) || !Number.isInteger(m.otId)) return [];
      return [{...structuredClone(m),specimenId:`${m.personality >>> 0}:${m.otId >>> 0}`,partySlot,speciesId:m.dexNo,sprite:`./assets/pokemon/${Number(m.dexNo)||0}.png`,egg:m.kind==='EGG',rawReference:m}];
    });
  }
  function value(m,key) { return m.egg ? null : key in stats ? m.ivs?.[key] : key==='ribbons' ? m.ribbons?.count : key==='hpPower'?m.hiddenPower?.power:m[key]; }
  function matches(m,p) {
    if(p.category==='PARTY') return p.value==='ALL' || (p.value==='EGGS' ? m.egg : m.partySlot===Number(p.value));
    if(m.egg) return false;
    switch(p.category) {
      case 'SPECIES': return m.species===p.value;
      case 'NATURE': return m.nature===p.value;
      case 'HIDDEN POWER': return m.hiddenPower?.type===p.value;
      case 'HIDDEN POWER TYPE': return m.hiddenPower?.type===p.value;
      case 'POKÉRUS': return m.pokerus?.state===p.value;
      case 'RIBBONS': return (m.ribbons?.count||0)>0;
      case 'SHINY': return m.shiny?.isShiny===true;
      case 'EV': return Number(m.evTotal)>0;
      default: { const n=value(m,p.metric); return Number.isFinite(n) && (p.op==='=' ? n===p.number : p.op==='<=' ? n<=p.number : n>=p.number); }
    }
  }
  class Field {
    constructor(){this.records=[];this.focus=null;this.calls=[];this.rank=null;this.selectedTier=null;}
    update(state){this.records=adapt(state);}
    active(){return this.records.filter(m=>this.focus===null || this.focus.has(m.specimenId));}
    responding(){return this.calls.length>0 || this.selectedTier!==null;}
    responders(){return this.active().filter(m=>this.calls.every(p=>matches(m,p)) && (!this.selectedTier || tier(m,this.rank)===this.selectedTier));}
    call(p){const i=this.calls.findIndex(x=>facet(x)===facet(p));if(i<0)this.calls.push({...p});else this.calls[i]={...p};this.selectedTier=null;}
    remove(key){this.calls=this.calls.filter(p=>facet(p)!==key);}
    setRank(key){this.rank=key;this.selectedTier=null;}
    selectTier(t){this.calls=[];this.selectedTier=t;}
    focusResponses(){if(!this.responding() || !this.responders().length)return false;this.focus=new Set(this.responders().map(m=>m.specimenId));this.calls=[];this.selectedTier=null;this.rank=null;return true;}
    scatter(){this.focus=null;this.calls=[];this.rank=null;this.selectedTier=null;}
    ordered(){return this.active().slice().sort((a,b)=>this.rank ? (value(b,this.rank)??-Infinity)-(value(a,this.rank)??-Infinity)||a.partySlot-b.partySlot : a.partySlot-b.partySlot);}
  }
  if(typeof module!=='undefined') module.exports={adapt,matches,value,Field,tier,bandLabel,facet};
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

  const $=id=>section.querySelector('#opf-'+id);
  const numericCategory=c=>['IV','LEVEL','HIDDEN POWER POWER'].includes(c);
  function resetControls(){
    $('category').value='';$('rank').value='';$('op').value='>=';$('number').value='';
    picker();validate();
  }
  function picker(preserve=false){
    const category=$('category').value,previous=preserve?$('value').value:'';
    let items=[];
    if(category==='SPECIES'||category==='NATURE')items=[...new Set(model.records.filter(m=>!m.egg).map(m=>m[category==='SPECIES'?'species':'nature']).filter(Boolean))].sort().map(x=>[x,x]);
    if(category==='HIDDEN POWER TYPE')items='Fighting Flying Poison Ground Rock Bug Ghost Steel Fire Water Grass Electric Psychic Ice Dragon Dark'.split(' ').map(x=>[x,x]);
    if(category==='POKÉRUS')items=[['active','ACTIVE'],['cured','CURED'],['none','NONE']];
    if(category==='PARTY')items=[['ALL','ALL'],['EGGS','EGGS'],...model.records.map(m=>[m.partySlot,`PARTY ${m.partySlot+1}`])];
    if(category==='IV')items=Object.entries({ivTotal:'TOTAL IV',...stats});
    $('value').innerHTML=options([['','CHOOSE...'],...items]);
    if(items.some(([v])=>String(v)===previous))$('value').value=previous;
    $('value').hidden=!['','SPECIES','NATURE','HIDDEN POWER TYPE','POKÉRUS','PARTY','IV'].includes(category);
    $('value').disabled=!category;
    $('numeric').hidden=!numericCategory(category);
    $('number').disabled=!numericCategory(category);
    if(!preserve){$('number').value='';$('op').value='>=';}
    $('hint').textContent=category==='EV'?'EV TRAINED · EV total greater than 0':'';
    validate();
  }
  function predicate(){
    const category=$('category').value,v=$('value').value,op=$('op').value;
    if(!category)return null;
    if(numericCategory(category)){
      const metric=category==='LEVEL'?'level':category==='HIDDEN POWER POWER'?'hpPower':v;
      const number=Number($('number').value),min=metric==='hpPower'?30:metric==='level'?1:0,max=metric==='hpPower'?70:metric==='level'?100:metric==='ivTotal'?186:31;
      $('number').min=min;$('number').max=max;
      if(!metric || $('number').value==='' || !Number.isInteger(number) || number<min || number>max)return null;
      return {category,metric,op,number,label:`${metrics[metric]} ${op==='>='?'≥':op==='<='?'≤':'='}${number}`};
    }
    if(['SPECIES','NATURE','HIDDEN POWER TYPE','POKÉRUS','PARTY'].includes(category)&&v==='')return null;
    return {category,value:v,label:category==='HIDDEN POWER TYPE'?`HP ${v}`:category==='POKÉRUS'?`POKÉRUS ${v.toUpperCase()}`:category==='EV'?'EV TRAINED':category==='PARTY'?`PARTY ${v==='ALL'||v==='EGGS'?v:Number(v)+1}`:v||category};
  }
  function validate(){
    $('call-button').disabled=!predicate();$('rank-button').disabled=!$('rank').value;
  }
  function render(){
    if(!section)return;
    const responding=model.responding(),responders=new Set(model.responders().map(m=>m.specimenId)),ordered=model.ordered();
    $('count').textContent=`${ordered.length} in field${responding?` · ${responders.size} answering`:''}`;
    $('chain').innerHTML=model.calls.map(p=>`<button type="button" data-facet="${esc(facet(p))}" aria-label="Remove ${esc(p.label)}">${esc(p.label)} ×</button>`).join('');
    $('chain').querySelectorAll('button').forEach(b=>b.onclick=()=>{model.remove(b.dataset.facet);render();});
    $('focus').disabled=!responding||!responders.size;$('focus').classList.toggle('ready',!$('focus').disabled);
    const cell=m=>{
      const note=m.notability||globalThis.PokeFieldNotability.assess(m);
      return `<button type="button" class="opf-cell ${responding?(responders.has(m.specimenId)?'answer':'subdued'):''}" data-slot="${m.partySlot}" data-specimen="${esc(m.specimenId)}" aria-label="${esc(m.egg?'Egg':m.species)} ${esc(m.genderSymbol)} level ${m.level}, party ${m.partySlot+1}, open details" title="${esc(note.explanation)}"><span class="opf-hex">${m.egg?'<span class="opf-egg">🥚</span>':`<img src="${m.sprite}" alt="" loading="lazy">`}</span><strong>${esc(m.egg?'EGG':m.species)} ${m.egg?'':esc(m.genderSymbol)}</strong><small>${m.egg?'EGG':`Lv${esc(m.level)}`}</small>${note.flags.length?`<span class="opf-flags">${note.flags.map(f=>esc(f.label)).join(' · ')}</span>`:''}${model.rank?`<span class="opf-score">${esc(value(m,model.rank)??'—')}</span>`:''}</button>`;
    };
    $('cells').classList.toggle('opf-ranked',!!model.rank);
    if(model.rank){
      $('cells').innerHTML=tiers.map((t,i)=>{
        const members=ordered.filter(m=>tier(m,model.rank)===t);
        return `<div class="opf-tier ${model.selectedTier===t?'selected':''}"><button type="button" data-tier="${t}" ${members.length?'':'disabled'} aria-pressed="${model.selectedTier===t}" aria-label="Select tier ${t}, ${bandLabel(model.rank,i)}, ${members.length} specimens"><b>${t}</b><small>${bandLabel(model.rank,i)}</small></button><div class="opf-tier-cells">${members.map(cell).join('')||'<small class="opf-tier-empty">—</small>'}</div></div>`;
      }).join('');
      const unknown=ordered.filter(m=>tier(m,model.rank)==='—');
      if(unknown.length)$('cells').innerHTML+=`<div class="opf-unranked">Unranked<div class="opf-tier-cells">${unknown.map(cell).join('')}</div></div>`;
      $('cells').querySelectorAll('[data-tier]').forEach(b=>b.onclick=()=>{model.selectTier(b.dataset.tier);render();});
    }else $('cells').innerHTML=ordered.map(cell).join('')||`<p class="opf-empty">${model.records.length?'No specimens in this focus. SCATTER to return to your party.':'Your field is waiting. Pokémon in your party will appear here.'}</p>`;
    $('cells').querySelectorAll('[data-slot]').forEach(b=>b.onclick=()=>{
      if(fixture){$('hint').textContent='Fixture preview only. Return to LIVE DATA to open a real passport.';return;}
      mode('live');window.dispatchEvent(new CustomEvent('jrpg:emerald-select-party',{detail:{partySlot:Number(b.dataset.slot),specimenId:b.dataset.specimen}}));
    });
    if(debug)$('debug-state').textContent=JSON.stringify({specimens:model.records.map(m=>({specimenId:m.specimenId,partySlot:m.partySlot,mirageValue:m.personality & 65535})),calls:model.calls,focus:model.focus&&[...model.focus],rank:model.rank,tier:model.selectedTier},null,2);
    validate();
  }
  function attach(){
    panel=document.getElementById('pokefield-live-panel');if(!panel)return false;if(section)return true;
    nav=document.createElement('nav');nav.className='opf-nav';nav.setAttribute('aria-label','PokéField views');nav.innerHTML=['live','field','trainer'].map((x,i)=>`<button type="button" data-mode="${x}" aria-pressed="${i===0}">${['LIVE','MY FIELD','TRAINER CARD'][i]}</button>`).join('');
    panel.querySelector('#pf-updates').insertAdjacentElement('afterend',nav);
    section=document.createElement('section');section.id='owned-pokefield';section.hidden=true;
    section.innerHTML=`<div class="opf-heading"><strong>MY FIELD</strong><small>PARTY ONLY</small></div><p id="opf-count" aria-live="polite"></p><div id="opf-cells"></div><div id="opf-chain" aria-label="Applied filters"></div><form id="opf-call"><div class="opf-pickers"><select id="opf-category" aria-label="Call category">${options([['','CALL BY...'],...['SPECIES','NATURE','IV','EV','HIDDEN POWER TYPE','HIDDEN POWER POWER','POKÉRUS','RIBBONS','SHINY','LEVEL','PARTY'].map(x=>[x,x])])}</select><select id="opf-value" aria-label="Call value"></select><span id="opf-numeric" hidden><select id="opf-op" aria-label="Comparison"><option value=">=">≥</option><option value="=">=</option><option value="<=">≤</option></select><input id="opf-number" aria-label="Threshold" type="number" inputmode="numeric" step="1" placeholder="VALUE"></span></div><button id="opf-call-button" type="submit" disabled>🪈 CALL</button></form><p id="opf-hint"></p><div class="opf-actions"><button id="opf-focus" type="button" disabled>FOCUS</button><button id="opf-scatter" type="button">SCATTER</button></div><form id="opf-rank-form"><select id="opf-rank" aria-label="Rank metric">${options([['','RANK BY...'],...Object.entries(metrics)])}</select><button id="opf-rank-button" type="submit" disabled>RANK</button></form>${debug?'<details><summary>DEBUG FIXTURES</summary><select id="opf-fixture" aria-label="Fixture"><option value="live">LIVE DATA</option><option value="six">SIX SPECIMENS</option><option value="one">ONE SPECIMEN</option><option value="zero">ZERO PARTY</option></select><pre id="opf-debug-state"></pre></details>':''}`;
    nav.insertAdjacentElement('afterend',section);
    nav.querySelectorAll('button').forEach(b=>b.onclick=()=>mode(b.dataset.mode));
    panel.addEventListener('click',e=>{if(e.target.closest('#tc-header-button,#tc-flip-primary,#tc-back-live')){panel.classList.remove('opf-show');section.hidden=true;queueMicrotask(()=>nav.querySelectorAll('button').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.mode===(panel.querySelector('#tc-stage.tc-flipped')?'trainer':'live')))));}});
    $('category').onchange=()=>picker();
    ['value','op','number','rank'].forEach(id=>{$(id).oninput=validate;$(id).onchange=validate;});
    $('call').onsubmit=e=>{e.preventDefault();const p=predicate();if(p){model.call(p);render();}};
    $('focus').onclick=()=>{if(model.focusResponses()){resetControls();render();}};
    $('scatter').onclick=()=>{model.scatter();resetControls();render();};
    $('rank-form').onsubmit=e=>{e.preventDefault();if($('rank').value){model.setRank($('rank').value);render();}};
    if(debug){let request=0;$('fixture').onchange=async e=>{const token=++request,choice=e.target.value;fixture=choice!=='live';model.scatter();if(fixture){const {fixtures}=await import('./owned-pokefield-fixtures-v0.1.18.js');if(token!==request)return;model.update({party:fixtures(choice)});}else model.update(globalThis.JRPGWorldEmeraldState);resetControls();render();};}
    model.update(globalThis.JRPGWorldEmeraldState);resetControls();render();return true;
  }
  window.addEventListener('jrpg:emerald-state',e=>{if(!fixture){const before=JSON.stringify(model.records.map(m=>[m.species,m.nature,m.partySlot]));model.update(e.detail);if(section&&before!==JSON.stringify(model.records.map(m=>[m.species,m.nature,m.partySlot])))picker(true);render();}});
  if(!attach()){const observer=new MutationObserver(()=>{if(attach())observer.disconnect();});observer.observe(document.documentElement,{childList:true,subtree:true});}
})();
