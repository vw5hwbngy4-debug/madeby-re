# Kloojo asset slots

District proof geometry is procedural and currently needs no external art. Future files should stay grouped by purpose:

- `graffiti/`: mural images plus placement metadata references.
- `clothing/`: tops, bottoms and back accessories.
- `masks/`: face and head equipment.
- `skates/`: boots, frames, wheels and trails.
- `world/`: reusable landmark/world art; district-specific placement remains in `zones/`.

Prefer compressed mobile-friendly textures, load them from the owning near chunk, and dispose them with that district.

