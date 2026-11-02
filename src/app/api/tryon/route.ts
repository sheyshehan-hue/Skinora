// AI try-on: puts one suggested haircut or beard on the customer's selfie, using Google Gemini.
// Needs GEMINI_API_KEY. Optional GEMINI_IMAGE_MODEL (default gemini-2.5-flash-image).
// The selfie goes to Gemini only to make the picture. Nothing is stored here.
import { NextResponse } from "next/server";
import STYLES from "@/lib/tryon-styles.json";

export const runtime = "nodejs";
export const maxDuration = 60;

type Style = { n: string; ask: string };
const MAX_IMAGE = 1_800_000; // base64 characters, about 1.3 MB
const TEXTURE: Record<string, string> = { s: "straight", w: "wavy", c: "curly", k: "coily" };

function prompt(st: Style, kind: "cut" | "beard", texture: string) {
  if (kind === "beard") {
    return `Edit this photo of a man. Change only his facial hair to this beard style: ${st.n}. How it is cut: ${st.ask} ` +
      "Keep the hair on his head, his face, identity, facial features, skin tone, expression, clothing, background, lighting and camera angle exactly the same. " +
      "The result must look like a real, natural photo of the same person, not a drawing.";
  }
  return `Edit this photo. Give the person this haircut: ${st.n}. How it is cut: ${st.ask}` +
    (texture ? ` Their natural hair texture is ${texture}.` : "") +
    " Change only the hair on the head. Keep the face, identity, facial features, skin tone, makeup, facial hair, expression, clothing, background, lighting and camera angle exactly the same. " +
    "Keep the person's own hair colour. The result must look like a real, natural photo of the same person taken right after a salon visit, not a drawing.";
}

const fail = (status: number, error: string) => NextResponse.json({ error }, { status, headers: { "Cache-Control": "no-store" } });

export async function POST(req: Request) {
  const key = process.env.GEMINI_API_KEY;
  if (!key) return fail(503, "The try-on is not switched on yet.");
  const body = (await req.json().catch(() => null)) as { image?: unknown; id?: unknown; kind?: unknown; texture?: unknown } | null;
  if (!body || typeof body.image !== "string" || typeof body.id !== "string") return fail(400, "Missing photo or style.");
  const kind = body.kind === "beard" ? "beard" : "cut";
  const list = (kind === "beard" ? STYLES.beards : STYLES.cuts) as Record<string, Style>;
  const st = Object.prototype.hasOwnProperty.call(list, body.id) ? list[body.id] : undefined;
  if (!st) return fail(400, "Unknown style.");
  const image = body.image.replace(/^data:image\/[a-z]+;base64,/, "");
  if (image.length > MAX_IMAGE || !/^[A-Za-z0-9+/=]+$/.test(image)) return fail(400, "That photo is too large.");
  const texture = typeof body.texture === "string" ? TEXTURE[body.texture] ?? "" : "";
  const model = process.env.GEMINI_IMAGE_MODEL || "gemini-2.5-flash-image";
  try {
    const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": key },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ inlineData: { mimeType: "image/jpeg", data: image } }, { text: prompt(st, kind, texture) }] }],
        generationConfig: { responseModalities: ["TEXT", "IMAGE"] },
      }),
    });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) {
      console.error("tryon gemini", r.status, JSON.stringify(j).slice(0, 500));
      return fail(502, "The AI could not make this picture. Please try again.");
    }
    type Part = { inlineData?: { mimeType?: string; data?: string } };
    const parts: Part[] = j?.candidates?.[0]?.content?.parts ?? [];
    const img = parts.find((p) => p.inlineData?.data);
    if (!img?.inlineData?.data) {
      console.error("tryon no image", JSON.stringify(j).slice(0, 500));
      return fail(502, "The AI could not make this picture. Try a clearer, front-facing selfie.");
    }
    return NextResponse.json({ image: `data:${img.inlineData.mimeType || "image/png"};base64,${img.inlineData.data}` }, { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    console.error("tryon", e);
    return fail(502, "The AI could not make this picture. Please try again.");
  }
}
