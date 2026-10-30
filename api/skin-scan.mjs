// AI skin scan. The browser sends a downsized selfie; Claude scores it. The photo is never stored.
// Without ANTHROPIC_API_KEY this answers 501 and the page falls back to its demo estimate.
import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import * as z from "zod/v4";

const MODEL = "claude-opus-5-5";
const METRICS = [
  ["hydration", "plumpness and dewiness; low if skin looks tight, flaky or dehydrated"],
  ["oilBalance", "low if there is visible excess shine, especially on the T-zone"],
  ["pores", "low if pores are visibly enlarged or congested"],
  ["clarity", "low if there are active breakouts, blackheads or blemishes"],
  ["redness", "low if there is redness, flushing or visible irritation"],
  ["evenTone", "low if there are dark spots, post-acne marks or patchy pigmentation"],
  ["texture", "low if skin looks rough, uneven or dull"],
  ["fineLines", "low if there are visible fine lines, wrinkles or loss of firmness"],
];
const SKIN_TYPES = ["oily", "combination", "dry", "normal", "sensitive"];
const CONCERNS = ["acne", "pigmentation", "ageing", "dryness", "pores", "dullness", "redness"];

const score = z.number().int().min(0).max(100);
const Analysis = z.object({
  usable: z.boolean().describe("false if there is no clear, front-facing human face, or the photo is too dark, blurry or filtered to judge skin"),
  retakeTip: z.string().describe("If not usable, one short sentence in very simple English on how to retake the photo. Otherwise empty."),
  skinType: z.enum(SKIN_TYPES),
  concerns: z.array(z.enum(CONCERNS)).describe("The one to three concerns that would most improve this skin, most important first"),
  scores: z.object(Object.fromEntries(METRICS.map(([k]) => [k, score]))),
  summary: z.string().describe("Two short, warm sentences in very simple English, addressed to the customer: what you see and what to work on. No medical diagnosis."),
});

const SYSTEM = `You are Skinora's skin analyst. Skinora is a luxury skincare store in Sri Lanka, so most customers have South Asian skin tones (Fitzpatrick III-VI) and live in heat and humidity.
Look at the selfie and score each metric from 0 to 100, where 100 is the healthiest-looking result and 50 is typical for the customer's age:
${METRICS.map(([k, p]) => `- ${k}: ${p}`).join("\n")}
Judge only what is visible. Do not mistake natural melanin, under-eye shadow from lighting, or makeup for a skin problem. Do not guess age, ethnicity or gender, and never name a medical condition; if something looks like it needs a dermatologist, say "worth showing a skin doctor" in the summary.`;

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "POST only" });
  if (!process.env.ANTHROPIC_API_KEY) return res.status(501).json({ error: "AI scan is not switched on" });
  const { image, consent } = req.body || {};
  if (!consent) return res.status(422).json({ error: "Please agree to the photo terms first." });
  if (typeof image !== "string" || image.length < 1000 || image.length > 4_000_000) return res.status(422).json({ error: "Please take or choose a photo first." });

  try {
    const out = await new Anthropic().beta.messages.parse({
      model: MODEL,
      max_tokens: 4000,
      // If the model declines, the API retries on a fallback model it picks by refusal type
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      output_config: { effort: "low", format: betaZodOutputFormat(Analysis) },
      system: SYSTEM,
      messages: [{ role: "user", content: [
        { type: "image", source: { type: "base64", media_type: "image/jpeg", data: image } },
        { type: "text", text: "Analyse my skin." },
      ] }],
    });
    const a = out.parsed_output;
    if (out.stop_reason === "refusal" || !a) return res.status(422).json({ error: "We couldn't read this photo. Please try another one." });
    if (!a.usable) return res.status(422).json({ error: a.retakeTip || "Please take the photo again, facing a window, with no filters." });
    const overall = Math.round(METRICS.reduce((s, [k]) => s + a.scores[k], 0) / METRICS.length);
    return res.status(200).json({ result: { engine: "claude", skinType: a.skinType, concerns: a.concerns.slice(0, 3), scores: a.scores, overall, summary: a.summary } });
  } catch (e) {
    console.error("Skin analysis failed", e);
    return res.status(503).json({ error: "Our skin checker is busy. Please try again in a minute." });
  }
}
