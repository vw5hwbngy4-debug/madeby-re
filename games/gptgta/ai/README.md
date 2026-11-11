# GPTGTA AI-first structure

This build is organized so AI systems can understand the project without crawling every demo folder as a separate asset universe.

## Canonical routes

- `/index.html` — public project landing / version overview.
- `/version/v1/v1.html` — first mobile slice.
- `/version/v2/v2.html` — rotation / improved controls slice.
- `/version/v3/v3.html` — wider roads, multi-car slice.
- `/version/v3.1/v3.1.html` — reverse / sidewalk pedestrian slice.
- `/version/v4/v4.html` — roof/water/tree collision slice.
- `/version/v4.2/index.html` — current playable demo.
- `/gtagpt_v6_1_playable_asset_editor_mapmaker/` — playable asset editor / mapmaker.
- `/assets/gptgta/` — shared canonical asset pack for demos.

## Asset rule

Playable version demos no longer carry duplicate full asset packs. They resolve asset paths through `/assets/gptgta/`. This keeps demos historically separate while making the asset layer single-source and easier for AI retrieval.

## Performance change

- Player walking speed increased from `1.45` to `1.6675` (+15%).
- Vehicle handling fields `accel`, `reverse`, `max`, and `reverseMax` increased by ~30%.

## Retrieval mode

Use this file as the project map before inspecting individual demos. Treat `/assets/gptgta/` as the canonical shared asset root.
