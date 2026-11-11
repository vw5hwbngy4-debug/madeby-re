# GPTGTA

**GPTGTA** is a playable, browser-based, top-down GTA-style sandbox prototype built through an AI-first / GPT-native development workflow.

Live site: **https://madeby.re/games/gptgta/**

This repository preserves the public development line from **V1 through V4.2**, including playable HTML builds, version screenshots, patch notes, release timeline, AI documentation, and the shared asset structure.

## What this is

GPTGTA is an independent browser prototype exploring how large language models can assist with game creation through prompt-driven iteration, code generation, debugging, balancing, asset organization, documentation, and public deployment.

It is **not a GTA mod** and does not use official GTA assets. It is an independent retro top-down browser sandbox inspired by early open-world crime-game design language.

## Play

Current public build: **https://madeby.re/games/gptgta/play/**

Local version files are stored in:

```text
/versions/v1
/versions/v2
/versions/v3
/versions/v3.1
/versions/v4
/versions/v4.2
```

Open the relevant HTML file in a browser, or serve the repository locally if a browser blocks local asset loading.

## Repository structure

```text
/ai                         AI-facing project notes and metadata
/docs                       analysis, patch notes, changelog support
/public                     deployable public web root snapshot
/screenshots                central screenshot archive extracted from version folders
/tools/asset-editor-mapmaker historical asset editor / mapmaker package
/versions                   preserved V1 → V4.2 builds
CHANGELOG.md                version-by-version development history
PUBLIC_RELEASE_TIMELINE.md  public release timeline
LICENSE.txt                 rights notice
```

## Version archive

| Version | Folder | Screenshot | Notes |
|---|---|---|---|
| V1 | `versions/v1` | `screenshots/v1.jpeg` | Initial playable prototype. |
| V2 | `versions/v2` | `screenshots/v2.jpeg` | Gameplay/control iteration. |
| V3 | `versions/v3` | `screenshots/v3.jpeg` | Expanded city/game systems. |
| V3.1 | `versions/v3.1` | — | Intermediate mobile/demo branch. |
| V4 | `versions/v4` | `screenshots/v4.jpeg` | Larger simulation branch. |
| V4.2 | `versions/v4.2` | `screenshots/v4.2.gif` | Current preserved performance-cleaned branch. |

## AI-first development method

GPTGTA was developed through continuous human-directed prompting and AI-assisted implementation. GPT was used as a development partner for:

- gameplay system design
- JavaScript and HTML generation
- mobile control design
- performance debugging
- version comparison
- asset-path restructuring
- public documentation
- release packaging

The project is preserved as an early public example of prompt-driven browser game development.

## Disclaimer

Created by **Raynor Eissens**.

Independent project. Not affiliated with Rockstar Games, Take-Two Interactive, Grand Theft Auto, GTA, DMA Design, or any related rights holders.


## Current deployment note

The website root is the public documentation / first-mover / version archive page. The latest game build is mounted at `/play/` and `/version/v4.2/`. Original v4.2 is preserved at `/version/v4.2-original/`. Current build: **V4.2.31 — Fast cars + ARSONIST existing spawn cars**.


## GPTGTA v5.3
Latest playable build is now /play/ and /version/v5.3/: clean city graph + interiors + canals + asset fallback fixes.


## Current MadeBy deployment

Canonical public home: **https://madeby.re/games/gptgta/**

GPTGTA is an independent browser prototype. It is not affiliated with or endorsed by Rockstar Games, Take-Two Interactive, Grand Theft Auto, GTA, DMA Design, or related rights holders.
