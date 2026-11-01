/* Skinora routine builder: a morning and night calendar for the routine the quiz or skin scan makes,
   reminders (phone calendar file and WhatsApp) and refill nudges before each product runs out.
   The routine lives in this browser (localStorage 'skd-routine'). WhatsApp reminders go through
   /api/routine-reminders, which needs a WhatsApp Business number (see README.md in this layer). */
(function () {
  'use strict';
  if (window.SKRT) return;

  var KEY = 'skd-routine', DAY = 864e5, SOON = 10;
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  var fmt = function (n) { return 'LKR ' + Math.round(n).toLocaleString('en-US'); };
  var dShort = function (t) { return new Date(t).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }); };
  var dLong = function (t) { return new Date(t).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' }); };
  var pad = function (n) { return (n < 10 ? '0' : '') + n; };
  var dayKey = function (t) { var d = new Date(t); return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); };
  var midnight = function (t) { var d = new Date(t); d.setHours(0, 0, 0, 0); return d.getTime(); };
  var addDays = function (t, n) { var d = new Date(t); d.setDate(d.getDate() + n); return d.getTime(); };
  var SKIN = { oily: 'Oily', combination: 'Combination', dry: 'Dry', normal: 'Normal', sensitive: 'Sensitive' };
  var WORD = { acne: 'pimples', pigmentation: 'dark spots', ageing: 'lines', dryness: 'dry skin', pores: 'big pores', dullness: 'dull skin', redness: 'red skin' };
  var words = function (l) { var w = (l || []).map(function (c) { return WORD[c] || c; }); return w.length > 1 ? w.slice(0, -1).join(', ') + ' and ' + w[w.length - 1] : (w[0] || ''); };
  var WD = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  var EXTRA_DAYS = [1, 3, 5]; // Monday, Wednesday, Friday

  var svg = function (p, w) { return '<svg xmlns="http://www.w3.org/2000/svg" width="' + (w || 16) + '" height="' + (w || 16) + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + p + '</svg>'; };
  var IC = {
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/>',
    moon: '<path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/>',
    check: '<path d="M20 6 9 17l-5-5"/>',
    cal: '<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>',
    wa: '<path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z"/><path d="M9 10a.5.5 0 0 0 1 0V9a.5.5 0 0 0-1 0v1a5 5 0 0 0 5 5h1a.5.5 0 0 0 0-1h-1a.5.5 0 0 0 0 1"/>',
    drop: '<path d="M12 22a7 7 0 0 0 7-7c0-2-1-3.9-3-5.5s-3.5-4-4-6.5c-.5 2.5-2 4.9-4 6.5C6 11.1 5 13 5 15a7 7 0 0 0 7 7z"/>',
    flame: '<path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"/>'
  };

  /* ---------- data ---------- */
  // The product data sits further down the page than this script, so read it on first use.
  var byId = {}, ready = false;
  function data() {
    if (ready) return;
    var D = window.__skfData || (function () { try { return (window.__skfData = JSON.parse(document.getElementById('sk-data').textContent)); } catch (e) { return null; } })();
    if (!D) return;
    (D.products || []).forEach(function (p) { byId[p.id] = p; });
    ready = true;
  }
  var get = function (k, d) { try { var v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } };
  var put = function (k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} };
  var load = function () { data(); var r = get(KEY, null); return r && r.steps && r.steps.length ? r : null; };
  var save = function (r) { put(KEY, r); };
  var sk = function () { return window.__sk || null; };
  var toast = function (m, ok) { var s = sk(); if (s && s.toast) s.toast(m, ok); };

  var has = function (p, re) { return !!p && (p.ingredients || []).some(function (i) { return re.test(i); }) || (!!p && re.test(p.name)); };
  var RETINOL = /retin/i, ACID = /glycolic|salicylic|lactic|mandelic|\bAHA\b|\bBHA\b|azelaic/i;

  /* ---------- the routine ---------- */
  // when -> which slots and which days. Retinol is never used in the morning.
  function slotsOf(s) {
    var w = (s.when || '').toLowerCase(), p = byId[s.pid];
    var am = /morning/.test(w), pm = /night/.test(w);
    if (!am && !pm) { am = true; pm = true; }
    if (p && has(p, RETINOL)) am = false, pm = true;
    // Leave-on exfoliating acids (not azelaic) only at night: they make skin more sensitive to the sun.
    if (p && /toners|serums/.test(p.cats[0]) && has(p, /glycolic|salicylic|lactic|mandelic/i)) am = false, pm = true;
    var days = /week/.test(w) ? EXTRA_DAYS.slice() : [0, 1, 2, 3, 4, 5, 6];
    return { am: am, pm: pm, days: days };
  }
  // Steps for one slot ('am' or 'pm') on one day. Retinol rests on the nights an acid treatment is used.
  function stepsFor(r, slot, t) {
    var wd = new Date(t).getDay(), list = [];
    var acidTonight = slot === 'pm' && r.steps.some(function (s) { var o = slotsOf(s); return o.pm && o.days.length < 7 && o.days.indexOf(wd) >= 0 && has(byId[s.pid], ACID); });
    r.steps.forEach(function (s, i) {
      var o = slotsOf(s), p = byId[s.pid];
      if (!o[slot] || o.days.indexOf(wd) < 0 || !p) return;
      var note = '';
      if (acidTonight && has(p, RETINOL)) return list.push({ i: i, s: s, p: p, rest: true, note: 'Rest night: skip retinol when you use an acid.' });
      if (slot === 'am' && /sunscreen/i.test(s.step)) note = r.sun === 'high' ? 'Put on more every 2 hours when you are outside.' : 'Last step every morning, even when you stay inside.';
      if (o.days.length < 7) note = 'Only on ' + o.days.map(function (d) { return WD[d]; }).join(', ') + '.';
      else if (/morning/i.test(s.when) && !o.am) note = 'Night only. ' + (has(p, RETINOL) ? 'Retinol' : 'Acids') + ' make your skin more sensitive to the sun.';
      list.push({ i: i, s: s, p: p, note: note });
    });
    return list;
  }
  function doneOf(r, k, slot) { var d = (r.done || {})[k]; return (d && d[slot]) || []; }
  function slotDone(r, t, slot) { var need = stepsFor(r, slot, t).filter(function (x) { return !x.rest; }), got = doneOf(r, dayKey(t), slot); return need.length > 0 && need.every(function (x) { return got.indexOf(x.i) >= 0; }); }
  function streak(r) {
    var n = 0, t = midnight(Date.now());
    if (slotDone(r, t, 'am') && slotDone(r, t, 'pm')) n = 1;
    for (var k = 1; k < 400; k++) { var d = addDays(t, -k); if (d < midnight(r.at) - DAY) break; if (slotDone(r, d, 'am') && slotDone(r, d, 'pm')) n++; else break; }
    return n;
  }

  /* ---------- refills ---------- */
  // How much one use takes, in ml (or g, or pads). Used to work out how long each bottle lasts.
  var PER_USE = { cleansers: 1.5, 'toners-essences': 1.5, serums: 0.35, 'masks-treatments': 0.6, moisturisers: 0.8, sunscreen: 1.2 };
  function sizeOf(v) { var m = /([\d.]+)\s*(ml|g|pads)/i.exec((v && v.name) || ''); return m ? { n: parseFloat(m[1]), u: m[2].toLowerCase() } : null; }
  function variantOf(s, p) { return (p.variants || []).filter(function (v) { return v.id === s.vid; })[0] || p.variants[0]; }
  function lastsDays(s, p) {
    var o = slotsOf(s), size = sizeOf(variantOf(s, p));
    var usesPerDay = ((o.am ? 1 : 0) + (o.pm ? 1 : 0)) * o.days.length / 7;
    if (!size || !usesPerDay) return 60;
    var per = size.u === 'pads' ? 1 : (PER_USE[p.cats[0]] || 0.8);
    return Math.max(14, Math.min(180, Math.round(size.n / per / usesPerDay)));
  }
  function lastBought(slug) {
    var best = 0;
    (get('skd-orders', []) || []).forEach(function (o) { if ((o.items || []).some(function (i) { return i.slug === slug; }) && o.createdAt > best) best = o.createdAt; });
    return best;
  }
  function refillOf(r, s) {
    var p = byId[s.pid]; if (!p) return null;
    var opened = Math.max((r.opened || {})[s.pid] || 0, lastBought(p.slug)) || r.at;
    var lasts = lastsDays(s, p), ends = addDays(midnight(opened), lasts), left = Math.round((ends - midnight(Date.now())) / DAY);
    return { s: s, p: p, v: variantOf(s, p), opened: opened, lasts: lasts, ends: ends, left: left, pct: Math.max(0, Math.min(100, Math.round(left / lasts * 100))) };
  }
  function refills(r) { return r.steps.map(function (s) { return refillOf(r, s); }).filter(Boolean).sort(function (a, b) { return a.left - b.left; }); }
  function leftText(f) { return f.left <= 0 ? 'Probably empty now' : f.left === 1 ? 'About 1 day left' : 'About ' + f.left + ' days left'; }

  function addToBag(list) {
    var s = sk(), c = s && s.cart(); if (!c) { location.href = 'cart.html'; return; }
    var n = 0;
    list.forEach(function (f) { var v = f.v; if (v && v.stock > 0) { c.add({ variantId: v.id, productId: f.p.id, slug: f.p.slug, brand: f.p.brand, name: f.p.name, variantName: v.name, price: v.price, compareAt: v.compareAt, image: f.p.image, maxQty: v.stock }, 1, true); n++; } });
    if (n) { if (s.openBag) s.openBag(); } else toast('Sorry, this is out of stock right now.');
  }

  /* ---------- saving from the quiz result ---------- */
  function fromQuiz(steps, a) {
    var old = load() || {};
    var r = {
      v: 1, at: Date.now(), skin: (a && a.skin) || old.skin || '', concerns: (a && a.concern) || [], sun: (a && a.sun) || '',
      steps: steps.filter(function (x) { return x.p; }).map(function (x) { return { step: x.step, when: x.when, why: x.why, pid: x.p.id, vid: x.p.variants[0].id }; }),
      times: old.times || { am: '07:00', pm: '21:30' }, done: old.done || {}, opened: old.opened || {}, wa: old.wa || null
    };
    save(r); return r;
  }
  // Called by the quiz right after it draws the routine result.
  function offer(host, steps, a) {
    if (!host || host.querySelector('.srt-offer')) return;
    var had = load(), box = document.createElement('div');
    box.className = 'srt-offer';
    box.innerHTML = '<div class="srt-offer-ic">' + svg(IC.cal, 22) + '</div><div class="srt-offer-txt"><p class="srt-eye">New · Routine calendar</p>' +
      '<h2 class="font-serif">Make it a habit</h2><p>Save this routine and get a morning and night checklist, reminders on WhatsApp or in your phone calendar, and a message before each product runs out.</p></div>' +
      '<button type="button" class="btn-primary" data-srt="save">' + (had ? 'Save, replacing my old routine' : 'Save my routine') + '</button>';
    var foot = host.querySelector('[data-q="addall"]'), anchor = foot && foot.parentNode;
    if (anchor && anchor.parentNode) anchor.parentNode.insertBefore(box, anchor); else host.appendChild(box);
    box.querySelector('[data-srt="save"]').addEventListener('click', function () { fromQuiz(steps, a); location.href = 'routine.html?new=1'; });
  }

  /* ---------- phone calendar (.ics) ---------- */
  function ics(r) {
    var now = new Date(), stamp = now.toISOString().replace(/[-:]/g, '').replace(/\.\d+/, '');
    var day = function (t) { var d = new Date(t); return d.getFullYear() + pad(d.getMonth() + 1) + pad(d.getDate()); };
    var at = function (t, hm) { return day(t) + 'T' + hm.replace(':', '') + '00'; };
    var esc2 = function (s) { return String(s).replace(/([,;\\])/g, '\\$1').replace(/\n/g, '\\n'); };
    var L = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Skinora//Routine//EN', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH', 'X-WR-CALNAME:Skinora routine',
      'BEGIN:VTIMEZONE', 'TZID:Asia/Colombo', 'BEGIN:STANDARD', 'DTSTART:19700101T000000', 'TZOFFSETFROM:+0530', 'TZOFFSETTO:+0530', 'TZNAME:+0530', 'END:STANDARD', 'END:VTIMEZONE'];
    var start = midnight(Date.now());
    var ev = function (uid, dt, title, desc, rule, alarm) {
      L.push('BEGIN:VEVENT', 'UID:' + uid + '@skinora.lk', 'DTSTAMP:' + stamp, 'DTSTART;TZID=Asia/Colombo:' + dt, 'DURATION:PT10M', 'SUMMARY:' + esc2(title), 'DESCRIPTION:' + esc2(desc));
      if (rule) L.push('RRULE:' + rule);
      L.push('BEGIN:VALARM', 'ACTION:DISPLAY', 'DESCRIPTION:' + esc2(title), 'TRIGGER:' + (alarm || '-PT0M'), 'END:VALARM', 'END:VEVENT');
    };
    var names = function (slot) { var seen = {}, out = []; [0, 1, 2, 3, 4, 5, 6].forEach(function (k) { stepsFor(r, slot, addDays(start, k)).forEach(function (x) { if (!seen[x.i]) { seen[x.i] = 1; out.push(x.s.step + ': ' + x.p.brand + ' ' + x.p.name + (slotsOf(x.s).days.length < 7 ? ' (Mon, Wed, Fri)' : '')); } }); }); return out; };
    var am = names('am'), pm = names('pm');
    if (am.length) ev('srt-am-' + r.at, at(start, r.times.am), 'Skinora morning routine', am.map(function (n, i) { return (i + 1) + '. ' + n; }).join('\n') + '\n\nTick it off: https://skinora.lk/routine', 'FREQ=DAILY');
    if (pm.length) ev('srt-pm-' + r.at, at(start, r.times.pm), 'Skinora night routine', pm.map(function (n, i) { return (i + 1) + '. ' + n; }).join('\n') + '\n\nTick it off: https://skinora.lk/routine', 'FREQ=DAILY');
    refills(r).forEach(function (f) {
      var t = Math.max(addDays(f.ends, -7), addDays(start, 1));
      ev('srt-refill-' + f.p.id + '-' + f.ends, at(t, '10:00'), 'Refill soon: ' + f.p.brand + ' ' + f.p.name, 'Your ' + f.p.name + ' (' + f.v.name + ') will run out around ' + dShort(f.ends) + '. Order now and it arrives in time.\n\nhttps://skinora.lk/p/' + f.p.slug, '', '-PT0M');
    });
    L.push('END:VCALENDAR');
    return L.join('\r\n');
  }
  function downloadIcs(r) {
    var blob = new Blob([ics(r)], { type: 'text/calendar;charset=utf-8' }), a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = 'skinora-routine.ics';
    document.body.appendChild(a); a.click(); setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
  }

  /* ---------- WhatsApp ---------- */
  function slPhone(v) {
    var d = String(v || '').replace(/[\s()-]/g, '');
    var m = /^(?:\+94|0094|94|0)?(7\d{8})$/.exec(d);
    return m ? '94' + m[1] : null;
  }
  function guessPhone() {
    var u = get('skd-user', null), o = (get('skd-orders', []) || [])[0];
    return (u && u.phone) || (o && o.phone) || '';
  }
  function payload(r, phone) {
    var line = function (slot) { return stepsFor(r, slot, Date.now()).filter(function (x) { return !x.rest; }).map(function (x) { return x.s.step; }); };
    return {
      phone: phone, am: r.times.am, pm: r.times.pm, tzOffset: 330, remind: !!r.wa.remind, refill: !!r.wa.refill, consent: true,
      morning: line('am'), night: line('pm'),
      refills: refills(r).map(function (f) { return { name: f.p.brand + ' ' + f.p.name, slug: f.p.slug, ends: dayKey(f.ends) }; })
    };
  }
  function syncWa(r, quiet) {
    if (!r.wa || !r.wa.phone) return Promise.resolve(null);
    return fetch('api/routine-reminders', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload(r, r.wa.phone)) })
      .then(function (res) { return res.json().catch(function () { return {}; }).then(function (j) { return { status: res.status, j: j }; }); })
      .then(function (x) { r.wa.state = x.status === 200 ? 'live' : x.status === 422 || x.status === 400 ? 'error' : 'saved'; r.wa.msg = (x.j && x.j.error) || ''; save(r); return x; },
        function () { r.wa.state = 'saved'; save(r); return null; });
  }
  function stopWa(phone) {
    return fetch('api/routine-reminders', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ phone: phone }) }).catch(function () {});
  }

  /* ---------- My routine page ---------- */
  function page(host) {
    var r = load(), slot = new Date().getHours() < 15 ? 'am' : 'pm', fresh = /[?&]new=1/.test(location.search);
    if (fresh && history.replaceState) history.replaceState(null, '', location.pathname);

    function empty() {
      host.innerHTML = '<div class="srt-empty"><p class="srt-eye">My routine</p><h1 class="font-serif">Your routine, morning and night</h1>' +
        '<p>Scan your skin or answer 5 questions. We make a routine for you, then this page shows what to use each morning and night, reminds you, and tells you before a product runs out.</p>' +
        '<div class="srt-row"><a class="btn-primary" href="quiz.html?scan=1">Scan my skin</a><a class="btn-outline" href="quiz.html">Answer 5 questions</a></div></div>';
    }
    if (!r) return empty();

    function today() {
      var t = Date.now(), list = stepsFor(r, slot, t), got = doneOf(r, dayKey(t), slot);
      var need = list.filter(function (x) { return !x.rest; }), n = need.filter(function (x) { return got.indexOf(x.i) >= 0; }).length;
      return '<section class="srt-card srt-today"><div class="srt-today-head"><div><p class="srt-eye">Today · ' + esc(dLong(t)) + '</p>' +
        '<h2 class="font-serif">' + (n === need.length && need.length ? (slot === 'am' ? 'Morning done' : 'Night done') + ' <span class="srt-tick">' + svg(IC.check, 18) + '</span>' : (slot === 'am' ? 'Your morning' : 'Your night')) + '</h2></div>' +
        '<div class="srt-tabs" role="tablist">' + [['am', 'Morning', IC.sun], ['pm', 'Night', IC.moon]].map(function (b) { return '<button type="button" role="tab" aria-selected="' + (slot === b[0]) + '" data-srt="slot" data-v="' + b[0] + '" class="' + (slot === b[0] ? 'on' : '') + '">' + svg(b[2], 15) + b[1] + '</button>'; }).join('') + '</div></div>' +
        '<div class="srt-meter"><div style="width:' + (need.length ? Math.round(n / need.length * 100) : 0) + '%"></div></div><p class="srt-meter-txt">' + n + ' of ' + need.length + ' steps done</p>' +
        '<ol class="srt-steps">' + list.map(function (x, k) {
          var on = got.indexOf(x.i) >= 0;
          return '<li class="' + (on ? 'is-done' : '') + (x.rest ? ' is-rest' : '') + '"><button type="button" class="srt-check" data-srt="tick" data-i="' + x.i + '" ' + (x.rest ? 'disabled' : '') + ' aria-pressed="' + on + '" aria-label="' + (on ? 'Done: ' : 'Mark done: ') + esc(x.s.step) + '">' + (on ? svg(IC.check, 16) : '<span>' + (k + 1) + '</span>') + '</button>' +
            '<a class="srt-img" href="p__' + esc(x.p.slug) + '.html"><img src="' + esc(x.p.image) + '" alt="" loading="lazy"></a>' +
            '<div class="srt-step-txt"><p class="srt-step-name">' + esc(x.s.step) + '</p><p class="srt-prod"><a href="p__' + esc(x.p.slug) + '.html">' + esc(x.p.brand) + ' · ' + esc(x.p.name) + '</a></p>' +
            (x.note || x.s.why ? '<p class="srt-why">' + esc(x.note || x.s.why) + '</p>' : '') + '</div></li>';
        }).join('') + '</ol>' +
        (need.length && n === need.length ? '<p class="srt-done-msg">' + (slot === 'am' ? 'Lovely. See you tonight.' : 'All done. Sleep well, your skin does its repair work at night.') + '</p>' : '') + '</section>';
    }

    function week() {
      var t0 = midnight(Date.now()), wd = new Date(t0).getDay(), mon = addDays(t0, -((wd + 6) % 7)), cols = [];
      for (var k = 0; k < 7; k++) cols.push(addDays(mon, k));
      var cell = function (t, s) {
        var list = stepsFor(r, s, t).filter(function (x) { return !x.rest; }), past = t < t0 && t >= midnight(r.at), isToday = t === t0, ok = slotDone(r, t, s);
        var extra = list.some(function (x) { return slotsOf(x.s).days.length < 7; });
        return '<td class="' + (ok ? 'ok' : past ? 'miss' : t < t0 ? 'pre' : '') + (isToday ? ' now' : '') + '"><span class="srt-dot">' + (ok ? svg(IC.check, 12) : list.length) + '</span>' + (extra ? '<span class="srt-extra">+<span class="srt-wk-l"> extra care</span></span>' : '') + '</td>';
      };
      return '<section class="srt-card"><div class="srt-sec-head"><div><p class="srt-eye">This week</p><h2 class="font-serif">Your calendar</h2></div><p class="srt-streak">' + svg(IC.flame, 16) + '<b>' + streak(r) + '</b> day streak</p></div>' +
        '<div class="srt-week-wrap"><table class="srt-week"><thead><tr><th></th>' + cols.map(function (t) { return '<th class="' + (t === t0 ? 'now' : '') + '">' + WD[new Date(t).getDay()] + '<span>' + new Date(t).getDate() + '</span></th>'; }).join('') + '</tr></thead><tbody>' +
        '<tr><th>' + svg(IC.sun, 14) + '<span class="srt-wk-l"> Morning</span></th>' + cols.map(function (t) { return cell(t, 'am'); }).join('') + '</tr>' +
        '<tr><th>' + svg(IC.moon, 14) + '<span class="srt-wk-l"> Night</span></th>' + cols.map(function (t) { return cell(t, 'pm'); }).join('') + '</tr></tbody></table></div>' +
        '<p class="srt-legend">Numbers show how many steps. A tick means you did them all.</p>' + month() + '</section>';
    }

    function month() {
      var t0 = midnight(Date.now()), days = [];
      for (var k = 27; k >= 0; k--) days.push(addDays(t0, -k));
      return '<div class="srt-month"><p class="srt-eye">Last 4 weeks</p><div class="srt-month-grid">' + days.map(function (t) {
        var before = t < midnight(r.at), a = !before && slotDone(r, t, 'am'), p = !before && slotDone(r, t, 'pm');
        return '<span title="' + esc(dShort(t)) + (before ? '' : ': morning ' + (a ? 'done' : 'not done') + ', night ' + (p ? 'done' : 'not done')) + '" class="' + (before ? 'pre' : '') + (t === t0 ? ' now' : '') + '"><i class="' + (a ? 'on' : '') + '"></i><i class="' + (p ? 'on' : '') + '"></i></span>';
      }).join('') + '</div></div>';
    }

    function reminders() {
      var w = r.wa || {}, phone = w.phone ? '0' + w.phone.slice(2) : guessPhone();
      var status = '';
      if (w.phone && w.state === 'live') status = '<p class="srt-ok">' + svg(IC.check, 14) + ' WhatsApp reminders are on for ' + esc(phone) + '. We sent you a welcome message.</p>';
      else if (w.phone && w.state === 'error') status = '<p class="srt-err">' + esc(w.msg || 'We could not switch on WhatsApp for this number.') + '</p>';
      else if (w.phone) status = '<p class="srt-note">Saved for ' + esc(phone) + '. WhatsApp messages start as soon as our WhatsApp Business line is switched on. Until then, add the reminders to your phone calendar below.</p>';
      return '<section class="srt-card" id="reminders"><div class="srt-sec-head"><div><p class="srt-eye">Reminders</p><h2 class="font-serif">Never miss a step</h2></div></div>' +
        '<div class="srt-times"><label>' + svg(IC.sun, 15) + ' Morning<input type="time" data-srt-k="am" value="' + esc(r.times.am) + '"></label><label>' + svg(IC.moon, 15) + ' Night<input type="time" data-srt-k="pm" value="' + esc(r.times.pm) + '"></label></div>' +
        '<div class="srt-rem-grid"><div class="srt-rem"><div class="srt-rem-ic wa">' + svg(IC.wa, 20) + '</div><h3>WhatsApp</h3><p>A short message at your times with today\'s steps, and a nudge about a week before a product runs out.</p>' +
        '<label class="srt-field"><span>Mobile number</span><input type="tel" inputmode="tel" autocomplete="tel" placeholder="077 123 4567" data-srt-k="phone" value="' + esc(phone) + '"></label>' +
        '<label class="srt-chk"><input type="checkbox" data-srt-k="remind" ' + (w.phone ? (w.remind ? 'checked' : '') : 'checked') + '> Morning and night reminders</label>' +
        '<label class="srt-chk"><input type="checkbox" data-srt-k="refill" ' + (w.phone ? (w.refill ? 'checked' : '') : 'checked') + '> Refill reminders</label>' +
        '<label class="srt-chk"><input type="checkbox" data-srt-k="consent" ' + (w.phone ? 'checked' : '') + '> I agree to get these WhatsApp messages from Skinora. I can reply STOP at any time.</label>' +
        '<div class="srt-row"><button type="button" class="btn-primary" data-srt="wa">' + (w.phone ? 'Update WhatsApp reminders' : 'Turn on WhatsApp reminders') + '</button>' + (w.phone ? '<button type="button" class="srt-link" data-srt="wa-off">Stop WhatsApp reminders</button>' : '') + '</div>' + status + '</div>' +
        '<div class="srt-rem"><div class="srt-rem-ic">' + svg(IC.cal, 20) + '</div><h3>Phone calendar</h3><p>Adds a daily morning and night alarm with your steps, plus a refill reminder for each product. Works with iPhone, Android and Google Calendar.</p>' +
        '<div class="srt-row"><button type="button" class="btn-outline" data-srt="ics">Add to my calendar</button></div><p class="srt-note">Changed your times? Download it again and delete the old events.</p></div></div></section>';
    }

    function refillSec() {
      var l = refills(r), soon = l.filter(function (f) { return f.left <= SOON; });
      return '<section class="srt-card" id="refills"><div class="srt-sec-head"><div><p class="srt-eye">Refills</p><h2 class="font-serif">What is running low</h2></div>' +
        (soon.length > 1 ? '<button type="button" class="btn-primary" data-srt="refill-all">Refill all ' + soon.length + ' · ' + fmt(soon.reduce(function (s, f) { return s + f.v.price; }, 0)) + '</button>' : '') + '</div>' +
        '<p class="srt-legend">Worked out from the bottle size and how often you use it. We count from your last Skinora order, or from the day you saved this routine.</p>' +
        '<ul class="srt-refills">' + l.map(function (f) {
          var low = f.left <= SOON;
          return '<li class="' + (low ? 'is-low' : '') + '"><a class="srt-img" href="p__' + esc(f.p.slug) + '.html"><img src="' + esc(f.p.image) + '" alt="" loading="lazy"></a>' +
            '<div class="srt-ref-body"><div class="srt-ref-top"><p><span class="srt-step-name">' + esc(f.s.step) + '</span><br><a href="p__' + esc(f.p.slug) + '.html">' + esc(f.p.brand) + ' · ' + esc(f.p.name) + '</a> <span class="srt-size">' + esc(f.v.name) + '</span></p>' +
            '<p class="srt-left">' + (low ? svg(IC.drop, 13) + ' ' : '') + esc(leftText(f)) + '<span>' + (f.left > 0 ? 'Runs out around ' + esc(dShort(f.ends)) : 'Since ' + esc(dShort(f.ends))) + '</span></p></div>' +
            '<div class="srt-meter"><div style="width:' + f.pct + '%"></div></div>' +
            '<div class="srt-ref-actions"><button type="button" class="' + (low ? 'btn-primary' : 'btn-outline') + '" data-srt="refill" data-p="' + esc(f.p.id) + '">' + (f.v.stock > 0 ? 'Refill · ' + fmt(f.v.price) : 'Out of stock') + '</button>' +
            '<button type="button" class="srt-link" data-srt="opened" data-p="' + esc(f.p.id) + '">I just opened a new one</button><span class="srt-note">Lasts about ' + f.lasts + ' days · started ' + esc(dShort(f.opened)) + '</span></div></div></li>';
        }).join('') + '</ul></section>';
    }

    function draw() {
      r = load(); if (!r) return empty();
      host.innerHTML = '<div class="srt-head"><div><p class="srt-eye">My routine</p><h1 class="font-serif">' + (r.skin ? '<em>' + esc(SKIN[r.skin] || r.skin) + '</em> skin' : 'Your routine') + (r.concerns && r.concerns.length ? ', for ' + esc(words(r.concerns)) : '') + '</h1>' +
        '<p>Saved ' + esc(dShort(r.at)) + ' · ' + r.steps.length + ' products</p></div><div class="srt-row"><a class="btn-outline" href="quiz.html?scan=1">Rescan and update</a></div></div>' +
        (fresh ? '<div class="srt-banner">' + svg(IC.check, 16) + ' Your routine is saved. Choose your reminder times below.</div>' : '') +
        '<div class="srt-cols"><div>' + today() + week() + '</div><div>' + reminders() + refillSec() + '</div></div>' +
        '<div class="srt-foot"><a class="srt-link" href="quiz.html">Make a new routine</a><button type="button" class="srt-link" data-srt="delete">Delete my routine</button></div>';
      fresh = false;
    }

    host.addEventListener('click', function (e) {
      var b = e.target.closest('[data-srt]'); if (!b) return;
      var k = b.getAttribute('data-srt');
      r = load(); if (!r) return;
      if (k === 'slot') { slot = b.getAttribute('data-v'); draw(); }
      if (k === 'tick') {
        var i = +b.getAttribute('data-i'), dk = dayKey(Date.now());
        r.done = r.done || {}; r.done[dk] = r.done[dk] || { am: [], pm: [] };
        var l = r.done[dk][slot] = r.done[dk][slot] || [], at = l.indexOf(i);
        if (at >= 0) l.splice(at, 1); else l.push(i);
        // keep about 3 months of ticks
        Object.keys(r.done).sort().slice(0, -100).forEach(function (x) { delete r.done[x]; });
        save(r); draw();
        if (at < 0 && slotDone(r, Date.now(), slot)) toast(slot === 'am' ? 'Morning routine done' : 'Night routine done', 1);
      }
      if (k === 'ics') { downloadIcs(r); toast('Calendar file downloaded. Open it to add the reminders.', 1); }
      if (k === 'refill') { var f = refills(r).filter(function (x) { return x.p.id === b.getAttribute('data-p'); })[0]; if (f) addToBag([f]); }
      if (k === 'refill-all') addToBag(refills(r).filter(function (f) { return f.left <= SOON; }));
      if (k === 'opened') { r.opened = r.opened || {}; r.opened[b.getAttribute('data-p')] = Date.now(); save(r); draw(); if (r.wa && r.wa.phone) syncWa(r); toast('Got it. We will count from today.', 1); }
      if (k === 'wa') {
        var q = function (n) { return host.querySelector('[data-srt-k="' + n + '"]'); };
        var ph = slPhone(q('phone').value);
        if (!ph) { toast('Please enter a Sri Lankan mobile number, for example 077 123 4567.'); q('phone').focus(); return; }
        if (!q('consent').checked) { toast('Please tick the box to agree to WhatsApp messages.'); return; }
        if (!q('remind').checked && !q('refill').checked) { toast('Choose at least one kind of reminder.'); return; }
        r.wa = { phone: ph, remind: q('remind').checked, refill: q('refill').checked, at: Date.now() };
        save(r); b.disabled = true; b.textContent = 'Saving…';
        syncWa(r).then(function () { draw(); var w = load().wa; toast(w.state === 'live' ? 'WhatsApp reminders are on' : w.state === 'error' ? 'Please check your number' : 'Your reminder settings are saved', w.state !== 'error'); });
      }
      if (k === 'wa-off') { var p0 = r.wa && r.wa.phone; r.wa = null; save(r); if (p0) stopWa(p0); draw(); toast('WhatsApp reminders are off', 1); }
      if (k === 'delete') {
        if (!window.confirm('Delete your saved routine and its reminders?')) return;
        if (r.wa && r.wa.phone) stopWa(r.wa.phone);
        try { localStorage.removeItem(KEY); } catch (er) {}
        empty(); window.scrollTo(0, 0);
      }
    });
    host.addEventListener('change', function (e) {
      var k = e.target.getAttribute('data-srt-k'); if (k !== 'am' && k !== 'pm') return;
      r = load(); if (!r || !/^\d\d:\d\d$/.test(e.target.value)) return;
      r.times[k] = e.target.value; save(r);
      if (r.wa && r.wa.phone) syncWa(r);
      toast((k === 'am' ? 'Morning' : 'Night') + ' reminder set for ' + e.target.value, 1);
    });
    draw();
  }

  /* ---------- account page and home page nudges ---------- */
  function accountCard() {
    var grid = document.querySelector('main .grid.gap-14');
    if (!grid || document.getElementById('srt-account')) return;
    var r = load(), sec = document.createElement('section');
    sec.id = 'srt-account'; sec.className = 'srt-account';
    if (!r) {
      sec.innerHTML = '<div class="srt-acc-row"><div><p class="srt-eye">My routine</p><h2 class="font-serif">A morning and night plan, with reminders</h2><p class="srt-legend">Make a routine with the skin scan or the quiz, then save it to get a daily checklist and refill nudges.</p></div><a class="btn-outline" href="quiz.html">Make my routine</a></div>';
    } else {
      var t = Date.now(), slot = new Date().getHours() < 15 ? 'am' : 'pm';
      var need = stepsFor(r, slot, t).filter(function (x) { return !x.rest; }), got = doneOf(r, dayKey(t), slot), n = need.filter(function (x) { return got.indexOf(x.i) >= 0; }).length;
      var low = refills(r).filter(function (f) { return f.left <= SOON; });
      sec.innerHTML = '<div class="srt-acc-row"><div><p class="srt-eye">My routine</p><h2 class="font-serif">' + (slot === 'am' ? 'This morning' : 'Tonight') + ': ' + n + ' of ' + need.length + ' steps done</h2>' +
        '<p class="srt-legend">' + svg(IC.flame, 13) + ' ' + streak(r) + ' day streak' + (r.wa && r.wa.phone ? ' · WhatsApp reminders on' : '') + '</p></div><a class="btn-primary" href="routine.html">Open my routine</a></div>' +
        (low.length ? '<p class="srt-acc-low">' + svg(IC.drop, 14) + ' Running low: ' + low.map(function (f) { return esc(f.p.name) + ' (' + esc(leftText(f).toLowerCase()) + ')'; }).join(', ') + '. <a href="routine.html#refills">Refill</a></p>' : '');
    }
    var after = document.getElementById('sks-my-skin');
    if (after && after.nextSibling) after.parentNode.insertBefore(sec, after.nextSibling); else grid.parentNode.insertBefore(sec, grid);
  }
  function homeNudge() {
    var r = load(); if (!r) return;
    var f = refills(r).filter(function (x) { return x.left <= 7; })[0];
    if (!f || document.getElementById('srt-nudge')) return;
    var hide = get('skd-routine-nudge', {}); if (hide[f.p.id] === dayKey(f.ends)) return;
    var el = document.createElement('div');
    el.id = 'srt-nudge'; el.className = 'srt-nudge'; el.setAttribute('role', 'status');
    el.innerHTML = '<img src="' + esc(f.p.image) + '" alt=""><p>' + (f.left <= 0 ? 'Your <b>' + esc(f.p.name) + '</b> is probably empty now.' : 'Your <b>' + esc(f.p.name) + '</b> runs out in about ' + f.left + (f.left === 1 ? ' day.' : ' days.')) + ' Refill now so your routine doesn\'t stop.</p><button type="button" class="btn-primary" data-srt="go">Refill</button><button type="button" class="srt-x" aria-label="Close" data-srt="x">×</button>';
    el.addEventListener('click', function (e) {
      var b = e.target.closest('[data-srt]'); if (!b) return;
      if (b.getAttribute('data-srt') === 'go') addToBag([f]);
      hide[f.p.id] = dayKey(f.ends); put('skd-routine-nudge', hide); el.remove();
    });
    document.body.appendChild(el);
  }

  window.SKRT = { offer: offer, load: load, refills: refills, stepsFor: stepsFor, ics: ics, _slPhone: slPhone };
  var boot = function () {
    var path = (document.body.getAttribute('data-sk-path') || '').split('?')[0];
    if (path === '/routine') { var h = document.getElementById('srt-app'); if (h) page(h); }
    if (path === '/account') setTimeout(accountCard, 0);
    if (path === '/') setTimeout(homeNudge, 1200);
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
