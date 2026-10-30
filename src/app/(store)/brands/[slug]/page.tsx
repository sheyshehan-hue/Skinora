import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { Listing, type SP } from "@/components/store/Listing";
import { PageHeader } from "@/components/store/PageHeader";
import { AuthenticBadge } from "@/components/store/AuthenticBadge";

type Props = { params: Promise<{ slug: string }>; searchParams: Promise<SP> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const b = await prisma.brand.findUnique({ where: { slug: (await params).slug } });
  return b ? { title: `${b.name} Sri Lanka`, description: `Shop authentic ${b.name} in Sri Lanka. ${b.description ?? ""}` } : {};
}

export default async function BrandPage({ params, searchParams }: Props) {
  const b = await prisma.brand.findUnique({ where: { slug: (await params).slug } });
  if (!b) notFound();
  return (
    <div className="container-lux">
      <PageHeader eyebrow={`From ${b.origin}`} title={b.name} description={b.description} crumbs={[{ label: "Home", href: "/" }, { label: "Brands", href: "/brands" }, { label: b.name }]}>
        <AuthenticBadge className="mt-6" />
      </PageHeader>
      <Listing base={{ brand: [b.slug] }} sp={await searchParams} />
    </div>
  );
}
