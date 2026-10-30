import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Check, X } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { flashPercent, frequentlyBoughtTogether, productCardInclude, toCard, variantPrice } from "@/lib/catalog";
import { Breadcrumbs } from "@/components/store/PageHeader";
import { Gallery } from "@/components/store/Gallery";
import { PurchasePanel } from "@/components/store/PurchasePanel";
import { FrequentlyBought } from "@/components/store/FrequentlyBought";
import { ReviewForm } from "@/components/store/ReviewForm";
import { ReviewsList } from "@/components/store/ReviewsList";
import { RecentlyViewed } from "@/components/store/RecentlyViewed";
import { ProductGrid } from "@/components/store/ProductGrid";
import { Stars } from "@/components/store/Stars";
import { AuthenticBadge } from "@/components/store/AuthenticBadge";
import { SectionHeading } from "@/components/store/SectionHeading";
import { SKIN_TYPES } from "@/lib/constants";

type Props = { params: Promise<{ slug: string }> };

async function getProduct(slug: string) {
  return prisma.product.findUnique({
    where: { slug },
    include: {
      brand: true,
      category: { include: { parent: true } },
      images: { orderBy: { sortOrder: "asc" } },
      variants: { orderBy: { sortOrder: "asc" }, include: { batches: { where: { remaining: { gt: 0 } }, orderBy: { expiryDate: "asc" }, take: 1, include: { supplier: true } } } },
      reviews: { where: { approved: true }, orderBy: { createdAt: "desc" }, take: 12 },
      flashSales: { include: { flashSale: true } },
    },
  });
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const p = await getProduct((await params).slug);
  if (!p) return {};
  const title = p.metaTitle ?? `${p.brand.name} ${p.name}`;
  return {
    title,
    description: p.metaDescription ?? p.description.slice(0, 155),
    alternates: { canonical: `/p/${p.slug}` },
    openGraph: { title, images: p.images[0] ? [{ url: p.images[0].url }] : [] },
  };
}

export default async function ProductPage({ params }: Props) {
  const p = await getProduct((await params).slug);
  if (!p || p.status !== "ACTIVE") notFound();
  const pct = flashPercent(p);
  const [fbt, related, dist, sold] = await Promise.all([
    frequentlyBoughtTogether(p.id, 2),
    prisma.product.findMany({ where: { categoryId: p.categoryId, id: { not: p.id }, status: "ACTIVE" }, take: 4, orderBy: { ratingCount: "desc" }, include: productCardInclude }),
    prisma.review.groupBy({ by: ["rating"], where: { productId: p.id, approved: true }, _count: true }),
    prisma.orderItem.aggregate({ where: { variant: { productId: p.id } }, _sum: { quantity: true } }),
  ]);
  const byStars = [5, 4, 3, 2, 1].map((r) => ({ r, n: dist.find((d) => d.rating === r)?._count ?? 0 }));
  const reviewTotal = byStars.reduce((a, b) => a + b.n, 0) || p.ratingCount;
  const soldCount = sold._sum.quantity ?? 0;
  const self = await prisma.product.findUnique({ where: { id: p.id }, include: productCardInclude });

  const variants = p.variants.map((v) => {
    const { price, compareAt } = variantPrice(v, pct);
    const b = v.batches[0];
    return { id: v.id, name: v.name, sku: v.sku, price, compareAt, stock: v.stock, batch: b ? { number: b.batchNumber, expiry: b.expiryDate.toISOString(), origin: b.supplier?.country ?? "" } : null };
  });
  const [desc, notes] = p.description.split("\n\n");
  const site = process.env.NEXT_PUBLIC_SITE_URL ?? "";

  const ld = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: `${p.brand.name} ${p.name}`,
    image: p.images.map((i) => `${site}${i.url}`),
    description: p.description,
    brand: { "@type": "Brand", name: p.brand.name },
    sku: p.variants[0]?.sku,
    countryOfOrigin: p.originCountry,
    offers: variants.map((v) => ({
      "@type": "Offer",
      sku: v.sku,
      name: v.name,
      price: v.price,
      priceCurrency: "LKR",
      availability: v.stock > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
      itemCondition: "https://schema.org/NewCondition",
      url: `${site}/p/${p.slug}`,
      shippingDetails: { "@type": "OfferShippingDetails", shippingDestination: { "@type": "DefinedRegion", addressCountry: "LK" } },
    })),
    ...(p.ratingCount ? { aggregateRating: { "@type": "AggregateRating", ratingValue: p.ratingAvg.toFixed(1), reviewCount: p.ratingCount } } : {}),
    review: p.reviews.slice(0, 5).map((r) => ({ "@type": "Review", author: { "@type": "Person", name: r.name }, reviewRating: { "@type": "Rating", ratingValue: r.rating }, reviewBody: r.body })),
  };

  const crumbs = [{ label: "Home", href: "/" }, ...(p.category.parent ? [{ label: p.category.parent.name, href: `/c/${p.category.parent.slug}` }] : []), { label: p.category.name, href: `/c/${p.category.slug}` }, { label: p.name }];
  const isFragrance = !!p.gender;
  const keyLower = p.keyIngredients.map((k) => k.toLowerCase());
  const ingredientHtml = p.ingredients.split(/,\s*/).map((ing, i) => {
    const key = keyLower.some((k) => ing.toLowerCase().includes(k.split(" ")[0].toLowerCase()));
    return <span key={i} className={key ? "font-medium text-ink underline decoration-champagne decoration-2 underline-offset-4" : ""}>{ing}{i < p.ingredients.split(/,\s*/).length - 1 ? ", " : ""}</span>;
  });

  return (
    <div className="container-lux pt-4 sm:pt-6">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ld) }} />
      <div className="hidden sm:block"><Breadcrumbs items={crumbs} /></div>
      <Link href={`/c/${p.category.slug}`} className="inline-flex min-h-11 items-center gap-2 text-[11px] uppercase tracking-[0.16em] text-ink-500 sm:hidden">
        <ArrowLeft width={14} strokeWidth={1.3} /> {p.category.name}
      </Link>
      <div className="mt-4 grid gap-7 sm:mt-6 lg:grid-cols-12 lg:gap-16">
        <div className="lg:col-span-7">
          <div className="lg:sticky lg:top-28">
            <Gallery images={p.images} alt={`${p.brand.name} ${p.name}`} />
          </div>
        </div>
        <div className="lg:col-span-5">
          <Link href={`/brands/${p.brand.slug}`} className="text-[11px] uppercase tracking-[0.22em] text-ink-500 hover:text-ink">{p.brand.name}</Link>
          <h1 className="mt-2 font-serif text-[34px] font-light leading-[1.08] sm:mt-3 sm:text-5xl">{p.name}</h1>
          {p.tagline && <p className="mt-2 font-serif text-lg italic text-ink-600 sm:mt-3 sm:text-xl">{p.tagline}</p>}
          <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2">
            {p.ratingCount > 0 && (
              <a href="#reviews" className="inline-flex min-h-9 items-center gap-2 text-xs text-ink-600 hover:text-ink">
                <Stars value={p.ratingAvg} size={13} />
                <span className="underline decoration-ink/25 underline-offset-4">{p.ratingAvg.toFixed(1)} · {p.ratingCount} reviews</span>
              </a>
            )}
            <AuthenticBadge />
            {pct > 0 && <span className="bg-rosewood px-2 py-1 text-[10.5px] uppercase tracking-[0.14em] text-white">Flash sale −{pct}%</span>}
          </div>
          {soldCount >= 10 && <p className="mt-3 text-xs text-ink-500">Chosen by {soldCount}+ Skinora clients</p>}
          <PurchasePanel
            product={{ id: p.id, slug: p.slug, name: p.name, brand: p.brand.name, image: p.images[0]?.url ?? "", origin: p.originCountry, importer: p.importer }}
            variants={variants}
            whatsapp={process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ?? "94771234567"}
            giftable={p.isLuxury || !!p.gender}
          />

          <div className="mt-10 divide-y divide-ink/10 border-y border-ink/10">
            <Detail title="Description" open>
              <p>{desc}</p>
              {notes && <p className="mt-4 text-ink-500"><span className="label inline">Notes</span> {notes}</p>}
              {p.keyIngredients.length > 0 && (
                <div className="mt-5 flex flex-wrap gap-2">
                  {p.keyIngredients.map((k) => <span key={k} className="chip normal-case">{k}</span>)}
                </div>
              )}
            </Detail>
            {!isFragrance && p.skinTypes.length > 0 && (
              <Detail title="Skin type suitability" open>
                <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {SKIN_TYPES.map((s) => {
                    const ok = p.skinTypes.includes(s);
                    return (
                      <li key={s} className={`flex items-center gap-2 capitalize ${ok ? "" : "text-ink-300"}`}>
                        {ok ? <Check width={15} className="text-sage" /> : <X width={15} />} {s}
                      </li>
                    );
                  })}
                </ul>
                {p.concerns.length > 0 && <p className="mt-4 text-ink-500">Targets: <span className="capitalize text-ink">{p.concerns.join(", ")}</span></p>}
              </Detail>
            )}
            <Detail title={isFragrance ? "Composition" : "Ingredients"}>
              <p className="leading-relaxed text-ink-600">{ingredientHtml}</p>
              {p.keyIngredients.length > 0 && <p className="mt-3 text-xs text-ink-400">Key actives are underlined. Always patch-test new products.</p>}
            </Detail>
            <Detail title="How to use"><p>{p.howToUse}</p></Detail>
            <Detail title="Delivery & returns">
              <p>Same-day delivery in Colombo for orders before 1pm, next-day to Gampaha, Kalutara, Kandy, Galle and Kurunegala, and 2 to 5 days island-wide. Complimentary over LKR 15,000. Unopened items can be returned within 14 days. <Link href="/delivery" className="underline">Rates by district</Link></p>
            </Detail>
          </div>
        </div>
      </div>

      {fbt.length > 0 && self && (
        <section className="mt-28">
          <SectionHeading eyebrow="Complete the ritual" title="Frequently bought together" />
          <FrequentlyBought items={[toCard(self), ...fbt]} />
        </section>
      )}

      <section id="reviews" className="mt-28 scroll-mt-28">
        <div className="grid gap-12 lg:grid-cols-12">
          <div className="lg:col-span-4">
            <p className="eyebrow-wide">Reviews</p>
            <div className="mt-3 flex items-end gap-4">
              <p className="font-serif text-7xl font-light leading-none">{p.ratingAvg.toFixed(1)}</p>
              <div className="pb-2">
                <Stars value={p.ratingAvg} size={16} />
                <p className="mt-1 text-xs text-ink-500">{p.ratingCount} reviews from Skinora clients</p>
              </div>
            </div>
            <ul className="mt-6 space-y-2" aria-label="Rating breakdown">
              {byStars.map(({ r, n }) => (
                <li key={r} className="flex items-center gap-3 text-xs text-ink-500">
                  <span className="w-10 shrink-0">{r} star</span>
                  <span className="h-[3px] flex-1 bg-ink/10"><span className="block h-full bg-champagne" style={{ width: `${reviewTotal ? (n / reviewTotal) * 100 : 0}%` }} /></span>
                  <span className="w-6 shrink-0 text-right">{n}</span>
                </li>
              ))}
            </ul>
            <div className="mt-8"><ReviewForm productId={p.id} slug={p.slug} /></div>
          </div>
          <div className="lg:col-span-8">
            <ReviewsList reviews={p.reviews.map((r) => ({ id: r.id, rating: r.rating, title: r.title, body: r.body, name: r.name, skinType: r.skinType, verified: r.verified, createdAt: r.createdAt.toISOString() }))} total={p.ratingCount} />
          </div>
        </div>
      </section>

      {related.length > 0 && (
        <section className="mt-28">
          <SectionHeading eyebrow="You may also like" title={`More ${p.category.name.toLowerCase()}`} href={`/c/${p.category.slug}`} />
          <ProductGrid products={related.map(toCard)} />
        </section>
      )}

      <RecentlyViewed current={{ id: p.id, slug: p.slug, brand: p.brand.name, name: p.name, image: p.images[0]?.url ?? "", price: variants[0]?.price ?? 0 }} />
    </div>
  );
}

function Detail({ title, children, open }: { title: string; children: React.ReactNode; open?: boolean }) {
  return (
    <details open={open} className="group py-5">
      <summary className="flex cursor-pointer list-none items-center justify-between text-[11.5px] uppercase tracking-[0.18em]">
        {title}
        <span className="text-lg font-light transition duration-300 group-open:rotate-45">+</span>
      </summary>
      <div className="mt-4 text-[15px] leading-relaxed text-ink-700">{children}</div>
    </details>
  );
}
