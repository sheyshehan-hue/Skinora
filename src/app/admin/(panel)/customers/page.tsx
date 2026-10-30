import Link from "next/link";
import clsx from "clsx";
import { requireStaff } from "@/lib/auth";
import { customerSegments } from "@/lib/analytics";
import { compactLKR, formatDate, formatLKR } from "@/lib/format";
import { Badge, Card, PageTitle } from "@/components/admin/ui";

export const metadata = { title: "Customers" };
const TONE: Record<string, string> = { VIP: "info", Loyal: "good", New: "good", "One-time": "neutral", "At risk": "serious", Lapsed: "warning" };
const HINT: Record<string, string> = {
  VIP: "Spent LKR 150K+ or 5+ orders, active in 4 months. Invite to launches, send gifts.",
  Loyal: "Repeat buyers in good standing.",
  New: "First order in the last 30 days. Send a routine follow-up.",
  "One-time": "Bought once. Win a second order with a sample-sized offer.",
  "At risk": "Repeat buyers silent for 90+ days. Send a personal win-back offer.",
  Lapsed: "One order, 6+ months ago.",
};

export default async function CustomersPage({ searchParams }: { searchParams: Promise<{ seg?: string; q?: string }> }) {
  await requireStaff("customers");
  const sp = await searchParams;
  const { customers, summary } = await customerSegments();
  const seg = sp.seg ?? "VIP";
  const list = customers.filter((c) => c.segment === seg && (!sp.q || `${c.name} ${c.email}`.toLowerCase().includes(sp.q.toLowerCase()))).sort((a, b) => b.spend - a.spend).slice(0, 100);
  return (
    <>
      <PageTitle title="Customers" subtitle={`${customers.length.toLocaleString()} customers with orders`} />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        {summary.map((s) => (
          <Link key={s.segment} href={`?seg=${encodeURIComponent(s.segment)}`} className={clsx("card p-4 transition", seg === s.segment ? "ring-2 ring-ink" : "hover:border-ink/20")}>
            <Badge tone={TONE[s.segment]}>{s.segment}</Badge>
            <p className="mt-2 font-serif text-3xl">{s.count.toLocaleString()}</p>
            <p className="text-xs text-ink-400">{compactLKR(s.revenue)} lifetime</p>
          </Link>
        ))}
      </div>
      <p className="mt-4 text-sm text-ink-600">{HINT[seg]}</p>
      <Card pad={false} className="mt-4">
        <form className="border-b border-ink/[0.06] p-4"><input type="hidden" name="seg" value={seg} /><input name="q" defaultValue={sp.q} placeholder="Search name or email" className="a-input max-w-xs" /></form>
        <div className="overflow-x-auto">
          <table className="table-lux">
            <thead><tr><th>Customer</th><th>District</th><th className="text-right">Orders</th><th className="text-right">Lifetime spend</th><th>Last order</th></tr></thead>
            <tbody>{list.map((c) => <tr key={c.id}><td><span className="block font-medium">{c.name}</span><span className="text-xs text-ink-400">{c.email}</span></td><td className="text-ink-500">{c.district}</td><td className="text-right tabular-nums">{c.orders}</td><td className="text-right tabular-nums">{formatLKR(c.spend)}</td><td className="text-ink-500">{formatDate(c.last)}</td></tr>)}</tbody>
          </table>
        </div>
      </Card>
    </>
  );
}
