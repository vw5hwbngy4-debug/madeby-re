export const SPAWN_POINTS={default:[0,.2,25],development_gate:[0,.2,25]};
export function getSpawnPoint(entryId='default'){return[...(SPAWN_POINTS[entryId]||SPAWN_POINTS.default)];}
