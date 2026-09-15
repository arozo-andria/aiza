// Generates public/icons/icon-192.png and icon-512.png: a solid terracotta
// circle with a white "A" glyph, hand-encoded as raw PNGs (no image deps).
// Placeholder art only - swap for real brand icons when there's time.
const fs = require("fs");
const path = require("path");
const zlib = require("zlib");

let crcTable = null;
function crc32(buf) {
  if (!crcTable) {
    crcTable = new Uint32Array(256);
    for (let n = 0; n < 256; n++) {
      let c = n;
      for (let k = 0; k < 8; k++) {
        c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      }
      crcTable[n] = c >>> 0;
    }
  }
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    crc = crcTable[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const typeBuf = Buffer.from(type, "ascii");
  const lenBuf = Buffer.alloc(4);
  lenBuf.writeUInt32BE(data.length, 0);
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([lenBuf, typeBuf, data, crcBuf]);
}

// 5x7 bitmap glyph for "A".
const GLYPH_A = ["01110", "10001", "10001", "11111", "10001", "10001", "10001"];

function hexToRgb(hex) {
  const n = parseInt(hex.replace("#", ""), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function generateIcon(size, bgHex, fgHex) {
  const [br, bgc, bb] = hexToRgb(bgHex);
  const [fr, fgc, fb] = hexToRgb(fgHex);
  const stride = 1 + size * 4;
  const raw = Buffer.alloc(size * stride);

  const cx = size / 2;
  const cy = size / 2;
  const radius = size * 0.47;

  const glyphBoxW = size * 0.5;
  const glyphBoxH = glyphBoxW * (7 / 5);
  const glyphLeft = cx - glyphBoxW / 2;
  const glyphTop = cy - glyphBoxH / 2;
  const cellW = glyphBoxW / 5;
  const cellH = glyphBoxH / 7;

  for (let y = 0; y < size; y++) {
    const rowStart = y * stride;
    raw[rowStart] = 0; // PNG filter type: None
    for (let x = 0; x < size; x++) {
      const dx = x - cx;
      const dy = y - cy;
      const inCircle = dx * dx + dy * dy <= radius * radius;

      let r = 255,
        g = 255,
        b = 255,
        a = 0;

      if (inCircle) {
        r = br;
        g = bgc;
        b = bb;
        a = 255;

        if (
          x >= glyphLeft &&
          x < glyphLeft + glyphBoxW &&
          y >= glyphTop &&
          y < glyphTop + glyphBoxH
        ) {
          const gx = Math.floor((x - glyphLeft) / cellW);
          const gy = Math.floor((y - glyphTop) / cellH);
          if (gy >= 0 && gy < 7 && gx >= 0 && gx < 5 && GLYPH_A[gy][gx] === "1") {
            r = fr;
            g = fgc;
            b = fb;
            a = 255;
          }
        }
      }

      const idx = rowStart + 1 + x * 4;
      raw[idx] = r;
      raw[idx + 1] = g;
      raw[idx + 2] = b;
      raw[idx + 3] = a;
    }
  }

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type: RGBA
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  const idat = zlib.deflateSync(raw, { level: 9 });
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  return Buffer.concat([
    signature,
    chunk("IHDR", ihdr),
    chunk("IDAT", idat),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

const outDir = path.join(__dirname, "..", "public", "icons");
fs.mkdirSync(outDir, { recursive: true });

const BG = "#C2410C";
const FG = "#FFFFFF";

for (const size of [192, 512]) {
  const png = generateIcon(size, BG, FG);
  fs.writeFileSync(path.join(outDir, `icon-${size}.png`), png);
  console.log(`Wrote public/icons/icon-${size}.png (${png.length} bytes)`);
}
