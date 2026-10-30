import Link from "next/link";
import { LOCALES } from "@/i18n";
import { Newsletter } from "./Newsletter";
import { HideOnCheckout } from "./HideOnCheckout";

const cols = [
  { title: "Shop", links: [["Skin Care", "/c/skin-care"], ["Fragrances", "/c/fragrances"], ["Lifestyle", "/c/lifestyle"], ["The Luxury Collection", "/collections/luxury-collection"], ["Brands", "/brands"], ["Offers", "/offers"]] },
  { title: "Client care", links: [["Track your order", "/track"], ["Delivery & rates", "/delivery"], ["Returns", "/delivery#returns"], ["Authenticity promise", "/authenticity"], ["My account", "/account"]] },
  { title: "Discover", links: [["Skin quiz", "/quiz"], ["Glass Skin Edit", "/collections/glass-skin-edit"], ["Gifts for Her", "/collections/gifts-for-her"], ["Barrier Repair", "/collections/barrier-repair"]] },
];

export function Footer() {
  return (
    <footer className="mt-28 border-t border-ink/[0.07] bg-stone text-ink">
      <HideOnCheckout>
        <div className="container-lux grid gap-12 py-16 lg:grid-cols-12 lg:py-20">
          <div className="lg:col-span-4">
            <p className="font-serif text-4xl font-light tracking-[0.32em]">SKINORA</p>
            <p className="mt-5 max-w-sm text-sm leading-relaxed text-ink-500">
              Sri Lanka&apos;s home of authentic international skincare and fragrance. Every product is sourced from authorised distributors, with batch and expiry shown before you buy.
            </p>
            <div className="mt-8">
              <p className="eyebrow-wide mb-3">The Skinora letter</p>
              <Newsletter />
            </div>
          </div>
          {cols.map((c) => (
            <div key={c.title} className="lg:col-span-2">
              <p className="nav-caps mb-5 text-ink-500">{c.title}</p>
              <ul className="space-y-3 text-sm text-ink-700">
                {c.links.map(([l, h]) => (
                  <li key={h}><Link href={h} className="link-underline hover:text-ink">{l}</Link></li>
                ))}
              </ul>
            </div>
          ))}
          <div className="lg:col-span-2">
            <p className="nav-caps mb-5 text-ink-500">Visit</p>
            <p className="text-sm leading-relaxed text-ink-700">
              Skinora Atelier<br />42 Flower Road, Colombo 07<br />Mon to Sat, 10am to 7pm
            </p>
            <p className="mt-4 text-sm text-ink-700">+94 77 123 4567<br />care@skinora.lk</p>
          </div>
        </div>
      </HideOnCheckout>
      <div className="border-t border-ink/[0.07]">
        <div className="container-lux grid items-center gap-6 py-7 text-[10px] uppercase tracking-[0.22em] text-ink-500 lg:grid-cols-[1fr_auto_1fr]">
          <p className="flex flex-wrap justify-center gap-x-6 gap-y-2 lg:justify-start">
            <Link href="/authenticity" className="hover:text-ink">Authenticity</Link>
            <Link href="/delivery" className="hover:text-ink">Delivery</Link>
            <Link href="/track" className="hover:text-ink">Track order</Link>
            <Link href="/delivery#returns" className="hover:text-ink">Returns</Link>
          </p>
          <div className="flex items-center justify-center gap-5" aria-hidden>
            <span className="h-px w-12 bg-ink/25 sm:w-16" />
            <span className="font-display text-[34px] leading-none text-ink/80">S</span>
            <span className="h-px w-12 bg-ink/25 sm:w-16" />
          </div>
          <p className="text-center lg:text-right">Beauty for a brighter tomorrow</p>
        </div>
        <div className="container-lux flex flex-col items-center gap-3 pb-8 text-[10px] uppercase tracking-[0.18em] text-ink-400 md:flex-row md:justify-between">
          <p>© {new Date().getFullYear()} Skinora Imports (Pvt) Ltd. All prices in LKR.</p>
          <p className="flex flex-wrap justify-center gap-x-4 gap-y-2">
            <span>Visa</span><span>Mastercard</span><span>Amex</span><span>Koko</span><span>Mintpay</span><span>Cash on delivery</span>
          </p>
          <p className="flex gap-3">
            {LOCALES.map((l) => (
              <span key={l.code} className={l.enabled ? "text-ink" : "opacity-50"} title={l.enabled ? undefined : "Coming soon"}>
                {l.label}
              </span>
            ))}
          </p>
        </div>
      </div>
    </footer>
  );
}
