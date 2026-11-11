const fs=require('fs');
const live=fs.readFileSync('pokefield-live-v0.1.24.8.3.1.js','utf8');
const idx=fs.readFileSync('index.html','utf8');
const checks=[
 ['active new live module',idx.includes('pokefield-live-v0.1.24.8.3.1.js')],
 ['drawer is open in markup',/id="pf-owned-drawer"[^>]*\bopen\b/.test(live)],
 ['old mobile auto-collapse removed',!live.includes("drawer.open=false")],
 ['party summary preserved',live.includes('6 Pokémon · tap to inspect') || live.includes('Pokémon · tap to inspect')],
 ['version',fs.readFileSync('VERSION.txt','utf8').trim()==='0.1.24.8.3.1']
];
let fail=0; for(const [name,ok] of checks){console.log(`${ok?'PASS':'FAIL'} — ${name}`); if(!ok)fail++;} process.exitCode=fail?1:0;
