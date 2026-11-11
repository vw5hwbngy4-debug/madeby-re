const fs=require('fs'),p=require('path'),root=p.resolve(__dirname,'..');
const read=f=>fs.readFileSync(p.join(root,f),'utf8');
const idx=read('index.html'),live=read('pokefield-live-v0.1.24.8.3.js'),tc=read('trainer-card-v0.1.24.8.3.js'),sv=read('save-vault-v0.1.13.6.js'),css=read('qol-v0.1.24.8.3.css');
const checks=[
 ['active 8.3 live',idx.includes('pokefield-live-v0.1.24.8.3.js')],
 ['active 8.3 trainer',idx.includes('trainer-card-v0.1.24.8.3.js')],
 ['active vault 1.13.6',idx.includes('save-vault-v0.1.13.6.js')],
 ['party open default',live.includes('id="pf-owned-drawer" class="pf-drawer" open')],
 ['compact remembers origin',live.includes("let compactReturnTarget = 'live'")&&live.includes('currentExpandedSurface()')&&live.includes('restoreExpandedSurface()')],
 ['field return supported',live.includes("return 'field'")&&live.includes('[data-mode="${target}"]')],
 ['team lab return supported',live.includes("return 'teamlab'")],
 ['trainer return supported',live.includes("return 'trainer'")],
 ['dex return supported',live.includes("return 'dex'")&&live.includes("set?.('dex')")],
 ['saved find delete ui',tc.includes('data-box-delete=')&&tc.includes('function deleteSavedFind')],
 ['saved delete cleans card',tc.includes('store.slots = store.slots.map(id => id === captureId ? null : id)')],
 ['transfer discoverable live',tc.includes('TRANSFER FILES')&&tc.includes("jrpg:transfer-files-open")],
 ['duplicate detected',sv.includes("duplicate=!!(slot>1&&r?.sha256")&&sv.includes('DUPLICATE')],
 ['duplicate repair history',sv.includes('data-history-repair')&&sv.includes('historyTargetSlot')],
 ['no fake vault delete action',!sv.includes("guarded('delete'")&&!sv.includes('action=delete')],
 ['safari durable picker retained',sv.includes('sv-import-file-global')&&sv.includes('Keep the native picker input alive')],
 ['qol css active',idx.includes('qol-v0.1.24.8.3.css')&&css.includes('.tc-box-delete')],
 ['version',read('VERSION.txt').trim()==='0.1.24.8.3']
];
let ok=0;for(const [n,v] of checks){console.log(v?'PASS':'FAIL',n);if(v)ok++;}console.log(`QOL checks ${ok}/${checks.length}`);if(ok!==checks.length)process.exit(1);
