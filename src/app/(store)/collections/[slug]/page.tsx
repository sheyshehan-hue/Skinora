import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { productCardInclude, toCard } from "@/lib/catalog";
import { ProductGrid } from "@/components/store/ProductGrid";
import { Breadcrumbs } from "@/components/store/PageHeader";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const c = await prisma.collection.findUnique({ where: { slug: (await params).slug } });
  return c ? { title: c.title, description: c.description ?? undefined } : {};
}

export default async function CollectionPage({ params }: Props) {
  const c = await prisma.collection.findUnique({ where: { slug: (await params).slug }, include: { products: { orderBy: { sortOrder: "asc" }, include: { product: { include: productCardInclude } } } } });
  if (!c) notFound();
  const dark = c.slug === "luxury-collection";
  return (
    <>
      <section className={dark ? "bg-ink text-ivory" : "bg-ivory-200"}>
        <div className="container-lux grid items-center gap-10 py-12 lg:grid-cols-2 lg:py-0">
          <div className="lg:py-24">
            <div className={dark ? "[&_a]:text-ivory/60 [&_span]:text-ivory/80" : ""}>
              <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: c.title }]} />
            </div>
            <p className={`eyebrow mt-10 ${dark ? "text-champagne-300" : ""}`}>{c.eyebrow}</p>
            <h1 className="mt-4 animate-fadeUp font-serif text-6xl font-light leading-[1.02] lg:text-8xl">{c.title}</h1>
            <p className={`mt-6 max-w-md leading-relaxed ${dark ? "text-ivory/70" : "text-ink-600"}`}>{c.description}</p>
          </div>
          {c.imageUrl && (
            <div className="relative aspect-[4/5] max-h-[640px] w-full overflow-hidden lg:my-12">
              <Image src={c.imageUrl} alt={c.title} fill priority sizes="(min-width:1024px) 50vw, 100vw" className="object-cover" />
            </div>
          )}
        </div>
      </section>
      <div className="container-lux mt-16">
        <ProductGrid products={c.products.map((p) => toCard(p.product))} />
      </div>
    </>
  );
}
