const vm=require('node:vm'),fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const context=vm.createContext({location:{search:''},URLSearchParams,structuredClone,console});
for(const file of ['specimen-notability-v0.1.18.js','pokefield-live-v0.1.9.js'])vm.runInContext(fs.readFileSync(path.join(__dirname,'..',file),'utf8'),context);
const result=vm.runInContext(`(()=>{
const m={personality:0x1234abcd,otId:42,dexNo:280,meta:{name:'Ralts',eggGroups:[]},current:{level:18,statusName:'Healthy'},gender:'Female',genderSymbol:'♀',femaleRatio:50,nature:'Timid',ability:'Synchronize',ivs:{hp:1,atk:2,def:3,spa:4,spd:5,spe:6},evs:{hp:0,atk:0,def:0,spa:0,spd:0,spe:0},totalIV:21,perfect:[],hp:{type:'Ghost',power:30},pokerus:17,pokerusInfo:{state:'active',label:'Active'},shiny:{isShiny:false,value:100},ribbons:{count:1,names:['Champion']},origin:{game:'Emerald',location:'Route 101',metLevel:5,ball:'Poké Ball',otGender:'Female'},contest:{},friendship:70,friendshipLabel:'Friendly',experience:1000,moveNames:[],languageName:'English'};
m.notability=PokeFieldNotability.assess(m);m.signal=m.notability.status;return card(m,'OWNED');
})()`,context);
for(const expected of ['DETAILS','Mirage value 43981','SPECIAL','POKÉRUS ACTIVE','RIBBONS','ORIGIN','CONTEST CONDITION'])assert.ok(result.includes(expected),expected);
assert.ok(!result.includes('>PASS<'));assert.ok(!result.includes('>KEEP<'));
console.log('PASS: canonical passport renders weak-IV active-Pokerus/ribbon specimen with SPECIAL reasons, Mirage value, and existing DETAILS sections.');
