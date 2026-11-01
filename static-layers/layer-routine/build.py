# Routine builder layer for the static Skinora site: My routine page (morning and night checklist,
# weekly calendar, streak), reminders (phone calendar file and WhatsApp) and refill nudges.
# Run after layer-skinscan and layer-faceshape. Idempotent: running it again replaces the old copy.
#   python3 build.py <site dir>
import os, re, shutil, sys

D = sys.argv[1]
HERE = os.path.dirname(os.path.abspath(__file__))
read = lambda f: open(os.path.join(HERE, f)).read()
TAG = '<style id="sk-rt-css">' + read('routine.css') + '</style><script id="sk-rt-js">' + read('routine.js') + '</script>'
ANCHOR = '<script id="sk-feat-data"'


def put(s, a, b, name):
    if b in s: return s
    if a not in s: sys.exit('routine: anchor missing for ' + name)
    return s.replace(a, b, 1)


def strip(s):
    i = s.find('<style id="sk-rt-css">')
    if i >= 0:
        j = s.find('</script>', s.find('<script id="sk-rt-js">')) + 9
        s = s[:i] + s[j:]
    return s


def inject(s, name):
    return put(strip(s), ANCHOR, TAG + ANCHOR, name)


# 1. The My routine page, made from the wishlist page so it has the same header, footer, bag and data
src = open(os.path.join(D, 'wishlist.html')).read()
src = strip(src)
i, j = src.find('<main'), src.find('</main>') + 7
page = src[:i] + '<main class="min-h-[60vh]"><div class="container-lux srt-wrap" id="srt-app"></div></main>' + src[j:]
page = page.replace('<title>Wishlist | Skinora</title>', '<title>My routine | Skinora</title>', 1)
page = page.replace('data-sk-path="/wishlist"', 'data-sk-path="/routine"', 1)
page = re.sub(r'<meta name="robots"[^>]*>', '', page)
page = page.replace('</title>', '</title><meta name="robots" content="noindex">', 1)
open(os.path.join(D, 'routine.html'), 'w').write(inject(page, 'routine.html'))

# 2. Quiz result offers "Save my routine"; account shows a My routine card; home shows refill nudges
for f in ['quiz.html', 'account.html', 'home.html']:
    p = os.path.join(D, f)
    s = inject(open(p).read(), f)
    if f == 'quiz.html':
        s = put(s, 'host.__steps = steps;', 'host.__steps = steps; if (window.SKRT) window.SKRT.offer(host, steps, a);', 'quiz result')
    open(p, 'w').write(s)

# 3. The reminder functions
api = os.path.join(D, 'api')
os.makedirs(api, exist_ok=True)
for f in os.listdir(os.path.join(HERE, 'server')):
    shutil.copyfile(os.path.join(HERE, 'server', f), os.path.join(api, f))
print('routine layer applied')
