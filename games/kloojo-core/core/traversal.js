export const TRAVERSAL_KINDS=Object.freeze(['vaultable','mantleable','ledge','wallrun','wallclimb','swing','climbHold']);

export function isTraversalSurface(surface){
  return !!surface&&TRAVERSAL_KINDS.includes(surface.kind)&&typeof surface.id==='string'&&surface.id.length>0;
}

export function traversalRangeContains(surface,point,padding=0){
  if(!isTraversalSurface(surface))return false;
  const min=surface.min??-Infinity,max=surface.max??Infinity,bottom=surface.bottom??-Infinity,top=surface.top??Infinity;
  const along=surface.axis==='x'?point.z:point.x;
  return along>=min-padding&&along<=max+padding&&point.y>=bottom-padding&&point.y<=top+padding;
}

export function wallDistance(surface,point){
  if(!isTraversalSurface(surface)||(surface.axis!=='x'&&surface.axis!=='z'))return Infinity;
  return Math.abs((surface.axis==='x'?point.x:point.z)-surface.coord);
}

export function suitableWallApproach(surface,point,velocity,{maxDistance=1.45,minSpeed=7,minNormalSpeed=1.25}={}){
  if(!traversalRangeContains(surface,point,1.2)||wallDistance(surface,point)>maxDistance)return false;
  const speed=Math.hypot(velocity.x,velocity.z),normalSpeed=Math.abs(surface.axis==='x'?velocity.x:velocity.z);
  return speed>=minSpeed&&normalSpeed>=minNormalSpeed;
}

export function vaultArc(start,end,height,t){
  const q=Math.max(0,Math.min(1,t)),smooth=q*q*(3-2*q);
  return{x:start.x+(end.x-start.x)*smooth,y:start.y+(end.y-start.y)*smooth+Math.sin(Math.PI*q)*height,z:start.z+(end.z-start.z)*smooth};
}

export function canReachLedge(ledge,point,facing,{horizontal=1.65,vertical=2.25,minFacing=.18}={}){
  if(!ledge||ledge.kind!=='ledge'||!traversalRangeContains(ledge,point,horizontal))return false;
  const normal=ledge.normal||{x:0,z:0},dx=(ledge.axis==='x'?ledge.coord:point.x)-point.x,dz=(ledge.axis==='z'?ledge.coord:point.z)-point.z;
  return Math.hypot(dx,dz)<=horizontal&&Math.abs(point.y-ledge.top)<=vertical&&(facing.x*(-normal.x)+facing.z*(-normal.z))>=minFacing;
}

export function chooseClimbNeighbor(hold,holds,direction){
  if(!hold||!Array.isArray(hold.neighbors))return null;
  const candidates=hold.neighbors.map(id=>holds.find(h=>h.id===id)).filter(Boolean);
  let best=null,bestDot=.25;
  for(const candidate of candidates){const dx=candidate.position.x-hold.position.x,dy=candidate.position.y-hold.position.y,dz=candidate.position.z-hold.position.z,len=Math.hypot(dx,dy,dz)||1,dot=(dx*direction.x+dy*direction.y+dz*direction.z)/len;if(dot>bestDot){bestDot=dot;best=candidate}}
  return best;
}

export function transferVelocity(velocity,normal,tangentSign=1){
  const speed=Math.max(7,Math.hypot(velocity.x,velocity.z)*.82),tx=normal.z*tangentSign,tz=-normal.x*tangentSign;
  return{x:normal.x*5.4+tx*speed,y:Math.max(4.8,velocity.y*.55),z:normal.z*5.4+tz*speed};
}

export function recoveredHorizontalSpeed(speed,timed){
  return Math.max(0,speed*(timed?.78:.42));
}
