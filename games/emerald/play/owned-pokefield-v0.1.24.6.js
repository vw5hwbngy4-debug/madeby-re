/* Emerald v0.1.24.6 MY FIELD · CALL / FOCUS / SCATTER restoration
 * The Field is the user's entire owned population (party + all 14 PC boxes).
 * CALL highlights responders without removing the rest of the field.
 * FOCUS commits the responders as the working population. SCATTER returns to all owned Pokémon.
 */
(() => {
  'use strict';
  const debug=typeof location!=='undefined'&&new URLSearchParams(location.search).get('debug')==='1';
  const IV_KEYS={hp:'HP IV',atk:'ATTACK IV',def:'DEFENSE IV',spa:'SP. ATK IV',spd:'SP. DEF IV',spe:'SPEED IV'};
  const BASE_KEYS={baseHP:'BASE HP',baseAtk:'BASE ATK',baseDef:'BASE DEF',baseSpa:'BASE SP.ATK',baseSpd:'BASE SP.DEF',baseSpe:'BASE SPEED'};
  const METRICS={ivTotal:'TOTAL IV',...IV_KEYS,hpPower:'HIDDEN POWER POWER',evTotal:'EV TOTAL',level:'LEVEL',friendship:'FRIENDSHIP',ribbons:'RIBBONS',...BASE_KEYS};
  const HP_TYPES='Fighting Flying Poison Ground Rock Bug Ghost Steel Fire Water Grass Electric Psychic Ice Dragon Dark'.split(' ');
  const ALL_TYPES=['Normal',...HP_TYPES];
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const options=items=>items.map(([v,l])=>`<option value="${esc(v)}">${esc(l)}</option>`).join('');
  let knowledge=null;

  function recordKey(m,source,index){
    const specimen=`${Number(m.personality)>>>0}:${Number(m.otId)>>>0}`;
    return source==='party'?`${specimen}:P${index}`:`${specimen}:B${Number(m.storage?.box)||0}:${Number(m.storage?.slot)||0}`;
  }
  function spriteFor(m){
    const dex=Number(m.dexNo)||0;
    return m.shiny?.isShiny?`./assets/pokemon-shiny/${dex}.png`:`./assets/pokemon/${dex}.png`;
  }
  function adapt(state){
    const out=[];
    (Array.isArray(state?.party)?state.party:[]).forEach((m,i)=>{
      if(m&&Number.isInteger(m.personality)&&Number.isInteger(m.otId))out.push({...structuredClone(m),recordId:recordKey(m,'party',i),specimenId:`${m.personality>>>0}:${m.otId>>>0}`,partySlot:i,source:'party',locationLabel:`PARTY ${i+1}`,sprite:spriteFor(m),egg:m.kind==='EGG'});
    });
    (Array.isArray(state?.boxes)?state.boxes:[]).forEach((m,i)=>{
      if(m&&Number.isInteger(m.personality)&&Number.isInteger(m.otId))out.push({...structuredClone(m),recordId:recordKey(m,'box',i),specimenId:`${m.personality>>>0}:${m.otId>>>0}`,source:'box',box:Number(m.storage?.box)||0,boxSlot:Number(m.storage?.slot)||0,locationLabel:`BOX ${(Number(m.storage?.box)||0)+1}`,sprite:spriteFor(m),egg:m.kind==='EGG'});
    });
    return out;
  }
  function currentRecord(m){
    const E=globalThis.TeamLabEngine;if(!E||!knowledge)return null;
    // Save identity is truth. Resolve strategy data from the exact current species.
    return E.record(knowledge,m.dexNo);
  }
  function finalRecord(m){
    const E=globalThis.TeamLabEngine,cur=currentRecord(m);if(!E||!knowledge||!cur)return cur;
    if(!cur.evolutions?.length)return cur;
    return E.projectedRecord(knowledge,m)||cur;
  }
  function baseValue(m,key){const r=currentRecord(m),map={baseHP:'hp',baseAtk:'atk',baseDef:'def',baseSpa:'spa',baseSpd:'spd',baseSpe:'spe'};return r?.stats?.[map[key]];}
  function value(m,key){
    if(m.egg&&!['level'].includes(key))return null;
    if(key in IV_KEYS)return m.ivs?.[key];
    if(key in BASE_KEYS)return baseValue(m,key);
    if(key==='ribbons')return Number(m.ribbons?.count||0);
    if(key==='hpPower')return Number(m.hiddenPower?.power);
    return Number(m[key]);
  }
  function matches(m,p){
    if(!p)return false;
    if(p.numeric){const n=value(m,p.metric);return Number.isFinite(n)&&(p.op==='='?n===p.number:p.op==='<='?n<=p.number:n>=p.number);}
    const cur=currentRecord(m),fin=finalRecord(m);
    switch(p.category){
      case 'PARTY':return m.source==='party';
      case 'SPECIES':return m.species===p.value;
      case 'TYPE':return cur?.types?.includes(p.value);
      case 'FINAL FORM':return fin?.name===p.value;
      case 'FINAL TYPE':return fin?.types?.includes(p.value);
      case 'NATURE':return m.nature===p.value;
      case 'ABILITY':return String(m.ability||'')===p.value;
      case 'MOVE':return (m.moves||[]).some(x=>String(x?.name||'')===p.value);
      case 'HIDDEN POWER TYPE':return m.hiddenPower?.type===p.value;
      case 'POKÉRUS':return m.pokerus?.state===p.value;
      case 'SHINY':return !!m.shiny?.isShiny;
      case 'RIBBONS':return Number(m.ribbons?.count||0)>0;
      case 'EV TRAINED':return Number(m.evTotal||0)>0;
      case 'LOCATION':return p.value==='PARTY'?m.source==='party':p.value==='BOXES'?m.source==='box':m.locationLabel===p.value;
      case 'TIER':return fin?.tier===p.value;
      default:return false;
    }
  }

  class FieldModel{
    constructor(){this.records=[];this.focus=null;this.call=null;this.responders=new Set();}
    update(state){
      this.records=adapt(state);
      const known=new Set(this.records.map(x=>x.recordId));
      if(this.focus)this.focus=new Set([...this.focus].filter(x=>known.has(x)));
      if(this.call)this.runCall(this.call);
    }
    active(){return this.records.filter(m=>this.focus===null||this.focus.has(m.recordId));}
    runCall(p){this.call=p;this.responders=new Set(this.active().filter(m=>matches(m,p)).map(m=>m.recordId));return this.responders.size;}
    clearCall(){this.call=null;this.responders.clear();}
    focusResponses(){if(!this.call||!this.responders.size)return false;this.focus=new Set(this.responders);this.clearCall();return true;}
    scatter(){this.focus=null;this.clearCall();}
  }
  if(typeof module!=='undefined')module.exports={adapt,value,matches,FieldModel};
  if(typeof document==='undefined')return;

  const model=new FieldModel();let panel,section,nav,activeRecord=null,activeMode='live';
  const $=id=>section?.querySelector('#opf-'+id);
  function paintMode(next){activeMode=next;panel.classList.toggle('opf-show',next==='field');section.hidden=next!=='field';nav?.querySelectorAll('button').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.mode===next)));}
  function mode(next){if(next==='trainer'&&activeMode==='trainer')next='live';paintMode(next);const tc=globalThis.JRPGWorldEmeraldTrainerCard;if(next==='trainer')tc?.flipToTrainer();else tc?.flipToLive();}
  function uniqueValues(fn){return [...new Set(model.records.map(fn).filter(Boolean))].sort();}
  function categoryConfig(category){
    const current=()=>model.records.map(currentRecord).filter(Boolean), finals=()=>model.records.map(finalRecord).filter(Boolean);
    if(category==='SPECIES')return uniqueValues(m=>m.species).map(x=>[x,x]);
    if(category==='TYPE')return ALL_TYPES.filter(t=>current().some(r=>r.types?.includes(t))).map(x=>[x,x]);
    if(category==='FINAL FORM')return [...new Set(finals().map(r=>r.name))].sort().map(x=>[x,x]);
    if(category==='FINAL TYPE')return ALL_TYPES.filter(t=>finals().some(r=>r.types?.includes(t))).map(x=>[x,x]);
    if(category==='NATURE')return uniqueValues(m=>m.nature).map(x=>[x,x]);
    if(category==='ABILITY')return uniqueValues(m=>m.ability).map(x=>[x,x]);
    if(category==='MOVE')return [...new Set(model.records.flatMap(m=>(m.moves||[]).map(x=>x?.name).filter(Boolean)))].sort().map(x=>[x,x]);
    if(category==='HIDDEN POWER TYPE')return HP_TYPES.map(x=>[x,x]);
    if(category==='POKÉRUS')return [['active','ACTIVE'],['cured','CURED'],['none','NONE']];
    if(category==='LOCATION')return [['PARTY','PARTY'],['BOXES','ALL BOXES'],...Array.from({length:14},(_,i)=>[`BOX ${i+1}`,`BOX ${i+1}`])];
    if(category==='TIER')return ['Uber','OU','UUBL','UU','RUBL','RU','NUBL','NU','PUBL','PU','ZUBL','ZU','NFE','LC','—'].filter(t=>finals().some(r=>r.tier===t)).map(x=>[x,x]);
    if(category==='IV')return Object.entries({ivTotal:'TOTAL IV',...IV_KEYS});
    if(category==='BASE STAT')return Object.entries(BASE_KEYS);
    return [];
  }
  function isNumericCategory(c){return ['IV','LEVEL','HIDDEN POWER POWER','EV TOTAL','FRIENDSHIP','BASE STAT'].includes(c);}
  function metricFor(c,v){if(c==='IV')return v;if(c==='LEVEL')return'level';if(c==='HIDDEN POWER POWER')return'hpPower';if(c==='EV TOTAL')return'evTotal';if(c==='FRIENDSHIP')return'friendship';if(c==='BASE STAT')return v;return null;}
  function numericBounds(metric){if(metric==='hpPower')return[30,70,70];if(metric==='level')return[1,100,50];if(metric==='ivTotal')return[0,186,150];if(metric in IV_KEYS)return[0,31,25];if(metric==='evTotal')return[0,510,252];if(metric==='friendship')return[0,255,200];if(metric in BASE_KEYS)return[1,255,100];return[0,999,0];}
  function makePredicate(){
    const c=$('category')?.value;if(!c)return null;
    if(['PARTY','SHINY','RIBBONS','EV TRAINED'].includes(c))return{category:c,value:true,label:c==='PARTY'?'PARTY':c};
    if(isNumericCategory(c)){
      const metric=metricFor(c,$('value')?.value);if(!metric)return null;const [min,max]=numericBounds(metric),number=Number($('number')?.value);if(!Number.isFinite(number)||number<min||number>max)return null;const op=$('op').value;return{category:c,metric,numeric:true,op,number,label:`${METRICS[metric]} ${op==='>='?'≥':op==='<='?'≤':'='} ${number}`};
    }
    const v=$('value')?.value;if(!v)return null;return{category:c,value:v,label:c==='HIDDEN POWER TYPE'?`HIDDEN POWER ${v}`:`${c} · ${v}`};
  }
  function picker(){
    const c=$('category').value,items=categoryConfig(c),valueEl=$('value'),numeric=$('numeric');
    valueEl.innerHTML=options([['','CHOOSE…'],...items]);
    valueEl.hidden=['PARTY','SHINY','RIBBONS','EV TRAINED'].includes(c)||!c;
    numeric.hidden=true;
    if(isNumericCategory(c)&&c!=='LEVEL'&&c!=='HIDDEN POWER POWER'&&c!=='EV TOTAL'&&c!=='FRIENDSHIP')valueEl.hidden=false;
    if(['LEVEL','HIDDEN POWER POWER','EV TOTAL','FRIENDSHIP'].includes(c)){
      const metric=metricFor(c,'');const [min,max,def]=numericBounds(metric);$('number').min=min;$('number').max=max;$('number').value=def;valueEl.hidden=true;numeric.hidden=false;
    }
    updateCallReady();
  }
  function valueChanged(){
    const c=$('category').value;
    if(isNumericCategory(c)){
      const metric=metricFor(c,$('value').value);
      if(metric){const [min,max,def]=numericBounds(metric);$('number').min=min;$('number').max=max;if(!$('number').value)$('number').value=def;$('numeric').hidden=false;}
    }
    updateCallReady();
  }
  function updateCallReady(){$('call-go').disabled=!makePredicate();}
  function openSheet(){section.classList.add('opf-sheet-open');$('sheet').hidden=false;requestAnimationFrame(()=>$('category')?.focus());}
  function closeSheet(){section.classList.remove('opf-sheet-open');$('sheet').hidden=true;}
  function runCall(){const p=makePredicate();if(!p)return;model.runCall(p);closeSheet();render();}
  function cell(m){
    const flags=[];if(m.source==='party')flags.push('PARTY');else flags.push(`BOX ${m.box+1}`);if(m.shiny?.isShiny)flags.push('SHINY');if(m.pokerus?.state==='active')flags.push('PKRS');else if(m.pokerus?.state==='cured')flags.push('PKRS CURED');if(m.heldItem)flags.push(m.heldItem);
    const answering=model.call&&model.responders.has(m.recordId),subdued=model.call&&!answering;
    return `<button type="button" class="opf-cell${answering?' answer':''}${subdued?' subdued':''}" data-record="${esc(m.recordId)}" title="${esc(m.species)}"><span class="opf-hex">${m.egg?'<span class="opf-egg">🥚</span>':`<img src="${m.sprite}" alt="${esc(m.species)}" loading="lazy">`}</span><strong>${esc(m.egg?'EGG':m.species)} ${m.egg?'':esc(m.genderSymbol||'')}</strong><small>${m.level?`Lv${m.level}`:'Lv?'} · ${esc(m.locationLabel)}</small><span class="opf-flags">${esc(flags.join(' · '))}</span></button>`;
  }
  function publishSelection(m){if(!m)return;activeRecord=m.recordId;try{window.dispatchEvent(new CustomEvent('jrpg:strategy-context',{detail:{source:'field',specimenId:m.specimenId,recordId:m.recordId,partySlot:Number.isInteger(m.partySlot)?m.partySlot:null,dexNo:m.dexNo,species:m.species,location:m.locationLabel}}));}catch(e){}}
  function bindCells(){$('cells').querySelectorAll('[data-record]').forEach(b=>b.onclick=()=>{const m=model.records.find(x=>x.recordId===b.dataset.record);if(!m)return;publishSelection(m);if(m.source==='party'){window.dispatchEvent(new CustomEvent('jrpg:emerald-select-party',{detail:{partySlot:m.partySlot,specimenId:m.specimenId}}));}else globalThis.JRPGWorldTeamLab?.openSpecimen?.(m.recordId);});}
  function render(){
    if(!section)return;
    const active=model.active(),party=model.records.filter(x=>x.source==='party').length,boxed=model.records.filter(x=>x.source==='box').length;
    $('count').textContent=`OWNED ${model.records.length} · PARTY ${party} · BOXED ${boxed}${model.focus?` · FOCUS ${active.length}`:''}`;
    $('call-state').textContent=model.call?`${model.call.label} · ${model.responders.size} answered`:model.focus?`Focused field · ${active.length} Pokémon`:'All owned Pokémon';
    $('cells').innerHTML=active.map(cell).join('')||'<p class="opf-empty">Your Field is empty. Party and PC Box Pokémon appear here automatically.</p>';
    $('focus').hidden=!model.call;$('focus').disabled=!model.responders.size;$('focus').textContent=`FOCUS ${model.responders.size}`;
    $('scatter').hidden=!model.call&&!model.focus;
    $('call-main').textContent=model.call?'📯 NEW CALL':'📯 CALL';
    bindCells();
    if(activeRecord){const a=section.querySelector(`[data-record="${CSS.escape(activeRecord)}"]`);a?.classList.add('selected-context');}
    if(debug)$('debug-state').textContent=JSON.stringify({records:model.records.length,active:active.length,call:model.call,responders:model.responders.size,focus:model.focus?.size||null},null,2);
  }
  function markup(){return `<div class="opf-heading"><div><strong>MY FIELD</strong><small>PARTY + 14 PC BOXES</small></div><p id="opf-count" aria-live="polite"></p></div><p id="opf-call-state" class="opf-call-state">All owned Pokémon</p><div id="opf-cells"></div><div class="opf-command-dock" role="toolbar" aria-label="Field commands"><button id="opf-call-main" type="button">📯 CALL</button><button id="opf-focus" type="button" hidden>FOCUS</button><button id="opf-scatter" type="button" hidden>SCATTER</button></div><div id="opf-sheet" class="opf-call-sheet" hidden><button id="opf-sheet-backdrop" class="opf-sheet-backdrop" type="button" aria-label="Close call menu"></button><section class="opf-sheet-card" role="dialog" aria-modal="true" aria-label="Load a call"><header><div><small>LOAD A FILTER</small><strong>📯 CALL</strong></div><button id="opf-sheet-close" type="button" aria-label="Close">×</button></header><div class="opf-sheet-controls"><select id="opf-category" aria-label="Call category">${options([['','WHAT ARE YOU LOOKING FOR?'],['PARTY','PARTY'],['SHINY','SHINY'],['SPECIES','SPECIES'],['TYPE','TYPE'],['MOVE','MOVE'],['NATURE','NATURE'],['ABILITY','ABILITY'],['IV','IV'],['EV TOTAL','EV TOTAL'],['HIDDEN POWER TYPE','HIDDEN POWER TYPE'],['HIDDEN POWER POWER','HIDDEN POWER POWER'],['POKÉRUS','POKÉRUS'],['RIBBONS','RIBBONS'],['LEVEL','LEVEL'],['FRIENDSHIP','FRIENDSHIP'],['LOCATION','LOCATION'],['FINAL FORM','FINAL FORM'],['FINAL TYPE','FINAL TYPE'],['TIER','TIER'],['BASE STAT','BASE STAT'],['EV TRAINED','EV TRAINED']])}</select><select id="opf-value" aria-label="Call value" hidden></select><span id="opf-numeric" hidden><select id="opf-op" aria-label="Comparison"><option value=">=">≥</option><option value="=">=</option><option value="<=">≤</option></select><input id="opf-number" aria-label="Threshold" type="number" inputmode="numeric" step="1"></span><button id="opf-call-go" type="button" disabled>📯 CALL</button></div><p>Choose the call here. The Field stays behind it. CALL only makes matching Pokémon answer; it does not remove the others.</p></section></div>${debug?'<details><summary>DEBUG</summary><pre id="opf-debug-state"></pre></details>':''}`;}
  function wire(){
    $('call-main').onclick=openSheet;$('sheet-close').onclick=closeSheet;$('sheet-backdrop').onclick=closeSheet;$('call-go').onclick=runCall;
    $('category').onchange=picker;$('value').onchange=valueChanged;$('op').onchange=updateCallReady;$('number').oninput=updateCallReady;
    $('focus').onclick=()=>{if(model.focusResponses())render();};$('scatter').onclick=()=>{model.scatter();render();};
  }
  async function loadKnowledge(){try{const r=await fetch('./data/teamlab-emerald-v0.1.21.json?v=0.1.21',{cache:'force-cache'});if(r.ok)knowledge=await r.json();}catch(e){}render();}
  function attach(){
    panel=document.getElementById('pokefield-live-panel');if(!panel)return false;if(section)return true;
    nav=document.createElement('nav');nav.className='opf-nav';nav.setAttribute('aria-label','PokéField views');nav.innerHTML=['live','field','trainer'].map((x,i)=>`<button type="button" data-mode="${x}" aria-pressed="${i===0}">${['LIVE','MY FIELD','TRAINER CARD'][i]}</button>`).join('');
    panel.querySelector('#pf-updates').insertAdjacentElement('afterend',nav);
    section=document.createElement('section');section.id='owned-pokefield';section.hidden=true;section.innerHTML=markup();nav.insertAdjacentElement('afterend',section);nav.querySelectorAll('button').forEach(b=>b.onclick=()=>mode(b.dataset.mode));wire();model.update(globalThis.JRPGWorldEmeraldState);render();loadKnowledge();return true;
  }
  window.addEventListener('jrpg:emerald-state',e=>{model.update(e.detail);render();});
  window.addEventListener('jrpg:trainer-card-view',e=>{const view=e.detail?.view;if(view==='trainer')paintMode('trainer');else if(view==='live'&&activeMode==='trainer')paintMode('live');});
  globalThis.JRPGWorldMyField={selectSpecimen(specimenId){const m=model.records.find(x=>x.specimenId===specimenId||x.recordId===specimenId);if(!m)return false;publishSelection(m);render();return true;},show(){nav?.querySelector('[data-mode="field"]')?.click();}};
  if(!attach()){const ob=new MutationObserver(()=>{if(attach())ob.disconnect();});ob.observe(document.documentElement,{childList:true,subtree:true});}
})();
