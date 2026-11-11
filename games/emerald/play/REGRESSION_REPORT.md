# REGRESSION REPORT

**Baseline:** v0.1.24.9.2.2.6 HOENN OVERLAY ESCAPE + PUBLISH LOCK HOTFIX  
**Release:** v0.1.24.9.2.2.7 HOENN RELATION STATE

## Scope control

A recursive baseline diff before documentation showed only these runtime changes:

- `index.html`
- `hoenn-online-v0.1.css`
- `hoenn-online-v0.1.7.js` (new versioned Hoenn bundle)
- `hoenn/hoenn-secret-base-core.mjs`

No Save Vault, mGBA, ROM-loader, PokéField, Team Lab, DEX or Trainer Card runtime was edited.

## Deterministic test matrix

| Test | Result |
|---|---|
| A. trainer absent → ADD | PASS (`NOT_PRESENT`) |
| B. add succeeds → IN MY HOENN | PASS (`PRESENT_CURRENT`) |
| C. re-read/reload-equivalent bytes | PASS (`PRESENT_CURRENT`) |
| D. emulator-restart-equivalent fresh parser | PASS (`PRESENT_CURRENT`) |
| E. switch to save without trainer | PASS (`NOT_PRESENT`) |
| F. switch back | PASS (`PRESENT_CURRENT`) |
| G. identical delivery | PASS, same SHA, one owner record |
| H. source decoration change | PASS (`PRESENT_OUTDATED`) |
| I. source moves base | PASS, same owner moved/replaced in one slot, no duplicate |
| J. registered recipient copy | PASS, registration remains `REGISTERED` |
| K. no safe slot | PASS (`NO_SAFE_SLOT`), mutation not entered |
| L. native visit/challenge/win derivation | PASS in deterministic native-state fixture; repeat diff emits 0 |
| Extra: relation after recipient visit | PASS (`PRESENT_CURRENT`) |
| Extra: record-mixing recency-only change | PASS (`PRESENT_CURRENT`) |

The exact machine-readable output is included as `RELATION_TEST_RESULTS.json`.

## Syntax / package checks

- new browser module parses under Node syntax check;
- shared core parses under Node syntax check;
- backend helper/core parse under Node syntax check;
- final ZIP integrity is checked before release;
- local file references from `index.html` are checked against the packaged tree;
- user `.sav` fixtures are test inputs only and are **not included** in the release.

## Protected runtime parity

The final release process compares every file against the `.2.2.6` baseline. Outside the intended Hoenn/index/CSS changes and newly added documentation, baseline runtime files must remain byte-identical.

## Remaining non-client dependency

Reload/restart relation state requires the live `trainers` endpoint to return a public Secret Base payload or native relation manifest. Server delivery/activity idempotency also requires the supplied integration hooks to be merged into the actual Save Vault backend source.
