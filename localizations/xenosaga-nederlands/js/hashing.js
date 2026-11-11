export async function sha256Hex(input) {
  let data;
  if (input instanceof ArrayBuffer) {
    data = input;
  } else if (ArrayBuffer.isView(input)) {
    data = (input.byteOffset === 0 && input.byteLength === input.buffer.byteLength)
      ? input.buffer
      : input.slice().buffer;
  } else {
    throw new TypeError('sha256Hex expects an ArrayBuffer or typed array.');
  }
  const digest = await crypto.subtle.digest('SHA-256', data);
  return [...new Uint8Array(digest)].map(b => b.toString(16).padStart(2, '0')).join('');
}
