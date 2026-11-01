# Ingredient checker layer for the static Skinora site. Idempotent: safe to run again after other layers.
#   python3 layers/clash/build.py public
# - adds the checker scripts to every store page (product pages get "Works with your routine?")
# - writes ingredient-check.html from the ingredient guide page shell
# - links it from the phone menu, the footer, the ingredient guide, the sitemap and llms.txt
import glob, os, re, sys
D = sys.argv[1]
HERE = os.path.dirname(os.path.abspath(__file__))
rd = lambda n: open(os.path.join(HERE, n)).read()
TAG = ('<style id="sk-clash-css">' + rd('clash.css') + '</style>'
       '<script id="sk-clash-js">' + rd('clash-engine.js') + '\n' + rd('clash-ui.js') + '</script>')
STRIP = re.compile(r'<style id="sk-clash-css">.*?</style><script id="sk-clash-js">.*?</script>', re.S)
MENU_A = '<a class="block" href="scent-finder.html">Scent finder</a>'
MENU_B = MENU_A + '<a class="block" href="ingredient-check.html">Ingredient checker</a>'
FOOT_A = '<li><a class="link-underline hover:text-ink" href="ingredients.html">Ingredient guide</a></li>'
FOOT_B = FOOT_A + '<li><a class="link-underline hover:text-ink" href="ingredient-check.html">Ingredient checker</a></li>'

MAIN = '''<main class="min-h-[60vh]"><div class="skp skc"><div class="container-lux skp-wrap"><nav aria-label="Breadcrumb" class="skp-crumb"><a href="home.html">Home</a><span>/</span><a href="ingredients.html">Ingredient guide</a><span>/</span><b style="font-weight:400;color:#4a463f">Ingredient checker</b></nav><header class="skp-head"><p class="skp-eye">Ingredient checker</p><h1 class="skp-h1">Will it <em>clash</em>?</h1><p class="skp-lede">Add the products you use, from Skinora or any other shop. We check the ingredients, tell you what not to mix, and when to use each one.</p></header><div id="skc-root"><noscript><p class="skc-note">The checker needs JavaScript. The common clashes are listed below.</p></noscript></div><section class="skp-sec" style="margin-top:72px"><p class="skp-eye">The mixes to know</p><h2 class="skp-h2" style="margin-top:14px">Four clashes we see <em>most</em></h2><div class="skc-issues" style="margin-top:32px"><article class="skc-issue skc-stop"><h3>Retinol and exfoliating acids</h3><p>Glycolic, lactic and salicylic acid with retinol often cause redness and peeling.</p><p class="skc-fix"><b>What to do:</b> use them on different nights.</p></article><article class="skc-issue skc-stop"><h3>Retinol and benzoyl peroxide</h3><p>Benzoyl peroxide can break down retinol, and both dry the skin.</p><p class="skc-fix"><b>What to do:</b> benzoyl peroxide in the morning, retinol at night.</p></article><article class="skc-issue skc-care"><h3>Vitamin C and retinol</h3><p>Both are strong, and each works best at a different time of day.</p><p class="skc-fix"><b>What to do:</b> vitamin C in the morning, retinol at night.</p></article><article class="skc-issue skc-care"><h3>Vitamin C and acids</h3><p>Both are acidic, so layering them can sting.</p><p class="skc-fix"><b>What to do:</b> vitamin C in the morning, acids at night.</p></article></div><p class="skc-disc" style="margin-top:24px">Good news: niacinamide and vitamin C are fine together, and hyaluronic acid, ceramides and squalane go with almost everything. <a href="ingredients.html" style="text-decoration:underline">Read the ingredient guide</a>.</p></section></div></div></main>'''

def put(s, a, b):
    return s if b in s or a not in s else s.replace(a, b, 1)

n = 0
for f in sorted(glob.glob(os.path.join(D, '*.html'))):
    b = os.path.basename(f)
    if b.startswith('admin') or b in ('index.html', 'ingredient-check.html'): continue
    s = STRIP.sub('', open(f).read())
    if '<script id="sk-feat-data"' not in s: continue
    s = s.replace('<script id="sk-feat-data"', TAG + '<script id="sk-feat-data"', 1)
    s = put(s, MENU_A, MENU_B)
    s = put(s, FOOT_A, FOOT_B)
    if b == 'ingredients.html':
        s = put(s, '<a class="skp-btn ghost" href="c__skin-care.html?f=ff">', '<a class="skp-btn" href="ingredient-check.html">Check my products for clashes</a><a class="skp-btn ghost" href="c__skin-care.html?f=ff">')
    open(f, 'w').write(s); n += 1

# The checker page, built from the ingredient guide shell (header, footer, scripts)
s = open(os.path.join(D, 'ingredients.html')).read()
s = s.replace('<a class="skp-btn" href="ingredient-check.html">Check my products for clashes</a>', '')
s = re.sub(r'<main[^>]*>.*?</main>', lambda m: MAIN, s, count=1, flags=re.S)
s = re.sub(r'<title>.*?</title>', '<title>Ingredient checker: will it clash? · Skinora</title>', s, count=1, flags=re.S)
desc = 'Check if your skincare products clash, from Skinora or any other shop. See what not to mix, like retinol with acids, and when to use each product.'
s = re.sub(r'<meta name="description" content="[^"]*">', '<meta name="description" content="%s">' % desc, s, count=1)
s = re.sub(r'<meta property="og:title" content="[^"]*">', '<meta property="og:title" content="Ingredient checker | Skinora">', s, count=1)
s = re.sub(r'<meta property="og:description" content="[^"]*">', '<meta property="og:description" content="%s">' % desc, s, count=1)
s = s.replace('data-sk-path="/ingredients"', 'data-sk-path="/ingredient-check"', 1)
open(os.path.join(D, 'ingredient-check.html'), 'w').write(s)

# Sitemap and llms.txt
p = os.path.join(D, 'sitemap.xml')
if os.path.exists(p):
    s = open(p).read()
    if 'ingredient-check.html' not in s:
        s = re.sub(r'(  <url><loc>([^<]*/)ingredients\.html</loc><lastmod>[^<]*</lastmod></url>\n)', lambda m: m.group(1) + '  <url><loc>' + m.group(2) + 'ingredient-check.html</loc><lastmod>2026-11-01</lastmod></url>\n', s, count=1)
        open(p, 'w').write(s)
p = os.path.join(D, 'llms.txt')
if os.path.exists(p):
    s = open(p).read()
    if 'ingredient-check.html' not in s:
        s = re.sub(r'(- \[Ingredient guide\]\(([^)]*/)ingredients\.html\)\n)', lambda m: m.group(1) + '- [Ingredient checker: check if skincare products clash](' + m.group(2) + 'ingredient-check.html)\n', s, count=1)
        open(p, 'w').write(s)
print('clash layer applied to %d pages, wrote ingredient-check.html' % n)
