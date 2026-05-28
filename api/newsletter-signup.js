export const config = { runtime: 'edge' };

export default async function handler(req) {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405 });
  }

  let body;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON' }), { status: 400 });
  }

  const { email, name = '', lang = 'de' } = body;

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return new Response(JSON.stringify({ error: 'Invalid email' }), { status: 400 });
  }

  const RESEND_API_KEY = process.env.RESEND_API_KEY;
  const RESEND_AUDIENCE_ID = process.env.RESEND_AUDIENCE_ID;

  if (!RESEND_API_KEY || !RESEND_AUDIENCE_ID) {
    return new Response(JSON.stringify({ error: 'Not configured' }), { status: 500 });
  }

  // Kontakt zur Resend Audience hinzufügen
  const contactRes = await fetch(`https://api.resend.com/audiences/${RESEND_AUDIENCE_ID}/contacts`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email, first_name: name, unsubscribed: false }),
  });

  if (!contactRes.ok) {
    // 422 = bereits registriert — trotzdem als Erfolg behandeln
    if (contactRes.status !== 422) {
      return new Response(JSON.stringify({ error: 'Subscription failed' }), { status: 500 });
    }
  }

  // Benachrichtigungs-Mail an Christine (nur bei neuer Anmeldung, nicht bei 422 = bereits registriert)
  if (contactRes.ok) {
    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: 'Zercy <info@zercy.app>',
        to: ['christine.bork@biosacr.com'],
        subject: `Neue Anmeldung: ${email}`,
        text: `Neue Newsletter-Anmeldung auf zercy.app\n\nE-Mail: ${email}\nSprache: ${lang}\n`,
      }),
    });
  }

  // Willkommens-E-Mail senden
  const isEN = lang === 'en';
  await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: 'Zercy <info@zercy.app>',
      to: [email],
      subject: isEN
        ? 'Welcome to Zercy Pick — your weekly travel intel'
        : 'Willkommen bei Zercy Pick',
      html: isEN ? welcomeEN(name) : welcomeDE(name),
    }),
  });

  return new Response(JSON.stringify({ success: true }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}

function welcomeDE(name) {
  const greeting = name ? `Hey ${name},` : 'Hey,';
  return `<!DOCTYPE html>
<html lang="de">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:Inter,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;padding:40px 0;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#0f172a;border-radius:16px;overflow:hidden;max-width:560px;width:100%;">
        <tr><td style="padding:32px 40px 24px;text-align:center;">
          <p style="margin:0;font-family:'Plus Jakarta Sans',Arial,sans-serif;font-size:1.5rem;font-weight:800;color:#fff;">✈ Zercy</p>
        </td></tr>
        <tr><td style="background:#fff;padding:32px 40px;">
          <p style="margin:0 0 16px;font-size:1.1rem;font-weight:700;color:#0f172a;">${greeting}</p>
          <p style="margin:0 0 16px;color:#334155;line-height:1.6;">
            ab jetzt bekommst du jede Woche den <strong>Zercy Pick</strong>: eine Stadt, die es wert ist,
            drei Hotel-Empfehlungen für jedes Budget, und einen Flug-Timing-Tipp.
          </p>
          <p style="margin:0 0 24px;color:#334155;line-height:1.6;">
            Kein Füller, keine Werbung. Nur das, was du wirklich brauchst um besser zu reisen.
          </p>
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr><td align="center">
              <a href="https://zercy.app" style="display:inline-block;background:#0ea5e9;color:#fff;padding:14px 28px;border-radius:50px;font-weight:700;font-size:0.95rem;text-decoration:none;">
                Zercy jetzt ausprobieren
              </a>
            </td></tr>
          </table>
        </td></tr>
        <tr><td style="padding:20px 40px;text-align:center;">
          <p style="margin:0;color:rgba(255,255,255,0.4);font-size:0.78rem;line-height:1.5;">
            Du erhältst diese E-Mail weil du dich auf zercy.app angemeldet hast.<br>
            <a href="https://zercy.app/privacy" style="color:rgba(255,255,255,0.4);">Datenschutz</a> &nbsp;·&nbsp;
            Abmelden: einfach auf diese E-Mail antworten mit "Abmelden".
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

function welcomeEN(name) {
  const greeting = name ? `Hey ${name},` : 'Hey there,';
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:Inter,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;padding:40px 0;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#0f172a;border-radius:16px;overflow:hidden;max-width:560px;width:100%;">
        <tr><td style="padding:32px 40px 24px;text-align:center;">
          <p style="margin:0;font-family:'Plus Jakarta Sans',Arial,sans-serif;font-size:1.5rem;font-weight:800;color:#fff;">✈ Zercy</p>
        </td></tr>
        <tr><td style="background:#fff;padding:32px 40px;">
          <p style="margin:0 0 16px;font-size:1.1rem;font-weight:700;color:#0f172a;">${greeting}</p>
          <p style="margin:0 0 16px;color:#334155;line-height:1.6;">
            you're now on the <strong>Zercy Pick</strong> list. Every week: one city worth your time,
            three hotel picks for every budget, and one flight timing tip.
          </p>
          <p style="margin:0 0 24px;color:#334155;line-height:1.6;">
            No filler, no ads. Just the intel you actually need to travel smarter.
          </p>
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr><td align="center">
              <a href="https://zercy.app" style="display:inline-block;background:#0ea5e9;color:#fff;padding:14px 28px;border-radius:50px;font-weight:700;font-size:0.95rem;text-decoration:none;">
                Try Zercy now
              </a>
            </td></tr>
          </table>
        </td></tr>
        <tr><td style="padding:20px 40px;text-align:center;">
          <p style="margin:0;color:rgba(255,255,255,0.4);font-size:0.78rem;line-height:1.5;">
            You received this because you signed up at zercy.app.<br>
            <a href="https://zercy.app/privacy" style="color:rgba(255,255,255,0.4);">Privacy Policy</a> &nbsp;·&nbsp;
            To unsubscribe, reply to this email with "Unsubscribe".
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}
