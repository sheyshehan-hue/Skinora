import { prisma } from "@/lib/prisma";
import { requireStaff } from "@/lib/auth";
import { saveBundle, saveDiscount, saveFlashSale } from "@/actions/admin/ops";
import { formatDate, formatLKR } from "@/lib/format";
import { LOYALTY_EARN_PER_LKR } from "@/lib/constants";
import { Badge, Card, PageTitle, Stat } from "@/components/admin/ui";

export const metadata = { title: "Promotions" };
const dt = (d: Date | null) => (d ? new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16) : "");

export default async function PromotionsPage() {
  await requireStaff("promotions");
  const now = new Date();
  const [codes, flash, bundles, products, codeRevenue, points] = await Promise.all([
    prisma.discountCode.findMany({ orderBy: { createdAt: "desc" } }),
    prisma.flashSale.findMany({ orderBy: { startsAt: "desc" }, include: { products: true } }),
    prisma.bundle.findMany({ include: { items: { include: { product: { include: { variants: { take: 1, orderBy: { sortOrder: "asc" } } } } } } } }),
    prisma.product.findMany({ where: { status: "ACTIVE" }, orderBy: { name: "asc" }, include: { brand: true } }),
    prisma.order.groupBy({ by: ["promoCode"], where: { promoCode: { not: null }, status: { in: ["CONFIRMED", "PACKED", "SHIPPED", "DELIVERED"] } }, _sum: { total: true, discount: true }, _count: true }),
    prisma.customer.aggregate({ _sum: { loyaltyPoints: true }, _count: { _all: true }, where: { loyaltyPoints: { gt: 0 } } }),
  ]);
  const productOptions = products.map((p) => <option key={p.id} value={p.id}>{p.brand.name} · {p.name}</option>);
  return (
    <>
      <PageTitle title="Promotions" subtitle="Discount codes, flash sales, bundles and loyalty." />
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label="Active codes" value={String(codes.filter((c) => c.active).length)} />
        <Stat label="Live flash sales" value={String(flash.filter((f) => f.active && f.startsAt <= now && f.endsAt > now).length)} />
        <Stat label="Revenue with codes" value={formatLKR(codeRevenue.reduce((a, c) => a + (c._sum.total ?? 0), 0))} hint={`${formatLKR(codeRevenue.reduce((a, c) => a + (c._sum.discount ?? 0), 0))} discounted`} />
        <Stat label="Loyalty points outstanding" value={(points._sum.loyaltyPoints ?? 0).toLocaleString()} hint={`${points._count._all} members · 1 pt per LKR ${LOYALTY_EARN_PER_LKR}`} />
      </div>

      <h2 className="mb-3 mt-8 text-sm font-medium text-ink-500">Discount codes</h2>
      <Card pad={false}>
        <table className="table-lux">
          <thead><tr><th>Code</th><th>Offer</th><th>Min. spend</th><th>Used</th><th>Revenue</th><th>Window</th><th>Status</th></tr></thead>
          <tbody>
            {codes.map((c) => {
              const r = codeRevenue.find((x) => x.promoCode === c.code);
              return (
                <tr key={c.id}>
                  <td className="font-mono font-medium">{c.code}</td>
                  <td>{c.type === "PERCENT" ? `${c.value}% off` : c.type === "FIXED" ? `${formatLKR(c.value)} off` : "Free delivery"}<span className="block text-xs text-ink-400">{c.description}</span></td>
                  <td>{c.minSpend ? formatLKR(c.minSpend) : "—"}</td>
                  <td className="tabular-nums">{c.usedCount}{c.usageLimit ? ` / ${c.usageLimit}` : ""}</td>
                  <td className="tabular-nums">{r ? formatLKR(r._sum.total ?? 0) : "—"}</td>
                  <td className="text-xs text-ink-500">{c.startsAt ? formatDate(c.startsAt) : "Any time"}{c.endsAt && ` → ${formatDate(c.endsAt)}`}</td>
                  <td><Badge tone={c.active ? "good" : "neutral"}>{c.active ? "active" : "off"}</Badge></td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <details className="border-t border-ink/[0.06] p-5">
          <summary className="cursor-pointer text-sm font-medium">+ New discount code</summary>
          <form action={saveDiscount} className="mt-4 grid gap-3 sm:grid-cols-4">
            <label><span className="a-label">Code</span><input name="code" required className="a-input font-mono uppercase" /></label>
            <label><span className="a-label">Type</span><select name="type" className="a-input"><option value="PERCENT">% off</option><option value="FIXED">LKR off</option><option value="FREE_SHIPPING">Free delivery</option></select></label>
            <label><span className="a-label">Value</span><input name="value" type="number" className="a-input" /></label>
            <label><span className="a-label">Min. spend (LKR)</span><input name="minSpend" type="number" className="a-input" /></label>
            <label className="sm:col-span-2"><span className="a-label">Description</span><input name="description" className="a-input" /></label>
            <label><span className="a-label">Starts</span><input name="startsAt" type="datetime-local" className="a-input" /></label>
            <label><span className="a-label">Ends</span><input name="endsAt" type="datetime-local" className="a-input" /></label>
            <label><span className="a-label">Usage limit</span><input name="usageLimit" type="number" className="a-input" /></label>
            <label className="flex items-center gap-2 self-end pb-2 text-sm"><input type="checkbox" name="active" defaultChecked className="accent-ink" /> Active</label>
            <button className="a-btn-primary self-end sm:col-start-4">Create code</button>
          </form>
        </details>
      </Card>

      <div className="mt-8 grid gap-6 xl:grid-cols-2">
        <div>
          <h2 className="mb-3 text-sm font-medium text-ink-500">Flash sales</h2>
          <div className="space-y-4">
            {[...flash, null].map((f, i) => (
              <Card key={f?.id ?? "new"} title={f ? f.name : "New flash sale"} subtitle={f ? `${f.discountPercent}% off · ${f.products.length} products · ends ${formatDate(f.endsAt, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}` : "Shows a countdown on the home page and offers page"} action={f && <Badge tone={f.active && f.startsAt <= now && f.endsAt > now ? "good" : "neutral"}>{f.active && f.startsAt <= now && f.endsAt > now ? "live" : f.endsAt < now ? "ended" : "scheduled"}</Badge>}>
                <details open={!f && i === 0 && flash.length === 0}>
                  <summary className="cursor-pointer text-xs text-ink-500">{f ? "Edit" : "Create"}</summary>
                  <form action={saveFlashSale} className="mt-3 grid gap-3 sm:grid-cols-2">
                    <input type="hidden" name="id" value={f?.id ?? ""} />
                    <label><span className="a-label">Name</span><input name="name" defaultValue={f?.name} required className="a-input" /></label>
                    <label><span className="a-label">Discount %</span><input name="discountPercent" type="number" min={1} max={90} defaultValue={f?.discountPercent ?? 20} className="a-input" /></label>
                    <label><span className="a-label">Starts</span><input name="startsAt" type="datetime-local" defaultValue={dt(f?.startsAt ?? now)} required className="a-input" /></label>
                    <label><span className="a-label">Ends</span><input name="endsAt" type="datetime-local" defaultValue={dt(f?.endsAt ?? new Date(now.getTime() + 2 * 864e5))} required className="a-input" /></label>
                    <label className="sm:col-span-2"><span className="a-label">Products</span><select name="productIds" multiple defaultValue={f?.products.map((p) => p.productId)} className="a-input h-36 py-1 text-xs">{productOptions}</select></label>
                    <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="active" defaultChecked={f?.active ?? true} className="accent-ink" /> Active</label>
                    <button className="a-btn-primary sm:justify-self-end">Save</button>
                  </form>
                </details>
              </Card>
            ))}
          </div>
        </div>
        <div>
          <h2 className="mb-3 text-sm font-medium text-ink-500">Bundles</h2>
          <div className="space-y-4">
            {[...bundles, null].map((b) => {
              const full = b?.items.reduce((a, i) => a + (i.product.variants[0]?.price ?? 0), 0) ?? 0;
              return (
                <Card key={b?.id ?? "new"} title={b ? b.name : "New bundle"} subtitle={b ? `${formatLKR(b.price)} (save ${formatLKR(full - b.price)}) · applied automatically at checkout` : "Discount applies when all products are in the bag"}>
                  <details>
                    <summary className="cursor-pointer text-xs text-ink-500">{b ? "Edit" : "Create"}</summary>
                    <form action={saveBundle} className="mt-3 grid gap-3 sm:grid-cols-2">
                      <input type="hidden" name="id" value={b?.id ?? ""} />
                      <label><span className="a-label">Name</span><input name="name" defaultValue={b?.name} required className="a-input" /></label>
                      <label><span className="a-label">Bundle price (LKR)</span><input name="price" type="number" defaultValue={b?.price} required className="a-input" /></label>
                      <label className="sm:col-span-2"><span className="a-label">Description</span><input name="description" defaultValue={b?.description ?? ""} className="a-input" /></label>
                      <label className="sm:col-span-2"><span className="a-label">Products</span><select name="productIds" multiple defaultValue={b?.items.map((i) => i.productId)} className="a-input h-36 py-1 text-xs">{productOptions}</select></label>
                      <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="active" defaultChecked={b?.active ?? true} className="accent-ink" /> Active</label>
                      <button className="a-btn-primary sm:justify-self-end">Save</button>
                    </form>
                  </details>
                </Card>
              );
            })}
            <Card title="Loyalty programme">
              <ul className="space-y-1.5 text-sm text-ink-600">
                <li>Members earn 1 point per LKR {LOYALTY_EARN_PER_LKR} on paid orders.</li>
                <li>500 welcome points on sign-up.</li>
                <li>1 point = LKR 1, redeemable for up to 20% of an order.</li>
                <li>Tiers: Ivory, Champagne (LKR 100K+), Noir (LKR 250K+).</li>
              </ul>
              <p className="mt-3 text-xs text-ink-400">Rates are set in src/lib/constants.ts.</p>
            </Card>
          </div>
        </div>
      </div>
    </>
  );
}
