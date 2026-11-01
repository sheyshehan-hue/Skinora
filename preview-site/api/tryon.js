// Skinora AI try-on: puts one suggested haircut or beard on the customer's selfie.
// Vercel serverless function (Node). Needs the environment variable GEMINI_API_KEY.
// Optional: GEMINI_IMAGE_MODEL (default gemini-2.5-flash-image).
// The selfie is sent to Google's Gemini API to make the picture. Nothing is stored here.
const STYLES = require('./tryon-styles.json');

const MAX_IMAGE = 1800000; // base64 characters, about 1.3 MB

function prompt(st, kind, texture) {
  if (kind === 'beard') {
    return 'Edit this photo of a man. Change only his facial hair to this beard style: ' + st.n + '. How it is cut: ' + st.ask +
      ' Keep the hair on his head, his face, identity, facial features, skin tone, expression, clothing, background, lighting and camera angle exactly the same. ' +
      'The result must look like a real, natural photo of the same person, not a drawing.';
  }
  return 'Edit this photo. Give the person this haircut: ' + st.n + '. How it is cut: ' + st.ask +
    (texture ? ' Their natural hair texture is ' + texture + '.' : '') +
    ' Change only the hair on the head. Keep the face, identity, facial features, skin tone, makeup, facial hair, expression, clothing, background, lighting and camera angle exactly the same. ' +
    'Keep the person\'s own hair colour. The result must look like a real, natural photo of the same person taken right after a salon visit, not a drawing.';
}

module.exports = async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') { res.status(405).json({ error: 'Use POST.' }); return; }
  const key = process.env.GEMINI_API_KEY;
  if (!key) { res.status(503).json({ error: 'The try-on is not switched on yet.' }); return; }
  let body = req.body;
  if (typeof body === 'string') { try { body = JSON.parse(body); } catch (e) { body = null; } }
  if (!body || typeof body.image !== 'string' || typeof body.id !== 'string') { res.status(400).json({ error: 'Missing photo or style.' }); return; }
  const kind = body.kind === 'beard' ? 'beard' : 'cut';
  const st = (kind === 'beard' ? STYLES.beards : STYLES.cuts)[body.id];
  if (!st) { res.status(400).json({ error: 'Unknown style.' }); return; }
  const image = body.image.replace(/^data:image\/[a-z]+;base64,/, '');
  if (image.length > MAX_IMAGE || !/^[A-Za-z0-9+/=]+$/.test(image)) { res.status(400).json({ error: 'That photo is too large.' }); return; }
  const texture = { s: 'straight', w: 'wavy', c: 'curly', k: 'coily' }[body.texture] || '';
  const model = process.env.GEMINI_IMAGE_MODEL || 'gemini-2.5-flash-image';
  try {
    const r = await fetch('https://generativelanguage.googleapis.com/v1beta/models/' + encodeURIComponent(model) + ':generateContent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ inlineData: { mimeType: 'image/jpeg', data: image } }, { text: prompt(st, kind, texture) }] }],
        generationConfig: { responseModalities: ['TEXT', 'IMAGE'] }
      })
    });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) { console.error('gemini', r.status, JSON.stringify(j).slice(0, 500)); res.status(502).json({ error: 'The AI could not make this picture. Please try again.' }); return; }
    const parts = (j.candidates && j.candidates[0] && j.candidates[0].content && j.candidates[0].content.parts) || [];
    const img = parts.find(p => p.inlineData && p.inlineData.data) || parts.find(p => p.inline_data && p.inline_data.data);
    if (!img) { console.error('gemini no image', JSON.stringify(j).slice(0, 500)); res.status(502).json({ error: 'The AI could not make this picture. Try a clearer, front-facing selfie.' }); return; }
    const d = img.inlineData || img.inline_data;
    res.status(200).json({ image: 'data:' + (d.mimeType || d.mime_type || 'image/png') + ';base64,' + d.data });
  } catch (e) {
    console.error('tryon', e);
    res.status(502).json({ error: 'The AI could not make this picture. Please try again.' });
  }
};
