export const revalidate = 300;
import Image from "next/image";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/store/PageHeader";
import { Reveal } from "@/components/store/Reveal";

export const metadata = { title: "Brands", description: "Authentic international beauty brands available in Sri Lanka, from Medicube and CeraVe to Dior and La Mer." };

export default async function BrandsPage() {
  const brands = await prisma.brand.findMany({ orderBy: { name: "asc" }, include: { _count: { select: { products: true } } } });
  const groups = brands.reduce<Record<string, typeof brands>>((m, b) => ((m[b.name[0].toUpperCase()] ??= []).push(b), m), {});
  return (
    <div className="container-lux">
      <PageHeader eyebrow="Authorised & authentic" title="Our houses" description="Every brand at Skinora is sourced from its authorised distributor. No parallel imports, no grey market." crumbs={[{ label: "Home", href: "/" }, { label: "Brands" }]} />
      <div className="grid grid-cols-2 border-l border-t border-ink/10 sm:grid-cols-3 lg:grid-cols-5">
        {brands.map((b, i) => (
          <Reveal key={b.id} delay={(i % 5) * 60}>
            <Link href={`/brands/${b.slug}`} className="group flex aspect-square flex-col items-center justify-center gap-3 border-b border-r border-ink/10 p-6 transition hover:bg-white">
              {b.logoUrl && <Image src={b.logoUrl} alt={b.name} width={200} height={100} className="w-full max-w-[170px] opacity-80 transition group-hover:opacity-100" />}
              <span className="text-[10.5px] uppercase tracking-[0.16em] text-ink-400">{b.origin} · {b._count.products} products</span>
            </Link>
          </Reveal>
        ))}
      </div>
      <div className="mt-20 columns-2 gap-10 sm:columns-3 lg:columns-5">
        {Object.entries(groups).map(([letter, list]) => (
          <div key={letter} className="mb-8 break-inside-avoid">
            <p className="font-serif text-3xl text-champagne-700">{letter}</p>
            {list.map((b) => (
              <Link key={b.id} href={`/brands/${b.slug}`} className="block py-1 text-sm hover:text-champagne-700">{b.name}</Link>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
