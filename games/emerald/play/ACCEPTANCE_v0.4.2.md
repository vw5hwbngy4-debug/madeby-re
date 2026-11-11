# Emerald Live v0.4.2 acceptance

Automated/static checks completed:

- active `index.html` references v0.4.2 mode switch, Hoenn JS and Hoenn CSS;
- JavaScript syntax PASS for v0.4.2 modules;
- mobile DEX action remains BUZZ;
- desktop action remains DEX;
- presence heartbeat is POST + authenticated Save Vault CSRF;
- heartbeat runs only while the document is visible;
- public presence is read credentiallessly from the presentation-safe API;
- BUZZ remains canonical-event based; presence is displayed separately and never synthesizes a game event;
- no ROM is bundled.

Production QA after deploy:

1. Open two different signed-in Save Vault accounts on two devices.
2. Keep both Emerald pages visible.
3. Open BUZZ on device A and confirm `1 OTHER TRAINER ONLINE`.
4. Background/close device B and wait up to 150 seconds.
5. Confirm device A returns to `NO OTHER TRAINERS ONLINE`.
6. Confirm canonical BUZZ stories are unchanged by presence pings.
