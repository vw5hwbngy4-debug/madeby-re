(() => {
  'use strict';

  const DESKTOP = window.matchMedia('(min-width: 960px)');
  let scheduled = false;

  function createControls(panel) {
    let controls = document.getElementById('pf-desktop-controls');
    if (!controls) {
      controls = document.createElement('div');
      controls.id = 'pf-desktop-controls';
      controls.className = 'pf-desktop-controls pf-desktop-only';
      controls.setAttribute('aria-label', 'Desktop keyboard controls');
      controls.innerHTML = `
        <div class="pf-desktop-controls-title">KEYS</div>
        <div class="pf-desktop-control"><kbd>ARROWS</kbd><span>MOVE</span></div>
        <div class="pf-desktop-control"><kbd>Z</kbd><span>A</span></div>
        <div class="pf-desktop-control"><kbd>X</kbd><span>B</span></div>
        <div class="pf-desktop-control"><kbd>Q</kbd><span>L</span></div>
        <div class="pf-desktop-control"><kbd>W</kbd><span>R</span></div>
        <div class="pf-desktop-control"><kbd>ENTER</kbd><span>START</span></div>
        <div class="pf-desktop-control"><kbd>SHIFT</kbd><span>SELECT</span></div>`;
    }
    if (panel?.parentNode && controls.previousElementSibling !== panel) {
      panel.insertAdjacentElement('afterend', controls);
    }
    return controls;
  }

  function createIdle(panel) {
    let idle = document.getElementById('pf-desktop-idle');
    if (!idle) {
      idle = document.createElement('div');
      idle.id = 'pf-desktop-idle';
      idle.className = 'pf-desktop-idle pf-desktop-only';
      idle.innerHTML = '<strong>LIVE READY</strong> · Encounter or select a Pokémon.';
      const primary = panel.querySelector('#pf-primary');
      if (primary) primary.insertAdjacentElement('afterend', idle);
      else panel.appendChild(idle);
    }
    return idle;
  }

  function removeOldDesktopCopy() {
    document.getElementById('pf-desktop-about')?.remove();
  }

  function updateState(panel, idle) {
    const primary = panel.querySelector('#pf-primary');
    const party = panel.querySelector('#pf-party');
    const ownedDrawer = panel.querySelector('#pf-owned-drawer');
    const hasPrimary = !!primary?.querySelector('.pf-card');
    const hasParty = !!party?.querySelector('button[data-party]');

    if (idle) idle.hidden = hasPrimary;
    if (ownedDrawer) ownedDrawer.classList.toggle('pf-desktop-empty', !hasParty);
    panel.classList.toggle('pf-desktop-has-specimen', hasPrimary);
  }

  function sync() {
    scheduled = false;
    const panel = document.getElementById('pokefield-live-panel');
    if (!panel) return;

    removeOldDesktopCopy();
    const idle = createIdle(panel);
    createControls(panel);
    updateState(panel, idle);

    document.body.classList.toggle('pf-desktop-live', DESKTOP.matches);
  }

  function scheduleSync() {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(sync);
  }

  const observer = new MutationObserver(scheduleSync);
  observer.observe(document.documentElement, { childList: true, subtree: true });

  if (DESKTOP.addEventListener) DESKTOP.addEventListener('change', scheduleSync);
  else DESKTOP.addListener(scheduleSync);

  window.addEventListener('resize', scheduleSync, { passive: true });
  window.addEventListener('pageshow', scheduleSync, { passive: true });
  document.addEventListener('DOMContentLoaded', scheduleSync, { once: true });
  scheduleSync();
})();
