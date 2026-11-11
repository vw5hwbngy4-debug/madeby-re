# v0.4.3.2 Web QA — Deployment Fix

- `node --check app.js`: PASS
- `node --check config.js`: PASS
- app/config/cache-buster version: `0.4.3.2`
- Supported location path still calls the real scene resolver.
- Unsupported live location no longer substitutes Littleroot Town.
- Unsupported live location renders a neutral CSS background and links to the trainer profile.
- No map assets changed.
