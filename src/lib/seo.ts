/**
 * SEO and GEO (generative engine optimisation) helpers for the Sri Lankan market.
 * One place for the store's facts, so search engines, AI assistants, llms.txt and the
 * visible pages all say the same thing.
 */
import { COD_LIMIT, FREE_SHIPPING_THRESHOLD, PAYMENT_METHODS } from "./constants";
import { LOCALES } from "@/i18n";

export const SITE = (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, "");

/** Turn a site-relative path (or an absolute Cloudinary URL) into an absolute URL. */
export function abs(path: string) {
  if (/^https?:\/\//.test(path)) return path;
  return `${SITE}${path.startsWith("/") ? "" : "/"}${path}`;
}

// Keep these in step with the Footer and the Google Business Profile (name, address, phone must match exactly).
export const STORE = {
  name: "Skinora",
  legalName: "Skinora Imports (Pvt) Ltd",
  tagline: "Authentic luxury skincare, fragrance and lifestyle in Sri Lanka",
  email: "care@skinora.lk",
  phone: "+94 77 123 4567",
  whatsapp: process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ?? "94771234567",
  street: "42 Flower Road",
  locality: "Colombo 07",
  city: "Colombo",
  region: "Western Province",
  postalCode: "00700",
  country: "LK",
  geo: { lat: 6.9105, lng: 79.8603 }, // Flower Road, Colombo 07. Use the pin from Google Business Profile once verified.
  hours: "Mo-Sa 10:00-19:00",
  returnDays: 14,
  sameDayCutoff: "1pm",
  founded: "2024",
  social: (process.env.NEXT_PUBLIC_SOCIAL_LINKS ?? "").split(",").map((s) => s.trim()).filter(Boolean),
} as const;

export const DELIVERY_SUMMARY =
  `Same-day delivery in Colombo for orders placed before ${STORE.sameDayCutoff}, next-day to Gampaha, Kalutara, Kandy, Galle and Kurunegala, and 2 to 5 working days to every other district. Free island-wide delivery over LKR ${FREE_SHIPPING_THRESHOLD.toLocaleString("en-LK")}.`;

export const PAYMENT_SUMMARY = `${PAYMENT_METHODS.map((p) => p.label).join(", ")}. Cash on delivery up to LKR ${COD_LIMIT.toLocaleString("en-LK")}. Koko and Mintpay split the price into 3 interest-free instalments.`;

/** Search phrases Sri Lankan shoppers actually type. Used for meta keywords and to steer copy. */
export const LK_KEYWORDS = [
  "skincare Sri Lanka",
  "authentic skincare Sri Lanka",
  "original perfume Sri Lanka",
  "perfume price in Sri Lanka",
  "men's skincare Sri Lanka",
  "women's skincare Sri Lanka",
  "Korean skincare Sri Lanka",
  "sunscreen Sri Lanka",
  "CeraVe Sri Lanka",
  "The Ordinary Sri Lanka",
  "online beauty store Colombo",
  "cash on delivery skincare Sri Lanka",
];

/** hreflang map. Only languages switched on in src/i18n get an alternate. Before enabling si or ta there, add the /si and /ta routes this points to. */
export function languageAlternates(path: string) {
  const langs: Record<string, string> = { "en-LK": abs(path), "x-default": abs(path) };
  for (const l of LOCALES) if (l.enabled && l.code !== "en") langs[`${l.code}-LK`] = abs(`/${l.code}${path === "/" ? "" : path}`);
  return langs;
}

/** Standard `alternates` block for a page: canonical plus hreflang. */
export function alternates(path: string) {
  return { canonical: path, languages: languageAlternates(path) };
}

const STORE_ID = `${SITE}/#store`;
const ORG_ID = `${SITE}/#organization`;

export const sellerRef = { "@type": "Organization", "@id": ORG_ID, name: STORE.name };

export const shippingDetails = {
  "@type": "OfferShippingDetails",
  shippingRate: { "@type": "MonetaryAmount", minValue: 0, maxValue: 750, currency: "LKR" },
  shippingDestination: { "@type": "DefinedRegion", addressCountry: "LK" },
  deliveryTime: {
    "@type": "ShippingDeliveryTime",
    handlingTime: { "@type": "QuantitativeValue", minValue: 0, maxValue: 1, unitCode: "DAY" },
    transitTime: { "@type": "QuantitativeValue", minValue: 0, maxValue: 5, unitCode: "DAY" },
  },
};

export const returnPolicy = {
  "@type": "MerchantReturnPolicy",
  applicableCountry: "LK",
  returnPolicyCategory: "https://schema.org/MerchantReturnFiniteReturnWindow",
  merchantReturnDays: STORE.returnDays,
  returnMethod: "https://schema.org/ReturnByMail",
  returnFees: "https://schema.org/FreeReturn",
};

const address = {
  "@type": "PostalAddress",
  streetAddress: STORE.street,
  addressLocality: STORE.locality,
  addressRegion: STORE.region,
  postalCode: STORE.postalCode,
  addressCountry: STORE.country,
};

/** Organization + the Colombo atelier (LocalBusiness) + WebSite with sitelinks search. Rendered on every page. */
export function siteGraph() {
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": ORG_ID,
        name: STORE.name,
        legalName: STORE.legalName,
        url: SITE,
        logo: abs("/icon.svg"),
        email: STORE.email,
        telephone: STORE.phone,
        address,
        areaServed: { "@type": "Country", name: "Sri Lanka" },
        sameAs: STORE.social,
        contactPoint: [
          { "@type": "ContactPoint", contactType: "customer service", telephone: STORE.phone, email: STORE.email, areaServed: "LK", availableLanguage: ["English", "Sinhala", "Tamil"] },
        ],
      },
      {
        "@type": ["OnlineStore", "HealthAndBeautyBusiness"],
        "@id": STORE_ID,
        name: `${STORE.name} Atelier, Colombo 07`,
        description: `${STORE.tagline}. 100% authentic products from authorised distributors, with batch number and expiry shown before you buy.`,
        url: SITE,
        image: abs("/icon.svg"),
        parentOrganization: { "@id": ORG_ID },
        telephone: STORE.phone,
        email: STORE.email,
        address,
        geo: { "@type": "GeoCoordinates", latitude: STORE.geo.lat, longitude: STORE.geo.lng },
        openingHours: STORE.hours,
        priceRange: "LKR 3,950 – LKR 205,000",
        currenciesAccepted: "LKR",
        paymentAccepted: "Credit Card, Debit Card, Koko, Mintpay, Bank Transfer, Cash on Delivery",
        areaServed: { "@type": "Country", name: "Sri Lanka" },
        hasMerchantReturnPolicy: returnPolicy,
      },
      {
        "@type": "WebSite",
        "@id": `${SITE}/#website`,
        url: SITE,
        name: STORE.name,
        inLanguage: "en-LK",
        publisher: { "@id": ORG_ID },
        potentialAction: { "@type": "SearchAction", target: { "@type": "EntryPoint", urlTemplate: `${SITE}/search?q={search_term_string}` }, "query-input": "required name=search_term_string" },
      },
    ],
  };
}

export type QA = { q: string; a: string };

export function faqLd(items: QA[]) {
  return { "@context": "https://schema.org", "@type": "FAQPage", mainEntity: items.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })) };
}

export function itemListLd(name: string, items: { slug: string; name: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name,
    itemListElement: items.map((p, i) => ({ "@type": "ListItem", position: i + 1, url: abs(`/p/${p.slug}`), name: p.name })),
  };
}

/** Safe JSON-LD: escapes "<" so product copy can never close the script tag. */
export function ldJson(data: unknown) {
  return { __html: JSON.stringify(data).replace(/</g, "\\u003c") };
}

/** Store-wide questions. Shown on /faq and summarised in llms.txt. */
export const STORE_FAQ: QA[] = [
  {
    q: "Are Skinora products original?",
    a: "Yes. Every product is 100% authentic and bought from the brand or its authorised distributor. Each product page shows the batch number and expiry date of the unit you will receive, and the import origin, before you pay.",
  },
  {
    q: "How long does delivery take in Sri Lanka?",
    a: DELIVERY_SUMMARY,
  },
  {
    q: "Can I pay cash on delivery?",
    a: `Yes. Cash on delivery is available island-wide for orders up to LKR ${COD_LIMIT.toLocaleString("en-LK")}. You can also pay by Visa, Mastercard or Amex through PayHere, by bank transfer, or in 3 interest-free instalments with Koko or Mintpay.`,
  },
  {
    q: "Are prices in Sri Lankan rupees?",
    a: "Yes. All prices are in LKR and include import duties and taxes. There are no extra charges at the door apart from the delivery fee shown at checkout, which is free over LKR " + FREE_SHIPPING_THRESHOLD.toLocaleString("en-LK") + ".",
  },
  {
    q: "What is the return policy?",
    a: `Unopened products in their original seal can be returned within ${STORE.returnDays} days of delivery for a refund or exchange. Opened items can be returned if faulty or if you have a reaction. Message us on WhatsApp with a photo and we arrange collection.`,
  },
  {
    q: "Do you have a physical store?",
    a: `Yes. The Skinora Atelier is at ${STORE.street}, ${STORE.locality}, open Monday to Saturday, 10am to 7pm. You can also reach us on WhatsApp or at ${STORE.phone}.`,
  },
  {
    q: "Do you sell men's skincare and fragrance?",
    a: "Yes. The men's edit covers cleansers, oil-control moisturisers, sunscreen and acne care suited to Sri Lanka's heat and humidity, plus men's fragrances from Dior, Chanel and YSL. See /men.",
  },
  {
    q: "How do I know a product suits my skin?",
    a: "Take the free skin quiz at /quiz. It asks five questions about your skin type, concerns and routine and builds a morning and evening routine for Sri Lanka's climate. Every product page also lists the skin types it suits.",
  },
];
