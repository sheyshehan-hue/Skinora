import Image from "next/image";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { productCardInclude, toCard } from "@/lib/catalog";
import { EditorialHero } from "@/components/store/EditorialHero";
import { CategoryTiles } from "@/components/store/CategoryTiles";
import { TrustBar } from "@/components/store/TrustBar";
import { ProductGrid } from "@/components/store/ProductGrid";
import { ProductCard } from "@/components/store/ProductCard";
import { SectionHeading } from "@/components/store/SectionHeading";
import { Reveal } from "@/components/store/Reveal";
import { Countdown } from "@/components/store/Countdown";

export const revalidate = 300;

export default async function Home() {
  const now = new Date();
  const [heroes, promo, best, fresh, brands, luxury, collections, flash] = await Promise.all([
    prisma.banner.findMany({ where: { placement: "HERO", active: true }, orderBy: { sortOrder: "asc" } }),
    prisma.banner.findFirst({ where: { placement: "PROMO", active: true }, orderBy: { sortOrder: "asc" } }),
    prisma.product.findMany({ where: { status: "ACTIVE", isBestSeller: true }, orderBy: { ratingCount: "desc" }, take: 8, include: productCardInclude }),
    prisma.product.findMany({ where: { status: "ACTIVE", isNew: true }, orderBy: { createdAt: "desc" }, take: 4, include: productCardInclude }),
    prisma.brand.findMany({ orderBy: [{ featured: "desc" }, { isLuxury: "desc" }, { sortOrder: "asc" }], take: 12 }),
    prisma.collection.findUnique({ where: { slug: "luxury-collection" }, include: { products: { orderBy: { sortOrder: "asc" }, take: 4, include: { product: { include: productCardInclude } } } } }),
    prisma.collection.findMany({ where: { featured: true, slug: { not: "luxury-collection" } }, orderBy: { sortOrder: "asc" }, take: 3 }),
    prisma.flashSale.findFirst({ where: { active: true, startsAt: { lte: now }, endsAt: { gt: now } }, include: { products: { include: { product: { include: productCardInclude } } } } }),
  ]);

  const orgLd = {
    "@context": "https://schema.org",
    "@type": "OnlineStore",
    name: "Skinora",
    url: process.env.NEXT_PUBLIC_SITE_URL,
    address: { "@type": "PostalAddress", streetAddress: "42 Flower Road", addressLocality: "Colombo 07", addressCountry: "LK" },
    currenciesAccepted: "LKR",
    paymentAccepted: "Credit Card, Koko, Mintpay, Bank Transfer, Cash on Delivery",
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(orgLd) }} />
      {heroes[0] && <EditorialHero slide={heroes[0]} />}

      <div className="container-lux">
        <div className="mt-6 lg:mt-8">
          <CategoryTiles />
        </div>
        <Reveal className="mt-16">
          <TrustBar />
        </Reveal>

        {/* Best sellers */}
        <section className="mt-24">
          <SectionHeading eyebrow="Most loved in Sri Lanka" title="Best sellers" href="/c/skin-care?sort=bestsellers" />
          <ProductGrid products={best.map(toCard)} />
        </section>
      </div>

      {/* Luxury collection */}
      {luxury && (
        <section className="mt-32 bg-ink text-ivory">
          <div className="container-lux grid gap-12 py-20 lg:grid-cols-12 lg:py-28">
            <Reveal className="lg:col-span-5">
              <div className="relative aspect-[4/5] overflow-hidden">
                {luxury.imageUrl && <Image src={luxury.imageUrl} alt={luxury.title} fill sizes="(min-width:1024px) 40vw, 100vw" className="object-cover" />}
              </div>
            </Reveal>
            <div className="flex flex-col justify-center lg:col-span-7 lg:pl-8">
              <Reveal>
                <p className="eyebrow text-champagne-300">{luxury.eyebrow}</p>
                <h2 className="mt-4 font-serif text-5xl font-light leading-[1.05] sm:text-6xl lg:text-7xl">
                  The Luxury <em className="text-champagne-300">Collection</em>
                </h2>
                <p className="mt-6 max-w-lg leading-relaxed text-ivory/70">{luxury.description}</p>
              </Reveal>
              <div className="mt-12 grid grid-cols-2 gap-x-5 gap-y-10 sm:grid-cols-4 [&_h3]:text-ivory [&_span]:text-ivory/70">
                {luxury.products.map(({ product }, i) => (
                  <Reveal key={product.id} delay={i * 90}>
                    <ProductCard p={toCard(product)} sizes="(min-width:1024px) 14vw, 45vw" />
                  </Reveal>
                ))}
              </div>
              <Reveal>
                <Link href="/collections/luxury-collection" className="btn mt-12 self-start border border-champagne-300 text-champagne-200 hover:bg-champagne-300 hover:text-ink">
                  Explore the collection
                </Link>
              </Reveal>
            </div>
          </div>
        </section>
      )}

      <div className="container-lux">
        {/* Brands */}
        <section className="mt-28">
          <SectionHeading eyebrow="Authorised & authentic" title="Featured houses" href="/brands" linkLabel="All brands" />
          <div className="grid grid-cols-2 border-l border-t border-ink/10 sm:grid-cols-3 lg:grid-cols-6">
            {brands.slice(0, 12).map((b) => (
              <Link key={b.id} href={`/brands/${b.slug}`} className="group flex aspect-[2/1] items-center justify-center border-b border-r border-ink/10 px-4 transition hover:bg-white">
                {b.logoUrl ? (
                  <Image src={b.logoUrl} alt={b.name} width={200} height={100} className="w-full max-w-[150px] opacity-80 transition group-hover:opacity-100" />
                ) : (
                  <span className="font-serif text-lg tracking-[0.2em]">{b.name}</span>
                )}
              </Link>
            ))}
          </div>
        </section>

        {/* Offers / flash sale */}
        {promo && (
          <section className="mt-28">
            <Reveal>
              <div className="grid overflow-hidden bg-champagne-50 lg:grid-cols-2">
                <div className="relative aspect-[16/10] lg:aspect-auto">
                  {promo.imageUrl && <Image src={promo.imageUrl} alt="" fill sizes="(min-width:1024px) 50vw, 100vw" className="object-cover" />}
                </div>
                <div className="flex flex-col justify-center gap-6 p-8 sm:p-14">
                  <p className="eyebrow text-rosewood">{promo.eyebrow}</p>
                  <h2 className="font-serif text-5xl font-light leading-tight">{promo.title}</h2>
                  <p className="max-w-md text-ink-700">{promo.subtitle}</p>
                  {flash && <Countdown to={flash.endsAt.toISOString()} />}
                  {promo.ctaHref && (
                    <Link href={promo.ctaHref} className="btn-primary self-start">
                      {promo.ctaLabel}
                    </Link>
                  )}
                </div>
              </div>
            </Reveal>
            {flash && (
              <div className="mt-12">
                <ProductGrid products={flash.products.slice(0, 4).map((p) => toCard(p.product))} />
              </div>
            )}
          </section>
        )}

        {/* New arrivals */}
        <section className="mt-28">
          <SectionHeading eyebrow="Just landed" title="New arrivals" href="/c/skin-care?sort=new" />
          <ProductGrid products={fresh.map(toCard)} />
        </section>

        {/* Quiz CTA */}
        <section className="mt-28">
          <Reveal>
            <div className="relative overflow-hidden border border-ink/10 bg-white px-6 py-16 text-center sm:px-16 sm:py-24">
              <p className="eyebrow">New · AI skin analysis</p>
              <h2 className="mx-auto mt-4 max-w-2xl font-serif text-5xl font-light leading-tight sm:text-6xl">
                Not sure where to begin? <em>Let AI read your skin.</em>
              </h2>
              <p className="mx-auto mt-6 max-w-lg text-ink-600">Take a selfie and we&apos;ll score eight signs of skin health, then build a morning and evening routine for your skin, your concerns and Sri Lanka&apos;s climate. Prefer not to? Answer five quick questions instead.</p>
              <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
                <Link href="/quiz?scan=1" className="btn-primary">Scan my skin</Link>
                <Link href="/quiz" className="btn-outline">Take the quiz</Link>
              </div>
            </div>
          </Reveal>
        </section>

        {/* Collections */}
        <section className="mt-28">
          <SectionHeading eyebrow="Curated" title="Edits we love" />
          <div className="grid gap-6 md:grid-cols-3">
            {collections.map((c, i) => (
              <Reveal key={c.id} delay={i * 120}>
                <Link href={`/collections/${c.slug}`} className="group block">
                  <div className="relative aspect-[4/5] overflow-hidden bg-ivory-200">
                    {c.imageUrl && <Image src={c.imageUrl} alt={c.title} fill sizes="(min-width:768px) 33vw, 100vw" className="object-cover transition-transform duration-[1600ms] ease-luxe group-hover:scale-105" />}
                  </div>
                  <p className="eyebrow mt-5">{c.eyebrow}</p>
                  <h3 className="mt-2 font-serif text-3xl">{c.title}</h3>
                  <p className="mt-2 text-sm text-ink-500">{c.description}</p>
                </Link>
              </Reveal>
            ))}
          </div>
        </section>

        {/* Authenticity */}
        <section className="mt-28 grid items-center gap-12 lg:grid-cols-2">
          <Reveal>
            <p className="eyebrow">Our promise</p>
            <h2 className="mt-4 font-serif text-5xl font-light leading-tight">Authenticity you can see, before you buy.</h2>
            <p className="mt-6 max-w-lg leading-relaxed text-ink-600">
              Every Skinora product is imported from authorised distributors in Seoul, Paris, Dubai and Singapore, cleared through Sri Lanka Customs and stored at a constant 18–22°C. Each product page shows the batch number and expiry of the exact stock we&apos;ll send you.
            </p>
            <Link href="/authenticity" className="btn-ghost mt-8 text-[11px]">
              Read our authenticity promise
            </Link>
          </Reveal>
          <Reveal delay={150}>
            <dl className="grid grid-cols-2 gap-px bg-ink/10">
              {[
                ["100%", "Authentic, never grey-market"],
                ["4", "Authorised import partners"],
                ["18–22°C", "Climate-controlled storage"],
                ["FEFO", "First-expiry, first-out dispatch"],
              ].map(([k, v]) => (
                <div key={k} className="bg-ivory p-8">
                  <dt className="font-serif text-4xl text-champagne-700">{k}</dt>
                  <dd className="mt-2 text-sm text-ink-600">{v}</dd>
                </div>
              ))}
            </dl>
          </Reveal>
        </section>
      </div>
    </>
  );
}
