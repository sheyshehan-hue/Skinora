# AI face shape and style scan for the static Skinora site. Run after layer-skinscan (and the later layers). Idempotent.
#   python3 build.py <site dir>
# Face points are found in the browser with MediaPipe Face Landmarker. Its files are copied into
# <site>/vendor/mediapipe/ so the scan works without any outside server. They are downloaded once into
# ./vendor/ next to this script (about 18 MB) if they are not there yet.
import os, shutil, subprocess, sys, tarfile, tempfile, urllib.request

D = sys.argv[1]
HERE = os.path.dirname(os.path.abspath(__file__))
MP_VERSION = '1.2.0'  # @mediapipe/tasks-vision
MODEL_URL = 'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task'
VENDOR = os.path.join(HERE, 'vendor')
NEED = ['vision_bundle.mjs', 'wasm/vision_wasm_internal.js', 'wasm/vision_wasm_internal.wasm', 'face_landmarker.task']


def fetch_vendor():
    if all(os.path.exists(os.path.join(VENDOR, f)) for f in NEED):
        return
    os.makedirs(os.path.join(VENDOR, 'wasm'), exist_ok=True)
    tmp = tempfile.mkdtemp()
    subprocess.check_call(['npm', 'pack', '@mediapipe/tasks-vision@' + MP_VERSION, '--silent'], cwd=tmp)
    tgz = [f for f in os.listdir(tmp) if f.endswith('.tgz')][0]
    with tarfile.open(os.path.join(tmp, tgz)) as t:
        for f in NEED[:3]:
            src = t.extractfile('package/' + f)
            open(os.path.join(VENDOR, f), 'wb').write(src.read())
    urllib.request.urlretrieve(MODEL_URL, os.path.join(VENDOR, 'face_landmarker.task'))
    shutil.rmtree(tmp)


fetch_vendor()
out = os.path.join(D, 'vendor', 'mediapipe')
os.makedirs(os.path.join(out, 'wasm'), exist_ok=True)
for f in NEED:
    shutil.copyfile(os.path.join(VENDOR, f), os.path.join(out, f))

read = lambda f: open(os.path.join(HERE, f)).read()
JS = read('fs-engine.js') + '\n' + read('fs-data.js') + '\n' + read('fs-ui.js')
TAG = '<style id="sk-face-css">' + read('faceshape.css') + '</style><script id="sk-face-js">' + JS + '</script>'


def put(s, a, b, name):
    if b in s: return s
    if a not in s: sys.exit('faceshape: anchor missing for ' + name)
    return s.replace(a, b, 1)


def strip(s):
    i = s.find('<style id="sk-face-css">')
    if i >= 0:
        j = s.find('</script>', s.find('<script id="sk-face-js">')) + 9
        s = s[:i] + s[j:]
    return s


# Quiz and account pages: right after the skin scan script, so it can wrap SKSCAN.quiz.
# Works with or without the skin scan layer.
for f in ['quiz.html', 'account.html']:
    p = os.path.join(D, f); s = strip(open(p).read())
    i = s.find('<script id="sk-scan-js">')
    if i >= 0:
        j = s.find('</script>', i) + 9
        s = s[:j] + TAG + s[j:]
    else:
        s = put(s, '<script id="sk-feat-data"', TAG + '<script id="sk-feat-data"', f)
    open(p, 'w').write(s)

# Home page: the quiz banner offers the style scan too.
p = os.path.join(D, 'home.html'); s = open(p).read()
if 'quiz.html?face=1' in s:  # already applied
    pass
elif '<a class="btn-outline" href="quiz.html">Take the quiz</a></div>' in s:  # skin scan layer present
    s = put(s, '<a class="btn-outline" href="quiz.html">Take the quiz</a></div>',
            '<a class="btn-outline" href="quiz.html">Take the quiz</a><a class="btn-outline" href="quiz.html?face=1">Find my hairstyle</a></div>', 'home button')
else:
    s = put(s, '<a class="btn-primary mt-10" href="quiz.html">Start the quiz</a>',
            '<div class="mt-10 flex flex-wrap justify-center gap-3"><a class="btn-primary" href="quiz.html">Start the quiz</a><a class="btn-outline" href="quiz.html?face=1">New · Find my hairstyle</a></div>', 'home button')
open(p, 'w').write(s)
# The preview frame needs camera permission for the selfie.
p = os.path.join(D, 'index.html')
if os.path.exists(p):
    s = open(p).read()
    if '<iframe id="site" src="home.html"' in s:
        s = s.replace('<iframe id="site" src="home.html"', '<iframe id="site" allow="camera" src="home.html"', 1)
        open(p, 'w').write(s)
print('faceshape layer applied')
