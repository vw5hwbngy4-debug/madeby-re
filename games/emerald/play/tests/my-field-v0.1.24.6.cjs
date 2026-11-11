const fs=require('fs');
const field=require('../owned-pokefield-v0.1.24.6.js');
const fake={
 party:[{personality:1,otId:2,dexNo:373,species:'Salamence',kind:'OWNED',shiny:{isShiny:true},pokerus:{state:'cured'},moves:[{name:'Dragon Dance'}],ivs:{hp:31,atk:31,def:31,spa:31,spd:31,spe:31},ivTotal:186,evTotal:510,hiddenPower:{type:'Dark',power:70},level:100,genderSymbol:'♂'}],
 boxes:[{personality:3,otId:4,dexNo:289,species:'Slaking',kind:'BOXED',shiny:{isShiny:false},pokerus:{state:'none'},moves:[],ivs:{hp:20,atk:20,def:20,spa:20,spd:20,spe:20},ivTotal:120,evTotal:0,hiddenPower:{type:'Fire',power:60},level:50,storage:{box:0,slot:0},genderSymbol:'♂'}]
};
const rows=field.adapt(fake);
if(rows.length!==2)throw new Error('party+boxes not combined');
if(!rows[0].sprite.includes('pokemon-shiny/373.png'))throw new Error('shiny sprite not selected');
if(rows[1].sprite.includes('pokemon-shiny'))throw new Error('normal sprite wrong');
const m=new field.FieldModel();m.update(fake);if(m.active().length!==2)throw new Error('full owned field not default');
if(m.runCall({category:'PARTY'})!==1)throw new Error('PARTY call failed');
if(m.active().length!==2)throw new Error('CALL removed nonresponders');
if(!m.focusResponses()||m.active().length!==1)throw new Error('FOCUS failed');
m.scatter();if(m.active().length!==2)throw new Error('SCATTER failed');
const live=fs.readFileSync(require.resolve('../pokefield-live-v0.1.24.6.js'),'utf8');
for(const [i,n] of [[366,289],[329,350],[400,376],[397,373]])if(!live.includes(`"${i}":${n}`))throw new Error(`missing internal->national ${i}->${n}`);
const index=fs.readFileSync(require.resolve('../index.html'),'utf8');
if(!index.includes('save-vault-v0.1.13.5'))throw new Error('Safari durable vault lost');
if(!index.includes('mobile-ux-v0.1.24.5.css'))throw new Error('mobile flow fix lost');
if(!index.includes('owned-pokefield-v0.1.24.6.js'))throw new Error('new field not wired');
console.log('PASS: full owned Field, CALL highlight semantics, FOCUS/SCATTER, shiny routing, exact Emerald species map, durable vault preserved');
