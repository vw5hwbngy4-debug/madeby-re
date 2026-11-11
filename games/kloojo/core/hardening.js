export function pointSegmentDistanceSquared3D(point,start,end){
  const abx=end.x-start.x,aby=end.y-start.y,abz=end.z-start.z;
  const apx=point.x-start.x,apy=point.y-start.y,apz=point.z-start.z;
  const lengthSq=abx*abx+aby*aby+abz*abz;
  const t=lengthSq>1e-9?Math.max(0,Math.min(1,(apx*abx+apy*aby+apz*abz)/lengthSq)):0;
  const dx=start.x+abx*t-point.x,dy=start.y+aby*t-point.y,dz=start.z+abz*t-point.z;
  return dx*dx+dy*dy+dz*dz;
}

export function sweptCollectsPoint(previous,current,point,radius=1.9){
  return pointSegmentDistanceSquared3D(point,previous,current)<=radius*radius;
}

export function rampShellDescriptor(ramp){
  return{name:ramp.name,cx:ramp.cx,cz:ramp.cz,w:ramp.w,l:ramp.l,h:ramp.h,rot:ramp.rot,faces:['side-left','side-right','high-end'],rideSurface:'canonical-rampSurface'};
}

export function portalClearsRamp(portal,ramp,padding=1){
  const dx=portal.x-ramp.cx,dz=portal.z-ramp.cz,c=Math.cos(-ramp.rot),s=Math.sin(-ramp.rot);
  const lx=dx*c-dz*s,lz=dx*s+dz*c;
  return Math.abs(lx)>ramp.w/2+padding||Math.abs(lz)>ramp.l/2+padding;
}

export function decayHalfpipeEnergy(energy,dt,pumping=false){
  const passive=Math.max(0,energy)*Math.exp(-.23*Math.max(0,dt));
  return Math.min(24,pumping?passive+5.2*Math.max(0,dt):passive);
}


export function halfpipeSlopeAssist(u,dt,extraGravity=18.0){
  const clamped=Math.max(-1,Math.min(1,Number.isFinite(u)?u:0));
  return -clamped*Math.max(0,dt)*extraGravity;
}

export function halfpipeDirectionalPumpDelta({inputCross=0,cross=0,u=0,energy=0,dt=0,maxEnergy=28.5}={}){
  if(Math.abs(inputCross)<.28||Math.abs(cross)<1.1||Math.sign(inputCross)!==Math.sign(cross)||Math.abs(u)<.10||Math.abs(u)>.84)return 0;
  const headroom=Math.max(0,Math.min(1,(maxEnergy-Math.max(0,energy))/maxEnergy));
  const strength=(6.2+6.6*headroom)*Math.min(1,Math.abs(inputCross));
  return Math.sign(cross)*strength*Math.max(0,dt);
}

export function halfpipeRotationTier(radians){
  const degrees=Math.abs(radians)*180/Math.PI;
  for(const tier of[720,540,360,180])if(degrees>=tier-22)return tier;
  return 0;
}

export function shouldHalfpipeNeutral({u,cross,energy}){
  return Math.abs(u)<.28&&Math.abs(cross)<3.3&&energy<3.8;
}

export function shouldHalfpipeLongitudinalExit({u,cross,inputAlong}){
  return Math.abs(u)<.55&&Math.abs(cross)<9&&Math.abs(inputAlong)>.62;
}
