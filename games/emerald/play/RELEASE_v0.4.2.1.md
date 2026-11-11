# Emerald Live v0.4.2.1 — Presence UI Hotfix

Small client-only hotfix for the v0.4.2 Presence release.

## Fixed

- Presence CSS in v0.4.2 accidentally contained serialized `\n` sequences. Browsers therefore ignored the appended Presence rules.
- `HOENN RIGHT NOW` and `NO OTHER TRAINERS ONLINE` now render as separate stacked lines.
- 15-minute and 24-hour presence counters have explicit spacing and responsive cards.
- Narrow mobile widths stack the counters instead of concatenating them.
- PokéField's visible release label now reports `v0.4.2.1`.

## Unchanged

- Presence heartbeat logic
- public presence API
- BUZZ canonical-story logic
- Trainer Card / Secret Base behavior
- desktop DEX behavior

No server or Emerald · MadeBy redeploy is required.
