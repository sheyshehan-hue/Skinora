/* Scent finder sample set: registers the set as a product so the bag and checkout can price it.
   Each set is its own size (the three scents), read from the bag. The price always comes from here. */
(function () {
  try {
    var el = document.getElementById('sk-data'); if (!el) return;
    var d = JSON.parse(el.textContent);
    if (d.products.some(function (p) { return p.id === 'sf-sample-set'; })) return;
    var PRICE = 3500, IMG = 'media/scent/sample-set.svg';
    var vs = [{ id: 'sf-set', name: '3 × 2 ml', sku: 'SK-SCENT-SET', stock: 99, price: PRICE, compareAt: null, batch: null }];
    var cart = []; try { cart = JSON.parse(localStorage.getItem('skd-cart') || '[]') || []; } catch (e) {}
    cart.forEach(function (i) {
      if (i && typeof i.variantId === 'string' && i.variantId.indexOf('sf-set:') === 0)
        vs.push({ id: i.variantId, name: String(i.variantName || '3 × 2 ml').slice(0, 160), sku: 'SK-SCENT-SET', stock: 5, price: PRICE, compareAt: null, batch: null });
    });
    d.products.push({ id: 'sf-sample-set', slug: 'scent-sample-set', name: 'Scent Finder Sample Set', brand: 'Skinora', brandSlug: 'skinora', cats: ['gift-sets', 'fragrances'],
      isLuxury: false, tagline: 'Three 2 ml vials of your scent finder matches', origin: 'Sri Lanka', isNew: true, isBestSeller: false, gender: 'unisex', skin: [], concerns: [], ingredients: [],
      image: IMG, hover: IMG, rating: 0, ratingCount: 0, sold: 0, created: 0, flashPct: 0, variants: vs });
    el.textContent = JSON.stringify(d);
  } catch (e) {}
})();
