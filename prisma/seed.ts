/**
 * Seeds Skinora with a realistic catalogue and ~18 months of simulated sales,
 * so the dashboard has real-looking charts on day one.
 *
 *   npm run db:seed
 */
import { PrismaClient, type OrderStatus, type PaymentMethod, type Prisma } from "@prisma/client";
import bcrypt from "bcryptjs";
import { randomUUID } from "crypto";
import fs from "fs";
import path from "path";
import { BRANDS, CATEGORIES, PAIRS, PRODUCTS, type ProductSeed } from "./data/catalogue";
import { DISTRICTS } from "../src/lib/districts";
import { brandLogoSVG, packshotSVG, sceneSVG, textureSVG, type ArtSpec } from "../src/lib/art";
import { slugify } from "../src/lib/format";

const prisma = new PrismaClient();

// ───────── deterministic randomness
let seed = 20261027;
function rand() {
  seed |= 0;
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
const pick = <T,>(a: readonly T[]) => a[Math.floor(rand() * a.length)];
const between = (a: number, b: number) => a + Math.floor(rand() * (b - a + 1));
function weighted<T>(items: readonly T[], weight: (t: T) => number) {
  const total = items.reduce((s, i) => s + weight(i), 0);
  let r = rand() * total;
  for (const i of items) {
    r -= weight(i);
    if (r <= 0) return i;
  }
  return items[items.length - 1];
}
const DAY = 86_400_000;
const NOW = new Date();
NOW.setMinutes(0, 0, 0);
const daysAgo = (d: number) => new Date(NOW.getTime() - d * DAY);
const daysFromNow = (d: number) => new Date(NOW.getTime() + d * DAY);

const PUBLIC = path.join(__dirname, "..", "public", "media");
function writeMedia(rel: string, svg: string) {
  const file = path.join(PUBLIC, rel);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, svg);
  return `/media/${rel}`;
}

const spec = (p: ProductSeed): ArtSpec => ({
  shape: p.shape,
  brand: p.brand.replace(" Beauty", "").replace(" London", ""),
  name: p.name.replace(/ Eau de (Parfum|Toilette)$/, "").replace(/^REPLICA /, ""),
  body: p.colors[0],
  cap: p.colors[1],
  ink: p.colors[2],
  bg: p.colors[3],
});

// ───────── people
const FIRST = ["Nethmi", "Tharushi", "Dinithi", "Sanduni", "Kavindya", "Ishara", "Hiruni", "Piumi", "Sachini", "Amaya", "Dilini", "Chamodi", "Anjali", "Shalini", "Priyanka", "Fathima", "Aisha", "Zainab", "Nuwan", "Kasun", "Dilan", "Ravindu", "Shehan", "Tharindu", "Isuru", "Pasindu", "Arjun", "Karthik", "Rizwan", "Malsha", "Hasini", "Yasodha", "Senuri", "Thisuri", "Methmi", "Rashmi", "Natasha", "Nadia", "Lakshika", "Vihangi"];
const LAST = ["Perera", "Fernando", "Silva", "de Silva", "Jayawardena", "Wickramasinghe", "Gunawardena", "Bandara", "Rajapaksha", "Senanayake", "Dissanayake", "Herath", "Ranasinghe", "Wijesinghe", "Abeysekera", "Karunaratne", "Mendis", "Peiris", "Cooray", "Rodrigo", "Sivakumar", "Rahman", "Ismail", "Nadarajah", "Jayasuriya", "Amarasinghe"];
const CITY: Record<string, string[]> = {
  Colombo: ["Colombo 03", "Colombo 05", "Colombo 07", "Rajagiriya", "Nugegoda", "Battaramulla", "Dehiwala", "Mount Lavinia", "Kotte", "Colombo 04"],
  Gampaha: ["Negombo", "Ja-Ela", "Kadawatha", "Kiribathgoda", "Wattala", "Gampaha"],
  Kandy: ["Kandy", "Peradeniya", "Katugastota"],
  Galle: ["Galle", "Hikkaduwa", "Unawatuna"],
  Kalutara: ["Panadura", "Kalutara", "Wadduwa"],
};
const DISTRICT_WEIGHT: Record<string, number> = { Colombo: 38, Gampaha: 17, Kandy: 8, Kalutara: 6, Galle: 5, Kurunegala: 4, Matara: 3, Jaffna: 3, Negombo: 0 };

const REVIEW_BITS = {
  5: [
    ["Holy grail", "My skin has never looked this good. Authentic and arrived beautifully packed."],
    ["Worth every rupee", "Exactly as the original I bought in Singapore. The batch and expiry were clearly listed, which I love."],
    ["Obsessed", "Third bottle already. Fast delivery to Colombo 07, next day."],
    ["Beautiful packaging", "Ordered as a gift with wrapping and it looked like it came from a boutique in Paris."],
    ["Finally genuine", "So relieved to find an authentic store in Sri Lanka. No more fakes from marketplaces."],
  ],
  4: [
    ["Really good", "Works well in our humidity. Took a couple of weeks to see a difference."],
    ["Lovely", "Great product, delivery to Kandy took two days. Would buy again."],
    ["Solid", "Does what it says. Wish there was a bigger size available."],
  ],
  3: [
    ["Okay for me", "Nice texture but I did not see dramatic results. Service was excellent though."],
    ["Average", "Fine, but my skin prefers something lighter for the heat."],
  ],
};

async function main() {
  console.log("Clearing database…");
  const tables = await prisma.$queryRaw<{ tablename: string }[]>`SELECT tablename FROM pg_tables WHERE schemaname='public' AND tablename <> '_prisma_migrations'`;
  await prisma.$executeRawUnsafe(`TRUNCATE ${tables.map((t) => `"${t.tablename}"`).join(", ")} CASCADE`);
  // Regenerate the drawn product art, but keep the editorial photographs, which are checked in
  for (const dir of fs.existsSync(PUBLIC) ? fs.readdirSync(PUBLIC) : []) if (dir !== "editorial") fs.rmSync(path.join(PUBLIC, dir), { recursive: true, force: true });

  // ───────── staff
  const pw = await bcrypt.hash("Skinora@2026", 10);
  await prisma.staffUser.createMany({
    data: [
      { email: "admin@skinora.lk", name: "Shehan (Admin)", passwordHash: pw, role: "ADMIN" },
      { email: "stock@skinora.lk", name: "Ishara (Inventory)", passwordHash: pw, role: "INVENTORY_MANAGER" },
      { email: "orders@skinora.lk", name: "Kasun (Orders)", passwordHash: pw, role: "ORDER_HANDLER" },
    ],
  });

  // ───────── delivery zones & settings
  await prisma.deliveryZone.createMany({ data: DISTRICTS.map((d) => ({ ...d, codAvailable: true })) });
  await prisma.setting.createMany({
    data: [
      { key: "whatsapp", value: { number: "94771234567", greeting: "Hello Skinora, I need help with an order." } },
      { key: "announcement", value: { text: "Complimentary island-wide delivery over LKR 15,000 · Same-day in Colombo before 1pm" } },
    ],
  });

  // ───────── suppliers
  const suppliers = await Promise.all(
    [
      { name: "Seoul Beauty Distribution Co.", country: "South Korea", email: "export@seoulbeauty.kr" },
      { name: "Parfums Europe SAS", country: "France", email: "orders@parfumseurope.fr" },
      { name: "Luxe Brands DMCC", country: "United Arab Emirates", email: "trade@luxebrands.ae" },
      { name: "Derma Supply Pte Ltd", country: "Singapore", email: "sales@dermasupply.sg" },
    ].map((s) => prisma.supplier.create({ data: s })),
  );
  const supplierFor = (origin: string) =>
    origin === "South Korea" ? suppliers[0] : origin === "France" ? suppliers[1] : origin === "United States" || origin === "Canada" ? pick([suppliers[2], suppliers[3]]) : suppliers[2];

  // ───────── brands
  console.log("Brands, categories & media…");
  const brandRows = new Map<string, { id: string; origin: string }>();
  for (const [i, b] of BRANDS.entries()) {
    const slug = slugify(b.name);
    const logoUrl = writeMedia(`brands/${slug}.svg`, brandLogoSVG(b.name));
    const row = await prisma.brand.create({
      data: { name: b.name, slug, origin: b.origin, description: b.description, featured: !!b.featured, isLuxury: !!b.isLuxury, logoUrl, sortOrder: i },
    });
    brandRows.set(b.name, { id: row.id, origin: b.origin });
  }

  // ───────── categories
  const catRows = new Map<string, string>();
  for (const [i, c] of CATEGORIES.entries()) {
    const sample = PRODUCTS.filter((p) => (c.slug === "luxury" ? p.luxury : c.children.some((ch) => ch.slug === p.category))).slice(0, 3).map(spec);
    const imageUrl = writeMedia(`categories/${c.slug}.svg`, sceneSVG({ bg: "#EFE8DC", arch: "#E2D3B8", items: sample, portrait: true }));
    const parent = await prisma.category.create({
      data: {
        name: c.name, slug: c.slug, description: c.description, imageUrl, sortOrder: i,
        translations: { si: { name: null }, ta: { name: null } },
      },
    });
    catRows.set(c.slug, parent.id);
    for (const [j, ch] of c.children.entries()) {
      const kids = PRODUCTS.filter((p) => p.category === ch.slug).slice(0, 2).map(spec);
      const img = kids.length ? writeMedia(`categories/${ch.slug}.svg`, sceneSVG({ bg: "#F1EBE1", arch: "#E7DAC3", items: kids, portrait: true })) : null;
      const row = await prisma.category.create({ data: { name: ch.name, slug: ch.slug, description: ch.description, parentId: parent.id, sortOrder: j, imageUrl: img } });
      catRows.set(ch.slug, row.id);
    }
  }

  // ───────── products
  console.log("Products…");
  type VRow = { id: string; productId: string; productName: string; name: string; price: number; salePrice: number | null; costPrice: number; popularity: number; isFragrance: boolean; luxury: boolean };
  const variants: VRow[] = [];
  const productIdByName = new Map<string, string>();
  const productBySlug = new Map<string, { id: string; seed: ProductSeed }>();
  let skuN = 1000;
  for (const p of PRODUCTS) {
    const brand = brandRows.get(p.brand)!;
    const slug = slugify(`${p.brand} ${p.name}`);
    const s = spec(p);
    const img1 = writeMedia(`products/${slug}-1.svg`, packshotSVG(s, "a"));
    const img2 = writeMedia(`products/${slug}-2.svg`, textureSVG(s, p.texture, "b"));
    const isFragrance = !!p.gender;
    const howToUse =
      p.howToUse ??
      (isFragrance
        ? "Spray onto pulse points (wrists, neck and behind the ears) from 15 cm. For a softer trail, mist into the air and walk through it. Store away from heat and direct sunlight."
        : p.category === "sunscreen"
          ? "Apply generously as the last step of your morning routine, 15 minutes before sun exposure. Reapply every two hours, and after swimming or sweating."
          : p.category === "cleansers"
            ? "Massage onto damp skin morning and evening, then rinse thoroughly with lukewarm water."
            : p.category === "masks-treatments"
              ? "Apply to clean skin as directed, two to three times a week or as an overnight step. Follow with SPF in the morning."
              : p.category === "tools"
                ? "Apply a facial oil, then glide the tool outward and upward along the jawline, cheeks and brow with light pressure, five strokes per area."
                : "Apply a few drops or a pea-sized amount to clean skin, morning and/or evening. Follow with moisturiser and SPF in the daytime.");
    const ingredients =
      p.ingredients ??
      (isFragrance
        ? "Alcohol, Parfum (Fragrance), Aqua (Water), Limonene, Linalool, Coumarin, Citronellol, Geraniol, Benzyl Salicylate."
        : `Aqua (Water), Glycerin, ${p.keyIngredients.join(", ")}${p.keyIngredients.length ? ", " : ""}Butylene Glycol, 1,2-Hexanediol, Carbomer, Tromethamine, Ethylhexylglycerin, Disodium EDTA.`);
    const product = await prisma.product.create({
      data: {
        name: p.name,
        slug,
        brandId: brand.id,
        categoryId: catRows.get(p.category)!,
        tagline: p.tagline,
        description: p.notes ? `${p.description}\n\n${p.notes}` : p.description,
        ingredients,
        keyIngredients: p.keyIngredients,
        howToUse,
        skinTypes: p.skinTypes ?? [],
        concerns: p.concerns ?? [],
        gender: p.gender ?? null,
        isLuxury: !!p.luxury,
        isNew: !!p.isNew,
        isBestSeller: p.popularity >= 7,
        featured: p.popularity >= 8 || !!p.luxury,
        originCountry: brand.origin,
        metaDescription: `${p.brand} ${p.name}: ${p.tagline}. 100% authentic, imported to Sri Lanka with batch and expiry details. Delivered island-wide.`,
        images: {
          create: [
            { url: img1, alt: `${p.brand} ${p.name}`, sortOrder: 0, width: 800, height: 1000 },
            { url: img2, alt: `${p.brand} ${p.name} texture`, sortOrder: 1, width: 800, height: 1000 },
          ],
        },
      },
    });
    productIdByName.set(p.name, product.id);
    productBySlug.set(slug, { id: product.id, seed: p });
    for (const [i, [name, price, sale]] of p.variants.entries()) {
      const margin = isFragrance ? 0.66 : p.luxury ? 0.6 : 0.56 + rand() * 0.08;
      const costPrice = Math.round((price * margin) / 10) * 10;
      const v = await prisma.variant.create({
        data: {
          productId: product.id,
          name,
          sku: `SK-${p.brand.slice(0, 3).toUpperCase().replace(/[^A-Z]/g, "X")}-${skuN++}`,
          price,
          salePrice: sale ?? null,
          costPrice,
          reorderLevel: p.popularity >= 7 ? 20 : 8,
          leadTimeDays: brand.origin === "South Korea" ? 14 : 21,
          sortOrder: i,
        },
      });
      variants.push({ id: v.id, productId: product.id, productName: p.name, name, price, salePrice: sale ?? null, costPrice, popularity: p.popularity * (i === 0 ? 1 : 0.55), isFragrance, luxury: !!p.luxury });
    }
  }

  // ───────── customers
  console.log("Customers…");
  const custPw = await bcrypt.hash("demo1234", 10);
  type Cust = { id: string; email: string; name: string; phone: string; district: string; createdAt: Date; registered: boolean; loyalty: number; propensity: number };
  const customers: Cust[] = [];
  const usedEmails = new Set<string>();
  const districtPick = () => weighted(DISTRICTS, (d) => DISTRICT_WEIGHT[d.district] ?? 1).district;
  function makeCustomer(createdAt: Date, forceName?: string): Cust {
    const first = forceName?.split(" ")[0] ?? pick(FIRST);
    const last = forceName?.split(" ")[1] ?? pick(LAST);
    let email = `${first}.${last}`.toLowerCase().replace(/[^a-z.]/g, "") + "@gmail.com";
    let n = 2;
    while (usedEmails.has(email)) email = email.replace(/(\d*)@/, `${n++}@`);
    usedEmails.add(email);
    const c: Cust = {
      id: randomUUID(),
      email,
      name: `${first} ${last}`,
      phone: `+94 7${pick(["0", "1", "2", "5", "6", "7", "8"])} ${between(100, 999)} ${between(1000, 9999)}`,
      district: districtPick(),
      createdAt,
      registered: rand() < 0.62,
      loyalty: 0,
      propensity: rand() < 0.12 ? 6 + rand() * 6 : rand() < 0.45 ? 1.5 + rand() * 2 : 0.4,
    };
    customers.push(c);
    return c;
  }
  const demo = makeCustomer(daysAgo(420), "Amaya Perera");
  demo.email = "demo@skinora.lk";
  demo.registered = true;
  demo.propensity = 10;
  demo.district = "Colombo";

  // ───────── orders: ~18 months of simulated demand
  console.log("Simulating 18 months of orders…");
  const START_DAYS = 545;
  const promoCodes = ["WELCOME10", "GLOW15", "AVURUDU15", "VALENTINE2K", "FREESHIP"];
  const orders: (Prisma.OrderCreateManyInput & { id: string; createdAt: Date })[] = [];
  const items: Prisma.OrderItemCreateManyInput[] = [];
  const events: { id: string; orderId: string; status: OrderStatus; note: string | null; createdAt: Date }[] = [];
  const sessions: { id: string; email: string | null; itemCount: number; value: number; items: object; orderId: string | null; createdAt: Date }[] = [];
  const loyalty: { id: string; customerId: string; points: number; reason: string; orderId: string; createdAt: Date }[] = [];
  const unitsByVariant = new Map<string, { total: number; last30: number; last90: number }>();
  let orderNo = 100000;

  const season = (d: Date) => {
    const m = d.getMonth();
    const day = d.getDate();
    let mult = 1;
    let fragranceBoost = 1;
    if (m === 3 && day <= 14) mult *= 1.75; // Sinhala & Tamil New Year
    if (m === 1 && day <= 14) {
      mult *= 1.55;
      fragranceBoost = 2.4;
    } // Valentine's
    if (m === 11 && day <= 26) {
      mult *= 2.0;
      fragranceBoost = 2.0;
    } // Christmas
    if (m === 10 && day >= 24) mult *= 1.6; // Black Friday / Cyber week
    if (m === 4 || m === 5) mult *= 0.92; // monsoon lull
    if (d.getDay() === 0 || d.getDay() === 6) mult *= 1.15;
    return { mult, fragranceBoost };
  };

  for (let d = START_DAYS; d >= 0; d--) {
    const date = daysAgo(d);
    const growth = 3.2 + (START_DAYS - d) * 0.0105; // grows from ~3 to ~9 orders/day
    const { mult, fragranceBoost } = season(date);
    const expected = growth * mult;
    const count = Math.max(0, Math.round(expected + (rand() - 0.5) * expected * 0.7));
    for (let k = 0; k < count; k++) {
      const createdAt = new Date(date.getTime() + between(8, 23) * 3600_000 + between(0, 59) * 60_000 - 12 * 3600_000);
      if (createdAt > NOW) continue;
      // customer: returning vs new vs guest
      let cust: Cust;
      const existing = customers.filter((c) => c.createdAt < createdAt);
      if (existing.length > 20 && rand() < 0.42) cust = weighted(existing, (c) => c.propensity);
      else cust = makeCustomer(createdAt);

      // basket
      const lines = new Map<string, number>();
      const nLines = weighted([1, 2, 3, 4], (n) => [46, 32, 15, 7][n - 1]);
      for (let l = 0; l < nLines; l++) {
        const v = weighted(variants, (x) => x.popularity * (x.isFragrance ? fragranceBoost : 1) * (x.luxury ? 0.8 : 1));
        lines.set(v.id, (lines.get(v.id) ?? 0) + (rand() < 0.12 ? 2 : 1));
        const pair = PAIRS.find((p) => p[0] === v.productName || p[1] === v.productName);
        if (pair && rand() < 0.38) {
          const other = pair[0] === v.productName ? pair[1] : pair[0];
          const ov = variants.find((x) => x.productName === other);
          if (ov) lines.set(ov.id, (lines.get(ov.id) ?? 0) + 1);
        }
      }
      const orderId = randomUUID();
      let subtotal = 0;
      let itemCount = 0;
      for (const [vid, qty] of lines) {
        const v = variants.find((x) => x.id === vid)!;
        const unitPrice = v.salePrice ?? v.price;
        subtotal += unitPrice * qty;
        itemCount += qty;
        items.push({ id: randomUUID(), orderId, variantId: vid, productName: v.productName, variantName: v.name, quantity: qty, unitPrice, unitCost: v.costPrice });
        const u = unitsByVariant.get(vid) ?? { total: 0, last30: 0, last90: 0 };
        u.total += qty;
        if (d <= 30) u.last30 += qty;
        if (d <= 90) u.last90 += qty;
        unitsByVariant.set(vid, u);
      }
      const zone = DISTRICTS.find((z) => z.district === cust.district)!;
      const promo = rand() < 0.13 ? pick(promoCodes) : null;
      let discount = 0;
      if (promo === "WELCOME10") discount = Math.round(subtotal * 0.1);
      if (promo === "GLOW15" || promo === "AVURUDU15") discount = Math.round(subtotal * 0.15);
      if (promo === "VALENTINE2K") discount = 2000;
      const express = cust.district === "Colombo" && rand() < 0.3;
      let deliveryFee = subtotal >= 15000 ? 0 : zone.standardFee;
      if (express) deliveryFee = zone.expressFee ?? deliveryFee;
      if (promo === "FREESHIP") deliveryFee = 0;
      const giftWrap = rand() < ((date.getMonth() === 11 || date.getMonth() === 1) ? 0.35 : 0.12);
      const total = Math.max(0, subtotal - discount + deliveryFee + (giftWrap ? 750 : 0));
      const method: PaymentMethod = weighted(["PAYHERE", "COD", "KOKO", "MINTPAY", "BANK_TRANSFER"] as const, (m) => ({ PAYHERE: 40, COD: 30, KOKO: 12, MINTPAY: 8, BANK_TRANSFER: 10 })[m]);
      // status
      let status: OrderStatus = "DELIVERED";
      const r = rand();
      if (d <= 0) status = weighted(["PENDING_PAYMENT", "CONFIRMED", "PACKED"] as const, (s) => ({ PENDING_PAYMENT: 2, CONFIRMED: 5, PACKED: 2 })[s]);
      else if (d <= 1) status = weighted(["CONFIRMED", "PACKED", "SHIPPED"] as const, (s) => ({ CONFIRMED: 2, PACKED: 3, SHIPPED: 4 })[s]);
      else if (d <= 3) status = weighted(["SHIPPED", "DELIVERED"] as const, (s) => (s === "SHIPPED" ? 3 : 4));
      else if (r < 0.03) status = "CANCELLED";
      else if (r < 0.05) status = "RETURNED";
      if (method === "BANK_TRANSFER" && d <= 1 && rand() < 0.5) status = "PENDING_PAYMENT";
      const paid = status !== "CANCELLED" && status !== "PENDING_PAYMENT" && (method !== "COD" || status === "DELIVERED" || status === "RETURNED");
      const city = pick(CITY[cust.district] ?? [cust.district]);
      orders.push({
        id: orderId,
        number: `SK-${orderNo++}`,
        customerId: cust.id,
        email: cust.email,
        phone: cust.phone,
        name: cust.name,
        addressLine1: `${between(4, 220)}/${between(1, 9)} ${pick(["Galle Road", "Flower Road", "Ward Place", "Kandy Road", "Temple Road", "Lake Drive", "Station Road", "Park Avenue", "Horton Place", "Duplication Road"])}`,
        city,
        district: cust.district,
        deliveryMethod: express ? "same-day" : zone.nextDay ? "next-day" : "standard",
        deliveryFee,
        subtotal,
        discount,
        giftWrap,
        giftWrapFee: giftWrap ? 750 : 0,
        giftMessage: giftWrap && rand() < 0.5 ? pick(["Happy birthday, with love", "Suba Aluth Avuruddak Wewa!", "Merry Christmas", "Happy Valentine's Day ♡", "Congratulations!"]) : null,
        total,
        promoCode: promo,
        paymentMethod: method,
        paymentStatus: status === "CANCELLED" ? "FAILED" : status === "RETURNED" ? "REFUNDED" : paid ? "PAID" : "PENDING",
        paymentRef: method === "PAYHERE" && paid ? `PH${between(100000000, 999999999)}` : null,
        status,
        codCollected: method === "COD" && (status === "DELIVERED" || status === "RETURNED"),
        codRemittedAt: method === "COD" && status === "DELIVERED" && d > 7 ? new Date(createdAt.getTime() + 6 * DAY) : null,
        courier: ["SHIPPED", "DELIVERED", "RETURNED"].includes(status) ? pick(["Pronto Lanka", "Domex", "Koombiyo"]) : null,
        trackingNumber: ["SHIPPED", "DELIVERED", "RETURNED"].includes(status) ? `TRK${between(10000000, 99999999)}` : null,
        createdAt,
        updatedAt: createdAt,
      });
      events.push({ id: randomUUID(), orderId, status: method === "BANK_TRANSFER" ? "PENDING_PAYMENT" : "CONFIRMED", note: "Order placed", createdAt });
      if (status !== "CONFIRMED" && status !== "PENDING_PAYMENT")
        events.push({ id: randomUUID(), orderId, status, note: null, createdAt: new Date(createdAt.getTime() + between(1, 3) * DAY) });
      sessions.push({ id: randomUUID(), email: cust.email, itemCount, value: subtotal, items: [...lines.keys()], orderId, createdAt: new Date(createdAt.getTime() - 8 * 60_000) });
      if (cust.registered && paid) {
        const pts = Math.floor(total / 100);
        cust.loyalty += pts;
        loyalty.push({ id: randomUUID(), customerId: cust.id, points: pts, reason: "Order reward", orderId, createdAt });
      }
      // abandoned carts alongside real orders (~32% abandonment)
      if (rand() < 0.47) {
        const v = weighted(variants, (x) => x.popularity);
        sessions.push({ id: randomUUID(), email: rand() < 0.6 ? pick(customers).email : null, itemCount: between(1, 3), value: (v.salePrice ?? v.price) * between(1, 2), items: [v.id], orderId: null, createdAt: new Date(createdAt.getTime() + between(1, 600) * 60_000) });
      }
    }
  }

  console.log(`Writing ${customers.length} customers, ${orders.length} orders, ${items.length} items…`);
  await prisma.customer.createMany({
    data: customers.map((c) => ({
      id: c.id,
      email: c.email,
      name: c.name,
      phone: c.phone,
      district: c.district,
      passwordHash: c.registered ? custPw : null,
      loyaltyPoints: c.loyalty,
      marketingOptIn: rand() < 0.55,
      createdAt: c.createdAt,
      skinType: c.registered ? pick(["dry", "oily", "combination", "normal", "sensitive"]) : null,
    })),
  });
  const chunk = <T,>(a: T[], n = 2000) => Array.from({ length: Math.ceil(a.length / n) }, (_, i) => a.slice(i * n, i * n + n));
  for (const c of chunk(orders)) await prisma.order.createMany({ data: c });
  for (const c of chunk(items)) await prisma.orderItem.createMany({ data: c });
  for (const c of chunk(events)) await prisma.orderEvent.createMany({ data: c });
  for (const c of chunk(sessions)) await prisma.checkoutSession.createMany({ data: c });
  for (const c of chunk(loyalty)) await prisma.loyaltyTransaction.createMany({ data: c });
  await prisma.address.create({ data: { customerId: demo.id, label: "Home", line1: "42/1 Ward Place", city: "Colombo 07", district: "Colombo", phone: demo.phone, isDefault: true } });

  // returns
  const returned = orders.filter((o) => o.status === "RETURNED");
  await prisma.returnRequest.createMany({
    data: returned.map((o) => ({ orderId: o.id, reason: pick(["Changed my mind", "Allergic reaction", "Damaged in transit", "Wrong shade/size"]), status: "REFUNDED", refundAmount: o.total, restock: rand() < 0.5, createdAt: new Date(o.createdAt.getTime() + 4 * DAY) })),
  });
  const recentDelivered = orders.filter((o) => o.status === "DELIVERED" && o.createdAt > daysAgo(10)).slice(0, 3);
  for (const o of recentDelivered) await prisma.returnRequest.create({ data: { orderId: o.id, reason: pick(["Damaged in transit", "Changed my mind"]), status: "REQUESTED", refundAmount: o.total } });

  // ───────── inventory: batches with expiry; stock sized from recent sales velocity
  console.log("Inventory batches…");
  const batches: { id: string; variantId: string; batchNumber: string; supplierId: string; quantity: number; remaining: number; unitCost: number; manufacturedAt: Date; expiryDate: Date; receivedAt: Date; importRef: string }[] = [];
  const stockUpdates: { id: string; stock: number }[] = [];
  for (const v of variants) {
    const u = unitsByVariant.get(v.id) ?? { total: 0, last30: 0, last90: 0 };
    const velocity = (u.last30 / 30) * 0.6 + (u.last90 / 90) * 0.4; // units/day
    const coverDays = weighted([4, 9, 14, 25, 45, 70, 110], (x) => [1, 2, 2, 3, 3, 2, 1][[4, 9, 14, 25, 45, 70, 110].indexOf(x)]);
    let stock = Math.max(between(2, 6), Math.round(velocity * coverDays + between(0, 4)));
    if (rand() < 0.03 && v.popularity < 7) stock = 0;
    const brandOrigin = brandRows.get(PRODUCTS.find((p) => p.name === v.productName)!.brand)!.origin;
    const supplier = supplierFor(brandOrigin);
    // split stock across 1–3 batches, oldest expiring first
    const nb = stock > 30 ? 3 : stock > 8 ? 2 : 1;
    let left = stock;
    for (let b = 0; b < nb; b++) {
      const qtyLeft = b === nb - 1 ? left : Math.round(left * (0.25 + rand() * 0.3));
      left -= qtyLeft;
      const received = daysAgo(between(20, 200) - b * 20);
      const shelf = v.isFragrance ? between(600, 1100) : between(b === 0 && rand() < 0.35 ? 25 : 150, 720);
      const expiry = new Date(NOW.getTime() + shelf * DAY);
      const qty = qtyLeft + between(10, 60);
      batches.push({
        id: randomUUID(),
        variantId: v.id,
        batchNumber: `${brandOrigin === "South Korea" ? "KR" : brandOrigin === "France" ? "FR" : "US"}${(received.getFullYear() % 100).toString()}${String(received.getMonth() + 1).padStart(2, "0")}-${between(1000, 9999)}`,
        supplierId: supplier.id,
        quantity: qty,
        remaining: qtyLeft,
        unitCost: Math.round(v.costPrice * (0.96 + rand() * 0.08)),
        manufacturedAt: new Date(received.getTime() - between(30, 120) * DAY),
        expiryDate: expiry,
        receivedAt: received,
        importRef: `CUSNWS/${received.getFullYear()}/${between(10000, 99999)}`,
      });
    }
    stockUpdates.push({ id: v.id, stock });
  }
  await prisma.batch.createMany({ data: batches });
  for (const s of stockUpdates) await prisma.variant.update({ where: { id: s.id }, data: { stock: s.stock } });

  // ───────── reviews
  console.log("Reviews…");
  const reviewRows: { productId: string; name: string; rating: number; title: string; body: string; skinType: string | null; verified: boolean; createdAt: Date }[] = [];
  for (const p of PRODUCTS) {
    const id = productIdByName.get(p.name)!;
    const n = Math.round(p.popularity * 1.6 + between(2, 8));
    for (let i = 0; i < n; i++) {
      const rating = weighted([5, 4, 3] as const, (r) => ({ 5: 66, 4: 27, 3: 7 })[r]);
      const [title, body] = pick(REVIEW_BITS[rating]);
      reviewRows.push({ productId: id, name: `${pick(FIRST)} ${pick(LAST).charAt(0)}.`, rating, title, body, skinType: p.gender ? null : pick(["dry", "oily", "combination", "normal", "sensitive"]), verified: rand() < 0.85, createdAt: daysAgo(between(1, 500)) });
    }
  }
  await prisma.review.createMany({ data: reviewRows });
  for (const [, id] of productIdByName) {
    const agg = await prisma.review.aggregate({ where: { productId: id }, _avg: { rating: true }, _count: true });
    await prisma.product.update({ where: { id }, data: { ratingAvg: agg._avg.rating ?? 0, ratingCount: agg._count } });
  }

  // ───────── merchandising
  console.log("Banners, collections & promotions…");
  const P = (name: string) => PRODUCTS.find((p) => p.name === name)!;
  const heroes = [
    {
      eyebrow: "The Fragrance Edit",
      title: "Scents worth remembering",
      subtitle: "Libre, Miss Dior and Bleu de Chanel. Imported from Paris, authenticated batch by batch.",
      ctaLabel: "Discover fragrance",
      ctaHref: "/c/fragrances",
      art: sceneSVG({ bg: "#EFE6D6", arch: "#E1CFAE", items: [P("Libre Eau de Parfum"), P("Miss Dior Eau de Parfum"), P("Bleu de Chanel Eau de Parfum")].map(spec), align: "right" }),
    },
    {
      eyebrow: "New from Seoul",
      title: "The glass skin ritual",
      subtitle: "Medicube PDRN, COSRX and Beauty of Joseon. The Korean routines everyone is talking about.",
      ctaLabel: "Shop K-beauty",
      ctaHref: "/collections/glass-skin-edit",
      art: sceneSVG({ bg: "#F2E7E3", arch: "#E8D3CC", items: [P("Advanced Snail 96 Mucin Power Essence"), P("PDRN Pink Peptide Serum"), P("Relief Sun: Rice + Probiotics SPF50+")].map(spec), align: "right" }),
    },
    {
      eyebrow: "The Luxury Collection",
      title: "Quiet luxury, delivered",
      subtitle: "La Mer, Estée Lauder and Sulwhasoo, hand-wrapped in Colombo.",
      ctaLabel: "Explore luxury",
      ctaHref: "/c/luxury",
      art: sceneSVG({ bg: "#E9E5DE", arch: "#D9D2C5", items: [P("Advanced Night Repair Serum"), P("Crème de la Mer"), P("First Care Activating Serum")].map(spec), align: "right" }),
    },
  ];
  // The lead hero uses the editorial photograph in public/media/editorial; replace it from Admin → Home page.
  await prisma.banner.create({ data: { placement: "HERO", eyebrow: "Beauty lives deeper", title: "The art of beauty", subtitle: "Curated skincare, extraordinary fragrance and iconic beauty brands for a more luminous you.", ctaLabel: "Shop the collection", ctaHref: "/c/skin-care", imageUrl: "/media/editorial/hero-stone.jpg", sortOrder: 0 } });
  for (const [i, h] of heroes.entries()) {
    const imageUrl = writeMedia(`banners/hero-${i + 1}.svg`, h.art);
    await prisma.banner.create({ data: { placement: "HERO", eyebrow: h.eyebrow, title: h.title, subtitle: h.subtitle, ctaLabel: h.ctaLabel, ctaHref: h.ctaHref, imageUrl, sortOrder: i + 1 } });
  }
  await prisma.banner.create({
    data: {
      placement: "PROMO",
      eyebrow: "Limited time",
      title: "The 48-hour Glow Edit",
      subtitle: "20% off selected serums and sunscreens. Ends soon.",
      ctaLabel: "Shop the edit",
      ctaHref: "/offers",
      imageUrl: writeMedia("banners/promo.svg", sceneSVG({ bg: "#F3EBDD", arch: "#E9D9BC", items: [P("Glow Serum: Propolis + Niacinamide"), P("Niacinamide 10% + Zinc 1%"), P("Anthelios UVMune 400 Invisible Fluid SPF50+")].map(spec) })),
      theme: "light",
    },
  });
  await prisma.banner.create({ data: { placement: "ANNOUNCEMENT", title: "Complimentary delivery over LKR 15,000 · 100% authentic, batch & expiry shown · Pay in 3 with Koko or Mintpay", ctaHref: "/delivery" } });

  const collections = [
    { title: "The Luxury Collection", slug: "luxury-collection", eyebrow: "Prestige", description: "Our most coveted pieces: prestige skincare and haute parfumerie, presented with complimentary gift wrapping.", names: ["Crème de la Mer", "Advanced Night Repair Serum", "First Care Activating Serum", "Oud Wood Eau de Parfum", "Santal 33 Eau de Parfum", "Baies Scented Candle", "The Luxury Discovery Box", "Coco Mademoiselle Eau de Parfum"] },
    { title: "Glass Skin Edit", slug: "glass-skin-edit", eyebrow: "K-beauty", description: "Dewy, luminous, lit-from-within. The Korean essentials for glass skin.", names: ["PDRN Pink Peptide Serum", "Advanced Snail 96 Mucin Power Essence", "Relief Sun: Rice + Probiotics SPF50+", "Glow Serum: Propolis + Niacinamide", "Zero Pore Pad 2.0", "Water Sleeping Mask", "Collagen Night Wrapping Mask"] },
    { title: "Gifts for Her", slug: "gifts-for-her", eyebrow: "Gifting", description: "Thoughtful, beautifully wrapped gifts she'll treasure.", names: ["Miss Dior Eau de Parfum", "Libre Eau de Parfum", "La Vie Est Belle Eau de Parfum", "Baies Scented Candle", "Lip Sleeping Mask Berry", "Rose Quartz Gua Sha Facial Lifting Tool"] },
    { title: "Barrier Repair", slug: "barrier-repair", eyebrow: "Dermatologist favourites", description: "Ceramides, panthenol and centella to calm and restore.", names: ["Moisturising Cream", "Hydrating Cleanser", "Cicaplast Baume B5+", "PM Facial Moisturising Lotion", "Hyaluronic Acid 2% + B5"] },
  ];
  for (const [i, c] of collections.entries()) {
    const imageUrl = writeMedia(`collections/${c.slug}.svg`, sceneSVG({ bg: "#EFE8DC", arch: "#E2D3B8", items: c.names.slice(0, 3).map((n) => spec(P(n))), portrait: true }));
    await prisma.collection.create({
      data: { title: c.title, slug: c.slug, eyebrow: c.eyebrow, description: c.description, imageUrl, sortOrder: i, products: { create: c.names.map((n, j) => ({ productId: productIdByName.get(n)!, sortOrder: j })) } },
    });
  }

  await prisma.discountCode.createMany({
    data: [
      { code: "WELCOME10", description: "10% off your first order", type: "PERCENT", value: 10, minSpend: 5000, usedCount: 312 },
      { code: "GLOW15", description: "15% off for newsletter subscribers", type: "PERCENT", value: 15, minSpend: 12000, usedCount: 118, endsAt: daysFromNow(30) },
      { code: "AVURUDU15", description: "Avurudu celebration offer", type: "PERCENT", value: 15, minSpend: 10000, usedCount: 204, active: false, startsAt: new Date(NOW.getFullYear(), 3, 1), endsAt: new Date(NOW.getFullYear(), 3, 20) },
      { code: "VALENTINE2K", description: "LKR 2,000 off fragrance gifts", type: "FIXED", value: 2000, minSpend: 25000, usedCount: 96, active: false },
      { code: "FREESHIP", description: "Free delivery, any order", type: "FREE_SHIPPING", value: 0, minSpend: 0, usedCount: 87, usageLimit: 500 },
    ],
  });
  await prisma.bundle.create({
    data: { name: "The Ordinary Clear Skin Duo", slug: "ordinary-clear-skin-duo", description: "Niacinamide + Hyaluronic Acid, the internet's favourite pairing.", price: 8900, items: { create: [{ productId: productIdByName.get("Niacinamide 10% + Zinc 1%")! }, { productId: productIdByName.get("Hyaluronic Acid 2% + B5")! }] } },
  });
  await prisma.bundle.create({
    data: { name: "CeraVe Barrier Ritual", slug: "cerave-barrier-ritual", description: "Hydrating Cleanser + Moisturising Cream.", price: 14200, items: { create: [{ productId: productIdByName.get("Hydrating Cleanser")! }, { productId: productIdByName.get("Moisturising Cream")! }] } },
  });
  await prisma.flashSale.create({
    data: {
      name: "48-hour Glow Edit",
      discountPercent: 20,
      startsAt: daysAgo(0.5),
      endsAt: daysFromNow(1.6),
      products: { create: ["Glow Serum: Propolis + Niacinamide", "Niacinamide 10% + Zinc 1%", "Anthelios UVMune 400 Invisible Fluid SPF50+", "Deep Vita C Capsule Cream", "Watermelon Glow Niacinamide Dew Drops"].map((n) => ({ productId: productIdByName.get(n)! })) },
    },
  });

  // recent notification log
  const recent = orders.slice(-12);
  await prisma.notificationLog.createMany({
    data: recent.flatMap((o) => [
      { orderId: o.id, channel: "SMS", to: o.phone, message: `Skinora: Thank you ${o.name.split(" ")[0]}! Order ${o.number} is confirmed. Total LKR ${o.total.toLocaleString()}.`, status: "LOGGED", createdAt: o.createdAt },
      { orderId: o.id, channel: "EMAIL", to: o.email, subject: `Your Skinora order ${o.number}`, message: "Order confirmation", status: "LOGGED", createdAt: o.createdAt },
    ]),
  });

  console.log(`✓ Seeded ${PRODUCTS.length} products, ${variants.length} variants, ${orders.length} orders, ${customers.length} customers.`);
  console.log("  Admin:    admin@skinora.lk / Skinora@2026");
  console.log("  Customer: demo@skinora.lk / demo1234");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
