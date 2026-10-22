/** FIPS 180-4 SHA-256 over the UTF-8 encoding of a string, in pure ES code.
 * Used only to notice accidental backup damage. It is not authentication,
 * encryption or proof of authorship: anyone editing a file can recompute it.
 * Lone surrogates encode as U+FFFD, matching the WHATWG UTF-8 encoder.
 */
const K = Object.freeze([
  0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1,
  0x923f82a4, 0xab1c5ed5, 0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3,
  0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174, 0xe49b69c1, 0xefbe4786,
  0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
  0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147,
  0x06ca6351, 0x14292967, 0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13,
  0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85, 0xa2bfe8a1, 0xa81a664b,
  0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
  0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a,
  0x5b9cca4f, 0x682e6ff3, 0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208,
  0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
]);

function codePointAt(text: string, index: number): [number, number] {
  const unit = text.charCodeAt(index);
  if (unit >= 0xd800 && unit <= 0xdbff && index + 1 < text.length) {
    const next = text.charCodeAt(index + 1);
    if (next >= 0xdc00 && next <= 0xdfff)
      return [0x10000 + ((unit - 0xd800) << 10) + (next - 0xdc00), 2];
  }
  return [unit >= 0xd800 && unit <= 0xdfff ? 0xfffd : unit, 1];
}

export function utf8Length(text: string): number {
  let length = 0;
  for (let index = 0; index < text.length;) {
    const [point, width] = codePointAt(text, index);
    index += width;
    length += point < 0x80 ? 1 : point < 0x800 ? 2 : point < 0x10000 ? 3 : 4;
  }
  return length;
}

function utf8Encode(text: string, target: Uint8Array): void {
  let offset = 0;
  for (let index = 0; index < text.length;) {
    const [point, width] = codePointAt(text, index);
    index += width;
    if (point < 0x80) target[offset++] = point;
    else if (point < 0x800) {
      target[offset++] = 0xc0 | (point >>> 6);
      target[offset++] = 0x80 | (point & 0x3f);
    } else if (point < 0x10000) {
      target[offset++] = 0xe0 | (point >>> 12);
      target[offset++] = 0x80 | ((point >>> 6) & 0x3f);
      target[offset++] = 0x80 | (point & 0x3f);
    } else {
      target[offset++] = 0xf0 | (point >>> 18);
      target[offset++] = 0x80 | ((point >>> 12) & 0x3f);
      target[offset++] = 0x80 | ((point >>> 6) & 0x3f);
      target[offset++] = 0x80 | (point & 0x3f);
    }
  }
}

const rotate = (value: number, bits: number) =>
  (value >>> bits) | (value << (32 - bits));

export function sha256Hex(text: string): string {
  const length = utf8Length(text);
  const blocks = Math.ceil((length + 9) / 64);
  const data = new Uint8Array(blocks * 64);
  utf8Encode(text, data);
  data[length] = 0x80;
  const view = new DataView(data.buffer);
  view.setUint32(data.length - 8, Math.floor(length / 0x20000000));
  view.setUint32(data.length - 4, (length * 8) >>> 0);
  const hash = [
    0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c,
    0x1f83d9ab, 0x5be0cd19,
  ];
  const words = new Uint32Array(64);
  for (let block = 0; block < blocks; block += 1) {
    for (let t = 0; t < 16; t += 1)
      words[t] = view.getUint32(block * 64 + t * 4);
    for (let t = 16; t < 64; t += 1) {
      const w15 = words[t - 15] ?? 0,
        w2 = words[t - 2] ?? 0;
      const s0 = rotate(w15, 7) ^ rotate(w15, 18) ^ (w15 >>> 3);
      const s1 = rotate(w2, 17) ^ rotate(w2, 19) ^ (w2 >>> 10);
      words[t] = ((words[t - 16] ?? 0) + s0 + (words[t - 7] ?? 0) + s1) >>> 0;
    }
    let [a, b, c, d, e, f, g, h] = hash as [
      number,
      number,
      number,
      number,
      number,
      number,
      number,
      number,
    ];
    for (let t = 0; t < 64; t += 1) {
      const s1 = rotate(e, 6) ^ rotate(e, 11) ^ rotate(e, 25);
      const choice = (e & f) ^ (~e & g);
      const first = (h + s1 + choice + (K[t] ?? 0) + (words[t] ?? 0)) >>> 0;
      const s0 = rotate(a, 2) ^ rotate(a, 13) ^ rotate(a, 22);
      const majority = (a & b) ^ (a & c) ^ (b & c);
      const second = (s0 + majority) >>> 0;
      h = g;
      g = f;
      f = e;
      e = (d + first) >>> 0;
      d = c;
      c = b;
      b = a;
      a = (first + second) >>> 0;
    }
    const next = [a, b, c, d, e, f, g, h];
    for (let index = 0; index < 8; index += 1)
      hash[index] = ((hash[index] ?? 0) + (next[index] ?? 0)) >>> 0;
  }
  return hash.map((word) => word.toString(16).padStart(8, '0')).join('');
}
