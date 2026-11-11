const CELL_HALF_X = 24;
const CELL_HALF_Y = 27;
const SEMANTIC_SHAPES = new Set(['Water', 'Fire', 'Grass', 'Electric', 'Dragon']);

function axialRing(radius) {
  if (!radius) return [{q: 0, r: 0}];
  const directions = [[1, 0], [1, -1], [0, -1], [-1, 0], [-1, 1], [0, 1]];
  let q = -radius, r = radius;
  const out = [];
  for (const [dq, dr] of directions) {
    for (let step = 0; step < radius; step++) { out.push({q, r}); q += dq; r += dr; }
  }
  return out;
}

function slots(count) {
  const out = [];
  for (let ring = 0; out.length < count; ring++) out.push(...axialRing(ring));
  return out.slice(0, count);
}

function pixel(slot, scale) {
  return {x: Math.sqrt(3) * scale * (slot.q + slot.r / 2), y: 1.5 * scale * slot.r};
}

function scaleFor(count) {
  if (count <= 1) return 48;
  if (count <= 6) return 42;
  if (count <= 30) return 35;
  if (count <= 150) return 30;
  return 25;
}

function pointsFor(ids, forcedScale = null) {
  const scale = forcedScale || scaleFor(ids.length);
  const available = slots(ids.length);
  return new Map(ids.map((id, index) => [id, pixel(available[index], scale)]));
}

function boundsFor(positions, aspectRatio, extra = 0) {
  const points = [...positions.values()];
  if (!points.length) return {x: -80, y: -80, width: 160, height: 160};
  const minX = Math.min(...points.map(p => p.x)) - CELL_HALF_X - 12 - extra;
  const maxX = Math.max(...points.map(p => p.x)) + CELL_HALF_X + 12 + extra;
  const minY = Math.min(...points.map(p => p.y)) - CELL_HALF_Y - 30 - extra;
  const maxY = Math.max(...points.map(p => p.y)) + CELL_HALF_Y + 12 + extra;
  let width = Math.max(90, maxX - minX), height = Math.max(90, maxY - minY);
  const ratio = Math.max(.4, Math.min(2.4, Number(aspectRatio) || 1));
  if (width / height < ratio) width = height * ratio;
  else height = width / ratio;
  const cx = (minX + maxX) / 2, cy = (minY + maxY) / 2;
  return {x: cx - width / 2, y: cy - height / 2, width, height};
}


function centeredBoundsForRadius(radius, aspectRatio, padding = 0) {
  const r = Math.max(20, Number(radius) + Number(padding || 0));
  const ratio = Math.max(.4, Math.min(2.4, Number(aspectRatio) || 1));
  let width = r * 2, height = r * 2;
  if (width / height < ratio) width = height * ratio;
  else height = width / ratio;
  return {x: -width / 2, y: -height / 2, width, height};
}

function stableHash(text) {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < String(text).length; i++) {
    h ^= String(text).charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h >>> 0;
}

function groupKey(record, groupBy) {
  if (groupBy === 'typing') return (record.types || record.mechanics?.types || []).join(' / ') || 'Unknown';
  if (groupBy === 'role') return (record.role_ids || ['unclassified'])[0] || 'unclassified';
  if (groupBy === 'species') return record.species_name || record.name;
  return record.generation ? `Generation ${record.generation}` : 'Current';
}

function comparativePlan(records, groupBy, aspectRatio) {
  const groups = new Map();
  for (const record of records) {
    const key = groupKey(record, groupBy);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(record);
  }
  const ordered = [...groups].sort((a, b) => {
    const ag = Number(a[0].match(/\d+/)?.[0] || 99), bg = Number(b[0].match(/\d+/)?.[0] || 99);
    return ag - bg || a[0].localeCompare(b[0]);
  });
  const columns = aspectRatio > 1.15 ? Math.min(4, ordered.length) : aspectRatio < .75 ? Math.min(2, ordered.length) : Math.min(3, ordered.length);
  const local = ordered.map(([key, members]) => {
    const positions = pointsFor(members.map(x => x.id));
    const b = boundsFor(positions, 1);
    return {key, members, positions, width: b.width + 40, height: b.height + 48};
  });
  const colWidths = Array(columns).fill(0), rowHeights = [];
  local.forEach((group, index) => {
    const col = index % columns, row = Math.floor(index / columns);
    colWidths[col] = Math.max(colWidths[col], group.width);
    rowHeights[row] = Math.max(rowHeights[row] || 0, group.height);
  });
  const xOffsets = colWidths.map((_, i) => colWidths.slice(0, i).reduce((a, b) => a + b, 0));
  const yOffsets = rowHeights.map((_, i) => rowHeights.slice(0, i).reduce((a, b) => a + b, 0));
  const totalWidth = colWidths.reduce((a, b) => a + b, 0), totalHeight = rowHeights.reduce((a, b) => a + b, 0);
  const positions = new Map(), labels = [];
  local.forEach((group, index) => {
    const col = index % columns, row = Math.floor(index / columns);
    const cx = -totalWidth / 2 + xOffsets[col] + colWidths[col] / 2;
    const cy = -totalHeight / 2 + yOffsets[row] + rowHeights[row] / 2;
    for (const [id, point] of group.positions) positions.set(id, {x: point.x + cx, y: point.y + cy + 10});
    labels.push({key: group.key, text: `${group.key.toUpperCase()} · ${group.members.length}`, x: cx, y: cy - group.height / 2 + 20});
  });
  return {positions, labels, decorations: [], mode: `compare-${groupBy}`, groups: ordered.length};
}

function pokeballPlan(records, aspectRatio) {
  const ids = records.map(record => record.id);
  const count = ids.length;
  const scale = count > 600 ? 22 : 25;
  let radius = Math.max(8, Math.ceil(Math.sqrt(Math.max(1, count) / 3.1)));
  let accepted = [];
  let outerRadius = 0;
  let bandHalf = scale * 1.42;
  let buttonRadius = scale * 3.0;

  while (accepted.length < count) {
    outerRadius = radius * scale * 1.72;
    bandHalf = Math.max(scale * 1.28, outerRadius * .035);
    buttonRadius = Math.max(scale * 2.7, outerRadius * .085);
    accepted = [];
    for (let q = -radius * 2; q <= radius * 2; q++) {
      for (let r = -radius * 2; r <= radius * 2; r++) {
        const point = pixel({q, r}, scale);
        const distance = Math.hypot(point.x, point.y);
        if (distance > outerRadius) continue;
        const inBand = Math.abs(point.y) < bandHalf;
        const inButton = distance < buttonRadius;
        if (inBand && !inButton) continue;
        accepted.push(point);
      }
    }
    radius += 1;
  }

  accepted.sort((a, b) => {
    const ar = Math.hypot(a.x, a.y), br = Math.hypot(b.x, b.y);
    if (Math.abs(ar - br) > .01) return ar - br;
    return Math.atan2(a.y, a.x) - Math.atan2(b.y, b.x);
  });

  const positions = new Map(ids.map((id, index) => [id, accepted[index]]));
  const decorations = [
    {kind: 'circle', className: 'pokeball-outline', cx: 0, cy: 0, r: outerRadius + scale * .65},
    {kind: 'line', className: 'pokeball-band', x1: -outerRadius * .985, y1: -bandHalf, x2: outerRadius * .985, y2: -bandHalf},
    {kind: 'line', className: 'pokeball-band', x1: -outerRadius * .985, y1: bandHalf, x2: outerRadius * .985, y2: bandHalf},
    {kind: 'circle', className: 'pokeball-button', cx: 0, cy: 0, r: buttonRadius + scale * .45},
  ];
  return {positions, labels: [], decorations, mode: 'pokeball', groups: 1, viewBox: centeredBoundsForRadius(outerRadius + scale * .85, aspectRatio, scale * .35)};
}

function diamondPlan(records, aspectRatio) {
  const ids = records.map(record => record.id);
  const count = ids.length;
  const side = Math.ceil(Math.sqrt(Math.max(1, count)));
  const scale = count > 600 ? 19 : count > 200 ? 22 : 26;
  const positions = new Map();
  ids.forEach((id, index) => {
    const row = Math.floor(index / side);
    const col = index % side;
    const x = (col - row) * scale * 1.18;
    const y = (col + row - (side - 1)) * scale * .72;
    positions.set(id, {x, y});
  });
  return {positions, labels: [], decorations: [], mode: 'diamond', groups: 1, viewBox: boundsFor(positions, aspectRatio, scale * 1.4)};
}

function hexFieldPlan(records, aspectRatio) {
  const positions = pointsFor(records.map(record => record.id), records.length > 600 ? 22 : null);
  return {positions, labels: [], decorations: [], mode: 'polyhex', groups: 1, viewBox: boundsFor(positions, aspectRatio)};
}

function typePredicateValue(expression) {
  if (!expression || typeof expression !== 'object') return null;
  if (expression.kind === 'type' && expression.value) return expression.value;
  for (const key of ['and', 'or']) {
    for (const item of expression[key] || []) {
      const found = typePredicateValue(item);
      if (found) return found;
    }
  }
  if (expression.not) return null;
  return null;
}

export function semanticTypeHint(state) {
  if (!state || state.currentIds?.length === state.populationIds?.length) return null;
  const candidates = [state, ...[...(state.history || [])].reverse()];
  for (const candidate of candidates) {
    const command = candidate?.lastCommand;
    if (!command) continue;
    const directType = typePredicateValue(command.where);
    if (directType) return directType;
    const preservesCurrentTypeLens = command.operation === 'sort' ||
      (['filter', 'omit'].includes(command.operation) && command.source === 'current_projection');
    if (!preservesCurrentTypeLens) return null;
  }
  return null;
}

function typeOrbitPlan(records, primaryType, aspectRatio) {
  const groups = new Map();
  for (const record of records) {
    const types = record.types || record.mechanics?.types || [];
    const partner = types.find(type => type !== primaryType) || 'MONO';
    if (!groups.has(partner)) groups.set(partner, []);
    groups.get(partner).push(record);
  }

  const mono = groups.get('MONO') || [];
  groups.delete('MONO');
  const partners = [...groups.entries()].sort((a, b) => b[1].length - a[1].length || a[0].localeCompare(b[0]));
  const positions = new Map();
  const labels = [];
  const decorations = [];

  let centerRadius = 38;
  if (mono.length) {
    const local = pointsFor(mono.map(record => record.id), mono.length <= 6 ? 28 : 24);
    const b = boundsFor(local, 1);
    centerRadius = Math.max(b.width, b.height) / 2;
    for (const [id, point] of local) positions.set(id, point);
    labels.push({key: 'MONO', text: `${primaryType.toUpperCase()} ONLY · ${mono.length}`, x: 0, y: -centerRadius - 14, className: 'type-center-label'});
  }

  const localGroups = partners.map(([partner, members]) => {
    const scale = members.length <= 3 ? 31 : members.length <= 10 ? 27 : 23;
    const local = pointsFor(members.map(record => record.id), scale);
    const b = boundsFor(local, 1);
    return {partner, members, local, radius: Math.max(b.width, b.height) / 2};
  });

  if (localGroups.length) {
    const maxRadius = Math.max(...localGroups.map(group => group.radius), 35);
    const circumferenceNeed = localGroups.reduce((sum, group) => sum + group.radius * 2 + 24, 0);
    const ringRadius = Math.max(centerRadius + maxRadius + 78, circumferenceNeed / (Math.PI * 2), 155);
    decorations.push({kind: 'circle', className: 'type-orbit-ring', cx: 0, cy: 0, r: ringRadius});
    localGroups.forEach((group, index) => {
      const angle = -Math.PI / 2 + index * (Math.PI * 2 / localGroups.length);
      const cx = Math.cos(angle) * ringRadius;
      const cy = Math.sin(angle) * ringRadius;
      for (const [id, point] of group.local) positions.set(id, {x: point.x + cx, y: point.y + cy});
      const labelDistance = ringRadius + group.radius + 18;
      labels.push({key: group.partner, text: `${primaryType.toUpperCase()} / ${group.partner.toUpperCase()} · ${group.members.length}`, x: Math.cos(angle) * labelDistance, y: Math.sin(angle) * labelDistance + 3, className: 'type-orbit-label'});
    });
  }

  if (!positions.size) return {positions: pointsFor(records.map(record => record.id)), labels: [], decorations: [], mode: 'polyhex', groups: 0};
  return {positions, labels, decorations, mode: 'type-orbit', groups: partners.length + (mono.length ? 1 : 0), viewBox: boundsFor(positions, aspectRatio, 38)};
}

function distanceToSegment(x, y, ax, ay, bx, by) {
  const dx = bx - ax, dy = by - ay;
  const length2 = dx * dx + dy * dy || 1;
  const t = Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / length2));
  const px = ax + t * dx, py = ay + t * dy;
  return Math.hypot(x - px, y - py);
}




function shapeContains(kind, x, y) {
  if (kind === 'Water') {
    if (y < -1.02 || y > 1.02) return false;
    let width;
    if (y <= .22) width = .05 + .74 * Math.pow(Math.max(0, (y + 1.02) / 1.24), .72);
    else width = .78 * Math.sqrt(Math.max(0, 1 - Math.pow((y - .22) / .82, 2)));
    return Math.abs(x) <= width;
  }
  if (kind === 'Fire') {
    const base = y >= -.16 && y <= 1.02 && Math.abs(x) <= .12 + .64 * Math.sqrt(Math.max(0, 1 - Math.pow((y - .42) / .66, 2)));
    const centralProgress = Math.max(0, Math.min(1, (y + 1.05) / 1.50));
    const central = y >= -1.05 && y <= .45 && Math.abs(x - (-.10 + .13 * centralProgress)) <= .055 + .24 * centralProgress;
    const leftProgress = Math.max(0, Math.min(1, (y + .58) / .98));
    const left = y >= -.58 && y <= .40 && Math.abs(x - (-.43 + .11 * leftProgress)) <= .055 + .18 * leftProgress;
    const rightProgress = Math.max(0, Math.min(1, (y + .70) / 1.10));
    const right = y >= -.70 && y <= .40 && Math.abs(x - (.40 - .10 * rightProgress)) <= .055 + .17 * rightProgress;
    return base || central || left || right;
  }
  if (kind === 'Grass') {
    const u = (x - y) / Math.SQRT2;
    const v = (x + y) / Math.SQRT2;
    if (Math.abs(u) > 1.02) return false;
    const width = .08 + .48 * Math.pow(Math.max(0, 1 - u * u), .70);
    const curve = -.11 * (1 - u * u) + .06 * u;
    return Math.abs(v - curve) <= width;
  }
  if (kind === 'Electric') {
    const upper = distanceToSegment(x, y, .20, -1.02, -.26, -.18) <= .18;
    const bridge = distanceToSegment(x, y, -.28, -.18, .35, -.18) <= .15;
    const lower = distanceToSegment(x, y, .35, -.18, -.30, 1.02) <= .18;
    return upper || bridge || lower;
  }
  if (kind === 'Dragon') {
    if (y < -1.05 || y > 1.05) return false;
    const center = .46 * Math.sin((y + .08) * Math.PI * 1.30);
    let width = .19 + .055 * (1 - Math.abs(y));
    if (y < -.62) width += .16 * (1 - Math.min(1, Math.abs(y + .78) / .24));
    if (y > .72) width *= .72;
    return Math.abs(x - center) <= width;
  }
  return false;
}

function chooseEvenShapeSlots(points, count) {
  if (points.length <= count) return points.slice(0, count);
  const picked = [];
  const used = new Set();
  const extrema = [
    points.reduce((a,b)=>b.ny<a.ny?b:a, points[0]),
    points.reduce((a,b)=>b.ny>a.ny?b:a, points[0]),
    points.reduce((a,b)=>b.nx<a.nx?b:a, points[0]),
    points.reduce((a,b)=>b.nx>a.nx?b:a, points[0]),
    points.reduce((a,b)=>Math.hypot(b.nx,b.ny)<Math.hypot(a.nx,a.ny)?b:a, points[0]),
  ];
  for (const point of extrema) {
    const index = points.indexOf(point);
    if (index >= 0 && !used.has(index) && picked.length < count) { used.add(index); picked.push(point); }
  }
  const minDist = points.map((point,index) => used.has(index) ? -1 : Math.min(...picked.map(seed => (point.nx-seed.nx)**2 + (point.ny-seed.ny)**2)));
  while (picked.length < count) {
    let best = -1, bestDist = -1;
    for (let i=0;i<points.length;i++) if (!used.has(i) && minDist[i] > bestDist) { bestDist = minDist[i]; best = i; }
    if (best < 0) break;
    used.add(best); picked.push(points[best]); minDist[best] = -1;
    const seed = points[best];
    for (let i=0;i<points.length;i++) {
      if (used.has(i)) continue;
      const point = points[i];
      const distance = (point.nx-seed.nx)**2 + (point.ny-seed.ny)**2;
      if (distance < minDist[i]) minDist[i] = distance;
    }
  }
  return picked;
}

function semanticCandidates(kind, count) {
  const spacing = count > 180 ? 24 : count > 110 ? 27 : count > 45 ? 30 : 34;
  let radius = Math.max(5, Math.ceil(Math.sqrt(Math.max(1, count)) * .82));
  let accepted = [];
  while (accepted.length < count) {
    accepted = [];
    for (let q = -radius * 2; q <= radius * 2; q++) {
      for (let r = -radius * 2; r <= radius * 2; r++) {
        const raw = pixel({q, r}, 1);
        const nx = raw.x / Math.max(1, radius * Math.sqrt(3));
        const ny = raw.y / Math.max(1, radius * 1.5);
        if (!shapeContains(kind, nx, ny)) continue;
        const world = pixel({q, r}, spacing);
        accepted.push({...world, nx, ny, hash: stableHash(`${q}:${r}`)});
      }
    }
    radius += 1;
  }
  return {points: chooseEvenShapeSlots(accepted, count), spacing};
}

const TYPE_ANCHOR = {
  Normal:[.55,.55], Fire:[.62,-.04], Water:[-.62,.06], Electric:[.38,-.68], Grass:[-.62,-.10], Ice:[-.48,-.58],
  Fighting:[.58,.16], Poison:[.76,.03], Ground:[.02,.82], Flying:[.08,-.86], Psychic:[.72,-.36], Bug:[-.62,.18],
  Rock:[-.48,.72], Ghost:[-.72,-.24], Dragon:[.64,-.20], Dark:[-.72,.25], Steel:[.70,.52], Fairy:[-.06,-.78], Stellar:[.56,-.55]
};

function secondaryType(record, primaryType) {
  const types = record.types || record.mechanics?.types || [];
  return types.find(type => type !== primaryType) || null;
}

function assignmentTarget(primaryType, secondary) {
  if (!secondary) {
    if (primaryType === 'Water') return [0,.24];
    if (primaryType === 'Fire') return [0,.34];
    if (primaryType === 'Grass') return [0,0];
    if (primaryType === 'Electric') return [0,-.02];
    if (primaryType === 'Dragon') return [0,0];
    return [0,0];
  }
  const [x,y] = TYPE_ANCHOR[secondary] || [0,0];
  return [x * .92, y * .92];
}

function takeClosestPoint(pool, tx, ty) {
  let bestIndex = 0, bestCost = Infinity;
  for (let i = 0; i < pool.length; i++) {
    const point = pool[i];
    const dx = point.nx - tx, dy = point.ny - ty;
    const cost = dx * dx + dy * dy + (point.hash % 997) * 1e-9;
    if (cost < bestCost) { bestCost = cost; bestIndex = i; }
  }
  return pool.splice(bestIndex, 1)[0];
}

function semanticTypePlan(records, primaryType, aspectRatio) {
  const {points: candidates, spacing} = semanticCandidates(primaryType, records.length);
  const positions = new Map();
  const sourceOrder = new Map(records.map((record, index) => [record.id, index]));
  const mono = records.filter(record => !secondaryType(record, primaryType))
    .sort((a,b)=>(sourceOrder.get(a.id)-sourceOrder.get(b.id)) || stableHash(a.id)-stableHash(b.id));
  const dual = records.filter(record => secondaryType(record, primaryType))
    .sort((a, b) => String(secondaryType(a, primaryType)).localeCompare(String(secondaryType(b, primaryType))) || (sourceOrder.get(a.id)-sourceOrder.get(b.id)) || stableHash(a.id)-stableHash(b.id));

  // Reserve the most central shape slots for pure types first, but do not occupy
  // them yet. This guarantees the v1 morph rule: mono types define the core,
  // secondary typings pull toward semantic anchor zones around that core.
  const [coreX, coreY] = assignmentTarget(primaryType, null);
  const rankedCore = [...candidates].sort((a,b) => {
    const ad=(a.nx-coreX)**2+(a.ny-coreY)**2;
    const bd=(b.nx-coreX)**2+(b.ny-coreY)**2;
    return ad-bd || a.hash-b.hash;
  });
  const reservedSet = new Set(rankedCore.slice(0, mono.length));
  const monoPool = candidates.filter(point => reservedSet.has(point));
  const dualPool = candidates.filter(point => !reservedSet.has(point));

  const dualGroups = new Map();
  for (const record of dual) {
    const secondary = secondaryType(record, primaryType);
    if (!dualGroups.has(secondary)) dualGroups.set(secondary, []);
    dualGroups.get(secondary).push(record);
  }
  const grouped = [...dualGroups.entries()].sort((a,b) => b[1].length-a[1].length || a[0].localeCompare(b[0]));
  let remainingDual = dual.length;
  let round = 0;
  while (remainingDual > 0) {
    for (const [secondary, members] of grouped) {
      const record = members[round];
      if (!record) continue;
      const [tx, ty] = assignmentTarget(primaryType, secondary);
      const chosen = takeClosestPoint(dualPool, tx, ty);
      positions.set(record.id, {x: chosen.x, y: chosen.y});
      remainingDual -= 1;
    }
    round += 1;
  }
  for (const record of mono) {
    const chosen = takeClosestPoint(monoPool, coreX, coreY);
    positions.set(record.id, {x: chosen.x, y: chosen.y});
  }

  const labels = [{key: primaryType, text: `${primaryType.toUpperCase()} · ${records.length}`, x: 0, y: Math.min(...[...positions.values()].map(p => p.y)) - spacing * .72, className: 'semantic-shape-label'}];
  const decorations = [];
  if (primaryType === 'Grass') {
    const b = boundsFor(positions, 1);
    decorations.push({kind:'line', className:'semantic-vein', x1:b.x + b.width*.28, y1:b.y + b.height*.75, x2:b.x + b.width*.72, y2:b.y + b.height*.25});
  }
  if (primaryType === 'Dragon') {
    const top = [...positions.values()].reduce((best,p)=>p.y<best.y?p:best,[...positions.values()][0]);
    decorations.push({kind:'circle', className:'semantic-head-ring', cx:top.x, cy:top.y, r:spacing*.72});
  }
  return {positions, labels, decorations, mode: `type-shape-${primaryType.toLowerCase()}`, groups: 1, viewBox: boundsFor(positions, aspectRatio, spacing * 1.20)};
}

export function ultimateProjectionPlan(state, records, aspectRatio = 1, presentationShape = 'pokeball') {
  const comparative = state.recordKind === 'historical_state' && state.groupBy;
  if (comparative) {
    const plan = comparativePlan(records, state.groupBy, aspectRatio);
    return {...plan, visible: new Set(records.map(record => record.id)), count: records.length, viewBox: boundsFor(plan.positions, aspectRatio)};
  }

  const allVisible = state?.populationIds?.length && records.length === state.populationIds.length;
  if (allVisible) {
    let plan;
    if (presentationShape === 'diamond') plan = diamondPlan(records, aspectRatio);
    else if (presentationShape === 'hex') plan = hexFieldPlan(records, aspectRatio);
    else plan = pokeballPlan(records, aspectRatio);
    return {...plan, visible: new Set(records.map(record => record.id)), count: records.length};
  }

  const primaryType = semanticTypeHint(state);
  if (primaryType && records.every(record => (record.types || record.mechanics?.types || []).includes(primaryType))) {
    const plan = SEMANTIC_SHAPES.has(primaryType) ? semanticTypePlan(records, primaryType, aspectRatio) : typeOrbitPlan(records, primaryType, aspectRatio);
    return {...plan, visible: new Set(records.map(record => record.id)), count: records.length};
  }

  const positions = pointsFor(records.map(record => record.id));
  const mode = records.length === 1 ? 'hero' : records.length <= 6 ? 'formation' : 'polyhex';
  return {positions, labels: [], decorations: [], mode, groups: 0, visible: new Set(records.map(record => record.id)), count: records.length, viewBox: boundsFor(positions, aspectRatio)};
}

export function projectionScaleGain(fullPlan, filteredPlan) {
  return fullPlan?.viewBox?.width && filteredPlan?.viewBox?.width ? fullPlan.viewBox.width / filteredPlan.viewBox.width : 1;
}
