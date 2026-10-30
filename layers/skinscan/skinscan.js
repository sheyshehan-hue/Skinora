/* Skinora AI skin scan. Adds "Scan my skin" to the skin quiz and a "My skin" card to the account page.
   The selfie is analysed by /api/skin-scan (Claude) when the store has an AI key. Without one, or in the
   offline preview, a rough demo estimate is worked out in the browser. Photos are never stored; only the
   scores are kept, in this browser. */
(function () {
  'use strict';
  if (window.SKSCAN) return;

  var METRICS = [
    ['hydration', 'Moisture', 'dryness'], ['oilBalance', 'Oil control', 'pores'], ['pores', 'Pores', 'pores'], ['clarity', 'Clear skin', 'acne'],
    ['redness', 'Calm skin', 'redness'], ['evenTone', 'Even tone', 'pigmentation'], ['texture', 'Smooth and glowing', 'dullness'], ['fineLines', 'Firm skin', 'ageing']
  ];
  var WORD = { acne: 'pimples', pigmentation: 'dark spots', ageing: 'lines', dryness: 'dry skin', pores: 'big pores', dullness: 'dull skin', redness: 'red skin' };
  var SKIN = { oily: 'Oily', combination: 'Combination', dry: 'Dry', normal: 'Normal', sensitive: 'Sensitive' };
  var RESCAN_DAYS = 28;

  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  var words = function (l) { var w = l.map(function (c) { return WORD[c] || c; }); return w.length > 1 ? w.slice(0, -1).join(', ') + ' and ' + w[w.length - 1] : (w[0] || ''); };
  var overallOf = function (s) { return Math.round(METRICS.reduce(function (t, m) { return t + s[m[0]]; }, 0) / METRICS.length); };
  var svg = function (p, w) { return '<svg xmlns="http://www.w3.org/2000/svg" width="' + (w || 16) + '" height="' + (w || 16) + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round">' + p + '</svg>'; };
  var IC = {
    camera: '<path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/><circle cx="12" cy="13" r="3"/>',
    upload: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="m17 8-5-5-5 5"/><path d="M12 3v12"/>',
    back: '<path d="m12 19-7-7 7-7"/><path d="M19 12H5"/>',
    shield: '<path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/><path d="m9 12 2 2 4-4"/>',
    spark: '<path d="M9.94 14.06 4 20"/><path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M5.6 18.4l2.1-2.1M16.3 7.7l2.1-2.1"/>',
    list: '<path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/>'
  };

  /* ---------- saved scans (this browser only) ---------- */
  var store = {
    all: function () { try { return JSON.parse(localStorage.getItem('skd-scans') || '[]'); } catch (e) { return []; } },
    add: function (r) { var l = store.all(); l.unshift({ at: Date.now(), engine: r.engine, skinType: r.skinType, concerns: r.concerns, scores: r.scores, overall: r.overall, summary: r.summary }); try { localStorage.setItem('skd-scans', JSON.stringify(l.slice(0, 12))); } catch (e) {} }
  };

  /* ---------- photo → analysis ---------- */
  function toJpeg(src, max) {
    return new Promise(function (ok, bad) {
      var draw = function (img, w, h) {
        var k = Math.min(1, max / Math.max(w, h)), c = document.createElement('canvas');
        c.width = Math.round(w * k); c.height = Math.round(h * k);
        c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
        ok(c);
      };
      if (src instanceof HTMLCanvasElement) return draw(src, src.width, src.height);
      var img = new Image();
      img.onload = function () { draw(img, img.naturalWidth, img.naturalHeight); };
      img.onerror = function () { bad(new Error('We couldn\'t open that file. Please use a JPG or PNG photo.')); };
      img.src = URL.createObjectURL(src);
    });
  }

  // Demo mode: a rough reading of colour and shine from the centre of the photo. Not a real skin analysis.
  function estimate(canvas) {
    var n = 160, c = document.createElement('canvas'); c.width = c.height = n;
    var side = Math.min(canvas.width, canvas.height);
    c.getContext('2d').drawImage(canvas, (canvas.width - side) / 2, (canvas.height - side) / 2, side, side, 0, 0, n, n);
    var d = c.getContext('2d').getImageData(0, 0, n, n).data, red = 0, shine = 0, lum = 0, lum2 = 0, k = 0;
    for (var y = Math.floor(n * 0.2); y < n * 0.8; y++) for (var x = Math.floor(n * 0.25); x < n * 0.75; x++) {
      var i = (y * n + x) * 4, r = d[i], g = d[i + 1], b = d[i + 2], l = 0.299 * r + 0.587 * g + 0.114 * b;
      red += (r - g) / 255; if (l > 225) shine++; lum += l; lum2 += l * l; k++;
    }
    var mean = lum / k, spread = Math.sqrt(Math.max(0, lum2 / k - mean * mean)), sh = shine / k;
    var cl = function (v) { return Math.max(20, Math.min(95, Math.round(v))); };
    var s = {
      hydration: cl(78 - sh * 120 - spread * 0.2), oilBalance: cl(88 - sh * 400), pores: cl(80 - spread * 0.35), clarity: cl(82 - spread * 0.3),
      redness: cl(95 - Math.max(0, red / k - 0.12) * 260), evenTone: cl(90 - spread * 0.45), texture: cl(84 - spread * 0.3), fineLines: cl(76 - spread * 0.15)
    };
    var ranked = METRICS.slice().sort(function (a, b) { return s[a[0]] - s[b[0]]; }).map(function (m) { return m[2]; }).filter(function (c, i, l) { return l.indexOf(c) === i; }).slice(0, 3);
    return {
      engine: 'demo', scores: s, overall: overallOf(s), concerns: ranked,
      skinType: s.oilBalance < 55 ? 'oily' : s.hydration < 55 ? 'dry' : s.redness < 60 ? 'sensitive' : 'combination',
      summary: 'This is a demo estimate from the colour and shine in your photo. Answer 3 more questions and we will make your routine.'
    };
  }

  function analyse(canvas) {
    var data = canvas.toDataURL('image/jpeg', 0.85).split(',')[1];
    var ctl = window.AbortController ? new AbortController() : null, t = ctl && setTimeout(function () { ctl.abort(); }, 45000);
    return fetch('/api/skin-scan', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ image: data, consent: true }), signal: ctl && ctl.signal })
      .then(function (r) { return r.json().catch(function () { return {}; }).then(function (j) { return { status: r.status, j: j }; }); })
      .then(function (x) {
        if (x.status === 200 && x.j.result) return x.j.result;
        if (x.status === 422 && x.j.error) throw new Error(x.j.error);
        return estimate(canvas); // no AI key, or no server (offline preview)
      }, function (e) {
        if (e && e.message && e.name !== 'AbortError' && e.name !== 'TypeError') throw e;
        return estimate(canvas);
      })
      .then(function (r) { if (t) clearTimeout(t); return r; }, function (e) { if (t) clearTimeout(t); throw e; });
  }

  /* ---------- pieces ---------- */
  function ring(v) {
    var r = 52, c = 2 * Math.PI * r;
    return '<svg viewBox="0 0 120 120" class="sks-ring" role="img" aria-label="Skin score ' + v + ' out of 100"><circle cx="60" cy="60" r="' + r + '" fill="none" stroke="currentColor" stroke-opacity=".1" stroke-width="6"/><circle cx="60" cy="60" r="' + r + '" fill="none" stroke="#C6A15B" stroke-width="6" stroke-linecap="round" stroke-dasharray="' + c + '" stroke-dashoffset="' + c * (1 - v / 100) + '" transform="rotate(-90 60 60)"/><text x="60" y="66" text-anchor="middle" font-size="34" fill="currentColor" style="font-family:var(--font-serif),Georgia,serif">' + v + '</text></svg>';
  }
  function bars(s) {
    return '<ul class="sks-bars">' + METRICS.map(function (m, i) {
      var v = s[m[0]] || 0, col = v < 55 ? '#8E4A49' : v < 72 ? '#C6A15B' : '#7D8B74';
      return '<li class="animate-fadeUp" style="animation-delay:' + i * 70 + 'ms"><div class="sks-bar-top"><span>' + m[1] + '</span><span class="font-serif text-lg">' + v + '</span></div><div class="sks-track"><div style="width:' + v + '%;background:' + col + '"></div></div></li>';
    }).join('') + '</ul>';
  }
  function head(back, label) {
    return '<div class="mb-10 flex items-center gap-4"><button data-s="' + back + '" aria-label="Back">' + svg(IC.back, 18) + '</button><p class="eyebrow">' + label + '</p></div>';
  }

  /* ---------- quiz screens ---------- */
  function quiz(host) {
    var stream = null, consent = false, preview = null, error = null;
    var stop = function () { if (stream) stream.getTracks().forEach(function (t) { t.stop(); }); stream = null; };
    var wrap = function (h) { host.className = 'container-lux flex min-h-[78vh] flex-col items-center justify-center py-16'; host.innerHTML = '<div class="w-full max-w-2xl">' + h + '</div>'; window.scrollTo(0, 0); };

    function choose() {
      stop();
      wrap('<p class="eyebrow">Skin quiz</p><h1 class="animate-fadeUp mt-4 text-balance font-serif text-4xl font-light leading-tight sm:text-5xl">How do you want to start?</h1>' +
        '<div class="mt-10 grid gap-3">' +
        '<button data-s="intro" class="sks-choice animate-fadeUp is-new"><span class="sks-choice-ic">' + svg(IC.camera, 22) + '</span><span class="flex-1"><span class="sks-new">New · AI</span><span class="block font-serif text-2xl">Scan my skin</span><span class="block text-sm text-ink-500">Take a selfie. Our AI checks 8 things, like oil, dark spots and pores.</span></span></button>' +
        '<button data-s="questions" class="sks-choice animate-fadeUp" style="animation-delay:80ms"><span class="sks-choice-ic">' + svg(IC.list, 22) + '</span><span class="flex-1"><span class="block font-serif text-2xl">Answer 5 questions</span><span class="block text-sm text-ink-500">No photo needed. Takes about 1 minute.</span></span></button>' +
        '</div>');
    }
    function intro() {
      stop();
      wrap(head('choose', 'AI skin scan') +
        '<div class="animate-fadeUp"><h1 class="text-balance font-serif text-4xl font-light leading-tight sm:text-5xl">Take a selfie and we will read your skin</h1>' +
        '<p class="mt-5 text-ink-600">Our AI looks at 8 things, like moisture, oil, pores and dark spots. Then we make a routine for you.</p>' +
        '<ul class="sks-tips">' + ['Face a window or soft daylight', 'No filters and no heavy makeup', 'Hair away from your face, glasses off'].map(function (t, i) { return '<li><span class="font-serif text-xl text-champagne-700">0' + (i + 1) + '</span><br>' + t + '</li>'; }).join('') + '</ul>' +
        '<label class="sks-consent"><input type="checkbox" data-s="consent"' + (consent ? ' checked' : '') + '><span>I agree that Skinora can check my photo with AI. The photo is used once and never saved. Only my scores are kept. This is beauty advice, not medical advice.</span></label>' +
        (error ? '<p role="alert" class="sks-error">' + esc(error) + '</p>' : '') +
        '<div class="mt-8 grid gap-3 sm:grid-cols-2"><button data-s="camera" class="btn-primary"' + (consent ? '' : ' disabled') + '>' + svg(IC.camera) + ' Take a selfie</button><button data-s="upload" class="btn-outline"' + (consent ? '' : ' disabled') + '>' + svg(IC.upload) + ' Upload a photo</button></div>' +
        '<input type="file" accept="image/*" capture="user" data-s="file" hidden>' +
        '<p class="mt-6 flex items-center gap-2 text-xs text-ink-400">' + svg(IC.shield, 14) + ' Private. Your photo is never saved.</p></div>');
    }
    function camera() {
      error = null;
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) { error = 'Your camera can\'t open here. You can upload a selfie instead.'; return intro(); }
      navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 1280 } }, audio: false }).then(function (s) {
        stream = s;
        wrap(head('intro', 'AI skin scan') + '<div class="animate-fadeUp flex flex-col items-center"><div class="sks-cam"><video playsinline muted autoplay></video><div class="sks-oval"><div></div></div><p>Put your face inside the oval</p></div><button data-s="snap" class="btn-primary mt-8 w-full max-w-md">' + svg(IC.camera) + ' Take photo</button></div>');
        var v = host.querySelector('video'); v.srcObject = s; v.play().catch(function () {});
      }, function () { error = 'We couldn\'t open your camera. You can upload a selfie instead.'; intro(); });
    }
    function snap() {
      var v = host.querySelector('video');
      if (!v || !v.videoWidth) return;
      var side = Math.min(v.videoWidth, v.videoHeight), c = document.createElement('canvas');
      c.width = c.height = side;
      var x = c.getContext('2d');
      x.translate(side, 0); x.scale(-1, 1); // the preview is mirrored; save the photo the right way round
      x.drawImage(v, (v.videoWidth - side) / 2, (v.videoHeight - side) / 2, side, side, 0, 0, side, side);
      stop();
      run(c);
    }
    function run(src) {
      if (src.size > 15 * 1024 * 1024) { error = 'That photo is too big. Please use one under 15 MB.'; return intro(); }
      toJpeg(src, 896).then(function (c) {
        preview = c.toDataURL('image/jpeg', 0.8);
        wrap('<div class="flex flex-col items-center text-center"><div class="sks-scan"><img src="' + preview + '" alt="Your selfie"><div class="sks-beam"></div></div>' +
          '<p class="mt-8 flex items-center gap-2 font-serif text-2xl">' + svg(IC.spark, 18) + ' Reading your skin…</p><p class="mt-2 text-sm text-ink-500">Checking moisture, oil, pores, tone and lines. This takes a few seconds.</p></div>');
        return analyse(c);
      }).then(result, function (e) { error = (e && e.message) || 'Something went wrong. Please try again.'; intro(); });
    }
    function result(r) {
      var prev = store.all()[0];
      store.add(r);
      var delta = prev ? r.overall - prev.overall : null;
      host.className = 'container-lux py-16';
      host.innerHTML = '<div class="mx-auto max-w-4xl"><p class="eyebrow text-center">Your skin scan</p>' +
        '<div class="sks-result-top">' + (preview ? '<img src="' + preview + '" alt="" class="sks-thumb">' : '') + ring(r.overall) +
        '<div><h1 class="font-serif text-4xl font-light leading-tight sm:text-5xl"><em>' + esc(SKIN[r.skinType] || r.skinType) + '</em> skin' + (r.concerns.length ? ', work on ' + esc(words(r.concerns)) : '') + '</h1>' +
        '<p class="mt-4 text-ink-600">' + esc(r.summary) + '</p>' +
        (delta !== null ? '<p class="mt-4 text-sm" style="color:' + (delta >= 0 ? '#7D8B74' : '#8E4A49') + '">' + (delta >= 0 ? '▲ Up ' : '▼ Down ') + Math.abs(delta) + ' points since your last scan</p>' : '') +
        (r.engine === 'demo' ? '<p class="mt-4 text-xs text-ink-400">Demo estimate. The full AI scan turns on when the store\'s AI key is added.</p>' : '') + '</div></div>' +
        '<div class="mt-14 border-t border-ink/10 pt-10">' + bars(r.scores) + '</div>' +
        '<div class="mt-14 flex flex-col items-center gap-4 border-t border-ink/10 pt-10 text-center"><button data-s="routine" class="btn-primary">Make my routine</button>' +
        '<p class="text-sm text-ink-500">Saved to <a class="underline" href="account.html">My account</a>. Scan again in 4 weeks to see how your skin changes.</p>' +
        '<button data-s="intro" class="text-[11px] uppercase tracking-[0.16em] text-ink-500 hover:text-ink">Take a new photo</button></div></div>';
      host.__skScan = r;
      window.scrollTo(0, 0);
    }

    if (!host.__sksBound) {
      host.__sksBound = 1;
      host.addEventListener('click', function (e) {
        var b = e.target.closest('[data-s]'); if (!b || !host.contains(b)) return;
        var k = b.getAttribute('data-s');
        if (k === 'choose') choose();
        if (k === 'intro') { error = null; intro(); }
        if (k === 'questions') host.__skRender();
        if (k === 'camera' && consent) camera();
        if (k === 'upload' && consent) host.querySelector('[data-s="file"]').click();
        if (k === 'snap') snap();
        if (k === 'routine' && host.__skScan) host.__skStart(host.__skScan.skinType, host.__skScan.concerns);
      });
      host.addEventListener('change', function (e) {
        var k = e.target.getAttribute('data-s');
        if (k === 'consent') { consent = e.target.checked; host.querySelectorAll('[data-s="camera"],[data-s="upload"]').forEach(function (b) { b.disabled = !consent; }); }
        if (k === 'file') { var f = e.target.files && e.target.files[0]; e.target.value = ''; if (f) run(f); }
      });
      window.addEventListener('pagehide', stop);
    }
    if (/[?&]scan=1/.test(location.search)) intro(); else choose();
  }

  /* ---------- account: My skin ---------- */
  function account() {
    var grid = document.querySelector('main .grid.gap-14');
    if (!grid || document.getElementById('sks-my-skin')) return;
    var l = store.all(), last = l[0], sec = document.createElement('section');
    sec.id = 'sks-my-skin'; sec.className = 'sks-account';
    if (!last) {
      sec.innerHTML = '<div class="sks-account-empty"><div><p class="eyebrow">My skin</p><h2 class="mt-3 font-serif text-3xl">Scan your skin with AI</h2><p class="mt-2 text-sm text-ink-500">Take a selfie and get your skin score, then a routine made for you.</p></div><a class="btn-primary" href="quiz.html?scan=1">Scan my skin</a></div>';
    } else {
      var days = Math.floor((Date.now() - last.at) / 864e5), prev = l[1];
      sec.innerHTML = '<div class="flex flex-wrap items-end justify-between gap-4"><div><p class="eyebrow">My skin</p><h2 class="mt-3 font-serif text-3xl"><em>' + esc(SKIN[last.skinType] || last.skinType) + '</em> skin' + (last.concerns.length ? ', work on ' + esc(words(last.concerns)) : '') + '</h2>' +
        '<p class="mt-2 text-sm text-ink-500">Last scan ' + new Date(last.at).toLocaleDateString('en-GB', { day: 'numeric', month: 'long' }) + (prev ? ' · ' + (last.overall >= prev.overall ? '▲ up ' : '▼ down ') + Math.abs(last.overall - prev.overall) + ' points' : '') + '</p></div>' +
        '<a class="' + (days >= RESCAN_DAYS ? 'btn-primary' : 'btn-outline') + '" href="quiz.html?scan=1">' + (days >= RESCAN_DAYS ? 'Time for a new scan' : 'Scan again') + '</a></div>' +
        '<div class="sks-account-body">' + ring(last.overall) + bars(last.scores) + '</div>' +
        (l.length > 1 ? '<div class="sks-history">' + l.slice(0, 6).reverse().map(function (s) { return '<span><b>' + s.overall + '</b> ' + new Date(s.at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) + '</span>'; }).join('') + '</div>' : '');
    }
    grid.parentNode.insertBefore(sec, grid);
  }

  window.SKSCAN = { quiz: quiz };
  var onAccount = function () { if ((document.body.getAttribute('data-sk-path') || '').split('?')[0] === '/account') account(); };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', onAccount); else onAccount();
})();
