/**
 * Zercy Logbook — Send Magic Link
 * POST { email }
 * → stores token in Supabase, sends email via Resend
 */

const { sb, setCors, setSessionCookie } = require('./_logbook-auth');
const crypto = require('crypto');

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const APP_URL = process.env.APP_URL || 'https://zercy.app';

async function sendMagicLink(email, token) {
  const link = `${APP_URL}/logbook/verify?token=${token}`;

  if (!RESEND_API_KEY) {
    // Dev mode: return the link directly (no email sent)
    return { dev_link: link };
  }

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${RESEND_API_KEY}`
    },
    body: JSON.stringify({
      from: 'Zercy Logbook <logbook@zercy.app>',
      to: [email],
      subject: 'Your Zercy Logbook login link',
      html: `
        <div style="font-family: Inter, sans-serif; max-width: 480px; margin: 0 auto; padding: 40px 24px;">
          <div style="margin-bottom: 32px;">
            <span style="font-size: 1.6rem;">✈</span>
            <span style="font-family: 'Plus Jakarta Sans', sans-serif; font-weight: 800; font-size: 1.4rem; color: #0F172A; margin-left: 8px;">Zercy</span>
          </div>
          <h1 style="font-size: 1.4rem; font-weight: 700; color: #0F172A; margin-bottom: 12px;">Sign in to your Logbook</h1>
          <p style="color: #475569; margin-bottom: 28px;">Click the button below to sign in. The link expires in 1 hour.</p>
          <a href="${link}" style="display: inline-block; background: #F97316; color: #fff; padding: 14px 28px; border-radius: 50px; font-weight: 700; text-decoration: none; font-size: 1rem;">Open my Logbook →</a>
          <p style="color: #94A3B8; font-size: 0.85rem; margin-top: 32px;">Or copy this link:<br><span style="color: #0EA5E9;">${link}</span></p>
          <p style="color: #CBD5E1; font-size: 0.8rem; margin-top: 40px; border-top: 1px solid #E2E8F0; padding-top: 20px;">If you didn't request this link, you can ignore this email.</p>
        </div>
      `
    })
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Resend error: ${err}`);
  }

  return { sent: true };
}

module.exports = async function handler(req, res) {
  setCors(req, res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { email } = req.body || {};
  if (!email || !email.includes('@')) {
    return res.status(400).json({ error: 'Valid email required' });
  }

  const normalizedEmail = email.trim().toLowerCase();

  // Generate token (URL-safe UUID)
  const token = crypto.randomUUID().replace(/-/g, '');

  // Delete any existing unused tokens for this email
  await sb(`/logbook_magic_links?email=eq.${encodeURIComponent(normalizedEmail)}&used_at=is.null`, {
    method: 'DELETE',
    prefer: ''
  }).catch(() => {}); // ignore errors

  // Store new token
  const expires = new Date(Date.now() + 60 * 60 * 1000).toISOString(); // 1 hour
  await sb('/logbook_magic_links', {
    method: 'POST',
    body: { email: normalizedEmail, token, expires_at: expires }
  });

  // Send magic link email via Resend
  try {
    await sendMagicLink(normalizedEmail, token);
    return res.status(200).json({ success: true, email_sent: true });
  } catch (err) {
    console.error('Magic link send failed:', err.message);
    return res.status(500).json({ error: 'Could not send email. Please try again later.' });
  }
};
