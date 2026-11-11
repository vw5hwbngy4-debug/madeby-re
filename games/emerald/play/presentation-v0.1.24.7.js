/* v0.1.24.7 presentation: exactly one compact/expand control. Compact is one live-intelligence line. */
(() => {
  let panel,glance,current=globalThis.JRPGWorldEmeraldState;
  function text(){
    const m=current?.primary;if(!m)return 'LIVE · waiting for a Pokémon';
    const stars=Object.values(m.ivs||{}).filter(v=>v===31).length;
    return `${m.species}${m.genderSymbol||''} · Lv${m.level??'—'} · IV ${m.ivTotal??'—'}${m.shiny?.isShiny?' · ★ SHINY':''}${stars?` · ${stars}×31`:''} · HP ${m.hiddenPower?.type||'—'} ${m.hiddenPower?.power??'—'} · ${m.nature||'—'} · ${m.ability||'—'}`;
  }
  function render(){if(!glance)return;glance.textContent=text();glance.title=text();}
  function attach(){panel=document.getElementById('pokefield-live-panel');if(!panel)return false;if(document.getElementById('pf-glance'))return true;glance=document.createElement('div');glance.id='pf-glance';glance.setAttribute('aria-live','polite');panel.querySelector('#pf-updates')?.insertAdjacentElement('afterend',glance);render();return true;}
  window.addEventListener('jrpg:emerald-state',e=>{current=e.detail;render();});
  if(!attach()){const o=new MutationObserver(()=>{if(attach())o.disconnect()});o.observe(document.documentElement,{childList:true,subtree:true});}
})();
