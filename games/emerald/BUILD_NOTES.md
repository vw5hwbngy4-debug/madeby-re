# v0.3 build notes

## Canonical product rule

The game posts.

No generic user composer is part of the core product. LIVE is a projection of real game-world activity.

## UX

The old `HOME / LIVE / TRAINERS / SECRET BASES / PLAY` directory model was replaced by:

`LIVE / PLAY / YOU`

Trainer and Base detail are reached contextually from the event stream rather than being required as top-level directories.

## Map art

Event location -> normalized Hoenn place name -> `map-manifest.json` -> card/hero crop when present, otherwise reconstructed full map.

No map art is invented by CSS when a reconstructed map exists.

## Trainer visuals

The supplied 82x82 trainer images were normalized to `trainer-000.png` through `trainer-105.png`.
A deterministic FNV-style string hash maps public identity to presentation sprite. This keeps a trainer visually stable across views without adding public identity data.

# v0.4.3 — Location Scenes

`event/location -> map manifest -> XY nearest scene -> event-tag deterministic scene -> canonical crop -> full-map fallback`

The generated scene bank is sourced only from reconstructed map art. Secret Base coordinates come from native pokeemerald Secret Base world events. No synthetic geography is introduced.
