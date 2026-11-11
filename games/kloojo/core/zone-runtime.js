export function assertZoneContract(zone) {
  const methods = ['loadZone','unloadZone','getSpawnPoint','getExitGates','serializeZoneState','restoreZoneState','updateZone','disposeZone'];
  for (const method of methods) if (typeof zone?.[method] !== 'function') throw new TypeError(`District is missing ${method}()`);
  return zone;
}

export class LandmarkRegistry {
  constructor() { this.landmarks = new Map(); }
  registerLandmark(definition) {
    if (!definition?.id) throw new TypeError('Landmark requires an id');
    const landmark = { geometry: null, collision: [], grindLines: [], platforms: [], wallRideSurfaces: [], climbSurfaces: [], secrets: [], lod: null, ...definition };
    this.landmarks.set(landmark.id, landmark); return landmark;
  }
  get(id) { return this.landmarks.get(id); }
  values() { return this.landmarks.values(); }
  clear() { this.landmarks.clear(); }
}

export class ChunkManager {
  constructor({ nearDistance = 85, farDistance = 150, interval = .25 } = {}) { this.nearDistance = nearDistance; this.farDistance = farDistance; this.interval = interval; this.elapsed = Infinity; this.chunks = new Map(); }
  register(chunk) { if (!chunk?.id || !chunk.center) throw new TypeError('Chunk requires id and center'); this.chunks.set(chunk.id, { state: 'off', radius: 25, ...chunk }); return chunk; }
  update(dt, playerPosition) {
    this.elapsed += dt; if (this.elapsed < this.interval) return; this.elapsed = 0;
    for (const chunk of this.chunks.values()) {
      const distance = chunk.center.distanceTo(playerPosition) - chunk.radius;
      const next = distance <= this.nearDistance ? 'near' : distance <= this.farDistance ? 'far' : 'off';
      if (next === chunk.state) continue; chunk.state = next;
      if (chunk.root) chunk.root.visible = next !== 'off';
      chunk.setDetail?.(next); chunk.setInteractions?.(next === 'near');
    }
  }
  dispose() { for (const chunk of this.chunks.values()) chunk.dispose?.(); this.chunks.clear(); }
}

export class ZoneRuntime {
  constructor(zone) { this.zone = assertZoneContract(zone); this.loaded = false; }
  async start(context) { await this.zone.loadZone(context); this.loaded = true; }
  update(dt) { if (this.loaded) this.zone.updateZone(dt); }
  async stop() { if (!this.loaded) return; await this.zone.unloadZone(); this.zone.disposeZone(); this.loaded = false; }
}

