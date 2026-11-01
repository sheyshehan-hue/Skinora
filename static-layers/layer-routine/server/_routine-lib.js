// Shared helpers for the routine reminder functions: WhatsApp Cloud API and Upstash Redis (REST).
// The leading underscore keeps Vercel from turning this file into its own endpoint.
const GRAPH = 'https://graph.facebook.com/v21.0/';

function env(...names) { for (const n of names) if (process.env[n]) return process.env[n]; return ''; }
const waReady = () => !!(env('WHATSAPP_TOKEN') && env('WHATSAPP_PHONE_NUMBER_ID'));
const dbReady = () => !!(env('KV_REST_API_URL', 'UPSTASH_REDIS_REST_URL') && env('KV_REST_API_TOKEN', 'UPSTASH_REDIS_REST_TOKEN'));

async function redis(...cmd) {
  const r = await fetch(env('KV_REST_API_URL', 'UPSTASH_REDIS_REST_URL'), {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + env('KV_REST_API_TOKEN', 'UPSTASH_REDIS_REST_TOKEN'), 'Content-Type': 'application/json' },
    body: JSON.stringify(cmd),
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok || j.error) throw new Error('Storage error: ' + (j.error || r.status));
  return j.result;
}

// Sri Lankan mobile numbers only, as 94XXXXXXXXX
function slPhone(v) {
  const m = /^(?:\+94|0094|94|0)?(7\d{8})$/.exec(String(v || '').replace(/[\s()-]/g, ''));
  return m ? '94' + m[1] : null;
}

// Business-started WhatsApp messages must use a template approved by Meta. params fill {{1}}, {{2}}, ...
async function sendTemplate(to, name, params) {
  const r = await fetch(GRAPH + env('WHATSAPP_PHONE_NUMBER_ID') + '/messages', {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + env('WHATSAPP_TOKEN'), 'Content-Type': 'application/json' },
    body: JSON.stringify({
      messaging_product: 'whatsapp', to, type: 'template',
      template: {
        name, language: { code: env('WHATSAPP_TEMPLATE_LANG') || 'en' },
        components: params && params.length ? [{ type: 'body', parameters: params.map((t) => ({ type: 'text', text: String(t).slice(0, 900) })) }] : [],
      },
    }),
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error((j.error && j.error.message) || 'WhatsApp error ' + r.status);
  return j;
}

const TEMPLATES = {
  welcome: () => env('WHATSAPP_TEMPLATE_WELCOME') || 'routine_welcome',
  reminder: () => env('WHATSAPP_TEMPLATE_REMINDER') || 'routine_reminder',
  refill: () => env('WHATSAPP_TEMPLATE_REFILL') || 'refill_nudge',
};
const SITE = () => (env('SITE_URL') || 'https://skinora.lk').replace(/\/$/, '');

async function body(req) {
  let b = req.body;
  if (typeof b === 'string') { try { b = JSON.parse(b); } catch (e) { b = null; } }
  return b || {};
}

module.exports = { env, waReady, dbReady, redis, slPhone, sendTemplate, TEMPLATES, SITE, body };
