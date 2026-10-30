"use server";
import { prisma } from "@/lib/prisma";
import { getCustomerSession } from "@/lib/auth";
import { analyseSelfie, prepareSelfie } from "@/lib/skin-analysis";
import type { SkinResult } from "@/lib/skin-metrics";

export type ScanState =
  | { ok: true; result: SkinResult; previous: { overall: number; createdAt: string } | null; saved: boolean }
  | { ok: false; error: string };

const MAX_BYTES = 8 * 1024 * 1024;

export async function analyseSkin(form: FormData): Promise<ScanState> {
  const file = form.get("photo");
  if (!(file instanceof File) || file.size === 0) return { ok: false, error: "Please take or choose a photo first." };
  if (file.size > MAX_BYTES) return { ok: false, error: "That photo is too large. Please use one under 8 MB." };
  if (form.get("consent") !== "yes") return { ok: false, error: "Please agree to the photo terms to continue." };

  let jpeg: Buffer;
  try {
    jpeg = await prepareSelfie(Buffer.from(await file.arrayBuffer()));
  } catch {
    return { ok: false, error: "We couldn't open that file. Please use a JPG or PNG photo." };
  }

  let result: SkinResult | { error: string };
  try {
    result = await analyseSelfie(jpeg);
  } catch (e) {
    console.error("Skin analysis failed", e);
    return { ok: false, error: "Our skin analyst is busy right now. Please try again in a minute." };
  }
  if ("error" in result) return { ok: false, error: result.error };

  const session = await getCustomerSession();
  if (!session) return { ok: true, result, previous: null, saved: false };

  const previous = await prisma.skinScan.findFirst({ where: { customerId: session.id }, orderBy: { createdAt: "desc" }, select: { overall: true, createdAt: true } });
  await prisma.$transaction([
    prisma.skinScan.create({ data: { customerId: session.id, engine: result.engine, skinType: result.skinType, concerns: result.concerns, scores: result.scores, overall: result.overall, summary: result.summary } }),
    prisma.customer.update({ where: { id: session.id }, data: { skinType: result.skinType } }),
  ]);
  return { ok: true, result, previous: previous && { overall: previous.overall, createdAt: previous.createdAt.toISOString() }, saved: true };
}
