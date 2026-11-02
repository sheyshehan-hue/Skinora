# AI scent finder for the static Skinora site. Run after the other layers. Idempotent.
#   python3 build.py <site dir>
# - scent-finder.html: the old four-question finder is replaced by the five-question AI scent finder
# - cart.html, checkout.html, scent-finder.html: the sample set is registered as a product (set-patch.js)
# - fragrance and home fragrance category pages: a banner that leads to the finder
# - api/scent-finder.js: the Vercel function that asks Claude for the words (needs ANTHROPIC_API_KEY)
import os, re, shutil, sys

D = sys.argv[1]
HERE = os.path.dirname(os.path.abspath(__file__))
read = lambda f: open(os.path.join(HERE, f), encoding='utf-8').read()


def page(f):
    return os.path.join(D, f)


def strip(s, sid):
    # remove an earlier copy of one of our <style>/<script> blocks
    return re.sub(r'<(style|script) id="' + sid + r'"[^>]*>.*?</\1>', '', s, flags=re.S)


def put(s, a, b, name):
    if a not in s:
        sys.exit('scentfinder: anchor missing for ' + name)
    return s.replace(a, b, 1)


PATCH = '<script id="sk-sf-set">' + read('set-patch.js') + '</script>'
UI = ('<style id="sk-sf-css">' + read('scentfinder.css') + '</style>'
      '<script id="sk-sf-js">' + read('sf-data.js') + '\n' + read('sf-ui.js') + '</script>')


def add_patch(s, f):
    s = strip(s, 'sk-sf-set')
    i = s.find('<script id="sk-data"')
    if i < 0:
        sys.exit('scentfinder: no catalogue in ' + f)
    j = s.find('</script>', i) + 9
    return s[:j] + PATCH + s[j:]


# 1. The finder page
p = page('scent-finder.html'); s = open(p, encoding='utf-8').read()
s = strip(strip(s, 'sk-sf-css'), 'sk-sf-js')
s = s.replace('<div class="skf-finder" data-skf-finder style="margin-top:40px"></div>', '<div class="sf2" data-sf2 style="margin-top:40px"></div>')
if 'data-sf2' not in s:
    sys.exit('scentfinder: finder host missing')
s = s.replace('Four quick questions, about a minute. We match you by scent family, mood and when you will wear it.',
              'Five fun questions about your mood, your happy place and your style. Our AI turns your answers into a scent profile, '
              'then matches you with fragrances, a sample set to try at home and a candle for your room.')
s = s.replace('<title>Find your scent', '<title>AI scent finder: find your signature', 1)
s = add_patch(s, 'scent-finder.html')
s = put(s, '</body>', UI + '</body>', 'scent-finder body')
open(p, 'w', encoding='utf-8').write(s)

# 2. Bag and checkout know the sample set
for f in ['cart.html', 'checkout.html']:
    p = page(f); s = open(p, encoding='utf-8').read()
    open(p, 'w', encoding='utf-8').write(add_patch(s, f))

# 3. A page for the set (the bag links every line to its product page)
open(page('p__scent-sample-set.html'), 'w', encoding='utf-8').write(
    '<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Scent Finder Sample Set · Skinora</title>'
    '<meta name="robots" content="noindex"><meta http-equiv="refresh" content="0; url=scent-finder.html?result">'
    '<script>location.replace("scent-finder.html?result")</script></head><body>'
    '<a href="scent-finder.html?result">See your scent finder result</a></body></html>')
os.makedirs(page('media/scent'), exist_ok=True)
shutil.copyfile(os.path.join(HERE, 'sample-set.svg'), page('media/scent/sample-set.svg'))

# 4. Banners on the fragrance pages
BAN_CSS = ('<style id="sk-sf-ban-css">.sf2-ban{display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:14px 28px;margin:4px 0 30px;padding:20px 24px;background:#1A1917;color:#F6F2EC}'
           '.sf2-ban p{font-family:var(--font-serif),Georgia,serif;font-size:22px;line-height:1.25}.sf2-ban p em{color:#E2C992}'
           '.sf2-ban span{display:block;margin-top:4px;font-family:var(--font-sans),sans-serif;font-size:13px;color:rgba(246,242,236,.68)}'
           '.sf2-ban a{padding:12px 20px;background:#E2C992;color:#1A1917;font-size:11px;letter-spacing:.18em;text-transform:uppercase;white-space:nowrap}'
           '.sf2-ban a:hover{background:#F6F2EC}@media (max-width:560px){.sf2-ban p{font-size:19px}.sf2-ban a{width:100%;text-align:center}}</style>')
BANNERS = {
    'c__fragrances.html': ('Not sure which one is <em>you</em>?', 'Answer five fun questions and our AI finds your scent, with a sample set to try first.'),
    'c__women.html': ('Not sure which one is <em>you</em>?', 'Answer five fun questions and our AI finds your scent, with a sample set to try first.'),
    'c__men.html': ('Not sure which one is <em>you</em>?', 'Answer five fun questions and our AI finds your scent, with a sample set to try first.'),
    'c__unisex.html': ('Not sure which one is <em>you</em>?', 'Answer five fun questions and our AI finds your scent, with a sample set to try first.'),
    'c__home-fragrance.html': ('Which candle smells like <em>you</em>?', 'Our AI scent finder matches you with a fragrance and a candle for your home.'),
}
for f, (h, sub) in BANNERS.items():
    p = page(f)
    if not os.path.exists(p):
        continue
    s = open(p, encoding='utf-8').read()
    s = re.sub(r'<div class="sf2-ban".*?</div>', '', s, flags=re.S)
    s = strip(s, 'sk-sf-ban-css')
    ban = '<div class="sf2-ban"><p>' + h + '<span>' + sub + '</span></p><a href="scent-finder.html">Find my scent</a></div>'
    i = s.find('<main'); j = s.find('<!--$-->', i)
    if i < 0 or j < 0:
        sys.exit('scentfinder: banner anchor missing in ' + f)
    s = s[:j] + ban + s[j:]
    s = put(s, '</head>', BAN_CSS + '</head>', f)
    open(p, 'w', encoding='utf-8').write(s)

# 5. The AI writer
api = page('api'); os.makedirs(api, exist_ok=True)
shutil.copyfile(os.path.join(HERE, 'server', 'scent-finder.js'), os.path.join(api, 'scent-finder.js'))
print('scentfinder layer applied')
