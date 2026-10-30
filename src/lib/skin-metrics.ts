// Shared by the skin scan (server) and its results screen (client).

export const SKIN_TYPES = ["oily", "combination", "dry", "normal", "sensitive"] as const;
export const CONCERNS = ["acne", "pigmentation", "ageing", "dryness", "pores", "dullness", "redness"] as const;

export const METRICS = [
  { key: "hydration", label: "Hydration", concern: "dryness", prompt: "plumpness and dewiness; low if skin looks tight, flaky or dehydrated" },
  { key: "oilBalance", label: "Oil balance", concern: "pores", prompt: "low if there is visible excess shine, especially on the T-zone" },
  { key: "pores", label: "Pores", concern: "pores", prompt: "low if pores are visibly enlarged or congested" },
  { key: "clarity", label: "Clarity", concern: "acne", prompt: "low if there are active breakouts, blackheads or blemishes" },
  { key: "redness", label: "Calm", concern: "redness", prompt: "low if there is redness, flushing or visible irritation" },
  { key: "evenTone", label: "Even tone", concern: "pigmentation", prompt: "low if there are dark spots, post-acne marks or patchy pigmentation" },
  { key: "texture", label: "Smoothness & radiance", concern: "dullness", prompt: "low if skin looks rough, uneven or dull" },
  { key: "fineLines", label: "Firmness", concern: "ageing", prompt: "low if there are visible fine lines, wrinkles or loss of firmness" },
] as const;

export type MetricKey = (typeof METRICS)[number]["key"];

export type SkinResult = {
  engine: "claude" | "device";
  skinType: string;
  concerns: string[];
  scores: Record<MetricKey, number>;
  overall: number;
  summary: string;
};

export const CONCERN_LABEL: Record<string, string> = {
  acne: "Breakouts", pigmentation: "Dark spots", ageing: "Fine lines", dryness: "Dehydration", pores: "Visible pores", dullness: "Dullness", redness: "Redness",
};

/** Days until we suggest the next scan. Skin renews in roughly four weeks. */
export const RESCAN_DAYS = 28;

/** ["pores", "acne", "dryness"] → "visible pores, breakouts and dehydration" */
export function concernList(concerns: string[]) {
  const words = concerns.map((c) => CONCERN_LABEL[c]?.toLowerCase() ?? c);
  return words.length > 1 ? `${words.slice(0, -1).join(", ")} and ${words.at(-1)}` : (words[0] ?? "");
}
