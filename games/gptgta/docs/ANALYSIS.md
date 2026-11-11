# Repository Analysis

## Archive contents found

The source archive contained:

- root public site files (`index.html`, deployment assets, favicon files)
- shared assets under `/assets/gptgta`
- AI metadata under `/ai`
- playable version folders under `/version`
- screenshots stored inside version folders
- V4.2 performance patch notes
- AI-first structural patch notes
- historical asset editor / mapmaker tooling

## Repository decisions

1. The original version folders were preserved under `/versions`.
2. Screenshots were copied into `/screenshots` for easier GitHub display while leaving the originals in their version folders.
3. The live deployable web-root snapshot was placed under `/public`.
4. AI-facing project notes were preserved under `/ai`.
5. Patch notes were moved into `/docs`.
6. Historical tooling was placed under `/tools/asset-editor-mapmaker`.

## Version screenshot extraction

Found screenshots:

- `versions/v1/IMG.jpeg` → `screenshots/v1.jpeg`
- `versions/v2/IMG.jpeg` → `screenshots/v2.jpeg`
- `versions/v3/IMG.jpeg` → `screenshots/v3.jpeg`
- `versions/v4/IMG.jpeg` → `screenshots/v4.jpeg`
- `versions/v4.2/IMG.gif` → `screenshots/v4.2.gif`

No screenshot file was found in `versions/v3.1`.

## Suggested GitHub description

Playable GPT-native top-down browser sandbox preserving V1–V4.2 of GPTGTA, an AI-assisted GTA-style prototype built through prompt-driven iteration.
