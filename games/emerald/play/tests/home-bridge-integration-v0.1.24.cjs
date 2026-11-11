const fs=require('fs');const path=require('path');const root=path.join(__dirname,'..');
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const req=[
 'home-bridge-core-v0.1.24.js','home-transfer-compiler-v0.1.24.js','home-bridge-v0.1.24.js','home-bridge-v0.1.24.css'
];
for(const x of req)if(!html.includes(x))throw new Error(`index missing ${x}`);
if(fs.readFileSync(path.join(root,'VERSION.txt'),'utf8').trim()!=='0.1.24')throw new Error('VERSION not 0.1.24');
const ui=fs.readFileSync(path.join(root,'home-bridge-v0.1.24.js'),'utf8');
for(const phrase of ['COMPILE TRANSFER PATH','PK6 TARGET BIND REQUIRED','No HOME tracker','TARGET BIND NEXT'])if(!ui.includes(phrase))throw new Error(`UI safety/product copy missing: ${phrase}`);
const compiler=fs.readFileSync(path.join(root,'home-transfer-compiler-v0.1.24.js'),'utf8');
for(const phrase of ['PK3 -> encrypted PK4 -> encrypted PK5','TRANSFER_COMPILED_TO_PK5','PK6 binary is intentionally withheld','Gen III checksum mismatch'])if(!compiler.includes(phrase))throw new Error(`compiler boundary missing: ${phrase}`);
console.log('PASS v0.1.24 integration: HTML wiring + version + compiler UI + no-fake-PK6 boundary');
