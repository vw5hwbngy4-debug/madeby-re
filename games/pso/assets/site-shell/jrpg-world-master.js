/* JRPG.WORLD PSO MASTER SHELL v1.8 · Emerald Live integrated · Nova expert hidden */
(() => {
  const path = (location.pathname || '/').replace(/\/+$/, '/') || '/';
  const configs = {
    '/landing/': {
      title:'JRPG.WORLD · Original games, live state, real saves',
      heading:'The game is still the game. Now the web can read it.',
      description:'Play original games, bring real state with you, and let the web understand what is actually happening.',
      image:'/pso/assets/landing-banners/kossmos-space.jpg',
      landing:true
    },
    '/about/': {
      title:'JRPG.WORLD · Platform Blueprint',
      heading:'Explore JRPG.WORLD.',
      description:'Choose a world, open an expert, or browse what’s here.',
      image:'/pso/assets/landing-banners/mecha-cathedral.jpg',
      landing:true
    },
    '/xenosaga/': {
      worldId:'xenosaga-en',
      title:'Xenosaga I+II DS · Localization',
      heading:'Ask anything about Xenosaga I+II.',
      description:'Story, mechanics, translation, patching or technical details. Just type it in.',
      image:'/pso/assets/landing-banners/xenosaga-en-ask-banner.jpg',
      imagePosition:'center 46%',
      bannerClass:'jw-master-memory--xeno',
      portrait:'/pso/assets/landing-banners/xenosaga-en-ask-banner.jpg',
      expertName:'KOS-MOS',
      status:'XENOSAGA LINK ACTIVE · KOS-MOS ONLINE · CANON + GUIDE + ROM READY',
      placeholder:'Ask about lore, mechanics, enemies, maps, or the JP / EN / NL localization…',
      examples:[
        'Explain the opening of Xenosaga I+II DS.',
        'Where should I go next?',
        'Compare the English and Dutch localization.',
        'What does this enemy do?',
        'Explain the translation / ROM work.'
      ]
    },
    '/xenosaga-nederlands/': {
      worldId:'xenosaga-nl',
      title:'Xenosaga I+II DS · Localization',
      heading:'Vraag alles over Xenosaga I+II.',
      description:'Verhaal, gameplay, vertaling, patching of technische details. Typ gewoon je vraag.',
      image:'/pso/assets/landing-banners/xenosaga-nl-ask-banner.jpg',
      imagePosition:'center 44%',
      bannerClass:'jw-master-memory--xeno',
      portrait:'/pso/assets/landing-banners/xenosaga-nl-ask-banner.jpg',
      expertName:'KOS-MOS',
      status:'XENOSAGA LINK ACTIVE · KOS-MOS ONLINE · CANON + GUIDE + ROM READY',
      placeholder:'Vraag over lore, mechanics, vijanden, maps of de JP / EN / NL-localisatie…',
      examples:[
        'Leg het begin van Xenosaga I+II DS uit.',
        'Waar moet ik nu heen?',
        'Vergelijk de Engelse en Nederlandse vertaling.',
        'Wat doet deze vijand?',
        'Leg de vertaling en ROM-aanpak uit.'
      ]
    },
    '/gloria/': {
      worldId:'gloria',
      title:'Gloria Union · Story & Battle Companion',
      heading:'Need a hand on the Blue Ocean?',
      description:'Battles, cards, characters and translation help, with the story kept safely behind your current position.',
      image:'/pso/assets/gloria/companion/chapter-one.jpg',
      imagePosition:'center 48%',
      bannerClass:'jw-master-memory--gloria',
      portrait:'/pso/assets/gloria/companion/pinger-wave.png',
      expertName:'PINGER',
      openerTitle:'Pinger’s on deck.',
      openerIntro:'Fresh voyage, rough battle, strange line? Pick a question or ask your own.',
      promptLabel:'What do you need for the voyage?',
      status:'BLUE OCEAN OPEN · STORY · BATTLES · CHARACTERS · TRANSLATION',
      queryStates:{
        submitting:'PINGER CAUGHT IT · HOLD TIGHT',
        loading:'DIGGING THROUGH THE SHIP’S LOG…',
        ready:'FOUND IT · ASK ANOTHER WHEN YOU LIKE',
        error:'OOPS · TRY THAT AGAIN'
      },
      placeholder:'Ask about battles, cards, characters, or paste a line from the game…',
      examples:[
        'I’m just starting. What should I know without spoilers?',
        'Teach me the battle basics before my first real fight.',
        'How do cards, morale and Unions work together?',
        'What should I watch for in the opening battles?',
        'I found a line I’m curious about. Can I paste it here?'
      ]
    },
    '/phantasy-star-nova/': {
      worldId:'nova',
      title:'Phantasy Star Nova · English Localization',
      heading:'Phantasy Star Nova in English.',
      description:'Complete English text build, runtime proof, local builder and technical record.',
      image:'/pso/assets/world-nav/app-icons/nova.jpg',
      expertDisabled:true
    }
  };

  const cfg = configs[path];
  if (!cfg) return;
  document.body.classList.add('jw-master-identity');
  document.body.classList.add(`jw-world-${cfg.worldId || 'landing'}`);
  if (!cfg.landing) document.body.classList.add('jw-translation-app');

  const tabs = document.querySelector('.jw-tab-host');
  if (!tabs) return;

  // Landing/About are already complete semantic pages; PSO has its own canonical shell.
  if (cfg.landing || path === '/pso/') return;

  const stack = document.createElement('div');
  stack.className = 'jw-master-stack';
  stack.setAttribute('data-jw-master-stack','');

  const memory = document.createElement('section');
  memory.className = `jw-master-memory${cfg.bannerClass ? ` ${cfg.bannerClass}` : ''}`;
  memory.innerHTML = `
    <img class="jw-master-memory-bg" src="${cfg.image}" alt="" aria-hidden="true"${cfg.imagePosition ? ` style="object-position:${cfg.imagePosition}"` : ''}>
    <div class="jw-master-memory-copy">
      <div class="jw-master-kicker">${cfg.title}</div>
      <h2>${cfg.heading || 'Ask anything about this world.'}</h2>
      <p>${cfg.description || 'Pick an expert, or just start typing.'}</p>
    </div>`;
  stack.appendChild(memory);

  if (!cfg.landing && !cfg.expertDisabled) {
    const service = document.createElement('section');
    service.className = 'jw-master-service';
    service.innerHTML = `
      <div class="jw-master-prompt-label">${cfg.promptLabel || 'What do you want from this world?'}</div>
      <form class="jw-master-form" data-jw-master-form>
        <input class="jw-master-prompt" data-jw-master-prompt autocomplete="off" spellcheck="false" placeholder="${cfg.placeholder}">
        <button class="jw-master-go" type="submit" aria-label="Ask">↵</button>
      </form>
      ${cfg.worldId==='gloria' ? `
      <div class="jw-gloria-voyage" data-jw-gloria-voyage>
        <label class="jw-gloria-voyage-field"><span>YOUR VOYAGE</span><input type="text" data-jw-gloria-progress maxlength="80" autocomplete="off" placeholder="Stage / chapter (optional)"></label>
        <button class="jw-gloria-spoiler-toggle is-on" type="button" data-jw-gloria-spoiler aria-pressed="true"><span>✦</span> SPOILER-SAFE</button>
      </div>` : ''}
      <div class="jw-master-examples">${cfg.examples.map((q,i)=>`<button class="jw-master-example" type="button" data-jw-master-example="${i}">${q}</button>`).join('')}</div>
      <div class="jw-master-status"><span class="jw-master-status-dot"></span><span data-jw-master-status-text>${cfg.status}</span></div>`;
    stack.appendChild(service);

    const opener = document.createElement('section');
    opener.className = 'jw-master-opener';
    opener.tabIndex = 0;
    opener.setAttribute('role','button');
    opener.setAttribute('aria-label',`Get a prompt idea from ${cfg.expertName}`);
    opener.innerHTML = `
      <div class="jw-master-opener-mark">◈</div>
      <div class="jw-master-opener-copy"><b>${cfg.openerTitle || `${cfg.expertName} is standing by.`}</b><br><span data-jw-master-opener-text>${cfg.openerIntro || 'Pick a suggestion above, or type your own question.'}</span></div>
      <aside class="jw-master-opener-portrait" aria-hidden="true" hidden><img src="${cfg.portrait}" alt=""></aside>`;
    stack.appendChild(opener);
  }

  tabs.insertAdjacentElement('afterend', stack);

  if (cfg.landing || cfg.expertDisabled) return;

  // Gloria is the canonical translation-app anatomy: hero first, Expert second.
  // Keep every translation runtime in that order even when a legacy page placed
  // status/completion material between them.
  const appMain = document.querySelector('main');
  const appHero = appMain?.querySelector('.hero');
  const appExpert = appMain?.querySelector('[data-world-expert]');
  if (appHero && appExpert && appHero.nextElementSibling !== appExpert) {
    appHero.insertAdjacentElement('afterend', appExpert);
  }

  const form = stack.querySelector('[data-jw-master-form]');
  const prompt = stack.querySelector('[data-jw-master-prompt]');
  const opener = stack.querySelector('.jw-master-opener');
  const openerText = stack.querySelector('[data-jw-master-opener-text]');
  const portrait = stack.querySelector('.jw-master-opener-portrait');
  let openerIndex = 0;

  const go = stack.querySelector('.jw-master-go');
  const gloriaProgress = stack.querySelector('[data-jw-gloria-progress]');
  const gloriaSpoiler = stack.querySelector('[data-jw-gloria-spoiler]');
  gloriaSpoiler?.addEventListener('click',()=>{
    const next=gloriaSpoiler.getAttribute('aria-pressed')!=='true';
    gloriaSpoiler.setAttribute('aria-pressed',String(next));
    gloriaSpoiler.classList.toggle('is-on',next);
    gloriaSpoiler.innerHTML=next?'<span>✦</span> SPOILER-SAFE':'<span>☀</span> SPOILERS OK';
  });
  const currentPlayerContext=()=>cfg.worldId==='gloria'?{
    progress:(gloriaProgress?.value||'').trim(),
    spoiler_safe:gloriaSpoiler?.getAttribute('aria-pressed')!=='false'
  }:null;
  const statusText = stack.querySelector('[data-jw-master-status-text]');
  const statusDot = stack.querySelector('.jw-master-status-dot');

  const composerState = (state) => {
    const busy = state === 'submitting' || state === 'loading';
    if (prompt) prompt.disabled = busy;
    if (go) go.disabled = busy;
    form?.classList.toggle('is-busy', busy);
    stack.querySelector('.jw-master-service')?.setAttribute('data-query-state', state);
    if (statusDot) statusDot.dataset.state = state;
    const labels = {
      idle: cfg.status,
      submitting: cfg.queryStates?.submitting || `${cfg.expertName} RECEIVING QUERY · RESPONSE SURFACE OPENING`,
      loading: cfg.queryStates?.loading || `${cfg.expertName} THINKING · CANON LINK ACTIVE`,
      ready: cfg.queryStates?.ready || `${cfg.expertName} RESPONSE READY · ASK AGAIN ABOVE`,
      error: cfg.queryStates?.error || `${cfg.expertName} LINK INTERRUPTED · RETRY ABOVE`
    };
    if (statusText) statusText.textContent = labels[state] || cfg.status;
  };

  const routeToExpert = (query) => {
    const q = (query || '').trim();
    if (!q) return Promise.resolve(null);
    const expert = document.querySelector('[data-world-expert]');
    const runtime = window.JRPGWorldExpert;
    if (runtime?.ask && (!cfg.worldId || runtime.world === cfg.worldId)) {
      const task = runtime.ask(q,{source:'master-composer',context:currentPlayerContext()});
      runtime.reveal?.();
      return task;
    }
    // Runtime should already be loaded, but keep a direct event fallback rather
    // than reverting to the old prefill + second-click / second-Enter behavior.
    document.dispatchEvent(new CustomEvent('jrpg:expert-query',{detail:{world:cfg.worldId,query:q,source:'master-composer'}}));
    expert?.scrollIntoView({behavior:'smooth',block:'start'});
    return Promise.resolve(null);
  };

  window.addEventListener('jrpg:expert-state', (event) => {
    const detail = event.detail || {};
    if (cfg.worldId && detail.world !== cfg.worldId) return;
    composerState(detail.state || 'idle');
  });

  form?.addEventListener('submit', (e) => {
    e.preventDefault();
    const q = prompt.value.trim();
    if (!q) return;
    composerState('submitting');
    routeToExpert(q).catch(() => composerState('error'));
  });

  stack.querySelectorAll('[data-jw-master-example]').forEach((button) => {
    button.addEventListener('click', () => {
      const q = cfg.examples[Number(button.dataset.jwMasterExample)] || button.textContent.trim();
      prompt.value = q;
      prompt.focus();
    });
  });

  const cycle = () => {
    const q = cfg.examples[openerIndex % cfg.examples.length];
    openerIndex += 1;
    openerText.textContent = q;
    prompt.value = q;
    portrait.hidden = false;
    opener.classList.add('is-open');
    opener.classList.remove('is-swap');
    void opener.offsetWidth;
    opener.classList.add('is-swap');
  };
  opener?.addEventListener('click', cycle);
  opener?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      cycle();
    }
  });
})();
