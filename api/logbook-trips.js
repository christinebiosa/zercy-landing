/**
 * Zercy Logbook — Trips API
 * GET    → list all trips for authenticated user
 * POST   { name, destination, start_date, end_date, emoji } → create trip
 * DELETE ?id=XXX → delete trip
 */

const { sb, verifySession, setCors } = require('./_logbook-auth');

module.exports = async function handler(req, res) {
  setCors(req, res);
  if (req.method === 'OPTIONS') return res.status(200).end();

  const session = verifySession(req);
  if (!session) return res.status(401).json({ error: 'Not authenticated' });

  const { userId } = session;

  // ── GET: list trips ─────────────────────────────────────────────────────────
  if (req.method === 'GET') {
    const trips = await sb(
      `/logbook_trips?user_id=eq.${userId}&select=*,logbook_bookings(count)&order=start_date.asc.nullslast,created_at.desc`
    ).catch(err => { throw err; });

    // Compute status for each trip
    const now = new Date();
    const enriched = (trips || []).map(trip => {
      let status = 'upcoming';
      if (trip.start_date && trip.end_date) {
        const start = new Date(trip.start_date);
        const end = new Date(trip.end_date);
        if (end < now) status = 'past';
        else if (start <= now) status = 'active';
      }
      return { ...trip, status, booking_count: trip.logbook_bookings?.[0]?.count || 0 };
    });

    return res.status(200).json(enriched);
  }

  // ── POST: create trip ───────────────────────────────────────────────────────
  if (req.method === 'POST') {
    const { name, destination, start_date, end_date, emoji } = req.body || {};
    if (!name?.trim()) return res.status(400).json({ error: 'Trip name required' });

    const created = await sb('/logbook_trips', {
      method: 'POST',
      body: {
        user_id: userId,
        name: name.trim(),
        destination: destination?.trim() || null,
        start_date: start_date || null,
        end_date: end_date || null,
        emoji: emoji || '✈️'
      }
    });

    return res.status(201).json(created[0]);
  }

  // ── PATCH: update trip ──────────────────────────────────────────────────────
  if (req.method === 'PATCH') {
    const id = req.query?.id || new URL(req.url, 'https://x').searchParams.get('id');
    if (!id) return res.status(400).json({ error: 'Trip id required' });

    const { name, destination, start_date, end_date, emoji } = req.body || {};
    const update = {};
    if (name !== undefined) update.name = name.trim();
    if (destination !== undefined) update.destination = destination?.trim() || null;
    if (start_date !== undefined) update.start_date = start_date || null;
    if (end_date !== undefined) update.end_date = end_date || null;
    if (emoji !== undefined) update.emoji = emoji;

    await sb(`/logbook_trips?id=eq.${id}&user_id=eq.${userId}`, {
      method: 'PATCH',
      body: update,
      prefer: ''
    });

    return res.status(200).json({ success: true });
  }

  // ── DELETE: remove trip ─────────────────────────────────────────────────────
  if (req.method === 'DELETE') {
    const id = req.query?.id || new URL(req.url, 'https://x').searchParams.get('id');
    if (!id) return res.status(400).json({ error: 'Trip id required' });

    await sb(`/logbook_trips?id=eq.${id}&user_id=eq.${userId}`, {
      method: 'DELETE',
      prefer: ''
    });

    return res.status(200).json({ success: true });
  }

  return res.status(405).json({ error: 'Method not allowed' });
};
