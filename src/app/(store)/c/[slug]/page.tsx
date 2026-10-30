import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import clsx from "clsx";
import { prisma } from "@/lib/prisma";
import { Listing, type SP } from "@/components/store/Listing";
import { PageHeader } from "@/components/store/PageHeader";

type Props = { params: Promise<{ slug: string }>; searchParams: Promise<SP> };

async function getCategory(slug: string) {
  return prisma.category.findUnique({ where: { slug }, include: { parent: { include: { children: { orderBy: { sortOrder: "asc" } } } }, children: { orderBy: { sortOrder: "asc" } } } });
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const c = await getCategory((await params).slug);
  if (!c) return {};
  return { title: `${c.name}${c.parent ? ` | ${c.parent.name}` : ""}`, description: `${c.description ?? ""} Shop authentic ${c.name.toLowerCase()} in Sri Lanka with prices in LKR and same-day Colombo delivery.`, alternates: { canonical: `/c/${c.slug}` } };
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
    </div>
  );
}
