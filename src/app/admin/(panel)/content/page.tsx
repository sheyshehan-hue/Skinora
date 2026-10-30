import Image from "next/image";
import { prisma } from "@/lib/prisma";
import { requireStaff } from "@/lib/auth";
import { deleteBanner, deleteCollection, saveBanner, saveCollection } from "@/actions/admin/catalog";
import { Badge, Card, PageTitle } from "@/components/admin/ui";

export const metadata = { title: "Home page" };

type Banner = { id: string; placement: string; eyebrow: string | null; title: string; subtitle: string | null; ctaLabel: string | null; ctaHref: string | null; imageUrl: string | null; sortOrder: number; active: boolean };

export default async function ContentPage() {
  await requireStaff("content");
  const [banners, collections, products] = await Promise.all([
    prisma.banner.findMany({ orderBy: [{ placement: "asc" }, { sortOrder: "asc" }] }),
    prisma.collection.findMany({ orderBy: { sortOrder: "asc" }, include: { products: { orderBy: { sortOrder: "asc" } } } }),
    prisma.product.findMany({ where: { status: "ACTIVE" }, orderBy: { name: "asc" }, include: { brand: true } }),
  ]);
  return (
    <>
      <PageTitle title="Home page" subtitle="Edit hero banners, the promo banner, the announcement bar and featured collections. Changes go live immediately." />
      <h2 className="mb-3 text-sm font-medium text-ink-500">Banners</h2>
      <div className="grid gap-4 lg:grid-cols-2">
        {banners.map((b) => (
          <Card key={b.id}>
            <div className="flex gap-4">
              <div className="relative aspect-video w-40 shrink-0 overflow-hidden rounded-lg bg-ivory-200">{b.imageUrl && <Image src={b.imageUrl} alt="" fill sizes="160px" className="object-cover" />}</div>
              <div className="min-w-0">
                <div className="flex gap-2"><Badge tone="info">{b.placement.toLowerCase()}</Badge>{!b.active && <Badge>hidden</Badge>}</div>
                <p className="mt-2 font-serif text-xl leading-tight">{b.title}</p>
                <p className="mt-1 line-clamp-2 text-xs text-ink-500">{b.subtitle}</p>
              </div>
            </div>
            <details className="mt-4"><summary className="cursor-pointer text-xs text-ink-500 hover:text-ink">Edit banner</summary><div className="mt-3"><BannerForm b={b} /></div></details>
          </Card>
        ))}
        <Card title="New banner"><BannerForm /></Card>
      </div>

      <h2 className="mb-3 mt-10 text-sm font-medium text-ink-500">Featured collections</h2>
      <div className="grid gap-4 lg:grid-cols-2">
        {collections.map((c) => (
          <Card key={c.id}>
            <div className="flex gap-4">
              <div className="relative h-24 w-20 shrink-0 overflow-hidden rounded-lg bg-ivory-200">{c.imageUrl && <Image src={c.imageUrl} alt="" fill sizes="80px" className="object-cover" />}</div>
              <div><p className="text-xs text-ink-400">{c.eyebrow}</p><p className="font-serif text-xl">{c.title}</p><p className="text-xs text-ink-500">{c.products.length} products · /collections/{c.slug}</p></div>
            </div>
            <details className="mt-4"><summary className="cursor-pointer text-xs text-ink-500 hover:text-ink">Edit collection</summary>
              <div className="mt-3"><CollectionForm c={{ ...c, productIds: c.products.map((p) => p.productId) }} products={products} /></div>
            </details>
          </Card>
        ))}
        <Card title="New collection"><CollectionForm products={products} /></Card>
      </div>
    </>
  );
}

function BannerForm({ b }: { b?: Banner }) {
  return (
    <>
      <form action={saveBanner} className="grid gap-3 sm:grid-cols-2">
        <input type="hidden" name="id" value={b?.id ?? ""} />
        <label><span className="a-label">Placement</span><select name="placement" defaultValue={b?.placement ?? "HERO"} className="a-input"><option value="HERO">Hero carousel</option><option value="PROMO">Promo banner</option><option value="ANNOUNCEMENT">Announcement bar</option></select></label>
        <label><span className="a-label">Order</span><input name="sortOrder" type="number" defaultValue={b?.sortOrder ?? 0} className="a-input" /></label>
        <label><span className="a-label">Eyebrow</span><input name="eyebrow" defaultValue={b?.eyebrow ?? ""} className="a-input" /></label>
        <label><span className="a-label">Headline</span><input name="title" defaultValue={b?.title} required className="a-input" /></label>
        <label className="sm:col-span-2"><span className="a-label">Subtitle</span><input name="subtitle" defaultValue={b?.subtitle ?? ""} className="a-input" /></label>
        <label><span className="a-label">Button label</span><input name="ctaLabel" defaultValue={b?.ctaLabel ?? ""} className="a-input" /></label>
        <label><span className="a-label">Button link</span><input name="ctaHref" defaultValue={b?.ctaHref ?? ""} className="a-input" placeholder="/c/fragrances" /></label>
        <label className="sm:col-span-2"><span className="a-label">Image (wide, at least 1600px)</span><input name="image" type="file" accept="image/*" className="text-xs" /></label>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="active" defaultChecked={b?.active ?? true} className="accent-ink" /> Visible</label>
        <button className="a-btn-primary sm:justify-self-end">{b ? "Save" : "Add banner"}</button>
      </form>
      {b && <form action={deleteBanner} className="mt-2"><input type="hidden" name="id" value={b.id} /><button className="text-xs text-[#b02e2e] hover:underline">Delete</button></form>}
    </>
  );
}

function CollectionForm({ c, products }: { c?: { id: string; title: string; slug: string; eyebrow: string | null; description: string | null; featured: boolean; productIds: string[] }; products: { id: string; name: string; brand: { name: string } }[] }) {
  return (
    <>
      <form action={saveCollection} className="grid gap-3 sm:grid-cols-2">
        <input type="hidden" name="id" value={c?.id ?? ""} />
        <label><span className="a-label">Title</span><input name="title" defaultValue={c?.title} required className="a-input" /></label>
        <label><span className="a-label">Eyebrow</span><input name="eyebrow" defaultValue={c?.eyebrow ?? ""} className="a-input" /></label>
        <label className="sm:col-span-2"><span className="a-label">Description</span><textarea name="description" defaultValue={c?.description ?? ""} rows={2} className="a-input h-auto py-2" /></label>
        <label className="sm:col-span-2"><span className="a-label">Products (hold Ctrl / ⌘ to select several)</span>
          <select name="productIds" multiple defaultValue={c?.productIds} className="a-input h-40 py-1 text-xs">{products.map((p) => <option key={p.id} value={p.id}>{p.brand.name} · {p.name}</option>)}</select>
        </label>
        <label className="sm:col-span-2"><span className="a-label">Cover image</span><input name="image" type="file" accept="image/*" className="text-xs" /></label>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="featured" defaultChecked={c?.featured ?? true} className="accent-ink" /> Show on home page</label>
        <button className="a-btn-primary sm:justify-self-end">{c ? "Save" : "Create collection"}</button>
      </form>
      {c && <form action={deleteCollection} className="mt-2"><input type="hidden" name="id" value={c.id} /><button className="text-xs text-[#b02e2e] hover:underline">Delete</button></form>}
    </>
  );
}
