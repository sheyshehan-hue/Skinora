import { Header } from "@/components/store/Header";
import { Footer } from "@/components/store/Footer";
import { WhatsAppButton } from "@/components/store/WhatsAppButton";
import { getNavCategories, productCardInclude, toCard } from "@/lib/catalog";
import { prisma } from "@/lib/prisma";

export default async function StoreLayout({ children }: { children: React.ReactNode }) {
  const [categories, announcement, popular] = await Promise.all([
    getNavCategories(),
    prisma.banner.findFirst({ where: { placement: "ANNOUNCEMENT", active: true }, orderBy: { sortOrder: "asc" } }),
    prisma.product.findMany({ where: { status: "ACTIVE", isBestSeller: true }, orderBy: { ratingCount: "desc" }, take: 12, include: productCardInclude }),
  ]);
  // small, single-size best sellers make easy one-tap additions in the bag
  const picks = popular.map(toCard).filter((c) => c.variantId && !c.multipleSizes && c.stock > 0 && c.price <= 12000).slice(0, 6);
  return (
    <>
      <Header categories={categories} announcement={announcement?.title} picks={picks} />
      <main className="min-h-[60vh]">{children}</main>
      <Footer />
      <WhatsAppButton number={process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ?? "94771234567"} />
    </>
  );
}
