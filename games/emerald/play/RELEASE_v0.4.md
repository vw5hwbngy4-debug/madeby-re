# Emerald Live v0.4 — Hoenn Trainer Card publish bridge

The existing six-slot Trainer Card remains the editor. No second card maker is added.

## New action

`UPDATE HOENN PROFILE`

The button uses the existing authenticated Hoenn/Save Vault bridge. It publishes the current card selection to the private v0.4 API. The private payload carries specimen proof fields required for server-side ownership verification.

`SHARE PNG` remains available for external sharing.

## Versioning

The product-facing version is now **v0.4** and the deployable component version is **0.4.0**. Old long-version filenames remain only where the proven runtime still references them; they are implementation history, not the current public release number.

## ROM boundary

No ROM is included or modified in this release. The existing local/BYOROM model remains unchanged.
