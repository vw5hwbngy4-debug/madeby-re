const CONFIG = window.HOENN_CONFIG || {
  version: '0.4.5',
  apiBase: 'https://emerald-api.madeby.re/api/hoenn-public',
  playUrl: '/emerald/play/',
  siteUrl: 'https://madeby.re/games/emerald'
};

const main = document.getElementById('main');
const metaDescription = document.querySelector('meta[name="description"]');
const canonical = document.querySelector('link[rel="canonical"]');
const wireState = document.getElementById('wire-state');
const MAP_MANIFEST_URL = '/emerald/assets/data/map-manifest.json';
const TRAINER_COUNT = 106;
let mapManifestPromise = null;

const esc = (value) => String(value ?? '')
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')
  .replaceAll("'", '&#039;');

function pathParts() {
  const parts = location.pathname.replace(/\/+$/, '').split('/').filter(Boolean);
  if (parts[0] === 'emerald') parts.shift();
  return parts;
}

function setMeta(title, description, path = location.pathname) {
  document.title = title;
  metaDescription?.setAttribute('content', description);
  canonical?.setAttribute('href', `${CONFIG.siteUrl}${path === '/' ? '/' : path}`);
}

function setCurrent(section) {
  document.querySelectorAll('[data-section]').forEach((link) => {
    if (link.dataset.section === section) link.setAttribute('aria-current', 'page');
    else link.removeAttribute('aria-current');
  });
}

function navigate(path) {
  history.pushState({}, '', path);
  renderRoute();
  window.scrollTo({ top: 0, behavior: 'instant' });
}

function bindNavigation(root = document) {
  root.querySelectorAll('[data-nav]').forEach((link) => {
    if (link.dataset.bound === '1') return;
    link.dataset.bound = '1';
    link.addEventListener('click', (event) => {
      if (link.target === '_blank' || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const url = new URL(link.href, location.origin);
      if (url.origin !== location.origin) return;
      event.preventDefault();
      navigate(url.pathname + url.search);
    });
  });
}

window.addEventListener('popstate', renderRoute);

function setWire(mode, text) {
  wireState?.classList.toggle('is-live', mode === 'live');
  wireState?.classList.toggle('is-error', mode === 'error');
  const span = wireState?.querySelector('span');
  if (span) span.textContent = text;
}

async function api(action, params = {}) {
  const url = new URL(CONFIG.apiBase);
  url.searchParams.set('action', action);
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') url.searchParams.set(key, value);
  });
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 10000);
  try {
    const response = await fetch(url, {
      method: 'GET',
      credentials: 'omit',
      headers: { Accept: 'application/json' },
      signal: controller.signal
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || data.ok === false) throw new Error(data.error || `HTTP ${response.status}`);
    return data;
  } catch (error) {
    if (error?.name === 'AbortError') throw new Error('The live Hoenn link timed out.');
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

async function mapManifest() {
  if (!mapManifestPromise) {
    mapManifestPromise = fetch(MAP_MANIFEST_URL, { credentials: 'same-origin' }).then(async (response) => {
      if (!response.ok) throw new Error('MAP_ASSETS_UNAVAILABLE');
      const manifest = await response.json();
      const byName = new Map();
      const bySlug = new Map();
      for (const item of manifest.maps || []) {
        byName.set(normalizePlace(item.name), item);
        bySlug.set(placeSlug(item.name), item);
      }
      return { manifest, byName, bySlug };
    });
  }
  return mapManifestPromise;
}

function normalizePlace(value) {
  return String(value || '')
    .toLowerCase()
    .replaceAll('é', 'e')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function placeSlug(value) {
  return normalizePlace(value).replaceAll(' ', '-');
}

async function findMap(place) {
  const { byName } = await mapManifest();
  const key = normalizePlace(place);
  if (byName.has(key)) return byName.get(key);
  for (const [name, item] of byName.entries()) {
    if (key && (name.includes(key) || key.includes(name))) return item;
  }
  return byName.get('route 120') || byName.get('littleroot town') || null;
}

async function findMapBySlug(slug) {
  const { bySlug } = await mapManifest();
  return bySlug.get(String(slug || '').toLowerCase()) || null;
}

function sceneTagForEvent(type = '') {
  const t = String(type).toLowerCase();
  if (t.includes('visit') || t.includes('battle') || t.includes('base_') || t.includes('received')) return 'base';
  if (t.includes('trainer_card') || t.includes('presence')) return 'presence';
  if (t.includes('tv') || t.includes('mirage') || t.includes('tower')) return 'story';
  return 'quiet';
}

function firstLocationPoint(locationObj) {
  const point = Array.isArray(locationObj?.entrances) ? locationObj.entrances[0] : null;
  if (!point) return null;
  const x = Number(point.x);
  const y = Number(point.y);
  return Number.isFinite(x) && Number.isFinite(y) ? { x, y } : null;
}

async function sceneAsset(placeOrLocation, shape = 'card', options = {}) {
  try {
    const locationObj = typeof placeOrLocation === 'string' ? { route: placeOrLocation } : (placeOrLocation || {});
    const place = locationObj.route || locationObj.name || locationObj.map_key || 'Route 120';
    const item = await findMap(place);
    if (!item) return { url: '/emerald/assets/maps/hero-16x9/311-route-120.webp', scene_id: null, map: null };
    const cropKey = shape === 'hero' ? 'hero-16x9' : shape === 'mobile' ? 'mobile-9x16' : 'card-4x3';
    const scenes = Array.isArray(item.scenes) ? item.scenes : [];
    let scene = null;
    const requestedSceneId = options.sceneId || locationObj.scene_id || null;
    const point = options.point || firstLocationPoint(locationObj);
    if (requestedSceneId && scenes.length) {
      scene = scenes.find((candidate) => candidate.id === requestedSceneId) || null;
    }
    if (!scene && scenes.length && point) {
      scene = [...scenes].sort((a, b) => {
        const aa = a.anchor_tile || {};
        const bb = b.anchor_tile || {};
        const ad = ((Number(aa.x) || 0) - point.x) ** 2 + ((Number(aa.y) || 0) - point.y) ** 2;
        const bd = ((Number(bb.x) || 0) - point.x) ** 2 + ((Number(bb.y) || 0) - point.y) ** 2;
        return ad - bd;
      })[0];
    } else if (scenes.length) {
      const tag = options.tag || sceneTagForEvent(options.eventType);
      const tagged = scenes.filter((candidate) => Array.isArray(candidate.tags) && candidate.tags.includes(tag));
      const pool = tagged.length ? tagged : scenes;
      scene = pool[hash(options.seed || `${place}:${options.eventType || tag}`) % pool.length];
    }
    const scenePath = scene?.assets?.[cropKey];
    if (scenePath) return { url: `/emerald/assets/maps/${scenePath}`, scene_id: scene.id, map: item, scene };
    const crop = item.crops?.[cropKey]?.path;
    if (crop) return { url: `/emerald/assets/maps/${crop}`, scene_id: 'canonical', map: item, scene: null };
    return { url: `/emerald/assets/maps/${item.full_webp}`, scene_id: 'full-map', map: item, scene: null };
  } catch {
    return { url: '/emerald/assets/maps/hero-16x9/311-route-120.webp', scene_id: null, map: null };
  }
}

async function mapAsset(placeOrLocation, shape = 'card', options = {}) {
  return (await sceneAsset(placeOrLocation, shape, options)).url;
}

function hash(value) {
  let h = 2166136261;
  for (const ch of String(value || 'trainer')) {
    h ^= ch.charCodeAt(0);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function trainerSprite(key) {
  const i = hash(key) % TRAINER_COUNT;
  return `/emerald/assets/trainers/trainer-${String(i).padStart(3, '0')}.png`;
}

function trainerSpriteForGender(gender, key = '') {
  const n = Number(gender);
  if (n === 0) return '/emerald/assets/trainers/trainer-096.png';
  if (n === 1) return '/emerald/assets/trainers/trainer-027.png';
  return trainerSprite(key);
}

function pokemonSprite(mon) {
  const dex = Math.max(1, Math.min(386, Number(mon?.dex_no || 0)));
  return `/emerald/assets/${mon?.shiny ? 'pokemon-shiny' : 'pokemon'}/${dex}.png`;
}

function relativeTime(value) {
  if (!value) return 'now';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'now';
  const seconds = Math.max(0, Math.floor((Date.now() - date.getTime()) / 1000));
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return date.toLocaleDateString();
}

function routeValue(locationObj) {
  return locationObj?.route || locationObj?.name || '';
}

function routeLookup(trainers = [], bases = []) {
  const result = new Map();
  for (const trainer of trainers) {
    if (trainer?.public_id && trainer.secret_base?.location) result.set(String(trainer.public_id), trainer.secret_base.location);
  }
  for (const base of bases) {
    if (base?.trainer?.public_id && base.location) result.set(String(base.trainer.public_id), base.location);
  }
  return result;
}

function eventLocation(event, lookup) {
  return event?.location
    || (event?.route ? { route: event.route } : null)
    || lookup.get(String(event?.subject?.public_id || ''))
    || lookup.get(String(event?.actor?.public_id || ''))
    || null;
}

function eventPlace(event, lookup) {
  return routeValue(eventLocation(event, lookup));
}

function eventOwnerId(event) {
  return event?.subject?.public_id || event?.actor?.public_id || '';
}

function eventIdentity(event) {
  return event?.actor?.public_id || event?.actor?.trainer_name || event?.subject?.public_id || event?.subject?.trainer_name || event?.text || event?.type;
}

function eventKind(type = '') {
  const t = String(type).toLowerCase();
  if (t.includes('mirage')) return ['MIRAGE', 'MIR'];
  if (t.includes('tower')) return ['BATTLE TOWER', 'BT'];
  if (t.includes('tv')) return ['HOENN TV', 'TV'];
  if (t.includes('gift')) return ['GIFT', 'GFT'];
  if (t.includes('trainer_card')) return ['TRAINER CARD', 'CARD'];
  if (t.includes('battle_won')) return ['BATTLE WON', 'WIN'];
  if (t.includes('battle_lost')) return ['BATTLE LOST', 'LOS'];
  if (t.includes('battle') || t.includes('challenged')) return ['BASE BATTLE', 'BAT'];
  if (t.includes('visited')) return ['BASE VISIT', 'VIS'];
  if (t.includes('published')) return ['BASE PUBLISHED', 'PUB'];
  if (t.includes('updated')) return ['BASE UPDATED', 'UP'];
  if (t.includes('received')) return ['RECORD MIXED', 'MIX'];
  return ['WORLD EVENT', 'LIVE'];
}

function activityStats(activity, lookup) {
  const routes = new Map();
  const people = new Set();
  let battles = 0;
  let visits = 0;
  let updates = 0;
  let cards = 0;
  for (const event of activity) {
    const place = eventPlace(event, lookup);
    if (place) routes.set(place, (routes.get(place) || 0) + 1);
    if (event.actor?.public_id) people.add(event.actor.public_id);
    if (event.subject?.public_id) people.add(event.subject.public_id);
    const t = String(event.type || '').toLowerCase();
    if (/battle|challeng/.test(t)) battles += 1;
    if (/visit/.test(t)) visits += 1;
    if (/publish|update|received/.test(t)) updates += 1;
    if (t.includes('trainer_card')) cards += 1;
  }
  const topRoute = [...routes.entries()].sort((a, b) => b[1] - a[1])[0] || ['', 0];
  return { events: activity.length, people: people.size, battles, visits, updates, cards, topRoute };
}

function buildEditorial(activity, lookup) {
  const stats = activityStats(activity, lookup);
  if (!stats.events) return {
    headline: 'The wire is quiet.',
    deck: 'No canonical public Emerald events are available right now. Emerald · MadeBy does not invent filler posts.',
    proof: ['0 fabricated events', 'canonical stream only'],
    stats
  };
  const [route, routeCount] = stats.topRoute;
  if (stats.cards >= 2) return {
    headline: 'Trainer Cards are moving through Hoenn.',
    deck: `${stats.cards} recent save-backed Trainer Card updates are on the wire. These teams were curated in Emerald, not assembled on the website.`,
    proof: [`${stats.cards} card updates`, `${stats.people} public trainers`, `${stats.events} source events`],
    stats
  };
  if (route && routeCount >= 2) return {
    headline: `${route} is the busiest place in the current wire.`,
    deck: `${routeCount} of the ${stats.events} recent canonical events in this window point there. The story is derived from game events, not written as a standalone post.`,
    proof: [`${routeCount} events · ${route}`, `${stats.people} public trainers`, `${stats.events} source events`],
    stats
  };
  if (stats.battles >= 2) return {
    headline: 'Battles are driving the current Hoenn wire.',
    deck: `${stats.battles} recent battle or challenge events are visible in the canonical stream.`,
    proof: [`${stats.battles} battle events`, `${stats.people} public trainers`, `${stats.events} source events`],
    stats
  };
  if (stats.visits >= 2) return {
    headline: 'Secret Base traffic is leading the current wire.',
    deck: `${stats.visits} recent Base visits are visible across the public world stream.`,
    proof: [`${stats.visits} visits`, `${stats.people} public trainers`, `${stats.events} source events`],
    stats
  };
  return {
    headline: `${stats.events} real world ${stats.events === 1 ? 'event is' : 'events are'} moving through Hoenn.`,
    deck: 'The feed is generated from public Emerald world-state changes. The game posts; the editorial layer finds what matters.',
    proof: [`${stats.events} source events`, `${stats.people} public trainers`, '0 synthetic posts'],
    stats
  };
}

function loadingState() {
  return `<div class="state-box"><b>READING HOENN...</b><p>Connecting to the canonical public event stream.</p></div>`;
}

function errorState(message) {
  return `<div class="state-box error"><b>WORLD LINK UNAVAILABLE</b><p>${esc(message || 'The live endpoint could not be reached.')}</p><p><button type="button" class="btn small" data-retry>RETRY</button></p></div>`;
}

function socialTrainerCard(card, { time = '', headline = '', compact = false } = {}) {
  if (!card) return '';
  const trainer = card.trainer || {};
  const mons = Array.isArray(card.pokemon) ? card.pokemon.slice(0, 6) : [];
  const sprite = trainerSpriteForGender(trainer.gender, trainer.public_id || trainer.trainer_name);
  const slots = Array.from({ length: 6 }, (_, i) => mons[i] || null).map((mon) => mon ? `
    <div class="social-mon${mon.shiny ? ' shiny' : ''}" title="${esc(mon.species)}${mon.level ? ` Lv${esc(mon.level)}` : ''}">
      <img src="${esc(pokemonSprite(mon))}" alt="${esc(mon.species)}">
      <span>${mon.shiny ? '✦ ' : ''}${esc(mon.species)}</span>
    </div>` : `<div class="social-mon empty"><span>EMPTY</span></div>`).join('');
  return `<article class="social-card${compact ? ' compact' : ''}">
    <div class="social-card-head">
      <div class="social-trainer"><img src="${esc(sprite)}" alt=""><div><small>HOENN TRAINER</small><b>${esc(trainer.trainer_name || 'TRAINER')}</b></div></div>
      <div class="social-verify"><b>OWNED IN EMERALD ✓</b>${card.revision ? `<span>REV ${Number(card.revision)}</span>` : ''}${time ? `<time>${esc(time)}</time>` : ''}</div>
    </div>
    ${headline ? `<div class="social-card-update">${esc(headline)}</div>` : ''}
    <div class="social-team">${slots}</div>
    <div class="social-card-foot"><span>${mons.length}/6 SHOWCASE</span><span>GAME-DERIVED · EMERALD · MADEBY.RE</span></div>
  </article>`;
}

async function eventCard(event, lookup) {
  const locationObj = eventLocation(event, lookup);
  const place = routeValue(locationObj);
  const seed = `${event.created_at || ''}:${event.type || ''}:${eventIdentity(event)}`;
  if (String(event?.type || '').toLowerCase() === 'trainer_card_updated' && event.card) {
    const ownerId = event?.actor?.public_id || event?.card?.trainer?.public_id || '';
    const content = socialTrainerCard(event.card, { time: relativeTime(event.created_at), headline: event.text || 'Trainer Card updated.' });
    const scene = await sceneAsset(locationObj || place || 'Route 120', 'card', { eventType: event.type, seed });
    const inner = `${place ? `<div class="card-location-scene" style="background-image:url('${esc(scene.url)}')"><span>UPDATED FROM ${esc(place)}</span></div>` : ''}${content}`;
    return ownerId ? `<a class="social-card-link" href="/trainer/${encodeURIComponent(ownerId)}" data-nav>${inner}</a>` : `<div class="social-card-link">${inner}</div>`;
  }
  const scene = await sceneAsset(locationObj || place || 'Route 120', 'card', { eventType: event.type, seed });
  const [kind, glyph] = eventKind(event.type);
  const ownerId = eventOwnerId(event);
  const sprite = trainerSprite(eventIdentity(event));
  const trainerMedia = ownerId
    ? `<a class="event-trainer-link" href="/trainer/${encodeURIComponent(ownerId)}" data-nav aria-label="Open trainer"><img class="trainer-sprite" src="${esc(sprite)}" alt="" aria-hidden="true"></a>`
    : `<img class="trainer-sprite" src="${esc(sprite)}" alt="" aria-hidden="true">`;
  return `<article class="event-card" data-scene="${esc(scene.scene_id || '')}">
    <div class="event-bg" style="background-image:url('${esc(scene.url)}')"></div>
    <div class="event-content">
      <div class="event-top"><span class="event-kind"><span class="glyph">${esc(glyph)}</span>${esc(kind)}</span><time class="event-time" datetime="${esc(event.created_at || '')}">${esc(relativeTime(event.created_at))}</time></div>
      <div class="event-bottom">
        ${trainerMedia}
        <div class="event-copy"><h3>${esc(event.text || String(event.type || 'World event').replaceAll('_', ' '))}</h3><div class="event-meta">${place ? `<a class="event-place" href="/place/${encodeURIComponent(placeSlug(place))}" data-nav>${esc(place)}</a>` : ''}<span>CANONICAL GAME EVENT</span></div></div>
      </div>
    </div>
  </article>`;
}

function channels() {
  return `<section aria-label="World channels">
    <div class="section-head"><div><h2>WORLD CHANNELS</h2><p>One event stream, different kinds of meaning.</p></div></div>
    <div class="channels">
      <article class="channel card"><strong>TRAINER CARDS</strong><p>Your current six-Pokémon showcase, curated in Emerald and verified against the active save.</p><span>LIVE NOW</span></article>
      <article class="channel base"><strong>SECRET BASES</strong><p>Visits, battles, publishes and native Record Mixing activity.</p><span>LIVE NOW</span></article>
      <article class="channel tower"><strong>BATTLE TOWER</strong><p>Real teams, ghost opponents, streaks and competitive world records.</p><span>NEXT CHANNEL</span></article>
      <article class="channel tv"><strong>HOENN TV</strong><p>Real Emerald TV records carried between trainers through the network.</p><span>NATIVE BROADCAST</span></article>
      <article class="channel mirage"><strong>MIRAGE</strong><p>Rare hidden game-state becomes a shared regional phenomenon.</p><span>WORLD PHENOMENON</span></article>
    </div>
  </section>`;
}

function liveShell(mode = 'all') {
  return `<div class="live-page">
    <section class="live-hero" id="live-hero">
      <div class="live-hero-media" id="hero-media" style="background-image:url('/emerald/assets/maps/hero-16x9/311-route-120.webp')"></div>
      <div class="live-hero-inner">
        <div class="kicker"><i></i> AI-NATIVE GAME-WORLD SOCIAL NETWORK</div>
        <div class="hero-copy">
          <h1>LIVE FROM HOENN.</h1>
          <p>The game posts. Emerald · MadeBy turns real Emerald events into a living social wire: Trainer Cards, Secret Bases, battles, rare discoveries and everything the world already knows.</p>
          <div class="hero-statusline" id="hero-stats"><span class="hero-chip"><b>...</b> reading the world</span></div>
          <div class="hero-actions"><a class="btn primary" href="/emerald/play/">▶ PLAY EMERALD</a><button class="btn ghost" type="button" data-to-feed>SEE THE WIRE ↓</button></div>
        </div>
      </div>
    </section>

    <section class="desk" id="news-desk">
      <div class="desk-main"><div class="desk-label">NEWS DESK <span>CANONICAL EVENTS ONLY</span></div><h2 id="desk-headline">Reading the live wire...</h2><p id="desk-deck">No editorial claim appears until the real public event stream has been read.</p><div class="desk-proof" id="desk-proof"><span class="proof">NO FABRICATED WORLD EVENTS</span></div></div>
      <aside class="desk-side" id="desk-stats"><div class="statrow"><span>EVENTS</span><b>...</b></div><div class="statrow"><span>TRAINERS</span><b>...</b></div><div class="statrow"><span>BUSIEST PLACE</span><b class="route">...</b></div></aside>
    </section>

    <div id="world-now-slot"></div>
    <section id="wire">
      <div class="section-head"><div><h2>${mode === 'cards' ? 'TRAINER CARD WIRE' : mode === 'world' ? 'WORLD EVENTS' : mode === 'tv' ? 'HOENN TV' : 'THE LIVE WIRE'}</h2><p>${mode === 'cards' ? 'Real trainers updating the six Pokémon they want Hoenn to see.' : mode === 'tv' ? 'Native Emerald broadcasts generated by real game activity.' : 'Game events, not user-authored status posts.'}</p></div><span class="count" id="wire-count">CONNECTING</span></div>
      <nav class="wire-filters" aria-label="Live feed filter"><a href="/emerald/" data-nav ${mode === 'all' ? 'aria-current="page"' : ''}>ALL</a><a href="/cards" data-nav ${mode === 'cards' ? 'aria-current="page"' : ''}>TRAINER CARDS</a><a href="/world" data-nav ${mode === 'world' ? 'aria-current="page"' : ''}>WORLD EVENTS</a><a href="/tv" data-nav ${mode === 'tv' ? 'aria-current="page"' : ''}>TV</a></nav>
      <div class="feed" id="feed">${loadingState()}</div>
    </section>
    ${channels()}
  </div>`;
}

async function presenceCard(trainer) {
  const loc = trainer?.location || {};
  const place = loc.route || 'Hoenn';
  const hasMappedScene = Boolean(loc.map_key);
  const href = hasMappedScene
    ? `/place/${encodeURIComponent(placeSlug(place))}`
    : `/trainer/${encodeURIComponent(trainer.public_id || '')}`;
  let background = `<div class="presence-world-bg presence-world-bg--unknown" aria-hidden="true"></div>`;
  if (hasMappedScene) {
    const scene = await sceneAsset(loc, 'card', {
      eventType: 'presence', sceneId: loc.scene_id, seed: trainer.public_id || trainer.trainer_name
    });
    background = `<div class="presence-world-bg" style="background-image:url('${esc(scene.url)}')"></div>`;
  }
  return `<a class="presence-world-card${hasMappedScene ? '' : ' is-location-unsupported'}" href="${href}" data-nav>
    ${background}
    <div class="presence-world-copy"><span>● LIVE NOW</span><b>${esc(trainer.trainer_name || 'TRAINER')}</b><small>${esc(place)}</small></div>
  </a>`;
}

async function presenceStrip(presence) {
  const trainers = (presence?.trainers || []).filter((t) => t.status === 'online');
  const count = Number(presence?.counts?.online_now || 0);
  if (!count) return `<section class="world-now is-quiet"><div class="section-head"><div><h2>HOENN RIGHT NOW</h2><p>No public trainer is currently broadcasting a live place.</p></div><span class="count">0 ONLINE</span></div></section>`;
  const cards = trainers.length ? (await Promise.all(trainers.slice(0,8).map(presenceCard))).join('') : `<div class="presence-anonymous"><b>${count} TRAINER${count===1?'':'S'} ONLINE</b><p>They are playing, but have not published a public Trainer Card or Secret Base.</p></div>`;
  return `<section class="world-now"><div class="section-head"><div><h2>HOENN RIGHT NOW</h2><p>Live Emerald presence. Exact tile coordinates stay private.</p></div><span class="count">${count} ONLINE</span></div><div class="presence-world-grid">${cards}</div></section>`;
}

async function renderLive(mode = 'all') {
  setCurrent('live');
  setMeta(mode === 'cards' ? 'Trainer Cards · EMERALD · MADEBY.RE' : mode === 'tv' ? 'Hoenn TV · EMERALD · MADEBY.RE' : 'EMERALD · MADEBY.RE · Live from Hoenn', mode === 'cards' ? 'A live feed of save-backed Emerald Trainer Cards.' : mode === 'tv' ? 'Native Pokémon Emerald TV broadcasts carried by Emerald · MadeBy.' : 'The live social feed of events happening inside Pokémon Emerald. The game posts. The network finds the story.', mode === 'cards' ? '/cards' : mode === 'world' ? '/world' : mode === 'tv' ? '/tv' : '/');
  main.innerHTML = liveShell(mode);
  bindNavigation(main);
  document.querySelector('[data-to-feed]')?.addEventListener('click', () => document.getElementById('wire')?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
  setWire('loading', 'CONNECTING');
  try {
    const [world,tvWire] = await Promise.all([api('world', { limit: 40 }), mode === 'tv' ? api('tv', { limit: 40 }) : Promise.resolve(null)]);
    const allActivity = mode === 'tv' ? (Array.isArray(tvWire?.tv) ? tvWire.tv : []) : (Array.isArray(world.activity) ? world.activity : []);
    const activity = mode === 'cards' ? allActivity.filter((event) => String(event?.type || '') === 'trainer_card_updated') : mode === 'world' ? allActivity.filter((event) => String(event?.type || '') !== 'trainer_card_updated') : mode === 'tv' ? allActivity.filter((event) => event?.tv?.native) : allActivity;
    const lookup = routeLookup(world.trainers || [], world.bases || []);
    const editorial = buildEditorial(activity, lookup);
    setWire('live', 'LIVE');

    const presence = world.presence || null;
    const liveTrainer = (presence?.trainers || []).find((trainer) => trainer.status === 'online' && trainer.location?.map_key);
    const firstLocation = liveTrainer?.location || (activity.length ? eventLocation(activity[0], lookup) : { route: 'Route 120' });
    const firstPlace = routeValue(firstLocation) || 'Route 120';
    const heroScene = await sceneAsset(firstLocation, 'hero', { eventType: liveTrainer ? 'presence' : activity[0]?.type, sceneId: liveTrainer?.location?.scene_id, seed: liveTrainer?.public_id || activity[0]?.created_at || firstPlace });
    const heroMedia = document.getElementById('hero-media');
    if (heroMedia) {
      heroMedia.style.backgroundImage = `url('${heroScene.url}')`;
      heroMedia.dataset.scene = heroScene.scene_id || '';
    }

    const counts = world.counts || {};
    const publishedTrainers = Number(counts.published_trainers ?? world.trainers?.length ?? 0);
    const publishedBases = Number(counts.published_bases ?? world.bases?.length ?? 0);
    const eventCount = Number(counts.public_events_24h ?? activity.length ?? 0);
    const heroStats = document.getElementById('hero-stats');
    const publishedCards = Number(counts.published_cards ?? world.cards?.length ?? 0);
    const onlineNow = Number(presence?.counts?.online_now || 0);
    if (heroStats) heroStats.innerHTML = `<span class="hero-chip live-chip"><b>${onlineNow}</b> online now</span><span class="hero-chip"><b>${eventCount}</b> public events</span><span class="hero-chip"><b>${publishedTrainers}</b> trainers</span><span class="hero-chip"><b>${publishedCards}</b> Trainer Cards</span><span class="hero-chip"><b>${publishedBases}</b> Secret Bases</span>${firstPlace ? `<a class="hero-chip place-chip" href="/place/${encodeURIComponent(placeSlug(firstPlace))}" data-nav><b>${esc(firstPlace)}</b> ${liveTrainer?'live now':'latest place'}</a>` : ''}`;
    const nowSlot=document.getElementById('world-now-slot');if(nowSlot){nowSlot.innerHTML=await presenceStrip(presence);bindNavigation(nowSlot)}

    document.getElementById('desk-headline').textContent = editorial.headline;
    document.getElementById('desk-deck').textContent = editorial.deck;
    document.getElementById('desk-proof').innerHTML = editorial.proof.map((item) => `<span class="proof">${esc(item)}</span>`).join('');
    const [topRoute, topRouteCount] = editorial.stats.topRoute;
    document.getElementById('desk-stats').innerHTML = `<div class="statrow"><span>EVENTS IN WINDOW</span><b>${editorial.stats.events}</b></div><div class="statrow"><span>PUBLIC TRAINERS</span><b>${editorial.stats.people}</b></div><div class="statrow"><span>BUSIEST PLACE</span><b class="route">${topRoute ? `<a href="/place/${encodeURIComponent(placeSlug(topRoute))}" data-nav>${esc(topRoute)} · ${topRouteCount}</a>` : 'QUIET'}</b></div>`;

    const feed = document.getElementById('feed');
    const wireCount = document.getElementById('wire-count');
    if (wireCount) wireCount.textContent = `${activity.length} RECENT EVENTS`;
    if (!activity.length) {
      feed.innerHTML = `<div class="feed-empty"><b>QUIET IN HOENN.</b><p>No public game events are available in the current canonical window. Nothing synthetic is inserted to make the feed look busy.</p></div>`;
    } else {
      feed.innerHTML = (await Promise.all(activity.map((event) => eventCard(event, lookup)))).join('');
      bindNavigation(feed);
    }
  } catch (error) {
    setWire('error', 'OFFLINE');
    const feed = document.getElementById('feed');
    if (feed) feed.innerHTML = errorState(error.message);
    document.getElementById('wire-count').textContent = 'LINK UNAVAILABLE';
    document.getElementById('desk-headline').textContent = 'The live link is unavailable.';
    document.getElementById('desk-deck').textContent = 'The site will not replace missing game data with fabricated activity.';
    document.getElementById('desk-proof').innerHTML = `<span class="proof">FAIL CLOSED</span><span class="proof">NO FAKE FEED</span>`;
    bindRetry();
  }
}

function renderPlay() {
  // v0.4.4: /play/ is a real directory containing Emerald Live.
  // Hard-navigate so the emulator owns its document and relative assets.
  location.replace('/play/');
}

function renderYou() {
  setCurrent('you');
  setMeta('You in Hoenn · EMERALD · MADEBY.RE', 'Your Emerald save is your identity in Emerald · MadeBy.', '/you');
  setWire('live', 'SAVE = IDENTITY');
  main.innerHTML = `<div class="you-grid">
    <section class="trainer-pass">
      <img class="sprite-big" src="${trainerSprite('YOU-HOENN')}" alt="Emerald trainer sprite illustration">
      <h1>YOUR SAVE IS YOU.</h1>
      <p>Emerald · MadeBy does not ask you to manufacture a second social profile. Your Trainer Card, six-Pokémon showcase, Secret Base and world history come from Emerald.</p>
      <span class="badge">SAVE-BACKED IDENTITY</span>
      <div class="hero-actions"><a class="btn primary" href="/emerald/play/">▶ OPEN YOUR EMERALD</a></div>
    </section>
    <section class="you-story">
      <div class="desk-label">YOUR SOCIAL GRAMMAR <span>EMERALD NATIVE</span></div>
      <h2>No profile-building homework.</h2>
      <p>Playing creates the profile. A Secret Base becomes your place. Battle records become competitive presence. TV can become public broadcast. Mail stays private. Gifts return something to the game. Rare state like Mirage Island can become news.</p>
      <div class="you-points">
        <div class="you-point"><b>TRAINER CARD</b><span>Choose owned Pokémon in Emerald, then update your Hoenn profile.</span></div>
        <div class="you-point"><b>SECRET BASE</b><span>Your spatial social profile inside Hoenn.</span></div>
        <div class="you-point"><b>MAIL</b><span>Private communication, never feed fodder.</span></div>
        <div class="you-point"><b>GIFTS</b><span>Native-feeling rewards delivered back to play.</span></div>
      </div>
    </section>
  </div>`;
}

async function renderTrainer(publicId) {
  setCurrent('live');
  setMeta('Trainer · EMERALD · MADEBY.RE', 'A public trainer presence grounded in Pokémon Emerald world state.', location.pathname);
  setWire('loading', 'FINDING TRAINER');
  main.innerHTML = loadingState();
  try {
    const data = await api('trainer', { id: publicId, limit: 60 });
    const trainer = data.trainer;
    if (!trainer) throw new Error('TRAINER_NOT_FOUND');
    const place = routeValue(trainer.secret_base?.location) || 'Hoenn';
    const trainerLocation = trainer.secret_base?.location || { route: 'Littleroot Town' };
    const bgScene = await sceneAsset(place === 'Hoenn' ? { route: 'Littleroot Town' } : trainerLocation, 'hero', { eventType: 'presence', seed: trainer.public_id || trainer.trainer_name });
    const bg = bgScene.url;
    const sprite = trainerSpriteForGender(trainer.gender, trainer.public_id || trainer.trainer_name);
    const stats = trainer.activity_summary || {};
    const history = Array.isArray(trainer.activity) ? trainer.activity : [];
    setWire('live', 'LIVE TRAINER');
    setMeta(`${trainer.trainer_name} · EMERALD · MADEBY.RE`, `${trainer.trainer_name} is a public trainer in the live Hoenn world.`, location.pathname);
    main.innerHTML = `<div class="profile-page">
      <section class="profile-hero"><div class="profile-bg" style="background-image:url('${esc(bg)}')"></div><div class="profile-content"><div class="profile-card"><img src="${esc(sprite)}" alt=""><div><div class="kicker"><i></i> RESIDENT OF HOENN</div><h1>${esc(trainer.trainer_name)}</h1><p>${trainer.secret_base ? `<a class="profile-place-link" href="/place/${encodeURIComponent(placeSlug(place))}" data-nav>${esc(place)} · Native Secret Base ↗</a>` : 'Hoenn Trainer'}</p><div class="meta"><span>${Number(stats.visits || 0)} VISITS</span><span>${Number(stats.challenges || 0)} CHALLENGES</span>${trainer.secret_base?.updated_at ? `<span>BASE ${esc(relativeTime(trainer.secret_base.updated_at))}</span>` : ''}${trainer.trainer_card?.updated_at ? `<span>CARD ${esc(relativeTime(trainer.trainer_card.updated_at))}</span>` : ''}</div></div></div></div></section>
      ${trainer.trainer_card ? `<section class="profile-social-card"><div class="section-head"><div><h2>CURRENT TRAINER CARD</h2><p>Updated from this trainer's active Emerald showcase.</p></div><span class="count">SAVE-BACKED</span></div>${socialTrainerCard(trainer.trainer_card)}</section>` : ''}
      <section class="profile-history"><div class="section-head"><div><h2>WORLD HISTORY</h2><p>Canonical public events involving this trainer.</p></div><span class="count">${history.length} EVENTS</span></div>${history.length ? history.map((event) => `<article class="history-row"><i class="history-dot"></i><p>${esc(event.text || event.type)}</p><time datetime="${esc(event.created_at || '')}">${esc(relativeTime(event.created_at))}</time></article>`).join('') : `<div class="feed-empty"><b>NO PUBLIC HISTORY YET.</b><p>Only real public events will appear here.</p></div>`}</section>
    </div>`;
  } catch (error) {
    setWire('error', 'NOT FOUND');
    main.innerHTML = errorState(error.message);
    bindRetry();
  }
}

async function renderPlace(slug) {
  setCurrent('live');
  setWire('loading', 'READING PLACE');
  main.innerHTML = loadingState();
  try {
    const map = await findMapBySlug(slug);
    if (!map) throw new Error('PLACE_NOT_FOUND');
    const place = map.name;
    const data = await api('place', { name: place, limit: 100 });
    const bases = Array.isArray(data.bases) ? data.bases : [];
    const activity = Array.isArray(data.activity) ? data.activity : [];
    const liveHere = Array.isArray(data.presence) ? data.presence : [];
    const trainers = Array.isArray(data.trainers) ? data.trainers : [];
    const lookup = routeLookup(trainers, bases);
    const focusLocation = bases[0]?.location || activity[0]?.location || { route: place };
    const hero = await sceneAsset(focusLocation, 'hero', { eventType: activity[0]?.type || 'presence', seed: place });
    const scenes = Array.isArray(map.scenes) ? map.scenes : [];
    setWire('live', 'PLACE ONLINE');
    setMeta(`${place} · EMERALD · MADEBY.RE`, `Live social activity, Secret Bases and world scenes from ${place} in Pokémon Emerald.`, `/place/${placeSlug(place)}`);
    const baseCards = bases.length ? bases.map((base) => {
      const trainer = base.trainer || {};
      const point = firstLocationPoint(base.location);
      return `<a class="place-base-card" href="/trainer/${encodeURIComponent(trainer.public_id || '')}" data-nav><img src="${esc(trainerSpriteForGender(trainer.gender, trainer.public_id || trainer.trainer_name))}" alt=""><div><small>SECRET BASE${point ? ` · ${point.x},${point.y}` : ''}</small><b>${esc(trainer.trainer_name || 'TRAINER')}</b><span>${esc(relativeTime(base.updated_at))}</span></div></a>`;
    }).join('') : `<div class="feed-empty"><b>NO PUBLIC BASES HERE YET.</b><p>The place still exists. Emerald · MadeBy does not invent residents.</p></div>`;
    const sceneCards = scenes.length ? scenes.map((scene) => `<div class="place-scene-card" style="background-image:url('/emerald/assets/maps/${esc(scene.assets?.['card-4x3'] || map.full_webp)}')"><span>${esc(scene.label || place)}</span></div>`).join('') : `<div class="place-scene-card full" style="background-image:url('/emerald/assets/maps/${esc(map.crops?.['card-4x3']?.path || map.full_webp)}')"><span>${esc(place)}</span></div>`;
    const liveCards = liveHere.length ? (await Promise.all(liveHere.map(presenceCard))).join('') : `<div class="feed-empty"><b>QUIET RIGHT NOW.</b><p>No public trainer is currently broadcasting live presence from ${esc(place)}.</p></div>`;
    main.innerHTML = `<div class="place-page">
      <section class="place-hero"><div class="place-hero-bg" style="background-image:url('${esc(hero.url)}')"></div><div class="place-hero-content"><div class="kicker"><i></i> REAL HOENN LOCATION</div><div><h1>${esc(place)}</h1><p>Social activity anchored to the actual Hoenn world, not an abstract feed.</p><div class="place-stats"><span><b>${bases.length}</b> public bases</span><span><b>${activity.length}</b> recent events</span><span><b>${scenes.length || 1}</b> location scenes</span></div></div></div></section>
      <section><div class="section-head"><div><h2>AROUND ${esc(place.toUpperCase())}</h2><p>Scene variants derived from the reconstructed Hoenn map. Secret Base XY chooses the nearest view when available.</p></div><span class="count">LOCATION SCENES</span></div><div class="place-scenes">${sceneCards}</div></section>
      <section><div class="section-head"><div><h2>HERE RIGHT NOW</h2><p>Live public Emerald presence. Exact tile coordinates are never shown.</p></div><span class="count">${liveHere.length} ONLINE</span></div><div class="presence-world-grid">${liveCards}</div></section>
      <section><div class="section-head"><div><h2>TRAINERS HERE</h2><p>Public Secret Bases physically located in ${esc(place)}.</p></div><span class="count">${bases.length} BASES</span></div><div class="place-bases">${baseCards}</div></section>
      <section><div class="section-head"><div><h2>RECENT EVENTS</h2><p>Canonical game-world activity tied to this place.</p></div><span class="count">${activity.length} EVENTS</span></div><div class="feed">${activity.length ? (await Promise.all(activity.map((event) => eventCard(event, lookup)))).join('') : `<div class="feed-empty"><b>QUIET HERE.</b><p>No public canonical events are currently tied to ${esc(place)}.</p></div>`}</div></section>
    </div>`;
  } catch (error) {
    setWire('error', 'PLACE OFFLINE');
    main.innerHTML = errorState(error.message);
    bindRetry();
  }
}

function renderNotFound() {
  setCurrent('live');
  setMeta('Off the map · EMERALD · MADEBY.RE', 'This route is not part of Emerald · MadeBy.', location.pathname);
  main.innerHTML = `<div class="state-box"><b>OFF THE MAP.</b><p>This path is not part of the current Emerald · MadeBy world.</p><p><a class="btn small" href="/emerald/" data-nav>BACK TO LIVE</a></p></div>`;
  bindNavigation(main);
}

function bindRetry() {
  document.querySelectorAll('[data-retry]').forEach((button) => button.addEventListener('click', renderRoute));
}

async function renderRoute() {
  const parts = pathParts();
  if (!parts.length || parts[0] === 'live') await renderLive('all');
  else if (parts[0] === 'cards') await renderLive('cards');
  else if (parts[0] === 'world') await renderLive('world');
  else if (parts[0] === 'tv') await renderLive('tv');
  else if (parts[0] === 'play') renderPlay();
  else if (parts[0] === 'you') renderYou();
  else if (parts[0] === 'trainer' && parts[1]) await renderTrainer(decodeURIComponent(parts[1]));
  else if (parts[0] === 'place' && parts[1]) await renderPlace(decodeURIComponent(parts[1]));
  else renderNotFound();
  bindNavigation(document);
}

bindNavigation(document);
renderRoute();
