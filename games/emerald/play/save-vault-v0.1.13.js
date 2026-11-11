const SV_BUILD='0.1.13';
const DEBUG_UI=(()=>{try{const q=new URLSearchParams(location.search);return q.get('debug')==='1'||q.has('debug')||localStorage.getItem('pokefield-debug')==='1'}catch{return false}})();
const API='https://emerald-api.madeby.re/api/vault';
const LEGACY_CANONICAL_SAVE_PATH='/data/saves/JRPG_WORLD_EMERALD_BPEE_REV0.sav';
const SAVE_SIZE=128*1024;
const RTC_FOOTER_SIZE=16;
const SAVE_SIZE_WITH_RTC=SAVE_SIZE+RTC_FOOTER_SIZE;
function supportedSaveLength(n){return n===SAVE_SIZE||n===SAVE_SIZE_WITH_RTC}
const SECTOR_SIZE=0x1000;
const SECTION_ID_OFFSET=0xFF4;
const SIGNATURE_OFFSET=0xFF8;
const COUNTER_OFFSET=0xFFC;
const EMERALD_SIGNATURE=0x08012025;

const S={configured:null,auth:false,username:null,csrf:'',slots:[],serverBytes:null,serverSha:'',initialReady:false,M:null,wrapped:false,callbacks:false,lastCounter:null,lastClientSha:'',uploading:false,pendingBytes:null,localBest:null,history:[],serverError:'',watchText:'WATCHING GAME SAVE',lastUploadError:'',serverResolved:false,bridgeReady:false,authView:'login',authDraft:{loginUser:'',loginPass:'',newUser:'',newPass:''}};


// v0.1.10.2: catch the mGBA instance the instant the React runtime publishes it.
// This makes the Save Vault bridge deterministic instead of depending on a polling race.
(function installMgbaGlobalHook(){
  let current=globalThis.__POKEFIELD_MGBA__;
  const attach=(v)=>{
    if(!v)return;
    try{
      S.M=v;
      hookMgbaCallbacks(v);
      wrapMgba(v);
      wrapLocalSaveImporter(v);
      installSaveCallback(v);
      S.bridgeReady=!!v.__POKEFIELD_LOAD_WRAPPED__;
      if(S.serverBytes)stageServerSaveForNextBoot();
      queueMicrotask(()=>{try{maybeMigrateLocal()}catch{}});
      queueMicrotask(()=>{try{renderAll()}catch{}});
    }catch(e){console.warn('Early mGBA Save Vault attach failed',e)}
  };
  try{
    Object.defineProperty(globalThis,'__POKEFIELD_MGBA__',{configurable:true,get(){return current},set(v){current=v;attach(v)}});
    if(current)queueMicrotask(()=>attach(current));
  }catch(e){console.warn('Could not install early mGBA assignment hook',e)}
})();

function u16(b,o){return (b[o]|(b[o+1]<<8))>>>0}
function u32(b,o){return (b[o]|(b[o+1]<<8)|(b[o+2]<<16)|(b[o+3]<<24))>>>0}
function decodeGen3Text(bytes){let out='';for(const c of bytes){if(c===0xFF||c===0x00)break;if(c>=0xBB&&c<=0xD4)out+=String.fromCharCode(65+c-0xBB);else if(c>=0xD5&&c<=0xEE)out+=String.fromCharCode(97+c-0xD5);else if(c>=0xA1&&c<=0xAA)out+=String.fromCharCode(48+c-0xA1);else if(c===0xAB)out+='!';else if(c===0xAC)out+='?';else if(c===0xB4)out+="'";else if(c===0xB8)out+=',';else if(c===0xBA)out+='/';else out+='·'}return out.replace(/·+$/,'').trim()}
function parseSave(bytes){if(!bytes||!supportedSaveLength(bytes.length))return null;const core=bytes.length===SAVE_SIZE?bytes:bytes.subarray(0,SAVE_SIZE);const groups=new Map();for(let sector=0;sector<32;sector++){const base=sector*SECTOR_SIZE,id=u16(core,base+SECTION_ID_OFFSET),sig=u32(core,base+SIGNATURE_OFFSET),counter=u32(core,base+COUNTER_OFFSET);if(sig!==EMERALD_SIGNATURE||id>13)continue;if(!groups.has(counter))groups.set(counter,new Map());groups.get(counter).set(id,base)}const counters=[...groups.keys()].sort((a,b)=>b-a);for(const counter of counters){const g=groups.get(counter);if(g.size<14||![...Array(14).keys()].every(i=>g.has(i)))continue;const base=g.get(0),hours=u16(core,base+0x0E),minutes=core[base+0x10]||0,seconds=core[base+0x11]||0;return{name:decodeGen3Text(core.slice(base,base+8))||'UNKNOWN',trainerId:String(u16(core,base+0x0A)).padStart(5,'0'),secretId:String(u16(core,base+0x0C)).padStart(5,'0'),counter,playTime:`${hours}:${String(minutes).padStart(2,'0')}:${String(seconds).padStart(2,'0')}`,rtcFooter:bytes.length===SAVE_SIZE_WITH_RTC}}return null}
function analyzeRawSave(bytes){
  const out={bytes:bytes?.length||0,signatureSectors:0,validSectionIds:[],counters:{},nonFF:0,non00:0};
  if(!bytes)return out;
  for(let i=0;i<bytes.length;i++){if(bytes[i]!==0xFF)out.nonFF++;if(bytes[i]!==0x00)out.non00++;}
  const sectors=Math.floor(bytes.length/SECTOR_SIZE);
  for(let sector=0;sector<sectors;sector++){
    const base=sector*SECTOR_SIZE;
    if(base+COUNTER_OFFSET+4>bytes.length)break;
    const id=u16(bytes,base+SECTION_ID_OFFSET),sig=u32(bytes,base+SIGNATURE_OFFSET),counter=u32(bytes,base+COUNTER_OFFSET);
    if(sig===EMERALD_SIGNATURE){
      out.signatureSectors++;
      if(id<=13){out.validSectionIds.push(id);const k=String(counter);if(!out.counters[k])out.counters[k]=[];out.counters[k].push(id)}
    }
  }
  out.validSectionIds=[...new Set(out.validSectionIds)].sort((a,b)=>a-b);
  out.counterSummary=Object.entries(out.counters).sort((a,b)=>Number(b[0])-Number(a[0])).slice(0,4).map(([c,ids])=>`#${c}: ${[...new Set(ids)].sort((a,b)=>a-b).join(',')}`);
  return out;
}
function localRawCandidate(M){
  const all=collectSaveCandidates(M);
  return all.find(x=>x.active&&x.bytes)||all.find(x=>x.parsed)||all.find(x=>supportedSaveLength(x.bytes.length))||all[0]||null;
}
function downloadLocalRaw(){
  const c=S.M?localRawCandidate(S.M):null;
  if(!c){showToast('NO LOCAL SAVE FILE FOUND','bad');return}
  const blob=new Blob([c.bytes],{type:'application/octet-stream'}),url=URL.createObjectURL(blob),a=document.createElement('a');
  a.href=url;a.download=`Pokefield_local_raw_${Date.now()}.sav`;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
  showToast('LOCAL RAW .SAV EXPORTED','ok');
}
function localDiagnosticsHtml(){
  const c=S.M?localRawCandidate(S.M):null;if(!c)return '<p>No local save file is currently visible to mGBA.</p>';
  const d=analyzeRawSave(c.bytes),parsed=parseSave(c.bytes),rtc=c.bytes.length===SAVE_SIZE_WITH_RTC;
  return `<p><b>SOURCE:</b> <code>${esc(c.source)}</code></p><p><b>ACTIVE mGBA PATH:</b> <code>${esc(activeSavePath(S.M)||'not selected yet')}</code></p><p><b>BYTES:</b> ${d.bytes.toLocaleString()}</p><p><b>mGBA RTC FOOTER:</b> ${rtc?'PRESENT · 16 BYTES':'NOT PRESENT'}</p><p><b>EMERALD SIGNATURE SECTORS:</b> ${d.signatureSectors}</p><p><b>SECTION IDS SEEN:</b> ${d.validSectionIds.length?d.validSectionIds.join(', '):'none'}</p><p><b>COUNTERS:</b> ${d.counterSummary.length?esc(d.counterSummary.join(' | ')):'none'}</p><p><b>PARSER:</b> ${parsed?'VALID · '+esc(parsed.name)+' · #'+parsed.counter:'NOT YET A COMPLETE EMERALD SAVE'}</p>`;
}

function esc(v){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]))}
function fmtDate(v){if(!v)return'—';const d=new Date(v.replace?.(' ','T')||v);return Number.isNaN(d.getTime())?String(v):d.toLocaleString([], {day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'})}
function bytesFrom(v){if(!v)return null;if(v instanceof Uint8Array)return new Uint8Array(v);if(v instanceof ArrayBuffer)return new Uint8Array(v);if(ArrayBuffer.isView(v))return new Uint8Array(v.buffer,v.byteOffset,v.byteLength);return null}
async function sha256(bytes){const h=await crypto.subtle.digest('SHA-256',bytes);return [...new Uint8Array(h)].map(x=>x.toString(16).padStart(2,'0')).join('')}

async function jsonFetch(action,{method='GET',body=null,headers={}}={}){const r=await fetch(`${API}?action=${encodeURIComponent(action)}`,{method,credentials:'include',cache:'no-store',headers:{...(body&&!(body instanceof Uint8Array)?{'Content-Type':'application/json'}:{}),...headers},body:body==null?null:(body instanceof Uint8Array?body:JSON.stringify(body))});let j={};try{j=await r.json()}catch{}if(!r.ok)throw Object.assign(new Error(j.error||`HTTP_${r.status}`),{status:r.status,data:j});return j}
async function guarded(action,body){return jsonFetch(action,{method:'POST',body,headers:{'X-CSRF-Token':S.csrf}})}

function normalizeUsernameInput(value){return String(value??'').trim().replace(/\s+/g,' ')}
function usernameProblem(value){
  const v=normalizeUsernameInput(value);
  if(v.length<3)return 'Choose a username with at least 3 characters.';
  if(v.length>32)return 'Username can be at most 32 characters.';
  try{if(!/^[\p{L}\p{N}._ \-]+$/u.test(v))return 'Use letters, numbers, spaces, dot, underscore or dash.'}
  catch{if(!/^[A-Za-z0-9._ \-]+$/.test(v))return 'Use letters, numbers, spaces, dot, underscore or dash.'}
  return '';
}
function friendlyVaultError(code){
  const map={
    USERNAME_INVALID:'Use 3–32 characters: letters, numbers, spaces, dot, underscore or dash.',
    USERNAME_3_32_LETTERS_NUMBERS_DOT_DASH:'Use 3–32 characters: letters, numbers, spaces, dot, underscore or dash.',
    USERNAME_EXISTS:'That username is already in use. Try signing in or choose another.',
    PASSWORD_MIN_10:'Password must be at least 10 characters.',
    INVALID_LOGIN:'Username or password is incorrect.',
    SERVER_VAULT_NOT_CONFIGURED:'Save Vault is unavailable right now.',
    ORIGIN_NOT_ALLOWED:'Save Vault is unavailable on this page.',
    TOO_MANY_AUTH_ATTEMPTS:'Too many sign-in attempts. Try again in a few minutes.',
    CSRF_FAILED:'Your session expired. Sign in again.',
    SERVER_ERROR:'Something went wrong while saving. Please try again.'
  };
  return map[code]||'Something went wrong. Please try again.';
}
function setFormError(id,message,inputId){
  const el=document.getElementById(id);if(el){el.textContent=message;el.hidden=!message}
  document.querySelectorAll('#save-vault-modal .sv-input-error').forEach(x=>x.classList.remove('sv-input-error'));
  if(inputId){const input=document.getElementById(inputId);if(input){input.classList.add('sv-input-error');input.focus()}}
}

async function refreshSession(){try{const j=await jsonFetch('status');S.configured=true;S.serverError='';S.auth=!!j.authenticated;S.username=j.username||null;S.csrf=j.csrf||''}catch(e){S.configured=false;S.serverError=e?.message||'SERVER_UNREACHABLE';S.auth=false;S.username=null;S.csrf=''}renderAll()}
async function refreshSlots(){if(!S.auth){S.slots=[];return}const j=await jsonFetch('list');S.slots=j.slots||[];renderAll()}
async function fetchServerActive(){S.serverBytes=null;S.serverSha='';S.serverResolved=false;if(!S.auth){S.serverResolved=true;return}try{const r=await fetch(`${API}?action=latest&slot=1`,{credentials:'include',cache:'no-store'});if(r.status===404)return;if(!r.ok)throw new Error(`HTTP_${r.status}`);const buf=new Uint8Array(await r.arrayBuffer());if(parseSave(buf)){S.serverBytes=buf;S.serverSha=r.headers.get('X-Pokefield-Sha256')||''}}catch(e){console.warn('Server Save Vault fetch',e)}finally{S.serverResolved=true}}
async function primeServer(){await refreshSession();if(S.auth){await Promise.all([refreshSlots(),fetchServerActive()])}S.initialReady=true;renderAll();stageServerSaveForNextBoot()}

async function register(username,password){username=normalizeUsernameInput(username);const j=await guarded('register',{username,password});S.auth=true;S.username=j.username;S.csrf=j.csrf;await Promise.all([refreshSlots(),fetchServerActive()]);S.initialReady=true;renderAll();await maybeMigrateLocal();stageServerSaveForNextBoot()}
async function login(username,password){username=normalizeUsernameInput(username);const j=await guarded('login',{username,password});S.auth=true;S.username=j.username;S.csrf=j.csrf;await Promise.all([refreshSlots(),fetchServerActive()]);S.initialReady=true;renderAll();await maybeMigrateLocal();stageServerSaveForNextBoot()}
async function logout(){await guarded('logout',{});S.authView='login';S.auth=false;S.username=null;S.csrf='';S.slots=[];S.serverBytes=null;S.history=[];S.serverResolved=false;S.initialReady=false;await refreshSession();S.initialReady=true;renderAll()}

function nativeSavePathForGame(gamePath){
  const p=String(gamePath||'');
  if(!p)return '';
  const parts=p.split('.');
  parts.pop();
  return (parts.join('.')+'.sav').replace('/data/games/','/data/saves/');
}
function activeSavePath(M,gamePath='',explicitSaveName){
  if(explicitSaveName)return String(explicitSaveName);
  if(gamePath)return nativeSavePathForGame(gamePath);
  if(M?.saveName)return String(M.saveName);
  const g=M?.gameName||'';
  return g?nativeSavePathForGame(g):'';
}
function ensureSaveDir(M){
  try{if(M?.FS&&!M.FS.analyzePath('/data/saves').exists)M.FS.mkdir('/data/saves')}catch{}
}
function writeSaveToPath(M,path,bytes){
  if(!M?.FS||!path||!bytes)return false;
  try{ensureSaveDir(M);M.FS.writeFile(path,new Uint8Array(bytes));return true}catch(e){console.error('Save Vault write failed',path,e);return false}
}
function readSaveAtPath(M,path){
  if(!M?.FS||!path)return null;
  try{if(!M.FS.analyzePath(path).exists)return null;return new Uint8Array(M.FS.readFile(path))}catch{return null}
}
function moduleSaves(M){
  const out=[];
  try{
    for(const name of M.listSaves?.()||[]){
      if(name==='.'||name==='..'||!String(name).toLowerCase().endsWith('.sav'))continue;
      const path=`/data/saves/${name}`;
      const bytes=readSaveAtPath(M,path);if(!bytes)continue;
      out.push({path,bytes,parsed:parseSave(bytes)});
    }
  }catch{}
  return out;
}
function activeLocalCandidate(M){
  const path=activeSavePath(M);if(!path)return null;
  let bytes=null;
  try{if(typeof M.getSave==='function')bytes=bytesFrom(M.getSave())}catch{}
  if(!bytes)bytes=readSaveAtPath(M,path);
  if(!bytes)return {source:path,path,bytes:null,parsed:null,active:true};
  return {source:'mGBA active save',path,bytes,parsed:parseSave(bytes),active:true};
}
function validLocalSaves(M){return moduleSaves(M).filter(x=>x.parsed).sort((a,b)=>b.parsed.counter-a.parsed.counter)}
function maybeAdoptUnambiguousLocalSave(M,targetPath){
  if(!M||!targetPath)return null;
  const existing=readSaveAtPath(M,targetPath);
  if(existing&&parseSave(existing))return {path:targetPath,bytes:existing,parsed:parseSave(existing),adopted:false};
  const candidates=validLocalSaves(M).filter(x=>x.path!==targetPath);
  if(candidates.length!==1)return null;
  const only=candidates[0];
  if(!writeSaveToPath(M,targetPath,only.bytes))return null;
  try{const sync=M.FSSync?.();if(sync&&typeof sync.catch==='function')sync.catch(()=>{})}catch{}
  return {path:targetPath,bytes:new Uint8Array(only.bytes),parsed:only.parsed,adopted:true,from:only.path};
}
function wrapLocalSaveImporter(M){
  if(!M||typeof M.uploadSaveOrSaveState!=='function'||M.__POKEFIELD_LOCAL_IMPORT_WRAPPED__)return;
  const original=M.uploadSaveOrSaveState.bind(M);
  M.__POKEFIELD_LOCAL_IMPORT_WRAPPED__=true;
  M.uploadSaveOrSaveState=(file,callback)=>original(file,async()=>{
    try{
      if(String(file?.name||'').toLowerCase().endsWith('.sav')){
        const importedPath='/data/saves/'+file.name;
        const bytes=readSaveAtPath(M,importedPath),parsed=bytes?parseSave(bytes):null;
        if(parsed){
          const target=activeSavePath(M);
          if(target){
            if(target!==importedPath)writeSaveToPath(M,target,bytes);
            try{await M.FSSync?.()}catch{}
            S.localBest={path:target,bytes:new Uint8Array(bytes),parsed};
            setWatchStatus(`IMPORTED SAVE ATTACHED TO mGBA PATH · ${parsed.name} · RELOAD ROM`,true);
          }else{
            S.localBest={path:importedPath,bytes:new Uint8Array(bytes),parsed};
            setWatchStatus(`IMPORTED EMERALD SAVE · ${parsed.name} · LOAD ROM TO ATTACH`,true);
          }
          if(S.auth&&!S.slots.some(x=>x.slot===1)){
            try{await uploadBytes(bytes,1,true)}catch(e){console.warn('Imported save server migration failed',e)}
          }
        }
      }
    }finally{try{callback?.()}catch{}}
  });
}
async function maybeMigrateLocal(){
  if(!S.auth||!S.M)return;
  const active=activeLocalCandidate(S.M);
  S.localBest=active?.parsed?active:null;
  const serverActive=S.slots.find(x=>x.slot===1);
  if(!serverActive&&active?.parsed){
    try{
      await uploadBytes(active.bytes,1,true);
      S.serverBytes=new Uint8Array(active.bytes);
      await refreshSlots();
      showToast(`SAVE READY · ${active.parsed.name}`,'ok');
    }catch(e){console.warn('Local migration failed',e)}
  }
}
function stageServerSaveForNextBoot(){
  if(!S.serverBytes)return;
  if(S.M&&activeSavePath(S.M))setWatchStatus('SERVER SAVE READY · RELOAD ROM TO APPLY',true);
}

function wrapMgba(M){
  if(!M||typeof M.loadGame!=='function')return;
  if(M.__POKEFIELD_LOAD_WRAPPED__){S.bridgeReady=true;return}
  const original=M.loadGame.bind(M);
  M.__POKEFIELD_LOAD_WRAPPED__=true;
  S.bridgeReady=true;
  M.loadGame=(gamePath,saveName)=>{
    if(S.auth&&!S.serverResolved){
      setWatchStatus('WAITING FOR SERVER SAVE LOOKUP...',false);
      openModal();
      showToast('YOUR SAVES ARE STILL LOADING. TRY AGAIN IN A MOMENT.','bad');
      return false;
    }
    if(S.auth&&S.slots.some(x=>x.slot===1)&&!S.serverBytes){
      setWatchStatus('SERVER SAVE RECORD FOUND - BYTES NOT READY',false);
      openModal();
      showToast('YOUR SAVE IS STILL LOADING. TRY AGAIN IN A MOMENT.','bad');
      return false;
    }

    // v0.1.11 invariant: mGBA owns save routing. We only write bytes into
    // the path mGBA itself would use for this ROM; we never replace saveName.
    const target=activeSavePath(M,gamePath,saveName);
    if(S.auth&&S.serverBytes){
      if(!writeSaveToPath(M,target,S.serverBytes)){
        setWatchStatus('SERVER SAVE COULD NOT BE MIRRORED TO mGBA PATH',false);
        openModal();
        return false;
      }
      try{const sync=M.FSSync?.();if(sync&&typeof sync.catch==='function')sync.catch(()=>{})}catch{}
      setWatchStatus(`SERVER SAVE MIRRORED TO mGBA PATH · ${target.split('/').pop()}`,true);
    }else{
      const adopted=maybeAdoptUnambiguousLocalSave(M,target);
      if(adopted?.adopted)setWatchStatus(`LOCAL EMERALD SAVE REATTACHED · ${adopted.parsed.name}`,true);
      else if(adopted)setWatchStatus(`mGBA NATIVE SAVE READY · ${adopted.parsed.name}`,true);
      else setWatchStatus(`mGBA OWNS SAVE PATH · ${target.split('/').pop()||'waiting'}`,true);
    }

    // Preserve the original call contract exactly. If no explicit save name
    // was supplied, mGBA derives /data/saves/<ROM basename>.sav itself.
    const ok=original(gamePath,saveName);
    if(ok){
      const actual=activeSavePath(M);
      setWatchStatus(`ACTIVE mGBA SAVE · ${actual.split('/').pop()||'waiting'}`,true);
      setTimeout(()=>captureAndUpload(M),800);
    }
    return ok;
  };
}

function setWatchStatus(text,ok=true){
  S.watchText=text;
  setCloudStatus(text,ok);
  const el=document.getElementById('sv-watch-status');
  if(el)el.textContent=text;
}

function vaultSaveSignal(M){
  if(!M)return;
  setWatchStatus('GAME SAVE DETECTED - COMMITTING',true);
  try{
    const sync=M.FSSync?.();
    if(sync&&typeof sync.then==='function')sync.then(()=>captureAndUpload(M,true)).catch(()=>{});
  }catch{}
  for(const ms of [80,300,900,1800,3500,7000,12000])setTimeout(()=>captureAndUpload(M,true),ms);
}

function hookMgbaCallbacks(M){
  if(!M||M.__POKEFIELD_SAVE_HOOKED__)return;
  M.__POKEFIELD_SAVE_HOOKED__=true;
  if(typeof M.addCoreCallbacks==='function'){
    const originalAdd=M.addCoreCallbacks.bind(M);
    M.addCoreCallbacks=(callbacks={})=>{
      const prior=callbacks.saveDataUpdatedCallback;
      return originalAdd({...callbacks,saveDataUpdatedCallback:(...args)=>{
        try{if(typeof prior==='function')prior(...args)}finally{vaultSaveSignal(M)}
      }});
    };
    // If mGBA registered its callback before our hook, replace only the save callback.
    // Its original save callback only called FSSync; vaultSaveSignal does that too.
    try{M.addCoreCallbacks({saveDataUpdatedCallback:()=>vaultSaveSignal(M)})}catch(e){console.warn('Save callback bridge install failed',e)}
  }
}

function collectSaveCandidates(M){
  const out=[],seen=new Set();
  const activePath=activeSavePath(M);
  const add=(source,value,path='',active=false)=>{
    const bytes=bytesFrom(value);if(!bytes)return;
    const key=(path||source)+':'+bytes.length;if(seen.has(key))return;seen.add(key);
    out.push({source,path,active,bytes,parsed:parseSave(bytes)});
  };
  try{if(activePath&&typeof M?.getSave==='function')add('mGBA active save',M.getSave(),activePath,true)}catch{}
  try{if(activePath){const b=readSaveAtPath(M,activePath);if(b)add(activePath,b,activePath,true)}}catch{}
  try{for(const name of M?.listSaves?.()||[]){
    if(name==='.'||name==='..'||!String(name).toLowerCase().endsWith('.sav'))continue;
    const path='/data/saves/'+name;
    const b=readSaveAtPath(M,path);if(b)add(path,b,path,path===activePath);
  }}catch{}
  return out;
}
function chooseCaptureCandidate(M){
  const all=collectSaveCandidates(M);
  const active=all.filter(x=>x.active);
  const validActive=active.find(x=>x.parsed);
  if(validActive)return {candidate:validActive,all,active};
  // Never auto-upload a different .sav just because it has a higher counter.
  // The server mirror follows the save mGBA is actually using.
  return {candidate:null,all,active};
}

function installSaveCallback(M){if(!M)return;hookMgbaCallbacks(M);S.callbacks=true}

async function uploadBytes(bytes,slot=1,force=false){if(!S.auth||!bytes)return null;const p=parseSave(bytes);if(!p)throw new Error('INVALID_EMERALD_SAVE');const hash=await sha256(bytes);if(!force&&slot===1&&hash===S.lastClientSha)return null;if(S.uploading&&slot===1){S.pendingBytes=new Uint8Array(bytes);return null}if(slot===1)S.uploading=true;try{const r=await fetch(`${API}?action=upload&slot=${slot}`,{method:'POST',credentials:'include',cache:'no-store',headers:{'Content-Type':'application/octet-stream','X-CSRF-Token':S.csrf,'X-Pokefield-Version':SV_BUILD},body:bytes});const j=await r.json().catch(()=>({}));if(!r.ok)throw new Error(j.error||`HTTP_${r.status}`);if(slot===1){S.lastClientSha=hash;S.serverBytes=new Uint8Array(bytes);S.serverSha=hash}await refreshSlots();S.lastUploadError='';setWatchStatus('SAVED',true);return j}finally{if(slot===1){S.uploading=false;if(S.pendingBytes){const next=S.pendingBytes;S.pendingBytes=null;setTimeout(()=>uploadBytes(next,1),0)}}}}

async function captureAndUpload(M,force=false){
  if(!S.auth||!M)return;
  try{
    const scan=chooseCaptureCandidate(M),c=scan.candidate;
    if(!c){
      const exact=scan.active?.find(x=>supportedSaveLength(x.bytes.length));
      if(exact){const d=analyzeRawSave(exact.bytes),rtc=exact.bytes.length===SAVE_SIZE_WITH_RTC;setWatchStatus(`LOCAL ${rtc?'128KB+RTC':'128KB'} · ${d.signatureSectors} EMERALD SECTORS · NOT SERVER-SAVED`,false);}
      else if(force)setWatchStatus('WATCHING GAME SAVE · NO .SAV YET',true);
      return;
    }
    const hash=await sha256(c.bytes);
    if(hash===S.lastClientSha){
      if(force)setWatchStatus('SERVER SAVE VERIFIED ✓',true);
      return;
    }
    setWatchStatus(`LOCAL SAVE FOUND · ${c.parsed.name} · UPLOADING…`,true);
    await uploadBytes(c.bytes,1,false);
  }catch(e){
    console.warn('Server save capture',e);
    S.lastUploadError=e?.message||String(e);
    setWatchStatus(`SERVER SAVE FAILED · ${friendlyVaultError(S.lastUploadError)}`,false);
  }
}

async function copySlot(from,to){await guarded('copy',{from,to});await refreshSlots()}
async function downloadSlot(slot){const r=await fetch(`${API}?action=download&slot=${slot}`,{credentials:'include',cache:'no-store'});if(!r.ok){showToast('DOWNLOAD FAILED','bad');return}const blob=await r.blob(),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;const rec=S.slots.find(x=>x.slot===slot);a.download=`Emerald_${(rec?.trainer_name||'Trainer').replace(/[^A-Za-z0-9_-]+/g,'_')}_SAVE${slot}.sav`;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000)}
async function importSav(file,slot){const bytes=new Uint8Array(await file.arrayBuffer()),parsed=parseSave(bytes);if(!parsed){showToast("THAT FILE ISN'T A VALID EMERALD .SAV",'bad');return}await uploadBytes(bytes,slot,true);if(slot===1){const target=S.M?activeSavePath(S.M):'';if(target&&writeSaveToPath(S.M,target,bytes)){try{await S.M.FSSync?.()}catch{}S.localBest={path:target,bytes:new Uint8Array(bytes),parsed};setWatchStatus(`SAVE 1 ATTACHED TO mGBA PATH · ${parsed.name} · RELOAD ROM`,true);showToast('SAVE 1 READY · RELOAD EMERALD','ok');return}setWatchStatus(`SAVE 1 STORED ON SERVER · ${parsed.name} · LOAD ROM TO RESTORE`,true);showToast('SAVE 1 READY · LOAD EMERALD','ok');return}showToast(`SAVE ${slot} SAVED`,'ok')}
async function restoreSlotToActive(slot){if(slot===1)return;await copySlot(slot,1);await fetchServerActive();stageServerSaveForNextBoot();showToast(`SAVE ${slot} IS NOW ACTIVE · RELOAD EMERALD`,'ok')}
async function loadHistory(slot=1){if(!S.auth)return;try{const r=await fetch(`${API}?action=history&slot=${slot}`,{credentials:'include',cache:'no-store'});const j=await r.json();if(!r.ok)throw new Error(j.error||`HTTP_${r.status}`);S.history=j.history||[];renderHistory(slot)}catch(e){showToast('COULDN’T LOAD SAVE HISTORY','bad')}}

function slotCard(slot){const r=S.slots.find(x=>x.slot===slot);if(!r)return `<article class="sv-slot sv-empty"><div class="sv-slot-head"><strong>SAVE ${slot}${slot===1?' · ACTIVE':''}</strong><span>EMPTY</span></div><p>No save here yet.</p>${slot>1&&S.slots.some(x=>x.slot===1)?`<button data-copy="${slot}">COPY SAVE 1</button>`:''}<label class="sv-import">IMPORT .SAV<input type="file" data-import="${slot}" accept=".sav,application/octet-stream"></label></article>`;return `<article class="sv-slot ${slot===1?'sv-active':''}"><div class="sv-slot-head"><strong>SAVE ${slot}${slot===1?' · ACTIVE':''}</strong><span class="sv-ok">☁ SAVED</span></div><div class="sv-trainer">${esc(r.trainer_name)}</div><div class="sv-grid"><span>PLAY TIME<b>${esc(r.play_time)}</b></span><span>TRAINER ID<b>${String(r.trainer_id).padStart(5,'0')}</b></span><span>LAST SAVED<b>${esc(fmtDate(r.created_at))}</b></span></div><div class="sv-actions"><button data-download="${slot}">DOWNLOAD .SAV</button>${slot===1?`<button data-history="1">HISTORY</button>`:`<button class="sv-primary" data-restore="${slot}">USE THIS SAVE</button>`}${slot>1?`<button data-copy="${slot}">REPLACE WITH SAVE 1</button>`:''}</div></article>`}
function authHtml(){
  const create=S.authView==='register';
  const intro=create
    ? `<section class="sv-auth-intro"><h3>Create your Save Vault.</h3><p>Keep your Emerald saves with your account.</p></section>`
    : `<section class="sv-auth-intro"><h3>Welcome back.</h3><p>Sign in to continue.</p></section>`;
  const form=create
    ? `<form class="sv-auth-card sv-auth-create" id="sv-register-form" autocomplete="off"><div class="sv-auth-card-head"><h3>CREATE ACCOUNT</h3></div><label for="sv-new-user">USERNAME</label><input id="sv-new-user" name="new_vault_username" placeholder="Choose a username" autocapitalize="none" autocorrect="off" spellcheck="false" autocomplete="off" enterkeyhint="next" maxlength="32"><small class="sv-field-hint">3–32 characters · letters, numbers, spaces, . _ -</small><label for="sv-new-pass">PASSWORD</label><input id="sv-new-pass" name="new_vault_password" type="password" placeholder="Minimum 10 characters" autocomplete="new-password" enterkeyhint="go"><small class="sv-field-hint">At least 10 characters</small><div id="sv-register-error" class="sv-form-error" hidden></div><button type="submit" id="sv-register">CREATE SAVE VAULT</button></form>`
    : `<form class="sv-auth-card sv-auth-signin" id="sv-login-form" autocomplete="on"><div class="sv-auth-card-head"><h3>SIGN IN</h3></div><label for="sv-login-user">USERNAME</label><input id="sv-login-user" name="vault_username" placeholder="Your username" autocapitalize="none" autocorrect="off" spellcheck="false" autocomplete="username" enterkeyhint="next"><label for="sv-login-pass">PASSWORD</label><input id="sv-login-pass" name="vault_password" type="password" placeholder="Your password" autocomplete="current-password" enterkeyhint="go"><button type="submit" id="sv-login" class="sv-primary">SIGN IN</button></form>`;
  const switcher=create
    ? `<div class="sv-auth-switch"><span>Already have an account?</span><button type="button" id="sv-show-login">SIGN IN</button></div>`
    : `<div class="sv-auth-switch"><span>New here?</span><button type="button" id="sv-show-register">CREATE ACCOUNT</button></div>`;
  return `<div class="sv-auth-shell" data-auth-view="${create?'register':'login'}"><div class="sv-auth-hero"><img src="./assets/save-vault-auth-hero.jpg" alt="Pokémon trainers checking IVs"></div>${intro}<div class="sv-auth sv-auth-single">${form}${switcher}</div></div>`
}

const AUTH_DRAFT_FIELDS={
  'sv-login-user':'loginUser',
  'sv-login-pass':'loginPass',
  'sv-new-user':'newUser',
  'sv-new-pass':'newPass'
};
function rememberAuthField(el){
  if(!el)return;
  const key=AUTH_DRAFT_FIELDS[el.id];
  if(!key)return;
  const value=String(el.value??'');
  // iOS/Safari can clear a sibling username when a password field receives focus.
  // Never accept an EMPTY value from an input that is not actually being edited.
  if(value==='' && document.activeElement!==el && S.authDraft[key]){
    queueMicrotask(()=>restoreAuthDraft(true));
    return;
  }
  S.authDraft[key]=value;
}
function rememberAuthDraft(){
  for(const id of Object.keys(AUTH_DRAFT_FIELDS))rememberAuthField(document.getElementById(id));
}
function restoreAuthDraft(skipActive=false){
  for(const [id,key] of Object.entries(AUTH_DRAFT_FIELDS)){
    const el=document.getElementById(id);
    if(!el)continue;
    if(skipActive && document.activeElement===el)continue;
    const wanted=S.authDraft[key]||'';
    if(el.value!==wanted)el.value=wanted;
  }
}
function ensureAuthMounted(body){
  const mounted=body.querySelector('.sv-auth-shell');
  if(!mounted||mounted.dataset.authView!==S.authView){
    rememberAuthDraft();
    body.innerHTML=authHtml();
  }
  restoreAuthDraft(true);
}
function ensureUi(){if(document.getElementById('save-vault-launch'))return;const gate=document.createElement('div');gate.id='sv-gate';gate.innerHTML='<div class="sv-gate-card"><b>🔐 SAVE VAULT</b><span id="sv-gate-text">Checking your saves…</span></div>';document.body.appendChild(gate);const launch=document.createElement('button');launch.id='save-vault-launch';launch.innerHTML='<span>☁</span><b>SAVE VAULT</b><small id="sv-launch-status">checking…</small>';document.body.appendChild(launch);const modal=document.createElement('div');modal.id='save-vault-modal';modal.hidden=true;const devBlock=DEBUG_UI?`<details class="sv-tech" id="sv-local-diagnostics"><summary>DEVELOPER DIAGNOSTICS</summary><div id="sv-local-diagnostics-body"></div></details>`:'';modal.innerHTML=`<section class="sv-panel" role="dialog" aria-modal="true" aria-label="Save Vault"><header class="sv-modal-bar"><div><small>JRPG.WORLD · EMERALD</small><h2>SAVE VAULT</h2><p id="sv-account-line"></p></div><button id="sv-close" type="button" aria-label="Back to game">← GAME</button></header><div class="sv-panel-scroll"><div id="sv-assurance" class="sv-assurance" hidden></div><div id="sv-body"></div><div id="sv-history" hidden></div><div class="sv-footer-actions"><button id="sv-logout" hidden>LOG OUT</button><button id="sv-back-game" type="button">BACK TO GAME</button></div>${devBlock}</div></section>`;document.body.appendChild(modal);launch.onclick=openModal;modal.querySelector('#sv-close').onclick=closeModal;modal.querySelector('#sv-back-game').onclick=closeModal;modal.addEventListener('click',e=>{if(e.target===modal)closeModal()});modal.querySelector('#sv-logout').onclick=logout;modal.addEventListener('submit',e=>{e.preventDefault();const id=e.target?.id;if(id==='sv-login-form')document.getElementById('sv-login')?.click();if(id==='sv-register-form')document.getElementById('sv-register')?.click()});modal.addEventListener('click',async e=>{const t=e.target;if(t.id==='sv-show-register'){rememberAuthDraft();S.authView='register';ensureAuthMounted(document.getElementById('sv-body'));document.querySelector('.sv-panel-scroll')?.scrollTo({top:0,behavior:'smooth'});setTimeout(()=>document.getElementById('sv-new-user')?.focus(),60);return}if(t.id==='sv-show-login'){rememberAuthDraft();S.authView='login';ensureAuthMounted(document.getElementById('sv-body'));document.querySelector('.sv-panel-scroll')?.scrollTo({top:0,behavior:'smooth'});setTimeout(()=>document.getElementById('sv-login-user')?.focus(),60);return}if(t.id==='sv-login'){try{await login(document.getElementById('sv-login-user').value,document.getElementById('sv-login-pass').value);closeModal();showToast('SIGNED IN','ok')}catch(err){showToast(friendlyVaultError(err.message),'bad')}}if(t.id==='sv-register'){
  const userEl=document.getElementById('sv-new-user'),passEl=document.getElementById('sv-new-pass');
  const username=normalizeUsernameInput(userEl?.value),password=passEl?.value||'',problem=usernameProblem(username);
  if(problem){setFormError('sv-register-error',problem,'sv-new-user');return}
  if(password.length<10){setFormError('sv-register-error','Password must be at least 10 characters.','sv-new-pass');return}
  setFormError('sv-register-error','');
  try{await register(username,password);closeModal();showToast('SAVE VAULT CREATED','ok')}
  catch(err){const msg=friendlyVaultError(err.message);setFormError('sv-register-error',msg,err.message==='PASSWORD_MIN_10'?'sv-new-pass':'sv-new-user');showToast(msg,'bad')}
}if(t.dataset.download)await downloadSlot(Number(t.dataset.download));if(t.dataset.copy){const to=Number(t.dataset.copy);if(confirm(`Copy SAVE 1 into SAVE ${to}?`))await copySlot(1,to)}if(t.dataset.restore){const from=Number(t.dataset.restore);if(confirm(`Use SAVE ${from} as your active save?`))await restoreSlotToActive(from)}if(t.dataset.history)await loadHistory(Number(t.dataset.history));if(t.dataset.snapshot){const id=Number(t.dataset.snapshot);if(confirm('Use this earlier save as your active save?')){await guarded('restore_snapshot',{snapshot_id:id,to_slot:1});await refreshSlots();await fetchServerActive();stageServerSaveForNextBoot();showToast('EARLIER SAVE RESTORED · RELOAD EMERALD','ok')}}});modal.addEventListener('change',async e=>{const slot=Number(e.target.dataset.import||0),file=e.target.files?.[0];e.target.value='';if(slot&&file)try{await importSav(file,slot)}catch(err){showToast(friendlyVaultError(err.message),'bad')}});
modal.addEventListener('keydown',e=>{if(e.key!=='Enter')return;if(e.target?.id==='sv-new-user'){e.preventDefault();document.getElementById('sv-new-pass')?.focus()}else if(e.target?.id==='sv-new-pass'){e.preventDefault();document.getElementById('sv-register')?.click()}else if(e.target?.id==='sv-login-user'){e.preventDefault();document.getElementById('sv-login-pass')?.focus()}else if(e.target?.id==='sv-login-pass'){e.preventDefault();document.getElementById('sv-login')?.click()}})}
function closeModal(){const modal=document.getElementById('save-vault-modal');if(modal)modal.hidden=true;document.documentElement.classList.remove('sv-modal-open')}
function openModal(){const modal=document.getElementById('save-vault-modal');if(!modal)return;modal.hidden=false;document.documentElement.classList.add('sv-modal-open');renderAll();requestAnimationFrame(()=>{const sc=modal.querySelector('.sv-panel-scroll');if(sc)sc.scrollTop=0})}
function setCloudStatus(text,ok){const el=document.getElementById('sv-launch-status');if(el){const a=S.slots.find(x=>x.slot===1);el.textContent=!ok?'SAVE ISSUE':(a?`${a.trainer_name} · ${a.play_time} · SAVED`:'READY')}const box=document.getElementById('sv-assurance');if(box&&S.auth)box.classList.toggle('sv-bad',!ok)}
function showToast(text,kind='ok'){let el=document.getElementById('sv-toast');if(!el){el=document.createElement('div');el.id='sv-toast';document.body.appendChild(el)}el.className=kind;el.textContent=text;el.hidden=false;clearTimeout(showToast.t);showToast.t=setTimeout(()=>el.hidden=true,3200)}
function renderHistory(slot){const el=document.getElementById('sv-history');if(!el)return;el.hidden=false;el.innerHTML=`<h3>SAVE ${slot} HISTORY</h3><p>Choose an earlier save to restore.</p><div class="sv-history-list">${S.history.map((r,i)=>`<div><span><b>${esc(r.trainer_name)}</b> · ${esc(r.play_time)}<small>${esc(fmtDate(r.created_at))}</small></span>${i===0?'<em>LATEST</em>':`<button data-snapshot="${r.id}">RESTORE</button>`}</div>`).join('')||'<p>No earlier saves yet.</p>'}</div>`}
function renderAll(){
  ensureUi();
  const panel=document.querySelector('.sv-panel');
  if(panel)panel.classList.toggle('sv-auth-mode',S.configured!==false&&S.initialReady&&!S.auth);
  const launch=document.getElementById('sv-launch-status'),account=document.getElementById('sv-account-line'),body=document.getElementById('sv-body'),ass=document.getElementById('sv-assurance'),logoutBtn=document.getElementById('sv-logout'),gate=document.getElementById('sv-gate'),gateText=document.getElementById('sv-gate-text');
  if(ass){ass.hidden=true;ass.innerHTML=''}
  if(S.configured===false){
    rememberAuthDraft();
    launch.textContent='UNAVAILABLE';
    account.textContent='';
    if(ass){ass.hidden=false;ass.innerHTML='<b>SAVE VAULT UNAVAILABLE</b><span>Try again in a moment.</span>'}
    body.innerHTML='<div class="sv-setup"><b>SAVE VAULT UNAVAILABLE</b><p>Try again in a moment.</p></div>';
    logoutBtn.hidden=true;
    gate.hidden=false;
    gateText.textContent='Save Vault is unavailable. Try again in a moment.';
    return;
  }
  if(!S.initialReady){
    launch.textContent='CHECKING…';
    gate.hidden=false;
    gateText.textContent='Checking your saves…';
    return;
  }
  if(!S.auth){
    launch.textContent='SIGN IN';
    account.textContent='';
    ensureAuthMounted(body);
    logoutBtn.hidden=true;
    gate.hidden=false;
    gateText.innerHTML='Sign in before you start Emerald.<button id="sv-gate-open">OPEN SAVE VAULT</button>';
    setTimeout(()=>{const b=document.getElementById('sv-gate-open');if(b)b.onclick=openModal},0);
    return;
  }
  rememberAuthDraft();
  logoutBtn.hidden=false;
  account.textContent=S.username||'';
  body.innerHTML=[1,2,3].map(slotCard).join('');
  const a=S.slots.find(x=>x.slot===1);
  launch.textContent=a?`${a.trainer_name} · ${a.play_time} · SAVED`:(S.lastUploadError?'SAVE ISSUE':'READY');
  if(DEBUG_UI){const diag=document.getElementById('sv-local-diagnostics-body');if(diag)diag.innerHTML=localDiagnosticsHtml()}
  if(!S.bridgeReady){gate.hidden=false;gateText.textContent='Getting Emerald ready…';return}
  if(!S.serverResolved){gate.hidden=false;gateText.textContent='Checking your saves…';return}
  gate.hidden=true;
}

function installVaultInputShield(){
  // v0.1.9.8: never intercept keyboard events in WINDOW CAPTURE phase.
  // Doing that prevented the event from ever reaching the input itself on mobile,
  // so the field looked focused but its value stayed empty. Instead let the input
  // receive the event normally, then stop it at the Save Vault modal before it can
  // bubble to the emulator's global window keyboard handlers.
  const modal=document.getElementById('save-vault-modal');
  if(!modal)return;
  const isVaultEditor=(target)=>target instanceof Element && !!target.closest('input, textarea, select, [contenteditable="true"], [role="textbox"]');
  const stopAfterInput=(ev)=>{if(isVaultEditor(ev.target))ev.stopPropagation()};
  modal.addEventListener('keydown',stopAfterInput);
  modal.addEventListener('keyup',stopAfterInput);
  modal.addEventListener('keypress',stopAfterInput);
  modal.addEventListener('change',ev=>{if(isVaultEditor(ev.target))rememberAuthField(ev.target)},true);
  modal.addEventListener('blur',ev=>{if(isVaultEditor(ev.target))rememberAuthField(ev.target)},true);
  modal.addEventListener('focusin',()=>{setTimeout(()=>restoreAuthDraft(true),0);setTimeout(()=>restoreAuthDraft(true),80);setTimeout(()=>restoreAuthDraft(true),250)},true);
  modal.addEventListener('input',ev=>{
    if(!isVaultEditor(ev.target))return;
    rememberAuthField(ev.target);
    if(ev.target.id==='sv-new-user'||ev.target.id==='sv-new-pass'){
      const box=document.getElementById('sv-register-error');
      if(box){box.hidden=true;box.textContent=''}
      ev.target.classList.remove('sv-input-error');
    }
  });
}

async function boot(){ensureUi();installVaultInputShield();document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!document.getElementById('save-vault-modal')?.hidden)closeModal()});renderAll();primeServer().catch(e=>{console.error(e);S.initialReady=true;renderAll()});setInterval(async()=>{const M=globalThis.__POKEFIELD_MGBA__;if(M){S.M=M;hookMgbaCallbacks(M);wrapMgba(M);wrapLocalSaveImporter(M);installSaveCallback(M);S.bridgeReady=!!M.__POKEFIELD_LOAD_WRAPPED__;await maybeMigrateLocal();renderAll()}},500);setInterval(()=>{if(S.M&&S.auth)captureAndUpload(S.M)},900);document.addEventListener('visibilitychange',()=>{if(document.hidden&&S.M&&S.auth)captureAndUpload(S.M,true)});window.addEventListener('pagehide',()=>{if(S.M&&S.auth)captureAndUpload(S.M,true)})}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
