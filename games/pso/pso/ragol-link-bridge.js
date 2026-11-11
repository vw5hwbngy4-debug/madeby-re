const RAGOL_BRIDGE_VERSION='0.1.3';

(function(){
  const pageUrl=new URL(location.href);
  if(pageUrl.searchParams.get('ragol')!=='1') return;

  const hp=new URLSearchParams(location.hash.replace(/^#/,''));
  const port=Number(hp.get('port'));
  const token=hp.get('token')||'';
  if(!Number.isInteger(port)||port<1||port>65535||!/^[a-f0-9]{48}$/i.test(token)){
    console.warn('Ragol Link v0.1.3: invalid bridge parameters');
    return;
  }

  const base=`http://127.0.0.1:${port}/v1`;
  let busy=false;
  let notice=null;

  function coachHost(){
    return document.getElementById('saveMagCoachHost');
  }

  function ensureNotice(){
    if(notice?.isConnected) return notice;
    notice=document.createElement('div');
    notice.id='ragolBridgeNotice';
    notice.setAttribute('role','status');
    notice.style.cssText=[
      'margin-top:6px','font:700 11px/1.35 system-ui,sans-serif',
      'letter-spacing:.04em','color:#9ee8ff','display:flex',
      'align-items:center','gap:8px','flex-wrap:wrap'
    ].join(';');
    const h=coachHost();
    if(h) h.insertAdjacentElement('afterend',notice);
    return notice;
  }

  function show(text,{error=false,retry=false}={}){
    const n=ensureNotice();
    n.textContent='';
    const span=document.createElement('span');
    span.textContent=text;
    span.style.color=error?'#ffb7c5':'#9ee8ff';
    n.appendChild(span);
    if(retry){
      const b=document.createElement('button');
      b.type='button';
      b.textContent='RETRY';
      b.style.cssText='font:800 10px system-ui;padding:4px 8px;border:1px solid #47718f;border-radius:999px;background:#0b2031;color:#eaf6ff;cursor:pointer';
      b.addEventListener('click',()=>connect());
      n.appendChild(b);
    }
  }

  function hideSoon(){
    setTimeout(()=>{ if(notice?.isConnected) notice.remove(); },1800);
  }

  function bridgeRequest(path){
    const url=`${base}/${path}?token=${encodeURIComponent(token)}`;
    const init={method:'GET',mode:'cors',cache:'no-store',credentials:'omit'};
    let req;
    try{
      req=new Request(url,{...init,targetAddressSpace:'loopback'});
    }catch{
      req=new Request(url,init);
    }
    return fetch(req);
  }

  async function waitForCoach(timeoutMs=12000){
    const end=Date.now()+timeoutMs;
    while(Date.now()<end){
      const c=window.PSO_SAVE_MAG_COACH;
      if(c&&typeof c.linkFile==='function') return c;
      await new Promise(r=>setTimeout(r,80));
    }
    throw new Error('RICO Xbox save linker did not initialize.');
  }

  async function sha256Hex(buffer){
    const digest=await crypto.subtle.digest('SHA-256',buffer);
    return [...new Uint8Array(digest)].map(x=>x.toString(16).padStart(2,'0')).join('');
  }

  function cleanBridgeUrl(){
    const u=new URL(location.href);
    u.searchParams.delete('ragol');
    u.hash='';
    history.replaceState(null,'',u.pathname+(u.searchParams.size?`?${u.searchParams.toString()}`:''));
  }

  async function connect(){
    if(busy) return;
    busy=true;
    show('RAGOL LINK · connecting to the Xbox USB reader…');
    try{
      const coach=await waitForCoach();

      const sr=await bridgeRequest('status');
      if(!sr.ok) throw new Error(`Local bridge status failed (${sr.status}).`);
      const status=await sr.json();
      if(!status?.ready||status?.platform!=='original-xbox'||Number(status?.size)!==65536){
        throw new Error('Local bridge did not present a valid Original Xbox PSO character.');
      }

      show('RAGOL LINK · verified save found · linking locally…');

      const rr=await bridgeRequest('save');
      if(!rr.ok) throw new Error(`Local bridge save read failed (${rr.status}).`);
      const buffer=await rr.arrayBuffer();
      if(buffer.byteLength!==65536) throw new Error(`Unexpected save size ${buffer.byteLength}.`);

      const gotHash=await sha256Hex(buffer);
      const expected=String(status.sha256||rr.headers.get('X-Ragol-SHA256')||'').toLowerCase();
      if(expected&&gotHash!==expected){
        throw new Error('Local bridge SHA-256 mismatch.');
      }

      const file=new File([buffer],'PSO_CHARACTER',{type:'application/octet-stream',lastModified:Date.now()});
      await coach.linkFile(file);

      if(!coach.isLinked()){
        throw new Error('RICO rejected the bridged PSO_CHARACTER after local validation.');
      }

      try{ await bridgeRequest('done'); }catch{}
      cleanBridgeUrl();

      const decoded=coach.getDecoded?.();
      const c=decoded?.character;
      const label=c?`${c.name} · ${c.class?.name||''} · ${c.section_id?.name||''} · Lv${c.level}`:'verified Xbox save';
      show(`RAGOL LINK ✓ ${label}`);
      hideSoon();
      window.dispatchEvent(new CustomEvent('pso:ragol-link-bridge',{detail:{version:RAGOL_BRIDGE_VERSION,linked:true,sha256:gotHash}}));
    }catch(err){
      console.error('Ragol Link v0.1.3:',err);
      show(
        'RAGOL LINK · localhost access was blocked or the companion stopped. Allow local-network/localhost access for jrpg.world, then retry.',
        {error:true,retry:true}
      );
      window.dispatchEvent(new CustomEvent('pso:ragol-link-bridge',{detail:{version:RAGOL_BRIDGE_VERSION,linked:false,error:String(err?.message||err)}}));
    }finally{
      busy=false;
    }
  }

  if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded',()=>connect(),{once:true});
  }else{
    connect();
  }
})();
