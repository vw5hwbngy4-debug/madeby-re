# Emerald Live v0.4.3.1 — Live World Position

- Adds a read-only `JRPGWorldEmeraldRuntime.getWorldPosition()` bridge.
- Reads the ASLR-safe Emerald SaveBlock1 pointer through the same mGBA bus API already used by PokéField.
- Reads only `pos.x`, `pos.y`, `location.mapGroup`, and `location.mapNum`.
- Signed-in presence heartbeats now send that transient location to Emerald · MadeBy.
- Movement does not create canonical events and does not write to Emerald memory or the save.
- Public consumers never receive the exact tile coordinate.
