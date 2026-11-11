# Exact files changed — v0.4.1 Mobile BUZZ

## Runtime

1. `index.html`
   - loads `mode-switch-v0.4.1.js`;
   - loads `hoenn-online-v0.4.1.js` and `hoenn-online-v0.4.1.css`;
   - cache tags bumped to `0.4.1`.

2. `mode-switch-v0.4.1.js`
   - mobile breakpoint (`<=959px`) converts DEX control to BUZZ;
   - mobile DEX display mode is normalized to regular;
   - desktop DEX behavior preserved;
   - BUZZ opens the Hoenn social overlay rather than touching emulator state.

3. `hoenn-online-v0.4.1.js`
   - adds `HOENN / BUZZ` view state;
   - reads global anonymous public activity;
   - deterministic canonical-event story grouping;
   - safe fallback to authenticated connected-Hoenn activity;
   - BUZZ can be read without Save Vault authentication;
   - existing HOENN Secret Base actions preserved.

4. `hoenn-online-v0.4.1.css`
   - view tabs;
   - BUZZ story cards and scope indicator;
   - mobile BUZZ styling.

5. `pokefield-live-v0.1.24.9.2.1.2.js`
   - visible release label only: `UPDATED 13 SEP · v0.4.1`.

6. `VERSION.txt`
   - `0.4.1`.

## Explicitly unchanged

- emulator/WASM runtime;
- ROM handling;
- Save Vault mutation paths;
- Trainer Card publish flow;
- Secret Base serializer/import logic;
- desktop Strategy Pokédex implementation;
- Team Lab / PokéField competitive logic.
