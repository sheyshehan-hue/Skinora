# Keep the scroll position when going Back. Run after the other layers (any order among the later ones). Idempotent.
#   python3 build.py <site dir>
# The features layer (sk-feat-js) forced every page load to the top, including Back / Forward,
# so shoppers lost their place on long lists. This swaps that snippet for scrollback.js, which
# still opens new pages at the top but restores the saved position on Back / Forward / reload.
import os, sys

D = sys.argv[1]
HERE = os.path.dirname(os.path.abspath(__file__))
OLD = ("  // every new page opens at the top (unless the link points to a section)\n"
       "  try { if ('scrollRestoration' in history) history.scrollRestoration = 'manual'; } catch (e) {}\n"
       "  var toTop = function () { if (!location.hash) window.scrollTo(0, 0); };\n"
       "  document.addEventListener('DOMContentLoaded', toTop); window.addEventListener('pageshow', toTop);\n")
NEW = open(os.path.join(HERE, 'scrollback.js')).read()
if not NEW.endswith('\n'): NEW += '\n'
MARK = '// sk-scrollback:'

done = skip = fixed = 0
for root, _, files in os.walk(D):
    for f in files:
        if not f.endswith('.html'): continue
        p = os.path.join(root, f)
        s = open(p, encoding='utf-8').read()
        if 'id="sk-feat-js"' not in s: continue
        if MARK in s:
            # refresh an older copy of the snippet
            i = s.find('  ' + MARK); j = s.find('\n  })();\n', i) + len('\n  })();\n')
            n = s[:i] + NEW + s[j:]
            if n != s: open(p, 'w', encoding='utf-8').write(n); fixed += 1
            else: skip += 1
            continue
        if OLD not in s:
            print('scrollback: snippet not found in', os.path.relpath(p, D)); continue
        open(p, 'w', encoding='utf-8').write(s.replace(OLD, NEW, 1)); done += 1
print('scrollback: patched %d pages, refreshed %d, already current %d' % (done, fixed, skip))
