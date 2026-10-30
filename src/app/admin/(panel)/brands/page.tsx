import Image from "next/image";
import { prisma } from "@/lib/prisma";
import { requireStaff } from "@/lib/auth";
import { deleteBrand, saveBrand } from "@/actions/admin/catalog";
import { Badge, Card, PageTitle } from "@/components/admin/ui";

export const metadata = { title: "Brands" };

type B = { id: string; name: string; slug: string; origin: string | null; description: string | null; featured: boolean; isLuxury: boolean };

export default async function BrandsAdmin() {
  await requireStaff("catalog");
  const brands = await prisma.brand.findMany({ orderBy: { name: "asc" }, include: { _count: { select: { products: true } } } });
  return (
    <>
      <PageTitle title="Brands" subtitle={`${brands.length} brands. Featured brands appear on the home page.`} />
      <div className="grid gap-6 xl:grid-cols-3">
        <Card pad={false} className="xl:col-span-2">
          {brands.map((b) => (
            <details key={b.id} className="group border-b border-ink/[0.06] last:border-0">
              <summary className="flex cursor-pointer list-none items-center gap-4 px-5 py-3 hover:bg-ivory-50">
                <span className="relative h-10 w-20 shrink-0">{b.logoUrl && <Image src={b.logoUrl} alt={b.name} fill sizes="80px" className="object-contain" />}</span>
                <span className="flex-1 font-medium">{b.name}</span>
                {b.featured && <Badge tone="info">Featured</Badge>}
                {b.isLuxury && <Badge>Luxury</Badge>}
                <span className="w-24 text-right text-xs text-ink-400">{b.origin}</span>
                <span className="w-20 text-right text-xs text-ink-400">{b._count.products} products</span>
              </summary>
              <div className="bg-ivory-50 px-5 py-4"><BrandForm b={b} /></div>
            </details>
          ))}
        </Card>
        <Card title="New brand"><BrandForm /></Card>
      </div>
    </>
  );
}

function BrandForm({ b }: { b?: B }) {
  return (
    <>
      <form action={saveBrand} className="grid gap-3 sm:grid-cols-2">
        <input type="hidden" name="id" value={b?.id ?? ""} />
        <label><span className="a-label">Name</span><input name="name" defaultValue={b?.name} required className="a-input" /></label>
        <label><span className="a-label">Country of origin</span><input name="origin" defaultValue={b?.origin ?? ""} className="a-input" /></label>
        <label className="sm:col-span-2"><span className="a-label">Description</span><textarea name="description" defaultValue={b?.description ?? ""} rows={2} className="a-input h-auto py-2" /></label>
        <label className="sm:col-span-2"><span className="a-label">Logo (SVG or PNG)</span><input name="logo" type="file" accept="image/*" className="text-xs" /></label>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="featured" defaultChecked={b?.featured} className="accent-ink" /> Featured</label>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="isLuxury" defaultChecked={b?.isLuxury} className="accent-ink" /> Luxury house</label>
        <button className="a-btn-primary sm:col-span-2 sm:justify-self-start">{b ? "Save" : "Create brand"}</button>
      </form>
      {b && <form action={deleteBrand} className="mt-2"><input type="hidden" name="id" value={b.id} /><button className="text-xs text-[#b02e2e] hover:underline">Delete brand</button></form>}
    </>
  );
}
