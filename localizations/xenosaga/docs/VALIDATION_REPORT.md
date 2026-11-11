# Final Validation Report

Package validation date: 2026-08-29

## Patch artifact

- Attached BPS exists: **PASS**
- BPS size = 56,540,257 bytes: **PASS**
- BPS SHA-256 = `8864d3e9035b92c55148da9870b531f4387defa8153b3d274fbac3469acad464`: **PASS**
- Floating IPS accepted BPS header/footer integrity: **PASS**
- BPS metadata = `Xenosaga I+II DS runtime bugfix pass 1`: **PASS**
- BPS source CRC32 = `6BCE1271`: **PASS**
- BPS target CRC32 = `6C14E0BF`: **PASS**

## Source and target

- Clean Japanese source located in a private validation directory: **PASS**
- Source size = 67,108,864 bytes: **PASS**
- Source SHA-256 = `938d07521cfc937d179402e85c8b0b43f3e929a494838ff1455b29126b56d356`: **PASS**
- Canonical BPS applied to clean source with Floating IPS: **PASS**
- Generated target SHA-256 = `67c0fe831083ccfe2da21768fecafd31fb68b7e809964157d175147b3f3f1db1`: **PASS**
- Original source excluded from public package: **PASS**
- Patched full ROM excluded from public package: **PASS**

## Exact JavaScript BPS implementation tests

The exact `js/bps.js` shipped in this package was executed under Node.js against the real clean 64 MiB source and the canonical 56,540,257-byte BPS.

- Real source accepted: **PASS**
- Real target generated: **PASS**
- Generated target SHA-256 matched canonical RC1: **PASS**
- Same-size source with one corrupted byte rejected by source CRC32: **PASS**
- BPS with one corrupted byte rejected by patch CRC32: **PASS**

A second synthetic BPS was generated with Floating IPS specifically to exercise the non-linear commands. Its disassembly contained `SourceCopy`, `TargetRead`, `TargetCopy`, and a second `SourceCopy`. The exact shipped JavaScript reproduced the synthetic target byte-for-byte.

- BPS1 header validation: **PASS**
- Source/target size parsing: **PASS**
- Metadata parsing: **PASS**
- SourceRead: **PASS** on canonical RC1
- TargetRead: **PASS** on canonical RC1 and synthetic test
- SourceCopy: **PASS** on synthetic test
- TargetCopy including overlapping-copy behavior: **PASS** on synthetic test
- Signed relative offsets: **PASS** on synthetic test
- Patch CRC32 verification: **PASS**
- Source CRC32 verification: **PASS**
- Target CRC32 verification: **PASS**

The exact `js/hashing.js` shipped in this package was also run against the real source, patch, and target.

- Source SHA-256 helper result: **PASS**
- Patch SHA-256 helper result: **PASS**
- Target SHA-256 helper result: **PASS**

## Browser flow implementation

- Source-size early rejection implemented before worker patching: **PASS by code inspection**
- Source SHA-256 gate occurs before BPS fetch: **PASS by code inspection**
- Patch SHA-256 gate occurs before BPS application: **PASS by code inspection**
- Output SHA-256 gate occurs before success/download: **PASS by code inspection**
- Output download is created from a local `Blob`: **PASS by code inspection**
- Original `File` object is never modified: **PASS by code inspection**
- Patching is performed in a module Web Worker: **PASS by code inspection**
- Full file-picker end-to-end run in desktop Chrome inside this container: **NOT TESTED** because the installed headless Chromium process did not complete rendering reliably in the container environment
- Full interactive run on iPhone Safari: **NOT TESTED**

## Privacy/network audit

- ROM patching uses local browser memory only: **PASS**
- Public JavaScript contains no ROM upload endpoint: **PASS**
- Only runtime `fetch()` is the public BPS asset download: **PASS**
- Analytics: **NONE**
- Telemetry: **NONE**
- `sendBeacon`: **NONE**
- Server-side ROM processor: **NONE**

## Static site checks

- Static HTML/CSS/vanilla JavaScript: **PASS**
- No runtime framework: **PASS**
- No CDN dependency: **PASS**
- Public BPS loads only after a valid-size ROM enters the patch flow: **PASS**
- Local asset/link existence scan: **PASS**
- Local HTTP server returned `index.html`: **PASS**
- Local HTTP server returned BPS with `Content-Length: 56540257`: **PASS**
- GitHub link included: **PASS**
- YouTube runtime proof link included: **PASS**
- Canonical/meta/robots/sitemap present: **PASS**
- Responsive CSS breakpoints for phone/tablet/desktop present: **PASS**
- Browser-specific visual QA at 375 px / 430 px: **NOT TESTED** due the headless Chromium limitation above
- iPhone memory limitation documented: **PASS**

## Release claims

- v0.1 RC1 / Public QA wording retained: **PASS**
- No complete-playthrough claim: **PASS**
- No zero-Japanese-everywhere claim: **PASS**
- Known issues visible: **PASS**
- No unsupported absolute world-first claim: **PASS**
- Prior Vector Translations work acknowledged: **PASS**

## Copyright package scan

A final recursive package scan is performed after the ZIP is built.

Required result:

- `.nds` files in final public package: **0**
- Original Japanese commercial ZIP in final public package: **0**
- Patched commercial ROM in final public package: **0**
- Canonical RC1 BPS included: **YES**
