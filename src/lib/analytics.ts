import "server-only";
import { prisma } from "./prisma";

const DAY = 86_400_000;
export const REVENUE_STATUSES = ["CONFIRMED", "PACKED", "SHIPPED", "DELIVERED"] as const;
const REV_SQL = `('CONFIRMED','PACKED','SHIPPED','DELIVERED')`;

export type Range = "30d" | "90d" | "12m" | "all";
export function rangeStart(r: Range) {
  const now = Date.now();
  return new Date(r === "30d" ? now - 30 * DAY : r === "90d" ? now - 90 * DAY : r === "12m" ? now - 365 * DAY : 0);
}
const prevStart = (r: Range) => (r === "all" ? new Date(0) : new Date(rangeStart(r).getTime() - (Date.now() - rangeStart(r).getTime())));

type Num = number | bigint | null;
const n = (v: Num) => Number(v ?? 0);

export async function kpis(r: Range) {
  const from = rangeStart(r);
  const pfrom = prevStart(r);
  const q = async (a: Date, b: Date) => {
    const [row] = await prisma.$queryRawUnsafe<{ revenue: Num; orders: Num; customers: Num }[]>(
      `SELECT SUM(total) revenue, COUNT(*) orders, COUNT(DISTINCT "customerId") customers FROM "Order" WHERE status IN ${REV_SQL} AND "createdAt" >= $1 AND "createdAt" < $2`,
      a,
      b,
    );
    const [p] = await prisma.$queryRawUnsafe<{ rev: Num; cost: Num }[]>(
      `SELECT SUM(oi."unitPrice"*oi.quantity) rev, SUM(oi."unitCost"*oi.quantity) cost FROM "OrderItem" oi JOIN "Order" o ON o.id=oi."orderId" WHERE o.status IN ${REV_SQL} AND o."createdAt" >= $1 AND o."createdAt" < $2`,
      a,
      b,
    );
    const revenue = n(row.revenue);
    const orders = n(row.orders);
    const itemRev = n(p.rev);
    const profit = itemRev - n(p.cost);
    return { revenue, orders, aov: orders ? revenue / orders : 0, profit, margin: itemRev ? profit / itemRev : 0, customers: n(row.customers) };
  };
  const [cur, prev] = await Promise.all([q(from, new Date()), r === "all" ? null : q(pfrom, from)]);
  const [rep] = await prisma.$queryRawUnsafe<{ total: Num; repeat: Num }[]>(
    // share of customers buying in the period who have bought more than once overall
    `WITH c AS (SELECT DISTINCT "customerId" FROM "Order" WHERE status IN ${REV_SQL} AND "customerId" IS NOT NULL AND "createdAt" >= $1),
          k AS (SELECT "customerId", COUNT(*) k FROM "Order" WHERE status IN ${REV_SQL} AND "customerId" IN (SELECT "customerId" FROM c) GROUP BY 1)
     SELECT COUNT(*) total, COUNT(*) FILTER (WHERE k >= 2) repeat FROM k`,
    from,
  );
  const [ab] = await prisma.$queryRawUnsafe<{ total: Num; abandoned: Num; lost: Num }[]>(
    `SELECT COUNT(*) total, COUNT(*) FILTER (WHERE "orderId" IS NULL) abandoned, SUM(value) FILTER (WHERE "orderId" IS NULL) lost FROM "CheckoutSession" WHERE "createdAt" >= $1 AND "createdAt" < NOW() - interval '2 hours'`,
    from,
  );
  const delta = (k: keyof typeof cur) => (prev && prev[k] ? (cur[k] - prev[k]) / prev[k] : null);
  return {
    ...cur,
    deltas: { revenue: delta("revenue"), orders: delta("orders"), aov: delta("aov"), profit: delta("profit") },
    repeatRate: n(rep.total) ? n(rep.repeat) / n(rep.total) : 0,
    abandonmentRate: n(ab.total) ? n(ab.abandoned) / n(ab.total) : 0,
    abandonedValue: n(ab.lost),
    abandonedCount: n(ab.abandoned),
  };
}

/** Revenue & orders over time; buckets by day (≤90d) or month. */
export async function revenueSeries(r: Range) {
  const from = rangeStart(r);
  const bucket = r === "30d" || r === "90d" ? "day" : r === "12m" ? "week" : "month";
  const rows = await prisma.$queryRawUnsafe<{ b: Date; revenue: Num; orders: Num; profit: Num }[]>(
    `SELECT date_trunc('${bucket}', o."createdAt") b, SUM(o.total) revenue, COUNT(DISTINCT o.id) orders,
            SUM(x.profit) profit
     FROM "Order" o
     JOIN (SELECT "orderId", SUM(("unitPrice"-"unitCost")*quantity) profit FROM "OrderItem" GROUP BY 1) x ON x."orderId"=o.id
     WHERE o.status IN ${REV_SQL} AND o."createdAt" >= $1 GROUP BY 1 ORDER BY 1`,
    from,
  );
  return { bucket, points: rows.map((x) => ({ date: x.b.toISOString(), revenue: n(x.revenue), orders: n(x.orders), profit: n(x.profit) })) };
}

export async function productPerformance(r: Range) {
  const from = rangeStart(r);
  const rows = await prisma.$queryRawUnsafe<{ id: string; name: string; brand: string; units: Num; revenue: Num; cost: Num; orders: Num }[]>(
    `SELECT p.id, p.name, b.name brand, COALESCE(SUM(oi.quantity),0) units, COALESCE(SUM(oi."unitPrice"*oi.quantity),0) revenue, COALESCE(SUM(oi."unitCost"*oi.quantity),0) cost, COUNT(DISTINCT oi."orderId") orders
     FROM "Product" p JOIN "Brand" b ON b.id=p."brandId"
     LEFT JOIN "Variant" v ON v."productId"=p.id
     LEFT JOIN "OrderItem" oi ON oi."variantId"=v.id AND oi."orderId" IN (SELECT id FROM "Order" WHERE status IN ${REV_SQL} AND "createdAt" >= $1)
     WHERE p.status='ACTIVE' GROUP BY p.id, p.name, b.name ORDER BY revenue DESC`,
    from,
  );
  return rows.map((x) => {
    const revenue = n(x.revenue);
    const profit = revenue - n(x.cost);
    return { id: x.id, name: x.name, brand: x.brand, units: n(x.units), revenue, profit, margin: revenue ? profit / revenue : 0, orders: n(x.orders) };
  });
}

export async function salesByDistrict(r: Range) {
  const rows = await prisma.$queryRawUnsafe<{ district: string; revenue: Num; orders: Num }[]>(
    `SELECT district, SUM(total) revenue, COUNT(*) orders FROM "Order" WHERE status IN ${REV_SQL} AND "createdAt" >= $1 GROUP BY 1 ORDER BY revenue DESC`,
    rangeStart(r),
  );
  return rows.map((x) => ({ district: x.district, revenue: n(x.revenue), orders: n(x.orders) }));
}

export async function paymentMix(r: Range) {
  const rows = await prisma.$queryRawUnsafe<{ m: string; revenue: Num; orders: Num }[]>(
    `SELECT "paymentMethod" m, SUM(total) revenue, COUNT(*) orders FROM "Order" WHERE status IN ${REV_SQL} AND "createdAt" >= $1 GROUP BY 1 ORDER BY revenue DESC`,
    rangeStart(r),
  );
  return rows.map((x) => ({ method: x.m, revenue: n(x.revenue), orders: n(x.orders) }));
}

/** Product pairs that appear in the same order most often. */
export async function boughtTogether(r: Range, limit = 10) {
  const rows = await prisma.$queryRawUnsafe<{ a: string; b: string; n: Num }[]>(
    `WITH x AS (SELECT DISTINCT oi."orderId", v."productId" FROM "OrderItem" oi JOIN "Variant" v ON v.id=oi."variantId" JOIN "Order" o ON o.id=oi."orderId" WHERE o.status IN ${REV_SQL} AND o."createdAt" >= $1)
     SELECT pa.name a, pb.name b, COUNT(*) n FROM x x1 JOIN x x2 ON x1."orderId"=x2."orderId" AND x1."productId" < x2."productId"
     JOIN "Product" pa ON pa.id=x1."productId" JOIN "Product" pb ON pb.id=x2."productId" GROUP BY 1,2 ORDER BY n DESC LIMIT ${limit}`,
    rangeStart(r),
  );
  return rows.map((x) => ({ a: x.a, b: x.b, count: n(x.n) }));
}

/** Monthly revenue for the full history, plus how each gifting season performs vs a normal day. */
export async function seasonality() {
  const months = await prisma.$queryRawUnsafe<{ m: Date; revenue: Num }[]>(
    `SELECT date_trunc('month', "createdAt") m, SUM(total) revenue FROM "Order" WHERE status IN ${REV_SQL} GROUP BY 1 ORDER BY 1`,
  );
  const daily = await prisma.$queryRawUnsafe<{ d: Date; revenue: Num }[]>(
    `SELECT date_trunc('day', "createdAt") d, SUM(total) revenue FROM "Order" WHERE status IN ${REV_SQL} GROUP BY 1`,
  );
  const seasons = [
    { name: "Avurudu", test: (d: Date) => d.getMonth() === 3 && d.getDate() <= 14 },
    { name: "Valentine's", test: (d: Date) => d.getMonth() === 1 && d.getDate() <= 14 },
    { name: "Black Friday", test: (d: Date) => d.getMonth() === 10 && d.getDate() >= 24 },
    { name: "Christmas", test: (d: Date) => d.getMonth() === 11 && d.getDate() <= 26 },
  ];
  // Baseline: the 30 days before each season window, so growth over time doesn't inflate uplift
  const byDay = new Map(daily.map((x) => [x.d.toISOString().slice(0, 10), n(x.revenue)]));
  const result = seasons.map((s) => {
    const inSeason = daily.filter((x) => s.test(x.d));
    if (!inSeason.length) return { name: s.name, avgDaily: 0, uplift: 0 };
    const avg = inSeason.reduce((a, x) => a + n(x.revenue), 0) / inSeason.length;
    const first = inSeason.reduce((a, x) => (x.d < a ? x.d : a), inSeason[0].d);
    let base = 0;
    let k = 0;
    for (let i = 1; i <= 30; i++) {
      const v = byDay.get(new Date(first.getTime() - i * DAY).toISOString().slice(0, 10));
      if (v !== undefined) {
        base += v;
        k++;
      }
    }
    return { name: s.name, avgDaily: avg, uplift: k ? avg / (base / k) - 1 : 0 };
  });
  return { months: months.map((x) => ({ month: x.m.toISOString(), revenue: n(x.revenue) })), seasons: result };
}

/** VIP / loyal / new / at-risk / lapsed segmentation from recency, frequency and spend. */
export async function customerSegments() {
  const rows = await prisma.$queryRawUnsafe<{ id: string; name: string; email: string; district: string | null; orders: Num; spend: Num; last: Date; first: Date }[]>(
    `SELECT c.id, c.name, c.email, c.district, COUNT(o.id) orders, SUM(o.total) spend, MAX(o."createdAt") last, MIN(o."createdAt") first
     FROM "Customer" c JOIN "Order" o ON o."customerId"=c.id AND o.status IN ${REV_SQL} GROUP BY c.id`,
  );
  const now = Date.now();
  const tag = (x: (typeof rows)[number]) => {
    const orders = n(x.orders);
    const spend = n(x.spend);
    const since = (now - x.last.getTime()) / DAY;
    const age = (now - x.first.getTime()) / DAY;
    if ((spend >= 150000 || orders >= 5) && since <= 120) return "VIP";
    if (orders >= 2 && since > 90) return "At risk";
    if (age <= 30) return "New";
    if (orders >= 2) return "Loyal";
    if (since > 180) return "Lapsed";
    return "One-time";
  };
  const customers = rows.map((x) => ({ id: x.id, name: x.name, email: x.email, district: x.district, orders: n(x.orders), spend: n(x.spend), last: x.last, segment: tag(x) }));
  const order = ["VIP", "Loyal", "New", "One-time", "At risk", "Lapsed"];
  const summary = order.map((s) => {
    const list = customers.filter((c) => c.segment === s);
    return { segment: s, count: list.length, revenue: list.reduce((a, c) => a + c.spend, 0), avgSpend: list.length ? list.reduce((a, c) => a + c.spend, 0) / list.length : 0 };
  });
  return { customers, summary };
}

export async function orderPipeline() {
  const [byStatus, cod] = await Promise.all([
    prisma.order.groupBy({ by: ["status"], _count: true, _sum: { total: true }, where: { createdAt: { gte: new Date(Date.now() - 60 * DAY) } } }),
    prisma.$queryRawUnsafe<{ in_transit: Num; in_transit_n: Num; to_remit: Num; to_remit_n: Num; remitted: Num }[]>(
      `SELECT SUM(total) FILTER (WHERE status IN ('CONFIRMED','PACKED','SHIPPED')) in_transit, COUNT(*) FILTER (WHERE status IN ('CONFIRMED','PACKED','SHIPPED')) in_transit_n,
              SUM(total) FILTER (WHERE "codCollected" AND "codRemittedAt" IS NULL) to_remit, COUNT(*) FILTER (WHERE "codCollected" AND "codRemittedAt" IS NULL) to_remit_n,
              SUM(total) FILTER (WHERE "codRemittedAt" >= NOW() - interval '30 days') remitted
       FROM "Order" WHERE "paymentMethod"='COD'`,
    ),
  ]);
  const c = cod[0];
  return {
    byStatus: byStatus.map((s) => ({ status: s.status, count: s._count, value: s._sum.total ?? 0 })),
    cod: { inTransit: n(c.in_transit), inTransitCount: n(c.in_transit_n), toRemit: n(c.to_remit), toRemitCount: n(c.to_remit_n), remitted30d: n(c.remitted) },
  };
}
