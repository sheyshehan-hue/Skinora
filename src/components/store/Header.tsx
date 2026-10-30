"use client";
import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import clsx from "clsx";
import { Heart, Lock, Menu, Search, ShoppingBag, User, X } from "lucide-react";
import { cartCount, useCart, useWishlist } from "@/store/cart";
import { SearchOverlay } from "./SearchOverlay";
import { CartDrawer } from "./CartDrawer";
import type { Card } from "@/lib/catalog";

export type NavCategory = { id: string; name: string; slug: string; imageUrl: string | null; description: string | null; children: { id: string; name: string; slug: string }[] };

export function Header({ categories, announcement, picks = [] }: { categories: NavCategory[]; announcement?: string; picks?: Card[] }) {
  const [scrolled, setScrolled] = useState(false);
  const [mega, setMega] = useState<string | null>(null);
  const [mobile, setMobile] = useState(false);
  const [search, setSearch] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [bar, setBar] = useState(true);
  const items = useCart((s) => s.items);
  const setOpen = useCart((s) => s.setOpen);
  const wish = useWishlist((s) => s.items.length);
  const path = usePathname();

  useEffect(() => {
    setMounted(true);
    const on = () => setScrolled(window.scrollY > 24);
    on();
    window.addEventListener("scroll", on, { passive: true });
    return () => window.removeEventListener("scroll", on);
  }, []);
  useEffect(() => {
    setMega(null);
    setMobile(false);
  }, [path]);

  const count = mounted ? cartCount(items) : 0;
  const active = categories.find((c) => c.slug === mega);
  const parts = (announcement ?? "").split(/\s+[·|]\s+/).filter(Boolean);

  // Checkout keeps only what helps finish the order: the logo, a security cue and help.
  if (path?.startsWith("/checkout")) {
    return (
      <header className="border-b border-ink/10 bg-ivory">
        <div className="container-lux grid h-16 grid-cols-[1fr_auto_1fr] items-center lg:h-20">
          <Link href="/cart" className="nav-caps text-ink-500 hover:text-ink">← Bag</Link>
          <Link href="/" className="font-serif text-[24px] tracking-[0.32em] sm:text-[30px]" aria-label="Skinora home">SKINORA</Link>
          <p className="flex items-center justify-end gap-2 text-[10.5px] uppercase tracking-[0.18em] text-ink-500">
            <Lock width={13} strokeWidth={1.4} /> <span className="hidden sm:inline">Secure checkout</span>
          </p>
        </div>
      </header>
    );
  }

  return (
    <>
      {parts.length > 0 && bar && (
        <div className="relative border-b border-ink/[0.06] bg-stone text-[9.5px] uppercase tracking-[0.2em] text-ink-700 sm:text-[10px] sm:tracking-[0.24em]">
          <div className="container-lux flex h-9 items-center justify-center gap-4 px-10 text-center">
            <span className="truncate">{parts[0]}</span>
            {parts.slice(1).map((t) => (
              <span key={t} className="hidden items-center gap-4 md:flex"><span className="h-3 w-px bg-ink/25" />{t}</span>
            ))}
          </div>
          <button onClick={() => setBar(false)} aria-label="Close announcement" className="absolute right-2 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center text-ink-500 hover:text-ink sm:right-6">
            <X width={14} strokeWidth={1.4} />
          </button>
        </div>
      )}
      <header className={clsx("sticky top-0 z-40 transition-all duration-500", scrolled || mega ? "bg-ivory/95 shadow-[0_1px_0_rgba(0,0,0,0.06)] backdrop-blur-md" : "bg-ivory")} onMouseLeave={() => setMega(null)}>
        <div className="container-lux grid h-16 grid-cols-[1fr_auto_1fr] items-center lg:h-20">
          <div className="flex items-center gap-1">
            <button className="-ml-2 grid h-10 w-10 place-items-center lg:hidden" aria-label="Menu" onClick={() => setMobile(true)}>
              <Menu strokeWidth={1.2} width={22} />
            </button>
            <button className="grid h-10 w-10 place-items-center lg:hidden" aria-label="Search" onClick={() => setSearch(true)}>
              <Search strokeWidth={1.2} width={20} />
            </button>
            <nav className="hidden items-center gap-7 lg:flex" aria-label="Main">
              {categories.map((c) => (
                <Link key={c.id} href={`/c/${c.slug}`} onMouseEnter={() => setMega(c.slug)} className={clsx("link-underline nav-caps py-7", c.slug === "luxury" && "text-champagne-700")}>
                  {c.name}
                </Link>
              ))}
              <Link href="/brands" onMouseEnter={() => setMega(null)} className="link-underline nav-caps py-7">
                Brands
              </Link>
            </nav>
          </div>
          <Link href="/" className="font-serif text-[26px] font-light tracking-[0.34em] sm:text-[30px] lg:text-[34px]" aria-label="Skinora home">
            SKINORA
          </Link>
          <div className="flex items-center justify-end gap-0.5 sm:gap-1">
            <Link href="/quiz" className="link-underline nav-caps mr-4 hidden xl:block">
              Skin quiz
            </Link>
            <button className="hidden h-10 w-10 place-items-center lg:grid" aria-label="Search" onClick={() => setSearch(true)}>
              <Search strokeWidth={1.2} width={20} />
            </button>
            <Link href="/account" className="hidden h-10 w-10 place-items-center sm:grid" aria-label="Account">
              <User strokeWidth={1.2} width={20} />
            </Link>
            <Link href="/wishlist" className="relative grid h-10 w-10 place-items-center" aria-label="Wishlist">
              <Heart strokeWidth={1.2} width={20} />
              {mounted && wish > 0 && <span className="absolute right-1 top-1 h-1.5 w-1.5 rounded-full bg-champagne" />}
            </Link>
            <button className="relative -mr-2 grid h-10 w-10 place-items-center" aria-label={`Bag, ${count} items`} onClick={() => setOpen(true)}>
              <ShoppingBag strokeWidth={1.2} width={20} />
              {count > 0 && <span className="absolute right-0.5 top-0.5 grid h-[17px] min-w-[17px] place-items-center rounded-full bg-ink px-1 text-[9.5px] text-ivory">{count}</span>}
            </button>
          </div>
        </div>

        {/* mega menu */}
        <div className={clsx("absolute inset-x-0 top-full hidden overflow-hidden border-t border-ink/5 bg-ivory transition-all duration-500 ease-luxe lg:block", active ? "visible max-h-[460px] opacity-100" : "invisible max-h-0 opacity-0")}>
          {active && (
            <div className="container-lux grid grid-cols-12 gap-10 py-12">
              <div className="col-span-3">
                <p className="eyebrow mb-5">{active.name}</p>
                <ul className="space-y-3">
                  {active.children.map((ch) => (
                    <li key={ch.id}>
                      <Link href={`/c/${ch.slug}`} className="font-serif text-xl hover:text-champagne-700">
                        {ch.name}
                      </Link>
                    </li>
                  ))}
                  <li className="pt-3">
                    <Link href={`/c/${active.slug}`} className="btn-ghost text-[11px]">
                      Shop all {active.name}
                    </Link>
                  </li>
                </ul>
              </div>
              <div className="col-span-4">
                <p className="eyebrow mb-5">Discover</p>
                <ul className="space-y-3 text-sm text-ink-700">
                  <li><Link href={`/c/${active.slug}?sort=new`} className="hover:text-champagne-700">New arrivals</Link></li>
                  <li><Link href={`/c/${active.slug}?sort=bestsellers`} className="hover:text-champagne-700">Best sellers</Link></li>
                  <li><Link href="/collections/luxury-collection" className="hover:text-champagne-700">The Luxury Collection</Link></li>
                  <li><Link href="/quiz" className="hover:text-champagne-700">Find your routine: take the skin quiz</Link></li>
                  <li><Link href="/offers" className="hover:text-champagne-700">Offers & flash sales</Link></li>
                </ul>
                <p className="mt-8 max-w-xs text-sm leading-relaxed text-ink-500">{active.description}</p>
              </div>
              {active.imageUrl && (
                <Link href={`/c/${active.slug}`} className="group col-span-5 relative aspect-[16/10] overflow-hidden bg-ivory-200">
                  <Image src={active.imageUrl} alt={active.name} fill sizes="40vw" className="object-cover transition duration-[1400ms] ease-luxe group-hover:scale-105" />
                  <span className="absolute bottom-5 left-5 font-serif text-3xl italic">{active.name}</span>
                </Link>
              )}
            </div>
          )}
        </div>
      </header>

      {/* mobile drawer */}
      <div className={clsx("fixed inset-0 z-50 lg:hidden", mobile ? "visible" : "invisible")}>
        <div className={clsx("absolute inset-0 bg-ink/40 transition-opacity duration-500", mobile ? "opacity-100" : "opacity-0")} onClick={() => setMobile(false)} />
        <aside className={clsx("absolute inset-y-0 left-0 flex w-[88%] max-w-sm flex-col bg-ivory transition-transform duration-500 ease-luxe", mobile ? "translate-x-0" : "-translate-x-full")}>
          <div className="flex h-16 items-center justify-between border-b border-ink/10 px-5">
            <span className="font-serif text-2xl tracking-[0.3em]">SKINORA</span>
            <button onClick={() => setMobile(false)} aria-label="Close menu">
              <X strokeWidth={1.2} />
            </button>
          </div>
          <nav className="flex-1 overflow-y-auto px-5 py-6">
            {categories.map((c) => (
              <details key={c.id} className="group border-b border-ink/10 py-4">
                <summary className="flex cursor-pointer list-none items-center justify-between font-serif text-2xl">
                  {c.name}
                  <span className="text-base transition group-open:rotate-45">+</span>
                </summary>
                <ul className="mt-3 space-y-3 pl-1">
                  <li><Link href={`/c/${c.slug}`} className="text-sm uppercase tracking-[0.14em]">Shop all</Link></li>
                  {c.children.map((ch) => (
                    <li key={ch.id}><Link href={`/c/${ch.slug}`} className="text-sm text-ink-700">{ch.name}</Link></li>
                  ))}
                </ul>
              </details>
            ))}
            <div className="mt-6 space-y-4 text-sm uppercase tracking-[0.14em]">
              <Link href="/brands" className="block">Brands</Link>
              <Link href="/offers" className="block">Offers</Link>
              <Link href="/quiz" className="block">Skin quiz</Link>
              <Link href="/account" className="block">My account</Link>
              <Link href="/track" className="block">Track an order</Link>
            </div>
          </nav>
        </aside>
      </div>

      <SearchOverlay open={search} onClose={() => setSearch(false)} />
      <CartDrawer picks={picks} />
    </>
  );
}
