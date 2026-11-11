/* Emerald · MadeBy v0.4.5.1 · Live Activity Wire
 * Watches exact BPEE runtime Secret Base state exposed by PokéField's mGBA reader.
 * Emits only observed native transitions. The server binds each subject back to the
 * authenticated trainer's authoritative active save before creating world activity.
 */
const API='https://emerald-api.madeby.re/api/hoenn';
const SCHEMA='hoenn.online.live-activity';
const VERSION=1;
const POLL_MS=350;
const RETRY_MS=2200;
const RESULT_BITS=Object.freeze({
  base_battle_won:{word:'low',mask:1<<11},
  base_battle_lost:{word:'low',mask:1<<12},
  base_battle_refused:{word:'low',mask:1<<13},
  base_battle_drawn:{word:'high',mask:1<<0}
});
const SS_SESSION='hoenn-live-wire-session-v1';
const SS_COUNTER='hoenn-live-wire-base-counter-v1';

const W={
  last:null,
  active:null,
  queue:[],
  queued:new Set(),
  sent:new Set(),
  sending:false,
  timer:0,
  sequence:0,
  lastError:'',
  sentCount:0,
  sessionId:''
};

function vault(){return globalThis.JRPGWorldSaveVaultBridge||null}
function runtime(){return globalThis.JRPGWorldEmeraldRuntime||null}
function authenticated(){return !!vault()?.getSession?.()?.authenticated}
function randomToken(){
  try{return crypto.randomUUID()}catch{return `wire-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`}
}
function wireSessionId(){
  if(W.sessionId)return W.sessionId;
  try{W.sessionId=sessionStorage.getItem(SS_SESSION)||''}catch{}
  if(!W.sessionId){W.sessionId=randomToken();try{sessionStorage.setItem(SS_SESSION,W.sessionId)}catch{}}
  return W.sessionId;
}
function nextBaseSessionId(){
  let n=0;try{n=Number(sessionStorage.getItem(SS_COUNTER)||0)||0}catch{}
  n++;try{sessionStorage.setItem(SS_COUNTER,String(n))}catch{}
  return `${wireSessionId()}:${n}`;
}
function subjectKey(s){return s?`${s.trainer_name_hex}:${s.trainer_id_hex}:${s.gender}`:''}
function cloneSubject(s){return s?{slot:Number(s.slot),secret_base_id:Number(s.secret_base_id),trainer_name_hex:String(s.trainer_name_hex),trainer_id_hex:String(s.trainer_id_hex),gender:Number(s.gender)}:null}
function observed(st){return{
  current_base_index:Number(st?.current_base_index||0),
  in_friend_base:!!st?.in_friend_base,
  secret_base_battle:!!st?.secret_base_battle,
  low_tv_flags:Number(st?.low_tv_flags||0)&0xffff,
  high_tv_flags:Number(st?.high_tv_flags||0)&0xffff,
  step_counter:Number(st?.step_counter||0)&0xffff,
  num_times_entered:Number(st?.subject?.num_times_entered||0)&0xff,
  battle_type_flags:Number(st?.battle_type_flags||0)>>>0
}}
function eventKey(action,baseSessionId,type){return `${action}|${baseSessionId}|${type}`}

async function post(action,body){
  const sess=vault()?.getSession?.()||{};
  if(!sess.authenticated)throw new Error('AUTH_REQUIRED');
  const r=await fetch(`${API}?action=${encodeURIComponent(action)}`,{
    method:'POST',credentials:'include',cache:'no-store',
    headers:{'Content-Type':'application/json',...(sess.csrf?{'X-CSRF-Token':sess.csrf}:{})},
    body:JSON.stringify(body)
  });
  const text=await r.text();let json={};try{json=text?JSON.parse(text):{}}catch{}
  if(!r.ok)throw new Error(json.error||`HTTP_${r.status}`);
  return json;
}

function enqueue(action,type,body,key){
  if(W.sent.has(key)||W.queued.has(key))return;
  W.queued.add(key);W.queue.push({action,type,body,key,attempts:0});pump();
}
async function pump(){
  if(W.sending||!W.queue.length)return;
  W.sending=true;
  const item=W.queue[0];item.attempts++;
  try{
    const response=await post(item.action,item.body);
    W.queue.shift();W.queued.delete(item.key);W.sent.add(item.key);W.sentCount++;W.lastError='';
    try{window.dispatchEvent(new CustomEvent('hoenn:live-activity-recorded',{detail:{action:item.action,type:item.type,response}}))}catch{}
  }catch(err){
    W.lastError=err?.message||String(err);
    // Runtime evidence is small and valuable. Keep retrying for this page session,
    // but yield between attempts so a temporary mobile-network stall cannot spin.
    setTimeout(()=>{W.sending=false;pump()},RETRY_MS);return;
  }
  W.sending=false;if(W.queue.length)pump();
}

function activityEnvelope(type,st,active=W.active){
  return{
    schema:SCHEMA,version:VERSION,session_id:wireSessionId(),base_session_id:active.id,sequence:++W.sequence,type,
    subject:active.subject,observed:observed(st),observed_at_ms:Date.now()
  };
}
function queueActivity(type,st){
  if(!W.active||!W.active.subject||W.active.sentTypes.has(type))return;
  W.active.sentTypes.add(type);
  const key=eventKey('live_activity',W.active.id,type);
  enqueue('live_activity',type,activityEnvelope(type,st),key);
}
function resultTypes(st){
  const out=[];for(const [type,x] of Object.entries(RESULT_BITS)){
    const word=x.word==='low'?Number(st?.low_tv_flags||0):Number(st?.high_tv_flags||0);
    if(word&x.mask)out.push(type);
  }return out;
}

function beginBaseSession(st){
  if(!st?.subject||!st.in_friend_base)return;
  const full=runtime()?.getSecretBaseLiveState?.({includeTv:true})||null;
  const baseTv=new Set((full?.tv_shows||[]).map(x=>x.raw_hex));
  W.active={
    id:nextBaseSessionId(),
    subject:cloneSubject(st.subject),
    subjectKey:subjectKey(st.subject),
    tvBaseline:baseTv,
    tvBaselineReady:!!full,
    sentTypes:new Set(),
    startedAt:Date.now()
  };
  queueActivity('base_visited',st);
}
function finishBaseSession(st){
  const active=W.active;if(!active)return;
  const full=runtime()?.getSecretBaseLiveState?.({includeTv:true})||null;
  const newShow=active.tvBaselineReady&&full?(full.tv_shows||[]).find(show=>
    !show.active&&show.kind===38&&show.base_owner_name_hex===active.subject.trainer_name_hex&&!active.tvBaseline.has(show.raw_hex)
  ):null;
  if(newShow){
    const body={schema:SCHEMA,version:VERSION,session_id:wireSessionId(),base_session_id:active.id,sequence:++W.sequence,subject:active.subject,tv_show:{slot:newShow.slot,raw_hex:newShow.raw_hex},observed_at_ms:Date.now()};
    enqueue('live_tv_evidence','tv_secret_base_secrets',body,eventKey('live_tv_evidence',active.id,newShow.raw_hex));
  }
  W.active=null;
}

function tick(){
  try{
    if(!authenticated()){
      W.last=null;W.active=null;return;
    }
    const rt=runtime();if(!rt?.getSecretBaseLiveState)return;
    const st=rt.getSecretBaseLiveState({includeTv:false});if(!st)return;
    const last=W.last;

    if(!W.active&&st.in_friend_base&&st.subject)beginBaseSession(st);
    else if(W.active&&st.in_friend_base&&st.subject&&subjectKey(st.subject)!==W.active.subjectKey){
      finishBaseSession(st);beginBaseSession(st);
    }

    if(W.active){
      const challengedByBattle=!!st.secret_base_battle&&!last?.secret_base_battle;
      const challengedByFlag=!!st.subject?.battled_owner_today&&!last?.subject?.battled_owner_today;
      if(challengedByBattle||challengedByFlag)queueActivity('base_challenged',st);
      for(const type of resultTypes(st))queueActivity(type,st);
      if(last?.in_friend_base&&!st.in_friend_base)finishBaseSession(st);
    }
    W.last=st;
  }catch(err){W.lastError=err?.message||String(err)}
}
function boot(){wireSessionId();clearInterval(W.timer);W.timer=setInterval(tick,POLL_MS);tick()}

const api=Object.freeze({
  version:'0.4.5.1',
  inspect(){return{session_id:wireSessionId(),active:W.active?{id:W.active.id,subject:W.active.subject,sent:[...W.active.sentTypes]}:null,pending:W.queue.length,sent:W.sentCount,last_error:W.lastError,last_state:W.last}}
});
globalThis.HoennLiveActivityWire=api;
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
try{window.dispatchEvent(new CustomEvent('hoenn:live-activity-wire-ready',{detail:{version:'0.4.5.1'}}))}catch{}
