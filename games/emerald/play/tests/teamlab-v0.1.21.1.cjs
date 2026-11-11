const assert=require('assert');
const fs=require('fs');
const E=require('../teamlab-engine-v0.1.21.1.js');
const D=require('../data/teamlab-emerald-v0.1.21.json');
const Field=require('../owned-pokefield-v0.1.21.js');

assert.equal(Object.keys(D.species).length,386);
assert(E.threatPool(D).length>40,'ADV OU/UUBL threat pool should be populated');

const sceptile=E.record(D,254), skarmory=E.record(D,227), salamence=E.record(D,373), blissey=E.record(D,242), gengar=E.record(D,94), swampert=E.record(D,260);
assert(sceptile&&skarmory&&salamence&&blissey&&gengar&&swampert);
const spec={personality:123,otId:456,dexNo:254,nature:'Timid',ability:'Overgrow',heldItem:'',ivs:{hp:31,atk:31,def:31,spa:31,spd:31,spe:31},evs:{hp:4,atk:0,def:0,spa:252,spd:0,spe:252},hiddenPower:{type:'Ice',power:70},moves:[]};
const projected=E.projectedRecord(D,spec);
assert.equal(projected.hiddenPower.type,'Ice');
assert.equal(projected.hiddenPower.power,70);

// Role grammar must surface ADV-relevant identities, not merely generic stat tags.
const sr=E.roleProfile(D,sceptile,spec).map(x=>x.role);
assert(sr.includes('Special Sweeper'));
assert(sr.includes('Opener'));
assert(sr.includes('Hidden Power Coverage'));
assert(!sr.includes('Phaser'),'Sceptile having legal Roar should not make phazing a primary role');
const kr=E.roleProfile(D,skarmory).map(x=>x.role);
assert(kr.includes('Physical Wall'));
assert(kr.includes('Phaser'));
assert(kr.includes('Spiker'));

// Exact specimen Hidden Power must participate in structural threat coverage.
const cov=E.structuralThreatCoverage(D,[projected]);
const salamenceAnswer=cov.answers.find(x=>x.foe==='Salamence');
assert(salamenceAnswer,'Sceptile should structurally answer Salamence with exact HP Ice');
assert.equal(salamenceAnswer.move,'Hidden Power Ice');

// Existing exact arithmetic still intact.
assert.equal(E.statAtLevel(70,31,0,100,'Hardy','hp'),281);
assert.equal(E.statAtLevel(120,31,252,100,'Timid','spe'),372);
const sstats=E.specimenStats(sceptile,spec,{level:100});
const bstats=E.statsAtLevel(blissey,{ivs:{hp:31,atk:31,def:31,spa:31,spd:31,spe:31},evs:{hp:252,def:0,spd:252},level:100,nature:'Hardy'});
const toss=E.damageRange(D,{attackerRecord:blissey,defenderRecord:sceptile,attackerStats:bstats,defenderStats:sstats,moveConst:'MOVE_SEISMIC_TOSS',attackerLevel:100});
assert.equal(toss.min,100);assert.equal(toss.max,100);
const gstats=E.statsAtLevel(gengar,{level:100});const swstats=E.statsAtLevel(swampert,{level:100});
const eq=E.damageRange(D,{attackerRecord:swampert,defenderRecord:gengar,attackerStats:swstats,defenderStats:gstats,moveConst:'MOVE_EARTHQUAKE',attackerLevel:100,defenderAbility:'Levitate'});
assert.equal(eq.max,0);assert(eq.immune);

// EV merger + explicit TeamLab -> Live EV Coach UI handshake.
const speed=E.minimumSpeedEv(D,spec,sceptile,300,{level:100});
const merged=E.mergeEvPlan(spec,{speed});assert(merged.legalTotal);assert.equal(merged.evs.spe,252);
const ui=fs.readFileSync(require.resolve('../teamlab-v0.1.21.1.js'),'utf8');
assert(ui.includes('data-ev-send="current"'));
assert(ui.includes('data-ev-send="clean"'));
assert(ui.includes("jrpg:emerald-set-ev-plan"));
assert(ui.includes('SEND TO LIVE EV COACH'));

// Rain remains a hard theme when a satisfying formation exists.
const rain=E.optimizeSix(D,{theme:'rain',pinned:[E.record(D,230)],beamWidth:32,candidateLimit:72});
assert(rain.length>0);assert(rain[0].themeSatisfied);

// Reactive field still combines party + boxes.
const mk=(pid,ot,species,dexNo,hpType,power,source)=>({personality:pid,otId:ot,species,dexNo,level:50,nature:'Timid',ability:'Overgrow',ivs:{hp:31,atk:10,def:20,spa:31,spd:20,spe:31},evs:{hp:0,atk:0,def:0,spa:0,spd:0,spe:0},evTotal:0,ivTotal:144,friendship:100,hiddenPower:{type:hpType,power},shiny:{isShiny:false},pokerus:{state:'none'},ribbons:{count:0},storage:source});
const state={party:[mk(1,10,'Treecko',252,'Ice',70)],boxes:[mk(2,20,'Ralts',280,'Ghost',68,{box:0,slot:0,label:'BOX 1 · SLOT 1'}),mk(3,30,'Magikarp',129,'Ice',55,{box:1,slot:2,label:'BOX 2 · SLOT 3'})]};
const rows=Field.adapt(state);assert.equal(rows.length,3);const rf=new Field.ReactiveField();rf.records=rows;rf.setFilter({category:'HIDDEN POWER TYPE',value:'Ice',label:'HP Ice'});assert.equal(rf.filtered().length,2);

console.log('PASS teamlab-v0.1.21.1: EV Coach handshake, ADV role grammar, exact Hidden Power coverage, boxes and exact RSE math');
