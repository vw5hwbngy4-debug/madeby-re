const assert=require('assert');
const fs=require('fs');
const E=require('../teamlab-engine-v0.1.24.9.2.js');
const data=require('../data/teamlab-emerald-v0.1.21.json');
const byName=n=>Object.values(data.species).find(r=>r.name===n);
const move=n=>Object.values(data.moves).find(m=>m.name===n);

const milotic=E.stabProfile(data,byName('Milotic'),null,'species');
assert.strictEqual(milotic.best?.name,'Surf','Milotic practical STAB should prefer Surf over Hydro Pump');
assert(milotic.conditionalCandidates.some(x=>x.name==='Hydro Pump'),'Hydro Pump should remain visible as high-risk/low-reliability option');

const lugia=E.stabProfile(data,byName('Lugia'),null,'species');
assert.strictEqual(lugia.bestPhysical?.name,'Aeroblast','Lugia physical STAB should remain Aeroblast');
assert.strictEqual(lugia.bestSpecial?.name,'Psychic','Lugia special STAB should prefer Psychic over Dream Eater');
assert(lugia.conditionalCandidates.some(x=>x.name==='Dream Eater'),'Dream Eater should be retained as conditional');

const claydol=E.stabProfile(data,byName('Claydol'),null,'species');
assert.strictEqual(claydol.best?.name,'Earthquake','Claydol practical STAB should prefer Earthquake');
assert.strictEqual(claydol.bestSpecial?.name,'Psychic','Claydol special practical STAB should prefer Psychic');

assert(E.moveAccuracyFactor(move('Hydro Pump')) < .8,'80% accuracy must receive non-linear reliability cost');
assert(E.moveAccuracyFactor(move('Thunder')) < .7,'70% accuracy must receive non-linear reliability cost');
assert(E.movePracticalityMeta(move('Dream Eater')).factor < .25,'Dream Eater must be sleep-gated');
assert(E.movePracticalityMeta(move('Hyper Beam')).factor < .6,'Hyper Beam must pay recharge cost');
assert(E.movePracticalityMeta(move('Solar Beam')).factor < .6,'Solar Beam must pay default charge-turn cost');


const members=[
  {record:byName('Milotic'),specimen:{dexNo:350,ability:'Marvel Scale',moves:[{name:'Surf'},{name:'Ice Beam'},{name:'Recover'},{name:'Toxic'}]}},
  {record:byName('Salamence'),specimen:{dexNo:373,ability:'Intimidate',moves:[{name:'Dragon Claw'},{name:'Earthquake'},{name:'Rock Slide'},{name:'Dragon Dance'}]}},
  {record:byName('Metagross'),specimen:{dexNo:376,ability:'Clear Body',moves:[{name:'Meteor Mash'},{name:'Earthquake'},{name:'Rock Slide'},{name:'Explosion'}]}}
];
const overview=E.teamCoverageOverview(data,members,{basis:'current'});
assert.strictEqual(overview.rows.length,data.types.length,'Team overview must cover every Gen III type at once');
assert(overview.rows.every(x=>x.defense&&x.offense),'Each team coverage row needs defense and offense together');
assert(overview.offenseGaps.length>=0&&overview.oneAnswer.length>=0,'Team overview must expose gaps and one-answer types');

const field=fs.readFileSync('../true-pokefield-v0.1.24.9.2.js','utf8');
for(const token of ['TEAM OVERVIEW','CURRENT MOVES','DEFENSIVE PRESSURE','OFFENSIVE GAPS','openTeamCoverageType','partyCoverageMembers'])assert(field.includes(token),`missing Team Coverage token: ${token}`);
const index=fs.readFileSync('../index.html','utf8');
for(const file of ['teamlab-engine-v0.1.24.9.2.js','true-pokefield-v0.1.24.9.2.js','true-pokefield-v0.1.24.9.2.css','teamlab-v0.1.24.9.2.js','pokefield-live-v0.1.24.9.2.js'])assert(index.includes(file),`index does not load ${file}`);
assert.strictEqual(fs.readFileSync('../VERSION.txt','utf8').trim(),'0.1.24.9.2');
console.log('PASS v0.1.24.9.2 practical moves + team coverage');
