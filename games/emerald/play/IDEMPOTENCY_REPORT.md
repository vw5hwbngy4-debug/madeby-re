# IDEMPOTENCY REPORT

**Release:** Emerald v0.1.24.9.2.2.7 · HOENN RELATION STATE

## Client mutation idempotency

The native merger was tested against the real project save fixtures.

An identical STEPHEN publication applied to a save that already contains the same stable record produces:

- the same save SHA before/after;
- exactly one native STEPHEN owner record;
- no second Secret Base owner duplicate.

The UI also blocks `PRESENT_CURRENT`, but this is only a convenience. It is not treated as the security/idempotency boundary.

## Relation idempotency after native use

Entering or battling in an imported Secret Base mutates recipient-local fields. Those fields are now normalized out of the relation comparator. A base therefore remains **IN MY HOENN ✓** after a native visit/battle when the remote stable content has not changed.

Native record-mixing recency metadata is also excluded from relation equality so a bookkeeping-only counter change does not create a fake `UPDATE IN MY HOENN` state.

## Backend requirement

The server must independently deduplicate:

`recipient + source owner + exact published payload hash/version`

The supplied backend integration kit adds deterministic keys and sidecar uniqueness tables without replacing the current account/session/save architecture.

Required semantics:

- first accepted version → one meaningful add activity;
- genuine stable changed publication → one update activity;
- identical accepted repeat → existing/already-current response, zero new meaningful activity;
- repeated processing of the exact same authoritative save SHA → no repeated native event insertion.

## What is and is not deployed in this artifact

The browser/client and shared native core are patched and testable here.

The exact live Save Vault v0.1.3 `/api/hoenn` source was not present in the supplied files and no connected GitHub repository exposed it. Therefore the separate backend package is an **integration kit**, not a falsely claimed merged live backend binary/source tree.

The backend pass is not considered production-complete until those hooks are merged into the actual route and deployed.
