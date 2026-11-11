// LUNA EDIT SURFACE: winner creation permissions only.
// This describes what a winner may influence. Physics, placement and objectives remain kernel-owned.

export const CREATION_GRAMMAR=Object.freeze({
 type:'graffiti_tag',
 eligibility:{requiresRegistration:true,leaderboardRanks:[1,2,3]},
 maxStoredTraces:60,
 playerControls:{
  tag_text:{type:'text',maxLength:18},
  direction:{type:'text',maxLength:140}
 },
 engineLocked:['placement','size','aspect_ratio','collision','objective_role','visibility_rules']
});

function clean(value,max){return String(value??'').replace(/[\u0000-\u001f\u007f]/g,' ').replace(/\s+/g,' ').trim().slice(0,max)}

export function normalizeWinnerTraces(input){
 const traces=Array.isArray(input)?input:[],g=CREATION_GRAMMAR;
 return traces.slice(0,g.maxStoredTraces).map(t=>({
  id:clean(t?.id,40),type:clean(t?.type,64),rank:Number(t?.rank)||0,
  personalization:{
   tag_text:clean(t?.personalization?.tag_text,g.playerControls.tag_text.maxLength),
   direction:clean(t?.personalization?.direction,g.playerControls.direction.maxLength)
  },
  creator:{username:clean(t?.creator?.username,40)}
 })).filter(t=>t.type===g.type&&g.eligibility.leaderboardRanks.includes(t.rank)&&t.personalization.tag_text);
}
