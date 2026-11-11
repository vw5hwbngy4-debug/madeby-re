# EMERALD · MADEBY.RE Web v0.4.3 — Location Scenes

## Release goal
Turn public Hoenn activity into activity that visibly happens in real places.

## Shipped
- Location Scene resolver above the existing Zeak/RXDATA map layer.
- 46 XY-anchored scene definitions across all 13 routes that contain native Secret Bases.
- 92 new lossless WebP scene assets: hero 16:9 + card 4:3.
- Secret Base entrance XY chooses the nearest scene.
- Events without XY choose a deterministic event-aware scene instead of changing on refresh.
- LIVE hero uses the latest event location scene.
- World event cards use location scenes and expose a place link.
- Trainer Card update cards gain a location-scene strip when the trainer has a public place.
- Trainer profile hero uses the trainer's Secret Base location and links to that place.
- `/place/<slug>` pages show the real map scene bank, public Secret Bases and canonical recent events.
- Sitemap includes all reconstructed public Hoenn location pages.

## Deliberately not in v0.4.3
Live player mapGroup/mapNum/x/y heartbeat. That requires an Emerald Live runtime + presence contract change and is kept separate from this web/server release.
