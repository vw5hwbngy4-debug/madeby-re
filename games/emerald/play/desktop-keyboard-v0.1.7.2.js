(() => {
  'use strict';

  // JRPG.WORLD Emerald desktop keyboard hotfix v0.1.7.2
  // Bypasses the fragile SDL/mGBA bindKey name path and drives the same
  // buttonPress/buttonUnpress bridge used by the proven direct system buttons.

  const DESKTOP = window.matchMedia('(min-width: 960px)');
  const held = new Map();
  const buttonHolds = new Map();

  const KEYMAP = new Map([
    ['ArrowUp', 'Up'],
    ['ArrowDown', 'Down'],
    ['ArrowLeft', 'Left'],
    ['ArrowRight', 'Right'],

    // GBA face buttons. Keep the classic emulator keys, but add literal aliases.
    ['KeyZ', 'A'],
    ['KeyA', 'A'],
    ['KeyX', 'B'],
    ['KeyB', 'B'],

    ['KeyQ', 'L'],
    ['KeyW', 'R'],

    // Start: Enter is canonical; C is a forgiving alias because it is a common
    // user guess and costs us nothing in this arrow-key control scheme.
    ['Enter', 'Start'],
    ['NumpadEnter', 'Start'],
    ['KeyC', 'Start'],

    // Select: Space is the primary desktop key. Shift remains accepted as a
    // legacy alias, but the UI no longer tells users to depend on OS Shift behavior.
    ['Space', 'Select'],
    ['ShiftLeft', 'Select'],
    ['ShiftRight', 'Select'],
  ]);

  function inputBridge() {
    const input = globalThis.__POKEFIELD_INPUT_MGBA__;
    if (!input || typeof input.buttonPress !== 'function' || typeof input.buttonUnpress !== 'function') return null;
    return input;
  }

  function editableTarget(target) {
    if (!(target instanceof Element)) return false;
    return !!target.closest('input, textarea, select, [contenteditable="true"], [role="textbox"]');
  }

  function swallow(ev) {
    if (ev.cancelable) ev.preventDefault();
    ev.stopPropagation();
  }

  function visual(button, pressed) {
    document.querySelectorAll(`[data-gba-btn="${button}"]`).forEach(el => {
      el.classList.toggle('pressed', pressed);
    });
  }

  function press(code, button, ev) {
    if (held.has(code)) {
      swallow(ev);
      return;
    }
    const input = inputBridge();
    if (!input) return;
    swallow(ev);
    held.set(code, button);
    const count = buttonHolds.get(button) || 0;
    buttonHolds.set(button, count + 1);
    try {
      if (count === 0) input.buttonPress(button);
      visual(button, true);
      document.documentElement.dataset.pfDesktopKeyLast = `${code}:${button}:down`;
    } catch (err) {
      held.delete(code);
      if (count === 0) buttonHolds.delete(button);
      else buttonHolds.set(button, count);
      console.error('[PokéField desktop keys] buttonPress failed', button, err);
    }
  }

  function release(code, button, ev) {
    const wasHeld = held.get(code);
    if (!wasHeld) return;
    const input = inputBridge();
    swallow(ev);
    held.delete(code);
    const resolved = wasHeld || button;
    const count = Math.max(0, (buttonHolds.get(resolved) || 1) - 1);
    if (count === 0) buttonHolds.delete(resolved);
    else buttonHolds.set(resolved, count);
    try {
      if (input && count === 0) input.buttonUnpress(resolved);
    } catch (err) {
      console.error('[PokéField desktop keys] buttonUnpress failed', resolved, err);
    }
    if (count === 0) visual(resolved, false);
    document.documentElement.dataset.pfDesktopKeyLast = `${code}:${resolved}:up`;
  }

  function onKeyDown(ev) {
    if (!DESKTOP.matches || editableTarget(ev.target)) return;
    const button = KEYMAP.get(ev.code);
    if (!button) return;
    press(ev.code, button, ev);
  }

  function onKeyUp(ev) {
    const button = KEYMAP.get(ev.code);
    if (!button) return;
    release(ev.code, button, ev);
  }

  function releaseAll() {
    const input = inputBridge();
    const buttons = new Set(held.values());
    for (const button of buttons) {
      try { if (input) input.buttonUnpress(button); } catch (_) {}
      visual(button, false);
    }
    for (const [code, button] of held) {
      document.documentElement.dataset.pfDesktopKeyLast = `${code}:${button}:forced-up`;
    }
    held.clear();
    buttonHolds.clear();
  }

  // Capture phase gets the event before React/bubbling UI handlers and prevents
  // browser actions such as Space scrolling. Direct bridge calls do the game input.
  window.addEventListener('keydown', onKeyDown, { capture: true });
  window.addEventListener('keyup', onKeyUp, { capture: true });
  window.addEventListener('blur', releaseAll);
  document.addEventListener('visibilitychange', () => { if (document.hidden) releaseAll(); });

  // Small diagnostic surface for QA without touching emulator internals.
  globalThis.__POKEFIELD_DESKTOP_KEYS__ = Object.freeze({
    version: '0.1.7.2',
    mapping: Object.freeze(Object.fromEntries(KEYMAP)),
    releaseAll,
  });
})();
