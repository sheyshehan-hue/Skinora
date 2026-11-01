// Skinora AI scent finder: Claude writes the customer's scent story and one reason per match.
// Vercel serverless function (Node 18+, no packages). Needs ANTHROPIC_API_KEY.
// Optional: SCENT_MODEL (default claude-haiku-5-5, fast enough to answer while the page shows "Blending your notes").
// The page picks the products itself from the catalogue; Claude only writes the words, and only about the
// products the page sent. Without the key this answers 501 and the page uses its own built-in words.

const MAX_TEXT = 300;
const clip = (s, n) => String(s == null ? '' : s).slice(0, n || MAX_TEXT);

const SYSTEM = `You write for Skinora, an authentic luxury beauty and fragrance store in Sri Lanka.
A customer just answered five fun questions in our scent finder. Our matching engine has already chosen their fragrances
(and maybe one scent for the home) from our catalogue. Your job is only the words:
- story: 2 or 3 short, warm sentences to the customer ("you"), in very simple English, about the kind of scent person they are.
  Use their answers (mood, happy place, outfit, when they wear it, how strong). Be specific and a little playful. No more than 60 words.
- reasons: for every product given, one sentence of 10 to 22 words in simple English saying why it suits them, tying its real notes
  to something they chose. Do not repeat the same opening twice.
Never invent products, notes, prices, offers or claims about how long a scent lasts. Do not mention percentages. No emojis.
Do not name any city, town or real place. If the scent is for him, write for a man; if for her, write for a woman.`;

const TOOL = {
  name: 'scent_words',
  description: 'Return the story and one reason per product slug.',
  input_schema: {
    type: 'object',
    properties: {
      story: { type: 'string' },
      reasons: { type: 'array', items: { type: 'object', properties: { slug: { type: 'string' }, reason: { type: 'string' } }, required: ['slug', 'reason'] } }
    },
    required: ['story', 'reasons']
  }
};

module.exports = async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') { res.status(405).json({ error: 'Use POST.' }); return; }
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) { res.status(501).json({ error: 'The AI scent writer is not switched on.' }); return; }
  let body = req.body;
  if (typeof body === 'string') { try { body = JSON.parse(body); } catch (e) { body = null; } }
  if (!body || !Array.isArray(body.answers) || !Array.isArray(body.picks) || !body.picks.length) { res.status(400).json({ error: 'Missing answers.' }); return; }

  const answers = body.answers.slice(0, 6).map((x) => ({ q: clip(x && x.q, 120), a: clip(x && x.a, 160) }));
  const picks = body.picks.slice(0, 4).map((p) => ({ slug: clip(p && p.slug, 80), brand: clip(p && p.brand, 60), name: clip(p && p.name, 100), family: clip(p && p.family, 40), notes: clip(p && p.notes, 160), forTheHome: !!(p && p.home) }));
  const profile = { name: clip(body.profile && body.profile.name, 60), families: (body.profile && Array.isArray(body.profile.families) ? body.profile.families : []).slice(0, 4).map((f) => clip(f, 40)) };
  const slugs = new Set(picks.map((p) => p.slug));

  try {
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-api-key': key, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({
        model: process.env.SCENT_MODEL || 'claude-haiku-5-5',
        max_tokens: 900,
        system: SYSTEM,
        tools: [TOOL],
        tool_choice: { type: 'tool', name: TOOL.name },
        messages: [{ role: 'user', content: 'Customer answers and our picks (JSON):\n' + JSON.stringify({ answers, profile, picks }) }]
      })
    });
    if (!r.ok) { res.status(502).json({ error: 'The AI did not answer.' }); return; }
    const j = await r.json();
    const out = (j.content || []).find((c) => c.type === 'tool_use');
    const input = out && out.input;
    if (!input || typeof input.story !== 'string') { res.status(502).json({ error: 'The AI did not answer.' }); return; }
    const reasons = {};
    (Array.isArray(input.reasons) ? input.reasons : []).forEach((x) => { if (x && slugs.has(x.slug) && typeof x.reason === 'string') reasons[x.slug] = x.reason.slice(0, 220); });
    res.status(200).json({ story: input.story.slice(0, 500), reasons });
  } catch (e) {
    res.status(502).json({ error: 'The AI did not answer.' });
  }
};
