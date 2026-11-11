const assert=require('assert');
const fs=require('fs');
const E=require('../teamlab-engine-v0.1.24.9.2.js');
const data=require('../data/teamlab-emerald-v0.1.21.json');
const byName=n=>Object.values(data.species).find(r=>r.name===n);

// Preserve v0.1.24.9.2 practical ranking behavior.
const milotic=E.stabProfile(data,byName('Milotic'),null,'species');
assert.strictEqual(milotic.best?.name,'Surf');
const lugia=E.stabProfile(data,byName('Lugia'),null,'species');
assert.strictEqual(lugia.bestPhysical?.name,'Aeroblast');
assert.strictEqual(lugia.bestSpecial?.name,'Psychic');
const claydol=E.stabProfile(data,byName('Claydol'),null,'species');
assert.strictEqual(claydol.best?.name,'Earthquake');
assert.strictEqual(claydol.bestSpecial?.name,'Psychic');

// Matrix must still be backed by the all-types current-party engine.
const members=[
 {record:byName('Milotic'),specimen:{dexNo:350,partySlot:0,ability:'Marvel Scale',moves:[{name:'Surf'},{name:'Ice Beam'},{name:'Recover'},{name:'Toxic'}]}},
 {record:byName('Salamence'),specimen:{dexNo:373,partySlot:1,ability:'Intimidate',moves:[{name:'Dragon Claw'},{name:'Earthquake'},{name:'Rock Slide'},{name:'Dragon Dance'}]}},
 {record:byName('Metagross'),specimen:{dexNo:376,partySlot:2,ability:'Clear Body',moves:[{name:'Meteor Mash'},{name:'Earthquake'},{name:'Rock Slide'},{name:'Explosion'}]}}
];
const overview=E.teamCoverageOverview(data,members,{basis:'current'});
assert.strictEqual(overview.rows.length,data.types.length);
assert(overview.rows.every(x=>x.defense&&x.offense));

const field=fs.readFileSync('../true-pokefield-v0.1.24.9.2.1.js','utf8');
for(const token of ['TEAM COVERAGE','coverageMatrixMemberState','coverageMatrixSprite','tpf-coverage-matrix','YOUR TEAM TAKES','YOUR TEAM HITS','very weak','super-effective','openTeamCoverageType']) assert(field.includes(token),`missing matrix token: ${token}`);
const css=fs.readFileSync('../true-pokefield-v0.1.24.9.2.1.css','utf8');
for(const token of ['position:fixed','height:100dvh','.tpf-matrix-row','.tpf-matrix-mon.is-severe','.tpf-matrix-mon.is-super','env(safe-area-inset-top)']) assert(css.includes(token),`missing matrix CSS: ${token}`);
const index=fs.readFileSync('../index.html','utf8');
for(const file of ['teamlab-engine-v0.1.24.9.2.js','teamlab-v0.1.24.9.2.js','true-pokefield-v0.1.24.9.2.1.js','true-pokefield-v0.1.24.9.2.1.css','pokefield-live-v0.1.24.9.2.1.js']) assert(index.includes(file),`index does not load ${file}`);
assert.strictEqual(fs.readFileSync('../VERSION.txt','utf8').trim(),'0.1.24.9.2.1');
console.log('PASS v0.1.24.9.2.1 sprite coverage matrix');
