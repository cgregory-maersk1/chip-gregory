// Dependency-free PNG icon generator for Chip Gregory.
// Draws a poker-chip icon (gold ring + white dashed edge + green center) and
// encodes RGBA PNGs by hand using Node's built-in zlib. No sharp/canvas needed.
//
//   node scripts/gen-icons.mjs
//
import { deflateSync } from 'node:zlib';
import { writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const outDir = join(dirname(fileURLToPath(import.meta.url)), '..', 'public');
mkdirSync(outDir, { recursive: true });

const FELT_DARK = [11, 61, 36];
const GOLD = [231, 195, 76];
const WHITE = [255, 255, 255];
const GREEN = [11, 107, 58];

// --- CRC32 (for PNG chunks) ---
const crcTable = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();
function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = crcTable[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, 'ascii');
  const body = Buffer.concat([typeBuf, data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body), 0);
  return Buffer.concat([len, body, crc]);
}
function encodePNG(width, height, rgba) {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type RGBA
  // filter byte 0 per scanline
  const stride = width * 4;
  const raw = Buffer.alloc((stride + 1) * height);
  for (let y = 0; y < height; y++) {
    raw[y * (stride + 1)] = 0;
    rgba.copy(raw, y * (stride + 1) + 1, y * stride, y * stride + stride);
  }
  const idat = deflateSync(raw, { level: 9 });
  return Buffer.concat([
    sig,
    chunk('IHDR', ihdr),
    chunk('IDAT', idat),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

function blend(dst, i, color, a) {
  // over-composite `color` with alpha a (0..1) onto dst pixel i (premultiplied-free)
  const inv = 1 - a;
  dst[i] = Math.round(color[0] * a + dst[i] * inv);
  dst[i + 1] = Math.round(color[1] * a + dst[i + 1] * inv);
  dst[i + 2] = Math.round(color[2] * a + dst[i + 2] * inv);
  dst[i + 3] = Math.min(255, Math.round(255 * a + dst[i + 3] * inv));
}

function render(size, { rounded }) {
  const rgba = Buffer.alloc(size * size * 4); // transparent
  const S = 3; // supersample
  const c = size / 2;
  const rBg = size * 0.1875; // corner radius
  const rGold = size * 0.367;
  const rEdgeInner = rGold - size * 0.051;
  const rGreen = size * 0.258;

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let R = 0, G = 0, B = 0, A = 0;
      for (let sy = 0; sy < S; sy++) {
        for (let sx = 0; sx < S; sx++) {
          const px = x + (sx + 0.5) / S;
          const py = y + (sy + 0.5) / S;
          let col = null;
          // rounded-rect background
          const inRoundedRect = (() => {
            if (rounded) {
              const dx = Math.max(rBg - px, px - (size - rBg), 0);
              const dy = Math.max(rBg - py, py - (size - rBg), 0);
              return Math.hypot(dx, dy) <= rBg || (px >= rBg && px <= size - rBg) || (py >= rBg && py <= size - rBg);
            }
            return true; // square opaque (apple-touch)
          })();
          if (inRoundedRect) col = FELT_DARK;
          const d = Math.hypot(px - c, py - c);
          if (d <= rGold) {
            col = GOLD;
            // white dashed edge ring
            if (d >= rEdgeInner) {
              const ang = Math.atan2(py - c, px - c);
              const seg = ((ang + Math.PI) / (Math.PI * 2)) * 16; // 16 dashes
              if (seg % 1 < 0.55) col = WHITE;
            }
          }
          if (d <= rGreen) col = GREEN;
          if (col) {
            R += col[0]; G += col[1]; B += col[2]; A += 1;
          }
        }
      }
      const n = S * S;
      const i = (y * size + x) * 4;
      const a = A / n;
      if (a > 0) {
        rgba[i] = Math.round(R / A);
        rgba[i + 1] = Math.round(G / A);
        rgba[i + 2] = Math.round(B / A);
        rgba[i + 3] = Math.round(a * 255);
      }
      void blend; // (kept for clarity; direct write above)
    }
  }
  return encodePNG(size, size, rgba);
}

writeFileSync(join(outDir, 'icon-192.png'), render(192, { rounded: true }));
writeFileSync(join(outDir, 'icon-512.png'), render(512, { rounded: true }));
writeFileSync(join(outDir, 'apple-touch-icon.png'), render(180, { rounded: false }));
console.log('icons written to public/: icon-192.png, icon-512.png, apple-touch-icon.png');
