import Image from "next/image";
import type { Prisma } from "@prisma/client";
import { formatDate, formatLKR } from "@/lib/format";
import { ORDER_STATUS_LABEL, PAYMENT_LABEL } from "@/lib/constants";
import { OrderTimeline } from "./OrderTimeline";

export const orderDetailInclude = {
  events: { orderBy: { createdAt: "asc" } },
  items: { include: { batch: true, variant: { include: { product: { include: { images: { take: 1, orderBy: { sortOrder: "asc" } }, brand: true } } } } } },
} satisfies Prisma.OrderInclude;

export function OrderDetail({ o }: { o: Prisma.OrderGetPayload<{ include: typeof orderDetailInclude }> }) {
  return (
    <div>
      <p className="eyebrow">Order {o.number} · {formatDate(o.createdAt)}</p>
      <h1 className="mt-3 font-serif text-5xl font-light">{ORDER_STATUS_LABEL[o.status]}</h1>
      <div className="mt-10 border border-ink/10 bg-white p-8"><OrderTimeline status={o.status} events={o.events} /></div>
      {o.trackingNumber && <p className="mt-4 text-sm text-ink-600">{o.courier} tracking number: <span className="font-mono">{o.trackingNumber}</span></p>}
      <div className="mt-10 grid gap-10 lg:grid-cols-[1fr_300px]">
        <ul className="divide-y divide-ink/10 border-y border-ink/10">
          {o.items.map((i) => (
            <li key={i.id} className="flex items-center gap-5 py-5">
              <span className="relative h-24 w-20 shrink-0 overflow-hidden bg-ivory-200">{i.variant.product.images[0] && <Image src={i.variant.product.images[0].url} alt="" fill sizes="80px" className="object-cover" />}</span>
              <span className="flex-1">
                <span className="block text-[10px] uppercase tracking-[0.18em] text-ink-500">{i.variant.product.brand.name}</span>
                <span className="block font-serif text-xl">{i.productName}</span>
                <span className="text-xs text-ink-500">{i.variantName} · Qty {i.quantity}{i.batch && <> · Batch {i.batch.batchNumber}, exp. {formatDate(i.batch.expiryDate, { month: "short", year: "numeric" })}</>}</span>
              </span>
              <span className="text-sm">{formatLKR(i.unitPrice * i.quantity)}</span>
            </li>
          ))}
        </ul>
        <div className="space-y-6 text-sm">
          <div><p className="eyebrow mb-2">Delivering to</p><p className="leading-relaxed">{o.name}<br />{o.addressLine1}<br />{o.addressLine2 && <>{o.addressLine2}<br /></>}{o.city}, {o.district}</p></div>
          <div><p className="eyebrow mb-2">Payment</p><p>{PAYMENT_LABEL[o.paymentMethod]} · {o.paymentStatus.toLowerCase()}</p></div>
          <div className="border-t border-ink/10 pt-4">
            <p className="flex justify-between"><span>Total</span><span className="font-serif text-2xl">{formatLKR(o.total)}</span></p>
          </div>
        </div>
      </div>
    </div>
  );
}
