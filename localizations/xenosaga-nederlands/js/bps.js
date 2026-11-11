const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let j = 0; j < 8; j++) c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
    table[i] = c >>> 0;
  }
  return table;
})();

export function crc32(bytes, end = bytes.length) {
  let crc = 0xffffffff;
  for (let i = 0; i < end; i++) crc = CRC_TABLE[(crc ^ bytes[i]) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function readU32LE(bytes, pos) {
  return (bytes[pos] | (bytes[pos + 1] << 8) | (bytes[pos + 2] << 16) | (bytes[pos + 3] << 24)) >>> 0;
}

function decoder(bytes, start = 0) {
  let pos = start;
  return {
    get pos() { return pos; },
    set pos(v) { pos = v; },
    readByte() {
      if (pos >= bytes.length) throw new Error('Unexpected end of BPS patch.');
      return bytes[pos++];
    },
    readNumber() {
      let data = 0;
      let shift = 1;
      for (;;) {
        const x = this.readByte();
        data += (x & 0x7f) * shift;
        if (x & 0x80) return data;
        shift *= 128;
        data += shift;
        if (!Number.isSafeInteger(data) || !Number.isSafeInteger(shift)) throw new Error('BPS number exceeds safe integer range.');
      }
    }
  };
}

export function inspectBps(patch) {
  if (!(patch instanceof Uint8Array)) patch = new Uint8Array(patch);
  if (patch.length < 19) throw new Error('BPS patch is too small.');
  if (String.fromCharCode(patch[0], patch[1], patch[2], patch[3]) !== 'BPS1') throw new Error('Invalid BPS header.');

  const storedPatchCrc = readU32LE(patch, patch.length - 4);
  const actualPatchCrc = crc32(patch, patch.length - 4);
  if (storedPatchCrc !== actualPatchCrc) throw new Error(`BPS patch CRC32 mismatch. Expected ${storedPatchCrc.toString(16).padStart(8,'0')}, got ${actualPatchCrc.toString(16).padStart(8,'0')}.`);

  const d = decoder(patch, 4);
  const sourceSize = d.readNumber();
  const targetSize = d.readNumber();
  const metadataSize = d.readNumber();
  if (d.pos + metadataSize > patch.length - 12) throw new Error('Invalid BPS metadata length.');
  const metadataBytes = patch.slice(d.pos, d.pos + metadataSize);
  d.pos += metadataSize;

  return {
    sourceSize,
    targetSize,
    metadata: new TextDecoder('utf-8', { fatal: false }).decode(metadataBytes),
    commandOffset: d.pos,
    sourceCrc: readU32LE(patch, patch.length - 12),
    targetCrc: readU32LE(patch, patch.length - 8),
    patchCrc: storedPatchCrc
  };
}

export function applyBps(source, patch, onProgress = () => {}) {
  if (!(source instanceof Uint8Array)) source = new Uint8Array(source);
  if (!(patch instanceof Uint8Array)) patch = new Uint8Array(patch);

  const info = inspectBps(patch);
  if (source.length !== info.sourceSize) throw new Error(`Source size mismatch. Expected ${info.sourceSize} bytes, got ${source.length}.`);
  const actualSourceCrc = crc32(source);
  if (actualSourceCrc !== info.sourceCrc) throw new Error(`Source CRC32 mismatch. Expected ${info.sourceCrc.toString(16).padStart(8,'0')}, got ${actualSourceCrc.toString(16).padStart(8,'0')}.`);

  const target = new Uint8Array(info.targetSize);
  const d = decoder(patch, info.commandOffset);
  const commandEnd = patch.length - 12;
  let outputOffset = 0;
  let sourceRelativeOffset = 0;
  let targetRelativeOffset = 0;
  let lastProgress = -1;

  const report = () => {
    const p = Math.floor((outputOffset / target.length) * 100);
    if (p !== lastProgress) { lastProgress = p; onProgress(p); }
  };

  while (d.pos < commandEnd) {
    const data = d.readNumber();
    const action = data % 4;
    const length = Math.floor(data / 4) + 1;
    if (outputOffset + length > target.length) throw new Error('BPS command writes beyond target size.');

    if (action === 0) {
      if (outputOffset + length > source.length) throw new Error('SourceRead exceeds source size.');
      target.set(source.subarray(outputOffset, outputOffset + length), outputOffset);
      outputOffset += length;
    } else if (action === 1) {
      if (d.pos + length > commandEnd) throw new Error('TargetRead exceeds patch data.');
      target.set(patch.subarray(d.pos, d.pos + length), outputOffset);
      d.pos += length;
      outputOffset += length;
    } else if (action === 2) {
      const offsetData = d.readNumber();
      const magnitude = Math.floor(offsetData / 2);
      sourceRelativeOffset += (offsetData % 2) ? -magnitude : magnitude;
      if (sourceRelativeOffset < 0 || sourceRelativeOffset + length > source.length) throw new Error('SourceCopy references data outside source.');
      target.set(source.subarray(sourceRelativeOffset, sourceRelativeOffset + length), outputOffset);
      sourceRelativeOffset += length;
      outputOffset += length;
    } else if (action === 3) {
      const offsetData = d.readNumber();
      const magnitude = Math.floor(offsetData / 2);
      targetRelativeOffset += (offsetData % 2) ? -magnitude : magnitude;
      if (targetRelativeOffset < 0 || targetRelativeOffset >= outputOffset) throw new Error('TargetCopy starts outside previously written target data.');
      for (let i = 0; i < length; i++) {
        if (targetRelativeOffset >= outputOffset) {
          // Overlap is valid only because outputOffset advances as bytes are written.
          // At this exact iteration targetRelativeOffset must still refer to an existing byte.
          throw new Error('TargetCopy references unwritten target data.');
        }
        target[outputOffset++] = target[targetRelativeOffset++];
      }
    } else {
      throw new Error('Unknown BPS action.');
    }
    report();
  }

  if (d.pos !== commandEnd) throw new Error('BPS command stream ended at an invalid offset.');
  if (outputOffset !== target.length) throw new Error(`BPS output size mismatch. Expected ${target.length}, wrote ${outputOffset}.`);
  const actualTargetCrc = crc32(target);
  if (actualTargetCrc !== info.targetCrc) throw new Error(`Target CRC32 mismatch. Expected ${info.targetCrc.toString(16).padStart(8,'0')}, got ${actualTargetCrc.toString(16).padStart(8,'0')}.`);
  onProgress(100);
  return { target, info };
}
