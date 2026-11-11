const SV_BUILD='0.1.13.7';
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

const S={configured:null,auth:false,username:null,csrf:'',slots:[],serverBytes:null,serverSha:'',initialReady:false,M:null,wrapped:false,callbacks:false,lastCounter:null,lastClientSha:'',uploading:false,pendingBytes:null,localBest:null,history:[],serverError:'',watchText:'WATCHING GAME SAVE',lastUploadError:'',serverResolved:false,bridgeReady:false,captureBlockedUntil:0,importStatus:{},importTargetSlot:0,importPickToken:0,authView:'login',authDraft:{loginUser:'',loginPass:'',newUser:'',newPass:''},historyTargetSlot:0};


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
    SERVER_ERROR:'Something went wrong while saving. Please try again.',
    INVALID_EMERALD_SAVE:'That file could not be parsed as a Pokémon Emerald save.',
    INVALID_OR_INCOMPLETE_EMERALD_SAVE:'The server rejected this file as an incomplete Emerald save.',
    SAVE_TOO_LARGE:'That save file is larger than the supported Emerald save size.',
    SAVE_MUST_BE_128KB_OR_MGBA_RTC:'Use a 128 KiB Emerald .sav (or 128 KiB + 16-byte mGBA RTC footer).',
    OCTET_STREAM_REQUIRED:'The save upload reached the server in the wrong format.',
    AUTH_REQUIRED:'Your Save Vault session expired. Sign in again.',
    IMPORT_READ_FAILED:'Safari could not read the selected .sav. Select it again.',
    IMPORT_VERIFY_FAILED:'The server did not return the same save after upload. Nothing was activated.',
    UPLOAD_NOT_VISIBLE:'The server accepted the save but it did not appear in this Vault slot.',
    FILE_PICKER_FAILED:'The file picker could not be opened. Tap Import .SAV again.',
    NETWORK_TIMEOUT:'The Save Vault server did not answer in time.',
    SLOT_DOWNLOAD_FAILED:'The selected save could not be downloaded from your Vault.',
    RUNTIME_SWITCH_FAILED:'The selected save could not be verified inside the running emulator. Your Vault was not changed.',
    SWITCH_COMMIT_FAILED:'The selected save loaded, but the Vault switch could not be committed safely. The previous active save was kept in history.',
    SNAPSHOT_RECOVERY_FAILED:'That earlier save could not be restored into a visible slot.'
  };
  if(map[code])return map[code];
  if(/^HTTP_\d+$/.test(String(code||'')))return `Save Vault server error (${code}).`;
  if(/Failed to fetch|NetworkError|Load failed/i.test(String(code||'')))return 'Could not reach emerald-api.wolken.page. Check the connection and try again.';
  return `Import failed: ${String(code||'UNKNOWN_ERROR')}`;
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
  M.__POKEFIELD_ORIGINAL_LOAD_GAME__=original;
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

function blockCapture(ms=30000){
  S.captureBlockedUntil=Math.max(Number(S.captureBlockedUntil)||0,Date.now()+ms);
}
function captureBlocked(){return Date.now()<(Number(S.captureBlockedUntil)||0)}
function sleepMs(ms){return new Promise(resolve=>setTimeout(resolve,ms))}
async function sameBytesHash(bytes,expectedHash){
  if(!bytes)return false;
  try{return (await sha256(bytes))===expectedHash}catch{return false}
}
async function hardLoadRuntimeBytes(bytes,parsed,label='SAVE'){
  if(!bytes||!parsed)return false;
  const M=S.M;
  if(!M){setWatchStatus(`${label} READY · LOAD EMERALD TO APPLY`,true);return false}
  const incoming=new Uint8Array(bytes),incomingHash=await sha256(incoming);
  blockCapture(45000);
  const gamePath=String(M.gameName||'');
  const priorPath=String(activeSavePath(M)||'');
  if(!gamePath){setWatchStatus(`${label} READY · LOAD EMERALD TO APPLY`,true);return false}

  // Never replace the file the old running core owns. A late SRAM flush from
  // the old core can still arrive after quit on mobile Safari. Stage the chosen
  // save on a fresh handoff path, so an old flush has nowhere to overwrite it.
  const handoff=`/data/saves/__JRPG_VAULT_ACTIVE_${incomingHash.slice(0,16)}.sav`;
  setWatchStatus(`${label} SELECTED · STOPPING CURRENT EMERALD SAFELY`,true);
  try{M.pauseGame?.()}catch{}
  try{M.quitGame?.()}catch(e){console.warn('Save Vault quit before switch failed',e)}
  await sleepMs(420);
  try{await M.FSSync?.()}catch(e){console.warn('Save Vault pre-switch sync failed',e)}

  if(!writeSaveToPath(M,handoff,incoming)){
    S.captureBlockedUntil=0;
    setWatchStatus(`${label} COULD NOT BE STAGED`,false);
    return false;
  }
  try{await M.FSSync?.()}catch(e){console.warn('Save Vault handoff sync failed',e)}
  const staged=readSaveAtPath(M,handoff);
  if(!await sameBytesHash(staged,incomingHash)){
    S.captureBlockedUntil=0;
    setWatchStatus(`${label} HANDOFF VERIFY FAILED`,false);
    return false;
  }

  const loader=M.__POKEFIELD_ORIGINAL_LOAD_GAME__ || M.loadGame?.bind(M);
  if(typeof loader!=='function'){
    S.captureBlockedUntil=0;
    setWatchStatus(`${label} COULD NOT RESTART EMERALD`,false);
    return false;
  }
  let ok=false;
  try{ok=!!loader(gamePath,handoff)}catch(e){console.warn('Save Vault isolated reload failed',e)}
  if(!ok){S.captureBlockedUntil=0;setWatchStatus(`${label} COULD NOT RESTART EMERALD`,false);return false}

  await sleepMs(700);
  const activePath=String(activeSavePath(M)||'');
  let activeBytes=null;
  try{activeBytes=bytesFrom(M.getSave?.())||readSaveAtPath(M,activePath)}catch{}
  const verifiedPath=activePath===handoff;
  const verifiedBytes=await sameBytesHash(activeBytes,incomingHash);
  if(!verifiedPath||!verifiedBytes){
    console.warn('Save Vault runtime verification failed',{priorPath,handoff,activePath,verifiedPath,verifiedBytes});
    S.captureBlockedUntil=0;
    setWatchStatus(`${label} RUNTIME VERIFY FAILED · VAULT NOT CHANGED`,false);
    return false;
  }
  S.localBest={path:handoff,bytes:new Uint8Array(incoming),parsed};
  setWatchStatus(`${label} LOADED · ${parsed.name}`,true);
  return true;
}

async function activateSaveBytes(bytes,parsed,label='SAVE'){
  if(!bytes||!parsed)return false;
  const incoming=new Uint8Array(bytes),incomingHash=await sha256(incoming);
  S.serverBytes=incoming;
  S.serverSha=incomingHash;
  S.lastClientSha=incomingHash;
  const loaded=await hardLoadRuntimeBytes(incoming,parsed,label);
  if(loaded){setTimeout(()=>{S.captureBlockedUntil=0;try{captureAndUpload(S.M,true)}catch{}},6000)}
  return loaded;
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

async function uploadBytes(bytes,slot=1,force=false){if(!S.auth||!bytes)return null;const p=parseSave(bytes);if(!p)throw new Error('INVALID_EMERALD_SAVE');const hash=await sha256(bytes);if(!force&&slot===1&&hash===S.lastClientSha)return null;if(S.uploading&&slot===1){S.pendingBytes=new Uint8Array(bytes);return null}if(slot===1)S.uploading=true;try{const r=await fetch(`${API}?action=upload&slot=${slot}`,{method:'POST',credentials:'include',cache:'no-store',headers:{'Content-Type':'application/octet-stream','X-CSRF-Token':S.csrf,'X-Pokefield-Version':SV_BUILD},body:bytes});const j=await r.json().catch(()=>({}));if(!r.ok)throw new Error(j.error||`HTTP_${r.status}`);if(slot===1){S.lastClientSha=hash;S.serverBytes=new Uint8Array(bytes);S.serverSha=hash}await refreshSlots();S.lastUploadError='';setWatchStatus('SAVED',true);if(slot===1)notifyVaultCommit({bytes:new Uint8Array(bytes),sha256:hash,source:'save-vault-upload'});return j}finally{if(slot===1){S.uploading=false;if(S.pendingBytes){const next=S.pendingBytes;S.pendingBytes=null;setTimeout(()=>uploadBytes(next,1),0)}}}}

async function captureAndUpload(M,force=false){
  if(!S.auth||!M||captureBlocked())return;
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

function setImportStatus(slot,text,kind='info'){
  S.importStatus[slot]={text:String(text||''),kind};
  const el=document.querySelector(`[data-import-status="${slot}"]`);
  if(el){el.textContent=text;el.dataset.kind=kind;el.hidden=!text}
}
function clearImportStatus(slot){delete S.importStatus[slot];const el=document.querySelector(`[data-import-status="${slot}"]`);if(el){el.textContent='';el.hidden=true}}

async function verifyStoredSlot(slot,expectedBytes){
  const expectedHash=await sha256(expectedBytes);
  let lastError='';
  for(let attempt=0;attempt<2;attempt++){
    try{
      const r=await fetch(`${API}?action=download&slot=${slot}&_=${Date.now()}`,{credentials:'include',cache:'no-store'});
      if(!r.ok){lastError=`HTTP_${r.status}`}
      else{
        const got=new Uint8Array(await r.arrayBuffer());
        if(parseSave(got)&&(await sha256(got))===expectedHash)return true;
        lastError='HASH_MISMATCH';
      }
    }catch(e){lastError=e?.message||String(e)}
    if(attempt===0)await sleepMs(350);
  }
  console.warn('Save Vault import round-trip verification failed',slot,lastError);
  throw new Error('IMPORT_VERIFY_FAILED');
}

async function fetchSlotBytes(slot){
  const r=await fetch(`${API}?action=download&slot=${slot}&_=${Date.now()}`,{credentials:'include',cache:'no-store'});
  if(!r.ok)throw new Error('SLOT_DOWNLOAD_FAILED');
  const bytes=new Uint8Array(await r.arrayBuffer()),parsed=parseSave(bytes);
  if(!parsed)throw new Error('INVALID_EMERALD_SAVE');
  return {bytes,parsed,hash:await sha256(bytes)};
}

async function restoreHistoricalSnapshotToSlot(snapshotId,toSlot){
  if(!snapshotId||![2,3].includes(Number(toSlot)))return;
  try{
    await guarded('restore_snapshot',{snapshot_id:Number(snapshotId),to_slot:Number(toSlot)});
    await refreshSlots();
    if(!S.slots.some(x=>x.slot===Number(toSlot)))throw new Error('SNAPSHOT_RECOVERY_FAILED');
    showToast(`EARLIER SAVE RECOVERED TO SAVE ${toSlot}`,'ok');
    S.historyTargetSlot=0;
    renderAll();
  }catch(e){showToast(friendlyVaultError(e?.message||'SNAPSHOT_RECOVERY_FAILED'),'bad');throw e}
}

async function switchSlotSafely(slot){
  slot=Number(slot);
  if(![2,3].includes(slot))return;

  // First capture the currently running native save while SAVE 1 still means
  // the old active world. Only after that snapshot is safe do we stop the core.
  try{if(S.M){await S.M.FSSync?.();await captureAndUpload(S.M,true)}}catch(e){console.warn('Pre-switch capture failed',e)}

  const selected=await fetchSlotBytes(slot);
  let previous=null;
  try{previous=await fetchSlotBytes(1)}catch(e){if(e?.message!=='SLOT_DOWNLOAD_FAILED')throw e}
  if(previous?.hash===selected.hash){
    const loaded=await hardLoadRuntimeBytes(selected.bytes,selected.parsed,`SAVE ${slot}`);
    if(!loaded)throw new Error('RUNTIME_SWITCH_FAILED');
    setTimeout(()=>{S.captureBlockedUntil=0},6000);
    showToast(`SAVE ${slot} ALREADY MATCHES ACTIVE · ${selected.parsed.name}`,'ok');
    closeModal();
    return;
  }

  blockCapture(45000);
  const loaded=await hardLoadRuntimeBytes(selected.bytes,selected.parsed,`SAVE ${slot}`);
  if(!loaded){
    // The server has not been touched. Try to reopen the old runtime if we have it.
    if(previous)try{await hardLoadRuntimeBytes(previous.bytes,previous.parsed,'PREVIOUS SAVE')}catch{}
    S.captureBlockedUntil=0;
    throw new Error('RUNTIME_SWITCH_FAILED');
  }

  try{
    // Commit only after the emulator has proved it is actually using the chosen
    // bytes. SAVE 1 receives the chosen save; the source slot receives the old
    // SAVE 1, making this a visible SWAP instead of a destructive copy.
    await uploadBytes(selected.bytes,1,true);
    if(previous)await uploadBytes(previous.bytes,slot,true);
    await fetchServerActive();
    await refreshSlots();
    S.serverBytes=new Uint8Array(selected.bytes);
    S.serverSha=selected.hash;
    S.lastClientSha=selected.hash;
    setTimeout(()=>{S.captureBlockedUntil=0;try{captureAndUpload(S.M,true)}catch{}},6000);
    showToast(`SWITCHED TO ${selected.parsed.name} · PREVIOUS SAVE PRESERVED`,'ok');
    closeModal();
    try{window.scrollTo({top:0,behavior:'smooth'})}catch{}
  }catch(e){
    console.error('Save Vault safe switch commit failed',e);
    // Runtime is already on the selected save. Keep capture blocked to prevent a
    // half-committed server state from being overwritten by background capture.
    S.captureBlockedUntil=Date.now()+60000;
    throw new Error('SWITCH_COMMIT_FAILED');
  }
}

async function copySlot(from,to){await guarded('copy',{from,to});await refreshSlots()}
async function downloadSlot(slot){const r=await fetch(`${API}?action=download&slot=${slot}`,{credentials:'include',cache:'no-store'});if(!r.ok){showToast('DOWNLOAD FAILED','bad');return}const blob=await r.blob(),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;const rec=S.slots.find(x=>x.slot===slot);a.download=`Emerald_${(rec?.trainer_name||'Trainer').replace(/[^A-Za-z0-9_-]+/g,'_')}_SAVE${slot}.sav`;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000)}
async function importSav(file,slot){
  setImportStatus(slot,`READING ${file?.name||'SAVE'}…`,'busy');
  let bytes;
  try{bytes=new Uint8Array(await file.arrayBuffer())}
  catch(e){setImportStatus(slot,'COULD NOT READ SELECTED FILE','bad');throw new Error('IMPORT_READ_FAILED')}
  setImportStatus(slot,`READ ${bytes.length.toLocaleString()} BYTES · VALIDATING…`,'busy');
  const parsed=parseSave(bytes);
  if(!parsed){setImportStatus(slot,'NOT A VALID EMERALD .SAV','bad');throw new Error('INVALID_EMERALD_SAVE')}
  setImportStatus(slot,`VALID · ${parsed.name} · ${parsed.playTime} · UPLOADING TO SAVE ${slot}…`,'busy');
  if(slot===1)blockCapture(30000);
  try{
    await uploadBytes(bytes,slot,true);
    setImportStatus(slot,`SERVER STORED · VERIFYING SAVE ${slot}…`,'busy');
    await verifyStoredSlot(slot,bytes);
    await refreshSlots();
    if(!S.slots.some(x=>x.slot===slot))throw new Error('UPLOAD_NOT_VISIBLE');
    setImportStatus(slot,`IMPORTED · ${parsed.name} · ${bytes.length.toLocaleString()} BYTES`,'ok');
    if(slot===1){
      const loaded=await activateSaveBytes(bytes,parsed,'SAVE 1');
      showToast(loaded?`SAVE 1 LOADED · ${parsed.name}`:`SAVE 1 READY · LOAD EMERALD`,'ok');
      return;
    }
    showToast(`SAVE ${slot} IMPORTED · ${parsed.name} · TAP USE THIS SAVE`,'ok');
  }catch(e){
    if(slot===1)S.captureBlockedUntil=0;
    setImportStatus(slot,`IMPORT FAILED · ${friendlyVaultError(e?.message)}`,'bad');
    throw e;
  }
}
async function restoreSlotToActive(slot){
  try{await switchSlotSafely(slot)}
  catch(e){S.captureBlockedUntil=0;showToast(friendlyVaultError(e?.message),'bad');throw e}
}
async function loadHistory(slot=1,targetSlot=0){if(!S.auth)return;S.historyTargetSlot=Number(targetSlot)||0;try{const r=await fetch(`${API}?action=history&slot=${slot}`,{credentials:'include',cache:'no-store'});const j=await r.json();if(!r.ok)throw new Error(j.error||`HTTP_${r.status}`);S.history=j.history||[];renderHistory(slot)}catch(e){showToast('COULDN’T LOAD SAVE HISTORY','bad')}}

function slotCard(slot){
  const r=S.slots.find(x=>x.slot===slot),st=S.importStatus[slot],active=S.slots.find(x=>x.slot===1);
  const duplicate=!!(slot>1&&r?.sha256&&active?.sha256&&r.sha256===active.sha256);
  const status=`<div class="sv-import-status" data-import-status="${slot}" data-kind="${esc(st?.kind||'info')}" ${st?.text?'':'hidden'}>${esc(st?.text||'')}</div>`;
  if(!r)return `<article class="sv-slot sv-empty"><div class="sv-slot-head"><strong>SAVE ${slot}${slot===1?' · ACTIVE':''}</strong><span>EMPTY</span></div><p>No save here yet.</p>${status}<div class="sv-actions">${slot>1&&S.slots.some(x=>x.slot===1)?`<button data-copy="${slot}">COPY ACTIVE SAVE HERE</button>`:''}<button type="button" class="sv-import" data-import-pick="${slot}">IMPORT .SAV</button></div></article>`;
  return `<article class="sv-slot ${slot===1?'sv-active':''} ${duplicate?'sv-duplicate':''}"><div class="sv-slot-head"><strong>SAVE ${slot}${slot===1?' · ACTIVE':''}</strong><span class="sv-ok">${duplicate?'DUPLICATE':'☁ SAVED'}</span></div><div class="sv-trainer">${esc(r.trainer_name)}</div><div class="sv-grid"><span>PLAY TIME<b>${esc(r.play_time)}</b></span><span>TRAINER ID<b>${String(r.trainer_id).padStart(5,'0')}</b></span><span>LAST SAVED<b>${esc(fmtDate(r.created_at))}</b></span></div>${status}<div class="sv-actions"><button data-download="${slot}">DOWNLOAD .SAV</button>${slot===1?`<button data-history="1">PREVIOUS SAVES</button>`:`<button class="sv-primary" data-restore="${slot}">SWITCH TO THIS SAVE</button>`}${slot>1?`${duplicate?`<button data-history-repair="${slot}">REPLACE DUPLICATE WITH EARLIER SAVE</button>`:''}<button data-copy="${slot}">REPLACE WITH ACTIVE SAVE</button><button type="button" class="sv-import" data-import-pick="${slot}">IMPORT DIFFERENT .SAV</button>`:''}</div>${slot>1?`<p class="sv-switch-note">${duplicate?'This slot is byte-for-byte the same as SAVE 1. Replace it with an earlier snapshot or import a different .sav. The current server API does not expose destructive slot deletion.':'Switching swaps this slot with the active save, so neither save disappears.'}</p>`:''}</article>`;
}
function ensureGlobalImportPicker(){
  let picker=document.getElementById('sv-import-file-global');
  if(picker)return picker;
  picker=document.createElement('input');
  picker.id='sv-import-file-global';
  picker.type='file';
  picker.accept='.sav,application/octet-stream';
  picker.setAttribute('aria-hidden','true');
  picker.tabIndex=-1;
  // Keep the native picker input alive outside the frequently re-rendered slot DOM.
  // iOS can keep its Files sheet open long enough for renderAll() to replace slot cards.
  // A detached per-card input then never bubbles its change event back to the modal.
  picker.style.cssText='position:fixed;left:-10000px;top:0;width:1px;height:1px;opacity:0;pointer-events:none';
  picker.addEventListener('change',async()=>{
    const slot=Number(S.importTargetSlot||0),file=picker.files?.[0];
    const token=S.importPickToken;
    if(!slot||!file){if(slot)clearImportStatus(slot);S.importTargetSlot=0;return}
    // Capture File + target before any subsequent UI render.
    S.importTargetSlot=0;
    try{await importSav(file,slot)}
    catch(err){showToast(friendlyVaultError(err.message),'bad')}
    finally{if(S.importPickToken===token){try{picker.value=''}catch{}}}
  });
  document.body.appendChild(picker);
  return picker;
}
function openImportPicker(slot){
  if(!slot)return;
  const picker=ensureGlobalImportPicker();
  S.importTargetSlot=slot;
  S.importPickToken=(Number(S.importPickToken)||0)+1;
  setImportStatus(slot,'CHOOSE AN EMERALD .SAV…','busy');
  try{picker.value='';picker.click()}
  catch(e){S.importTargetSlot=0;setImportStatus(slot,'COULD NOT OPEN FILE PICKER','bad');showToast(friendlyVaultError('FILE_PICKER_FAILED'),'bad')}
}

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

function dockVaultLaunch(){
  const launch=document.getElementById('save-vault-launch');
  const actions=document.querySelector('#pokefield-live-panel .pf-head-actions');
  if(!launch||!actions)return false;
  if(launch.parentElement!==actions){
    const compact=actions.querySelector('#pf-compact-toggle');
    if(compact)actions.insertBefore(launch,compact);else actions.appendChild(launch);
  }
  launch.classList.add('sv-docked');
  launch.setAttribute('aria-label','Open Save Vault');
  launch.title='Save Vault';
  return true;
}

function ensureUi(){if(document.getElementById('save-vault-launch'))return;const gate=document.createElement('div');gate.id='sv-gate';gate.innerHTML='<div class="sv-gate-card"><b>🔐 SAVE VAULT</b><span id="sv-gate-text">Checking your saves…</span></div>';document.body.appendChild(gate);const launch=document.createElement('button');launch.id='save-vault-launch';launch.innerHTML='<span>☁</span><b>SAVE VAULT</b><small id="sv-launch-status">checking…</small>';document.body.appendChild(launch);const modal=document.createElement('div');modal.id='save-vault-modal';modal.hidden=true;const devBlock=DEBUG_UI?`<details class="sv-tech" id="sv-local-diagnostics"><summary>DEVELOPER DIAGNOSTICS</summary><div id="sv-local-diagnostics-body"></div></details>`:'';modal.innerHTML=`<section class="sv-panel" role="dialog" aria-modal="true" aria-label="Save Vault"><header class="sv-modal-bar"><div><small>EMERALD · MADEBY.RE · EMERALD</small><h2>SAVE VAULT</h2><p id="sv-account-line"></p></div><button id="sv-close" type="button" aria-label="Back to game">← GAME</button></header><div class="sv-panel-scroll"><div id="sv-assurance" class="sv-assurance" hidden></div><div id="sv-body"></div><div id="sv-history" hidden></div><div class="sv-footer-actions"><button id="sv-logout" hidden>LOG OUT</button><button id="sv-back-game" type="button">BACK TO GAME</button></div>${devBlock}</div></section>`;document.body.appendChild(modal);launch.onclick=openModal;modal.querySelector('#sv-close').onclick=closeModal;modal.querySelector('#sv-back-game').onclick=closeModal;modal.addEventListener('click',e=>{if(e.target===modal)closeModal()});modal.querySelector('#sv-logout').onclick=logout;modal.addEventListener('submit',e=>{e.preventDefault();const id=e.target?.id;if(id==='sv-login-form')document.getElementById('sv-login')?.click();if(id==='sv-register-form')document.getElementById('sv-register')?.click()});modal.addEventListener('click',async e=>{const t=e.target;if(t.dataset?.importPick){openImportPicker(Number(t.dataset.importPick));return}if(t.id==='sv-show-register'){rememberAuthDraft();S.authView='register';ensureAuthMounted(document.getElementById('sv-body'));document.querySelector('.sv-panel-scroll')?.scrollTo({top:0,behavior:'smooth'});setTimeout(()=>document.getElementById('sv-new-user')?.focus(),60);return}if(t.id==='sv-show-login'){rememberAuthDraft();S.authView='login';ensureAuthMounted(document.getElementById('sv-body'));document.querySelector('.sv-panel-scroll')?.scrollTo({top:0,behavior:'smooth'});setTimeout(()=>document.getElementById('sv-login-user')?.focus(),60);return}if(t.id==='sv-login'){try{await login(document.getElementById('sv-login-user').value,document.getElementById('sv-login-pass').value);closeModal();showToast('SIGNED IN','ok')}catch(err){showToast(friendlyVaultError(err.message),'bad')}}if(t.id==='sv-register'){
  const userEl=document.getElementById('sv-new-user'),passEl=document.getElementById('sv-new-pass');
  const username=normalizeUsernameInput(userEl?.value),password=passEl?.value||'',problem=usernameProblem(username);
  if(problem){setFormError('sv-register-error',problem,'sv-new-user');return}
  if(password.length<10){setFormError('sv-register-error','Password must be at least 10 characters.','sv-new-pass');return}
  setFormError('sv-register-error','');
  try{await register(username,password);closeModal();showToast('SAVE VAULT CREATED','ok')}
  catch(err){const msg=friendlyVaultError(err.message);setFormError('sv-register-error',msg,err.message==='PASSWORD_MIN_10'?'sv-new-pass':'sv-new-user');showToast(msg,'bad')}
}if(t.dataset.download)await downloadSlot(Number(t.dataset.download));if(t.dataset.copy){const to=Number(t.dataset.copy);if(confirm(`Replace SAVE ${to} with the current active SAVE 1?`))await copySlot(1,to)}if(t.dataset.restore){const from=Number(t.dataset.restore);if(confirm(`Switch to SAVE ${from}? Your current active save will move into SAVE ${from}, so both are preserved.`))await restoreSlotToActive(from)}if(t.dataset.history)await loadHistory(Number(t.dataset.history));if(t.dataset.historyRepair)await loadHistory(1,Number(t.dataset.historyRepair));if(t.dataset.recoverSnapshot){const id=Number(t.dataset.recoverSnapshot),to=Number(t.dataset.recoverTo);if(confirm(`Recover this earlier save into SAVE ${to}?`))await restoreHistoricalSnapshotToSlot(id,to)}});
modal.addEventListener('keydown',e=>{if(e.key!=='Enter')return;if(e.target?.id==='sv-new-user'){e.preventDefault();document.getElementById('sv-new-pass')?.focus()}else if(e.target?.id==='sv-new-pass'){e.preventDefault();document.getElementById('sv-register')?.click()}else if(e.target?.id==='sv-login-user'){e.preventDefault();document.getElementById('sv-login-pass')?.focus()}else if(e.target?.id==='sv-login-pass'){e.preventDefault();document.getElementById('sv-login')?.click()}})}
function closeModal(){const modal=document.getElementById('save-vault-modal');if(modal)modal.hidden=true;document.documentElement.classList.remove('sv-modal-open')}
function openModal(){const modal=document.getElementById('save-vault-modal');if(!modal)return;modal.hidden=false;document.documentElement.classList.add('sv-modal-open');renderAll();requestAnimationFrame(()=>{const sc=modal.querySelector('.sv-panel-scroll');if(sc)sc.scrollTop=0})}
function setCloudStatus(text,ok){const el=document.getElementById('sv-launch-status');if(el){const a=S.slots.find(x=>x.slot===1);el.textContent=!ok?'SAVE ISSUE':(a?`${a.trainer_name} · ${a.play_time} · SAVED`:'READY')}const box=document.getElementById('sv-assurance');if(box&&S.auth)box.classList.toggle('sv-bad',!ok)}
function showToast(text,kind='ok'){let el=document.getElementById('sv-toast');if(!el){el=document.createElement('div');el.id='sv-toast';document.body.appendChild(el)}el.className=kind;el.textContent=text;el.hidden=false;clearTimeout(showToast.t);showToast.t=setTimeout(()=>el.hidden=true,3200)}
function renderHistory(slot){
  const el=document.getElementById('sv-history');if(!el)return;
  const forcedTarget=[2,3].includes(Number(S.historyTargetSlot))?Number(S.historyTargetSlot):0;
  const emptyTarget=!S.slots.some(x=>x.slot===3)?3:(!S.slots.some(x=>x.slot===2)?2:0);
  const target=forcedTarget||emptyTarget;
  el.hidden=false;
  el.innerHTML=`<h3>PREVIOUS ACTIVE SAVES</h3><p>${forcedTarget?`Choose an earlier SAVE 1 snapshot to replace duplicate SAVE ${forcedTarget}.`:'These are earlier server snapshots of SAVE 1. Recover one into an empty visible slot first; nothing is overwritten.'}</p><div class="sv-history-list">${S.history.map((r,i)=>`<div><span><b>${esc(r.trainer_name)}</b> · ${esc(r.play_time)}<small>${esc(fmtDate(r.created_at))}</small></span>${i===0?'<em>CURRENT / LATEST</em>':(target?`<button data-recover-snapshot="${r.id}" data-recover-to="${target}">${forcedTarget?`REPLACE SAVE ${target}`:`RECOVER TO SAVE ${target}`}</button>`:'<em>FREE SAVE 2 OR 3 TO RECOVER</em>')}</div>`).join('')||'<p>No earlier saves yet.</p>'}</div>`;
}
function renderAll(){
  ensureUi();
  dockVaultLaunch();
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
  const activeRec=S.slots.find(x=>x.slot===1);
  const dupes=activeRec?.sha256?S.slots.filter(x=>x.slot!==1&&x.sha256&&x.sha256===activeRec.sha256):[];
  const recovery=dupes.length?`<div class="sv-recovery-note"><b>THE SAME SAVE IS IN MULTIPLE SLOTS</b><span>Your previous active save may still be in server history.</span><button data-history="1">OPEN PREVIOUS SAVES</button></div>`:'';
  body.innerHTML=recovery+[1,2,3].map(slotCard).join('');
  const a=activeRec;
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

async function boot(){ensureUi();ensureGlobalImportPicker();installVaultInputShield();document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!document.getElementById('save-vault-modal')?.hidden)closeModal()});renderAll();primeServer().catch(e=>{console.error(e);S.initialReady=true;renderAll()});setInterval(async()=>{dockVaultLaunch();const M=globalThis.__POKEFIELD_MGBA__;if(M){S.M=M;hookMgbaCallbacks(M);wrapMgba(M);wrapLocalSaveImporter(M);installSaveCallback(M);S.bridgeReady=!!M.__POKEFIELD_LOAD_WRAPPED__;await maybeMigrateLocal();renderAll()}},500);setInterval(()=>{if(S.M&&S.auth)captureAndUpload(S.M)},900);document.addEventListener('visibilitychange',()=>{if(document.hidden&&S.M&&S.auth)captureAndUpload(S.M,true)});window.addEventListener('pagehide',()=>{if(S.M&&S.auth)captureAndUpload(S.M,true)})}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();


// v0.1.13.7 — narrow public transaction seam for Emerald · MadeBy.
// mGBA remains the only runtime save owner; callers receive/can replace only the active bytes.
const __vaultCommitListeners=new Set();
function notifyVaultCommit(detail){for(const fn of [...__vaultCommitListeners]){try{Promise.resolve(fn(detail)).catch(()=>{})}catch{}}}
async function bridgeActiveSnapshot({serverBackup=true}={}){
  if(!S.M)throw new Error('MGBA_NOT_READY');
  try{await S.M.FSSync?.()}catch{}
  const scan=chooseCaptureCandidate(S.M),c=scan.candidate;
  if(!c?.bytes||!c.parsed)throw new Error('NO_ACTIVE_EMERALD_SAVE');
  const bytes=new Uint8Array(c.bytes),hash=await sha256(bytes);
  // This is the mutation barrier: current bytes must reach the existing Vault first,
  // producing the normal server snapshot/history before Hoenn is allowed to change them.
  if(serverBackup){if(!S.auth)throw new Error('AUTH_REQUIRED');await uploadBytes(bytes,1,true)}
  return {bytes,sha256:hash,parsed:c.parsed,path:c.path||activeSavePath(S.M),username:S.username};
}
async function bridgeApplyMutation(mutatedBytes,{expectedBeforeSha256='',label='EMERALD · MADEBY.RE'}={}){
  const before=await bridgeActiveSnapshot({serverBackup:true});
  if(expectedBeforeSha256&&before.sha256!==expectedBeforeSha256)throw new Error('ACTIVE_SAVE_CHANGED');
  const incoming=new Uint8Array(mutatedBytes||[]),p=parseSave(incoming);if(!p)throw new Error('INVALID_EMERALD_SAVE');
  const incomingSha=await sha256(incoming);if(incomingSha===before.sha256)return {before_sha256:before.sha256,after_sha256:incomingSha,changed:false,rollback:before.bytes};
  let loaded=false;
  try{
    loaded=await hardLoadRuntimeBytes(incoming,p,label);if(!loaded)throw new Error('RUNTIME_SWITCH_FAILED');
    await uploadBytes(incoming,1,true);
    S.captureBlockedUntil=0;
    return {before_sha256:before.sha256,after_sha256:incomingSha,changed:true,rollback:before.bytes};
  }catch(e){
    console.error('Save Vault transaction failed; rolling back',e);
    try{const oldParsed=parseSave(before.bytes);await hardLoadRuntimeBytes(before.bytes,oldParsed,`${label} ROLLBACK`);await uploadBytes(before.bytes,1,true)}catch(re){console.error('Save Vault rollback failed',re)}
    S.captureBlockedUntil=0;throw e;
  }
}
globalThis.JRPGWorldSaveVaultBridge=Object.freeze({
  version:'0.1.13.7',
  getSession:()=>({authenticated:!!S.auth,username:S.username,csrf:S.csrf,api:API}),
  getActiveSnapshot:bridgeActiveSnapshot,
  applyMutation:bridgeApplyMutation,
  onCommittedSave(fn){if(typeof fn!=='function')throw new TypeError('listener must be a function');__vaultCommitListeners.add(fn);return()=>__vaultCommitListeners.delete(fn)},
  forceSync:async()=>{if(!S.M)throw new Error('MGBA_NOT_READY');try{await S.M.FSSync?.()}catch{}return bridgeActiveSnapshot({serverBackup:true})}
});
window.dispatchEvent(new CustomEvent('jrpgworld:save-vault-bridge-ready',{detail:{version:'0.1.13.7'}}));
