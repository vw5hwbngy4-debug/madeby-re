# EMERALD · MADEBY.RE v0.3 — AI-NATIVE LIVE WORLD

Deployment-ready static frontend archived for `games.madeby.re/emerald/`.

## Product definition

**Emerald · MadeBy is the live social feed of events happening inside Pokémon Emerald.**

The game generates the facts. The social layer turns those facts into a readable world wire. The public website does not require users to author status posts.

Primary navigation:

- **LIVE** — canonical public world events. Default route.
- **PLAY** — doorway to the existing production Emerald browser client.
- **YOU** — explains the save-backed identity model. No second profile system.

## v0.3 visual change

This build uses reconstructed RPG Maker XP `.rxdata` Hoenn maps as real location art. Feed events attempt to resolve their route/place to a matching reconstructed map. The bundle contains:

- 53 reconstructed full maps;
- web crops for selected Hoenn locations;
- 106 supplied trainer sprites;
- the supplied Pokémon Emerald display font.

The same public trainer ID deterministically resolves to the same trainer sprite in the frontend. This is presentation only and does not modify backend identity.

## Data policy

Production does **not** ship demo world events.

Public data comes from the existing safe endpoint:

`https://emerald-api.madeby.re/api/hoenn-public`

The frontend currently requests:

- `action=world`
- `action=trainer&id=...`

If the endpoint is empty, the feed is honestly empty. If the endpoint is unavailable, the site fails closed and says the world link is unavailable. It does not fabricate a busy feed.

## Editorial / AI-native layer

`buildEditorial()` currently performs a deterministic, source-bounded aggregation over canonical events. It can identify patterns such as the busiest route or a battle-heavy window without inventing events.

This is intentionally a safe frontend precursor to a future server-side AI editorial service. A future AI implementation should preserve the same rule:

> AI may interpret, aggregate, rank and narrate canonical game events. It may never fabricate a world event.

## Existing backend preserved

The v0.2 public API/privacy architecture remains the donor:

- existing Save Vault is authoritative;
- no second account database;
- safe random public trainer IDs;
- private save payloads and raw Trainer IDs stay private;
- public website requests are credentialless;
- the existing Emerald client remains at `https://jrpg.world/emerald/`.

## Files

- `index.html` — application shell and SEO
- `styles.css` — responsive Emerald-native visual system
- `app.js` — SPA routing, live API, editorial aggregation, route art, trainer views
- `config.js` — public endpoint and Emerald launch URL
- `.htaccess` — Apache SPA fallback
- `assets/maps/` — reconstructed map art
- `assets/trainers/` — normalized trainer sprites
- `assets/fonts/` — supplied Emerald font + license/readme
- `assets/data/map-manifest.json` — source map/crop registry
- `assets/data/trainer-manifest.json` — normalized sprite registry

## Deploy

This copy is namespaced under `games.madeby.re/emerald/`.

Apache rewrite support is required for `/play`, `/you`, and `/trainer/<public-id>` to fall back to `index.html`. The included `.htaccess` is inherited from the already-audited static v0.2 deployment model.

## Next backend channels

The frontend event model already tolerates future event names for:

- Battle Tower
- Hoenn TV
- Mirage Island
- Gifts

Those should only appear in LIVE when backed by real server-side game/save events.
