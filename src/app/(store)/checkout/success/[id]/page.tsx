import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CheckCircle2 } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { formatDate, formatLKR } from "@/lib/format";
import { BANK_DETAILS, PAYMENT_LABEL } from "@/lib/constants";

export const metadata = { title: "Thank you", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function SuccessPage({ params }: { params: Promise<{ id: string }> }) {
  const o = await prisma.order.findUnique({
    where: { id: (await params).id },
    include: { items: { include: { batch: true, variant: { include: { product: { include: { images: { take: 1, orderBy: { sortOrder: "asc" } }, brand: true } } } } } } },
  });
  if (!o) notFound();
  const zone = await prisma.deliveryZone.findUnique({ where: { district: o.district } });
  const eta = o.deliveryMethod === "same-day" ? "today, by 9pm" : zone ? `${formatDate(new Date(Date.now() + zone.etaDaysMin * 864e5), { weekday: "long", day: "numeric", month: "long" })}${zone.etaDaysMax > zone.etaDaysMin ? ` to ${formatDate(new Date(Date.now() + zone.etaDaysMax * 864e5), { weekday: "long", day: "numeric", month: "long" })}` : ""}` : "";

  return (
    <div className="container-lux max-w-4xl py-16">
      <div className="animate-fadeUp text-center">
        <CheckCircle2 strokeWidth={0.8} className="mx-auto h-14 w-14 text-champagne-700" />
        <p className="eyebrow mt-6">Order {o.number}</p>
        <h1 className="mt-3 font-serif text-5xl font-light sm:text-6xl">Thank you, {o.name.split(" ")[0]}</h1>
        <p className="mx-auto mt-5 max-w-lg text-ink-600">
          {o.paymentMethod === "BANK_TRANSFER"
            ? "Your items are reserved for 48 hours. We'll confirm your order as soon as the transfer clears."
            : `We've sent a confirmation to ${o.email} and an SMS to ${o.phone}.`}
          {eta && o.paymentMethod !== "BANK_TRANSFER" && <> Expected delivery: <b className="font-medium">{eta}</b>.</>}
        </p>
      </div>

      {o.paymentMethod === "BANK_TRANSFER" && (
        <div className="mx-auto mt-10 max-w-lg border border-champagne/50 bg-champagne-50 p-8">
          <p className="eyebrow text-champagne-700">Bank transfer details</p>
          <dl className="mt-4 grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 text-sm">
            <dt className="text-ink-500">Bank</dt><dd>{BANK_DETAILS.bank}</dd>
            <dt className="text-ink-500">Branch</dt><dd>{BANK_DETAILS.branch}</dd>
            <dt className="text-ink-500">Account name</dt><dd>{BANK_DETAILS.accountName}</dd>
            <dt className="text-ink-500">Account no.</dt><dd className="font-mono">{BANK_DETAILS.accountNumber}</dd>
            <dt className="text-ink-500">Amount</dt><dd className="font-medium">{formatLKR(o.total)}</dd>
            <dt className="text-ink-500">Reference</dt><dd className="font-mono font-medium">{o.number}</dd>
          </dl>
          <p className="mt-4 text-xs text-ink-500">Send the slip to us on WhatsApp for faster confirmation.</p>
        </div>
      )}

      <div className="mt-14 border-t border-ink/10">
        <ul className="divide-y divide-ink/10">
          {o.items.map((i) => (
            <li key={i.id} className="flex items-center gap-5 py-5">
              <span className="relative h-24 w-20 shrink-0 overflow-hidden bg-ivory-200">{i.variant.product.images[0] && <Image src={i.variant.product.images[0].url} alt="" fill sizes="80px" className="object-cover" />}</span>
              <span className="flex-1">
                <span className="block text-[10px] uppercase tracking-[0.18em] text-ink-500">{i.variant.product.brand.name}</span>
                <span className="block font-serif text-xl">{i.productName}</span>
                <span className="text-xs text-ink-500">{i.variantName} · Qty {i.quantity}{i.batch && <> · Batch {i.batch.batchNumber}, best before {formatDate(i.batch.expiryDate, { month: "short", year: "numeric" })}</>}</span>
              </span>
              <span className="text-sm">{formatLKR(i.unitPrice * i.quantity)}</span>
            </li>
          ))}
        </ul>
        <dl className="ml-auto mt-4 max-w-xs space-y-2 border-t border-ink/10 pt-4 text-sm">
          <div className="flex justify-between"><dt>Subtotal</dt><dd>{formatLKR(o.subtotal)}</dd></div>
          {o.discount > 0 && <div className="flex justify-between text-sage"><dt>Discounts</dt><dd>−{formatLKR(o.discount)}</dd></div>}
          {o.loyaltyRedeemed > 0 && <div className="flex justify-between text-sage"><dt>Points</dt><dd>−{formatLKR(o.loyaltyRedeemed)}</dd></div>}
          <div className="flex justify-between"><dt>Delivery</dt><dd>{o.deliveryFee ? formatLKR(o.deliveryFee) : "Complimentary"}</dd></div>
          {o.giftWrap && <div className="flex justify-between"><dt>Gift wrap</dt><dd>{formatLKR(o.giftWrapFee)}</dd></div>}
          <div className="flex justify-between border-t border-ink/10 pt-3 font-serif text-2xl"><dt>Total</dt><dd>{formatLKR(o.total)}</dd></div>
          <p className="text-right text-xs text-ink-500">{PAYMENT_LABEL[o.paymentMethod]} · {o.paymentStatus === "PAID" ? "Paid" : o.paymentMethod === "COD" ? "Pay on delivery" : "Awaiting payment"}</p>
        </dl>
      </div>
      <div className="mt-14 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
        <Link href={`/track?order=${o.number}&email=${encodeURIComponent(o.email)}`} className="btn-primary">Track this order</Link>
        <Link href="/" className="btn-outline">Continue shopping</Link>
      </div>
    </div>
  );
}
