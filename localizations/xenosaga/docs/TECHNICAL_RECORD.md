# Technical Record

## EVC corpus

The project catalogued 29,461 translatable EVC records across 18,078 units. This includes 12,836 dialogue blocks and 5,242 standalone EVC text units, representing 13,126 unique source strings.

## Choice layer

459 choice menus were identified with 1,286 Japanese choice options. The supported translated choice layer has 0 remaining Japanese options.

## Absolute branch relocation

The key runtime failure in an earlier test build was not a translation-content problem. Variable-length English text changed EVC byte offsets, while absolute branch targets still referenced their old positions. The opening YES route therefore jumped to an invalid location and froze.

The relocation pass identified 1,322 branch opcodes and relocated 1,304 absolute targets, with 0 unresolved or invalid targets in the completed pass.

Opening YES target example:

- Original Japanese: `0x0D57`
- Vector beta reference: `0x0F2C`
- Broken earlier test build: `0x0D57`
- RC1 runtime fix: `0x0E3A`

## BPS verification

The browser implementation follows the BPS1 format, including source/target size parsing, metadata, SourceRead, TargetRead, SourceCopy, TargetCopy, signed relative offsets, and the three footer CRC32 checks. SHA-256 is used as an additional canonical source, patch and output gate.

The canonical patch was independently applied to the clean source with Floating IPS during package validation. The resulting SHA-256 matched the expected runtime-tested RC1 exactly.
