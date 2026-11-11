/* Browser QA only. Run with debug SIX SPECIMENS selected; no emulator writes. */
(() => {
  const q=id=>document.getElementById(id), results=[];
  const check=(name,condition)=>{if(!condition)throw Error(name);results.push(name);};
  const choose=(id,value)=>{q(id).value=value;q(id).dispatchEvent(new Event('change',{bubbles:true}));};
  const call=(category,value,number)=>{choose('opf-category',category);if(value!==undefined)choose('opf-value',value);if(number!==undefined)choose('opf-number',String(number));q('opf-call').requestSubmit();};
  q('opf-scatter').click();
  check('A neutral',q('opf-call-button').disabled&&q('opf-rank-button').disabled&&q('opf-focus').disabled&&!q('opf-category').value&&!q('opf-rank').value);
  call('HIDDEN POWER TYPE','Ghost');check('H Ghost',document.querySelectorAll('.opf-cell.answer').length===3);
  call('HIDDEN POWER TYPE','Fire');check('C replacement',q('opf-chain').children.length===1&&q('opf-chain').textContent.includes('Fire'));
  call('HIDDEN POWER TYPE','Fire');check('E deduplicate',q('opf-chain').children.length===1);
  call('HIDDEN POWER POWER',undefined,60);check('J intersection',q('opf-chain').children.length===2&&document.querySelectorAll('.opf-cell.answer').length===1);
  check('F focus emphasis',!q('opf-focus').disabled&&q('opf-focus').classList.contains('ready'));
  q('opf-focus').click();check('focus neutral',document.querySelectorAll('.opf-cell').length===1&&!q('opf-category').value&&q('opf-focus').disabled&&!q('opf-count').textContent.includes('answering'));
  q('opf-scatter').click();call('HIDDEN POWER TYPE','Ice');check('G zero guarded',q('opf-focus').disabled&&document.querySelectorAll('.opf-cell').length===6&&q('opf-count').textContent.includes('0 answering'));
  q('opf-chain').querySelector('button').click();check('chip removal',!q('opf-count').textContent.includes('answering'));
  choose('opf-category','HIDDEN POWER POWER');choose('opf-number','71');check('HP upper bound',q('opf-call-button').disabled);choose('opf-number','29');check('HP lower bound',q('opf-call-button').disabled);choose('opf-number','60');check('HP valid',!q('opf-call-button').disabled);
  choose('opf-rank','hp');q('opf-rank-form').requestSubmit();check('K tier list',document.querySelectorAll('.opf-tier').length===6&&document.querySelector('.opf-tier').textContent.includes('31'));
  choose('opf-rank','hpPower');q('opf-rank-form').requestSubmit();check('L HP S',document.querySelector('.opf-tier').textContent.includes('70'));
  document.querySelector('[data-tier=A]').click();check('M tier answer',!q('opf-focus').disabled&&document.querySelectorAll('.opf-cell.answer').length===1);
  q('opf-focus').click();check('M tier focus',document.querySelectorAll('.opf-cell').length===1&&!q('opf-rank').value&&q('opf-focus').disabled);
  q('opf-scatter').click();check('B full reset',document.querySelectorAll('.opf-cell').length===6&&!q('opf-chain').children.length&&!q('opf-category').value&&!q('opf-value').value&&!q('opf-number').value&&!q('opf-rank').value&&q('opf-op').value==='>='&&q('opf-call-button').disabled&&q('opf-focus').disabled&&q('opf-rank-button').disabled);
  const toggle=q('pf-presentation');check('binary button',toggle.tagName==='BUTTON');
  if(q('pokefield-live-panel').dataset.presentation!=='compact')toggle.click();
  check('compact',getComputedStyle(q('pf-glance')).display==='flex'&&getComputedStyle(q('owned-pokefield')).display==='none');
  toggle.click();check('expanded',q('pokefield-live-panel').dataset.presentation==='expanded'&&getComputedStyle(q('owned-pokefield')).display!=='none');
  check('flute cue',q('opf-call-button').textContent==='🪈 CALL');
  return {passed:results};
})();
