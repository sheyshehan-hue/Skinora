export const revalidate = 3600;
import type { MetadataRoute } from "next";
import { prisma } from "@/lib/prisma";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const site = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const [products, categories, brands, collections] = await Promise.all([
    prisma.product.findMany({ where: { status: "ACTIVE" }, select: { slug: true, updatedAt: true } }),
    prisma.category.findMany({ select: { slug: true } }),
    prisma.brand.findMany({ select: { slug: true } }),
    prisma.collection.findMany({ select: { slug: true } }),
  ]);
  return [
    { url: site, changeFrequency: "daily", priority: 1 },
    ...["/brands", "/offers", "/quiz", "/delivery", "/authenticity"].map((p) => ({ url: `${site}${p}`, priority: 0.5 })),
    ...categories.map((c) => ({ url: `${site}/c/${c.slug}`, changeFrequency: "daily" as const, priority: 0.8 })),
    ...brands.map((b) => ({ url: `${site}/brands/${b.slug}`, priority: 0.6 })),
    ...collections.map((c) => ({ url: `${site}/collections/${c.slug}`, priority: 0.7 })),
    ...products.map((p) => ({ url: `${site}/p/${p.slug}`, lastModified: p.updatedAt, changeFrequency: "weekly" as const, priority: 0.9 })),
  ];
}
