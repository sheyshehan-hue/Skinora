import { prisma } from "@/lib/prisma";
import { productCardInclude, toCard } from "@/lib/catalog";
import { PageHeader } from "@/components/store/PageHeader";
import { ProductGrid } from "@/components/store/ProductGrid";
import { Countdown } from "@/components/store/Countdown";
import { formatLKR } from "@/lib/format";

export const metadata = { title: "Offers", description: "Flash sales, bundles and limited-time offers on authentic skincare and fragrance in Sri Lanka." };
export const dynamic = "force-dynamic";

export default async function OffersPage() {
  const now = new Date();
  const [flash, onSale, bundles, codes] = await Promise.all([
    prisma.flashSale.findMany({ where: { active: true, startsAt: { lte: now }, endsAt: { gt: now } }, include: { products: { include: { product: { include: productCardInclude } } } } }),
    prisma.product.findMany({ where: { status: "ACTIVE", variants: { some: { salePrice: { not: null } } } }, include: productCardInclude }),
    prisma.bundle.findMany({ where: { active: true }, include: { items: { include: { product: { include: { variants: { orderBy: { sortOrder: "asc" }, take: 1 } } } } } } }),
    prisma.discountCode.findMany({ where: { active: true, OR: [{ endsAt: null }, { endsAt: { gt: now } }] } }),
  ]);
  return (
    <div className="container-lux">
      <PageHeader eyebrow="Considered offers" title="Offers" description="Limited-time edits, bundles and codes. Never a clearance bin: every product is in date and authentic." crumbs={[{ label: "Home", href: "/" }, { label: "Offers" }]} />
      {flash.map((f) => (
        <section key={f.id} className="mb-24">
          <div className="mb-10 flex flex-col gap-6 border-y border-ink/10 py-8 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="eyebrow text-rosewood">Flash sale · {f.discountPercent}% off</p>
              <h2 className="mt-2 font-serif text-4xl">{f.name}</h2>
            </div>
            <Countdown to={f.endsAt.toISOString()} />
          </div>
          <ProductGrid products={f.products.map((p) => toCard(p.product))} />
        </section>
      ))}
      {bundles.length > 0 && (
        <section className="mb-24">
          <h2 className="mb-8 font-serif text-4xl">Bundles</h2>
          <div className="grid gap-6 md:grid-cols-2">
            {bundles.map((b) => {
              const full = b.items.reduce((s, i) => s + (i.product.variants[0]?.price ?? 0), 0);
              return (
                <div key={b.id} className="border border-ink/10 bg-white p-8">
                  <p className="eyebrow">Save {formatLKR(full - b.price)}</p>
                  <h3 className="mt-2 font-serif text-3xl">{b.name}</h3>
                  <p className="mt-2 text-sm text-ink-600">{b.description}</p>
                  <p className="mt-4"><span className="text-lg">{formatLKR(b.price)}</span> <s className="ml-2 text-sm text-ink-400">{formatLKR(full)}</s></p>
                  <p className="mt-2 text-xs text-ink-500">Applied automatically when both items are in your bag.</p>
                </div>
              );
            })}
          </div>
        </section>
      )}
      {onSale.length > 0 && (
        <section className="mb-24">
          <h2 className="mb-8 font-serif text-4xl">Special prices</h2>
          <ProductGrid products={onSale.map(toCard)} />
        </section>
      )}
      <section>
        <h2 className="mb-8 font-serif text-4xl">Codes</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          {codes.map((c) => (
            <div key={c.id} className="border border-dashed border-champagne-400 bg-champagne-50 p-6">
              <p className="font-mono text-lg tracking-widest">{c.code}</p>
              <p className="mt-2 text-sm text-ink-600">{c.description}</p>
              {c.minSpend > 0 && <p className="mt-1 text-xs text-ink-400">Min. spend {formatLKR(c.minSpend)}</p>}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
