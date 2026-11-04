/**
 * Search landing pages for Sri Lanka: the men's and women's edits, and extra copy and FAQs for
 * category pages. Copy is written answer-first so Google snippets and AI assistants (ChatGPT,
 * Gemini, Perplexity, Claude) can quote it directly. Product picks are product slugs.
 */
import { FREE_SHIPPING_THRESHOLD } from "./constants";
import { DELIVERY_SUMMARY, type QA } from "./seo";

const free = `LKR ${FREE_SHIPPING_THRESHOLD.toLocaleString("en-LK")}`;

export type LandingSection = {
  title: string;
  intro: string;
  /** Explicit picks, in order. */
  slugs?: string[];
  /** Or every active fragrance for this gender. */
  gender?: "men" | "women" | "unisex";
  href: string;
  cta: string;
};

export type Landing = {
  slug: "men" | "women";
  eyebrow: string;
  h1: string;
  metaTitle: string;
  metaDescription: string;
  answer: string;
  facts: string[];
  sections: LandingSection[];
  tips: { title: string; body: string }[];
  faq: QA[];
  guides: string[];
};

const SUNSCREENS = ["beauty-of-joseon-relief-sun-rice-probiotics-spf50", "la-roche-posay-anthelios-uvmune-400-invisible-fluid-spf50", "cerave-am-facial-moisturising-lotion-spf-30"];

const COMMON_FACTS = [
  "100% authentic, from brands and authorised distributors",
  "Batch number and expiry shown before you buy",
  "Prices in LKR, duties included",
  "Same-day delivery in Colombo, island-wide in 1 to 5 days",
  "Cash on delivery, cards, Koko and Mintpay",
];

export const LANDINGS: Record<"men" | "women", Landing> = {
  men: {
    slug: "men",
    eyebrow: "For him",
    h1: "Men's skincare & fragrance in Sri Lanka",
    metaTitle: "Men's Skincare & Perfume in Sri Lanka | Original, in LKR",
    metaDescription:
      "Original men's skincare and perfume in Sri Lanka: oil-control cleansers, sunscreen, acne care and Dior, Chanel and YSL fragrances. Prices in LKR, same-day Colombo delivery, cash on delivery.",
    answer:
      "Skinora sells original men's skincare and perfume in Sri Lanka, with prices in LKR. For Sri Lanka's heat and humidity, most men need three things: a gel or foaming cleanser, a light oil-free moisturiser and an SPF 50 sunscreen every morning. Our men's edit covers those, plus acne care and fragrances from Dior, Chanel, YSL and Tom Ford.",
    facts: COMMON_FACTS,
    sections: [
      { title: "Fragrance for him", intro: "Fresh, woody and aromatic scents that hold up in the heat. Sauvage, Bleu de Chanel and Y are modern classics.", gender: "men", href: "/c/men", cta: "View all" },
      { title: "Clean, oil-free skin", intro: "Cleansers and treatments that control shine and breakouts without stripping the skin.", slugs: ["cerave-foaming-cleanser", "cosrx-low-ph-good-morning-gel-cleanser", "cerave-sa-smoothing-cleanser", "the-ordinary-niacinamide-10-zinc-1", "la-roche-posay-effaclar-duom"], href: "/c/cleansers", cta: "View all" },
      { title: "Daily sun protection", intro: "Light, high-protection sunscreens that don't leave a white cast or feel greasy. The single best anti-ageing step in Sri Lanka.", slugs: SUNSCREENS, href: "/c/sunscreen", cta: "View all" },
      { title: "Lightweight moisturisers", intro: "Hydration that sinks in fast, for after shaving and after the gym.", slugs: ["clinique-moisture-surge-100h-auto-replenishing-hydrator", "kiehls-ultra-facial-cream", "cerave-pm-facial-moisturising-lotion"], href: "/c/moisturisers", cta: "View all" },
      { title: "Unisex scents & grooming", intro: "Fragrances anyone can wear, and grooming gifts he'll actually use.", slugs: ["tom-ford-oud-wood-eau-de-parfum", "jo-malone-london-wood-sage-sea-salt-cologne", "le-labo-santal-33-eau-de-parfum", "aesop-resurrection-aromatique-hand-wash"], href: "/c/unisex", cta: "View all" },
    ],
    tips: [
      { title: "Wash twice, not more", body: "Cleanse morning and night with a gel or foaming cleanser. Washing more often in the heat makes skin produce more oil, not less." },
      { title: "SPF 50 every morning", body: "Sri Lanka sits close to the equator and the UV index is high all year. Apply sunscreen as the last morning step, even on cloudy days and in the car." },
      { title: "Shaving bumps and breakouts", body: "Niacinamide and salicylic acid calm razor bumps and clear pores. Use them at night and keep the routine simple for the first two weeks." },
      { title: "Make perfume last", body: "Spray on pulse points after a shower while skin is still slightly damp, and choose eau de parfum over eau de toilette for longer wear in humid air." },
    ],
    faq: [
      { q: "What is a simple skincare routine for men in Sri Lanka?", a: "Morning: gel or foaming cleanser, light moisturiser, SPF 50 sunscreen. Night: cleanser, then a treatment such as niacinamide for oil and pores, then moisturiser. That covers shine, breakouts and sun damage in Sri Lanka's humid climate." },
      { q: "Which men's perfume lasts longest in Sri Lanka's heat?", a: "Eau de parfum concentrations last longer than eau de toilette. Woody and amber scents such as Bleu de Chanel Eau de Parfum, YSL Y Eau de Parfum and Tom Ford Oud Wood typically last longest in humid weather. Fresh citrus scents feel lighter but fade sooner." },
      { q: "Is the Dior Sauvage at Skinora original?", a: "Yes. All fragrances at Skinora are original, sourced from the brand or an authorised distributor, sealed, and listed with batch number and expiry before you buy." },
      { q: "How much does delivery cost?", a: `${DELIVERY_SUMMARY} Cash on delivery is available.` },
      { q: "What should men with oily or acne-prone skin use?", a: "A foaming or salicylic acid cleanser (CeraVe Foaming or SA Smoothing Cleanser), The Ordinary Niacinamide 10% + Zinc 1% at night, an oil-free moisturiser and a light sunscreen. La Roche-Posay Effaclar Duo+M is a good spot treatment." },
    ],
    guides: ["mens-skincare-routine-sri-lanka", "best-sunscreen-sri-lanka", "long-lasting-perfume-sri-lanka-heat", "original-vs-fake-skincare-perfume-sri-lanka"],
  },
  women: {
    slug: "women",
    eyebrow: "For her",
    h1: "Women's skincare, perfume & beauty in Sri Lanka",
    metaTitle: "Women's Skincare, Perfume & K-Beauty in Sri Lanka | Original",
    metaDescription:
      "Original women's skincare, K-beauty and perfume in Sri Lanka: Medicube, COSRX, Beauty of Joseon, Estée Lauder, Dior, Chanel and YSL. Prices in LKR, same-day Colombo delivery, cash on delivery.",
    answer:
      "Skinora sells original women's skincare, Korean beauty and perfume in Sri Lanka, with prices in LKR. The essentials for Sri Lanka's humid climate are a gentle cleanser, a hydrating serum, a light gel moisturiser and SPF 50 every morning. Our women's edit adds targeted serums for glow, pigmentation and ageing, and fragrances from Dior, Chanel, YSL and Lancôme.",
    facts: COMMON_FACTS,
    sections: [
      { title: "Fragrance for her", intro: "Floral, fruity and gourmand icons. Miss Dior, Libre and Coco Mademoiselle are timeless gifts.", gender: "women", href: "/c/women", cta: "View all" },
      { title: "Glass skin & K-beauty", intro: "Light layers of hydration for a dewy glow that doesn't feel heavy in humid weather.", slugs: ["medicube-pdrn-pink-peptide-serum", "cosrx-advanced-snail-96-mucin-power-essence", "beauty-of-joseon-glow-serum-propolis-niacinamide", "glow-recipe-watermelon-glow-niacinamide-dew-drops", "laneige-water-sleeping-mask"], href: "/collections/glass-skin-edit", cta: "View all" },
      { title: "Pigmentation & even tone", intro: "Dark spots and uneven tone are a common concern under strong tropical sun. These ingredients fade them gradually, alongside daily sunscreen.", slugs: ["the-ordinary-azelaic-acid-suspension-10", "medicube-deep-vita-c-capsule-cream", "the-ordinary-niacinamide-10-zinc-1", "the-ordinary-glycolic-acid-7-exfoliating-toner"], href: "/c/serums", cta: "View all" },
      { title: "Firming & anti-ageing", intro: "Retinol, peptides and repair serums for fine lines and firmness.", slugs: ["estee-lauder-advanced-night-repair-serum", "the-ordinary-retinol-05-in-squalane", "medicube-collagen-night-wrapping-mask", "la-mer-creme-de-la-mer"], href: "/c/skin-care", cta: "View all" },
      { title: "Daily sun protection", intro: "No white cast, no greasy feel, made for tropical sun.", slugs: SUNSCREENS, href: "/c/sunscreen", cta: "View all" },
      { title: "Self-care & gifts", intro: "Little luxuries and ready-wrapped sets.", slugs: ["laneige-lip-sleeping-mask-berry", "mount-lai-rose-quartz-gua-sha-facial-lifting-tool", "diptyque-baies-scented-candle", "skinora-the-glass-skin-ritual-set"], href: "/c/lifestyle", cta: "View all" },
    ],
    tips: [
      { title: "Layer light, not heavy", body: "In humidity, two thin layers (a watery essence and a gel moisturiser) feel better and hydrate more than one thick cream." },
      { title: "Sunscreen protects your results", body: "Pigmentation serums only work if you use SPF 50 every morning. Reapply before going out in the afternoon." },
      { title: "Introduce actives slowly", body: "Start retinol or acids two nights a week, and never on the same night. Patch-test new products behind the ear." },
      { title: "Perfume in the heat", body: "Fresh florals feel best in the day, while gourmand and amber scents are lovely for evenings and weddings. Keep bottles out of the car and away from sunlight." },
    ],
    faq: [
      { q: "What is a good skincare routine for women in Sri Lanka's humid weather?", a: "Morning: gentle cleanser, hydrating serum (hyaluronic acid or snail essence), gel moisturiser, SPF 50. Night: cleanse, a targeted serum (niacinamide, vitamin C, azelaic acid or retinol), then moisturiser or a sleeping mask." },
      { q: "Which serum is best for dark spots and pigmentation?", a: "Azelaic acid, niacinamide and vitamin C all fade dark spots over 8 to 12 weeks. The Ordinary Azelaic Acid Suspension 10% and Medicube Deep Vita C Capsule Cream are popular choices. Daily SPF 50 is essential, or spots come back." },
      { q: "Do you sell original Korean skincare in Sri Lanka?", a: "Yes. Skinora stocks original Medicube, COSRX, Beauty of Joseon, Laneige and Sulwhasoo, imported through authorised channels, with batch number and expiry on every product page." },
      { q: "Which women's perfumes are most popular in Sri Lanka?", a: "Miss Dior Eau de Parfum, YSL Libre, Chanel Coco Mademoiselle and Lancôme La Vie Est Belle are the best-known women's fragrances at Skinora, and all are available with gift wrapping." },
      { q: "Can I pay in instalments?", a: `Yes. Koko and Mintpay split your order into 3 interest-free payments. Cash on delivery and cards are also accepted, and delivery is free over ${free}.` },
    ],
    guides: ["skincare-routine-humid-weather-sri-lanka", "best-sunscreen-sri-lanka", "korean-skincare-sri-lanka", "original-vs-fake-skincare-perfume-sri-lanka"],
  },
};

/** Extra copy and FAQs for category pages, keyed by category slug. Shown under the product grid. */
export const CATEGORY_SEO: Record<string, { metaTitle: string; metaDescription: string; heading: string; body: string; faq: QA[] }> = {
  "skin-care": {
    metaTitle: "Skincare in Sri Lanka | Original CeraVe, The Ordinary, K-Beauty",
    metaDescription: "Buy original skincare online in Sri Lanka: CeraVe, The Ordinary, La Roche-Posay, Medicube, COSRX and more. Prices in LKR, batch and expiry shown, same-day Colombo delivery.",
    heading: "Original skincare, delivered across Sri Lanka",
    body: "Skinora stocks cleansers, toners, serums, moisturisers, sunscreens and masks from the dermatologist and Korean brands Sri Lankans search for most. Every product is authentic and imported through authorised channels, priced in LKR with duties included, and shows the batch number and expiry date before you buy.",
    faq: [
      { q: "Where can I buy original CeraVe and The Ordinary in Sri Lanka?", a: "Skinora sells original CeraVe and The Ordinary online with island-wide delivery and a showroom at 42 Flower Road, Colombo 07. Each product page shows the batch number and expiry of the unit you will receive." },
      { q: "Which skincare is best for oily skin in Sri Lanka?", a: "Use a foaming or gel cleanser, a niacinamide serum, an oil-free gel moisturiser and a fluid SPF 50. Filter this page by 'oily' skin type to see every suitable product." },
      { q: "How fast is delivery?", a: DELIVERY_SUMMARY },
    ],
  },
  sunscreen: {
    metaTitle: "Best Sunscreen in Sri Lanka | SPF 50 for Humid Weather",
    metaDescription: "Original SPF 50 sunscreens for Sri Lanka's sun and humidity: Beauty of Joseon, La Roche-Posay Anthelios and CeraVe. No white cast, prices in LKR, same-day Colombo delivery.",
    heading: "Sunscreen made for tropical sun",
    body: "Sri Lanka's UV index is high all year round, so a broad-spectrum SPF 50 is the most important step in any routine, for men and women. In humid weather, fluid and gel-cream textures sit better than thick creams and don't feel greasy.",
    faq: [
      { q: "What is the best sunscreen for Sri Lanka?", a: "A broad-spectrum SPF 50 with a light fluid or cream texture. Beauty of Joseon Relief Sun: Rice + Probiotics SPF50+ suits normal to dry skin, La Roche-Posay Anthelios UVMune 400 Invisible Fluid SPF50+ suits oily and sensitive skin, and CeraVe AM SPF 30 works as a moisturiser and sunscreen in one for low-exposure days." },
      { q: "How often should I reapply sunscreen?", a: "Every two to three hours when outdoors, and after sweating or swimming. Use about two finger lengths for the face and neck." },
    ],
  },
  fragrances: {
    metaTitle: "Original Perfume in Sri Lanka | Dior, Chanel, YSL, Tom Ford",
    metaDescription: "Original perfumes for men and women in Sri Lanka: Dior, Chanel, YSL, Lancôme, Tom Ford, Le Labo and Jo Malone. Sealed, batch-coded, prices in LKR, gift wrapping, cash on delivery.",
    heading: "Original designer and niche perfume in Sri Lanka",
    body: "Every fragrance at Skinora is sealed and sourced from the brand or an authorised distributor, never grey-market testers. Shop women's, men's and unisex scents with prices in LKR, complimentary gift wrapping on request, and same-day delivery in Colombo.",
    faq: [
      { q: "How can I tell an original perfume from a fake in Sri Lanka?", a: "Check that the batch code on the box matches the code on the bottle, the cellophane is tight and neatly folded, and the price is realistic. Skinora lists the batch number of the bottle you will receive on every product page." },
      { q: "Which perfumes last longest in Sri Lanka's heat?", a: "Eau de parfum lasts longer than eau de toilette. Woody, amber and oud scents such as Tom Ford Oud Wood, Le Labo Santal 33 and Bleu de Chanel Eau de Parfum last longest in humid weather." },
      { q: "Do you gift wrap perfume?", a: "Yes. Add gift wrapping and a handwritten message at checkout." },
    ],
  },
  men: {
    metaTitle: "Men's Perfume in Sri Lanka | Original Dior Sauvage, Bleu de Chanel",
    metaDescription: "Original men's perfume in Sri Lanka: Dior Sauvage, Bleu de Chanel, YSL Y and more. Sealed and batch-coded, prices in LKR, same-day Colombo delivery, cash on delivery.",
    heading: "Men's fragrance, guaranteed original",
    body: "Fresh, woody and aromatic fragrances for men, chosen for how they wear in Sri Lanka's heat. For a full men's routine, see the men's edit.",
    faq: [
      { q: "Which men's perfumes does Skinora stock?", a: "Dior Sauvage, Bleu de Chanel Eau de Parfum and YSL Y Eau de Parfum for men, plus unisex scents such as Tom Ford Oud Wood, Le Labo Santal 33 and Jo Malone Wood Sage & Sea Salt." },
      { q: "Is eau de toilette or eau de parfum better for Sri Lanka?", a: "Eau de parfum is more concentrated and lasts longer in heat and humidity. Eau de toilette is lighter and fresher for daytime and office wear." },
    ],
  },
  women: {
    metaTitle: "Women's Perfume in Sri Lanka | Original Miss Dior, YSL Libre, Chanel",
    metaDescription: "Original women's perfume in Sri Lanka: Miss Dior, YSL Libre, Chanel Coco Mademoiselle and Lancôme La Vie Est Belle. Sealed, prices in LKR, gift wrapping, cash on delivery.",
    heading: "Women's fragrance, guaranteed original",
    body: "Floral, fruity and gourmand fragrances for women, sealed and sourced from authorised distributors. For skincare and beauty picks, see the women's edit.",
    faq: [
      { q: "What are the best women's perfumes to gift in Sri Lanka?", a: "Miss Dior Eau de Parfum, YSL Libre, Chanel Coco Mademoiselle and Lancôme La Vie Est Belle are classic gifts. Add gift wrapping and a message at checkout." },
    ],
  },
  lifestyle: {
    metaTitle: "Luxury Lifestyle in Sri Lanka | Candles, Bath & Body, Beauty Tools",
    metaDescription: "Original Diptyque and Jo Malone candles, Aesop bath and body, and beauty tools in Sri Lanka. Prices in LKR, gift wrapping and same-day Colombo delivery.",
    heading: "Home fragrance, bath & body and beauty tools",
    body: "Scented candles, hand care and facial tools from Diptyque, Jo Malone London, Aesop and Mount Lai, ready to gift with complimentary wrapping.",
    faq: [{ q: "Do you sell Diptyque and Jo Malone candles in Sri Lanka?", a: "Yes. Skinora stocks original Diptyque Baies and Jo Malone London Pomegranate Noir candles with island-wide delivery." }],
  },
};
