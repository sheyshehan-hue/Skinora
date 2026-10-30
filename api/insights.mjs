// Stock and pricing helper for Admin: answers a question about stock using the forecast the page sends.
// Without ANTHROPIC_API_KEY this answers 501 and the page uses its built-in rules instead.
import Anthropic from "@anthropic-ai/sdk";

const MODEL = "claude-opus-5-5";

const SYSTEM = `You help the owner of Skinora, an authentic luxury skincare and fragrance store in Sri Lanka, run stock and pricing. Prices are in LKR.
You get a question and a table of every product size: price, stock, estimated sales per day, expected sales in the next 60 days (Sri Lankan shopping seasons already included), days of stock left, days until the batch expires, the suggested order quantity, status and whether it is discounted.
Answer in very simple English, in plain text with short bullet points starting with "•". Name exact products and sizes, with numbers. Keep it under 150 words. Think about supplier lead time, upcoming events, batch expiry and margin: never suggest discounting fast sellers that are low on stock, and suggest offers or bundles for stock that will not sell before it expires. If the data cannot answer the question, say what is missing.`;

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "POST only" });
  if (!process.env.ANTHROPIC_API_KEY) return res.status(501).json({ error: "AI helper is not switched on" });
  const { q, today, nextEvent, leadTimeDays, rows } = req.body || {};
  if (!q || !Array.isArray(rows)) return res.status(400).json({ error: "Missing question or data" });
  try {
    const out = await new Anthropic().messages.create({
      model: MODEL,
      max_tokens: 2000,
      output_config: { effort: "low" },
      system: SYSTEM,
      messages: [{ role: "user", content: `Today: ${today}. Next event: ${nextEvent}. Supplier lead time: ${leadTimeDays} days.\nStock table (JSON):\n${JSON.stringify(rows.slice(0, 200))}\n\nQuestion: ${String(q).slice(0, 300)}` }],
    });
    const answer = out.content.filter((b) => b.type === "text").map((b) => b.text).join("\n").trim();
    if (!answer) return res.status(502).json({ error: "No answer" });
    return res.status(200).json({ answer });
  } catch (e) {
    console.error("Insights failed", e);
    return res.status(503).json({ error: "AI helper is busy" });
  }
}
