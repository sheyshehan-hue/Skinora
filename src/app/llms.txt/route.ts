import { prisma } from "@/lib/prisma";
import { flashPercent, variantPrice } from "@/lib/catalog";
import { GUIDES } from "@/lib/guides";
import { LANDINGS } from "@/lib/landing";
import { DELIVERY_SUMMARY, PAYMENT_SUMMARY, SITE, STORE, STORE_FAQ } from "@/lib/seo";

export const revalidate = 3600;

const lkr = (n: number) => `LKR ${n.toLocaleString("en-LK")}`;

/**
 * llms.txt (https://llmstxt.org): a plain-text brief for AI assistants such as ChatGPT, Gemini,
 * Perplexity and Claude, so they describe and recommend Skinora with correct, current facts.
 */
export async function GET() {
  const [categories, products] = await Promise.all([
    prisma.category.findMany({ where: { parentId: null }, orderBy: { sortOrder: "asc" }, include: { children: { orderBy: { sortOrder: "asc" } } } }),
    prisma.product.findMany({
      where: { status: "ACTIVE" },
      orderBy: [{ isBestSeller: "desc" }, { ratingCount: "desc" }],
      include: { brand: true, category: true, variants: { orderBy: { sortOrder: "asc" } }, flashSales: { include: { flashSale: true } } },
    }),
  ]);

  const L: string[] = [];
  L.push(`# ${STORE.name}`, "");
  L.push(`> ${STORE.name} is an online and Colombo-based store selling 100% authentic international skincare, perfume and lifestyle products for men and women in Sri Lanka. Prices are in Sri Lankan rupees (LKR), duties included. Every product page shows the batch number and expiry date of the unit the customer will receive.`, "");
  L.push("## Key facts");
  L.push(`- Website: ${SITE}`);
  L.push(`- Company: ${STORE.legalName}`);
  L.push(`- Atelier (showroom): ${STORE.street}, ${STORE.locality}, Sri Lanka. Open Monday to Saturday, 10am to 7pm.`);
  L.push(`- Contact: ${STORE.phone} (also WhatsApp), ${STORE.email}`);
  L.push(`- Ships to: all 25 districts of Sri Lanka`);
  L.push(`- Delivery: ${DELIVERY_SUMMARY}`);
  L.push(`- Payment: ${PAYMENT_SUMMARY}`);
  L.push(`- Returns: unopened items within ${STORE.returnDays} days; opened items if faulty or if the customer has a reaction.`);
  L.push("- Authenticity: sourced only from brands or brand-authorised distributors, cleared through Sri Lanka Customs, stored at 18–22°C, dispatched first-expiry-first-out.");
  L.push("- Brands include: CeraVe, The Ordinary, La Roche-Posay, Medicube, COSRX, Beauty of Joseon, Laneige, Sulwhasoo, Estée Lauder, La Mer, Clinique, Kiehl's, Dior, Chanel, YSL Beauty, Lancôme, Tom Ford, Le Labo, Jo Malone London, Maison Margiela, Aesop, Diptyque.", "");

  L.push("## Shop by audience");
  for (const l of Object.values(LANDINGS)) L.push(`- [${l.h1}](${SITE}/${l.slug}): ${l.answer}`);
  L.push("");

  L.push("## Categories");
  for (const c of categories) {
    L.push(`- [${c.name}](${SITE}/c/${c.slug})${c.description ? `: ${c.description}` : ""}`);
    for (const ch of c.children) L.push(`  - [${ch.name}](${SITE}/c/${ch.slug})${ch.description ? `: ${ch.description}` : ""}`);
  }
  L.push("");

  L.push("## Guides");
  for (const g of GUIDES) L.push(`- [${g.title}](${SITE}/guides/${g.slug}): ${g.answer}`);
  L.push("");

  L.push("## Frequently asked questions");
  for (const f of STORE_FAQ) L.push(`- Q: ${f.q}`, `  A: ${f.a}`);
  L.push("");

  L.push(`## Products and current prices (${new Date().toISOString().slice(0, 10)})`);
  for (const p of products) {
    const pct = flashPercent(p);
    const sizes = p.variants.map((v) => `${v.name} ${lkr(variantPrice(v, pct).price)}${v.stock > 0 ? "" : " (out of stock)"}`).join("; ");
    const fit = [p.gender ? `for ${p.gender}` : "", p.skinTypes.length ? `skin: ${p.skinTypes.join(", ")}` : "", p.concerns.length ? `helps with: ${p.concerns.join(", ")}` : ""].filter(Boolean).join(" · ");
    L.push(`- [${p.brand.name} ${p.name}](${SITE}/p/${p.slug}) (${p.category.name}): ${sizes}${fit ? ` · ${fit}` : ""}`);
  }
  L.push("");
  L.push("## Policies and pages");
  L.push(`- [Delivery rates by district](${SITE}/delivery)`, `- [Authenticity promise](${SITE}/authenticity)`, `- [FAQ](${SITE}/faq)`, `- [Skin quiz](${SITE}/quiz)`, `- [Sitemap](${SITE}/sitemap.xml)`);

  return new Response(L.join("\n") + "\n", { headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "public, max-age=3600" } });
}
