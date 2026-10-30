import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import * as z from "zod/v4";
import sharp from "sharp";
import { METRICS, SKIN_TYPES, CONCERNS, type SkinResult, type MetricKey } from "./skin-metrics";

const MODEL = "claude-opus-5-5";

const score = z.number().int().min(0).max(100);
const AnalysisSchema = z.object({
  usable: z.boolean().describe("false if there is no clear, front-facing human face, or the photo is too dark, blurry or filtered to judge skin"),
  retakeTip: z.string().describe("If not usable, one short sentence on how to retake the photo. Otherwise empty."),
  skinType: z.enum(SKIN_TYPES),
  concerns: z.array(z.enum(CONCERNS)).describe("The one to three concerns that would most improve this skin, most important first"),
  scores: z.object(Object.fromEntries(METRICS.map((m) => [m.key, score])) as Record<MetricKey, typeof score>),
  summary: z.string().describe("Two warm, plain-English sentences addressed to the customer about what you see and what to focus on. No medical diagnosis."),
});

const SYSTEM = `You are Skinora's skin analyst. Skinora is a luxury skincare store in Sri Lanka, so most customers have South Asian skin tones (Fitzpatrick III-VI) and live in heat and humidity.
Look at the selfie and score each metric from 0 to 100, where 100 is the healthiest-looking result and 50 is typical for the customer's age:
${METRICS.map((m) => `- ${m.key}: ${m.prompt}`).join("\n")}
Judge only what is visible. Do not mistake natural melanin, under-eye shadow from lighting, or makeup for a skin problem. Do not guess age, ethnicity or gender, and never name a medical condition; if something looks like it needs a dermatologist, say "worth showing a dermatologist" in the summary.`;

/** Shrinks and normalises the upload. The original photo is never written to disk or the database. */
export async function prepareSelfie(buf: Buffer) {
  return sharp(buf).rotate().resize(896, 896, { fit: "inside", withoutEnlargement: true }).jpeg({ quality: 85 }).toBuffer();
}

export function aiEnabled() {
  return Boolean(process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_AUTH_TOKEN);
}

export async function analyseSelfie(jpeg: Buffer): Promise<SkinResult | { error: string }> {
  if (!aiEnabled()) return estimateOnServer(jpeg);
  const client = new Anthropic();
  const res = await client.beta.messages.parse({
    model: MODEL,
    max_tokens: 4000,
    // If the model declines, the API retries on a fallback model it picks by refusal type
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    output_config: { effort: "low", format: betaZodOutputFormat(AnalysisSchema) },
    system: SYSTEM,
    messages: [
      {
        role: "user",
        content: [
          { type: "image", source: { type: "base64", media_type: "image/jpeg", data: jpeg.toString("base64") } },
          { type: "text", text: "Analyse my skin." },
        ],
      },
    ],
  });
  if (res.stop_reason === "refusal" || !res.parsed_output) return { error: "We couldn't read this photo. Please try another one." };
  const a = res.parsed_output;
  if (!a.usable) return { error: a.retakeTip || "Please retake the photo facing a window, without filters." };
  return { engine: "claude", skinType: a.skinType, concerns: a.concerns.slice(0, 3), scores: a.scores, overall: overallOf(a.scores), summary: a.summary };
}

export function overallOf(scores: Record<MetricKey, number>) {
  return Math.round(METRICS.reduce((s, m) => s + scores[m.key], 0) / METRICS.length);
}

/**
 * Demo mode, used when no Anthropic key is set: a rough reading of colour and shine from the
 * centre of the photo. Good enough to try the flow; it is not a real skin analysis.
 */
async function estimateOnServer(jpeg: Buffer): Promise<SkinResult> {
  const { data, info } = await sharp(jpeg).resize(160, 160, { fit: "cover", position: "attention" }).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  let red = 0, shine = 0, lum = 0, lum2 = 0, n = 0;
  for (let y = Math.floor(info.height * 0.2); y < info.height * 0.8; y++) {
    for (let x = Math.floor(info.width * 0.25); x < info.width * 0.75; x++) {
      const i = (y * info.width + x) * 3;
      const [r, g, b] = [data[i], data[i + 1], data[i + 2]];
      const l = 0.299 * r + 0.587 * g + 0.114 * b;
      red += (r - g) / 255;
      if (l > 225) shine++;
      lum += l;
      lum2 += l * l;
      n++;
    }
  }
  const mean = lum / n;
  const spread = Math.sqrt(Math.max(0, lum2 / n - mean * mean));
  const shineRatio = shine / n;
  const clamp = (v: number) => Math.max(20, Math.min(95, Math.round(v)));
  const scores: Record<MetricKey, number> = {
    hydration: clamp(78 - shineRatio * 120 - spread * 0.2),
    oilBalance: clamp(88 - shineRatio * 400),
    pores: clamp(80 - spread * 0.35),
    clarity: clamp(82 - spread * 0.3),
    redness: clamp(95 - Math.max(0, red / n - 0.12) * 260),
    evenTone: clamp(90 - spread * 0.45),
    texture: clamp(84 - spread * 0.3),
    fineLines: clamp(76 - spread * 0.15),
  };
  const ranked = [...METRICS].sort((a, b) => scores[a.key] - scores[b.key]).slice(0, 3).map((m) => m.concern);
  const skinType = scores.oilBalance < 55 ? "oily" : scores.hydration < 55 ? "dry" : scores.redness < 60 ? "sensitive" : "combination";
  return {
    engine: "device",
    skinType,
    concerns: [...new Set(ranked)],
    scores,
    overall: overallOf(scores),
    summary: "This is a demo estimate based on the colour and shine in your photo. Answer the next few questions and we'll fine-tune your routine.",
  };
}
