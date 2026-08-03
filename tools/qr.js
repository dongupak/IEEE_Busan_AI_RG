/*!
 * qr.js — 의존성 없는 QR 코드 인코더 (byte 모드)
 * 버전 1~15, 오류정정 레벨 L/M 지원. 포스터 생성기에서 등록 폼 URL을 QR로 만들 때 사용한다.
 * QR.encode(text, {ec:"M"}) -> {size, modules:[[0|1,...],...], version, ec}
 * QR.toSvg(text, opts) -> 문자열(SVG). 포스터 페이지에 그대로 인라인으로 심는다.
 */
(function (global) {
  "use strict";

  /* ===== GF(256) 산술 (생성 다항식 0x11d) ===== */
  var EXP = new Array(512), LOG = new Array(256);
  (function () {
    var x = 1;
    for (var i = 0; i < 255; i++) {
      EXP[i] = x; LOG[x] = i;
      x <<= 1;
      if (x & 0x100) x ^= 0x11d;
    }
    for (var j = 255; j < 512; j++) EXP[j] = EXP[j - 255];
  })();

  function gmul(a, b) { return (a === 0 || b === 0) ? 0 : EXP[LOG[a] + LOG[b]]; }

  function polyMul(a, b) {
    var r = new Array(a.length + b.length - 1).fill(0);
    for (var i = 0; i < a.length; i++)
      for (var j = 0; j < b.length; j++) r[i + j] ^= gmul(a[i], b[j]);
    return r;
  }

  function generatorPoly(n) {
    var p = [1];
    for (var i = 0; i < n; i++) p = polyMul(p, [1, EXP[i]]);
    return p;
  }

  /* data 코드워드 -> 오류정정 코드워드 n개 */
  function eccOf(data, n) {
    var gen = generatorPoly(n);
    var rem = data.concat(new Array(n).fill(0));
    for (var i = 0; i < data.length; i++) {
      var c = rem[i];
      if (c === 0) continue;
      for (var j = 1; j < gen.length; j++) rem[i + j] ^= gmul(gen[j], c);
    }
    return rem.slice(data.length);
  }

  /* ===== 버전/EC 레벨 테이블 =====
     [ecCodewordsPerBlock, group1Blocks, group1DataCw, group2Blocks, group2DataCw] */
  var RS_L = {
    1: [7, 1, 19, 0, 0], 2: [10, 1, 34, 0, 0], 3: [15, 1, 55, 0, 0], 4: [20, 1, 80, 0, 0],
    5: [26, 1, 108, 0, 0], 6: [18, 2, 68, 0, 0], 7: [20, 2, 78, 0, 0], 8: [24, 2, 97, 0, 0],
    9: [30, 2, 116, 0, 0], 10: [18, 2, 68, 2, 69], 11: [20, 4, 81, 0, 0], 12: [24, 2, 92, 2, 93],
    13: [26, 4, 107, 0, 0], 14: [30, 3, 115, 1, 116], 15: [22, 5, 87, 1, 88]
  };
  var RS_M = {
    1: [10, 1, 16, 0, 0], 2: [16, 1, 28, 0, 0], 3: [26, 1, 44, 0, 0], 4: [18, 2, 32, 0, 0],
    5: [24, 2, 43, 0, 0], 6: [16, 4, 27, 0, 0], 7: [18, 4, 31, 0, 0], 8: [22, 2, 38, 2, 39],
    9: [22, 3, 36, 2, 37], 10: [26, 4, 43, 1, 44], 11: [30, 1, 50, 4, 51], 12: [22, 6, 36, 2, 37],
    13: [22, 8, 37, 1, 38], 14: [24, 4, 40, 5, 41], 15: [24, 5, 41, 5, 42]
  };
  var RS = { L: RS_L, M: RS_M };
  var EC_BITS = { L: 1, M: 0, Q: 3, H: 2 };

  var ALIGN = {
    1: [], 2: [6, 18], 3: [6, 22], 4: [6, 26], 5: [6, 30], 6: [6, 34], 7: [6, 22, 38],
    8: [6, 24, 42], 9: [6, 26, 46], 10: [6, 28, 50], 11: [6, 30, 54], 12: [6, 32, 58],
    13: [6, 34, 62], 14: [6, 26, 46, 66], 15: [6, 26, 48, 70]
  };

  var MAX_VERSION = 15;

  function dataCapacity(version, ec) {
    var t = RS[ec][version];
    return t[1] * t[2] + t[3] * t[4];
  }

  /* ===== 비트 버퍼 ===== */
  function BitBuf() { this.bits = []; }
  BitBuf.prototype.put = function (value, len) {
    for (var i = len - 1; i >= 0; i--) this.bits.push((value >>> i) & 1);
  };

  function utf8Bytes(str) {
    var out = [], s = encodeURIComponent(str);
    for (var i = 0; i < s.length; i++) {
      if (s[i] === "%") { out.push(parseInt(s.substr(i + 1, 2), 16)); i += 2; }
      else out.push(s.charCodeAt(i));
    }
    return out;
  }

  /* ===== 모듈 배치 ===== */
  function newGrid(size) {
    var g = [], r;
    for (var i = 0; i < size; i++) { r = new Array(size).fill(null); g.push(r); }
    return g;
  }

  function placeFinder(g, res, row, col) {
    for (var r = -1; r <= 7; r++) {
      for (var c = -1; c <= 7; c++) {
        var rr = row + r, cc = col + c;
        if (rr < 0 || cc < 0 || rr >= g.length || cc >= g.length) continue;
        var on = (r >= 0 && r <= 6 && (c === 0 || c === 6)) ||
                 (c >= 0 && c <= 6 && (r === 0 || r === 6)) ||
                 (r >= 2 && r <= 4 && c >= 2 && c <= 4);
        g[rr][cc] = on ? 1 : 0;
        res[rr][cc] = true;
      }
    }
  }

  function buildFunctionPatterns(version) {
    var size = version * 4 + 17;
    var g = newGrid(size), res = newGrid(size);
    for (var i = 0; i < size; i++) for (var j = 0; j < size; j++) res[i][j] = false;

    placeFinder(g, res, 0, 0);
    placeFinder(g, res, 0, size - 7);
    placeFinder(g, res, size - 7, 0);

    /* 타이밍 패턴 */
    for (var k = 8; k < size - 8; k++) {
      var v = (k % 2 === 0) ? 1 : 0;
      g[6][k] = v; res[6][k] = true;
      g[k][6] = v; res[k][6] = true;
    }

    /* 정렬 패턴 */
    var centers = ALIGN[version], last = centers.length - 1;
    for (var a = 0; a <= last; a++) {
      for (var b = 0; b <= last; b++) {
        /* 세 모서리(파인더 패턴)와 겹치는 위치만 생략 */
        if ((a === 0 && b === 0) || (a === 0 && b === last) || (a === last && b === 0)) continue;
        var cr = centers[a], cc2 = centers[b];
        for (var dr = -2; dr <= 2; dr++) {
          for (var dc = -2; dc <= 2; dc++) {
            var on = Math.max(Math.abs(dr), Math.abs(dc)) !== 1;
            g[cr + dr][cc2 + dc] = on ? 1 : 0;
            res[cr + dr][cc2 + dc] = true;
          }
        }
      }
    }

    /* 다크 모듈 */
    g[size - 8][8] = 1; res[size - 8][8] = true;

    /* 포맷 정보 영역 예약 */
    for (var f = 0; f <= 8; f++) {
      if (!res[8][f]) { res[8][f] = true; g[8][f] = 0; }
      if (!res[f][8]) { res[f][8] = true; g[f][8] = 0; }
    }
    for (var f2 = 0; f2 < 8; f2++) {
      res[8][size - 1 - f2] = true; g[8][size - 1 - f2] = 0;
      res[size - 1 - f2][8] = true; g[size - 1 - f2][8] = 0;
    }

    /* 버전 정보 영역 (v7+) */
    if (version >= 7) {
      var vinfo = versionBits(version);
      for (var p = 0; p < 18; p++) {
        var bit = (vinfo >> p) & 1;
        var r1 = Math.floor(p / 3), c1 = size - 11 + (p % 3);
        g[r1][c1] = bit; res[r1][c1] = true;
        g[c1][r1] = bit; res[c1][r1] = true;
      }
    }
    return { grid: g, reserved: res, size: size };
  }

  /* BCH(18,6) — 버전 정보 */
  function versionBits(version) {
    var rem = version;
    for (var i = 0; i < 12; i++) rem = ((rem << 1) ^ ((rem >>> 11) * 0x1f25)) & 0xfff;
    return (version << 12) | rem;
  }

  /* BCH(15,5) + 마스크 0x5412 — 포맷 정보 */
  function formatBits(ec, mask) {
    var d = (EC_BITS[ec] << 3) | mask;
    var rem = d;
    for (var i = 0; i < 10; i++) rem = ((rem << 1) ^ ((rem >>> 9) * 0x537)) & 0x3ff;
    return ((d << 10) | rem) ^ 0x5412;
  }

  function placeFormat(g, size, ec, mask) {
    var bits = formatBits(ec, mask);
    /* 1번째 사본: 좌상단 (bit 0~5 -> 8열 0~5행, bit 9~14 -> 8행 5~0열) */
    for (var i = 0; i <= 5; i++) { g[i][8] = (bits >> i) & 1; }
    g[7][8] = (bits >> 6) & 1;
    g[8][8] = (bits >> 7) & 1;
    g[8][7] = (bits >> 8) & 1;
    for (var j = 9; j <= 14; j++) { g[8][14 - j] = (bits >> j) & 1; }

    /* 2번째 사본: 우상단 8행 + 좌하단 8열 */
    for (var k = 0; k <= 7; k++) { g[8][size - 1 - k] = (bits >> k) & 1; }
    for (var m = 8; m <= 14; m++) { g[size - 15 + m][8] = (bits >> m) & 1; }
    g[size - 8][8] = 1;
  }

  function maskFn(mask, r, c) {
    switch (mask) {
      case 0: return (r + c) % 2 === 0;
      case 1: return r % 2 === 0;
      case 2: return c % 3 === 0;
      case 3: return (r + c) % 3 === 0;
      case 4: return (Math.floor(r / 2) + Math.floor(c / 3)) % 2 === 0;
      case 5: return ((r * c) % 2) + ((r * c) % 3) === 0;
      case 6: return (((r * c) % 2) + ((r * c) % 3)) % 2 === 0;
      case 7: return (((r + c) % 2) + ((r * c) % 3)) % 2 === 0;
    }
    return false;
  }

  function placeData(base, codewords) {
    var g = base.grid.map(function (row) { return row.slice(); });
    var res = base.reserved, size = base.size;
    var bitIdx = 0, total = codewords.length * 8;
    var upward = true;

    for (var right = size - 1; right >= 1; right -= 2) {
      if (right === 6) right = 5; /* 세로 타이밍 열 건너뜀 */
      for (var i = 0; i < size; i++) {
        var row = upward ? size - 1 - i : i;
        for (var k = 0; k < 2; k++) {
          var col = right - k;
          if (res[row][col]) continue;
          var bit = 0;
          if (bitIdx < total) {
            bit = (codewords[bitIdx >> 3] >> (7 - (bitIdx & 7))) & 1;
            bitIdx++;
          }
          g[row][col] = bit;
        }
      }
      upward = !upward;
    }
    return g;
  }

  function applyMask(g, res, mask) {
    var out = g.map(function (row) { return row.slice(); });
    for (var r = 0; r < g.length; r++)
      for (var c = 0; c < g.length; c++)
        if (!res[r][c] && maskFn(mask, r, c)) out[r][c] ^= 1;
    return out;
  }

  /* ===== 마스크 패널티 (규칙 1~4) ===== */
  function penalty(g) {
    var n = g.length, score = 0, r, c, run, prev;

    for (r = 0; r < n; r++) {
      run = 1; prev = g[r][0];
      for (c = 1; c < n; c++) {
        if (g[r][c] === prev) { run++; }
        else { if (run >= 5) score += run - 2; prev = g[r][c]; run = 1; }
      }
      if (run >= 5) score += run - 2;
    }
    for (c = 0; c < n; c++) {
      run = 1; prev = g[0][c];
      for (r = 1; r < n; r++) {
        if (g[r][c] === prev) { run++; }
        else { if (run >= 5) score += run - 2; prev = g[r][c]; run = 1; }
      }
      if (run >= 5) score += run - 2;
    }

    for (r = 0; r < n - 1; r++)
      for (c = 0; c < n - 1; c++) {
        var v = g[r][c];
        if (v === g[r][c + 1] && v === g[r + 1][c] && v === g[r + 1][c + 1]) score += 3;
      }

    var pat1 = [1, 0, 1, 1, 1, 0, 1, 0, 0, 0, 0];
    var pat2 = [0, 0, 0, 0, 1, 0, 1, 1, 1, 0, 1];
    function matches(get, i, pat) {
      for (var k = 0; k < 11; k++) if (get(i + k) !== pat[k]) return false;
      return true;
    }
    for (r = 0; r < n; r++) {
      for (c = 0; c <= n - 11; c++) {
        var getR = (function (rr) { return function (x) { return g[rr][x]; }; })(r);
        if (matches(getR, c, pat1)) score += 40;
        if (matches(getR, c, pat2)) score += 40;
      }
    }
    for (c = 0; c < n; c++) {
      for (r = 0; r <= n - 11; r++) {
        var getC = (function (cc) { return function (x) { return g[x][cc]; }; })(c);
        if (matches(getC, r, pat1)) score += 40;
        if (matches(getC, r, pat2)) score += 40;
      }
    }

    var dark = 0, total = n * n;
    for (r = 0; r < n; r++) for (c = 0; c < n; c++) dark += g[r][c];
    /* k = ceil(|비율 - 50%| / 5%) */
    score += Math.ceil(Math.abs(dark * 20 - total * 10) / total) * 10;
    return score;
  }

  /* ===== 인코딩 본체 ===== */
  function encode(text, opts) {
    opts = opts || {};
    var ec = opts.ec || "M";
    if (!RS[ec]) throw new Error("지원하지 않는 EC 레벨: " + ec);
    var bytes = utf8Bytes(String(text));

    var version = opts.version || 0;
    if (!version) {
      for (var v = 1; v <= MAX_VERSION; v++) {
        var ccBits = v <= 9 ? 8 : 16;
        if (4 + ccBits + bytes.length * 8 <= dataCapacity(v, ec) * 8) { version = v; break; }
      }
      if (!version) {
        if (ec === "M") return encode(text, { ec: "L", version: 0 }); /* 길면 L로 완화 */
        throw new Error("데이터가 너무 깁니다 (QR 버전 " + MAX_VERSION + " 초과)");
      }
    }

    var capacityCw = dataCapacity(version, ec);
    var buf = new BitBuf();
    buf.put(4, 4);                                  /* byte 모드 */
    buf.put(bytes.length, version <= 9 ? 8 : 16);   /* 문자 수 */
    for (var i = 0; i < bytes.length; i++) buf.put(bytes[i], 8);

    var capacityBits = capacityCw * 8;
    var term = Math.min(4, capacityBits - buf.bits.length);
    buf.put(0, term);
    while (buf.bits.length % 8 !== 0) buf.bits.push(0);

    var data = [];
    for (var b = 0; b < buf.bits.length; b += 8) {
      var byte = 0;
      for (var k = 0; k < 8; k++) byte = (byte << 1) | buf.bits[b + k];
      data.push(byte);
    }
    var pads = [0xec, 0x11], p = 0;
    while (data.length < capacityCw) { data.push(pads[p % 2]); p++; }

    /* 블록 분할 + RS */
    var t = RS[ec][version];
    var ecLen = t[0], g1 = t[1], d1 = t[2], g2 = t[3], d2 = t[4];
    var blocks = [], eccs = [], pos = 0, bi;
    for (bi = 0; bi < g1; bi++) { blocks.push(data.slice(pos, pos + d1)); pos += d1; }
    for (bi = 0; bi < g2; bi++) { blocks.push(data.slice(pos, pos + d2)); pos += d2; }
    for (bi = 0; bi < blocks.length; bi++) eccs.push(eccOf(blocks[bi], ecLen));

    /* 인터리빙 */
    var out = [], maxData = Math.max(d1, d2), c2;
    for (c2 = 0; c2 < maxData; c2++)
      for (bi = 0; bi < blocks.length; bi++)
        if (c2 < blocks[bi].length) out.push(blocks[bi][c2]);
    for (c2 = 0; c2 < ecLen; c2++)
      for (bi = 0; bi < eccs.length; bi++) out.push(eccs[bi][c2]);

    /* 배치 + 마스크 선택 */
    var base = buildFunctionPatterns(version);
    var placed = placeData(base, out);
    var best = null, bestScore = Infinity, bestMask = 0;
    var from = 0, to = 7;
    if (opts.mask != null) { from = to = opts.mask; }   /* 검증용: 마스크 강제 지정 */
    for (var m = from; m <= to; m++) {
      var cand = applyMask(placed, base.reserved, m);
      placeFormat(cand, base.size, ec, m);
      var sc = penalty(cand);
      if (sc < bestScore) { bestScore = sc; best = cand; bestMask = m; }
    }
    return { size: base.size, modules: best, version: version, ec: ec, mask: bestMask, penalty: bestScore };
  }

  /* ===== SVG 출력 (포스터 페이지에 인라인) ===== */
  function toSvg(text, opts) {
    opts = opts || {};
    var qr = encode(text, opts);
    var quiet = opts.quiet == null ? 4 : opts.quiet;
    var dim = qr.size + quiet * 2;
    var d = [];
    for (var r = 0; r < qr.size; r++) {
      for (var c = 0; c < qr.size; c++) {
        if (qr.modules[r][c]) d.push("M" + (c + quiet) + " " + (r + quiet) + "h1v1h-1z");
      }
    }
    var cls = opts.className ? ' class="' + opts.className + '"' : "";
    return '<svg' + cls + ' viewBox="0 0 ' + dim + " " + dim + '" role="img" aria-label="' +
      (opts.label || "등록 폼 QR 코드") + '" xmlns="http://www.w3.org/2000/svg">' +
      '<rect width="' + dim + '" height="' + dim + '" fill="#ffffff"/>' +
      '<path d="' + d.join("") + '" fill="' + (opts.color || "#111111") + '"/></svg>';
  }

  var QR = { encode: encode, toSvg: toSvg, MAX_VERSION: MAX_VERSION };
  if (typeof module !== "undefined" && module.exports) module.exports = QR;
  else global.QR = QR;
})(typeof window !== "undefined" ? window : globalThis);
