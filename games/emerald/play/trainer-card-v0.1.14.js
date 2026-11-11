(() => {
  'use strict';

  const STORE_KEY = 'jrpg.world.emerald.trainer-card.v1';
  const STORE_VERSION = 1;
  const MAX_SLOTS = 6;
  const MAX_BOX = 120;
  const MOBILE_CARD = window.matchMedia('(max-width: 959px)');

  let panel = null;
  let stage = null;
  let flipper = null;
  let front = null;
  let back = null;
  let currentGameState = globalThis.JRPGWorldEmeraldState || null;
  let store = loadStore();
  let pendingReplaceCaptureId = null;
  let toastTimer = 0;
  let primaryObserver = null;
  let panelObserver = null;
  let resizeObserver = null;

  function emptyStore() {
    return {
      version: STORE_VERSION,
      trainerName: 'EMERALD TRAINER',
      slots: Array(MAX_SLOTS).fill(null),
      box: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
  }

  function sanitizeStore(value) {
    const base = emptyStore();
    if (!value || typeof value !== 'object') return base;
    const slots = Array.isArray(value.slots) ? value.slots.slice(0, MAX_SLOTS) : [];
    while (slots.length < MAX_SLOTS) slots.push(null);
    const box = Array.isArray(value.box) ? value.box.filter(Boolean).slice(0, MAX_BOX) : [];
    const ids = new Set(box.map(x => x?.captureId).filter(Boolean));
    return {
      version: STORE_VERSION,
      trainerName: String(value.trainerName || base.trainerName).slice(0, 40),
      slots: slots.map(x => ids.has(x) ? x : null),
      box,
      createdAt: value.createdAt || base.createdAt,
      updatedAt: value.updatedAt || base.updatedAt
    };
  }

  function loadStore() {
    try {
      return sanitizeStore(JSON.parse(localStorage.getItem(STORE_KEY) || 'null'));
    } catch (e) {
      return emptyStore();
    }
  }

  function persist(reason = 'update') {
    store.updatedAt = new Date().toISOString();
    try { localStorage.setItem(STORE_KEY, JSON.stringify(store)); } catch (e) {}
    try {
      window.dispatchEvent(new CustomEvent('jrpg:emerald-trainer-card-changed', {
        detail: { reason, state: publicStore() }
      }));
    } catch (e) {}
  }

  function publicStore() {
    return JSON.parse(JSON.stringify(store));
  }

  function captureById(id) {
    return store.box.find(x => x.captureId === id) || null;
  }

  function isCardEligible(record) {
    return !!record && (record.source === 'OWNED' || record.source === 'EGG');
  }

  function slotCaptures() {
    return store.slots.map(captureById);
  }

  function uniqueId(prefix = 'cap') {
    if (globalThis.crypto?.randomUUID) return `${prefix}_${crypto.randomUUID()}`;
    return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 9)}`;
  }

  function cloneMon(mon) {
    if (!mon) return null;
    return JSON.parse(JSON.stringify(mon));
  }

  function feedReadyPayload(record) {
    return {
      type: 'pokemon_find',
      schema: 'jrpg.world.emerald.find.v1',
      game: 'pokemon_emerald',
      trainer: { name: store.trainerName },
      source: record.source,
      savedAt: record.savedAt,
      pokemon: cloneMon(record.mon)
    };
  }

  function saveMonToBox(mon) {
    if (!mon?.id) return null;
    let record = store.box.find(x => x.mon?.id === mon.id) || null;
    if (record) {
      record.mon = cloneMon(mon);
      record.source = mon.kind || record.source || 'LIVE';
      record.updatedAt = new Date().toISOString();
    } else {
      record = {
        captureId: uniqueId('find'),
        game: 'pokemon_emerald',
        source: mon.kind || 'LIVE',
        savedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        mon: cloneMon(mon)
      };
      store.box.unshift(record);
      if (store.box.length > MAX_BOX) {
        const keepIds = new Set(store.slots.filter(Boolean));
        const protectedRows = store.box.filter(x => keepIds.has(x.captureId));
        const normalRows = store.box.filter(x => !keepIds.has(x.captureId)).slice(0, Math.max(0, MAX_BOX - protectedRows.length));
        store.box = [...protectedRows, ...normalRows].slice(0, MAX_BOX);
      }
    }
    persist('box-save');
    try {
      window.dispatchEvent(new CustomEvent('jrpg:emerald-box-save', {
        detail: { record: JSON.parse(JSON.stringify(record)), streamPayload: feedReadyPayload(record) }
      }));
    } catch (e) {}
    return record;
  }

  function firstEmptySlot() {
    return store.slots.findIndex(x => !x);
  }

  function addCaptureToCard(captureId) {
    const eligibleRecord = captureById(captureId);
    if (!eligibleRecord) return false;
    if (!isCardEligible(eligibleRecord)) {
      showToast('Wild find saved. Add it after it appears as an owned Pokémon.');
      return false;
    }
    const already = store.slots.indexOf(captureId);
    if (already >= 0) {
      showToast('Already on your Trainer Card.');
      flipToTrainer();
      return true;
    }
    const empty = firstEmptySlot();
    if (empty >= 0) {
      store.slots[empty] = captureId;
      pendingReplaceCaptureId = null;
      persist('card-add');
      renderTrainerCard();
      showToast(`Added to slot ${empty + 1}.`);
      return true;
    }
    pendingReplaceCaptureId = captureId;
    renderTrainerCard();
    flipToTrainer();
    showToast('Card full. Choose a slot to replace.');
    return false;
  }

  function addPrimaryToCard() {
    const mon = currentGameState?.primary;
    if (!mon) return;
    const record = saveMonToBox(mon);
    if (record) {
      if (isCardEligible(record)) addCaptureToCard(record.captureId);
      else showToast('Find saved. Catch it, then add the owned Pokémon to your card.');
      renderAll();
    }
  }

  function savePrimaryOnly() {
    const mon = currentGameState?.primary;
    if (!mon) return;
    const existing = store.box.find(x => x.mon?.id === mon.id);
    const record = saveMonToBox(mon);
    if (record) {
      renderAll();
      showToast(existing ? 'Find updated in My Box.' : 'Saved privately to My Box.');
    }
  }

  function replaceSlot(index) {
    if (!pendingReplaceCaptureId || index < 0 || index >= MAX_SLOTS) return;
    store.slots[index] = pendingReplaceCaptureId;
    pendingReplaceCaptureId = null;
    persist('card-replace');
    renderTrainerCard();
    showToast(`Replaced slot ${index + 1}.`);
  }

  function removeSlot(index) {
    if (index < 0 || index >= MAX_SLOTS) return;
    store.slots[index] = null;
    pendingReplaceCaptureId = null;
    persist('card-remove');
    renderTrainerCard();
    measureStage();
  }

  function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
  }

  function spriteUrl(mon) {
    return mon?.dexNo ? `./assets/pokemon/${encodeURIComponent(mon.dexNo)}.png` : '';
  }

  function ivSpread(mon) {
    const v = mon?.ivs || {};
    return [v.hp,v.atk,v.def,v.spa,v.spd,v.spe].map(x => Number.isFinite(Number(x)) ? Number(x) : 0).join('/');
  }

  function averageFor(records) {
    const vals = records.filter(Boolean).map(x => Number(x.mon?.ivAverage || 0));
    if (!vals.length) return 0;
    return Math.round((vals.reduce((a,b) => a+b, 0) / vals.length) * 10) / 10;
  }

  function perfectCount(records) {
    let n = 0;
    for (const record of records.filter(Boolean)) {
      for (const v of Object.values(record.mon?.ivs || {})) if (Number(v) === 31) n += 1;
    }
    return n;
  }

  function renderSlot(record, index) {
    if (!record) {
      if (pendingReplaceCaptureId) {
        return `<div class="tc-slot tc-replace-target"><div class="tc-slot-empty">EMPTY SLOT</div><button class="tc-slot-replace" type="button" data-replace-slot="${index}">PLACE HERE</button></div>`;
      }
      return `<div class="tc-slot"><div class="tc-slot-empty">EMPTY SLOT<br>ADD A GOOD FIND</div></div>`;
    }
    const m = record.mon || {};
    const hp = m.hiddenPower || {};
    const replacing = !!pendingReplaceCaptureId;
    return `<div class="tc-slot${replacing ? ' tc-replace-target' : ''}">
      <div class="tc-slot-body">
        ${m.dexNo ? `<img src="${spriteUrl(m)}" alt="">` : '<div></div>'}
        <div><div class="tc-slot-name">${m.shiny?.isShiny ? '✦ ' : ''}${escapeHtml(m.species)} ${escapeHtml(m.genderSymbol || '')} ${m.level ? `Lv${escapeHtml(m.level)}` : ''}</div>
        <div class="tc-slot-meta">${escapeHtml(m.nature)} · ${escapeHtml(m.ability)}${m.heldItem ? ` · 🎒 ${escapeHtml(m.heldItem)}` : ''}${m.ribbons?.count ? ` · 🏅 ${escapeHtml(m.ribbons.count)}` : ''}</div></div>
      </div>
      <div class="tc-slot-ivs">IV ${escapeHtml(ivSpread(m))}</div>
      <div class="tc-slot-bottom"><span class="tc-slot-avg">AVG ${escapeHtml(Number(m.ivAverage || 0).toFixed(1))}</span><span class="tc-slot-hp">HP ${escapeHtml(hp.type || '?')} ${escapeHtml(hp.power ?? '')}</span></div>
      ${replacing ? `<button class="tc-slot-replace" type="button" data-replace-slot="${index}">REPLACE SLOT ${index + 1}</button>` : `<button class="tc-slot-remove" type="button" data-remove-slot="${index}" aria-label="Remove ${escapeHtml(m.species)} from Trainer Card">×</button>`}
    </div>`;
  }

  function renderBoxRow(record) {
    const m = record.mon || {};
    const onCard = store.slots.includes(record.captureId);
    const eligible = isCardEligible(record);
    const hp = m.hiddenPower || {};
    const disabled = onCard || !eligible;
    const actionLabel = onCard ? 'ON CARD' : (eligible ? '+ CARD' : 'WILD FIND');
    return `<div class="tc-box-mon">
      ${m.dexNo ? `<img src="${spriteUrl(m)}" alt="">` : '<div></div>'}
      <div><div class="tc-box-name">${m.shiny?.isShiny ? '✦ ' : ''}${escapeHtml(m.species)} ${escapeHtml(m.genderSymbol || '')} ${m.level ? `Lv${escapeHtml(m.level)}` : ''}</div>
      <div class="tc-box-meta">AVG ${escapeHtml(Number(m.ivAverage || 0).toFixed(1))} · HP ${escapeHtml(hp.type || '?')}${m.heldItem ? ` · 🎒 ${escapeHtml(m.heldItem)}` : ''}${m.ribbons?.count ? ` · 🏅 ${escapeHtml(m.ribbons.count)}` : ''} · ${escapeHtml(record.source || 'LIVE')}</div></div>
      <button class="tc-box-action" type="button" data-box-add="${escapeHtml(record.captureId)}" ${disabled ? 'disabled' : ''}>${actionLabel}</button>
    </div>`;
  }

  function trainerTemplate() {
    return `<article class="tc-card" aria-label="Competitive Trainer Card">
      <div class="tc-card-top">
        <div>
          <div class="tc-eyebrow">JRPG.WORLD / EMERALD · COMPETITIVE TRAINER CARD</div>
          <input id="tc-trainer-name" class="tc-trainer-name" maxlength="40" value="${escapeHtml(store.trainerName)}" aria-label="Trainer name">
          <div class="tc-live-badge">GAME-DERIVED FINDS · PRIVATE UNTIL YOU SHARE</div>
        </div>
        <div class="tc-top-actions">
          <button class="tc-card-action" id="tc-share-card" type="button">SHARE PNG</button>
          <button class="tc-card-action" id="tc-back-live" type="button">↻ LIVE</button>
        </div>
      </div>
      <div class="tc-summary" id="tc-summary"></div>
      <div class="tc-replace-banner" id="tc-replace-banner"></div>
      <div class="tc-team" id="tc-team"></div>
      <details class="tc-box" id="tc-box">
        <summary><span>MY BOX</span><span id="tc-box-count">0 SAVED</span></summary>
        <div class="tc-box-grid" id="tc-box-grid"></div>
      </details>
      <div class="tc-card-footer"><span><strong>FRONT:</strong> live IV card · <strong>BACK:</strong> your competitive showcase</span><span>Stored locally in this browser</span></div>
    </article>`;
  }

  function renderTrainerCard() {
    if (!back) return;
    if (!back.querySelector('.tc-card')) back.innerHTML = trainerTemplate();

    const name = back.querySelector('#tc-trainer-name');
    if (name && document.activeElement !== name) name.value = store.trainerName;

    const records = slotCaptures();
    const filled = records.filter(Boolean);
    const avg = averageFor(records);
    const perfect = perfectCount(records);
    const summary = back.querySelector('#tc-summary');
    if (summary) {
      summary.innerHTML = `
        <div class="tc-summary-item"><span>TEAM IV AVG</span><strong>${filled.length ? avg.toFixed(1) : '—'}</strong></div>
        <div class="tc-summary-item"><span>31 IVs</span><strong>${perfect}</strong></div>
        <div class="tc-summary-item"><span>ON CARD</span><strong>${filled.length}/${MAX_SLOTS}</strong></div>`;
    }

    const banner = back.querySelector('#tc-replace-banner');
    if (banner) {
      const pending = captureById(pendingReplaceCaptureId);
      banner.classList.toggle('tc-show', !!pending);
      banner.textContent = pending ? `Card full. Choose the Pokémon slot you want to replace with ${pending.mon?.species || 'this find'}.` : '';
    }

    const team = back.querySelector('#tc-team');
    if (team) team.innerHTML = records.map(renderSlot).join('');

    const boxCount = back.querySelector('#tc-box-count');
    if (boxCount) boxCount.textContent = `${store.box.length} SAVED`;
    const boxGrid = back.querySelector('#tc-box-grid');
    if (boxGrid) boxGrid.innerHTML = store.box.length ? store.box.map(renderBoxRow).join('') : '<div class="tc-box-empty">Save a live Pokémon and it will appear here.</div>';

    const share = back.querySelector('#tc-share-card');
    if (share) share.disabled = filled.length === 0;

    measureStage();
  }

  function ensureHeaderButton() {
    if (!panel) return;
    const head = panel.querySelector('.pf-head');
    if (!head) return;
    let button = head.querySelector('#tc-header-button');
    if (!button) {
      button = document.createElement('button');
      button.id = 'tc-header-button';
      button.type = 'button';
      button.className = 'tc-header-button';
      button.addEventListener('click', () => { if (isFlipped()) flipToLive(); else flipToTrainer(); });
      (head.querySelector('.pf-head-actions') || head).appendChild(button);
    }
    const n = store.slots.filter(Boolean).length;
    button.textContent = isFlipped() ? 'LIVE' : `TRAINER CARD ${n}/${MAX_SLOTS}`;
    button.setAttribute('aria-pressed', isFlipped() ? 'true' : 'false');
    button.setAttribute('aria-label', isFlipped() ? 'Return to live PokéField data' : 'Open Trainer Card');
  }

  function ensureStage() {
    if (!panel) return false;
    const primary = panel.querySelector('#pf-primary');
    if (!primary) return false;
    stage = panel.querySelector('#tc-stage');
    if (stage) {
      flipper = stage.querySelector('.tc-flipper');
      front = stage.querySelector('.tc-face-front');
      back = stage.querySelector('.tc-face-back');
      if (primary.parentElement !== front) front?.appendChild(primary);
      return true;
    }

    stage = document.createElement('div');
    stage.id = 'tc-stage';
    stage.className = 'tc-stage';
    stage.innerHTML = '<div class="tc-flipper"><section class="tc-face tc-face-front"></section><section class="tc-face tc-face-back"></section></div><div class="tc-toast" id="tc-toast" aria-live="polite"></div>';
    primary.insertAdjacentElement('beforebegin', stage);
    flipper = stage.querySelector('.tc-flipper');
    front = stage.querySelector('.tc-face-front');
    back = stage.querySelector('.tc-face-back');
    front.appendChild(primary);
    back.innerHTML = trainerTemplate();

    primaryObserver = new MutationObserver(() => {
      syncLiveActions();
      measureStage();
    });
    primaryObserver.observe(primary, { childList: true, subtree: true, attributes: true, attributeFilter: ['open'] });

    // v0.1.18.1 hotfix: DETAILS can grow #pf-primary without resizing the
    // absolutely positioned front face. Observe the real live content and
    // remeasure on <details> toggles so the black panel always grows with it.
    primary.addEventListener('toggle', () => requestAnimationFrame(measureStage), true);
    if (globalThis.ResizeObserver) {
      resizeObserver = new ResizeObserver(measureStage);
      resizeObserver.observe(primary);
      resizeObserver.observe(back);
    }

    return true;
  }

  function currentPrimaryCard() {
    return front?.querySelector('#pf-primary .pf-card') || null;
  }

  function syncLiveActions() {
    if (!front) return;
    const primary = front.querySelector('#pf-primary');
    if (!primary) return;
    let actions = primary.querySelector('.tc-live-actions');
    const mon = currentGameState?.primary || null;
    const hasCard = !!currentPrimaryCard();

    if (!hasCard || !mon) {
      actions?.remove();
      measureStage();
      return;
    }
    if (!actions) {
      actions = document.createElement('div');
      actions.className = 'tc-live-actions';
      primary.appendChild(actions);
    }
    const existing = store.box.find(x => x.mon?.id === mon.id);
    const onCard = existing ? store.slots.includes(existing.captureId) : false;
    const owned = mon.kind === 'OWNED' || mon.kind === 'EGG';

    // Runtime hotfix v0.1.7.3:
    // primaryObserver watches #pf-primary. Rewriting actions.innerHTML on every
    // observer callback mutates that same subtree and can create an infinite
    // MutationObserver feedback loop as soon as the first owned Pokémon card
    // (for example the starter) is rendered. Only rebuild controls when their
    // semantic state actually changes.
    const signature = [mon.id || '', mon.kind || '', existing?.captureId || '', onCard ? '1' : '0'].join('|');
    if (actions.dataset.tcSignature !== signature) {
      actions.dataset.tcSignature = signature;
      actions.innerHTML = owned ? `
        <button class="tc-action tc-action-primary" type="button" id="tc-add-primary">${onCard ? 'ON TRAINER CARD ✓' : 'ADD TO CARD'}</button>
        <button class="tc-action" type="button" id="tc-save-primary">${existing ? 'SAVED TO BOX ✓' : 'SAVE TO BOX'}</button>
        <button class="tc-action" type="button" id="tc-flip-primary">TRAINER CARD ↻</button>` : `
        <button class="tc-action tc-action-primary" type="button" id="tc-save-primary">${existing ? 'FIND SAVED ✓' : 'SAVE FIND'}</button>
        <button class="tc-action" type="button" id="tc-flip-primary">TRAINER CARD ↻</button>`;
      const add = actions.querySelector('#tc-add-primary');
      const save = actions.querySelector('#tc-save-primary');
      const flip = actions.querySelector('#tc-flip-primary');
      if (add) { add.disabled = onCard; add.addEventListener('click', addPrimaryToCard); }
      if (save) { save.disabled = false; save.addEventListener('click', savePrimaryOnly); }
      if (flip) flip.addEventListener('click', flipToTrainer);
    }
    measureStage();
  }

  function isFlipped() {
    return !!stage?.classList.contains('tc-flipped');
  }

  function resetMobileStageHeight() {
    if (!stage || !MOBILE_CARD.matches) return;
    stage.style.removeProperty('height');
    stage.style.removeProperty('min-height');
    flipper?.style.removeProperty('height');
    flipper?.style.removeProperty('min-height');
  }

  function collapseMobileBox() {
    if (!MOBILE_CARD.matches || !back) return;
    const box = back.querySelector('#tc-box');
    if (box) box.open = false;
  }

  function flipToTrainer() {
    if (!stage) return;
    renderTrainerCard();
    if (MOBILE_CARD.matches) {
      resetMobileStageHeight();
      collapseMobileBox();
    }
    panel?.classList.add('tc-showing-card');
    stage.classList.add('tc-flipped');
    ensureHeaderButton();
    requestAnimationFrame(measureStage);
  }

  function flipToLive() {
    if (!stage) return;
    pendingReplaceCaptureId = null;
    renderTrainerCard();
    panel?.classList.remove('tc-showing-card');
    stage.classList.remove('tc-flipped');
    ensureHeaderButton();
    resetMobileStageHeight();
    requestAnimationFrame(measureStage);
  }

  function measureStage() {
    if (!stage || !front || !back) return;
    if (MOBILE_CARD.matches) {
      resetMobileStageHeight();
      return;
    }
    // Desktop v0.1.14: measure the real active content, not the absolutely
    // positioned face. The face uses inset:0 and therefore inherits the old
    // stage height; measuring it caused a large black gap to survive after
    // flipping from a tall Trainer Card back to Live.
    const activeContent = isFlipped()
      ? (back.querySelector('.tc-card') || back.firstElementChild || back)
      : (front.querySelector('#pf-primary') || front.firstElementChild || front);
    const h = Math.max(0, Math.ceil(activeContent.scrollHeight));
    stage.style.height = `${h}px`;
  }

  function showToast(message) {
    const toast = stage?.querySelector('#tc-toast');
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add('tc-show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove('tc-show'), 1800);
  }

  function wireBackEvents() {
    if (!back || back.dataset.tcWired === '1') return;
    back.dataset.tcWired = '1';
    back.addEventListener('input', e => {
      if (e.target?.id === 'tc-trainer-name') {
        store.trainerName = String(e.target.value || '').slice(0, 40) || 'EMERALD TRAINER';
        persist('trainer-name');
        ensureHeaderButton();
      }
    });
    back.addEventListener('click', async e => {
      const target = e.target.closest('button');
      if (!target) return;
      if (target.id === 'tc-back-live') { flipToLive(); return; }
      if (target.id === 'tc-share-card') { await shareCard(); return; }
      if (target.dataset.removeSlot != null) { removeSlot(Number(target.dataset.removeSlot)); return; }
      if (target.dataset.replaceSlot != null) { replaceSlot(Number(target.dataset.replaceSlot)); return; }
      if (target.dataset.boxAdd) { addCaptureToCard(target.dataset.boxAdd); renderAll(); return; }
    });
  }

  async function loadImage(url) {
    return await new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = url;
    });
  }

  function roundRect(ctx, x, y, w, h, r, fill, stroke) {
    const rr = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + rr, y);
    ctx.arcTo(x + w, y, x + w, y + h, rr);
    ctx.arcTo(x + w, y + h, x, y + h, rr);
    ctx.arcTo(x, y + h, x, y, rr);
    ctx.arcTo(x, y, x + w, y, rr);
    ctx.closePath();
    if (fill) { ctx.fillStyle = fill; ctx.fill(); }
    if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = 2; ctx.stroke(); }
  }

  async function makeCardBlob() {
    const records = slotCaptures();
    const filled = records.filter(Boolean);
    if (!filled.length) throw new Error('Add a Pokémon to the Trainer Card first.');

    const canvas = document.createElement('canvas');
    canvas.width = 1200;
    canvas.height = 675;
    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = false;

    const bg = ctx.createLinearGradient(0, 0, 1200, 675);
    bg.addColorStop(0, '#101925');
    bg.addColorStop(.58, '#090e16');
    bg.addColorStop(1, '#07100c');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, 1200, 675);
    ctx.fillStyle = '#72f0a9';
    ctx.fillRect(0, 0, 14, 675);

    ctx.fillStyle = '#8290a3';
    ctx.font = '800 22px system-ui, sans-serif';
    ctx.fillText('JRPG.WORLD / EMERALD', 55, 62);
    ctx.fillStyle = '#ffffff';
    ctx.font = '900 48px system-ui, sans-serif';
    ctx.fillText((store.trainerName || 'EMERALD TRAINER').slice(0, 30), 55, 118);
    ctx.fillStyle = '#72f0a9';
    ctx.font = '800 18px system-ui, sans-serif';
    ctx.fillText('COMPETITIVE TRAINER CARD', 56, 150);

    const cols = 3;
    const cardW = 350;
    const cardH = 185;
    const gapX = 24;
    const gapY = 18;
    const startX = 55;
    const startY = 185;

    for (let i = 0; i < MAX_SLOTS; i++) {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const x = startX + col * (cardW + gapX);
      const y = startY + row * (cardH + gapY);
      const record = records[i];
      roundRect(ctx, x, y, cardW, cardH, 18, record ? 'rgba(255,255,255,.045)' : 'rgba(255,255,255,.022)', 'rgba(255,255,255,.10)');
      if (!record) {
        ctx.fillStyle = '#536071';
        ctx.font = '800 18px system-ui, sans-serif';
        ctx.fillText('EMPTY SLOT', x + 28, y + 96);
        continue;
      }
      const m = record.mon || {};
      if (m.dexNo) {
        try {
          const img = await loadImage(spriteUrl(m));
          ctx.drawImage(img, x + 18, y + 24, 92, 92);
        } catch (e) {}
      }
      ctx.fillStyle = '#eef3f9';
      ctx.font = '900 23px system-ui, sans-serif';
      ctx.fillText(`${m.shiny?.isShiny ? '✦ ' : ''}${m.species || 'Pokémon'} ${m.genderSymbol || ''}`.slice(0, 24), x + 124, y + 46);
      ctx.fillStyle = '#8c98a9';
      ctx.font = '700 15px system-ui, sans-serif';
      ctx.fillText(`${m.nature || ''} · ${m.ability || ''}`.slice(0, 32), x + 124, y + 72);
      ctx.fillStyle = '#c9d2df';
      ctx.font = '800 16px ui-monospace, Menlo, monospace';
      ctx.fillText(`IV ${ivSpread(m)}`, x + 124, y + 102);
      ctx.fillStyle = '#b7a9ff';
      ctx.font = '800 14px system-ui, sans-serif';
      ctx.fillText(`HP ${m.hiddenPower?.type || '?'} ${m.hiddenPower?.power ?? ''}${m.heldItem ? ` · ${m.heldItem}` : ''}`.slice(0, 34), x + 124, y + 128);
      ctx.fillStyle = '#72f0a9';
      ctx.font = '900 17px system-ui, sans-serif';
      ctx.fillText(`IV AVG ${Number(m.ivAverage || 0).toFixed(1)}`, x + 22, y + 158);
      ctx.fillStyle = '#758195';
      ctx.font = '800 12px system-ui, sans-serif';
      ctx.fillText(`${record.source || 'LIVE'} · ${m.signal || ''}${m.ribbons?.count ? ` · 🏅 ${m.ribbons.count}` : ''}`.slice(0, 34), x + 220, y + 158);
    }

    const avg = averageFor(records);
    const perfect = perfectCount(records);
    ctx.fillStyle = '#7f8c9f';
    ctx.font = '700 17px system-ui, sans-serif';
    ctx.fillText(`TEAM IV AVG ${avg.toFixed(1)}     31 IVs ${perfect}     ${filled.length}/6 ON CARD`, 55, 640);
    ctx.textAlign = 'right';
    ctx.fillStyle = '#667486';
    ctx.font = '700 14px system-ui, sans-serif';
    ctx.fillText('Generated from JRPG.WORLD Emerald live data', 1145, 640);
    ctx.textAlign = 'left';

    return await new Promise((resolve, reject) => canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error('PNG export failed')), 'image/png'));
  }

  async function shareCard() {
    try {
      const blob = await makeCardBlob();
      const safeName = (store.trainerName || 'emerald-trainer').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'emerald-trainer';
      const file = new File([blob], `${safeName}-trainer-card.png`, { type: 'image/png' });
      if (navigator.share && navigator.canShare?.({ files: [file] })) {
        try {
          await navigator.share({ title: `${store.trainerName} · Emerald Trainer Card`, files: [file] });
          showToast('Trainer Card ready to share.');
          return;
        } catch (e) {
          if (e?.name === 'AbortError') return;
        }
      }
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = file.name;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1500);
      showToast('Trainer Card PNG saved.');
    } catch (e) {
      showToast(e?.message || 'Could not export card.');
    }
  }

  function renderAll() {
    ensureHeaderButton();
    renderTrainerCard();
    wireBackEvents();
    syncLiveActions();
    measureStage();
  }

  function attach() {
    panel = document.getElementById('pokefield-live-panel');
    if (!panel) return false;
    ensureHeaderButton();
    if (!ensureStage()) return false;
    renderAll();

    if (!panelObserver) {
      panelObserver = new MutationObserver(() => {
        ensureHeaderButton();
        if (ensureStage()) {
          syncLiveActions();
          measureStage();
        }
      });
      panelObserver.observe(panel, { childList: true, subtree: false });
    }
    return true;
  }

  window.addEventListener('jrpg:emerald-state', e => {
    currentGameState = e.detail || globalThis.JRPGWorldEmeraldState || null;
    if (attach()) renderAll();
  });
  window.addEventListener('resize', measureStage, { passive: true });
  window.addEventListener('jrpg:emerald-display-mode', () => requestAnimationFrame(measureStage));
  if (MOBILE_CARD.addEventListener) MOBILE_CARD.addEventListener('change', measureStage);
  else MOBILE_CARD.addListener(measureStage);
  window.addEventListener('pageshow', () => { currentGameState = globalThis.JRPGWorldEmeraldState || currentGameState; attach(); }, { passive: true });

  const bootstrap = new MutationObserver(() => {
    if (attach()) bootstrap.disconnect();
  });
  bootstrap.observe(document.documentElement, { childList: true, subtree: true });
  attach();

  globalThis.JRPGWorldEmeraldTrainerCard = Object.freeze({
    getState: () => publicStore(),
    getCurrentGameState: () => JSON.parse(JSON.stringify(currentGameState || {})),
    getStreamPayloads: () => store.box.map(feedReadyPayload),
    saveCurrent: () => currentGameState?.primary ? saveMonToBox(currentGameState.primary) : null,
    flipToTrainer,
    flipToLive
  });
})();
