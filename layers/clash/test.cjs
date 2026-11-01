// Quick checks for the clash rules: node layers/clash/test.cjs
const fs = require('fs'), vm = require('vm'), ctx = {}; vm.runInNewContext(fs.readFileSync(__dirname + '/clash-engine.js', 'utf8'), ctx); const E = ctx.SKCLASH_ENGINE;
const assert = require('assert');
const mk = (id, name, ingredients, cat) => E.make({ id, name, ingredients, cat });
const ret = mk('r', 'Retinol 0.5% in Squalane', 'Squalane, Retinol', 'serums');
const gly = mk('g', 'Glycolic Acid 7% Exfoliating Toner', 'Aqua, Glycolic Acid, Aloe', 'toners-essences');
const vc = mk('c', 'Deep Vita C Capsule Cream', 'Ascorbic Acid, Niacinamide', 'moisturisers');
const sa = mk('s', 'SA Smoothing Cleanser', 'Salicylic Acid, Ceramides', 'cleansers');
const bpo = mk('b', 'Acne Foaming Cream Cleanser', 'Benzoyl Peroxide 4%');
const bpoGel = mk('bg', 'Spot gel', 'Benzoyl peroxide 2.5%');
const spf = mk('f', 'Relief Sun SPF50+', 'Rice extract');
const cer = mk('m', 'Moisturising Cream', 'Ceramides, Hyaluronic Acid, Glycerin', 'moisturisers');

assert.strictEqual(E.detect("Paula's Choice 2% BHA Liquid Exfoliant").join(), 'bha');
assert.ok(E.detect('Water, Sodium Ascorbyl Phosphate, Parfum').includes('vitc'));
assert.ok(!E.detect('Fragrance-free gentle cream').includes('fragrance'));
assert.strictEqual(E.typeOf('Glycolic Acid 7% Exfoliating Toner'), 'toners-essences');
assert.strictEqual(E.typeOf('Paula\'s Choice 2% BHA Liquid Exfoliant'), 'masks-treatments');

let r = E.check([ret, gly, cer]);
assert.strictEqual(r.verdict, 'stop');
assert.ok(r.issues[0].title.startsWith('Retinol and AHA'), r.issues[0].title);
assert.ok(r.plan.split, 'retinol and acid go on different nights');
assert.ok(r.plan.pm.includes(ret) && !r.plan.pm.includes(gly) && r.plan.pm2.includes(gly) && r.plan.pm2.includes(cer));
assert.ok(r.tips.some(t => t.kind === 'spf'), 'asks for sunscreen');
assert.ok(r.good.length > 0);

r = E.check([ret, sa, spf]); // acid cleanser before retinol is milder
assert.strictEqual(r.verdict, 'care');
assert.ok(!r.tips.some(t => t.kind === 'spf'));

r = E.check([ret, vc, spf, cer]);
assert.ok(r.plan.am.includes(vc) && !r.plan.pm.includes(vc) && r.plan.pm.includes(ret));
assert.ok(r.plan.am[r.plan.am.length - 1] === spf, 'sunscreen last');

r = E.check([ret, bpoGel, vc]);
assert.ok(r.plan.pm2.includes(bpoGel) && r.plan.am.includes(vc) && r.plan.pm.includes(ret));

r = E.check([cer, spf]);
assert.strictEqual(r.verdict, 'ok');

r = E.check([ret, cer], { pregnant: true });
assert.strictEqual(r.issues[0].kind, 'preg');

r = E.check([bpo, ret]); // BPO in a wash-off cleanser: still flagged but milder
assert.strictEqual(r.verdict, 'care');
console.log('clash engine: all checks passed');
