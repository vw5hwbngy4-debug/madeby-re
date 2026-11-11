import {SECTION_IDS} from './hunt-router-core.js';

const uniq=a=>[...new Set((a||[]).filter(Boolean))];
const routeCmp=(a,b)=>Number(a?.expectedKills||Infinity)-Number(b?.expectedKills||Infinity)||SECTION_IDS.indexOf(a?.sectionId)-SECTION_IDS.indexOf(b?.sectionId)||String(a?.monster||'').localeCompare(String(b?.monster||''));
function combinations(list,k,start=0,prefix=[],out=[]){if(prefix.length===k){out.push(prefix.slice());return out}for(let i=start;i<=list.length-(k-prefix.length);i++){prefix.push(list[i]);combinations(list,k,i+1,prefix,out);prefix.pop()}return out}
function huntItems(plan){return (plan?.items||[]).filter(x=>!x.owned&&x.globalBest)}
function routeAllowed(item,row,globalOnly){if(!row)return false;if(!globalOnly)return true;return Math.abs(Number(row.expectedKills)-Number(item.globalBest?.expectedKills))<1e-9}
function evalNetwork(items,ids,{globalOnly=false}={}){
  const selected=uniq(ids),assignments=[],missing=[];let totalExpectedKills=0;
  for(const item of items){let best=null;for(const sid of selected){const r=item.bySection?.[sid];if(routeAllowed(item,r,globalOnly)&&(!best||routeCmp(r,best)<0))best=r}if(best){assignments.push({item:item.item,route:best});totalExpectedKills+=Number(best.expectedKills)}else missing.push(item.item)}
  return {sectionIds:selected,coverage:assignments.length,totalItems:items.length,missing,assignments,totalExpectedKills:Number(totalExpectedKills.toFixed(3))};
}
function solveExtras(items,fixedIds,{globalOnly=false}={}){
  const fixed=uniq(fixedIds).filter(x=>SECTION_IDS.includes(x)),pool=SECTION_IDS.filter(x=>!fixed.includes(x));
  if(!items.length)return {...evalNetwork(items,fixed,{globalOnly}),additionalIds:[]};
  let best=null;
  for(let k=0;k<=pool.length;k++){
    for(const extras of combinations(pool,k)){
      const net=evalNetwork(items,[...fixed,...extras],{globalOnly});net.additionalIds=extras;
      if(net.coverage<items.length)continue;
      if(!best||net.totalExpectedKills<best.totalExpectedKills-1e-9||(Math.abs(net.totalExpectedKills-best.totalExpectedKills)<1e-9&&extras.join('|').localeCompare(best.additionalIds.join('|'))<0))best=net;
    }
    if(best)return best;
  }
  // Data-hole fallback: maximize coverage, then use fewer extras, then lower route sum.
  for(let k=0;k<=pool.length;k++)for(const extras of combinations(pool,k)){
    const net=evalNetwork(items,[...fixed,...extras],{globalOnly:false});net.additionalIds=extras;
    if(!best||net.coverage>best.coverage||(net.coverage===best.coverage&&extras.length<best.additionalIds.length)||(net.coverage===best.coverage&&extras.length===best.additionalIds.length&&net.totalExpectedKills<best.totalExpectedKills))best=net;
  }
  return best||{sectionIds:fixed,coverage:0,totalItems:items.length,missing:items.map(x=>x.item),assignments:[],totalExpectedKills:0,additionalIds:[]};
}
function classMeta(canon,name){return (canon?.classes||[]).find(x=>x.name===name)||null}
function reachableMagSynergy(matrix,sectionId){
  return (matrix||[]).filter(x=>x?.reachable&&(x.sectionIds||[]).includes(sectionId)).map(x=>({target:x.target,holderClasses:[...(x.holderClasses||[])],earliestLevel:x.earliestLevel,equation:x.equationText||x.equation||null}));
}
function classSynergy(matrix,sectionId,canon){
  const rows=reachableMagSynergy(matrix,sectionId),counts=new Map();
  for(const row of rows)for(const cls of row.holderClasses)counts.set(cls,(counts.get(cls)||0)+1);
  const max=Math.max(0,...counts.values());
  const classes=[...counts.entries()].filter(([,n])=>n===max&&n>0).map(([name])=>({name,meta:classMeta(canon,name),targets:rows.filter(r=>r.holderClasses.includes(name)).map(r=>r.target)}));
  return {count:rows.length,targets:rows.map(r=>r.target),bestClassOptions:classes};
}
function assignmentsForSid(network,sid){return (network?.assignments||[]).filter(x=>x.route?.sectionId===sid).map(x=>x.item)}
function nodeForCurrent(decoded,network){const sid=decoded.character.section_id.name;return {id:'CURRENT',kind:'current',characterName:decoded.character.name,className:decoded.character.class.name,classOptions:[decoded.character.class.name],sectionId:sid,roles:['SAVE TRUTH','HUNT START'],huntAssignments:assignmentsForSid(network,sid)} }
function nodeForHandoff(candidate,endpoint,matrix,canon,network,currentSid){
  const meta=(endpoint.holderClasses||[]).map(x=>classMeta(canon,x)).filter(Boolean),genders=uniq(meta.map(x=>x.gender)),types=uniq(meta.map(x=>x.type)),hunt= candidate.sectionId!==currentSid?assignmentsForSid(network,candidate.sectionId):[];
  return {id:'HANDOFF',kind:'handoff',className:null,classOptions:[...(endpoint.holderClasses||[])],genderOptions:genders,typeOptions:types,sectionId:candidate.sectionId,roles:[`${endpoint.target} HANDOFF`,...(hunt.length?['HUNT ID']:[])],huntAssignments:hunt,mag:{target:endpoint.target,earliestLevel:endpoint.earliestLevel,equation:endpoint.equationText||endpoint.equation,checkpoint:endpoint.checkpoint},futureMagSynergy:reachableMagSynergy(matrix,candidate.sectionId)};
}
function nodeForHunt(sid,index,matrix,canon,network){const synergy=classSynergy(matrix,sid,canon);return {id:`ALT${index}`,kind:'hunt',className:null,classOptions:[],sectionId:sid,roles:['HUNT ID'],huntAssignments:assignmentsForSid(network,sid),futureMagSynergy:reachableMagSynergy(matrix,sid),optionalMagClassOptions:synergy.bestClassOptions};}
function buildNodes(decoded,candidate,endpoint,matrix,canon,network){
  const currentSid=decoded.character.section_id.name,nodes=[nodeForCurrent(decoded,network)];let i=1;
  if(candidate?.handoffRequired){nodes.push(nodeForHandoff(candidate,endpoint,matrix,canon,network,currentSid));i++}
  for(const sid of network.additionalIds||[])nodes.push(nodeForHunt(sid,i++,matrix,canon,network));
  return nodes;
}
function candidateRows(decoded,magPlan,huntPlan,canon){
  const currentSid=decoded.character.section_id.name,items=huntItems(huntPlan),endpoint=magPlan?.endpoint,matrix=magPlan?.matrix||[];
  const handoffRequired=Boolean(endpoint?.reachable&&endpoint.handoffRequired),candidateIds=handoffRequired?uniq(endpoint.sectionIds):[null];
  const noHandoffCompact=solveExtras(items,[currentSid],{globalOnly:false});
  const noHandoffFast=solveExtras(items,[currentSid],{globalOnly:true});
  return candidateIds.map(sectionId=>{
    const fixed=uniq([currentSid,sectionId]),compact=solveExtras(items,fixed,{globalOnly:false}),fastest=solveExtras(items,fixed,{globalOnly:true});
    const handoffChars=handoffRequired?1:0,compactCount=handoffChars+compact.additionalIds.length,fastCount=handoffChars+fastest.additionalIds.length;
    const synergy=sectionId?classSynergy(matrix,sectionId,canon):{count:0,targets:[],bestClassOptions:[]};
    const currentPlusCandidate=evalNetwork(items,fixed);
    const baselineHandoffOnCurrent=handoffRequired&&endpoint.sectionIds?.includes(currentSid);
    const baselineCompactChars=(handoffRequired?1:0)+noHandoffCompact.additionalIds.length;
    const baselineFastChars=(handoffRequired?1:0)+noHandoffFast.additionalIds.length;
    return {sectionId,handoffRequired,holderClasses:handoffRequired?[...(endpoint.holderClasses||[])]:[],newSectionId:Boolean(sectionId&&sectionId!==currentSid),currentPlusCandidate,compact,fastest,compactAlternateCharacters:compactCount,fastestAlternateCharacters:fastCount,compactCharactersSaved:Math.max(0,baselineCompactChars-compactCount),fastestCharactersSaved:Math.max(0,baselineFastChars-fastCount),futureMagUtility:synergy.count,futureMagTargets:synergy.targets,baselineHandoffOnCurrent};
  });
}
function sidRank(s){return s==null?-1:SECTION_IDS.indexOf(s)}
function chooseCompact(rows,currentSid){return rows.slice().sort((a,b)=>a.compactAlternateCharacters-b.compactAlternateCharacters||a.compact.totalExpectedKills-b.compact.totalExpectedKills||Number(b.sectionId===currentSid)-Number(a.sectionId===currentSid)||b.futureMagUtility-a.futureMagUtility||sidRank(a.sectionId)-sidRank(b.sectionId))[0]||null}
function chooseFastest(rows,currentSid){return rows.slice().sort((a,b)=>a.fastestAlternateCharacters-b.fastestAlternateCharacters||a.fastest.totalExpectedKills-b.fastest.totalExpectedKills||Number(b.sectionId===currentSid)-Number(a.sectionId===currentSid)||b.futureMagUtility-a.futureMagUtility||sidRank(a.sectionId)-sidRank(b.sectionId))[0]||null}
function buildMode(decoded,choice,endpoint,matrix,canon,mode){
  if(!choice)return null;const network=mode==='fastest'?choice.fastest:choice.compact,nodes=buildNodes(decoded,choice,endpoint,matrix,canon,network),altCount=mode==='fastest'?choice.fastestAlternateCharacters:choice.compactAlternateCharacters,saved=mode==='fastest'?choice.fastestCharactersSaved:choice.compactCharactersSaved;
  return {mode,alternateCharacterCount:altCount,totalAccountCharacters:altCount+1,sectionIds:uniq(nodes.map(x=>x.sectionId)),network:{coverage:network.coverage,totalItems:network.totalItems,missing:network.missing,totalExpectedKills:network.totalExpectedKills,assignments:network.assignments.map(x=>({item:x.item,sectionId:x.route.sectionId,monster:x.route.monster,area:x.route.area,difficulty:x.route.difficulty,episode:x.route.episode,rate:x.route.rate,expectedKills:x.route.expectedKills}))},nodes,merge:{handoffSectionId:choice.sectionId,charactersSaved:saved,mergedHandoffAndHunt:Boolean(choice.handoffRequired&&choice.sectionId&&choice.sectionId!==decoded.character.section_id.name&&assignmentsForSid(network,choice.sectionId).length),futureMagUtility:choice.futureMagUtility,futureMagTargets:choice.futureMagTargets}};
}

export function buildAccountRoute({decoded,magPlan,huntPlan,canon}){
  if(!decoded?.valid||!decoded?.trusted||!decoded?.character)return {valid:false,kind:'account_router',version:'0.4',reason:'verified_save_required'};
  const currentSid=decoded.character.section_id.name,endpoint=magPlan?.endpoint||null,matrix=magPlan?.matrix||[],target=magPlan?.targetMag||null;
  const rows=candidateRows(decoded,magPlan,huntPlan,canon),compactChoice=chooseCompact(rows,currentSid),fastChoice=chooseFastest(rows,currentSid),compact=buildMode(decoded,compactChoice,endpoint,matrix,canon,'compact'),fastest=buildMode(decoded,fastChoice,endpoint,matrix,canon,'fastest');
  const magRequirement=endpoint?{target,reachable:Boolean(endpoint.reachable),self:Boolean(endpoint.self),handoffRequired:Boolean(endpoint.handoffRequired),holderClasses:[...(endpoint.holderClasses||[])],sectionIds:[...(endpoint.sectionIds||[])],earliestLevel:endpoint.earliestLevel||null,equation:endpoint.equationText||endpoint.equation||null,checkpoint:endpoint.checkpoint||null}:null;
  const candidateScoreboard=rows.map(r=>({sectionId:r.sectionId,holderClasses:r.holderClasses,newSectionId:r.newSectionId,compactAlternateCharacters:r.compactAlternateCharacters,compactExpectedKills:r.compact.totalExpectedKills,fastestAlternateCharacters:r.fastestAlternateCharacters,fastestExpectedKills:r.fastest.totalExpectedKills,compactCharactersSaved:r.compactCharactersSaved,fastestCharactersSaved:r.fastestCharactersSaved,futureMagUtility:r.futureMagUtility,futureMagTargets:r.futureMagTargets,currentPlusCandidateCoverage:r.currentPlusCandidate.coverage,currentPlusCandidateTotal:r.currentPlusCandidate.totalItems}));
  return {valid:true,kind:'account_router',version:'0.4',platform:'GameCube / Xbox',source:'verified_xbox_pso_save + deterministic_mag_canon + deterministic_drop_router',currentCharacter:{name:decoded.character.name,className:decoded.character.class.name,sectionId:currentSid,level:decoded.character.level},selectedMagTarget:target,magRequirement,wishlist:huntPlan?.wishlist||[],owned:huntPlan?.owned||[],unresolved:(huntPlan?.unresolved||[]).map(x=>x.input),compactAccount:compact,fastestAccount:fastest,candidateScoreboard,rule:'Minimize alternate characters by merging a required MAG handoff with useful Section-ID hunt coverage when possible. Class/gender never changes drop rates; class constraints are applied only where MAG evolution requires them.'};
}

function smallNode(n){return {kind:n.kind,className:n.className,classOptions:n.classOptions,sectionId:n.sectionId,roles:n.roles,huntAssignments:n.huntAssignments,mag:n.mag||null,optionalMagClassOptions:(n.optionalMagClassOptions||[]).slice(0,6).map(x=>({name:x.name,targets:x.targets}))};}
function smallMode(m){return m?{mode:m.mode,alternateCharacterCount:m.alternateCharacterCount,totalAccountCharacters:m.totalAccountCharacters,sectionIds:m.sectionIds,network:{coverage:m.network.coverage,totalItems:m.network.totalItems,missing:m.network.missing,totalExpectedKills:m.network.totalExpectedKills,assignments:m.network.assignments},nodes:m.nodes.map(smallNode),merge:m.merge}:null}
export function deterministicAccountFacts(plan){if(!plan?.valid)return null;return {kind:'ACCOUNT_ROUTER',version:'0.4',platform:plan.platform,currentCharacter:plan.currentCharacter,selectedMagTarget:plan.selectedMagTarget,magRequirement:plan.magRequirement,wishlist:plan.wishlist,owned:plan.owned,compactAccount:smallMode(plan.compactAccount),fastestAccount:smallMode(plan.fastestAccount),rule:'This is machine-computed account topology. VERIFIED SAVE fields are authoritative. A MAG holder class/Section ID is mandatory only when the selected endpoint says so. Hunt routes use packaged GameCube/Xbox data; class does not affect Section-ID drops. Prefer a merged handoff+hunt node when it reduces alternate character count without violating the MAG endpoint.'};}
