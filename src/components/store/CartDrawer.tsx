"use client";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import clsx from "clsx";
import { Lock, Minus, Plus, X } from "lucide-react";
import type { Card } from "@/lib/catalog";
import { cartSubtotal, useCart } from "@/store/cart";
import { formatLKR } from "@/lib/format";
import { FREE_SHIPPING_THRESHOLD } from "@/lib/constants";

export function CartDrawer({ picks = [] }: { picks?: Card[] }) {
  const { items, open, setOpen, update, remove, add } = useCart();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
  }, [open]);
  if (!mounted) return null;
  const subtotal = cartSubtotal(items);
  const remaining = Math.max(0, FREE_SHIPPING_THRESHOLD - subtotal);
  const inBag = new Set(items.map((i) => i.productId));
  const extras = picks.filter((p) => !inBag.has(p.id)).slice(0, 3);

  return (
    <div className={clsx("fixed inset-0 z-[55]", open ? "visible" : "invisible")} aria-hidden={!open}>
      <div className={clsx("absolute inset-0 bg-ink/40 transition-opacity duration-500", open ? "opacity-100" : "opacity-0")} onClick={() => setOpen(false)} />
      <aside className={clsx("absolute inset-y-0 right-0 flex w-full max-w-md flex-col bg-ivory transition-transform duration-500 ease-luxe", open ? "translate-x-0" : "translate-x-full")} role="dialog" aria-label="Shopping bag">
        <div className="flex h-16 items-center justify-between border-b border-ink/10 px-6">
          <p className="font-serif text-2xl">Your bag</p>
          <button onClick={() => setOpen(false)} aria-label="Close bag">
            <X strokeWidth={1.2} />
          </button>
        </div>
        {items.length > 0 && (
          <div className="border-b border-ink/10 px-6 py-4">
            <p className="text-xs text-ink-500">{remaining > 0 ? <>You are {formatLKR(remaining)} away from complimentary delivery.</> : <>You have unlocked complimentary island-wide delivery.</>}</p>
            <div className="mt-2 h-[2px] bg-ink/10">
              <div className="h-full bg-champagne transition-all duration-700" style={{ width: `${Math.min(100, (subtotal / FREE_SHIPPING_THRESHOLD) * 100)}%` }} />
            </div>
          </div>
        )}
        <div className="flex-1 overflow-y-auto px-6">
          {items.length === 0 && (
            <div className="flex h-full flex-col items-center justify-center gap-6 text-center">
              <p className="font-serif text-3xl italic">Your bag is empty</p>
              <Link href="/c/skin-care" onClick={() => setOpen(false)} className="btn-outline">
                Discover skincare
              </Link>
            </div>
          )}
          <ul className="divide-y divide-ink/10">
            {items.map((i) => (
              <li key={i.variantId} className="flex gap-4 py-5">
                <Link href={`/p/${i.slug}`} onClick={() => setOpen(false)} className="relative h-28 w-[90px] shrink-0 overflow-hidden bg-ivory-200">
                  <Image src={i.image} alt="" fill sizes="90px" className="object-cover" />
                </Link>
                <div className="flex min-w-0 flex-1 flex-col">
                  <p className="text-[10px] uppercase tracking-[0.18em] text-ink-500">{i.brand}</p>
                  <p className="font-serif text-lg leading-snug">{i.name}</p>
                  <p className="text-xs text-ink-500">{i.variantName}</p>
                  <div className="mt-auto flex items-center justify-between pt-3">
                    <div className="flex h-9 items-center border border-ink/15">
                      <button className="grid h-full w-9 place-items-center" onClick={() => update(i.variantId, i.qty - 1)} aria-label="Decrease">
                        <Minus width={12} />
                      </button>
                      <span className="w-6 text-center text-sm">{i.qty}</span>
                      <button className="grid h-full w-9 place-items-center" onClick={() => update(i.variantId, i.qty + 1)} aria-label="Increase" disabled={i.qty >= i.maxQty}>
                        <Plus width={12} />
                      </button>
                    </div>
                    <span className="text-sm">{formatLKR(i.price * i.qty)}</span>
                  </div>
                  <button onClick={() => remove(i.variantId)} className="mt-2 self-start text-[11px] uppercase tracking-[0.14em] text-ink-400 hover:text-ink">
                    Remove
                  </button>
                </div>
              </li>
            ))}
          </ul>
          {items.length > 0 && extras.length > 0 && (
            <div className="border-t border-ink/10 py-6" data-sk-picks>
              <p className="eyebrow-wide mb-4">{remaining > 0 ? "Complete your ritual" : "You may also love"}</p>
              <ul className="space-y-3">
                {extras.map((p) => (
                  <li key={p.id} className="flex items-center gap-3">
                    <Link href={`/p/${p.slug}`} onClick={() => setOpen(false)} className="relative h-16 w-[52px] shrink-0 overflow-hidden bg-ivory-200">
                      <Image src={p.image} alt="" fill sizes="52px" className="object-cover" />
                    </Link>
                    <div className="min-w-0 flex-1">
                      <p className="text-[9.5px] uppercase tracking-[0.18em] text-ink-500">{p.brand}</p>
                      <p className="truncate font-serif text-[16px] leading-tight">{p.name}</p>
                      <p className="text-xs text-ink-600">{formatLKR(p.price)}</p>
                    </div>
                    <button
                      onClick={() => add({ variantId: p.variantId!, productId: p.id, slug: p.slug, brand: p.brand, name: p.name, variantName: p.variantName ?? "", price: p.price, compareAt: p.compareAt, image: p.image, maxQty: p.variantStock })}
                      className="h-9 shrink-0 border border-ink/20 px-3 text-[10px] uppercase tracking-[0.16em] transition hover:border-ink hover:bg-ink hover:text-ivory"
                      aria-label={`Add ${p.name}`}
                    >
                      + Add
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
        {items.length > 0 && (
          <div className="border-t border-ink/10 px-6 py-6">
            <div className="flex justify-between text-sm">
              <span>Subtotal</span>
              <span>{formatLKR(subtotal)}</span>
            </div>
            <p className="mt-1 text-xs text-ink-500">Delivery and gift wrapping are calculated at checkout.</p>
            <Link href="/checkout" onClick={() => setOpen(false)} className="btn-primary mt-5 w-full">
              Checkout · {formatLKR(subtotal)}
            </Link>
            <p className="mt-3 flex items-center justify-center gap-2 text-[11px] text-ink-500">
              <Lock width={12} strokeWidth={1.4} /> Secure checkout · Or 3 × {formatLKR(Math.ceil(subtotal / 3))} with Koko or Mintpay
            </p>
            <Link href="/cart" onClick={() => setOpen(false)} className="mt-3 block text-center text-[11px] uppercase tracking-[0.16em] text-ink-500 hover:text-ink">
              View bag
            </Link>
          </div>
        )}
      </aside>
    </div>
  );
}
