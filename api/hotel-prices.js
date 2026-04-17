// Live hotel price lookup via SerpAPI Google Hotels
// Returns the cheapest "from" price per OTA (booking.com, expedia, hotels.com, google)
// for the given destination + check-in/check-out window.

async function withRetry(fn, attempts = 2) {
  let lastErr;
  for (let i = 0; i < attempts; i++) {
    try { return await fn(); }
    catch (e) {
      lastErr = e;
      if (i === attempts - 1) throw e;
      await new Promise(r => setTimeout(r, 800));
    }
  }
  throw lastErr;
}

function normalizeSource(s) {
  if (!s) return null;
  const lower = s.toLowerCase();
  if (lower.includes('booking')) return 'booking';
  if (lower.includes('expedia')) return 'expedia';
  if (lower.includes('hotels.com')) return 'hotels';
  if (lower.includes('agoda')) return 'agoda';
  if (lower.includes('google')) return 'google';
  return null;
}

function extractNumber(priceStr) {
  if (typeof priceStr === 'number') return priceStr;
  if (!priceStr) return null;
  const m = String(priceStr).match(/[\d.,]+/);
  if (!m) return null;
  // Strip thousands separators (assume , or . — keep last group as decimal if 2 digits)
  const cleaned = m[0].replace(/[.,](?=\d{3}\b)/g, '');
  const n = parseFloat(cleaned.replace(',', '.'));
  return isNaN(n) ? null : Math.round(n);
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).end();

  const { destination, checkin, checkout, currency } = req.body || {};
  if (!destination) return res.status(400).json({ error: 'destination required' });
  if (!process.env.SERPAPI_KEY) return res.status(200).json({ prices: {} });

  // Default a 2-night window if dates missing (SerpAPI requires both)
  const today = new Date();
  const fallbackIn = new Date(today.getTime() + 30 * 86400000).toISOString().slice(0, 10);
  const fallbackOut = new Date(today.getTime() + 32 * 86400000).toISOString().slice(0, 10);
  const ci = checkin || fallbackIn;
  const co = checkout || fallbackOut;

  try {
    const params = new URLSearchParams({
      engine: 'google_hotels',
      q: destination,
      check_in_date: ci,
      check_out_date: co,
      adults: '2',
      currency: currency || 'EUR',
      hl: 'en',
      gl: 'us',
      api_key: process.env.SERPAPI_KEY
    });
    const url = 'https://serpapi.com/search.json?' + params.toString();

    const data = await withRetry(async () => {
      const r = await fetch(url);
      if (!r.ok) throw new Error('SerpAPI ' + r.status);
      return r.json();
    });

    // Aggregate cheapest rate per OTA across all properties
    const cheapest = {}; // { booking: 89, expedia: 95, ... }
    const properties = (data.properties || []).slice(0, 25);

    for (const p of properties) {
      // Top-level rate (Google's own price)
      const topRate = extractNumber(p.rate_per_night?.extracted_lowest || p.rate_per_night?.lowest);
      if (topRate) {
        if (!cheapest.google || topRate < cheapest.google) cheapest.google = topRate;
      }
      // Per-source prices
      const priceList = p.prices || [];
      for (const entry of priceList) {
        const src = normalizeSource(entry.source);
        if (!src) continue;
        const n = extractNumber(entry.rate_per_night?.extracted_lowest || entry.rate_per_night?.lowest || entry.num);
        if (!n) continue;
        if (!cheapest[src] || n < cheapest[src]) cheapest[src] = n;
      }
    }

    return res.status(200).json({
      destination,
      checkin: ci,
      checkout: co,
      currency: currency || 'EUR',
      prices: cheapest,
      sample_size: properties.length
    });
  } catch (err) {
    return res.status(200).json({ prices: {}, error: err.message });
  }
};
