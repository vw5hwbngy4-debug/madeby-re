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
        <div class="pf-desktop-controls-title">KEYBOARD</div>
        <div class="pf-desktop-control"><kbd>ARROWS</kbd><span>MOVE</span></div>
        <div class="pf-desktop-control"><kbd>Z</kbd><span>A BUTTON</span></div>
        <div class="pf-desktop-control"><kbd>X</kbd><span>B BUTTON</span></div>
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

  function createDesktopInfo(panel) {
    let idle = document.getElementById('pf-desktop-idle');
    if (!idle) {
      idle = document.createElement('section');
      idle.id = 'pf-desktop-idle';
      idle.className = 'pf-desktop-idle pf-desktop-only';
      idle.innerHTML = `
        <div class="pf-desktop-idle-title">LIVE INTELLIGENCE READY</div>
        <div class="pf-desktop-idle-copy">Encounter a Pokémon and its hidden data will appear here automatically.</div>
        <div class="pf-desktop-idle-grid">
          <div class="pf-desktop-idle-item"><b>PLAY</b>Your Emerald ROM runs locally in this browser.</div>
          <div class="pf-desktop-idle-item"><b>LIVE</b>JRPG.WORLD reads the running game and reveals hidden Pokémon data.</div>
          <div class="pf-desktop-idle-item"><b>LOCAL</b>Your ROM and persistent game data remain in this browser.</div>
        </div>
        <div class="pf-desktop-resume">Load the same ROM later to continue your local playthrough.</div>`;

      const primary = panel.querySelector('#pf-primary');
      if (primary) primary.insertAdjacentElement('afterend', idle);
      else panel.appendChild(idle);
    }

    let about = document.getElementById('pf-desktop-about');
    if (!about) {
      about = document.createElement('details');
      about.id = 'pf-desktop-about';
      about.className = 'pf-drawer pf-desktop-only';
      about.innerHTML = `
        <summary><span>ABOUT</span><small>play + live intelligence</small></summary>
        <div class="pf-desktop-about-copy"><strong>Play Pokémon Emerald with live competitive intelligence.</strong> Bring your own ROM. It runs locally in your browser while JRPG.WORLD reveals hidden competitive data from the running game. The current bridge is read-only.</div>`;
      const tech = panel.querySelector('.pf-tech');
      if (tech) tech.insertAdjacentElement('afterend', about);
      else panel.appendChild(about);
    }

    return { idle, about };
  }

  function updateState(panel, idle) {
    const primary = panel.querySelector('#pf-primary');
    const party = panel.querySelector('#pf-party');
    const ownedDrawer = panel.querySelector('#pf-owned-drawer');
    const hasPrimary = !!primary?.querySelector('.pf-card');
    const hasParty = !!party?.querySelector('button[data-party]');

    if (idle) idle.hidden = hasPrimary;
    if (ownedDrawer) ownedDrawer.classList.toggle('pf-desktop-empty', !hasParty);
  }

  function sync() {
    scheduled = false;
    const panel = document.getElementById('pokefield-live-panel');
    if (!panel) return;

    const { idle } = createDesktopInfo(panel);
    createControls(panel);
    updateState(panel, idle);

    if (DESKTOP.matches) document.body.classList.add('pf-desktop-live');
    else document.body.classList.remove('pf-desktop-live');
  }

  function scheduleSync() {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(sync);
  }

  const observer = new MutationObserver(scheduleSync);
  observer.observe(document.documentElement, {
    childList: true,
    subtree: true
  });

  if (DESKTOP.addEventListener) DESKTOP.addEventListener('change', scheduleSync);
  else DESKTOP.addListener(scheduleSync);

  window.addEventListener('resize', scheduleSync, { passive: true });
  window.addEventListener('pageshow', scheduleSync, { passive: true });
  document.addEventListener('DOMContentLoaded', scheduleSync, { once: true });
  scheduleSync();
})();
