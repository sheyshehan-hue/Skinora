"use client";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import clsx from "clsx";
import { ArrowRight, Search, X } from "lucide-react";
import { formatLKR } from "@/lib/format";

type Result = {
  products: { slug: string; name: string; brand: string; image: string; price: number }[];
  brands: { slug: string; name: string }[];
  categories: { slug: string; name: string }[];
};

const POPULAR = ["Niacinamide", "Sunscreen", "Miss Dior", "CeraVe", "PDRN", "Retinol", "Gift sets"];

export function SearchOverlay({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [q, setQ] = useState("");
  const [res, setRes] = useState<Result | null>(null);
  const [active, setActive] = useState(-1);
  const input = useRef<HTMLInputElement>(null);
  const router = useRouter();

  useEffect(() => {
    if (open) setTimeout(() => input.current?.focus(), 50);
    const esc = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", esc);
    document.body.style.overflow = open ? "hidden" : "";
    return () => window.removeEventListener("keydown", esc);
  }, [open, onClose]);

  useEffect(() => {
    if (q.trim().length < 2) {
      setRes(null);
      return;
    }
    const ctrl = new AbortController();
    const t = setTimeout(async () => {
      try {
        const r = await fetch(`/api/search?q=${encodeURIComponent(q)}`, { signal: ctrl.signal });
        setRes(await r.json());
        setActive(-1);
      } catch {}
    }, 160);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [q]);

  const go = (href: string) => {
    onClose();
    setQ("");
    router.push(href);
  };

  const onKey = (e: React.KeyboardEvent) => {
    const n = res?.products.length ?? 0;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((a) => Math.min(a + 1, n - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => Math.max(a - 1, -1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (active >= 0 && res) go(`/p/${res.products[active].slug}`);
      else if (q.trim()) go(`/search?q=${encodeURIComponent(q.trim())}`);
    }
  };

  return (
    <div className={clsx("fixed inset-0 z-[60] transition-all duration-500", open ? "visible opacity-100" : "invisible opacity-0")} role="dialog" aria-label="Search">
      <div className="absolute inset-0 bg-ink/30 backdrop-blur-sm" onClick={onClose} />
      <div className={clsx("relative bg-ivory transition-transform duration-500 ease-luxe", open ? "translate-y-0" : "-translate-y-6")}>
        <div className="container-lux py-6 sm:py-10">
          <div className="flex items-center gap-4 border-b border-ink pb-3">
            <Search strokeWidth={1.1} className="h-6 w-6 shrink-0" />
            <input
              ref={input}
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={onKey}
              placeholder="Search products, brands, ingredients"
              className="w-full bg-transparent font-serif text-2xl outline-none placeholder:text-ink-300 sm:text-4xl"
              aria-autocomplete="list"
            />
            <button onClick={onClose} aria-label="Close search">
              <X strokeWidth={1.1} className="h-6 w-6" />
            </button>
          </div>

          {!res && (
            <div className="mt-8">
              <p className="eyebrow mb-4">Popular searches</p>
              <div className="flex flex-wrap gap-2">
                {POPULAR.map((p) => (
                  <button key={p} className="chip" onClick={() => setQ(p)}>
                    {p}
                  </button>
                ))}
              </div>
            </div>
          )}

          {res && (
            <div className="mt-8 grid gap-10 md:grid-cols-[1fr_3fr]">
              <div className="space-y-8">
                {res.brands.length > 0 && (
                  <div>
                    <p className="eyebrow mb-3">Brands</p>
                    {res.brands.map((b) => (
                      <button key={b.slug} onClick={() => go(`/brands/${b.slug}`)} className="block py-1 font-serif text-xl hover:text-champagne-700">{b.name}</button>
                    ))}
                  </div>
                )}
                {res.categories.length > 0 && (
                  <div>
                    <p className="eyebrow mb-3">Categories</p>
                    {res.categories.map((c) => (
                      <button key={c.slug} onClick={() => go(`/c/${c.slug}`)} className="block py-1 font-serif text-xl hover:text-champagne-700">{c.name}</button>
                    ))}
                  </div>
                )}
              </div>
              <div>
                <p className="eyebrow mb-3">Products</p>
                {res.products.length === 0 && <p className="text-ink-500">No products match “{q}”. Try a brand or an ingredient.</p>}
                <ul className="grid gap-x-6 gap-y-1 sm:grid-cols-2">
                  {res.products.map((p, i) => (
                    <li key={p.slug}>
                      <Link href={`/p/${p.slug}`} onClick={onClose} className={clsx("flex items-center gap-4 p-2 transition", active === i ? "bg-ivory-200" : "hover:bg-ivory-200")}>
                        <span className="relative h-16 w-[52px] shrink-0 overflow-hidden bg-ivory-200">
                          <Image src={p.image} alt="" fill sizes="52px" className="object-cover" />
                        </span>
                        <span className="min-w-0">
                          <span className="block text-[10px] uppercase tracking-[0.18em] text-ink-500">{p.brand}</span>
                          <span className="block truncate font-serif text-lg">{p.name}</span>
                          <span className="text-xs text-ink-500">{formatLKR(p.price)}</span>
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
                {res.products.length > 0 && (
                  <button onClick={() => go(`/search?q=${encodeURIComponent(q)}`)} className="btn-ghost mt-6 text-[11px]">
                    See all results <ArrowRight width={14} />
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
