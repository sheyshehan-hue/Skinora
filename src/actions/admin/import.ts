"use server";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireStaff } from "@/lib/auth";
import { slugify } from "@/lib/format";

export type ImportRow = Record<string, string>;
export type ImportResult = { created: number; updated: number; errors: { row: number; message: string }[] };

const list = (v?: string) => (v ? v.split(/[|;]/).map((x) => x.trim()).filter(Boolean) : []);
const int = (v?: string) => (v && v.trim() !== "" ? Math.round(Number(v.replace(/[^\d.]/g, ""))) : undefined);

/**
 * Bulk import. One row per variant; rows sharing a product name + brand become one product.
 * Existing SKUs are updated (price, stock, etc.), new SKUs are created.
 */
export async function importProducts(rows: ImportRow[], dryRun: boolean): Promise<ImportResult> {
  await requireStaff("products");
  const res: ImportResult = { created: 0, updated: 0, errors: [] };
  const brands = await prisma.brand.findMany();
  const cats = await prisma.category.findMany();

  for (const [i, r] of rows.entries()) {
    const rowNo = i + 2;
    try {
      const name = r.name?.trim();
      const sku = r.sku?.trim().toUpperCase();
      const price = int(r.price);
      if (!name || !sku || price === undefined || isNaN(price)) throw new Error("name, sku and price are required");
      let brand = brands.find((b) => b.name.toLowerCase() === r.brand?.trim().toLowerCase());
      if (!brand) {
        if (!r.brand) throw new Error("brand is required");
        if (!dryRun) {
          brand = await prisma.brand.create({ data: { name: r.brand.trim(), slug: slugify(r.brand) } });
          brands.push(brand);
        }
      }
      const cat = cats.find((c) => c.slug === slugify(r.category ?? "") || c.name.toLowerCase() === r.category?.trim().toLowerCase());
      if (!cat) throw new Error(`unknown category “${r.category}”. Use a category name or slug from the Categories page.`);
      const existingVariant = await prisma.variant.findUnique({ where: { sku } });
      if (dryRun) {
        existingVariant ? res.updated++ : res.created++;
        continue;
      }
      const slug = slugify(`${brand!.name} ${name}`);
      const productData = {
        name,
        brandId: brand!.id,
        categoryId: cat.id,
        ...(r.description ? { description: r.description } : {}),
        ...(r.tagline ? { tagline: r.tagline } : {}),
        ...(r.ingredients ? { ingredients: r.ingredients } : {}),
        ...(r.how_to_use ? { howToUse: r.how_to_use } : {}),
        ...(r.key_ingredients ? { keyIngredients: list(r.key_ingredients) } : {}),
        ...(r.skin_types ? { skinTypes: list(r.skin_types).map((x) => x.toLowerCase()) } : {}),
        ...(r.concerns ? { concerns: list(r.concerns).map((x) => x.toLowerCase()) } : {}),
        ...(r.gender ? { gender: r.gender.toLowerCase() } : {}),
        ...(r.luxury ? { isLuxury: /^(1|yes|true)$/i.test(r.luxury) } : {}),
        ...(r.status ? { status: r.status.toUpperCase() as "ACTIVE" | "DRAFT" } : {}),
      };
      const product = await prisma.product.upsert({ where: { slug }, update: productData, create: { ...productData, slug, description: r.description || name, originCountry: brand!.origin, status: (r.status?.toUpperCase() as "ACTIVE" | "DRAFT") || "DRAFT" } });
      const vData = { name: r.variant || "Standard", price, salePrice: int(r.sale_price) ?? null, costPrice: int(r.cost_price) ?? 0, reorderLevel: int(r.reorder_level) ?? 10 };
      const stock = int(r.stock);
      if (existingVariant) {
        await prisma.variant.update({ where: { sku }, data: { ...vData, productId: product.id, ...(stock !== undefined ? { stock } : {}) } });
        res.updated++;
      } else {
        const v = await prisma.variant.create({ data: { ...vData, sku, productId: product.id, stock: stock ?? 0 } });
        if (stock) {
          await prisma.batch.create({ data: { variantId: v.id, batchNumber: r.batch_number || `IMP-${Date.now().toString().slice(-6)}`, quantity: stock, remaining: stock, unitCost: vData.costPrice, expiryDate: r.expiry_date ? new Date(r.expiry_date) : new Date(Date.now() + 540 * 86_400_000), importRef: "CSV import" } });
        }
        res.created++;
      }
      if (r.image_url && !(await prisma.productImage.count({ where: { productId: product.id } }))) {
        await prisma.productImage.create({ data: { productId: product.id, url: r.image_url, alt: `${brand!.name} ${name}` } });
      }
    } catch (e) {
      res.errors.push({ row: rowNo, message: e instanceof Error ? e.message : "invalid row" });
    }
  }
  if (!dryRun) {
    revalidatePath("/admin/products");
    revalidatePath("/", "layout");
  }
  return res;
}
