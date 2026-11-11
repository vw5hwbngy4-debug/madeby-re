# HOENN RELATION STATE DESIGN

**Release:** Emerald v0.1.24.9.2.2.7 · HOENN RELATION STATE  
**Requested pass:** v0.1.24.9.2.2.3 relation-state hardening  
**Version note:** `.2.2.3` through `.2.2.6` already exist in the live repair chain, so this pass is shipped monotonically as `.2.2.7` rather than overwriting a prior build.

## Purpose

The trainer button is no longer a memory of a click. It is a view of the **currently active native Emerald save**.

The relation pipeline is:

`server public-base manifest → native ownerKey/version → active Save Vault snapshot → friend slots 1–19 → UI state`

No relationship truth is stored in localStorage, a new IndexedDB, or a second account/save store.

## States

| Native result | UI | Meaning |
|---|---|---|
| `NOT_PRESENT` | **ADD TO MY HOENN** | Remote owner is absent from friend slots 1–19 and a safe native destination exists. |
| `PRESENT_CURRENT` | **IN MY HOENN ✓** | Same native owner exists and stable base content matches the current publication. |
| `PRESENT_OUTDATED` | **UPDATE IN MY HOENN** | Same native owner exists but stable published content changed. |
| `NO_SAFE_SLOT` | **NO SAFE SLOT** | Native placement cannot be performed without violating own-base/registered/location safety. No mutation is attempted. |

`UNKNOWN_REMOTE` is an internal compatibility state only. It means the current server response did not provide enough native identity/version metadata to make a safe relation decision. The production backend patch should remove this ambiguity by returning the public payload or native manifest in `trainers`.

## Native identity

Identity uses the existing Secret Base `ownerKey` semantics:

`trainerName[7] + trainerId[4] + gender`

Account id, display name alone, route alone, DOM state and previous button clicks are not identity.

## Stable relation comparator

The relation hash preserves content that changes what/who the imported base actually is:

- Secret Base location/id
- owner name
- trainer ID
- gender
- language
- decorations
- decoration positions
- recorded party
- Hoenn avatar extension byte when present

The relation comparator normalizes state that belongs to the recipient or native record-mixing bookkeeping rather than the remote base content:

- `toRegister`
- `battledOwnerToday`
- `registryStatus`
- `numTimesEntered` (increments when the recipient physically enters the imported base)
- `numSecretBasesReceived` (native record-mixing recency metadata, not spatial/battle content)
- canonical padding

This is deliberately separate from the exact transport payload SHA-256. Transport SHA is still used for payload integrity and delivery version/idempotency. Relation SHA answers only: **is the stable published base already represented in this save?**

## Add path

1. Read active save from the existing Save Vault bridge.
2. Resolve relation from slots 1–19.
3. If already current, do not mutate.
4. If no safe slot, do not mutate.
5. Request the authoritative current publication from the server.
6. Recompute relation from the actual delivered native payload.
7. Use the existing `insertSecretBase` selection/update path.
8. Save Vault makes its existing backup and applies the mutation.
9. Re-read the active save.
10. Require `PRESENT_CURRENT` before acknowledging delivery.
11. Acknowledge and synchronize events.
12. Re-render immediately from the re-read native save.

## Update / move path

The existing same-owner path is retained rather than inventing a second merger.

- same owner, same location: replace the same native friend slot;
- same owner, moved location and destination free: replace/move the same owner in place;
- registered status belonging to the recipient is preserved where safe;
- unrelated friend bases remain unchanged;
- recipient own base (slot 0) remains invariant;
- owner/location split collision is refused rather than creating a duplicate owner;
- both normal Emerald save slots must validate before mutation;
- only affected SaveBlock1 sections receive repaired checksums.

## Save switching

The UI subscribes to the existing Save Vault committed-save lifecycle. A commit/switch invalidates the relation map and recomputes it from the newly active native bytes.

Therefore:

- save X containing STEPHEN → **IN MY HOENN ✓**;
- switch to save Y without STEPHEN → **ADD TO MY HOENN**;
- switch back to X → **IN MY HOENN ✓**.

No cross-save relation cache is authoritative.

## Important backend contract

For reload/restart correctness the `trainers` action must expose enough native information to resolve the public record without first mutating anything. The safest options are:

1. return the already-public serialized Secret Base payload; or
2. return `secret_base_owner_key`, `secret_base_relation_hash`, `secret_base_id` and identity metadata.

The client already understands both forms.
