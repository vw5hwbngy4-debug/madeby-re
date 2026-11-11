/* TEAM LAB v0.1.20 UI. Read-only projection of the published Emerald state. */
(() => {
  'use strict';
  const E=globalThis.TeamLabEngine;
  if(!E){console.warn('TEAM LAB engine missing');return;}
  let data=null, panel=null, nav=null, section=null, state=globalThis.JRPGWorldEmeraldState||null;
  let selectedSlot=Number(state?.selectedParty||0), selectedFinalDex=null, loadError='';
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const sprite=d=>`./assets/pokemon/${Number(d)||0}.png`;
  const statLabel={hp:'HP',atk:'ATK',def:'DEF',spa:'SPA',spd:'SPD',spe:'SPE'};
  const title=s=>String(s||'').replace(/\b([a-z])/g,c=>c.toUpperCase());
  const $=q=>section?.querySelector(q);
  function currentSpecimen(){const party=state?.party||[];return party[selectedSlot]||party.find(Boolean)||null;}
  function currentRecord(){const m=currentSpecimen();return m&&data?E.record(data,m.dexNo):null;}
  function projected(m){return data&&m?E.projectedRecord(data,m):null;}
  function qualityClass(label){return `tl-q-${String(label||'').toLowerCase()}`;}
  function moveName(moveConst){return E.moveByConst(data,moveConst)?.name||moveConst.replace(/^MOVE_/,'').replaceAll('_',' ');}
  function sourceText(entry,moveConst){return E.sourceText(data,E.bestSource(data,entry),moveConst);}
  function isKnown(specimen,move){return (specimen?.moves||[]).some(x=>String(x.name||'').toLowerCase()===String(move?.name||'').toLowerCase());}
  function setPressed(mode){nav?.querySelectorAll('button').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.mode===mode)));}
  function showTeamLab(){
    if(!section)return; panel.classList.add('opf-show','tl-show'); const owned=document.getElementById('owned-pokefield'); if(owned)owned.hidden=true; section.hidden=false; setPressed('teamlab'); render();
  }
  function hideTeamLab(){if(!section)return;section.hidden=true;panel?.classList.remove('tl-show');}
  function evolutionChain(branch){
    const bits=[]; branch.path.forEach((r,i)=>{bits.push(`<button type="button" class="tl-evo-node ${Number(r.dex)===Number(branch.final.dex)?'final':''}" data-evo-dex="${r.dex}" title="Open ${esc(r.name)}"><img src="${sprite(r.dex)}" alt=""><span><b>${esc(r.name)}</b><small>#${r.dex} · ${esc(r.tier||'—')}</small></span></button>`); if(i<branch.path.length-1){const e=(r.evolutions||[]).find(x=>Number(x.targetDex)===Number(branch.path[i+1].dex));bits.push(`<span class="tl-evo-arrow">→<small>${esc(E.evolutionLabel(e))}</small></span>`);}});return bits.join('');
  }
  function statGrid(r){return `<div class="tl-stats">${E.STAT_KEYS.map(k=>`<div><small>${statLabel[k]}</small><b>${r.stats?.[k]??'—'}</b></div>`).join('')}</div>`;}
  function typeChips(r){return `<span class="tl-types">${(r.types||[]).map(t=>`<i>${esc(t)}</i>`).join('')}</span>`;}
  function roadmap(specimen,final){
    const rows=E.futureStabRoadmap(data,specimen,final.dex);
    if(!rows.length)return `<p class="tl-muted">No future level-up STAB upgrade surfaced for this branch.</p>`;
    return `<div class="tl-move-list">${rows.map(x=>{
      const src=x.source?E.sourceText(data,x.source,x.moveConst):(x.level!=null?`Lv${x.level} · ${x.stage.name}`:'');
      const route=x.moveConst==='MOVE_SOLAR_BEAM'?' · Sun route':'';
      return `<article class="tl-move"><div class="tl-move-main"><b>${esc(x.move.name)}</b><span class="${qualityClass(x.worth.label)}">${esc(x.worth.label)}</span></div><small>${esc(x.move.type)} · ${esc(x.move.category)}${x.move.power?` · ${x.move.power} BP`:''}${x.move.accuracy?` · ${x.move.accuracy}%`:''}</small><p>${esc(src)}${x.routeNote&&x.routeNote!=='natural level-up'?` · ${esc(x.routeNote)}`:''}${route}</p></article>`;
    }).join('')}</div>`;
  }
  function archetypeBlock(final){
    const derived=(final.archetypes||[]).slice(0,7),smogon=final.smogon?.routes||[],summary=final.smogon?.summary||'';
    return `<div class="tl-archetypes">${derived.map(a=>`<div class="tl-arch"><span>DERIVED</span><b>${esc(a.label)}</b><small>${esc(a.why)}</small></div>`).join('')}${smogon.slice(0,4).map(a=>`<div class="tl-arch tl-smogon"><span>SMOGON RS</span><b>${esc(a)}</b><small>Historical tactical route from the supplied audited atlas.</small></div>`).join('')}</div>${summary?`<details class="tl-tactical"><summary>TACTICAL READ · ${esc(final.name)}</summary><p>${esc(summary)}</p></details>`:''}`;
  }

  function unlocks(specimen,final){
    const rows=E.competitiveUnlocks(data,specimen,final.dex);
    return `<div class="tl-unlocks">${rows.map(x=>{
      const exact=x.moveConst==='MOVE_HIDDEN_POWER'&&specimen.hiddenPower;
      const known=isKnown(specimen,x.move), source=E.sourceText(data,x.source,x.moveConst);
      const type=exact?x.worth.type:x.move.type, category=exact?x.worth.category:x.move.category, power=exact?x.worth.power:x.move.power;
      const note=x.routeNote&& !['natural level-up','machine','tutor'].includes(x.routeNote)?` · ${x.routeNote}`:'';
      return `<article><div><b>${esc(x.move.name)}</b>${known?'<em>KNOWN</em>':''}<span class="${qualityClass(x.worth.label)}">${esc(x.worth.label)}</span></div><small>${esc(type)} · ${esc(category)}${power?` · ${power} BP`:''}${exact?' · exact IV-derived Hidden Power':''}</small><p>${esc(source)}${esc(note)}</p></article>`;
    }).join('')}</div><p class="tl-foot">Egg-parent names are compatibility routes from Emerald's breeding data. Local availability or required trades are not yet claimed by this v0.1.20 router.</p>`;
  }
  function breakpoint(specimen,final){
    if(!E.hasMove(final,E.MOVE_CONST.SUB))return '';
    const s=E.sub101(specimen,final); if(!s)return '';
    if(s.reason)return `<div class="tl-break"><b>101 HP SUBSTITUTE</b><strong>—</strong><small>${esc(s.reason)}</small></div>`;
    const verdict=s.eligible?'READY':s.achievable?'REACHABLE':'NOT REACHABLE';
    const detail=s.eligible?`Projected Lv100 HP ${s.projectedHP} → ${s.subHP} HP Substitute.`:s.achievable?`Projected ${s.projectedHP} HP now. Minimum ${s.minEv} HP EV for 404 HP; ${s.additionalEv} additional from this specimen's current ${s.currentEv}.`:`Even 252 HP EV does not reach 404 HP with this specimen/final form.`;
    return `<div class="tl-break ${s.eligible?'ready':''}"><b>101 HP SUBSTITUTE</b><strong>${verdict}</strong><small>${esc(detail)}</small><p>404 max HP → 101 HP Substitute → survives one Lv100 Seismic Toss.</p></div>`;
  }
  function partnerCards(specimen){
    const owned=E.partnerRanking(data,specimen,state?.party||[]), ownedDex=new Set((state?.party||[]).filter(Boolean).map(m=>Number(projected(m)?.dex)).filter(Number.isFinite));
    const theoretical=E.structuralCandidates(data,specimen,12).filter(x=>!ownedDex.has(Number(x.record.dex))).slice(0,5);
    const comp=E.structuralCandidates(data,specimen,14,['OU','(OU)','UUBL']).filter(x=>!ownedDex.has(Number(x.record.dex))).slice(0,5);
    const leadReason=fit=>fit.reasons.find(r=>/Baton Pass|Rain|Sun|SubSeed|Spikes/i.test(r))||fit.reasons.find(r=>/bulk|pressure/i.test(r))||fit.reasons[0]||'Adds a different structural profile.';
    const card=(x,i,ownedMode)=>`<button type="button" ${ownedMode?`data-partner-slot="${(state.party||[]).indexOf(x.specimen)}"`:''} class="tl-partner ${ownedMode?'':'tl-theory'}"><img src="${sprite(x.record.dex)}" alt=""><span class="tl-partner-copy"><b>#${i+1} ${esc(x.record.name)}</b><strong class="tl-fit-${x.fit.label.toLowerCase()}">${esc(x.fit.label)}</strong><small>${ownedMode?`${esc(x.specimen.species)} → `:''}${esc(x.record.name)} · ${esc(x.record.tier)}</small><p>${esc(leadReason(x.fit))}</p>${x.fit.risks[0]?`<em>${esc(x.fit.risks[0])}</em>`:''}</span></button>`;
    return `<div class="tl-subhead"><b>OWNED FIT</b><small>exact party specimens</small></div>${owned.length?`<div class="tl-partners">${owned.map((x,i)=>card(x,i,true)).join('')}</div>`:`<p class="tl-muted">Catch or add another party Pokémon to compare exact owned pair fit.</p>`}<div class="tl-subhead"><b>STRUCTURAL CANDIDATES</b><small>non-Uber final forms · mechanics-first</small></div><div class="tl-partners">${theoretical.map((x,i)=>card(x,i,false)).join('')}</div><div class="tl-subhead"><b>ADV COMPETITIVE LENS</b><small>OU / UUBL candidates using the same pair-fit model</small></div><div class="tl-partners">${comp.map((x,i)=>card(x,i,false)).join('')}</div>`;
  }

  function fabric(){
    const party=(state?.party||[]).filter(Boolean), team=party.map(projected).filter(Boolean), f=E.teamFabric(data,team);
    const shared=f.shared.length?f.shared.map(x=>`${x.type} ×${x.weak}`).join(' · '):'No 3+ shared weakness detected.';
    const next=f.slots<6?E.nextSlotCandidates(data,team,5):[];
    return `<div class="tl-fabric-top"><div><small>STACK</small><b>${f.slots}/6</b></div><div><small>STAB SE REACH</small><b>${f.coverage.covered}/${f.coverage.total}</b><em>${f.coverage.pct}% final forms</em></div><div><small>SHARED PRESSURE</small><b>${esc(shared)}</b></div></div>
    <div class="tl-team-strip">${team.map((r,i)=>`<button type="button" data-team-slot="${i}"><img src="${sprite(r.dex)}" alt=""><span>${esc(r.name)}</span>${typeChips(r)}</button>`).join('')}</div>
    <div class="tl-role-row">${f.roles.map(r=>`<span>${esc(r)}</span>`).join('')||'<span>No roles detected yet</span>'}</div>
    ${f.plan.length?`<div class="tl-plan"><b>COHERENT LINES</b>${f.plan.map(x=>`<p>✓ ${esc(x)}</p>`).join('')}</div>`:''}
    <div class="tl-gaps"><b>NEXT STRUCTURAL QUESTIONS</b>${f.gaps.slice(0,5).map(x=>`<p>• ${esc(x)}</p>`).join('')||'<p>Core role profile is broad. Threat-level testing is the next layer.</p>'}</div>
    ${next.length?`<div class="tl-next"><div class="tl-subhead"><b>NEXT SLOT · STRUCTURAL CANDIDATES</b><small>delta from the current stack</small></div>${next.map((x,i)=>`<article><img src="${sprite(x.record.dex)}" alt=""><div><b>#${i+1} ${esc(x.record.name)}</b><small>${esc(x.record.tier)} · pair avg ${x.pairAverage}${x.coverageDelta>0?` · +${x.coverageDelta}% STAB reach`:''}</small><p>${esc(x.reasons.slice(0,2).join(' '))}</p></div></article>`).join('')}</div>`:''}
    <details class="tl-matrix"><summary>TYPE EFFECTIVENESS · full defensive matrix</summary><div class="tl-matrix-grid"><b>TYPE</b><b>WEAK</b><b>RESIST</b><b>IMMUNE</b>${f.rows.map(r=>`<span>${esc(r.type)}</span><span class="${r.weak>=3?'bad':''}">${r.weak}</span><span>${r.resist}</span><span>${r.immune}</span>`).join('')}</div></details>`;
  }

  function render(){
    if(!section)return;
    if(loadError){section.innerHTML=`<div class="tl-heading"><strong>TEAM LAB</strong><small>LOAD ERROR</small></div><p class="tl-error">${esc(loadError)}</p>`;return;}
    if(!data){section.innerHTML=`<div class="tl-heading"><strong>TEAM LAB</strong><small>LOADING KNOWLEDGE CORE…</small></div><div class="tl-loading"></div>`;return;}
    const party=(state?.party||[]).filter(Boolean);
    if(!party.length){section.innerHTML=`<div class="tl-heading"><strong>TEAM LAB</strong><small>EMERALD · GEN III</small></div><p class="tl-empty">Load Emerald and put a Pokémon in your party. TeamLab analyzes the exact live specimen against the extracted Emerald + Showdown knowledge core.</p>`;return;}
    if(!state.party[selectedSlot])selectedSlot=state.party.findIndex(Boolean);
    const specimen=currentSpecimen(), cur=currentRecord(); if(!specimen||!cur){section.innerHTML='<p class="tl-error">Current party species could not be resolved.</p>';return;}
    const finals=E.finalRecords(data,cur); const defaultFinal=E.projectedRecord(data,specimen)||cur;
    if(!selectedFinalDex||!finals.some(r=>Number(r.dex)===Number(selectedFinalDex)))selectedFinalDex=defaultFinal.dex;
    const final=E.record(data,selectedFinalDex)||defaultFinal;
    const branches=E.evolutionBranches(data,cur);
    section.innerHTML=`
      <div class="tl-heading"><div><strong>TEAM LAB</strong><span>LIVE SPECIMEN → DEVELOPMENT → PARTNERS → STACK</span></div><small>EMERALD · GEN III · 386 SPECIES</small></div>
      <div class="tl-selector" aria-label="Party specimens">${(state.party||[]).map((m,i)=>m?`<button type="button" data-slot="${i}" class="${i===selectedSlot?'selected':''}"><img src="${sprite(m.dexNo)}" alt=""><span><b>${esc(m.species)}</b><small>Lv${m.level} · ${esc(m.nature)}</small></span></button>`:'').join('')}</div>
      <section class="tl-hero"><div class="tl-mon"><img src="${sprite(final.dex)}" alt=""><div><small>${esc(specimen.species)}${Number(final.dex)!==Number(cur.dex)?` → ${esc(final.name)}`:''}</small><h2>${esc(final.name)}</h2><p>#${final.dex} · ${esc(final.tier)} · ${esc(final.abilities?.join(' / ')||'')}</p>${typeChips(final)}</div></div>${statGrid(final)}<div class="tl-live-tags"><span>IV ${specimen.ivTotal??'—'}/186</span><span>HP ${esc(specimen.hiddenPower?.type||'—')} ${specimen.hiddenPower?.power??'—'}</span><span>EV ${specimen.evTotal??0}/510</span><span>${esc(specimen.ability||'')}</span><span>EGG ${(final.eggGroups||[]).map(esc).join(' / ')||'—'}</span></div></section>
      <div class="tl-grid">
        <section class="tl-card tl-development"><header><b>DEVELOPMENT</b><small>future evolutions + exact Emerald methods</small></header>${branches.map(b=>`<div class="tl-branch ${Number(b.final.dex)===Number(final.dex)?'selected':''}">${evolutionChain(b)}${branches.length>1?`<button type="button" class="tl-choose-branch" data-final-dex="${b.final.dex}">${Number(b.final.dex)===Number(final.dex)?'USING BRANCH':'USE '+esc(b.final.name)}</button>`:''}</div>`).join('')}</section>
        <section class="tl-card"><header><b>STAB ROADMAP</b><small>future level / machine STAB worth surfacing</small></header>${roadmap(specimen,final)}</section>
        <section class="tl-card"><header><b>COMPETITIVE ROUTES</b><small>movepool-enabled archetypes</small></header>${archetypeBlock(final)}${breakpoint(specimen,final)}</section>
        <section class="tl-card"><header><b>HOW TO BUILD IT</b><small>level · TM/HM · tutor · egg</small></header>${unlocks(specimen,final)}</section>
        <section class="tl-card tl-partner-card"><header><b>PARTNER FIT</b><small>this Pokémon × Pokémon you already carry</small></header>${partnerCards(specimen)}</section>
        <section class="tl-card tl-fabric"><header><b>TEAM FABRIC</b><small>current six as one structure</small></header>${fabric()}</section>
      </div>
      <footer class="tl-provenance">Mechanical/acquisition facts: supplied pret/pokeemerald + exact BPEE lineage. Tier context: supplied Pokémon Showdown Gen III data. Tactical labels marked SMOGON RS come only from the supplied audited atlas. Derived labels are TeamLab heuristics and stay inspectable.</footer>`;
    section.querySelectorAll('[data-slot]').forEach(b=>b.onclick=()=>{selectedSlot=Number(b.dataset.slot);selectedFinalDex=null;render();});
    section.querySelectorAll('[data-partner-slot]').forEach(b=>b.onclick=()=>{const n=Number(b.dataset.partnerSlot);if(Number.isInteger(n)&&state.party?.[n]){selectedSlot=n;selectedFinalDex=null;render();}});
    section.querySelectorAll('[data-team-slot]').forEach(b=>b.onclick=()=>{const n=Number(b.dataset.teamSlot);if(state.party?.[n]){selectedSlot=n;selectedFinalDex=null;render();}});
    section.querySelectorAll('[data-final-dex]').forEach(b=>b.onclick=()=>{selectedFinalDex=Number(b.dataset.finalDex);render();});
    section.querySelectorAll('[data-evo-dex]').forEach(b=>b.onclick=()=>{const d=Number(b.dataset.evoDex);if(finals.some(x=>x.dex===d)){selectedFinalDex=d;render();}});
  }
  async function loadData(){
    try{const r=await fetch('./data/teamlab-emerald-v0.1.20.json?v=0.1.20',{cache:'force-cache'});if(!r.ok)throw new Error(`HTTP ${r.status}`);data=await r.json();}
    catch(e){loadError=`TeamLab knowledge core could not load: ${e.message||e}`;}
    render();
  }
  function attach(){
    panel=document.getElementById('pokefield-live-panel');nav=panel?.querySelector('.opf-nav');if(!panel||!nav)return false;if(section)return true;
    const button=document.createElement('button');button.type='button';button.dataset.mode='teamlab';button.setAttribute('aria-pressed','false');button.textContent='TEAM LAB';
    const fieldButton=nav.querySelector('[data-mode="field"]');fieldButton?.insertAdjacentElement('afterend',button);
    section=document.createElement('section');section.id='teamlab';section.hidden=true;(document.getElementById('owned-pokefield')||nav).insertAdjacentElement('afterend',section);
    button.onclick=showTeamLab;
    nav.addEventListener('click',e=>{const b=e.target.closest('button[data-mode]');if(b&&b.dataset.mode!=='teamlab')hideTeamLab();});
    panel.addEventListener('click',e=>{if(e.target.closest('#tc-header-button,#tc-flip-primary,#tc-back-live'))hideTeamLab();});
    loadData();return true;
  }
  window.addEventListener('jrpg:emerald-state',e=>{state=e.detail||state;const requested=Number(state?.selectedParty);if(Number.isInteger(requested)&&state?.party?.[requested]&&selectedSlot>=state.party.length)selectedSlot=requested;if(section&&!section.hidden)render();});
  if(!attach()){const ob=new MutationObserver(()=>{if(attach())ob.disconnect();});ob.observe(document.documentElement,{childList:true,subtree:true});}
})();
