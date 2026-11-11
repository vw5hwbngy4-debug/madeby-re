/* Emerald v0.4.1 · responsive DEX / BUZZ switch
 * Desktop keeps the seamless REGULAR <-> DEX Strategy Pokédex.
 * Mobile repurposes the otherwise-superfluous DEX control as BUZZ and opens
 * Emerald · MadeBy's social-story surface without touching the emulator session.
 */
(() => {
  'use strict';
  const html=document.documentElement;
  const body=()=>document.body;
  const KEY='emerald-display-mode-v0.1.22.2';
  const mq=matchMedia('(max-width: 959px)');
  const normalize=v=>v==='dex'?'dex':'regular';
  const queryMode=()=>{try{return new URLSearchParams(location.search).get('mode');}catch(e){return null;}};
  const initial=normalize(queryMode()||sessionStorage.getItem(KEY)||html.dataset.emeraldMode||'regular');
  html.dataset.emeraldMode=mq.matches?'regular':initial;

  function syncButton(){
    const b=document.getElementById('emerald-dex-switch');if(!b)return;
    const mobile=mq.matches;
    html.dataset.mobileBuzz=mobile?'1':'0';
    if(mobile){
      b.dataset.mobileAction='buzz';
      b.setAttribute('aria-pressed','false');
      b.setAttribute('aria-label','Open Hoenn Buzz social stories');
      b.title='Open Hoenn Buzz social stories';
      const strong=b.querySelector('b');if(strong)strong.textContent='BUZZ';
      const small=b.querySelector('small');if(small)small.textContent='SOCIAL STORIES';
      return;
    }
    delete b.dataset.mobileAction;
    const mode=normalize(html.dataset.emeraldMode);
    b.setAttribute('aria-pressed',String(mode==='dex'));
    b.setAttribute('aria-label',mode==='dex'?'Return to regular Emerald mode':'Open DEX Strategy Pokédex mode');
    b.title=mode==='dex'?'Return to regular Emerald mode':'Open DEX Strategy Pokédex mode';
    const strong=b.querySelector('b');if(strong)strong.textContent='DEX';
    const small=b.querySelector('small');if(small)small.textContent=mode==='dex'?'← REGULAR MODE':'STRATEGY MODE';
  }

  function apply(mode,{announce=true}={}){
    mode=mq.matches?'regular':normalize(mode);
    html.dataset.emeraldMode=mode;
    if(body()) body().dataset.pageMode=mode;
    try{sessionStorage.setItem(KEY,mode);}catch(e){}
    syncButton();
    if(announce){
      try{window.dispatchEvent(new CustomEvent('jrpg:emerald-modechange',{detail:{mode}}));}catch(e){}
      requestAnimationFrame(()=>{try{window.dispatchEvent(new Event('resize'));}catch(e){}});
    }
    return mode;
  }

  function openBuzz(){
    const social=globalThis.HoennOnlineSocial;
    if(social?.toggleBuzz){social.toggleBuzz();return;}
    try{window.dispatchEvent(new CustomEvent('hoenn:open-buzz'));}catch(e){}
  }

  function attach(){
    const b=document.getElementById('emerald-dex-switch');
    if(!b)return false;
    if(!b.dataset.seamless){
      b.dataset.seamless='1';
      b.addEventListener('click',e=>{
        e.preventDefault();
        if(mq.matches){openBuzz();return;}
        apply(html.dataset.emeraldMode==='dex'?'regular':'dex');
      });
    }
    apply(html.dataset.emeraldMode,{announce:false});
    return true;
  }

  function responsiveChange(){
    if(mq.matches && html.dataset.emeraldMode==='dex')apply('regular');
    else syncButton();
  }

  globalThis.JRPGWorldEmeraldDisplayMode={
    get:()=>normalize(html.dataset.emeraldMode),
    set:mode=>apply(mode),
    toggle:()=>mq.matches?(openBuzz(),normalize(html.dataset.emeraldMode)):apply(html.dataset.emeraldMode==='dex'?'regular':'dex'),
    mobileAction:()=>mq.matches?'buzz':'dex'
  };
  mq.addEventListener?.('change',responsiveChange);
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',attach,{once:true});else attach();
})();
