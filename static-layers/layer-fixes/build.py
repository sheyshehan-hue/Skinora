# Small layout fixes for the static Skinora site. Run last. Idempotent.
#   python3 build.py <site dir>
# - Routine results (skin quiz, skin scan, account): each step's product card was set to the full height of
#   its column, so it ran past the step's own box and the "why" line under it overlapped the next row's
#   step number and title. The card now takes its natural height.
import os, re, sys

D = sys.argv[1]
CSS = ('<style id="sk-fix-css">'
       'li>p.mb-3+article[data-sk-card].h-full,li>p.mb-3+article.h-full{height:auto}'
       '</style>')
n = 0
for f in ['quiz.html', 'account.html', 'routine.html', 'diary.html']:
    p = os.path.join(D, f)
    if not os.path.exists(p):
        continue
    s = open(p, encoding='utf-8').read()
    s = re.sub(r'<style id="sk-fix-css">.*?</style>', '', s, flags=re.S)
    if '</head>' not in s:
        sys.exit('fixes: no </head> in ' + f)
    s = s.replace('</head>', CSS + '</head>', 1)
    open(p, 'w', encoding='utf-8').write(s); n += 1
print('fixes layer applied to %d pages' % n)
