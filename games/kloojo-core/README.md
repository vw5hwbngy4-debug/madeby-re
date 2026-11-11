# KLOOJO LUNA CORE v0.1

A stripped, feed-native Kloojo runtime for KNOW YOUR SLOP and Luna API iteration.

This is **game core + assets + challenge grammar**, not the Kloojo website. The original promo video, duplicate/baseline HTML, about/docs/AI pages, multiplayer/social/profile systems, garage/crew UI, persistent world state and QA harness are intentionally absent.

## Run

Serve this folder over HTTP and open `index.html`.

- Standalone: `/?autostart=1`
- Challenge mode: `/?kys=1&seed=example&difficulty=3`

The parent feed can keep one iframe/runtime warm and send new `KYS_CHALLENGE_*` messages instead of reloading the game.

## Luna

Normal iteration surface is only:

- `luna/challenge-generator.js`
- `luna/creation-grammar.js`

See `LUNA_CONTRACT.md` before any model/API edit.

## Runtime dependency

Three.js is loaded as an ES module from jsDelivr, matching the existing Kloojo implementation. All Kloojo-owned visual assets are local files and are no longer embedded in JavaScript.
