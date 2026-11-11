# v0.1.24.9.2.2.8 · HOENN DESKTOP ENTRY

- Adds a visible **HOENN** button to the PokéField desktop action row.
- Desktop and the mobile center console button control the same `STATE.open` and the same single `#hoenn-online-panel`.
- Desktop active state mirrors whether Emerald · MadeBy is open.
- Mobile keeps the existing center console HOENN flow.
- Uses a bounded mount retry only; no persistent MutationObserver and no second panel/listener system.
- Keyboard `H` was deliberately not claimed in this pass to avoid stealing emulator keyboard input. Existing Escape-to-close behavior is unchanged.
- No changes to mGBA, Save Vault, PokéField runtime, Team Lab, DEX, Trainer Card, relation state, delivery, publishing, activity or save mutation logic.
