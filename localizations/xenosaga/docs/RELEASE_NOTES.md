# Xenosaga I+II DS - Complete English Translation v1.0

## Final engineering changes

This release replaces the earlier Rough English v0.1 RC1 line with a runtime-tested v1.0 build.

Key fixes include:

- reconstructed chapter cards using the original indexed palette/map structure and safe LZ encoding
- preserved the known-good RC1 YES-training branch behavior
- cleaned the first-battle tutorial wrapping across the EVC corpus
- reflowed 910 mechanically safe one-word-tail dialogue blocks
- removed remaining player-facing Japanese from normal and deep EVC text layers
- translated item descriptions in `1/db/item.bin`
- changed the battle type glyphs to **P / E** using the actual battle spritebank
- preserved fixed event/text field spans where required to avoid branch regressions
- independently verified the final BPS by reapplying it to the clean Japanese ROM

## Residue classification

Structured player-facing scans at release time:
- normal EVC Japanese text: 0
- KJM/title Japanese text: 0
- player-facing deep EVC Japanese text: 0
- BDY Japanese text runs: 0
- item-description Japanese: 0

Thirteen Japanese 0x4D fields remain intentionally because they are internal/SFX-style cues such as impact/rumble sounds rather than translatable player-facing prose.

Three `param00/01/02.txt` files retain Japanese developer/config comments. They are not normal in-game player text.

## Runtime status

The final candidate was user-tested and reported to work excellently, including the opening YES tutorial path and first battle.

This is not a formal exhaustive every-state full-game certification.
