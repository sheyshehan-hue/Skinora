import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireStaff } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { kpis, orderPipeline, revenueSeries, type Range } from "@/lib/analytics";
import { headlineInsights } from "@/lib/insights";
import { compactLKR, formatDate, formatLKR, pct } from "@/lib/format";
import { ORDER_STATUS_LABEL, PAYMENT_LABEL } from "@/lib/constants";
import { Card, OrderBadge, PageTitle, RangeTabs, Stat, Badge } from "@/components/admin/ui";
import { RevenueChart } from "@/components/admin/Charts";
import { InsightList } from "@/components/admin/InsightList";

export const metadata = { title: "Overview" };

export default async function Overview({ searchParams }: { searchParams: Promise<{ range?: Range; denied?: string }> }) {
  const staff = await requireStaff("dashboard");
  const sp = await searchParams;
  const range = sp.range ?? "30d";
  const finance = can(staff.role, "analytics");
  const [k, series, insights, pipeline, recent, low] = await Promise.all([
    finance ? kpis(range) : null,
    finance ? revenueSeries(range) : null,
    can(staff.role, "inventory") ? headlineInsights() : Promise.resolve([]),
    orderPipeline(),
    prisma.order.findMany({ orderBy: { createdAt: "desc" }, take: 8 }),
    prisma.variant.findMany({ where: { product: { status: "ACTIVE" }, stock: { lte: prisma.variant.fields.reorderLevel } }, include: { product: { include: { brand: true } } }, orderBy: { stock: "asc" }, take: 8 }),
  ]);
  const count = (s: string) => pipeline.byStatus.find((b) => b.status === s)?.count ?? 0;
  const hour = new Date().getHours();

  return (
    <>
      {sp.denied && <p className="mb-6 rounded-lg border border-[#ec835a]/40 bg-[#ec835a]/10 p-3 text-sm">Your role doesn&apos;t have access to that page.</p>}
      <PageTitle title={`Good ${hour < 12 ? "morning" : hour < 17 ? "afternoon" : "evening"}, ${staff.name.split(" ")[0]}`} subtitle={formatDate(new Date(), { weekday: "long", day: "numeric", month: "long", year: "numeric" })}>
        {finance && <RangeTabs value={range} base="/admin" />}
      </PageTitle>

      {k && (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
          <Stat label="Revenue" value={compactLKR(k.revenue)} delta={k.deltas.revenue} hint="vs prior period" />
          <Stat label="Orders" value={k.orders.toLocaleString()} delta={k.deltas.orders} />
          <Stat label="Average order value" value={formatLKR(k.aov)} delta={k.deltas.aov} />
          <Stat label="Gross margin" value={pct(k.margin)} hint={`${compactLKR(k.profit)} profit`} />
          <Stat label="Repeat customer rate" value={pct(k.repeatRate)} hint={`${pct(k.abandonmentRate, 0)} cart abandonment`} />
        </div>
      )}

      <div className="mt-6 grid gap-6 xl:grid-cols-3">
        {series && (
          <Card title="Revenue & profit" subtitle={`By ${series.bucket}`} className="xl:col-span-2">
            <RevenueChart points={series.points} bucket={series.bucket} />
          </Card>
        )}
        {can(staff.role, "inventory") && (
          <Card title="Smart insights" subtitle="What needs your attention today" action={<Link href="/admin/insights" className="text-xs text-ink-500 hover:text-ink">All →</Link>} className={series ? "" : "xl:col-span-3"}>
            <InsightList items={insights.slice(0, 5)} compact />
          </Card>
        )}
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2 xl:grid-cols-3">
        <Card title="Order pipeline" subtitle="Last 60 days" action={<Link href="/admin/orders" className="text-xs text-ink-500 hover:text-ink">Manage →</Link>}>
          <div className="grid grid-cols-2 gap-3">
            {(["PENDING_PAYMENT", "CONFIRMED", "PACKED", "SHIPPED"] as const).map((s) => (
              <Link key={s} href={`/admin/orders?status=${s}`} className="rounded-lg border border-ink/[0.06] p-3 transition hover:border-ink/20">
                <p className="text-xs text-ink-500">{ORDER_STATUS_LABEL[s]}</p>
                <p className="mt-1 font-serif text-3xl">{count(s)}</p>
              </Link>
            ))}
          </div>
          <div className="mt-4 rounded-lg bg-ivory-200 p-3 text-xs">
            <p className="font-medium">Cash on delivery</p>
            <p className="mt-1 text-ink-600">{formatLKR(pipeline.cod.inTransit)} with couriers ({pipeline.cod.inTransitCount} orders) · {formatLKR(pipeline.cod.toRemit)} collected, awaiting remittance ({pipeline.cod.toRemitCount})</p>
          </div>
        </Card>
        <Card title="Recent orders" pad={false} className="xl:col-span-2" action={<Link href="/admin/orders" className="text-xs text-ink-500 hover:text-ink">View all →</Link>}>
          <div className="overflow-x-auto">
            <table className="table-lux">
              <thead><tr><th>Order</th><th>Customer</th><th>District</th><th>Payment</th><th>Status</th><th className="text-right">Total</th></tr></thead>
              <tbody>
                {recent.map((o) => (
                  <tr key={o.id}>
                    <td><Link href={`/admin/orders/${o.id}`} className="font-mono text-xs hover:underline">{o.number}</Link><p className="text-[11px] text-ink-400">{formatDate(o.createdAt, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</p></td>
                    <td>{o.name}</td>
                    <td className="text-ink-500">{o.district}</td>
                    <td className="text-ink-500">{PAYMENT_LABEL[o.paymentMethod]}</td>
                    <td><OrderBadge status={o.status} label={ORDER_STATUS_LABEL[o.status]} /></td>
                    <td className="text-right tabular-nums">{formatLKR(o.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
        {can(staff.role, "inventory") && (
          <Card title="Low stock" subtitle="At or below reorder level" pad={false} className="lg:col-span-2 xl:col-span-3" action={<Link href="/admin/inventory" className="text-xs text-ink-500 hover:text-ink">Inventory →</Link>}>
            <div className="overflow-x-auto">
              <table className="table-lux">
                <thead><tr><th>Product</th><th>SKU</th><th>Stock</th><th>Reorder level</th><th /></tr></thead>
                <tbody>
                  {low.map((v) => (
                    <tr key={v.id}>
                      <td><span className="text-ink-400">{v.product.brand.name}</span> {v.product.name} <span className="text-ink-400">· {v.name}</span></td>
                      <td className="font-mono text-xs">{v.sku}</td>
                      <td className="tabular-nums">{v.stock}</td>
                      <td className="tabular-nums text-ink-500">{v.reorderLevel}</td>
                      <td>{v.stock === 0 ? <Badge tone="critical">Sold out</Badge> : <Badge tone="warning">Low</Badge>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}
      </div>
    </>
  );
}
