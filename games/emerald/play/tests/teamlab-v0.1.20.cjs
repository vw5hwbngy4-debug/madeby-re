const fs=require('fs');
const assert=require('assert');
const path=require('path');
const root=path.resolve(__dirname,'..');
const E=require(path.join(root,'teamlab-engine-v0.1.20.js'));
const d=JSON.parse(fs.readFileSync(path.join(root,'data/teamlab-emerald-v0.1.20.json'),'utf8'));
const rec=n=>E.record(d,n);
const tree={dexNo:252,level:5,ivs:{hp:31,atk:0,def:0,spa:31,spd:0,spe:31},evs:{hp:0,atk:0,def:0,spa:0,spd:0,spe:0},hiddenPower:{type:'Ice',power:70},personality:1,otId:2,moves:[]};

assert.equal(d.schema,'jrpg.world/teamlab-emerald-v0.1.20');
assert.equal(d.counts.species,386);
assert.equal(d.counts.moves,355);
assert.equal(d.counts.tacticalSpecies,101);
assert.equal(Object.keys(d.species).length,386);
assert.ok(Object.values(d.species).every(r=>Array.isArray(r.familyMoves)&&r.familyMoves.length>0),'all species should carry full family move access');
assert.ok(Object.values(d.species).every(r=>(r.evolutions||[]).every(e=>Number.isInteger(e.targetDex))),'all evolution targets resolved');

assert.deepEqual(rec(252).evolutions.map(e=>[e.targetDex,e.method,e.param]),[[253,'EVO_LEVEL','16']]);
assert.deepEqual(rec(290).evolutions.map(e=>[e.targetDex,e.method,e.param]),[[291,'EVO_LEVEL_NINJASK','20'],[292,'EVO_LEVEL_SHEDINJA','20']]);
assert.deepEqual(rec(254).types,['Grass']);
assert.equal(rec(254).stats.spe,120);
assert.equal(rec(254).stats.spa,105);
assert.deepEqual(rec(279).abilities,['Keen Eye']); // Pelipper: no later Drizzle leak
assert.deepEqual(rec(286).abilities,['Effect Spore']); // Breloom: no later Poison Heal leak
assert.deepEqual(rec(324).abilities,['White Smoke']); // Torkoal: no later Drought leak

const final=E.projectedRecord(d,tree);
assert.equal(final.dex,254);
const roadmap=E.futureStabRoadmap(d,tree,254);
const leaf=roadmap.find(x=>x.moveConst==='MOVE_LEAF_BLADE');
assert.ok(leaf,'Leaf Blade should surface');
assert.equal(leaf.stage.dex,253,'natural Grovyle source should beat impossible early Sceptile level source');
assert.equal(leaf.level,29);
const solar=roadmap.find(x=>x.moveConst==='MOVE_SOLAR_BEAM');
assert.ok(solar&&solar.source.kind==='machine','Solar Beam should surface via TM instead of delayed Treecko level-up');

const unlocks=E.competitiveUnlocks(d,tree,254);
const sub=unlocks.find(x=>x.moveConst==='MOVE_SUBSTITUTE');
assert.ok(sub&&sub.source.kind==='tutor'&&/Lilycove/i.test(sub.source.location));
const seed=unlocks.find(x=>x.moveConst==='MOVE_LEECH_SEED');
assert.ok(seed&&seed.source.kind==='egg');
assert.ok(/father:/i.test(E.sourceText(d,seed.source,seed.moveConst)));
const hp=unlocks.find(x=>x.moveConst==='MOVE_HIDDEN_POWER');
assert.ok(hp);
assert.equal(hp.worth.type,'Ice');
assert.equal(hp.worth.category,'Special');
assert.equal(hp.worth.power,70);
const ghost=E.moveUsefulness(d,final,'MOVE_HIDDEN_POWER',{hiddenPower:{type:'Ghost',power:70}});
assert.equal(ghost.category,'Physical','Gen III Ghost Hidden Power is physical');

const nin=rec(291);
assert.ok(E.hasMove(nin,'MOVE_BATON_PASS'));
assert.ok(E.hasMove(nin,'MOVE_SWORDS_DANCE'));
assert.ok(nin.archetypes.some(a=>/Baton Pass/i.test(a.label)));
const bp=nin.competitiveMoves.find(x=>x.move==='MOVE_BATON_PASS');
assert.ok(bp.sources.some(s=>s.kind==='level'&&s.level===45));

const s101=E.sub101(tree,final);
assert.equal(s101.projectedHP,281);
assert.equal(s101.achievable,false,'Sceptile cannot reach 404 HP at level 100');
const exactly=E.sub101({ivs:{hp:31},evs:{hp:0}},{stats:{hp:100}});
assert.equal(exactly.minEv,252);
assert.equal(exactly.projectedHP,341);
assert.equal(exactly.achievable,true);
const exactlyFull=E.sub101({ivs:{hp:31},evs:{hp:252}},{stats:{hp:100}});
assert.equal(exactlyFull.projectedHP,404);
assert.equal(exactlyFull.subHP,101);
assert.equal(exactlyFull.eligible,true);

assert.equal(E.typeMultiplier(d,'Ghost',['Normal']),0);
assert.equal(E.typeMultiplier(d,'Electric',['Ground']),0);
assert.equal(E.typeMultiplier(d,'Fire',['Grass']),2);

const pair=E.pairFit(d,rec(254),rec(227));
assert.ok(Number.isFinite(pair.score)&&pair.reasons.length);
const fabric=E.teamFabric(d,[rec(254),rec(227),rec(291)]);
assert.equal(fabric.slots,3);
assert.equal(fabric.rows.length,17);
assert.ok(fabric.coverage.total>200);
const candidates=E.structuralCandidates(d,tree,12);
assert.equal(candidates.length,12);
assert.ok(candidates.every(x=>x.record.tier!=='Uber'));
const next=E.nextSlotCandidates(d,[rec(254),rec(291)],8);
assert.equal(next.length,8);
assert.ok(next.every(x=>x.record.tier!=='Uber'));

console.log('PASS teamlab-v0.1.20: knowledge core, acquisition, Gen III mechanics, breakpoints, pair fit and team fabric');
