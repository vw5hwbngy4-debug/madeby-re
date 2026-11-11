const fs=require('fs');
const path=require('path');
const root=path.resolve(__dirname,'..');
const read=f=>fs.readFileSync(path.join(root,f),'utf8');
const idx=read('index.html');
const sv=read('save-vault-v0.1.13.5.js');
const ux=read('mobile-ux-v0.1.24.5.css');
const pf=read('pokefield-live-v0.1.24.5.js');
const checks=[
 ['index uses durable vault 13.5', idx.includes('save-vault-v0.1.13.5.js?v=0.1.13.5')],
 ['index uses mobile UX 24.5', idx.includes('mobile-ux-v0.1.24.5.css?v=0.1.24.5')],
 ['index uses live 24.5', idx.includes('pokefield-live-v0.1.24.5.js?v=0.1.24.5')],
 ['Safari global import picker preserved', sv.includes("picker.id='sv-import-file-global'") && sv.includes("picker.addEventListener('change'")],
 ['Vault docks below game into Pokefield header', sv.includes("document.querySelector('#pokefield-live-panel .pf-head-actions')") && sv.includes("launch.classList.add('sv-docked')")],
 ['Switch stages isolated mGBA save path', sv.includes('__JRPG_VAULT_ACTIVE_')],
 ['Switch verifies runtime bytes', sv.includes('verifiedPath') && sv.includes('verifiedBytes')],
 ['Switch commits selected to slot 1 only after runtime load', sv.indexOf('const loaded=await hardLoadRuntimeBytes(selected.bytes') < sv.indexOf('await uploadBytes(selected.bytes,1,true)')],
 ['Switch preserves previous active in source slot', sv.includes('if(previous)await uploadBytes(previous.bytes,slot,true)')],
 ['Duplicate visible slots expose recovery', sv.includes('THE SAME SAVE IS IN MULTIPLE SLOTS') && sv.includes('OPEN PREVIOUS SAVES')],
 ['History recovers into empty slot', sv.includes('RECOVER TO SAVE ${emptyTarget}')],
 ['Expanded mode uses document flow', ux.includes('max-height:none !important') && ux.includes('overflow:visible !important')],
 ['Mobile page scroll explicitly enabled', ux.includes('overflow-y:auto !important')],
 ['Undocked mobile vault cannot cover game', ux.includes('#save-vault-launch:not(.sv-docked)') || read('save-vault-v0.1.13.5.css').includes('#save-vault-launch:not(.sv-docked)')],
 ['Mobile starts compact', pf.includes('let compactMode = !!MOBILE_DISPLAY.matches')],
];
let failed=0;for(const [name,ok] of checks){console.log(`${ok?'PASS':'FAIL'} ${name}`);if(!ok)failed++}
if(failed)process.exit(1);
