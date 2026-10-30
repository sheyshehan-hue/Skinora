import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { flashPercent, variantPrice } from "@/lib/catalog";

export async function GET(req: Request) {
  const q = new URL(req.url).searchParams.get("q")?.trim() ?? "";
  if (q.length < 2) return NextResponse.json({ products: [], brands: [], categories: [] });
  const contains = { contains: q, mode: "insensitive" as const };
  const [products, brands, categories] = await Promise.all([
    prisma.product.findMany({
      where: { status: "ACTIVE", OR: [{ name: contains }, { brand: { name: contains } }, { tagline: contains }, { keyIngredients: { has: q.replace(/\b\w/g, (c) => c.toUpperCase()) } }, { ingredients: contains }] },
      take: 8,
      orderBy: [{ isBestSeller: "desc" }, { ratingCount: "desc" }],
      include: { brand: true, images: { orderBy: { sortOrder: "asc" }, take: 1 }, variants: { orderBy: { sortOrder: "asc" }, take: 1 }, flashSales: { include: { flashSale: true } } },
    }),
    prisma.brand.findMany({ where: { name: contains }, take: 4 }),
    prisma.category.findMany({ where: { name: contains }, take: 4 }),
  ]);
  return NextResponse.json({
    products: products.map((p) => ({ slug: p.slug, name: p.name, brand: p.brand.name, image: p.images[0]?.url, price: p.variants[0] ? variantPrice(p.variants[0], flashPercent(p)).price : 0 })),
    brands: brands.map((b) => ({ slug: b.slug, name: b.name })),
    categories: categories.map((c) => ({ slug: c.slug, name: c.name })),
  });
}
