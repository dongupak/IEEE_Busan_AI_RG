/*!
 * gate.js — 포스터 생성기 진입용 비밀번호 게이트
 *
 * 저장하는 값은 비밀번호가 아니라 SHA-256 해시이며, 입력값의 해시를 비교해 통과시킨다.
 * 다만 이 검사는 브라우저에서 실행되므로 "공개 URL을 숨기는 잠금"일 뿐 서버급 보안이 아니다.
 * (소스를 보면 해시와 화면 구조를 알 수 있다. 진짜 비공개가 필요하면 비공개 저장소/서버 인증을 써야 한다.)
 *
 *  RGGate.verify(pw) -> boolean
 *  RGGate.open({redirect}) -> 비밀번호 모달을 띄우고, 통과하면 redirect로 이동
 *  RGGate.require() -> 세션 통과 여부 확인(빌더 페이지에서 사용)
 */
(function (global) {
  "use strict";

  var PASS_HASH = "809af82fbaf3ed18d3f01dcc165ac550e9e669254e94941aac1bcbe94968878c";
  var SESSION_KEY = "rg-poster-gate";

  /* ===== SHA-256 (외부 의존성 없이 동작하도록 직접 구현) ===== */
  var K = [
    0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
    0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
    0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
    0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
    0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
    0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
    0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
    0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2
  ];

  function utf8Bytes(str) {
    var out = [], s = encodeURIComponent(String(str));
    for (var i = 0; i < s.length; i++) {
      if (s[i] === "%") { out.push(parseInt(s.substr(i + 1, 2), 16)); i += 2; }
      else out.push(s.charCodeAt(i));
    }
    return out;
  }

  function sha256hex(str) {
    var msg = utf8Bytes(str);
    var len = msg.length, bitLen = len * 8;
    msg.push(0x80);
    while (msg.length % 64 !== 56) msg.push(0);
    /* 길이는 64비트 빅엔디안 (여기 입력은 짧아 상위 32비트는 0) */
    msg.push(0, 0, 0, 0);
    msg.push((bitLen >>> 24) & 0xff, (bitLen >>> 16) & 0xff, (bitLen >>> 8) & 0xff, bitLen & 0xff);

    var H = [0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19];
    var w = new Array(64);

    function rotr(x, n) { return (x >>> n) | (x << (32 - n)); }

    for (var i = 0; i < msg.length; i += 64) {
      var t;
      for (t = 0; t < 16; t++) {
        w[t] = (msg[i + t * 4] << 24) | (msg[i + t * 4 + 1] << 16) | (msg[i + t * 4 + 2] << 8) | msg[i + t * 4 + 3];
      }
      for (t = 16; t < 64; t++) {
        var s0 = rotr(w[t - 15], 7) ^ rotr(w[t - 15], 18) ^ (w[t - 15] >>> 3);
        var s1 = rotr(w[t - 2], 17) ^ rotr(w[t - 2], 19) ^ (w[t - 2] >>> 10);
        w[t] = (w[t - 16] + s0 + w[t - 7] + s1) | 0;
      }
      var a = H[0], b = H[1], c = H[2], d = H[3], e = H[4], f = H[5], g = H[6], h = H[7];
      for (t = 0; t < 64; t++) {
        var S1 = rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25);
        var ch = (e & f) ^ (~e & g);
        var t1 = (h + S1 + ch + K[t] + w[t]) | 0;
        var S0 = rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22);
        var mj = (a & b) ^ (a & c) ^ (b & c);
        var t2 = (S0 + mj) | 0;
        h = g; g = f; f = e; e = (d + t1) | 0;
        d = c; c = b; b = a; a = (t1 + t2) | 0;
      }
      H[0] = (H[0] + a) | 0; H[1] = (H[1] + b) | 0; H[2] = (H[2] + c) | 0; H[3] = (H[3] + d) | 0;
      H[4] = (H[4] + e) | 0; H[5] = (H[5] + f) | 0; H[6] = (H[6] + g) | 0; H[7] = (H[7] + h) | 0;
    }
    return H.map(function (x) { return ("00000000" + (x >>> 0).toString(16)).slice(-8); }).join("");
  }

  function verify(pw) { return sha256hex(pw) === PASS_HASH; }

  function pass() {
    try { sessionStorage.setItem(SESSION_KEY, PASS_HASH); } catch (e) { /* 무시 */ }
  }
  function passed() {
    try { return sessionStorage.getItem(SESSION_KEY) === PASS_HASH; } catch (e) { return false; }
  }

  /* ===== 모달 ===== */
  var CSS =
    '.rg-gate{position:fixed;inset:0;z-index:9999;display:flex;align-items:center;justify-content:center;' +
    'background:rgba(17,20,26,.62);backdrop-filter:blur(3px);font-family:"Inter Tight","Noto Sans KR",sans-serif;}' +
    '.rg-gate__box{background:#fff;border-radius:16px;padding:30px 30px 24px;width:min(92vw,390px);' +
    'box-shadow:0 24px 60px rgba(0,0,0,.35);}' +
    '.rg-gate__box h3{margin:0 0 6px;font-size:1.18rem;font-weight:800;color:#222;letter-spacing:-.01em;}' +
    '.rg-gate__box p{margin:0 0 18px;font-size:.87rem;color:#6b6b6b;line-height:1.55;}' +
    '.rg-gate__box input{width:100%;height:46px;padding:0 14px;font:inherit;font-size:1rem;' +
    'border:1px solid #e4e4e4;border-radius:9px;background:#F8F8F8;color:#222;}' +
    '.rg-gate__box input:focus{outline:2px solid #FA5D29;outline-offset:1px;}' +
    '.rg-gate__err{min-height:20px;margin:8px 0 0;font-size:.83rem;color:#d93a17;font-weight:600;}' +
    '.rg-gate__row{display:flex;gap:9px;margin-top:12px;}' +
    '.rg-gate__row button{flex:1;height:44px;font:inherit;font-weight:700;font-size:.92rem;cursor:pointer;' +
    'border-radius:9px;border:1px solid transparent;transition:background .2s ease;}' +
    '.rg-gate__go{background:#222;color:#fff;}.rg-gate__go:hover{background:#383838;}' +
    '.rg-gate__no{background:#fff;color:#222;border-color:#d8d8d8;}.rg-gate__no:hover{background:#f2f2f2;}';

  function open(opts) {
    opts = opts || {};
    var redirect = opts.redirect || "tools/poster-builder.html";
    if (document.querySelector(".rg-gate")) return;
    if (passed()) { location.href = redirect; return; }

    var style = document.createElement("style");
    style.textContent = CSS;
    document.head.appendChild(style);

    var wrap = document.createElement("div");
    wrap.className = "rg-gate";
    wrap.innerHTML =
      '<div class="rg-gate__box" role="dialog" aria-modal="true" aria-label="포스터 생성기 잠금 해제">' +
      '<h3>🔒 포스터 생성기</h3>' +
      '<p>세미나 포스터를 만들려면 운영자 비밀번호를 입력하세요.</p>' +
      '<input type="password" id="rgGatePw" autocomplete="off" placeholder="비밀번호" aria-label="비밀번호">' +
      '<p class="rg-gate__err" id="rgGateErr"></p>' +
      '<div class="rg-gate__row">' +
      '<button type="button" class="rg-gate__no" id="rgGateNo">취소</button>' +
      '<button type="button" class="rg-gate__go" id="rgGateGo">열기</button>' +
      '</div></div>';
    document.body.appendChild(wrap);

    var input = wrap.querySelector("#rgGatePw");
    var err = wrap.querySelector("#rgGateErr");
    input.focus();

    function close() { wrap.remove(); style.remove(); }
    function submit() {
      if (verify(input.value)) {
        pass();
        close();
        location.href = redirect;
      } else {
        err.textContent = "비밀번호가 올바르지 않습니다.";
        input.select();
      }
    }
    wrap.querySelector("#rgGateGo").onclick = submit;
    wrap.querySelector("#rgGateNo").onclick = close;
    input.addEventListener("keydown", function (e) {
      if (e.key === "Enter") { e.preventDefault(); submit(); }
      if (e.key === "Escape") close();
    });
    wrap.addEventListener("click", function (e) { if (e.target === wrap) close(); });
  }

  /* 빌더 페이지 진입 시 호출: 세션 통과가 없으면 비밀번호를 직접 물어본다 */
  function require(onOk) {
    if (passed()) { onOk(); return; }
    var pw = prompt("포스터 생성기 비밀번호를 입력하세요.");
    if (pw != null && verify(pw)) { pass(); onOk(); return; }
    document.body.innerHTML =
      '<p style="font:600 1rem/1.6 system-ui;padding:40px;text-align:center;color:#6b6b6b">' +
      '비밀번호가 확인되지 않았습니다. 홈에서 <b>Ctrl+E</b>로 다시 시도해 주세요.</p>';
  }

  global.RGGate = { verify: verify, open: open, require: require, sha256hex: sha256hex, SESSION_KEY: SESSION_KEY };
  if (typeof module !== "undefined" && module.exports) module.exports = global.RGGate;
})(typeof window !== "undefined" ? window : globalThis);
