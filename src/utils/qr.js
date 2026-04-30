// Pure-JS QR Code encoder. Byte mode, ECC level M, versions 1-10.
// Returns a 2D boolean array (true = dark module). Render to SVG/canvas.
// Sufficient for URLs up to ~150 chars (covers verification URLs comfortably).

const VERSION_INFO = {
  // [matrix_size, total_codewords, data_codewords, ecc_per_block, blocks_in_g1, dc_g1, blocks_in_g2, dc_g2]
  1: [21, 26, 16, 10, 1, 16, 0, 0],
  2: [25, 44, 28, 16, 1, 28, 0, 0],
  3: [29, 70, 44, 26, 1, 44, 0, 0],
  4: [33, 100, 64, 18, 2, 32, 0, 0],
  5: [37, 134, 86, 24, 2, 43, 0, 0],
  6: [41, 172, 108, 16, 4, 27, 0, 0],
  7: [45, 196, 124, 18, 4, 31, 0, 0],
  8: [49, 242, 154, 22, 2, 38, 2, 39],
  9: [53, 292, 182, 22, 3, 36, 2, 37],
  10: [57, 346, 216, 26, 4, 43, 1, 44],
};

const ALIGNMENT_POSITIONS = {
  1: [], 2: [6, 18], 3: [6, 22], 4: [6, 26], 5: [6, 30],
  6: [6, 34], 7: [6, 22, 38], 8: [6, 24, 42], 9: [6, 26, 46], 10: [6, 28, 50],
};

const FORMAT_INFO_M = {
  // mask 0..7 → 15-bit format string
  0: 0x5412, 1: 0x5125, 2: 0x5e7c, 3: 0x5b4b,
  4: 0x45f9, 5: 0x40ce, 6: 0x4f97, 7: 0x4aa0,
};

// Galois field GF(256) tables, primitive poly 0x11d
const GF_EXP = new Uint8Array(512);
const GF_LOG = new Uint8Array(256);
(function buildGF() {
  let v = 1;
  for (let i = 0; i < 255; i++) {
    GF_EXP[i] = v;
    GF_LOG[v] = i;
    v <<= 1;
    if (v & 256) v ^= 0x11d;
  }
  for (let i = 255; i < 512; i++) GF_EXP[i] = GF_EXP[i - 255];
})();

function gfMul(a, b) {
  if (a === 0 || b === 0) return 0;
  return GF_EXP[GF_LOG[a] + GF_LOG[b]];
}

function rsGenerator(degree) {
  let g = [1];
  for (let i = 0; i < degree; i++) {
    const next = new Array(g.length + 1).fill(0);
    for (let j = 0; j < g.length; j++) {
      next[j] ^= g[j];
      next[j + 1] ^= gfMul(g[j], GF_EXP[i]);
    }
    g = next;
  }
  return g;
}

function rsEncode(dataBytes, eccLen) {
  const gen = rsGenerator(eccLen);
  const result = dataBytes.slice().concat(new Array(eccLen).fill(0));
  for (let i = 0; i < dataBytes.length; i++) {
    const factor = result[i];
    if (factor !== 0) {
      for (let j = 0; j < gen.length; j++) {
        result[i + j] ^= gfMul(gen[j], factor);
      }
    }
  }
  return result.slice(dataBytes.length);
}

function pickVersion(byteLength) {
  for (let v = 1; v <= 10; v++) {
    const dataCw = VERSION_INFO[v][2];
    // mode (4) + length (8 or 16) + data*8 + terminator (4)
    const lenBits = v < 10 ? 8 : 16;
    const requiredBits = 4 + lenBits + byteLength * 8 + 4;
    if (requiredBits <= dataCw * 8) return v;
  }
  throw new Error('QR data too long (>216 bytes). Shorten the URL.');
}

function buildBitstream(text, version) {
  const bytes = [];
  for (let i = 0; i < text.length; i++) {
    const cp = text.charCodeAt(i);
    if (cp < 0x80) {
      bytes.push(cp);
    } else if (cp < 0x800) {
      bytes.push(0xc0 | (cp >> 6));
      bytes.push(0x80 | (cp & 0x3f));
    } else {
      bytes.push(0xe0 | (cp >> 12));
      bytes.push(0x80 | ((cp >> 6) & 0x3f));
      bytes.push(0x80 | (cp & 0x3f));
    }
  }

  const lenBits = version < 10 ? 8 : 16;
  const bits = [];
  const push = (value, n) => {
    for (let i = n - 1; i >= 0; i--) bits.push((value >> i) & 1);
  };
  push(0b0100, 4);              // byte mode indicator
  push(bytes.length, lenBits);  // character count
  for (const b of bytes) push(b, 8);

  const dataCw = VERSION_INFO[version][2];
  const dataBits = dataCw * 8;
  const term = Math.min(4, dataBits - bits.length);
  for (let i = 0; i < term; i++) bits.push(0);
  while (bits.length % 8 !== 0) bits.push(0);

  const padBytes = [0xec, 0x11];
  let pi = 0;
  while (bits.length < dataBits) {
    push(padBytes[pi++ % 2], 8);
  }
  // pack into bytes
  const cw = [];
  for (let i = 0; i < bits.length; i += 8) {
    let b = 0;
    for (let j = 0; j < 8; j++) b = (b << 1) | bits[i + j];
    cw.push(b);
  }
  return cw;
}

function interleaveCodewords(dataCodewords, version) {
  const [, , , eccPerBlock, g1Blocks, g1Dc, g2Blocks, g2Dc] = VERSION_INFO[version];
  // split data into blocks
  const blocks = [];
  let p = 0;
  for (let i = 0; i < g1Blocks; i++) { blocks.push(dataCodewords.slice(p, p + g1Dc)); p += g1Dc; }
  for (let i = 0; i < g2Blocks; i++) { blocks.push(dataCodewords.slice(p, p + g2Dc)); p += g2Dc; }
  // ecc per block
  const eccBlocks = blocks.map((b) => rsEncode(b, eccPerBlock));
  // interleave data
  const out = [];
  const maxData = Math.max(...blocks.map((b) => b.length));
  for (let i = 0; i < maxData; i++) {
    for (const b of blocks) if (i < b.length) out.push(b[i]);
  }
  // append interleaved ecc
  for (let i = 0; i < eccPerBlock; i++) {
    for (const b of eccBlocks) out.push(b[i]);
  }
  return out;
}

function placeFunctionPatterns(matrix, version) {
  const size = matrix.length;
  // Finder patterns
  const drawFinder = (cy, cx) => {
    for (let r = -1; r <= 7; r++) for (let c = -1; c <= 7; c++) {
      const y = cy + r, x = cx + c;
      if (y < 0 || y >= size || x < 0 || x >= size) continue;
      const inOuter = (r >= 0 && r <= 6) && (c >= 0 && c <= 6) && (r === 0 || r === 6 || c === 0 || c === 6);
      const inInner = r >= 2 && r <= 4 && c >= 2 && c <= 4;
      const isWhiteRing = r >= 1 && r <= 5 && c >= 1 && c <= 5 && !(r >= 2 && r <= 4 && c >= 2 && c <= 4);
      const isSeparator = r === -1 || r === 7 || c === -1 || c === 7;
      if (isSeparator) matrix[y][x] = { module: false, fixed: true };
      else if (inOuter || inInner) matrix[y][x] = { module: true, fixed: true };
      else if (isWhiteRing) matrix[y][x] = { module: false, fixed: true };
      else matrix[y][x] = { module: false, fixed: true };
    }
  };
  drawFinder(0, 0);
  drawFinder(0, size - 7);
  drawFinder(size - 7, 0);

  // Timing patterns
  for (let i = 8; i < size - 8; i++) {
    if (!matrix[6][i].fixed) matrix[6][i] = { module: i % 2 === 0, fixed: true };
    if (!matrix[i][6].fixed) matrix[i][6] = { module: i % 2 === 0, fixed: true };
  }

  // Alignment patterns
  const positions = ALIGNMENT_POSITIONS[version];
  for (const r of positions) for (const c of positions) {
    // skip overlap with finder patterns
    if ((r === 6 && c === 6) || (r === 6 && c === size - 7) || (r === size - 7 && c === 6)) continue;
    for (let dr = -2; dr <= 2; dr++) for (let dc = -2; dc <= 2; dc++) {
      const isEdge = Math.max(Math.abs(dr), Math.abs(dc)) === 2;
      const isCenter = dr === 0 && dc === 0;
      matrix[r + dr][c + dc] = { module: isEdge || isCenter, fixed: true };
    }
  }

  // Dark module
  matrix[size - 8][8] = { module: true, fixed: true };

  // Reserve format info area (15 bits each, near each finder)
  for (let i = 0; i < 9; i++) {
    if (!matrix[8][i].fixed) matrix[8][i] = { module: false, fixed: true, reserved: true };
    if (!matrix[i][8].fixed) matrix[i][8] = { module: false, fixed: true, reserved: true };
  }
  for (let i = 0; i < 8; i++) {
    if (!matrix[8][size - 1 - i].fixed) matrix[8][size - 1 - i] = { module: false, fixed: true, reserved: true };
    if (!matrix[size - 1 - i][8].fixed) matrix[size - 1 - i][8] = { module: false, fixed: true, reserved: true };
  }
}

function placeData(matrix, codewords) {
  const size = matrix.length;
  // QR places data right-to-left in 2-column zigzag, skipping the timing column at x=6
  const bits = [];
  for (const cw of codewords) for (let i = 7; i >= 0; i--) bits.push((cw >> i) & 1);

  let bitIdx = 0;
  let upward = true;
  for (let xRight = size - 1; xRight > 0; xRight -= 2) {
    if (xRight === 6) xRight = 5; // skip timing column
    for (let yi = 0; yi < size; yi++) {
      const y = upward ? size - 1 - yi : yi;
      for (let xo = 0; xo < 2; xo++) {
        const x = xRight - xo;
        if (matrix[y][x].fixed) continue;
        const bit = bitIdx < bits.length ? bits[bitIdx++] : 0;
        matrix[y][x] = { module: bit === 1, fixed: false };
      }
    }
    upward = !upward;
  }
}

function applyMask(matrix, maskId) {
  const size = matrix.length;
  const fns = [
    (r, c) => (r + c) % 2 === 0,
    (r) => r % 2 === 0,
    (r, c) => c % 3 === 0,
    (r, c) => (r + c) % 3 === 0,
    (r, c) => (Math.floor(r / 2) + Math.floor(c / 3)) % 2 === 0,
    (r, c) => ((r * c) % 2) + ((r * c) % 3) === 0,
    (r, c) => (((r * c) % 2) + ((r * c) % 3)) % 2 === 0,
    (r, c) => (((r + c) % 2) + ((r * c) % 3)) % 2 === 0,
  ];
  const fn = fns[maskId];
  for (let r = 0; r < size; r++) for (let c = 0; c < size; c++) {
    if (matrix[r][c].fixed) continue;
    if (fn(r, c)) matrix[r][c] = { ...matrix[r][c], module: !matrix[r][c].module };
  }
}

function placeFormatInfo(matrix, maskId) {
  const size = matrix.length;
  const bits = FORMAT_INFO_M[maskId];
  const get = (i) => (bits >> i) & 1;
  // Top-left horizontal & vertical
  for (let i = 0; i <= 5; i++) matrix[8][i] = { module: get(i) === 1, fixed: true };
  matrix[8][7] = { module: get(6) === 1, fixed: true };
  matrix[8][8] = { module: get(7) === 1, fixed: true };
  matrix[7][8] = { module: get(8) === 1, fixed: true };
  for (let i = 9; i <= 14; i++) matrix[14 - i][8] = { module: get(i) === 1, fixed: true };
  // Top-right & bottom-left
  for (let i = 0; i <= 7; i++) matrix[8][size - 1 - i] = { module: get(i) === 1, fixed: true };
  for (let i = 8; i <= 14; i++) matrix[size - 15 + i][8] = { module: get(i) === 1, fixed: true };
}

function maskPenalty(matrix) {
  // simplified scoring (rule 1+3) — good enough for selection
  const size = matrix.length;
  let score = 0;
  // run-of-5+ in rows
  for (let r = 0; r < size; r++) {
    let last = -1, run = 1;
    for (let c = 0; c < size; c++) {
      const m = matrix[r][c].module ? 1 : 0;
      if (m === last) { run++; if (run === 5) score += 3; else if (run > 5) score++; }
      else { run = 1; last = m; }
    }
  }
  for (let c = 0; c < size; c++) {
    let last = -1, run = 1;
    for (let r = 0; r < size; r++) {
      const m = matrix[r][c].module ? 1 : 0;
      if (m === last) { run++; if (run === 5) score += 3; else if (run > 5) score++; }
      else { run = 1; last = m; }
    }
  }
  return score;
}

export function encodeQR(text) {
  const utf8len = (() => {
    let n = 0;
    for (let i = 0; i < text.length; i++) {
      const cp = text.charCodeAt(i);
      n += cp < 0x80 ? 1 : cp < 0x800 ? 2 : 3;
    }
    return n;
  })();
  const version = pickVersion(utf8len);
  const size = VERSION_INFO[version][0];

  const dataCw = buildBitstream(text, version);
  const allCw = interleaveCodewords(dataCw, version);

  // Try all 8 masks, pick lowest penalty
  let best = null;
  for (let mask = 0; mask < 8; mask++) {
    const matrix = Array.from({ length: size }, () => Array.from({ length: size }, () => ({ module: false, fixed: false })));
    placeFunctionPatterns(matrix, version);
    placeData(matrix, allCw);
    applyMask(matrix, mask);
    placeFormatInfo(matrix, mask);
    const score = maskPenalty(matrix);
    if (!best || score < best.score) best = { matrix, score, mask };
  }
  return best.matrix.map((row) => row.map((cell) => cell.module));
}
