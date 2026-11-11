import { applyBps } from './bps.js';
import { sha256Hex } from './hashing.js';

const SOURCE_SHA256 = '938d07521cfc937d179402e85c8b0b43f3e929a494838ff1455b29126b56d356';
const PATCH_SHA256 = '8c102caaff764de32ca677d7de9cfb7622041a8c1f5001a5be60d55498783ae9';
const OUTPUT_SHA256 = 'ab4b66928073ff6caa61dc0c4f2fcbafa0150a69f003133d252c3737efb26a0b';
const PATCH_URL = '../assets/patch/Xenosaga_I_II_DS_Dutch_v1.0.17.bps';
const LABEL = 'Nederlandse v1.0.17 Final';

function progress(stage, percent, message = '') { postMessage({ type: 'progress', stage, percent, message }); }
self.onmessage = async event => {
  if (event.data?.type !== 'patch') return;
  try {
    const sourceBuffer = event.data.source;
    progress('reading', 8, 'ROM geladen in lokaal browsergeheugen.');
    progress('source', 14, 'Bron SHA-256 lokaal berekenen…');
    const sourceHash = await sha256Hex(sourceBuffer);
    if (sourceHash !== SOURCE_SHA256) throw new Error(`Niet-ondersteunde ROM.\n\nVerwacht Xenosaga I+II (Japan), SHA-256 ${SOURCE_SHA256}\nJouw bestand: ${sourceHash}\n\nEr is niets gewijzigd.`);
    progress('source', 25, 'Bron geverifieerd: Xenosaga I+II (Japan).');
    progress('patch', 28, `${LABEL} BPS laden…`);
    const response = await fetch(PATCH_URL, { cache: 'no-store' });
    if (!response.ok) throw new Error(`Patch kon niet worden geladen (${response.status}).`);
    const patchBuffer = await response.arrayBuffer();
    progress('patch', 34, 'Patch SHA-256 controleren…');
    const patchHash = await sha256Hex(patchBuffer);
    if (patchHash !== PATCH_SHA256) throw new Error(`Patch SHA-256 mismatch. Verwacht ${PATCH_SHA256}, ontvangen ${patchHash}.`);
    progress('patch', 40, `${LABEL} patch geverifieerd.`);
    progress('apply', 42, 'BPS lokaal toepassen…');
    const source = new Uint8Array(sourceBuffer);
    const patch = new Uint8Array(patchBuffer);
    const { target } = applyBps(source, patch, pct => { const mapped = 42 + Math.floor(pct * 0.40); if (pct % 2 === 0) progress('apply', mapped, `Patch toepassen… ${pct}%`); });
    progress('output', 84, 'Output SHA-256 lokaal berekenen…');
    const outputHash = await sha256Hex(target);
    if (outputHash !== OUTPUT_SHA256) throw new Error(`Gegenereerde ROM komt niet overeen met de canonieke ${LABEL} hash. Verwacht ${OUTPUT_SHA256}, ontvangen ${outputHash}. Er wordt geen download aangeboden.`);
    progress('ready', 100, `${LABEL} geverifieerd en klaar.`);
    postMessage({ type: 'success', output: target.buffer, outputHash }, [target.buffer]);
  } catch (error) { postMessage({ type: 'error', message: error instanceof Error ? error.message : String(error) }); }
};
