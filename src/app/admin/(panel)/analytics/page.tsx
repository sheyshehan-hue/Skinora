import { requireStaff } from "@/lib/auth";
import { boughtTogether, customerSegments, kpis, paymentMix, productPerformance, revenueSeries, salesByDistrict, seasonality, type Range } from "@/lib/analytics";
import { compactLKR, formatLKR, pct } from "@/lib/format";
import { PAYMENT_LABEL } from "@/lib/constants";
import { Card, PageTitle, RangeTabs, Stat } from "@/components/admin/ui";
import { BarList, MonthlyBars, RevenueChart, SERIES } from "@/components/admin/Charts";

export const metadata = { title: "Analytics" };

export default async function AnalyticsPage({ searchParams }: { searchParams: Promise<{ range?: Range }> }) {
  await requireStaff("analytics");
  const range = (await searchParams).range ?? "90d";
  const [k, series, products, districts, pay, pairs, seasons, segments] = await Promise.all([
    kpis(range), revenueSeries(range), productPerformance(range), salesByDistrict(range), paymentMix(range), boughtTogether(range, 8), seasonality(), customerSegments(),
  ]);
  const sold = products.filter((p) => p.units > 0);
  const worst = [...products].sort((a, b) => a.revenue - b.revenue).slice(0, 6);
  return (
    <>
      <PageTitle title="Analytics" subtitle="Revenue counts confirmed, packed, shipped and delivered orders.">
        <RangeTabs value={range} base="/admin/analytics" />
      </PageTitle>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-6">
        <Stat label="Revenue" value={compactLKR(k.revenue)} delta={k.deltas.revenue} />
        <Stat label="Gross profit" value={compactLKR(k.profit)} delta={k.deltas.profit} hint={pct(k.margin) + " margin"} />
        <Stat label="Orders" value={k.orders.toLocaleString()} delta={k.deltas.orders} />
        <Stat label="Avg. order value" value={formatLKR(k.aov)} delta={k.deltas.aov} />
        <Stat label="Repeat customers" value={pct(k.repeatRate)} hint="bought 2+ times" />
        <Stat label="Cart abandonment" value={pct(k.abandonmentRate)} hint={`${compactLKR(k.abandonedValue)} left in carts`} invert />
      </div>

      <Card title="Revenue & gross profit" subtitle={`By ${series.bucket}`} className="mt-6"><RevenueChart points={series.points} bucket={series.bucket} /></Card>

      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <Card title="Profit margin by product" subtitle="Top 12 by revenue" pad={false}>
          <div className="overflow-x-auto">
            <table className="table-lux">
              <thead><tr><th>Product</th><th className="text-right">Units</th><th className="text-right">Revenue</th><th className="text-right">Profit</th><th className="text-right">Margin</th></tr></thead>
              <tbody>
                {sold.slice(0, 12).map((p) => (
                  <tr key={p.id}><td><span className="text-ink-400">{p.brand}</span> {p.name}</td><td className="text-right tabular-nums">{p.units}</td><td className="text-right tabular-nums">{compactLKR(p.revenue)}</td><td className="text-right tabular-nums">{compactLKR(p.profit)}</td><td className="text-right tabular-nums">{pct(p.margin, 0)}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
        <div className="grid gap-6">
          <Card title="Best sellers" subtitle="Units sold"><BarList rows={[...sold].sort((a, b) => b.units - a.units).slice(0, 6).map((p) => ({ label: `${p.brand} ${p.name}`, value: p.units }))} format="num" /></Card>
          <Card title="Slowest movers" subtitle="Lowest revenue in period"><BarList rows={worst.map((p) => ({ label: `${p.brand} ${p.name}`, value: p.revenue, sub: `${p.units} units` }))} color={SERIES[1]} /></Card>
        </div>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-3">
        <Card title="Sales by district"><BarList rows={districts.slice(0, 10).map((d) => ({ label: d.district, value: d.revenue, sub: `${d.orders}` }))} /></Card>
        <Card title="Payment methods"><BarList rows={pay.map((p) => ({ label: PAYMENT_LABEL[p.method], value: p.revenue, sub: `${p.orders} orders` }))} /></Card>
        <Card title="Frequently bought together" subtitle="Orders containing both">
          <ul className="space-y-2.5 text-sm">{pairs.map((p) => <li key={p.a + p.b} className="flex justify-between gap-3"><span className="text-ink-700">{p.a} <span className="text-ink-400">+</span> {p.b}</span><span className="shrink-0 tabular-nums text-ink-500">{p.count}</span></li>)}</ul>
        </Card>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-3">
        <Card title="Seasonal trends" subtitle="Monthly revenue, all time. Gifting months (Feb, Apr, Nov, Dec) in orange." className="xl:col-span-2">
          <MonthlyBars data={seasons.months} highlight={[1, 3, 10, 11]} />
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {seasons.seasons.map((s) => (
              <div key={s.name} className="rounded-lg bg-ivory-200 p-3"><p className="text-xs text-ink-500">{s.name}</p><p className="mt-1 font-serif text-2xl">{s.uplift >= 0 ? "+" : ""}{Math.round(s.uplift * 100)}%</p><p className="text-[11px] text-ink-400">vs the 30 days before · {compactLKR(s.avgDaily)}/day</p></div>
            ))}
          </div>
        </Card>
        <Card title="Customer segments" subtitle="By recency, frequency and spend">
          <ul className="space-y-3">
            {segments.summary.map((s) => (
              <li key={s.segment} className="flex items-center justify-between gap-3 text-sm">
                <span><span className="font-medium">{s.segment}</span><span className="block text-xs text-ink-400">avg. {compactLKR(s.avgSpend)} lifetime</span></span>
                <span className="text-right"><span className="tabular-nums">{s.count.toLocaleString()}</span><span className="block text-xs text-ink-400">{compactLKR(s.revenue)}</span></span>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </>
  );
}
