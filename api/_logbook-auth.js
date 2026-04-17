/**
 * Zercy Logbook — Shared Auth Utilities
 * Used by all logbook API endpoints.
 */

const crypto = require('crypto');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
const SESSION_SECRET = process.env.LOGBOOK_SECRET || 'zercy-logbook-dev-secret-CHANGE-ME';
const COOKIE_NAME = 'zlb';
const COOKIE_MAX_AGE = 90 * 24 * 60 * 60; // 90 days in seconds

// ── Supabase REST helper ──────────────────────────────────────────────────────

async function sb(path, opts = {}) {
  const url = `${SUPABASE_URL}/rest/v1${path}`;
  const method = opts.method || 'GET';
  const body = opts.body ? JSON.stringify(opts.body) : undefined;

  const res = await fetch(url, {
    method,
    body,
    headers: {
      'Content-Type': 'application/json',
      'apikey': SUPABASE_SERVICE_KEY,
      'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
      'Prefer': opts.prefer || (method === 'POST' ? 'return=representation' : ''),
      ...(opts.headers || {})
    }
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Supabase ${method} ${path} → ${res.status}: ${err}`);
  }
  if (res.status === 204 || res.headers.get('content-length') === '0') return null;
  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

// ── Cookie / session ──────────────────────────────────────────────────────────

function sign(data) {
  return crypto.createHmac('sha256', SESSION_SECRET).update(data).digest('hex');
}

function createSessionToken(userId) {
  const exp = Math.floor(Date.now() / 1000) + COOKIE_MAX_AGE;
  const payload = `${userId}:${exp}`;
  return `${payload}:${sign(payload)}`;
}

function parseSessionToken(token) {
  if (!token) return null;
  try {
    // Format: userId:exp:sig  (userId is a UUID without colons, exp is a number)
    const lastColon = token.lastIndexOf(':');
    const secondLastColon = token.lastIndexOf(':', lastColon - 1);
    const sig = token.slice(lastColon + 1);
    const payload = token.slice(0, lastColon);
    const exp = parseInt(token.slice(secondLastColon + 1, lastColon), 10);
    const userId = token.slice(0, secondLastColon);

    if (sign(payload) !== sig) return null;
    if (exp < Math.floor(Date.now() / 1000)) return null;
    return { userId };
  } catch {
    return null;
  }
}

function parseCookies(str) {
  const result = {};
  if (!str) return result;
  str.split(';').forEach(c => {
    const idx = c.indexOf('=');
    if (idx > 0) {
      const key = c.slice(0, idx).trim();
      const val = c.slice(idx + 1).trim();
      try { result[key] = decodeURIComponent(val); } catch { result[key] = val; }
    }
  });
  return result;
}

function verifySession(req) {
  const cookies = parseCookies(req.headers.cookie || '');
  return parseSessionToken(cookies[COOKIE_NAME]);
}

function setSessionCookie(res, userId) {
  const token = createSessionToken(userId);
  const encoded = encodeURIComponent(token);
  res.setHeader('Set-Cookie',
    `${COOKIE_NAME}=${encoded}; Max-Age=${COOKIE_MAX_AGE}; HttpOnly; SameSite=Lax; Path=/`
  );
}

function clearSessionCookie(res) {
  res.setHeader('Set-Cookie',
    `${COOKIE_NAME}=; Max-Age=0; HttpOnly; SameSite=Lax; Path=/`
  );
}

// ── CORS ──────────────────────────────────────────────────────────────────────

function cors(res) {
  const origins = ['https://zercy.app', 'https://www.zercy.app', 'http://localhost:4321'];
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  // Allow origin is set per-request in the handler
}

function setCors(req, res) {
  const origin = req.headers.origin || '';
  const allowed = ['https://zercy.app', 'https://www.zercy.app', 'http://localhost:4321'];
  if (allowed.includes(origin) || !origin) {
    res.setHeader('Access-Control-Allow-Origin', origin || 'https://zercy.app');
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
}

module.exports = {
  sb,
  verifySession,
  setSessionCookie,
  clearSessionCookie,
  setCors,
  COOKIE_NAME,
  COOKIE_MAX_AGE
};
