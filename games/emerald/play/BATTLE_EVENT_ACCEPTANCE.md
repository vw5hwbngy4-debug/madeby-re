# BATTLE EVENT ACCEPTANCE

**Target native events:** `base_visited`, `base_challenged`, `base_battle_won`

## Live proof already established

The A→B network primitive itself is proven by the real two-account test described for this release:

- STEPHEN's Route 127 base was published by one account;
- EMERALD on a separate account received it through Emerald · MadeBy;
- the real Emerald save was mutated through Save Vault;
- EMERALD physically travelled to the imported Secret Base;
- the native Secret Base trainer battle ran;
- STEPHEN's recorded Pelipper Lv100 appeared in the battle;
- the native battle completed successfully.

This proves the transported record is not merely a web card. It is a functioning native Emerald Secret Base opponent.

## Derivation boundary hardened

Core v0.3.0 derives events only by comparing authoritative native snapshots. Browser claims such as `"won": true` are not part of the acceptance path.

The deterministic acceptance test constructs the native state transitions that Emerald persists and verifies that the diff produces:

- `base_visited`
- `base_challenged`
- `base_battle_won`

Reprocessing the same current snapshot against itself produces **0 events**.

The derivation now also prevents persistent battle-result TV flags from being emitted again when the previous authoritative snapshot already contains the same result for the same base owner.

## Native evidence used

The existing core observes native Secret Base state including:

- `SecretBase.numTimesEntered`
- `SecretBase.battledOwnerToday`
- current Secret Base index / non-local flag
- Secret Base TV result flags
- native Secret Base Secrets TV records

The project-supplied pokeemerald source confirms `numTimesEntered` is incremented when entering a Secret Base, which is why it is evidence for a visit but is intentionally excluded from remote relation equality.

## Live server acceptance status

**PENDING ONE FINAL LIVE ACCEPTANCE CHECK.**

The post-battle authoritative Save 1 / server event log from the completed STEPHEN battle was not supplied to this build session, and the authenticated Save Vault backend is not accessible from the build container. Therefore this artifact does not invent a claim that the live server already emitted all three events.

After deploying the backend hardening merge:

1. save normally in Emerald after the completed imported-base battle;
2. let Save Vault commit Save 1;
3. run the existing `sync_events` path;
4. verify the server reports the visit/challenge/win once;
5. process the same authoritative save again and verify zero duplicates.

If that check fails, the remaining bug is specifically at the live server checkpoint/derivation integration boundary, not the browser's battle claim path.
