const assert=require('node:assert/strict');
const {Field,tier,facet,matches,adapt}=require('../owned-pokefield-v0.1.18.js');
const {assess}=require('../specimen-notability-v0.1.18.js');
const mon=(pid,power,type='Ghost')=>({personality:pid,otId:42,kind:'OWNED',species:'Ralts',nature:'Timid',ivs:{hp:pid===1?31:26,atk:25},hiddenPower:{type,power},ivTotal:100,level:20,evTotal:0,ribbons:{count:0}});
const party=[mon(1,70),mon(2,65,'Fire'),mon(3,54)];
const f=new Field();f.update({party});
assert.equal(f.responding(),false);assert.equal(f.focusResponses(),false);
const hp=v=>({category:'HIDDEN POWER TYPE',value:v});
f.call(hp('Ghost'));assert.equal(f.responders().length,2);
f.call(hp('Fire'));assert.equal(f.calls.length,1);assert.equal(f.responders()[0].personality,2);
f.call(hp('Fire'));assert.equal(f.calls.length,1);
f.call({category:'SPECIES',value:'Ralts'});assert.equal(f.calls.length,2);
const iv={category:'IV',metric:'atk',op:'>=',number:25};f.call(iv);f.call(iv);assert.equal(f.calls.length,3);
f.call({...iv,metric:'hp',number:31});assert.equal(f.calls.length,4);assert.equal(f.responders().length,0);
assert.equal(f.focusResponses(),false);assert.equal(f.active().length,3);
f.remove(facet(hp('Fire')));assert.equal(f.responders().length,1);
assert.equal(f.focusResponses(),true);assert.equal(f.active().length,1);assert.equal(f.responding(),false);
f.scatter();assert.equal(f.active().length,3);assert.equal(f.rank,null);assert.equal(f.focus,null);assert.equal(f.selectedTier,null);assert.deepEqual(f.calls,[]);
f.call(hp('Ghost'));f.call({category:'HIDDEN POWER POWER',metric:'hpPower',op:'>=',number:60});assert.equal(f.responders().length,1);
f.call({category:'HIDDEN POWER POWER',metric:'hpPower',op:'<=',number:60});assert.equal(f.responders()[0].personality,3);
f.scatter();f.setRank('hp');assert.equal(tier(f.records[0],'hp'),'S');assert.equal(tier(f.records[1],'hp'),'A');
for(const [n,t] of [[31,'S'],[30,'A'],[26,'A'],[25,'B'],[21,'B'],[20,'C'],[16,'C'],[15,'D'],[11,'D'],[10,'E'],[0,'E']])assert.equal(tier({ivs:{hp:n}},'hp'),t);
for(const [n,t] of [[70,'S'],[69,'A'],[65,'A'],[64,'B'],[60,'B'],[59,'C'],[50,'C'],[49,'D'],[40,'D'],[39,'E'],[30,'E']])assert.equal(tier({hiddenPower:{power:n}},'hpPower'),t);
f.selectTier('A');assert.equal(f.responders().length,2);assert.equal(f.focusResponses(),true);assert.equal(f.active().length,2);assert.equal(f.rank,null);
f.scatter();f.setRank('hpPower');assert.deepEqual(f.ordered().map(m=>m.hiddenPower.power),[70,65,54]);
f.selectTier('E');assert.equal(f.focusResponses(),false);f.scatter();
const raw=JSON.stringify(party);adapt({party});assert.equal(JSON.stringify(party),raw);
f.call({category:'SPECIES',value:'Ralts'});f.focusResponses();f.update({party:[{...party[0],checksum:90},...party.slice(1),mon(4,60)]});assert.equal(f.active().length,3);f.scatter();assert.equal(f.active().length,4);
const weak={personality:0x1234abcd,ivs:{hp:1,atk:2,def:3,spa:4,spd:5,spe:6},hiddenPower:{power:30}};
assert.equal(assess(weak).status,'CLEAR');assert.equal(assess(weak).mirageValue,0xabcd);
for(const [extra,status,label] of [
 [{shiny:{isShiny:true}},'SPECIAL','SHINY'],[{pokerus:{state:'active'}},'SPECIAL','ACTIVE'],
 [{pokerus:{state:'cured'}},'CHECK','CURED'],[{ribbons:{count:1}},'CHECK','RIBBONS'],
 [{heldItemId:1},'CHECK','HOLDING'],[{ivs:{hp:31}},'CHECK','PERFECT'],
 [{hiddenPower:{power:70}},'CHECK','POWER 70'],[{rareFemale:true},'CHECK','RARE FEMALE'],
 [{origin:{fateful:true}},'SPECIAL','FATEFUL']]){
 const n=assess({...weak,...extra});assert.equal(n.status,status);assert.ok(n.flags.some(f=>f.label.includes(label)));
}
assert.equal(assess({...weak,shiny:{isShiny:true},ribbons:{count:1}}).flags.length,2);
assert.equal(assess(weak).flags.some(f=>f.label.includes('MIRAGE')),false);
console.log('PASS v0.1.18: neutral, replace/deduplicate/intersect, chips, zero guard, focus/reset, HP type/power, fixed tier boundaries, tier focus, live identity, notability priorities and Mirage derivation.');
