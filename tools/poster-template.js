/*!
 * poster-template.js — 세미나 포스터 페이지 / README / index.html 항목 생성기
 * 브라우저(포스터 빌더)와 Node(테스트) 양쪽에서 쓴다.
 *
 *  Poster.buildPage(d)      -> 단독 실행 가능한 포스터 HTML 문자열
 *  Poster.buildReadme(d)    -> 2026_RGn/README.md 내용
 *  Poster.buildEntry(d)     -> index.html의 lectures 배열에 넣을 객체 리터럴 문자열
 *  Poster.insertEntry(html, entry, id) -> index.html 소스에 항목을 끼워 넣은 새 소스
 */
(function (global) {
  "use strict";

  var QRlib = (typeof require === "function" && typeof module !== "undefined")
    ? require("./qr.js") : global.QR;

  /* ===== 유틸 ===== */
  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }
  function lines(s) {
    return String(s == null ? "" : s).split(/\r?\n/).map(function (t) { return t.trim(); })
      .filter(function (t) { return t.length; });
  }
  function pad2(n) { return (n < 10 ? "0" : "") + n; }
  function dirName(d) { return d.year + "_RG" + d.no; }
  function lectureId(d) { return "rg" + d.no; }

  var HOMEPAGE = "https://dongupak.github.io/IEEE_Busan_AI_RG";
  var GITHUB = "https://github.com/dongupak/IEEE_Busan_AI_RG";

  /* 일시 문자열: "2026년 7월 30일 (목) 15:00 – 17:50" */
  function dateText(d) {
    var t = [d.date, d.time].filter(Boolean).join(" ");
    return t.trim();
  }

  /* 강사 표기: "유대승 박사 (한국전자통신연구원 동남권지능화융합연구실)" */
  function speakerLine(d) {
    var name = [d.speaker, d.speakerTitle].filter(Boolean).join(" ").trim();
    return d.speakerOrg ? name + " (" + d.speakerOrg + ")" : name;
  }

  /* ===== 포스터 페이지 ===== */

  /* 히어로 장식용 신경망 그래픽 (레이어 4-5-3) */
  function netSvg() {
    var layers = [
      { x: 34, ys: [46, 118, 190, 262] },
      { x: 172, ys: [28, 96, 164, 232, 300] },
      { x: 306, ys: [96, 164, 232] }
    ];
    var links = "", nodes = "", i, j, k, d = 0;
    for (i = 0; i < layers.length - 1; i++) {
      for (j = 0; j < layers[i].ys.length; j++) {
        for (k = 0; k < layers[i + 1].ys.length; k++) {
          links += '<line x1="' + layers[i].x + '" y1="' + layers[i].ys[j] +
            '" x2="' + layers[i + 1].x + '" y2="' + layers[i + 1].ys[k] + '"/>';
        }
      }
    }
    for (i = 0; i < layers.length; i++) {
      for (j = 0; j < layers[i].ys.length; j++) {
        nodes += '<circle class="nd" cx="' + layers[i].x + '" cy="' + layers[i].ys[j] +
          '" r="6" style="animation-delay:' + (d * 0.22).toFixed(2) + 's"/>';
        d++;
      }
    }
    return '<svg class="net" viewBox="0 0 340 330" aria-hidden="true" xmlns="http://www.w3.org/2000/svg">' +
      '<defs><linearGradient id="ng" x1="0" y1="0" x2="1" y2="1">' +
      '<stop offset="0" stop-color="#00A9DE"/><stop offset="1" stop-color="#7A3BE8"/></linearGradient></defs>' +
      '<g class="lk" stroke="url(#ng)" fill="none" stroke-width="1">' + links + '</g>' +
      '<g fill="url(#ng)">' + nodes + '</g></svg>';
  }

  function buildPage(d) {
    var qrSvg = "";
    if (d.formUrl && QRlib) {
      try {
        qrSvg = QRlib.toSvg(d.formUrl, { ec: "M", quiet: 2, color: "#0E1729", className: "qr", label: "참가 등록 폼 QR 코드" });
      } catch (e) { qrSvg = ""; }
    }
    var bios = lines(d.bios);
    var paras = lines(d.content);
    var notes = lines(d.notes);
    var titleFull = d.title + (d.subtitle ? " · " + d.subtitle : "");
    var pageTitle = "제" + d.no + "회 IEEE Busan AI 연구회 초청 강연 · " + d.title;
    var speakerName = [d.speaker, d.speakerTitle].filter(Boolean).join(" ");
    var monogram = esc((d.speaker || "AI").slice(0, 1));
    var sec = 0;
    function idx() { sec++; return (sec < 10 ? "0" : "") + sec; }

    var H = [];
    H.push('<!DOCTYPE html>');
    H.push('<html lang="ko">');
    H.push('<head>');
    H.push('<meta charset="UTF-8">');
    H.push('<meta name="viewport" content="width=device-width, initial-scale=1.0">');
    H.push('<title>' + esc(pageTitle) + '</title>');
    H.push('<meta name="description" content="' + esc(titleFull + " — " + speakerLine(d) + " · " + dateText(d)) + '">');
    H.push('<meta property="og:title" content="' + esc(pageTitle) + '">');
    H.push('<meta property="og:description" content="' + esc(dateText(d) + " · " + (d.place || "")) + '">');
    H.push('<meta name="theme-color" content="#F4F7FD">');
    H.push('<link rel="preconnect" href="https://fonts.googleapis.com">');
    H.push('<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>');
    H.push('<link href="https://fonts.googleapis.com/css2?family=Inter+Tight:wght@400;600;700;800;900&family=JetBrains+Mono:wght@400;700&family=Noto+Sans+KR:wght@400;500;700;900&display=swap" rel="stylesheet">');
    H.push('<style>');
    H.push('  :root{');
    H.push('    --ink:#0E1729; --ink-2:#243350; --muted:#596C8C; --dim:#8397B6;');
    H.push('    --line:#E2E9F6; --paper:#FFFFFF;');
    H.push('    --blue:#0B5BD3; --violet:#7A3BE8; --cyan:#00A9DE; --pink:#FF4E8E;');
    H.push('    --mono:"JetBrains Mono",ui-monospace,SFMono-Regular,Menlo,monospace;');
    H.push('    --grad:linear-gradient(100deg,var(--blue),var(--violet));');
    H.push('  }');
    H.push('  *{box-sizing:border-box;}');
    H.push('  body{margin:0;color:var(--ink);line-height:1.62;letter-spacing:-.005em;');
    H.push('    font-family:"Inter Tight","Noto Sans KR",-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;');
    H.push('    -webkit-font-smoothing:antialiased;');
    H.push('    background:');
    H.push('      radial-gradient(1000px 560px at 6% -12%, rgba(0,169,222,.22), transparent 62%),');
    H.push('      radial-gradient(920px 600px at 97% 0%, rgba(122,59,232,.18), transparent 62%),');
    H.push('      radial-gradient(780px 480px at 62% 110%, rgba(255,78,142,.12), transparent 60%),');
    H.push('      #F4F7FD;');
    H.push('    background-attachment:fixed;}');
    H.push('  a{color:var(--blue);text-decoration:none;}');
    H.push('  /* 배경 그리드 */');
    H.push('  .grid-bg{position:fixed;inset:0;z-index:0;pointer-events:none;');
    H.push('    background-image:linear-gradient(rgba(11,91,211,.07) 1px,transparent 1px),');
    H.push('      linear-gradient(90deg,rgba(11,91,211,.07) 1px,transparent 1px);');
    H.push('    background-size:62px 62px;');
    H.push('    -webkit-mask-image:radial-gradient(circle at 50% 16%,#000,transparent 74%);');
    H.push('    mask-image:radial-gradient(circle at 50% 16%,#000,transparent 74%);}');
    H.push('  .sheet{position:relative;z-index:1;max-width:1000px;margin:0 auto;padding:26px clamp(14px,3vw,26px) 34px;}');
    H.push('');
    H.push('  /* ===== 히어로 ===== */');
    H.push('  .hero{position:relative;overflow:hidden;border-radius:26px;');
    H.push('    padding:clamp(28px,4vw,46px) clamp(22px,4vw,50px) clamp(30px,4vw,44px);');
    H.push('    background:linear-gradient(152deg,#FFFFFF 0%,#F4F8FF 52%,#F1EEFF 100%);');
    H.push('    border:1px solid var(--line);');
    H.push('    box-shadow:0 26px 60px rgba(19,42,88,.10), inset 0 1px 0 #fff;}');
    H.push('  .hero::before{content:"";position:absolute;left:0;right:0;top:0;height:3px;');
    H.push('    background:linear-gradient(90deg,var(--cyan),var(--blue),var(--violet),var(--pink));}');
    H.push('  .orb{position:absolute;border-radius:50%;filter:blur(62px);pointer-events:none;}');
    H.push('  .orb.a{width:330px;height:330px;left:-100px;top:-140px;background:rgba(0,169,222,.30);animation:float 19s ease-in-out infinite;}');
    H.push('  .orb.b{width:300px;height:300px;right:-90px;bottom:-150px;background:rgba(122,59,232,.24);animation:float 23s ease-in-out infinite reverse;}');
    H.push('  .net{position:absolute;right:clamp(-30px,2vw,26px);top:50%;transform:translateY(-46%);');
    H.push('    width:min(330px,34vw);opacity:.62;pointer-events:none;}');
    H.push('  .net .lk line{stroke-dasharray:5 9;animation:dash 9s linear infinite;opacity:.5;}');
    H.push('  .net .nd{animation:blink 3.4s ease-in-out infinite;}');
    H.push('  @media(max-width:820px){.net{display:none;}}');
    H.push('  .hero-in{position:relative;z-index:2;max-width:min(100%,660px);}');
    H.push('  .tags{display:flex;flex-wrap:wrap;gap:9px;}');
    H.push('  .tag{display:inline-flex;align-items:center;gap:8px;font-family:var(--mono);font-size:.72rem;font-weight:700;');
    H.push('    letter-spacing:.14em;text-transform:uppercase;padding:8px 14px;border-radius:999px;');
    H.push('    border:1px solid var(--line);background:#fff;color:var(--muted);');
    H.push('    box-shadow:0 2px 10px rgba(19,42,88,.05);}');
    H.push('  .tag.hot{color:#0B3E9E;border-color:rgba(11,91,211,.32);');
    H.push('    background:linear-gradient(90deg,rgba(0,169,222,.14),rgba(122,59,232,.14));}');
    H.push('  .tag i{width:7px;height:7px;border-radius:50%;background:var(--cyan);');
    H.push('    box-shadow:0 0 10px rgba(0,169,222,.9);animation:blink 2.2s ease-in-out infinite;font-style:normal;}');
    H.push('  h1{margin:24px 0 0;font-size:clamp(1.9rem,5vw,3.5rem);font-weight:900;line-height:1.13;letter-spacing:-.035em;');
    H.push('    background:linear-gradient(98deg,#0A2551 6%,#0B5BD3 52%,#7A3BE8 92%);');
    H.push('    -webkit-background-clip:text;background-clip:text;color:transparent;}');
    H.push('  .sub{margin:14px 0 0;font-size:clamp(1rem,2.1vw,1.24rem);font-weight:700;color:var(--blue);}');
    H.push('  .tagline{margin:16px 0 0;color:var(--ink-2);font-size:1rem;max-width:46em;white-space:pre-line;}');
    H.push('  .rule{margin-top:26px;height:2px;border-radius:2px;');
    H.push('    background:linear-gradient(90deg,var(--blue),rgba(122,59,232,.55),transparent);}');
    H.push('');
    H.push('  /* ===== 개요 카드 ===== */');
    H.push('  .facts{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-top:16px;}');
    H.push('  @media(max-width:860px){.facts{grid-template-columns:repeat(2,1fr);}}');
    H.push('  .fact{position:relative;overflow:hidden;padding:18px 18px 16px;border-radius:18px;');
    H.push('    border:1px solid var(--line);background:var(--paper);');
    H.push('    box-shadow:0 10px 26px rgba(19,42,88,.06);}');
    H.push('  .fact::before{content:"";position:absolute;left:18px;right:18px;top:0;height:3px;border-radius:3px;');
    H.push('    background:var(--grad);}');
    H.push('  .fact .k{display:flex;align-items:center;gap:7px;font-family:var(--mono);font-size:.68rem;font-weight:700;');
    H.push('    letter-spacing:.16em;text-transform:uppercase;color:var(--dim);}');
    H.push('  .fact .v{margin-top:10px;font-weight:800;font-size:1.02rem;line-height:1.4;color:var(--ink);}');
    H.push('  .fact .s{margin-top:4px;font-size:.85rem;color:var(--muted);font-weight:500;}');
    H.push('  .fact.free .v{background:var(--grad);');
    H.push('    -webkit-background-clip:text;background-clip:text;color:transparent;font-size:1.24rem;}');
    H.push('');
    H.push('  /* ===== 본문 카드 ===== */');
    H.push('  .cols{display:grid;grid-template-columns:1.32fr .92fr;gap:14px;margin-top:14px;align-items:start;}');
    H.push('  @media(max-width:860px){.cols{grid-template-columns:1fr;}}');
    H.push('  .card{position:relative;border-radius:22px;padding:clamp(22px,3vw,30px);');
    H.push('    border:1px solid var(--line);background:var(--paper);');
    H.push('    box-shadow:0 16px 40px rgba(19,42,88,.07);}');
    H.push('  .card::before{content:"";position:absolute;left:24px;right:24px;top:0;height:2px;border-radius:2px;');
    H.push('    background:linear-gradient(90deg,transparent,var(--cyan),var(--violet),transparent);}');
    H.push('  .ch{display:flex;align-items:center;gap:11px;margin-bottom:18px;}');
    H.push('  .ch .n{font-family:var(--mono);font-size:.7rem;font-weight:700;color:#fff;padding:6px 9px;border-radius:8px;');
    H.push('    background:var(--grad);letter-spacing:.06em;box-shadow:0 6px 16px rgba(11,91,211,.28);}');
    H.push('  .ch h2{margin:0;font-size:1.1rem;font-weight:800;letter-spacing:-.015em;color:var(--ink);}');
    H.push('  .ch .line{flex:1;height:1px;background:linear-gradient(90deg,var(--line),transparent);}');
    H.push('  .prose p{margin:0 0 13px;font-size:.99rem;color:var(--ink-2);}');
    H.push('  .prose p:last-child{margin-bottom:0;}');
    H.push('');
    H.push('  /* ===== 참가 등록 ===== */');
    H.push('  .reg{text-align:center;border-color:rgba(11,91,211,.22);');
    H.push('    background:linear-gradient(180deg,#F3F9FF,#F7F4FF);}');
    H.push('  .qrwrap{position:relative;width:min(238px,76%);margin:4px auto 16px;padding:12px;border-radius:16px;');
    H.push('    background:#fff;border:1px solid var(--line);box-shadow:0 14px 34px rgba(11,91,211,.16);}');
    H.push('  .qrwrap span{position:absolute;width:16px;height:16px;border:2px solid var(--blue);}');
    H.push('  .qrwrap span:nth-child(1){left:-7px;top:-7px;border-right:0;border-bottom:0;}');
    H.push('  .qrwrap span:nth-child(2){right:-7px;top:-7px;border-left:0;border-bottom:0;}');
    H.push('  .qrwrap span:nth-child(3){left:-7px;bottom:-7px;border-right:0;border-top:0;}');
    H.push('  .qrwrap span:nth-child(4){right:-7px;bottom:-7px;border-left:0;border-top:0;}');
    H.push('  .qr{display:block;width:100%;height:auto;}');
    H.push('  .reg p{margin:0 0 10px;font-size:.88rem;color:var(--muted);}');
    H.push('  .url{display:inline-block;font-family:var(--mono);font-size:.78rem;word-break:break-all;color:var(--blue);}');
    H.push('  .cta{display:inline-flex;align-items:center;justify-content:center;gap:9px;margin-top:16px;width:100%;');
    H.push('    height:50px;border-radius:12px;font-weight:800;font-size:.98rem;color:#fff;');
    H.push('    background:var(--grad);box-shadow:0 14px 30px rgba(11,91,211,.30);');
    H.push('    transition:transform .25s ease,box-shadow .25s ease;}');
    H.push('  .cta:hover{transform:translateY(-2px);box-shadow:0 20px 38px rgba(11,91,211,.40);}');
    H.push('');
    H.push('  /* ===== 강사 ===== */');
    H.push('  .who{display:flex;gap:14px;align-items:center;margin-bottom:16px;}');
    H.push('  .who .mg{width:58px;height:58px;flex:none;border-radius:18px;display:grid;place-items:center;');
    H.push('    font-size:1.5rem;font-weight:900;color:#fff;background:var(--grad);');
    H.push('    box-shadow:0 10px 24px rgba(11,91,211,.28);}');
    H.push('  .who .nm{font-size:1.3rem;font-weight:900;letter-spacing:-.02em;line-height:1.25;color:var(--ink);}');
    H.push('  .who .og{color:var(--muted);font-size:.9rem;font-weight:600;margin-top:2px;}');
    H.push('  ul.bio,ul.notes{list-style:none;margin:0;padding:0;}');
    H.push('  ul.bio li,ul.notes li{position:relative;padding-left:20px;margin-bottom:9px;font-size:.94rem;color:var(--ink-2);}');
    H.push('  ul.bio li::before{content:"";position:absolute;left:0;top:.6em;width:8px;height:8px;border-radius:2px;');
    H.push('    background:var(--grad);}');
    H.push('  ul.notes li::before{content:"▹";position:absolute;left:1px;top:-1px;color:var(--blue);font-weight:700;}');
    H.push('  .about{background:linear-gradient(180deg,#F8F5FF,#FFFFFF);}');
    H.push('');
    H.push('  /* ===== 푸터 ===== */');
    H.push('  .foot{margin-top:14px;border-radius:20px;border:1px solid var(--line);padding:20px clamp(20px,3vw,28px);');
    H.push('    background:var(--paper);box-shadow:0 10px 26px rgba(19,42,88,.06);');
    H.push('    display:flex;flex-wrap:wrap;gap:10px 26px;align-items:center;justify-content:space-between;');
    H.push('    font-family:var(--mono);font-size:.78rem;color:var(--muted);}');
    H.push('  .foot b{font-family:"Inter Tight","Noto Sans KR",sans-serif;font-size:.92rem;color:var(--ink);letter-spacing:-.01em;}');
    H.push('  .tools{display:flex;gap:9px;flex-wrap:wrap;margin-top:16px;}');
    H.push('  .tools button,.tools a{font:inherit;font-size:.84rem;font-weight:700;cursor:pointer;color:var(--ink-2);');
    H.push('    background:#fff;border:1px solid var(--line);border-radius:10px;padding:11px 16px;');
    H.push('    transition:all .25s ease;}');
    H.push('  .tools button:hover,.tools a:hover{color:var(--blue);border-color:rgba(11,91,211,.45);');
    H.push('    box-shadow:0 6px 16px rgba(11,91,211,.14);}');
    H.push('');
    H.push('  @keyframes float{0%,100%{transform:translate3d(0,0,0);}50%{transform:translate3d(20px,-26px,0);}}');
    H.push('  @keyframes blink{0%,100%{opacity:1;}50%{opacity:.35;}}');
    H.push('  @keyframes dash{to{stroke-dashoffset:-280;}}');
    H.push('  @media(prefers-reduced-motion:reduce){*{animation:none!important;transition:none!important;}}');
    H.push('');
    H.push('  /* ===== 인쇄: A4 한 장에 맞춤 ===== */');
    H.push('  @media print{');
    H.push('    @page{size:A4 portrait;margin:8mm;}');
    H.push('    html,body{background:#fff;font-size:12.4px;}');
    H.push('    .grid-bg,.orb,.tools{display:none;}');
    H.push('    .sheet{padding:0;max-width:none;}');
    H.push('    .hero{border-radius:14px;padding:22px 26px 24px;box-shadow:none;}');
    H.push('    .hero-in{max-width:none;}');
    H.push('    .net{width:210px;opacity:.5;}');
    H.push('    h1{font-size:1.95rem;margin-top:15px;}');
    H.push('    .sub{font-size:1rem;margin-top:8px;}');
    H.push('    .tagline{font-size:.9rem;margin-top:10px;}');
    H.push('    .rule{margin-top:14px;}');
    H.push('    .facts{grid-template-columns:repeat(4,1fr);gap:8px;margin-top:9px;}');
    H.push('    .fact{padding:13px 13px 11px;border-radius:12px;box-shadow:none;}');
    H.push('    .fact .v{font-size:.95rem;margin-top:7px;}');
    H.push('    .cols{grid-template-columns:1.32fr .92fr;gap:10px;margin-top:10px;}');
    H.push('    .card{padding:18px 20px;border-radius:14px;box-shadow:none;break-inside:avoid;}');
    H.push('    .foot{padding:13px 18px;margin-top:10px;box-shadow:none;}');
    H.push('    .ch{margin-bottom:13px;}');
    H.push('    .prose p{font-size:.9rem;margin-bottom:9px;}');
    H.push('    .qrwrap{width:min(184px,82%);box-shadow:none;margin-bottom:12px;}');
    H.push('    .cta{display:none;}');
    H.push('    .url{font-size:.72rem;}');
    H.push('  }');
    H.push('</style>');
    H.push('</head>');
    H.push('<body>');
    H.push('<div class="grid-bg"></div>');
    H.push('<div class="sheet">');
    H.push('');
    H.push('  <header class="hero">');
    H.push('    <span class="orb a"></span><span class="orb b"></span>');
    H.push('    ' + netSvg());
    H.push('    <div class="hero-in">');
    H.push('      <div class="tags">');
    H.push('        <span class="tag"><i></i>IEEE Busan Section · AI RG</span>');
    H.push('        <span class="tag hot">제' + esc(d.no) + '회 초청 강연</span>');
    H.push('      </div>');
    H.push('      <h1>' + esc(d.title) + '</h1>');
    if (d.subtitle) H.push('      <p class="sub">' + esc(d.subtitle) + '</p>');
    if (d.tagline) H.push('      <p class="tagline">' + esc(d.tagline) + '</p>');
    H.push('      <div class="rule"></div>');
    H.push('    </div>');
    H.push('  </header>');
    H.push('');
    H.push('  <section class="facts">');
    H.push('    <div class="fact"><div class="k">DATE · 일시</div><div class="v">' + esc(d.date || "") + '</div>' +
      (d.time ? '<div class="s">' + esc(d.time) + '</div>' : '') + '</div>');
    H.push('    <div class="fact"><div class="k">VENUE · 장소</div><div class="v">' + esc(d.place) + '</div></div>');
    H.push('    <div class="fact"><div class="k">SPEAKER · 강사</div><div class="v">' + esc(speakerName) + '</div>' +
      (d.speakerOrg ? '<div class="s">' + esc(d.speakerOrg) + '</div>' : '') + '</div>');
    H.push('    <div class="fact free"><div class="k">FEE · 참가비</div><div class="v">' + esc(d.fee || "무료") + '</div></div>');
    H.push('  </section>');
    H.push('');
    H.push('  <div class="cols">');
    H.push('    <section class="card">');
    H.push('      <div class="ch"><span class="n">' + idx() + '</span><h2>강연 내용</h2><span class="line"></span></div>');
    H.push('      <div class="prose">' + paras.map(function (p) { return '<p>' + esc(p) + '</p>'; }).join("") + '</div>');
    H.push('    </section>');
    H.push('');
    H.push('    <section class="card reg">');
    H.push('      <div class="ch"><span class="n">' + idx() + '</span><h2>참가 등록</h2><span class="line"></span></div>');
    if (qrSvg) {
      H.push('      <div class="qrwrap"><span></span><span></span><span></span><span></span>' + qrSvg + '</div>');
    }
    if (d.formUrl) {
      H.push('      <p>QR을 스캔하거나 아래 링크로 등록해 주세요.</p>');
      H.push('      <a class="url" href="' + esc(d.formUrl) + '" target="_blank" rel="noopener">' + esc(d.formUrl) + '</a>');
      H.push('      <a class="cta" href="' + esc(d.formUrl) + '" target="_blank" rel="noopener">등록 폼 바로가기 →</a>');
    } else {
      H.push('      <p>등록 안내는 추후 공지됩니다.</p>');
    }
    H.push('    </section>');
    H.push('  </div>');
    H.push('');
    H.push('  <div class="cols">');
    H.push('    <section class="card">');
    H.push('      <div class="ch"><span class="n">' + idx() + '</span><h2>강사 소개</h2><span class="line"></span></div>');
    H.push('      <div class="who"><div class="mg">' + monogram + '</div><div>');
    H.push('        <div class="nm">' + esc(speakerName) + '</div>');
    if (d.speakerOrg) H.push('        <div class="og">' + esc(d.speakerOrg) + '</div>');
    H.push('      </div></div>');
    if (bios.length) H.push('      <ul class="bio">' + bios.map(function (b) { return '<li>' + esc(b) + '</li>'; }).join("") + '</ul>');
    H.push('    </section>');
    H.push('');
    if (notes.length) {
      H.push('    <section class="card">');
      H.push('      <div class="ch"><span class="n">' + idx() + '</span><h2>기타 안내</h2><span class="line"></span></div>');
      H.push('      <ul class="notes">' + notes.map(function (n) { return '<li>' + esc(n) + '</li>'; }).join("") + '</ul>');
      H.push('    </section>');
    } else {
      H.push('    <section class="card about">');
      H.push('      <div class="ch"><span class="n">' + idx() + '</span><h2>IEEE Busan AI 연구회</h2><span class="line"></span></div>');
      H.push('      <div class="prose"><p>IEEE Busan Section에서 주관하는 인공지능 기술 연구모임입니다. 부산 · 경남 · 울산 지역을 중심으로 인공지능에 관심있는 연구자들이 참여합니다.</p></div>');
      H.push('    </section>');
    }
    H.push('  </div>');
    H.push('');
    if (notes.length) {
      H.push('  <section class="card about" style="margin-top:14px">');
      H.push('    <div class="ch"><span class="n">' + idx() + '</span><h2>IEEE Busan AI 연구회 소개</h2><span class="line"></span></div>');
      H.push('    <div class="prose"><p>IEEE Busan AI 연구회는 IEEE Busan Section에서 주관하는 인공지능 기술 연구모임입니다.</p>');
      H.push('    <p>부산 · 경남 · 울산 지역을 중심으로 인공지능에 관심있는 연구자들의 참여로 이루어지며, 2026년부터 대학의 방학기간을 활용하여 인공지능 전문가들의 특강을 개최하고 있습니다.</p></div>');
      H.push('  </section>');
    }
    H.push('  <footer class="foot">');
    H.push('    <b>IEEE Busan AI 연구회</b>');
    if (d.contact) H.push('    <span>CONTACT · ' + esc(d.contact) + '</span>');
    H.push('    <span>WEB · <a href="' + HOMEPAGE + '" target="_blank" rel="noopener">dongupak.github.io/IEEE_Busan_AI_RG</a></span>');
    H.push('  </footer>');
    H.push('');
    H.push('  <div class="tools">');
    H.push('    <button type="button" onclick="window.print()">🖨 인쇄 · PDF로 저장</button>');
    H.push('    <a href="' + HOMEPAGE + '">← 연구회 홈으로</a>');
    H.push('  </div>');
    H.push('</div>');
    H.push('</body>');
    H.push('</html>');
    return H.join("\n") + "\n";
  }

  /* ===== 2026_RGn/README.md ===== */
  function buildReadme(d) {
    var out = [];
    out.push("## " + d.year + "년 AI 연구회 " + d.no + "차 특강");
    out.push("* 일시 : " + dateText(d));
    out.push("* 장소 : " + d.place);
    out.push("* 강사 : " + speakerLine(d));
    out.push("* 강연 제목 : " + d.title + (d.subtitle ? " — " + d.subtitle : ""));
    out.push("* 참가비 : " + (d.fee || "무료"));
    if (d.formUrl) out.push("* 참가 등록 : [등록 폼 바로가기](" + d.formUrl + ")");
    out.push("* 포스터 : [세미나 포스터 페이지](" + HOMEPAGE + "/" + dirName(d) + "/poster/)");
    var bios = lines(d.bios);
    if (bios.length) {
      out.push("* 강사 약력 :");
      bios.forEach(function (b) { out.push("  * " + b); });
    }
    var paras = lines(d.content);
    if (paras.length) {
      out.push("* 특강 소개글 :");
      paras.forEach(function (p) { out.push(p); });
    }
    var notes = lines(d.notes);
    if (notes.length) {
      out.push("");
      out.push("#### 기타 안내");
      notes.forEach(function (n) { out.push("* " + n); });
    }
    if (d.contact) {
      out.push("");
      out.push("#### 문의");
      out.push("* " + d.contact);
    }
    out.push("");
    return out.join("\n");
  }

  /* ===== 최상위 README.md 에 추가할 블록 ===== */
  function buildRootBlock(d) {
    var out = [];
    var bios = lines(d.bios), paras = lines(d.content);
    out.push("#### " + d.year + "년 AI 연구회 " + d.no + "차 특강");
    out.push("* 일시 :  " + dateText(d));
    out.push("* 장소 : " + d.place);
    out.push("* 강사 :  " + speakerLine(d));
    out.push("* 강연 제목 : " + d.title + (d.subtitle ? " - " + d.subtitle : ""));
    if (bios.length) out.push("* 강사 약력 : " + bios.join(" / "));
    out.push("* 참가비 : " + (d.fee || "무료"));
    if (d.formUrl) out.push("* [참가 등록 폼](" + d.formUrl + ")");
    out.push("* [세미나 포스터](" + HOMEPAGE + "/" + dirName(d) + "/poster/)");
    if (paras.length) {
      out.push("* 특강 소개글 :");
      paras.forEach(function (p) { out.push(p); });
    }
    out.push("");
    out.push("* [발표 자료와 행사 안내](" + GITHUB + "/tree/main/" + dirName(d) + "/README.md)");
    out.push("");
    return out.join("\n");
  }

  function appendRootBlock(readme, block) {
    return readme.replace(/\s*$/, "") + "\n\n" + block + "\n";
  }

  /* ===== index.html lectures 항목 ===== */
  function buildEntry(d) {
    var j = JSON.stringify;
    var bios = lines(d.bios);
    var desc = lines(d.content).join("\n");
    /* 특강 전에는 발표 자료·행사 사진이 없으므로 pending 으로 두고,
       홈에서 누르면 "아직 공개되지 않았습니다" 안내가 뜬다. 나중에 href만 채워 넣으면 된다. */
    var files = [
      { label: "발표 자료 (PDF)", ic: "📄", pending: true, note: "특강이 끝난 뒤 이곳에 공개됩니다." },
      { label: "세미나 포스터", ic: "🖼️", primary: true, href: dirName(d) + "/poster/" },
      { label: "행사 사진 폴더", ic: "🖼️", pending: true, note: "특강이 끝난 뒤 이곳에 공개됩니다." }
    ];
    if (d.formUrl) files.push({ label: "참가 등록 폼", ic: "📝", href: d.formUrl });
    files.push({ label: "자료 폴더", ic: "📁", href: GITHUB + "/tree/main/" + dirName(d) });

    var L = [];
    L.push("  {");
    L.push("    id:" + j(lectureId(d)) + ", no:" + j(pad2(Number(d.no))) + ", kicker:" + j(d.year + " · " + d.no + "차 특강") + ",");
    L.push("    title:" + j(d.title) + ",");
    if (d.subtitle) L.push("    subtitle:" + j(d.subtitle) + ",");
    L.push("    date:" + j(dateText(d)) + ",");
    L.push("    place:" + j(d.place) + ",");
    L.push("    speaker:" + j(speakerLine(d)) + ",");
    L.push("    presenter:" + j([d.speaker, d.speakerTitle].filter(Boolean).join(" ")) + ", org:" + j(d.speakerOrg || "") + ",");
    if (bios.length) L.push("    bio:" + j(bios.join(" · ")) + ",");
    L.push("    desc:" + j(desc) + ",");
    L.push("    upcoming:true,");
    L.push("    poster:" + j(dirName(d) + "/poster/") + ",");
    if (d.formUrl) L.push("    formUrl:" + j(d.formUrl) + ",");
    L.push("    files:[");
    L.push(files.map(function (f) {
      var parts = ["label:" + j(f.label), "ic:" + j(f.ic)];
      if (f.primary) parts.push("primary:true");
      if (f.pending) parts.push("pending:true", "note:" + j(f.note));
      else parts.push("href:" + j(f.href));
      return "      {" + parts.join(", ") + "}";
    }).join(",\n"));
    L.push("    ],");
    L.push("    dir:" + j(dirName(d) + "/pics/") + ",");
    L.push("    pics:[]");
    L.push("  }");
    return L.join("\n");
  }

  /* index.html 소스에 항목 삽입 (같은 id가 있으면 교체) */
  var BEGIN = "/* LECTURES:BEGIN */", END = "/* LECTURES:END */";
  function insertEntry(html, entry, id) {
    var b = html.indexOf(BEGIN), e = html.indexOf(END);
    if (b < 0 || e < 0) {
      /* 마커가 없는 index.html(예: 마커 도입 전 버전을 pull한 경우)이면 lectures 배열을 찾아 마커를 넣어준다 */
      var m = /const lectures\s*=\s*\[\r?\n/.exec(html);
      if (!m) {
        throw new Error("index.html에서 lectures 배열을 찾지 못했습니다. " +
          "const lectures = [ 바로 아래에 /* LECTURES:BEGIN */, 배열 끝에 /* LECTURES:END */ 를 넣어주세요.");
      }
      var s = m.index + m[0].length;
      var t = html.indexOf("\n];", s);
      if (t < 0) throw new Error("index.html의 lectures 배열 끝(\\n];)을 찾지 못했습니다.");
      html = html.slice(0, s) + "  " + BEGIN + "\n" +
             html.slice(s, t + 1) + "  " + END + "\n" + html.slice(t + 1);
      b = html.indexOf(BEGIN);
      e = html.indexOf(END);
    }
    var head = html.slice(0, b + BEGIN.length);
    var body = html.slice(b + BEGIN.length, e);
    var tail = html.slice(e);

    /* 이미 같은 회차가 있으면 그 블록을 통째로 교체 */
    var idRe = new RegExp("\\n  \\{\\n    id:\"" + id + "\"[\\s\\S]*?\\n  \\}(,?)");
    if (idRe.test(body)) {
      body = body.replace(idRe, function (m, comma) { return "\n" + entry + comma; });
      return head + body + tail;
    }
    var trimmed = body.replace(/\s*$/, "");
    var sep = trimmed.length ? ",\n" : "\n";
    return head + trimmed + sep + entry + "\n  " + tail;
  }

  var Poster = {
    buildPage: buildPage, buildReadme: buildReadme, buildEntry: buildEntry,
    buildRootBlock: buildRootBlock, appendRootBlock: appendRootBlock,
    insertEntry: insertEntry, dirName: dirName, lectureId: lectureId,
    speakerLine: speakerLine, dateText: dateText, HOMEPAGE: HOMEPAGE, GITHUB: GITHUB
  };
  if (typeof module !== "undefined" && module.exports) module.exports = Poster;
  else global.Poster = Poster;
})(typeof window !== "undefined" ? window : globalThis);
