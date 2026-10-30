// AI search: turns a plain-words request into product picks from the Skinora catalogue.
// Without ANTHROPIC_API_KEY this answers 501 and the page uses its built-in rules instead.
import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import * as z from "zod/v4";
import CATALOG from "./_catalog.mjs";

const MODEL = "claude-haiku-5-5"; // fast enough to answer while the customer is typing
const SLUGS = CATALOG.map((p) => p.slug);

const Picks = z.object({
  summary: z.string().describe("One short sentence in very simple English that says what you picked, e.g. 'Our picks for pimples, all under LKR 10,000.' If nothing fits, say so and suggest what to change."),
  picks: z.array(z.object({
    slug: z.enum(SLUGS),
    reason: z.string().describe("Why it fits, in 4 to 9 simple words, e.g. 'Clears pimples, gentle for oily skin'"),
  })).max(6).describe("Best matches first. Only products that truly fit every part of the request, including the budget. Prefer in-stock sizes."),
});

const SYSTEM = `You are the shopping search for Skinora, an authentic luxury skincare and fragrance store in Sri Lanka. Prices are in LKR.
Pick the products from the catalogue below that best fit the customer's request. Respect budgets strictly (a product fits if any in-stock size is within budget). For "like X" requests, match scent family, mood and notes for fragrances, or purpose and ingredients for skincare, and never return X itself. For gifts, think about who it is for. Never invent products. Never make medical claims. During pregnancy, avoid retinol and salicylic acid.
Catalogue (JSON):
${JSON.stringify(CATALOG)}`;

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "POST only" });
  if (!process.env.ANTHROPIC_API_KEY) return res.status(501).json({ error: "AI search is not switched on" });
  const q = String((req.body || {}).q || "").trim().slice(0, 200);
  if (q.length < 3) return res.status(400).json({ error: "Type a little more" });
  try {
    const out = await new Anthropic().beta.messages.parse({
      model: MODEL,
      max_tokens: 1500,
      output_config: { format: betaZodOutputFormat(Picks) },
      // The catalogue is the same for every search, so cache it
      system: [{ type: "text", text: SYSTEM, cache_control: { type: "ephemeral" } }],
      messages: [{ role: "user", content: q }],
    });
    if (!out.parsed_output) return res.status(502).json({ error: "No answer" });
    res.setHeader("Cache-Control", "s-maxage=3600");
    return res.status(200).json(out.parsed_output);
  } catch (e) {
    console.error("AI search failed", e);
    return res.status(503).json({ error: "AI search is busy" });
  }
}
