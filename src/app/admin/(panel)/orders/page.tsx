import Link from "next/link";
import clsx from "clsx";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireStaff } from "@/lib/auth";
import { remitCod } from "@/actions/admin/ops";
import { formatDate, formatLKR } from "@/lib/format";
import { ORDER_STATUS_LABEL, PAYMENT_LABEL } from "@/lib/constants";
import { Badge, Card, OrderBadge, PageTitle } from "@/components/admin/ui";

export const metadata = { title: "Orders" };

const TABS = [
  ["", "All"],
  ["PENDING_PAYMENT", "Awaiting payment"],
  ["CONFIRMED", "To pack"],
  ["PACKED", "Ready to ship"],
  ["SHIPPED", "Out for delivery"],
  ["DELIVERED", "Delivered"],
  ["RETURNS", "Returns"],
  ["COD", "COD remittance"],
] as const;

export default async function OrdersPage({ searchParams }: { searchParams: Promise<{ status?: string; q?: string; pay?: string; page?: string }> }) {
  await requireStaff("orders");
  const sp = await searchParams;
  const tab = sp.status ?? "";
  const page = Number(sp.page ?? 1);
  const where: Prisma.OrderWhereInput = {
    ...(tab && !["RETURNS", "COD"].includes(tab) ? { status: tab as never } : {}),
    ...(tab === "RETURNS" ? { returns: { some: {} } } : {}),
    ...(tab === "COD" ? { paymentMethod: "COD", codCollected: true, codRemittedAt: null } : {}),
    ...(sp.pay ? { paymentMethod: sp.pay as never } : {}),
    ...(sp.q ? { OR: [{ number: { contains: sp.q, mode: "insensitive" } }, { name: { contains: sp.q, mode: "insensitive" } }, { email: { contains: sp.q, mode: "insensitive" } }, { phone: { contains: sp.q } }] } : {}),
  };
  const [orders, total, counts, returns] = await Promise.all([
    prisma.order.findMany({ where, orderBy: { createdAt: "desc" }, take: 50, skip: (page - 1) * 50, include: { _count: { select: { items: true } }, returns: true } }),
    prisma.order.count({ where }),
    prisma.order.groupBy({ by: ["status"], _count: true }),
    prisma.returnRequest.count({ where: { status: { in: ["REQUESTED", "APPROVED", "RECEIVED"] } } }),
  ]);
  const codDue = tab === "COD" ? orders.reduce((a, o) => a + o.total, 0) : 0;
  const count = (k: string) => (k === "RETURNS" ? returns : k === "" || k === "COD" ? null : counts.find((c) => c.status === k)?._count);
  const qs = (o: Record<string, string | undefined>) => "?" + new URLSearchParams(Object.entries({ status: tab, q: sp.q, pay: sp.pay, ...o }).filter(([, v]) => v) as [string, string][]).toString();

  return (
    <>
      <PageTitle title="Orders" subtitle={`${total.toLocaleString()} orders`} />
      <div className="no-scrollbar mb-4 flex gap-1 overflow-x-auto">
        {TABS.map(([k, l]) => (
          <Link key={k} href={qs({ status: k || undefined, page: undefined })} className={clsx("shrink-0 rounded-lg px-3 py-1.5 text-sm transition", tab === k ? "bg-ink text-white" : "text-ink-600 hover:bg-white")}>
            {l}{count(k) ? <span className="ml-1.5 text-xs opacity-60">{count(k)}</span> : null}
          </Link>
        ))}
      </div>
      <Card pad={false}>
        <form className="flex flex-wrap gap-2 border-b border-ink/[0.06] p-4">
          <input type="hidden" name="status" value={tab} />
          <input name="q" defaultValue={sp.q} placeholder="Order no., name, email or phone" className="a-input max-w-xs" />
          <select name="pay" defaultValue={sp.pay} className="a-input w-auto"><option value="">All payments</option>{Object.entries(PAYMENT_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
          <button className="a-btn-secondary">Search</button>
        </form>
        {tab === "COD" && orders.length > 0 && (
          <form action={remitCod} className="flex items-center justify-between gap-4 border-b border-ink/[0.06] bg-ivory-50 p-4 text-sm">
            {orders.map((o) => <input key={o.id} type="hidden" name="ids" value={o.id} />)}
            <span>Couriers have collected <b>{formatLKR(codDue)}</b> across {orders.length} orders that hasn&apos;t been remitted yet.</span>
            <button className="a-btn-primary">Mark all as remitted</button>
          </form>
        )}
        <div className="overflow-x-auto">
          <table className="table-lux">
            <thead><tr><th>Order</th><th>Date</th><th>Customer</th><th>District</th><th>Items</th><th>Payment</th><th>Status</th><th className="text-right">Total</th></tr></thead>
            <tbody>
              {orders.map((o) => (
                <tr key={o.id}>
                  <td><Link href={`/admin/orders/${o.id}`} className="font-mono text-xs font-medium hover:underline">{o.number}</Link>{o.giftWrap && <span className="ml-1.5" title="Gift wrap">🎁</span>}</td>
                  <td className="whitespace-nowrap text-xs text-ink-500">{formatDate(o.createdAt, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</td>
                  <td><span className="block">{o.name}</span><span className="text-xs text-ink-400">{o.phone}</span></td>
                  <td className="text-ink-500">{o.district}{o.deliveryMethod === "same-day" && <Badge tone="info">same-day</Badge>}</td>
                  <td className="text-ink-500">{o._count.items}</td>
                  <td className="text-xs"><span className="block">{PAYMENT_LABEL[o.paymentMethod]}</span><span className={o.paymentStatus === "PAID" ? "text-[#0a7f0a]" : "text-ink-400"}>{o.paymentStatus.toLowerCase()}</span></td>
                  <td><OrderBadge status={o.status} label={ORDER_STATUS_LABEL[o.status]} />{o.returns.some((r) => r.status === "REQUESTED") && <Badge tone="serious">return</Badge>}</td>
                  <td className="text-right tabular-nums">{formatLKR(o.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {total > 50 && (
          <div className="flex items-center justify-between p-4 text-sm">
            <span className="text-ink-500">Page {page} of {Math.ceil(total / 50)}</span>
            <div className="flex gap-2">
              {page > 1 && <Link href={qs({ page: String(page - 1) })} className="a-btn-secondary">Previous</Link>}
              {page * 50 < total && <Link href={qs({ page: String(page + 1) })} className="a-btn-secondary">Next</Link>}
            </div>
          </div>
        )}
      </Card>
    </>
  );
}
