# QA — Emerald · MadeBy Web v0.4.4

PASS:

- `app.js`, `config.js`, Hoenn play shell, Save Vault client and Hoenn social client pass `node --check`.
- `/play/` is a physical directory, so the existing Apache rewrite preserves it instead of routing it back into the social SPA.
- Active PLAY links point to `/play/` and are not intercepted by `data-nav`.
- Active Save Vault endpoint is `https://emerald-api.madeby.re/api/vault`.
- Active Hoenn private/public endpoints are on `https://emerald-api.madeby.re`.
- No `.gba` or `.sav` file is present anywhere in the web release.
- Legacy export validates the active old save as Emerald before download; the new import accepts only 128 KiB Emerald saves (or the supported +16-byte mGBA RTC form).
- Known project Emerald save fixture: 131072 bytes, 28 Emerald signature sectors, accepted by the handoff gate.
- Old architecture-heavy PLAY copy is no longer an active route surface.

Container limitation:

- Chromium headless in this environment does not complete startup because its zygote/DBus process fails before making an HTTP request. Static/runtime syntax and filesystem routing checks therefore remain the release gate here, not a claimed headless-render PASS.
