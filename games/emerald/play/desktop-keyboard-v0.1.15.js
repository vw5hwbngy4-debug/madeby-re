(() => {
  'use strict';

  // JRPG.WORLD Emerald desktop keyboard layout v0.1.15
  // Spatial face-button layout on a QWERTY keyboard:
  //   Z = Select, X = B, C = A
  // This mirrors the GBA face-button order better than the old Z=A / X=B map.

  const DESKTOP = window.matchMedia('(min-width: 960px)');
  const held = new Map();
  const buttonHolds = new Map();

  const KEYMAP = new Map([
    ['ArrowUp', 'Up'],
    ['ArrowDown', 'Down'],
    ['ArrowLeft', 'Left'],
    ['ArrowRight', 'Right'],

    // Face buttons: B is left, A is right, matching X / C spatially.
    ['KeyX', 'B'],
    ['KeyC', 'A'],

    // Shoulder buttons.
    ['KeyQ', 'L'],
    ['KeyW', 'R'],

    // System buttons.
    ['KeyZ', 'Select'],
    ['Enter', 'Start'],
    ['NumpadEnter', 'Start'],
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

  window.addEventListener('keydown', onKeyDown, { capture: true });
  window.addEventListener('keyup', onKeyUp, { capture: true });
  window.addEventListener('blur', releaseAll);
  document.addEventListener('visibilitychange', () => { if (document.hidden) releaseAll(); });

  globalThis.__POKEFIELD_DESKTOP_KEYS__ = Object.freeze({
    version: '0.1.15',
    mapping: Object.freeze(Object.fromEntries(KEYMAP)),
    releaseAll,
  });
})();
