/* Proven specimen evidence only. CLEAR is not a release recommendation. */
(() => {
  function assess(m) {
    const flags=[];
    const add=(condition,label,special=false)=>{if(condition)flags.push({label,special});};
    add(m.shiny?.isShiny,'✨ SHINY',true);
    const pk=m.pokerusInfo || m.pokerus;
    add(pk?.state==='active','☣ POKÉRUS ACTIVE',true);
    add(pk?.state==='cured','☣ POKÉRUS CURED');
    add(m.ribbons?.count>0,'🏅 RIBBONS');
    add(!!(m.heldItemId || m.heldItem),'🎒 HOLDING ITEM');
    const perfect=Object.values(m.ivs||{}).filter(n=>n===31).length;
    add(perfect>0,`⭐ PERFECT IV · ${perfect}×31`);
    add((m.hiddenPower||m.hp)?.power===70,'⚡ HIDDEN POWER 70');
    add(m.rareFemale===true,'♀ RARE FEMALE');
    add(m.origin?.fateful===true,'✦ FATEFUL ORIGIN',true);
    return {status:flags.some(f=>f.special)?'SPECIAL':flags.length?'CHECK':'CLEAR',flags,
      explanation:flags.length?flags.map(f=>f.label).join(' · '):'No configured noteworthy hidden-value flags detected.',
      mirageValue:Number.isInteger(m.personality)?m.personality & 0xFFFF:null};
  }
  globalThis.PokeFieldNotability={assess};
  if(typeof module!=='undefined')module.exports={assess};
})();
