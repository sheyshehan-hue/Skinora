import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireStaff } from "@/lib/auth";
import { confirmPayment, createReturn, updateOrderStatus, updateReturn } from "@/actions/admin/ops";
import { formatDate, formatLKR } from "@/lib/format";
import { ORDER_STATUS_LABEL, PAYMENT_LABEL } from "@/lib/constants";
import { Badge, Card, OrderBadge, PageTitle } from "@/components/admin/ui";

export const metadata = { title: "Order" };

const NEXT: Record<string, string[]> = {
  PENDING_PAYMENT: ["CONFIRMED", "CANCELLED"],
  CONFIRMED: ["PACKED", "CANCELLED"],
  PACKED: ["SHIPPED", "CANCELLED"],
  SHIPPED: ["DELIVERED", "RETURNED"],
  DELIVERED: ["RETURNED"],
  CANCELLED: [],
  RETURNED: [],
};

export default async function OrderAdmin({ params }: { params: Promise<{ id: string }> }) {
  await requireStaff("orders");
  const o = await prisma.order.findUnique({
    where: { id: (await params).id },
    include: { items: { include: { batch: true } }, events: { orderBy: { createdAt: "desc" } }, returns: { orderBy: { createdAt: "desc" } }, notifications: { orderBy: { createdAt: "desc" } }, customer: { include: { _count: { select: { orders: true } } } } },
  });
  if (!o) notFound();
  const profit = o.items.reduce((a, i) => a + (i.unitPrice - i.unitCost) * i.quantity, 0) - o.discount;

  return (
    <>
      <Link href="/admin/orders" className="inline-flex min-h-9 items-center text-xs text-ink-500 hover:text-ink">← Orders</Link>
      <PageTitle title={o.number} subtitle={`${formatDate(o.createdAt, { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" })} · ${PAYMENT_LABEL[o.paymentMethod]}`}>
        <OrderBadge status={o.status} label={ORDER_STATUS_LABEL[o.status]} />
        <Badge tone={o.paymentStatus === "PAID" ? "good" : o.paymentStatus === "PENDING" ? "warning" : "neutral"}>{o.paymentStatus.toLowerCase()}</Badge>
      </PageTitle>
      <div className="grid gap-6 xl:grid-cols-3">
        <div className="space-y-6 xl:col-span-2">
          <Card title="Items" subtitle="Picked first-expiry-first-out. Pack the batches listed." pad={false}>
            <table className="table-lux">
              <thead><tr><th>Product</th><th>Batch</th><th>Qty</th><th>Price</th><th className="text-right">Line</th></tr></thead>
              <tbody>
                {o.items.map((i) => (
                  <tr key={i.id}>
                    <td><span className="block font-medium">{i.productName}</span><span className="text-xs text-ink-400">{i.variantName}</span></td>
                    <td className="text-xs">{i.batch ? <><span className="font-mono">{i.batch.batchNumber}</span><span className="block text-ink-400">exp. {formatDate(i.batch.expiryDate, { month: "short", year: "numeric" })}</span></> : "—"}</td>
                    <td>{i.quantity}</td>
                    <td className="tabular-nums">{formatLKR(i.unitPrice)}</td>
                    <td className="text-right tabular-nums">{formatLKR(i.unitPrice * i.quantity)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <dl className="ml-auto max-w-xs space-y-1.5 p-5 text-sm">
              <div className="flex justify-between"><dt className="text-ink-500">Subtotal</dt><dd>{formatLKR(o.subtotal)}</dd></div>
              {o.discount > 0 && <div className="flex justify-between"><dt className="text-ink-500">Discount {o.promoCode && `(${o.promoCode})`}</dt><dd>−{formatLKR(o.discount)}</dd></div>}
              {o.loyaltyRedeemed > 0 && <div className="flex justify-between"><dt className="text-ink-500">Points redeemed</dt><dd>−{formatLKR(o.loyaltyRedeemed)}</dd></div>}
              <div className="flex justify-between"><dt className="text-ink-500">Delivery ({o.deliveryMethod})</dt><dd>{formatLKR(o.deliveryFee)}</dd></div>
              {o.giftWrap && <div className="flex justify-between"><dt className="text-ink-500">Gift wrap</dt><dd>{formatLKR(o.giftWrapFee)}</dd></div>}
              <div className="flex justify-between border-t border-ink/10 pt-2 font-medium"><dt>Total</dt><dd>{formatLKR(o.total)}</dd></div>
              <div className="flex justify-between text-xs text-ink-400"><dt>Gross profit</dt><dd>{formatLKR(profit)}</dd></div>
            </dl>
          </Card>
          {o.giftWrap && (
            <Card title="🎁 Gift wrapping requested"><p className="font-serif text-xl italic">“{o.giftMessage || "No message"}”</p><p className="mt-2 text-xs text-ink-500">Ivory box, champagne ribbon, handwritten card. Remove the invoice from the parcel.</p></Card>
          )}
          <Card title="Timeline">
            <ol className="space-y-3 text-sm">
              {o.events.map((e) => (
                <li key={e.id} className="flex gap-3"><span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-champagne" /><span><span className="font-medium">{ORDER_STATUS_LABEL[e.status]}</span>{e.note && <span className="text-ink-500"> · {e.note}</span>}<span className="block text-xs text-ink-400">{formatDate(e.createdAt, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</span></span></li>
              ))}
            </ol>
          </Card>
          <Card title="Messages sent" subtitle="SMS and email order updates" pad={false}>
            <table className="table-lux text-xs">
              <tbody>
                {o.notifications.map((n) => (
                  <tr key={n.id}><td><Badge tone="info">{n.channel}</Badge></td><td className="max-w-md">{n.subject && <b className="block">{n.subject}</b>}{n.message.slice(0, 160)}</td><td>{n.status === "SENT" ? <Badge tone="good">sent</Badge> : n.status === "FAILED" ? <Badge tone="critical">failed</Badge> : <Badge>logged</Badge>}</td><td className="whitespace-nowrap text-ink-400">{formatDate(n.createdAt, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</td></tr>
                ))}
                {!o.notifications.length && <tr><td className="text-ink-400">No messages yet.</td></tr>}
              </tbody>
            </table>
          </Card>
        </div>

        <div className="space-y-6">
          {NEXT[o.status].length > 0 && (
            <Card title="Update status">
              <form action={updateOrderStatus} className="space-y-3">
                <input type="hidden" name="id" value={o.id} />
                <select name="status" className="a-input">{NEXT[o.status].map((s) => <option key={s} value={s}>{ORDER_STATUS_LABEL[s]}</option>)}</select>
                <div className="grid grid-cols-2 gap-2">
                  <select name="courier" defaultValue={o.courier ?? ""} className="a-input"><option value="">Courier</option><option>Pronto Lanka</option><option>Domex</option><option>Koombiyo</option><option>Skinora rider</option></select>
                  <input name="trackingNumber" defaultValue={o.trackingNumber ?? ""} placeholder="Tracking no." className="a-input" />
                </div>
                <input name="note" placeholder="Internal note (optional)" className="a-input" />
                <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="notify" defaultChecked className="accent-ink" /> Send SMS & email to customer</label>
                <button className="a-btn-primary w-full">Update</button>
              </form>
            </Card>
          )}
          {o.paymentStatus !== "PAID" && o.paymentMethod !== "COD" && o.status !== "CANCELLED" && (
            <Card title="Confirm payment" subtitle={o.paymentMethod === "BANK_TRANSFER" ? "Check the bank statement for the order number as reference." : undefined}>
              <form action={confirmPayment} className="space-y-3">
                <input type="hidden" name="id" value={o.id} />
                <input name="ref" placeholder="Bank / transaction reference" className="a-input" />
                <button className="a-btn-primary w-full">Mark as paid</button>
              </form>
            </Card>
          )}
          {o.paymentMethod === "COD" && (
            <Card title="Cash on delivery">
              <p className="text-sm">{o.codRemittedAt ? `Remitted to Skinora on ${formatDate(o.codRemittedAt)}` : o.codCollected ? "Collected by courier, awaiting remittance" : "To be collected on delivery"}</p>
              <p className="mt-1 font-serif text-2xl">{formatLKR(o.total)}</p>
            </Card>
          )}
          <Card title="Customer">
            <p className="font-medium">{o.name}</p>
            <p className="text-sm text-ink-500">{o.email}<br />{o.phone}</p>
            <p className="mt-3 text-sm leading-relaxed">{o.addressLine1}<br />{o.addressLine2 && <>{o.addressLine2}<br /></>}{o.city}, {o.district}</p>
            {o.notes && <p className="mt-3 rounded-lg bg-ivory-200 p-2 text-xs">Note: {o.notes}</p>}
            {o.customer && <p className="mt-3 text-xs text-ink-400">{o.customer.passwordHash ? "Registered" : "Guest"} · {o.customer._count.orders} orders · {o.customer.loyaltyPoints} points</p>}
            <a href={`https://wa.me/${o.phone.replace(/\D/g, "").replace(/^0/, "94")}`} target="_blank" className="a-btn-secondary mt-3 w-full">WhatsApp customer</a>
          </Card>
          <Card title="Returns">
            {o.returns.map((r) => (
              <form key={r.id} action={updateReturn} className="mb-4 space-y-2 border-b border-ink/[0.06] pb-4 text-sm">
                <input type="hidden" name="id" value={r.id} />
                <p className="flex justify-between"><span>{r.reason}</span><Badge tone={r.status === "REFUNDED" ? "good" : r.status === "REJECTED" ? "neutral" : "serious"}>{r.status.toLowerCase()}</Badge></p>
                <p className="text-xs text-ink-400">Refund {formatLKR(r.refundAmount)} · {formatDate(r.createdAt)}</p>
                {r.status !== "REFUNDED" && r.status !== "REJECTED" && (
                  <>
                    <select name="status" defaultValue={r.status} className="a-input"><option value="APPROVED">Approved</option><option value="RECEIVED">Item received</option><option value="REFUNDED">Refunded</option><option value="REJECTED">Rejected</option></select>
                    <label className="flex items-center gap-2 text-xs"><input type="checkbox" name="restock" className="accent-ink" /> Return items to stock (unopened)</label>
                    <button className="a-btn-secondary w-full">Update return</button>
                  </>
                )}
              </form>
            ))}
            {["DELIVERED", "SHIPPED"].includes(o.status) && (
              <form action={createReturn} className="space-y-2">
                <input type="hidden" name="id" value={o.id} />
                <input name="reason" placeholder="Reason" className="a-input" />
                <input name="amount" type="number" defaultValue={o.total} className="a-input" />
                <button className="a-btn-secondary w-full">Open a return</button>
              </form>
            )}
            {!o.returns.length && !["DELIVERED", "SHIPPED"].includes(o.status) && <p className="text-sm text-ink-400">No returns.</p>}
          </Card>
        </div>
      </div>
    </>
  );
}
