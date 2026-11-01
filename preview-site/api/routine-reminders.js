// Skinora routine reminders: turn WhatsApp reminders on (POST) or off (DELETE) for one phone number.
// Needs WHATSAPP_TOKEN and WHATSAPP_PHONE_NUMBER_ID (Meta WhatsApp Cloud API) to send messages, and
// KV_REST_API_URL + KV_REST_API_TOKEN (Upstash Redis, from the Vercel Marketplace) to remember who
// wants reminders. /api/routine-cron sends the daily messages. Without these it answers 503 and the
// page keeps the settings in the browser and offers the phone calendar instead.
const L = require('./_routine-lib.js');

const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;
const clean = (l, n) => (Array.isArray(l) ? l : []).slice(0, n || 8).map((x) => String(x).slice(0, 60));

module.exports = async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST' && req.method !== 'DELETE') { res.status(405).json({ error: 'Use POST or DELETE.' }); return; }
  const b = await L.body(req);
  const phone = L.slPhone(b.phone);
  if (!phone) { res.status(422).json({ error: 'Please enter a Sri Lankan mobile number, for example 077 123 4567.' }); return; }

  if (req.method === 'DELETE') {
    if (L.dbReady()) { await L.redis('DEL', 'rt:sub:' + phone).catch(() => {}); await L.redis('SREM', 'rt:subs', phone).catch(() => {}); }
    res.status(200).json({ ok: true }); return;
  }

  if (b.consent !== true) { res.status(422).json({ error: 'Please agree to get WhatsApp messages first.' }); return; }
  if (!L.waReady() || !L.dbReady()) { res.status(503).json({ error: 'WhatsApp reminders are not switched on yet.' }); return; }
  const sub = {
    phone,
    am: TIME.test(b.am) ? b.am : '07:00',
    pm: TIME.test(b.pm) ? b.pm : '21:30',
    tzOffset: Number.isFinite(+b.tzOffset) ? Math.max(-720, Math.min(840, +b.tzOffset)) : 330,
    remind: !!b.remind, refill: !!b.refill,
    morning: clean(b.morning), night: clean(b.night),
    refills: (Array.isArray(b.refills) ? b.refills : []).slice(0, 12)
      .filter((f) => f && /^\d{4}-\d\d-\d\d$/.test(f.ends))
      .map((f) => ({ name: String(f.name || '').slice(0, 80), slug: String(f.slug || '').replace(/[^a-z0-9-]/g, '').slice(0, 100), ends: f.ends })),
    updatedAt: Date.now(),
  };
  try {
    const old = JSON.parse((await L.redis('GET', 'rt:sub:' + phone)) || 'null');
    sub.sent = (old && old.sent) || {};
    await L.redis('SET', 'rt:sub:' + phone, JSON.stringify(sub));
    await L.redis('SADD', 'rt:subs', phone);
    if (!old) {
      await L.sendTemplate(phone, L.TEMPLATES.welcome(), [sub.remind ? 'at ' + sub.am + ' and ' + sub.pm : 'when a product is about to run out']);
    }
    res.status(200).json({ ok: true, welcome: !old });
  } catch (e) {
    console.error('routine-reminders', e);
    const bad = /recipient|phone number|not a valid/i.test(e.message);
    res.status(bad ? 422 : 502).json({ error: bad ? 'This number is not on WhatsApp. Please check it.' : 'We could not reach WhatsApp. Please try again in a minute.' });
  }
};
