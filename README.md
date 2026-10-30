# Skinora

A luxury e-commerce store for authentic international skincare, fragrance and lifestyle products in Sri Lanka, with a full back office: inventory with batches and expiry (FEFO), orders and COD, analytics, AI-style insights and forecasts, and promotions.

Built with Next.js 15 (App Router, server actions), TypeScript, Tailwind CSS, PostgreSQL with Prisma, and Cloudinary for images.

---

## What's inside

**Storefront**
- Home page with hero carousel, featured brands, best sellers, new arrivals, a live flash sale and editorial collections.
- Categories: Skin Care (cleansers, toners, serums, moisturisers, sunscreen, masks), Fragrances (women, men, unisex), Lifestyle and Luxury.
- Filters by brand, skin type, concern, key ingredient and price, all kept in the URL so filtered pages can be shared.
- Product pages with gallery and zoom, variants, batch number and expiry of the batch you'll receive, import origin, ingredients, how to use, suitability, reviews, and "frequently bought together" from real order data.
- AI skin analysis: shoppers take or upload a selfie, Claude scores eight signs of skin health (hydration, oil balance, pores, clarity, calm, even tone, smoothness, firmness) and the result feeds the skin quiz's routine. Signed-in customers get their scores saved to their account with progress since the last scan and a four-weekly re-scan prompt. The photo is never stored.
- Skin quiz that builds a routine, wishlist, cart drawer, search with autocomplete, gift wrap, and "100% Authentic" messaging throughout.
- Guest checkout or customer accounts with order history, order tracking, and loyalty points.
- Sri Lanka specifics: LKR pricing, district delivery fees with same-day delivery in Colombo and next-day in nearby districts, PayHere cards, Koko and Mintpay, bank transfer, cash on delivery (up to LKR 75,000), a WhatsApp button, and SMS and email order updates.
- SEO: metadata, JSON-LD (Product, BreadcrumbList, OnlineStore), sitemap.xml and robots.txt.
- English first. Product and category records have a `translations` field and `src/i18n` is ready for Sinhala and Tamil.

**Admin (`/admin`)**
- Products with variants, SKU, price, sale price, cost and stock. Drag-and-drop image upload with automatic WebP compression, plus reorder and delete.
- Categories and subcategories, brands with logos, home page banners and collections, CSV bulk import (template at `/skinora-import-template.csv`).
- Staff roles: Admin, Inventory manager, Order handler. Each role sees only its own sections.
- Inventory per variant, low-stock alerts, batches with supplier, import reference, landed cost and expiry, FEFO allocation, write-offs, and reorder suggestions.
- Orders pipeline, payment confirmation, COD remittance tracking, and returns.
- Analytics: revenue and profit over time, margin per product, best and worst sellers, sales by district, payment mix, repeat rate, AOV, products bought together, seasonality (Avurudu, Christmas, Valentine's and more), cart abandonment, and customer segments.
- Insights: stock run-out forecasts with reorder quantities (for example "CeraVe Moisturising Cream will run out in 9 days, reorder 40 units"), expiry risk, and a 12-week revenue forecast.
- Promotions: discount codes, bundles, flash sales and loyalty points.

---

## Run it locally

You need Node.js 20+ and PostgreSQL 14+.

```bash
# 1. Install
npm install

# 2. Configure
cp .env.example .env
#    then set DATABASE_URL and AUTH_SECRET (openssl rand -base64 32)

# 3. Create the database tables
npx prisma migrate deploy

# 4. Load the demo catalogue and 18 months of realistic sales
npm run db:seed

# 5. Start
npm run dev
```

Open http://localhost:3000 for the store and http://localhost:3000/admin for the back office.

**Demo logins** (password for all staff: `Skinora@2026`)

| Who | Email |
| --- | --- |
| Admin | admin@skinora.lk |
| Inventory manager | stock@skinora.lk |
| Order handler | orders@skinora.lk |
| Customer | demo@skinora.lk (password `demo1234`) |

Change these passwords (Admin → Staff) before going live.

Without payment, messaging or AI keys everything still works: card and BNPL payments go through an on-site demo gateway, and SMS and emails are written to the notification log instead of being sent.

---

## Connect real services

All settings live in environment variables. See `.env.example`.

| Service | Variables | Notes |
| --- | --- | --- |
| **PayHere** (cards) | `PAYHERE_MERCHANT_ID`, `PAYHERE_MERCHANT_SECRET`, `PAYHERE_SANDBOX` | In the PayHere portal, add your domain to the allowed domains. The notify URL is `https://yourdomain/api/payhere/notify` and is sent automatically. Keep `PAYHERE_SANDBOX=true` until you've tested. |
| **Koko / Mintpay** | `KOKO_*`, `MINTPAY_*` | Both providers issue credentials and an API spec after merchant onboarding. The checkout, order and payment states are already in place; the redirect call in `src/lib/payments.ts` needs to be completed with their spec. Until then they use the demo gateway. |
| **Cloudinary** (images) | `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` | Required in production. Without it, uploads are saved to `public/uploads`, which doesn't persist on Vercel. |
| **Notify.lk** (SMS) | `NOTIFYLK_USER_ID`, `NOTIFYLK_API_KEY`, `NOTIFYLK_SENDER_ID` | The sender ID must be approved by Notify.lk. |
| **Resend** (email) | `RESEND_API_KEY`, `EMAIL_FROM` | Verify your sending domain in Resend. |
| **Anthropic** (AI skin analysis) | `ANTHROPIC_API_KEY` | Create a key at console.anthropic.com. Each scan is one Claude Opus 5.5 request with one image, at low effort. Without a key the scan runs in demo mode: a rough on-server estimate from photo colour and shine, clearly labelled as a demo. |
| **WhatsApp** | `NEXT_PUBLIC_WHATSAPP_NUMBER` | International format without `+`, e.g. `94771234567`. |

Bank transfer details shown at checkout are in `src/lib/constants.ts` (`BANK_DETAILS`). Delivery fees per district are in `src/lib/districts.ts` and are copied to the `DeliveryZone` table by the seed.

---

## Deploy to Vercel

1. **Create a Postgres database.** Neon or Supabase both work well and have free tiers. Copy the connection string. With Neon, use the pooled connection string for `DATABASE_URL`.
2. **Push this project to GitHub** and import the repository in Vercel (New Project → Import). Vercel detects Next.js automatically.
3. **Add environment variables** in Vercel → Project → Settings → Environment Variables: `DATABASE_URL`, `AUTH_SECRET`, `NEXT_PUBLIC_SITE_URL` (your live URL), Cloudinary keys, and any payment and messaging keys.
4. **Create the tables and load data** from your computer, pointing at the production database:
   ```bash
   DATABASE_URL="<production url>" npx prisma migrate deploy
   DATABASE_URL="<production url>" npm run db:seed   # optional: demo data
   ```
   The seed wipes all tables first, so only run it on an empty or demo database. For a real launch, skip the seed, create your admin with `DATABASE_URL="<production url>" npm run create-admin -- you@domain.lk "Your Name" "a-strong-password"`, then load products via Admin → Import.
5. **Deploy.** The build runs `prisma generate && next build`.
6. **Connect your domain** in Vercel → Domains, then update `NEXT_PUBLIC_SITE_URL` and the PayHere allowed domain.

For later schema changes, run `npx prisma migrate dev --name <change>` locally, commit the migration, and run `npx prisma migrate deploy` against production.

---

## Adding Sinhala and Tamil

1. Create `src/i18n/si.ts` and `src/i18n/ta.ts` with the same keys as `src/i18n/en.ts`.
2. Register them in `src/i18n/index.ts` and set `enabled: true` in `LOCALES`.
3. Product and category names and descriptions can be translated through their `translations` JSON field, e.g. `{ "si": { "name": "…" } }`; the `localized()` helper falls back to English.

---

## Project layout

```
prisma/            schema, migrations, seed and demo catalogue
src/app/(store)/   storefront pages
src/app/admin/     back office
src/actions/       server actions (checkout, account, admin)
src/lib/           pricing, orders, FEFO stock, payments, analytics, insights
src/components/    store and admin UI
```

Useful scripts: `npm run typecheck`, `npm run db:reset` (rebuild the database), `npm run db:seed`.
