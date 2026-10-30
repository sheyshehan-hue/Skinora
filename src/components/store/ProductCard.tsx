"use client";
import Image from "next/image";
import Link from "next/link";
import clsx from "clsx";
import { ArrowRight, Heart, Plus, ShieldCheck, ShoppingBag } from "lucide-react";
import type { Card } from "@/lib/catalog";
import { useCart, useWishlist } from "@/store/cart";
import { formatLKR } from "@/lib/format";

/**
 * Gallery card. The product floats on warm stone; below it sit every fact a shopper needs to decide:
 * brand and origin, name, size and fit, rating, price and instalments. The whole card is one link to the
 * product page, with the wishlist and bag buttons layered above it. On desktop, hover adds the story line,
 * the lot we hold, and "Add to bag". `feature` turns the card into a wide hero with the story beside the image.
 */
export function ProductCard({ p, priority, feature, sizes = "(min-width:1024px) 25vw, 50vw" }: { p: Card; priority?: boolean; feature?: boolean; sizes?: string }) {
  const add = useCart((s) => s.add);
  const wish = useWishlist();
  const wished = wish.items.some((i) => i.productId === p.id);
  const soldOut = p.stock <= 0;
  const quick = () =>
    p.multipleSizes
      ? (window.location.href = `/p/${p.slug}`)
      : add({ variantId: p.variantId!, productId: p.id, slug: p.slug, brand: p.brand, name: p.name, variantName: p.variantName ?? "", price: p.price, compareAt: p.compareAt, image: p.image, maxQty: p.variantStock });
  // one badge only, in order of what matters most to the buyer
  const badge = soldOut ? "Sold out" : p.flashPct > 0 ? `−${p.flashPct}%` : p.compareAt ? "Offer" : p.stock <= 5 ? `Only ${p.stock} left` : p.isNew ? "New" : p.isBestSeller ? "Best seller" : null;
  const urgent = badge !== null && (badge.startsWith("−") || badge === "Offer" || badge.startsWith("Only"));
  const instalment = `3 × ${formatLKR(Math.ceil(p.price / 3))}`;
  const meta = [p.multipleSizes ? `${p.sizes} sizes` : p.variantName, p.fit].filter(Boolean).join(" · ");
  const href = `/p/${p.slug}`;

  return (
    <article className={clsx("group relative flex h-full flex-col", feature && "sm:flex-row sm:items-center sm:gap-8 lg:gap-12")} data-sk-card>
      {/* the whole card is one target; buttons sit above it */}
      <Link href={href} aria-label={`${p.brand} ${p.name}`} className="absolute inset-0 z-[1] rounded-sm outline-none ring-ink ring-offset-2 ring-offset-ivory focus-visible:ring-2" />
      <div className={clsx("relative overflow-hidden bg-stone-100", feature ? "aspect-[4/3] sm:aspect-[4/5] sm:w-[58%] sm:shrink-0" : "aspect-[4/5]")}>
        <Image src={p.image} alt={`${p.brand} ${p.name}`} fill sizes={sizes} priority={priority} className={clsx("object-cover transition-all duration-[1400ms] ease-luxe group-hover:scale-[1.04]", p.hoverImage && "group-hover:opacity-0")} />
        {p.hoverImage && <Image src={p.hoverImage} alt="" fill sizes={sizes} className="object-cover opacity-0 transition-opacity duration-[1000ms] ease-luxe group-hover:opacity-100" />}
        {badge && <span className={clsx("pointer-events-none absolute left-3 top-3 bg-ivory/90 px-2.5 py-1 text-[10.5px] uppercase tracking-[0.16em] backdrop-blur", urgent ? "text-rosewood" : soldOut ? "text-ink-500" : "text-ink-700")}>{badge}</span>}
        <button
          aria-label={wished ? "Remove from wishlist" : "Add to wishlist"}
          aria-pressed={wished}
          onClick={() => wish.toggle({ productId: p.id, slug: p.slug, brand: p.brand, name: p.name, price: p.price, image: p.image })}
          className={clsx("absolute right-1 top-1 z-[2] grid h-11 w-11 place-items-center rounded-full transition duration-500 focus-visible:ring-2 focus-visible:ring-ink", wished ? "text-rosewood" : "text-ink/70 hover:text-ink lg:opacity-0 lg:group-hover:opacity-100 lg:focus-visible:opacity-100")}
        >
          <Heart width={17} height={17} strokeWidth={1.2} className={clsx(wished && "fill-rosewood")} />
        </button>

        {/* desktop: story, provenance and add-to-bag rise from the foot of the image on hover */}
        {!feature && (
          <div className="absolute inset-x-0 bottom-0 z-[2] translate-y-full bg-ivory/95 p-4 backdrop-blur transition-transform duration-500 ease-luxe group-hover:translate-y-0 group-focus-within:translate-y-0 max-lg:hidden" data-sk-hover>
            {p.tagline && <p className="font-serif text-[15px] italic leading-snug text-ink-700">{p.tagline}</p>}
            <p className="mt-1.5 flex items-center gap-1.5 font-mono text-[9.5px] tracking-[0.04em] text-ink-400">
              <ShieldCheck width={11} height={11} strokeWidth={1.4} /> {p.batch ? `Authentic · Lot ${p.batch}` : "Authentic · next shipment"}
            </p>
            {soldOut ? (
              <span className="mt-3 block border border-ink/15 py-2.5 text-center text-[10.5px] uppercase tracking-[0.18em] text-ink-500">Sold out</span>
            ) : (
              p.variantId && (
                <button onClick={quick} className="mt-3 flex h-10 w-full items-center justify-center gap-2 bg-ink text-[10.5px] uppercase tracking-[0.18em] text-ivory transition hover:bg-ink-700 focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2">
                  <Plus width={13} height={13} strokeWidth={1.4} /> {p.multipleSizes ? "Choose size" : "Add to bag"}
                </button>
              )
            )}
          </div>
        )}
        {/* phones: a quiet round bag button */}
        {!soldOut && p.variantId && (
          <button aria-label={p.multipleSizes ? "Choose size" : "Add to bag"} onClick={quick} className="absolute bottom-2 right-2 z-[2] grid h-11 w-11 place-items-center rounded-full bg-ivory/90 text-ink backdrop-blur active:scale-95 lg:hidden">
            <ShoppingBag width={17} height={17} strokeWidth={1.2} />
            <Plus width={9} height={9} strokeWidth={2} className="absolute right-2.5 top-2.5" />
          </button>
        )}
      </div>

      <div className={clsx("pointer-events-none flex flex-1 flex-col", feature ? "px-1 pt-5 sm:px-0 sm:py-6" : "pt-4 sm:pt-5")}>
        <p className="flex items-baseline gap-2 text-[10px] uppercase tracking-[0.24em] text-ink-700">
          <span className="truncate">{p.brand}</span>
          {p.origin && <span className={clsx("shrink-0 normal-case tracking-[0.06em] text-ink-400", !feature && "max-sm:hidden")}>· {p.origin}</span>}
        </p>
        <h3 className={clsx("mt-2 font-serif leading-snug text-ink decoration-ink/40 underline-offset-4 group-hover:underline", feature ? "text-[30px] lg:text-[40px]" : "text-[18px] sm:text-[20px]")}>{p.name}</h3>
        {feature && p.tagline && <p className="mt-3 max-w-md font-serif text-lg italic leading-relaxed text-ink-500">{p.tagline}</p>}
        {meta && <p className="mt-1.5 text-[11px] text-ink-400">{meta}</p>}
        {p.ratingCount >= 3 && <p className="mt-1 text-[11px] text-ink-500">★ {p.rating.toFixed(1)} <span className="text-ink-400">({p.ratingCount})</span></p>}
        <p className={clsx("flex flex-wrap items-baseline gap-x-2.5 tabular-nums", feature ? "mt-5" : "mt-2")}>
          {p.multipleSizes && <span className="text-[10px] uppercase tracking-[0.16em] text-ink-400">From</span>}
          <span className={clsx("tracking-[0.02em]", feature ? "text-[20px]" : "text-[15px]", p.compareAt ? "text-rosewood" : "text-ink")}>{formatLKR(p.price)}</span>
          {p.compareAt && <s className="text-[12.5px] text-ink-400">{formatLKR(p.compareAt)}</s>}
        </p>
        <p className="mt-1 text-[10.5px] text-ink-400">or {instalment} with Koko / Mintpay</p>
        {feature && (
          <span className="btn-ghost mt-6 hidden text-[11px] sm:inline-flex">
            Discover <ArrowRight width={14} strokeWidth={1.3} />
          </span>
        )}
      </div>
    </article>
  );
}
