# Product requests (pre-order on request) for the static Skinora site. Run after the other layers. Idempotent.
#   python3 build.py <site dir>
# Adds request.html (the customer form), admin__requests.html (the admin list), a "Can't find it? Request it"
# prompt in the shop search when nothing matches, a footer link, and a Requests item in the admin menu.
import glob, os, re, sys

D = sys.argv[1]
HERE = os.path.dirname(os.path.abspath(__file__))
read = lambda f: open(os.path.join(HERE, f)).read()
TAG = '<style id="sk-req-css">' + read('requests.css') + '</style><script id="sk-req-js">' + read('requests.js') + '</script>'
STRIP = re.compile(r'<style id="sk-req-css">.*?</style><script id="sk-req-js">.*?</script>', re.S)


def sub1(s, pat, rep, name):
    out, n = re.subn(pat, lambda m: rep, s, count=1, flags=re.S)
    if not n: sys.exit('requests: anchor missing for ' + name)
    return out


def inner_div(s, opener, name):
    """Return (start, end) of the content inside the first div that starts with opener."""
    i = s.find(opener)
    if i < 0: sys.exit('requests: anchor missing for ' + name)
    j, depth = i + len(opener), 1
    for m in re.compile(r'<div\b|</div>').finditer(s, j):
        depth += 1 if m.group(0) == '<div' else -1
        if depth == 0: return j, m.start()
    sys.exit('requests: unclosed div for ' + name)


# 1. The customer page, made from the help page so it has the same header, footer and search.
s = open(os.path.join(D, 'help.html')).read()
s = sub1(s, r'<title>.*?</title>', '<title>Request a product · Skinora</title>', 'title')
s = re.sub(r'(<meta name="description" content=")[^"]*(")', r'\1Can’t find it at Skinora? Tell us the product and we’ll source it from an authorised supplier. Get a quote within 48 hours and pay only if you say yes.\2', s, count=1)
s = sub1(s, r'data-sk-path="[^"]*"', 'data-sk-path="/request"', 'path')
s = sub1(s, r'<main class="min-h-\[60vh\]">.*?</main>', '<main class="min-h-[60vh]">' + read('page.html').strip() + '</main>', 'main')
open(os.path.join(D, 'request.html'), 'w').write(s)

# 2. The admin page, made from the customers page so it has the same menu and top bar.
s = open(os.path.join(D, 'admin__customers.html')).read()
s = sub1(s, r'<title>.*?</title>', '<title>Product requests · Skinora Admin</title>', 'admin title')
s = sub1(s, r'data-sk-path="[^"]*"', 'data-sk-path="/admin/requests"', 'admin path')
a, b = inner_div(s, '<div class="mx-auto max-w-[1440px] px-4 py-6 sm:px-8 sm:py-8">', 'admin content')
s = s[:a] + '<div data-skr-admin><h1 class="text-[26px] font-medium text-[var(--adm-t1)]">Product requests</h1></div>' + s[b:]
open(os.path.join(D, 'admin__requests.html'), 'w').write(s)

# 3. The script and styles on every page (store and admin). index.html is the preview frame.
n = 0
for f in sorted(glob.glob(os.path.join(D, '*.html'))):
    if os.path.basename(f) == 'index.html': continue
    s = STRIP.sub('', open(f).read())
    if '</body>' not in s: continue
    i = s.rfind('</body>'); s = s[:i] + TAG + s[i:]
    open(f, 'w').write(s); n += 1
print('requests layer applied to %d pages' % n)
