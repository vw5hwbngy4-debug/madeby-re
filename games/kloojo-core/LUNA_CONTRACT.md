# Kloojo Luna Core contract

This package is the lightweight feed/game baseline. It is intentionally **not** the full Kloojo website.

## Normal Luna API iteration

Read and edit only:

- `luna/challenge-generator.js` for challenge families, probabilities, difficulty, timings and allowed spawn combinations.
- `luna/creation-grammar.js` for the narrow winner-creation surface.

Do **not** rewrite `core/kloojo-kernel.js` merely to produce a new challenge. A new challenge is a small `kys.encounter.v2` descriptor generated from a seed.

## Frozen kernel

`core/*` owns movement, physics, world geometry, collectibles, graffiti execution, semantic game events and the generic challenge state machine. Change it only when deliberately adding or fixing a game mechanic.

## Non-negotiable lightweight rules

1. Never embed images/audio/video as base64 or data URIs in JS/HTML.
2. Never add MP4, promo media, marketing pages, SEO corpus, docs site, multiplayer, profile systems, garage/crew UI, persistence or QA harness to this feed runtime.
3. Never clone the runtime per challenge. One warm Kloojo runtime receives many seeds/descriptors.
4. Never let winner creation mutate collision, level geometry, objective logic, scoring or leaderboard rules.
5. Keep every normal Luna edit deterministic. Same seed + same runtime version = same competitive setup.
6. Prefer data/config changes over mechanics changes. Do not touch `core/*` when `luna/*` can express the iteration.

## Challenge lifecycle

Host -> `KYS_CHALLENGE_GENERATE` or `KYS_CHALLENGE_LOAD`

Kloojo -> prepares the encounter -> black challenge intro -> run -> semantic events -> result -> host leaderboard.

`KYS_CHALLENGE_RETRY` replays the same encounter. A new seed creates a new encounter without downloading or rebuilding Kloojo.

## Winner creation

Current developer-owned creation surface: `graffiti_tag`.

A qualifying winner may supply only the fields allowed by `luna/creation-grammar.js`, currently `tag_text` and `direction`. Kloojo chooses the safe surface and owns position, scale, collision, visibility and objective behavior.
