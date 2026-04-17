/**
 * Zercy Logbook — Verify Magic Link
 * GET ?token=XXX
 * → validates token, creates/finds user, sets session cookie, redirects to /logbook
 */

const { sb, setSessionCookie, setCors } = require('./_logbook-auth');

const APP_URL = process.env.APP_URL || 'https://zercy.app';

module.exports = async function handler(req, res) {
  setCors(req, res);
  if (req.method === 'OPTIONS') return res.status(200).end();

  const token = req.query?.token || new URL(req.url, 'https://x').searchParams.get('token');
  if (!token) {
    return res.redirect(302, `${APP_URL}/logbook/login?error=missing_token`);
  }

  // Look up token
  const links = await sb(
    `/logbook_magic_links?token=eq.${encodeURIComponent(token)}&used_at=is.null&select=*`
  ).catch(() => null);

  if (!links || links.length === 0) {
    return res.redirect(302, `${APP_URL}/logbook/login?error=invalid_token`);
  }

  const link = links[0];

  // Check expiry
  if (new Date(link.expires_at) < new Date()) {
    return res.redirect(302, `${APP_URL}/logbook/login?error=expired`);
  }

  const email = link.email;

  // Mark token as used
  await sb(`/logbook_magic_links?id=eq.${link.id}`, {
    method: 'PATCH',
    body: { used_at: new Date().toISOString() }
  }).catch(() => {});

  // Find or create user
  let userId;
  const existing = await sb(`/logbook_users?email=eq.${encodeURIComponent(email)}&select=id`).catch(() => null);

  if (existing && existing.length > 0) {
    userId = existing[0].id;
  } else {
    const created = await sb('/logbook_users', {
      method: 'POST',
      body: { email }
    });
    userId = created[0].id;
  }

  // Set session cookie
  setSessionCookie(res, userId);

  // Redirect to logbook
  return res.redirect(302, `${APP_URL}/logbook`);
};
