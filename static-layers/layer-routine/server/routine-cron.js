// Sends the due routine reminders and refill nudges on WhatsApp. Call it every 10 to 15 minutes
// (for example from cron-job.org, or a Vercel cron on the Pro plan) with the header
//   Authorization: Bearer <CRON_SECRET>
// A reminder goes out once per day per slot, any time in the 2 hours after the chosen time,
// so a late or skipped run still sends it. A refill nudge goes out once, 7 days before a product runs out.
const L = require('./_routine-lib.js');

const CATCH_UP = 120; // minutes
const REFILL_DAYS = 7;
const list = (l) => l.map((n, i) => (i + 1) + '. ' + n).join(', ');

module.exports = async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  const secret = L.env('CRON_SECRET');
  if (!secret || req.headers.authorization !== 'Bearer ' + secret) { res.status(401).json({ error: 'Not allowed.' }); return; }
  if (!L.waReady() || !L.dbReady()) { res.status(503).json({ error: 'WhatsApp or storage is not set up.' }); return; }

  const phones = (await L.redis('SMEMBERS', 'rt:subs')) || [];
  const out = { checked: phones.length, reminders: 0, refills: 0, errors: 0 };
  for (const phone of phones) {
    let sub;
    try { sub = JSON.parse((await L.redis('GET', 'rt:sub:' + phone)) || 'null'); } catch (e) { sub = null; }
    if (!sub) { await L.redis('SREM', 'rt:subs', phone).catch(() => {}); continue; }
    const local = new Date(Date.now() + sub.tzOffset * 60000); // read with getUTC* for the customer's local time
    const today = local.toISOString().slice(0, 10);
    const mins = local.getUTCHours() * 60 + local.getUTCMinutes();
    sub.sent = sub.sent || {};
    let changed = false;
    try {
      if (sub.remind) {
        for (const [slot, steps, label] of [['am', sub.morning, 'morning'], ['pm', sub.night, 'night']]) {
          const [h, m] = sub[slot].split(':').map(Number), due = h * 60 + m;
          if (!steps.length || sub.sent[slot] === today || mins < due || mins > due + CATCH_UP) continue;
          await L.sendTemplate(phone, L.TEMPLATES.reminder(), [label, list(steps), L.SITE() + '/routine']);
          sub.sent[slot] = today; changed = true; out.reminders++;
        }
      }
      if (sub.refill && mins >= 9 * 60 && mins <= 20 * 60) {
        for (const f of sub.refills) {
          const days = Math.round((Date.parse(f.ends) - Date.parse(today)) / 864e5), k = 'refill:' + f.slug + ':' + f.ends;
          if (days > REFILL_DAYS || days < -3 || sub.sent[k]) continue;
          await L.sendTemplate(phone, L.TEMPLATES.refill(), [f.name, days > 0 ? 'in about ' + days + ' days' : 'about now', L.SITE() + '/p/' + f.slug]);
          sub.sent[k] = today; changed = true; out.refills++;
        }
      }
    } catch (e) { console.error('routine-cron', phone.slice(0, 5) + '…', e.message); out.errors++; }
    if (changed) {
      Object.keys(sub.sent).filter((k) => k.startsWith('refill:') && sub.sent[k] < new Date(Date.now() - 60 * 864e5).toISOString().slice(0, 10)).forEach((k) => delete sub.sent[k]);
      await L.redis('SET', 'rt:sub:' + phone, JSON.stringify(sub)).catch(() => {});
    }
  }
  res.status(200).json(out);
};
