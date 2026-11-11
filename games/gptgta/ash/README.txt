Ash District v0.8

Portable browser-native dark city ARPG.

Start:
- public_html/index.html
- public_html/zombies/index.html is kept as a deployment alias.

Controls:
- WASD / arrows: move
- Shift: sprint
- Mouse / Space / FIRE: attack
- I or B / BAG: inventory and loadout
- E near camp people: short dialogue
- E near stash: open inventory/depot
- E near Skyspine Tower: travel to city outpost
- R: restart

Core loop:
- Ember Camp is safe.
- Outside town, zombie packs roam the forest road and city edge.
- Some packs have a stronger leader.
- Zombies drop money, ammo, healing and equipment.
- Money still drops and is kept for the later economy pass.
- Camp people are dialogue-only in this pass; buy/sell UI is intentionally not used.
- Inventory uses compact Diablo-style square item cells with rarity colors.

Notes:
- The large top-left debug HUD is removed from normal play.
- Uzi SFX is throttled so it does not trigger every bullet.
- Tree sprites are stable now and should not flicker between colors.


V0.9 notes:
E shows/uses nearby context actions: camp people, stash, tower passage and static scenery. Q throws Molotovs. Monsters roam away from safe towns instead of camping at the gate. Ember Camp is asphalt; outside is greener with a dirt road toward the tower and City Outpost.


V0.10 Tower Road Pass
- Removed drivable car context; cars remain only as abandoned scenery.
- Reworked the area outside Ember Camp from a tiled/grid-like field into a forest road leading north to Skyspine Tower.
- Skyspine Tower acts as the corridor/pass-through into the city environment and City Outpost.
- Camp people are dialogue-only for now; stash still opens the bag/depot.
- Zombies roam farther from town and do not sit on the camp edge while the player is near the gate.


v0.11 notes: north road to Skyspine Tower is longer; mobile BAG button removed; PATH button activates the Firepath skill. First press spends a level-up skill point if available. Firepath burns the ground behind you while sprinting.


V0.13 NOTE
Mobile flow: BAG button is removed; use PATH for Firepath. Open stash/loadout with I/B on desktop or the stash context in Ember Camp. Desktop supports drag/drop between Bag and Depot Stash. Mobile supports tap item, then tap empty square in the opposite grid. The stash screen is compact and designed to fit phone screens without vertical scrolling.

v0.13.1 cache-safe rescue:
Use /zombies/index.html?v=ash131. This version references ash-district-v0131.js and ash-district-v0131.css to bypass stale Safari cache.
