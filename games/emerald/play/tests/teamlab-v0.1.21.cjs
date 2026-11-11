const assert=require('assert');
const path=require('path');
const E=require('../teamlab-engine-v0.1.21.js');
const D=require('../data/teamlab-emerald-v0.1.21.json');
const Field=require('../owned-pokefield-v0.1.21.js');

assert.equal(D.schema,'jrpg.world/teamlab-emerald-v0.1.21');
assert.equal(Object.keys(D.species).length,386);
assert(E.threatPool(D).length>40,'ADV OU/UUBL threat pool should be populated');

// Exact Gen III stat arithmetic.
assert.equal(E.statAtLevel(70,31,0,100,'Hardy','hp'),281);
assert.equal(E.statAtLevel(120,31,252,100,'Timid','spe'),372);
assert.equal(E.modifyRSE(101,1.5),151);

const sceptile=E.record(D,254), blissey=E.record(D,242), gengar=E.record(D,94), swampert=E.record(D,260);
assert(sceptile&&blissey&&gengar&&swampert);
const spec={dexNo:254,nature:'Timid',ability:'Overgrow',heldItem:'',ivs:{hp:31,atk:31,def:31,spa:31,spd:31,spe:31},evs:{hp:4,atk:0,def:0,spa:252,spd:0,spe:252},hiddenPower:{type:'Ice',power:70}};
const sstats=E.specimenStats(sceptile,spec,{level:100});
assert.equal(sstats.spe,372);

// Fixed-level damage and ability immunity must not be approximated.
const bstats=E.statsAtLevel(blissey,{ivs:{hp:31,atk:31,def:31,spa:31,spd:31,spe:31},evs:{hp:252,def:0,spd:252},level:100,nature:'Hardy'});
const toss=E.damageRange(D,{attackerRecord:blissey,defenderRecord:sceptile,attackerStats:bstats,defenderStats:sstats,moveConst:'MOVE_SEISMIC_TOSS',attackerLevel:100});
assert.equal(toss.min,100);assert.equal(toss.max,100);
const gstats=E.statsAtLevel(gengar,{level:100});
const swstats=E.statsAtLevel(swampert,{level:100});
const eq=E.damageRange(D,{attackerRecord:swampert,defenderRecord:gengar,attackerStats:swstats,defenderStats:gstats,moveConst:'MOVE_EARTHQUAKE',attackerLevel:100,defenderAbility:'Levitate'});
assert.equal(eq.max,0);assert(eq.immune);

// EV benchmark merger keeps current EVs as floors and respects 510 when feasible.
const speed=E.minimumSpeedEv(D,spec,sceptile,300,{level:100});
assert(speed&&speed.ev!==null&&speed.speed>300);
const merged=E.mergeEvPlan(spec,{speed});
assert(merged.evs.spe>=252&&merged.currentTotal===508);

// Theme constraint: returned Rain team must actually carry rain identity when one is found.
const rain=E.optimizeSix(D,{theme:'rain',pinned:[E.record(D,230)],beamWidth:32,candidateLimit:72});
assert(rain.length>0,'rain optimizer should produce a formation');
assert(rain[0].themeSatisfied,'rain result must satisfy theme constraint');
assert(rain[0].team.some(r=>E.hasMove(r,E.MOVE_CONST.RAIN)));

// Reactive My Field combines party and boxes, with immediate predicates.
const mk=(pid,ot,species,dexNo,hpType,power,source)=>({personality:pid,otId:ot,species,dexNo,level:50,nature:'Timid',ability:'Overgrow',ivs:{hp:31,atk:10,def:20,spa:31,spd:20,spe:31},evs:{hp:0,atk:0,def:0,spa:0,spd:0,spe:0},evTotal:0,ivTotal:144,friendship:100,hiddenPower:{type:hpType,power},shiny:{isShiny:false},pokerus:{state:'none'},ribbons:{count:0},storage:source});
const state={party:[mk(1,10,'Treecko',252,'Ice',70)],boxes:[mk(2,20,'Ralts',280,'Ghost',68,{box:0,slot:0,label:'BOX 1 · SLOT 1'}),mk(3,30,'Magikarp',129,'Ice',55,{box:1,slot:2,label:'BOX 2 · SLOT 3'})]};
const rows=Field.adapt(state);assert.equal(rows.length,3);assert.equal(rows.filter(x=>x.source==='box').length,2);
const rf=new Field.ReactiveField();rf.records=rows;rf.setFilter({category:'HIDDEN POWER TYPE',value:'Ice',label:'HP Ice'});assert.equal(rf.filtered().length,2);rf.setRanks('ivTotal','hpPower');assert.equal(rf.ordered('hpPower')[0].hiddenPower.power,70);

console.log('PASS teamlab-v0.1.21: PC boxes, reactive field, RSE benchmarks, EV merge, threat pool and theme-constrained optimizer');
