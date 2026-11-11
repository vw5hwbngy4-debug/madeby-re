
# Retro GTA Production Asset Pipeline

Inspired by:
- GTA 1
- GTA 2
- GTA GBC
- DMA Design readability

Pipeline goals:
- strict top-down readability
- retro arcade clarity
- memory-efficient tile reuse
- production-ready naming
- modular sprite sheets
- power-of-two layouts

Recommended Specs:
- World Tiles: 32x32
- Characters: 32x32
- Vehicles: 48x48 to 64x64
- UI: crisp pixel art
- Export: PNG with alpha where needed

Folder naming conventions:
- road_straight_h_01.png
- civilian_walk_down_sheet.png
- police_car_damaged.png
- explosion_large_sheet.png

Animation sheet conventions:
- rows = direction
- columns = frames

Palette philosophy:
- high readability
- low visual noise
- compressed shading
- gameplay first
