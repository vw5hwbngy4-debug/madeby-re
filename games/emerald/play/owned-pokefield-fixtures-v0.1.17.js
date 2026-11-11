// Loaded exclusively by the debug picker. Never published to Emerald's state.
export function fixtures(mode) {
  if(new URLSearchParams(location.search).get('debug')!=='1') return [];
  if(mode==='zero')return [];
  const party=Array.from({length:6},(_,i)=>({personality:100+i,otId:42,checksum:1000+i,dexNo:i<2?280:[0,0,258,255,252,25][i],species:['Ralts','Ralts','Mudkip','Torchic','Treecko','Pikachu'][i],genderSymbol:i%2?'♂':'♀',kind:'OWNED',level:[18,16,25,30,5,40][i],nature:i%2?'Bold':'Timid',ivs:{hp:i?10+i:31,atk:i?i:31,def:20+i,spa:i===0?31:12,spe:31-i,spd:25},evs:{hp:i*4,atk:0,def:0,spa:0,spd:0,spe:0},evTotal:i*4,hiddenPower:{type:i%2?'Fire':'Ice',power:60},pokerus:{state:['none','active','cured'][i%3]},ribbons:{count:i,names:[]},shiny:{isShiny:i===4},friendship:70+i*20,moves:[]}));
  party[0].ivs={hp:31,atk:31,def:31,spa:31,spd:31,spe:31};
  party[1].ivs={hp:1,atk:2,def:3,spa:4,spd:5,spe:6};
  party.forEach(m=>{m.ivTotal=Object.values(m.ivs).reduce((a,b)=>a+b,0);m.ivAverage=m.ivTotal/6;});
  return mode==='one'?party.slice(0,1):party;
}
