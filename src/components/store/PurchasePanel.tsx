"use client";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import clsx from "clsx";
import { Banknote, Check, Gift, Heart, MessageCircle, Minus, Plus, RotateCcw, ShieldCheck, Truck } from "lucide-react";
import { cartSubtotal, useCart, useWishlist } from "@/store/cart";
import { formatDate, formatLKR } from "@/lib/format";
import { FREE_SHIPPING_THRESHOLD } from "@/lib/constants";

type V = { id: string; name: string; price: number; compareAt: number | null; stock: number; sku: string; batch: { number: string; expiry: string; origin: string } | null };

// Colombo time decides the same-day cut-off (1pm, Monday to Saturday).
function deliveryPromise(now: Date) {
  const lk = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Colombo" }));
  const cutoff = new Date(lk);
  cutoff.setHours(13, 0, 0, 0);
  const sunday = lk.getDay() === 0;
  const addDays = (d: number) => {
    const x = new Date(lk);
    x.setDate(x.getDate() + d);
    if (x.getDay() === 0) x.setDate(x.getDate() + 1);
    return x;
  };
  const day = (d: Date) => d.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" });
  const left = cutoff.getTime() - lk.getTime();
  const sameDay = !sunday && left > 0;
  return {
    lead: sameDay ? "Get it today" : `Get it ${day(addDays(1))}`,
    rest: sameDay ? ` in Colombo if you order within ${Math.floor(left / 3600000)}h ${Math.floor((left % 3600000) / 60000)}m.` : " in Colombo.",
    island: `Island-wide ${day(addDays(2))} to ${day(addDays(5))}.`,
  };
}

export function PurchasePanel({ product, variants, whatsapp, giftable }: { product: { id: string; slug: string; name: string; brand: string; image: string; origin: string | null; importer: string | null }; variants: V[]; whatsapp: string; giftable?: boolean }) {
  const [vid, setVid] = useState(variants.find((v) => v.stock > 0)?.id ?? variants[0].id);
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);
  const [now, setNow] = useState<Date | null>(null);
  const add = useCart((s) => s.add);
  const bag = useCart((s) => s.items);
  const wish = useWishlist();
  const v = variants.find((x) => x.id === vid)!;
  const wished = wish.items.some((i) => i.productId === product.id);
  const soldOut = v.stock <= 0;
  const buyRef = useRef<HTMLDivElement>(null);
  const [sticky, setSticky] = useState(false);

  useEffect(() => {
    setNow(new Date());
    const t = setInterval(() => setNow(new Date()), 60000);
    const el = buyRef.current;
    // show the bar only once the main button has scrolled above the screen
    const io = el ? new IntersectionObserver(([e]) => setSticky(!e.isIntersecting && e.boundingClientRect.top < 0)) : null;
    if (el && io) io.observe(el);
    return () => {
      clearInterval(t);
      io?.disconnect();
    };
  }, []);

  // leave room under the footer for the sticky bar
  useEffect(() => {
    document.body.style.paddingBottom = sticky ? "76px" : "";
    return () => {
      document.body.style.paddingBottom = "";
    };
  }, [sticky]);

  const onAdd = () => {
    add({ variantId: v.id, productId: product.id, slug: product.slug, brand: product.brand, name: product.name, variantName: v.name, price: v.price, compareAt: v.compareAt, image: product.image, maxQty: v.stock }, qty);
    setAdded(true);
    setTimeout(() => setAdded(false), 2200);
  };
  const waText = encodeURIComponent(`Hello Skinora, I'd like to order ${product.brand} ${product.name} (${v.name}), SKU ${v.sku}.`);
  const promise = now ? deliveryPromise(now) : null;
  const inBag = now ? cartSubtotal(bag) : 0;
  const after = inBag + (bag.some((i) => i.variantId === v.id) ? 0 : v.price * qty);
  const toFree = Math.max(0, FREE_SHIPPING_THRESHOLD - after);
  const saving = v.compareAt ? Math.round((1 - v.price / v.compareAt) * 100) : 0;

  return (
    <div>
      <p className="mt-6 flex flex-wrap items-baseline gap-x-3 text-[22px]">
        <span className={clsx(v.compareAt && "text-rosewood")} data-sk-price>{formatLKR(v.price)}</span>
        {v.compareAt && <s className="text-base text-ink-400">{formatLKR(v.compareAt)}</s>}
        {saving > 0 && <span className="text-[11px] uppercase tracking-[0.14em] text-rosewood">Save {saving}%</span>}
      </p>
      <p className="mt-1 text-xs text-ink-500">Or 3 interest-free payments of {formatLKR(Math.ceil(v.price / 3))} with Koko or Mintpay</p>

      {variants.length > 1 && (
        <fieldset className="mt-8">
          <legend className="label">Size: <span className="normal-case tracking-normal text-ink">{v.name}</span></legend>
          <div className="grid grid-cols-3 gap-2" role="radiogroup">
            {variants.map((x) => (
              <button
                key={x.id}
                role="radio"
                aria-checked={x.id === vid}
                onClick={() => {
                  setVid(x.id);
                  setQty(1);
                }}
                disabled={x.stock <= 0}
                className={clsx("flex min-h-[58px] flex-col items-center justify-center gap-0.5 border px-2 text-sm transition", x.id === vid ? "border-ink bg-ink text-ivory" : "border-ink/20 hover:border-ink", x.stock <= 0 && "opacity-40")}
                data-sk-size
              >
                <span className={clsx(x.stock <= 0 && "line-through")}>{x.name}</span>
                <span className={clsx("text-[11px]", x.id === vid ? "text-ivory/70" : "text-ink-500")}>{x.stock <= 0 ? "Sold out" : formatLKR(x.price)}</span>
              </button>
            ))}
          </div>
        </fieldset>
      )}

      <p className={clsx("mt-6 flex items-center gap-2 text-xs", soldOut ? "text-rosewood" : v.stock <= 5 ? "text-champagne-700" : "text-sage")} data-sk-stock>
        <span className={clsx("h-1.5 w-1.5 rounded-full", soldOut ? "bg-rosewood" : v.stock <= 5 ? "bg-champagne" : "bg-sage")} />
        {soldOut ? "Sold out. Message us on WhatsApp to reserve the next shipment." : v.stock <= 5 ? `Only ${v.stock} left in stock` : "In stock, ready to ship from Colombo"}
      </p>

      <div ref={buyRef} className="mt-4 flex gap-3">
        <div className="flex h-[52px] items-center border border-ink/20">
          <button className="grid h-full w-11 place-items-center disabled:opacity-30" onClick={() => setQty((q) => Math.max(1, q - 1))} disabled={qty <= 1} aria-label="Decrease quantity"><Minus width={14} /></button>
          <span className="w-8 text-center" aria-live="polite">{qty}</span>
          <button className="grid h-full w-11 place-items-center disabled:opacity-30" onClick={() => setQty((q) => Math.min(v.stock, q + 1))} disabled={qty >= v.stock} aria-label="Increase quantity"><Plus width={14} /></button>
        </div>
        <button onClick={onAdd} disabled={soldOut} className="btn-primary h-[52px] flex-1">
          {added ? (<><Check width={16} /> Added to bag</>) : soldOut ? "Sold out" : <>Add to bag<span className="max-sm:hidden">· {formatLKR(v.price * qty)}</span></>}
        </button>
        <button onClick={() => wish.toggle({ productId: product.id, slug: product.slug, brand: product.brand, name: product.name, price: v.price, image: product.image })} className="grid h-[52px] w-[52px] shrink-0 place-items-center border border-ink/20 transition hover:border-ink" aria-label="Wishlist" aria-pressed={wished}>
          <Heart width={18} strokeWidth={1.3} className={clsx(wished && "fill-ink")} />
        </button>
      </div>

      {/* when it arrives, and what it costs to ship */}
      <div className="mt-5 space-y-3 border border-ink/10 bg-white/60 p-4 text-[13px]" data-sk-delivery>
        <p className="flex gap-3">
          <Truck width={17} strokeWidth={1.2} className="mt-0.5 shrink-0 text-ink-500" />
          <span>
            {promise ? (<><b className="font-medium">{promise.lead}</b>{promise.rest} <span className="text-ink-500">{promise.island}</span></>) : "Same-day delivery in Colombo for orders before 1pm. Island-wide in 2 to 5 days."}
          </span>
        </p>
        <div className="pl-[29px]">
          <p className="text-xs text-ink-500">{toFree > 0 ? <>Add {formatLKR(toFree)} more for complimentary delivery.</> : <>This order ships complimentary, island-wide.</>}</p>
          <div className="mt-1.5 h-[2px] bg-ink/10"><div className="h-full bg-champagne transition-all duration-700" style={{ width: `${Math.min(100, (after / FREE_SHIPPING_THRESHOLD) * 100)}%` }} /></div>
        </div>
      </div>

      <ul className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 text-xs text-ink-600">
        <li className="flex items-center gap-2.5"><Banknote width={16} strokeWidth={1.2} className="shrink-0 text-ink-400" /> Cash on delivery available</li>
        <li className="flex items-center gap-2.5"><RotateCcw width={15} strokeWidth={1.2} className="shrink-0 text-ink-400" /> 14-day returns, sealed items</li>
        <li className="flex items-center gap-2.5"><ShieldCheck width={16} strokeWidth={1.2} className="shrink-0 text-ink-400" /> Authorised import, never grey-market</li>
        <li className="flex items-center gap-2.5"><Gift width={16} strokeWidth={1.2} className="shrink-0 text-ink-400" /> {giftable ? "Signature gift wrap at checkout" : "Gift wrap available at checkout"}</li>
      </ul>

      <a href={`https://wa.me/${whatsapp}?text=${waText}`} target="_blank" rel="noopener noreferrer" className="mt-5 inline-flex min-h-10 items-center gap-2 text-xs text-ink-600 underline decoration-ink/30 underline-offset-4 hover:text-ink hover:decoration-ink">
        <MessageCircle width={14} strokeWidth={1.3} /> Questions about this product? Ask a skin expert on WhatsApp
      </a>

      {/* keep the purchase one tap away while reading */}
      <div className={clsx("fixed inset-x-0 bottom-0 z-40 border-t border-ink/10 bg-ivory/95 pb-[max(12px,env(safe-area-inset-bottom))] pt-3 backdrop-blur-md transition-transform duration-500 ease-luxe lg:pb-3", sticky ? "translate-y-0" : "translate-y-full")} aria-hidden={!sticky}>
        <div className="container-lux flex items-center gap-3 lg:gap-5">
          <span className="relative hidden h-14 w-11 shrink-0 overflow-hidden bg-ivory-200 sm:block">
            {product.image && <Image src={product.image} alt="" fill sizes="44px" className="object-cover" />}
          </span>
          <div className="min-w-0 flex-1">
            <p className="hidden text-[10px] uppercase tracking-[0.2em] text-ink-500 lg:block">{product.brand}</p>
            <p className="truncate font-serif text-[17px] leading-tight lg:text-xl">{product.name}</p>
            <p className="text-xs text-ink-500 lg:hidden" data-sk-sticky-meta>{v.name} · <span className={clsx(v.compareAt && "text-rosewood")}>{formatLKR(v.price)}</span></p>
          </div>
          {variants.length > 1 && (
            <div className="hidden gap-2 lg:flex">
              {variants.map((x) => (
                <button key={x.id} tabIndex={sticky ? 0 : -1} onClick={() => setVid(x.id)} disabled={x.stock <= 0} className={clsx("h-11 min-w-[72px] border px-3 text-sm transition", x.id === vid ? "border-ink" : "border-ink/15 text-ink-500 hover:border-ink", x.stock <= 0 && "line-through opacity-40")} data-sk-sticky-size>
                  {x.name}
                </button>
              ))}
            </div>
          )}
          <p className="hidden text-lg lg:block" data-sk-sticky-price>{formatLKR(v.price)}</p>
          <button onClick={onAdd} disabled={soldOut} tabIndex={sticky ? 0 : -1} className="btn-primary h-11 shrink-0 px-6 text-[11px] lg:h-12 lg:px-10" data-sticky-add>
            {added ? (<><Check width={14} /> Added</>) : soldOut ? "Sold out" : "Add to bag"}
          </button>
        </div>
      </div>

      {/* authenticity */}
      <details className="group mt-8 border border-champagne/40 bg-champagne-50/60 p-5" open>
        <summary className="flex cursor-pointer list-none items-center justify-between text-[11px] uppercase tracking-[0.18em] text-champagne-700">
          <span className="flex items-center gap-2"><ShieldCheck width={16} strokeWidth={1.3} /> 100% Authentic · Verified import</span>
          <span className="text-base font-light transition group-open:rotate-45">+</span>
        </summary>
        <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
          <div><dt className="text-[11px] uppercase tracking-wider text-ink-400">Batch no.</dt><dd className="font-mono text-[13px]">{v.batch?.number ?? "Next shipment"}</dd></div>
          <div><dt className="text-[11px] uppercase tracking-wider text-ink-400">Best before</dt><dd>{v.batch ? formatDate(v.batch.expiry, { month: "long", year: "numeric" }) : "—"}</dd></div>
          <div><dt className="text-[11px] uppercase tracking-wider text-ink-400">Made in</dt><dd>{product.origin}</dd></div>
          <div><dt className="text-[11px] uppercase tracking-wider text-ink-400">Imported via</dt><dd>{v.batch?.origin ?? "Authorised distributor"}</dd></div>
          <div className="col-span-2"><dt className="text-[11px] uppercase tracking-wider text-ink-400">Importer</dt><dd>{product.importer}, Colombo · SKU {v.sku}</dd></div>
        </dl>
        <p className="mt-4 text-xs leading-relaxed text-ink-500">This is the batch we&apos;ll ship to you. We dispatch first-expiry-first-out and never send product within 6 months of expiry without telling you.</p>
      </details>
    </div>
  );
}
