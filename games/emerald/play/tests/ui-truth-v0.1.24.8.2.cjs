const fs=require('fs');
const html=fs.readFileSync('index.html','utf8');
const strategy=fs.readFileSync('strategy-pokedex-v0.1.24.8.2.js','utf8');
const ui=fs.readFileSync('transfer-files-v0.1.24.8.2.js','utf8');
const css=fs.readFileSync('transfer-files-v0.1.24.8.2.css','utf8');
const live=fs.readFileSync('pokefield-live-v0.1.24.8.2.js','utf8');
const must=[
  ['active transfer css',html.includes('transfer-files-v0.1.24.8.2.css')],
  ['active transfer ui',html.includes('transfer-files-v0.1.24.8.2.js')],
  ['active truthful compiler',html.includes('transfer-compiler-v0.1.24.8.2.js')],
  ['active strategy handoff',html.includes('strategy-pokedex-v0.1.24.8.2.js')],
  ['old home ui inactive',!html.includes('home-bridge-v0.1.24.js')],
  ['button renamed transfer',strategy.includes('>TRANSFER</button>')&&!strategy.includes('>HOME</button>')],
  ['new event only',strategy.includes('jrpg:transfer-files-open')&&!strategy.includes('jrpg:home-bridge-open')],
  ['no future route cards',!ui.includes('TARGET BIND NEXT')&&!ui.includes('<b>HOME</b>')&&!ui.includes('<b>PK6</b>')],
  ['truth boundary visible',ui.includes('It does not send a Pokémon to Switch, Pokémon HOME, Bank, a 3DS, or any online service.')],
  ['stale send-to-switch cleanup',ui.includes('SEND TO SWITCH')],
  ['mobile full viewport',css.includes('height:100dvh')&&css.includes('#transfer-files-modal{padding:0;display:block;background:#061419}')],
  ['scroll lock',css.includes('html.transfer-files-open,html.transfer-files-open body{overflow:hidden')],
  ['build label bumped',live.includes('Emerald v0.1.24.8.2 · TRANSFER TRUTH UI')],
];
for(const [name,ok] of must){if(!ok)throw new Error('FAIL '+name);console.log('PASS '+name)}
console.log('PASS UI truth/full-screen checks '+must.length+'/'+must.length);
