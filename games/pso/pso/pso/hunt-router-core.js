export const SECTION_IDS=['Viridia','Greenill','Skyly','Bluefull','Purplenum','Pinkal','Redria','Oran','Yellowboze','Whitill'];

export function normalizeItemName(value){
  return String(value??'').normalize('NFKC').replace(/[’‘]/g,"'").replace(/\s+/g,' ').trim().toLowerCase();
}
function loose(value){return normalizeItemName(value).replace(/[^a-z0-9]+/g,'');}
function validExpected(row){const n=Number(row?.expectedKills);return Number.isFinite(n)&&n>0&&row?.item&&row.item!=='-';}
function cmpRoute(a,b){return Number(a.expectedKills)-Number(b.expectedKills)||SECTION_IDS.indexOf(a.sectionId)-SECTION_IDS.indexOf(b.sectionId)||String(a.monster).localeCompare(String(b.monster));}
function chooseBest(rows){return rows.slice().sort(cmpRoute)[0]||null;}
function combinations(list,k,start=0,prefix=[],out=[]){if(prefix.length===k){out.push(prefix.slice());return out}for(let i=start;i<=list.length-(k-prefix.length);i++){prefix.push(list[i]);combinations(list,k,i+1,prefix,out);prefix.pop()}return out}

export function prepareDropDatabase(raw){
  const records=(Array.isArray(raw)?raw:Array.isArray(raw?.records)?raw.records:[])
    .filter(r=>String(r?.platform||'GameCube / Xbox')==='GameCube / Xbox'&&validExpected(r))
    .map(r=>({...r,expectedKills:Number(r.expectedKills),percent:Number(r.percent)||0}));
  const canonical=new Map(), looseMap=new Map();
  for(const r of records){
    const key=normalizeItemName(r.item);if(!canonical.has(key))canonical.set(key,r.item);
    const lk=loose(r.item);if(!looseMap.has(lk))looseMap.set(lk,new Set());looseMap.get(lk).add(key);
  }
  return {source:raw?.source||'PSOGC Drop Charts',platform:'GameCube / Xbox',sourceRecordCount:Array.isArray(raw?.records)?raw.records.length:records.length,records,items:[...canonical.values()].sort((a,b)=>a.localeCompare(b)),canonical,looseMap};
}

export function resolveItem(db,input){
  const raw=String(input??'').trim();if(!raw)return {ok:false,input:raw,reason:'empty'};
  const exact=normalizeItemName(raw);if(db.canonical.has(exact))return {ok:true,input:raw,item:db.canonical.get(exact),key:exact,match:'exact'};
  const lk=loose(raw),set=db.looseMap.get(lk);if(set?.size===1){const key=[...set][0];return {ok:true,input:raw,item:db.canonical.get(key),key,match:'punctuation'};}
  const candidates=db.items.filter(x=>normalizeItemName(x).includes(exact)||exact.includes(normalizeItemName(x))).slice(0,8);
  if(candidates.length===1){const item=candidates[0],key=normalizeItemName(item);return {ok:true,input:raw,item,key,match:'unique-substring'};}
  return {ok:false,input:raw,reason:candidates.length?'ambiguous':'not_found',candidates};
}

export function ownedNamesFromSave(decoded){
  if(!decoded?.valid||!decoded?.trusted)return [];
  const names=[];
  for(const it of decoded.inventory||[])if(it?.friendly_name)names.push(it.friendly_name);
  for(const it of decoded.bank?.items||[])if(it?.friendly_name)names.push(it.friendly_name);
  return [...new Set(names)];
}

function bestRoutesBySection(db,item,difficulty='Any'){
  const rows=db.records.filter(r=>normalizeItemName(r.item)===normalizeItemName(item)&&(difficulty==='Any'||r.difficulty===difficulty));
  const grouped=new Map();
  for(const row of rows){const arr=grouped.get(row.sectionId)||[];arr.push(row);grouped.set(row.sectionId,arr)}
  const out={};for(const sid of SECTION_IDS){const r=chooseBest(grouped.get(sid)||[]);if(r)out[sid]=r}return out;
}
function evalNetwork(itemRows,ids){
  const selected=new Set(ids),assignments=[],missing=[];let totalExpectedKills=0;
  for(const item of itemRows){
    let best=null;for(const sid of selected){const r=item.bySection[sid];if(r&&(!best||cmpRoute(r,best)<0))best=r}
    if(best){assignments.push({item:item.item,route:best});totalExpectedKills+=Number(best.expectedKills)}else missing.push(item.item);
  }
  return {sectionIds:[...ids],coverage:assignments.length,totalItems:itemRows.length,missing,assignments,totalExpectedKills:Number(totalExpectedKills.toFixed(3))};
}
function bestSet(itemRows,{currentSectionId=null,globalOnly=false}={}){
  if(!itemRows.length)return {sectionIds:[],coverage:0,totalItems:0,missing:[],assignments:[],totalExpectedKills:0,additionalIds:[]};
  const candidates=SECTION_IDS.slice(),target=itemRows.length,base=currentSectionId&&SECTION_IDS.includes(currentSectionId)?[currentSectionId]:[];
  const extraPool=candidates.filter(x=>!base.includes(x));
  const allowed=(item,sid)=>{const r=item.bySection[sid];if(!r)return false;if(!globalOnly)return true;return Math.abs(Number(r.expectedKills)-Number(item.globalBest.expectedKills))<1e-9};
  let best=null;
  for(let k=0;k<=extraPool.length;k++){
    for(const extras of combinations(extraPool,k)){
      const ids=[...base,...extras];
      const filtered=itemRows.map(item=>({...item,bySection:Object.fromEntries(Object.entries(item.bySection).filter(([sid])=>allowed(item,sid)))}));
      const score=evalNetwork(filtered,ids);score.additionalIds=extras;
      if(score.coverage<target)continue;
      if(!best||score.totalExpectedKills<best.totalExpectedKills-1e-9||(Math.abs(score.totalExpectedKills-best.totalExpectedKills)<1e-9&&ids.join('|').localeCompare(best.sectionIds.join('|'))<0))best=score;
    }
    if(best)return best;
  }
  // Maximum coverage fallback for data holes.
  for(let k=0;k<=extraPool.length;k++)for(const extras of combinations(extraPool,k)){
    const score=evalNetwork(itemRows,[...base,...extras]);score.additionalIds=extras;
    if(!best||score.coverage>best.coverage||(score.coverage===best.coverage&&extras.length<best.additionalIds.length)||(score.coverage===best.coverage&&extras.length===best.additionalIds.length&&score.totalExpectedKills<best.totalExpectedKills))best=score;
  }
  return best;
}
function fastestSet(itemRows,currentSectionId){
  // Exact global-best speed, but minimize how many extra IDs are needed to achieve it.
  return bestSet(itemRows,{currentSectionId:currentSectionId&&SECTION_IDS.includes(currentSectionId)?currentSectionId:null,globalOnly:true});
}
function minimumCoverageSet(itemRows,currentSectionId){return bestSet(itemRows,{currentSectionId:currentSectionId&&SECTION_IDS.includes(currentSectionId)?currentSectionId:null,globalOnly:false});}
function oneAlternate(itemRows,currentSectionId){
  const current=currentSectionId&&SECTION_IDS.includes(currentSectionId)?currentSectionId:null;
  const baseline=evalNetwork(itemRows,current?[current]:[]);
  const rows=SECTION_IDS.filter(s=>s!==current).map(s=>{
    const net=evalNetwork(itemRows,current?[current,s]:[s]);
    let savings=0,newCoverage=0;
    for(const item of itemRows){const before=current?item.bySection[current]:null,after=chooseBest([before,item.bySection[s]].filter(Boolean));if(!before&&after)newCoverage++;else if(before&&after)savings+=Math.max(0,Number(before.expectedKills)-Number(after.expectedKills));}
    return {...net,alternate:s,newCoverage,expectedKillSavings:Number(savings.toFixed(3)),additionalIds:[s]};
  }).sort((a,b)=>b.coverage-a.coverage||b.newCoverage-a.newCoverage||b.expectedKillSavings-a.expectedKillSavings||a.totalExpectedKills-b.totalExpectedKills||SECTION_IDS.indexOf(a.alternate)-SECTION_IDS.indexOf(b.alternate));
  return {baseline,best:rows[0]||null,alternates:rows};
}

export function planAllIdHunts(db,wishlist,{currentSectionId=null,difficulty='Any',ownedItemNames=[]}={}){
  const seen=new Set(),resolved=[],unresolved=[];
  for(const x of wishlist||[]){const hit=resolveItem(db,x);if(!hit.ok){unresolved.push(hit);continue}if(seen.has(hit.key))continue;seen.add(hit.key);resolved.push(hit)}
  const ownedSet=new Set((ownedItemNames||[]).map(normalizeItemName));
  const items=resolved.map(hit=>{
    const bySection=bestRoutesBySection(db,hit.item,difficulty),routes=Object.values(bySection).sort(cmpRoute),globalBest=routes[0]||null,globalBestSectionIds=globalBest?routes.filter(r=>Math.abs(r.expectedKills-globalBest.expectedKills)<1e-9).map(r=>r.sectionId):[];
    return {item:hit.item,key:hit.key,owned:ownedSet.has(hit.key),bySection,globalBest,globalBestSectionIds,currentRoute:currentSectionId?bySection[currentSectionId]||null:null};
  });
  const huntItems=items.filter(x=>!x.owned&&x.globalBest);
  const impossible=items.filter(x=>!x.owned&&!x.globalBest).map(x=>x.item);
  const current=currentSectionId&&SECTION_IDS.includes(currentSectionId)?evalNetwork(huntItems,[currentSectionId]):evalNetwork(huntItems,[]);
  const one=oneAlternate(huntItems,currentSectionId);
  const oneTies=one.best?one.alternates.filter(x=>x.coverage===one.best.coverage&&x.newCoverage===one.best.newCoverage&&Math.abs(x.expectedKillSavings-one.best.expectedKillSavings)<1e-9&&Math.abs(x.totalExpectedKills-one.best.totalExpectedKills)<1e-9).map(x=>x.alternate):[];
  const fastest=fastestSet(huntItems,currentSectionId);
  const minimum=minimumCoverageSet(huntItems,currentSectionId);
  return {kind:'all_id_hunt_router',version:'0.3',platform:'GameCube / Xbox',difficulty,currentSectionId:currentSectionId&&SECTION_IDS.includes(currentSectionId)?currentSectionId:null,wishlist:resolved.map(x=>x.item),owned:items.filter(x=>x.owned).map(x=>x.item),unresolved,impossible,items,currentCoverage:current,bestOneAlternate:one.best,bestOneAlternateTies:oneTies,alternateRanking:one.alternates,fastestNetwork:fastest,minimumCoverageNetwork:minimum,dataset:{source:db.source,sourceRows:db.sourceRecordCount,routableRows:db.records.length,sectionIds:SECTION_IDS.length,items:db.items.length}};
}

export function extractKnownItemsFromText(db,text,max=12){
  const q=normalizeItemName(text),hits=[];
  for(const item of db.items.slice().sort((a,b)=>b.length-a.length)){
    const n=normalizeItemName(item);if(n.length<4)continue;
    if(q.includes(n)){hits.push(item);if(hits.length>=max)break}
  }
  return hits;
}

function routeFact(r){return r?{sectionId:r.sectionId,episode:r.episode,difficulty:r.difficulty,area:r.area,monster:r.monster,rate:r.rate,expectedKills:r.expectedKills}:null}
export function deterministicHuntFacts(plan){
  if(!plan)return null;
  return {kind:'ALL_ID_HUNT_ROUTER',version:'0.3',platform:plan.platform,difficulty:plan.difficulty,currentSectionId:plan.currentSectionId,wishlist:plan.wishlist,ownedAlready:plan.owned,unresolved:plan.unresolved.map(x=>x.input),currentCoverage:{covered:plan.currentCoverage.coverage,total:plan.currentCoverage.totalItems,missing:plan.currentCoverage.missing,totalExpectedKills:plan.currentCoverage.totalExpectedKills},bestOneAlternate:plan.bestOneAlternate?{sectionId:plan.bestOneAlternate.alternate,equivalentSectionIds:plan.bestOneAlternateTies,covered:plan.bestOneAlternate.coverage,total:plan.bestOneAlternate.totalItems,newCoverage:plan.bestOneAlternate.newCoverage,expectedKillSavings:plan.bestOneAlternate.expectedKillSavings,totalExpectedKills:plan.bestOneAlternate.totalExpectedKills}:null,fastestNetwork:{sectionIds:plan.fastestNetwork.sectionIds,additionalIds:plan.fastestNetwork.additionalIds,covered:plan.fastestNetwork.coverage,total:plan.fastestNetwork.totalItems,totalExpectedKills:plan.fastestNetwork.totalExpectedKills},minimumCoverageNetwork:{sectionIds:plan.minimumCoverageNetwork.sectionIds,additionalIds:plan.minimumCoverageNetwork.additionalIds,covered:plan.minimumCoverageNetwork.coverage,total:plan.minimumCoverageNetwork.totalItems,totalExpectedKills:plan.minimumCoverageNetwork.totalExpectedKills},items:plan.items.slice(0,16).map(x=>({item:x.item,owned:x.owned,currentRoute:routeFact(x.currentRoute),globalBest:routeFact(x.globalBest),globalBestSectionIds:x.globalBestSectionIds})),rule:'Machine-computed only from packaged GameCube/Xbox drop rows. Do not invent missing drops or blend Blue Burst. Verified save Section ID and resolved owned item names are authoritative when present.'};
}
