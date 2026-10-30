# AI skin scan layer for the static Skinora site. Run after features/quizwords.py. Idempotent.
#   python3 build.py <site dir>
import glob, os, sys
D = sys.argv[1]
HERE = os.path.dirname(os.path.abspath(__file__))
JS = open(os.path.join(HERE, 'skinscan.js')).read()
CSS = open(os.path.join(HERE, 'skinscan.css')).read()
TAG = '<style id="sk-scan-css">' + CSS + '</style><script id="sk-scan-js">' + JS + '</script>'

def put(s, a, b, name):
    if b in s: return s
    if a not in s: sys.exit('skinscan: anchor missing for ' + name)
    return s.replace(a, b, 1)

for f in ['quiz.html', 'account.html']:
    p = os.path.join(D, f); s = open(p).read()
    i = s.find('<style id="sk-scan-css">')
    if i >= 0: s = s[:i] + s[s.find('</script>', s.find('<script id="sk-scan-js">')) + 9:]
    s = put(s, '<script id="sk-feat-data"', TAG + '<script id="sk-feat-data"', f)
    if f == 'quiz.html':
        s = put(s, "    render();\n  }\n\n  /* ---------- checkout",
                "    host.__skStart = function (skin, concerns) { a = { skin: skin, concern: concerns.slice(0, 3) }; step = 2; render(); };\n"
                "    host.__skRender = function () { step = 0; a = { concern: [] }; render(); };\n"
                "    if (window.SKSCAN) window.SKSCAN.quiz(host); else render();\n  }\n\n  /* ---------- checkout", 'quiz start')
        s = put(s, "if (k === 'retake') { step = 0; a = { concern: [] }; render(); }",
                "if (k === 'retake') { step = 0; a = { concern: [] }; if (window.SKSCAN) window.SKSCAN.quiz(host); else render(); }", 'retake')
    open(p, 'w').write(s)

# Home page: the quiz banner offers the scan first
p = os.path.join(D, 'home.html'); s = open(p).read()
s = put(s, '<p class="eyebrow">A routine made for you</p>', '<p class="eyebrow">New · AI skin scan</p>', 'home eyebrow')
s = put(s, "Five questions, two minutes. We'll build a morning and evening routine for your skin type, your concerns and Sri Lanka's climate.",
        "Take a selfie and our AI reads your skin, or answer 5 simple questions. Then we make a morning and night routine for you.", 'home text')
s = put(s, '<a class="btn-primary mt-10" href="quiz.html">Start the quiz</a>',
        '<div class="mt-10 flex flex-wrap justify-center gap-3"><a class="btn-primary" href="quiz.html?scan=1">Scan my skin</a><a class="btn-outline" href="quiz.html">Take the quiz</a></div>', 'home button')
open(p, 'w').write(s)

# The preview frame needs camera permission for the selfie
p = os.path.join(D, 'index.html'); s = open(p).read()
s = put(s, '<iframe id="site" src="home.html"', '<iframe id="site" allow="camera" src="home.html"', 'iframe camera')
open(p, 'w').write(s)
print('skinscan layer applied')
