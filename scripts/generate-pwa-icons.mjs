import fs from 'fs';
import path from 'path';
import zlib from 'zlib';

const ICONS_DIR = path.resolve('client/public/icons');
fs.mkdirSync(ICONS_DIR, { recursive: true });

// CRC32 table for PNG encoding
const crcTable = new Uint32Array(256);
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) {
    c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  }
  crcTable[n] = c >>> 0;
}

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    c = crcTable[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

function makeChunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, 'ascii');
  const crcBuf = Buffer.alloc(4);
  const combined = Buffer.concat([typeBuf, data]);
  crcBuf.writeUInt32BE(crc32(combined), 0);
  return Buffer.concat([len, typeBuf, data, crcBuf]);
}

function encodePng(width, height, rgba) {
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // RGBA
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  const stride = width * 4 + 1;
  const raw = Buffer.alloc(stride * height);
  for (let y = 0; y < height; y++) {
    raw[y * stride] = 0; // filter: None
    rgba.copy(raw, y * stride + 1, y * width * 4, (y + 1) * width * 4);
  }

  const compressed = zlib.deflateSync(raw, { level: 9 });
  return Buffer.concat([
    signature,
    makeChunk('IHDR', ihdr),
    makeChunk('IDAT', compressed),
    makeChunk('IEND', Buffer.alloc(0)),
  ]);
}

function distToSegment(px, py, x1, y1, x2, y2) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const l2 = dx * dx + dy * dy;
  if (l2 === 0) return Math.hypot(px - x1, py - y1);
  let t = ((px - x1) * dx + (py - y1) * dy) / l2;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(px - (x1 + t * dx), py - (y1 + t * dy));
}

function renderLogoIcon(size, maskable = false) {
  const rgba = Buffer.alloc(size * size * 4);
  // Brand background #0C0F1F -> RGB(12, 15, 31)
  const bgR = 12,
    bgG = 15,
    bgB = 31;

  // Safe zone scaling for maskable icon (keep artwork inside central 72% circle)
  const scale = maskable ? 0.72 : 0.88;
  const offset = (1 - scale) * 50;

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      // Normalized 0..100 coordinate space
      const nx = ((x + 0.5) / size) * 100;
      const ny = ((y + 0.5) / size) * 100;

      // Map into logo space (0..100)
      const lx = (nx - offset) / scale;
      const ly = (ny - offset) / scale;

      let r = bgR,
        g = bgG,
        b = bgB;

      // Subtle inner panel glow
      const centerDist = Math.hypot(lx - 50, ly - 50);
      if (centerDist < 42) {
        const panelMix = Math.max(0, (42 - centerDist) / 42) * 0.25;
        r = Math.round(bgR * (1 - panelMix) + 20 * panelMix);
        g = Math.round(bgG * (1 - panelMix) + 25 * panelMix);
        b = Math.round(bgB * (1 - panelMix) + 50 * panelMix);
      }

      // Gradient factor 0..1 across diagonal
      const gradT = Math.max(0, Math.min(1, (lx + ly - 25) / 90));
      // Accent #8B9BFF (139, 155, 255) -> Success #46D9A0 (70, 217, 160)
      const gradR = Math.round(139 * (1 - gradT) + 70 * gradT);
      const gradG = Math.round(155 * (1 - gradT) + 217 * gradT);
      const gradB = Math.round(255 * (1 - gradT) + 160 * gradT);

      // 1. Q Ring: center (48, 44), radius 25, stroke half-width 4.2
      const ringDist = Math.abs(Math.hypot(lx - 48, ly - 44) - 25);
      // 2. Q Tail: (63, 59) -> (78, 74)
      const tailDist = Math.min(
        distToSegment(lx, ly, 63, 59, 78, 74),
        distToSegment(lx, ly, 71, 74, 78, 74),
        distToSegment(lx, ly, 78, 67, 78, 74)
      );

      // 3. Prompt chevron ">": (38, 38) -> (46, 44) and (46, 44) -> (38, 50)
      const promptDist = Math.min(
        distToSegment(lx, ly, 38, 38, 46, 44),
        distToSegment(lx, ly, 46, 44, 38, 50)
      );

      // 4. Prompt underscore "_": (51, 50) -> (59, 50)
      const underDist = distToSegment(lx, ly, 51, 50, 59, 50);

      const aa = 100 / size; // anti-alias width in logo units

      // Composite Q ring + tail
      const qDist = Math.min(ringDist - 4.0, tailDist - 3.6);
      if (qDist < aa) {
        const alpha = Math.max(0, Math.min(1, 0.5 - qDist / (2 * aa)));
        r = Math.round(r * (1 - alpha) + gradR * alpha);
        g = Math.round(g * (1 - alpha) + gradG * alpha);
        b = Math.round(b * (1 - alpha) + gradB * alpha);
      }

      // Composite prompt ">" in #8B9BFF
      const pEdge = promptDist - 2.3;
      if (pEdge < aa) {
        const alpha = Math.max(0, Math.min(1, 0.5 - pEdge / (2 * aa)));
        r = Math.round(r * (1 - alpha) + 139 * alpha);
        g = Math.round(g * (1 - alpha) + 155 * alpha);
        b = Math.round(b * (1 - alpha) + 255 * alpha);
      }

      // Composite underscore "_" in #46D9A0
      const uEdge = underDist - 2.3;
      if (uEdge < aa) {
        const alpha = Math.max(0, Math.min(1, 0.5 - uEdge / (2 * aa)));
        r = Math.round(r * (1 - alpha) + 70 * alpha);
        g = Math.round(g * (1 - alpha) + 217 * alpha);
        b = Math.round(b * (1 - alpha) + 160 * alpha);
      }

      const idx = (y * size + x) * 4;
      rgba[idx] = r;
      rgba[idx + 1] = g;
      rgba[idx + 2] = b;
      rgba[idx + 3] = 255;
    }
  }

  return encodePng(size, size, rgba);
}

const files = [
  { name: 'icon-192.png', size: 192, maskable: false },
  { name: 'icon-512.png', size: 512, maskable: false },
  { name: 'icon-512-maskable.png', size: 512, maskable: true },
  { name: 'apple-touch-icon.png', size: 180, maskable: false },
];

for (const f of files) {
  const png = renderLogoIcon(f.size, f.maskable);
  const outPath = path.join(ICONS_DIR, f.name);
  fs.writeFileSync(outPath, png);
  console.log(`Generated ${outPath} (${png.length} bytes)`);
}
