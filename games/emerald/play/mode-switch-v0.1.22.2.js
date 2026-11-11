/* Emerald v0.1.22.2 · seamless REGULAR <-> DEX switch
 * Single-document mode toggle. Never navigates and never recreates the emulator,
 * so the loaded ROM, running mGBA/WASM instance and in-memory game state stay alive.
 */
(() => {
  'use strict';
  const html=document.documentElement;
  const body=()=>document.body;
  const KEY='emerald-display-mode-v0.1.22.2';
  const normalize=v=>v==='dex'?'dex':'regular';
  const queryMode=()=>{try{return new URLSearchParams(location.search).get('mode');}catch(e){return null;}};
  const initial=normalize(queryMode()||sessionStorage.getItem(KEY)||html.dataset.emeraldMode||'regular');
  html.dataset.emeraldMode=initial;

  function apply(mode,{announce=true}={}){
    mode=normalize(mode);
    html.dataset.emeraldMode=mode;
    if(body()) body().dataset.pageMode=mode;
    try{sessionStorage.setItem(KEY,mode);}catch(e){}
    const b=document.getElementById('emerald-dex-switch');
    if(b){
      b.setAttribute('aria-pressed',String(mode==='dex'));
      b.setAttribute('aria-label',mode==='dex'?'Return to regular Emerald mode':'Open DEX Strategy Pokédex mode');
      b.title=mode==='dex'?'Return to regular Emerald mode':'Open DEX Strategy Pokédex mode';
      const small=b.querySelector('small');if(small)small.textContent=mode==='dex'?'← REGULAR MODE':'STRATEGY MODE';
    }
    if(announce){
      try{window.dispatchEvent(new CustomEvent('jrpg:emerald-modechange',{detail:{mode}}));}catch(e){}
      // Give layout observers/canvas wrappers the same signal as a real viewport change.
      requestAnimationFrame(()=>{try{window.dispatchEvent(new Event('resize'));}catch(e){}});
    }
    return mode;
  }

  function attach(){
    const b=document.getElementById('emerald-dex-switch');
    if(!b)return false;
    if(!b.dataset.seamless){
      b.dataset.seamless='1';
      b.addEventListener('click',e=>{
        e.preventDefault();
        apply(html.dataset.emeraldMode==='dex'?'regular':'dex');
      });
    }
    apply(html.dataset.emeraldMode,{announce:false});
    return true;
  }

  globalThis.JRPGWorldEmeraldDisplayMode={
    get:()=>normalize(html.dataset.emeraldMode),
    set:mode=>apply(mode),
    toggle:()=>apply(html.dataset.emeraldMode==='dex'?'regular':'dex')
  };
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',attach,{once:true});else attach();
})();
