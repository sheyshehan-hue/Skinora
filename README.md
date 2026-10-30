# Skinora: final site with AI skin scan

- `public/`: the finalised static Skinora site (preview artifact v34) with the AI skin scan layer applied.
- `api/skin-scan.mjs`: Vercel function that scores a selfie with Claude. Needs `ANTHROPIC_API_KEY`; without it the page shows a demo estimate.
- `layers/skinscan/`: the scan layer source. Re-apply with `python3 layers/skinscan/build.py public` (idempotent).

Deploys on Vercel as a static site plus one function (see `vercel.json`).
