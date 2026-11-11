import { applyBps } from './bps.js';
import { sha256Hex } from './hashing.js';

const SOURCE_SHA256 = '938d07521cfc937d179402e85c8b0b43f3e929a494838ff1455b29126b56d356';
const PATCH_SHA256 = 'd0188e2abf13ba81496ec0e387ad3eba3180c7b65af61c2a0dbac96efa71919e';
const OUTPUT_SHA256 = '5cfe164aea57174ad47801e90f7fd53dccca4d30db2680991d54ec232aac4a61';
const PATCH_URL = '../assets/patch/Xenosaga_I_II_DS_English_v1.0.bps';

function progress(stage, percent, message = '') {
  postMessage({ type: 'progress', stage, percent, message });
}

self.onmessage = async event => {
  if (event.data?.type !== 'patch') return;
  try {
    const sourceBuffer = event.data.source;
    progress('reading', 8, 'ROM loaded into local browser memory.');

    progress('source', 14, 'Calculating source SHA-256 locally…');
    const sourceHash = await sha256Hex(sourceBuffer);
    if (sourceHash !== SOURCE_SHA256) {
      throw new Error(`Unsupported ROM.\n\nExpected Xenosaga I+II (Japan), SHA-256 ${SOURCE_SHA256}\nYour file: ${sourceHash}\n\nNo modification has been made.`);
    }
    progress('source', 25, 'Source verified: Xenosaga I+II (Japan).');

    progress('patch', 28, 'Downloading English v1.0 BPS patch…');
    const response = await fetch(PATCH_URL, { cache: 'no-store' });
    if (!response.ok) throw new Error(`Could not load the v1.0 patch (${response.status}).`);
    const patchBuffer = await response.arrayBuffer();

    progress('patch', 34, 'Verifying patch SHA-256…');
    const patchHash = await sha256Hex(patchBuffer);
    if (patchHash !== PATCH_SHA256) {
      throw new Error(`Patch SHA-256 mismatch. Expected ${PATCH_SHA256}, got ${patchHash}.`);
    }
    progress('patch', 40, 'English v1.0 patch verified.');

    progress('apply', 42, 'Applying BPS patch locally…');
    const source = new Uint8Array(sourceBuffer);
    const patch = new Uint8Array(patchBuffer);
    const { target } = applyBps(source, patch, pct => {
      const mapped = 42 + Math.floor(pct * 0.40);
      if (pct % 2 === 0) progress('apply', mapped, `Applying patch… ${pct}%`);
    });

    progress('output', 84, 'Calculating output SHA-256 locally…');
    const outputHash = await sha256Hex(target);
    if (outputHash !== OUTPUT_SHA256) {
      throw new Error(`Generated ROM did not match the canonical v1.0 hash. Expected ${OUTPUT_SHA256}, got ${outputHash}. No success file will be offered.`);
    }

    progress('ready', 100, 'English v1.0 verified and ready.');
    postMessage({ type: 'success', output: target.buffer, outputHash }, [target.buffer]);
  } catch (error) {
    postMessage({ type: 'error', message: error instanceof Error ? error.message : String(error) });
  }
};
