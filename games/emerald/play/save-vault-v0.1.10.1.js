const SV_BUILD='0.1.10.1';
const API='https://emerald-api.madeby.re/api/vault';
const CANONICAL_SAVE_PATH='/data/saves/JRPG_WORLD_EMERALD_BPEE_REV0.sav';
const SAVE_SIZE=128*1024;
const SECTOR_SIZE=0x1000;
const SECTION_ID_OFFSET=0xFF4;
const SIGNATURE_OFFSET=0xFF8;
const COUNTER_OFFSET=0xFFC;
const EMERALD_SIGNATURE=0x08012025;

const S={configured:null,auth:false,username:null,csrf:'',slots:[],serverBytes:null,serverSha:'',initialReady:false,M:null,wrapped:false,callbacks:false,lastCounter:null,lastClientSha:'',uploading:false,pendingBytes:null,localBest:null,history:[],serverError:'',authDraft:{loginUser:'',loginPass:'',newUser:'',newPass:''}};

function u16(b,o){return (b[o]|(b[o+1]<<8))>>>0}
function u32(b,o){return (b[o]|(b[o+1]<<8)|(b[o+2]<<16)|(b[o+3]<<24))>>>0}
function decodeGen3Text(bytes){let out='';for(const c of bytes){if(c===0xFF||c===0x00)break;if(c>=0xBB&&c<=0xD4)out+=String.fromCharCode(65+c-0xBB);else if(c>=0xD5&&c<=0xEE)out+=String.fromCharCode(97+c-0xD5);else if(c>=0xA1&&c<=0xAA)out+=String.fromCharCode(48+c-0xA1);else if(c===0xAB)out+='!';else if(c===0xAC)out+='?';else if(c===0xB4)out+="'";else if(c===0xB8)out+=',';else if(c===0xBA)out+='/';else out+='·'}return out.replace(/·+$/,'').trim()}
function parseSave(bytes){if(!bytes||bytes.length!==SAVE_SIZE)return null;const groups=new Map();for(let sector=0;sector<32;sector++){const base=sector*SECTOR_SIZE,id=u16(bytes,base+SECTION_ID_OFFSET),sig=u32(bytes,base+SIGNATURE_OFFSET),counter=u32(bytes,base+COUNTER_OFFSET);if(sig!==EMERALD_SIGNATURE||id>13)continue;if(!groups.has(counter))groups.set(counter,new Map());groups.get(counter).set(id,base)}const counters=[...groups.keys()].sort((a,b)=>b-a);for(const counter of counters){const g=groups.get(counter);if(g.size<14||![...Array(14).keys()].every(i=>g.has(i)))continue;const base=g.get(0),hours=u16(bytes,base+0x0E),minutes=bytes[base+0x10]||0,seconds=bytes[base+0x11]||0;return{name:decodeGen3Text(bytes.slice(base,base+8))||'UNKNOWN',trainerId:String(u16(bytes,base+0x0A)).padStart(5,'0'),secretId:String(u16(bytes,base+0x0C)).padStart(5,'0'),counter,playTime:`${hours}:${String(minutes).padStart(2,'0')}:${String(seconds).padStart(2,'0')}`}}return null}
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
    SERVER_VAULT_NOT_CONFIGURED:'Save Vault server is not configured yet.',
    ORIGIN_NOT_ALLOWED:'This JRPG.WORLD origin is not allowed by the Save Vault server.',
    TOO_MANY_AUTH_ATTEMPTS:'Too many sign-in attempts. Try again in a few minutes.',
    CSRF_FAILED:'Your Save Vault session expired. Refresh and try again.',
    SERVER_ERROR:'The Save Vault server hit an error. Your local game was not accepted as stored.'
  };
  return map[code]||String(code||'Something went wrong. Please try again.').replaceAll('_',' ');
}
function setFormError(id,message,inputId){
  const el=document.getElementById(id);if(el){el.textContent=message;el.hidden=!message}
  document.querySelectorAll('#save-vault-modal .sv-input-error').forEach(x=>x.classList.remove('sv-input-error'));
  if(inputId){const input=document.getElementById(inputId);if(input){input.classList.add('sv-input-error');input.focus()}}
}

async function refreshSession(){try{const j=await jsonFetch('status');S.configured=true;S.serverError='';S.auth=!!j.authenticated;S.username=j.username||null;S.csrf=j.csrf||''}catch(e){S.configured=false;S.serverError=e?.message||'SERVER_UNREACHABLE';S.auth=false;S.username=null;S.csrf=''}renderAll()}
async function refreshSlots(){if(!S.auth){S.slots=[];return}const j=await jsonFetch('list');S.slots=j.slots||[];renderAll()}
async function fetchServerActive(){S.serverBytes=null;S.serverSha='';if(!S.auth)return;try{const r=await fetch(`${API}?action=latest&slot=1`,{credentials:'include',cache:'no-store'});if(r.status===404)return;if(!r.ok)throw new Error(`HTTP_${r.status}`);const buf=new Uint8Array(await r.arrayBuffer());if(parseSave(buf)){S.serverBytes=buf;S.serverSha=r.headers.get('X-Pokefield-Sha256')||''}}catch(e){console.warn('Server Save Vault fetch',e)}}
async function primeServer(){await refreshSession();if(S.auth){await Promise.all([refreshSlots(),fetchServerActive()])}S.initialReady=true;renderAll();maybeApplyServerSave()}

async function register(username,password){username=normalizeUsernameInput(username);const j=await guarded('register',{username,password});S.auth=true;S.username=j.username;S.csrf=j.csrf;await Promise.all([refreshSlots(),fetchServerActive()]);S.initialReady=true;renderAll();await maybeMigrateLocal();maybeApplyServerSave()}
async function login(username,password){username=normalizeUsernameInput(username);const j=await guarded('login',{username,password});S.auth=true;S.username=j.username;S.csrf=j.csrf;await Promise.all([refreshSlots(),fetchServerActive()]);S.initialReady=true;renderAll();await maybeMigrateLocal();maybeApplyServerSave()}
async function logout(){await guarded('logout',{});S.auth=false;S.username=null;S.csrf='';S.slots=[];S.serverBytes=null;S.history=[];S.initialReady=false;await refreshSession();S.initialReady=true;renderAll()}

function moduleSaves(M){const out=[];try{for(const name of M.listSaves?.()||[]){if(name==='.'||name==='..'||!name.toLowerCase().endsWith('.sav'))continue;const path=`/data/saves/${name}`;try{const bytes=new Uint8Array(M.FS.readFile(path)),p=parseSave(bytes);if(p)out.push({path,bytes,parsed:p})}catch{}}}catch{}return out.sort((a,b)=>b.parsed.counter-a.parsed.counter)}
function chooseLocal(M){const list=moduleSaves(M);return list[0]||null}
async function maybeMigrateLocal(){if(!S.auth||!S.M)return;S.localBest=chooseLocal(S.M);const active=S.slots.find(x=>x.slot===1);if(!active&&S.localBest){try{await uploadBytes(S.localBest.bytes,1,true);S.serverBytes=new Uint8Array(S.localBest.bytes);await refreshSlots();showToast(`LOCAL SAVE MIGRATED TO SERVER · ${S.localBest.parsed.name}`,'ok')}catch(e){console.warn('Local migration failed',e)}}}

function applyBytesToFs(M,bytes){if(!M?.FS||!bytes)return false;try{try{if(!M.FS.analyzePath('/data/saves').exists)M.FS.mkdir('/data/saves')}catch{}M.FS.writeFile(CANONICAL_SAVE_PATH,new Uint8Array(bytes));return true}catch(e){console.error('Server save injection failed',e);return false}}
function maybeApplyServerSave(){if(S.M&&S.serverBytes)applyBytesToFs(S.M,S.serverBytes)}

function wrapMgba(M){if(S.wrapped||!M||typeof M.loadGame!=='function')return;S.wrapped=true;const original=M.loadGame.bind(M);M.loadGame=(gamePath,_saveName)=>{if(S.auth&&S.serverBytes)applyBytesToFs(M,S.serverBytes);else if(S.auth&&S.slots.some(x=>x.slot===1)&&!S.serverBytes){openModal();showToast('SERVER SAVE IS STILL LOADING. TRY THE ROM AGAIN IN A MOMENT.','bad');return false}const ok=original(gamePath,CANONICAL_SAVE_PATH);if(ok){M.saveName=CANONICAL_SAVE_PATH;setTimeout(()=>captureAndUpload(M),800)}return ok};}

function installSaveCallback(M){if(S.callbacks||!M?.addCoreCallbacks)return;S.callbacks=true;try{M.addCoreCallbacks({saveDataUpdatedCallback:()=>{try{M.FSSync?.().catch(()=>{})}catch{}setTimeout(()=>captureAndUpload(M,true),40);setTimeout(()=>captureAndUpload(M,true),450)}})}catch(e){console.warn('Could not install server save callback',e)}}

async function uploadBytes(bytes,slot=1,force=false){if(!S.auth||!bytes)return null;const p=parseSave(bytes);if(!p)throw new Error('INVALID_EMERALD_SAVE');const hash=await sha256(bytes);if(!force&&slot===1&&hash===S.lastClientSha)return null;if(S.uploading&&slot===1){S.pendingBytes=new Uint8Array(bytes);return null}if(slot===1)S.uploading=true;try{const r=await fetch(`${API}?action=upload&slot=${slot}`,{method:'POST',credentials:'include',cache:'no-store',headers:{'Content-Type':'application/octet-stream','X-CSRF-Token':S.csrf,'X-Pokefield-Version':SV_BUILD},body:bytes});const j=await r.json().catch(()=>({}));if(!r.ok)throw new Error(j.error||`HTTP_${r.status}`);if(slot===1){S.lastClientSha=hash;S.serverBytes=new Uint8Array(bytes);S.serverSha=hash}await refreshSlots();setCloudStatus(j.stored?'SAVED TO DATABASE ✓':'DATABASE VERIFIED ✓',true);return j}finally{if(slot===1){S.uploading=false;if(S.pendingBytes){const next=S.pendingBytes;S.pendingBytes=null;setTimeout(()=>uploadBytes(next,1),0)}}}}

async function captureAndUpload(M,force=false){if(!S.auth||!M)return;try{let bytes=null;if(typeof M.getSave==='function')bytes=bytesFrom(M.getSave());if(!bytes){try{if(M.FS.analyzePath(CANONICAL_SAVE_PATH).exists)bytes=new Uint8Array(M.FS.readFile(CANONICAL_SAVE_PATH))}catch{}}const p=parseSave(bytes);if(!p)return;if(!force&&p.counter===S.lastCounter)return;S.lastCounter=p.counter;await uploadBytes(bytes,1,force)}catch(e){console.warn('Server save capture',e);setCloudStatus('SERVER SAVE FAILED',false)}}

async function copySlot(from,to){await guarded('copy',{from,to});await refreshSlots()}
async function downloadSlot(slot){const r=await fetch(`${API}?action=download&slot=${slot}`,{credentials:'include',cache:'no-store'});if(!r.ok){showToast('DOWNLOAD FAILED','bad');return}const blob=await r.blob(),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;const rec=S.slots.find(x=>x.slot===slot);a.download=`Emerald_${(rec?.trainer_name||'Trainer').replace(/[^A-Za-z0-9_-]+/g,'_')}_SAVE${slot}.sav`;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000)}
async function importSav(file,slot){const bytes=new Uint8Array(await file.arrayBuffer());if(!parseSave(bytes)){showToast('NOT A VALID 128 KB EMERALD SAVE','bad');return}await uploadBytes(bytes,slot,true);showToast(`SAVE ${slot} STORED ON SERVER`,'ok')}
async function restoreSlotToActive(slot){if(slot===1)return;await copySlot(slot,1);await fetchServerActive();maybeApplyServerSave();showToast(`SAVE ${slot} COPIED TO ACTIVE SAVE 1 · RELOAD ROM`,'ok')}
async function loadHistory(slot=1){if(!S.auth)return;try{const r=await fetch(`${API}?action=history&slot=${slot}`,{credentials:'include',cache:'no-store'});const j=await r.json();if(!r.ok)throw new Error(j.error||`HTTP_${r.status}`);S.history=j.history||[];renderHistory(slot)}catch(e){showToast(e.message,'bad')}}

function slotCard(slot){const r=S.slots.find(x=>x.slot===slot);if(!r)return `<article class="sv-slot sv-empty"><div class="sv-slot-head"><strong>SAVE ${slot}${slot===1?' · ACTIVE':''}</strong><span>EMPTY</span></div><p>No server save in this slot.</p>${slot>1&&S.slots.some(x=>x.slot===1)?`<button data-copy="${slot}">COPY SAVE 1 HERE</button>`:''}<label class="sv-import">IMPORT .SAV<input type="file" data-import="${slot}" accept=".sav,application/octet-stream"></label></article>`;return `<article class="sv-slot ${slot===1?'sv-active':''}"><div class="sv-slot-head"><strong>SAVE ${slot}${slot===1?' · ACTIVE':''}</strong><span class="sv-ok">☁ SERVER VERIFIED</span></div><div class="sv-trainer">${esc(r.trainer_name)}</div><div class="sv-grid"><span>PLAY TIME<b>${esc(r.play_time)}</b></span><span>TRAINER ID<b>${String(r.trainer_id).padStart(5,'0')}</b></span><span>SAVE COUNTER<b>${r.save_counter}</b></span><span>SERVER TIME<b>${esc(fmtDate(r.created_at))}</b></span><span>BYTES<b>${Number(r.bytes).toLocaleString()}</b></span><span>SHA-256<b>${esc(r.sha256.slice(0,12))}…</b></span></div><div class="sv-actions"><button data-download="${slot}">DOWNLOAD .SAV</button>${slot===1?`<button data-history="1">SAVE HISTORY</button>`:`<button class="sv-primary" data-restore="${slot}">RESTORE AS ACTIVE</button>`}${slot>1?`<button data-copy="${slot}">REPLACE WITH SAVE 1</button>`:''}</div></article>`}
function authHtml(){return `<div class="sv-auth-shell"><div class="sv-auth-hero"><img src="./assets/save-vault-auth-hero.jpg" alt="Pokémon trainers checking IVs"></div><section class="sv-auth-intro"><small>JRPG.WORLD · EMERALD</small><h3>Your save should feel permanent.</h3><p>Sign in or create a Save Vault account. Your server copy stays separate from the emulator and from website updates.</p><div class="sv-auth-pills"><span>☁ SERVER SAVE</span><span>↻ VERSION SAFE</span><span>↓ .SAV BACKUP</span></div></section><div class="sv-auth"><form class="sv-auth-card sv-auth-signin" id="sv-login-form" autocomplete="on"><div class="sv-auth-card-head"><span class="sv-auth-kicker">WELCOME BACK</span><h3>SIGN IN</h3><p>Continue with the saves already stored in your Vault.</p></div><label for="sv-login-user">USERNAME</label><input id="sv-login-user" name="vault_username" placeholder="Your username" autocapitalize="none" autocorrect="off" spellcheck="false" autocomplete="username" enterkeyhint="next"><label for="sv-login-pass">PASSWORD</label><input id="sv-login-pass" name="vault_password" type="password" placeholder="Your password" autocomplete="current-password" enterkeyhint="go"><button type="submit" id="sv-login" class="sv-primary">SIGN IN & LOAD VAULT</button></form><form class="sv-auth-card sv-auth-create" id="sv-register-form" autocomplete="off"><div class="sv-auth-card-head"><span class="sv-auth-kicker">FIRST TIME HERE</span><h3>CREATE ACCOUNT</h3><p>Create a permanent home for this Emerald save.</p></div><label for="sv-new-user">USERNAME</label><input id="sv-new-user" name="new_vault_username" placeholder="Choose a username" autocapitalize="none" autocorrect="off" spellcheck="false" autocomplete="off" enterkeyhint="next" maxlength="32"><small class="sv-field-hint">3–32 characters · letters, numbers, spaces, . _ -</small><label for="sv-new-pass">PASSWORD</label><input id="sv-new-pass" name="new_vault_password" type="password" placeholder="Minimum 10 characters" autocomplete="new-password" enterkeyhint="go"><small class="sv-field-hint">At least 10 characters</small><div id="sv-register-error" class="sv-form-error" hidden></div><button type="submit" id="sv-register">CREATE SAVE VAULT</button></form><p class="sv-auth-note"><b>SERVER MASTER COPY.</b> Your local browser and emulator are runtime copies. New site versions do not replace the database record.</p></div></div>`}


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
  if(!body.querySelector('.sv-auth-shell'))body.innerHTML=authHtml();
  restoreAuthDraft(true);
}
function ensureUi(){if(document.getElementById('save-vault-launch'))return;const gate=document.createElement('div');gate.id='sv-gate';gate.innerHTML='<div class="sv-gate-card"><b>🔐 SAVE VAULT</b><span id="sv-gate-text">Checking server database…</span></div>';document.body.appendChild(gate);const launch=document.createElement('button');launch.id='save-vault-launch';launch.innerHTML='<span>☁</span><b>SAVE VAULT</b><small id="sv-launch-status">checking…</small>';document.body.appendChild(launch);const modal=document.createElement('div');modal.id='save-vault-modal';modal.hidden=true;modal.innerHTML=`<section class="sv-panel" role="dialog" aria-modal="true"><header><div><small>JRPG.WORLD · EMERALD</small><h2>SERVER SAVE VAULT</h2><p id="sv-account-line">Checking…</p></div><button id="sv-close">×</button></header><div id="sv-assurance" class="sv-assurance"></div><div id="sv-body"></div><div id="sv-history" hidden></div><div class="sv-footer-actions"><button id="sv-refresh">REFRESH DATABASE</button><button id="sv-logout" hidden>LOG OUT</button></div><details class="sv-tech"><summary>WHERE IS MY SAVE?</summary><p><b>Master copy:</b> <code>saves.jrpg.world</code> → Hostinger MySQL.</p><p><b>Runtime copy:</b> <code>${CANONICAL_SAVE_PATH}</code> inside mGBA while the game is running.</p><p>New site versions can replace all public website files without touching the database. The database keeps append-only save snapshots.</p></details></section>`;document.body.appendChild(modal);launch.onclick=openModal;modal.querySelector('#sv-close').onclick=()=>modal.hidden=true;modal.addEventListener('click',e=>{if(e.target===modal)modal.hidden=true});modal.querySelector('#sv-refresh').onclick=async()=>{await refreshSession();if(S.auth){await refreshSlots();await fetchServerActive();maybeApplyServerSave();await maybeMigrateLocal()}renderAll()};modal.querySelector('#sv-logout').onclick=logout;modal.addEventListener('submit',e=>{e.preventDefault();const id=e.target?.id;if(id==='sv-login-form')document.getElementById('sv-login')?.click();if(id==='sv-register-form')document.getElementById('sv-register')?.click()});modal.addEventListener('click',async e=>{const t=e.target;if(t.id==='sv-login'){try{await login(document.getElementById('sv-login-user').value,document.getElementById('sv-login-pass').value);showToast('SIGNED IN · SERVER SAVE READY','ok')}catch(err){showToast(friendlyVaultError(err.message),'bad')}}if(t.id==='sv-register'){
  const userEl=document.getElementById('sv-new-user'),passEl=document.getElementById('sv-new-pass');
  const username=normalizeUsernameInput(userEl?.value),password=passEl?.value||'',problem=usernameProblem(username);
  if(problem){setFormError('sv-register-error',problem,'sv-new-user');return}
  if(password.length<10){setFormError('sv-register-error','Password must be at least 10 characters.','sv-new-pass');return}
  setFormError('sv-register-error','');
  try{await register(username,password);showToast('SAVE VAULT CREATED','ok')}
  catch(err){const msg=friendlyVaultError(err.message);setFormError('sv-register-error',msg,err.message==='PASSWORD_MIN_10'?'sv-new-pass':'sv-new-user');showToast(msg,'bad')}
}if(t.dataset.download)await downloadSlot(Number(t.dataset.download));if(t.dataset.copy){const to=Number(t.dataset.copy);if(confirm(`Copy SAVE 1 into SAVE ${to}?`))await copySlot(1,to)}if(t.dataset.restore){const from=Number(t.dataset.restore);if(confirm(`Restore SAVE ${from} as active SAVE 1?`))await restoreSlotToActive(from)}if(t.dataset.history)await loadHistory(Number(t.dataset.history));if(t.dataset.snapshot){const id=Number(t.dataset.snapshot);if(confirm('Restore this historical snapshot as active SAVE 1?')){await guarded('restore_snapshot',{snapshot_id:id,to_slot:1});await refreshSlots();await fetchServerActive();maybeApplyServerSave();showToast('HISTORICAL SAVE RESTORED · RELOAD ROM','ok')}}});modal.addEventListener('change',async e=>{const slot=Number(e.target.dataset.import||0),file=e.target.files?.[0];e.target.value='';if(slot&&file)try{await importSav(file,slot)}catch(err){showToast(friendlyVaultError(err.message),'bad')}});
modal.addEventListener('keydown',e=>{if(e.key!=='Enter')return;if(e.target?.id==='sv-new-user'){e.preventDefault();document.getElementById('sv-new-pass')?.focus()}else if(e.target?.id==='sv-new-pass'){e.preventDefault();document.getElementById('sv-register')?.click()}else if(e.target?.id==='sv-login-user'){e.preventDefault();document.getElementById('sv-login-pass')?.focus()}else if(e.target?.id==='sv-login-pass'){e.preventDefault();document.getElementById('sv-login')?.click()}})}
function openModal(){document.getElementById('save-vault-modal').hidden=false;renderAll()}
function setCloudStatus(text,ok){const el=document.getElementById('sv-launch-status');if(el)el.textContent=text;const a=document.getElementById('sv-assurance');if(a&&S.auth){a.classList.toggle('sv-bad',!ok)}}
function showToast(text,kind='ok'){let el=document.getElementById('sv-toast');if(!el){el=document.createElement('div');el.id='sv-toast';document.body.appendChild(el)}el.className=kind;el.textContent=text;el.hidden=false;clearTimeout(showToast.t);showToast.t=setTimeout(()=>el.hidden=true,3200)}
function renderHistory(slot){const el=document.getElementById('sv-history');if(!el)return;el.hidden=false;el.innerHTML=`<h3>SAVE ${slot} HISTORY</h3><p>Every unique database save is kept as a snapshot.</p><div class="sv-history-list">${S.history.map((r,i)=>`<div><span><b>${esc(r.trainer_name)}</b> · ${esc(r.play_time)} · #${r.save_counter}<small>${esc(fmtDate(r.created_at))} · ${esc(r.sha256.slice(0,10))}…</small></span>${i===0?'<em>LATEST</em>':`<button data-snapshot="${r.id}">RESTORE</button>`}</div>`).join('')||'<p>No history yet.</p>'}</div>`}
function renderAll(){ensureUi();const panel=document.querySelector('.sv-panel');if(panel)panel.classList.toggle('sv-auth-mode',S.configured!==false&&S.initialReady&&!S.auth);const launch=document.getElementById('sv-launch-status'),account=document.getElementById('sv-account-line'),body=document.getElementById('sv-body'),ass=document.getElementById('sv-assurance'),logoutBtn=document.getElementById('sv-logout'),gate=document.getElementById('sv-gate'),gateText=document.getElementById('sv-gate-text');if(S.configured===false){rememberAuthDraft();launch.textContent='SAVE SERVER OFFLINE';account.textContent='saves.jrpg.world unreachable';ass.innerHTML='<b>☁ SAVE SERVER OFFLINE</b><span>PokéField will not start an unprotected session. Check https://emerald-api.madeby.re/health.</span>';body.innerHTML='<div class="sv-setup"><b>SAVE SERVER REQUIRED</b><p>The game is blocked until the external Save Vault responds. No browser-only fallback is treated as a safe save.</p></div>';logoutBtn.hidden=true;gate.hidden=false;gateText.textContent='Save Vault server offline · check saves.jrpg.world/health';return}if(!S.initialReady){launch.textContent='checking server…';gate.hidden=false;gateText.textContent='Checking server database…';return}if(!S.auth){launch.textContent='SIGN IN TO PROTECT SAVES';account.textContent='Not signed in';ass.innerHTML='<b>☁ SERVER DATABASE</b><span>Sign in before playing so local browser data is never the master copy.</span>';/* v0.1.9.9: do not rebuild an already-mounted auth form. renderAll() is called again when mGBA becomes ready and on server refreshes; replacing #sv-body here destroyed the username/password DOM values and focus. */ensureAuthMounted(body);logoutBtn.hidden=true;gate.hidden=false;gateText.innerHTML='Sign in to your Save Vault before loading Emerald.<button id="sv-gate-open">OPEN SAVE VAULT</button>';setTimeout(()=>{const b=document.getElementById('sv-gate-open');if(b)b.onclick=openModal},0);return}rememberAuthDraft();logoutBtn.hidden=false;account.textContent=`Account: ${S.username}`;ass.innerHTML='<b>☁ SERVER DATABASE · CONNECTED</b><span>Server is the master copy. The browser and emulator only hold runtime copies.</span>';body.innerHTML=[1,2,3].map(slotCard).join('');const a=S.slots.find(x=>x.slot===1);launch.textContent=a?`${a.trainer_name} · ${a.play_time} · VERIFIED`:'NO SAVE YET · READY';if(a){gate.hidden=false;gateText.textContent=`SAVE 1 VERIFIED · ${a.trainer_name} · ${a.play_time}`;setTimeout(()=>{if(S.auth)gate.hidden=true},900)}else{gate.hidden=false;gateText.textContent='SAVE VAULT CONNECTED · no save yet · your first in-game save will be stored on the server';setTimeout(()=>{if(S.auth)gate.hidden=true},1300)}}

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

async function boot(){ensureUi();installVaultInputShield();renderAll();primeServer().catch(e=>{console.error(e);S.initialReady=true;renderAll()});setInterval(async()=>{const M=globalThis.__POKEFIELD_MGBA__;if(M&&!S.M){S.M=M;wrapMgba(M);installSaveCallback(M);maybeApplyServerSave();await maybeMigrateLocal();renderAll()}else if(M){wrapMgba(M);installSaveCallback(M)}},500);setInterval(()=>{if(S.M&&S.auth)captureAndUpload(S.M)},2000);document.addEventListener('visibilitychange',()=>{if(document.hidden&&S.M&&S.auth)captureAndUpload(S.M,true)});window.addEventListener('pagehide',()=>{if(S.M&&S.auth)captureAndUpload(S.M,true)})}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
