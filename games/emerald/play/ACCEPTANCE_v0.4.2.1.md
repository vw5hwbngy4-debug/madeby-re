# Acceptance — v0.4.2.1 Presence UI Hotfix

- corrected Presence stylesheet contains no literal `\n` escape sequences: PASS
- mobile Presence heading uses stacked label + status layout: PASS
- presence stats use explicit grid/gap layout: PASS
- index references `hoenn-online-v0.4.2.1.css`: PASS
- VERSION.txt is `0.4.2.1`: PASS
- active PokéField release label is `v0.4.2.1`: PASS
- no server files changed: PASS

Manual phone check after deployment:
1. Open Emerald on mobile.
2. Tap BUZZ.
3. Confirm `HOENN RIGHT NOW` appears above `NO OTHER TRAINERS ONLINE`.
4. Confirm the 15m and 24h counters do not run together.
5. Confirm desktop still says DEX.
