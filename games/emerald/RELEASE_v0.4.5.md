# EMERALD · MADEBY.RE v0.4.5 · Hoenn TV Network

## What changed
- `/tv` is now a real public channel for events backed by native Emerald TV records.
- `/play/` can receive a waiting `SECRET BASE SECRETS` broadcast and safely mix it into the active Emerald save.
- The in-game Hoenn panel shows a `HOENN TV` inbox with `SEND TO TV` when a native broadcast is available.
- Save Vault backup, checksum validation, post-write verification and server acknowledgement are required for delivery.
- PokéField's compact release panel now shows 4.5 / 4.4 / 4.3 / 4.2.

## Native-only rule
v0.4.5 does not invent a TV show from a generic web event. It carries the exact `TVSHOW_SECRET_BASE_SECRETS` record Emerald produced from real Secret Base activity.
