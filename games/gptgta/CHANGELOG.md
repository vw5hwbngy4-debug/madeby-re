# GPTGTA Public Changelog

## v5.4.6 — Canonical Metro City Polish
- Consolidated the best elements from v5.4.3, v5.4.4 and v5.4.5 into one cleaner build.
- Kept the v5.4.5 edge-facade improvement, but grounded entrances back on the street/front side so facade walls remain walls.
- Added a real metro flow: street stairs → elevated platform → train doors → destination platform → stairs down.
- Players and pedestrians on street level are drawn under the elevated metro, matching cars going underneath.
- Metro boarding no longer happens magically from street level; it requires the station/platform layer.
- Added a second connected flyover corridor and improved flyover guardrails/ramp readability.
- Overpass traffic uses upper/lower collision separation, while street pedestrians stay lower unless on metro platforms/roofs.
- Added facade cleanup so benches/trees/random props do not appear embedded inside edge-building walls.
- Added cleaner crosswalk stop lines and preserved visible red/yellow/green traffic signal bulbs.
- Preserved South Island, chopper altitude zoom, living shoreline, sand footprints, UZI interiors, bedroom/Safari fixes and pseudo-3D buildings.

# GPTGTA Public Changelog

## v5.4.5 — Edge Facade Entrance Fix
- Moved edge-facade building entrances from the visible rooftop plane down to the street-facing wall side.
- Cleaned decor off edge-building roofs and wall surfaces so benches, trees and other props no longer sit on facade windows.
- Preserved the v5.4.4 multilevel traffic / flyover pass and metro underpass work.

# GPTGTA Public Changelog

## v5.4.4 — Multilevel Circulation Pass
- Added a drivable east-west urban flyover through the main city.
- Traffic and player vehicles now support simple road levels: ground traffic runs under the flyover while elevated traffic rides on top.
- Elevated segments ignore stoplights while the ground grid keeps its signal logic.
- Ground pedestrians and cars render beneath the flyover deck for a proper underpass feel.
- Preserved metro underpasses, South Island, interiors, shoreline, UZI, chopper zoom and the pseudo-3D edge facades.

# GPTGTA Public Changelog

## v5.4.3 — Metro Underpass + Edge Facades
- The player now renders under the metro deck, so pedestrians and cars both read as being below the elevated line.
- Added station stairs at both metro ends; you board the metro on foot from those access points.
- Removed the confusing floating elevated-road sample decks to keep the road logic visually coherent.
- Added facade collision so pseudo-3D edge walls behave like actual building sides instead of fake walkable/drivable windows.
- Preserved South Island, interiors, UZI, traffic, shoreline and chopper altitude zoom.

# GPTGTA Public Changelog

## v5.4.2 — Elevated Transit + Footprints
- Metro rails now read as elevated infrastructure: pillars/under-structure below, rail deck drawn above cars, and stations remain readable.
- Added two sample elevated road deck overlays to create the GTA-style underpass/overpass illusion.
- Traffic lights now show red/yellow/green bulbs and traffic waits more strictly at red/yellow phases.
- Traffic respects road blocks more strongly and no longer jumps through blocked cars after waiting.
- Walking on sand now leaves temporary real footprints behind the player.
- Added purple carjacker visibility and more varied pedestrian shirt colors.
- Added subtle vehicle paint overlays so the street feels less same-colored.
- Preserved v5.4.1 interior UZI, living shoreline, South Island, metro, chopper altitude zoom, bedroom, Safari fixes, pseudo-3D buildings and rooftop systems.

# GPTGTA Public Changelog

## v5.4.1 — Interior UZI + Living Shoreline
- UZI now properly works inside interiors: interior NPCs can be shot, fall, and remain down/dead.
- Added living shoreline rendering: light-blue tide wash along sand/water borders.
- Added darker sand marks/footprint-like details for beaches.
- Traffic now respects player/parked/stolen cars more strongly and no longer jumps through blocked cars after waiting.
- Preserves South Island, metro, chopper altitude zoom, personal bedroom, Safari fixes, pseudo-3D buildings, rooftop and molotov systems.

# GPTGTA Public Changelog

## v5.4.0 — South Island Metro Expansion
- Expanded the world map eastward with a real sea barrier and a new South Island district.
- Added a Miami/Vice-City-like island grammar: beach, palms, villas, motel/diner, low-density roads and a boulevard.
- Added a dedicated metro/rail layer with platforms, signs, rails and a long grey metro train.
- Metro stops at Main City and South Island; press Enter near the train to board and press Enter again at a station to exit.
- Metro route crosses / tunnels under the sea, making water a real boundary rather than mixed road/water noise.
- South Island is intended to be reachable by metro or chopper HIGH flight.
- Preserves v5.3.9 Chopper Altitude Zoom, bedroom/Safari fixes, pseudo-3D buildings, rooftop flow and molotov systems.

# GPTGTA Public Changelog

## v5.3.9 — Chopper Altitude Zoom
- Added chopper altitude camera zoom: HIGH flight smoothly pulls the camera back so more of the city is visible.
- LOW flight smoothly returns to the normal close camera.
- Zoom is render-only; physics, collisions, traffic and inputs remain in stable world coordinates.
- Added a subtle high-altitude haze overlay.
- HUD now shows chopper altitude plus current camera zoom percentage.
- Preserved v5.3.8 bedroom spawn fix, Safari touch lock, private bedroom, pseudo-3D buildings, rooftop flow and molotov behavior.

# GPTGTA Public Changelog

## v5.3.8 — Bedroom Spawn + Safari Touch Fix
- Fixed the bedroom spawn: player now starts beside the bed, not inside the solid bed prop.
- Added a safe-spawn helper that checks bedroom collision before final placement.
- Made HOME start private by removing any fallback bedroom NPC population.
- Kept the 3-floor bounded UP/DOWN stair structure from v5.3.7.
- Added stronger Mobile Safari touch hardening: no text selection, callout, drag, gesture zoom, double-tap zoom, or touchmove scroll during play.
- Preserved pseudo-3D buildings, chopper, rooftop, molotov, stable minimap and personal bedroom flow.

# GPTGTA Public Changelog

## v5.3.7 — Personal Bedroom + Bounded Floors
- Game now starts inside your own bedroom instead of outside or in a generic apartment.
- Bedroom floor has no random NPCs.
- HOME now has exactly three floors: lobby, your bedroom, top hallway.
- Added separate UP and DOWN stair zones; stair navigation is no longer one-way.
- Roof re-entry from HOME returns to Floor 3 instead of climbing infinitely upward.
- Floor layouts are now distinct: lobby, personal bedroom, top hallway.
- Preserved stable minimap, pseudo-3D buildings, chopper, rooftop and molotov systems.

# GPTGTA Public Changelog

## v5.3.6 — Home Stairwell + Stable Minimap
- Replaced minimap background-image refresh with a real embedded canvas to reduce flicker.
- Moved the beach/harbor parking lot off active traffic paths and carved a dedicated parking surface.
- Added a HOME landmark building.
- HOME interior now has a stairwell: press Enter near STAIRS to move floor by floor.
- Floor 2 is marked as your bedroom floor.
- Climbing past the top floor exits onto the roof and uses the existing rooftop/fall/molotov systems.
- Preserved v5.3.5 pseudo-3D buildings, chopper blades, roof landing, molotov drops and shadowed-player behavior.

# GPTGTA Public Changelog

## v5.3.5 — Chopper Rooftop + Canal Cleanup
- Preserved the v5.3.4 pseudo-3D building facade pass.
- Added retro helicopter rotor-blade blur based on the older GitHub chopper feel.
- Added LOW/HIGH helicopter altitude with a smaller high-altitude shadow.
- Added mobile chopper altitude context button and PC H key support.
- Added rooftop landing from the chopper at low altitude.
- Added rooftop fall behavior: walking off a roof triggers a fall / blood recovery moment.
- Added rooftop molotov drop with delayed impact and explosion damage below.
- Darkened the player sprite when standing in tall-building shadow.
- Cleaned up inconsistent water/road visuals by making the harbor canal/bridge explicit and removing stray water under roads.
- Lengthened the beach boulevard and added more beach prop placement.
- Restored UZI tracer spray lines.

# GPTGTA Public Changelog

## v5.3.4 — Pseudo-3D Facades + Readable Entrances
- Added GTA PC-style pseudo-3D building facade rendering on top of the existing canvas city.
- Added height classes for downtown towers, edge skyscrapers, commercial buildings, industrial blocks, and residential buildings.
- Added repeated facade window bands and stronger building shadowing.
- Added readable entrance glow: sign → door → light spill.
- Added an enterable STRIP CLUB destination building with neon/pink exterior and custom interior.
- Edge buildings now get visual tower facades and can expose readable entrances when reachable.
- Inspected the GlassGallery true-3D zip. It uses Three.js / GLB assets, so the full engine was not ported; the useful idea was translated into a light 2.5D canvas renderer.

# GPTGTA Public Changelog

## v5.3.2 — Parking Lot + Hydrants + Bridge Polish
- Added a compact parking lot near the gas sign with multiple parked vehicles and an opening striped gate.
- Added extra parked cars near city blocks for more lived-in street feel.
- Added hydrant burst behavior: hit a hydrant with a car and it sprays water.
- Added a more readable little bridge crossing over the beach-side water inlet.
- Added fixed external UZI pickup points in the city.
- Tuned pedestrian dodge speed and traffic impatience so blocked streets feel more GTA-like.

# GPTGTA Public Changelog

## v5.3.1 — Beach Trees + Chopper + Gang HQ
- Returned to the stronger v5.3 foundation for people and asset quality.
- Added a moderate beach strip with real sand drawing and shoreline water.
- Explicitly placed pine rows / dark bushes and a sakura grove so the biome props are actually visible.
- Fatal pedestrian hits leave blood splatter again.
- Helicopter can be entered and now flies over buildings/water instead of behaving like a road car.
- Traffic now queues behind blocked world cars and occasionally a small minority squeezes past after a long wait.
- Added a gang HQ interior with gang members and a UZI pickup.

# GPTGTA v5.3 — Collision + Asset Purge + Living Edge

- Latest playable build now lives at `/play/` and `/version/v5.3/`.
- Added pedestrian vehicle-impact tiers: shove, knockdown, fatal hit.
- Added pedestrian dodge behavior for fast incoming vehicles.
- Added simple HEAT meter and decay.
- Added hard-impact vehicle damage behavior.
- Removed visible grey fallback blocks with styled human, vehicle and prop fallback renderers.
- Added pine forest biome assets, sakura grove assets and beach asset set.
- Added beach / waterfront landmark support using palms, umbrellas, chairs, towels, beach ball and ice cream seller assets.

## v5.1 — Clean City Graph + Building Interiors

- Uses v5.0 clean city graph as the base.
- Adds enterable buildings through street-facing entrances.
- Adds top-down interiors for shops, offices, warehouses and apartments.
- Adds indoor NPCs with simple ambient tasks and wandering.
- Keeps the stable traffic and pedestrian grammar from v5.0 intact.
- Updates /play/ and /version/v5.1/ as the latest public playable build.


## v4.3.2 — Mega City Streaming Traffic

- Larger enclosed city map.
- Streaming traffic population replaces permanent offscreen traffic accumulation.
- More cars and buses while preserving performance.
- Traffic cars no longer pile up from soft traffic-to-traffic physics collisions.
- Building sets, storefronts, windows, roof textures, road tiles and environmental props are used more visibly.
- Harbor Scrap objective retained.

# Changelog

## V4.2.31 — Fast cars + ARSONIST existing spawn cars

- Current public build mounted at `/play/`, `/version/v4.2/`, and `/version/v4.2.31/`.
- Restores the speed feel closer to V4 / GTA 1-style driving.
- Normal car speed now matches the old boosted feel.
- Boost is now an extra-fast layer above normal speed.
- Keeps mobile performance cleanup from v4.2.28.
- ARSONIST opening now explodes two existing parked spawn-area cars instead of adding extra cars.
- Original heavier v4.2 branch is preserved at `/version/v4.2-original/`.

This changelog documents the preserved GPTGTA development line from V1 through V4.2. Dates are intentionally conservative where exact publication dates were not encoded in the archive.

## V4.2 — Performance-cleaned public branch

- Preserved as `versions/v4.2/index.html`.
- Added mobile Safari performance cleanup.
- Capped canvas device pixel ratio for better mobile stability.
- Added caps for effects, bullets, water marks, and cars.
- Reduced helicopter/chopper trail effect pressure.
- Throttled HUD DOM writes.
- Throttled keyboard polling.
- Updated pedestrians every other frame.
- Added guarded 40 FPS loop.
- Added duplicate-loop guard.
- Central screenshot: `screenshots/v4.2.gif`.

## V4 — Expanded simulation branch

- Preserved as `versions/v4/v4.html`.
- Includes larger gameplay/simulation iteration than earlier builds.
- Includes mobile demo continuity files.
- Central screenshot: `screenshots/v4.jpeg`.

## V3.1 — Intermediate mobile/demo branch

- Preserved as `versions/v3.1/v3.1.html`.
- Carries mobile demo iteration and gameplay refinements between V3 and V4.
- No central screenshot found in the archive; the version folder is preserved intact.

## V3 — Expanded city systems

- Preserved as `versions/v3/v3.html`.
- Expanded the playable city/game systems after the V2 control pass.
- Central screenshot: `screenshots/v3.jpeg`.

## V2 — Gameplay and control improvement branch

- Preserved as `versions/v2/v2.html`.
- Iterated on player controls, mobile playability, and prototype feel.
- Central screenshot: `screenshots/v2.jpeg`.

## V1 — Initial playable prototype

- Preserved as `versions/v1/v1.html`.
- Establishes the original GPTGTA browser prototype line.
- Central screenshot: `screenshots/v1.jpeg`.

## Repository cleanup / AI-first patch

- Added `/ai` documentation layer.
- Added shared asset root under `/public/assets/gptgta`.
- Preserved version folders while making a cleaner GitHub-facing structure.
- Added central screenshots folder.
- Added public timeline and repository analysis docs.


## GPTGTA v5.2
Latest playable build is now /play/ and /version/v5.2/: clean city graph + interiors + canals + asset fallback fixes.
