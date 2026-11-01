# Routine builder with reminders

Turns the routine from the skin scan or the 5-question quiz into a daily habit.

- **Save my routine** on the quiz result (after a scan or the questions) saves it in the browser and opens `routine.html`.
- **My routine page** (`routine.html`)
  - Today: morning and night checklist with product photos. Tick each step; the bar and a "Morning done" mark update.
  - Smart timing: retinol and leave-on exfoliating acids are moved to night only. On the nights an acid "extra care" step is used, a retinol serum rests.
  - "Extra care" steps run on Monday, Wednesday and Friday nights.
  - This week calendar (Mon to Sun, morning and night), a day streak, and the last 4 weeks of ticks.
  - Reminders: pick a morning and night time, then
    - **Add to my calendar** downloads an `.ics` file with a daily morning and night alarm listing the steps, plus one refill reminder per product a week before it runs out. Works on iPhone, Android and Google Calendar with no server.
    - **WhatsApp**: number, consent, and morning/night and refill options. Sent to `/api/routine-reminders`.
  - Refills: for each product, how many days are left, worked out from the bottle size and how often the routine uses it. Counts from the customer's last Skinora order with that product, or from the day the routine was saved. "Refill" adds it to the bag, "Refill all" adds every product with 10 days or less, "I just opened a new one" restarts the count.
- **Account page**: a My routine card with today's progress, the streak and anything running low.
- **Home page**: a small refill nudge (bottom left) when a product has 7 days or less. Closing it hides it until the next bottle.

Data stays in the browser under `localStorage['skd-routine']`. Nothing is sent unless the customer turns on WhatsApp.

## Apply

    python3 build.py <site dir>

Run after layer-skinscan and layer-faceshape. Idempotent. It writes `routine.html` (made from `wishlist.html`), adds the script to `quiz.html`, `account.html` and `home.html`, and copies `server/*` into `<site>/api/`.

## Switching on WhatsApp

Until these are set, the page saves the choice in the browser and points the customer to the calendar file (the API answers 503).

1. **WhatsApp Business (Meta Cloud API)**: `WHATSAPP_TOKEN` (a permanent system user token) and `WHATSAPP_PHONE_NUMBER_ID`.
2. **Storage**: an Upstash Redis database from the Vercel Marketplace. It sets `KV_REST_API_URL` and `KV_REST_API_TOKEN` (`UPSTASH_REDIS_REST_URL` / `_TOKEN` also work).
3. **Templates**: messages the business starts must use templates approved by Meta (category Utility, language `en`). Create these, or set `WHATSAPP_TEMPLATE_WELCOME`, `WHATSAPP_TEMPLATE_REMINDER`, `WHATSAPP_TEMPLATE_REFILL` to your own names:
   - `routine_welcome`: "Hi from Skinora! Your skincare reminders are on. We will message you {{1}}. Reply STOP any time to turn them off."
   - `routine_reminder`: "Time for your {{1}} routine: {{2}}. Tick it off here: {{3}}"
   - `refill_nudge`: "Your {{1}} will run out {{2}}. Refill now and it arrives in time: {{3}}"
4. **Schedule**: set `CRON_SECRET`, then call `GET /api/routine-cron` with the header `Authorization: Bearer <CRON_SECRET>` every 10 to 15 minutes. On the Vercel Hobby plan crons run only once a day, so use a free outside scheduler such as cron-job.org. On Pro you can add a Vercel cron instead (Vercel sends the same header). Each reminder goes out once per day, any time in the 2 hours after the chosen time; refill nudges go out once, between 9am and 8pm, a week before the run-out date.
5. Optional: `SITE_URL` (default `https://skinora.lk`) for the links in the messages.

STOP replies: the page has a "Stop WhatsApp reminders" button that calls `DELETE /api/routine-reminders`. To honour a typed STOP reply as well, point the WhatsApp webhook at a handler that calls the same delete.
