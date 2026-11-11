/* Mobile-only placement: DEX belongs in the PokéField header, never over the game canvas. */
(() => {
  const mq=matchMedia('(max-width: 959px)');
  function place(){const b=document.getElementById('emerald-dex-switch'),a=document.querySelector('#pokefield-live-panel .pf-head-actions');if(!b||!a)return false;if(mq.matches&&b.parentElement!==a)a.appendChild(b);return true;}
  if(!place()){const o=new MutationObserver(()=>{if(place())o.disconnect()});o.observe(document.documentElement,{childList:true,subtree:true});}
  mq.addEventListener?.('change',()=>{if(mq.matches)place();});
})();
