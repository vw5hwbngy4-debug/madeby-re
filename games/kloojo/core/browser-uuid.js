// Browser-safe UUID generation for LAN development.
// crypto.randomUUID() is a secure-context API and may be unavailable on
// iPhone Safari when Kloojo is served from an http://192.168.x.x origin.
// crypto.getRandomValues() is broadly available and is the preferred fallback.

export function createBrowserUUID(cryptoImpl=globalThis.crypto){
  if(cryptoImpl?.randomUUID){
    return cryptoImpl.randomUUID();
  }
  if(cryptoImpl?.getRandomValues){
    const bytes=new Uint8Array(16);
    cryptoImpl.getRandomValues(bytes);
    bytes[6]=(bytes[6]&0x0f)|0x40;
    bytes[8]=(bytes[8]&0x3f)|0x80;
    const hex=Array.from(bytes,b=>b.toString(16).padStart(2,'0'));
    return `${hex.slice(0,4).join('')}-${hex.slice(4,6).join('')}-${hex.slice(6,8).join('')}-${hex.slice(8,10).join('')}-${hex.slice(10,16).join('')}`;
  }
  const time=Date.now().toString(36);
  const random=()=>Math.random().toString(36).slice(2,12);
  return `${time}-${random()}-${random()}`;
}
