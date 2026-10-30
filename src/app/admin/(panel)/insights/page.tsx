import { requireStaff } from "@/lib/auth";
import { demandForecast, headlineInsights, stockForecast } from "@/lib/insights";
import { compactLKR, formatLKR } from "@/lib/format";
import { Card, PageTitle } from "@/components/admin/ui";
import { InsightList } from "@/components/admin/InsightList";
import { ForecastChart } from "@/components/admin/Charts";

export const metadata = { title: "Smart insights" };

export default async function InsightsPage() {
  await requireStaff("analytics");
  const [insights, forecast, { items }] = await Promise.all([headlineInsights(), demandForecast(8), stockForecast()]);
  const next8 = forecast.forecast.reduce((a, f) => a + f.revenue, 0);
  const topDemand = [...items].sort((a, b) => b.velocity - a.velocity).slice(0, 10);
  return (
    <>
      <PageTitle title="Smart insights" subtitle="Recommendations from your sales velocity, stock, batch expiry and last year's seasonality. Refreshed on every visit." />
      <div className="grid gap-6 xl:grid-cols-5">
        <Card title="Recommended actions" className="xl:col-span-2"><InsightList items={insights} /></Card>
        <div className="space-y-6 xl:col-span-3">
          <Card title="Revenue forecast · next 8 weeks" subtitle={`Expected ${compactLKR(next8)}. Trend from the last 26 weeks, shaped by the same weeks last year.`}>
            <ForecastChart history={forecast.history} forecast={forecast.forecast} />
          </Card>
          <Card title="Demand forecast · next 30 days" subtitle="Expected units by variant at the current pace" pad={false}>
            <table className="table-lux">
              <thead><tr><th>Product</th><th className="text-right">Expected units</th><th className="text-right">In stock</th><th className="text-right">Gap</th></tr></thead>
              <tbody>
                {topDemand.map((i) => {
                  const need = Math.round(i.velocity * 30);
                  return (
                    <tr key={i.variantId}><td><span className="text-ink-400">{i.brand}</span> {i.product} <span className="text-ink-400">· {i.variant}</span></td><td className="text-right tabular-nums">{need}</td><td className="text-right tabular-nums">{i.stock}</td><td className={`text-right tabular-nums ${need > i.stock ? "font-medium text-[#b02e2e]" : "text-ink-400"}`}>{need > i.stock ? `−${need - i.stock}` : "covered"}</td></tr>
                  );
                })}
              </tbody>
            </table>
            <p className="p-4 text-xs text-ink-400">Reorder value for all suggestions: {formatLKR(items.reduce((a, i) => a + i.reorderCost, 0))}</p>
          </Card>
        </div>
      </div>
    </>
  );
}
