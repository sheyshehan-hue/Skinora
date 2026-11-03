/* Skinora: request a product we don't stock (pre-order on request).
   Customers ask for an item, we check price and a genuine supplier, then send a quote with a payment link.
   Nothing is paid upfront. In this static preview, requests live in localStorage (skd-requests) like the
   bag and orders do, and the admin list adds sample requests so the "most requested" view has something in it. */
(function () {
  'use strict';
  if (window.__skReq) return;
  window.__skReq = 1;

  var WA = '94771234567';            // Skinora's WhatsApp number, same as the rest of the site
  var DEPOSIT_FROM = 50000;          // ask for a deposit when the quote is this much or more
  var DEPOSIT_PCT = 30;
  var REPLY_HOURS = 48;
  var ETAS = ['1–2 weeks', '2–3 weeks', '3–4 weeks', '4–6 weeks'];

  var PATH = (document.body.getAttribute('data-sk-path') || '/').split('?')[0];
  var IS_ADMIN = PATH.indexOf('/admin') === 0;
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  var fmt = function (n) { return 'LKR ' + Math.round(n).toLocaleString('en-US'); };
  var toast = function (m, ok) { if (window.__sk && window.__sk.toast) window.__sk.toast(m, ok); };
  var mem = {};
  var S = {
    get: function (k, d) { try { var v = localStorage.getItem('skd-' + k); if (v != null) return JSON.parse(v); } catch (e) {} return k in mem ? mem[k] : d; },
    set: function (k, v) { mem[k] = v; try { localStorage.setItem('skd-' + k, JSON.stringify(v)); } catch (e) {} }
  };

  /* ---------- shared helpers ---------- */
  function waNum(p) {
    p = String(p || '').replace(/\D/g, '');
    if (p.indexOf('94') === 0 && p.length === 11) return p;
    if (p[0] === '0' && p.length === 10) return '94' + p.slice(1);
    if (p.length === 9) return '94' + p;
    return p;
  }
  var okPhone = function (p) { return /^947\d{8}$/.test(waNum(p)); };
  var okEmail = function (e) { return !e || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e); };
  var waLink = function (num, text) { return 'https://wa.me/' + num + '?text=' + encodeURIComponent(text); };
  var itemName = function (r) { return [r.brand, r.product].filter(Boolean).join(' ') + (r.size ? ' (' + r.size + ')' : ''); };
  var ago = function (t) {
    var h = Math.max(0, (Date.now() - new Date(t).getTime()) / 36e5);
    if (h < 1) return 'just now';
    if (h < 24) return Math.floor(h) + 'h ago';
    var d = Math.floor(h / 24); return d === 1 ? 'yesterday' : d + ' days ago';
  };
  var dateStr = function (t) { return new Date(t).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }); };
  function catalogue() { try { return JSON.parse($('#sk-data').textContent).products || []; } catch (e) { return []; } }
  var words = function (s) { return String(s || '').toLowerCase().replace(/[^a-z0-9%]+/g, ' ').split(' ').filter(function (w) { return w.length > 1; }); };

  // Is the thing they asked for already in the shop?
  function inStock(brand, product) {
    var want = words(product), b = String(brand || '').toLowerCase().trim();
    if (want.length < 1) return null;
    var best = null, bestSc = 0;
    catalogue().forEach(function (p) {
      var name = words(p.name), pb = p.brand.toLowerCase();
      if (b && pb.indexOf(b) < 0 && b.indexOf(pb) < 0) return;
      var hit = want.filter(function (w) { return name.indexOf(w) >= 0; }).length;
      var sc = hit / Math.max(want.length, 2);
      if (sc > bestSc) { bestSc = sc; best = p; }
    });
    return bestSc >= 0.6 ? best : null;
  }

  // Customer-facing status text
  var STATUS = {
    new: ['New', 'We are checking the price and a genuine supplier'],
    quoted: ['Quoted', 'Quote sent. Waiting for your reply'],
    ordered: ['Ordered', 'Paid and ordered. On the way to Sri Lanka'],
    arrived: ['Arrived', 'Arrived. Ready to deliver to you'],
    unavailable: ["Can't source", 'We could not find a genuine one this time'],
    closed: ['Closed', 'Closed']
  };
  var ORDER = ['new', 'quoted', 'ordered', 'arrived', 'unavailable', 'closed'];

  function mine() { return S.get('requests', []); }
  function edits() { return S.get('req-admin', {}); }
  function withEdits(r) { var e = edits()[r.id]; if (!e) return r; var o = {}; for (var k in r) o[k] = r[k]; for (var j in e) o[j] = e[j]; return o; }

  /* ---------- store: footer link ---------- */
  function footerLink() {
    $$('footer a[href="gift-cards.html"]').forEach(function (a) {
      var li = a.closest('li'); if (!li || $('a[href="request.html"]', li.parentElement)) return;
      var n = li.cloneNode(true), l = $('a', n); l.href = 'request.html'; l.textContent = 'Request a product';
      li.after(n);
    });
  }

  /* ---------- store: search overlay ---------- */
  function missed(q) {
    q = q.trim().toLowerCase(); if (q.length < 3) return;
    var m = S.get('req-missed', []);
    if (m.length && m[m.length - 1].q === q) return;
    m.push({ q: q, at: new Date().toISOString() }); S.set('req-missed', m.slice(-200));
  }
  function searchHook() {
    var root = $('div[role="dialog"][aria-label="Search"]'); if (!root) return;
    var input = $('input', root); if (!input) return;
    var wrap = input.closest('.container-lux') || root, timer;
    var paint = function () {
      var q = input.value.trim();
      var none = $$('p', wrap).filter(function (p) { return /^No products match/.test(p.textContent); })[0];
      if (none && !none.hasAttribute('data-skr-done')) {
        none.setAttribute('data-skr-done', '1');
        none.innerHTML = 'We don’t stock “' + esc(q) + '” yet.';
        var box = document.createElement('div'); box.className = 'skr-miss'; box.setAttribute('data-skr', '1');
        box.innerHTML = '<p class="skr-miss-eye">Can’t find it?</p><p class="skr-miss-h">We can bring it in for you.</p>' +
          '<p class="skr-miss-p">Tell us what you want. We reply within ' + REPLY_HOURS + ' hours with the price. You pay only if you say yes.</p>' +
          '<a class="btn-primary skr-miss-btn" href="request.html?q=' + encodeURIComponent(q) + '">Request it</a>';
        none.after(box);
        clearTimeout(timer); timer = setTimeout(function () { missed(q); }, 1200);
      }
      // a quiet link under normal results too
      var list = $$('ul', wrap).filter(function (u) { return u.querySelector('a[href^="p__"]'); })[0];
      if (list && !(list.nextElementSibling && list.nextElementSibling.hasAttribute('data-skr'))) {
        var p = document.createElement('p'); p.className = 'skr-more'; p.setAttribute('data-skr', '1');
        p.innerHTML = 'Not what you’re looking for? <a href="request.html?q=' + encodeURIComponent(q) + '">Request a product</a>';
        list.after(p);
      }
    };
    new MutationObserver(function () { paint(); }).observe(wrap, { childList: true, subtree: true });
  }

  /* ---------- store: the request page ---------- */
  function initPage() {
    var page = $('[data-skr-page]'); if (!page) return;
    var flow = $('[data-skr-flow]', page), f = function (n) { return $('[name="' + n + '"]', flow); };
    var qs = new URLSearchParams(location.search);
    if (qs.get('q')) f('product').value = qs.get('q');
    if (qs.get('brand')) f('brand').value = qs.get('brand');
    var u = S.get('user', null);
    if (u) { if (u.name && !f('name').value) f('name').value = u.name; if (u.email && !f('email').value) f('email').value = u.email; }

    var sum = function () {
      var it = [f('brand').value.trim(), f('product').value.trim()].filter(Boolean).join(' ');
      $('[data-skr-s-item]', page).textContent = it ? it + (f('size').value.trim() ? ', ' + f('size').value.trim() : '') : 'Tell us what you want';
      $('[data-skr-s-qty]', page).textContent = f('qty').value;
      var have = inStock(f('brand').value, f('product').value), hb = $('[data-skr-have]', page);
      if (have) { hb.hidden = false; hb.innerHTML = 'Good news: we already have <a href="p__' + esc(have.slug) + '.html">' + esc(have.brand + ' ' + have.name) + '</a>. You can order it today.'; }
      else hb.hidden = true;
    };
    flow.addEventListener('input', sum); flow.addEventListener('change', sum); sum();

    $('[data-skr-send]', page).addEventListener('click', function () {
      var err = $('[data-skr-err]', page), bad = [];
      $$('.skp-field', flow).forEach(function (l) { l.classList.remove('bad'); });
      var v = function (n) { return f(n).value.trim(); };
      if (!v('product')) bad.push(['product', 'Tell us the product name.']);
      if (!v('name')) bad.push(['name', 'Add your name.']);
      if (!okPhone(v('phone'))) bad.push(['phone', 'Add a Sri Lankan mobile number, for example 077 123 4567.']);
      if (!okEmail(v('email'))) bad.push(['email', 'Check your email address.']);
      if (v('link') && !/^https?:\/\/\S+\.\S+/.test(v('link'))) bad.push(['link', 'The link should start with https://']);
      if (bad.length) {
        bad.forEach(function (b) { f(b[0]).closest('.skp-field').classList.add('bad'); });
        err.textContent = bad[0][1]; f(bad[0][0]).focus(); return;
      }
      err.textContent = '';
      var r = {
        id: 'RQ-' + String(Math.floor(100000 + Math.random() * 900000)), at: new Date().toISOString(), status: 'new',
        brand: v('brand'), product: v('product'), size: v('size'), link: v('link'), qty: +v('qty') || 1,
        name: v('name'), phone: waNum(v('phone')), email: v('email'), notes: v('notes'), from: qs.get('q') ? 'search' : 'page'
      };
      var all = mine(); all.push(r); S.set('requests', all);
      var msg = 'Hi Skinora, I sent a product request (' + r.id + '): ' + r.qty + ' x ' + itemName(r) + (r.link ? '\n' + r.link : '') + (r.notes ? '\n' + r.notes : '');
      $('[data-skr-book]', page).hidden = true;
      var done = $('[data-skr-done]', page); done.hidden = false;
      $('[data-skr-d-id]', done).textContent = r.id;
      $('[data-skr-d-item]', done).textContent = r.qty + ' × ' + itemName(r);
      $('[data-skr-d-phone]', done).textContent = r.phone.replace(/^94/, '0').replace(/(\d{3})(\d{3})(\d{4})/, '$1 $2 $3');
      $('[data-skr-d-wa]', done).href = waLink(WA, msg);
      done.scrollIntoView({ behavior: 'smooth', block: 'center' });
      renderMine();
    });
    $('[data-skr-again]', page).addEventListener('click', function () {
      ['brand', 'product', 'size', 'link', 'notes'].forEach(function (n) { f(n).value = ''; }); f('qty').value = '1';
      $('[data-skr-done]', page).hidden = true; $('[data-skr-book]', page).hidden = false; sum(); f('brand').focus();
    });

    function renderMine() {
      var box = $('[data-skr-mine]', page), list = mine().map(withEdits).reverse();
      box.hidden = !list.length; if (!list.length) return;
      $('[data-skr-mine-list]', box).innerHTML = list.map(function (r) {
        var st = STATUS[r.status] || STATUS.new;
        var label = r.status === 'quoted' && r.quote ? 'Quote sent: ' + fmt(r.quote.price * r.qty) + (r.quote.eta ? ', arrives in ' + r.quote.eta : '') + '. Check WhatsApp' : st[1];
        return '<li><div><b>' + esc(itemName(r)) + '</b><small>' + esc(r.id) + ' · ' + r.qty + ' × · sent ' + dateStr(r.at) + '</small></div>' +
          '<span class="skr-st skr-st-' + r.status + '">' + esc(label) + '</span>' +
          (r.status === 'quoted' && r.quote && r.quote.link ? '<a class="skr-pay" href="' + esc(r.quote.link) + '" target="_blank" rel="noopener">Pay now</a>' : '') + '</li>';
      }).join('');
    }
    renderMine();
  }

  /* ---------- admin: sample requests so the list is not empty in the preview ---------- */
  var H = 36e5;
  var SEED = [
    ['Sol de Janeiro', 'Brazilian Bum Bum Cream', '240 ml', 1, 'Nethmi Perera', '94771882044', 5, 'new', 'For my sister’s birthday on the 20th'],
    ['Sol de Janeiro', 'Brazilian Bum Bum Cream', '75 ml', 2, 'Ishara Fernando', '94712345118', 30, 'new', ''],
    ['Sol de Janeiro', 'Brazilian Bum Bum Cream', '240 ml', 1, 'Kavindi Silva', '94763320971', 52, 'quoted', '', 16500, '2–3 weeks'],
    ['Sol de Janeiro', 'Brazilian Bum Bum Cream', '', 1, 'Rashmi Jayawardena', '94775519003', 120, 'ordered', '', 16500, '2–3 weeks'],
    ['Anua', 'Heartleaf 77% Soothing Toner', '250 ml', 1, 'Dilini Rathnayake', '94704418226', 3, 'new', 'Is it the original Korean one?'],
    ['Anua', 'Heartleaf 77% Soothing Toner', '', 2, 'Sachini Wickramasinghe', '94719900532', 40, 'new', ''],
    ['Anua', 'Heartleaf 77% Soothing Toner', '250 ml', 1, 'Hiruni Gunawardena', '94778812640', 98, 'quoted', '', 7900, '2–3 weeks'],
    ['Rhode', 'Peptide Lip Treatment', 'Salted Caramel', 1, 'Tharushi Mendis', '94765501237', 8, 'new', ''],
    ['Rhode', 'Peptide Lip Treatment', 'Raspberry Jelly', 2, 'Amaya Rodrigo', '94771100459', 70, 'quoted', 'Two different flavours if possible', 8900, '3–4 weeks'],
    ['Rhode', 'Peptide Lip Treatment', '', 1, 'Minoli Senanayake', '94705523981', 150, 'arrived', '', 8900, '3–4 weeks'],
    ['Byredo', 'Gypsy Water Eau de Parfum', '100 ml', 1, 'Ravindu Jayasuriya', '94772209915', 20, 'new', 'Gift for my wife'],
    ['Byredo', 'Gypsy Water Eau de Parfum', '50 ml', 1, 'Malsha Rodrigo', '94716602210', 200, 'ordered', '', 68500, '2–3 weeks'],
    ['Medicube', 'Age-R Booster Pro', '', 1, 'Hasini Ismail', '94768830044', 60, 'new', 'The device, pink colour'],
    ['Drunk Elephant', 'Protini Polypeptide Cream', '50 ml', 1, 'Dinithi Abeysekera', '94773340128', 110, 'unavailable', 'No authorised supplier ships to Sri Lanka right now'],
    ['Kayali', 'Vanilla 28 Eau de Parfum', '50 ml', 1, 'Shenaya Peiris', '94711127730', 14, 'new', ''],
    ['Paula’s Choice', '2% BHA Liquid Exfoliant', '118 ml', 1, 'Nuwan Wijesinghe', '94779931456', 75, 'closed', '', 12900, '2–3 weeks']
  ].map(function (a, i) {
    var r = { id: 'RQ-' + (480210 + i * 37), at: new Date(Date.now() - a[6] * H).toISOString(), brand: a[0], product: a[1], size: a[2], qty: a[3], name: a[4], phone: a[5], email: '', link: '', notes: a[8], status: a[7], sample: true };
    if (a[9]) r.quote = { price: a[9], eta: a[10], deposit: a[9] * a[3] >= DEPOSIT_FROM, link: '' };
    return r;
  });
  var SEED_MISSED = [['sol de janeiro', 9], ['anua toner', 6], ['rhode', 5], ['byredo', 4], ['skin1004 centella', 3], ['vanilla 28', 3], ['tirtir cushion', 2]];

  function allReqs() { return SEED.concat(mine()).map(withEdits).sort(function (a, b) { return new Date(b.at) - new Date(a.at); }); }
  function saveEdit(id, patch) { var e = edits(); e[id] = e[id] || {}; for (var k in patch) e[id][k] = patch[k]; S.set('req-admin', e); }
  var groupKey = function (r) {
    var b = words(r.brand).join(' '), p = words(r.product).filter(function (w) { return !/^\d+(ml|g)?$/.test(w); }).slice(0, 3).join(' ');
    return b + '|' + p;
  };

  /* ---------- admin: nav item on every admin page ---------- */
  var ICON = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" class="lucide"><path d="M21 8 12 3 3 8v8l9 5 9-5z"/><path d="m3 8 9 5 9-5"/><path d="M12 13v8"/><path d="M16.5 5.5 7.5 10.5"/></svg>';
  function adminNav() {
    var newCount = allReqs().filter(function (r) { return r.status === 'new'; }).length;
    $$('a[href="admin__customers.html"]').forEach(function (a) {
      var li = a.closest('li'); if (!li || !li.parentElement || $('a[href="admin__requests.html"]', li.parentElement)) return;
      var plain = $$('a', li.parentElement).filter(function (x) { return !x.hasAttribute('aria-current'); })[0] || a;
      var n = document.createElement('li');
      n.innerHTML = '<a class="' + plain.className + '" href="admin__requests.html">' + ICON + ' Requests' + (newCount ? '<span class="skr-navc">' + newCount + '</span>' : '') + '</a>';
      li.after(n);
      if (PATH === '/admin/requests') {
        var cur = $('a[aria-current]', li.parentElement);
        if (cur) {
          var activeCls = cur.className, mark = $('span.absolute', cur), svg = $('svg', cur);
          cur.removeAttribute('aria-current'); cur.className = plain.className;
          if (mark) mark.remove();
          if (svg) svg.setAttribute('class', svg.getAttribute('class').replace(/\s*text-\[var\(--adm-gold\)\]/, ''));
          var mine = $('a', n); mine.className = activeCls; mine.setAttribute('aria-current', 'page');
          if (mark) mine.prepend(mark);
          $('svg', mine).setAttribute('class', 'lucide text-[var(--adm-gold)]');
        }
      }
    });
  }

  /* ---------- admin: the requests page ---------- */
  function initAdmin() {
    var root = $('[data-skr-admin]'); if (!root) return;
    var filter = 'open';
    var FILTERS = [['open', 'Open'], ['new', 'New'], ['quoted', 'Quoted'], ['ordered', 'Ordered'], ['arrived', 'Arrived'], ['done', 'Closed'], ['all', 'All']];
    var match = function (r) {
      if (filter === 'all') return true;
      if (filter === 'open') return ['new', 'quoted', 'ordered', 'arrived'].indexOf(r.status) >= 0;
      if (filter === 'done') return r.status === 'closed' || r.status === 'unavailable';
      return r.status === filter;
    };
    var late = function (r) { return r.status === 'new' && Date.now() - new Date(r.at).getTime() > REPLY_HOURS * H; };
    var BADGE = { new: 'skr-b-new', quoted: 'skr-b-quoted', ordered: 'skr-b-ordered', arrived: 'skr-b-arrived', unavailable: 'skr-b-off', closed: 'skr-b-off' };

    function render() {
      var list = allReqs(), cnt = function (s) { return list.filter(function (r) { return r.status === s; }).length; };
      var lateN = list.filter(late).length, soon = list.filter(function (r) { return r.status === 'new' && !late(r) && Date.now() - new Date(r.at).getTime() > 24 * H; }).length;
      // most requested
      var groups = {};
      list.forEach(function (r) { var k = groupKey(r); (groups[k] = groups[k] || { name: r.brand + ' ' + r.product, items: [] }).items.push(r); });
      var top = Object.keys(groups).map(function (k) { return groups[k]; }).sort(function (a, b) { return b.items.length - a.items.length; }).slice(0, 6);
      // searches with no results
      var miss = {}; SEED_MISSED.forEach(function (m) { miss[m[0]] = m[1]; });
      S.get('req-missed', []).forEach(function (m) { miss[m.q] = (miss[m.q] || 0) + 1; });
      var missTop = Object.keys(miss).sort(function (a, b) { return miss[b] - miss[a]; }).slice(0, 7);
      var rows = list.filter(match);

      root.innerHTML =
        '<div class="mb-7 flex flex-wrap items-end justify-between gap-4"><div><h1 class="text-[26px] font-medium tracking-[-0.01em] text-[var(--adm-t1)]">Product requests</h1>' +
        '<p class="mt-1 text-[13px] text-[var(--adm-t3)]">Items customers asked for that we don’t stock yet. Reply to each one within ' + REPLY_HOURS + ' hours with a quote.</p></div></div>' +
        '<div class="skr-stats">' +
        stat('New, to reply', cnt('new'), lateN ? '<span class="skr-late">' + lateN + ' past ' + REPLY_HOURS + ' hours</span>' : soon ? soon + ' due today' : 'All on time') +
        stat('Quoted', cnt('quoted'), 'Waiting for the customer to pay') +
        stat('Ordered', cnt('ordered'), 'Paid, on the way from the supplier') +
        stat('Arrived', cnt('arrived'), 'Tell the customer and deliver') + '</div>' +
        '<div class="skr-grid"><section class="card skr-card"><div class="skr-tabs">' + FILTERS.map(function (x) {
          var n = list.filter(function (r) { var f0 = filter; filter = x[0]; var m = match(r); filter = f0; return m; }).length;
          return '<button type="button" data-skr-f="' + x[0] + '" class="' + (filter === x[0] ? 'on' : '') + '">' + x[1] + ' <span>' + n + '</span></button>';
        }).join('') + '</div><div class="overflow-x-auto"><table class="table-lux"><thead><tr><th>Request</th><th>Customer</th><th>Item</th><th class="text-right">Qty</th><th>Status</th><th></th></tr></thead><tbody>' +
        (rows.length ? rows.map(function (r) {
          return '<tr data-skr-open="' + r.id + '" class="skr-row"><td class="whitespace-nowrap"><span class="block font-mono text-xs">' + esc(r.id) + '</span><span class="text-xs text-[var(--adm-t4)]">' + ago(r.at) + '</span></td>' +
            '<td><span class="block">' + esc(r.name) + '</span><span class="text-xs text-[var(--adm-t4)]">' + esc(r.phone.replace(/^94/, '0')) + '</span></td>' +
            '<td><span class="block">' + esc(r.brand) + ' ' + esc(r.product) + '</span><span class="text-xs text-[var(--adm-t4)]">' + esc(r.size || 'Any size') + (r.link ? ' · link' : '') + '</span></td>' +
            '<td class="text-right tabular-nums">' + r.qty + '</td><td><span class="badge ' + BADGE[r.status] + '">' + STATUS[r.status][0] + '</span>' + (late(r) ? ' <span class="skr-late">late</span>' : '') + '</td>' +
            '<td class="text-right"><button type="button" class="skr-link">' + (r.status === 'new' ? 'Send quote' : 'Open') + '</button></td></tr>';
        }).join('') : '<tr><td colspan="6" class="skr-empty">Nothing here.</td></tr>') + '</tbody></table></div></section>' +
        '<div class="skr-side"><section class="card skr-card skr-pad"><h2 class="skr-h2">Most requested</h2><p class="skr-sub">Asked for 3 or more times? It may be worth stocking.</p><ol class="skr-top">' +
        top.map(function (g, i) {
          var n = g.items.length, qty = g.items.reduce(function (s, r) { return s + r.qty; }, 0);
          return '<li><span class="skr-rank">' + (i + 1) + '</span><div><b>' + esc(g.name) + '</b><small>' + n + (n === 1 ? ' request' : ' requests') + ' · ' + qty + (qty === 1 ? ' unit' : ' units') + ' · last ' + ago(g.items[0].at) + '</small><span class="skr-top-acts">' +
            (n >= 3 ? '<span class="badge skr-b-arrived">Worth stocking</span>' : '') + '<button type="button" class="skr-link" data-skr-copy="' + i + '" title="Copy everyone’s number and a message for when it arrives">Copy contacts</button></span></div></li>';
        }).join('') + '</ol></section>' +
        '<section class="card skr-card skr-pad"><h2 class="skr-h2">Searches with no results</h2><p class="skr-sub">What people typed in the shop search and found nothing.</p><ul class="skr-miss-list">' +
        missTop.map(function (q) { return '<li><span>“' + esc(q) + '”</span><b>' + miss[q] + '×</b></li>'; }).join('') + '</ul></section>' +
        '<section class="card skr-card skr-pad skr-how"><h2 class="skr-h2">How it works</h2><ol><li><b>Reply in ' + REPLY_HOURS + ' hours.</b> Check the price with an authorised supplier and send a quote with a payment link.</li>' +
        '<li><b>Deposit on big orders.</b> ' + DEPOSIT_PCT + '% upfront when the quote is ' + fmt(DEPOSIT_FROM) + ' or more, the rest on delivery.</li>' +
        '<li><b>Genuine only.</b> If no trusted supplier has it, mark it “Can’t source” and tell the customer.</li>' +
        '<li><b>Close the loop.</b> When an item arrives, message the customer. When you stock a popular one, tell everyone who asked.</li></ol></section></div></div>';

      $$('[data-skr-f]', root).forEach(function (b) { b.addEventListener('click', function () { filter = b.getAttribute('data-skr-f'); render(); }); });
      $$('[data-skr-open]', root).forEach(function (tr) { tr.addEventListener('click', function () { open(tr.getAttribute('data-skr-open')); }); });
      $$('[data-skr-copy]', root).forEach(function (b) {
        b.addEventListener('click', function () {
          var g = top[+b.getAttribute('data-skr-copy')];
          var nums = g.items.map(function (r) { return r.name + ': +' + r.phone; }).join('\n');
          var text = 'Good news from Skinora: ' + g.name + ' is now in stock. Order it here: https://skinora.lk\n\n' + nums;
          copy(text, 'Copied ' + g.items.length + ' contacts and a message');
        });
      });
    }
    function stat(label, n, sub) { return '<div class="card skr-stat"><p class="skr-stat-l">' + label + '</p><p class="skr-stat-n">' + n + '</p><p class="skr-stat-s">' + sub + '</p></div>'; }
    function copy(text, ok) {
      var done = function () { toast(ok, 1); };
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(done, function () { fallback(); });
      else fallback();
      function fallback() { var t = document.createElement('textarea'); t.value = text; document.body.appendChild(t); t.select(); try { document.execCommand('copy'); done(); } catch (e) {} t.remove(); }
    }

    // Detail and quote panel
    function open(id) {
      var r = allReqs().filter(function (x) { return x.id === id; })[0]; if (!r) return;
      var q = r.quote || { price: '', eta: '2–3 weeks', deposit: false, link: '' };
      var m = document.createElement('div'); m.className = 'skr-modal'; m.setAttribute('role', 'dialog'); m.setAttribute('aria-label', 'Request ' + r.id);
      m.innerHTML = '<div class="skr-scrim" data-skr-x></div><div class="skr-panel">' +
        '<div class="skr-ph"><div><p class="skr-sub font-mono">' + esc(r.id) + ' · ' + dateStr(r.at) + ' · ' + ago(r.at) + '</p><h2>' + esc(itemName(r)) + '</h2></div><button type="button" class="skr-close" data-skr-x aria-label="Close">×</button></div>' +
        '<dl class="skr-dl"><div><dt>Customer</dt><dd>' + esc(r.name) + '</dd></div><div><dt>WhatsApp</dt><dd><a href="https://wa.me/' + esc(r.phone) + '" target="_blank" rel="noopener">+' + esc(r.phone) + '</a></dd></div>' +
        (r.email ? '<div><dt>Email</dt><dd><a href="mailto:' + esc(r.email) + '">' + esc(r.email) + '</a></dd></div>' : '') +
        '<div><dt>Quantity</dt><dd>' + r.qty + '</dd></div>' +
        (r.link ? '<div class="full"><dt>Link they sent</dt><dd><a href="' + esc(r.link) + '" target="_blank" rel="noopener noreferrer">' + esc(r.link) + '</a></dd></div>' : '') +
        (r.notes ? '<div class="full"><dt>Their note</dt><dd>' + esc(r.notes) + '</dd></div>' : '') + '</dl>' +
        '<h3 class="skr-h3">Quote</h3><div class="skr-form">' +
        '<label><span>Price for one (LKR)</span><input class="a-input" name="price" type="number" min="0" step="100" inputmode="numeric" value="' + esc(q.price) + '"></label>' +
        '<label><span>Arrives in</span><select class="a-input" name="eta">' + ETAS.map(function (e) { return '<option' + (e === q.eta ? ' selected' : '') + '>' + e + '</option>'; }).join('') + '</select></label>' +
        '<label class="full"><span>Payment link (PayHere, Koko or bank transfer details)</span><input class="a-input" name="link" placeholder="https://payhere.lk/pay/…" value="' + esc(q.link) + '"></label>' +
        '<label class="skr-chk full"><input type="checkbox" name="deposit"' + (q.deposit ? ' checked' : '') + '> <span data-skr-dep>Ask for a ' + DEPOSIT_PCT + '% deposit</span></label>' +
        '</div><p class="skr-total" data-skr-total></p>' +
        '<div class="skr-msg"><p class="skr-sub">Message to the customer</p><textarea class="a-input" name="msg" rows="7"></textarea></div>' +
        '<div class="skr-acts"><a class="skr-btn gold" data-skr-sendq target="_blank" rel="noopener">Send quote on WhatsApp</a><button type="button" class="skr-btn" data-skr-copyq>Copy message</button></div>' +
        '<h3 class="skr-h3">Status</h3><div class="skr-acts"><select class="a-input" name="status" style="max-width:220px">' + ORDER.map(function (s) { return '<option value="' + s + '"' + (s === r.status ? ' selected' : '') + '>' + STATUS[s][0] + '</option>'; }).join('') + '</select>' +
        '<button type="button" class="skr-btn" data-skr-save>Save status</button>' +
        (r.status === 'ordered' || r.status === 'arrived' ? '<a class="skr-btn" target="_blank" rel="noopener" href="' + waLink(r.phone, 'Hi ' + r.name.split(' ')[0] + ', your ' + itemName(r) + ' has arrived at Skinora. We will deliver it in 1–2 days. Thank you for waiting!') + '">Tell them it arrived</a>' : '') +
        '</div></div>';
      document.body.appendChild(m); document.body.style.overflow = 'hidden';
      var g = function (n) { return $('[name="' + n + '"]', m); }, edited = false;
      var build = function () {
        var price = +g('price').value || 0, total = price * r.qty, dep = g('deposit').checked ? Math.round(total * DEPOSIT_PCT / 100 / 10) * 10 : 0;
        $('[data-skr-total]', m).innerHTML = price ? 'Total <b>' + fmt(total) + '</b>' + (dep ? ' · deposit now <b>' + fmt(dep) + '</b>, ' + fmt(total - dep) + ' on delivery' : ' · paid in full before we order') : 'Add the price to build the quote.';
        if (!edited) {
          g('msg').value = 'Hi ' + r.name.split(' ')[0] + ', thank you for your request at Skinora (' + r.id + ').\n\n' +
            r.qty + ' × ' + itemName(r) + (price ? ': ' + fmt(total) + (r.qty > 1 ? ' (' + fmt(price) + ' each)' : '') : '') + '\n' +
            'Arrives in ' + g('eta').value + ', from an authorised supplier. 100% genuine.\n' +
            (dep ? 'To order, please pay a ' + DEPOSIT_PCT + '% deposit of ' + fmt(dep) + ' now and ' + fmt(total - dep) + ' on delivery.' : 'To order, please pay ' + (price ? fmt(total) : 'the total') + ' before we place the order.') +
            (g('link').value.trim() ? '\nPay here: ' + g('link').value.trim() + '\n' : '\nReply YES and we will send you the payment link.\n') + '\nThis price is held for 3 days. Reply here with any questions.';
        }
        $('[data-skr-sendq]', m).href = waLink(r.phone, g('msg').value);
      };
      var autoDep = function () { var t = (+g('price').value || 0) * r.qty; g('deposit').checked = t >= DEPOSIT_FROM; };
      g('price').addEventListener('input', function () { autoDep(); build(); });
      ['eta', 'link', 'deposit'].forEach(function (n) { g(n).addEventListener('input', build); g(n).addEventListener('change', build); });
      g('msg').addEventListener('input', function () { edited = true; $('[data-skr-sendq]', m).href = waLink(r.phone, g('msg').value); });
      build();
      var quote = function () { return { price: +g('price').value || 0, eta: g('eta').value, deposit: g('deposit').checked, link: g('link').value.trim() }; };
      $('[data-skr-sendq]', m).addEventListener('click', function (e) {
        if (!(+g('price').value)) { e.preventDefault(); g('price').focus(); toast('Add the price first'); return; }
        saveEdit(r.id, { quote: quote(), status: r.status === 'new' ? 'quoted' : r.status, quotedAt: new Date().toISOString() });
        toast('Quote saved. Request marked as Quoted.', 1); close(); render(); adminNavCount();
      });
      $('[data-skr-copyq]', m).addEventListener('click', function () { copy(g('msg').value, 'Message copied'); });
      $('[data-skr-save]', m).addEventListener('click', function () {
        var p = { status: g('status').value }; if (+g('price').value) p.quote = quote();
        saveEdit(r.id, p); toast('Marked as ' + STATUS[p.status][0], 1); close(); render(); adminNavCount();
      });
      $$('[data-skr-x]', m).forEach(function (x) { x.addEventListener('click', close); });
      var onKey = function (e) { if (e.key === 'Escape') close(); };
      document.addEventListener('keydown', onKey);
      function close() { m.remove(); document.body.style.overflow = ''; document.removeEventListener('keydown', onKey); }
      setTimeout(function () { (+g('price').value ? g('msg') : g('price')).focus(); }, 30);
    }
    render();
    var hash = location.hash.slice(1); if (hash) open(hash);
  }
  function adminNavCount() {
    var n = allReqs().filter(function (r) { return r.status === 'new'; }).length;
    $$('a[href="admin__requests.html"]').forEach(function (a) {
      var c = $('.skr-navc', a);
      if (!n) { if (c) c.remove(); return; }
      if (!c) { c = document.createElement('span'); c.className = 'skr-navc'; a.appendChild(c); }
      c.textContent = n;
    });
  }

  function start() {
    if (IS_ADMIN) { adminNav(); if (PATH === '/admin/requests') initAdmin(); return; }
    footerLink(); searchHook();
    if (PATH === '/request') initPage();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();
