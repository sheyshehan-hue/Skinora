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
      var D = window.__skfData || (function () { try { return (window.__skfData = JSON.parse(document.getElementById('sk-data').textContent)); } catch (e) { return { products: [] }; } })();
      var by = {}; D.products.forEach(function (p) { by[p.slug] = p; });
      var fmt = function (n) { return 'LKR ' + Math.round(n).toLocaleString('en-US'); };
      return Dt.SHOP[g].map(function (s) { var p = by[s[0]]; return p && p.variants && p.variants[0] && p.variants[0].stock > 0 ? { p: p, why: s[1] } : null; }).filter(Boolean).map(function (x) {
        var p = x.p;
        return '<li class="skf-prod"><a href="p__' + p.slug + '.html" class="skf-prod-img"><img src="' + p.image + '" alt="' + esc(p.brand + ' ' + p.name) + '"></a><div class="min-w-0 flex-1"><p class="text-[11px] uppercase tracking-[0.14em] text-ink-500">' + esc(p.brand) + '</p><a href="p__' + p.slug + '.html" class="block font-serif text-lg leading-snug hover:underline">' + esc(p.name) + '</a><p class="mt-1 text-sm text-ink-600">' + esc(x.why) + '</p></div><div class="flex flex-col items-end gap-2"><span class="text-sm">' + fmt(p.variants[0].price) + '</span><button class="btn-outline !h-9 !px-3 !text-[10.5px]" data-f="add-' + p.slug + '">Add</button></div></li>';
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
      if (k === 'back') { stop(); location.href = 'quiz.html'; }
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
        var D = window.__skfData, p = D && D.products.filter(function (x) { return x.slug === k.slice(4); })[0], c = window.__sk && window.__sk.cart(), v0 = p && p.variants[0];
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

  window.SKFACE = { hook: hook, art: art };
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
