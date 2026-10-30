"use client";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { useWishlist } from "@/store/cart";
import { formatLKR } from "@/lib/format";

export function WishlistView() {
  const { items, remove } = useWishlist();
  const [m, setM] = useState(false);
  useEffect(() => setM(true), []);
  if (!m) return null;
  if (!items.length)
    return (
      <div className="py-20 text-center">
        <p className="font-serif text-3xl italic">Nothing saved yet</p>
        <p className="mt-3 text-sm text-ink-500">Tap the heart on any product to keep it here.</p>
        <Link href="/c/skin-care" className="btn-outline mt-8">Discover skincare</Link>
      </div>
    );
  return (
    <ul className="grid grid-cols-2 gap-x-6 gap-y-12 lg:grid-cols-4">
      {items.map((i) => (
        <li key={i.productId} className="group relative">
          <button onClick={() => remove(i.productId)} className="absolute right-3 top-3 z-10 grid h-9 w-9 place-items-center rounded-full bg-white/80" aria-label="Remove"><X width={16} strokeWidth={1.3} /></button>
          <Link href={`/p/${i.slug}`}>
            <div className="relative aspect-[4/5] overflow-hidden bg-ivory-200">
              <Image src={i.image} alt={i.name} fill sizes="25vw" className="object-cover transition duration-1000 group-hover:scale-105" />
            </div>
            <p className="mt-4 text-[10.5px] uppercase tracking-[0.2em] text-ink-500">{i.brand}</p>
            <p className="mt-1 font-serif text-xl">{i.name}</p>
            <p className="mt-1 text-sm">{formatLKR(i.price)}</p>
          </Link>
          <Link href={`/p/${i.slug}`} className="btn-outline mt-4 h-10 w-full text-[11px]">View & add to bag</Link>
        </li>
      ))}
    </ul>
  );
}
