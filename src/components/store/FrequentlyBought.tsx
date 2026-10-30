"use client";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { Plus } from "lucide-react";
import type { Card } from "@/lib/catalog";
import { useCart } from "@/store/cart";
import { formatLKR } from "@/lib/format";

export function FrequentlyBought({ items }: { items: Card[] }) {
  const [sel, setSel] = useState(items.map((i) => i.stock > 0));
  const add = useCart((s) => s.add);
  const total = items.reduce((s, it, i) => s + (sel[i] ? it.price : 0), 0);
  return (
    <div className="grid items-center gap-10 lg:grid-cols-[1fr_320px]">
      <div className="flex items-start gap-2 overflow-x-auto sm:gap-4">
        {items.map((p, i) => (
          <div key={p.id} className="flex items-start gap-2 sm:gap-4">
            {i > 0 && <Plus className="mt-20 shrink-0 text-ink-300" width={18} />}
            <label className="w-32 shrink-0 cursor-pointer sm:w-44">
              <Link href={`/p/${p.slug}`} className="relative block aspect-[4/5] overflow-hidden bg-ivory-200">
                <Image src={p.image} alt={p.name} fill sizes="176px" className="object-cover" />
              </Link>
              <span className="mt-3 flex items-start gap-2">
                <input type="checkbox" checked={sel[i]} disabled={i === 0 || p.stock <= 0} onChange={() => setSel((s) => s.map((x, j) => (j === i ? !x : x)))} className="mt-1 accent-ink" />
                <span>
                  <span className="block text-[10px] uppercase tracking-[0.16em] text-ink-500">{i === 0 ? "This item" : p.brand}</span>
                  <span className="block font-serif text-base leading-tight">{p.name}</span>
                  <span className="text-xs">{formatLKR(p.price)}</span>
                </span>
              </span>
            </label>
          </div>
        ))}
      </div>
      <div className="border border-ink/10 bg-white p-6">
        <p className="text-sm text-ink-500">Total for {sel.filter(Boolean).length} items</p>
        <p className="mt-1 font-serif text-3xl">{formatLKR(total)}</p>
        <button
          className="btn-primary mt-5 w-full"
          onClick={() =>
            items.forEach((p, i) => sel[i] && p.variantId && add({ variantId: p.variantId, productId: p.id, slug: p.slug, brand: p.brand, name: p.name, variantName: p.variantName ?? "", price: p.price, compareAt: p.compareAt, image: p.image, maxQty: p.variantStock }))
          }
        >
          Add selected to bag
        </button>
      </div>
    </div>
  );
}
