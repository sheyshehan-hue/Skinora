import Image from "next/image";
import { prisma } from "@/lib/prisma";
import { requireStaff } from "@/lib/auth";
import { deleteCategory, saveCategory } from "@/actions/admin/catalog";
import { Card, PageTitle } from "@/components/admin/ui";

export const metadata = { title: "Categories" };

export default async function CategoriesPage() {
  await requireStaff("catalog");
  const roots = await prisma.category.findMany({ where: { parentId: null }, orderBy: { sortOrder: "asc" }, include: { _count: { select: { products: true } }, children: { orderBy: { sortOrder: "asc" }, include: { _count: { select: { products: true } } } } } });
  type C = (typeof roots)[number] | (typeof roots)[number]["children"][number];
  const Row = ({ c, child }: { c: C; child?: boolean }) => (
    <details className="group border-b border-ink/[0.06] last:border-0">
      <summary className={`flex cursor-pointer list-none items-center gap-3 px-5 py-3 hover:bg-ivory-50 ${child ? "pl-12" : ""}`}>
        <span className="relative h-10 w-10 overflow-hidden rounded bg-ivory-200">{c.imageUrl && <Image src={c.imageUrl} alt="" fill sizes="40px" className="object-cover" />}</span>
        <span className="flex-1"><span className={child ? "" : "font-medium"}>{c.name}</span> <span className="ml-2 font-mono text-xs text-ink-400">/c/{c.slug}</span></span>
        <span className="text-xs text-ink-400">{c._count.products} products</span>
        <span className="text-xs text-ink-500 group-open:hidden">Edit</span>
      </summary>
      <CategoryForm c={c} roots={roots} />
    </details>
  );
  return (
    <>
      <PageTitle title="Categories" subtitle="Organise the store navigation. Subcategories appear in the mega menu." />
      <div className="grid gap-6 xl:grid-cols-3">
        <Card pad={false} className="xl:col-span-2">
          {roots.map((r) => (
            <div key={r.id}>
              <Row c={r} />
              {r.children.map((ch) => <Row key={ch.id} c={ch} child />)}
            </div>
          ))}
        </Card>
        <Card title="New category"><CategoryForm roots={roots} /></Card>
      </div>
    </>
  );
}

function CategoryForm({ c, roots }: { c?: { id: string; name: string; slug: string; description: string | null; parentId: string | null; sortOrder: number }; roots: { id: string; name: string }[] }) {
  return (
    <div className={c ? "bg-ivory-50 px-5 py-4" : ""}>
      <form action={saveCategory} className="grid gap-3 sm:grid-cols-2">
        <input type="hidden" name="id" value={c?.id ?? ""} />
        <label><span className="a-label">Name</span><input name="name" defaultValue={c?.name} required className="a-input" /></label>
        <label><span className="a-label">URL slug</span><input name="slug" defaultValue={c?.slug} className="a-input font-mono text-xs" placeholder="auto" /></label>
        <label><span className="a-label">Parent</span><select name="parentId" defaultValue={c?.parentId ?? ""} className="a-input"><option value="">Top level</option>{roots.filter((r) => r.id !== c?.id).map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}</select></label>
        <label><span className="a-label">Sort order</span><input name="sortOrder" type="number" defaultValue={c?.sortOrder ?? 0} className="a-input" /></label>
        <label className="sm:col-span-2"><span className="a-label">Description</span><textarea name="description" defaultValue={c?.description ?? ""} rows={2} className="a-input h-auto py-2" /></label>
        <label className="sm:col-span-2"><span className="a-label">Image</span><input name="image" type="file" accept="image/*" className="text-xs" /></label>
        <div className="flex gap-2 sm:col-span-2"><button className="a-btn-primary">{c ? "Save" : "Create category"}</button></div>
      </form>
      {c && <form action={deleteCategory} className="mt-2"><input type="hidden" name="id" value={c.id} /><button className="text-xs text-[#b02e2e] hover:underline">Delete category</button></form>}
    </div>
  );
}
