// DiscoverCars Redirect-Endpoint (Edge Runtime).
//
// Warum das nötig ist: DC unterstützt keine öffentlichen Deep-Links mit Datum + Ort.
// Die echte Suche macht POST an /en/search/create-search mit internen numerischen IDs
// (pick_up_country_id, pick_up_city_id, pick_up_location_id). Öffentliche Autocomplete-API
// liefert diese IDs für einen City-Namen.
//
// Flow:
// 1. Frontend linkt auf /api/dc-redirect?city=X&pickupDate=Y&dropoffDate=Z
// 2. Route ruft DC-Autocomplete auf, holt IDs
// 3. POSTet create-search mit IDs + Daten
// 4. Redirectet User auf die zurückgelieferte Suchergebnis-URL (mit a_aid dran)
//
// Env-Variable nötig (sobald DC-Approval da): DC_AFFILIATE_ID
// Ohne AID läuft die Route als Best-Effort-Redirect ohne Tracking.
//
// Edge Runtime gewählt, weil (a) Hobby-Plan-Limit für Node-Functions,
// (b) dieser Endpoint ist idealer Edge-Kandidat: nur fetch + redirect.

export const config = { runtime: 'edge' };

const USER_AGENT = 'Mozilla/5.0 (compatible; ZercyBot/1.0; +https://zercy.app)';

function appendAid(url, aid) {
  if (!aid) return url;
  if (url.includes('a_aid=')) return url;
  const sep = url.includes('?') ? '&' : '?';
  return `${url}${sep}a_aid=${encodeURIComponent(aid)}`;
}

function isoDateTime(date, time) {
  const t = time && /^\d{2}:\d{2}$/.test(time) ? time : '10:00';
  return `${date} ${t}`;
}

export default async function handler(req) {
  const aid = process.env.DC_AFFILIATE_ID || '';
  const fallback = appendAid('https://www.discovercars.com/', aid);

  const url = new URL(req.url);
  const city = url.searchParams.get('city');
  const pickupDate = url.searchParams.get('pickupDate');
  const dropoffDate = url.searchParams.get('dropoffDate');
  const pickupTime = url.searchParams.get('pickupTime') || '10:00';
  const dropoffTime = url.searchParams.get('dropoffTime') || '10:00';
  const driverAge = url.searchParams.get('driverAge') || '35';

  if (!city) return Response.redirect(fallback, 302);

  try {
    // Schritt 1: Autocomplete — City-Name → IDs
    const acUrl = `https://www.discovercars.com/en/search/autocomplete/${encodeURIComponent(city)}`;
    const acRes = await fetch(acUrl, {
      headers: { 'User-Agent': USER_AGENT, 'Accept': 'application/json' },
    });
    if (!acRes.ok) throw new Error(`autocomplete HTTP ${acRes.status}`);
    const suggestions = await acRes.json();
    if (!Array.isArray(suggestions) || suggestions.length === 0) {
      return Response.redirect(fallback, 302);
    }

    // Airport bevorzugen, sonst downtown, sonst erstes Ergebnis
    const pick =
      suggestions.find(s => s.location === 'airport') ||
      suggestions.find(s => s.location === 'downtown') ||
      suggestions[0];

    if (!pick.placeID || !pick.cityID || !pick.countryID) {
      return Response.redirect(fallback, 302);
    }

    // Ohne Datum kein POST — fallback zur Homepage mit aid
    if (!pickupDate || !dropoffDate) {
      return Response.redirect(fallback, 302);
    }

    // Schritt 2: POST an create-search
    const form = new URLSearchParams();
    form.set('pick_up_country_id', String(pick.countryID));
    form.set('pick_up_city_id', String(pick.cityID));
    form.set('pick_up_location_id', String(pick.placeID));
    form.set('drop_off_country_id', String(pick.countryID));
    form.set('drop_off_city_id', String(pick.cityID));
    form.set('drop_off_location_id', String(pick.placeID));
    form.set('pickup_from', isoDateTime(pickupDate, pickupTime));
    form.set('pickup_to', isoDateTime(dropoffDate, dropoffTime));
    form.set('pick_time', pickupTime);
    form.set('drop_time', dropoffTime);
    form.set('driver_age', String(driverAge));

    const createRes = await fetch('https://www.discovercars.com/en/search/create-search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': USER_AGENT,
        'Referer': 'https://www.discovercars.com/',
        'Accept': 'application/json, text/html;q=0.9',
      },
      body: form.toString(),
      redirect: 'manual',
    });

    // DC könnte zurückgeben:
    // (a) 30x mit Location-Header zur Suchergebnisseite
    // (b) 200 JSON mit search_id / url / redirect
    // (c) 200 HTML mit embedded search_id

    // (a) Location-Header
    const locHeader = createRes.headers.get('location');
    if (locHeader) {
      const target = locHeader.startsWith('http')
        ? locHeader
        : `https://www.discovercars.com${locHeader}`;
      return Response.redirect(appendAid(target, aid), 302);
    }

    // (b/c) Body lesen und nach search_id/url suchen
    const contentType = createRes.headers.get('content-type') || '';
    const bodyText = await createRes.text();

    if (contentType.includes('application/json')) {
      try {
        const json = JSON.parse(bodyText);
        const jsonUrl = json.url || json.redirect || json.search_url;
        if (jsonUrl) {
          const target = jsonUrl.startsWith('http') ? jsonUrl : `https://www.discovercars.com${jsonUrl}`;
          return Response.redirect(appendAid(target, aid), 302);
        }
        const sid = json.search_id || json.searchID || json.id;
        if (sid) {
          return Response.redirect(appendAid(`https://www.discovercars.com/en/search/${sid}`, aid), 302);
        }
      } catch { /* fall through */ }
    }

    // Fallback-Versuch: search_id im HTML suchen
    const sidMatch = bodyText.match(/search[_-]?id["':\s]+["']?([a-zA-Z0-9\-]{8,})/i);
    if (sidMatch && sidMatch[1]) {
      return Response.redirect(appendAid(`https://www.discovercars.com/en/search/${sidMatch[1]}`, aid), 302);
    }

    // Alle Versuche fehlgeschlagen: Homepage mit aid
    return Response.redirect(fallback, 302);
  } catch (err) {
    console.error('[dc-redirect] error:', err?.message || err);
    return Response.redirect(fallback, 302);
  }
}
