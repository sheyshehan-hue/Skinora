# Skinora: final site with AI skin scan

- `public/`: the finalised static Skinora site (preview artifact v34) with the AI skin scan layer applied.
- `api/skin-scan.mjs`: Vercel function that scores a selfie with Claude. Needs `ANTHROPIC_API_KEY`; without it the page shows a demo estimate.
- `layers/aiready/`: structured data, robots.txt, sitemap, llms.txt and product feeds for AI shopping assistants. Re-run with `python3 layers/aiready/build.py public <site URL>` when the real domain is live.
- `layers/aigrowth/`: AI search, smart suggestions and the Admin stock and pricing helper. Re-run with `python3 layers/aigrowth/build.py public api` (also regenerates `api/_catalog.mjs`).
- `api/search.mjs`, `api/insights.mjs`: Claude for the search and the Admin helper. Without `ANTHROPIC_API_KEY` both fall back to built-in rules in the page.
- `layers/skinscan/`: the scan layer source. Re-apply with `python3 layers/skinscan/build.py public` (idempotent).

Deploys on Vercel as a static site plus one function (see `vercel.json`).
