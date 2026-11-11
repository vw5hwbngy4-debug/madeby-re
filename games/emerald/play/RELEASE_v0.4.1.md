# Emerald Live v0.4.1 — Mobile BUZZ

## Product change

On mobile, the top PokéField **DEX** action is now **BUZZ**.

- **Mobile:** BUZZ opens Hoenn social stories without leaving or restarting Emerald.
- **Desktop:** DEX remains the existing seamless Strategy Pokédex mode with the running emulator session preserved.
- The center GBA **HOENN** button remains the utility/social-state entry for Secret Bases, trainers and activity.
- HOENN and BUZZ are two views of the same overlay and can be switched with the `HOENN / BUZZ` tabs.

## BUZZ data contract

BUZZ reads the presentation-safe public Hoenn world wire from:

`GET https://emerald-api.madeby.re/api/hoenn-public?action=activity&limit=50`

The request is anonymous, GET-only and uses `credentials: omit`.

Stories are deterministic groupings of canonical events. v0.4.1 does not invent game-world facts. Current story families include:

- Secret Base visits / repeat traffic;
- Secret Base challenges and battle results;
- add-to-Hoenn connections;
- Secret Base publish/update events;
- Trainer Card updates.

If the public wire is unavailable, BUZZ falls back to the authenticated trainer's canonical private Hoenn activity and labels the scope **YOUR CONNECTED HOENN** instead of pretending it is global.

## Server compatibility

The v0.4.1 Save Vault server adds `https://jrpg.world` and `https://www.jrpg.world` as first-party read origins for `/api/hoenn-public` even when `HOENN_PUBLIC_ORIGINS` is otherwise restricted to Emerald · MadeBy.

This does **not** grant credentialed access. `/api/hoenn-public` remains read-only, rate-limited and `credentials: false`.

No database migration or schema change is required.

## Versioning

Visible product version: **v0.4.1**.

Legacy long-version filenames remain only for unchanged proven runtime assets. New/changed social and mode-switch assets use v0.4.1 names.
