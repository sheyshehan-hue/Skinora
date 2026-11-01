/* Skinora ingredient clash engine. No DOM: it reads ingredient text and returns clashes, good pairs
   and a morning and night plan. Used by clash-ui.js in the browser and by test.mjs in Node.
   General guidance only, written in simple English for customers. */
(function (root) {
  'use strict';

  /* Active ingredients we look for. "re" matches INCI lists, shop pages and product names. */
  var ACTIVES = {
    retinoid: { name: 'Retinol', long: 'Retinol (vitamin A)', re: /\bretin(?:ol|al|aldehyde|yl\s+\w+|oate|oic acid)\b|\btretinoin\b|\badapalene\b|\btazarotene\b|\bvitamin a\b|\bgranactive\b|hydroxypinacolone/i },
    aha: { name: 'AHA acid', long: 'AHA acid (glycolic, lactic, mandelic)', re: /\b(?:glycolic|lactic|mandelic|malic|tartaric)\s+acid\b|\baha\b|\bahas\b/i },
    bha: { name: 'BHA acid', long: 'BHA acid (salicylic)', re: /\bsalicylic\s+acid\b|\bbetaine\s+salicylate\b|\bbha\b|\bcapryloyl salicylic\b|\blha\b/i },
    pha: { name: 'PHA acid', long: 'PHA acid (gluconolactone)', re: /\bgluconolactone\b|\blactobionic\s+acid\b|\bpha\b/i },
    vitc: { name: 'Vitamin C', long: 'Vitamin C', re: /\bvit(?:amin|\.)?\s*c\b|\bascorb(?:ic|yl)\b|\bascorbate\b/i },
    bpo: { name: 'Benzoyl peroxide', long: 'Benzoyl peroxide', re: /\bbenzoyl\s+peroxide\b|\bbpo\b/i },
    azelaic: { name: 'Azelaic acid', long: 'Azelaic acid', re: /\bazelaic\s+acid\b/i },
    niacinamide: { name: 'Niacinamide', long: 'Niacinamide (vitamin B3)', re: /\bniacinamide\b|\bnicotinamide\b|\bvitamin\s+b3\b/i },
    copper: { name: 'Copper peptides', long: 'Copper peptides', re: /\bcopper\s+(?:tri)?peptide|\bghk-?cu\b/i },
    hydroquinone: { name: 'Hydroquinone', long: 'Hydroquinone', re: /\bhydroquinone\b/i },
    spf: { name: 'Sunscreen', long: 'Sunscreen (SPF)', re: /\bspf\s*\d*|\bsunscreen\b|\bsun\s*(?:block|cream|screen|fluid|milk|stick)\b|\bzinc oxide\b|\btitanium dioxide\b|\bavobenzone\b|\boctocrylene\b|\bhomosalate\b|\bmexoryl\b|\btinosorb\b|\buvinul\b|\bethylhexyl methoxycinnamate\b|\bbis-ethylhexyloxyphenol\b/i },
    soother: { name: 'Calming', long: 'Calming and repair (ceramides, panthenol, centella)', re: /\bceramide|\bpanthenol\b|\bcentella\b|\bcica\b|\bmadecassoside\b|\ballantoin\b|\bsqualane\b|\bsnail\b|\bbeta-?glucan\b/i },
    hydrator: { name: 'Hydrating', long: 'Hydrating (hyaluronic acid, glycerin)', re: /\bhyaluron|\bsodium hyaluronate\b|\bglycerin\b|\bpolyglutamic\b/i },
    fragrance: { name: 'Fragrance', long: 'Added fragrance or essential oils', re: /\bparfum\b|\bfragrance\b(?!\s*-?free)|\blinalool\b|\blimonene\b|\bcitronellol\b|\bgeraniol\b|\beugenol\b|\bessential oil\b|\b(?:lavender|peppermint|eucalyptus|tea tree|bergamot)\s+(?:leaf\s+|flower\s+)?oil\b/i }
  };
  var ACIDS = ['aha', 'bha', 'pha'];
  var STRONG = ['retinoid', 'aha', 'bha', 'pha', 'vitc', 'bpo', 'azelaic', 'copper', 'hydroquinone'];

  /* Product type from a shop category or the product name */
  var TYPES = [
    ['sunscreen', /\bspf|sunscreen|sun\s*(?:block|cream|screen|fluid|milk|stick)|uv\s*(?:shield|defen)/i],
    ['cleansers', /cleans|face\s*wash|\bwash\b|foam|micellar|cleansing/i],
    ['toners-essences', /toner|essence|tonic|\bmist\b/i],
    ['masks-treatments', /\bmask\b|\bpeel\b|\bpads?\b|spot|treatment|exfolia/i],
    ['serums', /serum|ampoule|drops|booster|concentrate|suspension|solution|\boil\b|retinol|niacinamide/i],
    ['moisturisers', /cream|moistur|lotion|hydrator|balm|gel\b|emulsion|sleeping/i]
  ];
  var ORDER = { cleansers: 1, 'toners-essences': 2, 'masks-treatments': 3, serums: 4, moisturisers: 5, sunscreen: 6 };
  var STEP = { cleansers: 'Cleanse', 'toners-essences': 'Tone', serums: 'Serum', 'masks-treatments': 'Treatment', moisturisers: 'Moisturise', sunscreen: 'Sunscreen' };

  function detect(text) {
    var t = ' ' + String(text || '').replace(/[‐-―]/g, '-') + ' ', out = [];
    Object.keys(ACTIVES).forEach(function (k) { if (ACTIVES[k].re.test(t)) out.push(k); });
    // "fragrance-free" products: don't flag
    if (/fragrance[\s-]*free|no fragrance|unscented/i.test(t)) out = out.filter(function (k) { return k !== 'fragrance'; });
    // citric acid and "vitamin c" on a lip balm both stay; plain "acid" words don't trigger anything else
    return out;
  }
  function typeOf(name, cat) {
    if (cat && ORDER[cat]) return cat;
    var n = String(name || '');
    for (var i = 0; i < TYPES.length; i++) if (TYPES[i][1].test(n)) return TYPES[i][0];
    return 'serums';
  }
  function isWashOff(item) { return item.type === 'cleansers'; }

  /* An item is { id, name, brand, type, actives: [...] } */
  function make(o) {
    var actives = o.actives || detect([o.name, o.ingredients].join(' '));
    var type = typeOf(o.name, o.cat);
    if (type === 'sunscreen' && actives.indexOf('spf') < 0) actives = actives.concat('spf');
    return { id: o.id, name: o.name, brand: o.brand || '', type: type, actives: actives, src: o.src || 'other', slug: o.slug || null, image: o.image || null };
  }

  var has = function (it, k) { return it.actives.indexOf(k) >= 0; };
  var hasAny = function (it, ks) { return ks.some(function (k) { return has(it, k); }); };
  var label = function (it) { return (it.brand ? it.brand + ' ' : '') + it.name; };
  var acidName = function (it) { var a = ACIDS.filter(function (k) { return has(it, k); }); return a.map(function (k) { return ACTIVES[k].name; }).join(' and ') || 'acid'; };

  /* Pair rules. level: 'stop' = don't use at the same time, 'care' = use carefully, 'ok' = good pair */
  var PAIRS = [
    { a: ['retinoid'], b: ACIDS, level: 'stop', title: 'Retinol and {B}',
      why: 'Both make skin renew faster. Used together they often cause redness, stinging and peeling.',
      fix: 'Use them on different nights: retinol one night, the acid the next.',
      washFix: 'A quick wash with an acid cleanser before retinol is usually fine. Stop if your skin stings.' },
    { a: ['retinoid'], b: ['bpo'], level: 'stop', title: 'Retinol and benzoyl peroxide',
      why: 'Benzoyl peroxide can break down retinol so it works less, and both dry the skin.',
      fix: 'Benzoyl peroxide in the morning, retinol at night.' },
    { a: ['retinoid'], b: ['vitc'], level: 'care', title: 'Retinol and vitamin C',
      why: 'Both are strong. At the same time they can irritate, and each works best at a different time of day.',
      fix: 'Vitamin C in the morning, retinol at night.' },
    { a: ['vitc'], b: ACIDS, level: 'care', title: 'Vitamin C and {B}',
      why: 'Both are acidic. Layered together they can sting and make your skin red.',
      fix: 'Vitamin C in the morning, the acid at night.' },
    { a: ['vitc'], b: ['bpo'], level: 'care', title: 'Vitamin C and benzoyl peroxide',
      why: 'Benzoyl peroxide can oxidise vitamin C, so the vitamin C stops working.',
      fix: 'Use them at different times of day.' },
    { a: ['bpo'], b: ACIDS, level: 'care', title: 'Benzoyl peroxide and {B}',
      why: 'Both fight pimples, but together they can dry and peel your skin.',
      fix: 'Use one in the morning and one at night, or on different days.' },
    { a: ['hydroquinone'], b: ['bpo'], level: 'stop', title: 'Hydroquinone and benzoyl peroxide',
      why: 'Together they can leave dark stains on the skin for a while.',
      fix: 'Use them at different times of day.' },
    { a: ['copper'], b: ['vitc'], level: 'care', title: 'Copper peptides and vitamin C',
      why: 'Vitamin C can break down copper peptides, so both work less.',
      fix: 'Vitamin C in the morning, copper peptides at night.' },
    { a: ['copper'], b: ['retinoid'].concat(ACIDS), level: 'care', title: 'Copper peptides and {B}',
      why: 'Strong exfoliants can weaken copper peptides and irritate skin.',
      fix: 'Use them on different nights.' },
    { a: ['azelaic'], b: ['retinoid'].concat(ACIDS), level: 'care', title: 'Azelaic acid and {B}',
      why: 'They work well together for many people, but can tingle at first.',
      fix: 'Start with one every other night, then build up.' },
    // good pairs
    { a: ['niacinamide'], b: ['vitc'], level: 'ok', title: 'Niacinamide and vitamin C',
      why: 'Fine together. The old rule that they cancel each other out is a myth with modern formulas.' },
    { a: ['retinoid'], b: ['niacinamide', 'soother', 'hydrator'], level: 'ok', title: 'Retinol and {B}',
      why: 'A good pair. It calms the dryness retinol can cause.' },
    { a: ACIDS, b: ['soother', 'hydrator'], level: 'ok', title: '{A} and {B}',
      why: 'A good pair. It puts moisture back after exfoliating.' },
    { a: ['vitc'], b: ['spf'], level: 'ok', title: 'Vitamin C and sunscreen',
      why: 'A great morning pair. Vitamin C adds extra protection from sun damage.' },
    { a: ['bpo', 'bha'], b: ['soother', 'hydrator'], level: 'ok', title: 'Pimple care and {B}',
      why: 'A good pair. It stops the drying feeling from pimple treatments.' }
  ];
  var nameOf = function (it, ks) {
    var hit = ks.filter(function (k) { return has(it, k); });
    if (hit.some(function (k) { return ACIDS.indexOf(k) >= 0; }) && hit.every(function (k) { return ACIDS.indexOf(k) >= 0; })) return acidName(it);
    var k = hit[0];
    return k === 'soother' ? 'calming ingredients' : k === 'hydrator' ? 'hyaluronic acid' : ACTIVES[k] ? ACTIVES[k].name.replace(/^(?!AHA|BHA|PHA)./, function (c) { return c.toLowerCase(); }) : '';
  };
  var cap = function (s) { return s.charAt(0).toUpperCase() + s.slice(1); };

  function check(items, opts) {
    opts = opts || {};
    var issues = [], good = [], seen = {};
    for (var i = 0; i < items.length; i++) for (var j = 0; j < items.length; j++) {
      if (i === j) continue;
      var x = items[i], y = items[j];
      PAIRS.forEach(function (r, ri) {
        if (!hasAny(x, r.a) || !hasAny(y, r.b)) return;
        // inside one product the maker has balanced it, so only flag across products
        var key = ri + ':' + [x.id, y.id].sort().join('|');
        if (seen[key]) return; seen[key] = 1;
        var title = cap(r.title.replace('{A}', nameOf(x, r.a)).replace('{B}', nameOf(y, r.b)));
        if (r.level === 'ok') { good.push({ level: 'ok', title: title, why: r.why, items: [x.id, y.id] }); return; }
        var level = r.level, fix = r.fix;
        if ((isWashOff(x) || isWashOff(y)) && level === 'stop') { level = 'care'; fix = r.washFix || 'A face wash only stays on for a minute, so the risk is lower. ' + r.fix; }
        else if ((isWashOff(x) || isWashOff(y)) && level === 'care') return; // a rinse-off cleanser with a mild clash is fine
        issues.push({ level: level, title: title, why: r.why, fix: fix, items: [x.id, y.id] });
      });
    }
    // Too many exfoliants or retinoids (two or more leave-on products)
    var leaveAcid = items.filter(function (it) { return !isWashOff(it) && hasAny(it, ACIDS); });
    if (leaveAcid.length >= 2) issues.push({ level: 'care', title: 'Too many exfoliating acids', items: leaveAcid.map(function (i) { return i.id; }),
      why: leaveAcid.length + ' of your products exfoliate. Using them all can thin and irritate your skin.', fix: 'Use one acid product a night, 2 or 3 nights a week.' });
    var ret = items.filter(function (it) { return has(it, 'retinoid'); });
    if (ret.length >= 2) issues.push({ level: 'care', title: 'Two retinol products', items: ret.map(function (i) { return i.id; }),
      why: 'More retinol is not better. Two at once often causes peeling.', fix: 'Pick one retinol product and use it 2 or 3 nights a week to start.' });
    // Routine-level tips
    var tips = [];
    var sunSens = items.filter(function (it) { return hasAny(it, ['retinoid', 'aha', 'bha', 'hydroquinone']); });
    if (sunSens.length && !items.some(function (it) { return has(it, 'spf'); }))
      tips.push({ level: 'tip', kind: 'spf', title: 'Add a sunscreen', items: sunSens.map(function (i) { return i.id; }),
        why: 'Retinol and acids make skin more sensitive to the sun, and Sri Lankan sun is strong.', fix: 'Wear SPF 30 or higher every morning, even on cloudy days.' });
    if (opts.pregnant) {
      var preg = items.filter(function (it) { return hasAny(it, ['retinoid', 'hydroquinone']) || (has(it, 'bha') && !isWashOff(it)); });
      if (preg.length) issues.unshift({ level: 'stop', kind: 'preg', title: 'Not advised in pregnancy', items: preg.map(function (i) { return i.id; }),
        why: 'Retinoids, hydroquinone and leave-on salicylic acid are usually avoided when pregnant or breastfeeding.', fix: 'Ask your doctor before using these. Azelaic acid and niacinamide are common safer swaps.' });
    }
    if (opts.sensitive) {
      var scented = items.filter(function (it) { return has(it, 'fragrance'); });
      if (scented.length) tips.push({ level: 'tip', title: 'Fragrance and sensitive skin', items: scented.map(function (i) { return i.id; }),
        why: 'Added fragrance is one of the most common reasons sensitive skin gets red or itchy.', fix: 'Patch test it on your jaw for a few days first.' });
      var strong = items.filter(function (it) { return hasAny(it, STRONG) && !isWashOff(it); });
      if (strong.length >= 3) tips.push({ level: 'tip', title: 'A lot of strong products', items: strong.map(function (i) { return i.id; }),
        why: 'Sensitive skin does best with one or two strong products at a time.', fix: 'Add new products one at a time, two weeks apart.' });
    }
    var rank = { stop: 0, care: 1, tip: 2 };
    issues.sort(function (a, b) { return rank[a.level] - rank[b.level]; });
    return { issues: issues, tips: tips, good: good.filter(function (g, i) { return good.map(function (x) { return x.title; }).indexOf(g.title) === i; }).slice(0, 4), plan: plan(items, issues), verdict: issues.some(function (i) { return i.level === 'stop'; }) ? 'stop' : issues.length ? 'care' : 'ok' };
  }

  /* Morning and night plan that keeps clashing products apart */
  function plan(items, issues) {
    var am = [], pm = [], pm2 = [], notes = {};
    var hasRet = items.some(function (it) { return has(it, 'retinoid'); });
    var acidNight = items.some(function (it) { return !isWashOff(it) && hasAny(it, ACIDS) && !has(it, 'retinoid'); }) && hasRet;
    var leaveAcids = items.some(function (it) { return !isWashOff(it) && hasAny(it, ACIDS) && !has(it, 'bpo'); });
    var bpoNightClash = items.some(function (it) { return hasAny(it, ['retinoid', 'hydroquinone']) && !has(it, 'bpo'); }) || leaveAcids;
    var hasC = items.some(function (it) { return has(it, 'vitc') && !has(it, 'bpo'); });
    var clashC = items.some(function (it) { return has(it, 'vitc'); }) && items.some(function (it) { return hasAny(it, ['retinoid', 'copper'].concat(ACIDS)) && !has(it, 'vitc'); });
    var copper2 = items.some(function (it) { return has(it, 'copper'); }) && hasRet;
    items.forEach(function (it) {
      var where;
      if (it.type === 'sunscreen' || has(it, 'spf')) where = 'am';
      else if (has(it, 'retinoid')) where = 'pm';
      else if (has(it, 'hydroquinone')) where = 'pm';
      else if (has(it, 'bpo')) where = bpoNightClash && hasC ? 'pm2' : bpoNightClash ? 'am' : hasC ? 'pm' : 'both';
      else if (has(it, 'vitc') && clashC) where = 'am';
      else if (has(it, 'copper')) where = copper2 ? 'pm2' : 'pm';
      else if (!isWashOff(it) && hasAny(it, ACIDS)) where = acidNight ? 'pm2' : 'pm';
      else if (it.type === 'masks-treatments' && /sleep|night|overnight|wrapping/i.test(it.name)) where = 'pm';
      else where = 'both';
      if (where === 'am' || where === 'both') am.push(it);
      if (where === 'pm' || where === 'both') pm.push(it);
      if (where === 'pm2') pm2.push(it);
    });
    var split = pm2.length > 0;
    if (split) {
      // everything that is not retinol-only goes on both kinds of night
      var shared = pm.filter(function (it) { return !hasAny(it, ['retinoid', 'hydroquinone']); });
      pm2 = shared.concat(pm2);
    }
    var sort = function (l) { return l.slice().sort(function (a, b) { return (ORDER[a.type] || 4) - (ORDER[b.type] || 4); }); };
    return { am: sort(am), pm: sort(pm), pm2: split ? sort(pm2) : [], split: split };
  }

  var API = { ACTIVES: ACTIVES, STEP: STEP, ORDER: ORDER, detect: detect, typeOf: typeOf, make: make, check: check, label: label };
  root.SKCLASH_ENGINE = API;
})(typeof window !== "undefined" ? window : globalThis);
