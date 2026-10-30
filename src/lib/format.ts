const lkr = new Intl.NumberFormat("en-LK", { maximumFractionDigits: 0 });

/** Format whole rupees as "LKR 12,500". */
export function formatLKR(value: number) {
  return `LKR\u00a0${lkr.format(Math.round(value))}`;
}

export function compactLKR(value: number) {
  if (Math.abs(value) >= 1_000_000) return `LKR\u00a0${(value / 1_000_000).toFixed(value >= 10_000_000 ? 1 : 2)}M`;
  if (Math.abs(value) >= 1_000) return `LKR\u00a0${(value / 1_000).toFixed(0)}K`;
  return formatLKR(value);
}

export function formatDate(d: Date | string, opts: Intl.DateTimeFormatOptions = { day: "numeric", month: "short", year: "numeric" }) {
  return new Date(d).toLocaleDateString("en-GB", opts);
}

export function pct(n: number, digits = 1) {
  return `${(n * 100).toFixed(digits)}%`;
}

export function slugify(s: string) {
  return s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/[\s_]+/g, "-")
    .replace(/-+/g, "-");
}

export function effectivePrice(v: { price: number; salePrice: number | null }) {
  return v.salePrice && v.salePrice < v.price ? v.salePrice : v.price;
}

export function daysBetween(a: Date, b: Date) {
  return Math.round((b.getTime() - a.getTime()) / 86_400_000);
}
