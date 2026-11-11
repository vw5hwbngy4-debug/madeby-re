# Technical record

Phantasy Star Nova uses CRI CPK containers and RMD message resources. The independent completion audited the public translation corpus, reconstructed the required glyph mapping, compiled 24,850 intended English RMD resources and produced a Vita3K-specific full merge based on the original full APP CPK.

The earlier rePatch-style overlay was not used as a full APP replacement because it contained only a subset of the game's total asset inventory. The Vita3K full-merge path instead preserves the complete original APP contents while replacing/adding the resolved English runtime RMD resources.

Canonical verified full output:

- Size: 3,252,228,483 bytes
- SHA-256: `ebf2cea4c8158f32557d52c58b111101c1818157d862cd7b1c570b096730e4ba`

The public repository contains the corpus, reconstructed glyph map, build scripts, manifests and validation records. It does not distribute a full commercial game image.
