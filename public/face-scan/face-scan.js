/* Skinora face engine: landmarks -> measurements. Shared by the face scan UI. */
(function () {
  'use strict';
  var ASSET = window.SKFACE_ASSETS || 'vendor/mediapipe/';
  var landmarker = null, loading = null;

  // Self-hosted files first (vendor/mediapipe/ on the store), then the public CDN. The model is checked
  // against the official MediaPipe face_landmarker.task (float16, v1) by SHA-256 before it is used.
  var CDN = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.2.0/';
  var MODEL_CDN = 'https://cdn.jsdelivr.net/npm/ptmaker-vision-models@1.0.0/face_landmarker.task';
  var MODEL_SHA = '64184e229b263107bc2b804c6625db1341ff2bb731874b0bcc2fe6544e0bc9ff';
  var hex = function (b) { return Array.prototype.map.call(new Uint8Array(b), function (x) { return ('0' + x.toString(16)).slice(-2); }).join(''); };
  function tryLoad(base, modelUrl) {
    return import(base + 'vision_bundle.mjs').then(function (mp) {
      return fetch(modelUrl).then(function (r) { if (!r.ok) throw new Error('model ' + r.status); return r.arrayBuffer(); })
        .then(function (buf) { return crypto.subtle.digest('SHA-256', buf).then(function (h) { if (hex(h) !== MODEL_SHA) throw new Error('model check failed'); return buf; }); })
        .then(function (buf) {
          return mp.FaceLandmarker.createFromOptions(
            { wasmLoaderPath: base + 'wasm/vision_wasm_internal.js', wasmBinaryPath: base + 'wasm/vision_wasm_internal.wasm' },
            { baseOptions: { modelAssetBuffer: new Uint8Array(buf), delegate: 'CPU' }, runningMode: 'IMAGE', numFaces: 2 });
        });
    });
  }
  function load() {
    if (landmarker) return Promise.resolve(landmarker);
    if (loading) return loading;
    // SKFACE_ASSETS = 'cdn' skips the self-hosted copy (stores that do not ship vendor/mediapipe).
    var local = ASSET === 'cdn' ? null : new URL(ASSET, document.baseURI).href;
    loading = (local ? tryLoad(local, local + 'face_landmarker.task') : Promise.reject(new Error('cdn only')))
      .catch(function () { return tryLoad(CDN, MODEL_CDN); })
      .then(function (l) { landmarker = l; return l; }, function (e) { loading = null; var x = new Error('The face scan could not start here.'); x.skfLoad = true; x.cause = e; throw x; });
    return loading;
  }

  var FACE_OVAL = [10, 338, 297, 332, 284, 251, 389, 356, 454, 323, 361, 288, 397, 365, 379, 378, 400, 377, 152, 148, 176, 149, 150, 136, 172, 58, 132, 93, 234, 127, 162, 21, 54, 103, 67, 109];

  // Pixel helpers
  function px(lm, i, W, H) { return { x: lm[i].x * W, y: lm[i].y * H }; }
  function d(a, b) { return Math.hypot(a.x - b.x, a.y - b.y); }
  function mid(a, b) { return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }; }

  // Look upward from the top of the mesh for where forehead skin turns into hair.
  function findHairline(ctx, W, H, P, frame) {
    var data = ctx.getImageData(0, 0, W, H).data;
    var at = function (x, y) {
      x = Math.round(x); y = Math.round(y);
      if (x < 0 || y < 0 || x >= W || y >= H) return null;
      var i = (y * W + x) * 4; return [data[i], data[i + 1], data[i + 2]];
    };
    var patch = function (p, r) {
      var s = [0, 0, 0], n = 0;
      for (var dy = -r; dy <= r; dy++) for (var dx = -r; dx <= r; dx++) { var c = at(p.x + dx, p.y + dy); if (c) { s[0] += c[0]; s[1] += c[1]; s[2] += c[2]; n++; } }
      return n ? [s[0] / n, s[1] / n, s[2] / n] : null;
    };
    var r = Math.max(2, Math.round(frame.unit * 0.02));
    var refs = [151, 9, 108, 337, 10].map(function (i) { return patch(P[i], r); }).filter(Boolean);
    var ref = [0, 1, 2].map(function (k) { return refs.reduce(function (t, c) { return t + c[k]; }, 0) / refs.length; });
    var dist = function (c) { return Math.hypot(c[0] - ref[0], c[1] - ref[1], c[2] - ref[2]); };
    // Natural spread of forehead skin colour, so the threshold adapts to light.
    var spread = refs.reduce(function (t, c) { return Math.max(t, dist(c)); }, 0);
    var thr = Math.max(38, spread * 2.2);
    var up = { x: -frame.v.x, y: -frame.v.y }, side = frame.u;
    var top = P[10], maxT = frame.unit * 0.75, hits = 0, start = frame.unit * 0.02;
    for (var t = start; t < maxT; t += 1) {
      var bad = 0, n = 0;
      for (var s = -3; s <= 3; s++) {
        var c = at(top.x + up.x * t + side.x * s * r, top.y + up.y * t + side.y * s * r);
        if (!c) continue; n++; if (dist(c) > thr) bad++;
      }
      if (!n) return { found: false, t: t };
      if (bad >= 5) { if (++hits >= 3) return { found: true, t: t - 2 }; } else hits = 0;
    }
    return { found: false, t: maxT };
  }

  function measure(canvas, lm) {
    var W = canvas.width, H = canvas.height;
    var P = lm.map(function (p) { return { x: p.x * W, y: p.y * H }; });
    // Frame: u along the eyes, v down the face. Corrects head tilt.
    var eR = mid(P[33], P[133]), eL = mid(P[362], P[263]);
    var ux = eL.x - eR.x, uy = eL.y - eR.y, ul = Math.hypot(ux, uy);
    var u = { x: ux / ul, y: uy / ul }, v = { x: -u.y, y: u.x };
    if ((P[152].x - P[10].x) * v.x + (P[152].y - P[10].y) * v.y < 0) v = { x: -v.x, y: -v.y };
    var o = mid(eR, eL);
    var U = function (p) { return (p.x - o.x) * u.x + (p.y - o.y) * u.y; };
    var V = function (p) { return (p.x - o.x) * v.x + (p.y - o.y) * v.y; };
    var wdt = function (a, b) { return Math.abs(U(P[a]) - U(P[b])); };
    var cheek = wdt(234, 454);
    var frame = { u: u, v: v, unit: cheek };

    var ctx = canvas.getContext('2d', { willReadFrequently: true });
    var hl = findHairline(ctx, W, H, P, frame);
    var meshTop = V(P[10]);
    var browV = (V(P[105]) + V(P[334]) + V(P[66]) + V(P[296])) / 4;
    var noseV = V(P[2]), chinV = V(P[152]);
    // When hair covers the forehead (a fringe) or there is no clear line, estimate from the mesh.
    var estHair = meshTop - (browV - meshTop) * 0.55;
    var hairV = hl.found ? meshTop - hl.t : estHair, hairlineFound = hl.found;
    if (hl.found && (meshTop - hairV) < (browV - meshTop) * 0.12) { hairV = estHair; hairlineFound = false; }
    var upper = browV - hairV, middle = noseV - browV, lower = chinV - noseV, total = chinV - hairV;

    var forehead = wdt(54, 284), temples = wdt(21, 251), jaw = wdt(172, 397), jawHi = wdt(58, 288), chin = wdt(148, 377);
    var eyeW = (d(P[33], P[133]) + d(P[362], P[263])) / 2, inner = d(P[133], P[362]);
    var noseW = wdt(64, 294), mouthW = d(P[61], P[291]);
    var pupils = (P[468] && P[473]) ? d(P[468], P[473]) : d(eR, eL);
    // Jaw corner angle: between the line down from the cheekbone and the line to the chin.
    var ang = function (a, b, c) {
      var v1 = { x: U(P[a]) - U(P[b]), y: V(P[a]) - V(P[b]) }, v2 = { x: U(P[c]) - U(P[b]), y: V(P[c]) - V(P[b]) };
      return Math.acos((v1.x * v2.x + v1.y * v2.y) / (Math.hypot(v1.x, v1.y) * Math.hypot(v2.x, v2.y))) * 180 / Math.PI;
    };
    var jawAngle = (ang(234, 172, 152) + ang(454, 397, 152)) / 2;
    var chinAngle = ang(172, 152, 397);
    // Pose checks
    var yaw = (U(P[1]) - (U(P[234]) + U(P[454])) / 2) / cheek;
    var roll = Math.atan2(uy, ux) * 180 / Math.PI;
    var pitch = (V(P[1]) - browV) / (chinV - browV); // nose tip position between brows and chin; ~0.4 when level

    return {
      W: W, H: H, P: P, frame: { u: u, v: v, o: o }, U: U, V: V,
      hairV: hairV, hairlineFound: hairlineFound, browV: browV, noseV: noseV, chinV: chinV, meshTop: meshTop,
      thirds: [upper / total, middle / total, lower / total],
      L: total / cheek, F: forehead / cheek, T: temples / cheek, J: jaw / cheek, JH: jawHi / cheek, C: chin / jaw,
      jawAngle: jawAngle, chinAngle: chinAngle,
      eyeGap: inner / eyeW, nose: noseW / inner, mouth: mouthW / pupils,
      widths: { forehead: forehead, cheek: cheek, jaw: jaw, chin: chin },
      yaw: yaw, roll: roll, pitch: pitch, FACE_OVAL: FACE_OVAL
    };
  }


  /* ---------- measurements -> face shape, traits ---------- */
  var PRI = { L: [1.42, 0.05], F: [0.85, 0.022], J: [0.81, 0.022], A: [137, 3.5], CA: [110, 6] };
  var PROTO = {
    oval: [0.6, 0.3, -0.3, 0, -0.2], round: [-1.4, 0, 0.6, 1.0, 0.6], square: [-0.8, 0.4, 1.4, -1.2, 0.8],
    heart: [0.1, 1.1, -1.1, 0.3, -1.2], long: [1.6, 0.2, 0.2, -0.2, 0], diamond: [0.4, -1.3, -0.9, 0.2, -0.6]
  };
  var WT = [1.3, 1, 1.1, 0.7, 0.6];
  function analyse(m) {
    var cl = function (x) { return Math.max(-3, Math.min(3, x)); };
    var z = { L: cl((m.L - PRI.L[0]) / PRI.L[1]), F: cl((m.F - PRI.F[0]) / PRI.F[1]), J: cl((m.J - PRI.J[0]) / PRI.J[1]), A: cl((m.jawAngle - PRI.A[0]) / PRI.A[1]), CA: cl((m.chinAngle - PRI.CA[0]) / PRI.CA[1]) };
    var vec = [z.L, z.F, z.J, z.A, z.CA], raw = {}, tot = 0;
    Object.keys(PROTO).forEach(function (k) {
      var d2 = PROTO[k].reduce(function (t, p, i) { return t + WT[i] * (vec[i] - p) * (vec[i] - p); }, 0);
      raw[k] = Math.exp(-d2 / 4); tot += raw[k];
    });
    var mix = Object.keys(raw).map(function (k) { return { shape: k, share: raw[k] / tot }; }).sort(function (a, b) { return b.share - a.share; });
    var T = [], add = function (id, strength) { T.push({ id: id, s: Math.abs(strength) }); };
    var lim = 0.7;
    if (z.L > lim) add('longFace', z.L); else if (z.L < -lim) add('shortFace', z.L);
    if (z.F > lim) add('wideForehead', z.F); else if (z.F < -lim) add('narrowForehead', z.F);
    if (z.J > lim) add('strongJaw', z.J); else if (z.J < -lim) add('narrowJaw', z.J);
    if (z.A < -lim) add('angularJaw', z.A); else if (z.A > lim) add('softJaw', z.A);
    if (z.CA < -lim) add('pointedChin', z.CA); else if (z.CA > lim) add('broadChin', z.CA);
    if (z.F < -0.4 && z.J < -0.4) add('cheekbones', Math.min(-z.F, -z.J) + 0.6);
    if (m.hairlineFound) {
      var t1 = m.thirds[0], t3 = m.thirds[2];
      if (t1 > 0.335) add('tallForehead', (t1 - 0.30) / 0.03); else if (t1 < 0.265) add('shortForehead', (0.30 - t1) / 0.03);
      if (t3 > 0.395) add('longLower', (t3 - 0.37) / 0.025); else if (t3 < 0.335) add('shortLower', (0.37 - t3) / 0.025);
    }
    if (m.eyeGap > 1.36) add('wideEyes', (m.eyeGap - 1.25) / 0.08); else if (m.eyeGap < 1.12) add('closeEyes', (1.25 - m.eyeGap) / 0.08);
    T.sort(function (a, b) { return b.s - a.s; });
    return { z: z, mix: mix, shape: mix[0].shape, second: mix[1].share > 0.22 ? mix[1].shape : null, traits: T.slice(0, 6) };
  }

  function detect(canvas) {
    return load().then(function (l) {
      var r = l.detect(canvas);
      var faces = (r && r.faceLandmarks) || [];
      if (!faces.length) return { faces: 0 };
      // Biggest face
      faces.sort(function (a, b) { var w = function (f) { return Math.abs(f[454].x - f[234].x); }; return w(b) - w(a); });
      return { faces: faces.length, m: measure(canvas, faces[0]) };
    });
  }

  window.SKFACE_ENGINE = { load: load, detect: detect, measure: measure, analyse: analyse };
})();
/* Skinora face shape and style guide: the content. Plain, simple English, like the rest of the store.
   Every suggestion says which of the customer's own features it works with. Nothing here rates a face. */
(function () {
  'use strict';

  var SHAPES = {
    oval: { name: 'Oval', line: 'Your face is a little longer than it is wide. Your forehead is slightly wider than your jaw, and your jaw curves softly to the chin.', goal: 'Your features are evenly spread, so most cuts work. Choose styles that keep your face on show.' },
    round: { name: 'Round', line: 'Your face is close to as wide as it is long, with soft, full cheeks and a jaw that curves gently.', goal: 'Styles that add a little height and length, and some clean lines, suit you best.' },
    square: { name: 'Square', line: 'Your forehead, cheekbones and jaw are close in width, and your jaw has clear, strong corners.', goal: { w: 'Soft layers and waves around the jaw balance its strong corners.', m: 'Short sides and neat lines show off your strong jaw.' } },
    heart: { name: 'Heart', line: 'Your forehead is the wide part of your face. It narrows down to a slimmer jaw and a finer chin.', goal: 'Styles that add fullness near the jaw and keep the top lighter bring it into balance.' },
    long: { name: 'Long', line: 'Your face is clearly longer than it is wide, and your forehead, cheekbones and jaw are close in width.', goal: 'Width at the sides and a fringe that shortens the forehead suit you. Skip a lot of height on top.' },
    diamond: { name: 'Diamond', line: 'Your cheekbones are the widest part of your face, with a narrower forehead and a finer jaw and chin.', goal: 'Styles that add fullness at the forehead and at the chin frame your cheekbones.' }
  };

  // Outline icons, 60 x 80
  var SHAPE_ICON = {
    oval: 'M30 6C45 6 52 22 52 40C52 60 42 74 30 74C18 74 8 60 8 40C8 22 15 6 30 6Z',
    round: 'M30 10C46 10 54 24 54 40C54 58 44 70 30 70C16 70 6 58 6 40C6 24 14 10 30 10Z',
    square: 'M12 10H48C51 10 53 12 53 15V58C53 66 46 72 38 72H22C14 72 7 66 7 58V15C7 12 9 10 12 10Z',
    heart: 'M30 74C22 70 10 56 8 38C7 22 14 8 30 8C46 8 53 22 52 38C50 56 38 70 30 74Z',
    long: 'M30 4C44 4 49 14 49 26V54C49 68 40 76 30 76C20 76 11 68 11 54V26C11 14 16 4 30 4Z',
    diamond: 'M30 6C38 6 44 18 52 36C46 56 38 74 30 74C22 74 14 56 8 36C16 18 22 6 30 6Z'
  };

  /* Traits: what stands out in this face, compared to most faces. Each comes from a measurement. */
  var TRAITS = {
    longFace: { name: 'Longer face', tip: 'Length is {L} times the width' },
    shortFace: { name: 'Shorter, wider face', tip: 'Length is {L} times the width' },
    wideForehead: { name: 'Wide forehead', tip: 'Forehead is {F} of your cheekbone width' },
    narrowForehead: { name: 'Narrower forehead', tip: 'Forehead is {F} of your cheekbone width' },
    strongJaw: { name: 'Wide, strong jaw', tip: 'Jaw is {J} of your cheekbone width' },
    narrowJaw: { name: 'Slim jaw', tip: 'Jaw is {J} of your cheekbone width' },
    angularJaw: { name: 'Defined jaw corners', tip: 'Jaw corner angle {A}°' },
    softJaw: { name: 'Soft, curved jawline', tip: 'Jaw corner angle {A}°' },
    pointedChin: { name: 'Fine, pointed chin', tip: 'Chin angle {CA}°' },
    broadChin: { name: 'Broad chin', tip: 'Chin angle {CA}°' },
    tallForehead: { name: 'Taller forehead', tip: 'Top third is {T1} of face length' },
    shortForehead: { name: 'Shorter forehead', tip: 'Top third is {T1} of face length' },
    longLower: { name: 'Longer lower face', tip: 'Lower third is {T3} of face length' },
    shortLower: { name: 'Shorter lower face', tip: 'Lower third is {T3} of face length' },
    cheekbones: { name: 'Cheekbones are your widest point', tip: 'Wider than forehead and jaw' },
    wideEyes: { name: 'Wide-set eyes', tip: 'Gap between eyes is {E} eye widths' },
    closeEyes: { name: 'Close-set eyes', tip: 'Gap between eyes is {E} eye widths' }
  };

  /* Haircuts. g: w (women) or m (men). tex: s straight, w wavy, c curly, k coily.
     fit: how well it suits each face shape (0 to 3). why: a reason for each trait it works with.
     not: traits it works against. ask: what to say to your stylist or barber. */
  var CUTS = [
    // ---------- Women ----------
    { id: 'curtain', does: 'The bangs open at the centre and sweep to the cheekbones, which frames the eyes and softens the forehead.', g: 'w', n: 'Curtain bangs with long layers', len: 'Long', tex: 'swc', art: { len: 112, fringe: 'curtain' },
      fit: { oval: 2, round: 1, square: 2, heart: 2, long: 3, diamond: 2 },
      why: { tallForehead: 'Your forehead is the tallest of your three face sections ({T1}). Curtain bangs cover the top of it, so the three look more even.',
        longFace: 'Your face is {L} times as long as it is wide. A fringe shortens it and adds width at the cheekbones.',
        angularJaw: 'The soft curves of the fringe and layers balance your defined jaw corners.',
        strongJaw: 'Layers that start at the cheekbones pull the eye up, away from the widest part of your jaw.',
        wideEyes: 'Bangs that part in the middle frame your wide-set eyes and draw attention to them.',
        cheekbones: 'The bangs end right at your cheekbones, your widest point, so they frame them.' },
      not: ['shortForehead'], ask: 'Curtain bangs that start at the bridge of the nose, blended into long layers from the cheekbones down.' },
    { id: 'layers', does: 'Long lengths with shorter pieces around the face add movement and draw the eye down.', g: 'w', n: 'Long face-framing layers', len: 'Long', tex: 'swck', art: { len: 116, fringe: 'mid' },
      fit: { oval: 2, round: 3, square: 3, heart: 2, long: 1, diamond: 2 },
      why: { shortFace: 'Your face is close to as wide as it is long ({L}). Length past the shoulders makes it look longer.',
        strongJaw: 'Layers that start below your jaw soften its width instead of sitting on it.',
        angularJaw: 'Soft layers around the jaw corners round off the strong lines.',
        cheekbones: 'The first layer starts at your cheekbones and shows them off.',
        softJaw: 'Long, sleek lengths add a clean vertical line to a soft jaw.' },
      not: ['longFace'], ask: 'Keep the length. Face-framing layers that start at the chin, and long layers through the back for movement.' },
    { id: 'lob', does: 'It ends just past the chin, which adds length to the face and keeps the jaw free.', g: 'w', n: 'Long bob (lob), slightly angled', len: 'Medium', tex: 'sw', art: { len: 100, fringe: 'side' },
      fit: { oval: 2, round: 3, square: 2, heart: 2, long: 1, diamond: 2 },
      why: { shortFace: 'A lob that ends 3 to 5 cm below the chin draws the eye down and makes a wider face look longer.',
        strongJaw: 'It ends below your jaw, not at it, so it does not add width where your face is already wide.',
        narrowJaw: 'Ends that flick out at the shoulders add width near your slimmer jaw.',
        pointedChin: 'Fullness at chin level balances your finer chin.',
        longLower: 'Movement around the jaw softens a longer lower face.' },
      not: [], ask: 'A lob a little longer at the front than the back, ending 3 to 5 cm below the chin, with soft ends.' },
    { id: 'bob', does: 'It puts width right at the jaw and chin.', g: 'w', n: 'Chin-length bob', len: 'Short', tex: 'sw', art: { len: 92, fringe: 'side', wide: 3 },
      fit: { oval: 2, round: 0, square: 0, heart: 3, long: 2, diamond: 3 },
      why: { narrowJaw: 'Your jaw is slimmer than your cheekbones ({J}). A bob puts volume right at the jaw to fill it out.',
        pointedChin: 'Fullness at chin level balances your finer chin.',
        wideForehead: 'The weight sits at the bottom of the cut, which balances your wider forehead.',
        longFace: 'A bob with width at the sides makes a long face look shorter.',
        cheekbones: 'A bob that ends at the chin fills in below your cheekbones, so the face looks evenly framed.' },
      not: ['shortFace', 'strongJaw', 'angularJaw'], ask: 'A bob that ends at the chin, with soft volume at the sides and a light side part.' },
    { id: 'sideswept', does: 'The fringe crosses the forehead at an angle, which breaks up width and adds a line.', g: 'w', n: 'Side-swept bangs, deep side part', len: 'Long', tex: 'sw', art: { len: 110, fringe: 'side' },
      fit: { oval: 1, round: 3, square: 2, heart: 3, long: 2, diamond: 2 },
      why: { wideForehead: 'A side-swept fringe covers part of your wider forehead and draws a line across it.',
        shortFace: 'The diagonal line of the fringe adds an angle and makes the face look longer.',
        tallForehead: 'The fringe covers some of your taller forehead ({T1}), so your face looks more even top to bottom.',
        softJaw: 'The sharp diagonal line adds definition to a soft jawline.',
        narrowForehead: 'Hair swept across the top adds width where your forehead is narrower.' },
      not: [], ask: 'A deep side part with a long fringe swept across the forehead, ending at the cheekbone.' },
    { id: 'pixie', does: 'It keeps the face fully open and lifts at the crown.', g: 'w', n: 'Textured pixie with side fringe', len: 'Short', tex: 'swk', art: { len: 64, fringe: 'pixie', top: 4 },
      fit: { oval: 3, round: 1, square: 0, heart: 2, long: 0, diamond: 2 },
      why: { cheekbones: 'Short hair puts your cheekbones, your widest point, fully on show.',
        wideEyes: 'With nothing around the face, your wide-set eyes become the focus.',
        pointedChin: 'Your fine chin and jaw look graceful with short hair.',
        narrowJaw: 'A short cut shows off your slim jaw.',
        shortFace: 'Keep some height at the crown to make the face look longer.' },
      not: ['longFace', 'strongJaw', 'angularJaw'], ask: 'A textured pixie, longer on top with a side fringe, short and soft around the ears.' },
    { id: 'shag', does: 'Layers add volume at the sides and around the cheekbones.', g: 'w', n: 'Soft shag with wispy layers', len: 'Medium', tex: 'wc', art: { len: 100, fringe: 'curtain', wide: 4, choppy: 1 },
      fit: { oval: 2, round: 1, square: 3, heart: 1, long: 3, diamond: 2 },
      why: { longFace: 'Volume at the sides makes your longer face look wider and shorter.',
        angularJaw: 'Choppy layers around the jaw soften its strong corners.',
        strongJaw: 'Layers break up the line at the jaw, so it looks softer.',
        narrowForehead: 'Volume at the temples fills out a narrower forehead.',
        tallForehead: 'The wispy fringe covers part of your taller forehead.' },
      not: ['shortFace'], ask: 'A soft shag: lots of layers through the crown and sides, and a wispy curtain fringe.' },
    { id: 'waves', does: 'Waves add width at the sides and soft movement around the face.', g: 'w', n: 'Shoulder-length waves', len: 'Medium', tex: 'wc', art: { len: 104, fringe: 'side', wide: 6, wavy: 1 },
      fit: { oval: 2, round: 1, square: 2, heart: 2, long: 3, diamond: 3 },
      why: { longFace: 'Waves add width at the sides, so a longer face looks more balanced.',
        narrowForehead: 'Waves that start at temple height fill out a narrower forehead.',
        narrowJaw: 'Fullness at jaw level adds width where your face is slimmer.',
        cheekbones: 'Waves around the face soften the width at the cheekbones.',
        angularJaw: 'Soft curves around the jaw balance its strong corners.' },
      not: [], ask: 'Shoulder-length hair with long layers, styled in loose waves from the cheekbones down.' },
    { id: 'curlybob', does: 'Curls sit at chin level and add round fullness at the bottom of the face.', g: 'w', n: 'Rounded curly bob', len: 'Short', tex: 'ck', art: { len: 92, fringe: 'none', wide: 8, curly: 1 },
      fit: { oval: 2, round: 0, square: 1, heart: 3, long: 3, diamond: 2 },
      why: { narrowJaw: 'Curls at chin level add the width that balances your slimmer jaw.',
        pointedChin: 'Round volume around the chin balances your finer chin.',
        longFace: 'The width of the curls makes a longer face look shorter.',
        wideForehead: 'The fullest part of the cut sits low, which balances your forehead.' },
      not: ['shortFace'], ask: 'A rounded bob cut dry, curl by curl, with the most volume at the jaw.' },
    { id: 'crown', does: 'Curls stack at the top to add height while the sides stay closer.', g: 'w', n: 'Curls with height at the crown', len: 'Medium', tex: 'ck', art: { len: 96, fringe: 'none', top: 10, wide: 2, curly: 1 },
      fit: { oval: 2, round: 3, square: 2, heart: 1, long: 0, diamond: 1 },
      why: { shortFace: 'Height at the crown makes your face look longer ({L}).',
        shortForehead: 'Lift at the roots makes a shorter forehead look taller.',
        softJaw: 'Tighter sides and height on top add shape to a soft jaw.',
        strongJaw: 'Volume on top balances the width of your jaw.' },
      not: ['longFace', 'tallForehead'], ask: 'Layers cut to stack curls at the crown, with the sides kept a little closer.' },
    { id: 'pony', does: 'Hair goes up and back, which lifts the face and shows its full shape.', g: 'w', n: 'Sleek high ponytail', len: 'Any', tex: 'swck', art: { len: 64, fringe: 'sleek', pony: 1 },
      fit: { oval: 3, round: 2, square: 1, heart: 1, long: 0, diamond: 2 },
      why: { cheekbones: 'Pulling hair up and back shows off your cheekbones.',
        shortFace: 'A high ponytail adds height, which makes the face look longer.',
        pointedChin: 'Hair off the face makes your fine chin and jaw a feature.',
        wideEyes: 'A sleek, lifted style opens up the eye area.' },
      not: ['longFace', 'wideForehead', 'tallForehead'], ask: 'For long hair: a sleek pony at crown height. Leave two thin face-framing pieces out if you want it softer.' },
    { id: 'fullbangs', does: 'A full fringe shortens the forehead and puts the focus on the eyes.', g: 'w', n: 'Full fringe that skims the brows', len: 'Long', tex: 'sw', art: { len: 112, fringe: 'full' },
      fit: { oval: 2, round: 0, square: 0, heart: 1, long: 3, diamond: 1 },
      why: { tallForehead: 'A full fringe covers your taller forehead ({T1}), so your three face sections look even.',
        longFace: 'A fringe across the forehead is the quickest way to make a long face look shorter.',
        wideEyes: 'A fringe that ends at the brows makes the eyes the focus.' },
      not: ['shortFace', 'shortForehead', 'strongJaw'], ask: 'A full, soft fringe that ends just at the brows, a little longer at the sides.' },

    // ---------- Women: trending now (2026) ----------
    { id: 'butterfly', hot: 'Seen on Sabrina Carpenter', does: 'Short, face-framing layers sit on top of long lengths, so you get the movement of a short cut and keep your length.', g: 'w', n: 'Butterfly cut', len: 'Long', tex: 'swc', art: { len: 116, fringe: 'curtain', wavy: 1 },
      fit: { oval: 3, round: 2, square: 3, heart: 2, long: 2, diamond: 3 },
      why: { angularJaw: 'The rounded, blown-out layers soften the corners of your jaw.',
        strongJaw: 'The volume sits at your cheekbones, which pulls the eye up from the width of your jaw.',
        cheekbones: 'The shortest layer ends right at your cheekbones, your widest point, and shows them off.',
        longFace: 'Volume at the sides adds width, so a longer face looks more balanced.',
        tallForehead: 'The shortest layers fall across the forehead, so the top of your face looks shorter.',
        narrowForehead: 'Layers swept out at the temples add width where your forehead is narrower.' },
      not: ['shortForehead'], ask: 'A butterfly cut: keep the length, shortest layers at the cheekbones blended into long layers, blow-dried round and out.' },
    { id: 'italianbob', hot: 'Seen on Hailey Bieber', does: 'A full, heavy bob that ends at the jaw, with the weight kept at the ends.', g: 'w', n: 'Italian bob', len: 'Short', tex: 'sw', art: { len: 84, fringe: 'side' },
      fit: { oval: 3, round: 1, square: 1, heart: 3, long: 3, diamond: 3 },
      why: { narrowJaw: 'The weight of the bob sits right at your jaw, which adds width where your face is slimmer.',
        pointedChin: 'Fullness at chin level balances your finer chin.',
        longFace: 'A thick bob at the jaw adds width and makes a longer face look shorter.',
        cheekbones: 'Fullness at the jaw balances your wide cheekbones.',
        wideForehead: 'Weight at the bottom balances your wider forehead.' },
      not: ['shortFace', 'strongJaw'], ask: 'An Italian bob: blunt and full at the ends, just below the jaw, with soft, bent ends and a deep side part.' },
    { id: 'frenchbob', hot: 'Seen on Margot Robbie', does: 'A short, tousled bob between the cheekbones and the jaw, usually worn with a fringe.', g: 'w', n: 'French bob with a soft fringe', len: 'Short', tex: 'swc', art: { len: 80, fringe: 'full' },
      fit: { oval: 3, round: 0, square: 1, heart: 2, long: 3, diamond: 2 },
      why: { longFace: 'Your face is {L} times as long as it is wide. The fringe and short length both make it look shorter.',
        tallForehead: 'Your forehead is the tallest of your three face sections ({T1}). The fringe covers it.',
        narrowJaw: 'Volume ends near your jaw, where your face is slimmer.',
        wideEyes: 'A fringe that ends at the brows makes your eyes the focus.' },
      not: ['shortFace', 'shortForehead', 'strongJaw'], ask: 'A French bob: just above the jaw at the front, soft texture, and a light fringe that touches the brows.' },
    { id: 'wolf', hot: 'Seen on Billie Eilish', does: 'A choppy mix of a shag and a mullet: lots of layers on top, longer and lighter at the back.', g: 'w', n: 'Wolf cut', len: 'Medium', tex: 'wc', art: { len: 96, fringe: 'mid', wavy: 1 },
      fit: { oval: 3, round: 2, square: 3, heart: 1, long: 2, diamond: 2 },
      why: { angularJaw: 'Choppy, broken-up layers soften your defined jaw corners.',
        strongJaw: 'Volume on top and at the cheekbones draws the eye away from your wider jaw.',
        shortFace: 'Height from the layers on top makes your face look longer.',
        softJaw: 'Texture at the sides adds shape around a soft jaw.' },
      not: ['narrowJaw', 'pointedChin'], ask: 'A wolf cut: short, choppy layers at the crown, curtain fringe, length kept at the back and thinned out.' },
    { id: 'bixie', hot: 'Seen on Zendaya', does: 'Between a pixie and a bob: short, with a bit more length and softness around the face.', g: 'w', n: 'Bixie (long pixie)', len: 'Short', tex: 'swc', art: { len: 72, fringe: 'pixie' },
      fit: { oval: 3, round: 1, square: 1, heart: 3, long: 1, diamond: 3 },
      why: { pointedChin: 'Your fine chin looks graceful with short hair.',
        narrowJaw: 'A slim jaw is shown off by a short, close shape.',
        cheekbones: 'A short cut puts your cheekbones on show.',
        wideEyes: 'With the hair short, your eyes become the focus.' },
      not: ['strongJaw', 'longFace', 'shortFace'], ask: 'A bixie: short at the nape, longer pieces around the ears and a long, side-swept fringe.' },

    // ---------- Men ----------
    { id: 'quiff', does: 'Height at the front adds length to the face, and short sides keep it neat.', g: 'm', n: 'Textured quiff', len: 'Short', tex: 'sw', art: { len: 62, fringe: 'quiff', top: 9, tight: 1 },
      fit: { oval: 3, round: 3, square: 2, heart: 0, long: 0, diamond: 1 },
      why: { shortFace: 'Your face is close to as wide as it is long ({L}). Height at the front makes it look longer.',
        strongJaw: 'Height on top balances the width of your jaw.',
        shortForehead: 'Lift at the front makes a shorter forehead look taller.',
        softJaw: 'Short sides and height on top give your face more shape.' },
      not: ['longFace', 'wideForehead', 'tallForehead'], ask: 'Short tapered sides, 7 to 10 cm on top, pushed up and back at the front with matte texture.' },
    { id: 'sidepart', does: 'A clean part and tapered sides give a balanced, classic frame.', g: 'm', n: 'Classic side part, tapered sides', len: 'Short', tex: 'sw', art: { len: 62, fringe: 'part', top: 4 },
      fit: { oval: 3, round: 2, square: 3, heart: 2, long: 1, diamond: 2 },
      why: { angularJaw: 'The clean part line matches the sharp corners of your jaw.',
        strongJaw: 'A neat, classic shape suits a strong, wide jaw.',
        wideForehead: 'The part line breaks up a wider forehead.',
        narrowForehead: 'Hair swept across from the part adds width at the temples.',
        shortFace: 'Keep a little lift at the front to add height.' },
      not: [], ask: 'A side part on your natural parting, scissor-cut on top, tapered (not faded) at the sides.' },
    { id: 'crew', does: 'It is short and even, so the shape of your face does the work.', g: 'm', n: 'Crew cut', len: 'Short', tex: 'swck', art: { len: 58, fringe: 'crew', top: 3, tight: 1 },
      fit: { oval: 3, round: 1, square: 3, heart: 1, long: 1, diamond: 1 },
      why: { strongJaw: 'Short sides put your strong jaw on show.',
        angularJaw: 'Clean, short lines match your defined jaw corners.',
        cheekbones: 'Short hair makes your cheekbones stand out.',
        shortLower: 'Keeping the top tidy and short balances a shorter lower face.' },
      not: [], ask: 'A crew cut: number 2 or 3 on the sides, a little longer on top, slightly longer at the front.' },
    { id: 'buzz', does: 'Almost no hair, so your face shape and features are the whole look.', g: 'm', n: 'Buzz cut', len: 'Very short', tex: 'swck', art: { len: 56, fringe: 'buzz', top: 0, tight: 1 },
      fit: { oval: 3, round: 1, square: 3, heart: 1, long: 1, diamond: 2 },
      why: { angularJaw: 'With almost no hair, your defined jaw becomes the main feature.',
        cheekbones: 'A buzz cut makes your cheekbones the focus.',
        strongJaw: 'Your strong jaw gives a buzz cut a clean, solid shape.',
        longFace: 'Pair it with a beard that is fuller at the sides to add width.' },
      not: ['shortFace'], ask: 'A number 2 to 4 all over, with a neat, natural neckline.' },
    { id: 'crop', does: 'The fringe comes forward, which shortens the forehead and adds texture at the top.', g: 'm', n: 'Textured crop with short fringe', len: 'Short', tex: 'swc', art: { len: 60, fringe: 'crop', top: 4, tight: 1 },
      fit: { oval: 2, round: 1, square: 2, heart: 3, long: 3, diamond: 3 },
      why: { longFace: 'Your face is longer ({L}). A forward fringe makes it look shorter.',
        tallForehead: 'A short fringe covers part of your taller forehead ({T1}).',
        wideForehead: 'A fringe pushed forward makes your wider forehead look narrower.',
        narrowForehead: 'Texture at the front adds fullness at the forehead.',
        cheekbones: 'The fringe adds width at the top to frame your cheekbones.' },
      not: ['shortForehead'], ask: 'A textured crop: skin or low fade at the sides, choppy texture on top, fringe cut straight just above the brows.' },
    { id: 'fringe', does: 'The fringe sweeps across the forehead, which softens it.', g: 'm', n: 'Side-swept fringe', len: 'Short to medium', tex: 'sw', art: { len: 66, fringe: 'side', top: 4 },
      fit: { oval: 2, round: 1, square: 1, heart: 3, long: 3, diamond: 2 },
      why: { wideForehead: 'A fringe swept across the forehead makes it look narrower.',
        tallForehead: 'It covers part of your taller forehead, so your face looks more even.',
        longFace: 'A fringe shortens a longer face.',
        pointedChin: 'Less width at the top balances your finer chin.' },
      not: ['shortForehead'], ask: 'Keep 8 to 10 cm at the front and sweep it to one side. Medium taper at the sides.' },
    { id: 'flow', does: 'Length around the ears and jaw adds width at the sides.', g: 'm', n: 'Medium-length flow', len: 'Medium', tex: 'wc', art: { len: 82, fringe: 'flow', top: 3, wide: 2 },
      fit: { oval: 2, round: 0, square: 1, heart: 3, long: 2, diamond: 3 },
      why: { narrowJaw: 'Length at the ears and jaw adds width at the bottom of your face, where it is slimmer.',
        pointedChin: 'Hair around the jaw balances your finer chin.',
        cheekbones: 'Hair behind the ears softens the width at your cheekbones.',
        longFace: 'Fullness at the sides makes a longer face look wider.' },
      not: ['shortFace'], ask: 'Grow it to the ears or jaw, with light layers. Tuck it behind the ears or push it back loosely.' },
    { id: 'fade', does: 'Very short sides and volume on top make the face look longer and slimmer.', g: 'm', n: 'High fade with textured top', len: 'Short', tex: 'swck', art: { len: 58, fringe: 'crop', top: 8, tight: 2 },
      fit: { oval: 2, round: 3, square: 1, heart: 0, long: 0, diamond: 0 },
      why: { shortFace: 'Very short sides and volume on top make your face look longer and slimmer.',
        softJaw: 'Tight sides add sharp lines to a soft jaw.',
        strongJaw: 'Short sides keep the focus on your jaw.' },
      not: ['longFace', 'narrowJaw', 'cheekbones'], ask: 'A high skin fade, with 5 to 7 cm of textured length on top.' },
    { id: 'slick', does: 'Hair combed back opens the face and shows its strong lines.', g: 'm', n: 'Slick back, short sides', len: 'Medium', tex: 'sw', art: { len: 60, fringe: 'slick', top: 6, tight: 1 },
      fit: { oval: 3, round: 1, square: 3, heart: 0, long: 0, diamond: 0 },
      why: { angularJaw: 'A sleek shape with your defined jaw makes a strong, polished look.',
        strongJaw: 'Combing the hair back balances a strong jaw.',
        shortForehead: 'With all the hair back, a shorter forehead looks taller.' },
      not: ['wideForehead', 'tallForehead', 'longFace'], ask: '10 to 12 cm on top to comb back, sides tapered short.' },
    { id: 'curlytop', does: 'Curls on top add height, and tight sides keep the shape clean.', g: 'm', n: 'Curly top with taper fade', len: 'Short', tex: 'ck', art: { len: 60, fringe: 'none', top: 7, tight: 1, curly: 1 },
      fit: { oval: 3, round: 2, square: 2, heart: 2, long: 1, diamond: 2 },
      why: { shortFace: 'Curls stacked on top add height and make the face look longer.',
        softJaw: 'Tight sides with curls on top add shape to a soft jaw.',
        narrowForehead: 'Curls at the front add width at the forehead.',
        angularJaw: 'The soft curls balance your sharp jaw lines.' },
      not: ['longFace'], ask: 'A low or mid taper, with 5 to 8 cm of curls on top cut dry so they keep their shape.' },
    { id: 'lineup', does: 'A short, even shape with sharp edges frames the face.', g: 'm', n: 'Short coils with a sharp line-up', len: 'Short', tex: 'k', art: { len: 58, fringe: 'buzz', top: 3, tight: 1, curly: 1 },
      fit: { oval: 3, round: 2, square: 3, heart: 2, long: 2, diamond: 2 },
      why: { angularJaw: 'A crisp line-up echoes your defined jaw corners.',
        strongJaw: 'Clean edges and a short shape suit a strong jaw.',
        softJaw: 'Sharp edges at the hairline and beard line add definition.' },
      not: [], ask: 'Even length on top, a taper at the sides, and a sharp line-up at the forehead and temples.' },
    // ---------- Men: trending now (2026) ----------
    { id: 'lowtaper', hot: 'Most requested at barbers', does: 'A soft fade that starts low at the ears and neck, with a textured top. Clean, but less harsh than a high fade.', g: 'm', n: 'Low taper fade, textured top', len: 'Short', tex: 'swck', art: { len: 62, fringe: 'crop', top: 5, tight: 1 },
      fit: { oval: 3, round: 2, square: 3, heart: 2, long: 2, diamond: 2 },
      why: { strongJaw: 'A low taper keeps some weight at the sides, so it doesn\'t make your jaw look wider.',
        angularJaw: 'Clean lines at the neck and ears match your defined jaw.',
        narrowForehead: 'Keeping the sides low and full adds width at the temples.',
        longFace: 'A low fade keeps width at the sides, which suits a longer face better than a high fade.' },
      not: [], ask: 'A low taper fade, starting just above the ear, with 5 to 7 cm of textured length on top.' },
    { id: 'mullet', hot: 'Seen on Paul Mescal', does: 'Short and textured at the front and sides, with extra length at the back.', g: 'm', n: 'Modern mullet', len: 'Short to medium', tex: 'swc', art: { len: 72, fringe: 'crop', tight: 1 },
      fit: { oval: 3, round: 1, square: 2, heart: 3, long: 1, diamond: 3 },
      why: { narrowJaw: 'Length at the back of the neck adds weight below your slimmer jaw.',
        pointedChin: 'Hair around the neck balances your finer chin.',
        cheekbones: 'Short, close sides show off your cheekbones.',
        wideForehead: 'A textured fringe breaks up a wider forehead.' },
      not: ['shortFace', 'strongJaw'], ask: 'A modern mullet: textured on top, tapered at the sides, about 5 cm longer at the back, kept soft.' },
    { id: 'frenchcrop', hot: 'Classic, back in fashion', does: 'Short all round, with a blunt fringe brushed forward.', g: 'm', n: 'French crop', len: 'Short', tex: 'swck', art: { len: 60, fringe: 'crop', top: 2, tight: 2 },
      fit: { oval: 3, round: 1, square: 3, heart: 2, long: 3, diamond: 2 },
      why: { tallForehead: 'The forward fringe covers part of your forehead, so the three sections of your face look even.',
        wideForehead: 'A straight fringe makes your wider forehead look narrower.',
        longFace: 'A fringe forward is the quickest way to make a longer face look shorter.',
        angularJaw: 'The straight fringe line matches the sharp corners of your jaw.' },
      not: ['shortForehead', 'shortFace'], ask: 'A French crop: short sides, 3 to 5 cm on top pushed forward, fringe cut straight across.' },
    { id: 'warrior', hot: 'Seen on Brad Pitt', does: 'Longer hair, chin to shoulder length, pushed back off the face and left loose.', g: 'm', n: 'Warrior cut (long, pushed back)', len: 'Medium to long', tex: 'swc', art: { len: 90, fringe: 'slick' },
      fit: { oval: 3, round: 0, square: 3, heart: 2, long: 1, diamond: 3 },
      why: { angularJaw: 'Long, loose hair around a strong jaw makes the jaw the focus.',
        strongJaw: 'Length past the jaw frames it instead of sitting on its widest point.',
        narrowJaw: 'Hair falling around the jaw adds width where your face is slimmer.',
        cheekbones: 'Pushed back off the face, the hair shows off your cheekbones.' },
      not: ['shortFace', 'longFace'], ask: 'Grow it to the chin or below. Long layers, pushed back with a light cream, ends left natural.' },
    { id: 'twoblock', hot: 'Seen on K-pop stars', does: 'Short, clipped sides under a longer, soft top that falls into a curtain fringe.', g: 'm', n: 'Two-block cut with curtain fringe', len: 'Short to medium', tex: 'sw', art: { len: 62, fringe: 'curtain', top: 3, tight: 1 },
      fit: { oval: 3, round: 2, square: 2, heart: 2, long: 3, diamond: 3 },
      why: { tallForehead: 'The curtain fringe covers the top of your forehead.',
        longFace: 'A fringe that falls forward makes a longer face look shorter.',
        wideForehead: 'Fringe parted at the centre breaks up a wider forehead.',
        cheekbones: 'The fringe ends near your cheekbones and frames them.',
        softJaw: 'Clean, short sides add shape around a soft jaw.' },
      not: ['shortForehead'], ask: 'A two-block: sides clipped short (no fade), 8 to 10 cm on top, parted in the middle into a curtain fringe.' }
  ];

  var BEARDS = [
    { id: 'stubble', does: 'A light shadow follows your jawline without changing its shape.', n: 'Designer stubble', art: 'stubble', fit: { oval: 3, round: 2, square: 3, heart: 2, long: 2, diamond: 2 },
      why: { angularJaw: 'Stubble shows the shape of your defined jaw without hiding it.', softJaw: 'A shadow along the jaw adds the look of more definition.', strongJaw: 'Light stubble keeps the focus on your strong jaw.' },
      not: [], ask: 'Keep it at 3 to 5 mm. Clean the neckline 2 fingers above the Adam\'s apple.' },
    { id: 'boxed', does: 'Short, straight lines frame the jaw and cheeks.', n: 'Short boxed beard', art: 'boxed', fit: { oval: 3, round: 2, square: 2, heart: 2, long: 3, diamond: 2 },
      why: { longFace: 'Keep the sides a little fuller and the chin short. This adds width to a longer face.', softJaw: 'Straight lines on the cheeks and jaw add the definition a soft jaw lacks.', narrowJaw: 'A boxed beard adds width at your jaw.' },
      not: [], ask: 'About 1 cm long, with sharp cheek lines and a straight neckline.' },
    { id: 'full', does: 'It adds fullness and width along the jaw and chin.', n: 'Full beard, rounded at the chin', art: 'full', fit: { oval: 2, round: 0, square: 2, heart: 3, long: 1, diamond: 3 },
      why: { narrowJaw: 'A full beard adds width at your jaw, where your face is slimmer.', pointedChin: 'It fills out a finer, pointed chin.', wideForehead: 'Weight at the bottom balances your wider forehead.', cheekbones: 'Fullness at the jaw balances your wide cheekbones.' },
      not: ['shortFace', 'longFace'], ask: 'Grow 6 to 8 weeks, then shape it rounded at the chin, a little shorter on the cheeks.' },
    { id: 'goatee', does: 'Hair at the chin only adds length to the lower face.', n: 'Goatee or anchor beard', art: 'goatee', fit: { oval: 2, round: 3, square: 2, heart: 0, long: 0, diamond: 1 },
      why: { shortFace: 'Length at the chin makes your face look longer.', shortLower: 'It adds length to a shorter lower face.', softJaw: 'A pointed shape at the chin adds definition.', broadChin: 'It narrows the look of a broad chin.' },
      not: ['longFace', 'longLower', 'pointedChin'], ask: 'Keep the chin 1 to 2 cm, with a moustache that connects or almost connects. Clean cheeks.' },
    { id: 'circle', does: 'A rounded shape around the mouth softens the jaw.', n: 'Circle beard', art: 'circle', fit: { oval: 2, round: 1, square: 3, heart: 1, long: 1, diamond: 1 },
      why: { angularJaw: 'A round beard around the mouth softens a square jaw.', strongJaw: 'It keeps the focus in the middle, not on the width of your jaw.', broadChin: 'The rounded shape softens a broad chin.' },
      not: [], ask: 'A moustache joined to a rounded chin beard, cheeks shaved clean.' },
    { id: 'chinstrap', does: 'A line along the jaw makes the jawline look sharper.', n: 'Short beard along the jaw', art: 'chinstrap', fit: { oval: 2, round: 2, square: 1, heart: 2, long: 2, diamond: 2 },
      why: { softJaw: 'A line along the jaw draws in definition where it is soft.', narrowJaw: 'A defined jaw line adds width to a slimmer jaw.' },
      not: ['angularJaw'], ask: 'A short beard that follows the jaw from ear to ear, about 1 cm wide.' },
    { id: 'clean', does: 'Nothing hides your jaw and chin.', n: 'Clean shave', art: 'clean', fit: { oval: 3, round: 0, square: 2, heart: 1, long: 1, diamond: 2 },
      why: { angularJaw: 'Your jaw lines are strong. A clean shave puts them fully on show.', cheekbones: 'A clean face makes your cheekbones stand out.', pointedChin: 'Shaved, your fine chin keeps its shape.' },
      not: ['softJaw', 'shortLower', 'shortFace'], ask: 'Shave with the grain, and calm the skin after.' },
    { id: 'balbo', hot: 'Seen on Robert Downey Jr.', does: 'A moustache and a chin beard that do not quite meet, with clean cheeks.', n: 'Balbo beard', art: 'goatee', fit: { oval: 3, round: 3, square: 2, heart: 1, long: 1, diamond: 2 },
      why: { shortFace: 'Length at the chin makes a wider face look longer.', broadChin: 'Shaped at the chin, it narrows the look of a broad chin.', softJaw: 'Clean, sharp lines add definition to a soft jaw.', shortLower: 'It adds length to a shorter lower face.' },
      not: ['longFace', 'longLower'], ask: 'A balbo: a moustache left separate from a 1 to 2 cm chin beard that runs along the jaw a little. Cheeks clean.' },
    { id: 'fadedbeard', hot: 'A top beard trend this year', does: 'The beard fades from skin at the sideburns into a short beard on the jaw and chin.', n: 'Faded beard', art: 'boxed', fit: { oval: 3, round: 3, square: 2, heart: 2, long: 2, diamond: 2 },
      why: { shortFace: 'Short at the cheeks and fuller at the chin, it makes your face look longer.', softJaw: 'The fade sharpens the line of a soft jaw.', angularJaw: 'Clean fading at the sides shows off your jaw corners.', strongJaw: 'Tight at the sides, it doesn\'t add more width to a wide jaw.' },
      not: [], ask: 'Fade the sideburns from skin into the beard. Keep the jaw about 5 mm and the chin about 1 cm.' }
  ];

  var PART = {
    w: { oval: 'Any parting works for you. A middle part with curtain bangs looks fresh. Side parts look polished.',
      round: 'Choose a deep side part, it adds an angle. Skip a short, straight-across fringe.',
      square: 'A soft side part, or a middle part with face-framing layers, softens the jaw.',
      heart: 'A side part with side-swept bangs balances a wider forehead.',
      long: 'Choose a fringe or curtain bangs. A middle part with flat sides makes the face look longer, so add volume at the sides.',
      diamond: 'A side part or a fringe adds width at the forehead, which frames your cheekbones.' },
    m: { oval: 'Any parting works. A natural side part is the easiest.',
      round: 'Push hair up and to the side, not forward. Skip a heavy, flat fringe.',
      square: 'A clean side part suits your jaw. Keep the sides short.',
      heart: 'Push the fringe forward or to the side, not straight back.',
      long: 'Bring the fringe forward. Avoid lots of height on top.',
      diamond: 'A fringe or forward texture adds width at the forehead.' }
  };

  var BROWS = {
    oval: 'A soft, angled arch. Follow your natural shape and keep it tidy.',
    round: 'A higher arch with a clear peak adds length to the face.',
    square: 'A rounded, curved arch softens the strong lines of the jaw.',
    heart: 'A low, rounded arch balances a wider forehead.',
    long: 'Flatter, straighter brows make the face look a little shorter.',
    diamond: 'A curved brow with a soft peak, a little longer at the tail, to widen the top of the face.'
  };
  var BROWS_M = 'Keep the natural thickness. Only tidy the hairs between the brows and the stray hairs underneath.';
  var BROW_TRAIT = {
    closeEyes: 'Your eyes are a little close-set, so start your brows in line with the inner corner of each eye, or a touch further out. This opens up the space between them.',
    wideEyes: 'Your eyes are wide-set, so fill in the start of your brows a little closer to the nose. This brings the eye area together.',
    tallForehead: 'A slightly higher arch fills more of a tall forehead.',
    shortForehead: 'Keep the arch low and soft, so it does not crowd a shorter forehead.'
  };

  // Contour and blush. Zones are drawn on her photo.
  var MAKEUP = {
    oval: { contour: 'Lightly, just under the cheekbones.', blush: 'On the apples of the cheeks, blended up toward the temples.', zones: ['underCheek', 'blushApple', 'hiCheek'] },
    round: { contour: 'Under the cheekbones and down the sides of the face, to add shape.', blush: 'Just above the apples, swept up toward the ears.', zones: ['underCheek', 'sides', 'blushUp', 'hiCheek', 'hiNose'] },
    square: { contour: 'On the corners of the jaw and the sides of the forehead, to soften them.', blush: 'In a round shape on the apples of the cheeks.', zones: ['jawCorner', 'temple', 'blushApple', 'hiCheek'] },
    heart: { contour: 'At the temples and the sides of the forehead. A little under the chin.', blush: 'Just below the cheekbones, blended out toward the ears.', zones: ['temple', 'underChin', 'blushLow', 'hiChin'] },
    long: { contour: 'Along the hairline and under the chin, to shorten the face.', blush: 'Straight across the cheeks, not up, to add width.', zones: ['hairline', 'underChin', 'blushFlat', 'hiCheek'] },
    diamond: { contour: 'Just under the widest point of the cheekbones.', blush: 'On the apples, blended in toward the nose.', zones: ['underCheek', 'blushApple', 'hiForehead', 'hiChin'] }
  };
  var MAKEUP_TRAIT = {
    longLower: 'Your lower face is longer ({T3}). Add a little shade just under the chin.',
    tallForehead: 'Your forehead is taller ({T1}). A soft shade along the hairline balances it.',
    strongJaw: 'Your jaw is wide ({J}). Blend contour along the jaw corners.',
    pointedChin: 'Highlight the centre of the chin to soften a fine chin.'
  };

  var TEXTURE = {
    s: { n: 'Straight', tip: 'Straight hair shows every line of the cut, so ask for soft, point-cut ends.' },
    w: { n: 'Wavy', tip: 'Let your waves do the work: scrunch in a light cream and air-dry, or diffuse on low heat.' },
    c: { n: 'Curly', tip: 'Ask for a dry cut, curl by curl, so the shape stays true once your curls spring up.' },
    k: { n: 'Coily', tip: 'Coily hair shrinks a lot, so plan length with your stylist. Keep it moisturised, and protect it at night.' }
  };

  // Shop the look: products from the catalogue, with what they do for this look.
  var SHOP = {
    w: [['mount-lai-rose-quartz-gua-sha-facial-lifting-tool', 'Sculpt along your cheekbones and jaw, the same lines as your contour map.'],
      ['glow-recipe-watermelon-glow-niacinamide-dew-drops', 'A dewy highlight on the top of your cheekbones.'],
      ['laneige-lip-sleeping-mask-berry', 'Soft, smooth lips to finish the look.'],
      ['la-roche-posay-anthelios-uvmune-400-invisible-fluid-spf50', 'A light SPF base that sits well under makeup.']],
    m: [['cerave-foaming-cleanser', 'Cleans skin and beard, and takes away oil.'],
      ['la-roche-posay-cicaplast-baume-b5', 'Calms skin after a shave or a beard trim.'],
      ['the-ordinary-niacinamide-10-zinc-1', 'Less shine on the forehead and nose.'],
      ['dior-sauvage-eau-de-toilette', 'A fresh scent to finish the look.']]
  };

  window.SKFACE_DATA = { SHAPES: SHAPES, SHAPE_ICON: SHAPE_ICON, TRAITS: TRAITS, CUTS: CUTS, BEARDS: BEARDS, PART: PART, BROWS: BROWS, BROWS_M: BROWS_M, BROW_TRAIT: BROW_TRAIT, MAKEUP: MAKEUP, MAKEUP_TRAIT: MAKEUP_TRAIT, TEXTURE: TEXTURE, SHOP: SHOP };
})();
/* Skinora face shape and style scan: the screens. Lives inside the skin quiz as a second scan.
   The photo stays in this browser: face points are found on the device, nothing is uploaded or saved.
   Only the face shape and the chosen style group are kept, in this browser. */
(function () {
  'use strict';
  if (window.SKFACE) return;
  var E = window.SKFACE_ENGINE, Dt = window.SKFACE_DATA;
  if (!E || !Dt) return;

  var GOLD = '#C6A15B';
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  var svg = function (p, w) { return '<svg xmlns="http://www.w3.org/2000/svg" width="' + (w || 16) + '" height="' + (w || 16) + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + p + '</svg>'; };
  var IC = {
    camera: '<path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/><circle cx="12" cy="13" r="3"/>',
    upload: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="m17 8-5-5-5 5"/><path d="M12 3v12"/>',
    back: '<path d="m12 19-7-7 7-7"/><path d="M19 12H5"/>',
    shield: '<path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/><path d="m9 12 2 2 4-4"/>',
    face: '<path d="M12 3c4.4 0 7 3.4 7 8.2 0 5.3-3.3 9.8-7 9.8s-7-4.5-7-9.8C5 6.4 7.6 3 12 3z"/><path d="M9 10h.01M15 10h.01"/><path d="M9.5 15c1.4 1 3.6 1 5 0"/>',
    check: '<path d="M20 6 9 17l-5-5"/>',
    x: '<path d="M18 6 6 18M6 6l12 12"/>',
    spark: '<path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z"/><path d="M19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8z"/>',
    scissors: '<circle cx="6" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><path d="M20 4 8.12 15.88M14.47 14.48 20 20M8.12 8.12 12 12"/>'
  };

  var save = function (r) { try { localStorage.setItem('skd-face', JSON.stringify({ at: Date.now(), shape: r.shape, second: r.second, gender: r.gender, traits: r.traits.map(function (t) { return t.id; }), texture: r.texture })); } catch (e) {} };
  var saved = function () { try { return JSON.parse(localStorage.getItem('skd-face') || 'null'); } catch (e) { return null; } };

  /* ---------- numbers for the reasons ---------- */
  function vals(m) {
    if (!m) return {};
    var pc = function (x) { return Math.round(x * 100) + '%'; };
    return { L: m.L.toFixed(2), F: pc(m.F), J: pc(m.J), A: Math.round(m.jawAngle), CA: Math.round(m.chinAngle), T1: pc(m.thirds[0]), T3: pc(m.thirds[2]), E: m.eyeGap.toFixed(1) };
  }
  var goal = function (S, g) { return typeof S.goal === 'string' ? S.goal : S.goal[g === 'm' ? 'm' : 'w']; };
  var fill = function (s, v) { return String(s).replace(/\{(\w+)\}/g, function (_, k) { return v[k] != null ? v[k] : ''; }); };

  /* ---------- ranking ---------- */
  function rank(list, r) {
    var has = {}; r.traits.forEach(function (t) { has[t.id] = t.s; });
    return list.map(function (c) {
      var s = (c.fit[r.shape] || 0) * 2 + (r.second ? (c.fit[r.second] || 0) * 0.6 : 0) + (c.hot && (c.fit[r.shape] || 0) >= 2 ? 1.5 : 0), reasons = [], against = [];
      Object.keys(c.why).forEach(function (k) { if (has[k] != null) { s += 1 + Math.min(has[k], 3) * 0.3; reasons.push({ t: k, s: has[k], text: c.why[k] }); } });
      (c.not || []).forEach(function (k) { if (has[k] != null) { s -= 2.5; against.push(k); } });
      reasons.sort(function (a, b) { return b.s - a.s; });
      // Match: how well it suits this face, from shape fit and features. The trend boost is left out.
      // Shape part: fit (0 to 3) for each shape in your mix, weighted by how much of it you have.
      var mix = r.mix && r.mix.length ? r.mix : [{ shape: r.shape, share: 1 }], tot = 0, sf = 0;
      mix.forEach(function (x) { sf += x.share * (c.fit[x.shape] || 0) / 3; tot += x.share; });
      sf = tot ? sf / tot : 0;
      // Feature part: how many of your stand-out features this style works with, and how strongly.
      var tw = 0, tm = 0;
      r.traits.forEach(function (t) { var w = Math.min(t.s || 1, 3); tw += w; if (c.why[t.id]) tm += w; });
      var tf = tw ? 0.55 + 0.45 * Math.min(1, tm / Math.max(tw * 0.5, 1)) : sf;
      var pct = Math.round(100 * (0.6 * sf + 0.4 * tf) - 14 * against.length);
      pct = Math.max(25, Math.min(97, pct));
      return { c: c, score: s, pct: pct, reasons: reasons, against: against };
    }).sort(function (a, b) { return b.score - a.score; });
  }

  /* ---------- line drawings of each style ---------- */
  function art(o, beard) {
    o = o || {};
    var len = o.len || 64, a = o.wide || 0, top = o.top || 0, ty = 36 - top, tight = o.tight || 0;
    var hair = '', front = '';
    if (len > 70) {
      var b = Math.min(10, (len - 70) / 4);
      hair = 'M50 ' + ty + 'C' + (29 - a) + ' ' + ty + ' ' + (24 - a) + ' 46 ' + (25 - a) + ' 64C' + (26 - a) + ' ' + (len - 22) + ' ' + (22 - a - b) + ' ' + (len - 8) + ' ' + (20 - a - b) + ' ' + len +
        'L40 ' + len + 'L41 90L59 90L60 ' + len + 'L' + (80 + a + b) + ' ' + len + 'C' + (78 + a + b) + ' ' + (len - 8) + ' ' + (74 + a) + ' ' + (len - 22) + ' ' + (75 + a) + ' 64C' + (76 + a) + ' 46 ' + (71 + a) + ' ' + ty + ' 50 ' + ty + 'Z';
    } else {
      var sx = tight === 2 ? 31.5 : tight ? 30.5 : 29;
      hair = 'M50 ' + ty + 'C' + (sx - 1) + ' ' + ty + ' ' + (sx - 2) + ' 44 ' + (sx - 1.5) + ' ' + Math.min(len, 66) + 'L' + (sx + 2) + ' ' + Math.min(len, 66) + 'Q' + (sx + 3) + ' 46 50 45Q' + (97 - sx) + ' 46 ' + (98 - sx) + ' ' + Math.min(len, 66) + 'L' + (101.5 - sx) + ' ' + Math.min(len, 66) + 'C' + (102 - sx) + ' 44 ' + (101 - sx) + ' ' + ty + ' 50 ' + ty + 'Z';
      if (len > 66) hair += 'M' + (sx - 1.5) + ' 62C' + (sx - 3) + ' 70 ' + (sx - 2) + ' ' + len + ' ' + (sx + 1) + ' ' + len + 'L' + (sx + 3) + ' 62ZM' + (101.5 - sx) + ' 62C' + (103 - sx) + ' 70 ' + (102 - sx) + ' ' + len + ' ' + (99 - sx) + ' ' + len + 'L' + (97 - sx) + ' 62Z';
    }
    var F = {
      mid: 'M50 40C42 41 34 48 31 60C36 51 43 46 50 44C57 46 64 51 69 60C66 48 58 41 50 40Z',
      curtain: 'M50 40C41 41 32 48 30 62C34 54 40 50 47 48L50 43L53 48C60 50 66 54 70 62C68 48 59 41 50 40Z',
      side: 'M58 39C44 39 33 46 30 60C37 52 47 50 66 52C70 50 71 47 70 45C67 41 63 39 58 39Z',
      full: 'M50 38C37 38 30 44 30 55L70 55C70 44 63 38 50 38Z',
      pixie: 'M60 37C46 37 33 42 31 56C38 49 49 49 64 50C70 48 71 43 68 40C66 38 63 37 60 37Z',
      sleek: 'M50 38C40 38 33 43 31 52C38 45 44 43 50 43C56 43 62 45 69 52C67 43 60 38 50 38Z',
      quiff: 'M38 41C40 30 52 23 64 27C70 30 70 36 68 42C60 38 48 38 38 41Z',
      part: 'M58 38C47 37 36 41 32 50C40 44 50 43 66 45C68 43 68 40 66 39ZM58 38L57 33',
      crew: 'M36 42C42 37 58 37 64 42C58 40 42 40 36 42Z',
      buzz: '',
      crop: 'M33 44C38 37 62 37 67 44L67 49C60 46 40 46 33 49Z',
      slick: 'M36 43C42 32 60 31 66 40C58 37 46 37 36 43Z',
      flow: 'M56 37C44 37 34 44 31 56C37 49 46 47 62 48C68 47 70 44 69 41C66 38 61 37 56 37Z',
      none: ''
    };
    front = F[o.fringe] || '';
    var curly = o.curly ? ' stroke="currentColor" stroke-opacity=".9" stroke-width="5" stroke-linecap="round" stroke-dasharray="0 5.5"' : '';
    var wavy = o.wavy ? ' stroke="currentColor" stroke-opacity=".5" stroke-width="2.4" stroke-dasharray="3 3"' : '';
    var B = {
      stubble: '<path d="M30 66C31 82 40 92 50 92C60 92 69 82 70 66C66 74 62 80 50 80C38 80 34 74 30 66Z" fill="currentColor" opacity=".22"/>',
      boxed: '<path d="M30 64C30 84 40 95 50 95C60 95 70 84 70 64L67 64C66 74 60 79 55 79L45 79C40 79 34 74 33 64Z" fill="currentColor" opacity=".82"/><path d="M42 75Q50 72 58 75L58 77Q50 75 42 77Z" fill="currentColor" opacity=".82"/>',
      full: '<path d="M29 62C28 88 40 101 50 101C60 101 72 88 71 62L67 62C66 74 60 80 55 80L45 80C40 80 34 74 33 62Z" fill="currentColor" opacity=".85"/><path d="M41 75Q50 71 59 75L59 78Q50 75 41 78Z" fill="currentColor" opacity=".85"/>',
      goatee: '<path d="M43 76Q50 72 57 76L57 78Q50 76 43 78Z" fill="currentColor" opacity=".85"/><path d="M44 84C44 92 47 96 50 96C53 96 56 92 56 84C54 86 46 86 44 84Z" fill="currentColor" opacity=".85"/>',
      circle: '<path d="M42 76Q50 72 58 76L58 78Q50 76 42 78Z" fill="currentColor" opacity=".85"/><path d="M42 77C40 88 45 94 50 94C55 94 60 88 58 77L56 77C56 84 53 87 50 87C47 87 44 84 44 77Z" fill="currentColor" opacity=".85"/>',
      chinstrap: '<path d="M30 64C30 84 40 93 50 93C60 93 70 84 70 64L68 64C67 80 59 89 50 89C41 89 33 80 32 64Z" fill="currentColor" opacity=".85"/>',
      clean: ''
    };
    var face = '<ellipse cx="50" cy="64" rx="19.5" ry="26" fill="var(--sk-paper,#FBF8F3)" stroke="currentColor" stroke-width="1.1"/>' +
      '<path d="M41 58q3-1.6 6 0M53 58q3-1.6 6 0" stroke="currentColor" stroke-width="1" fill="none" stroke-linecap="round"/><circle cx="44" cy="62" r=".9" fill="currentColor"/><circle cx="56" cy="62" r=".9" fill="currentColor"/>' +
      '<path d="M50 63v7.5l-1.8 1" stroke="currentColor" stroke-width=".8" fill="none" stroke-linecap="round" opacity=".6"/><path d="M45.5 79q4.5 2 9 0" stroke="currentColor" stroke-width=".9" fill="none" stroke-linecap="round"/>';
    var body = '<path d="M43 88v9M57 88v9M16 120c3-14 13-21 27-23M84 120c-3-14-13-21-27-23" stroke="currentColor" stroke-width="1.1" fill="none" stroke-linecap="round"/>';
    var pony = o.pony ? '<path d="M50 34C58 26 70 24 74 30C70 30 66 34 64 40C66 50 72 58 70 72C64 62 58 50 56 40Z" fill="currentColor" opacity=".85"/>' : '';
    return '<svg viewBox="0 0 100 120" class="skf-art" aria-hidden="true">' + body + pony +
      (hair ? '<path d="' + hair + '" fill="currentColor" opacity=".85"' + (curly || wavy) + '/>' : '') + face +
      (beard ? (B[beard] || '') : '') +
      (front ? '<path d="' + front + '" fill="currentColor" opacity=".92"' + curly + '/>' : '') + '</svg>';
  }
  var shapeIcon = function (k, w) { return '<svg viewBox="0 0 60 80" width="' + (w || 30) + '" height="' + Math.round((w || 30) * 4 / 3) + '" aria-hidden="true"><path d="' + Dt.SHAPE_ICON[k] + '" fill="none" stroke="currentColor" stroke-width="2.2"/></svg>'; };

  /* ---------- overlay on the photo ---------- */
  function overlay(m, mode, shape) {
    var W = m.W, H = m.H, f = m.frame, P = m.P;
    var X = function (U, V) { return { x: f.o.x + f.u.x * U + f.v.x * V, y: f.o.y + f.u.y * U + f.v.y * V }; };
    var n = function (v) { return Math.round(v * 10) / 10; };
    var cheek = m.widths.cheek, fs = Math.max(11, W * 0.032), sw = Math.max(1.2, W * 0.0028);
    // Face outline: the mesh oval, with its top lifted to the hairline.
    var top = m.meshTop, eyeV = 0, pts = m.FACE_OVAL.map(function (i) {
      var U = m.U(P[i]), V = m.V(P[i]);
      if (V < eyeV) { var w = (eyeV - V) / (eyeV - top); V = V - (top - m.hairV) * Math.pow(w, 1.4); }
      return X(U, V);
    });
    var path = (function (p) {
      var s = 'M' + n(p[0].x) + ' ' + n(p[0].y), L = p.length;
      for (var i = 0; i < L; i++) {
        var p0 = p[(i - 1 + L) % L], p1 = p[i], p2 = p[(i + 1) % L], p3 = p[(i + 2) % L];
        s += 'C' + n(p1.x + (p2.x - p0.x) / 6) + ' ' + n(p1.y + (p2.y - p0.y) / 6) + ' ' + n(p2.x - (p3.x - p1.x) / 6) + ' ' + n(p2.y - (p3.y - p1.y) / 6) + ' ' + n(p2.x) + ' ' + n(p2.y);
      }
      return s + 'Z';
    })(pts);
    var minU = m.U(P[234]), maxU = m.U(P[454]), midU = (m.U(P[168]) + m.U(P[152])) / 2;
    var line = function (a, b, cls, extra) { return '<line x1="' + n(a.x) + '" y1="' + n(a.y) + '" x2="' + n(b.x) + '" y2="' + n(b.y) + '" class="' + cls + '"' + (extra || '') + '/>'; };
    var label = function (p, text, anchor) {
      var tw = String(text).length * fs * 0.56, x = p.x, y = Math.max(fs + 4, Math.min(H - 6, p.y));
      anchor = anchor || 'start';
      if (anchor === 'start' && x + tw > W - 4) { x = W - 4; anchor = 'end'; }
      if (anchor === 'end' && x - tw < 4) { x = 4; anchor = 'start'; }
      return '<text x="' + n(x) + '" y="' + n(y) + '" text-anchor="' + anchor + '" class="skf-lbl" font-size="' + n(fs) + '">' + esc(text) + '</text>';
    };
    var out = '<svg viewBox="0 0 ' + W + ' ' + H + '" class="skf-ov" style="--sw:' + n(sw) + 'px" aria-hidden="true">';
    if (mode === 'makeup') {
      var zones = Dt.MAKEUP[shape].zones, ell = function (c, rx, ry, rot, col, op) { return '<ellipse cx="' + n(c.x) + '" cy="' + n(c.y) + '" rx="' + n(rx * 1.35) + '" ry="' + n(ry * 1.35) + '" transform="rotate(' + n(rot) + ' ' + n(c.x) + ' ' + n(c.y) + ')" fill="url(#skf-g' + (col === C ? 'c' : col === B ? 'b' : 'h') + ')" opacity="' + op + '"/>' +
        '<ellipse cx="' + n(c.x) + '" cy="' + n(c.y) + '" rx="' + n(rx * 1.05) + '" ry="' + n(ry * 1.05) + '" transform="rotate(' + n(rot) + ' ' + n(c.x) + ' ' + n(c.y) + ')" class="skf-zone-edge" stroke="' + (col === C ? '#F3E2BE' : col === B ? '#FFD6DE' : '#FFFFFF') + '"/>'; };
      var deg = Math.atan2(f.u.y, f.u.x) * 180 / Math.PI, lerp = function (a, b, t) { return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t }; };
      var C = '#9A5B3A', B = '#E0637A', HL = '#FFF6E0', zs = '';
      var grad = function (id, col) { return '<radialGradient id="skf-g' + id + '"><stop offset="0" stop-color="' + col + '" stop-opacity="1"/><stop offset=".55" stop-color="' + col + '" stop-opacity=".7"/><stop offset="1" stop-color="' + col + '" stop-opacity="0"/></radialGradient>'; };
      out += '<defs>' + grad('c', C) + grad('b', B) + grad('h', HL) + '</defs>';
      // Zones are placed in the face's own frame (u across, v down from between the eyes), so they follow tilt.
      var hw = cheek / 2, nV = m.noseV, cU = m.U(P[152]), jawV = (m.V(P[172]) + m.V(P[397])) / 2, has = function (z) { return zones.indexOf(z) >= 0; };
      var c0 = (m.U(P[234]) + m.U(P[454])) / 2, at = function (s, iR, iL, fr) { return c0 + (m.U(P[s > 0 ? iL : iR]) - c0) * fr; };
      [1, -1].forEach(function (s) {
        var hs = Math.abs(m.U(P[s > 0 ? 454 : 234]) - c0) * s; // this side's half width (signed)
        if (has('underCheek') || has('sides')) zs += ell(X(c0 + hs * 0.6, nV * 0.88), hw * 0.3, hw * 0.08, deg - 20 * s, C, 0.55);
        if (has('sides')) zs += ell(X(c0 + hs * 0.76, nV * 0.95), hw * 0.06, hw * 0.32, deg, C, 0.55);
        if (has('jawCorner')) zs += ell(X(at(s, 172, 397, 0.74), jawV - hw * 0.12), hw * 0.14, hw * 0.07, deg - 50 * s, C, 0.55);
        if (has('temple')) zs += ell(X(at(s, 54, 284, 0.78), m.browV - (m.browV - m.hairV) * 0.45), hw * 0.08, hw * 0.22, deg, C, 0.55);
        if (has('blushApple')) zs += ell(X(c0 + hs * 0.48, nV * 0.72), hw * 0.17, hw * 0.13, deg, B, 0.5);
        if (has('blushUp')) zs += ell(X(c0 + hs * 0.6, nV * 0.55), hw * 0.25, hw * 0.09, deg - 25 * s, B, 0.5);
        if (has('blushLow')) zs += ell(X(c0 + hs * 0.62, nV * 0.82), hw * 0.23, hw * 0.08, deg - 12 * s, B, 0.5);
        if (has('blushFlat')) zs += ell(X(c0 + hs * 0.52, nV * 0.68), hw * 0.27, hw * 0.09, deg, B, 0.5);
        if (has('hiCheek')) zs += ell(X(c0 + hs * 0.55, nV * 0.36), hw * 0.17, hw * 0.05, deg - 18 * s, HL, 0.8);
      });
      if (has('hairline')) zs += ell(X(0, m.hairV + (m.browV - m.hairV) * 0.08), hw * 0.55, hw * 0.08, deg, C, 0.55);
      if (has('underChin')) zs += ell(X(cU, m.chinV), hw * 0.3, hw * 0.07, deg, C, 0.55);
      if (has('hiNose')) zs += ell(X(m.U(P[6]), nV * 0.45), hw * 0.04, hw * 0.2, deg, HL, 0.75);
      if (has('hiForehead')) zs += ell(X(0, (m.hairV + m.browV) / 2), hw * 0.18, hw * 0.12, deg, HL, 0.7);
      if (has('hiChin')) zs += ell(X(cU, m.chinV - hw * 0.12), hw * 0.1, hw * 0.07, deg, HL, 0.7);
      out += '<g class="skf-zones">' + zs + '</g><path d="' + path + '" class="skf-line skf-faint"/>';
      return out + '</svg>';
    }
    out += '<path d="' + path + '" class="skf-line skf-draw" pathLength="1"/>';
    var top2 = X(midU, m.hairV - (m.chinV - m.hairV) * 0.07), bot2 = X(midU, m.chinV + (m.chinV - m.hairV) * 0.05);
    out += line(top2, bot2, 'skf-dash');
    // Thirds
    var lx = minU - cheek * 0.12, rx = maxU + cheek * 0.04, rows = [m.hairV, m.browV, m.noseV, m.chinV];
    rows.forEach(function (V, i) { out += line(X(lx, V), X(rx, V), 'skf-dash skf-fade', ' style="animation-delay:' + (0.5 + i * 0.12) + 's"') + '<circle cx="' + n(X(midU, V).x) + '" cy="' + n(X(midU, V).y) + '" r="' + n(sw * 1.8) + '" class="skf-dot"/>'; });
    var names = ['Upper', 'Middle', 'Lower'];
    for (var i = 0; i < 3; i++) {
      var a = X(lx, rows[i]), b = X(lx, rows[i + 1]), c = X(lx - cheek * 0.02, (rows[i] + rows[i + 1]) / 2);
      out += line(a, b, 'skf-line skf-fade', ' style="animation-delay:' + (0.9 + i * 0.12) + 's"');
      out += label({ x: c.x - fs * 0.3, y: c.y - fs * 0.15 }, names[i], 'end') + label({ x: c.x - fs * 0.3, y: c.y + fs * 1.05 }, Math.round(m.thirds[i] * 100) + '%', 'end');
    }
    // Widths
    [[54, 284, 'Forehead', m.F], [234, 454, 'Cheekbones', 1], [172, 397, 'Jaw', m.J]].forEach(function (w, i) {
      var Va = (m.V(P[w[0]]) + m.V(P[w[1]])) / 2, a = X(m.U(P[w[0]]), Va), b = X(m.U(P[w[1]]), Va);
      out += line(a, b, 'skf-solid skf-fade', ' style="animation-delay:' + (1.2 + i * 0.15) + 's"') + '<circle cx="' + n(a.x) + '" cy="' + n(a.y) + '" r="' + n(sw * 2) + '" class="skf-dot"/><circle cx="' + n(b.x) + '" cy="' + n(b.y) + '" r="' + n(sw * 2) + '" class="skf-dot"/>';
      out += label({ x: b.x + fs * 0.5, y: b.y + fs * 0.35 }, w[2] + ' ' + Math.round(w[3] * 100) + '%');
    });
    // Key points
    [33, 133, 362, 263, 64, 294, 61, 291, 152].forEach(function (k) { out += '<circle cx="' + n(P[k].x) + '" cy="' + n(P[k].y) + '" r="' + n(sw * 1.5) + '" class="skf-dot skf-fade" style="animation-delay:1.5s"/>'; });
    var lw = X(maxU + cheek * 0.04, m.chinV);
    out += label({ x: lw.x + fs * 0.5, y: lw.y - fs * 0.2 }, 'Length ' + m.L.toFixed(2) + ' × width');
    return out + '</svg>';
  }
  function pointsSVG(m) {
    var o = '<svg viewBox="0 0 ' + m.W + ' ' + m.H + '" class="skf-ov skf-mesh" aria-hidden="true">';
    for (var i = 0; i < m.P.length; i += 2) o += '<circle cx="' + Math.round(m.P[i].x) + '" cy="' + Math.round(m.P[i].y) + '" r="' + Math.max(1, m.W * 0.0024) + '" style="animation-delay:' + ((m.P[i].y / m.H) * 0.9).toFixed(2) + 's"/>';
    return o + '</svg>';
  }

  /* ---------- the screens ---------- */
  // Options when mounted by another app (the Next.js store): onBack, products, addToCart, productHref.
  var OPT = {};
  function attach(host) {
    if (host.__skfBound) return;
    host.__skfBound = 1;
    var tryCache = {}, tryBusy = {}, tryErr = {}, tryOk = false, tryPending = null;
    var stream = null, consent = false, gender = null, preview = null, error = null, R = null, texture = null, view = 'lines', full = false;
    var stop = function () { if (stream) stream.getTracks().forEach(function (t) { t.stop(); }); stream = null; };
    var wrap = function (h) { host.className = 'container-lux flex min-h-[78vh] flex-col items-center justify-center py-16'; host.innerHTML = '<div class="w-full max-w-2xl">' + h + '</div>'; window.scrollTo(0, 0); };
    var head = function (label) { return '<div class="mb-10 flex items-center gap-4"><button data-f="back" aria-label="Back">' + svg(IC.back, 18) + '</button><p class="eyebrow">' + label + '</p></div>'; };
    var G = function () { return gender === 'm' ? 'm' : 'w'; };

    function intro() {
      stop();
      wrap(head('AI face shape and style') +
        '<div class="animate-fadeUp"><h1 class="text-balance font-serif text-4xl font-light leading-tight sm:text-5xl">Find the hairstyle made for your face</h1>' +
        '<p class="mt-5 text-ink-600">Take a selfie. We map 478 points on your face, measure its shape and proportions, then show the haircuts, ' +
        'brows and finishing touches that suit you, and say why each one works for your features.</p>' +
        '<p class="mt-8 text-[11px] uppercase tracking-[0.18em] text-ink-500">Show me styles for</p>' +
        '<div class="skf-seg mt-3" role="radiogroup">' + [['w', 'Women'], ['m', 'Men']].map(function (g) { return '<button role="radio" aria-checked="' + (gender === g[0]) + '" data-f="g-' + g[0] + '" class="' + (gender === g[0] ? 'is-on' : '') + '">' + g[1] + '</button>'; }).join('') + '</div>' +
        '<ul class="sks-tips">' + ['Look straight at the camera, face level', 'Hair off your face and forehead, glasses off', 'Soft, even light from the front, no filters'].map(function (t, i) { return '<li><span class="font-serif text-xl text-champagne-700">0' + (i + 1) + '</span><br>' + t + '</li>'; }).join('') + '</ul>' +
        '<label class="sks-consent"><input type="checkbox" data-f="consent"' + (consent ? ' checked' : '') + '><span>I agree to use my photo for this scan. It is checked on this device only. It is never uploaded or saved. Only my face shape is kept, in this browser.</span></label>' +
        (error ? '<p role="alert" class="sks-error">' + esc(error) + '</p>' : '') +
        '<div class="mt-8 grid gap-3 sm:grid-cols-2"><button data-f="camera" class="btn-primary">' + svg(IC.camera) + ' Take a selfie</button><button data-f="upload" class="btn-outline">' + svg(IC.upload) + ' Upload a photo</button></div>' +
        '<p role="alert" class="skf-need" data-f-need hidden></p>' +
        '<input type="file" accept="image/*" data-f="file" hidden><input type="file" accept="image/*" capture="user" data-f="selfie" hidden>' +
        '<p class="mt-6 flex items-center gap-2 text-xs text-ink-400">' + svg(IC.shield, 14) + ' Private. Your photo never leaves your phone or computer.</p>' +
        '<button data-f="pick" class="mt-4 text-[11px] uppercase tracking-[0.16em] text-ink-500 underline-offset-4 hover:text-ink hover:underline">No photo? Choose your face shape</button></div>');
      E.load().catch(function () {}); // start loading the face model while she reads
    }
    function refreshButtons() { var n = host.querySelector('[data-f-need]'); if (n && consent && gender) n.hidden = true; }
    // Says what is still missing, and points at it, instead of a greyed-out button.
    function ready() {
      if (consent && gender) return true;
      var n = host.querySelector('[data-f-need]'), target = !gender ? host.querySelector('.skf-seg') : host.querySelector('.sks-consent');
      if (n) { n.textContent = !gender ? 'First choose Women or Men, so we show the right styles.' : 'Please tick the box to agree, then take your photo.'; n.hidden = false; }
      if (target) { target.classList.remove('skf-nudge'); void target.offsetWidth; target.classList.add('skf-nudge'); target.scrollIntoView({ block: 'center', behavior: 'smooth' }); }
      return false;
    }
    // Phones and tablets: open the front camera straight away through the file picker. It works everywhere,
    // even where a page is not allowed to use the camera directly.
    var touch = function () { return window.matchMedia && window.matchMedia('(pointer: coarse)').matches; };

    function camera() {
      error = null;
      var blocked = function () {
        // The live camera is blocked here. On a phone, the phone's own camera still works through the file picker.
        if (touch()) {
          wrap(head('AI face shape and style') + '<div class="animate-fadeUp text-center"><h1 class="font-serif text-3xl font-light leading-tight sm:text-4xl">Open your camera</h1><p class="mt-4 text-ink-600">Tap below, switch to the front camera if needed, and take a selfie looking straight ahead.</p>' +
            '<button data-f="phonecam" class="btn-primary mt-8 w-full max-w-md">' + svg(IC.camera) + ' Open my camera</button><input type="file" accept="image/*" capture="user" data-f="selfie" hidden></div>');
          return;
        }
        error = 'Your browser did not let this page use the camera. Click "Upload a photo" and choose a selfie instead.'; intro();
      };
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) return blocked();
      navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 1280 } }, audio: false }).then(function (s) {
        stream = s;
        wrap(head('AI face shape and style') + '<div class="animate-fadeUp flex flex-col items-center"><div class="sks-cam"><video playsinline muted autoplay></video><div class="sks-oval"><div></div></div><p>Face inside the oval, look straight ahead</p></div><button data-f="snap" class="btn-primary mt-8 w-full max-w-md">' + svg(IC.camera) + ' Take photo</button></div>');
        var v = host.querySelector('video'); v.srcObject = s; v.play().catch(function () {});
      }, blocked);
    }
    function snap() {
      var v = host.querySelector('video');
      if (!v || !v.videoWidth) return;
      var c = document.createElement('canvas'); c.width = v.videoWidth; c.height = v.videoHeight;
      var x = c.getContext('2d'); x.translate(c.width, 0); x.scale(-1, 1); x.drawImage(v, 0, 0);
      stop(); run(c);
    }
    function toCanvas(src, max) {
      return new Promise(function (ok, bad) {
        var draw = function (img, w, h) { var k = Math.min(1, max / Math.max(w, h)), c = document.createElement('canvas'); c.width = Math.round(w * k); c.height = Math.round(h * k); c.getContext('2d').drawImage(img, 0, 0, c.width, c.height); ok(c); };
        if (src instanceof HTMLCanvasElement) return draw(src, src.width, src.height);
        var img = new Image();
        img.onload = function () { draw(img, img.naturalWidth, img.naturalHeight); URL.revokeObjectURL(img.src); };
        img.onerror = function () { bad(new Error('We couldn\'t open that file. Please use a JPG or PNG photo.')); };
        img.src = URL.createObjectURL(src);
      });
    }
    function run(src) {
      if (src.size > 15 * 1024 * 1024) { error = 'That photo is too big. Please use one under 15 MB.'; return intro(); }
      var canvas;
      toCanvas(src, 960).then(function (c) {
        canvas = c; preview = c.toDataURL('image/jpeg', 0.85);
        wrap('<div class="flex flex-col items-center text-center"><div class="skf-stage" style="aspect-ratio:' + c.width + '/' + c.height + '"><img src="' + preview + '" alt="Your selfie"><div class="sks-beam"></div></div>' +
          '<p class="mt-8 font-serif text-2xl" data-f-status>Mapping your face…</p><p class="mt-2 text-sm text-ink-500">Measuring the thirds of your face, your forehead, cheekbones and jaw.</p></div>');
        return E.detect(c);
      }).then(function (d) {
        if (!d) return;
        if (!d.faces) throw new Error('We couldn\'t find a face in that photo. Try a clear, front-facing selfie in good light.');
        // Frame the face (head and a little of the neck), then measure again on that close-up.
        var m0 = d.m, cw = m0.widths.cheek, ctr = m0.P[168], hair = m0.frame.o.y + m0.frame.v.y * m0.hairV, chinY = m0.P[152].y;
        var top = hair - cw * 0.3, bot = chinY + cw * 0.35, hh = bot - top, ww = Math.max(hh * 0.8, cw * 1.9);
        var x0 = Math.max(0, ctr.x - ww / 2), y0 = Math.max(0, top), x1 = Math.min(canvas.width, ctr.x + ww / 2), y1 = Math.min(canvas.height, bot);
        if ((x1 - x0) * (y1 - y0) > canvas.width * canvas.height * 0.8) return d;
        var k = Math.min(2, 900 / Math.max(x1 - x0, y1 - y0)), cc = document.createElement('canvas');
        cc.width = Math.round((x1 - x0) * k); cc.height = Math.round((y1 - y0) * k);
        cc.getContext('2d').drawImage(canvas, x0, y0, x1 - x0, y1 - y0, 0, 0, cc.width, cc.height);
        canvas = cc; preview = cc.toDataURL('image/jpeg', 0.88);
        return E.detect(cc).then(function (d2) { return d2 && d2.faces ? d2 : d; });
      }).then(function (d) {
        if (!d) return;
        var m = d.m;
        if (m.W / Math.max(1, m.widths.cheek) > 9) throw new Error('Your face is too small in that photo. Hold the camera closer, so your face fills the oval.');
        if (Math.abs(m.yaw) > 0.2) throw new Error('Your head is turned a little to the side. Look straight at the camera, so we can measure both sides evenly.');
        if (m.pitch < 0.3 || m.pitch > 0.56) throw new Error('Your chin is tilted up or down. Hold the camera at eye level and look straight ahead.');
        var stage = host.querySelector('.skf-stage'), st = host.querySelector('[data-f-status]');
        if (stage) { stage.style.aspectRatio = m.W + '/' + m.H; stage.querySelector('img').src = preview; stage.insertAdjacentHTML('beforeend', pointsSVG(m)); }
        if (st) st.textContent = '478 points found. Working out your shape…';
        var a = E.analyse(m);
        R = { m: m, shape: a.shape, second: a.second, mix: a.mix, traits: a.traits, gender: gender, texture: texture, photo: preview, d: d.faces };
        tryCache = {}; tryBusy = {}; tryErr = {};
        save(R);
        setTimeout(function () { view = 'lines'; full = false; result(); }, 1900);
      }).catch(function (e) {
        if (e && e.skfLoad) { picker('Our face scan couldn\'t start on this device.'); return; }
        error = (e && e.message) || 'Something went wrong. Please try again.'; intro();
      });
    }

    function picker(why) {
      stop();
      wrap(head('Face shape') + '<div class="animate-fadeUp"><h1 class="text-balance font-serif text-4xl font-light leading-tight">Which shape is closest to yours?</h1>' +
        '<p class="mt-4 text-ink-600">' + esc(why ? why + ' ' : '') + 'Pull your hair back and look in the mirror. Pick the outline that looks most like your face.</p>' +
        (!gender ? '<div class="skf-seg mt-6" role="radiogroup">' + [['w', 'Women'], ['m', 'Men']].map(function (g) { return '<button role="radio" aria-checked="false" data-f="pg-' + g[0] + '">' + g[1] + '</button>'; }).join('') + '</div>' : '') +
        '<div class="skf-shapes mt-8">' + Object.keys(Dt.SHAPES).map(function (k) { return '<button data-f="shape-' + k + '"' + (gender ? '' : ' disabled') + '>' + shapeIcon(k, 40) + '<span class="font-serif text-xl">' + Dt.SHAPES[k].name + '</span><span class="text-xs text-ink-500">' + esc(Dt.SHAPES[k].line.split('.')[0]) + '.</span></button>'; }).join('') + '</div></div>');
    }

    /* ---------- result ---------- */
    function card(x, beard) {
      var v = vals(R.m), c = x.c;
      var why = x.reasons.slice(0, full ? 3 : 2).map(function (r) { return '<li><span class="skf-trait">' + esc(Dt.TRAITS[r.t].name) + '</span>' + esc(fill(r.text, v)) + '</li>'; });
      var f = c.fit[R.shape] || 0, sn = Dt.SHAPES[R.shape].name, an = /^[AEIOU]/.test(sn) ? 'an ' : 'a ';
      if (why.length < 2 && c.does) why.push('<li><span class="skf-trait">' + esc(sn) + ' face</span>' + esc(c.does) + ' ' + (f >= 3 ? 'That is exactly what ' + an + sn.toLowerCase() + ' face needs.' : f >= 2 ? 'This works well with ' + an + sn.toLowerCase() + ' face.' : 'Style it as shown to keep the balance.') + '</li>');
      if (!why.length) why = ['<li><span class="skf-trait">' + esc(sn) + ' face</span>' + esc(goal(Dt.SHAPES[R.shape], R.gender)) + '</li>'];
      var tex = beard ? '' : c.tex.split('').map(function (t) { return Dt.TEXTURE[t].n; }).join(', ');
      return '<article class="skf-card animate-fadeUp">' +
        (function () {
          var k = (beard ? 'beard:' : 'cut:') + c.id;
          if (tryCache[k]) return '<button class="skf-card-art skf-card-photo" data-f="tryopen-' + k + '" aria-label="See ' + esc(c.n) + ' on you"><img src="' + tryCache[k] + '" alt="You with ' + esc(c.n) + '"><span>On you</span></button>';
          return '<div class="skf-card-art">' + (beard ? art({ len: 60, fringe: 'crop', top: 3, tight: 1 }, c.art) : art(c.art)) + '</div>';
        })() +
        '<div class="skf-card-body">' + (c.hot ? '<p class="skf-hot"><b>Trending</b>' + esc(c.hot) + '</p>' : '') + '<h3 class="font-serif text-2xl leading-tight">' + esc(c.n) + '</h3>' +
        (R.m ? '<div class="skf-match"><span class="skf-match-bar"><i style="width:' + x.pct + '%"></i></span><b>' + x.pct + '%</b> match for your face</div>' : '') +
        (beard ? '' : '<p class="mt-1 text-[11px] uppercase tracking-[0.14em] text-ink-400">' + esc(c.len) + ' · ' + esc(tex) + '</p>') +
        '<p class="mt-4 text-[11px] uppercase tracking-[0.16em] text-champagne-700">Why it suits you</p><ul class="skf-why">' + why.join('') + '</ul>' +
        '<p class="skf-ask">' + svg(IC.scissors, 14) + '<span><b>Ask for:</b> ' + esc(c.ask) + '</span></p>' +
        (R.photo ? (function () {
          var k = (beard ? 'beard:' : 'cut:') + c.id;
          if (tryBusy[k]) return '<p class="skf-try is-busy"><span class="skf-spin"></span>Creating your look. This takes about 10 to 20 seconds…</p>';
          return '<button class="skf-try" data-f="try-' + k + '">' + svg(IC.spark, 15) + (tryCache[k] ? 'See it on me again' : 'Try it on my photo') + '</button>' +
            (tryErr[k] ? '<p class="mt-2 text-xs text-[#8E4A49]">' + esc(tryErr[k]) + '</p>' : '');
        })() : '') + '</div></article>';
    }
    function skipList(list) {
      var low = list.filter(function (x) { return x.against.length; }).slice(-2).reverse();
      if (!low.length) return '';
      return '<div class="skf-skip"><p class="text-[11px] uppercase tracking-[0.16em] text-ink-500">Maybe skip</p><ul>' + low.map(function (x) {
        return '<li>' + svg(IC.x, 14) + '<span><b>' + esc(x.c.n) + '.</b> It works against your ' + esc(x.against.map(function (k) { return Dt.TRAITS[k].name.toLowerCase(); }).join(' and ')) + '.</span></li>';
      }).join('') + '</ul></div>';
    }
    function productRows(g) {
      var D = OPT.products ? { products: OPT.products } : window.__skfData || (function () { try { return (window.__skfData = JSON.parse(document.getElementById('sk-data').textContent)); } catch (e) { return { products: [] }; } })();
      var by = {}; D.products.forEach(function (p) { by[p.slug] = p; });
      var fmt = function (n) { return 'LKR ' + Math.round(n).toLocaleString('en-US'); };
      return Dt.SHOP[g].map(function (s) { var p = by[s[0]]; return p && p.variants && p.variants[0] && p.variants[0].stock > 0 ? { p: p, why: s[1] } : null; }).filter(Boolean).map(function (x) {
        var p = x.p;
        return '<li class="skf-prod"><a href="' + href(p.slug) + '" class="skf-prod-img"><img src="' + p.image + '" alt="' + esc(p.brand + ' ' + p.name) + '"></a><div class="min-w-0 flex-1"><p class="text-[11px] uppercase tracking-[0.14em] text-ink-500">' + esc(p.brand) + '</p><a href="' + href(p.slug) + '" class="block font-serif text-lg leading-snug hover:underline">' + esc(p.name) + '</a><p class="mt-1 text-sm text-ink-600">' + esc(x.why) + '</p></div><div class="flex flex-col items-end gap-2"><span class="text-sm">' + fmt(p.variants[0].price) + '</span><button class="btn-outline !h-9 !px-3 !text-[10.5px]" data-f="add-' + p.slug + '">Add</button></div></li>';
      }).join('');
    }

    function result() {
      var g = R.gender === 'm' ? 'm' : 'w', S = Dt.SHAPES[R.shape], v = vals(R.m), has = {};
      R.traits.forEach(function (t) { has[t.id] = 1; });
      var cuts = rank(Dt.CUTS.filter(function (c) { return c.g === g; }), R);
      var shown = cuts.filter(function (x) { return !texture || x.c.tex.indexOf(texture) >= 0; });
      var byPct = function (a, b) { return b.pct - a.pct; };
      var top = shown.slice(0, full ? 4 : 3).sort(byPct);
      var beards = g === 'm' ? rank(Dt.BEARDS, R) : null;
      var mix = R.mix ? R.mix.slice(0, 3) : null;
      var photo = R.photo && R.m;
      var traitChips = R.traits.length ? R.traits.map(function (t) { return '<li><b>' + esc(Dt.TRAITS[t.id].name) + '</b><span>' + esc(fill(Dt.TRAITS[t.id].tip, v)) + '</span></li>'; }).join('') : '';
      var brows = (g === 'm' ? Dt.BROWS_M + ' ' : '') + Dt.BROWS[R.shape];
      var browExtra = Object.keys(Dt.BROW_TRAIT).filter(function (k) { return has[k]; }).map(function (k) { return '<li><span class="skf-trait">' + esc(Dt.TRAITS[k].name) + '</span>' + esc(Dt.BROW_TRAIT[k]) + '</li>'; }).join('');
      var mk = Dt.MAKEUP[R.shape], mkExtra = Object.keys(Dt.MAKEUP_TRAIT).filter(function (k) { return has[k]; }).map(function (k) { return '<li><span class="skf-trait">' + esc(Dt.TRAITS[k].name) + '</span>' + esc(fill(Dt.MAKEUP_TRAIT[k], v)) + '</li>'; }).join('');
      var sec = function (n, title, body) { return '<section class="skf-sec"><p class="skf-num">' + n + '</p><div class="min-w-0 flex-1"><h2 class="font-serif text-3xl font-light">' + title + '</h2>' + body + '</div></section>'; };

      host.className = 'container-lux py-14';
      host.innerHTML = '<div class="mx-auto max-w-5xl">' +
        '<div class="mb-8 flex items-center gap-4"><button data-f="back" aria-label="Back">' + svg(IC.back, 18) + '</button><p class="eyebrow">Your face shape and style report</p></div>' +
        '<div class="skf-hero">' +
        (photo ? '<div><div class="skf-stage is-result" style="aspect-ratio:' + R.m.W + '/' + R.m.H + '"><img src="' + R.photo + '" alt="Your selfie with your face shape drawn on it">' + overlay(R.m, view, R.shape) + '</div>' +
          (full && g === 'w' ? '<div class="skf-seg skf-seg-sm mt-3">' + [['lines', 'Proportions'], ['makeup', 'Contour and blush map']].map(function (o) { return '<button data-f="view-' + o[0] + '" class="' + (view === o[0] ? 'is-on' : '') + '">' + o[1] + '</button>'; }).join('') + '</div>' : '') +
          (view === 'makeup' ? '<p class="skf-legend"><i style="background:#9A5B3A"></i>Contour <i style="background:#E07A8B"></i>Blush <i style="background:#F3E2BE"></i>Highlight</p>' : '') + '</div>'
          : '<div class="skf-shape-big">' + shapeIcon(R.shape, 150) + '</div>') +
        '<div><p class="eyebrow">Your face shape</p><h1 class="mt-3 font-serif text-5xl font-light leading-tight sm:text-6xl"><em>' + esc(S.name) + '</em></h1>' +
        (R.second ? '<p class="mt-2 text-ink-500">with a touch of ' + esc(Dt.SHAPES[R.second].name.toLowerCase()) + '</p>' : '') +
        '<p class="mt-5 text-ink-700">' + esc(S.line) + '</p><p class="mt-3 text-ink-600">' + esc(goal(S, g)) + '</p>' +
        (full && mix ? '<ul class="skf-mix">' + mix.map(function (x) { return '<li><span>' + esc(Dt.SHAPES[x.shape].name) + '</span><span class="skf-mix-bar"><i style="width:' + Math.round(x.share * 100) + '%"></i></span><span>' + Math.round(x.share * 100) + '%</span></li>'; }).join('') + '</ul>' : '') +
        (full && traitChips ? '<p class="mt-8 text-[11px] uppercase tracking-[0.16em] text-ink-500">What stands out in your face</p><ul class="skf-traits">' + traitChips + '</ul>' : '') +
        (photo && Math.abs(R.m.yaw) > 0.12 ? '<p class="mt-4 text-xs text-ink-400">Your head was turned a little, so the widths may be a bit off. For the most exact result, take a new photo looking straight ahead.</p>' : '') +
        (photo && R.m.hairlineFound === false ? '<p class="mt-4 text-xs text-ink-400">We couldn\'t see your hairline clearly, so the top third is an estimate.</p>' : '') +
        '</div></div>' +

        sec('01', 'Haircuts for you', '<p class="mt-2 text-ink-600">Picked for your ' + esc(S.name.toLowerCase()) + ' face' + (full ? ' and the features above' : '') + '.</p>' +
          '<div class="skf-chips mt-5" role="group" aria-label="Your hair type"><span class="text-[11px] uppercase tracking-[0.16em] text-ink-500">My hair is</span>' +
          ['s', 'w', 'c', 'k'].map(function (t) { return '<button data-f="tex-' + t + '" aria-pressed="' + (texture === t) + '" class="' + (texture === t ? 'is-on' : '') + '">' + Dt.TEXTURE[t].n + '</button>'; }).join('') + '</div>' +
          (texture ? '<p class="mt-3 text-sm text-ink-600">' + esc(Dt.TEXTURE[texture].tip) + '</p>' : '') +
          '<div class="skf-cards">' + top.map(function (x) { return card(x); }).join('') + '</div>' + (full ? skipList(cuts) : '')) +
        (!full ? (g === 'm' ? sec('02', 'Beard styles', '<div class="skf-cards">' + beards.slice(0, 3).sort(byPct).map(function (x) { return card(x, true); }).join('') + '</div>') : '') +
          '<div class="mt-12 text-center"><button data-f="full" class="btn-outline">See full breakdown</button><p class="mt-2 text-xs text-ink-400">Face measurements, ' + (g === 'm' ? 'fringe, brows and products' : 'fringe, brows, contour and products') + '</p></div>' : '') +
        (full ? 
        sec('02', 'Fringe and parting', '<p class="mt-3 text-ink-700">' + esc(Dt.PART[g][R.shape]) + '</p>' + (has.tallForehead ? '<ul class="skf-why mt-3"><li><span class="skf-trait">Taller forehead</span>A fringe or a side sweep covers some of it, so the three sections of your face look even.</li></ul>' : has.shortForehead ? '<ul class="skf-why mt-3"><li><span class="skf-trait">Shorter forehead</span>Keep the forehead open, or choose a light, wispy fringe, so it does not look smaller.</li></ul>' : '')) +
        sec('03', 'Brows', '<p class="mt-3 text-ink-700">' + esc(brows) + '</p>' + (browExtra ? '<ul class="skf-why mt-3">' + browExtra + '</ul>' : '')) +
        (g === 'w' ? sec('04', 'Contour and blush', '<div class="skf-two mt-3"><div><p class="text-[11px] uppercase tracking-[0.16em] text-ink-500">Contour</p><p class="mt-1 text-ink-700">' + esc(mk.contour) + '</p></div><div><p class="text-[11px] uppercase tracking-[0.16em] text-ink-500">Blush</p><p class="mt-1 text-ink-700">' + esc(mk.blush) + '</p></div></div>' + (mkExtra ? '<ul class="skf-why mt-3">' + mkExtra + '</ul>' : '') + (photo ? '<button data-f="view-makeup" class="mt-4 text-[11px] uppercase tracking-[0.16em] text-ink-600 underline underline-offset-4">See it on my photo</button>' : ''))
          : sec('04', 'Beard styles', '<div class="skf-cards">' + beards.slice(0, 3).sort(byPct).map(function (x) { return card(x, true); }).join('') + '</div>' + skipList(beards))) +
        sec('05', 'Shop the look', '<ul class="skf-prods">' + productRows(g) + '</ul>') : '') +
        '<div class="mt-14 flex flex-col items-center gap-4 border-t border-ink/10 pt-10 text-center">' +
        '<div class="flex flex-wrap justify-center gap-3"><button data-f="intro" class="btn-primary">Take a new photo</button><button data-f="swap" class="btn-outline">See ' + (g === 'w' ? 'men\'s' : 'women\'s') + ' styles</button></div>' +
        '<button data-f="pick" class="text-[11px] uppercase tracking-[0.16em] text-ink-500 hover:text-ink">Not quite right? Choose your shape</button>' +
        '<p class="max-w-lg text-xs text-ink-400">Face shape is a styling guide, not a rule. Wear what makes you feel good. Your photo was checked on this device and was not saved. It only leaves your device if you tap Try it on my photo.</p></div></div>';
      window.scrollTo(0, 0);
    }

    /* ---------- AI try-on ---------- */
    function rerender() { var y = window.scrollY; result(); window.scrollTo(0, y); }
    function styleOf(k) { var p = k.split(':'), list = p[0] === 'beard' ? Dt.BEARDS : Dt.CUTS; return list.filter(function (c) { return c.id === p[1]; })[0]; }
    function small(src) {
      return new Promise(function (ok, no) {
        var im = new Image(); im.onload = function () {
          var s = Math.min(1, 768 / Math.max(im.naturalWidth, im.naturalHeight)), c = document.createElement('canvas');
          c.width = Math.round(im.naturalWidth * s); c.height = Math.round(im.naturalHeight * s);
          c.getContext('2d').drawImage(im, 0, 0, c.width, c.height); ok(c.toDataURL('image/jpeg', 0.9));
        }; im.onerror = no; im.src = src;
      });
    }
    function tryOn(k) {
      if (!R || !R.photo || tryBusy[k]) return;
      if (tryCache[k]) { lightbox(k); return; }
      if (!tryOk) { tryPending = k; lightbox(null); return; }
      tryBusy[k] = 1; tryErr[k] = null; rerender();
      var p = k.split(':');
      small(R.photo).then(function (img) {
        return fetch('/api/tryon', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ image: img, kind: p[0], id: p[1], texture: texture || '' }) });
      }).then(function (r) {
        return r.json().catch(function () { return {}; }).then(function (j) {
          if (r.status === 404) throw new Error('The try-on only works on the live store, not in this preview.');
          if (!r.ok || !j.image) throw new Error(j.error || 'The AI could not make this picture. Please try again.');
          return j.image;
        });
      }).then(function (src) {
        tryCache[k] = src; delete tryBusy[k]; rerender(); lightbox(k);
      }).catch(function (e) {
        delete tryBusy[k]; tryErr[k] = (e && e.message) || 'Something went wrong. Please try again.'; rerender();
      });
    }
    function lightbox(k) {
      var old = document.getElementById('skf-lb'); if (old) old.remove();
      var c = k && styleOf(k), box = document.createElement('div');
      box.id = 'skf-lb'; box.className = 'skf-lb'; box.setAttribute('role', 'dialog'); box.setAttribute('aria-modal', 'true');
      if (!k) {
        box.innerHTML = '<div class="skf-lb-card skf-lb-consent"><p class="eyebrow">AI try-on</p><h2 class="mt-3 font-serif text-3xl font-light">See the style on your own photo</h2>' +
          '<p class="mt-4 text-ink-700">To make this picture, your selfie is sent to our AI partner (Google Gemini). It is used only to create your picture. Skinora does not save it.</p>' +
          '<p class="mt-3 text-sm text-ink-500">It is an AI picture, so small details can differ from real life.</p>' +
          '<div class="mt-7 flex flex-wrap gap-3"><button class="btn-primary" data-lb="ok">Continue</button><button class="btn-outline" data-lb="close">Not now</button></div></div>';
      } else {
        box.innerHTML = '<div class="skf-lb-card skf-lb-photo"><button class="skf-lb-x" data-lb="close" aria-label="Close">×</button>' +
          '<div class="skf-lb-imgs"><figure><img src="' + R.photo + '" alt="Your photo"><figcaption>Before</figcaption></figure><figure><img src="' + tryCache[k] + '" alt="You with ' + esc(c.n) + '"><figcaption>' + esc(c.n) + '</figcaption></figure></div>' +
          '<p class="mt-4 text-sm text-ink-600"><b class="font-medium text-ink">Ask for:</b> ' + esc(c.ask) + '</p>' +
          '<p class="mt-2 text-xs text-ink-400">AI picture made from your selfie. Your photo was not saved.</p></div>';
      }
      box.addEventListener('click', function (e) {
        var a = e.target.closest('[data-lb]');
        if (e.target === box || (a && a.getAttribute('data-lb') === 'close')) { box.remove(); tryPending = null; }
        else if (a && a.getAttribute('data-lb') === 'ok') { tryOk = true; box.remove(); var t = tryPending; tryPending = null; if (t) tryOn(t); }
      });
      document.addEventListener('keydown', function esc0(e) { if (e.key === 'Escape') { box.remove(); document.removeEventListener('keydown', esc0); } });
      document.body.appendChild(box);
    }

    host.addEventListener('click', function (e) {
      if (e.target.closest('[data-s]')) stop(); // leaving to the skin scan screens
      var b = e.target.closest('[data-f]'); if (!b || !host.contains(b)) return;
      var k = b.getAttribute('data-f');
      if (k === 'back') { stop(); if (OPT.onBack) OPT.onBack(); else location.href = 'quiz.html'; }
      else if (k === 'intro') { error = null; intro(); }
      else if (k === 'g-w' || k === 'g-m') { gender = k.slice(2); var y0 = window.scrollY; intro(); window.scrollTo(0, y0); }
      else if (k === 'camera') { if (ready()) camera(); }
      else if (k === 'phonecam') host.querySelector('[data-f="selfie"]').click();
      else if (k === 'upload') { if (ready()) host.querySelector('[data-f="file"]').click(); }
      else if (k === 'snap') snap();
      else if (k === 'pick') picker();
      else if (k.indexOf('tryopen-') === 0) lightbox(k.slice(8));
      else if (k.indexOf('try-') === 0) tryOn(k.slice(4));
      else if (k === 'full') { full = true; var y1 = window.scrollY; result(); window.scrollTo(0, y1); }
      else if (k === 'pg-w' || k === 'pg-m') { gender = k.slice(3); picker(); }
      else if (k.indexOf('shape-') === 0) { R = { m: null, shape: k.slice(6), second: null, mix: null, traits: [], gender: gender || 'w', texture: texture, photo: null }; save(R); view = 'lines'; full = false; result(); }
      else if (k.indexOf('view-') === 0) { view = k.slice(5); result(); var st = host.querySelector('.skf-stage'); if (st) st.scrollIntoView({ block: 'center' }); }
      else if (k.indexOf('tex-') === 0) { var t = k.slice(4); texture = texture === t ? null : t; R.texture = texture; save(R); var y = window.scrollY; result(); window.scrollTo(0, y); }
      else if (k === 'swap') { R.gender = gender = R.gender === 'm' ? 'w' : 'm'; view = 'lines'; full = false; save(R); result(); }
      else if (k.indexOf('add-') === 0) {
        var D = OPT.products ? { products: OPT.products } : window.__skfData, p = D && D.products.filter(function (x) { return x.slug === k.slice(4); })[0], c = window.__sk && window.__sk.cart(), v0 = p && p.variants[0];
        if (OPT.addToCart) c = { add: OPT.addToCart };
        if (c && v0 && v0.stock > 0) c.add({ variantId: v0.id, productId: p.id, slug: p.slug, brand: p.brand, name: p.name, variantName: v0.name, price: v0.price, compareAt: v0.compareAt, image: p.image, maxQty: v0.stock }, 1);
      }
    });
    host.addEventListener('change', function (e) {
      var k = e.target.getAttribute('data-f');
      if (k === 'consent') { consent = e.target.checked; refreshButtons(); }
      if (k === 'file' || k === 'selfie') { var f = e.target.files && e.target.files[0]; e.target.value = ''; if (f) run(f); }
    });
    window.addEventListener('pagehide', stop);
    host.__skfIntro = intro;
    host.__skfShow = function (sv) { gender = sv.gender || 'w'; texture = sv.texture || null; R = { m: null, shape: sv.shape, second: sv.second, mix: null, traits: (sv.traits || []).map(function (id) { return { id: id, s: 1 }; }).filter(function (t) { return Dt.TRAITS[t.id]; }), gender: gender, texture: texture, photo: null }; view = 'lines'; full = false; result(); };
    host.__skfStop = stop;
  }

  /* ---------- hooks into the skin quiz ---------- */
  function hook(host) {
    var first = !host.__skfBound;
    attach(host);
    if (!first) return;
    var CHOICE = '<button data-f="intro" class="sks-choice animate-fadeUp is-new" style="animation-delay:160ms"><span class="sks-choice-ic">' + svg(IC.face, 22) + '</span><span class="flex-1"><span class="sks-new">New · AI</span><span class="block font-serif text-2xl">Find my face shape and hairstyle</span><span class="block text-sm text-ink-500">Take a selfie. We measure your face and show the haircuts, brows and looks that suit you, and why.</span></span></button>';
    var addChoice = function () {
      if (host.querySelector('[data-f="intro"].sks-choice')) return;
      var first = host.querySelector('.sks-choice');
      if (first) return first.parentNode.insertAdjacentHTML('beforeend', CHOICE);
      // Without the skin scan: offer it under the first quiz question.
      var opt = host.querySelector('[data-opt="oily"]');
      if (opt) opt.parentNode.insertAdjacentHTML('afterend', '<div class="mt-12 border-t border-ink/10 pt-8"><p class="mb-4 text-[11px] uppercase tracking-[0.18em] text-ink-500">Or try our new style scan</p>' + CHOICE + '</div>');
    };
    new MutationObserver(addChoice).observe(host, { childList: true, subtree: true });
    addChoice();
    if (/[?&]face=1/.test(location.search)) {
      var sv = saved();
      if (/[?&]my=1/.test(location.search) && sv && Dt.SHAPES[sv.shape]) host.__skfShow(sv); else host.__skfIntro();
    }
  }

  /* ---------- account: My face shape ---------- */
  function account() {
    var grid = document.querySelector('main .grid.gap-14');
    if (!grid || document.getElementById('skf-my-face')) return;
    var s = saved(), sec = document.createElement('section');
    sec.id = 'skf-my-face'; sec.className = 'sks-account';
    sec.innerHTML = s && Dt.SHAPES[s.shape]
      ? '<div class="sks-account-empty"><div class="flex items-center gap-5"><span class="text-champagne-700">' + shapeIcon(s.shape, 42) + '</span><div><p class="eyebrow">My face shape</p><h2 class="mt-2 font-serif text-3xl"><em>' + esc(Dt.SHAPES[s.shape].name) + '</em></h2><p class="mt-1 text-sm text-ink-500">' + esc(goal(Dt.SHAPES[s.shape], s.gender)) + '</p></div></div><a class="btn-outline" href="quiz.html?face=1&my=1">See my styles</a></div>'
      : '<div class="sks-account-empty"><div><p class="eyebrow">My face shape</p><h2 class="mt-3 font-serif text-3xl">Find the hairstyle made for your face</h2><p class="mt-2 text-sm text-ink-500">A selfie, 478 face points, and a personal style report.</p></div><a class="btn-primary" href="quiz.html?face=1">Find my style</a></div>';
    var skin = document.getElementById('sks-my-skin');
    if (skin) skin.parentNode.insertBefore(sec, skin.nextSibling); else grid.parentNode.insertBefore(sec, grid);
  }

  var href = function (slug) { return OPT.productHref ? OPT.productHref(slug) : 'p__' + slug + '.html'; };
  // Mount the face scan into any element. Used by the Next.js store.
  function mount(host, o) {
    OPT = o || {};
    attach(host);
    var sv = saved();
    if (OPT.showSaved && sv && Dt.SHAPES[sv.shape]) host.__skfShow(sv); else host.__skfIntro();
    return function () { if (host.__skfStop) host.__skfStop(); var lb = document.getElementById('skf-lb'); if (lb) lb.remove(); };
  }
  window.SKFACE = { hook: hook, art: art, mount: mount };
  var path = function () { return (document.body && document.body.getAttribute('data-sk-path') || '').split('?')[0]; };
  if (window.SKSCAN && window.SKSCAN.quiz && !window.SKSCAN.__skfWrapped) {
    // With the skin scan: a third option on its start screen.
    var orig = window.SKSCAN.quiz;
    window.SKSCAN.quiz = function (host) { orig(host); hook(host); };
    window.SKSCAN.__skfWrapped = 1;
  } else {
    // On its own: hook the quiz page once the store script has drawn it.
    var onQuiz = function () {
      if (path() !== '/quiz') return;
      var host = document.querySelector('main .container-lux.flex.flex-col.items-center') || document.querySelector('main .container-lux');
      if (host) hook(host);
    };
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', onQuiz); else setTimeout(onQuiz, 0);
  }
  var onAccount = function () { if (path() === '/account') setTimeout(account, 0); };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', onAccount); else onAccount();
})();
