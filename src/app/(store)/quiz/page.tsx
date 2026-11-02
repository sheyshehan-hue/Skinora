import { prisma } from "@/lib/prisma";
import { productCardInclude, toCard } from "@/lib/catalog";
import { SkinQuiz } from "@/components/store/SkinQuiz";

export const metadata = { title: "Skin Quiz & AI Skin Analysis", description: "Scan your skin with a selfie or answer five questions, and get a personalised morning and evening skincare routine built for Sri Lanka's climate." };

// Products for the face scan's "Shop the look" (women and men). Missing ones are skipped.
const FACE_SHOP = [
  "mount-lai-rose-quartz-gua-sha-facial-lifting-tool", "glow-recipe-watermelon-glow-niacinamide-dew-drops", "laneige-lip-sleeping-mask-berry",
  "la-roche-posay-anthelios-uvmune-400-invisible-fluid-spf50", "cerave-foaming-cleanser", "la-roche-posay-cicaplast-baume-b5",
  "the-ordinary-niacinamide-10-zinc-1", "dior-sauvage-eau-de-toilette",
];

export default async function QuizPage({ searchParams }: { searchParams: Promise<{ scan?: string; face?: string; my?: string }> }) {
  const { scan, face, my } = await searchParams;
  const shop = await prisma.product.findMany({
    where: { status: "ACTIVE", slug: { in: FACE_SHOP } },
    include: { brand: { select: { name: true } }, images: { orderBy: { sortOrder: "asc" }, take: 1 }, variants: { orderBy: { sortOrder: "asc" } } },
  });
  const faceProducts = shop.map((p) => ({
    id: p.id, slug: p.slug, brand: p.brand.name, name: p.name, image: p.images[0]?.url ?? "/placeholder.svg",
    variants: p.variants.map((v) => ({ id: v.id, name: v.name, price: v.salePrice ?? v.price, compareAt: v.salePrice ? v.price : null, stock: v.stock })),
  }));
  const products = await prisma.product.findMany({
    where: { status: "ACTIVE", category: { parent: { slug: "skin-care" } } },
    include: { ...productCardInclude, category: { select: { slug: true } } },
  });
  const candidates = products.map((p) => ({ ...toCard(p), category: p.category.slug, skinTypes: p.skinTypes, concerns: p.concerns, keyIngredients: p.keyIngredients, luxury: p.isLuxury }));
  return <SkinQuiz candidates={candidates} startWithScan={scan === "1"} startWithFace={face === "1"} showSavedFace={my === "1"} faceProducts={faceProducts} />;
}
