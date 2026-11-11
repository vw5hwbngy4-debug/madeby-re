(()=>{
  'use strict';
  const LEGACY_URL='https://jrpg.world/emerald/?hoenn_handoff=1';
  const SAVE_LENGTHS=new Set([128*1024,128*1024+16]);
  const MIGRATION_KEY='emerald.wolken.page.play.v0.4.4.legacy-dismissed';
  const DONE_KEY='emerald.wolken.page.play.v0.4.4.legacy-imported';

  document.body.classList.add('hoenn-play-inside');

  const shell=document.createElement('header');
  shell.id='hoenn-play-shell';
  shell.innerHTML=`<a class="hps-brand" href="/"><span class="hps-orb" aria-hidden="true"></span><b>EMERALD · MADEBY.RE <small>EMERALD</small></b></a><nav aria-label="Emerald · MadeBy"><a href="/"><i>●</i><span>LIVE</span></a><a href="/play/" aria-current="page"><i>▶</i><span>PLAY</span></a><a href="/you"><i>◆</i><span>YOU</span></a></nav>`;
  document.body.appendChild(shell);

  const transfer=document.createElement('aside');
  transfer.id='hoenn-legacy-transfer';
  transfer.hidden=localStorage.getItem(MIGRATION_KEY)==='1'||localStorage.getItem(DONE_KEY)==='1';
  transfer.innerHTML=`<b>Played on JRPG.WORLD before?</b><p>Save Vault users can just sign in. If your save only exists in the old browser page, export it there once and import the .sav here.</p><div class="hlt-actions"><button type="button" data-export>1 · EXPORT OLD SAVE</button><button type="button" data-import>2 · IMPORT .SAV HERE</button><button type="button" data-dismiss>NOT NOW</button></div><input data-file type="file" accept=".sav,application/octet-stream" hidden>`;
  document.body.appendChild(transfer);

  function setTransfer(text,state=''){
    transfer.hidden=false;
    transfer.dataset.state=state;
    const p=transfer.querySelector('p'); if(p)p.textContent=text;
  }
  transfer.querySelector('[data-dismiss]')?.addEventListener('click',()=>{localStorage.setItem(MIGRATION_KEY,'1');transfer.hidden=true});
  transfer.querySelector('[data-export]')?.addEventListener('click',()=>{
    window.open(LEGACY_URL,'_blank','noopener');
    setTransfer('Old Emerald opened. Load the game there if needed and tap DOWNLOAD ACTIVE .SAV. Then come back here and choose IMPORT .SAV HERE.','');
  });
  const picker=transfer.querySelector('[data-file]');
  transfer.querySelector('[data-import]')?.addEventListener('click',()=>picker?.click());

  function waitForMgba(timeout=30000){
    return new Promise((resolve,reject)=>{
      const started=Date.now();
      const tick=()=>{
        const M=globalThis.__POKEFIELD_MGBA__;
        if(M&&typeof M.uploadSaveOrSaveState==='function')return resolve(M);
        if(Date.now()-started>timeout)return reject(new Error('EMULATOR_NOT_READY'));
        setTimeout(tick,250);
      }; tick();
    });
  }
  async function importLegacyFile(file){
    if(!file)throw new Error('NO_FILE');
    const bytes=new Uint8Array(await file.arrayBuffer());
    if(!SAVE_LENGTHS.has(bytes.byteLength))throw new Error('SAVE_SIZE_INVALID');
    setTransfer('Save selected. Attaching it to Emerald…','');
    const M=await waitForMgba();
    const safeFile=new File([bytes],`JRPG_WORLD_EMERALD_HANDOFF_${Date.now()}.sav`,{type:'application/octet-stream'});
    await new Promise((resolve,reject)=>{
      let done=false;
      const finish=()=>{if(done)return;done=true;resolve()};
      try{
        const result=M.uploadSaveOrSaveState(safeFile,finish);
        if(result&&typeof result.then==='function')result.then(finish,reject);
        setTimeout(finish,5000);
      }catch(e){reject(e)}
    });
    try{await M.FSSync?.()}catch{}
    localStorage.setItem(DONE_KEY,'1');
    localStorage.removeItem(MIGRATION_KEY);
    setTransfer('Old local save imported ✓ Load your Emerald ROM here. If the game was already running, reload it once so mGBA attaches the transferred save.','ok');
  }
  picker?.addEventListener('change',async()=>{
    try{await importLegacyFile(picker.files?.[0])}
    catch(e){
      console.error('Legacy Emerald import failed',e);
      setTransfer(e?.message==='EMULATOR_NOT_READY'?'Emerald is still starting. Keep this page open and choose IMPORT .SAV HERE again in a moment.':'That file is not a supported Emerald .sav. Nothing here was overwritten.','bad');
    }finally{picker.value=''}
  });
})();
