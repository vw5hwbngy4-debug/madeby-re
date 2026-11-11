/* Emerald v0.1.21 REACTIVE MY FIELD
 * Read-only projection of party + all 14 PC boxes published by PokéField Live.
 * Known facts react immediately. FOCUS is optional commitment, SCATTER is reset.
 */
(() => {
  'use strict';
  const debug=typeof location!=='undefined'&&new URLSearchParams(location.search).get('debug')==='1';
  const IV_KEYS={hp:'HP IV',atk:'ATTACK IV',def:'DEFENSE IV',spa:'SP. ATK IV',spd:'SP. DEF IV',spe:'SPEED IV'};
  const BASE_KEYS={baseHP:'BASE HP',baseAtk:'BASE ATK',baseDef:'BASE DEF',baseSpa:'BASE SP.ATK',baseSpd:'BASE SP.DEF',baseSpe:'BASE SPEED'};
  const METRICS={ivTotal:'TOTAL IV',...IV_KEYS,hpPower:'HIDDEN POWER POWER',evTotal:'EV TOTAL',level:'LEVEL',friendship:'FRIENDSHIP',ribbons:'RIBBONS',...BASE_KEYS};
  const HP_TYPES='Fighting Flying Poison Ground Rock Bug Ghost Steel Fire Water Grass Electric Psychic Ice Dragon Dark'.split(' ');
  const ALL_TYPES=['Normal',...HP_TYPES];
  const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const options=items=>items.map(([v,l])=>`<option value="${esc(v)}">${esc(l)}</option>`).join('');
  let knowledge=null;

  function recordKey(m,source,index){
    const specimen=`${Number(m.personality)>>>0}:${Number(m.otId)>>>0}`;
    if(source==='party')return `${specimen}:P${index}`;
    return `${specimen}:B${Number(m.storage?.box)||0}:${Number(m.storage?.slot)||0}`;
  }
  function adapt(state){
    const out=[];
    (Array.isArray(state?.party)?state.party:[]).forEach((m,i)=>{if(m&&Number.isInteger(m.personality)&&Number.isInteger(m.otId))out.push({...structuredClone(m),recordId:recordKey(m,'party',i),specimenId:`${m.personality>>>0}:${m.otId>>>0}`,partySlot:i,source:'party',locationLabel:`PARTY ${i+1}`,sprite:`./assets/pokemon/${Number(m.dexNo)||0}.png`,egg:m.kind==='EGG'});});
    (Array.isArray(state?.boxes)?state.boxes:[]).forEach((m,i)=>{if(m&&Number.isInteger(m.personality)&&Number.isInteger(m.otId))out.push({...structuredClone(m),recordId:recordKey(m,'box',i),specimenId:`${m.personality>>>0}:${m.otId>>>0}`,source:'box',box:Number(m.storage?.box)||0,boxSlot:Number(m.storage?.slot)||0,locationLabel:`BOX ${(Number(m.storage?.box)||0)+1}`,sprite:`./assets/pokemon/${Number(m.dexNo)||0}.png`,egg:m.kind==='EGG'});});
    return out;
  }
  function finalRecord(m){
    const E=globalThis.TeamLabEngine;if(!E||!knowledge)return null;return E.projectedRecord(knowledge,m)||E.record(knowledge,m.dexNo);
  }
  function baseValue(m,key){const r=finalRecord(m),map={baseHP:'hp',baseAtk:'atk',baseDef:'def',baseSpa:'spa',baseSpd:'spd',baseSpe:'spe'};return r?.stats?.[map[key]];}
  function value(m,key){
    if(m.egg&& !['level'].includes(key))return null;
    if(key in IV_KEYS)return m.ivs?.[key];
    if(key in BASE_KEYS)return baseValue(m,key);
    if(key==='ribbons')return Number(m.ribbons?.count||0);
    if(key==='hpPower')return Number(m.hiddenPower?.power);
    return Number(m[key]);
  }
  function projected101(m){const E=globalThis.TeamLabEngine,r=finalRecord(m);return E&&knowledge&&r?E.sub101(m,r):null;}
  function filterFacet(p){return p.metric?`${p.category}:${p.metric}`:p.category;}
  function matches(m,p){
    if(!p)return true;
    if(p.numeric){const n=value(m,p.metric);return Number.isFinite(n)&&(p.op==='='?n===p.number:p.op==='<='?n<=p.number:n>=p.number);}
    const r=finalRecord(m);
    switch(p.category){
      case 'SPECIES':return m.species===p.value;
      case 'FINAL FORM':return r?.name===p.value;
      case 'FINAL TYPE':return r?.types?.includes(p.value);
      case 'NATURE':return m.nature===p.value;
      case 'ABILITY':return String(m.ability||'')===p.value||r?.abilities?.includes(p.value);
      case 'HIDDEN POWER TYPE':return m.hiddenPower?.type===p.value;
      case 'POKÉRUS':return m.pokerus?.state===p.value;
      case 'SHINY':return !!m.shiny?.isShiny;
      case 'RIBBONS':return Number(m.ribbons?.count||0)>0;
      case 'EV TRAINED':return Number(m.evTotal||0)>0;
      case 'LOCATION':return p.value==='PARTY'?m.source==='party':p.value==='BOXES'?m.source==='box':m.locationLabel===p.value;
      case 'TIER':return r?.tier===p.value;
      case '101 SUB':{const x=projected101(m);if(!x)return false;if(p.value==='READY')return !!x.eligible;if(p.value==='ACHIEVABLE')return !!x.achievable;return !x.achievable;}
      default:return true;
    }
  }
  class ReactiveField{
    constructor(){this.records=[];this.focus=null;this.filters=[];this.rankX=null;this.rankY=null;this.view='field';}
    update(state){this.records=adapt(state);if(this.focus){const known=new Set(this.records.map(x=>x.recordId));this.focus=new Set([...this.focus].filter(x=>known.has(x)));}}
    active(){return this.records.filter(m=>this.focus===null||this.focus.has(m.recordId));}
    filtered(){return this.active().filter(m=>this.filters.every(p=>matches(m,p)));}
    setFilter(p){const f=filterFacet(p),i=this.filters.findIndex(x=>filterFacet(x)===f);if(i<0)this.filters.push(p);else this.filters[i]=p;}
    removeFilter(f){this.filters=this.filters.filter(x=>filterFacet(x)!==f);}
    setRanks(x,y){this.rankX=x||null;this.rankY=y||null;if(this.view!=='field'&&!this.rankX)this.view='field';}
    focusMatches(){const rows=this.filtered();if(!rows.length)return false;this.focus=new Set(rows.map(m=>m.recordId));this.filters=[];return true;}
    scatter(){this.focus=null;this.filters=[];this.rankX=null;this.rankY=null;this.view='field';}
    ordered(metric=this.rankX){return this.filtered().slice().sort((a,b)=>metric?((value(b,metric)??-Infinity)-(value(a,metric)??-Infinity)||a.recordId.localeCompare(b.recordId)):((a.source==='party'?0:1)-(b.source==='party'?0:1)||a.recordId.localeCompare(b.recordId)));}
  }
  if(typeof module!=='undefined')module.exports={adapt,value,matches,ReactiveField,filterFacet};
  if(typeof document==='undefined')return;

  const model=new ReactiveField();let panel,section,nav,fixture=false;
  const $=id=>section?.querySelector('#opf-'+id);
  function mode(next){panel.classList.toggle('opf-show',next==='field');section.hidden=next!=='field';nav?.querySelectorAll('button').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.mode===next)));const tc=globalThis.JRPGWorldEmeraldTrainerCard;if(next==='trainer')tc?.flipToTrainer();else tc?.flipToLive();}
  function uniqueValues(fn){return [...new Set(model.records.map(fn).filter(Boolean))].sort();}
  function categoryConfig(category){
    const rvals=()=>model.records.map(finalRecord).filter(Boolean);
    if(category==='SPECIES')return uniqueValues(m=>m.species).map(x=>[x,x]);
    if(category==='FINAL FORM')return [...new Set(rvals().map(r=>r.name))].sort().map(x=>[x,x]);
    if(category==='FINAL TYPE')return ALL_TYPES.filter(t=>rvals().some(r=>r.types?.includes(t))).map(x=>[x,x]);
    if(category==='NATURE')return uniqueValues(m=>m.nature).map(x=>[x,x]);
    if(category==='ABILITY')return uniqueValues(m=>m.ability).map(x=>[x,x]);
    if(category==='HIDDEN POWER TYPE')return HP_TYPES.map(x=>[x,x]);
    if(category==='POKÉRUS')return [['active','ACTIVE'],['cured','CURED'],['none','NONE']];
    if(category==='LOCATION')return [['PARTY','PARTY'],['BOXES','ALL BOXES'],...Array.from({length:14},(_,i)=>[`BOX ${i+1}`,`BOX ${i+1}`])];
    if(category==='TIER')return ['OU','UUBL','UU','RUBL','RU','NUBL','NU','PUBL','PU','ZUBL','ZU','NFE','LC','—'].filter(t=>rvals().some(r=>r.tier===t)).map(x=>[x,x]);
    if(category==='101 SUB')return [['READY','READY NOW'],['ACHIEVABLE','ACHIEVABLE AT LV100'],['NO','CANNOT REACH 101 SUB']];
    if(category==='IV')return Object.entries({ivTotal:'TOTAL IV',...IV_KEYS});
    return [];
  }
  function isNumericCategory(c){return ['IV','LEVEL','HIDDEN POWER POWER','EV TOTAL','FRIENDSHIP','BASE STAT'].includes(c);}
  function metricFor(category,val){if(category==='IV')return val;if(category==='LEVEL')return'level';if(category==='HIDDEN POWER POWER')return'hpPower';if(category==='EV TOTAL')return'evTotal';if(category==='FRIENDSHIP')return'friendship';if(category==='BASE STAT')return val;return null;}
  function numericBounds(metric){if(metric==='hpPower')return[30,70,65];if(metric==='level')return[1,100,50];if(metric==='ivTotal')return[0,186,150];if(metric in IV_KEYS)return[0,31,25];if(metric==='evTotal')return[0,510,252];if(metric==='friendship')return[0,255,200];if(metric in BASE_KEYS)return[1,255,100];return[0,999,0];}
  function makePredicate(){
    const category=$('category').value;if(!category)return null;
    if(isNumericCategory(category)){
      const metric=metricFor(category,$('value').value);if(!metric)return null;const [min,max]=numericBounds(metric),number=Number($('number').value);if(!Number.isFinite(number)||number<min||number>max)return null;const op=$('op').value;return{category,metric,numeric:true,op,number,label:`${METRICS[metric]} ${op==='>='?'≥':op==='<='?'≤':'='}${number}`};
    }
    if(['SHINY','RIBBONS','EV TRAINED'].includes(category))return{category,value:true,label:category};
    const v=$('value').value;if(!v)return null;return{category,value:v,label:category==='HIDDEN POWER TYPE'?`HP ${v}`:`${category} · ${v}`};
  }
  function reactiveApply(){const p=makePredicate();if(p){model.setFilter(p);render();}}
  function picker(){
    const c=$('category').value,items=categoryConfig(c);$('value').innerHTML=options([['','CHOOSE…'],...items]);
    if(c==='BASE STAT')$('value').innerHTML=options([['','CHOOSE STAT…'],...Object.entries(BASE_KEYS)]);
    $('value').hidden=!items.length&&c!=='BASE STAT';$('value').disabled=!c||(!items.length&&c!=='BASE STAT');
    const numeric=isNumericCategory(c);$('numeric').hidden=!numeric;$('number').disabled=!numeric;
    if(numeric&&c!=='IV'&&c!=='BASE STAT'){const metric=metricFor(c,'');const [min,max,def]=numericBounds(metric);$('number').min=min;$('number').max=max;$('number').value=def;}
    $('hint').textContent=c?'Selection filters immediately. No CALL/apply step.':'';
  }
  function rankValueLabel(m,key){const v=value(m,key);return Number.isFinite(v)?String(v):'—';}
  function cell(m,rank=null){const r=finalRecord(m);const flags=[];if(m.source==='party')flags.push('PARTY');else flags.push(`B${m.box+1}`);if(m.shiny?.isShiny)flags.push('SHINY');if(m.pokerus?.state==='active')flags.push('PKRS');const sub=projected101(m);if(sub?.eligible)flags.push('101 SUB');return `<button type="button" class="opf-cell" data-record="${esc(m.recordId)}" title="${esc(r?`${m.species} → ${r.name} · ${r.tier}`:m.species)}"><span class="opf-hex">${m.egg?'<span class="opf-egg">🥚</span>':`<img src="${m.sprite}" alt="" loading="lazy">`}</span><strong>${esc(m.egg?'EGG':m.species)} ${m.egg?'':esc(m.genderSymbol||'')}</strong><small>${m.level?`Lv${m.level}`:'Lv?'} · ${esc(m.locationLabel)}</small>${r&&r.name!==m.species?`<small class="opf-future">→ ${esc(r.name)} · ${esc(r.tier)}</small>`:''}<span class="opf-flags">${flags.join(' · ')}</span>${rank?`<span class="opf-score">${esc(rankValueLabel(m,rank))}</span>`:''}</button>`;}
  function renderField(rows){$('cells').className='';$('cells').innerHTML=rows.map(m=>cell(m,model.rankX)).join('')||'<p class="opf-empty">No specimens match these filters.</p>';}
  function renderDual(){
    const left=model.ordered(model.rankX),right=model.ordered(model.rankY||model.rankX);$('cells').className='opf-dual';const table=(rows,key,title)=>`<section><header><b>${esc(title)}</b><small>rank · specimen · value</small></header><div class="opf-rank-table">${rows.map((m,i)=>`<button data-record="${esc(m.recordId)}"><b>#${i+1}</b><img src="${m.sprite}" alt=""><span>${esc(m.species)}<small>${esc(m.locationLabel)}</small></span><strong>${esc(rankValueLabel(m,key))}</strong></button>`).join('')}</div></section>`;$('cells').innerHTML=table(left,model.rankX,METRICS[model.rankX]||'RANK A')+table(right,model.rankY||model.rankX,METRICS[model.rankY||model.rankX]||'RANK B');
  }
  function renderCross(){
    const rows=model.filtered(),xk=model.rankX,yk=model.rankY;if(!xk||!yk){$('cells').innerHTML='<p class="opf-empty">Choose RANK X and RANK Y for CROSS.</p>';return;}const xv=rows.map(m=>value(m,xk)).filter(Number.isFinite),yv=rows.map(m=>value(m,yk)).filter(Number.isFinite);const xmin=Math.min(...xv),xmax=Math.max(...xv),ymin=Math.min(...yv),ymax=Math.max(...yv);$('cells').className='opf-cross';$('cells').innerHTML=`<div class="opf-axis opf-axis-y">${esc(METRICS[yk])}</div><div class="opf-cross-plot">${rows.map(m=>{const x=value(m,xk),y=value(m,yk);if(!Number.isFinite(x)||!Number.isFinite(y))return'';const xp=xmax===xmin?50:5+90*(x-xmin)/(xmax-xmin),yp=ymax===ymin?50:95-90*(y-ymin)/(ymax-ymin);return`<button data-record="${esc(m.recordId)}" style="left:${xp.toFixed(2)}%;top:${yp.toFixed(2)}%" title="${esc(m.species)} · ${METRICS[xk]} ${x} · ${METRICS[yk]} ${y}"><img src="${m.sprite}" alt=""><span>${esc(m.species)}</span></button>`;}).join('')}<span class="opf-cross-minx">${xmin}</span><span class="opf-cross-maxx">${xmax}</span><span class="opf-cross-miny">${ymin}</span><span class="opf-cross-maxy">${ymax}</span></div><div class="opf-axis opf-axis-x">${esc(METRICS[xk])}</div>`;
  }
  function bindCells(){$('cells').querySelectorAll('[data-record]').forEach(b=>b.onclick=()=>{const m=model.records.find(x=>x.recordId===b.dataset.record);if(!m)return;if(m.source==='party'){mode('live');window.dispatchEvent(new CustomEvent('jrpg:emerald-select-party',{detail:{partySlot:m.partySlot,specimenId:m.specimenId}}));}else{globalThis.JRPGWorldTeamLab?.openSpecimen?.(m.recordId);}});}
  function render(){
    if(!section)return;const filtered=model.filtered(),total=model.active().length;$('count').textContent=`${filtered.length} / ${total} match · ${model.records.filter(x=>x.source==='party').length} party · ${model.records.filter(x=>x.source==='box').length} boxed`;
    $('chain').innerHTML=model.filters.map(p=>`<button type="button" data-facet="${esc(filterFacet(p))}">${esc(p.label)} ×</button>`).join('');$('chain').querySelectorAll('button').forEach(b=>b.onclick=()=>{model.removeFilter(b.dataset.facet);render();});
    $('focus').disabled=!model.filters.length||!filtered.length;$('focus').classList.toggle('ready',!$('focus').disabled);
    if(model.view==='dual')renderDual();else if(model.view==='cross')renderCross();else renderField(model.ordered());bindCells();
    section.querySelectorAll('[data-view]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.view===model.view)));
    if(debug)$('debug-state').textContent=JSON.stringify({records:model.records.length,boxRecords:model.records.filter(x=>x.source==='box').length,filters:model.filters,focus:model.focus?.size||null,rankX:model.rankX,rankY:model.rankY,view:model.view},null,2);
  }
  async function loadKnowledge(){try{const r=await fetch('./data/teamlab-emerald-v0.1.21.json?v=0.1.21',{cache:'force-cache'});if(r.ok)knowledge=await r.json();}catch(e){}render();}
  function attach(){
    panel=document.getElementById('pokefield-live-panel');if(!panel)return false;if(section)return true;
    nav=document.createElement('nav');nav.className='opf-nav';nav.setAttribute('aria-label','PokéField views');nav.innerHTML=['live','field','trainer'].map((x,i)=>`<button type="button" data-mode="${x}" aria-pressed="${i===0}">${['LIVE','MY FIELD','TRAINER CARD'][i]}</button>`).join('');panel.querySelector('#pf-updates').insertAdjacentElement('afterend',nav);
    section=document.createElement('section');section.id='owned-pokefield';section.hidden=true;section.innerHTML=`<div class="opf-heading"><strong>MY FIELD</strong><small>PARTY + 14 PC BOXES · REACTIVE</small></div><p id="opf-count" aria-live="polite"></p><div id="opf-chain"></div><div class="opf-reactive"><select id="opf-category" aria-label="Filter category">${options([['','FILTER BY…'],...['SPECIES','FINAL FORM','FINAL TYPE','NATURE','ABILITY','IV','EV TOTAL','HIDDEN POWER TYPE','HIDDEN POWER POWER','POKÉRUS','RIBBONS','SHINY','LEVEL','FRIENDSHIP','LOCATION','TIER','101 SUB','BASE STAT','EV TRAINED'].map(x=>[x,x])])}</select><select id="opf-value" aria-label="Filter value"></select><span id="opf-numeric" hidden><select id="opf-op"><option value=">=">≥</option><option value="=">=</option><option value="<=">≤</option></select><input id="opf-number" type="number" inputmode="numeric" step="1"></span></div><p id="opf-hint"></p><div class="opf-actions"><button id="opf-focus" type="button" disabled>FOCUS MATCHES</button><button id="opf-scatter" type="button">SCATTER</button></div><div class="opf-rank-controls"><select id="opf-rank-x">${options([['','RANK X…'],...Object.entries(METRICS)])}</select><select id="opf-rank-y">${options([['','RANK Y…'],...Object.entries(METRICS)])}</select><div><button type="button" data-view="field" aria-pressed="true">FIELD</button><button type="button" data-view="dual">DUAL RANK</button><button type="button" data-view="cross">CROSS</button></div></div><div id="opf-cells"></div>${debug?'<details><summary>DEBUG</summary><pre id="opf-debug-state"></pre></details>':''}`;
    nav.insertAdjacentElement('afterend',section);nav.querySelectorAll('button').forEach(b=>b.onclick=()=>mode(b.dataset.mode));
    $('category').onchange=()=>{picker();if(['SHINY','RIBBONS','EV TRAINED'].includes($('category').value))reactiveApply();};
    $('value').onchange=()=>{if(isNumericCategory($('category').value)){const metric=metricFor($('category').value,$('value').value);if(metric){const [min,max,def]=numericBounds(metric);$('number').min=min;$('number').max=max;$('number').value=def;reactiveApply();}}else reactiveApply();};
    $('op').onchange=reactiveApply;$('number').oninput=reactiveApply;
    $('focus').onclick=()=>{if(model.focusMatches()){render();}};$('scatter').onclick=()=>{model.scatter();$('category').value='';picker();$('rank-x').value='';$('rank-y').value='';render();};
    $('rank-x').onchange=()=>{model.setRanks($('rank-x').value,$('rank-y').value);render();};$('rank-y').onchange=()=>{model.setRanks($('rank-x').value,$('rank-y').value);if(model.rankY&&model.view==='field')model.view='dual';render();};section.querySelectorAll('[data-view]').forEach(b=>b.onclick=()=>{model.view=b.dataset.view;render();});
    model.update(globalThis.JRPGWorldEmeraldState);picker();render();loadKnowledge();return true;
  }
  window.addEventListener('jrpg:emerald-state',e=>{if(!fixture){model.update(e.detail);render();}});
  if(!attach()){const ob=new MutationObserver(()=>{if(attach())ob.disconnect();});ob.observe(document.documentElement,{childList:true,subtree:true});}
})();
