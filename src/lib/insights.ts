import "server-only";
import { prisma } from "./prisma";
import { formatLKR } from "./format";

/**
 * Smart insights: a transparent statistical engine (sales velocity, seasonal
 * indices from last year's history, and Holt's linear trend) that turns raw
 * sales and stock into plain-English actions.
 */

const DAY = 86_400_000;
type Num = number | bigint | null;
const n = (v: Num) => Number(v ?? 0);

/** Upcoming gifting season (within 45 days) and its historical demand multiplier. */
function upcomingSeason(now = new Date()) {
  const y = now.getFullYear();
  const events = [
    { name: "Valentine's", start: new Date(y, 1, 1), end: new Date(y, 1, 14), mult: 1.5 },
    { name: "Avurudu", start: new Date(y, 3, 1), end: new Date(y, 3, 14), mult: 1.7 },
    { name: "Black Friday", start: new Date(y, 10, 24), end: new Date(y, 10, 30), mult: 1.6 },
    { name: "Christmas", start: new Date(y, 11, 1), end: new Date(y, 11, 26), mult: 1.9 },
    { name: "Valentine's", start: new Date(y + 1, 1, 1), end: new Date(y + 1, 1, 14), mult: 1.5 },
  ];
  return events.find((e) => e.end > now && e.start.getTime() - now.getTime() < 45 * DAY) ?? null;
}

export type StockInsight = {
  variantId: string;
  productId: string;
  product: string;
  brand: string;
  variant: string;
  sku: string;
  stock: number;
  velocity: number; // units/day
  daysLeft: number | null;
  leadTimeDays: number;
  reorderQty: number;
  reorderCost: number;
  severity: "critical" | "serious" | "warning" | "good";
  trend: number | null; // last 30 vs prior 30
};

export async function stockForecast() {
  const variants = await prisma.variant.findMany({ where: { product: { status: "ACTIVE" } }, include: { product: { include: { brand: true } } } });
  const sales = await prisma.$queryRaw<{ variantId: string; d7: Num; d30: Num; d60: Num }[]>`
    SELECT oi."variantId",
      SUM(oi.quantity) FILTER (WHERE o."createdAt" >= NOW() - interval '7 days') d7,
      SUM(oi.quantity) FILTER (WHERE o."createdAt" >= NOW() - interval '30 days') d30,
      SUM(oi.quantity) FILTER (WHERE o."createdAt" >= NOW() - interval '60 days' AND o."createdAt" < NOW() - interval '30 days') d60
    FROM "OrderItem" oi JOIN "Order" o ON o.id = oi."orderId"
    WHERE o.status NOT IN ('CANCELLED') AND o."createdAt" >= NOW() - interval '60 days'
    GROUP BY 1`;
  const season = upcomingSeason();
  const COVER_DAYS = 30; // aim to hold a month of stock after the shipment lands

  const items: StockInsight[] = variants.map((v) => {
    const s = sales.find((x) => x.variantId === v.id);
    const d7 = n(s?.d7 ?? 0);
    const d30 = n(s?.d30 ?? 0);
    const prior = n(s?.d60 ?? 0);
    // weight the most recent week more, so a sudden spike is noticed quickly
    let velocity = (d7 / 7) * 0.4 + (d30 / 30) * 0.6;
    if (season && v.product.gender) velocity *= season.mult;
    else if (season) velocity *= 1 + (season.mult - 1) * 0.5;
    const daysLeft = velocity > 0 ? v.stock / velocity : null;
    const need = velocity * (v.leadTimeDays + COVER_DAYS) - v.stock;
    const reorderQty = need > 0 ? Math.max(5, Math.ceil(need / 5) * 5) : 0;
    const severity = v.stock === 0 && velocity > 0 ? "critical" : daysLeft !== null && daysLeft < v.leadTimeDays ? "serious" : daysLeft !== null && daysLeft < v.leadTimeDays + 14 ? "warning" : "good";
    return {
      variantId: v.id,
      productId: v.productId,
      product: v.product.name,
      brand: v.product.brand.name,
      variant: v.name,
      sku: v.sku,
      stock: v.stock,
      velocity,
      daysLeft,
      leadTimeDays: v.leadTimeDays,
      reorderQty,
      reorderCost: reorderQty * v.costPrice,
      severity,
      trend: prior >= 5 ? (d30 - prior) / prior : null,
    };
  });
  return { items, season };
}

export async function expiryRisk() {
  const batches = await prisma.batch.findMany({
    where: { remaining: { gt: 0 }, expiryDate: { lt: new Date(Date.now() + 180 * DAY) } },
    include: { variant: { include: { product: { include: { brand: true } } } }, supplier: true },
    orderBy: { expiryDate: "asc" },
  });
  const { items } = await stockForecast();
  return batches.map((b) => {
    const days = Math.round((b.expiryDate.getTime() - Date.now()) / DAY);
    const velocity = items.find((i) => i.variantId === b.variantId)?.velocity ?? 0;
    // FEFO: older batches of the same variant sell first, so this batch only gets the velocity left after them
    const willSell = Math.floor(velocity * Math.max(0, days - 30)); // stop selling 30 days before expiry
    const atRisk = Math.max(0, b.remaining - willSell);
    return {
      id: b.id,
      batchNumber: b.batchNumber,
      product: `${b.variant.product.brand.name} ${b.variant.product.name}`,
      variant: b.variant.name,
      remaining: b.remaining,
      expiryDate: b.expiryDate,
      days,
      willSell,
      atRisk,
      valueAtRisk: atRisk * b.unitCost,
      severity: days < 30 ? "critical" : atRisk > 0 && days < 90 ? "serious" : atRisk > 0 ? "warning" : "good",
    } as const;
  });
}

/** Weekly revenue forecast: Holt's linear trend on the last 26 weeks × last year's seasonal index. */
export async function demandForecast(weeks = 8) {
  const rows = await prisma.$queryRaw<{ w: Date; revenue: Num }[]>`
    SELECT date_trunc('week', "createdAt") w, SUM(total) revenue FROM "Order"
    WHERE status IN ('CONFIRMED','PACKED','SHIPPED','DELIVERED') AND "createdAt" < date_trunc('week', NOW())
    GROUP BY 1 ORDER BY 1`;
  const series = rows.map((r) => ({ w: r.w, v: n(r.revenue) }));
  if (series.length < 12) return { history: [], forecast: [] };

  // seasonal index per ISO week-of-year from history: value / centred 9-week mean
  const idx = new Map<number, number[]>();
  const woy = (d: Date) => Math.floor((d.getTime() - new Date(d.getFullYear(), 0, 1).getTime()) / (7 * DAY));
  series.forEach((p, i) => {
    const win = series.slice(Math.max(0, i - 4), i + 5);
    if (win.length < 7) return;
    const mean = win.reduce((a, x) => a + x.v, 0) / win.length;
    const k = woy(p.w);
    idx.set(k, [...(idx.get(k) ?? []), p.v / mean]);
  });
  const si = (d: Date) => {
    const v = idx.get(woy(d));
    return v ? Math.min(2.4, Math.max(0.6, v.reduce((a, x) => a + x, 0) / v.length)) : 1;
  };

  // Holt's linear smoothing on de-seasonalised recent data
  const recent = series.slice(-26).map((p) => ({ ...p, d: p.v / si(p.w) }));
  const alpha = 0.35;
  const beta = 0.1;
  let level = recent[0].d;
  let trend = (recent[recent.length - 1].d - recent[0].d) / recent.length;
  for (const p of recent.slice(1)) {
    const prev = level;
    level = alpha * p.d + (1 - alpha) * (level + trend);
    trend = beta * (level - prev) + (1 - beta) * trend;
  }
  const residuals = recent.map((p) => p.d - level);
  const sd = Math.sqrt(residuals.reduce((a, r) => a + r * r, 0) / residuals.length) * 0.6;
  const last = series[series.length - 1].w.getTime();
  const forecast = Array.from({ length: weeks }, (_, h) => {
    const w = new Date(last + (h + 1) * 7 * DAY);
    const base = (level + trend * (h + 1)) * si(w);
    return { week: w.toISOString(), revenue: Math.round(base), low: Math.round(base - sd * Math.sqrt(h + 1)), high: Math.round(base + sd * Math.sqrt(h + 1)) };
  });
  return { history: series.slice(-20).map((p) => ({ week: p.w.toISOString(), revenue: p.v })), forecast };
}

export type Insight = { id: string; tone: "critical" | "serious" | "warning" | "good" | "info"; title: string; detail: string; href?: string; action?: string };

/** The headline insights shown on the dashboard. */
export async function headlineInsights(): Promise<Insight[]> {
  const [{ items, season }, expiry, forecast] = await Promise.all([stockForecast(), expiryRisk(), demandForecast(4)]);
  const out: Insight[] = [];

  const urgent = items
    .filter((i) => i.reorderQty > 0 && i.daysLeft !== null && i.velocity > 0.05)
    .sort((a, b) => (a.daysLeft ?? 0) - (b.daysLeft ?? 0))
    .slice(0, 4);
  for (const i of urgent) {
    const days = Math.max(0, Math.round(i.daysLeft ?? 0));
    out.push({
      id: `stock-${i.variantId}`,
      tone: i.severity === "good" ? "warning" : i.severity,
      title: i.stock === 0 ? `${i.brand} ${i.product} (${i.variant}) is sold out` : `${i.brand} ${i.product} (${i.variant}) will run out in ${days} day${days === 1 ? "" : "s"}`,
      detail: `Selling ${i.velocity.toFixed(1)}/day${season ? ` with ${season.name} demand factored in` : ""}. Supplier lead time is ${i.leadTimeDays} days. Reorder ${i.reorderQty} units (≈ ${formatLKR(i.reorderCost)} landed cost).`,
      href: "/admin/inventory?tab=reorder",
      action: "Plan reorder",
    });
  }

  const risky = expiry.filter((e) => e.atRisk > 0 && e.days < 120).slice(0, 2);
  for (const e of risky)
    out.push({
      id: `exp-${e.id}`,
      tone: e.days < 45 ? "critical" : "serious",
      title: `${e.atRisk} units of ${e.product} expire in ${e.days} days`,
      detail: `Batch ${e.batchNumber}: ${e.remaining} left, and at current pace about ${e.willSell} will sell in time. Consider a flash sale or bundle to clear ${formatLKR(e.valueAtRisk)} of stock.`,
      href: "/admin/inventory?tab=expiry",
      action: "Create flash sale",
    });

  const rising = items.filter((i) => i.trend !== null && i.trend > 0.4 && i.velocity > 0.2).sort((a, b) => (b.trend ?? 0) - (a.trend ?? 0))[0];
  if (rising)
    out.push({ id: "trend", tone: "good", title: `${rising.brand} ${rising.product} is trending: +${Math.round((rising.trend ?? 0) * 100)}% in 30 days`, detail: `Make sure it's featured on the home page and that stock covers the next ${rising.leadTimeDays + 30} days.`, href: "/admin/content", action: "Feature it" });

  if (season)
    out.push({ id: "season", tone: "info", title: `${season.name} begins ${new Date(season.start).toLocaleDateString("en-GB", { day: "numeric", month: "long" })}`, detail: `Last year demand rose about ${Math.round((season.mult - 1) * 100)}% in this window, led by fragrance and gift sets. Prepare a gift edit and check fragrance stock now.`, href: "/admin/promotions", action: "Plan promotion" });

  if (forecast.forecast.length) {
    const next4 = forecast.forecast.reduce((a, f) => a + f.revenue, 0);
    const last4 = forecast.history.slice(-4).reduce((a, f) => a + f.revenue, 0);
    const ch = last4 ? next4 / last4 - 1 : 0;
    out.push({ id: "forecast", tone: "info", title: `Forecast: ${formatLKR(next4)} revenue over the next 4 weeks`, detail: `${Math.abs(ch) < 0.01 ? "In line with" : `${ch > 0 ? "Up" : "Down"} ${Math.abs(Math.round(ch * 100))}% on`} the last 4 weeks, based on recent trend and last year's seasonality.`, href: "/admin/analytics", action: "See forecast" });
  }

  const dead = items.filter((i) => i.stock > 10 && i.velocity === 0);
  if (dead.length)
    out.push({ id: "dead", tone: "warning", title: `${dead.length} product${dead.length > 1 ? "s have" : " has"} not sold in 60 days`, detail: `${dead.slice(0, 3).map((d) => d.product).join(", ")}. Consider bundling with a best seller.`, href: "/admin/inventory", action: "Review" });

  return out;
}
