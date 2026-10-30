import Image from "next/image";
import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireStaff } from "@/lib/auth";
import { formatLKR } from "@/lib/format";
import { Badge, Card, PageTitle } from "@/components/admin/ui";

export const metadata = { title: "Products" };

export default async function ProductsPage({ searchParams }: { searchParams: Promise<{ q?: string; brand?: string; category?: string; status?: string; stock?: string }> }) {
  await requireStaff("products");
  const sp = await searchParams;
  const where: Prisma.ProductWhereInput = {
    ...(sp.q ? { OR: [{ name: { contains: sp.q, mode: "insensitive" } }, { variants: { some: { sku: { contains: sp.q, mode: "insensitive" } } } }, { brand: { name: { contains: sp.q, mode: "insensitive" } } }] } : {}),
    ...(sp.brand ? { brandId: sp.brand } : {}),
    ...(sp.category ? { OR: [{ categoryId: sp.category }, { category: { parentId: sp.category } }] } : {}),
    ...(sp.status ? { status: sp.status as never } : {}),
    ...(sp.stock === "low" ? { variants: { some: { stock: { lte: 5 } } } } : {}),
  };
  const [products, brands, categories] = await Promise.all([
    prisma.product.findMany({ where, orderBy: [{ brand: { name: "asc" } }, { name: "asc" }], include: { brand: true, category: true, images: { orderBy: { sortOrder: "asc" }, take: 1 }, variants: { orderBy: { sortOrder: "asc" } } } }),
    prisma.brand.findMany({ orderBy: { name: "asc" } }),
    prisma.category.findMany({ orderBy: [{ parentId: "asc" }, { sortOrder: "asc" }] }),
  ]);
  return (
    <>
      <PageTitle title="Products" subtitle={`${products.length} products`}>
        <Link href="/admin/import" className="a-btn-secondary">Import CSV</Link>
        <Link href="/admin/products/new" className="a-btn-primary">Add product</Link>
      </PageTitle>
      <Card pad={false}>
        <form className="flex flex-wrap gap-2 border-b border-ink/[0.06] p-4">
          <input name="q" defaultValue={sp.q} placeholder="Search name, brand or SKU" className="a-input max-w-xs" />
          <select name="brand" defaultValue={sp.brand} className="a-input w-auto"><option value="">All brands</option>{brands.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}</select>
          <select name="category" defaultValue={sp.category} className="a-input w-auto"><option value="">All categories</option>{categories.map((c) => <option key={c.id} value={c.id}>{c.parentId ? "— " : ""}{c.name}</option>)}</select>
          <select name="status" defaultValue={sp.status} className="a-input w-auto"><option value="">Any status</option><option value="ACTIVE">Active</option><option value="DRAFT">Draft</option><option value="ARCHIVED">Archived</option></select>
          <select name="stock" defaultValue={sp.stock} className="a-input w-auto"><option value="">Any stock</option><option value="low">5 or fewer</option></select>
          <button className="a-btn-secondary">Filter</button>
        </form>
        <div className="overflow-x-auto">
          <table className="table-lux">
            <thead><tr><th>Product</th><th>Category</th><th>Variants</th><th>Price</th><th>Stock</th><th>Status</th></tr></thead>
            <tbody>
              {products.map((p) => {
                const stock = p.variants.reduce((s, v) => s + v.stock, 0);
                const prices = p.variants.map((v) => v.salePrice ?? v.price);
                return (
                  <tr key={p.id}>
                    <td>
                      <Link href={`/admin/products/${p.id}`} className="flex items-center gap-3">
                        <span className="relative h-12 w-10 shrink-0 overflow-hidden rounded bg-ivory-200">{p.images[0] && <Image src={p.images[0].url} alt="" fill sizes="40px" className="object-cover" />}</span>
                        <span><span className="block text-xs text-ink-400">{p.brand.name}</span><span className="font-medium hover:underline">{p.name}</span></span>
                      </Link>
                    </td>
                    <td className="text-ink-500">{p.category.name}</td>
                    <td className="text-xs text-ink-500">{p.variants.map((v) => v.name).join(", ")}</td>
                    <td className="tabular-nums">{prices.length > 1 ? `${formatLKR(Math.min(...prices))}+` : formatLKR(prices[0] ?? 0)}</td>
                    <td>{stock === 0 ? <Badge tone="critical">0</Badge> : stock <= 5 ? <Badge tone="warning">{stock}</Badge> : <span className="tabular-nums">{stock}</span>}</td>
                    <td><Badge tone={p.status === "ACTIVE" ? "good" : p.status === "DRAFT" ? "warning" : "neutral"}>{p.status.toLowerCase()}</Badge></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </>
  );
}
