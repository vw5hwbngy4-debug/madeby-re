const assert=require('assert');
function nativeSavePathForGame(gamePath){const p=String(gamePath||'');if(!p)return '';const parts=p.split('.');parts.pop();return (parts.join('.')+'.sav').replace('/data/games/','/data/saves/');}
assert.equal(nativeSavePathForGame('/data/games/Pokemon - Emerald Version (USA, Europe).gba'),'/data/saves/Pokemon - Emerald Version (USA, Europe).sav');
assert.equal(nativeSavePathForGame('/data/games/Pokemon.Emerald.BPEE.gba'),'/data/saves/Pokemon.Emerald.BPEE.sav');
assert.equal(nativeSavePathForGame('/data/games/test.zip'),'/data/saves/test.sav');
function activeSavePath(M,gamePath='',explicitSaveName){if(explicitSaveName)return String(explicitSaveName);if(gamePath)return nativeSavePathForGame(gamePath);if(M?.saveName)return String(M.saveName);const g=M?.gameName||'';return g?nativeSavePathForGame(g):'';}
assert.equal(activeSavePath({saveName:'/data/saves/STALE.sav'},'/data/games/Fresh.gba'),'/data/saves/Fresh.sav');
assert.equal(activeSavePath({saveName:'/data/saves/Active.sav'}),'/data/saves/Active.sav');
assert.equal(activeSavePath({saveName:'/data/saves/Active.sav'},'/data/games/Fresh.gba','/data/saves/Explicit.sav'),'/data/saves/Explicit.sav');
console.log('PASS v0.1.11 native save path tests');
