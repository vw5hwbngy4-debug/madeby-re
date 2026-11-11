import {getSpawnPoint} from './spawnpoints.js';

// Read-only test-zone adapter around the same canonical runtime used by Development.
export class RuntimeTestZoneAdapter{
  constructor(host=window){this.host=host;}
  get runtime(){return this.host.KLOOJO_RUNTIME;}
  async loadZone(){if(!this.runtime)throw new Error('Canonical Kloojo runtime is not ready');return this.runtime;}
  async unloadZone(){return false;}
  getSpawnPoint(entryId){return getSpawnPoint(entryId);}
  getExitGates(){return[{id:'development_gate',targetZone:'development',entryGate:'runtime_test_return',position:[0,0,50],radius:7.2}];}
  serializeZoneState(){return this.runtime?.functions.persistRuntimeState().zones.runtimeTest;}
}
