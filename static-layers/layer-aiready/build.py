# AI shopping readiness for the static Skinora site: structured data (schema.org JSON-LD) on every page,
# correct canonical/OG URLs, robots.txt, sitemap.xml, llms.txt, and product feeds for Google Merchant
# Center and ChatGPT shopping. Idempotent.
#   python3 build.py <site dir> <public base URL>
import glob, html, json, os, re, sys
from datetime import date
from xml.sax.saxutils import escape as xesc

D, SITE = sys.argv[1], sys.argv[2].rstrip('/')
TODAY = date.today().isoformat()
STORE = {
    'name': 'Skinora', 'legal': 'Skinora Imports (Pvt) Ltd', 'email': 'care@skinora.lk', 'phone': '+94 77 123 4567',
    'street': '42 Flower Road', 'city': 'Colombo 07', 'region': 'Western Province', 'country': 'LK',
}
FREE_OVER, MIN_FEE, RETURN_DAYS = 15000, 350, 14
NOINDEX = ('admin', 'account', 'cart', 'checkout', 'wishlist', 'track')

def read(f): return open(os.path.join(D, f)).read()
def write(f, s): open(os.path.join(D, f), 'w').write(s)
def url(f): return SITE + '/' + ('' if f in ('home.html', 'index.html') else f)
def data():
    return json.loads(re.search(r'<script id="sk-data" type="application/json">(.*?)</script>', read('home.html'), re.S).group(1))
def meta(s, name):
    m = re.search(r'<meta (?:name|property)="' + name + r'" content="([^"]*)"', s)
    return html.unescape(m.group(1)) if m else ''

DATA = data()
CAT = {c['slug']: c['name'] for c in DATA['categories']}
SELLER = {'@type': 'Organization', 'name': STORE['name'], '@id': SITE + '/#store'}
SHIPPING = {
    '@type': 'OfferShippingDetails',
    'shippingRate': {'@type': 'MonetaryAmount', 'minValue': 0, 'maxValue': 750, 'currency': 'LKR'},
    'shippingDestination': {'@type': 'DefinedRegion', 'addressCountry': 'LK'},
    'deliveryTime': {'@type': 'ShippingDeliveryTime',
                     'handlingTime': {'@type': 'QuantitativeValue', 'minValue': 0, 'maxValue': 1, 'unitCode': 'DAY'},
                     'transitTime': {'@type': 'QuantitativeValue', 'minValue': 0, 'maxValue': 5, 'unitCode': 'DAY'}},
}
RETURNS = {
    '@type': 'MerchantReturnPolicy', 'applicableCountry': 'LK', 'returnPolicyCategory': 'https://schema.org/MerchantReturnFiniteReturnWindow',
    'merchantReturnDays': RETURN_DAYS, 'returnMethod': 'https://schema.org/ReturnByMail', 'returnFees': 'https://schema.org/FreeReturn',
}

def product_ld(p, page):
    link = url('p__' + p['slug'] + '.html')
    desc = meta(page, 'description') or p.get('tagline') or ''
    imgs = [SITE + '/' + p['image']] + ([SITE + '/' + p['hover']] if p.get('hover') else [])
    offers = []
    for v in p['variants']:
        o = {'@type': 'Offer', 'sku': v['sku'], 'name': v['name'], 'url': link, 'price': v['price'], 'priceCurrency': 'LKR',
             'availability': 'https://schema.org/' + ('InStock' if v['stock'] > 0 else 'OutOfStock'),
             'itemCondition': 'https://schema.org/NewCondition', 'seller': SELLER,
             'shippingDetails': SHIPPING, 'hasMerchantReturnPolicy': RETURNS}
        offers.append(o)
    props = [('Suitable skin types', ', '.join(p.get('skin') or [])), ('Helps with', ', '.join(p.get('concerns') or [])),
             ('Key ingredients', ', '.join(p.get('ingredients') or [])), ('Made in', p.get('origin') or ''),
             ('Authenticity', '100% authentic, sourced from brand-authorised distributors. Batch number and expiry shown before you buy.')]
    ld = {'@context': 'https://schema.org', '@type': 'Product', '@id': link + '#product', 'name': p['brand'] + ' ' + p['name'],
          'description': desc, 'image': imgs, 'url': link, 'sku': p['variants'][0]['sku'], 'mpn': p['variants'][0]['sku'],
          'brand': {'@type': 'Brand', 'name': p['brand']}, 'category': ' > '.join(CAT.get(c, c) for c in reversed(p['cats'])),
          'additionalProperty': [{'@type': 'PropertyValue', 'name': k, 'value': v} for k, v in props if v],
          'offers': offers[0] if len(offers) == 1 else {'@type': 'AggregateOffer', 'priceCurrency': 'LKR', 'offerCount': len(offers),
                                                        'lowPrice': min(o['price'] for o in offers), 'highPrice': max(o['price'] for o in offers), 'offers': offers}}
    if p.get('ratingCount'):
        ld['aggregateRating'] = {'@type': 'AggregateRating', 'ratingValue': round(p['rating'], 1), 'reviewCount': p['ratingCount'], 'bestRating': 5}
    crumbs = [('Home', url('home.html'))] + [(CAT.get(c, c), url('c__' + c + '.html')) for c in reversed(p['cats'])] + [(p['name'], link)]
    bc = {'@context': 'https://schema.org', '@type': 'BreadcrumbList',
          'itemListElement': [{'@type': 'ListItem', 'position': i + 1, 'name': n, 'item': u} for i, (n, u) in enumerate(crumbs)]}
    return [ld, bc]

def store_ld():
    return [{
        '@context': 'https://schema.org', '@type': 'OnlineStore', '@id': SITE + '/#store', 'name': STORE['name'], 'legalName': STORE['legal'],
        'url': SITE + '/', 'logo': SITE + '/media/brands/skinora.svg', 'email': STORE['email'], 'telephone': STORE['phone'],
        'description': meta(read('home.html'), 'description'),
        'address': {'@type': 'PostalAddress', 'streetAddress': STORE['street'], 'addressLocality': STORE['city'], 'addressRegion': STORE['region'], 'addressCountry': STORE['country']},
        'areaServed': {'@type': 'Country', 'name': 'Sri Lanka'}, 'currenciesAccepted': 'LKR',
        'paymentAccepted': 'Visa, Mastercard, American Express, Koko, Mintpay, bank transfer, cash on delivery',
        'hasMerchantReturnPolicy': RETURNS,
        'contactPoint': {'@type': 'ContactPoint', 'contactType': 'customer service', 'telephone': STORE['phone'], 'email': STORE['email'], 'availableLanguage': ['English', 'Sinhala', 'Tamil']},
    }, {'@context': 'https://schema.org', '@type': 'WebSite', '@id': SITE + '/#website', 'name': STORE['name'], 'url': SITE + '/', 'publisher': {'@id': SITE + '/#store'}}]

def faq_ld(s):
    qa = re.findall(r'<details><summary>(.*?)</summary><p>(.*?)</p></details>', s, re.S)
    strip = lambda t: html.unescape(re.sub(r'<[^>]+>', '', t)).strip()
    return [{'@context': 'https://schema.org', '@type': 'FAQPage',
             'mainEntity': [{'@type': 'Question', 'name': strip(q), 'acceptedAnswer': {'@type': 'Answer', 'text': strip(a)}} for q, a in qa]}] if qa else []

def article_ld(f, s):
    h = re.search(r'<h1 class="skp-h1">([^<]*)', s)
    if not h: return []
    img = meta(s, 'og:image')
    return [{'@context': 'https://schema.org', '@type': 'Article', 'headline': html.unescape(h.group(1)).strip(), 'description': meta(s, 'description'),
             'url': url(f), 'image': img or None, 'publisher': {'@id': SITE + '/#store'}, 'author': {'@type': 'Organization', 'name': 'Skinora'}}]

def put_ld(s, blocks):
    s = re.sub(r'<script type="application/ld\+json" data-sk-ai>.*?</script>', '', s, flags=re.S)
    if not blocks: return s
    tag = ''.join('<script type="application/ld+json" data-sk-ai>' + json.dumps(b, ensure_ascii=False, separators=(',', ':')).replace('</', '<\\/') + '</script>' for b in blocks)
    return s.replace('</head>', tag + '</head>', 1)

pages = sorted(os.path.basename(f) for f in glob.glob(os.path.join(D, '*.html')))
by_slug = {p['slug']: p for p in DATA['products']}
indexable = []
for f in pages:
    if f == 'index.html': continue
    s = read(f)
    # Canonical and share links pointed at the dev server; point them at the real site and the real file
    s = re.sub(r'<link rel="canonical" href="[^"]*">', '<link rel="canonical" href="' + url(f) + '">', s)
    s = s.replace('http://localhost:3000/', SITE + '/')
    s = re.sub(r'<meta name="robots" content="[^"]*" data-sk-ai>', '', s)
    if f.startswith(NOINDEX) or '__q_' in f:
        s = s.replace('</head>', '<meta name="robots" content="noindex" data-sk-ai></head>', 1)
    else:
        indexable.append(f)
    blocks = []
    if f.startswith('p__') and f[3:-5] in by_slug: blocks = product_ld(by_slug[f[3:-5]], s)
    elif f == 'home.html': blocks = store_ld()
    elif f == 'help.html': blocks = faq_ld(s)
    elif f.startswith('journal__'): blocks = article_ld(f, s)
    write(f, put_ld(s, blocks))

# robots.txt: welcome search and AI shopping crawlers to the store, keep private pages out
bots = ['OAI-SearchBot', 'ChatGPT-User', 'GPTBot', 'PerplexityBot', 'Perplexity-User', 'Google-Extended', 'Googlebot', 'Bingbot', 'ClaudeBot', 'Claude-SearchBot', 'Applebot', 'Applebot-Extended']
private = ['/admin', '/account', '/cart.html', '/checkout.html', '/wishlist.html', '/track.html', '/api/']
write('robots.txt', '# Skinora welcomes search engines and AI shopping assistants.\n' +
      ''.join('User-agent: %s\n' % b for b in bots + ['*']) + ''.join('Disallow: %s\n' % p for p in private) +
      'Allow: /\n\nSitemap: %s/sitemap.xml\n' % SITE)

write('sitemap.xml', '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
      ''.join('  <url><loc>%s</loc><lastmod>%s</lastmod></url>\n' % (xesc(url(f)), TODAY) for f in indexable) + '</urlset>\n')

# Product feeds: one row per size, grouped by product
os.makedirs(os.path.join(D, 'feeds'), exist_ok=True)
rows = []
for p in DATA['products']:
    page = read('p__' + p['slug'] + '.html')
    for v in p['variants']:
        rows.append({
            'id': v['sku'], 'item_group_id': p['id'], 'title': '%s %s %s' % (p['brand'], p['name'], v['name']),
            'description': meta(page, 'description') or p.get('tagline', ''), 'link': url('p__' + p['slug'] + '.html'),
            'image_link': SITE + '/' + p['image'], 'additional_image_link': SITE + '/' + p['hover'] if p.get('hover') else '',
            'brand': p['brand'], 'mpn': v['sku'], 'gtin': '', 'condition': 'new',
            'availability': 'in_stock' if v['stock'] > 0 else 'out_of_stock', 'inventory_quantity': v['stock'],
            'price': '%d LKR' % v['price'], 'sale_price': '', 'size': v['name'],
            'product_type': ' > '.join(CAT.get(c, c) for c in reversed(p['cats'])),
            'google_product_category': 'Health & Beauty > Personal Care > Cosmetics' + (' > Perfume & Cologne' if 'fragrances' in p['cats'] else ' > Skin Care' if 'skin-care' in p['cats'] else ''),
            'expiration_date': (v.get('batch') or {}).get('expiry', '')[:10], 'rating': round(p['rating'], 1) if p.get('ratingCount') else '', 'review_count': p.get('ratingCount') or '',
            'seller_name': STORE['name'], 'seller_url': SITE + '/', 'return_policy': url('delivery.html'), 'return_window': RETURN_DAYS,
            'shipping': 'LK:::%d LKR' % MIN_FEE, 'free_shipping_threshold': '%d LKR' % FREE_OVER,
        })
        if v.get('compareAt') and v['compareAt'] > v['price']:
            rows[-1]['price'], rows[-1]['sale_price'] = '%d LKR' % v['compareAt'], '%d LKR' % v['price']

# Google Merchant Center (RSS 2.0 with the g: namespace)
G = ['id', 'item_group_id', 'title', 'description', 'link', 'image_link', 'additional_image_link', 'brand', 'mpn', 'gtin', 'condition', 'availability',
     'price', 'sale_price', 'size', 'product_type', 'google_product_category', 'expiration_date']
items = []
for r in rows:
    fields = ''.join('<g:%s>%s</g:%s>' % (k, xesc(str(r[k])), k) for k in G if r[k] != '')
    if not r['gtin']: fields += '<g:identifier_exists>no</g:identifier_exists>'
    fields += '<g:shipping><g:country>LK</g:country><g:price>%d LKR</g:price></g:shipping>' % MIN_FEE
    items.append('<item>' + fields + '</item>')
write('feeds/google-merchant.xml', '<?xml version="1.0" encoding="UTF-8"?>\n<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0"><channel>'
      '<title>Skinora</title><link>%s/</link><description>Authentic luxury skincare and fragrance in Sri Lanka</description>\n%s\n</channel></rss>\n' % (SITE, '\n'.join(items)))

# ChatGPT shopping (OpenAI product feed fields), plus a CSV copy for other platforms
O = ['id', 'item_group_id', 'title', 'description', 'link', 'image_link', 'additional_image_link', 'brand', 'mpn', 'gtin', 'condition', 'availability',
     'inventory_quantity', 'price', 'sale_price', 'size', 'product_category', 'expiration_date', 'product_review_rating', 'product_review_count',
     'seller_name', 'seller_url', 'return_policy', 'return_window', 'shipping', 'enable_search', 'enable_checkout']
def oai(r):
    o = dict(r, product_category=r['product_type'], product_review_rating=r['rating'], product_review_count=r['review_count'],
             enable_search='true', enable_checkout='false')
    return {k: o[k] for k in O if o.get(k) not in ('', None)}
write('feeds/chatgpt-products.jsonl', ''.join(json.dumps(oai(r), ensure_ascii=False) + '\n' for r in rows))
import csv, io
buf = io.StringIO(); w = csv.DictWriter(buf, fieldnames=O, extrasaction='ignore'); w.writeheader()
for r in rows: w.writerow(oai(r))
write('feeds/products.csv', buf.getvalue())

# llms.txt: a plain summary assistants can read in one go
lines = ['# Skinora', '',
         '> Skinora is an online store in Sri Lanka for 100% authentic international skincare and fragrance. Every product comes from brand-authorised distributors, '
         'is cleared through Sri Lanka Customs by Skinora Imports (Pvt) Ltd, and shows its batch number and expiry date before you buy. Prices are in LKR.', '',
         '## Key facts',
         '- Delivery: island-wide. Same-day or next-day in Colombo, 1 to 2 days in Gampaha and Kalutara, 2 to 5 days elsewhere. Free over LKR %s; otherwise from LKR %d.' % ('{:,}'.format(FREE_OVER), MIN_FEE),
         '- Returns: unopened items within %d days for a full refund or exchange. Opened items only if faulty or you have a reaction.' % RETURN_DAYS,
         '- Payment: Visa, Mastercard, Amex, Koko and Mintpay (pay in 3), bank transfer, cash on delivery up to LKR 75,000.',
         '- Storage: climate-controlled at 18 to 22°C in Colombo. Dispatched first-expiry-first-out.',
         '- Contact: WhatsApp or call %s, email %s. Atelier: %s, %s.' % (STORE['phone'], STORE['email'], STORE['street'], STORE['city']),
         '- Free tools: AI skin scan and skin quiz (%s), scent finder (%s).' % (url('quiz.html'), url('scent-finder.html')), '',
         '## Pages',
         '- [Authenticity promise](%s)' % url('authenticity.html'), '- [Delivery and returns](%s)' % url('delivery.html'),
         '- [Help centre](%s)' % url('help.html'), '- [Ingredient guide](%s)' % url('ingredients.html'), '- [Gift guide](%s)' % url('gift-guide.html'), '',
         '## Shop by category'] + ['- [%s](%s)' % (c['name'], url('c__' + c['slug'] + '.html')) for c in DATA['categories'] if os.path.exists(os.path.join(D, 'c__' + c['slug'] + '.html'))] + [
         '', '## Brands'] + ['- [%s](%s)' % (b['name'], url('brands__' + b['slug'] + '.html')) for b in DATA['brands'] if os.path.exists(os.path.join(D, 'brands__' + b['slug'] + '.html'))] + [
         '', '## Products'] + ['- [%s %s](%s): %s. From LKR %s. Skin: %s.' % (p['brand'], p['name'], url('p__' + p['slug'] + '.html'), p.get('tagline', ''),
                               '{:,}'.format(min(v['price'] for v in p['variants'])), ', '.join(p.get('skin') or []) or 'all') for p in DATA['products']] + [
         '', '## Product feeds', '- [Google Merchant feed](%s/feeds/google-merchant.xml)' % SITE, '- [ChatGPT product feed](%s/feeds/chatgpt-products.jsonl)' % SITE, '']
write('llms.txt', '\n'.join(lines))
print('aiready: %d pages, %d product rows, %d indexable' % (len(pages), len(rows), len(indexable)))
