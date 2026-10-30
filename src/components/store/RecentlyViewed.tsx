"use client";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { formatLKR } from "@/lib/format";

type Seen = { id: string; slug: string; brand: string; name: string; image: string; price: number };
const KEY = "skinora-recent";

// Remembers the last few products on this device and shows them on the next product page.
export function RecentlyViewed({ current }: { current: Seen }) {
  const [items, setItems] = useState<Seen[]>([]);
  useEffect(() => {
    let list: Seen[] = [];
    try {
      list = JSON.parse(localStorage.getItem(KEY) ?? "[]");
    } catch {}
    setItems(list.filter((x) => x.id !== current.id).slice(0, 6));
    try {
      localStorage.setItem(KEY, JSON.stringify([current, ...list.filter((x) => x.id !== current.id)].slice(0, 12)));
    } catch {}
  }, [current]);
  if (!items.length) return null;
  return (
    <section className="mt-28" data-sk-recent>
      <p className="eyebrow-wide mb-4">Picking up where you left off</p>
      <h2 className="display-caps text-[28px] leading-[1.08] sm:text-4xl">Recently viewed</h2>
      <ul className="no-scrollbar -mx-4 mt-8 flex snap-x gap-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
        {items.map((p) => (
          <li key={p.id} className="w-[38%] shrink-0 snap-start sm:w-[22%] lg:w-[15%]">
            <Link href={`/p/${p.slug}`} className="group block">
              <span className="relative block aspect-[4/5] overflow-hidden bg-ivory-200">
                <Image src={p.image} alt={p.name} fill sizes="(min-width:1024px) 15vw, 38vw" className="object-cover transition duration-1000 group-hover:scale-105" />
              </span>
              <span className="mt-3 block text-[10px] uppercase tracking-[0.18em] text-ink-500">{p.brand}</span>
              <span className="mt-1 block font-serif text-base leading-tight line-clamp-2">{p.name}</span>
              <span className="mt-1 block text-xs">{formatLKR(p.price)}</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
