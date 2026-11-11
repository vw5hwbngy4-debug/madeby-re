# Release status — HOENN RELATION STATE

## PROVEN

- Real Account A → Account B Secret Base publication/discovery/delivery completed over the live service.
- The recipient's real Emerald save was mutated through the existing Save Vault path.
- The recipient physically entered the imported Secret Base in native Emerald.
- The imported trainer was really STEPHEN and the native recorded opponent included Pelipper Lv100.
- The native Secret Base battle completed successfully.
- Deterministic A–L relation/mutation/event acceptance matrix passes against project save fixtures and controlled native deltas.

## FIXED

- Relation UI is computed from active native friend slots 1–19, not previous button clicks.
- `ADD TO MY HOENN`, `IN MY HOENN ✓`, `UPDATE IN MY HOENN`, `NO SAFE SLOT` states exist.
- Post-add/update re-read removes the contradictory `BASE ADDED` + `ADD TO MY HOENN` state.
- Save commits/switches trigger relation recomputation.
- Same-owner update/move path preserves registered state where safe and avoids duplicate owner records.
- Recipient-local visit/battle/registration counters no longer make an unchanged remote base look outdated.
- Identical native insertion is byte-idempotent.
- Core battle-event derivation suppresses repeats from an unchanged native snapshot.

## PENDING

- Merge/deploy the backend idempotency/manifests integration into the actual Save Vault v0.1.3 `/api/hoenn` source. That source was not included in this task's supplied files.
- Perform the final live post-battle Save Vault sync acceptance check and verify `base_visited`, `base_challenged`, `base_battle_won` appear once on the real server.
- Reprocess the same authoritative live save and verify no duplicate activity.

## DELIBERATELY OUT OF SCOPE

- Hoenn TV network
- Match Call network
- Mail
- Battle Tower ladder
- avatar selector UI
- followers / generic friends
- likes / engagement currency
- marketplace
- realtime multiplayer
- full emerald.wolken.page website
