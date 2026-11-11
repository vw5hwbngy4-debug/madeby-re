(function(){
const B=window.PSO_BUNDLE;
const SIDS=['Viridia','Greenill','Skyly','Bluefull','Purplenum','Pinkal','Redria','Oran','Yellowboze','Whitill'];
const SID_UP=SIDS.map(x=>x.toUpperCase());
const CLASS_MOD={HUmar:0,HUnewearl:1,HUcast:2,HUcaseal:9,RAmar:3,RAmarl:11,RAcast:4,RAcaseal:5,FOmar:10,FOmarl:6,FOnewm:7,FOnewearl:8};
const SID_LOGOS={Viridia:'LViridia.png',Greenill:'Greenill.png',Skyly:'LSkyly.png',Bluefull:'Bluefull.png',Purplenum:'LPurplenum.png',Pinkal:'LPinkal.png',Redria:'LRedria.png',Oran:'LOran.png',Yellowboze:'LYellowboze.png',Whitill:'LWhitill.png'};
const AREA_IMAGES={Forest:'Forest/Forest1.png',Cave:'Cave/Cave1.png',Mine:'Mine/Mine1.png',Ruins:'Ruins/Ruins1.png',Falz:'Falz/Falz.png','VR Temple':'VR_Temple/VRTemple1.png','VR Spaceship':'VR_Spaceship/VRSpaceship1.png','Central Control Area jungle seaside mountains':'Central_Control_Area_jungle_seaside_mountains/CentralControlArea.png',Seabed:'Seabed/Seabed1.png','Control Tower':'Control_Tower/ControlTower.png','Episode 4 / Crater':'Episode_4/Crater/Crater1.png','Episode 4/Crater':'Episode_4/Crater/Crater1.png','Episode 4 / Subterranean Desert':'Episode_4/Subterranean_Desert/SubterraneanDesert1.png','Episode 4/Subterranean Desert':'Episode_4/Subterranean_Desert/SubterraneanDesert1.png'};
function esc(s){return String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function norm(s){return String(s||'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim()}
function compact(s){return norm(s).replace(/\s+/g,'')}
function sidTitle(s){return SIDS.find(x=>x.toLowerCase()===String(s||'').toLowerCase())||''}
const SID_ALIASES={
  'greenhill':'Greenill','green hill':'Greenill','greenil':'Greenill',
  'whitil':'Whitill','whitehill':'Whitill',
  'blueful':'Bluefull','blue full':'Bluefull',
  'purple num':'Purplenum','purplenum':'Purplenum',
  'yellow boze':'Yellowboze','yellowboz':'Yellowboze',
  'viridian':'Viridia'
};
function normalizeSectionAliases(q){
  let out=String(q||''), corrections=[];
  const pairs=Object.entries(SID_ALIASES).sort((a,b)=>b[0].length-a[0].length);
  for(const [alias,canon] of pairs){
    const re=new RegExp(`\\b${alias.replace(/[.*+?^${}()|[\]\\]/g,'\\$&').replace(/\\ /g,'\\s+')}\\b`,'ig');
    if(re.test(out)){
      out=out.replace(re,canon);
      corrections.push(`${alias} → ${canon}`);
    }
  }
  return {q:out,corrections:[...new Set(corrections)]};
}
function sectionStrategyFacts(p){
  const ids=(p.sids||[]).slice(0,4);
  if(!ids.length)return null;
  const community=(B.strategy&&B.strategy['community-section-id-v4.1.json']&&B.strategy['community-section-id-v4.1.json'].sectionIds)||{};
  const strategy=(B.strategy&&B.strategy['section-id-strategy.json']&&B.strategy['section-id-strategy.json'].sectionIds)||{};
  const platform=p.mode==='bb'?'Blue Burst':'GameCube / Xbox';
  const data=dataFor(p.mode);
  const result={kind:'SECTION_STRATEGY_CANON',platform,sections:[]};
  for(const sid of ids){
    const c=community[sid]||{};
    const st=strategy[sid]||{};
    const rows=data.filter(r=>r.sectionId===sid);
    const available=new Set(rows.map(r=>r.item).filter(Boolean));
    const signature=(c.signatureHunts||[]).filter(x=>available.has(x));
    const utility=(c.utility||[]).filter(x=>available.has(x));
    const topWeapons=(st.topWeapons||[])
      .filter(x=>x.platform===platform)
      .sort((a,b)=>(Number(a.expectedKills)||1e99)-(Number(b.expectedKills)||1e99))
      .slice(0,10)
      .map(x=>({item:x.item,episode:x.episode,difficulty:x.difficulty,area:x.area,monster:x.monster,rate:x.rate,expectedKills:x.expectedKills}));
    const prestige=(st.prestigeHunts||[])
      .filter(x=>x.platform===platform)
      .slice(0,8)
      .map(x=>({item:x.item,episode:x.episode,difficulty:x.difficulty,area:x.area,monster:x.monster,rate:x.rate,expectedKills:x.expectedKills}));
    result.sections.push({
      sectionId:sid,
      communityTier:c.communityTier||st.communityTier||null,
      identity:c.identity||st.identityTitle||null,
      why:c.why||null,
      recommendedFor:c.recommendedFor||[],
      bestFor:c.bestFor||[],
      signatureHuntsPlatformAvailable:signature,
      utilityPlatformAvailable:utility,
      topWeaponRoutesPlatformScoped:topWeapons,
      prestigeHuntsPlatformScoped:prestige,
      note:'Community labels are strategy context; route rows are platform-scoped deterministic drop evidence.'
    });
  }
  return result;
}
function sidLogo(s){s=sidTitle(s);return s?'/pso/assets/pso/secids/'+SID_LOGOS[s]:''}
function areaImage(a){const rel=AREA_IMAGES[a];return rel?'/pso/assets/pso/location_assets/'+rel:''}
function calcSectionId(name,className='',blueBurst=false){const mod=blueBurst?(CLASS_MOD[className]??-1):5;if(name===''||mod===-1)return'';let flag=0,sum=mod;for(let i=0;i<name.length;i++){const added=name.charCodeAt(i);sum+=added;if(added>=0x0100&&added<0xff61){if(flag!==2){flag=2;sum+=45}}else if(added<=0xff91){if(flag!==1){flag=1;sum+=45}}}return SID_UP[sum%10]||''}
function titleUpper(s){return SIDS[SID_UP.indexOf(s)]||s}
function extractSids(q){const l=q.toLowerCase();return SIDS.filter(s=>new RegExp('\\b'+s.toLowerCase()+'\\b','i').test(l))}
function extractClass(q){const c=Object.keys(CLASS_MOD).find(x=>q.toLowerCase().includes(x.toLowerCase()));return c||''}
function extractDifficulty(q){const l=q.toLowerCase();if(/very\s*hard|vhard|v-hard/.test(l))return'Very Hard';if(/ultimate|\bult\b/.test(l))return'Ultimate';if(/\bhard\b/.test(l))return'Hard';if(/\bnormal\b/.test(l))return'Normal';return''}
function modeFor(q){return 'gc'}
function extractArea(q){const l=q.toLowerCase();const areas=['Forest','Cave','Mine','Ruins','Falz','VR Temple','VR Spaceship','Seabed','Control Tower'];return areas.find(a=>new RegExp('\\b'+a.toLowerCase().replace(' ','\\s+')+'\\b','i').test(l))||''}
const allItems=[...new Set([...B.gc.records,...B.bb.records].map(r=>r.item).filter(i=>i&&compact(i).length>=3&&i!=='-'))].sort((a,b)=>compact(b).length-compact(a).length);
function matchItem(q){const cq=compact(q);let hit=allItems.find(i=>cq.includes(compact(i)));if(hit)return hit;const qt=new Set(norm(q).split(' ').filter(x=>x.length>2));let best='',score=0;for(const item of allItems){const it=norm(item).split(' ').filter(x=>x.length>2);const s=it.reduce((n,t)=>n+(qt.has(t)?1:0),0)/(it.length||1);if(s>score&&s>=.66){score=s;best=item}}return best}
function extractNameForSection(q){const patterns=[/section\s*id\s+(?:of|for|is)?\s*['\"]?([^?'\"]+?)['\"]?(?:\s+on\s+|\s+with\s+|\s+as\s+|\?|$)/i,/calculate\s+(?:the\s+)?(?:section\s*id\s+)?(?:for\s+)?['\"]?([^?'\"]+?)['\"]?(?:\s+on\s+|\s+with\s+|\s+as\s+|\?|$)/i,/what\s+(?:is|would be)\s+(?:the\s+)?section\s*id\s+(?:of|for)\s+['\"]?([^?'\"]+?)['\"]?(?:\?|$)/i];for(const p of patterns){const m=q.match(p);if(m){let x=m[1].trim();x=x.replace(/\b(gamecube|xbox|blue burst|bb|ephinea|HUmar|HUnewearl|HUcast|HUcaseal|RAmar|RAmarl|RAcast|RAcaseal|FOmar|FOmarl|FOnewm|FOnewearl)\b.*$/i,'').trim();if(x)return x}}return''}
function parse(q){
 const originalQ=String(q||'').trim();
 const normalized=normalizeSectionAliases(originalQ);
 q=normalized.q;
 const sids=extractSids(q),item=matchItem(q),cls=extractClass(q),difficulty=extractDifficulty(q),mode=modeFor(q),name=extractNameForSection(q),area=extractArea(q);
 const magIntent=/\b(mag|mags|sato|nidra|rati|diwari|savitri|rukmin|deva|pushan|bhima|feeding|feed|evolution|evolve|photon blast|pb|mag plan|raise a|raise an)\b/i.test(q);
 const plannerIntent=/\b(plan|planner|build|route|how do i|how can i|possible|can i|should i|starting|starter|goal)\b/i.test(q);
 const explicitProfile=/\b(profile|at a glance|what can|what does|drops for|farm in|farm on|section profile)\b/i.test(q);
 const explicitDrop=/\b(drop|drops|drop rate|where does|where can|farm for|find .*? item)\b/i.test(q);
 const sectionStrategyIntent=/\b(best|strongest|recommended|recommend|good|weapons?|signature|hunts?|worth|tier|account value|starter)\b/i.test(q);
 if(/section\s*id|section\s*scan|calculate/i.test(q)&&name)return{type:'section_calc',q,originalQ,corrections:normalized.corrections,sids,item,cls,difficulty,mode,name,area};
 if(sids.length>=2&&/compare|vs\.?|versus|better|complement|overlap/i.test(q))return{type:'section_compare',q,originalQ,corrections:normalized.corrections,sids:sids.slice(0,2),item,cls,difficulty,mode,area};
 if(sids.length>=1&&sectionStrategyIntent)return{type:'rico',q,originalQ,corrections:normalized.corrections,sids,item,cls,difficulty,mode,area,knowledgeIntent:'section_strategy'};
 // Knowledge/planner questions must reach RICO even when a Section ID is mentioned.
 // Previously any single ID (e.g. "Sato on Redria") hijacked the request into section_profile.
 if(magIntent||plannerIntent)return{type:'rico',q,originalQ,corrections:normalized.corrections,sids,item,cls,difficulty,mode,area,knowledgeIntent:magIntent?'mag':'planner'};
 if(item&&explicitDrop)return{type:'drop_hunt',q,originalQ,corrections:normalized.corrections,sids,item,cls,difficulty,mode,area};
 if(sids.length===1&&explicitProfile)return{type:'section_profile',q,originalQ,corrections:normalized.corrections,sids,item,cls,difficulty,mode,area};
 if(item)return{type:'drop_hunt',q,originalQ,corrections:normalized.corrections,sids,item,cls,difficulty,mode,area};
 if(sids.length===1)return{type:'rico',q,originalQ,corrections:normalized.corrections,sids,item,cls,difficulty,mode,area,knowledgeIntent:'general'};
 return{type:'rico',q,originalQ,corrections:normalized.corrections,sids,item,cls,difficulty,mode,area,knowledgeIntent:'general'}
}
function dataFor(mode){return mode==='bb'?B.bb.records:B.gc.records}
function sortRoutes(rows){return [...rows].sort((a,b)=>(Number(a.expectedKills)||1e99)-(Number(b.expectedKills)||1e99))}
function dropRoutes(p){let rows=dataFor(p.mode).filter(r=>compact(r.item)===compact(p.item));if(p.sids.length)rows=rows.filter(r=>p.sids.includes(r.sectionId));if(p.difficulty)rows=rows.filter(r=>r.difficulty===p.difficulty);return sortRoutes(rows)}
function sectionProfile(p){let rows=dataFor(p.mode).filter(r=>r.sectionId===p.sids[0]);if(p.difficulty)rows=rows.filter(r=>r.difficulty===p.difficulty);if(p.area)rows=rows.filter(r=>r.area===p.area);const uniq=[...new Set(rows.map(r=>r.item).filter(Boolean))];const bestByItem=[];for(const item of uniq){const rr=sortRoutes(rows.filter(r=>r.item===item))[0];if(rr)bestByItem.push(rr)}bestByItem.sort((a,b)=>(a.expectedKills||1e99)-(b.expectedKills||1e99));const areas={};rows.forEach(r=>areas[r.area]=(areas[r.area]||0)+1);return{rows,uniq,best:bestByItem.slice(0,10),areas}}
function compare(p){const [a,b]=p.sids;let rows=dataFor(p.mode);if(p.difficulty)rows=rows.filter(r=>r.difficulty===p.difficulty);const ra=rows.filter(r=>r.sectionId===a),rb=rows.filter(r=>r.sectionId===b);const sa=new Set(ra.map(r=>r.item)),sb=new Set(rb.map(r=>r.item));const overlap=[...sa].filter(x=>sb.has(x));const onlyA=[...sa].filter(x=>!sb.has(x));const onlyB=[...sb].filter(x=>!sa.has(x));function top(items,rows){return items.map(item=>sortRoutes(rows.filter(r=>r.item===item))[0]).filter(Boolean).sort((x,y)=>(x.expectedKills||1e99)-(y.expectedKills||1e99)).slice(0,7)}return{a,b,overlap,onlyA,onlyB,topA:top(onlyA,ra),topB:top(onlyB,rb)}}
const stop=new Set('the a an is are what where how can i me my for on in at to of and or with do does get best find tell about pso phantasy star online'.split(' '));
function retrieve(q){const toks=norm(q).split(' ').filter(t=>t.length>2&&!stop.has(t));let scored=[];for(const m of B.knowledgeModules){const text=norm(m.preview);let score=0;for(const t of toks){if(text.includes(t))score+=1+(text.split(t).length-2)*.04}if(score>0)scored.push({m,score})}scored.sort((a,b)=>b.score-a.score);return scored.slice(0,3).map(x=>x.m)}
window.PSO_ENGINE={parse,dropRoutes,sectionProfile,compare,retrieve,calcSectionId,titleUpper,sidLogo,areaImage,esc,modeFor,normalizeSectionAliases,sectionStrategyFacts,SIDS,CLASS_MOD};
})();