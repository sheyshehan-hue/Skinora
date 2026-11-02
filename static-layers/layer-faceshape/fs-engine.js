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
