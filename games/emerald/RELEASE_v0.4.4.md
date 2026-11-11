# Emerald · MadeBy Web v0.4.4 — Play Inside Hoenn

## What changed

- `/play/` is now a real physical Emerald · MadeBy directory containing the complete Emerald Live browser client.
- PLAY navigation no longer opens `jrpg.world/emerald` in another tab.
- The Emerald client talks to the existing Save Vault through `https://emerald-api.madeby.re`.
- The public Hoenn read API also moves to `emerald-api.wolken.page` for one first-party Hoenn surface.
- Emerald receives a compact Emerald · MadeBy LIVE / PLAY / YOU shell while the emulator remains its own document.
- The old architecture-heavy PLAY marketing panel is removed from the user journey. PLAY now means: play the game.
- Save Vault UI branding in the embedded client is Emerald · MadeBy-facing.
- A one-time local-only save export/import handoff is included for users whose save still exists only under the old `jrpg.world/emerald` browser origin.
- No ROM and no user save is distributed in this package.

## Save continuity

Server-side Save Vault data is not migrated. `emerald-api.wolken.page` must point to the same Node application and the same MySQL database currently used by `saves.jrpg.world`.

Existing Save Vault users sign in once on the new host and continue with the same database-backed saves.

A separate legacy bridge patch is provided for old browser-local saves that were never uploaded to Save Vault.
