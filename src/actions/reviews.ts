"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCustomerSession } from "@/lib/auth";

const schema = z.object({
  productId: z.string(),
  slug: z.string(),
  name: z.string().min(2).max(60),
  rating: z.coerce.number().int().min(1).max(5),
  title: z.string().max(80).optional(),
  body: z.string().min(10, "Please write at least a sentence.").max(2000),
  skinType: z.string().optional(),
});

export async function submitReview(_: unknown, form: FormData) {
  const parsed = schema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  const d = parsed.data;
  const session = await getCustomerSession();
  // Verified = this customer has a delivered order containing the product
  const verified = session
    ? (await prisma.orderItem.count({ where: { order: { customerId: session.id, status: "DELIVERED" }, variant: { productId: d.productId } } })) > 0
    : false;
  await prisma.review.create({ data: { productId: d.productId, customerId: session?.id, name: d.name, rating: d.rating, title: d.title, body: d.body, skinType: d.skinType || null, verified, approved: true } });
  const agg = await prisma.review.aggregate({ where: { productId: d.productId, approved: true }, _avg: { rating: true }, _count: true });
  await prisma.product.update({ where: { id: d.productId }, data: { ratingAvg: agg._avg.rating ?? 0, ratingCount: agg._count } });
  revalidatePath(`/p/${d.slug}`);
  return { ok: true, error: null };
}
