export const config = { runtime: 'edge' };

export default async function handler(req) {
  if (process.env.CRON_SECRET) {
    const auth = req.headers.get('authorization') || '';
    if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
      return new Response('Unauthorized', { status: 401 });
    }
  }

  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) {
    return new Response(JSON.stringify({ ok: false, error: 'missing env' }), {
      status: 500, headers: { 'content-type': 'application/json' }
    });
  }

  const res = await fetch(`${url}/rest/v1/logbook_users?select=id&limit=1`, {
    headers: { apikey: key, Authorization: `Bearer ${key}` }
  });

  return new Response(JSON.stringify({
    ok: res.ok,
    status: res.status,
    timestamp: new Date().toISOString()
  }), { status: res.ok ? 200 : 502, headers: { 'content-type': 'application/json' } });
}
