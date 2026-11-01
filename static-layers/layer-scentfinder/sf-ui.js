/* Skinora AI scent finder: five quick questions, a scent profile, matches from the catalogue,
   a sample set and a scent for the home. Claude writes the personal story when /api/scent-finder
   is switched on; otherwise the page writes it with built-in rules. */
(function () {
  'use strict';
  var S = window.SKSF_DATA; if (!S) return;
  var host, D, BY = {}, a = {}, step = 0, who = 'all', ai = null, aiFor = '';
  var vis = function (o) { return !o.g || o.g.indexOf(a.who || 'all') > -1; };

  var $ = function (s, r) { return (r || document).querySelector(s); };
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  var fmt = function (n) { return 'LKR ' + Math.round(n).toLocaleString('en-US'); };
  var get = function (k, d) { try { var v = localStorage.getItem('skd-' + k); if (v != null) return JSON.parse(v); } catch (e) {} return d; };
  var set = function (k, v) { try { localStorage.setItem('skd-' + k, JSON.stringify(v)); } catch (e) {} };
  var pHref = function (slug) { return 'p__' + slug + '.html'; };
  var toast = function (m, ok) { if (window.__sk && window.__sk.toast) window.__sk.toast(m, ok); };
  var low = function (s) { return s.charAt(0).toLowerCase() + s.slice(1); };
  var opt = function (k, id) { var q = S.Q.filter(function (x) { return x.k === k; })[0]; return q && q.o.filter(function (o) { return o.id === id; })[0]; };
  var FAMS = Object.keys(S.FAM);

  function products() {
    if (D) return D;
    var el = document.getElementById('sk-data');
    D = el ? JSON.parse(el.textContent).products : [];
    D.forEach(function (p) { BY[p.slug] = p; if (!p.price) p.price = Math.min.apply(null, p.variants.map(function (v) { return v.price; })); });
    return D;
  }

  /* ---------- matching ---------- */
  function profile(ans) {
    var v = {}, mood = null, time = 'any', str = 2, adj = 0, notes = [];
    FAMS.forEach(function (f) { v[f] = 0; });
    S.Q.forEach(function (q) {
      var o = opt(q.k, ans[q.k]); if (!o) return;
      Object.keys(o.v || {}).forEach(function (f) { v[f] += o.v[f]; });
      if (q.k === 'mood') mood = o.m;
      if (q.k === 'strength') str = o.s;
      else if (o.s) adj += o.s;
      if (o.tm && (q.k === 'when' || time === 'any')) time = o.tm;
      if (o.notes) notes = notes.concat(o.notes);
    });
    str = Math.max(1, Math.min(3, str + adj * 0.35));
    var sum = FAMS.reduce(function (s, f) { return s + v[f]; }, 0) || 1;
    var mix = FAMS.map(function (f) { return { f: f, pct: Math.round(v[f] / sum * 100) }; }).filter(function (x) { return x.pct > 0; }).sort(function (x, y) { return y.pct - x.pct; });
    var top = mix[0] ? mix[0].f : 'fresh';
    return { who: ans.who || 'all', v: v, mood: mood || 'calm', time: time, str: str, mix: mix, top: top, notes: notes,
      name: 'The ' + S.PERSONA.fam[top] + ' ' + S.PERSONA.mood[mood || 'calm'] };
  }

  function cos(x, y) {
    var d = 0, nx = 0, ny = 0;
    FAMS.forEach(function (f) { var a1 = x[f] || 0, b1 = y[f] || 0; d += a1 * b1; nx += a1 * a1; ny += b1 * b1; });
    return nx && ny ? d / Math.sqrt(nx * ny) : 0;
  }

  function rank(pr, home) {
    products();
    return Object.keys(S.P).filter(function (slug) { return !!S.P[slug].home === !!home && BY[slug]; }).map(function (slug) {
      var s = S.P[slug], p = BY[slug];
      var c = cos(pr.v, s.v), m = s.m.indexOf(pr.mood) > -1 ? 1 : 0;
      var t = home ? 1 : (s.t === pr.time || s.t === 'any' || pr.time === 'any' ? 1 : 0.3);
      var st = home ? 1 : 1 - Math.abs(s.s - pr.str) / 2;
      var total = 0.6 * c + 0.2 * m + 0.1 * t + 0.1 * st;
      return { slug: slug, p: p, s: s, score: total, pct: Math.min(98, Math.round(48 + 52 * total)) };
    }).filter(function (x) { return home || pr.who === 'all' || x.p.gender === pr.who; })
      .sort(function (x, y) { return y.score - x.score; });
  }

  /* ---------- words (used when the AI is off or slow) ---------- */
  var PLACE = { beach: 'your beach at sunrise', tea: 'the misty tea hills', garden: 'your rose and jasmine garden', cafe: 'that little bakery', temple: 'the old temple at dusk', spice: 'the spice market' };
  var MOOD = { calm: 'It feels calm and easy', romantic: 'It is soft and romantic', confident: 'It gives you quiet confidence', playful: 'It is bright and fun', mysterious: 'It has a little mystery' };
  var STORY_PLACE = { beach: 'on a quiet beach at sunrise', tea: 'in the misty tea hills', garden: 'in a garden of roses and jasmine', cafe: 'in a little bakery and café', temple: 'at an old temple at dusk', spice: 'in a busy spice market' };
  var ADJ = { fresh: 'fresh', citrus: 'citrusy', floral: 'floral', green: 'herbal', woody: 'woody', warm: 'warm', spicy: 'spicy', musky: 'musky' };
  var TRAIL = { 1: 'stays close to your skin', 2: 'leaves a soft trail', 3: 'leaves a trail people remember' };
  var TRAIL_TO = { 1: 'stay close to your skin, just for you', 2: 'leave a soft trail when you walk past', 3: 'leave a trail people remember' };
  var TIME = { day: 'is best by day', evening: 'is made for the evening', any: 'works day and night' };

  function why(x, pr) {
    var shared = FAMS.map(function (f) { return { f: f, w: (pr.v[f] || 0) * (x.s.v[f] || 0) }; }).filter(function (y) { return y.w > 0; }).sort(function (p1, p2) { return p2.w - p1.w; }).slice(0, 2);
    var fams = shared.map(function (y) { return ADJ[y.f]; }).join(' and ');
    var po = opt('place', a.place), likePlace = po && shared[0] && po.v[shared[0].f];
    var out = fams ? (fams.charAt(0).toUpperCase() + fams.slice(1) + (likePlace ? ', like ' + PLACE[a.place] : ', just your style') + '.') : '';
    if (x.s.m.indexOf(pr.mood) > -1) out += ' ' + MOOD[pr.mood] + ',';
    else out += ' It';
    out += ' ' + TRAIL[x.s.s] + ' and ' + TIME[x.s.t] + '.';
    return out.replace(/,\s+It /, ', and it ').trim();
  }

  function story(pr) {
    var f1 = S.FAM[pr.mix[0] ? pr.mix[0].f : 'fresh'], f2 = pr.mix[1] ? S.FAM[pr.mix[1].f] : null;
    var place = opt('place', a.place), outfit = opt('outfit', a.outfit), mood = opt('mood', a.mood);
    var ks = pr.mix.slice(0, 2).map(function (x) { return ADJ[x.f]; });
    return 'You are drawn to ' + ks.join(' and ') + ' scents: ' + f1.d + (f2 ? ', with a touch of ' + f2.d.split(',')[0] : '') + '. ' +
      (place ? 'Your heart is ' + (STORY_PLACE[place.id] || low(place.t)) + (outfit ? ', you feel most yourself in ' + low(outfit.t) : '') + (mood ? ' and you want to feel ' + low(mood.t) : '') + '. ' : '') +
      'Your signature should ' + TRAIL_TO[Math.round(pr.str)] + '.';
  }

  /* ---------- AI ---------- */
  function askAI(pr, picks, home) {
    var key = JSON.stringify(a) + who;
    if (aiFor === key) return Promise.resolve(ai);
    aiFor = key; ai = null;
    var ctl = window.AbortController ? new AbortController() : null;
    var timer = setTimeout(function () { if (ctl) ctl.abort(); }, 9000);
    var body = {
      answers: S.Q.map(function (q) { var o = opt(q.k, a[q.k]); return { q: q.q, a: o ? o.t + ' (' + o.d + ')' : '' }; }),
      profile: { name: pr.name, families: pr.mix.slice(0, 4).map(function (x) { return S.FAM[x.f].n + ' ' + x.pct + '%'; }) },
      picks: picks.concat(home ? [home] : []).map(function (x) { return { slug: x.slug, brand: x.p.brand, name: x.p.name, family: x.s.fam, notes: x.s.n.filter(Boolean).join(' / '), home: !!x.s.home }; })
    };
    return fetch('/api/scent-finder', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), signal: ctl ? ctl.signal : undefined })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (j) { clearTimeout(timer); if (aiFor === key && j && j.story) ai = j; return ai; })
      .catch(function () { clearTimeout(timer); return null; });
  }

  /* ---------- screens ---------- */
  function swatch(o) { return '<span class="sf2-sw" style="background:linear-gradient(135deg,' + o.sw[0] + ',' + o.sw[1] + ')"></span>'; }

  function renderQ() {
    var q = S.Q[step], last = get('scent', null);
    host.innerHTML = '<div class="sf2-prog" aria-hidden="true">' + S.Q.map(function (x, i) { return '<i class="' + (i <= step ? 'on' : '') + '"></i>'; }).join('') + '</div>' +
      '<p class="sf2-eye">' + (step ? 'Question ' + step + ' of ' + (S.Q.length - 1) + ' · ' : '') + q.eye + '</p><h2 class="sf2-q">' + esc(q.q) + '</h2><p class="sf2-sub">' + esc(q.sub) + '</p>' +
      '<div class="sf2-opts n' + q.o.filter(vis).length + '" role="list">' + q.o.filter(vis).map(function (o) {
        return '<button type="button" role="listitem" data-v="' + o.id + '" aria-pressed="' + (a[q.k] === o.id) + '" class="' + (a[q.k] === o.id ? 'on' : '') + '">' + swatch(o) + '<b>' + esc(o.t) + '</b><span>' + esc(o.d) + '</span></button>';
      }).join('') + '</div>' +
      '<div class="sf2-foot">' + (step ? '<button type="button" class="sf2-link" data-back>← Back</button>' : '<span></span>') +
      (step === 0 && last && last.a ? '<button type="button" class="sf2-link" data-last>See my last result (' + esc(last.name) + ')</button>' : '') + '</div>';
  }

  function renderLoading() {
    host.innerHTML = '<div class="sf2-load" role="status"><div class="sf2-drops"><i></i><i></i><i></i></div><p class="sf2-eye">Blending your notes</p><h2 class="sf2-q">Finding your <em>signature</em></h2><p class="sf2-sub">Matching your answers with every fragrance and home scent we stock.</p></div>';
  }

  function card(x, i, pr) {
    var v = (x.p.variants || []).filter(function (y) { return y.stock > 0; })[0];
    var reason = ai && ai.reasons && ai.reasons[x.slug] ? ai.reasons[x.slug] : why(x, pr);
    return '<article class="sf2-card' + (i === 0 ? ' best' : '') + '"><a href="' + pHref(x.slug) + '" class="sf2-img"><img src="' + esc(x.p.image) + '" alt="' + esc(x.p.name) + '" loading="lazy">' + (i === 0 ? '<i>Your best match</i>' : '') + '</a>' +
      '<div class="sf2-cbody"><p class="sf2-pct"><b>' + x.pct + '%</b> match · ' + esc(x.s.fam) + '</p><p class="sf2-brand">' + esc(x.p.brand) + '</p><a class="sf2-name" href="' + pHref(x.slug) + '">' + esc(x.p.name) + '</a>' +
      '<p class="sf2-why">' + esc(reason) + '</p>' +
      '<dl class="sf2-notes">' + ['Top', 'Heart', 'Base'].map(function (k, j) { return x.s.n[j] ? '<div><dt>' + k + '</dt><dd>' + esc(x.s.n[j]) + '</dd></div>' : ''; }).join('') + '</dl>' +
      '<div class="sf2-buy"><span>From ' + fmt(x.p.price) + '</span>' + (v ? '<button type="button" class="btn-outline" data-add="' + x.slug + '">Add to bag</button>' : '<a class="btn-outline" href="' + pHref(x.slug) + '">Notify me</a>') + '</div></div></article>';
  }

  function renderResult() {
    var pr = profile(a), list = rank(pr, false), picks = list.slice(0, 3), home = rank(pr, true)[0];
    set('scent', { a: a, who: who, name: pr.name, top: picks.map(function (x) { return x.slug; }), at: Date.now() });
    var txt = ai && ai.story ? ai.story : story(pr);
    var notes = pr.notes.concat(picks[0] ? picks[0].s.n.join(', ').split(/,\s*/) : []).filter(function (n, i, arr) { return n && arr.indexOf(n) === i; }).slice(0, 6);
    var setNames = picks.map(function (x) { return x.p.name; });
    var share = 'My Skinora scent profile is ' + pr.name + '. My best match is ' + (picks[0] ? picks[0].p.brand + ' ' + picks[0].p.name : '') + '. Find yours: ' + location.href.split('#')[0];
    host.innerHTML =
      '<section class="sf2-prof"><div class="sf2-prof-l"><p class="sf2-eye">Your scent profile' + (ai && ai.story ? ' <span class="sf2-ai">Written by Skinora AI</span>' : '') + '</p><h2 class="sf2-persona">' + esc(pr.name) + '</h2><p class="sf2-story" data-story>' + esc(txt) + '</p>' +
      '<p class="sf2-lbl">Notes you will love</p><ul class="sf2-chips">' + notes.map(function (n) { return '<li>' + esc(n) + '</li>'; }).join('') + '</ul></div>' +
      '<div class="sf2-prof-r"><p class="sf2-lbl">Your scent mix</p>' + pr.mix.slice(0, 4).map(function (x) {
        return '<div class="sf2-bar"><div class="sf2-bar-h"><span>' + esc(S.FAM[x.f].n) + '</span><b>' + x.pct + '%</b></div><div class="sf2-bar-t"><i style="width:' + x.pct + '%;background:' + S.FAM[x.f].c + '"></i></div><p>' + esc(S.FAM[x.f].d) + '</p></div>';
      }).join('') + '</div></section>' +

      '<section class="sf2-sec"><div class="sf2-head"><div><p class="sf2-eye">Your matches</p><h2 class="sf2-h2">We think you will <em>love</em> these</h2></div>' +
      '<div class="sf2-who" role="group" aria-label="Show fragrances for">' + [['all', 'Anyone'], ['women', 'For her'], ['men', 'For him']].map(function (w) { return '<button type="button" data-who="' + w[0] + '" aria-pressed="' + (who === w[0]) + '" class="' + (who === w[0] ? 'on' : '') + '">' + w[1] + '</button>'; }).join('') + '</div></div>' +
      '<div class="sf2-grid">' + picks.map(function (x, i) { return card(x, i, pr); }).join('') + '</div></section>' +

      (picks.length ? '<section class="sf2-set"><div class="sf2-set-img"><img src="' + esc(S.SET.image) + '" alt="Three sample vials"></div><div class="sf2-set-body"><p class="sf2-eye">Try before you buy</p><h2 class="sf2-h2">Your sample <em>set</em></h2>' +
      '<p class="sf2-sub" style="margin-top:10px">Perfume is personal, so wear each one for a day before you choose. We fill three ' + S.SET.ml + ' ml vials with your top matches, about 30 sprays each.</p>' +
      '<ol class="sf2-vials">' + picks.map(function (x) { return '<li><img src="' + esc(x.p.image) + '" alt=""><span><b>' + esc(x.p.brand) + '</b>' + esc(x.p.name) + '</span><em>' + x.pct + '%</em></li>'; }).join('') + '</ol>' +
      '<div class="sf2-buy"><span class="sf2-setp">' + fmt(S.SET.price) + ' <small>for 3 × ' + S.SET.ml + ' ml</small></span><button type="button" class="btn-primary" data-set>Add sample set to bag</button></div>' +
      '<p class="sf2-fine">Or pick two free 1.5 ml vials at checkout with any order.</p></div></section>' : '') +

      (home ? '<section class="sf2-home"><a href="' + pHref(home.slug) + '" class="sf2-home-img"><img src="' + esc(home.p.image) + '" alt="' + esc(home.p.name) + '" loading="lazy"></a><div><p class="sf2-eye">For your home</p><h2 class="sf2-h2">Fill your room with <em>you</em></h2><p class="sf2-brand" style="margin-top:18px">' + esc(home.p.brand) + '</p><a class="sf2-name" href="' + pHref(home.slug) + '">' + esc(home.p.name) + '</a>' +
      '<p class="sf2-why">' + esc(ai && ai.reasons && ai.reasons[home.slug] ? ai.reasons[home.slug] : home.s.l + ' It shares your love of ' + ADJ[FAMS.slice().sort(function (f1, f2) { return (pr.v[f2] || 0) * (home.s.v[f2] || 0) - (pr.v[f1] || 0) * (home.s.v[f1] || 0); })[0]] + ' notes.') + '</p>' +
      '<div class="sf2-buy"><span>From ' + fmt(home.p.price) + '</span><button type="button" class="btn-outline" data-add="' + home.slug + '">Add to bag</button></div></div></section>' : '') +

      '<div class="sf2-end"><button type="button" class="sf2-link" data-restart>Start again</button><a class="sf2-link" target="_blank" rel="noopener" href="https://wa.me/?text=' + encodeURIComponent(share) + '">Share on WhatsApp</a><a class="sf2-link" href="consultation.html">Prefer to smell them in person? Book the Atelier</a></div>';
    host.setAttribute('data-sf-names', setNames.join('|'));
  }

  function finish() {
    var pr = profile(a), list = rank(pr, false), picks = list.slice(0, 3), home = rank(pr, true)[0];
    renderLoading();
    var shown = false, t0 = Date.now();
    var show = function () { if (shown) return; shown = true; renderResult(); host.scrollIntoView({ block: 'start', behavior: 'smooth' }); };
    askAI(pr, picks, home).then(function () {
      var wait = Math.max(0, 1300 - (Date.now() - t0));
      if (!shown) setTimeout(show, wait);
      else if (ai) renderResult(); // the AI answered after we had to show the built-in words
    });
    setTimeout(show, 5000);
  }

  function addSlug(slug) {
    products(); var p = BY[slug]; if (!p) return;
    var v = p.variants.filter(function (y) { return y.stock > 0; })[0]; if (!v) return;
    var c = window.__sk && window.__sk.cart(); if (!c) return;
    c.add({ variantId: v.id, productId: p.id, slug: p.slug, brand: p.brand, name: p.name, variantName: v.name, price: v.price, compareAt: v.compareAt, image: p.image, maxQty: v.stock }, 1, false);
  }

  function addSet() {
    var pr = profile(a), picks = rank(pr, false).slice(0, 3); if (!picks.length) return;
    var c = window.__sk && window.__sk.cart(); if (!c) return;
    var slugs = picks.map(function (x) { return x.slug; });
    c.add({ variantId: 'sf-set:' + slugs.join(','), productId: S.SET.id, slug: S.SET.slug, brand: S.SET.brand, name: S.SET.name,
      variantName: '3 × ' + S.SET.ml + ' ml: ' + picks.map(function (x) { return x.p.name; }).join(', '), price: S.SET.price, compareAt: null, image: S.SET.image, maxQty: 5 }, 1, false);
  }

  function init() {
    host = $('[data-sf2]'); if (!host) return;
    var last = get('scent', null);
    if (/[?&]result/.test(location.search) && last && last.a) { a = last.a; who = a.who || last.who || 'all'; renderResult(); }
    else renderQ();
    host.addEventListener('click', function (e) {
      var b = e.target.closest('[data-v]');
      if (b) {
        a[S.Q[step].k] = b.getAttribute('data-v');
        if (S.Q[step].k === 'who') { who = a.who; var oo = opt('outfit', a.outfit); if (oo && !vis(oo)) delete a.outfit; }
        Array.prototype.forEach.call(host.querySelectorAll('[data-v]'), function (x) { x.classList.toggle('on', x === b); x.setAttribute('aria-pressed', x === b); });
        setTimeout(function () { step++; if (step >= S.Q.length) finish(); else { renderQ(); host.scrollIntoView({ block: 'start', behavior: 'smooth' }); } }, 240);
        return;
      }
      if (e.target.closest('[data-back]')) { step = Math.max(0, step - 1); renderQ(); return; }
      if (e.target.closest('[data-last]')) { var l = get('scent', null); if (l && l.a) { a = l.a; who = a.who || l.who || 'all'; step = S.Q.length; renderResult(); } return; }
      if (e.target.closest('[data-restart]')) { a = {}; who = 'all'; step = 0; ai = null; aiFor = ''; renderQ(); host.scrollIntoView({ block: 'start', behavior: 'smooth' }); return; }
      var w = e.target.closest('[data-who]');
      if (w) {
        who = a.who = w.getAttribute('data-who');
        var pr = profile(a), list = rank(pr, false);
        if (!list.length) { who = a.who = 'all'; toast('No matches for that yet, showing everyone.'); }
        renderResult();
        askAI(pr, rank(pr, false).slice(0, 3), rank(pr, true)[0]).then(function (r) { if (r) renderResult(); });
        return;
      }
      var ad = e.target.closest('[data-add]'); if (ad) { addSlug(ad.getAttribute('data-add')); return; }
      if (e.target.closest('[data-set]')) addSet();
    });
  }

  window.SKSF = { profile: profile, rank: rank, answers: function () { return a; }, setAnswers: function (x) { a = x; } };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
