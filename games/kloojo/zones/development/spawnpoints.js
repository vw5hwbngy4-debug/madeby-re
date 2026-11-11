export const SPAWN_POINTS={default:[0,.2,25],runtime_test_return:[-75,.2,52],pipe:[-43,.15,8],wall:[29,8.4,-42]};
export function getSpawnPoint(entryId='default'){return[...(SPAWN_POINTS[entryId]||SPAWN_POINTS.default)];}
