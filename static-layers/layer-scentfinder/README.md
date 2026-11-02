# AI scent finder

Replaces the old four-question finder on `scent-finder.html`. Five fun questions (mood, happy place, outfit,
when you wear it, how strong) become a scent profile, then matches from the catalogue:

- a persona ("The Sandalwood Enigma"), a short story about the customer, notes they will love and their scent mix
  across eight families (fresh, citrus, floral, herbal, woody, warm, spicy, musk)
- the top three fragrances with a match %, a reason tied to their answers, and top, heart and base notes;
  "Anyone / For her / For him" re-ranks the list
- a sample set: three 2 ml vials of the top matches for LKR 3,500, added to the bag as one line
- the best candle for their home
- share on WhatsApp, start again, and "See my last result" (saved on the device in `skd-scent`)

Matching runs in the browser: each answer and each product is a mix of scent families. The score is
60% family similarity, 20% mood, 10% time of day, 10% strength.

**AI:** `api/scent-finder.js` (Vercel function, no packages) asks Claude (`claude-haiku-5-5`, change with
`SCENT_MODEL`) to write the story and one reason per pick, only about the products the page chose. It needs
`ANTHROPIC_API_KEY`. Without it, or if it takes over 9 seconds, the page writes the words with built-in rules.

**Sample set:** `set-patch.js` registers the set as a product on the bag and checkout pages, so checkout can
price it (always LKR 3,500, never the price saved in the bag). `p__scent-sample-set.html` sends the bag's
product link back to the finder result.

**Banners** on the Fragrances, For Her, For Him, Unisex and Home Fragrance pages lead to the finder.

## Files
- `sf-data.js` questions, scent families, scent profiles for the 11 fragrances and 2 candles, sample set price
- `sf-ui.js` the screens, matching and AI call
- `scentfinder.css`, `sample-set.svg`, `set-patch.js`, `server/scent-finder.js`
- `build.py <site dir>` applies it. Run after the other layers. Idempotent.

To add a fragrance, add its slug to `P` in `sf-data.js` with its family mix, moods, time, strength and notes.
