"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireStaff } from "@/lib/auth";
import { slugify } from "@/lib/format";
import { deleteImage as removeRemote, storeImage } from "@/lib/upload";

const variantSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, "Each variant needs a name, e.g. 30 ml"),
  sku: z.string().min(2, "Each variant needs a SKU"),
  price: z.coerce.number().int().min(0),
  salePrice: z.coerce.number().int().min(0).nullable().optional(),
  costPrice: z.coerce.number().int().min(0).default(0),
  stock: z.coerce.number().int().min(0).default(0),
  reorderLevel: z.coerce.number().int().min(0).default(10),
  leadTimeDays: z.coerce.number().int().min(1).default(21),
});

const productSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(2, "Product name is required"),
  slug: z.string().optional(),
  brandId: z.string().min(1, "Choose a brand"),
  categoryId: z.string().min(1, "Choose a category"),
  tagline: z.string().optional(),
  description: z.string().min(10, "Add a description"),
  ingredients: z.string().default(""),
  keyIngredients: z.array(z.string()).default([]),
  howToUse: z.string().default(""),
  skinTypes: z.array(z.string()).default([]),
  concerns: z.array(z.string()).default([]),
  gender: z.string().nullable().optional(),
  isLuxury: z.boolean().default(false),
  isNew: z.boolean().default(false),
  isBestSeller: z.boolean().default(false),
  featured: z.boolean().default(false),
  status: z.enum(["DRAFT", "ACTIVE", "ARCHIVED"]),
  originCountry: z.string().optional(),
  metaTitle: z.string().optional(),
  metaDescription: z.string().optional(),
  variants: z.array(variantSchema).min(1, "Add at least one variant"),
});

export type ProductInput = z.input<typeof productSchema>;

export async function saveProduct(input: ProductInput): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  await requireStaff("products");
  const parsed = productSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  const { variants, id, ...d } = parsed.data;
  const slug = slugify(d.slug || `${(await prisma.brand.findUnique({ where: { id: d.brandId } }))?.name ?? ""} ${d.name}`);
  const clash = await prisma.product.findFirst({ where: { slug, NOT: id ? { id } : undefined } });
  if (clash) return { ok: false, error: `The URL “${slug}” is already used by another product.` };
  const skus = variants.map((v) => v.sku.trim().toUpperCase());
  if (new Set(skus).size !== skus.length) return { ok: false, error: "Each variant needs a unique SKU." };
  const skuClash = await prisma.variant.findFirst({ where: { sku: { in: skus }, NOT: id ? { productId: id } : undefined } });
  if (skuClash) return { ok: false, error: `SKU ${skuClash.sku} is already in use.` };

  try {
    const productId = await prisma.$transaction(async (tx) => {
      const data = { ...d, slug, gender: d.gender || null };
      const product = id ? await tx.product.update({ where: { id }, data }) : await tx.product.create({ data });
      const existing = await tx.variant.findMany({ where: { productId: product.id }, include: { _count: { select: { orderItems: true } } } });
      const keep = variants.filter((v) => v.id).map((v) => v.id);
      for (const ex of existing.filter((e) => !keep.includes(e.id))) {
        if (ex._count.orderItems > 0) throw new Error(`Variant ${ex.name} has orders and can't be deleted. Set its stock to 0 instead.`);
        await tx.variant.delete({ where: { id: ex.id } });
      }
      for (const [i, v] of variants.entries()) {
        const vd = { name: v.name, sku: v.sku.trim().toUpperCase(), price: v.price, salePrice: v.salePrice || null, costPrice: v.costPrice, reorderLevel: v.reorderLevel, leadTimeDays: v.leadTimeDays, sortOrder: i };
        if (v.id) {
          const prev = existing.find((e) => e.id === v.id)!;
          await tx.variant.update({ where: { id: v.id }, data: { ...vd, stock: v.stock } });
          // a manual stock change is recorded as an adjustment batch so batch totals stay in sync
          if (v.stock !== prev.stock) await adjustBatches(tx, v.id, v.stock - prev.stock, v.costPrice);
        } else {
          const nv = await tx.variant.create({ data: { ...vd, productId: product.id, stock: v.stock } });
          if (v.stock > 0) await adjustBatches(tx, nv.id, v.stock, v.costPrice);
        }
      }
      return product.id;
    });
    revalidatePath("/admin/products");
    revalidatePath("/", "layout");
    return { ok: true, id: productId };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Could not save" };
  }
}

type Tx = Parameters<Parameters<typeof prisma.$transaction>[0]>[0];
async function adjustBatches(tx: Tx, variantId: string, delta: number, unitCost: number) {
  if (delta > 0) {
    await tx.batch.create({ data: { variantId, batchNumber: `ADJ-${Date.now().toString().slice(-6)}`, quantity: delta, remaining: delta, unitCost, expiryDate: new Date(Date.now() + 365 * 86_400_000), importRef: "Manual adjustment" } });
  } else {
    let need = -delta;
    const batches = await tx.batch.findMany({ where: { variantId, remaining: { gt: 0 } }, orderBy: { expiryDate: "asc" } });
    for (const b of batches) {
      if (need <= 0) break;
      const take = Math.min(need, b.remaining);
      await tx.batch.update({ where: { id: b.id }, data: { remaining: { decrement: take } } });
      need -= take;
    }
  }
}

export async function deleteProduct(id: string) {
  await requireStaff("products");
  const orders = await prisma.orderItem.count({ where: { variant: { productId: id } } });
  if (orders > 0) {
    await prisma.product.update({ where: { id }, data: { status: "ARCHIVED" } });
  } else {
    const imgs = await prisma.productImage.findMany({ where: { productId: id } });
    await Promise.all(imgs.map((i) => removeRemote(i.publicId)));
    await prisma.product.delete({ where: { id } });
  }
  revalidatePath("/admin/products");
  return { archived: orders > 0 };
}

export async function uploadProductImages(productId: string, form: FormData) {
  await requireStaff("products");
  const files = form.getAll("files").filter((f): f is File => f instanceof File && f.size > 0);
  const last = await prisma.productImage.findFirst({ where: { productId }, orderBy: { sortOrder: "desc" } });
  let order = (last?.sortOrder ?? -1) + 1;
  const product = await prisma.product.findUnique({ where: { id: productId }, include: { brand: true } });
  const saved = [];
  for (const f of files) {
    if (!f.type.startsWith("image/")) continue;
    if (f.size > 12 * 1024 * 1024) continue;
    const s = await storeImage(f, "products");
    saved.push(await prisma.productImage.create({ data: { productId, url: s.url, publicId: s.publicId, width: s.width, height: s.height, alt: `${product?.brand.name} ${product?.name}`, sortOrder: order++ } }));
  }
  revalidatePath(`/admin/products/${productId}`);
  return saved;
}

export async function reorderProductImages(productId: string, ids: string[]) {
  await requireStaff("products");
  await prisma.$transaction(ids.map((id, i) => prisma.productImage.update({ where: { id, productId }, data: { sortOrder: i } })));
  revalidatePath(`/p`, "layout");
}

export async function deleteProductImage(id: string) {
  await requireStaff("products");
  const img = await prisma.productImage.delete({ where: { id } });
  await removeRemote(img.publicId);
}

export async function updateImageAlt(id: string, alt: string) {
  await requireStaff("products");
  await prisma.productImage.update({ where: { id }, data: { alt } });
}
