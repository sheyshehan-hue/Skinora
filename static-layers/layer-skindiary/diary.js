/* Skinora skin progress diary.
   Every AI skin scan becomes a diary entry. The diary page shows a before and after slider, a progress
   chart, change scores such as "Redness down 20%", notes, a reminder to rescan every 2 weeks, and a
   shareable progress card.
   Privacy: everything stays in this browser. Scores and notes are in localStorage (skd-diary). A photo is
   kept only when the customer taps "Keep this photo", and then only in this browser's IndexedDB
   (skinora-diary). Nothing in this file sends a photo or a score anywhere. */
(function () {
  'use strict';
  if (window.SKDIARY) return;

  var EVERY = 14; // days between scans
  var DAY = 864e5;
  var METRICS = [
    ['hydration', 'Moisture', 'Dryness'], ['oilBalance', 'Oil control', 'Oiliness'], ['pores', 'Pores', 'Visible pores'], ['clarity', 'Clear skin', 'Breakouts'],
    ['redness', 'Calm skin', 'Redness'], ['evenTone', 'Even tone', 'Dark spots'], ['texture', 'Smooth and glowing', 'Dullness'], ['fineLines', 'Firm skin', 'Fine lines']
  ];
  var SKIN = { oily: 'Oily', combination: 'Combination', dry: 'Dry', normal: 'Normal', sensitive: 'Sensitive' };
  var GOOD = '#5E7356', BAD = '#8E4A49', GOLD = '#C6A15B';

  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  var fmt = function (t, o) { return new Date(t).toLocaleDateString('en-GB', o || { day: 'numeric', month: 'short' }); };
  var longDate = function (t) { return fmt(t, { day: 'numeric', month: 'long', year: 'numeric' }); };
  var svg = function (p, w) { return '<svg xmlns="http://www.w3.org/2000/svg" width="' + (w || 16) + '" height="' + (w || 16) + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + p + '</svg>'; };
  var IC = {
    camera: '<path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/><circle cx="12" cy="13" r="3"/>',
    shield: '<path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/><path d="m9 12 2 2 4-4"/>',
    cal: '<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>',
    share: '<path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><path d="m16 6-4-4-4 4"/><path d="M12 2v13"/>',
    trash: '<path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>',
    check: '<path d="M20 6 9 17l-5-5"/>',
    arrows: '<path d="m9 18-6-6 6-6M15 6l6 6-6 6"/>',
    book: '<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20V3H6.5A2.5 2.5 0 0 0 4 5.5z"/><path d="M4 19.5V21h16"/>',
    img: '<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-5-5L5 21"/>'
  };

  /* ---------- entries: scores and notes (localStorage) ---------- */
  var LS = {
    get: function (k, d) { try { var v = JSON.parse(localStorage.getItem(k)); return v == null ? d : v; } catch (e) { return d; } },
    set: function (k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
  };
  var entries = {
    // Newest first. Scans saved by the skin scan (skd-scans, which keeps only 12) are copied in, so the diary keeps the full history.
    all: function () {
      var l = LS.get('skd-diary', []), gone = LS.get('skd-diary-gone', []), have = {};
      l.forEach(function (e) { have[e.at] = 1; });
      var added = 0;
      LS.get('skd-scans', []).forEach(function (s) {
        if (!s || !s.at || !s.scores || have[s.at] || gone.indexOf(s.at) >= 0) return;
        l.push({ at: s.at, engine: s.engine, skinType: s.skinType, concerns: s.concerns || [], scores: s.scores, overall: s.overall, note: '', photo: false });
        have[s.at] = 1; added++;
      });
      l.sort(function (a, b) { return b.at - a.at; });
      if (added) LS.set('skd-diary', l.slice(0, 120));
      return l;
    },
    save: function (l) { LS.set('skd-diary', l.slice(0, 120)); },
    patch: function (at, p) { var l = entries.all(); l.forEach(function (e) { if (e.at === at) for (var k in p) e[k] = p[k]; }); entries.save(l); },
    remove: function (at) {
      entries.save(entries.all().filter(function (e) { return e.at !== at; }));
      var gone = LS.get('skd-diary-gone', []); gone.push(at); LS.set('skd-diary-gone', gone.slice(-200));
      LS.set('skd-scans', LS.get('skd-scans', []).filter(function (s) { return s.at !== at; }));
      photos.del(at);
    },
    clear: function () {
      var gone = LS.get('skd-diary-gone', []);
      entries.all().forEach(function (e) { gone.push(e.at); });
      LS.set('skd-diary-gone', gone.slice(-200)); LS.set('skd-diary', []); LS.set('skd-scans', []);
      photos.clear();
    }
  };

  /* ---------- photos (IndexedDB, this browser only) ---------- */
  var dbp = null;
  function db() {
    if (!dbp) dbp = new Promise(function (ok, bad) {
      if (!window.indexedDB) return bad(new Error('no indexedDB'));
      var r = indexedDB.open('skinora-diary', 1);
      r.onupgradeneeded = function () { r.result.createObjectStore('photos'); };
      r.onsuccess = function () { ok(r.result); };
      r.onerror = function () { bad(r.error); };
    });
    return dbp;
  }
  function tx(mode, fn) {
    return db().then(function (d) {
      return new Promise(function (ok, bad) {
        var t = d.transaction('photos', mode), st = t.objectStore('photos'), req = fn(st);
        t.oncomplete = function () { ok(req && req.result); };
        t.onerror = t.onabort = function () { bad(t.error); };
      });
    });
  }
  var photos = {
    get: function (at) { return tx('readonly', function (s) { return s.get(at); }).catch(function () { return null; }); },
    put: function (at, url) { return tx('readwrite', function (s) { return s.put(url, at); }); },
    del: function (at) { return tx('readwrite', function (s) { return s.delete(at); }).catch(function () {}); },
    clear: function () { return tx('readwrite', function (s) { return s.clear(); }).catch(function () {}); }
  };
  function shrink(url, max) {
    return new Promise(function (ok, bad) {
      var img = new Image();
      img.onload = function () {
        var k = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight)), c = document.createElement('canvas');
        c.width = Math.round(img.naturalWidth * k); c.height = Math.round(img.naturalHeight * k);
        c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
        ok(c.toDataURL('image/jpeg', 0.82));
      };
      img.onerror = bad; img.src = url;
    });
  }

  /* ---------- change scores ---------- */
  // A score is out of 100, higher is better. The problem behind it (redness, dryness…) is 100 minus the score,
  // so Calm skin 60 → 68 means redness went from 40 to 32: "Redness down 20%".
  function change(a, b, key) {
    var x = 100 - (a.scores[key] || 0), y = 100 - (b.scores[key] || 0), pts = (b.scores[key] || 0) - (a.scores[key] || 0);
    var pct = x > 0 ? Math.round((x - y) / x * 100) : (pts > 0 ? 100 : 0);
    return { pct: Math.max(-99, Math.min(99, pct)), pts: pts };
  }
  function changes(a, b) {
    return METRICS.map(function (m) { var c = change(a, b, m[0]); return { key: m[0], name: m[2], score: m[1], pct: c.pct, pts: c.pts, from: a.scores[m[0]], to: b.scores[m[0]] }; })
      .sort(function (p, q) { return Math.abs(q.pct) - Math.abs(p.pct) || q.pct - p.pct; });
  }
  function say(c) {
    if (c.pct >= 3) return c.name + ' down ' + c.pct + '%';
    if (c.pct <= -3) return c.name + ' up ' + Math.abs(c.pct) + '%';
    return c.name + ' about the same';
  }
  var tone = function (c) { return c.pct >= 3 ? 'is-good' : c.pct <= -3 ? 'is-bad' : 'is-same'; };
  var arrow = function (c) { return c.pct >= 3 ? '↓' : c.pct <= -3 ? '↑' : '·'; };
  function span(a, b) {
    var d = Math.round(Math.abs(b - a) / DAY);
    if (d < 1) return 'today';
    if (d < 14) return d + (d === 1 ? ' day' : ' days');
    var w = Math.round(d / 7); return w + ' weeks';
  }
  function weekLabel(e, first) { var w = Math.round((e.at - first.at) / (7 * DAY)); return e.at === first.at ? 'Start' : w < 1 ? Math.max(1, Math.round((e.at - first.at) / DAY)) + ' days in' : 'Week ' + w; }

  /* ---------- small pieces ---------- */
  function ring(v, size) {
    var r = 52, c = 2 * Math.PI * r;
    return '<svg viewBox="0 0 120 120" class="skd-ring" style="width:' + (size || 120) + 'px;height:' + (size || 120) + 'px" role="img" aria-label="Skin score ' + v + ' out of 100"><circle cx="60" cy="60" r="' + r + '" fill="none" stroke="currentColor" stroke-opacity=".1" stroke-width="6"/><circle cx="60" cy="60" r="' + r + '" fill="none" stroke="' + GOLD + '" stroke-width="6" stroke-linecap="round" stroke-dasharray="' + c + '" stroke-dashoffset="' + c * (1 - v / 100) + '" transform="rotate(-90 60 60)"/><text x="60" y="68" text-anchor="middle" font-size="36" fill="currentColor" style="font-family:var(--font-serif),Georgia,serif">' + v + '</text></svg>';
  }
  function pills(list, n) {
    return '<ul class="skd-pills">' + list.slice(0, n || list.length).map(function (c) {
      return '<li class="' + tone(c) + '"><span aria-hidden="true">' + arrow(c) + '</span>' + esc(say(c)) + '</li>';
    }).join('') + '</ul>';
  }
  function due(last) {
    var next = last.at + EVERY * DAY, left = Math.ceil((next - Date.now()) / DAY);
    return { next: next, left: left, now: left <= 0 };
  }

  /* ---------- 1. after a scan: add it to the diary ---------- */
  function onScan(ev) {
    var d = ev.detail || {}, s = d.scan;
    if (!s || !s.at) return;
    var l = entries.all(), me = null, prev = null;
    l.forEach(function (e, i) { if (e.at === s.at) { me = e; prev = l[i + 1] || null; } });
    if (!me) return;
    var first = l[l.length - 1];
    var top = document.querySelector('.sks-result-top');
    var host = top && top.parentNode;
    if (!host || host.querySelector('.skd-saved')) return;
    var box = document.createElement('div');
    box.className = 'skd-saved animate-fadeUp';
    var n = l.length;
    var head = prev
      ? '<h2 class="font-serif text-3xl font-light">Since your last scan on ' + esc(fmt(prev.at, { day: 'numeric', month: 'long' })) + '</h2>' + pills(changes(prev, me), 3) +
        (first !== prev ? '<p class="mt-4 text-sm text-ink-500">Since you started ' + esc(span(first.at, me.at)) + ' ago: <b class="font-medium text-ink">' + esc(say(changes(first, me)[0])) + '</b>, score ' + first.overall + ' → ' + me.overall + '.</p>' : '')
      : '<h2 class="font-serif text-3xl font-light">Your diary starts today</h2><p class="mt-3 text-sm text-ink-600">Scan again in 2 weeks and we will show you what changed, like “Redness down 20%”.</p>';
    box.innerHTML = '<div><p class="eyebrow">Skin diary · Entry ' + n + '</p>' + head + '</div>' +
      '<div class="skd-keep">' + (d.photo ? keepHtml(false) : '') +
      '<a class="btn-outline mt-3 w-full" href="diary.html">' + svg(IC.book) + ' Open my skin diary</a></div>';
    var cta = host.lastElementChild;
    host.insertBefore(box, cta);
    if (d.photo) {
      box.addEventListener('click', function (e) {
        var b = e.target.closest('[data-k]'); if (!b) return;
        if (b.getAttribute('data-k') === 'keep') {
          b.disabled = true;
          shrink(d.photo, 720).then(function (u) { return photos.put(s.at, u); }).then(function () {
            entries.patch(s.at, { photo: true });
            box.querySelector('.skd-keep-photo').outerHTML = keepHtml(true);
          }, function () { b.disabled = false; b.textContent = 'Could not keep the photo in this browser'; });
        } else {
          photos.del(s.at); entries.patch(s.at, { photo: false });
          box.querySelector('.skd-keep-photo').outerHTML = keepHtml(false);
        }
      });
    }
  }
  function keepHtml(kept) {
    return '<div class="skd-keep-photo">' + (kept
      ? '<p class="skd-kept">' + svg(IC.check, 16) + ' Photo kept for your before and after</p><p class="text-xs text-ink-500">Only on this device. <button data-k="unkeep" class="underline">Remove it</button></p>'
      : '<button data-k="keep" class="btn-primary w-full">' + svg(IC.img) + ' Keep this photo for my before and after</button><p class="mt-2 text-xs text-ink-500">' + svg(IC.shield, 12) + ' It stays on this device only. It is never uploaded.</p>') + '</div>';
  }

  /* ---------- 2. account page: link to the diary ---------- */
  function account() {
    var sec = document.getElementById('sks-my-skin');
    if (!sec || sec.querySelector('.skd-acct')) return;
    var l = entries.all(), row = document.createElement('div');
    row.className = 'skd-acct';
    if (!l.length) { row.innerHTML = '<span>' + svg(IC.book) + ' Your skin diary starts with your first scan.</span>'; }
    else {
      var u = due(l[0]), first = l[l.length - 1];
      var txt = l.length > 1 ? esc(say(changes(first, l[0])[0])) + ' since ' + esc(fmt(first.at)) : '1 entry so far';
      row.innerHTML = '<span>' + svg(IC.book) + ' <b>Skin diary</b> · ' + txt + ' · ' + (u.now ? 'new scan due now' : 'next scan ' + esc(fmt(u.next))) + '</span><a href="diary.html" class="skd-link">Open my diary</a>';
    }
    sec.appendChild(row);
  }

  /* ---------- 3. the diary page ---------- */
  function sample() {
    // An example diary for the empty state. Not saved and never mixed with real scans.
    var now = Date.now(), base = { hydration: 52, oilBalance: 58, pores: 60, clarity: 55, redness: 50, evenTone: 57, texture: 59, fineLines: 70 };
    var step = { hydration: 4, oilBalance: 2, pores: 1.5, clarity: 3.5, redness: 5, evenTone: 2, texture: 3, fineLines: 1 };
    var notes = ['Started the CeraVe cleanser and SPF 50 every morning.', 'Skin felt tight on day 3, added the Hyaluronic Acid serum.', 'Fewer red patches after workouts.', 'Busy week, slept late. One new pimple on my chin.', 'Best my cheeks have looked in months.'];
    return [0, 1, 2, 3, 4].map(function (i) {
      var s = {}; METRICS.forEach(function (m) { s[m[0]] = Math.round(Math.min(95, base[m[0]] + step[m[0]] * i - (i === 3 ? 2 : 0))); });
      var o = Math.round(METRICS.reduce(function (t, m) { return t + s[m[0]]; }, 0) / METRICS.length);
      return { at: now - (4 - i) * 14 * DAY - 3600e3, engine: 'sample', skinType: 'combination', concerns: ['redness', 'dryness'], scores: s, overall: o, note: notes[i], photo: false };
    }).reverse();
  }

  function page(root) {
    var example = /[?&]example=1/.test(location.search);
    var l = example ? sample() : entries.all();
    var ui = { metric: 'overall', a: null, b: null, sharePhotos: false };
    var urls = {};

    function draw() {
      if (!l.length) return empty();
      var last = l[0], first = l[l.length - 1], u = due(last);
      var withPhoto = l.filter(function (e) { return e.photo && urls[e.at]; });
      if (ui.a == null || !urls[ui.a]) ui.a = withPhoto.length ? withPhoto[withPhoto.length - 1].at : null;
      if (ui.b == null || !urls[ui.b]) ui.b = withPhoto.length ? withPhoto[0].at : null;
      var ch = l.length > 1 ? changes(first, last) : [];
      var best = ch.filter(function (c) { return c.pct >= 3; });

      root.innerHTML =
        (example ? '<div class="skd-example"><b>This is an example diary.</b> Your own diary starts with your first skin scan and is kept only on your device. <a href="quiz.html?scan=1">Scan my skin</a> · <a href="diary.html">Back to my diary</a></div>' : '') +
        // Top: headline change and when to scan next
        '<section class="skd-top">' +
        '<div class="skd-hero">' + ring(last.overall, 132) + '<div>' +
        (l.length > 1
          ? '<p class="eyebrow">' + esc(span(first.at, last.at)) + ' · ' + l.length + ' scans</p><h2 class="skd-big">' + (best.length ? esc(say(best[0])) : 'Score ' + first.overall + ' → ' + last.overall) + '</h2>' +
            '<p class="mt-3 text-ink-600">Your skin score went from <b class="font-medium text-ink">' + first.overall + '</b> on ' + esc(fmt(first.at, { day: 'numeric', month: 'long' })) + ' to <b class="font-medium text-ink">' + last.overall + '</b> on ' + esc(fmt(last.at, { day: 'numeric', month: 'long' })) + '.</p>'
          : '<p class="eyebrow">Entry 1 · ' + esc(fmt(last.at, { day: 'numeric', month: 'long' })) + '</p><h2 class="skd-big"><em>' + esc(SKIN[last.skinType] || last.skinType || '') + '</em> skin, your starting point</h2><p class="mt-3 text-ink-600">Scan again in 2 weeks in the same light and we will show you what changed.</p>') +
        '</div></div>' +
        '<aside class="skd-due' + (u.now ? ' is-now' : '') + '"><p class="eyebrow">' + svg(IC.cal, 14) + ' Next scan</p>' +
        '<p class="mt-3 font-serif text-3xl">' + (u.now ? 'Due now' : u.left === 1 ? 'Tomorrow' : 'In ' + u.left + ' days') + '</p><p class="text-sm text-ink-500">' + (u.now ? 'It has been ' + esc(span(last.at, Date.now())) + ' since your last scan.' : esc(fmt(u.next, { weekday: 'long', day: 'numeric', month: 'long' }))) + '</p>' +
        '<a class="' + (u.now ? 'btn-primary' : 'btn-outline') + ' mt-5 w-full" href="quiz.html?scan=1">' + svg(IC.camera) + ' Scan my skin</a>' +
        '<button data-d="ics" class="skd-link mt-4">Add a reminder every 2 weeks to my calendar</button></aside>' +
        '</section>' +
        (ch.length ? '<section class="skd-sec"><div class="skd-sec-head"><h3 class="skd-h3">What changed since you started</h3><p class="text-sm text-ink-500">' + esc(fmt(first.at, { day: 'numeric', month: 'long' })) + ' to ' + esc(fmt(last.at, { day: 'numeric', month: 'long' })) + '</p></div>' + changeGrid(ch) + '</section>' : '') +
        // Before and after
        '<section class="skd-sec"><div class="skd-sec-head"><h3 class="skd-h3">Before and after</h3>' + (withPhoto.length > 1 ? pickers(withPhoto) : '') + '</div>' + compare(withPhoto) + '</section>' +
        // Chart
        (l.length > 1 ? '<section class="skd-sec"><div class="skd-sec-head"><h3 class="skd-h3">Your progress</h3>' + chips() + '</div>' + chart() + '</section>' : '') +
        // Timeline
        '<section class="skd-sec"><div class="skd-sec-head"><h3 class="skd-h3">Timeline</h3><p class="text-sm text-ink-500">Add a note to each entry, like a new product or a stressful week.</p></div><ol class="skd-timeline">' + l.map(card).join('') + '</ol></section>' +
        // Share
        (l.length > 1 ? '<section class="skd-sec skd-share"><div><h3 class="skd-h3">Share your progress</h3><p class="mt-2 text-sm text-ink-600">Make a picture of your results to post or send to a friend. Your photos are added only if you choose.</p>' +
          (withPhoto.length > 1 ? '<label class="skd-check"><input type="checkbox" data-d="sharephotos"' + (ui.sharePhotos ? ' checked' : '') + '> Add my before and after photos</label>' : '') +
          '<div class="mt-6 flex flex-wrap gap-3"><button data-d="share" class="btn-primary">' + svg(IC.share) + ' Share my progress</button><button data-d="download" class="btn-outline">Save the picture</button></div></div><div class="skd-share-prev" data-d-prev></div></section>' : '') +
        // Privacy
        '<section class="skd-privacy"><p>' + svg(IC.shield, 16) + ' <span>Your diary is kept only in this browser on this device. Photos are never uploaded, and only you can see them. If you clear your browser data, the diary is cleared too.</span></p>' +
        (example ? '' : '<button data-d="wipe" class="skd-link">Delete my diary and photos</button>') + '</section>';
      bindSlider();
      if (l.length > 1) sharePreview();
    }

    function empty() {
      root.innerHTML = '<section class="skd-empty"><div class="skd-empty-ic">' + svg(IC.book, 28) + '</div><h2 class="font-serif text-4xl font-light">Your diary starts with your first scan</h2>' +
        '<p class="mt-4 text-ink-600">Take a selfie and our AI scores 8 things, like moisture, redness and dark spots. Scan again every 2 weeks and see your skin change, with a before and after and scores like “Redness down 20%”.</p>' +
        '<div class="mt-8 flex flex-wrap justify-center gap-3"><a class="btn-primary" href="quiz.html?scan=1">' + svg(IC.camera) + ' Scan my skin</a><a class="btn-outline" href="diary.html?example=1">See an example</a></div>' +
        '<p class="mt-8 flex items-center justify-center gap-2 text-xs text-ink-500">' + svg(IC.shield, 14) + ' Your photos and scores stay on your device.</p></section>';
    }

    function changeGrid(ch) {
      return '<ul class="skd-changes">' + ch.map(function (c) {
        return '<li class="' + tone(c) + '"><p class="skd-ch-name">' + esc(c.name) + '</p><p class="skd-ch-big">' + (c.pct >= 3 ? 'Down ' + c.pct + '%' : c.pct <= -3 ? 'Up ' + Math.abs(c.pct) + '%' : 'Same') + '</p>' +
          '<p class="skd-ch-sub">' + esc(c.score) + ' score ' + c.from + ' → ' + c.to + '</p></li>';
      }).join('') + '</ul>';
    }

    function pickers(withPhoto) {
      var opt = function (sel) { return withPhoto.map(function (e) { return '<option value="' + e.at + '"' + (e.at === sel ? ' selected' : '') + '>' + esc(fmt(e.at, { day: 'numeric', month: 'short', year: 'numeric' })) + '</option>'; }).join(''); };
      return '<div class="skd-pick"><label>Before <select data-d="a">' + opt(ui.a) + '</select></label><label>After <select data-d="b">' + opt(ui.b) + '</select></label></div>';
    }

    function compare(withPhoto) {
      if (withPhoto.length < 2) {
        var one = withPhoto[0];
        return '<div class="skd-cmp-empty">' + (one ? '<img src="' + urls[one.at] + '" alt="Your photo from ' + esc(fmt(one.at)) + '">' : '<div class="skd-cmp-ph">' + svg(IC.img, 30) + '</div>') +
          '<div><p class="font-serif text-2xl">' + (one ? 'One photo saved. Keep your next scan photo too.' : 'Keep your scan photos to see them side by side') + '</p>' +
          '<p class="mt-2 text-sm text-ink-600">After each scan, tap “Keep this photo for my before and after”. Photos stay on this device only. For the clearest result, use the same window light and the same distance each time.</p></div></div>';
      }
      var A = l.filter(function (e) { return e.at === ui.a; })[0], B = l.filter(function (e) { return e.at === ui.b; })[0];
      var ch = changes(A, B);
      return '<div class="skd-cmp-wrap"><div class="skd-cmp" data-d-cmp style="--x:50%">' +
        '<img src="' + urls[A.at] + '" alt="Before, ' + esc(fmt(A.at)) + '"><img class="skd-cmp-after" src="' + urls[B.at] + '" alt="After, ' + esc(fmt(B.at)) + '">' +
        '<span class="skd-tag l">Before · ' + esc(fmt(A.at)) + '</span><span class="skd-tag r">After · ' + esc(fmt(B.at)) + '</span>' +
        '<div class="skd-handle" aria-hidden="true"><span>' + svg(IC.arrows, 16) + '</span></div>' +
        '<input type="range" min="0" max="100" value="50" aria-label="Slide to compare before and after" data-d="slide"></div>' +
        '<div class="skd-cmp-side"><p class="eyebrow">' + esc(span(A.at, B.at)) + ' apart</p><p class="mt-3 font-serif text-5xl">' + A.overall + ' <span class="text-ink-400">→</span> ' + B.overall + '</p><p class="text-sm text-ink-500">Skin score</p>' + pills(ch, 4) + '</div></div>';
    }

    function bindSlider() {
      var c = root.querySelector('[data-d-cmp]'); if (!c) return;
      c.querySelector('input').addEventListener('input', function (e) { c.style.setProperty('--x', e.target.value + '%'); });
    }

    function chips() {
      return '<div class="skd-chips" role="group" aria-label="Choose what to show">' + [['overall', 'Skin score']].concat(METRICS.map(function (m) { return [m[0], m[2]]; })).map(function (m) {
        return '<button data-d="metric" data-v="' + m[0] + '" aria-pressed="' + (ui.metric === m[0]) + '">' + esc(m[1]) + '</button>';
      }).join('') + '</div>';
    }

    function chart() {
      var pts = l.slice().reverse(), W = 720, H = 240, P = { l: 36, r: 18, t: 20, b: 34 };
      var isO = ui.metric === 'overall';
      // For a problem (redness…) show the level, so "down" on the chart means better, the same as the words.
      var val = function (e) { return isO ? e.overall : 100 - (e.scores[ui.metric] || 0); };
      var vs = pts.map(val), lo = Math.max(0, Math.floor((Math.min.apply(null, vs) - 8) / 10) * 10), hi = Math.min(100, Math.ceil((Math.max.apply(null, vs) + 8) / 10) * 10);
      var t0 = pts[0].at, t1 = pts[pts.length - 1].at || t0 + 1;
      var X = function (t) { return P.l + (t1 === t0 ? (W - P.l - P.r) / 2 : (t - t0) / (t1 - t0) * (W - P.l - P.r)); };
      var Y = function (v) { return P.t + (1 - (v - lo) / (hi - lo || 1)) * (H - P.t - P.b); };
      var line = pts.map(function (e, i) { return (i ? 'L' : 'M') + X(e.at).toFixed(1) + ' ' + Y(val(e)).toFixed(1); }).join(' ');
      var area = line + ' L' + X(t1).toFixed(1) + ' ' + (H - P.b) + ' L' + X(t0).toFixed(1) + ' ' + (H - P.b) + ' Z';
      var grid = '';
      for (var g = lo; g <= hi; g += 10) grid += '<line x1="' + P.l + '" x2="' + (W - P.r) + '" y1="' + Y(g) + '" y2="' + Y(g) + '" stroke="currentColor" stroke-opacity=".08"/><text x="' + (P.l - 8) + '" y="' + (Y(g) + 4) + '" text-anchor="end" font-size="11" fill="currentColor" fill-opacity=".45">' + g + '</text>';
      var dots = pts.map(function (e) { return '<circle cx="' + X(e.at) + '" cy="' + Y(val(e)) + '" r="4.5" fill="#fff" stroke="' + (isO ? '#1A1917' : GOLD) + '" stroke-width="2"><title>' + esc(fmt(e.at)) + ': ' + val(e) + '</title></circle>'; }).join('');
      var lab = pts.map(function (e, i) { if (pts.length > 6 && i % 2 && i !== pts.length - 1) return ''; return '<text x="' + X(e.at) + '" y="' + (H - 10) + '" text-anchor="middle" font-size="11" fill="currentColor" fill-opacity=".55">' + esc(fmt(e.at)) + '</text>'; }).join('');
      var name = isO ? 'Skin score (higher is better)' : METRICS.filter(function (m) { return m[0] === ui.metric; })[0][2] + ' level (lower is better)';
      return '<figure class="skd-chart"><svg viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="' + esc(name) + ' over time">' + grid +
        '<path d="' + area + '" fill="' + (isO ? '#1A1917' : GOLD) + '" fill-opacity=".06"/><path d="' + line + '" fill="none" stroke="' + (isO ? '#1A1917' : GOLD) + '" stroke-width="2" stroke-linejoin="round"/>' + dots + lab + '</svg><figcaption>' + esc(name) + '</figcaption></figure>';
    }

    function card(e, i) {
      var prev = l[i + 1], first = l[l.length - 1];
      var ch = prev ? changes(prev, e) : null;
      return '<li class="skd-entry"><div class="skd-entry-media">' + (e.photo && urls[e.at] ? '<img src="' + urls[e.at] + '" alt="Your photo from ' + esc(fmt(e.at)) + '" loading="lazy">' : ring(e.overall, 84)) + '</div>' +
        '<div class="skd-entry-body"><div class="skd-entry-top"><p><span class="skd-week">' + esc(weekLabel(e, first)) + '</span> ' + esc(longDate(e.at)) + '</p>' +
        '<p class="font-serif text-2xl">' + e.overall + (prev ? ' <span class="skd-delta ' + (e.overall >= prev.overall ? 'is-good' : 'is-bad') + '">' + (e.overall >= prev.overall ? '▲ ' : '▼ ') + Math.abs(e.overall - prev.overall) + '</span>' : '') + '</p></div>' +
        (ch ? pills(ch, 2) : '<p class="mt-2 text-sm text-ink-500"><em class="font-serif">' + esc(SKIN[e.skinType] || e.skinType || '') + '</em> skin · your first scan</p>') +
        (example ? (e.note ? '<p class="skd-note-ro">“' + esc(e.note) + '”</p>' : '') :
          '<label class="skd-note"><span class="skd-sr">Note for ' + esc(fmt(e.at)) + '</span><textarea rows="2" data-d="note" data-at="' + e.at + '" maxlength="400" placeholder="Add a note: new products, sleep, weather…">' + esc(e.note || '') + '</textarea></label>' +
          '<div class="skd-entry-tools">' + (e.photo && urls[e.at] ? '<button data-d="unphoto" data-at="' + e.at + '">Remove photo</button>' : '') + '<button data-d="del" data-at="' + e.at + '">' + svg(IC.trash, 13) + ' Delete entry</button></div>') +
        (e.engine === 'demo' ? '<p class="mt-2 text-[11px] text-ink-400">Demo estimate</p>' : '') + '</div></li>';
    }

    /* share picture */
    function picture() {
      var first = l[l.length - 1], last = l[0], ch = changes(first, last).filter(function (c) { return c.pct >= 3; }).slice(0, 3);
      if (!ch.length) ch = changes(first, last).slice(0, 3);
      var withP = ui.sharePhotos && ui.a && ui.b && urls[ui.a] && urls[ui.b];
      var A = withP ? l.filter(function (e) { return e.at === ui.a; })[0] : first, B = withP ? l.filter(function (e) { return e.at === ui.b; })[0] : last;
      if (withP) { ch = changes(A, B).filter(function (c) { return c.pct >= 3; }).slice(0, 3); if (!ch.length) ch = changes(A, B).slice(0, 3); }
      var load = function (u) { return new Promise(function (ok) { var im = new Image(); im.onload = function () { ok(im); }; im.onerror = function () { ok(null); }; im.src = u; }); };
      return Promise.all(withP ? [load(urls[A.at]), load(urls[B.at])] : []).then(function (ims) {
        var W = 1080, H = 1350, c = document.createElement('canvas'); c.width = W; c.height = H;
        var x = c.getContext('2d'), serif = 'Georgia, "Times New Roman", serif', sans = '"Helvetica Neue", Arial, sans-serif';
        x.fillStyle = '#F6F1E8'; x.fillRect(0, 0, W, H);
        x.strokeStyle = GOLD; x.lineWidth = 2; x.strokeRect(40, 40, W - 80, H - 80);
        x.fillStyle = '#1A1917'; x.textAlign = 'center';
        x.font = '500 30px ' + sans; x.fillText('S K I N O R A', W / 2, 120);
        x.fillStyle = '#9C7A3C'; x.font = '24px ' + sans; x.fillText('MY SKIN DIARY', W / 2, 168);
        x.fillStyle = '#1A1917'; x.font = 'italic 64px ' + serif; x.fillText('My skin in ' + span(A.at, B.at), W / 2, 262);
        var y = 300;
        if (withP && ims[0] && ims[1]) {
          var s = 440, gap = 30, x0 = (W - s * 2 - gap) / 2;
          [ims[0], ims[1]].forEach(function (im, i) {
            var side = Math.min(im.naturalWidth, im.naturalHeight), px = x0 + i * (s + gap);
            x.drawImage(im, (im.naturalWidth - side) / 2, (im.naturalHeight - side) / 2, side, side, px, y, s, s);
            x.fillStyle = 'rgba(26,25,23,.72)'; x.fillRect(px, y + s - 54, s, 54);
            x.fillStyle = '#F6F1E8'; x.font = '24px ' + sans; x.fillText((i ? 'AFTER · ' : 'BEFORE · ') + fmt(i ? B.at : A.at).toUpperCase(), px + s / 2, y + s - 19);
          });
          y += s + 90;
        } else y += 120;
        x.fillStyle = '#1A1917'; x.font = '300 ' + (withP ? 120 : 190) + 'px ' + serif;
        x.fillText(A.overall + '  →  ' + B.overall, W / 2, y + (withP ? 40 : 110));
        x.fillStyle = '#6b655c'; x.font = '26px ' + sans; x.fillText('SKIN SCORE', W / 2, y + (withP ? 92 : 180));
        y += withP ? 160 : 290;
        ch.forEach(function (cg, i) {
          x.fillStyle = cg.pct >= 3 ? GOOD : cg.pct <= -3 ? BAD : '#6b655c'; x.font = (i ? '' : 'italic ') + (i ? 46 : 58) + 'px ' + serif;
          x.fillText(say(cg), W / 2, y + i * 74);
        });
        x.fillStyle = '#8d877d'; x.font = '22px ' + sans; x.fillText('Tracked with the Skinora AI skin scan · skinora.lk', W / 2, H - 84);
        return c;
      });
    }
    function sharePreview() {
      var box = root.querySelector('[data-d-prev]'); if (!box) return;
      picture().then(function (c) { box.innerHTML = '<img alt="Your progress picture" src="' + c.toDataURL('image/jpeg', 0.85) + '">'; });
    }
    function blobOf(c) { return new Promise(function (ok) { c.toBlob(ok, 'image/png'); }); }
    function download(blob) {
      var a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'my-skinora-skin-diary.png';
      document.body.appendChild(a); a.click(); setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
    }

    function ics() {
      var last = l[0], start = new Date(Math.max(due(last).next, Date.now() + DAY));
      start.setHours(10, 0, 0, 0);
      var p = function (n) { return (n < 10 ? '0' : '') + n; };
      var d = function (t) { return t.getFullYear() + p(t.getMonth() + 1) + p(t.getDate()) + 'T' + p(t.getHours()) + p(t.getMinutes()) + '00'; };
      var end = new Date(start.getTime() + 15 * 60e3), url = location.href.replace(/diary\.html.*$/, 'quiz.html?scan=1');
      var txt = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Skinora//Skin diary//EN', 'BEGIN:VEVENT', 'UID:skin-diary-' + start.getTime() + '@skinora.lk',
        'DTSTAMP:' + d(new Date()), 'DTSTART:' + d(start), 'DTEND:' + d(end), 'RRULE:FREQ=WEEKLY;INTERVAL=2;COUNT=13',
        'SUMMARY:Skinora skin scan', 'DESCRIPTION:Time for your 2-week skin scan. Same window light\\, no makeup. ' + url, 'URL:' + url,
        'BEGIN:VALARM', 'TRIGGER:PT0M', 'ACTION:DISPLAY', 'DESCRIPTION:Skinora skin scan', 'END:VALARM', 'END:VEVENT', 'END:VCALENDAR'].join('\r\n');
      var a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([txt], { type: 'text/calendar' })); a.download = 'skinora-skin-scan.ics';
      document.body.appendChild(a); a.click(); setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
    }

    var t = null;
    root.addEventListener('input', function (e) {
      if (e.target.getAttribute('data-d') !== 'note') return;
      var at = +e.target.getAttribute('data-at'), v = e.target.value;
      clearTimeout(t); t = setTimeout(function () { entries.patch(at, { note: v }); l.forEach(function (x) { if (x.at === at) x.note = v; }); }, 300);
    });
    root.addEventListener('change', function (e) {
      var k = e.target.getAttribute('data-d');
      if (k === 'a' || k === 'b') { ui[k] = +e.target.value; draw(); }
      if (k === 'sharephotos') { ui.sharePhotos = e.target.checked; sharePreview(); }
    });
    root.addEventListener('click', function (e) {
      var b = e.target.closest('[data-d]'); if (!b || b.tagName === 'SELECT' || b.tagName === 'INPUT' || b.tagName === 'TEXTAREA') return;
      var k = b.getAttribute('data-d'), at = +b.getAttribute('data-at');
      if (k === 'metric') { ui.metric = b.getAttribute('data-v'); draw(); }
      if (k === 'ics') ics();
      if (k === 'del' && confirm('Delete the entry from ' + longDate(at) + '? Its photo is deleted too.')) { entries.remove(at); delete urls[at]; l = entries.all(); draw(); }
      if (k === 'unphoto') { photos.del(at); entries.patch(at, { photo: false }); delete urls[at]; l = entries.all(); draw(); }
      if (k === 'wipe' && confirm('Delete your whole skin diary, with all scores, notes and photos, from this device?')) { entries.clear(); urls = {}; l = []; draw(); }
      if (k === 'share' || k === 'download') {
        picture().then(blobOf).then(function (blob) {
          var file = window.File ? new File([blob], 'my-skinora-skin-diary.png', { type: 'image/png' }) : null;
          if (k === 'share' && file && navigator.canShare && navigator.canShare({ files: [file] })) {
            return navigator.share({ files: [file], title: 'My skin diary', text: 'My skin progress with Skinora' }).catch(function () {});
          }
          download(blob);
        });
      }
    });

    // Load the kept photos, then draw.
    Promise.all(l.filter(function (e) { return e.photo; }).map(function (e) { return photos.get(e.at).then(function (u) { if (u) urls[e.at] = u; }); })).then(draw, draw);
    draw();
  }

  window.addEventListener('sks:scan', onScan);
  window.SKDIARY = { entries: entries, photos: photos, changes: changes, say: say };
  var boot = function () {
    var path = (document.body.getAttribute('data-sk-path') || '').split('?')[0];
    if (path === '/account') { account(); setTimeout(account, 300); }
    var root = document.querySelector('[data-skd-page]');
    if (root) page(root);
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
