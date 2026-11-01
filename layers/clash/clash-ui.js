/* Skinora ingredient checker (UI). Needs clash-engine.js first.
   1. ingredient-check.html: build "My routine" from Skinora products or any other shop (name, pasted
      ingredients or a photo of the label), then see what clashes, good pairs and a morning and night plan.
   2. Product pages: "Works with your routine?" box with the clashes for that product and "Add to my routine".
   3. Quiz result: "Check it with what I already use" link.
   "My routine" lives in localStorage 'sk-shelf' so other features can read it: window.SKCLASH.items(). */
(function () {
  'use strict';
  if (window.SKCLASH || !window.SKCLASH_ENGINE) return;
  var E = window.SKCLASH_ENGINE;
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  var json = function (id) { try { return JSON.parse(document.getElementById(id).textContent); } catch (e) { return null; } };
  var path = function () { return (document.body.getAttribute('data-sk-path') || '').split('?')[0]; };
  var link = function (slug) { return (window.SK_PAGES && window.SK_PAGES['/p/' + slug]) || ('p__' + slug + '.html'); };
  var PAGE = 'ingredient-check.html';
  var D, bySlug = {};

  /* ---------- storage ---------- */
  var KEY = 'sk-shelf', PKEY = 'sk-clash-prefs';
  var load = function (k, d) { try { var v = JSON.parse(localStorage.getItem(k)); return v == null ? d : v; } catch (e) { return d; } };
  var save = function (k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} };
  var shelf = function () { return load(KEY, []); };
  var setShelf = function (l) { save(KEY, l); try { window.dispatchEvent(new CustomEvent('sk-shelf')); } catch (e) {} };
  var scan = function () { var l = load('skd-scans', []); return l[0] || null; };
  function prefs() {
    var p = load(PKEY, null);
    if (!p) { var s = scan(); p = { preg: false, sens: !!(s && (s.skinType === 'sensitive' || (s.concerns || []).indexOf('redness') >= 0)) }; }
    return p;
  }

  function fromProduct(p) {
    var lip = /\blips?\b/i.test(p.name);
    var it = E.make({ id: 'sk:' + p.slug, name: p.name, brand: p.brand, ingredients: p.ingredients.join(', '), cat: p.cats[0], src: 'skinora', slug: p.slug, image: p.image });
    if (lip) it.actives = it.actives.filter(function (k) { return k === 'fragrance'; });
    return it;
  }
  function toItem(e) {
    if (e.src === 'skinora') return bySlug[e.slug] ? fromProduct(bySlug[e.slug]) : null;
    var it = E.make({ id: e.id, name: e.name, brand: e.brand, ingredients: e.ingredients || '', actives: e.actives, cat: e.cat, src: 'other' });
    if (/\blips?\b/i.test(e.name)) it.actives = it.actives.filter(function (k) { return k === 'fragrance'; });
    return it;
  }
  var items = function () { return shelf().map(toItem).filter(Boolean); };
  var inShelf = function (slug) { return shelf().some(function (e) { return e.slug === slug; }); };
  function addSkinora(slug) { if (!bySlug[slug] || inShelf(slug)) return; var l = shelf(); l.push({ src: 'skinora', slug: slug, at: Date.now() }); setShelf(l); }
  function remove(id) { setShelf(shelf().filter(function (e) { return (e.src === 'skinora' ? 'sk:' + e.slug : e.id) !== id; })); }
  var skinCare = function (p) { return p.cats.indexOf('skin-care') >= 0 && p.ingredients.length; };

  /* ---------- shared bits ---------- */
  var LV = { stop: ['Don’t mix', 'skc-stop'], care: ['Use with care', 'skc-care'], tip: ['Tip', 'skc-tip'], ok: ['Good pair', 'skc-ok'] };
  var ICON = {
    stop: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.6"><circle cx="12" cy="12" r="9"/><path d="M8.5 8.5l7 7M15.5 8.5l-7 7"/></svg>',
    care: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M12 3l9.5 17h-19z"/><path d="M12 10v4.5M12 17.2v.3"/></svg>',
    ok: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.6"><circle cx="12" cy="12" r="9"/><path d="M8 12.5l2.8 2.8L16.5 9.5"/></svg>',
    tip: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.6"><circle cx="12" cy="12" r="9"/><path d="M12 11v5.5M12 7.7v.3"/></svg>',
    sun: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="4"/><path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M5.3 18.7l1.4-1.4M17.3 6.7l1.4-1.4"/></svg>',
    moon: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z"/></svg>',
    x: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M6 6l12 12M18 6L6 18"/></svg>',
    cam: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M4 8h3l1.5-2.5h7L17 8h3v11H4z"/><circle cx="12" cy="13" r="3.5"/></svg>'
  };
  function nameMap(list) { var m = {}; list.forEach(function (i) { m[i.id] = i; }); return m; }
  function chips(it) {
    var a = it.actives.filter(function (k) { return k !== 'hydrator' && k !== 'soother'; });
    var soft = it.actives.filter(function (k) { return k === 'hydrator' || k === 'soother'; });
    if (!a.length && !soft.length) return '<span class="skc-chip skc-chip-none">No strong actives found</span>';
    return a.map(function (k) { return '<span class="skc-chip' + (k === 'spf' ? ' skc-chip-sun' : k === 'fragrance' ? ' skc-chip-soft' : '') + '">' + esc(E.ACTIVES[k].name) + '</span>'; }).join('') +
      soft.map(function (k) { return '<span class="skc-chip skc-chip-soft">' + esc(E.ACTIVES[k].name) + '</span>'; }).join('');
  }
  function card(x, m, focus) {
    var l = LV[x.level], who = x.items.filter(function (id) { return id !== focus; }).map(function (id) { return m[id] ? E.label(m[id]) : ''; }).filter(Boolean);
    return '<article class="skc-issue ' + l[1] + '"><div class="skc-issue-h">' + ICON[x.level] + '<span class="skc-tag">' + l[0] + '</span></div>' +
      '<h3>' + esc(x.title) + '</h3>' + (who.length ? '<p class="skc-who">' + (focus ? 'With your ' : '') + esc(who.join(' + ')) + '</p>' : '') +
      '<p>' + esc(x.why) + '</p>' + (x.fix ? '<p class="skc-fix"><b>What to do:</b> ' + esc(x.fix) + '</p>' : '') + '</article>';
  }

  /* =====================================================================
     1. Checker page
     ===================================================================== */
  var EXAMPLE = ['the-ordinary-retinol-05-in-squalane', 'the-ordinary-glycolic-acid-7-exfoliating-toner', 'medicube-deep-vita-c-capsule-cream', 'cerave-moisturising-cream'];
  function page(root) {
    var tab = 'shop', busy = false, msg = '';
    var q = new URLSearchParams(location.search).get('add');
    if (q) { q.split(',').forEach(addSkinora); history.replaceState(null, '', location.pathname); }

    function draw() {
      var list = items(), m = nameMap(list), pf = prefs(), r = E.check(list, { pregnant: pf.preg, sensitive: pf.sens });
      var bag = window.__sk ? window.__sk.cart().items().filter(function (i) { var p = bySlug[i.slug]; return p && skinCare(p) && !inShelf(p.slug); }) : [];
      var me = scan();
      root.innerHTML =
        '<div class="skc-grid"><section class="skc-col" aria-label="My routine">' +
          '<div class="skc-box"><div class="skc-box-h"><h2 class="skc-h2">My routine</h2><span class="skc-count">' + list.length + (list.length === 1 ? ' product' : ' products') + '</span></div>' +
          (list.length ? '<ul class="skc-list">' + list.map(function (it) {
            return '<li class="skc-item">' + (it.image ? '<img src="' + esc(it.image) + '" alt="">' : '<span class="skc-ph">' + esc((it.brand || it.name).charAt(0)) + '</span>') +
              '<div class="skc-item-b"><p class="skc-brand">' + esc(it.brand || (it.src === 'other' ? 'Other shop' : '')) + (it.src === 'other' ? ' <span class="skc-ext">Not from Skinora</span>' : '') + '</p>' +
              (it.slug ? '<a class="skc-name" href="' + link(it.slug) + '">' + esc(it.name) + '</a>' : '<p class="skc-name">' + esc(it.name) + '</p>') +
              '<div class="skc-chips">' + chips(it) + '</div></div><button type="button" class="skc-rm" data-skc-rm="' + esc(it.id) + '" aria-label="Remove ' + esc(it.name) + '">' + ICON.x + '</button></li>';
          }).join('') + '</ul>' : '<div class="skc-empty"><p>Add the products you use now, from Skinora or any other shop.</p><button type="button" class="skc-link" data-skc-example>Try an example routine</button></div>') +
          (bag.length ? '<button type="button" class="skc-bagbtn" data-skc-bag>Add ' + bag.length + ' from my bag</button>' : '') +
          '</div>' +
          '<div class="skc-box"><h2 class="skc-h2">Add a product</h2><div class="skc-tabs" role="tablist">' +
            '<button type="button" role="tab" aria-selected="' + (tab === 'shop') + '" data-skc-tab="shop">From Skinora</button>' +
            '<button type="button" role="tab" aria-selected="' + (tab === 'other') + '" data-skc-tab="other">From another shop</button></div>' +
          (tab === 'shop' ?
            '<div class="skc-find"><input type="search" data-skc-find placeholder="Search, for example retinol or CeraVe" aria-label="Search Skinora products"><ul class="skc-results" data-skc-results></ul></div>' :
            '<form class="skc-other" data-skc-other><label>Product name<input name="name" required maxlength="120" placeholder="For example Paula’s Choice 2% BHA Liquid"></label>' +
            '<label>Ingredients <span>(optional, but gives a better check)</span><textarea name="ing" rows="4" maxlength="4000" placeholder="Copy the ingredient list from the box or the shop’s page and paste it here"></textarea></label>' +
            '<div class="skc-other-row"><button class="skp-btn" type="submit"' + (busy ? ' disabled' : '') + '>' + (busy ? 'Checking…' : 'Add and check') + '</button>' +
            '<label class="skc-photo">' + ICON.cam + '<span>Photo of the label</span><input type="file" accept="image/*" capture="environment" data-skc-photo hidden></label></div>' +
            (msg ? '<p class="skc-msg" role="status">' + esc(msg) + '</p>' : '') + '</form>') +
          '</div>' +
          '<div class="skc-box skc-prefs"><label><input type="checkbox" data-skc-pref="preg"' + (pf.preg ? ' checked' : '') + '> I’m pregnant or breastfeeding</label>' +
          '<label><input type="checkbox" data-skc-pref="sens"' + (pf.sens ? ' checked' : '') + '> My skin is sensitive' + (me && me.skinType === 'sensitive' ? ' <span>(from your skin scan)</span>' : '') + '</label></div>' +
        '</section><section class="skc-col" aria-live="polite" aria-label="Results">' + results(list, m, r) + '</section></div>';
      if (tab === 'shop') find('');
    }

    function results(list, m, r) {
      if (list.length < 2) return '<div class="skc-box skc-wait"><p class="skp-eye">Your check</p><p class="skc-wait-t">' + (list.length ? 'Add one more product to check them together.' : 'Add two or more products and we’ll check them together.') + '</p>' +
        '<p class="skc-note">We look for the mixes that cause trouble, like retinol with acids, or vitamin C with benzoyl peroxide, and tell you when to use each product.</p></div>';
      var n = r.issues.length, v = r.verdict;
      var head = v === 'ok' ? ['Your routine works together', 'No clashes found between your ' + list.length + ' products.'] :
        v === 'stop' ? [n + (n === 1 ? ' clash' : ' clashes') + ' to fix', 'Some of your products shouldn’t be used at the same time. The plan below keeps them apart.'] :
        [n + (n === 1 ? ' thing' : ' things') + ' to watch', 'Nothing serious, but use these with care.'];
      return '<div class="skc-verdict skc-v-' + v + '">' + ICON[v === 'ok' ? 'ok' : v] + '<div><p class="skc-verdict-t">' + head[0] + '</p><p>' + head[1] + '</p></div></div>' +
        (n ? '<div class="skc-issues">' + r.issues.map(function (x) { return card(x, m); }).join('') + '</div>' : '') +
        (r.tips.length ? '<div class="skc-issues">' + r.tips.map(function (x) { return card(x, m) + (x.kind === 'spf' ? sunPick() : ''); }).join('') + '</div>' : '') +
        planHtml(r.plan) +
        (r.good.length ? '<div class="skc-good"><p class="skp-eye">Good pairs</p><ul>' + r.good.map(function (g) { return '<li>' + ICON.ok + '<div><b>' + esc(g.title) + '</b><span>' + esc(g.why) + '</span></div></li>'; }).join('') + '</ul></div>' : '') +
        '<p class="skc-disc">General guidance, not medical advice. Patch test new products, and ask a skin doctor if you have a skin condition or use prescription creams.</p>';
    }
    function sunPick() {
      var p = bySlug['beauty-of-joseon-relief-sun-rice-probiotics-spf50'] || bySlug['la-roche-posay-anthelios-uvmune-400-invisible-fluid-spf50'];
      return p ? '<div class="skc-pick"><img src="' + esc(p.image) + '" alt=""><div><p class="skc-brand">' + esc(p.brand) + '</p><a class="skc-name" href="' + link(p.slug) + '">' + esc(p.name) + '</a></div><button type="button" class="skc-mini" data-skc-add="' + esc(p.slug) + '">Add to routine</button></div>' : '';
    }
    function planHtml(pl) {
      var col = function (title, icon, l, sub) {
        return '<div class="skc-plan-c"><p class="skc-plan-t">' + icon + title + '</p>' + (sub ? '<p class="skc-plan-s">' + sub + '</p>' : '') +
          (l.length ? '<ol>' + l.map(function (it) { return '<li><span class="skc-step">' + esc(E.STEP[it.type] || 'Treat') + '</span>' + esc(E.label(it)) + '</li>'; }).join('') + '</ol>' : '<p class="skc-plan-s">Nothing needed</p>') + '</div>';
      };
      return '<div class="skc-plan"><p class="skp-eye">How to use them</p><div class="skc-plan-g' + (pl.split ? ' skc-plan-3' : '') + '">' +
        col('Morning', ICON.sun, pl.am) +
        (pl.split ? col('Night 1', ICON.moon, pl.pm, 'Retinol nights') + col('Night 2', ICON.moon, pl.pm2, 'Swap nights: take turns with Night 1') : col('Night', ICON.moon, pl.pm)) +
        '</div></div>';
    }
    function find(qs) {
      var ul = $('[data-skc-results]', root); if (!ul) return;
      var t = qs.toLowerCase().trim(), have = {};
      shelf().forEach(function (e) { if (e.slug) have[e.slug] = 1; });
      var l = D.products.filter(function (p) { return skinCare(p) && !have[p.slug]; }).filter(function (p) {
        return !t || (p.brand + ' ' + p.name + ' ' + p.ingredients.join(' ') + ' ' + p.cats[0]).toLowerCase().indexOf(t) >= 0;
      }).slice(0, t ? 8 : 5);
      ul.innerHTML = (t ? '' : '<li class="skc-res-h">Popular</li>') + l.map(function (p) {
        return '<li><button type="button" data-skc-add="' + esc(p.slug) + '"><img src="' + esc(p.image) + '" alt=""><span><b>' + esc(p.brand) + '</b>' + esc(p.name) + '</span><em>Add</em></button></li>';
      }).join('') + (t && !l.length ? '<li class="skc-res-none">Not in our shop? Use <button type="button" class="skc-link" data-skc-tab="other">From another shop</button>.</li>' : '');
    }
    function addOther(name, ing, actives, cat, brand) {
      var l = shelf(); l.push({ src: 'other', id: 'x' + Date.now().toString(36), name: name, brand: brand || '', ingredients: ing, actives: actives || undefined, cat: cat || undefined, at: Date.now() }); setShelf(l);
    }
    function ai(body) {
      return fetch('/api/ingredients', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
        .then(function (r) { return r.ok ? r.json() : null; }, function () { return null; });
    }

    root.addEventListener('input', function (e) { if (e.target.matches('[data-skc-find]')) find(e.target.value); });
    root.addEventListener('change', function (e) {
      var pr = e.target.getAttribute('data-skc-pref');
      if (pr) { var p = prefs(); p[pr] = e.target.checked; save(PKEY, p); draw(); }
      if (e.target.matches('[data-skc-photo]') && e.target.files[0]) photo(e.target.files[0]);
    });
    root.addEventListener('click', function (e) {
      var b;
      if ((b = e.target.closest('[data-skc-add]'))) { addSkinora(b.getAttribute('data-skc-add')); draw(); var f = $('[data-skc-find]', root); if (f) f.focus(); }
      else if ((b = e.target.closest('[data-skc-rm]'))) { remove(b.getAttribute('data-skc-rm')); draw(); }
      else if ((b = e.target.closest('[data-skc-tab]'))) { tab = b.getAttribute('data-skc-tab'); msg = ''; draw(); var i = $(tab === 'shop' ? '[data-skc-find]' : '[name=name]', root); if (i) i.focus(); }
      else if (e.target.closest('[data-skc-example]')) { EXAMPLE.forEach(addSkinora); draw(); }
      else if (e.target.closest('[data-skc-bag]')) { window.__sk.cart().items().forEach(function (i) { var p = bySlug[i.slug]; if (p && skinCare(p)) addSkinora(p.slug); }); draw(); }
    });
    root.addEventListener('submit', function (e) {
      if (!e.target.matches('[data-skc-other]')) return;
      e.preventDefault();
      var name = e.target.name.value.trim(), ing = e.target.ing.value.trim();
      if (!name) return;
      var found = E.detect(name + ' ' + ing);
      if (found.length || ing.length > 40) { addOther(name, ing); msg = ''; draw(); return; }
      // Only a name: ask the AI what is in it, if the store has the AI key
      busy = true; draw();
      ai({ name: name }).then(function (r) {
        busy = false;
        if (r && r.actives) { addOther(r.name || name, '', r.actives, r.type, r.brand); msg = r.note || ''; }
        else { addOther(name, ''); msg = 'We couldn’t find active ingredients in the name. Paste the ingredient list for a better check.'; }
        draw();
      });
    });
    function photo(file) {
      busy = true; msg = 'Reading the label…'; draw();
      var img = new Image(), url = URL.createObjectURL(file);
      img.onload = function () {
        var k = Math.min(1, 1400 / Math.max(img.width, img.height)), c = document.createElement('canvas');
        c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
        c.getContext('2d').drawImage(img, 0, 0, c.width, c.height); URL.revokeObjectURL(url);
        ai({ image: c.toDataURL('image/jpeg', 0.85).split(',')[1] }).then(function (r) {
          busy = false;
          if (r && r.name) { addOther(r.name, r.ingredients || '', r.actives, r.type, r.brand); msg = 'Added ' + r.name + ' from your photo.'; }
          else msg = 'We couldn’t read the label right now. Type the product name and paste the ingredients instead.';
          draw();
        });
      };
      img.onerror = function () { busy = false; msg = 'That file isn’t a photo we can read.'; draw(); };
      img.src = url;
    }
    window.addEventListener('sk-shelf', function () { if (!root.contains(document.activeElement) || !document.activeElement.matches('input,textarea')) draw(); });
    draw();
  }

  /* =====================================================================
     2. Product pages
     ===================================================================== */
  function productBox() {
    var slug = path().replace('/p/', ''), p = bySlug[slug];
    if (!p || !skinCare(p) || $('.skc-pdp')) return;
    var box = document.createElement('div'); box.className = 'skc-pdp';
    var anchor = $('.skf-know') || $$('ul').filter(function (u) { return /Cash on delivery/.test(u.textContent); })[0];
    if (!anchor) return;
    anchor.parentNode.insertBefore(box, anchor.nextSibling);
    function paint() {
      var me = fromProduct(p), others = items().filter(function (i) { return i.id !== me.id; }), mine = inShelf(slug), pf = prefs();
      var add = mine ? '<span class="skc-in">' + ICON.ok + 'In my routine</span>' : '<button type="button" class="skc-mini" data-skc-pdp-add>Add to my routine</button>';
      if (!others.length) {
        box.innerHTML = '<div class="skc-pdp-h"><p class="skc-pdp-t">Will it clash with what you use?</p>' + add + '</div>' +
          '<p class="skc-pdp-p">Tell us the products you use now, from any shop, and we’ll check this one against them.</p><a class="skc-pdp-a" href="' + PAGE + '?add=' + encodeURIComponent(slug) + '">Check my products</a>';
        return;
      }
      var r = E.check(others.concat([me]), { pregnant: pf.preg, sensitive: false }), m = nameMap(others.concat([me]));
      var mineIssues = r.issues.filter(function (x) { return x.items.indexOf(me.id) >= 0; });
      var v = mineIssues.some(function (x) { return x.level === 'stop'; }) ? 'stop' : mineIssues.length ? 'care' : 'ok';
      box.innerHTML = '<div class="skc-pdp-h"><p class="skc-pdp-t skc-v-' + v + '">' + ICON[v] + (v === 'ok' ? 'Works with your routine' : v === 'stop' ? 'Clashes with your routine' : 'Use with care in your routine') + '</p>' + add + '</div>' +
        (v === 'ok' ? '<p class="skc-pdp-p">No clashes with the ' + others.length + (others.length === 1 ? ' product' : ' products') + ' in your routine.</p>' :
          '<ul class="skc-pdp-l">' + mineIssues.slice(0, 3).map(function (x) {
            var with_ = x.items.filter(function (id) { return id !== me.id; }).map(function (id) { return m[id] ? E.label(m[id]) : ''; }).filter(Boolean).join(', ');
            return '<li><b>' + esc(x.title) + (with_ ? ' (your ' + esc(with_) + ')' : '') + '.</b> ' + esc(x.fix || x.why) + '</li>';
          }).join('') + '</ul>') +
        '<a class="skc-pdp-a" href="' + PAGE + (mine ? '' : '?add=' + encodeURIComponent(slug)) + '">' + (mine ? 'See my full check' : 'See the full check and plan') + '</a>';
    }
    box.addEventListener('click', function (e) { if (e.target.closest('[data-skc-pdp-add]')) { addSkinora(slug); if (window.__sk) window.__sk.toast('Added to my routine', 1); } });
    window.addEventListener('sk-shelf', paint);
    window.addEventListener('storage', function (e) { if (e.key === KEY) paint(); });
    paint();
  }

  /* =====================================================================
     3. Quiz result: check the new routine with what you already use
     ===================================================================== */
  function quizLink() {
    var done = function () {
      var b = $('[data-q="addall"]');
      if (!b || $('.skc-quiz')) return;
      var host = b; while (host && !host.__steps) host = host.parentElement;
      var slugs = host ? host.__steps.map(function (s) { return s.p && s.p.slug; }).filter(Boolean) : [];
      if (!slugs.length) return;
      var a = document.createElement('a'); a.className = 'skc-quiz'; a.href = PAGE + '?add=' + slugs.map(encodeURIComponent).join(',');
      a.textContent = 'Check it with the products I already use';
      b.parentNode.insertBefore(a, b.nextSibling);
    };
    new MutationObserver(done).observe(document.body, { childList: true, subtree: true });
    done();
  }

  window.SKCLASH = { items: items, add: addSkinora, remove: remove, check: function (list, o) { return E.check(list || items(), o || prefs()); } };

  function start() {
    D = json('sk-data');
    if (!D) return;
    D.products.forEach(function (p) { bySlug[p.slug] = p; });
    var pth = path(), root = document.getElementById('skc-root');
    if (root) try { page(root); } catch (e) { console.error(e); }
    if (pth.indexOf('/p/') === 0) setTimeout(function () { try { productBox(); } catch (e) {} }, 0);
    if (pth === '/quiz') try { quizLink(); } catch (e) {}
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();
