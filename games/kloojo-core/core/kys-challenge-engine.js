// Know Your Slop Challenge Protocol v2
// Generic encounter state machine for feed-native playable artifacts.
// No game-specific logic lives here. Games provide prepare/start/reset callbacks and emit semantic events.

const KYS_SCHEMA='kys.encounter.v2';

function hashString(input=''){
  let h=2166136261>>>0;
  for(let i=0;i<input.length;i++){h^=input.charCodeAt(i);h=Math.imul(h,16777619)}
  return h>>>0;
}

export function seededRandom(seed){
  let a=typeof seed==='number'?(seed>>>0):hashString(String(seed));
  return function(){a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return ((t^t>>>14)>>>0)/4294967296}
}

export function seededShuffle(items,seed){
  const out=items.slice(),rnd=seededRandom(seed);
  for(let i=out.length-1;i>0;i--){const j=Math.floor(rnd()*(i+1));[out[i],out[j]]=[out[j],out[i]]}
  return out;
}

function stable(value){
  if(Array.isArray(value))return '['+value.map(stable).join(',')+']';
  if(value&&typeof value==='object')return '{'+Object.keys(value).sort().map(k=>JSON.stringify(k)+':'+stable(value[k])).join(',')+'}';
  return JSON.stringify(value);
}

export function encounterFingerprint(encounter,gameId='artifact',gameVersion='1'){
  const competitive={
    schema:encounter.schema||KYS_SCHEMA,
    gameId,gameVersion,
    seed:String(encounter.seed??0),
    type:encounter.type||'custom',
    setup:encounter.setup||{},
    objectives:encounter.objectives||[],
    constraints:encounter.constraints||{},
    modifiers:encounter.modifiers||{},
    timeLimitMs:encounter.timeLimitMs??null
  };
  return `${gameId}:${gameVersion}:${hashString(stable(competitive)).toString(36)}`;
}

function compare(value,op,target){
  if(op==='>')return value>target;if(op==='===')return value===target;if(op==='==')return value==target;
  if(op==='<')return value<target;if(op==='<=')return value<=target;if(op==='!==')return value!==target;
  return value>=target;
}

function clone(value){try{return structuredClone(value)}catch{return JSON.parse(JSON.stringify(value))}}

export class KYSChallengeEngine{
  constructor(options={}){
    this.gameId=options.gameId||'artifact';
    this.gameVersion=options.gameVersion||'1';
    this.onPrepare=options.onPrepare||(()=>{});
    this.onRunStart=options.onRunStart||(()=>{});
    this.onFinish=options.onFinish||(()=>{});
    this.onStop=options.onStop||(()=>{});
    this.getMetrics=options.getMetrics||(()=>({}));
    this.hostOrigin=options.hostOrigin||'*';
    this.phase='idle';
    this.encounter=null;
    this.eventCounts=new Map();
    this.lastEventPayload=new Map();
    this.metrics={};
    this.runStartedAt=0;
    this.elapsedMs=0;
    this.result=null;
    this.paused=false;this._pausedAt=0;this._pausedTotal=0;
    this._introTimer=0;
    this._raf=0;
    this._installUI();
  }

  _installUI(){
    if(typeof document==='undefined')return;
    if(document.getElementById('kysChallengeOverlay')){
      this.overlay=document.getElementById('kysChallengeOverlay');
      this.hud=document.getElementById('kysChallengeHud');
      return;
    }
    const style=document.createElement('style');
    style.id='kysChallengeStyle';
    style.textContent=`
      #kysChallengeOverlay{position:fixed;inset:0;z-index:2147483000;background:#000;color:#fff;display:none;place-items:center;text-align:center;padding:28px;font-family:ui-rounded,"Arial Rounded MT Bold",system-ui,sans-serif;pointer-events:auto}
      #kysChallengeOverlay.on{display:grid}
      #kysChallengeOverlay .kysWrap{width:min(760px,94vw);display:grid;gap:13px;justify-items:center}
      #kysChallengeOverlay .kysEyebrow{font:900 11px/1 ui-monospace,monospace;letter-spacing:.25em;color:#77f7ff;text-transform:uppercase}
      #kysChallengeOverlay .kysTitle{font:1000 clamp(34px,10vw,82px)/.88 Impact,"Arial Black",sans-serif;letter-spacing:-.035em;text-transform:uppercase;max-width:900px;text-wrap:balance}
      #kysChallengeOverlay .kysSub{font:900 clamp(12px,3vw,19px)/1.25 ui-rounded,system-ui,sans-serif;color:#ffffffb8;max-width:680px}
      #kysChallengeOverlay .kysMeta{font:900 12px/1.3 ui-monospace,monospace;letter-spacing:.08em;color:#ffe33b}
      #kysChallengeOverlay .kysBoard{font:800 11px/1.45 ui-monospace,monospace;color:#ffffffb5;white-space:pre-line;min-height:0}
      #kysChallengeOverlay .kysResult{font:1000 clamp(48px,14vw,108px)/.82 Impact,"Arial Black",sans-serif;color:#5eff75;text-transform:uppercase}
      #kysChallengeOverlay.fail .kysResult{color:#ff5b76}
      #kysChallengeOverlay .kysActions{display:flex;gap:10px;justify-content:center;flex-wrap:wrap;margin-top:8px}
      #kysChallengeOverlay button{border:2px solid #fff;background:#fff;color:#000;border-radius:999px;padding:11px 18px;font:1000 12px/1 system-ui,sans-serif;letter-spacing:.08em;text-transform:uppercase;cursor:pointer}
      #kysChallengeOverlay button.secondary{background:#000;color:#fff}
      #kysChallengeHud{position:fixed;z-index:2147482000;left:50%;top:max(10px,env(safe-area-inset-top));transform:translateX(-50%);display:none;pointer-events:none;background:#000d;color:#fff;border:2px solid #ffffffaa;border-radius:999px;padding:7px 12px;max-width:min(82vw,720px);font:1000 11px/1.1 ui-monospace,monospace;letter-spacing:.06em;text-align:center;text-transform:uppercase;box-shadow:0 5px 18px #0006}
      #kysChallengeHud.on{display:block}
      #kysChallengeHud .time{color:#ffe33b;margin-left:8px}
      #kysChallengeHud.danger .time{color:#ff5b76}
    `;
    document.head.appendChild(style);
    const overlay=document.createElement('div');overlay.id='kysChallengeOverlay';overlay.setAttribute('role','dialog');overlay.setAttribute('aria-live','assertive');
    overlay.innerHTML='<div class="kysWrap"><div class="kysEyebrow"></div><div class="kysTitle"></div><div class="kysSub"></div><div class="kysResult"></div><div class="kysMeta"></div><div class="kysBoard"></div><div class="kysActions"></div></div>';
    document.body.appendChild(overlay);
    const hud=document.createElement('div');hud.id='kysChallengeHud';document.body.appendChild(hud);
    this.overlay=overlay;this.hud=hud;
    overlay.addEventListener('pointerdown',()=>{if(this.phase==='intro'&&performance.now()-(this._introShownAt||0)>250)this.begin()});
    let swipeStartY=null;
    overlay.addEventListener('touchstart',e=>{swipeStartY=e.touches?.[0]?.clientY??null},{passive:true});
    overlay.addEventListener('touchend',e=>{
      if(swipeStartY==null||!['success','failed'].includes(this.phase))return;
      const end=e.changedTouches?.[0]?.clientY??swipeStartY,dy=end-swipeStartY;swipeStartY=null;
      if(dy<-52)this._post('KYS_CHALLENGE_NEXT_REQUEST',{challengeId:this.result?.challengeId,gesture:'swipe-up'});
    },{passive:true});
  }

  _post(type,payload={}){
    const message={type,payload:{gameId:this.gameId,gameVersion:this.gameVersion,...payload}};
    try{if(window.parent&&window.parent!==window)window.parent.postMessage(message,this.hostOrigin)}catch{}
    try{window.dispatchEvent(new CustomEvent(type.toLowerCase().replaceAll('_',':'),{detail:message.payload}))}catch{}
  }

  load(encounter,options={}){
    if(!encounter||typeof encounter!=='object')throw new Error('KYS encounter must be an object');
    clearTimeout(this._introTimer);
    this.encounter=clone(encounter);
    this.encounter.schema=this.encounter.schema||KYS_SCHEMA;
    this.encounter.seed=String(this.encounter.seed??Date.now());
    this.encounter.challengeId=this.encounter.challengeId||encounterFingerprint(this.encounter,this.gameId,this.gameVersion);
    this.result=null;this.elapsedMs=0;this.metrics={};this.eventCounts.clear();this.lastEventPayload.clear();this.paused=false;this._pausedAt=0;this._pausedTotal=0;
    this.phase='preparing';
    this.onPrepare(this.encounter,seededRandom(this.encounter.seed));
    if(options.skipIntro){this.phase='preparing';if(options.autoStart!==false)this.begin()}else this.showIntro(options.introMs??this.encounter.introMs??1100,options.autoStart!==false);
    this._post('KYS_CHALLENGE_LOADED',{encounter:this.publicEncounter()});
    return this.encounter;
  }

  publicEncounter(){
    if(!this.encounter)return null;
    const {schema,challengeId,seed,type,title,subtitle,timeLimitMs,difficulty,objectives,constraints,modifiers,setup,leaderboard}=this.encounter;
    return {schema,challengeId,seed,type,title,subtitle,timeLimitMs,difficulty,objectives,constraints,modifiers,setup,leaderboard};
  }

  showIntro(ms=1100,autoStart=true){
    this.phase='intro';this._introShownAt=performance.now();
    const e=this.encounter,o=this.overlay;
    if(o){o.className='on';o.querySelector('.kysEyebrow').textContent=`CHALLENGE · ${String(e.difficulty||'SURPRISE').toUpperCase()}`;o.querySelector('.kysTitle').textContent=e.title||'CHALLENGE';o.querySelector('.kysSub').textContent=e.subtitle||'';o.querySelector('.kysResult').textContent='';o.querySelector('.kysMeta').textContent=e.timeLimitMs?`${Math.ceil(e.timeLimitMs/1000)} SECOND LIMIT`:'NO TIME LIMIT';o.querySelector('.kysBoard').textContent='';o.querySelector('.kysActions').innerHTML='';}
    if(this.hud)this.hud.className='';
    if(autoStart)this._introTimer=setTimeout(()=>this.begin(),Math.max(300,ms));
  }

  begin(){
    if(!this.encounter||!['intro','preparing'].includes(this.phase))return;
    clearTimeout(this._introTimer);
    this.phase='running';this.runStartedAt=performance.now();this.elapsedMs=0;this.paused=false;this._pausedAt=0;this._pausedTotal=0;
    if(this.overlay)this.overlay.className='';
    if(this.hud)this.hud.className='on';
    this.onRunStart(this.encounter);
    this._post('KYS_CHALLENGE_START',{encounter:this.publicEncounter(),startedAt:Date.now()});
    this._renderHud();
  }

  retry(){if(!this.encounter)return;this.load(this.encounter,{autoStart:true,introMs:700})}

  pause(){if(this.phase!=='running'||this.paused)return;this.elapsedMs=this._elapsedNow();this.paused=true;this._pausedAt=performance.now();this._renderHud();this._post('KYS_CHALLENGE_PAUSE',{challengeId:this.encounter?.challengeId,elapsedMs:Math.round(this.elapsedMs)})}

  resume(){if(this.phase!=='running'||!this.paused)return;const now=performance.now();this._pausedTotal+=Math.max(0,now-this._pausedAt);this._pausedAt=0;this.paused=false;this._renderHud();this._post('KYS_CHALLENGE_RESUME',{challengeId:this.encounter?.challengeId,elapsedMs:Math.round(this.elapsedMs)})}

  _elapsedNow(){if(!this.runStartedAt)return 0;const now=this.paused?this._pausedAt:performance.now();return Math.max(0,now-this.runStartedAt-this._pausedTotal)}

  stop(reason='host'){clearTimeout(this._introTimer);const prior=this.phase;this.phase='idle';if(this.overlay)this.overlay.className='';if(this.hud)this.hud.className='';this.onStop(reason,prior);this._post('KYS_CHALLENGE_STOP',{reason})}

  event(name,payload={}){
    if(this.phase!=='running'||this.paused)return;
    const n=(this.eventCounts.get(name)||0)+1;this.eventCounts.set(name,n);this.lastEventPayload.set(name,payload);
    this._post('KYS_GAME_EVENT',{name,count:n,payload,challengeId:this.encounter?.challengeId});
    this.evaluate();
  }

  metric(name,value){if(this.phase!=='running'||this.paused)return;this.metrics[name]=value;this.evaluate()}

  update(){
    if(this.phase!=='running'||this.paused)return;
    this.elapsedMs=this._elapsedNow();
    const external=this.getMetrics(this.encounter)||{};Object.assign(this.metrics,external);
    if(this.encounter.timeLimitMs!=null&&this.elapsedMs>=this.encounter.timeLimitMs){this.fail('TIME UP');return}
    this.evaluate();this._renderHud();
  }

  objectiveDone(obj){
    if(!obj)return true;
    if(Array.isArray(obj.all))return obj.all.every(x=>this.objectiveDone(x));
    if(Array.isArray(obj.any))return obj.any.some(x=>this.objectiveDone(x));
    if(obj.not)return !this.objectiveDone(obj.not);
    if(obj.type==='event_count'){
      const count=this.eventCounts.get(obj.event)||0;
      if(!obj.where)return compare(count,obj.op||'>=',Number(obj.target??1));
      // Filtered event objectives can be fed as a dedicated semantic event name by adapters.
      return compare(count,obj.op||'>=',Number(obj.target??1));
    }
    if(obj.type==='event')return (this.eventCounts.get(obj.event)||0)>0;
    if(obj.type==='metric')return compare(Number(this.metrics[obj.metric]??0),obj.op||'>=',Number(obj.target??0));
    return false;
  }

  evaluate(){
    if(this.phase!=='running'||!this.encounter)return;
    const objectives=this.encounter.objectives||[];
    if(objectives.length&&objectives.every(o=>this.objectiveDone(o)))this.succeed();
  }

  _scoreResult(success,reason){
    const metrics={...this.metrics,...(this.getMetrics(this.encounter)||{})};
    const result={
      success,reason,
      challengeId:this.encounter.challengeId,
      seed:this.encounter.seed,
      type:this.encounter.type||'custom',
      title:this.encounter.title||'Challenge',
      elapsedMs:Math.round(this.elapsedMs),
      timeLimitMs:this.encounter.timeLimitMs??null,
      difficulty:this.encounter.difficulty||null,
      metrics,
      leaderboard:this.encounter.leaderboard||{metric:'elapsedMs',direction:'asc'},
      completedAt:new Date().toISOString()
    };
    // Feed runtime is stateless; leaderboard/PB ownership stays with the host.
    return result;
  }

  succeed(){
    if(this.phase!=='running')return;
    this.elapsedMs=Math.max(this.elapsedMs,this._elapsedNow());this.phase='success';
    this.result=this._scoreResult(true,'SUCCESS');this.onFinish(this.result);this._showResult(true);this._post('KYS_CHALLENGE_RESULT',this.result);
  }

  fail(reason='FAILED'){
    if(this.phase!=='running')return;
    this.elapsedMs=Math.max(this.elapsedMs,this._elapsedNow());this.phase='failed';
    this.result=this._scoreResult(false,reason);this.onFinish(this.result);this._showResult(false);this._post('KYS_CHALLENGE_RESULT',this.result);
  }

  _showResult(success){
    if(this.hud)this.hud.className='';
    const o=this.overlay;if(!o)return;o.className='on '+(success?'success':'fail');
    o.querySelector('.kysEyebrow').textContent=success?'CHALLENGE COMPLETE':'CHALLENGE OVER';
    o.querySelector('.kysTitle').textContent=this.encounter?.title||'CHALLENGE';
    o.querySelector('.kysSub').textContent='';
    o.querySelector('.kysResult').textContent=success?'SUCCESS!':String(this.result?.reason||'FAILED');
    const seconds=(this.result.elapsedMs/1000).toFixed(2);
    const pb=this.result.personalBest?' · NEW PB':'';
    o.querySelector('.kysMeta').textContent=`${seconds}s${pb} · SWIPE ↑ FOR NEXT`;
    o.querySelector('.kysBoard').textContent='';
    const actions=o.querySelector('.kysActions');actions.innerHTML='';
    const again=document.createElement('button');again.textContent='Again';again.onclick=e=>{e.stopPropagation();this.retry()};
    const next=document.createElement('button');next.textContent='Next challenge';next.className='secondary';next.onclick=e=>{e.stopPropagation();this._post('KYS_CHALLENGE_NEXT_REQUEST',{challengeId:this.result.challengeId})};
    actions.append(again,next);
  }

  setLeaderboard(board={}){
    if(!this.result||!this.overlay)return;if(board.challenge_id&&board.challenge_id!==this.result.challengeId)return;
    const rank=Number(board.rank)||null,total=Number(board.total)||0,top=Array.isArray(board.top)?board.top:[];
    const lines=[];
    if(board.registered===false)lines.push('GUEST RUN · NOT REGISTERED');
    else if(rank)lines.push(`RANK #${rank}${total?` / ${total}`:''}`);
    for(const [i,row] of top.slice(0,5).entries()){const name=row.display_name||row.username||(row.mine?'YOU':'PLAYER');const ms=Number(row.elapsed_ms??row.elapsedMs);lines.push(`${i+1}. ${String(name).slice(0,22)}${Number.isFinite(ms)?` · ${(ms/1000).toFixed(2)}s`:''}`)}
    this.overlay.querySelector('.kysBoard').textContent=lines.join('\n');
    const actions=this.overlay.querySelector('.kysActions');if(!actions)return;
    actions.querySelectorAll('[data-kys-host-action]').forEach(x=>x.remove());
    if(board.registered===false){
      const sign=document.createElement('button');sign.dataset.kysHostAction='auth';sign.textContent='Sign in to rank';sign.onclick=e=>{e.stopPropagation();this._post('KYS_AUTH_REQUEST',{challengeId:this.result.challengeId})};actions.prepend(sign);
    } else if(board.winner_claim?.id){
      const win=document.createElement('button');win.dataset.kysHostAction='personalize';win.textContent='Leave your mark';win.onclick=e=>{e.stopPropagation();this._post('KYS_WINNER_PERSONALIZE_REQUEST',{claimId:board.winner_claim.id,challengeId:this.result.challengeId,rank:board.rank})};actions.prepend(win);
    }
  }

  _renderHud(){
    if(!this.hud||this.phase!=='running'||!this.encounter)return;
    if(this.paused){this.hud.innerHTML=`${this.encounter.title||'CHALLENGE'} <span class="time">PAUSED</span>`;return}
    let time='';
    if(this.encounter.timeLimitMs!=null){const left=Math.max(0,this.encounter.timeLimitMs-this.elapsedMs);time=(left/1000).toFixed(left<10000?1:0)+'s';this.hud.classList.toggle('danger',left<5000)}
    else time=(this.elapsedMs/1000).toFixed(1)+'s';
    const done=(this.encounter.objectives||[]).filter(o=>this.objectiveDone(o)).length,total=(this.encounter.objectives||[]).length;
    this.hud.innerHTML=`${this.encounter.title||'CHALLENGE'} <span class="time">${time}</span>${total>1?` · ${done}/${total}`:''}`;
  }
}

export function createKYSChallengeEngine(options){return new KYSChallengeEngine(options)}
