/* Skinora AI growth layer:
   1. AI search: type what you want in plain words ("something for pimples under 10,000").
   2. Smart suggestions: "Picked for your skin" on product pages and "Goes well with your bag" in the bag.
   3. Stock and pricing helper in Admin > Smart insights: 60-day forecast, price ideas, and "Ask the AI".
   The AI parts call /api/search and /api/insights when the store has an AI key. Without one, or in the
   offline preview, the same features run on built-in rules so everything still works. */
(function () {
  'use strict';
  if (window.SKAI) return;
  window.SKAI = 1;

  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  var fmt = function (n) { return 'LKR ' + Math.round(n).toLocaleString('en-US'); };
  var json = function (id) { try { return JSON.parse(document.getElementById(id).textContent); } catch (e) { return null; } };
  var path = function () { return (document.body.getAttribute('data-sk-path') || '').split('?')[0]; };
  var D, F, P, bySlug = {}, byId = {};

  var priceOf = function (p) { return Math.min.apply(null, p.variants.map(function (v) { return v.price; })); };
  var inStock = function (p) { return p.variants.some(function (v) { return v.stock > 0; }); };
  var link = function (p) { return (window.SK_PAGES && window.SK_PAGES['/p/' + p.slug]) || ('p__' + p.slug + '.html'); };
  var api = function (url, body, ms) {
    var ctl = window.AbortController ? new AbortController() : null, t = ctl && setTimeout(function () { ctl.abort(); }, ms || 20000);
    return fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), signal: ctl && ctl.signal })
      .then(function (r) { if (t) clearTimeout(t); return r.ok ? r.json() : null; }, function () { if (t) clearTimeout(t); return null; });
  };
  var scan = function () { try { return (JSON.parse(localStorage.getItem('skd-scans') || '[]'))[0] || null; } catch (e) { return null; } };
  function card(p, why, add) {
    var v = p.variants.filter(function (x) { return x.stock > 0; })[0] || p.variants[0];
    return '<li class="skai-card"><a href="' + link(p) + '" class="skai-img"><img src="' + esc(p.image) + '" alt="" loading="lazy"></a><div class="skai-info">' +
      '<p class="skai-brand">' + esc(p.brand) + '</p><a href="' + link(p) + '" class="skai-name">' + esc(p.name) + '</a>' +
      (why ? '<p class="skai-why">' + esc(why) + '</p>' : '') + '<p class="skai-price">' + (p.variants.length > 1 ? 'From ' : '') + fmt(priceOf(p)) + '</p>' +
      (add && v.stock > 0 ? '<button type="button" class="skai-add" data-skai-add="' + esc(p.id) + '">Add to bag</button>' : '') + '</div></li>';
  }
  function addToBag(p) {
    var v = p.variants.filter(function (x) { return x.stock > 0; })[0];
    if (!v || !window.__sk) return;
    window.__sk.cart().add({ variantId: v.id, productId: p.id, slug: p.slug, brand: p.brand, name: p.name, variantName: v.name, price: v.price, compareAt: v.compareAt, image: p.image, maxQty: v.stock }, 1, true);
    window.__sk.toast(p.name + ' added to your bag', 1);
  }
  document.addEventListener('click', function (e) {
    var b = e.target.closest('[data-skai-add]');
    if (b && byId[b.getAttribute('data-skai-add')]) { e.preventDefault(); addToBag(byId[b.getAttribute('data-skai-add')]); }
  });

  /* =====================================================================
     1. AI search
     ===================================================================== */
  var WORDS = {
    concern: [[/pimple|acne|breakout|blemish|spot(?!s? ?free)|zit/, 'acne'], [/dark ?spot|pigment|uneven|melasma|marks?\b|brighten/, 'pigmentation'], [/wrinkle|fine line|lines|ageing|aging|anti.?age|firm/, 'ageing'],
      [/dry|dehydrat|flak|tight/, 'dryness'], [/pore|blackhead|congest/, 'pores'], [/dull|glow|radian|tired/, 'dullness'], [/red|irritat|calm|soothe|sensitiv/, 'redness']],
    skin: [[/oily|greasy|shiny/, 'oily'], [/combination|t.?zone/, 'combination'], [/\bdry skin\b/, 'dry'], [/sensitive|reacts?|eczema/, 'sensitive'], [/normal skin/, 'normal']],
    cat: [[/perfume|fragrance|scent|cologne|parfum|smell/, 'fragrances'], [/cleanser|face ?wash|wash my face|cleansing/, 'cleansers'], [/serum|essence(?!s)/, 'serums'],
      [/moisturi[sz]er|cream|lotion|hydrator/, 'moisturisers'], [/sunscreen|spf|sun ?block|sun protect|uv/, 'sunscreen'], [/mask|treatment|peel|exfoliat/, 'masks-treatments'],
      [/toner|essence/, 'toners-essences'], [/candle|home fragrance|room/, 'home-fragrance'], [/gift ?set|gift box|hamper|set\b/, 'gift-sets'], [/hand|body|bath/, 'bath-body'], [/gua sha|tool|roller/, 'tools']]
  };
  function parse(q) {
    var l = q.toLowerCase().replace(/,/g, ''), f = { concern: [], skin: [], cat: [], max: null, min: null, gender: null, like: null, luxury: null, ff: false, preg: false };
    WORDS.concern.forEach(function (w) { if (w[0].test(l) && f.concern.indexOf(w[1]) < 0) f.concern.push(w[1]); });
    WORDS.skin.forEach(function (w) { if (w[0].test(l)) f.skin.push(w[1]); });
    WORDS.cat.forEach(function (w) { if (w[0].test(l) && f.cat.indexOf(w[1]) < 0) f.cat.push(w[1]); });
    var num = function (s) { var m = s.match(/([\d.]+)\s*(k|000)?/); if (!m) return null; var n = parseFloat(m[1]); return m[2] === 'k' || (n < 1000 && /k\b/.test(s)) ? n * 1000 : n < 100 ? n * 1000 : n; };
    var mx = l.match(/(?:under|below|less than|max(?:imum)?|up to|within|budget(?: of| is)?|cheaper than)\s*(?:lkr|rs\.?|rs)?\s*([\d.]+\s*k?)/);
    var mn = l.match(/(?:over|above|more than|at least)\s*(?:lkr|rs\.?|rs)?\s*([\d.]+\s*k?)/);
    if (mx) f.max = num(mx[1]); if (mn) f.min = num(mn[1]);
    if (/\b(men|man|him|husband|boyfriend|dad|father|brother|masculine)\b/.test(l)) f.gender = 'men';
    if (/\b(women|woman|her|wife|girlfriend|mum|mom|mother|sister|feminine)\b/.test(l)) f.gender = 'women';
    if (/cheap|affordable|budget|low price|not expensive/.test(l)) f.luxury = false;
    if (/luxury|premium|high.?end|best of the best|splurge|special/.test(l)) f.luxury = true;
    if (/fragrance.?free|no fragrance|unscented/.test(l)) f.ff = true;
    [[/fresh|light|clean|citrus|aquatic|office|day ?time/, 'fresh'], [/floral|flower|rose|jasmine/, 'floral'], [/woody|wood|oud|sandal|smoky/, 'woody'], [/warm|sweet|vanilla|gourmand|cosy|cozy|evening|night out/, 'warm']].forEach(function (w) { if (w[0].test(l) && !/fragrance.?free/.test(l)) f.family = f.family || w[1]; });
    if (f.family && !f.cat.length && /perfume|fragrance|scent|cologne|smell/.test(l) === false && !/skin|cream|serum|wash/.test(l)) f.cat.push('fragrances');
    if (/pregnan|breastfeed|nursing/.test(l)) f.preg = true;
    if (/gift|present|birthday|anniversary/.test(l) && !f.cat.length && !f.concern.length) f.cat.push('gift-sets', 'fragrances');
    var lk = l.match(/(?:like|similar to|same as|dupe for|alternative to|instead of)\s+(.+?)(?:\s+(?:but|under|below|for|that|and)\b|$)/);
    if (lk) {
      var t = lk[1].trim();
      f.like = D.products.filter(function (p) { var n = (p.brand + ' ' + p.name).toLowerCase(); return n.indexOf(t) >= 0 || t.split(' ').filter(function (w) { return w.length > 2; }).every(function (w) { return n.indexOf(w) >= 0; }); })[0] || null;
      if (f.like && /cheap|less|lower|budget|affordable/.test(l) && !f.max) f.max = priceOf(f.like) - 1;
    }
    return f;
  }
  var CW = { acne: 'pimples', pigmentation: 'dark spots', ageing: 'lines', dryness: 'dry skin', pores: 'big pores', dullness: 'dull skin', redness: 'redness' };
  function localSearch(q) {
    var f = parse(q), sc = F.scents || {}, likeS = f.like && sc[f.like.slug];
    var known = (f.family ? 1 : 0) + f.concern.length + f.skin.length + f.cat.length + (f.max ? 1 : 0) + (f.gender ? 1 : 0) + (f.like ? 1 : 0) + (f.ff ? 1 : 0);
    if (!known) return null;
    var rows = D.products.map(function (p) {
      var s = 0, why = [], price = priceOf(p);
      if (f.like) {
        if (p.id === f.like.id) return null;
        var likeFrag = f.like.cats.indexOf('fragrances') >= 0;
        if (likeFrag ? p.cats.indexOf('fragrances') < 0 : (p.cats[0] !== f.like.cats[0] && !p.concerns.some(function (c) { return f.like.concerns.indexOf(c) >= 0; }))) return null;
        var ps = sc[p.slug];
        if (likeS && ps) { if (ps[6] === likeS[6]) { s += 6; why.push('Same ' + likeS[6] + ' scent family'); } if (ps[2].some(function (m) { return likeS[2].indexOf(m) >= 0; })) s += 2; }
        if (p.cats[0] === f.like.cats[0]) s += 3;
        p.concerns.forEach(function (c) { if (f.like.concerns.indexOf(c) >= 0) s += 1; });
      }
      if (f.cat.length) { if (p.cats.some(function (c) { return f.cat.indexOf(c) >= 0; })) s += 4; else if (!f.like) return null; }
      if (f.family) { var fs = sc[p.slug]; if (fs) { if (fs[6] === f.family) { s += 5; why.push(fs[0]); } else s -= 2; } }
      f.concern.forEach(function (c) { if (p.concerns.indexOf(c) >= 0) { s += 4; why.push('Helps with ' + CW[c]); } });
      if (f.concern.length && !p.concerns.some(function (c) { return f.concern.indexOf(c) >= 0; }) && !f.cat.length && !f.like) return null;
      f.skin.forEach(function (t) { if (p.skin.indexOf(t) >= 0) { s += 2; why.push('Good for ' + t + ' skin'); } else if (p.skin.length) s -= 2; });
      if (f.max && price > f.max) return null;
      if (f.min && price < f.min) return null;
      if (f.max) why.push(fmt(price) + (p.variants.length > 1 ? ' and up' : ''));
      if (f.gender) { if (p.gender && p.gender !== f.gender && p.gender !== 'unisex') return null; if (p.gender === f.gender) s += 2; }
      if (f.luxury === true) s += p.isLuxury ? 3 : -1;
      if (f.luxury === false) s += price < 8000 ? 2 : price > 20000 ? -2 : 0;
      if (f.ff) { if ((F.ff || []).some(function (x) { return p.slug.indexOf(x) === 0; })) { s += 3; why.push('Fragrance-free'); } else return null; }
      if (f.preg && p.ingredients.some(function (i) { return (F.avoid || []).indexOf(i) >= 0; })) return null;
      if (!inStock(p)) s -= 5;
      s += p.rating / 2 + Math.min(p.ratingCount, 30) / 30;
      return s > 1 ? { p: p, s: s, why: why.slice(0, 2).join(' · ') || p.tagline } : null;
    }).filter(Boolean).sort(function (a, b) { return b.s - a.s; }).slice(0, 6);
    var bits = [];
    if (f.like) bits.push('like ' + f.like.brand + ' ' + f.like.name);
    if (f.concern.length) bits.push('for ' + f.concern.map(function (c) { return CW[c]; }).join(' and '));
    if (f.family) bits.push(f.family + ' scents');
    var sk = f.skin.filter(function (t) { return !(t === 'dry' && f.concern.indexOf('dryness') >= 0); });
    if (sk.length) bits.push('for ' + sk.join(' and ') + ' skin');
    if (f.gender) bits.push('for ' + f.gender);
    if (f.max) bits.push('under ' + fmt(f.max));
    if (f.ff) bits.push('fragrance-free');
    return { summary: rows.length ? 'Our picks: ' + bits.join(', ') + '.' : 'Nothing matches all of that. Try a higher budget or fewer details.', picks: rows.map(function (r) { return { p: r.p, why: r.why }; }), engine: 'rules' };
  }
  var looksNatural = function (q) { return q.split(/\s+/).length >= 3 || /\d/.test(q) || /\b(for|like|under|with|without|my|best)\b/i.test(q); };

  function initSearch() {
    var root = $('div[role="dialog"][aria-label="Search"]'); if (!root) return;
    var input = root.querySelector('input'); if (!input) return;
    var wrap = input.closest('.container-lux') || input.parentNode, box = document.createElement('div');
    box.className = 'skai-search'; box.hidden = true;
    var row = input.closest('form') || input.parentNode;
    row.parentNode.insertBefore(box, row.nextSibling);
    input.setAttribute('placeholder', 'Search, or ask: "something for pimples under 10,000"');
    var hint = document.createElement('div'); hint.className = 'skai-hints';
    hint.innerHTML = '<span>Try asking</span>' + ['Something for pimples under 10,000', 'A perfume for my wife, fresh and light', 'Like Santal 33 but cheaper', 'Fragrance-free cream for dry skin'].map(function (t) { return '<button type="button" data-skai-q="' + esc(t) + '">' + esc(t) + '</button>'; }).join('');
    box.parentNode.insertBefore(hint, box);
    hint.addEventListener('click', function (e) { var b = e.target.closest('[data-skai-q]'); if (!b) return; input.value = b.getAttribute('data-skai-q'); input.dispatchEvent(new Event('input', { bubbles: true })); input.focus(); });
    var seq = 0, timer;
    function show(res, q, loading) {
      if (!res) { box.hidden = true; return; }
      box.hidden = false;
      box.innerHTML = '<div class="skai-head"><span class="skai-badge">AI picks</span><p>' + esc(res.summary) + '</p>' + (loading ? '<span class="skai-dots" aria-label="Thinking"><i></i><i></i><i></i></span>' : '') + '</div>' +
        (res.picks.length ? '<ul class="skai-grid">' + res.picks.map(function (x) { return card(x.p, x.why, true); }).join('') + '</ul>' : '');
    }
    input.addEventListener('input', function () {
      var q = input.value.trim(), my = ++seq;
      clearTimeout(timer);
      hint.hidden = q.length > 0;
      if (q.length < 3 || !looksNatural(q)) { show(null); return; }
      var local = localSearch(q);
      show(local, q, true);
      timer = setTimeout(function () {
        api('/api/search', { q: q }, 15000).then(function (r) {
          if (my !== seq) return;
          if (r && r.picks) {
            var picks = r.picks.map(function (x) { return bySlug[x.slug] ? { p: bySlug[x.slug], why: x.reason } : null; }).filter(Boolean);
            show({ summary: r.summary, picks: picks }, q, false);
          } else show(local, q, false);
        });
      }, 450);
    });
  }

  /* =====================================================================
     2. Smart suggestions
     ===================================================================== */
  var STEP = { cleansers: 'Wash', 'toners-essences': 'Hydrate', serums: 'Serum', 'masks-treatments': 'Extra care', moisturisers: 'Moisturise', sunscreen: 'Sunscreen' };
  function suggestFor(base, exclude, skin, concerns, n) {
    var have = {}; base.forEach(function (p) { have[p.cats[0]] = 1; });
    var skinCare = base.some(function (p) { return STEP[p.cats[0]]; }), frag = base.some(function (p) { return p.cats.indexOf('fragrances') >= 0; });
    return D.products.filter(function (q) { return exclude.indexOf(q.id) < 0 && inStock(q); }).map(function (q) {
      var s = 0, why = '';
      if (skinCare && STEP[q.cats[0]] && !have[q.cats[0]]) { s += 5; why = 'Adds the ' + STEP[q.cats[0]].toLowerCase() + ' step to your routine'; }
      if (q.cats[0] === 'sunscreen' && skinCare && !have.sunscreen) { s += 2; why = 'Protects your skin in the Sri Lankan sun'; }
      if (frag && (q.cats[0] === 'home-fragrance' || q.cats[0] === 'bath-body')) { s += 4; why = 'Goes well with a fragrance gift'; }
      if (skin && q.skin.indexOf(skin) >= 0) { s += 3; if (!why) why = 'Good for ' + skin + ' skin'; }
      (concerns || []).forEach(function (c) { if (q.concerns.indexOf(c) >= 0) { s += 3; why = why || 'Helps with ' + CW[c]; } });
      base.forEach(function (p) { if (p.brand === q.brand) s += 1; p.concerns.forEach(function (c) { if (q.concerns.indexOf(c) >= 0) s += 0.5; }); });
      if (have[q.cats[0]] && !frag) s -= 4;
      s += q.rating / 2 + Math.min(q.ratingCount, 30) / 30 + (q.isBestSeller ? 0.5 : 0);
      return { p: q, s: s, why: why || q.tagline };
    }).sort(function (a, b) { return b.s - a.s; }).slice(0, n);
  }
  function initProduct() {
    var slug = path().replace('/p/', ''), p = bySlug[slug];
    if (!p || $('.skai-pdp')) return;
    var me = scan(), skin = me ? me.skinType : null, concerns = me ? me.concerns : null;
    var picks = suggestFor([p], [p.id], skin || p.skin[0], concerns || p.concerns, 4);
    if (picks.length < 2) return;
    var sec = document.createElement('section'); sec.className = 'mt-28 skai-pdp';
    sec.innerHTML = '<div class="mb-8"><p class="eyebrow-wide mb-4">' + (me ? 'From your skin scan' : 'Smart picks') + '</p><h2 class="display-caps text-[28px] leading-[1.08] sm:text-4xl">' +
      (me ? 'Picked for your <em>' + esc(skin) + '</em> skin' : 'Goes well with this') + '</h2>' +
      (me ? '' : '<p class="mt-3 text-sm text-ink-600"><a class="underline" href="quiz.html?scan=1">Scan your skin</a> and these picks will match your skin.</p>') + '</div>' +
      '<ul class="skai-grid skai-grid-4">' + picks.map(function (x) { return card(x.p, x.why, true); }).join('') + '</ul>';
    var anchor = $('.skf-routine') || $$('main section').filter(function (s) { return /Frequently bought together|You may also like|Complete the routine/i.test(s.textContent); })[0];
    if (anchor) anchor.parentNode.insertBefore(sec, anchor.nextSibling); else { var m = $('main'); if (m) m.appendChild(sec); }
  }
  function bagBlock(items) {
    var base = items.map(function (i) { return byId[i.productId]; }).filter(Boolean);
    if (!base.length) return '';
    var me = scan(), picks = suggestFor(base, base.map(function (p) { return p.id; }), me && me.skinType, me && me.concerns, 3);
    return picks.length ? '<div class="skai-bag"><p class="skai-bag-h">Goes well with your bag</p><ul>' + picks.map(function (x) {
      return '<li><a href="' + link(x.p) + '"><img src="' + esc(x.p.image) + '" alt=""></a><div><p class="skai-brand">' + esc(x.p.brand) + '</p><a href="' + link(x.p) + '" class="skai-bag-n">' + esc(x.p.name) + '</a><p class="skai-why">' + esc(x.why) + '</p></div><div class="skai-bag-r"><span>' + fmt(priceOf(x.p)) + '</span><button type="button" data-skai-add="' + esc(x.p.id) + '">Add</button></div></li>';
    }).join('') + '</ul></div>' : '';
  }
  function initBag() {
    if (window.SKF && SKF.drawer && !SKF.drawer.__skai) {
      var orig = SKF.drawer;
      SKF.drawer = function (el, items, sub) {
        orig.apply(this, arguments);
        if (!items.length || items.every(function (i) { return i.gift; })) return;
        var scroll = $('.overflow-y-auto', el) || el, h = bagBlock(items);
        if (!h) return;
        // our picks replace the generic "You may also love" row
        $$('p', scroll).filter(function (x) { return /^you may also love$/i.test(x.textContent.trim()); }).forEach(function (x) { var box = x.parentElement; if (box && box !== scroll && box.querySelectorAll('li, a').length < 12) box.remove(); });
        scroll.insertAdjacentHTML('beforeend', h);
      };
      SKF.drawer.__skai = 1;
    }
    if (path() === '/cart') {
      var paint = function () {
        var old = $('.skai-cart'); if (old) old.remove();
        var items = window.__sk ? window.__sk.cart().items() : [];
        if (!items.length || items.every(function (i) { return i.gift; })) return;
        var h = bagBlock(items); if (!h) return;
        var m = $('main .container-lux') || $('main'); if (!m) return;
        var d = document.createElement('div'); d.className = 'skai-cart'; d.innerHTML = h; m.appendChild(d);
      };
      (window.__skOnCart = window.__skOnCart || []).push(paint);
      paint();
    }
  }

  /* =====================================================================
     3. Stock and pricing helper (Admin)
     ===================================================================== */
  var TODAY = new Date(); TODAY.setHours(0, 0, 0, 0);
  var LEAD = 21, H = 60;
  // Demand multipliers by date, from last year's Sri Lankan shopping peaks
  function season(d, p) {
    var m = d.getMonth() + 1, day = d.getDate(), frag = p.cats.indexOf('fragrances') >= 0 || p.cats.indexOf('gift-sets') >= 0 || p.cats.indexOf('home-fragrance') >= 0;
    if (m === 11 && day >= 24) return frag ? 1.8 : 1.6;           // Black Friday week
    if (m === 12 && day <= 25) return frag ? 1.9 : 1.4;           // Christmas gifting
    if ((m === 3 && day >= 25) || (m === 4 && day <= 14)) return 1.4; // Avurudu
    if (m === 2 && day <= 14) return frag ? 1.5 : 1.05;           // Valentine's
    if (m === 5 && day <= 12) return 1.2;                         // Mother's Day, Vesak
    return 1;
  }
  var EVENTS = [['Black Friday', 10, 24], ['Christmas', 11, 25], ['Avurudu', 3, 14], ['Valentine\'s Day', 1, 14], ['Mother\'s Day', 4, 10]];
  function nextEvent() {
    var best = null;
    EVENTS.forEach(function (e) { var d = new Date(TODAY.getFullYear(), e[1], e[2]); if (d < TODAY) d.setFullYear(d.getFullYear() + 1); if (!best || d < best.d) best = { name: e[0], d: d }; });
    best.days = Math.round((best.d - TODAY) / 864e5);
    return best;
  }
  function model() {
    var rows = [];
    D.products.forEach(function (p) {
      var perDay = p.sold / 365, tot = p.variants.reduce(function (s, v) { return s + v.stock + 1; }, 0);
      p.variants.forEach(function (v) {
        var rate = perDay * (v.stock + 1) / tot, need = 0, needLead = 0;
        for (var i = 0; i < H + LEAD; i++) { var d = new Date(TODAY.getTime() + i * 864e5), u = rate * season(d, p); if (i < H) need += u; if (i < LEAD) needLead += u; }
        var cover = rate > 0 ? v.stock / rate : 999, exp = v.batch && v.batch.expiry ? Math.round((new Date(v.batch.expiry) - TODAY) / 864e5) : null;
        var sellBeforeExp = exp != null ? rate * Math.max(0, exp) : Infinity, order = Math.max(0, Math.ceil(need + needLead * 0.5 - v.stock));
        var r = { p: p, v: v, rate: rate, need: Math.round(need), cover: Math.round(cover), exp: exp, order: order, status: '', action: null };
        r.status = v.stock === 0 ? 'out' : v.stock < needLead ? 'urgent' : order > 0 ? 'order' : cover > 180 ? 'over' : 'ok';
        var disc = (v.compareAt && v.compareAt > v.price) || p.flashPct > 0;
        if (exp != null && exp < 180 && sellBeforeExp < v.stock) {
          var left = Math.round(v.stock - sellBeforeExp), pct = exp < 60 ? 30 : exp < 120 ? 20 : 15;
          r.action = { k: 'sale', pct: pct, text: left + ' of ' + v.stock + ' may not sell before expiry in ' + exp + ' days. Put ' + pct + '% off now (' + fmt(v.price * (1 - pct / 100)) + ') or add it to a bundle.' };
        } else if ((r.status === 'urgent' || r.status === 'out') && disc) {
          r.action = { k: 'stop', text: 'Selling fast with only ' + v.stock + ' left, and it is on discount. End the discount to protect your margin until new stock arrives.' };
        } else if (r.status === 'over' && rate > 0) {
          r.action = { k: 'bundle', pct: 10, text: 'Enough stock for ' + Math.min(999, r.cover) + ' days. Try 10% off or a gift bundle to free up cash.' };
        } else if (r.status === 'urgent' && !disc) {
          r.action = { k: 'hold', text: 'High demand and low stock. Keep the full price and do not include it in promotions.' };
        }
        rows.push(r);
      });
    });
    return rows;
  }
  var label = { out: ['Out of stock', 'bad'], urgent: ['Order now', 'bad'], order: ['Order soon', 'warn'], over: ['Too much stock', 'info'], ok: ['OK', 'good'] };
  function localAnswer(q, rows, ev) {
    var l = q.toLowerCase(), list = function (rs, f) { return rs.map(f).join('\n'); };
    var nm = function (r) { return r.p.brand + ' ' + r.p.name + ' (' + r.v.name + ')'; };
    if (/sale|discount|offer|clear|promot|price/.test(l)) {
      var a = rows.filter(function (r) { return r.action && (r.action.k === 'sale' || r.action.k === 'bundle'); }).slice(0, 6);
      return a.length ? 'Best items to put on offer now:\n' + list(a, function (r) { return '• ' + nm(r) + ': ' + r.action.text; }) : 'Nothing needs a discount right now. Stock and expiry dates look healthy.';
    }
    if (/fragrance|perfume|december|christmas|gift/.test(l)) {
      var f = rows.filter(function (r) { return r.p.cats.indexOf('fragrances') >= 0 || r.p.cats.indexOf('gift-sets') >= 0; }).sort(function (a, b) { return b.need - a.need; }).slice(0, 6);
      return 'Expected best sellers for gifting in the next 60 days:\n' + list(f, function (r) { return '• ' + nm(r) + ': about ' + r.need + ' sold, ' + r.v.stock + ' in stock' + (r.order ? ', order ' + r.order : ''); });
    }
    var o = rows.filter(function (r) { return r.order > 0; }).sort(function (a, b) { return a.cover - b.cover; }).slice(0, 8);
    return (ev ? ev.name + ' is in ' + ev.days + ' days, and supplier lead time is ' + LEAD + ' days.\n' : '') + (o.length ? 'Order these first:\n' + list(o, function (r) { return '• ' + nm(r) + ': order ' + r.order + ' (' + r.v.stock + ' left, about ' + r.cover + ' days of stock)'; }) : 'Stock covers the next 60 days.');
  }
  function initAdmin() {
    var h1 = $$('h1').filter(function (h) { return /Smart insights/.test(h.textContent); })[0];
    if (!h1 || $('.skai-adm')) return;
    var head = h1.closest('.mb-7') || h1.parentNode, rows = model(), ev = nextEvent();
    var forecast = rows.filter(function (r) { return r.status !== 'ok'; }).sort(function (a, b) { var o = { out: 0, urgent: 1, order: 2, over: 3 }; return o[a.status] - o[b.status] || a.cover - b.cover; }).slice(0, 12);
    var acts = rows.filter(function (r) { return r.action; }).sort(function (a, b) { var o = { stop: 0, sale: 1, hold: 2, bundle: 3 }; return o[a.action.k] - o[b.action.k]; }).slice(0, 8);
    var spend = rows.reduce(function (s, r) { return s + r.order * r.v.price * 0.6; }, 0);
    var sec = document.createElement('section'); sec.className = 'skai-adm';
    sec.innerHTML = '<div class="skai-adm-top"><div><p class="skai-adm-eye">AI stock and pricing helper</p><h2>' + esc(ev.name) + ' is in ' + ev.days + ' days</h2><p class="skai-adm-sub">Forecast for the next ' + H + ' days from 12 months of sales, stock, batch expiry and Sri Lankan shopping seasons. Supplier lead time: ' + LEAD + ' days.</p></div>' +
      '<div class="skai-adm-kpis"><div><b>' + rows.filter(function (r) { return r.status === 'urgent' || r.status === 'out'; }).length + '</b><span>to order now</span></div><div><b>' + rows.filter(function (r) { return r.action && r.action.k === 'sale'; }).length + '</b><span>at risk of expiring</span></div><div><b>' + fmt(spend).replace('LKR ', 'LKR ') + '</b><span>est. reorder cost (60% of retail)</span></div></div></div>' +
      '<div class="skai-adm-grid"><div class="skai-adm-card"><h3>60-day forecast</h3><div class="skai-adm-scroll"><table><thead><tr><th>Product</th><th>In stock</th><th>Will sell</th><th>Order</th><th>Status</th></tr></thead><tbody>' +
      forecast.map(function (r) { var lb = label[r.status]; return '<tr><td><span class="skai-adm-n">' + esc(r.p.brand + ' ' + r.p.name) + '</span><span class="skai-adm-v">' + esc(r.v.name) + (r.exp != null && r.exp < 180 ? ' · expires in ' + r.exp + ' days' : '') + '</span></td><td>' + r.v.stock + '</td><td>~' + r.need + '</td><td>' + (r.order || '—') + '</td><td><span class="skai-pill ' + lb[1] + '">' + lb[0] + '</span></td></tr>'; }).join('') +
      '</tbody></table></div></div>' +
      '<div class="skai-adm-card"><h3>Price ideas</h3><ul class="skai-adm-acts">' + (acts.length ? acts.map(function (r) { return '<li><span class="skai-pill ' + ({ sale: 'warn', stop: 'bad', hold: 'info', bundle: 'info' })[r.action.k] + '">' + ({ sale: (r.action.pct || '') + '% off', stop: 'End discount', hold: 'Keep full price', bundle: 'Bundle or 10% off' })[r.action.k] + '</span><p><b>' + esc(r.p.brand + ' ' + r.p.name + ' · ' + r.v.name) + '</b>' + esc(r.action.text) + '</p></li>'; }).join('') : '<li><p>No price changes needed right now.</p></li>') + '</ul></div></div>' +
      '<div class="skai-adm-card skai-adm-ask"><h3>Ask the AI about your stock</h3><div class="skai-adm-chips">' + ['What should I reorder before ' + ev.name + '?', 'What should go on sale this week?', 'Which fragrances will sell most in December?'].map(function (t) { return '<button type="button" data-skai-ask="' + esc(t) + '">' + esc(t) + '</button>'; }).join('') + '</div>' +
      '<form class="skai-adm-form"><input type="text" placeholder="Ask anything, like: how much Sauvage do I need for Christmas?" aria-label="Ask about your stock"><button type="submit">Ask</button></form><div class="skai-adm-out" hidden></div></div>';
    head.parentNode.insertBefore(sec, head.nextSibling);
    var out = $('.skai-adm-out', sec), inp = $('input', sec);
    var compact = rows.map(function (r) { return { product: r.p.brand + ' ' + r.p.name, size: r.v.name, cat: r.p.cats[0], price: r.v.price, stock: r.v.stock, perDay: +r.rate.toFixed(2), next60: r.need, daysCover: Math.min(r.cover, 999), expiresInDays: r.exp, orderQty: r.order, status: r.status, discounted: !!(r.v.compareAt || r.p.flashPct) }; });
    function ask(q) {
      if (!q) return;
      out.hidden = false; out.innerHTML = '<p class="skai-adm-q">' + esc(q) + '</p><span class="skai-dots"><i></i><i></i><i></i></span>';
      api('/api/insights', { q: q, today: TODAY.toISOString().slice(0, 10), nextEvent: ev.name + ' in ' + ev.days + ' days', leadTimeDays: LEAD, rows: compact }, 45000).then(function (r) {
        var a = r && r.answer ? r.answer : localAnswer(q, rows, ev);
        out.innerHTML = '<p class="skai-adm-q">' + esc(q) + '</p><div class="skai-adm-a">' + esc(a).replace(/\n/g, '<br>') + '</div>' + (r && r.answer ? '' : '<p class="skai-adm-note">Answered by built-in rules. Add the AI key for full answers.</p>');
      });
    }
    sec.addEventListener('click', function (e) { var b = e.target.closest('[data-skai-ask]'); if (b) { inp.value = b.getAttribute('data-skai-ask'); ask(inp.value); } });
    $('form', sec).addEventListener('submit', function (e) { e.preventDefault(); ask(inp.value.trim()); });
  }

  function start() {
    D = json('sk-data'); F = json('sk-feat-data') || {};
    if (!D) return;
    D.products.forEach(function (p) { bySlug[p.slug] = p; byId[p.id] = p; });
    var pth = path();
    try { initSearch(); } catch (e) {}
    try { initBag(); } catch (e) {}
    if (pth.indexOf('/p/') === 0) setTimeout(function () { try { initProduct(); } catch (e) {} }, 0);
    if (pth === '/admin/insights') try { initAdmin(); } catch (e) {}
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();
