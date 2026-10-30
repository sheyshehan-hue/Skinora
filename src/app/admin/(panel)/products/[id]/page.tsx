import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireStaff } from "@/lib/auth";
import { ProductForm } from "@/components/admin/ProductForm";
import { ImageManager } from "@/components/admin/ImageManager";
import { Card, PageTitle } from "@/components/admin/ui";
import { formatDate, formatLKR } from "@/lib/format";

export const metadata = { title: "Edit product" };

export default async function EditProduct({ params }: { params: Promise<{ id: string }> }) {
  await requireStaff("products");
  const p = await prisma.product.findUnique({ where: { id: (await params).id }, include: { images: { orderBy: { sortOrder: "asc" } }, variants: { orderBy: { sortOrder: "asc" }, include: { batches: { where: { remaining: { gt: 0 } }, orderBy: { expiryDate: "asc" } } } }, brand: true } });
  if (!p) notFound();
  const [brands, categories] = await Promise.all([prisma.brand.findMany({ orderBy: { name: "asc" } }), prisma.category.findMany({ orderBy: [{ sortOrder: "asc" }], include: { parent: true } })]);
  return (
    <>
      <PageTitle title={p.name} subtitle={p.brand.name}>
        <Link href={`/p/${p.slug}`} target="_blank" className="a-btn-secondary">View in store</Link>
      </PageTitle>
      <div className="mb-6">
        <Card title="Images" subtitle="Drag to reorder. The first image is the main photo; the second shows on hover. Uploads are compressed automatically.">
          <ImageManager productId={p.id} images={p.images.map((i) => ({ id: i.id, url: i.url, alt: i.alt ?? "" }))} />
        </Card>
      </div>
      <ProductForm
        brands={brands.map((b) => ({ id: b.id, name: b.name, origin: b.origin }))}
        categories={categories.map((c) => ({ id: c.id, name: c.parent ? `${c.parent.name} › ${c.name}` : c.name }))}
        product={{
          id: p.id, name: p.name, slug: p.slug, brandId: p.brandId, categoryId: p.categoryId, tagline: p.tagline ?? "", description: p.description, ingredients: p.ingredients, keyIngredients: p.keyIngredients, howToUse: p.howToUse,
          skinTypes: p.skinTypes, concerns: p.concerns, gender: p.gender, isLuxury: p.isLuxury, isNew: p.isNew, isBestSeller: p.isBestSeller, featured: p.featured, status: p.status, originCountry: p.originCountry ?? "", metaTitle: p.metaTitle ?? "", metaDescription: p.metaDescription ?? "",
          variants: p.variants.map((v) => ({ id: v.id, name: v.name, sku: v.sku, price: v.price, salePrice: v.salePrice, costPrice: v.costPrice, stock: v.stock, reorderLevel: v.reorderLevel, leadTimeDays: v.leadTimeDays })),
        }}
      />
      <div className="mt-6">
        <Card title="Batches in stock" subtitle="Dispatched first-expiry-first-out. Receive new shipments in Inventory." pad={false}>
          <table className="table-lux">
            <thead><tr><th>Variant</th><th>Batch</th><th>Remaining</th><th>Unit cost</th><th>Expiry</th><th>Import ref.</th></tr></thead>
            <tbody>
              {p.variants.flatMap((v) => v.batches.map((b) => (
                <tr key={b.id}><td>{v.name}</td><td className="font-mono text-xs">{b.batchNumber}</td><td>{b.remaining} / {b.quantity}</td><td>{formatLKR(b.unitCost)}</td><td>{formatDate(b.expiryDate)}</td><td className="text-xs text-ink-500">{b.importRef}</td></tr>
              )))}
            </tbody>
          </table>
        </Card>
      </div>
    </>
  );
}
