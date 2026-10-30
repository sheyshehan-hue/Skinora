import Link from "next/link";
import clsx from "clsx";
import { prisma } from "@/lib/prisma";
import { requireStaff } from "@/lib/auth";
import { expiryRisk, stockForecast } from "@/lib/insights";
import { receiveStock, writeOffBatch } from "@/actions/admin/ops";
import { compactLKR, formatDate, formatLKR } from "@/lib/format";
import { Badge, Card, PageTitle, Stat } from "@/components/admin/ui";

export const metadata = { title: "Inventory" };

const TABS = [["stock", "Stock levels"], ["reorder", "Reorder suggestions"], ["expiry", "Expiry & batches"], ["receive", "Receive stock"]] as const;
const SEV_LABEL = { critical: "Out of stock", serious: "Reorder now", warning: "Reorder soon", good: "Healthy" };

export default async function InventoryPage({ searchParams }: { searchParams: Promise<{ tab?: string; q?: string }> }) {
  await requireStaff("inventory");
  const sp = await searchParams;
  const tab = sp.tab ?? "stock";
  const [{ items, season }, expiry, valuation, suppliers, variants] = await Promise.all([
    stockForecast(),
    expiryRisk(),
    prisma.$queryRaw<{ cost: bigint; retail: bigint; units: bigint }[]>`SELECT SUM(b.remaining*b."unitCost") cost, SUM(b.remaining*v.price) retail, SUM(b.remaining) units FROM "Batch" b JOIN "Variant" v ON v.id=b."variantId"`,
    prisma.supplier.findMany({ orderBy: { name: "asc" } }),
    tab === "receive" ? prisma.variant.findMany({ include: { product: { include: { brand: true } } }, orderBy: [{ product: { name: "asc" } }] }) : Promise.resolve([]),
  ]);
  const q = sp.q?.toLowerCase();
  const filtered = items.filter((i) => !q || `${i.brand} ${i.product} ${i.sku}`.toLowerCase().includes(q));
  const reorder = items.filter((i) => i.reorderQty > 0 && i.velocity > 0).sort((a, b) => (a.daysLeft ?? 0) - (b.daysLeft ?? 0));
  const v = valuation[0];

  return (
    <>
      <PageTitle title="Inventory" subtitle={season ? `${season.name} is coming: forecasts include last year's seasonal uplift.` : "Stock, batches and expiry, dispatched first-expiry-first-out."} />
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label="Units in stock" value={Number(v.units).toLocaleString()} hint={`${items.length} variants`} />
        <Stat label="Stock value (cost)" value={compactLKR(Number(v.cost))} hint={`${compactLKR(Number(v.retail))} at retail`} />
        <Stat label="Need reordering" value={String(reorder.filter((r) => r.severity !== "good").length)} hint={`${items.filter((i) => i.stock === 0).length} sold out`} />
        <Stat label="Expiring in 90 days" value={String(expiry.filter((e) => e.days <= 90).length)} hint={`${formatLKR(expiry.reduce((a, e) => a + e.valueAtRisk, 0))} at risk`} />
      </div>

      <div className="no-scrollbar my-6 flex gap-1 overflow-x-auto">
        {TABS.map(([k, l]) => (
          <Link key={k} href={`?tab=${k}`} className={clsx("shrink-0 rounded-lg px-3 py-1.5 text-sm", tab === k ? "bg-ink text-white" : "text-ink-600 hover:bg-white")}>{l}</Link>
        ))}
      </div>

      {tab === "stock" && (
        <Card pad={false}>
          <form className="border-b border-ink/[0.06] p-4"><input type="hidden" name="tab" value="stock" /><input name="q" defaultValue={sp.q} placeholder="Search product or SKU" className="a-input max-w-xs" /></form>
          <div className="overflow-x-auto">
            <table className="table-lux">
              <thead><tr><th>Product</th><th>SKU</th><th className="text-right">Stock</th><th className="text-right">Sells / day</th><th className="text-right">Days of cover</th><th className="text-right">30-day trend</th><th>Status</th></tr></thead>
              <tbody>
                {filtered.sort((a, b) => (a.daysLeft ?? 9999) - (b.daysLeft ?? 9999)).map((i) => (
                  <tr key={i.variantId}>
                    <td><Link href={`/admin/products/${i.productId}`} className="hover:underline"><span className="text-ink-400">{i.brand}</span> {i.product}</Link> <span className="text-ink-400">· {i.variant}</span></td>
                    <td className="font-mono text-xs">{i.sku}</td>
                    <td className="text-right tabular-nums">{i.stock}</td>
                    <td className="text-right tabular-nums">{i.velocity.toFixed(2)}</td>
                    <td className="text-right tabular-nums">{i.daysLeft === null ? "—" : Math.round(i.daysLeft)}</td>
                    <td className={clsx("text-right tabular-nums", (i.trend ?? 0) > 0 ? "text-[#0a7f0a]" : (i.trend ?? 0) < 0 ? "text-[#b02e2e]" : "")}>{i.trend === null ? "—" : `${i.trend > 0 ? "+" : ""}${Math.round(i.trend * 100)}%`}</td>
                    <td><Badge tone={i.severity}>{SEV_LABEL[i.severity]}</Badge></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {tab === "reorder" && (
        <Card title="Suggested purchase order" subtitle="Quantity covers supplier lead time plus 30 days, from a velocity weighted towards the last 7 days." pad={false}>
          <div className="overflow-x-auto">
            <table className="table-lux">
              <thead><tr><th>Product</th><th className="text-right">Stock</th><th className="text-right">Runs out in</th><th className="text-right">Lead time</th><th className="text-right">Order qty</th><th className="text-right">Est. cost</th><th /></tr></thead>
              <tbody>
                {reorder.map((i) => (
                  <tr key={i.variantId}>
                    <td><span className="text-ink-400">{i.brand}</span> {i.product} <span className="text-ink-400">· {i.variant}</span></td>
                    <td className="text-right tabular-nums">{i.stock}</td>
                    <td className="text-right tabular-nums">{i.stock === 0 ? "Sold out" : `${Math.round(i.daysLeft ?? 0)} days`}</td>
                    <td className="text-right tabular-nums text-ink-500">{i.leadTimeDays} days</td>
                    <td className="text-right font-medium tabular-nums">{i.reorderQty}</td>
                    <td className="text-right tabular-nums">{formatLKR(i.reorderCost)}</td>
                    <td><Badge tone={i.severity}>{SEV_LABEL[i.severity]}</Badge></td>
                  </tr>
                ))}
              </tbody>
              <tfoot><tr><td colSpan={5} className="text-right font-medium">Total</td><td className="text-right font-medium tabular-nums">{formatLKR(reorder.reduce((a, r) => a + r.reorderCost, 0))}</td><td /></tr></tfoot>
            </table>
          </div>
        </Card>
      )}

      {tab === "expiry" && (
        <Card title="Batches expiring within 6 months" subtitle="'At risk' is what won't sell before 30 days to expiry at the current pace." pad={false}>
          <div className="overflow-x-auto">
            <table className="table-lux">
              <thead><tr><th>Product</th><th>Batch</th><th>Expiry</th><th className="text-right">Remaining</th><th className="text-right">Will sell</th><th className="text-right">At risk</th><th>Status</th><th /></tr></thead>
              <tbody>
                {expiry.map((e) => (
                  <tr key={e.id}>
                    <td>{e.product} <span className="text-ink-400">· {e.variant}</span></td>
                    <td className="font-mono text-xs">{e.batchNumber}</td>
                    <td className="whitespace-nowrap">{formatDate(e.expiryDate)} <span className="text-xs text-ink-400">({e.days}d)</span></td>
                    <td className="text-right tabular-nums">{e.remaining}</td>
                    <td className="text-right tabular-nums">{e.willSell}</td>
                    <td className="text-right tabular-nums">{e.atRisk > 0 ? <span className="font-medium text-[#b02e2e]">{e.atRisk} · {formatLKR(e.valueAtRisk)}</span> : "—"}</td>
                    <td><Badge tone={e.severity}>{e.severity === "good" ? "Will sell through" : e.days < 30 ? "Pull from sale" : "Discount"}</Badge></td>
                    <td>{e.days < 30 && <form action={writeOffBatch}><input type="hidden" name="id" value={e.id} /><button className="text-xs text-[#b02e2e] hover:underline">Write off</button></form>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {tab === "receive" && (
        <div className="grid gap-6 xl:grid-cols-3">
          <Card title="Receive a shipment" subtitle="Each delivery is a batch with its own expiry. Landed cost updates the weighted-average cost." className="xl:col-span-2">
            <form action={receiveStock} className="grid gap-3 sm:grid-cols-2">
              <label className="sm:col-span-2"><span className="a-label">Product / variant</span><select name="variantId" required className="a-input"><option value="">Choose…</option>{variants.map((v) => <option key={v.id} value={v.id}>{v.product.brand.name} · {v.product.name} · {v.name} ({v.sku})</option>)}</select></label>
              <label><span className="a-label">Quantity</span><input name="quantity" type="number" min={1} required className="a-input" /></label>
              <label><span className="a-label">Landed cost per unit (LKR)</span><input name="unitCost" type="number" min={0} required className="a-input" /></label>
              <label><span className="a-label">Batch number (from the box)</span><input name="batchNumber" required className="a-input font-mono" /></label>
              <label><span className="a-label">Expiry date</span><input name="expiryDate" type="date" required className="a-input" /></label>
              <label><span className="a-label">Manufactured (optional)</span><input name="manufacturedAt" type="date" className="a-input" /></label>
              <label><span className="a-label">Supplier</span><select name="supplierId" className="a-input"><option value="">—</option>{suppliers.map((s) => <option key={s.id} value={s.id}>{s.name} ({s.country})</option>)}</select></label>
              <label className="sm:col-span-2"><span className="a-label">Customs / import reference</span><input name="importRef" className="a-input" placeholder="CUSDEC or airway bill no." /></label>
              <button className="a-btn-primary sm:col-span-2 sm:justify-self-start">Receive into stock</button>
            </form>
          </Card>
          <Card title="Suppliers">
            <ul className="space-y-3 text-sm">{suppliers.map((s) => <li key={s.id}><p className="font-medium">{s.name}</p><p className="text-xs text-ink-400">{s.country} · {s.email}</p></li>)}</ul>
          </Card>
        </div>
      )}
    </>
  );
}
