/* Emerald v0.1.24.7 · POKÉFIELD SPECIES FIELD RESET
 * FIELD = all 386 Gen III species. The user's party / PC boxes are semantic metadata on species.
 * CALL highlights matching species without removing the field. FOCUS commits responders.
 * SCATTER restores all 386. RANK is a vertical S/A/B/C/D presentation of the current field.
 */
(() => {
  'use strict';
  const debug=typeof location!=='undefined'&&new URLSearchParams(location.search).get('debug')==='1';
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const option=(v,l)=>`<option value="${esc(v)}">${esc(l)}</option>`;
  const HP_TYPES='Fighting Flying Poison Ground Rock Bug Ghost Steel Fire Water Grass Electric Psychic Ice Dragon Dark'.split(' ');
  const RANK_METRICS={bst:'BASE STAT TOTAL',hp:'BASE HP',atk:'BASE ATTACK',def:'BASE DEFENSE',spa:'BASE SP. ATK',spd:'BASE SP. DEF',spe:'BASE SPEED',owned:'OWNED COUNT',bestIv:'BEST OWNED IV TOTAL'};
  let knowledge=null, section=null, panel=null, nav=null, activeMode='live';

  function ownedRecords(state){
    const out=[];
    const add=(m,source,index)=>{
      if(!m||!Number.isInteger(m.dexNo)||m.dexNo<1||m.dexNo>386)return;
      out.push({...m,source,partySlot:source==='party'?index:null,location:source==='party'?`PARTY ${index+1}`:`BOX ${(Number(m.storage?.box)||0)+1}`});
    };
    (Array.isArray(state?.party)?state.party:[]).forEach((m,i)=>add(m,'party',i));
    (Array.isArray(state?.boxes)?state.boxes:[]).forEach((m,i)=>add(m,'box',i));
    return out;
  }
  function speciesFromKnowledge(){
    if(!knowledge?.species)return [];
    return Array.from({length:386},(_,i)=>{
      const dex=i+1, r=knowledge.species[String(dex)]||knowledge.species[dex];
      if(!r)return null;
      const stats=r.stats||{};
      return {dex,name:r.name||`#${dex}`,types:r.types||[],abilities:r.abilities||[],tier:r.tier||'—',stats,bst:Object.values(stats).reduce((a,b)=>a+(Number(b)||0),0),moves:new Set([...(r.familyMoves||[]),...(r.levelUp||[]).map(x=>x.move),...(r.tmhm||[]),...(r.tutors||[]),...(r.eggMoves||[])]),record:r,owned:[]};
    }).filter(Boolean);
  }
  function moveNameToConstant(name){return 'MOVE_'+String(name||'').toUpperCase().replace(/[^A-Z0-9]+/g,'_').replace(/^_|_$/g,'');}
  function aggregateOwned(species, state){
    const byDex=new Map();
    ownedRecords(state).forEach(m=>{if(!byDex.has(m.dexNo))byDex.set(m.dexNo,[]);byDex.get(m.dexNo).push(m);});
    species.forEach(s=>{s.owned=byDex.get(s.dex)||[];s.ownedCount=s.owned.length;s.partyCount=s.owned.filter(m=>m.source==='party').length;s.shinyCount=s.owned.filter(m=>m.shiny?.isShiny).length;s.bestIv=s.owned.reduce((a,m)=>Math.max(a,Number(m.ivTotal)||0),-1);});
  }
  function anyOwned(s,fn){return s.owned.some(fn);}
  function numericAny(s,metric,op,n){
    let values=[];
    if(metric==='bestIv')values=s.owned.map(m=>Number(m.ivTotal));
    else if(metric.startsWith('iv:')){const k=metric.split(':')[1];values=s.owned.map(m=>Number(m.ivs?.[k]));}
    else if(metric==='level')values=s.owned.map(m=>Number(m.level));
    else if(metric==='hpPower')values=s.owned.map(m=>Number(m.hiddenPower?.power));
    else if(metric in s.stats)values=[Number(s.stats[metric])];
    else if(metric==='bst')values=[Number(s.bst)];
    return values.some(v=>Number.isFinite(v)&&(op==='='?v===n:op==='<='?v<=n:v>=n));
  }
  function matches(s,p){
    if(!p)return false;
    if(p.numeric)return numericAny(s,p.metric,p.op,p.number);
    switch(p.category){
      case 'OWNED': return s.ownedCount>0;
      case 'PARTY': return s.partyCount>0;
      case 'SHINY OWNED': return s.shinyCount>0;
      case 'SPECIES': return s.name===p.value;
      case 'TYPE': return s.types.includes(p.value);
      case 'ABILITY': return s.abilities.includes(p.value);
      case 'MOVE': return s.moves.has(moveNameToConstant(p.value)) || s.moves.has(p.value);
      case 'TIER': return s.tier===p.value;
      case 'NATURE OWNED': return anyOwned(s,m=>m.nature===p.value);
      case 'HIDDEN POWER TYPE': return anyOwned(s,m=>m.hiddenPower?.type===p.value);
      case 'POKÉRUS OWNED': return anyOwned(s,m=>m.pokerus?.state===p.value);
      case 'HELD ITEM OWNED': return anyOwned(s,m=>String(m.heldItem||'')===p.value);
      default:return false;
    }
  }
  function metricValue(s,key){
    if(key==='owned')return s.ownedCount;
    if(key==='bestIv')return s.bestIv>=0?s.bestIv:null;
    if(key==='bst')return s.bst;
    return Number(s.stats?.[key]);
  }
  class FieldModel{
    constructor(){this.species=[];this.focus=null;this.call=null;this.responders=new Set();this.rank=null;this.selectedTier=null;}
    setSpecies(list){this.species=list;}
    updateOwned(state){aggregateOwned(this.species,state);if(this.call)this.runCall(this.call);}
    active(){return this.species.filter(s=>this.focus===null||this.focus.has(s.dex));}
    runCall(p){this.call=p;this.rank=null;this.selectedTier=null;this.responders=new Set(this.active().filter(s=>matches(s,p)).map(s=>s.dex));return this.responders.size;}
    clearCall(){this.call=null;this.responders.clear();}
    focusResponses(){if(!this.responders.size)return false;this.focus=new Set(this.responders);this.clearCall();this.rank=null;this.selectedTier=null;return true;}
    scatter(){this.focus=null;this.clearCall();this.rank=null;this.selectedTier=null;}
    setRank(key){this.rank=key;this.clearCall();this.selectedTier=null;}
    exitRank(){this.rank=null;this.selectedTier=null;this.responders.clear();}
    tierGroups(){
      const rows=this.active().map(s=>[s,metricValue(s,this.rank)]).filter(([,v])=>Number.isFinite(v)).sort((a,b)=>b[1]-a[1]||a[0].dex-b[0].dex);
      if(!rows.length)return {S:[],A:[],B:[],C:[],D:[],ranges:{}};
      const groups={S:[],A:[],B:[],C:[],D:[]}, labels=['S','A','B','C','D'];
      rows.forEach((row,i)=>groups[labels[Math.min(4,Math.floor(i*5/rows.length))]].push(row[0]));
      const ranges={};labels.forEach(t=>{const vals=groups[t].map(s=>metricValue(s,this.rank));ranges[t]=vals.length?`${Math.min(...vals)}–${Math.max(...vals)}`:'—';});
      return {...groups,ranges};
    }
    selectTier(t){const g=this.tierGroups()[t]||[];this.selectedTier=t;this.responders=new Set(g.map(s=>s.dex));}
  }
  const model=new FieldModel();
  const $=id=>section?.querySelector('#opf-'+id);
  function paintMode(next){activeMode=next;panel?.classList.toggle('opf-show',next==='field');if(section)section.hidden=next!=='field';nav?.querySelectorAll('button').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.mode===next)));}
  function mode(next){if(next==='trainer'&&activeMode==='trainer')next='live';paintMode(next);const tc=globalThis.JRPGWorldEmeraldTrainerCard;if(next==='trainer')tc?.flipToTrainer();else tc?.flipToLive();}
  function speciesChoices(){return model.species.map(s=>[s.name,s.name]);}
  function uniqueOwned(key){return [...new Set(model.species.flatMap(s=>s.owned.map(m=>m[key])).filter(Boolean))].sort().map(x=>[x,x]);}
  function categoryItems(c){
    if(c==='SPECIES')return speciesChoices();
    if(c==='TYPE')return [...new Set(model.species.flatMap(s=>s.types))].sort().map(x=>[x,x]);
    if(c==='ABILITY')return [...new Set(model.species.flatMap(s=>s.abilities))].sort().map(x=>[x,x]);
    if(c==='MOVE'){const names=new Set();Object.values(knowledge?.moves||{}).forEach(m=>{if(m?.name)names.add(m.name)});return [...names].sort().map(x=>[x,x]);}
    if(c==='TIER')return [...new Set(model.species.map(s=>s.tier).filter(Boolean))].sort().map(x=>[x,x]);
    if(c==='NATURE OWNED')return uniqueOwned('nature');
    if(c==='HIDDEN POWER TYPE')return HP_TYPES.map(x=>[x,x]);
    if(c==='POKÉRUS OWNED')return [['active','ACTIVE'],['cured','CURED'],['none','NONE']];
    if(c==='HELD ITEM OWNED')return uniqueOwned('heldItem');
    if(c==='IV OWNED')return [['bestIv','TOTAL IV'],['iv:hp','HP IV'],['iv:atk','ATTACK IV'],['iv:def','DEFENSE IV'],['iv:spa','SP. ATK IV'],['iv:spd','SP. DEF IV'],['iv:spe','SPEED IV']];
    if(c==='BASE STAT')return [['hp','HP'],['atk','ATTACK'],['def','DEFENSE'],['spa','SP. ATK'],['spd','SP. DEF'],['spe','SPEED'],['bst','TOTAL']];
    return [];
  }
  function isImmediate(c){return ['OWNED','PARTY','SHINY OWNED'].includes(c);}
  function isNumeric(c){return ['IV OWNED','BASE STAT','LEVEL OWNED','HIDDEN POWER POWER'].includes(c);}
  function numericMetric(c,v){if(c==='IV OWNED')return v;if(c==='BASE STAT')return v;if(c==='LEVEL OWNED')return'level';if(c==='HIDDEN POWER POWER')return'hpPower';return null;}
  function numericBounds(metric){if(metric==='bestIv')return[0,186,150];if(metric?.startsWith('iv:'))return[0,31,25];if(metric==='level')return[1,100,50];if(metric==='hpPower')return[30,70,60];if(metric==='bst')return[100,720,500];return[1,255,100];}
  function predicate(){
    const c=$('category')?.value;if(!c)return null;
    if(isImmediate(c))return{category:c,label:c};
    if(isNumeric(c)){
      const metric=numericMetric(c,$('value')?.value);if(!metric)return null;
      const number=Number($('number')?.value),[min,max]=numericBounds(metric);if(!Number.isFinite(number)||number<min||number>max)return null;
      const op=$('op').value;const labels={bestIv:'TOTAL IV','iv:hp':'HP IV','iv:atk':'ATTACK IV','iv:def':'DEFENSE IV','iv:spa':'SP. ATK IV','iv:spd':'SP. DEF IV','iv:spe':'SPEED IV',level:'LEVEL',hpPower:'HP POWER',hp:'BASE HP',atk:'BASE ATTACK',def:'BASE DEFENSE',spa:'BASE SP. ATK',spd:'BASE SP. DEF',spe:'BASE SPEED',bst:'BST'};
      return{category:c,numeric:true,metric,op,number,label:`${labels[metric]||metric} ${op==='>='?'≥':op==='<='?'≤':'='} ${number}`};
    }
    const v=$('value')?.value;if(!v)return null;return{category:c,value:v,label:`${c} · ${v}`};
  }
  function configurePicker(){
    const c=$('category').value, items=categoryItems(c), value=$('value'), numeric=$('numeric');
    value.innerHTML=option('','CHOOSE…')+items.map(([v,l])=>option(v,l)).join('');
    value.hidden=isImmediate(c)||['LEVEL OWNED','HIDDEN POWER POWER'].includes(c)||!c;
    numeric.hidden=!isNumeric(c);
    if(isNumeric(c)&&['LEVEL OWNED','HIDDEN POWER POWER'].includes(c)){const metric=numericMetric(c,'');const [min,max,def]=numericBounds(metric);$('number').min=min;$('number').max=max;$('number').value=def;}
    updateCallReady();
  }
  function configureNumeric(){
    const c=$('category').value;if(!isNumeric(c))return;
    const metric=numericMetric(c,$('value').value);if(!metric)return;
    const [min,max,def]=numericBounds(metric);$('number').min=min;$('number').max=max;if($('number').value===''||Number($('number').value)<min||Number($('number').value)>max)$('number').value=def;$('numeric').hidden=false;updateCallReady();
  }
  function updateCallReady(){$('call-go').disabled=!predicate();}
  function openSheet(tab='call'){$('sheet').hidden=false;section.classList.add('opf-sheet-open');setSheetTab(tab);}
  function closeSheet(){$('sheet').hidden=true;section.classList.remove('opf-sheet-open');}
  function setSheetTab(tab){$('sheet-call').hidden=tab!=='call';$('sheet-rank').hidden=tab!=='rank';$('tab-call').setAttribute('aria-pressed',String(tab==='call'));$('tab-rank').setAttribute('aria-pressed',String(tab==='rank'));}
  function runCall(){const p=predicate();if(!p)return;model.runCall(p);closeSheet();render();}
  function runRank(){const key=$('rank-metric').value;if(!key)return;model.setRank(key);closeSheet();render();}
  function publishSpecies(s){try{window.dispatchEvent(new CustomEvent('jrpg:strategy-context',{detail:{source:'field-species',dexNo:s.dex,species:s.name,owned:s.ownedCount,party:s.partyCount}}));}catch(e){};if(s.owned.length===1){const m=s.owned[0];try{window.dispatchEvent(new CustomEvent('jrpg:emerald-select-party',{detail:{partySlot:m.partySlot,species:s.name}}));}catch(e){}}}
  function cell(s,compact=false){
    const answer=model.responders.has(s.dex), subdued=model.call&&!answer;
    const badges=[];if(s.partyCount)badges.push(`P${s.partyCount}`);else if(s.ownedCount)badges.push(`×${s.ownedCount}`);if(s.shinyCount)badges.push('★');
    return `<button type="button" class="opf-species${answer?' answer':''}${subdued?' subdued':''}${s.ownedCount?' owned':''}" data-dex="${s.dex}" aria-label="#${s.dex} ${esc(s.name)}${s.ownedCount?`, owned ${s.ownedCount}`:''}"><span class="opf-ball"><img src="./assets/pokemon/${s.dex}.png" alt="" loading="lazy"></span>${compact?'':`<strong>${esc(s.name)}</strong><small>#${String(s.dex).padStart(3,'0')}</small>`}${badges.length?`<span class="opf-badges">${badges.map(b=>`<i>${esc(b)}</i>`).join('')}</span>`:''}</button>`;
  }
  function bindCells(){section.querySelectorAll('[data-dex]').forEach(b=>b.onclick=()=>{const s=model.species.find(x=>x.dex===Number(b.dataset.dex));if(s)publishSpecies(s);});section.querySelectorAll('[data-tier]').forEach(b=>b.onclick=()=>{model.selectTier(b.dataset.tier);render();});}
  function rankHtml(){
    const groups=model.tierGroups(), labels=['S','A','B','C','D'];
    return `<div class="opf-tier-list">${labels.map(t=>`<section class="opf-tier-row${model.selectedTier===t?' selected':''}"><button type="button" class="opf-tier-label" data-tier="${t}" aria-pressed="${model.selectedTier===t}"><b>${t}</b><small>${esc(groups.ranges[t])}</small></button><div class="opf-tier-members">${groups[t].map(s=>cell(s,true)).join('')||'<span class="opf-none">—</span>'}</div></section>`).join('')}</div>`;
  }
  function render(){
    if(!section)return;
    const active=model.active(), owned=model.species.reduce((n,s)=>n+(s.ownedCount?1:0),0), specimens=model.species.reduce((n,s)=>n+s.ownedCount,0);
    $('count').textContent=`${active.length} SPECIES · ${owned} OWNED SPECIES · ${specimens} SPECIMENS`;
    $('state').textContent=model.rank?`RANK · ${RANK_METRICS[model.rank]}`:model.call?`${model.call.label} · ${model.responders.size} ANSWERED`:model.focus?`FOCUS · ${active.length} SPECIES`:'GEN III · ALL 386 SPECIES';
    $('field').innerHTML=model.rank?rankHtml():`<div id="opf-cells">${active.map(s=>cell(s)).join('')}</div>`;
    $('call-main').hidden=!!model.rank;
    $('focus').hidden=!model.responders.size;$('focus').textContent=`FOCUS ${model.responders.size}`;
    $('rank-main').hidden=!model.call||!model.responders.size||!!model.rank;
    $('scatter').hidden=!model.call&&!model.focus&&!model.rank;
    $('field-main').hidden=!model.rank;
    bindCells();
    if(debug)$('debug-state').textContent=JSON.stringify({species:model.species.length,active:active.length,focus:model.focus?.size||null,call:model.call,responders:model.responders.size,rank:model.rank,selectedTier:model.selectedTier},null,2);
  }
  function markup(){
    const categories=[['','LOAD A FILTER…'],['OWNED','OWNED'],['PARTY','PARTY'],['SHINY OWNED','SHINY OWNED'],['SPECIES','SPECIES'],['TYPE','TYPE'],['ABILITY','ABILITY'],['MOVE','MOVE / LEARNSET'],['TIER','COMPETITIVE TIER'],['BASE STAT','BASE STAT'],['IV OWNED','OWNED IV'],['NATURE OWNED','OWNED NATURE'],['HIDDEN POWER TYPE','OWNED HIDDEN POWER TYPE'],['HIDDEN POWER POWER','OWNED HIDDEN POWER POWER'],['LEVEL OWNED','OWNED LEVEL'],['POKÉRUS OWNED','OWNED POKÉRUS'],['HELD ITEM OWNED','OWNED HELD ITEM']];
    return `<header class="opf-heading"><div><strong>POKÉFIELD</strong><small>GEN III SPECIES FIELD</small></div><p id="opf-count"></p></header><p id="opf-state" class="opf-state">GEN III · ALL 386 SPECIES</p><div id="opf-field"></div><div class="opf-command-dock"><button id="opf-call-main" type="button">📯 CALL</button><button id="opf-rank-main" type="button" hidden>RANK</button><button id="opf-focus" type="button" hidden>FOCUS</button><button id="opf-field-main" type="button" hidden>FIELD</button><button id="opf-scatter" type="button" hidden>SCATTER</button></div><div id="opf-sheet" class="opf-sheet" hidden><button id="opf-sheet-backdrop" class="opf-sheet-backdrop" type="button" aria-label="Close"></button><section class="opf-sheet-card" role="dialog" aria-modal="true"><header><div><small>FIELD COMMAND</small><strong>📯 POKÉFIELD</strong></div><button id="opf-sheet-close" type="button" aria-label="Close">×</button></header><div class="opf-sheet-tabs"><button id="opf-tab-call" type="button" aria-pressed="true">CALL</button><button id="opf-tab-rank" type="button" aria-pressed="false">RANK</button></div><div id="opf-sheet-call"><select id="opf-category" aria-label="Call filter">${categories.map(([v,l])=>option(v,l)).join('')}</select><select id="opf-value" aria-label="Filter value" hidden></select><div id="opf-numeric" class="opf-numeric" hidden><select id="opf-op" aria-label="Comparison"><option value=">=">≥</option><option value="=">=</option><option value="<=">≤</option></select><input id="opf-number" type="number" inputmode="numeric" enterkeyhint="done" pattern="[0-9]*" step="1" aria-label="Number"></div><button id="opf-call-go" type="button" disabled>📯 CALL FIELD</button><p>Matching species answer in place. Your 386-species field stays visible behind this sheet.</p></div><div id="opf-sheet-rank" hidden><select id="opf-rank-metric" aria-label="Rank metric">${option('','RANK BY…')+Object.entries(RANK_METRICS).map(([v,l])=>option(v,l)).join('')}</select><button id="opf-rank-go" type="button">RANK INTO S / A / B / C / D</button><p>RANK changes presentation, not membership. Tap a tier, then FOCUS it.</p></div></section></div>${debug?'<details><summary>DEBUG</summary><pre id="opf-debug-state"></pre></details>':''}`;
  }
  function wire(){
    $('call-main').onclick=()=>openSheet('call');$('rank-main').onclick=()=>openSheet('rank');$('sheet-close').onclick=closeSheet;$('sheet-backdrop').onclick=closeSheet;
    $('tab-call').onclick=()=>setSheetTab('call');$('tab-rank').onclick=()=>setSheetTab('rank');$('category').onchange=configurePicker;$('value').onchange=configureNumeric;$('op').onchange=updateCallReady;$('number').oninput=updateCallReady;$('call-go').onclick=runCall;$('rank-go').onclick=runRank;
    $('focus').onclick=()=>{if(model.focusResponses())render();};$('scatter').onclick=()=>{model.scatter();render();};$('field-main').onclick=()=>{model.exitRank();render();};
  }
  async function loadKnowledge(){
    try{const r=await fetch('./data/teamlab-emerald-v0.1.21.json?v=0.1.21',{cache:'force-cache'});if(!r.ok)throw new Error(`HTTP ${r.status}`);knowledge=await r.json();model.setSpecies(speciesFromKnowledge());model.updateOwned(globalThis.JRPGWorldEmeraldState);render();}catch(e){if($('field'))$('field').innerHTML=`<p class="opf-load-error">Could not load the 386-species field.</p>`;}
  }
  function attach(){
    panel=document.getElementById('pokefield-live-panel');if(!panel)return false;if(section)return true;
    nav=document.createElement('nav');nav.className='opf-nav';nav.setAttribute('aria-label','PokéField views');nav.innerHTML=[['live','LIVE'],['field','FIELD'],['trainer','TRAINER CARD']].map(([m,l],i)=>`<button type="button" data-mode="${m}" aria-pressed="${i===0}">${l}</button>`).join('');
    panel.querySelector('#pf-updates').insertAdjacentElement('afterend',nav);section=document.createElement('section');section.id='owned-pokefield';section.hidden=true;section.innerHTML=markup();nav.insertAdjacentElement('afterend',section);nav.querySelectorAll('button').forEach(b=>b.onclick=()=>mode(b.dataset.mode));wire();loadKnowledge();return true;
  }
  window.addEventListener('jrpg:emerald-state',e=>{if(!model.species.length)return;model.updateOwned(e.detail);render();});
  window.addEventListener('jrpg:trainer-card-view',e=>{if(e.detail?.view==='trainer')paintMode('trainer');else if(activeMode==='trainer')paintMode('live');});
  globalThis.JRPGWorldMyField={show(){nav?.querySelector('[data-mode="field"]')?.click();},focusDex(dex){const s=model.species.find(x=>x.dex===Number(dex));if(!s)return false;model.focus=new Set([s.dex]);model.clearCall();model.rank=null;render();return true;}};
  if(!attach()){const ob=new MutationObserver(()=>{if(attach())ob.disconnect();});ob.observe(document.documentElement,{childList:true,subtree:true});}
})();
