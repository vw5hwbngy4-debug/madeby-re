/* Emerald v0.1.24.8 · mobile control placement.
   DEX lives below the game on mobile, while its original desktop position is preserved. */
(() => {
  const mq=matchMedia('(max-width: 959px)');
  let originParent=null, originNext=null;
  function sync(){
    const b=document.getElementById('emerald-dex-switch');
    const actions=document.querySelector('#pokefield-live-panel .pf-head-actions');
    if(!b||!actions)return false;
    if(!originParent && b.parentElement!==actions){originParent=b.parentElement;originNext=b.nextSibling;}
    if(mq.matches){
      if(b.parentElement!==actions)actions.appendChild(b);
    }else if(originParent && b.parentElement!==originParent){
      if(originNext && originNext.parentNode===originParent)originParent.insertBefore(b,originNext);else originParent.appendChild(b);
    }
    return true;
  }
  if(!sync()){
    const o=new MutationObserver(()=>{if(sync())o.disconnect();});
    o.observe(document.documentElement,{childList:true,subtree:true});
  }
  mq.addEventListener?.('change',sync);
})();
