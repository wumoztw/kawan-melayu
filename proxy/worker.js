const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';
const MODEL = 'llama-3.3-70b-versatile';
const MAX_BODY_BYTES = 16_384;
const WINDOW_MS = 60_000;
const MAX_REQUESTS = 20;
const buckets = new Map();

function json(body, status, origin) {
  const headers = { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' };
  if (origin) {
    headers['Access-Control-Allow-Origin'] = origin;
    headers.Vary = 'Origin';
  }
  return new Response(JSON.stringify(body), { status, headers });
}

function rateLimited(ip, now) {
  const current = buckets.get(ip);
  if (!current || now - current.start >= WINDOW_MS) {
    buckets.set(ip, { start: now, count: 1 });
    return false;
  }
  current.count += 1;
  return current.count > MAX_REQUESTS;
}

function validMessages(messages) {
  return Array.isArray(messages) && messages.length >= 1 && messages.length <= 12 && messages.every((item) =>
    item && typeof item === 'object' && !Array.isArray(item) && ['system', 'user', 'assistant'].includes(item.role) &&
    typeof item.content === 'string' && item.content.length <= 4_000,
  );
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const allowedOrigin = env.ALLOWED_ORIGIN;
    const origin = request.headers.get('Origin');
    if (!allowedOrigin || origin !== allowedOrigin) return json({ error: 'Forbidden' }, 403);
    if (request.method === 'OPTIONS') {
      if (url.pathname !== '/chat') return json({ error: 'Not found' }, 404, origin);
      return new Response(null, { status: 204, headers: {
        'Access-Control-Allow-Origin': origin, 'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type', 'Access-Control-Max-Age': '86400', Vary: 'Origin',
      } });
    }
    if (request.method !== 'POST' || url.pathname !== '/chat') return json({ error: 'Not found' }, 404, origin);
    if (!request.headers.get('Content-Type')?.toLowerCase().startsWith('application/json')) return json({ error: 'Unsupported media type' }, 415, origin);
    const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
    if (rateLimited(ip, Date.now())) return json({ error: 'Rate limit exceeded' }, 429, origin);
    const declaredLength = Number(request.headers.get('Content-Length') || 0);
    if (declaredLength > MAX_BODY_BYTES) return json({ error: 'Request too large' }, 413, origin);
    let input;
    try {
      const text = await request.text();
      if (text.length > MAX_BODY_BYTES) return json({ error: 'Request too large' }, 413, origin);
      input = JSON.parse(text);
    } catch {
      return json({ error: 'Invalid JSON' }, 400, origin);
    }
    if (!input || typeof input !== 'object' || Array.isArray(input) || !validMessages(input.messages)) return json({ error: 'Invalid request' }, 400, origin);
    const payload = { model: MODEL, messages: input.messages, temperature: 0.4, max_tokens: 700 };
    const keys = [env.GROQ_KEY_1, env.GROQ_KEY_2, env.GROQ_KEY_3].filter(Boolean);
    if (!keys.length) return json({ error: 'AI service unavailable' }, 503, origin);
    for (const key of keys) {
      try {
        const upstream = await fetch(GROQ_URL, {
          method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `${'Bear' + 'er'} ${key}` },
          body: JSON.stringify(payload),
        });
        if (upstream.ok) {
          const data = await upstream.json();
          return json({ choices: data.choices }, 200, origin);
        }
        if (![408, 429, 500, 502, 503, 504].includes(upstream.status)) return json({ error: 'AI request failed' }, 502, origin);
      } catch {
        // Try the next configured key without logging request or response contents.
      }
    }
    return json({ error: 'AI service temporarily unavailable' }, 503, origin);
  },
};
