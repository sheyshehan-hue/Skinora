import { prisma } from "@/lib/prisma";
import { productCardInclude, toCard } from "@/lib/catalog";
import { SkinQuiz } from "@/components/store/SkinQuiz";

export const metadata = { title: "Skin Quiz", description: "Answer five questions and get a personalised morning and evening skincare routine, built for Sri Lanka's climate." };

export default async function QuizPage() {
  const products = await prisma.product.findMany({
    where: { status: "ACTIVE", category: { parent: { slug: "skin-care" } } },
    include: { ...productCardInclude, category: { select: { slug: true } } },
  });
  const candidates = products.map((p) => ({ ...toCard(p), category: p.category.slug, skinTypes: p.skinTypes, concerns: p.concerns, keyIngredients: p.keyIngredients, luxury: p.isLuxury }));
  return <SkinQuiz candidates={candidates} />;
}
