const fs=require('fs');
const assert=require('assert');
const src=fs.readFileSync(__dirname+'/../pokefield-live-v0.1.19.js','utf8');
const html=fs.readFileSync(__dirname+'/../index.html','utf8');
assert(src.includes("function specimenKey(mon){ return mon?`${Number(mon.personality)>>>0}:${Number(mon.otId)>>>0}`:''; }"),'EV plan identity must use stable PID + OT ID');
assert(!src.includes("function specimenKey(mon){ return mon?`${Number(mon.personality)||0}:${Number(mon.checksum)||0}`:''; }"),'EV plan identity must not use mutable checksum');
assert(src.includes('parseEvSpread'),'Smogon spread parser missing');
assert(src.includes('252 SpA / 252 Spe / 4 HP'),'Smogon notation example missing');
assert(src.includes('BATTLE EVs ×4'),'Macho Brace + Pokérus x4 coaching missing');
assert(src.includes("button.textContent=compactMode?'COMPACT':'EXPAND'"),'core display-state labels regressed');
assert(src.includes('Vitamins add 10 only below 100 EV'),'Gen III vitamin guidance missing');
assert(src.includes('Emerald EV berries remove 10'),'Emerald EV berry guidance missing');
assert(html.includes('v=0.1.19-final-evcoach'),'cache-safe v0.1.19 JS/CSS refs missing');
for(const f of ['hp-up.png','protein.png','iron.png','calcium.png','zinc.png','carbos.png','pomeg.png','kelpsy.png','qualot.png','hondew.png','grepa.png','tamato.png','macho-brace.png','soothe-bell.png','friendship.png']){
  assert(fs.existsSync(__dirname+'/../assets/pokesprite/'+f),`missing sprite ${f}`);
}
console.log('EV COACH v0.1.19 regression PASS');
