# Emerald Live v0.4.1 — Mobile BUZZ acceptance

## Automated checks

- `mode-switch-v0.4.1.js`: JavaScript syntax PASS.
- `hoenn-online-v0.4.1.js`: JavaScript syntax PASS.
- active PokéField runtime syntax after visible-version bump: PASS.
- mobile mode-switch harness: PASS — label becomes `BUZZ`, Emerald display mode remains `regular`, BUZZ callback fires.
- desktop mode-switch harness: PASS — label remains `DEX`, click enters seamless `dex` mode.
- BUZZ story-core harness: PASS — canonical MAY/RICO visit + challenge + win becomes one Base Battle story; Trainer Card update becomes one Trainer Card story.
- Save Vault v0.4.1 `npm test`: 8/8 PASS.
- public Trainer Card privacy serializer remains PASS.
- no database schema mutation added by v0.4.1.

## Manual production smoke test after deployment

1. Deploy Save Vault server v0.4.1 and restart Node.
2. Confirm `/health` reports `0.4.1` and `hoenn-world-read-v0.4.1`.
3. On an iPhone-sized viewport open `jrpg.world/emerald`.
4. Confirm the PokéField action row reads `SAVE VAULT · ... · BUZZ`, not DEX.
5. Tap BUZZ. Emerald must remain loaded/running underneath and the Hoenn overlay must open directly on the BUZZ tab.
6. Confirm `GLOBAL HOENN WIRE` is shown and stories are based on real public events.
7. Switch to HOENN inside the overlay and confirm existing Secret Base / trainer actions still work.
8. Close with `GAME ×` and confirm play resumes without ROM/save reload.
9. On desktop confirm the same top action still says DEX and opens the existing Strategy Pokédex mode.
