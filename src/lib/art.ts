/**
 * Procedural "studio" product art (SVG) used for seed data and placeholders.
 * Real photography uploaded through the admin (Cloudinary) replaces these.
 */

export type Shape = "dropper" | "pump" | "jar" | "tube" | "bottle" | "perfume" | "perfume-round" | "candle" | "tool" | "pad";

export type ArtSpec = {
  shape: Shape;
  brand: string;
  name: string;
  /** product body colour */
  body: string;
  /** cap / accent colour */
  cap: string;
  /** label text colour */
  ink: string;
  /** background tint */
  bg: string;
};

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

function shade(hex: string, amt: number) {
  let h = hex.replace("#", "");
  if (h.length === 3) h = h.split("").map((c) => c + c).join("");
  const n = parseInt(h, 16);
  const clamp = (v: number) => Math.max(0, Math.min(255, v));
  const r = clamp((n >> 16) + amt);
  const g = clamp(((n >> 8) & 0xff) + amt);
  const b = clamp((n & 0xff) + amt);
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, "0")}`;
}

function wrap(name: string, max = 16) {
  const words = name.split(" ");
  const lines: string[] = [];
  let cur = "";
  for (const w of words) {
    if ((cur + " " + w).trim().length > max && cur) {
      lines.push(cur);
      cur = w;
    } else cur = (cur + " " + w).trim();
  }
  if (cur) lines.push(cur);
  return lines.slice(0, 3);
}

function defs(id: string, s: ArtSpec) {
  return `
  <defs>
    <radialGradient id="bg${id}" cx="50%" cy="38%" r="75%">
      <stop offset="0%" stop-color="${shade(s.bg, 18)}"/>
      <stop offset="100%" stop-color="${shade(s.bg, -10)}"/>
    </radialGradient>
    <linearGradient id="body${id}" x1="0" x2="1" y1="0" y2="0">
      <stop offset="0%" stop-color="${shade(s.body, -28)}"/>
      <stop offset="18%" stop-color="${shade(s.body, 10)}"/>
      <stop offset="42%" stop-color="${shade(s.body, 26)}"/>
      <stop offset="70%" stop-color="${s.body}"/>
      <stop offset="100%" stop-color="${shade(s.body, -36)}"/>
    </linearGradient>
    <linearGradient id="cap${id}" x1="0" x2="1" y1="0" y2="0">
      <stop offset="0%" stop-color="${shade(s.cap, -30)}"/>
      <stop offset="35%" stop-color="${shade(s.cap, 30)}"/>
      <stop offset="60%" stop-color="${s.cap}"/>
      <stop offset="100%" stop-color="${shade(s.cap, -40)}"/>
    </linearGradient>
    <linearGradient id="gloss${id}" x1="0" x2="1">
      <stop offset="0%" stop-color="#fff" stop-opacity="0"/>
      <stop offset="50%" stop-color="#fff" stop-opacity=".55"/>
      <stop offset="100%" stop-color="#fff" stop-opacity="0"/>
    </linearGradient>
    <radialGradient id="shadow${id}">
      <stop offset="0%" stop-color="#000" stop-opacity=".28"/>
      <stop offset="100%" stop-color="#000" stop-opacity="0"/>
    </radialGradient>
    <filter id="soft${id}" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="2"/></filter>
  </defs>`;
}

function label(s: ArtSpec, cx: number, top: number, width: number, opts: { serif?: boolean; size?: number } = {}) {
  const size = opts.size ?? 26;
  const lines = wrap(s.name, Math.max(10, Math.round(width / (size * 0.62))));
  const brand = `<text x="${cx}" y="${top}" text-anchor="middle" font-family="Georgia, 'Times New Roman', serif" font-size="${size * 1.15}" letter-spacing="${size * 0.18}" fill="${s.ink}">${esc(s.brand.toUpperCase())}</text>`;
  const rule = `<line x1="${cx - width * 0.18}" x2="${cx + width * 0.18}" y1="${top + size * 0.9}" y2="${top + size * 0.9}" stroke="${s.ink}" stroke-opacity=".5" stroke-width="1.2"/>`;
  const name = lines
    .map(
      (l, i) =>
        `<text x="${cx}" y="${top + size * 2.1 + i * size * 1.05}" text-anchor="middle" font-family="Helvetica, Arial, sans-serif" font-size="${size * 0.72}" letter-spacing="${size * 0.06}" fill="${s.ink}" fill-opacity=".85">${esc(l)}</text>`,
    )
    .join("");
  return brand + rule + name;
}

function product(id: string, s: ArtSpec): string {
  const B = `url(#body${id})`;
  const C = `url(#cap${id})`;
  const G = `url(#gloss${id})`;
  switch (s.shape) {
    case "dropper":
      return `
        <rect x="330" y="250" width="140" height="70" rx="10" fill="${C}"/>
        <path d="M352 250 Q352 170 400 160 Q448 170 448 250 Z" fill="${shade(s.cap, -10)}"/>
        <rect x="300" y="318" width="200" height="22" rx="4" fill="${shade(s.cap, -25)}"/>
        <rect x="280" y="338" width="240" height="452" rx="34" fill="${B}"/>
        <rect x="300" y="350" width="22" height="420" rx="11" fill="${G}" opacity=".7"/>
        <rect x="300" y="470" width="200" height="220" fill="#fff" fill-opacity=".9"/>
        ${label({ ...s, ink: "#222" }, 400, 525, 200, { size: 20 })}`;
    case "pump":
      return `
        <rect x="380" y="160" width="40" height="80" fill="${C}"/>
        <rect x="380" y="160" width="130" height="28" rx="6" fill="${C}"/>
        <rect x="340" y="236" width="120" height="60" rx="8" fill="${C}"/>
        <rect x="270" y="292" width="260" height="500" rx="44" fill="${B}"/>
        <rect x="292" y="310" width="24" height="460" rx="12" fill="${G}" opacity=".6"/>
        ${label(s, 400, 470, 240, { size: 24 })}`;
    case "jar":
      return `
        <rect x="220" y="440" width="360" height="110" rx="18" fill="${C}"/>
        <rect x="236" y="452" width="20" height="86" rx="10" fill="${G}" opacity=".5"/>
        <rect x="205" y="545" width="390" height="245" rx="40" fill="${B}"/>
        <rect x="225" y="560" width="26" height="210" rx="13" fill="${G}" opacity=".6"/>
        ${label(s, 400, 620, 330, { size: 24 })}`;
    case "tube":
      return `
        <path d="M290 180 L510 180 L490 690 Q400 712 310 690 Z" fill="${B}"/>
        <rect x="282" y="168" width="236" height="18" rx="3" fill="${shade(s.body, -20)}"/>
        <rect x="335" y="690" width="130" height="100" rx="14" fill="${C}"/>
        <rect x="305" y="200" width="20" height="470" rx="10" fill="${G}" opacity=".55"/>
        ${label(s, 400, 340, 190, { size: 22 })}`;
    case "bottle":
      return `
        <rect x="350" y="170" width="100" height="90" rx="12" fill="${C}"/>
        <path d="M330 260 L470 260 L470 300 Q545 320 545 380 L545 760 Q545 792 513 792 L287 792 Q255 792 255 760 L255 380 Q255 320 330 300 Z" fill="${B}"/>
        <rect x="275" y="370" width="22" height="400" rx="11" fill="${G}" opacity=".55"/>
        ${label(s, 400, 470, 260, { size: 24 })}`;
    case "perfume":
      return `
        <rect x="322" y="170" width="156" height="150" rx="6" fill="${C}"/>
        <rect x="336" y="182" width="24" height="126" fill="${G}" opacity=".5"/>
        <rect x="372" y="318" width="56" height="34" fill="${shade(s.cap, -30)}"/>
        <rect x="230" y="350" width="340" height="440" rx="18" fill="${B}" fill-opacity=".92"/>
        <rect x="250" y="370" width="300" height="400" rx="12" fill="none" stroke="#fff" stroke-opacity=".35" stroke-width="2"/>
        <rect x="258" y="380" width="30" height="380" rx="8" fill="${G}" opacity=".7"/>
        ${label(s, 400, 540, 260, { size: 26 })}`;
    case "perfume-round":
      return `
        <ellipse cx="400" cy="235" rx="62" ry="70" fill="${C}"/>
        <ellipse cx="380" cy="215" rx="16" ry="34" fill="#fff" opacity=".35"/>
        <rect x="374" y="300" width="52" height="46" fill="${shade(s.cap, -30)}"/>
        <path d="M400 340 C560 340 590 480 590 590 C590 720 510 792 400 792 C290 792 210 720 210 590 C210 480 240 340 400 340 Z" fill="${B}" fill-opacity=".9"/>
        <path d="M268 450 C250 520 250 640 290 720" stroke="#fff" stroke-opacity=".55" stroke-width="16" fill="none" stroke-linecap="round"/>
        ${label(s, 400, 560, 250, { size: 26 })}`;
    case "candle":
      return `
        <path d="M398 268 Q382 300 400 318 Q418 300 402 268 Q400 262 398 268 Z" fill="#F6C75B"/>
        <ellipse cx="400" cy="300" rx="70" ry="60" fill="#F6C75B" opacity=".18" filter="url(#soft${id})"/>
        <rect x="397" y="314" width="6" height="40" fill="#222"/>
        <rect x="240" y="350" width="320" height="440" rx="10" fill="${B}"/>
        <ellipse cx="400" cy="352" rx="160" ry="18" fill="${shade(s.body, 30)}"/>
        <rect x="256" y="365" width="22" height="410" rx="10" fill="${G}" opacity=".45"/>
        <rect x="270" y="500" width="260" height="190" fill="#fff" fill-opacity=".92"/>
        ${label({ ...s, ink: "#1d1d1d" }, 400, 555, 230, { size: 22 })}`;
    case "tool":
      return `
        <path d="M260 420 C260 300 420 260 520 320 C600 370 560 470 500 470 C470 470 460 440 430 440 C390 440 400 560 330 560 C280 560 260 500 260 420 Z" fill="${B}"/>
        <path d="M290 410 C300 340 380 310 450 330" stroke="#fff" stroke-opacity=".55" stroke-width="14" fill="none" stroke-linecap="round"/>
        <rect x="250" y="640" width="300" height="150" rx="6" fill="${C}"/>
        ${label({ ...s, ink: "#fff" }, 400, 690, 260, { size: 20 })}`;
    case "pad":
      return `
        <ellipse cx="400" cy="460" rx="190" ry="54" fill="${C}"/>
        <rect x="210" y="460" width="380" height="300" fill="${B}"/>
        <ellipse cx="400" cy="760" rx="190" ry="34" fill="${shade(s.body, -30)}"/>
        <ellipse cx="400" cy="456" rx="190" ry="54" fill="${shade(s.cap, 25)}"/>
        <rect x="228" y="480" width="22" height="270" rx="10" fill="${G}" opacity=".5"/>
        ${label(s, 400, 560, 320, { size: 24 })}`;
  }
}

/** Studio packshot, 800×1000 (4:5). */
export function packshotSVG(s: ArtSpec, id = "p") {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 1000" width="800" height="1000">${defs(id, s)}
  <rect width="800" height="1000" fill="url(#bg${id})"/>
  <rect x="0" y="830" width="800" height="170" fill="${shade(s.bg, -16)}" opacity=".5"/>
  <ellipse cx="400" cy="800" rx="240" ry="26" fill="url(#shadow${id})"/>
  ${product(id, s)}
</svg>`;
}

/** Texture / mood shot used as the hover image, 800×1000. */
export function textureSVG(s: ArtSpec, kind: "cream" | "serum" | "scent" | "glow", id = "t") {
  const c = s.body;
  let art = "";
  if (kind === "cream") {
    art = `
      <path d="M120 620 C220 420 420 640 520 470 C600 330 720 420 700 560 C680 700 520 760 380 720 C240 690 80 760 120 620 Z" fill="${shade(c, 34)}"/>
      <path d="M200 610 C300 520 420 640 520 540 C580 480 650 520 640 590" stroke="#fff" stroke-opacity=".8" stroke-width="18" fill="none" stroke-linecap="round"/>
      <path d="M240 660 C340 610 460 690 590 620" stroke="${shade(c, -12)}" stroke-opacity=".35" stroke-width="10" fill="none" stroke-linecap="round"/>`;
  } else if (kind === "serum") {
    const drops = [
      [280, 420, 70],
      [500, 520, 110],
      [360, 700, 50],
      [600, 300, 40],
      [200, 640, 30],
    ];
    art = drops
      .map(
        ([x, y, r]) => `
      <circle cx="${x}" cy="${y}" r="${r}" fill="${c}" fill-opacity=".55"/>
      <circle cx="${x}" cy="${y}" r="${r}" fill="none" stroke="#fff" stroke-opacity=".5" stroke-width="2"/>
      <ellipse cx="${x - r * 0.35}" cy="${y - r * 0.4}" rx="${r * 0.22}" ry="${r * 0.14}" fill="#fff" fill-opacity=".9" transform="rotate(-30 ${x - r * 0.35} ${y - r * 0.4})"/>`,
      )
      .join("");
  } else if (kind === "scent") {
    art = Array.from({ length: 7 })
      .map((_, i) => {
        const a = (i / 7) * Math.PI * 2;
        const x = 400 + Math.cos(a) * 120;
        const y = 500 + Math.sin(a) * 120;
        return `<ellipse cx="${x}" cy="${y}" rx="150" ry="70" fill="${shade(c, 20 + i * 4)}" fill-opacity=".45" transform="rotate(${(a * 180) / Math.PI} ${x} ${y})"/>`;
      })
      .join("") + `<circle cx="400" cy="500" r="46" fill="${s.cap}" fill-opacity=".85"/>`;
  } else {
    art = `<circle cx="400" cy="480" r="230" fill="${shade(c, 30)}" fill-opacity=".5" filter="url(#soft${id})"/>
      <circle cx="400" cy="480" r="150" fill="${shade(c, 50)}" fill-opacity=".6"/>
      <circle cx="400" cy="480" r="70" fill="#fff" fill-opacity=".7"/>`;
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 1000" width="800" height="1000">${defs(id, s)}
  <rect width="800" height="1000" fill="${shade(s.bg, 6)}"/>
  ${art}
  <text x="400" y="930" text-anchor="middle" font-family="Georgia, serif" font-size="22" letter-spacing="6" fill="#000" fill-opacity=".35">${esc(s.brand.toUpperCase())}</text>
</svg>`;
}

/** Wide editorial scene: arches, plinths and a still life of products. 1600×900 (or 900×1100 portrait). */
export function sceneSVG(opts: { bg: string; arch: string; items: ArtSpec[]; portrait?: boolean; align?: "center" | "right" }) {
  const W = opts.portrait ? 900 : 1600;
  const H = opts.portrait ? 1100 : 900;
  const id = "s" + Math.abs(hash(opts.items.map((i) => i.name).join())).toString(36);
  const n = opts.items.length;
  const right = opts.align === "right";
  const span = right ? 0.5 : 0.62;
  const slot = (W * span) / n;
  const startX = W * (right ? 0.45 : 0.19) + slot / 2;
  const ax = right ? 0.17 : 0; // arch offset
  const floor = H * 0.82;
  const prods = opts.items
    .map((it, i) => {
      const scale = (i % 2 === 0 ? 0.62 : 0.5) * (opts.portrait ? 0.95 : 1);
      const cx = startX + i * slot;
      const lift = i % 2 === 0 ? 0 : -H * 0.07;
      return `<g transform="translate(${cx - 400 * scale} ${floor + lift - 792 * scale}) scale(${scale})">${defs(id + i, it)}<ellipse cx="400" cy="796" rx="230" ry="20" fill="url(#shadow${id + i})"/>${product(id + i, it)}</g>
        ${i % 2 === 1 ? `<rect x="${cx - slot * 0.42}" y="${floor + lift}" width="${slot * 0.84}" height="${-lift + 4}" fill="${shade(opts.bg, -14)}"/><rect x="${cx - slot * 0.42}" y="${floor + lift}" width="${slot * 0.84}" height="6" fill="${shade(opts.bg, 12)}"/>` : ""}`;
    })
    .join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" preserveAspectRatio="xMidYMid slice">
  <defs>
    <linearGradient id="wall${id}" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="${shade(opts.bg, 10)}"/><stop offset="1" stop-color="${shade(opts.bg, -6)}"/></linearGradient>
    <linearGradient id="arch${id}" x1="0" x2="1"><stop offset="0" stop-color="${shade(opts.arch, -12)}"/><stop offset="1" stop-color="${shade(opts.arch, 10)}"/></linearGradient>
    <linearGradient id="light${id}" x1="0" x2="1" y1="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".45"/><stop offset=".6" stop-color="#fff" stop-opacity="0"/></linearGradient>
  </defs>
  <rect width="${W}" height="${H}" fill="url(#wall${id})"/>
  <path d="M${W * (0.28 + ax)} ${floor} L${W * (0.28 + ax)} ${H * 0.36} A${W * 0.22} ${W * 0.22} 0 0 1 ${W * (0.72 + ax)} ${H * 0.36} L${W * (0.72 + ax)} ${floor} Z" fill="url(#arch${id})"/>
  <path d="M${W * (0.08 + ax * 1.9)} ${floor} L${W * (0.08 + ax * 1.9)} ${H * 0.5} A${W * 0.09} ${W * 0.09} 0 0 1 ${W * (0.26 + ax * 1.9)} ${H * 0.5} L${W * (0.26 + ax * 1.9)} ${floor} Z" fill="${shade(opts.arch, 14)}" opacity=".55"/>
  <rect x="0" y="${floor}" width="${W}" height="${H - floor}" fill="${shade(opts.bg, -18)}"/>
  <rect x="0" y="${floor}" width="${W}" height="3" fill="${shade(opts.bg, 18)}"/>
  <polygon points="0,0 ${W * 0.55},0 ${W * 0.2},${H} 0,${H}" fill="url(#light${id})"/>
  ${prods}
</svg>`;
}

/** Monogram brand logo, 400×200. */
export function brandLogoSVG(name: string, color = "#111") {
  const long = name.length > 11;
  const fit = long ? ` textLength="340" lengthAdjust="spacingAndGlyphs"` : "";
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 200" width="400" height="200"><rect width="400" height="200" fill="none"/><text x="200" y="114" text-anchor="middle" font-family="Georgia, 'Times New Roman', serif" font-size="${long ? 30 : 38}" letter-spacing="${long ? 4 : 8}" fill="${color}"${fit}>${esc(name.toUpperCase())}</text></svg>`;
}

function hash(s: string) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  return h;
}
