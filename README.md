# Skinora: final site with AI skin scan

- `public/`: the finalised static Skinora site (preview artifact v34) with the AI skin scan layer applied.
- `api/skin-scan.mjs`: Vercel function that scores a selfie with Claude. Needs `ANTHROPIC_API_KEY`; without it the page shows a demo estimate.
- `layers/aiready/`: structured data, robots.txt, sitemap, llms.txt and product feeds for AI shopping assistants. Re-run with `python3 layers/aiready/build.py public <site URL>` when the real domain is live.
- `layers/aigrowth/`: AI search, smart suggestions and the Admin stock and pricing helper. Re-run with `python3 layers/aigrowth/build.py public api` (also regenerates `api/_catalog.mjs`).
- `api/search.mjs`, `api/insights.mjs`: Claude for the search and the Admin helper. Without `ANTHROPIC_API_KEY` both fall back to built-in rules in the page.
- `layers/skinscan/`: the scan layer source. Re-apply with `python3 layers/skinscan/build.py public` (idempotent).

Deploys on Vercel as a static site plus one function (see `vercel.json`).
- `layers/clash/`: ingredient checker. `ingredient-check.html` checks a customer's products (from Skinora or any shop) for clashes like retinol with acids and gives a morning and night plan; product pages get "Works with your routine?"; the quiz result links to it. Re-apply with `python3 layers/clash/build.py public` (idempotent, run after the other layers). Rule checks: `node layers/clash/test.cjs`.
- `api/ingredients.mjs`: Claude reads a product name or a label photo for the checker. Without `ANTHROPIC_API_KEY` the page asks for the pasted ingredient list instead.
