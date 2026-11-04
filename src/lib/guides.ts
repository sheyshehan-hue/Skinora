/**
 * Answer-first buying guides for Sri Lankan shoppers. Each guide opens with a short, direct answer
 * (what AI assistants and featured snippets quote), then key points, detail, product picks and FAQs.
 * Keep facts checkable and update `updated` when a guide changes.
 */
import { DELIVERY_SUMMARY, type QA } from "./seo";

export type Guide = {
  slug: string;
  title: string;
  metaDescription: string;
  audience: "men" | "women" | "everyone";
  updated: string; // ISO date
  answer: string;
  keyPoints: string[];
  sections: { h: string; p: string[]; slugs?: string[] }[];
  faq: QA[];
};

export const GUIDES: Guide[] = [
  {
    slug: "best-sunscreen-sri-lanka",
    title: "Best sunscreen for Sri Lanka's sun and humidity",
    metaDescription: "Which sunscreen works best in Sri Lanka? SPF, textures and how to reapply in humid weather, with original picks from Beauty of Joseon, La Roche-Posay and CeraVe in LKR.",
    audience: "everyone",
    updated: "2026-11-04",
    answer:
      "The best sunscreen for Sri Lanka is a broad-spectrum SPF 50 in a light fluid or gel-cream texture, applied every morning and reapplied every two to three hours outdoors. Sri Lanka is close to the equator, so UV is strong all year, even on cloudy monsoon days. Oily skin suits fluids such as La Roche-Posay Anthelios; normal to dry skin suits creamier formulas such as Beauty of Joseon Relief Sun.",
    keyPoints: [
      "Choose SPF 50 and 'broad spectrum' (UVA and UVB) for daily use in Sri Lanka.",
      "Use about two finger lengths for the face and neck.",
      "Reapply every two to three hours outdoors, and after sweating or swimming.",
      "Fluids and gel-creams feel lighter in humidity than thick creams.",
      "Men need sunscreen as much as women: it is the most effective anti-ageing step.",
    ],
    sections: [
      { h: "Why SPF 50 in Sri Lanka", p: ["Sri Lanka lies between 6° and 10° north of the equator, where the midday UV index is regularly in the 'very high' to 'extreme' range. UVA rays, which cause pigmentation and ageing, are present all day and pass through clouds and car windows.", "SPF 50 blocks about 98% of UVB. In practice most people apply less than the tested amount, so starting at SPF 50 gives a better real-world result than SPF 30."] },
      { h: "Picking a texture for humid weather", p: ["If you have oily or acne-prone skin, look for 'fluid', 'invisible' or 'gel' formulas. If your skin is normal to dry, a light cream gives a dewy finish without feeling heavy. Apply sunscreen as the last step of your morning routine, after moisturiser."], slugs: ["la-roche-posay-anthelios-uvmune-400-invisible-fluid-spf50", "beauty-of-joseon-relief-sun-rice-probiotics-spf50", "cerave-am-facial-moisturising-lotion-spf-30"] },
      { h: "Reapplying over makeup or on the go", p: ["Keep a small sunscreen in your bag and reapply before stepping out after lunch. Over makeup, pat a thin layer on with a sponge. Shade, hats and sunglasses help too, especially between 10am and 3pm."] },
    ],
    faq: [
      { q: "Is SPF 30 enough in Sri Lanka?", a: "SPF 30 is acceptable for days spent mostly indoors, but SPF 50 is recommended for daily use in Sri Lanka because UV is strong all year and most people apply less sunscreen than the tested amount." },
      { q: "Do I need sunscreen on rainy or cloudy days?", a: "Yes. Most UVA passes through cloud cover, so apply sunscreen every morning regardless of the weather." },
      { q: "Which sunscreen doesn't leave a white cast?", a: "Modern chemical and hybrid filters, such as those in Beauty of Joseon Relief Sun and La Roche-Posay Anthelios UVMune 400, leave little or no white cast on medium and deeper skin tones." },
    ],
  },
  {
    slug: "mens-skincare-routine-sri-lanka",
    title: "A simple men's skincare routine for Sri Lanka",
    metaDescription: "A three-step men's skincare routine for Sri Lanka's heat: cleanser, moisturiser and SPF 50, plus fixes for oily skin, razor bumps and breakouts. Original products in LKR.",
    audience: "men",
    updated: "2026-11-04",
    answer:
      "A good men's routine for Sri Lanka takes three steps and two minutes: wash with a gel or foaming cleanser, apply a light oil-free moisturiser, and finish with SPF 50 sunscreen in the morning. At night, cleanse and add one treatment such as niacinamide for oil and pores. Keep it simple and consistent; results show in four to six weeks.",
    keyPoints: [
      "Morning: cleanser, moisturiser, SPF 50.",
      "Night: cleanser, one treatment (niacinamide or salicylic acid), moisturiser.",
      "Don't over-wash: twice a day is enough, even in the heat.",
      "For razor bumps, use salicylic acid a few nights a week.",
    ],
    sections: [
      { h: "Step 1: Cleanse", p: ["Sweat, sunscreen and pollution build up quickly in Sri Lanka's cities. A gel or foaming cleanser removes them without leaving skin tight. If you have breakouts or razor bumps, a salicylic acid cleanser also clears pores."], slugs: ["cerave-foaming-cleanser", "cosrx-low-ph-good-morning-gel-cleanser", "cerave-sa-smoothing-cleanser"] },
      { h: "Step 2: Moisturise", p: ["Even oily skin needs moisture; skipping it can make skin produce more oil. Choose a gel or lotion that absorbs in under a minute."], slugs: ["clinique-moisture-surge-100h-auto-replenishing-hydrator", "cerave-pm-facial-moisturising-lotion"] },
      { h: "Step 3: Protect", p: ["Sunscreen prevents dark spots, uneven tone and early wrinkles. Use a fluid SPF 50 that doesn't look shiny."], slugs: ["la-roche-posay-anthelios-uvmune-400-invisible-fluid-spf50", "beauty-of-joseon-relief-sun-rice-probiotics-spf50"] },
      { h: "Optional: treat oil and breakouts", p: ["Niacinamide reduces shine and the look of pores. Effaclar Duo+M works as a spot treatment. Add one new product at a time so you can see what works."], slugs: ["the-ordinary-niacinamide-10-zinc-1", "la-roche-posay-effaclar-duom"] },
    ],
    faq: [
      { q: "Can men use the same skincare as women?", a: "Yes. Skin biology is the same; men's skin is often oilier, so gel textures and oil-control ingredients such as niacinamide tend to suit it well." },
      { q: "What should I use after shaving?", a: "A fragrance-free moisturiser right after shaving, and a salicylic acid product a few nights a week to prevent ingrown hairs and razor bumps." },
    ],
  },
  {
    slug: "skincare-routine-humid-weather-sri-lanka",
    title: "Skincare routine for humid weather in Sri Lanka",
    metaDescription: "How to build a skincare routine for Sri Lanka's humid climate: light layers, the right serums for glow and pigmentation, and daily SPF. Original products in LKR.",
    audience: "women",
    updated: "2026-11-04",
    answer:
      "In Sri Lanka's humid climate, use fewer, lighter layers: a gentle cleanser, a watery hydrating serum or essence, a gel moisturiser and SPF 50 in the morning. At night, add one targeted serum such as niacinamide, vitamin C, azelaic acid or retinol. Humidity keeps skin hydrated on the surface, so heavy creams often cause congestion rather than extra moisture.",
    keyPoints: [
      "Swap heavy creams for gels, essences and sleeping masks.",
      "Hyaluronic acid and snail mucin hydrate without weight.",
      "Pick one active per night: niacinamide, vitamin C, azelaic acid or retinol.",
      "SPF 50 every morning protects against pigmentation.",
    ],
    sections: [
      { h: "Morning", p: ["Cleanse gently, apply a hydrating serum or essence on damp skin, follow with a gel moisturiser, then SPF 50."], slugs: ["cosrx-low-ph-good-morning-gel-cleanser", "cosrx-advanced-snail-96-mucin-power-essence", "the-ordinary-hyaluronic-acid-2-b5", "beauty-of-joseon-relief-sun-rice-probiotics-spf50"] },
      { h: "Evening", p: ["Remove sunscreen and makeup with a cleanser (an oil or balm first if you wear heavy makeup). Then use one targeted serum and finish with a moisturiser or sleeping mask."], slugs: ["the-ordinary-squalane-cleanser", "beauty-of-joseon-glow-serum-propolis-niacinamide", "the-ordinary-azelaic-acid-suspension-10", "laneige-water-sleeping-mask"] },
      { h: "Weekly", p: ["Exfoliate once or twice a week with a gentle acid toner to keep skin bright, but never on the same night as retinol."], slugs: ["the-ordinary-glycolic-acid-7-exfoliating-toner", "medicube-zero-pore-pad-20"] },
    ],
    faq: [
      { q: "Do I need a moisturiser if my skin feels sticky in humidity?", a: "Yes, but choose a gel. Stickiness usually comes from heavy creams or too many layers, not from moisturiser itself." },
      { q: "When will I see results from a pigmentation serum?", a: "Most people see brighter, more even skin in 8 to 12 weeks with daily SPF 50." },
    ],
  },
  {
    slug: "original-vs-fake-skincare-perfume-sri-lanka",
    title: "How to spot fake skincare and perfume in Sri Lanka",
    metaDescription: "How to tell original skincare and perfume from fakes in Sri Lanka: batch codes, packaging, expiry, price and seller checks. How Skinora guarantees authenticity.",
    audience: "everyone",
    updated: "2026-11-04",
    answer:
      "To avoid fake skincare and perfume in Sri Lanka, buy from sellers who source from the brand or an authorised distributor, and check that the batch code on the box matches the one on the product, the packaging is sealed and sharply printed, the expiry or production date is clear, and the price is realistic. Skinora shows the batch number and expiry of the exact unit you will receive before you pay.",
    keyPoints: [
      "Batch code on the box should match the code on the bottle or tube.",
      "Look for clean printing, correct spelling and a tight, neat seal.",
      "Prices far below the usual market price are a warning sign.",
      "Ask the seller where the product was imported from.",
    ],
    sections: [
      { h: "Check the batch code and expiry", p: ["Every genuine product has a batch (lot) code. On perfume it is usually printed on the base of the bottle and the box; on skincare it is on the crimp of the tube or the base of the jar. The two should match. Skincare also carries an expiry date or a 'period after opening' symbol."] },
      { h: "Check the packaging", p: ["Original boxes have sharp printing, even colours and correctly spelled ingredient lists. Perfume cellophane is tight with neat folds. Testers, unboxed bottles and 'first copy' products are not covered by any brand guarantee."] },
      { h: "Check the seller", p: ["Ask where stock comes from. Skinora imports through brand-authorised distributors and records each batch with supplier, import reference and expiry, which is why the batch and expiry are on every product page."] },
    ],
    faq: [
      { q: "Is Skinora an authorised seller?", a: "Skinora sources every product from the brand or an authorised distributor and shows the batch number, expiry and import origin of each item before you buy. Every import is cleared through Sri Lanka Customs and recorded against its batch." },
      { q: "What should I do if I think I bought a fake?", a: "Stop using it, keep the packaging and contact the seller. If you bought it from Skinora, message us on WhatsApp with a photo and we will collect and refund it." },
    ],
  },
  {
    slug: "long-lasting-perfume-sri-lanka-heat",
    title: "Perfumes that last in Sri Lanka's heat",
    metaDescription: "Which perfumes last longest in Sri Lanka's heat and humidity, for men and women, and how to make any fragrance last longer. Original Dior, Chanel, YSL and Tom Ford in LKR.",
    audience: "everyone",
    updated: "2026-11-04",
    answer:
      "In Sri Lanka's heat, eau de parfum lasts longer than eau de toilette, and woody, amber, oud and musky scents last longer than citrus. For men, Bleu de Chanel Eau de Parfum, YSL Y Eau de Parfum and Tom Ford Oud Wood are long-wearing choices; for women, Lancôme La Vie Est Belle, YSL Libre and Miss Dior Eau de Parfum. Apply to moisturised skin on pulse points and don't rub your wrists.",
    keyPoints: [
      "Eau de parfum (EDP) > eau de toilette (EDT) for longevity.",
      "Base notes such as wood, amber, vanilla, oud and musk last longest.",
      "Spray on moisturised skin and clothes; heat helps scent project.",
      "Store bottles away from sunlight and out of the car.",
    ],
    sections: [
      { h: "For him", p: ["Woody aromatic scents work day to night in the tropics."], slugs: ["chanel-bleu-de-chanel-eau-de-parfum", "ysl-beauty-y-eau-de-parfum", "dior-sauvage-eau-de-toilette", "tom-ford-oud-wood-eau-de-parfum"] },
      { h: "For her", p: ["Gourmand and floral-amber scents last well and suit evenings and weddings."], slugs: ["lancome-la-vie-est-belle-eau-de-parfum", "ysl-beauty-libre-eau-de-parfum", "dior-miss-dior-eau-de-parfum", "chanel-coco-mademoiselle-eau-de-parfum"] },
      { h: "Unisex", p: ["Skin-scent woods and clean musks that anyone can wear."], slugs: ["le-labo-santal-33-eau-de-parfum", "jo-malone-london-wood-sage-sea-salt-cologne", "maison-margiela-replica-lazy-sunday-morning"] },
    ],
    faq: [
      { q: "Why does my perfume fade quickly in Sri Lanka?", a: "Heat makes fragrance evaporate faster and humidity can mute it. Use eau de parfum, apply on moisturised skin, and choose scents with strong base notes." },
      { q: "How should I store perfume in a hot climate?", a: "Keep it in its box in a cool, dark cupboard. Avoid bathrooms, windowsills and cars, where heat and light break down the fragrance." },
    ],
  },
  {
    slug: "korean-skincare-sri-lanka",
    title: "Korean skincare in Sri Lanka: where to start",
    metaDescription: "A beginner's guide to original Korean skincare in Sri Lanka: the K-beauty steps that matter in humid weather and the Medicube, COSRX, Beauty of Joseon and Laneige products to start with.",
    audience: "women",
    updated: "2026-11-04",
    answer:
      "Korean skincare suits Sri Lanka's humid climate because it relies on light, layered hydration rather than heavy creams. Start with four steps: a low-pH gel cleanser, a hydrating essence such as COSRX Snail 96 Mucin, a light moisturiser or sleeping mask, and a Korean sunscreen such as Beauty of Joseon Relief Sun SPF50+. Add one serum for your main concern once your skin is used to the routine.",
    keyPoints: [
      "You don't need ten steps: four is enough to start.",
      "Essences and serums hydrate without weight in humidity.",
      "Korean sunscreens are light and cosmetically elegant.",
      "Buy original: check batch and expiry, especially for popular K-beauty items.",
    ],
    sections: [
      { h: "The four-step starter routine", p: ["Cleanse, hydrate, moisturise, protect. Use it morning and night (skip sunscreen at night)."], slugs: ["cosrx-low-ph-good-morning-gel-cleanser", "cosrx-advanced-snail-96-mucin-power-essence", "laneige-water-sleeping-mask", "beauty-of-joseon-relief-sun-rice-probiotics-spf50"] },
      { h: "Add one serum", p: ["For glow and redness, propolis and niacinamide. For firmness, PDRN and peptides. For dullness, vitamin C."], slugs: ["beauty-of-joseon-glow-serum-propolis-niacinamide", "medicube-pdrn-pink-peptide-serum", "medicube-deep-vita-c-capsule-cream"] },
    ],
    faq: [
      { q: "Is Korean skincare good for oily skin?", a: "Yes. Most K-beauty products are lightweight. Choose gel cleansers, watery essences and gel moisturisers, and use exfoliating pads such as Medicube Zero Pore Pad two or three times a week." },
      { q: "How long does delivery of Korean skincare take?", a: `Skinora keeps K-beauty in stock in Colombo, so there is no overseas wait. ${DELIVERY_SUMMARY}` },
    ],
  },
];

export const guideBySlug = (slug: string) => GUIDES.find((g) => g.slug === slug);
