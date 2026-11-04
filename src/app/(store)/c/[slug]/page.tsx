import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import clsx from "clsx";
import { prisma } from "@/lib/prisma";
import { Listing, type SP } from "@/components/store/Listing";
import { PageHeader } from "@/components/store/PageHeader";
import { FaqSection } from "@/components/store/SeoBlocks";
import { CATEGORY_SEO } from "@/lib/landing";
import { alternates } from "@/lib/seo";

type Props = { params: Promise<{ slug: string }>; searchParams: Promise<SP> };

async function getCategory(slug: string) {
  return prisma.category.findUnique({ where: { slug }, include: { parent: { include: { children: { orderBy: { sortOrder: "asc" } } } }, children: { orderBy: { sortOrder: "asc" } } } });
}

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const c = await getCategory((await params).slug);
  if (!c) return {};
  const seo = CATEGORY_SEO[c.slug];
  const label = c.parent?.slug === "fragrances" ? `${c.name} Fragrance` : c.name;
  const title = seo?.metaTitle ?? `${label} in Sri Lanka | Original ${c.parent ? c.parent.name : "Beauty"}, Prices in LKR`;
  const description = seo?.metaDescription ?? `${c.description ?? ""} Shop original ${c.name.toLowerCase()} online in Sri Lanka with prices in LKR, batch and expiry shown, same-day Colombo delivery and cash on delivery.`.trim();
  // Filtered or sorted views stay crawlable for links but out of the index; the clean URL is canonical.
  const filtered = Object.keys(await searchParams).length > 0;
  return {
    title: { absolute: `${title} | Skinora` },
    description,
    alternates: alternates(`/c/${c.slug}`),
    openGraph: { title, description, url: `/c/${c.slug}` },
    ...(filtered ? { robots: { index: false, follow: true } } : {}),
  };
}

export default async function CategoryPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const c = await getCategory(slug);
  if (!c) notFound();
  const siblings = c.parent ? c.parent.children : c.children;
  const root = c.parent ?? c;
  return (
    <div className="container-lux">
      <PageHeader
        eyebrow={c.parent?.name ?? "Shop"}
        title={c.name}
        description={c.description}
        crumbs={[{ label: "Home", href: "/" }, ...(c.parent ? [{ label: c.parent.name, href: `/c/${c.parent.slug}` }] : []), { label: c.name }]}
      >
        {siblings.length > 0 && (
          <div className="no-scrollbar -mx-4 mt-8 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:px-0">
            <Link href={`/c/${root.slug}`} className={clsx("chip shrink-0 normal-case", c.id === root.id && "chip-active")}>All {root.name}</Link>
            {siblings.map((s) => (
              <Link key={s.id} href={`/c/${s.slug}`} className={clsx("chip shrink-0 normal-case", s.id === c.id && "chip-active")}>
                {s.name}
              </Link>
            ))}
          </div>
        )}
      </PageHeader>
      <Listing base={{ category: c.slug }} sp={await searchParams} facetCategory={c.slug} />
      {CATEGORY_SEO[c.slug] && (
        <div className="mt-24 grid gap-16 lg:grid-cols-12">
          <section className="lg:col-span-5">
            <h2 className="font-serif text-3xl sm:text-4xl">{CATEGORY_SEO[c.slug].heading}</h2>
            <p className="mt-5 leading-relaxed text-ink-600">{CATEGORY_SEO[c.slug].body}</p>
            {(c.slug === "men" || c.slug === "women") && (
              <Link href={`/${c.slug}`} className="btn-ghost mt-6 inline-flex text-[11px]">{c.slug === "men" ? "The full men's edit" : "The full women's edit"}</Link>
            )}
          </section>
          <div className="lg:col-span-7"><FaqSection items={CATEGORY_SEO[c.slug].faq} /></div>
        </div>
      )}
    </div>
  );
}
