"use client";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import clsx from "clsx";
import { ChevronDown, Gift, Lock, ShieldCheck } from "lucide-react";
import { getQuote, submitOrder, trackCheckout } from "@/actions/checkout";
import { useCart } from "@/store/cart";
import { formatLKR } from "@/lib/format";
import { COD_LIMIT, GIFT_WRAP_FEE, PAYMENT_METHODS } from "@/lib/constants";
import type { Quote } from "@/lib/orders";

type Props = {
  districts: string[];
  customer: { name: string; email: string; phone: string; points: number } | null;
  address: { line1: string; line2: string; city: string; district: string } | null;
};

export function CheckoutForm({ districts, customer, address }: Props) {
  const router = useRouter();
  const { items, clear } = useCart();
  const [mounted, setMounted] = useState(false);
  const [f, setF] = useState({
    email: customer?.email ?? "",
    phone: customer?.phone ?? "",
    name: customer?.name ?? "",
    addressLine1: address?.line1 ?? "",
    addressLine2: address?.line2 ?? "",
    city: address?.city ?? "",
    district: address?.district ?? "",
    notes: "",
    giftMessage: "",
  });
  const [delivery, setDelivery] = useState("standard");
  const [giftWrap, setGiftWrap] = useState(false);
  const [promoInput, setPromoInput] = useState("");
  const [promoCode, setPromoCode] = useState<string | undefined>();
  const [redeem, setRedeem] = useState(false);
  const [payment, setPayment] = useState<(typeof PAYMENT_METHODS)[number]["id"]>("PAYHERE");
  const [marketing, setMarketing] = useState(true);
  const [saveAddress, setSaveAddress] = useState(!address);
  const [q, setQ] = useState<Quote | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showSummary, setShowSummary] = useState(false);
  const [placing, startPlacing] = useTransition();
  const sessionId = useRef<string | undefined>(undefined);
  const quoteReq = useRef(0);

  useEffect(() => setMounted(true), []);
  const lines = useMemo(() => items.map((i) => ({ variantId: i.variantId, qty: i.qty })), [items]);

  // live quote from the server
  useEffect(() => {
    if (!mounted || !lines.length) return;
    const req = ++quoteReq.current;
    const t = setTimeout(async () => {
      const res = await getQuote({ lines, district: f.district || undefined, delivery, promoCode, giftWrap, redeemPoints: redeem ? customer?.points : 0 });
      if (req !== quoteReq.current) return; // a newer quote is on its way
      setQ(res);
      setDelivery((cur) => (res.deliveryOptions.some((o) => o.id === cur) ? cur : res.delivery));
    }, 150);
    return () => clearTimeout(t);
  }, [mounted, lines, f.district, delivery, promoCode, giftWrap, redeem, customer?.points]);

  // record the checkout for abandonment analytics
  useEffect(() => {
    if (!mounted || !lines.length || !q) return;
    try {
      sessionId.current ??= sessionStorage.getItem("sk_checkout") ?? undefined;
    } catch {}
    trackCheckout(lines, q.subtotal, sessionId.current).then((id) => {
      sessionId.current = id;
      try {
        sessionStorage.setItem("sk_checkout", id);
      } catch {}
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mounted, lines.length, q?.subtotal]);

  useEffect(() => {
    if (q && !q.codAvailable && payment === "COD") setPayment("PAYHERE");
  }, [q, payment]);

  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setF({ ...f, [k]: e.target.value });

  const place = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    startPlacing(async () => {
      const res = await submitOrder({
        lines,
        ...f,
        delivery,
        promoCode,
        giftWrap,
        redeemPoints: redeem ? customer?.points : 0,
        paymentMethod: payment,
        marketingOptIn: marketing,
        checkoutSessionId: sessionId.current,
        saveAddress: !!customer && saveAddress,
      });
      if (!res.ok) {
        setError(res.error);
        window.scrollTo({ top: 0, behavior: "smooth" });
        return;
      }
      try {
        sessionStorage.removeItem("sk_checkout");
      } catch {}
      clear();
      router.push(res.redirect);
    });
  };

  if (!mounted) return <div className="h-96" />;
  if (!items.length)
    return (
      <div className="py-24 text-center">
        <p className="font-serif text-3xl italic">Your bag is empty</p>
        <Link href="/" className="btn-outline mt-8">Continue shopping</Link>
      </div>
    );

  const summary = (
    <div>
      <ul className="divide-y divide-ink/10">
        {(q?.lines ?? []).map((l) => (
          <li key={l.variantId} className="flex gap-4 py-4">
            <span className="relative h-20 w-16 shrink-0 overflow-hidden bg-ivory-200">
              <Image src={l.image} alt="" fill sizes="64px" className="object-cover" />
              <span className="absolute -right-0 -top-0 grid h-5 min-w-5 place-items-center bg-ink px-1 text-[10px] text-ivory">{l.qty}</span>
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[10px] uppercase tracking-[0.16em] text-ink-500">{l.brand}</span>
              <span className="block font-serif text-lg leading-tight">{l.name}</span>
              <span className="text-xs text-ink-500">{l.variantName}</span>
            </span>
            <span className="text-sm">{formatLKR(l.lineTotal)}</span>
          </li>
        ))}
      </ul>
      <div className="mt-4 flex gap-2">
        <input value={promoInput} onChange={(e) => setPromoInput(e.target.value.toUpperCase())} placeholder="Promo code" className="input h-11 uppercase" aria-label="Promo code" />
        <button type="button" onClick={() => setPromoCode(promoInput || undefined)} className="btn-outline h-11 px-5">Apply</button>
      </div>
      {q?.promoError && promoCode && <p className="mt-2 text-xs text-rosewood">{q.promoError}</p>}
      {q?.promo && <p className="mt-2 text-xs text-sage">✓ {q.promo.code}: {q.promo.description}</p>}
      {customer && customer.points > 0 && (
        <label className="mt-4 flex cursor-pointer items-center gap-3 border border-champagne/40 bg-champagne-50 p-3 text-sm">
          <input type="checkbox" checked={redeem} onChange={(e) => setRedeem(e.target.checked)} className="accent-ink" />
          Use my {customer.points.toLocaleString()} loyalty points (up to 20% of your order)
        </label>
      )}
      <dl className="mt-6 space-y-2.5 border-t border-ink/10 pt-5 text-sm">
        <Row k="Subtotal" v={formatLKR(q?.subtotal ?? 0)} />
        {!!q?.bundleDiscount && <Row k={`Bundle: ${q.appliedBundles.join(", ")}`} v={`−${formatLKR(q.bundleDiscount)}`} accent />}
        {!!q?.promoDiscount && <Row k={`Code ${q.promo?.code}`} v={`−${formatLKR(q.promoDiscount)}`} accent />}
        {!!q?.loyaltyRedeemed && <Row k="Loyalty points" v={`−${formatLKR(q.loyaltyRedeemed)}`} accent />}
        <Row k="Delivery" v={!f.district ? "Choose district" : q?.deliveryFee ? formatLKR(q.deliveryFee) : "Complimentary"} />
        {giftWrap && <Row k="Signature gift wrap" v={formatLKR(GIFT_WRAP_FEE)} />}
        <div className="flex items-baseline justify-between border-t border-ink/10 pt-4">
          <dt className="text-[11px] uppercase tracking-[0.18em]">Total</dt>
          <dd className="font-serif text-3xl">{formatLKR(q?.total ?? 0)}</dd>
        </div>
        {customer && q && <p className="text-right text-xs text-champagne-700">You&apos;ll earn {q.pointsToEarn.toLocaleString()} loyalty points</p>}
      </dl>
    </div>
  );

  return (
    <form onSubmit={place} className="mt-10 grid gap-10 lg:grid-cols-[1fr_420px] lg:gap-16">
      <div className="lg:hidden">
        <button type="button" onClick={() => setShowSummary(!showSummary)} className="flex w-full items-center justify-between border-y border-ink/10 py-4 text-sm">
          <span className="flex items-center gap-2">Order summary <ChevronDown width={16} className={clsx("transition", showSummary && "rotate-180")} /></span>
          <span className="font-serif text-xl">{formatLKR(q?.total ?? 0)}</span>
        </button>
        {showSummary && <div className="py-4">{summary}</div>}
      </div>

      <div className="space-y-14">
        {error && <p className="border border-rosewood/30 bg-rosewood/5 p-4 text-sm text-rosewood">{error}</p>}
        {q?.issues.map((i) => <p key={i} className="border border-champagne/40 bg-champagne-50 p-4 text-sm">{i}</p>)}

        <Section n={1} title="Contact">
          {!customer && (
            <p className="-mt-2 mb-5 text-sm text-ink-500">
              Checking out as a guest. <Link href="/account/login?next=/checkout" className="underline">Sign in</Link> to earn loyalty points.
            </p>
          )}
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Email"><input type="email" required value={f.email} onChange={set("email")} className="input" autoComplete="email" /></Field>
            <Field label="Mobile (for SMS updates)"><input type="tel" required value={f.phone} onChange={set("phone")} className="input" placeholder="077 123 4567" autoComplete="tel" /></Field>
          </div>
          <label className="mt-4 flex items-center gap-3 text-sm text-ink-600">
            <input type="checkbox" checked={marketing} onChange={(e) => setMarketing(e.target.checked)} className="accent-ink" /> Send me new arrivals and private offers
          </label>
        </Section>

        <Section n={2} title="Delivery">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Full name" className="sm:col-span-2"><input required value={f.name} onChange={set("name")} className="input" autoComplete="name" /></Field>
            <Field label="Street address" className="sm:col-span-2"><input required value={f.addressLine1} onChange={set("addressLine1")} className="input" autoComplete="address-line1" placeholder="House no., street" /></Field>
            <Field label="Apartment, landmark (optional)" className="sm:col-span-2"><input value={f.addressLine2} onChange={set("addressLine2")} className="input" autoComplete="address-line2" /></Field>
            <Field label="City / town"><input required value={f.city} onChange={set("city")} className="input" autoComplete="address-level2" /></Field>
            <Field label="District">
              <select required value={f.district} onChange={set("district")} className="input">
                <option value="">Select district</option>
                {districts.map((d) => <option key={d}>{d}</option>)}
              </select>
            </Field>
          </div>
          {customer && (
            <label className="mt-4 flex items-center gap-3 text-sm text-ink-600">
              <input type="checkbox" checked={saveAddress} onChange={(e) => setSaveAddress(e.target.checked)} className="accent-ink" /> Save this address to my account
            </label>
          )}
          {f.district && q && (
            <div className="mt-6 grid gap-3">
              {q.deliveryOptions.map((o) => (
                <label key={o.id} className={clsx("flex cursor-pointer items-center gap-4 border p-4 transition", delivery === o.id ? "border-ink bg-white" : "border-ink/15 hover:border-ink/40")}>
                  <input type="radio" name="delivery" checked={delivery === o.id} onChange={() => setDelivery(o.id)} className="accent-ink" />
                  <span className="flex-1">
                    <span className="block text-sm">{o.label}</span>
                    <span className="text-xs text-ink-500">{o.detail}</span>
                  </span>
                  <span className="text-sm">{o.fee ? formatLKR(o.fee) : "Complimentary"}</span>
                </label>
              ))}
            </div>
          )}
          <Field label="Delivery notes (optional)" className="mt-4"><textarea value={f.notes} onChange={set("notes")} rows={2} className="input h-auto py-3" placeholder="e.g. Call on arrival, leave with security" /></Field>
        </Section>

        <Section n={3} title="Gift wrapping">
          <label className={clsx("flex cursor-pointer items-start gap-4 border p-5 transition", giftWrap ? "border-champagne bg-champagne-50" : "border-ink/15 hover:border-ink/40")}>
            <input type="checkbox" checked={giftWrap} onChange={(e) => setGiftWrap(e.target.checked)} className="mt-1 accent-ink" />
            <Gift strokeWidth={1.1} className="mt-0.5 h-6 w-6 shrink-0 text-champagne-700" />
            <span className="flex-1">
              <span className="block font-serif text-xl">Signature gift wrapping</span>
              <span className="text-sm text-ink-500">Ivory box, champagne silk ribbon and a handwritten card. Prices are never included in the parcel.</span>
            </span>
            <span className="text-sm">{formatLKR(GIFT_WRAP_FEE)}</span>
          </label>
          {giftWrap && <Field label="Your message (we'll handwrite it)" className="mt-4"><textarea value={f.giftMessage} onChange={set("giftMessage")} maxLength={200} rows={3} className="input h-auto py-3" /></Field>}
        </Section>

        <Section n={4} title="Payment">
          <div className="grid gap-3">
            {PAYMENT_METHODS.map((m) => {
              const disabled = m.id === "COD" && q !== null && !q.codAvailable;
              return (
                <label key={m.id} className={clsx("flex cursor-pointer items-center gap-4 border p-4 transition", payment === m.id ? "border-ink bg-white" : "border-ink/15 hover:border-ink/40", disabled && "cursor-not-allowed opacity-40")}>
                  <input type="radio" name="payment" disabled={disabled} checked={payment === m.id} onChange={() => setPayment(m.id)} className="accent-ink" />
                  <span className="flex-1">
                    <span className="block text-sm">{m.label}</span>
                    <span className="text-xs text-ink-500">{disabled ? `Available for orders up to ${formatLKR(COD_LIMIT)}.` : m.id === "KOKO" || m.id === "MINTPAY" ? `3 × ${formatLKR(Math.ceil((q?.total ?? 0) / 3))}, interest-free.` : m.detail}</span>
                  </span>
                  <PaymentMark id={m.id} />
                </label>
              );
            })}
          </div>
        </Section>

        <div className="lg:hidden">{summary}</div>

        <div>
          <button disabled={placing || !q || !q.lines.length} className="btn-primary h-14 w-full">
            <Lock width={14} /> {placing ? "Placing your order…" : payment === "COD" || payment === "BANK_TRANSFER" ? `Place order · ${formatLKR(q?.total ?? 0)}` : `Continue to payment · ${formatLKR(q?.total ?? 0)}`}
          </button>
          <p className="mt-4 flex items-center justify-center gap-2 text-xs text-ink-500"><ShieldCheck width={14} /> Secure checkout. Card details are handled by PayHere and never stored by Skinora.</p>
        </div>
      </div>

      <aside className="hidden h-fit border border-ink/10 bg-white p-8 lg:sticky lg:top-28 lg:block">
        <p className="mb-2 font-serif text-2xl">Your order</p>
        {summary}
      </aside>
    </form>
  );
}

function Section({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="mb-6 flex items-baseline gap-4 border-b border-ink/10 pb-3 font-serif text-3xl">
        <span className="text-lg text-champagne-700">0{n}</span> {title}
      </h2>
      {children}
    </section>
  );
}

function Field({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <label className={clsx("block", className)}>
      <span className="label">{label}</span>
      {children}
    </label>
  );
}

function Row({ k, v, accent }: { k: string; v: string; accent?: boolean }) {
  return (
    <div className={clsx("flex justify-between gap-4", accent && "text-sage")}>
      <dt>{k}</dt>
      <dd className="shrink-0">{v}</dd>
    </div>
  );
}

function PaymentMark({ id }: { id: string }) {
  const marks: Record<string, string[]> = { PAYHERE: ["VISA", "MC", "AMEX"], KOKO: ["koko"], MINTPAY: ["mintpay"], BANK_TRANSFER: ["BANK"], COD: ["CASH"] };
  return (
    <span className="flex gap-1">
      {marks[id].map((m) => (
        <span key={m} className="rounded-sm border border-ink/15 px-1.5 py-0.5 text-[9px] font-medium tracking-wider text-ink-600">{m}</span>
      ))}
    </span>
  );
}
