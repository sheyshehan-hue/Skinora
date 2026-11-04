import "server-only";
import { cache } from "react";
import type { Prisma } from "@prisma/client";
import { prisma } from "./prisma";

export const productCardInclude = {
  brand: { select: { name: true, slug: true } },
  images: { orderBy: { sortOrder: "asc" }, take: 2 },
  variants: { orderBy: { sortOrder: "asc" }, select: { id: true, name: true, price: true, salePrice: true, stock: true, batches: { where: { remaining: { gt: 0 } }, orderBy: { expiryDate: "asc" }, take: 1, select: { batchNumber: true } } } },
  flashSales: { include: { flashSale: true } },
} satisfies Prisma.ProductInclude;

export type ProductCardData = Prisma.ProductGetPayload<{ include: typeof productCardInclude }>;

/** Active flash-sale percentage for a product, if any. */
export function flashPercent(p: { flashSales?: { flashSale: { active: boolean; startsAt: Date; endsAt: Date; discountPercent: number } }[] }) {
  const now = Date.now();
  const live = p.flashSales?.map((f) => f.flashSale).filter((f) => f.active && f.startsAt.getTime() <= now && f.endsAt.getTime() > now);
  return live?.length ? Math.max(...live.map((f) => f.discountPercent)) : 0;
}

/** Selling price of a variant including sale price and any live flash sale. */
export function variantPrice(v: { price: number; salePrice: number | null }, flashPct = 0) {
  const base = v.salePrice && v.salePrice < v.price ? v.salePrice : v.price;
  const flash = flashPct ? Math.round((v.price * (100 - flashPct)) / 100 / 10) * 10 : Infinity;
  const now = Math.min(base, flash);
  return { price: now, compareAt: now < v.price ? v.price : null };
}

export function toCard(p: ProductCardData) {
  const pct = flashPercent(p);
  const v = p.variants[0];
  const { price, compareAt } = v ? variantPrice(v, pct) : { price: 0, compareAt: null };
  const stock = p.variants.reduce((s, x) => s + x.stock, 0);
  return {
    id: p.id,
    slug: p.slug,
    name: p.name,
    brand: p.brand.name,
    tagline: p.tagline,
    origin: p.originCountry,
    batch: v?.batches[0]?.batchNumber ?? null,
    image: p.images[0]?.url ?? "/placeholder.svg",
    hoverImage: p.images[1]?.url ?? null,
    price,
    compareAt,
    multipleSizes: p.variants.length > 1,
    variantId: v?.id,
    variantName: v?.name,
    sizes: p.variants.length,
    fit: p.skinTypes[0] ? `For ${p.skinTypes[0]} skin` : p.concerns[0] ? `For ${p.concerns[0]}` : p.keyIngredients[0] ? `With ${p.keyIngredients[0]}` : null,
    variantStock: v?.stock ?? 0,
    stock,
    isNew: p.isNew,
    isBestSeller: p.isBestSeller,
    isLuxury: p.isLuxury,
    flashPct: pct,
    rating: p.ratingAvg,
    ratingCount: p.ratingCount,
  };
}
export type Card = ReturnType<typeof toCard>;

export const getNavCategories = cache(() =>
  prisma.category.findMany({ where: { parentId: null }, orderBy: { sortOrder: "asc" }, include: { children: { orderBy: { sortOrder: "asc" } } } }),
);

export type ListingFilters = {
  category?: string; // slug (parent or child)
  brand?: string[];
  skin?: string[];
  concern?: string[];
  ingredient?: string[];
  gender?: string;
  min?: number;
  max?: number;
  sort?: string;
  q?: string;
  luxury?: boolean;
  onSale?: boolean;
  isNew?: boolean;
};

export async function listProducts(f: ListingFilters) {
  const where: Prisma.ProductWhereInput = { status: "ACTIVE" };
  const and: Prisma.ProductWhereInput[] = [];
  if (f.category) {
    const cat = await prisma.category.findUnique({ where: { slug: f.category }, include: { children: true } });
    if (cat) {
      const ids = [cat.id, ...cat.children.map((c) => c.id)];
      and.push(cat.slug === "luxury" ? { OR: [{ isLuxury: true }, { categoryId: { in: ids } }] } : { categoryId: { in: ids } });
    }
  }
  if (f.brand?.length) and.push({ brand: { slug: { in: f.brand } } });
  if (f.skin?.length) and.push({ skinTypes: { hasSome: f.skin } });
  if (f.concern?.length) and.push({ concerns: { hasSome: f.concern } });
  if (f.ingredient?.length) and.push({ keyIngredients: { hasSome: f.ingredient } });
  if (f.gender) and.push({ gender: f.gender });
  if (f.luxury) and.push({ isLuxury: true });
  if (f.isNew) and.push({ isNew: true });
  if (f.min || f.max) and.push({ variants: { some: { price: { gte: f.min ?? 0, lte: f.max ?? 10_000_000 } } } });
  if (f.onSale) and.push({ OR: [{ variants: { some: { salePrice: { not: null } } } }, { flashSales: { some: { flashSale: { active: true, endsAt: { gt: new Date() }, startsAt: { lte: new Date() } } } } }] });
  if (f.q) {
    const q = f.q.trim();
    and.push({
      OR: [
        { name: { contains: q, mode: "insensitive" } },
        { brand: { name: { contains: q, mode: "insensitive" } } },
        { tagline: { contains: q, mode: "insensitive" } },
        { ingredients: { contains: q, mode: "insensitive" } },
        { category: { name: { contains: q, mode: "insensitive" } } },
      ],
    });
  }
  if (and.length) where.AND = and;

  const orderBy: Prisma.ProductOrderByWithRelationInput[] =
    f.sort === "new" ? [{ createdAt: "desc" }, { isNew: "desc" }] : f.sort === "rating" ? [{ ratingAvg: "desc" }] : [{ isBestSeller: "desc" }, { ratingCount: "desc" }];

  const products = await prisma.product.findMany({ where, orderBy, include: productCardInclude });
  let cards = products.map(toCard);
  if (f.sort === "price-asc") cards = cards.sort((a, b) => a.price - b.price);
  if (f.sort === "price-desc") cards = cards.sort((a, b) => b.price - a.price);
  return cards;
}

/** Facet values for the filter sidebar, scoped to a category. */
export async function getFacets(categorySlug?: string) {
  let categoryIds: string[] | undefined;
  let luxury = false;
  if (categorySlug) {
    const cat = await prisma.category.findUnique({ where: { slug: categorySlug }, include: { children: true } });
    if (cat) {
      categoryIds = [cat.id, ...cat.children.map((c) => c.id)];
      luxury = cat.slug === "luxury";
    }
  }
  const products = await prisma.product.findMany({
    where: { status: "ACTIVE", ...(categoryIds ? (luxury ? { OR: [{ isLuxury: true }, { categoryId: { in: categoryIds } }] } : { categoryId: { in: categoryIds } }) : {}) },
    select: { brand: { select: { name: true, slug: true } }, skinTypes: true, concerns: true, keyIngredients: true, gender: true, variants: { select: { price: true } } },
  });
  const count = <T extends string>(arr: T[]) => {
    const m = new Map<T, number>();
    arr.forEach((x) => m.set(x, (m.get(x) ?? 0) + 1));
    return [...m.entries()].sort((a, b) => b[1] - a[1]);
  };
  const prices = products.flatMap((p) => p.variants.map((v) => v.price));
  return {
    brands: count(products.map((p) => `${p.brand.slug}|${p.brand.name}`)).map(([k, n]) => ({ slug: k.split("|")[0], name: k.split("|")[1], count: n })).sort((a, b) => a.name.localeCompare(b.name)),
    skinTypes: count(products.flatMap((p) => p.skinTypes)),
    concerns: count(products.flatMap((p) => p.concerns)),
    ingredients: count(products.flatMap((p) => p.keyIngredients)).slice(0, 14),
    genders: count(products.map((p) => p.gender).filter(Boolean) as string[]),
    priceMax: prices.length ? Math.max(...prices) : 0,
  };
}

/** Products most often purchased in the same order as this product. */
export async function frequentlyBoughtTogether(productId: string, limit = 3) {
  const rows = await prisma.$queryRaw<{ productId: string; n: bigint }[]>`
    SELECT v2."productId", COUNT(DISTINCT oi2."orderId") AS n
    FROM "OrderItem" oi1
    JOIN "Variant" v1 ON v1.id = oi1."variantId"
    JOIN "OrderItem" oi2 ON oi2."orderId" = oi1."orderId" AND oi2.id <> oi1.id
    JOIN "Variant" v2 ON v2.id = oi2."variantId"
    WHERE v1."productId" = ${productId} AND v2."productId" <> ${productId}
    GROUP BY v2."productId"
    ORDER BY n DESC
    LIMIT ${limit}`;
  if (!rows.length) return [];
  const products = await prisma.product.findMany({ where: { id: { in: rows.map((r) => r.productId) }, status: "ACTIVE" }, include: productCardInclude });
  return rows.map((r) => products.find((p) => p.id === r.productId)).filter(Boolean).map((p) => toCard(p!));
}

/** The batch that will ship next (first-expiry-first-out) for a variant. */
export async function nextBatch(variantId: string) {
  return prisma.batch.findFirst({ where: { variantId, remaining: { gt: 0 } }, orderBy: { expiryDate: "asc" }, include: { supplier: true } });
}

/** Active products by slug, returned in the order given. Unknown slugs are skipped. */
export async function productsBySlugs(slugs: string[]) {
  if (!slugs.length) return [];
  const rows = await prisma.product.findMany({ where: { slug: { in: slugs }, status: "ACTIVE" }, include: productCardInclude });
  return slugs.map((s) => rows.find((r) => r.slug === s)).filter(Boolean).map((p) => toCard(p!));
}
