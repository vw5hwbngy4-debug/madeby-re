export const SOCIAL_APPEARANCE_FIELDS=Object.freeze(['avatarVariant','hair','mask','top','bottom','backAccessory','skates','wheelStyle','trail']);
export const REMOTE_MOVEMENT_STATES=Object.freeze(['idle','skating','air','grind','wallride','halfpipe','vert','traversal','handplant','trick','brake','reverse','powerslide']);

const FIELD_TO_WARDROBE=Object.freeze({hair:['hair','hair'],mask:['accessories','accessory'],top:['top','top'],bottom:['bottom','bottom'],backAccessory:['hats','hat'],skates:['skates','skate'],wheelStyle:['soles','sole'],trail:['laces','laces']});
function cleanHex(value=''){const match=String(value).replace('#','').match(/^[0-9a-f]{6}$/i);return match?match[0].toLowerCase():''}
function appearanceId(kind,index,color=''){const suffix=cleanHex(color);return `${kind}-${Math.max(0,Math.floor(Number(index)||0))}${suffix?`-${suffix}`:''}`}

export function wardrobeAppearance(selected={},colors={}){const appearance={avatarVariant:'canonical-default'};for(const[field,[category,kind]]of Object.entries(FIELD_TO_WARDROBE))appearance[field]=appearanceId(kind,selected[category],colors[category]);return appearance}
export function decodeWardrobeAppearance(appearance={}){const out={};for(const[field,[category,kind]]of Object.entries(FIELD_TO_WARDROBE)){const match=String(appearance[field]||'').match(new RegExp(`^${kind}-(\\d+)(?:-([0-9a-f]{6}))?$`,'i'));out[category]={index:match?Number(match[1]):0,color:match?.[2]?.toLowerCase()||''}}return out}
export function profileSignature(profile={}){const appearance=profile.appearance||{};return JSON.stringify([String(profile.playerName||''),...SOCIAL_APPEARANCE_FIELDS.map(key=>String(appearance[key]||''))])}
export function velocitySpeed(velocity=[]){return Math.hypot(Number(velocity[0])||0,Number(velocity[1])||0,Number(velocity[2])||0)}
export function remoteShouldDance(state={}){return state.movementState==='idle'&&velocitySpeed(state.velocity)<.34}
export function canonicalIdleSegment(time=0){return Math.floor((((Number(time)||0)%16)+16)%16/2)}
