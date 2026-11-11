POKÉFIELD EMERALD LIVE MVP v0.1.6 · GENDER + BREEDING SIGNAL

TARGET
  Primary: iPhone / iOS Safari portrait at jrpg.world/emerald/

PROVEN BY USER TEST BEFORE v0.1.6
  - Emerald BPEE boots on iPhone.
  - Live read-only RAM bridge connects.
  - A wild Zigzagoon was detected in real time.
  - Nature, Ability, IVs, EVs and Hidden Power decoded live and displayed while the battle was on screen.

NEW IN v0.1.6
  - Exact Gen III gender is derived live from personality + SpeciesInfo gender ratio.
  - The live card shows ♂ / ♀ / genderless immediately, including on Eggs.
  - DETAILS shows the canonical species female ratio and ROM-extracted egg groups.
  - Rare females in species with <=25% female ratio receive a visible BREEDING VALUE badge.
  - The overall KEEP/CHECK/PASS signal is breeding-aware without throwing away the original IV assessment:
      PASS + rare female => CHECK
      CHECK + rare female => KEEP
      KEEP remains KEEP
    DETAILS still shows the underlying IV-only assessment separately.
  - Treecko, Torchic and Mudkip are correctly sourced from the exact Emerald ROM as genderRatioRaw=31,
    displayed as the canonical 12.5% female species ratio.

SYSTEM CONTROLS
  v0.1.4 direct iOS Start/Select/L/R bindings are retained unchanged.
  TECH still reports the last direct system input.

CACHE
  v0.1.6 uses unique filenames for both the emulator bundle and the companion script.
  index/VERSION/bridge remain no-store via .htaccess.

DEPLOY
  Replace the contents of the current Emerald test path, including .htaccess.
  Because Hostinger previously served stale shells, using a fresh test path is still the safest first check.

NO ROM IS INCLUDED.


v0.1.6
- iOS Safari audio recovery after app/background transitions.
- First post-return user gesture wakes both mGBA SDL audio and Web Audio AudioContext.
- Visible restore-sound pill only when recovery is still needed.
- Quiet product explainer states the competitive companion value before the first encounter.
- No ROM is bundled or uploaded by PokéField.
