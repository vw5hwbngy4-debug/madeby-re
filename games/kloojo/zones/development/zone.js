import {getSpawnPoint} from './spawnpoints.js';

// Read-only adapter for tooling. It never substitutes gameplay behavior.
export class DevelopmentZoneAdapter{
  constructor(host=window){this.host=host;}
  get runtime(){return this.host.KLOOJO_RUNTIME;}
  async loadZone(){if(!this.runtime)throw new Error('Canonical Kloojo runtime is not ready');return this.runtime;}
  async unloadZone(){return false;}
  getSpawnPoint(entryId){return getSpawnPoint(entryId);}
  getExitGates(){return[{id:'runtime_test_gate',targetZone:'runtimeTest',entryGate:'development_gate',position:[-81,0,52],radius:7.2}];}
  serializeZoneState(){return this.runtime?.functions.persistRuntimeState().zones.development;}
}
