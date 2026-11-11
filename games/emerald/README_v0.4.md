# Emerald · MadeBy Web v0.4 — Trainer Card Social Identity

The live wire now has three views:

- `/` — all canonical public activity
- `/cards` — Trainer Card updates
- `/world` — world events excluding Trainer Card updates

A `trainer_card_updated` event renders as an Emerald-inspired social Trainer Card with the trainer sprite, up to six selected owned Pokémon, and an `OWNED IN EMERALD ✓` provenance badge.

The card event is a snapshot of that update. The trainer page displays the current public card revision.

The web client never receives the private personality/OT ID/checksum proof tuple used by the authenticated publisher.
