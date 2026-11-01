# Skin progress diary for the static Skinora site. Run after layer-skinscan and layer-faceshape. Idempotent.
#   python3 build.py <site dir>
# Adds diary.html, puts the diary script on the quiz and account pages, and makes four small changes
# to the skin scan script: it tells the diary when a scan finishes, rescans are every 2 weeks instead of 4,
# the result screen points to the diary, and the consent text says a photo can be kept on the device.
import os, re, sys

D = sys.argv[1]
HERE = os.path.dirname(os.path.abspath(__file__))
read = lambda f: open(os.path.join(HERE, f)).read()
TAG = '<style id="sk-diary-css">' + read('diary.css') + '</style><script id="sk-diary-js">' + read('diary.js') + '</script>'
STRIP = re.compile(r'<style id="sk-diary-css">.*?</style><script id="sk-diary-js">.*?</script>', re.S)

# Changes to the skin scan script (layer-skinscan), applied inside each page that carries it.
SCAN = [
    ("host.__skScan = r;\n      window.scrollTo(0, 0);",
     "host.__skScan = r;\n      window.scrollTo(0, 0);\n      try { window.dispatchEvent(new CustomEvent('sks:scan', { detail: { scan: store.all()[0], photo: preview } })); } catch (e) {}",
     'scan event'),
    ("var RESCAN_DAYS = 28;", "var RESCAN_DAYS = 14;", 'rescan days'),
    ("Saved to <a class=\"underline\" href=\"account.html\">My account</a>. Scan again in 4 weeks to see how your skin changes.",
     "Saved to your <a class=\"underline\" href=\"diary.html\">skin diary</a>. Scan again in 2 weeks to see how your skin changes.",
     'result text'),
    ("The photo is used once and never saved. Only my scores are kept.",
     "The photo is used once and never saved by Skinora. Only my scores are kept. I can choose to keep the photo on this device for my skin diary.",
     'consent text'),
]


def sub1(s, pat, rep, name):
    out, n = re.subn(pat, lambda m: rep, s, count=1, flags=re.S)
    if not n: sys.exit('skindiary: anchor missing for ' + name)
    return out


def patch_scan(s, f):
    i = s.find('<script id="sk-scan-js">')
    if i < 0: sys.exit('skindiary: layer-skinscan is missing in ' + f + '. Run layer-skinscan first.')
    j = s.find('</script>', i)
    js = s[i:j]
    for a, b, name in SCAN:
        if b in js: continue
        if a not in js: sys.exit('skindiary: anchor missing for ' + name + ' in ' + f)
        js = js.replace(a, b, 1)
    return s[:i] + js + s[j:]


# 1. The diary page, made from the help page so it has the same header, footer and search.
s = STRIP.sub('', open(os.path.join(D, 'help.html')).read())
s = sub1(s, r'<title>.*?</title>', '<title>My skin diary · Skinora</title>', 'title')
s = re.sub(r'(<meta name="description" content=")[^"]*(")', r'\1Scan your skin every 2 weeks and watch it change: before and after photos, a progress chart and scores like “Redness down 20%”. Kept only on your device.\2', s, count=1)
s = sub1(s, r'data-sk-path="[^"]*"', 'data-sk-path="/diary"', 'path')
s = sub1(s, r'<main class="min-h-\[60vh\]">.*?</main>', '<main class="min-h-[60vh]">' + read('page.html').strip() + '</main>', 'main')
i = s.rfind('</body>'); s = s[:i] + TAG + s[i:]
open(os.path.join(D, 'diary.html'), 'w').write(s)

# 2. Quiz and account pages: the scan changes, then the diary script right after the scan (and face) scripts.
for f in ['quiz.html', 'account.html']:
    p = os.path.join(D, f)
    s = patch_scan(STRIP.sub('', open(p).read()), f)
    anchor = '<script id="sk-face-js">' if '<script id="sk-face-js">' in s else '<script id="sk-scan-js">'
    j = s.find('</script>', s.find(anchor)) + 9
    s = s[:j] + TAG + s[j:]
    open(p, 'w').write(s)
print('skindiary layer applied')
