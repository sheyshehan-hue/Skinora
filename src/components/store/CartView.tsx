"use client";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Minus, Plus } from "lucide-react";
import { cartSubtotal, useCart } from "@/store/cart";
import { formatLKR } from "@/lib/format";
import { FREE_SHIPPING_THRESHOLD } from "@/lib/constants";
import { TrustBar } from "./TrustBar";

export function CartView() {
  const { items, update, remove } = useCart();
  const [m, setM] = useState(false);
  useEffect(() => setM(true), []);
  if (!m) return null;
  if (!items.length)
    return (
      <div className="py-20 text-center">
        <p className="font-serif text-3xl italic">Your bag is empty</p>
        <Link href="/" className="btn-outline mt-8">Continue shopping</Link>
      </div>
    );
  const sub = cartSubtotal(items);
  return (
    <div className="grid gap-12 lg:grid-cols-[1fr_380px]">
      <ul className="divide-y divide-ink/10 border-y border-ink/10">
        {items.map((i) => (
          <li key={i.variantId} className="flex gap-5 py-6">
            <Link href={`/p/${i.slug}`} className="relative h-36 w-28 shrink-0 overflow-hidden bg-ivory-200"><Image src={i.image} alt="" fill sizes="112px" className="object-cover" /></Link>
            <div className="flex flex-1 flex-col">
              <div className="flex justify-between gap-4">
                <div>
                  <p className="text-[10.5px] uppercase tracking-[0.2em] text-ink-500">{i.brand}</p>
                  <p className="font-serif text-2xl leading-tight">{i.name}</p>
                  <p className="text-sm text-ink-500">{i.variantName}</p>
                </div>
                <p className="text-right">{formatLKR(i.price * i.qty)}{i.compareAt && <s className="block text-xs text-ink-400">{formatLKR(i.compareAt * i.qty)}</s>}</p>
              </div>
              <div className="mt-auto flex items-center gap-6 pt-4">
                <div className="flex h-10 items-center border border-ink/15">
                  <button className="grid h-full w-10 place-items-center" onClick={() => update(i.variantId, i.qty - 1)} aria-label="Decrease"><Minus width={12} /></button>
                  <span className="w-6 text-center text-sm">{i.qty}</span>
                  <button className="grid h-full w-10 place-items-center" onClick={() => update(i.variantId, i.qty + 1)} aria-label="Increase"><Plus width={12} /></button>
                </div>
                <button onClick={() => remove(i.variantId)} className="text-[11px] uppercase tracking-[0.14em] text-ink-400 hover:text-ink">Remove</button>
              </div>
            </div>
          </li>
        ))}
      </ul>
      <aside className="h-fit border border-ink/10 bg-white p-8 lg:sticky lg:top-28">
        <p className="font-serif text-2xl">Summary</p>
        <div className="mt-6 flex justify-between text-sm"><span>Subtotal</span><span>{formatLKR(sub)}</span></div>
        <div className="mt-2 flex justify-between text-sm text-ink-500"><span>Delivery</span><span>{sub >= FREE_SHIPPING_THRESHOLD ? "Complimentary" : "Calculated by district"}</span></div>
        <Link href="/checkout" className="btn-primary mt-8 w-full">Secure checkout</Link>
        <p className="mt-4 text-center text-xs text-ink-500">Card · Koko · Mintpay · Bank transfer · Cash on delivery</p>
        <div className="mt-8 border-t border-ink/10 pt-6"><TrustBar compact /></div>
      </aside>
    </div>
  );
}
