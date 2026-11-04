export const revalidate = 3600;
import type { MetadataRoute } from "next";
import { prisma } from "@/lib/prisma";
import { GUIDES } from "@/lib/guides";
import { abs, languageAlternates } from "@/lib/seo";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [products, categories, brands, collections] = await Promise.all([
    prisma.product.findMany({ where: { status: "ACTIVE" }, select: { slug: true, updatedAt: true, images: { orderBy: { sortOrder: "asc" }, take: 3, select: { url: true } } } }),
    prisma.category.findMany({ select: { slug: true } }),
    prisma.brand.findMany({ select: { slug: true } }),
    prisma.collection.findMany({ select: { slug: true } }),
  ]);
  const now = new Date();
  const entry = (path: string, priority: number, changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"] = "weekly", lastModified: Date = now) => ({
    url: abs(path),
    lastModified,
    changeFrequency,
    priority,
    alternates: { languages: languageAlternates(path) },
  });
  return [
    entry("/", 1, "daily"),
    entry("/men", 0.9, "daily"),
    entry("/women", 0.9, "daily"),
    ...["/brands", "/offers", "/quiz", "/delivery", "/authenticity", "/faq", "/guides"].map((p) => entry(p, 0.6)),
    ...GUIDES.map((g) => entry(`/guides/${g.slug}`, 0.7, "monthly", new Date(g.updated))),
    ...categories.map((c) => entry(`/c/${c.slug}`, 0.8, "daily")),
    ...brands.map((b) => entry(`/brands/${b.slug}`, 0.6)),
    ...collections.map((c) => entry(`/collections/${c.slug}`, 0.7)),
    ...products.map((p) => ({ ...entry(`/p/${p.slug}`, 0.9, "weekly", p.updatedAt), images: p.images.map((i) => abs(i.url)) })),
  ];
}
