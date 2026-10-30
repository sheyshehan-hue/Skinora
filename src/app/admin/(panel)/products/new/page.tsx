import { prisma } from "@/lib/prisma";
import { requireStaff } from "@/lib/auth";
import { ProductForm } from "@/components/admin/ProductForm";
import { PageTitle } from "@/components/admin/ui";

export const metadata = { title: "New product" };

export default async function NewProduct() {
  await requireStaff("products");
  const [brands, categories] = await Promise.all([prisma.brand.findMany({ orderBy: { name: "asc" } }), prisma.category.findMany({ orderBy: [{ sortOrder: "asc" }], include: { parent: true } })]);
  return (
    <>
      <PageTitle title="New product" subtitle="Save the product first, then add images." />
      <ProductForm brands={brands.map((b) => ({ id: b.id, name: b.name, origin: b.origin }))} categories={categories.map((c) => ({ id: c.id, name: c.parent ? `${c.parent.name} › ${c.name}` : c.name }))} />
    </>
  );
}
