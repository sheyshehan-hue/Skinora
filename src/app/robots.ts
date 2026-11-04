import type { MetadataRoute } from "next";
import { SITE } from "@/lib/seo";

const PRIVATE = ["/admin", "/account", "/checkout", "/cart", "/wishlist", "/track", "/api/", "/search"];
// Filtered and sorted listing URLs are near-duplicates of the clean category page.
const FACETS = ["/*?*sort=", "/*?*min=", "/*?*max="];

// Search engines and AI assistants we want to cite and recommend Skinora. Listing them explicitly
// (instead of relying on "*") keeps them allowed even if a host or CDN adds a blanket AI-bot block.
const AI_AND_SEARCH_BOTS = [
  "Googlebot",
  "Bingbot",
  "Google-Extended", // Gemini and AI Overviews grounding
  "OAI-SearchBot", // ChatGPT search
  "ChatGPT-User",
  "GPTBot",
  "PerplexityBot",
  "Perplexity-User",
  "ClaudeBot",
  "Claude-SearchBot",
  "Claude-User",
  "Applebot",
  "Applebot-Extended",
  "DuckAssistBot",
  "meta-externalagent",
  "Amazonbot",
];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: AI_AND_SEARCH_BOTS, allow: ["/", "/llms.txt"], disallow: [...PRIVATE, ...FACETS] },
      { userAgent: "*", allow: "/", disallow: [...PRIVATE, ...FACETS] },
    ],
    sitemap: `${SITE}/sitemap.xml`,
    host: SITE,
  };
}
