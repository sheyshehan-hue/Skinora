import type { Shape } from "../../src/lib/art";

export type BrandSeed = { name: string; origin: string; description: string; featured?: boolean; isLuxury?: boolean; color?: string };

export const BRANDS: BrandSeed[] = [
  { name: "The Ordinary", origin: "Canada", featured: true, description: "Clinical formulations with integrity. Honest, single-active skincare at an honest price." },
  { name: "CeraVe", origin: "United States", featured: true, description: "Developed with dermatologists, with three essential ceramides to restore the skin barrier." },
  { name: "Medicube", origin: "South Korea", featured: true, description: "Korea's dermatology-led skincare house, known for PDRN, pore and collagen care." },
  { name: "COSRX", origin: "South Korea", description: "Minimal, effective Korean skincare built around hero ingredients." },
  { name: "Beauty of Joseon", origin: "South Korea", featured: true, description: "Hanbang heritage ingredients reimagined for modern skin." },
  { name: "La Roche-Posay", origin: "France", featured: true, description: "French pharmacy skincare, formulated for sensitive skin with thermal spring water." },
  { name: "Laneige", origin: "South Korea", description: "Water science for luminous, hydrated skin." },
  { name: "Estée Lauder", origin: "United States", isLuxury: true, description: "Iconic American prestige skincare since 1946." },
  { name: "Sulwhasoo", origin: "South Korea", isLuxury: true, description: "Holistic Korean luxury rooted in ginseng science." },
  { name: "La Mer", origin: "United States", isLuxury: true, featured: true, description: "The legendary Miracle Broth™, born from the sea." },
  { name: "Clinique", origin: "United States", description: "Allergy-tested, fragrance-free, dermatologist-guided." },
  { name: "Kiehl's", origin: "United States", description: "New York apothecary since 1851." },
  { name: "Glow Recipe", origin: "United States", description: "Fruit-powered, clinically effective skincare." },
  { name: "YSL Beauty", origin: "France", isLuxury: true, featured: true, description: "Couture fragrance and beauty from the House of Saint Laurent." },
  { name: "Dior", origin: "France", isLuxury: true, featured: true, description: "Parisian haute parfumerie, from Miss Dior to Sauvage." },
  { name: "Chanel", origin: "France", isLuxury: true, featured: true, description: "Timeless fragrance created in the Chanel laboratories in Neuilly." },
  { name: "Lancôme", origin: "France", isLuxury: true, description: "French luxury beauty since 1935." },
  { name: "Tom Ford", origin: "United States", isLuxury: true, description: "Private Blend fragrances of uncompromising luxury." },
  { name: "Jo Malone London", origin: "United Kingdom", isLuxury: true, description: "British fragrance, made to be worn alone or combined." },
  { name: "Le Labo", origin: "United States", isLuxury: true, description: "Hand-blended fragrance from Grasse, made fresh to order." },
  { name: "Maison Margiela", origin: "France", description: "REPLICA: familiar scents and moments, recreated." },
  { name: "Aesop", origin: "Australia", isLuxury: true, description: "Formulations for skin, hair and body, crafted with meticulous care." },
  { name: "Diptyque", origin: "France", isLuxury: true, description: "Parisian candles and fragrances since 1961." },
  { name: "Mount Lai", origin: "United States", description: "Traditional Chinese beauty rituals for modern self-care." },
  { name: "Skinora", origin: "Sri Lanka", description: "Curated gift edits, wrapped by hand in Colombo." },
];

export type CategorySeed = { name: string; slug: string; description: string; children: { name: string; slug: string; description: string }[] };

export const CATEGORIES: CategorySeed[] = [
  {
    name: "Skin Care",
    slug: "skin-care",
    description: "Authentic skincare from Seoul, Paris and New York, selected for Sri Lanka's climate.",
    children: [
      { name: "Cleansers", slug: "cleansers", description: "Gentle, barrier-respecting cleansers." },
      { name: "Toners & Essences", slug: "toners-essences", description: "Prep, hydrate and refine." },
      { name: "Serums", slug: "serums", description: "Concentrated actives for targeted results." },
      { name: "Moisturisers", slug: "moisturisers", description: "Lightweight to rich, for every skin type." },
      { name: "Sunscreen", slug: "sunscreen", description: "Daily broad-spectrum protection, made for tropical sun." },
      { name: "Masks & Treatments", slug: "masks-treatments", description: "Overnight masks, pads and spot treatments." },
    ],
  },
  {
    name: "Fragrances",
    slug: "fragrances",
    description: "Haute parfumerie, imported directly and stored in climate-controlled conditions.",
    children: [
      { name: "For Her", slug: "women", description: "Fragrances for women." },
      { name: "For Him", slug: "men", description: "Fragrances for men." },
      { name: "Unisex", slug: "unisex", description: "Scents without boundaries." },
    ],
  },
  {
    name: "Lifestyle",
    slug: "lifestyle",
    description: "Rituals for the home and body.",
    children: [
      { name: "Bath & Body", slug: "bath-body", description: "Hand and body care." },
      { name: "Home Fragrance", slug: "home-fragrance", description: "Candles and diffusers." },
      { name: "Tools & Accessories", slug: "tools", description: "Gua sha, rollers and beauty tools." },
    ],
  },
  {
    name: "Luxury",
    slug: "luxury",
    description: "The Luxury Collection: prestige skincare, haute parfumerie and gift sets.",
    children: [{ name: "Gift Sets", slug: "gift-sets", description: "Hand-wrapped edits for every occasion." }],
  },
];

type V = [name: string, price: number, salePrice?: number];

export type ProductSeed = {
  brand: string;
  name: string;
  category: string;
  tagline: string;
  description: string;
  keyIngredients: string[];
  ingredients?: string;
  howToUse?: string;
  skinTypes?: string[];
  concerns?: string[];
  gender?: "women" | "men" | "unisex";
  variants: V[];
  shape: Shape;
  colors: [body: string, cap: string, ink: string, bg: string];
  texture: "cream" | "serum" | "scent" | "glow";
  luxury?: boolean;
  isNew?: boolean;
  popularity: number; // relative sales weight
  notes?: string; // fragrance notes
};

const ALL = ["dry", "oily", "combination", "normal", "sensitive"];

export const PRODUCTS: ProductSeed[] = [
  // ───────────── The Ordinary
  {
    brand: "The Ordinary", name: "Niacinamide 10% + Zinc 1%", category: "serums", tagline: "Blemish & pore refining serum",
    description: "A high-strength vitamin and mineral formula that visibly reduces blemishes, balances oil and refines the look of enlarged pores. Water-light and suited to humid days in Colombo.",
    keyIngredients: ["Niacinamide", "Zinc PCA"],
    ingredients: "Aqua (Water), Niacinamide, Pentylene Glycol, Zinc PCA, Dimethyl Isosorbide, Tamarindus Indica Seed Gum, Xanthan Gum, Isoceteth-20, Ethoxydiglycol, Phenoxyethanol, Chlorphenesin.",
    skinTypes: ["oily", "combination", "normal"], concerns: ["acne", "pores", "pigmentation"],
    variants: [["30 ml", 4650], ["60 ml", 7900]], shape: "dropper", colors: ["#F4F1EA", "#111111", "#222222", "#ECE6DB"], texture: "serum", popularity: 10,
  },
  {
    brand: "The Ordinary", name: "Hyaluronic Acid 2% + B5", category: "serums", tagline: "Multi-depth hydration serum",
    description: "Low, medium and high molecular weight hyaluronic acid with vitamin B5 for plump, deeply hydrated skin that never feels heavy.",
    keyIngredients: ["Hyaluronic Acid", "Panthenol"],
    ingredients: "Aqua (Water), Sodium Hyaluronate, Sodium Hyaluronate Crosspolymer, Panthenol, Ahnfeltia Concinna Extract, Glycerin, Pentylene Glycol, Propanediol, Polyacrylate Crosspolymer-6, PPG-26-Buteth-26, PEG-40 Hydrogenated Castor Oil, Trisodium Ethylenediamine Disuccinate, Citric Acid, Ethoxydiglycol, Caprylyl Glycol, Hexylene Glycol, Phenoxyethanol, Chlorphenesin.",
    skinTypes: ALL, concerns: ["dryness", "ageing"],
    variants: [["30 ml", 4950], ["60 ml", 8400]], shape: "dropper", colors: ["#EEF3F6", "#111111", "#222222", "#E3E9EE"], texture: "serum", popularity: 8,
  },
  {
    brand: "The Ordinary", name: "Glycolic Acid 7% Exfoliating Toner", category: "toners-essences", tagline: "Radiance-renewing toner",
    description: "A 7% glycolic acid toning solution that gently exfoliates for brighter, more even-looking skin, softened with Tasmanian pepperberry.",
    keyIngredients: ["Glycolic Acid", "Aloe Vera", "Ginseng"],
    skinTypes: ["normal", "oily", "combination"], concerns: ["dullness", "pigmentation", "pores"],
    variants: [["240 ml", 6900]], shape: "bottle", colors: ["#F2EEE6", "#111111", "#222222", "#EDE5D8"], texture: "serum", popularity: 5,
  },
  {
    brand: "The Ordinary", name: "Retinol 0.5% in Squalane", category: "serums", tagline: "Moderate-strength retinol",
    description: "A water-free solution of 0.5% pure retinol in squalane to visibly reduce fine lines, photo-damage and general signs of ageing.",
    keyIngredients: ["Retinol", "Squalane"],
    ingredients: "Squalane, Caprylic/Capric Triglyceride, Retinol, Solanum Lycopersicum (Tomato) Fruit/Leaf/Stem Extract, Simmondsia Chinensis (Jojoba) Seed Oil, BHT.",
    howToUse: "Use once daily in the evening after water-based serums. Start two to three nights a week. Always follow with SPF 30 or higher in the morning. Not for use during pregnancy.",
    skinTypes: ["normal", "dry", "combination"], concerns: ["ageing", "pigmentation"],
    variants: [["30 ml", 4450]], shape: "dropper", colors: ["#F5E7C9", "#111111", "#222222", "#EFE6D5"], texture: "serum", popularity: 5,
  },
  {
    brand: "The Ordinary", name: "Squalane Cleanser", category: "cleansers", tagline: "Balm-to-oil makeup remover",
    description: "A gentle, moisturising cleanser that melts away makeup and sunscreen, leaving skin soft rather than stripped.",
    keyIngredients: ["Squalane"],
    skinTypes: ALL, concerns: ["dryness"],
    variants: [["50 ml", 4250], ["150 ml", 8500]], shape: "tube", colors: ["#F4F0E8", "#2B2B2B", "#222222", "#EEE8DC"], texture: "cream", popularity: 4,
  },
  {
    brand: "The Ordinary", name: "Azelaic Acid Suspension 10%", category: "masks-treatments", tagline: "Brightening & texture cream-gel",
    description: "A lightweight cream-gel with 10% azelaic acid to brighten, even tone and visibly reduce blemishes and texture.",
    keyIngredients: ["Azelaic Acid"],
    skinTypes: ["oily", "combination", "normal", "sensitive"], concerns: ["acne", "redness", "pigmentation"],
    variants: [["30 ml", 5250]], shape: "tube", colors: ["#F6F3EE", "#111111", "#222222", "#ECE7E0"], texture: "cream", popularity: 4, isNew: true,
  },
  // ───────────── CeraVe
  {
    brand: "CeraVe", name: "Moisturising Cream", category: "moisturisers", tagline: "Barrier-restoring face & body cream",
    description: "A rich, non-greasy cream with three essential ceramides and hyaluronic acid. MVE technology releases moisture for 24 hours. Accepted by the National Eczema Association.",
    keyIngredients: ["Ceramides", "Hyaluronic Acid"],
    ingredients: "Aqua/Water, Glycerin, Cetearyl Alcohol, Caprylic/Capric Triglyceride, Cetyl Alcohol, Ceteareth-20, Petrolatum, Potassium Phosphate, Ceramide NP, Ceramide AP, Ceramide EOP, Carbomer, Dimethicone, Behentrimonium Methosulfate, Sodium Lauroyl Lactylate, Sodium Hyaluronate, Cholesterol, Phenoxyethanol, Disodium EDTA, Dipotassium Phosphate, Tocopherol, Phytosphingosine, Xanthan Gum, Ethylhexylglycerin.",
    skinTypes: ["dry", "normal", "sensitive"], concerns: ["dryness", "redness"],
    variants: [["340 g", 8900], ["454 g", 10900]], shape: "jar", colors: ["#F7F8FA", "#1F5AA6", "#1F3D6B", "#E7ECF2"], texture: "cream", popularity: 10,
  },
  {
    brand: "CeraVe", name: "Hydrating Cleanser", category: "cleansers", tagline: "Non-foaming cream cleanser",
    description: "Removes makeup and impurities without disrupting the protective skin barrier. Ceramides and hyaluronic acid leave skin hydrated and comfortable.",
    keyIngredients: ["Ceramides", "Hyaluronic Acid"],
    skinTypes: ["dry", "normal", "sensitive"], concerns: ["dryness"],
    variants: [["236 ml", 6450], ["473 ml", 9800]], shape: "pump", colors: ["#F7F8FA", "#1F5AA6", "#1F3D6B", "#E6EBF1"], texture: "cream", popularity: 9,
  },
  {
    brand: "CeraVe", name: "Foaming Cleanser", category: "cleansers", tagline: "For normal to oily skin",
    description: "A refreshing gel-to-foam cleanser that removes excess oil without over-drying. Niacinamide calms while ceramides protect.",
    keyIngredients: ["Ceramides", "Niacinamide", "Hyaluronic Acid"],
    skinTypes: ["oily", "combination", "normal"], concerns: ["acne", "pores"],
    variants: [["236 ml", 6450], ["473 ml", 9800]], shape: "pump", colors: ["#F7F8FA", "#3E7CC8", "#1F3D6B", "#E4EAF0"], texture: "cream", popularity: 7,
  },
  {
    brand: "CeraVe", name: "SA Smoothing Cleanser", category: "cleansers", tagline: "Exfoliating salicylic acid cleanser",
    description: "Salicylic acid gently exfoliates rough, bumpy texture while ceramides help restore the barrier.",
    keyIngredients: ["Salicylic Acid", "Ceramides", "Niacinamide"],
    skinTypes: ["oily", "combination", "normal"], concerns: ["acne", "pores"],
    variants: [["236 ml", 6950]], shape: "pump", colors: ["#F7F8FA", "#2C8A86", "#1F3D6B", "#E3ECEB"], texture: "cream", popularity: 5,
  },
  {
    brand: "CeraVe", name: "PM Facial Moisturising Lotion", category: "moisturisers", tagline: "Oil-free night lotion",
    description: "An ultra-lightweight, oil-free night moisturiser with niacinamide and ceramides that calms and restores overnight.",
    keyIngredients: ["Niacinamide", "Ceramides", "Hyaluronic Acid"],
    skinTypes: ["oily", "combination", "normal", "sensitive"], concerns: ["redness", "dryness"],
    variants: [["52 ml", 6750]], shape: "pump", colors: ["#F7F8FA", "#1F5AA6", "#1F3D6B", "#E9EDF3"], texture: "cream", popularity: 6,
  },
  {
    brand: "CeraVe", name: "AM Facial Moisturising Lotion SPF 30", category: "sunscreen", tagline: "Daily moisturiser with sun protection",
    description: "Broad-spectrum SPF 30 in a lightweight moisturiser, with ceramides and niacinamide. Your morning step, simplified.",
    keyIngredients: ["Ceramides", "Niacinamide"],
    skinTypes: ["normal", "combination", "dry"], concerns: ["dryness", "ageing"],
    variants: [["52 ml", 7200]], shape: "pump", colors: ["#F7F8FA", "#E59A2F", "#1F3D6B", "#F1EBE0"], texture: "cream", popularity: 5,
  },
  // ───────────── Medicube
  {
    brand: "Medicube", name: "PDRN Pink Peptide Serum", category: "serums", tagline: "Salmon PDRN glass-skin serum",
    description: "Korea's cult PDRN serum. Salmon-derived PDRN and peptides support elasticity and a dewy, glass-skin finish.",
    keyIngredients: ["PDRN", "Peptides", "Niacinamide"],
    skinTypes: ALL, concerns: ["ageing", "dullness", "dryness"],
    variants: [["30 ml", 11500]], shape: "dropper", colors: ["#F4C9C6", "#FFFFFF", "#7A3B3B", "#F3E3E0"], texture: "serum", popularity: 9, isNew: true,
  },
  {
    brand: "Medicube", name: "Zero Pore Pad 2.0", category: "masks-treatments", tagline: "Dual-textured AHA/BHA toner pads",
    description: "Seventy dual-sided pads with AHA and BHA that sweep away dead skin and excess sebum for visibly tighter-looking pores.",
    keyIngredients: ["Salicylic Acid", "Glycolic Acid"],
    skinTypes: ["oily", "combination", "normal"], concerns: ["pores", "acne", "dullness"],
    variants: [["70 pads", 9900]], shape: "pad", colors: ["#DCE9F2", "#5B8DB8", "#1F3D6B", "#E5EDF2"], texture: "glow", popularity: 8,
  },
  {
    brand: "Medicube", name: "Collagen Night Wrapping Mask", category: "masks-treatments", tagline: "Peel-off overnight collagen mask",
    description: "A jelly mask that forms a thin film overnight to lock in collagen and moisture. Peel off in the morning to reveal bouncy, glassy skin.",
    keyIngredients: ["Peptides", "Hyaluronic Acid"],
    skinTypes: ["dry", "normal", "combination"], concerns: ["ageing", "dryness", "dullness"],
    variants: [["75 ml", 10500]], shape: "jar", colors: ["#F6E0DA", "#C76B6B", "#7A3B3B", "#F2E4E0"], texture: "cream", popularity: 6, isNew: true,
  },
  {
    brand: "Medicube", name: "Deep Vita C Capsule Cream", category: "moisturisers", tagline: "Brightening capsule cream",
    description: "Vitamin C capsules burst on contact for brighter, more even-looking skin and a healthy glow.",
    keyIngredients: ["Vitamin C", "Niacinamide"],
    skinTypes: ALL, concerns: ["pigmentation", "dullness"],
    variants: [["55 g", 9800]], shape: "jar", colors: ["#F8E6B8", "#E59A2F", "#6B4A12", "#F4EBD8"], texture: "cream", popularity: 5,
  },
  // ───────────── COSRX
  {
    brand: "COSRX", name: "Advanced Snail 96 Mucin Power Essence", category: "toners-essences", tagline: "Repairing snail mucin essence",
    description: "96% snail secretion filtrate to repair, hydrate and soothe. A lightweight essence that layers beautifully.",
    keyIngredients: ["Snail Mucin", "Hyaluronic Acid"],
    skinTypes: ALL, concerns: ["dryness", "redness", "dullness"],
    variants: [["100 ml", 7450]], shape: "bottle", colors: ["#F0F0EE", "#1C1C1C", "#222222", "#E9E9E5"], texture: "serum", popularity: 7,
  },
  {
    brand: "COSRX", name: "Low pH Good Morning Gel Cleanser", category: "cleansers", tagline: "Gentle low-pH gel cleanser",
    description: "A mildly acidic gel cleanser with tea tree oil and BHA that cleanses without disturbing skin's natural pH.",
    keyIngredients: ["Salicylic Acid"],
    skinTypes: ["oily", "combination", "normal", "sensitive"], concerns: ["acne", "pores"],
    variants: [["150 ml", 3950]], shape: "tube", colors: ["#E8F1EC", "#2E7D55", "#1F4A35", "#E3ECE6"], texture: "cream", popularity: 5,
  },
  // ───────────── Beauty of Joseon
  {
    brand: "Beauty of Joseon", name: "Relief Sun: Rice + Probiotics SPF50+", category: "sunscreen", tagline: "Weightless organic sunscreen",
    description: "A lightweight, creamy chemical sunscreen with rice extract and grain probiotics. No white cast, no greasiness. Made for daily tropical wear.",
    keyIngredients: ["Rice Extract", "Niacinamide"],
    skinTypes: ALL, concerns: ["pigmentation", "ageing", "dryness"],
    variants: [["50 ml", 5450]], shape: "tube", colors: ["#F3EAD7", "#8A6A3B", "#4A3720", "#EFE7D6"], texture: "cream", popularity: 10,
  },
  {
    brand: "Beauty of Joseon", name: "Glow Serum: Propolis + Niacinamide", category: "serums", tagline: "Calming glow serum",
    description: "60% propolis extract and niacinamide calm blemish-prone skin while delivering a honeyed, healthy glow.",
    keyIngredients: ["Niacinamide", "Propolis"],
    skinTypes: ["oily", "combination", "normal", "sensitive"], concerns: ["acne", "dullness", "redness"],
    variants: [["30 ml", 5900]], shape: "dropper", colors: ["#E9B45A", "#FFFFFF", "#4A3720", "#F2E8D6"], texture: "serum", popularity: 7,
  },
  // ───────────── La Roche-Posay
  {
    brand: "La Roche-Posay", name: "Anthelios UVMune 400 Invisible Fluid SPF50+", category: "sunscreen", tagline: "Ultra-long UVA protection",
    description: "Next-generation Mexoryl 400 filter protects against ultra-long UVA rays. An invisible, water-resistant fluid for sensitive skin.",
    keyIngredients: ["Mexoryl 400", "Thermal Spring Water"],
    skinTypes: ALL, concerns: ["pigmentation", "ageing", "redness"],
    variants: [["50 ml", 9950]], shape: "bottle", colors: ["#F6F7F9", "#F2A33A", "#1E3A6B", "#EFEAE0"], texture: "cream", popularity: 7,
  },
  {
    brand: "La Roche-Posay", name: "Effaclar Duo+M", category: "masks-treatments", tagline: "Triple-correcting anti-blemish care",
    description: "Targets blemishes, marks and the microbiome imbalance behind breakouts, with niacinamide and Phylobioma.",
    keyIngredients: ["Niacinamide", "Salicylic Acid"],
    skinTypes: ["oily", "combination"], concerns: ["acne", "pigmentation", "pores"],
    variants: [["40 ml", 8950]], shape: "tube", colors: ["#F6F7F9", "#1E7BC4", "#1E3A6B", "#E6EDF3"], texture: "cream", popularity: 6,
  },
  {
    brand: "La Roche-Posay", name: "Cicaplast Baume B5+", category: "moisturisers", tagline: "Soothing repair balm",
    description: "A cult multi-purpose balm with panthenol and madecassoside to soothe and repair dry, irritated skin.",
    keyIngredients: ["Centella Asiatica", "Panthenol"],
    skinTypes: ["dry", "sensitive", "normal"], concerns: ["redness", "dryness"],
    variants: [["40 ml", 6950], ["100 ml", 11900]], shape: "tube", colors: ["#F6F7F9", "#4AA0D5", "#1E3A6B", "#E7EEF3"], texture: "cream", popularity: 6,
  },
  // ───────────── Laneige
  {
    brand: "Laneige", name: "Water Sleeping Mask", category: "masks-treatments", tagline: "Overnight hydration mask",
    description: "A jelly overnight mask with Sleep-tox™ technology for deeply refreshed, hydrated skin by morning.",
    keyIngredients: ["Hyaluronic Acid", "Squalane"],
    skinTypes: ALL, concerns: ["dryness", "dullness"],
    variants: [["70 ml", 9800]], shape: "jar", colors: ["#BFD7EE", "#E8EEF5", "#1E3A6B", "#E3EAF2"], texture: "serum", popularity: 5,
  },
  {
    brand: "Laneige", name: "Lip Sleeping Mask Berry", category: "masks-treatments", tagline: "Overnight lip treatment",
    description: "A cult leave-on lip mask with berry fruit complex and vitamin C for soft, supple lips by morning.",
    keyIngredients: ["Vitamin C", "Shea Butter"],
    skinTypes: ALL, concerns: ["dryness"],
    variants: [["20 g", 6950]], shape: "jar", colors: ["#E7A3B8", "#F7D6E0", "#5A1F33", "#F2E2E7"], texture: "cream", popularity: 6,
  },
  // ───────────── Luxury skincare
  {
    brand: "Estée Lauder", name: "Advanced Night Repair Serum", category: "serums", tagline: "Synchronized multi-recovery complex",
    description: "The iconic little brown bottle. Reduces the look of multiple signs of ageing and strengthens skin's barrier overnight for a radiant, youthful look.",
    keyIngredients: ["Hyaluronic Acid", "Peptides", "Tripeptide-32"],
    skinTypes: ALL, concerns: ["ageing", "dullness", "dryness"],
    variants: [["30 ml", 38500], ["50 ml", 55000]], shape: "dropper", colors: ["#6B3E1E", "#1A1A1A", "#F3E3C3", "#EADFCD"], texture: "serum", popularity: 4, luxury: true,
  },
  {
    brand: "Sulwhasoo", name: "First Care Activating Serum", category: "serums", tagline: "Ginseng-powered first step serum",
    description: "Korea's luxurious first-step serum. JAUM Activator™ prepares skin to absorb the rest of your ritual for a supple, radiant complexion.",
    keyIngredients: ["Ginseng", "Peptides"],
    skinTypes: ALL, concerns: ["ageing", "dullness"],
    variants: [["60 ml", 32500], ["90 ml", 44500]], shape: "bottle", colors: ["#C9A35E", "#2E2A26", "#2E2A26", "#EFE6D3"], texture: "serum", popularity: 3, luxury: true,
  },
  {
    brand: "La Mer", name: "Crème de la Mer", category: "moisturisers", tagline: "The legendary moisturising cream",
    description: "Infused with the cell-renewing Miracle Broth™, the original ultra-rich cream deeply moisturises and visibly heals dryness to reveal a more radiant look.",
    keyIngredients: ["Miracle Broth™", "Lime Tea", "Squalane"],
    skinTypes: ["dry", "normal", "sensitive"], concerns: ["ageing", "dryness", "redness"],
    variants: [["30 ml", 118000], ["60 ml", 205000]], shape: "jar", colors: ["#E9EEF0", "#B9C4C9", "#3A4A52", "#E4E9EB"], texture: "cream", popularity: 2, luxury: true,
  },
  {
    brand: "Clinique", name: "Moisture Surge 100H Auto-Replenishing Hydrator", category: "moisturisers", tagline: "100-hour gel-cream",
    description: "A refreshing oil-free gel-cream with aloe bio-ferment and hyaluronic acid for instant, lasting hydration.",
    keyIngredients: ["Hyaluronic Acid", "Aloe Vera"],
    skinTypes: ALL, concerns: ["dryness"],
    variants: [["50 ml", 14500]], shape: "jar", colors: ["#F2B8C6", "#E8EDEF", "#5A1F33", "#F3E6EA"], texture: "cream", popularity: 4,
  },
  {
    brand: "Kiehl's", name: "Ultra Facial Cream", category: "moisturisers", tagline: "24-hour daily moisturiser",
    description: "A lightweight daily cream with squalane and glacial glycoprotein for skin that stays balanced and comfortable all day.",
    keyIngredients: ["Squalane", "Glycerin"],
    skinTypes: ALL, concerns: ["dryness"],
    variants: [["50 ml", 13900], ["125 ml", 24900]], shape: "jar", colors: ["#F4F1EA", "#1C1C1C", "#1C1C1C", "#ECE6DA"], texture: "cream", popularity: 4,
  },
  {
    brand: "Glow Recipe", name: "Watermelon Glow Niacinamide Dew Drops", category: "serums", tagline: "Highlighting hydration serum",
    description: "A breakthrough serum-highlighter hybrid that hydrates and visibly reduces hyperpigmentation for a dewy, lit-from-within glow.",
    keyIngredients: ["Niacinamide", "Hyaluronic Acid"],
    skinTypes: ALL, concerns: ["pigmentation", "dullness"],
    variants: [["40 ml", 15500]], shape: "dropper", colors: ["#F28FA0", "#5DAA6B", "#5A1F33", "#F6E4E6"], texture: "serum", popularity: 4, isNew: true,
  },
  // ───────────── Fragrance — women
  {
    brand: "YSL Beauty", name: "Libre Eau de Parfum", category: "women", gender: "women", tagline: "The freedom fragrance",
    description: "A floral lavender fougère: the tension between burning lavender from France and sensual orange blossom from Morocco, warmed with vanilla.",
    notes: "Top: Mandarin, Lavender, Black Currant · Heart: Orange Blossom, Jasmine · Base: Madagascar Vanilla, Musk, Cedar",
    keyIngredients: ["Lavender", "Orange Blossom", "Vanilla"],
    variants: [["30 ml", 36500], ["50 ml", 52000], ["90 ml", 72000]], shape: "perfume", colors: ["#E2C27E", "#111111", "#1A1A1A", "#EFE5D2"], texture: "scent", popularity: 8, luxury: true,
  },
  {
    brand: "Dior", name: "Miss Dior Eau de Parfum", category: "women", gender: "women", tagline: "A millefiori of love",
    description: "A couture fragrance composed like a bouquet of a thousand flowers. Iris, peony and lily of the valley over a velvety rose.",
    notes: "Top: Iris, Peony, Lily of the Valley · Heart: Grasse Rose, Damask Rose · Base: Vanilla, Tonka Bean, Musk",
    keyIngredients: ["Grasse Rose", "Peony", "Iris"],
    variants: [["30 ml", 34000], ["50 ml", 48500], ["100 ml", 68500]], shape: "perfume-round", colors: ["#F2C3CB", "#E7D3B0", "#4A2A30", "#F3E6E6"], texture: "scent", popularity: 8, luxury: true,
  },
  {
    brand: "Chanel", name: "Coco Mademoiselle Eau de Parfum", category: "women", gender: "women", tagline: "Irresistibly sensual",
    description: "A fresh oriental fragrance of sparkling orange, rose and jasmine resting on patchouli and vetiver. Unmistakably Chanel.",
    notes: "Top: Orange, Bergamot · Heart: Rose, Jasmine · Base: Patchouli, Vetiver, White Musk",
    keyIngredients: ["Rose", "Jasmine", "Patchouli"],
    variants: [["50 ml", 56000], ["100 ml", 79000]], shape: "perfume", colors: ["#F1D9A8", "#1A1A1A", "#1A1A1A", "#F1E9DA"], texture: "scent", popularity: 5, luxury: true,
  },
  {
    brand: "Lancôme", name: "La Vie Est Belle Eau de Parfum", category: "women", gender: "women", tagline: "Life is beautiful",
    description: "An iris gourmand fragrance with notes of iris pallida, patchouli and praline. A declaration of happiness.",
    notes: "Top: Black Currant, Pear · Heart: Iris, Jasmine, Orange Blossom · Base: Praline, Vanilla, Patchouli",
    keyIngredients: ["Iris", "Praline", "Vanilla"],
    variants: [["50 ml", 42000], ["100 ml", 58500]], shape: "perfume-round", colors: ["#EAC6CF", "#F3EFEA", "#4A2A30", "#F2E7E9"], texture: "scent", popularity: 5, luxury: true,
  },
  // ───────────── Fragrance — men
  {
    brand: "Dior", name: "Sauvage Eau de Toilette", category: "men", gender: "men", tagline: "Raw and noble",
    description: "A radically fresh composition dictated by a name that has the ring of a manifesto. Calabrian bergamot meets ambroxan.",
    notes: "Top: Calabrian Bergamot, Pepper · Heart: Sichuan Pepper, Lavender, Geranium · Base: Ambroxan, Cedar, Labdanum",
    keyIngredients: ["Bergamot", "Ambroxan", "Pepper"],
    variants: [["60 ml", 38500], ["100 ml", 52500], ["200 ml", 82000]], shape: "perfume", colors: ["#3D4F66", "#1A1A1A", "#EDEDED", "#E3E6EA"], texture: "scent", popularity: 7, luxury: true,
  },
  {
    brand: "Chanel", name: "Bleu de Chanel Eau de Parfum", category: "men", gender: "men", tagline: "An ode to masculine freedom",
    description: "An aromatic-woody fragrance with a captivating trail. Citrus freshness over a sensual base of sandalwood.",
    notes: "Top: Grapefruit, Lemon, Mint · Heart: Ginger, Jasmine, Nutmeg · Base: Sandalwood, Cedar, Incense",
    keyIngredients: ["Grapefruit", "Sandalwood", "Incense"],
    variants: [["50 ml", 49500], ["100 ml", 68000]], shape: "perfume", colors: ["#1F2A3A", "#111111", "#E8E8E8", "#E2E4E8"], texture: "scent", popularity: 5, luxury: true,
  },
  {
    brand: "YSL Beauty", name: "Y Eau de Parfum", category: "men", gender: "men", tagline: "Freshness and intensity",
    description: "A fresh and intense fougère: crisp apple and ginger, a heart of sage, and an ambery-woody base.",
    notes: "Top: Apple, Ginger, Bergamot · Heart: Sage, Juniper Berries · Base: Amberwood, Tonka Bean, Cedar",
    keyIngredients: ["Apple", "Sage", "Amberwood"],
    variants: [["60 ml", 41000], ["100 ml", 56000]], shape: "perfume", colors: ["#2A2A2A", "#C6A15B", "#F1E3C3", "#E4E1DC"], texture: "scent", popularity: 4,
  },
  // ───────────── Fragrance — unisex
  {
    brand: "Tom Ford", name: "Oud Wood Eau de Parfum", category: "unisex", gender: "unisex", tagline: "Private Blend",
    description: "Rare oud wood, exotic rosewood and cardamom over a smoky blend of tonka bean and amber. One of the rarest and most precious ingredients in a perfumer's arsenal.",
    notes: "Top: Rosewood, Cardamom, Chinese Pepper · Heart: Oud, Sandalwood, Vetiver · Base: Tonka Bean, Vanilla, Amber",
    keyIngredients: ["Oud", "Sandalwood", "Cardamom"],
    variants: [["50 ml", 98000], ["100 ml", 148000]], shape: "perfume", colors: ["#5A3A22", "#C6A15B", "#F1E3C3", "#E9E0D3"], texture: "scent", popularity: 3, luxury: true,
  },
  {
    brand: "Jo Malone London", name: "Wood Sage & Sea Salt Cologne", category: "unisex", gender: "unisex", tagline: "Escape the everyday",
    description: "Breathe in the windswept shore. Mineral sea salt and earthy sage for a fresh, joyful scent.",
    notes: "Top: Ambrette Seeds · Heart: Sea Salt · Base: Sage",
    keyIngredients: ["Sea Salt", "Sage"],
    variants: [["30 ml", 28500], ["100 ml", 58000]], shape: "perfume", colors: ["#EEE9DF", "#1A1A1A", "#1A1A1A", "#EAE6DE"], texture: "scent", popularity: 5, luxury: true,
  },
  {
    brand: "Le Labo", name: "Santal 33 Eau de Parfum", category: "unisex", gender: "unisex", tagline: "The scent of a generation",
    description: "Cardamom, iris and violet over Australian sandalwood, papyrus and cedarwood. Leathery, musky and instantly recognisable.",
    notes: "Cardamom, Iris, Violet, Ambrox, Australian Sandalwood, Papyrus, Cedarwood, Leather",
    keyIngredients: ["Sandalwood", "Cardamom", "Iris"],
    variants: [["50 ml", 92000], ["100 ml", 138000]], shape: "perfume", colors: ["#E9E4DA", "#1A1A1A", "#1A1A1A", "#E8E3D9"], texture: "scent", popularity: 3, luxury: true, isNew: true,
  },
  {
    brand: "Maison Margiela", name: "REPLICA Lazy Sunday Morning", category: "unisex", gender: "unisex", tagline: "Fresh, clean linen",
    description: "The feeling of white linen sheets on a lazy Sunday morning. Lily of the valley, iris and soft white musks.",
    notes: "Top: Aldehydes, Pear · Heart: Lily of the Valley, Iris, Rose · Base: White Musk, Patchouli",
    keyIngredients: ["White Musk", "Iris", "Lily of the Valley"],
    variants: [["30 ml", 24500], ["100 ml", 52000]], shape: "bottle", colors: ["#F4F2EE", "#E8E2D6", "#1A1A1A", "#EEEBE5"], texture: "scent", popularity: 4,
  },
  // ───────────── Lifestyle
  {
    brand: "Aesop", name: "Resurrection Aromatique Hand Wash", category: "bath-body", tagline: "Mandarin rind, rosemary leaf, cedar atlas",
    description: "A gentle botanical hand cleanser in the familiar amber bottle, with citrus, woody and herbaceous aromatic notes.",
    keyIngredients: ["Mandarin Rind", "Rosemary Leaf", "Cedar Atlas"],
    variants: [["500 ml", 18500]], shape: "pump", colors: ["#7A4A1E", "#1A1A1A", "#F1E3C3", "#E9DFCF"], texture: "glow", popularity: 4, luxury: true,
  },
  {
    brand: "Aesop", name: "Resurrection Aromatique Hand Balm", category: "bath-body", tagline: "Rich, fast-absorbing hand balm",
    description: "A rich blend of botanicals and emollients that leaves hands soft and fragrant without greasiness.",
    keyIngredients: ["Shea Butter", "Mandarin Rind"],
    variants: [["75 ml", 11500]], shape: "tube", colors: ["#B98D5C", "#1A1A1A", "#1A1A1A", "#EDE3D3"], texture: "cream", popularity: 3,
  },
  {
    brand: "Diptyque", name: "Baies Scented Candle", category: "home-fragrance", tagline: "Blackcurrant leaves & Bulgarian rose",
    description: "Diptyque's best-selling candle: a bouquet of roses with the green, fruity tang of blackcurrant leaves. Hand-poured in France.",
    keyIngredients: ["Blackcurrant", "Rose"],
    variants: [["190 g", 36000], ["300 g", 52000]], shape: "candle", colors: ["#1A1A1A", "#1A1A1A", "#1A1A1A", "#ECE5DA"], texture: "glow", popularity: 3, luxury: true,
  },
  {
    brand: "Jo Malone London", name: "Pomegranate Noir Home Candle", category: "home-fragrance", tagline: "Dark, daring and sensual",
    description: "Ruby-red pomegranate and pink pepper, with spicy woods. Turns a room into an evening.",
    keyIngredients: ["Pomegranate", "Pink Pepper"],
    variants: [["200 g", 28500]], shape: "candle", colors: ["#F2EEE6", "#1A1A1A", "#1A1A1A", "#EDE8E0"], texture: "glow", popularity: 2,
  },
  {
    brand: "Mount Lai", name: "Rose Quartz Gua Sha Facial Lifting Tool", category: "tools", tagline: "Sculpt and de-puff",
    description: "Hand-carved rose quartz gua sha to sculpt, lift and de-puff. Pair with your favourite facial oil for a ritual massage.",
    keyIngredients: [],
    variants: [["One size", 9500]], shape: "tool", colors: ["#F2C3CB", "#3A2A2E", "#FFFFFF", "#F2E6E6"], texture: "glow", popularity: 3,
  },
  {
    brand: "Skinora", name: "The Luxury Discovery Box", category: "gift-sets", tagline: "Hand-wrapped prestige minis",
    description: "Six prestige minis from La Mer, Estée Lauder, Sulwhasoo, Dior and Chanel, hand-wrapped in our signature ivory box with a champagne ribbon.",
    keyIngredients: [],
    variants: [["Box of 6", 34500]], shape: "pad", colors: ["#F4EFE6", "#C6A15B", "#1A1A1A", "#EFE7D8"], texture: "glow", popularity: 3, luxury: true, isNew: true,
  },
  {
    brand: "Skinora", name: "The Glass Skin Ritual Set", category: "gift-sets", tagline: "A complete Korean routine",
    description: "COSRX Snail Essence, Medicube PDRN Serum and Beauty of Joseon Relief Sun in a gift-ready box. Glass skin in three steps.",
    keyIngredients: ["PDRN", "Snail Mucin", "Rice Extract"],
    skinTypes: ALL, concerns: ["dullness", "dryness"],
    variants: [["Set of 3", 21900, 19900]], shape: "pad", colors: ["#F6E7E3", "#C6A15B", "#1A1A1A", "#F3E8E4"], texture: "glow", popularity: 3, luxury: true,
  },
];

/** Products frequently bought together (by name), used to shape seed sales. */
export const PAIRS: [string, string][] = [
  ["Niacinamide 10% + Zinc 1%", "Hyaluronic Acid 2% + B5"],
  ["Hydrating Cleanser", "Moisturising Cream"],
  ["Foaming Cleanser", "PM Facial Moisturising Lotion"],
  ["PDRN Pink Peptide Serum", "Zero Pore Pad 2.0"],
  ["Relief Sun: Rice + Probiotics SPF50+", "Glow Serum: Propolis + Niacinamide"],
  ["Effaclar Duo+M", "Foaming Cleanser"],
  ["Advanced Snail 96 Mucin Power Essence", "Relief Sun: Rice + Probiotics SPF50+"],
  ["Libre Eau de Parfum", "Miss Dior Eau de Parfum"],
  ["Sauvage Eau de Toilette", "Bleu de Chanel Eau de Parfum"],
  ["Retinol 0.5% in Squalane", "Cicaplast Baume B5+"],
  ["Water Sleeping Mask", "Lip Sleeping Mask Berry"],
  ["Resurrection Aromatique Hand Wash", "Resurrection Aromatique Hand Balm"],
];
