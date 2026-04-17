/**
 * Zercy Logbook — Bookings API
 * GET    ?trip_id=XXX → list bookings for a trip
 * POST   { trip_id, parsed } → save a parsed booking
 * DELETE ?id=XXX → delete a booking
 *
 * "parsed" is the object returned by /api/logbook-parse
 */

const { sb, verifySession, setCors } = require('./_logbook-auth');

// Fill in arrival_at if Claude forgot to set it
function resolveArrivalAt(parsed) {
  if (parsed.arrival_at) return parsed.arrival_at;
  const det = parsed.details || {};
  if (parsed.type === 'hotel') {
    const co = det.check_out_date || det.checkout_date || det.checkout || det.check_out || det.end_date || null;
    if (co) return co;
    if (parsed.departure_at && det.nights) {
      const d = new Date(parsed.departure_at);
      d.setDate(d.getDate() + parseInt(det.nights));
      return d.toISOString().slice(0, 10);
    }
  }
  if (parsed.type === 'car') {
    return det.dropoff_date || det.return_date || det.drop_off_date || null;
  }
  return null;
}

module.exports = async function handler(req, res) {
  setCors(req, res);
  if (req.method === 'OPTIONS') return res.status(200).end();

  const session = verifySession(req);
  if (!session) return res.status(401).json({ error: 'Not authenticated' });

  const { userId } = session;

  // Helper: verify trip belongs to user
  async function ownTrip(tripId) {
    const trips = await sb(`/logbook_trips?id=eq.${tripId}&user_id=eq.${userId}&select=id`);
    return trips && trips.length > 0;
  }

  // ── GET: list bookings ──────────────────────────────────────────────────────
  if (req.method === 'GET') {
    const tripId = req.query?.trip_id || new URL(req.url, 'https://x').searchParams.get('trip_id');
    if (!tripId) return res.status(400).json({ error: 'trip_id required' });

    if (!await ownTrip(tripId)) return res.status(403).json({ error: 'Forbidden' });

    const bookings = await sb(
      `/logbook_bookings?trip_id=eq.${tripId}&select=*&order=departure_at.asc.nullslast,created_at.asc`
    );

    return res.status(200).json(bookings || []);
  }

  // ── POST: save booking ──────────────────────────────────────────────────────
  if (req.method === 'POST') {
    const { trip_id, parsed, raw_text } = req.body || {};
    if (!trip_id || !parsed) return res.status(400).json({ error: 'trip_id and parsed required' });

    if (!await ownTrip(trip_id)) return res.status(403).json({ error: 'Forbidden' });

    const booking = await sb('/logbook_bookings', {
      method: 'POST',
      body: {
        trip_id,
        type: parsed.type || 'other',
        provider: parsed.provider || null,
        confirmation_code: parsed.confirmation_code || null,
        from_location: parsed.from_location || null,
        to_location: parsed.to_location || null,
        departure_at: parsed.departure_at || null,
        arrival_at: resolveArrivalAt(parsed),
        details: { ...(parsed.details || {}), ...(parsed.platform ? { platform: parsed.platform } : {}) },
        raw_text: raw_text || null
      }
    });

    return res.status(201).json(booking[0]);
  }

  // ── PATCH: update a single timeline entry ──────────────────────────────────
  if (req.method === 'PATCH') {
    const id = req.query?.id || new URL(req.url, 'https://x').searchParams.get('id');
    if (!id) return res.status(400).json({ error: 'Booking id required' });

    const bk = await sb(`/logbook_bookings?id=eq.${id}&select=trip_id,details`).catch(() => null);
    if (!bk || bk.length === 0) return res.status(404).json({ error: 'Not found' });
    if (!await ownTrip(bk[0].trip_id)) return res.status(403).json({ error: 'Forbidden' });

    const { entry_index, entry_patch } = req.body || {};
    const updatedDetails = { ...(bk[0].details || {}) };

    if (typeof entry_index === 'number' && entry_patch && Array.isArray(updatedDetails.timeline_entries)) {
      const entries = [...updatedDetails.timeline_entries];
      entries[entry_index] = { ...entries[entry_index], ...entry_patch };
      updatedDetails.timeline_entries = entries;
    }

    await sb(`/logbook_bookings?id=eq.${id}`, { method: 'PATCH', body: { details: updatedDetails } });
    return res.status(200).json({ success: true });
  }

  // ── DELETE: remove booking ──────────────────────────────────────────────────
  if (req.method === 'DELETE') {
    const id = req.query?.id || new URL(req.url, 'https://x').searchParams.get('id');
    if (!id) return res.status(400).json({ error: 'Booking id required' });

    // Verify ownership via trip
    const bk = await sb(`/logbook_bookings?id=eq.${id}&select=trip_id`).catch(() => null);
    if (!bk || bk.length === 0) return res.status(404).json({ error: 'Not found' });
    if (!await ownTrip(bk[0].trip_id)) return res.status(403).json({ error: 'Forbidden' });

    await sb(`/logbook_bookings?id=eq.${id}`, { method: 'DELETE', prefer: '' });

    return res.status(200).json({ success: true });
  }

  return res.status(405).json({ error: 'Method not allowed' });
};
