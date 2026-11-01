// Ingredient checker: reads a product name or a photo of the label and returns its key active ingredients.
// The browser does the clash check itself; this only fills in products from other shops when the
// customer gives a name without an ingredient list, or a photo. The photo is never stored.
// Without ANTHROPIC_API_KEY this answers 501 and the page asks the customer to paste the ingredients.
import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import * as z from "zod/v4";

const MODEL = "claude-haiku-5-5";
// Keys must match ACTIVES in layers/clash/clash-engine.js
const ACTIVES = {
  retinoid: "retinol, retinal, retinyl esters, hydroxypinacolone retinoate, tretinoin, adapalene, tazarotene",
  aha: "glycolic, lactic, mandelic, malic or tartaric acid",
  bha: "salicylic acid, betaine salicylate, LHA",
  pha: "gluconolactone, lactobionic acid",
  vitc: "ascorbic acid or any vitamin C derivative",
  bpo: "benzoyl peroxide",
  azelaic: "azelaic acid",
  niacinamide: "niacinamide",
  copper: "copper peptides (GHK-Cu)",
  hydroquinone: "hydroquinone",
  spf: "UV filters / SPF",
  soother: "ceramides, panthenol, centella, allantoin, squalane, snail mucin",
  hydrator: "hyaluronic acid, sodium hyaluronate, glycerin",
  fragrance: "parfum, fragrance or essential oils",
};
const TYPES = ["cleansers", "toners-essences", "serums", "masks-treatments", "moisturisers", "sunscreen"];

const Product = z.object({
  found: z.boolean().describe("false if you cannot tell what the product is, or the photo shows no skincare label"),
  brand: z.string().describe("Brand name, or empty if unknown"),
  name: z.string().describe("Product name without the brand, as on the pack"),
  type: z.enum(TYPES),
  actives: z.array(z.enum(Object.keys(ACTIVES))).describe("Every group that is clearly in the product. Only include what you are confident about."),
  ingredients: z.string().describe("For a photo: the ingredient list as printed, if readable. Otherwise empty."),
  note: z.string().describe("One short sentence in simple English if you are guessing from the name, e.g. 'We went by the usual formula. Paste the ingredient list to be sure.' Otherwise empty."),
});

const SYSTEM = `You help Skinora, a skincare store in Sri Lanka, check whether a customer's products clash.
Identify the skincare product from its name or a photo of its pack, then say which of these active ingredient groups it contains:
${Object.entries(ACTIVES).map(([k, v]) => `- ${k}: ${v}`).join("\n")}
For a photo, read the printed ingredient list when visible and base the answer on it. For a name only, use the product's well-known current formula; if you don't know the product, set found to false. Never guess wildly, and never give medical advice.`;

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "POST only" });
  if (!process.env.ANTHROPIC_API_KEY) return res.status(501).json({ error: "AI reading is not switched on" });
  const { name, image } = req.body || {};
  const hasImage = typeof image === "string" && image.length > 1000;
  if (hasImage && image.length > 4_000_000) return res.status(413).json({ error: "Photo is too big" });
  const text = String(name || "").trim().slice(0, 160);
  if (!hasImage && text.length < 3) return res.status(400).json({ error: "Type the product name" });
  try {
    const content = hasImage
      ? [{ type: "image", source: { type: "base64", media_type: "image/jpeg", data: image } }, { type: "text", text: "What is this product and what is in it?" }]
      : [{ type: "text", text: `Product: ${text}` }];
    const out = await new Anthropic().beta.messages.parse({
      model: MODEL,
      max_tokens: 2000,
      output_config: { format: betaZodOutputFormat(Product) },
      system: SYSTEM,
      messages: [{ role: "user", content }],
    });
    const p = out.parsed_output;
    if (!p || !p.found) return res.status(422).json({ error: "We couldn't tell which product this is." });
    return res.status(200).json({ name: p.name, brand: p.brand, type: p.type, actives: p.actives, ingredients: p.ingredients.slice(0, 4000), note: p.note });
  } catch (e) {
    console.error("Ingredient reading failed", e);
    return res.status(503).json({ error: "Busy, try again" });
  }
}
