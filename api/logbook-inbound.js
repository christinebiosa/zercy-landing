/**
 * Zercy Logbook — Inbound Email Webhook
 *
 * Receives forwarded booking emails from Mailgun.
 * Mailgun POSTs multipart/form-data with the parsed email fields.
 *
 * Flow:
 *  1. Mailgun receives email at plans@in.zercy.app
 *  2. Mailgun POSTs to https://zercy.app/api/logbook-inbound
 *  3. We verify the webhook signature
 *  4. We extract sender email + body text
 *  5. We find the user by sender email
 *  6. We call Claude to parse the booking
 *  7. We save it to the user's most recent upcoming trip
 *     (or create a new trip if none exists)
 *
 * Setup: see LOGBOOK_SETUP.md → "Email Forwarding" section
 */

const Anthropic = require('@anthropic-ai/sdk');
const crypto = require('crypto');
const Busboy = require('busboy');
const { sb } = require('./_logbook-auth');

// Disable Vercel's default body parser — we need raw stream for multipart
module.exports.config = { api: { bodyParser: false } };

function parseMultipart(req) {
  return new Promise((resolve, reject) => {
    const fields = {};
    const pdfs = [];
    const bb = Busboy({ headers: req.headers, limits: { fileSize: 20 * 1024 * 1024 } });

    bb.on('field', (name, val) => { fields[name] = val; });

    bb.on('file', (name, file, info) => {
      const { filename = '', mimeType = '' } = info;
      const isPdf = mimeType === 'application/pdf' || filename.toLowerCase().endsWith('.pdf');
      if (isPdf && pdfs.length < 3) {
        const chunks = [];
        file.on('data', chunk => chunks.push(chunk));
        file.on('end', () => { pdfs.push({ filename, data: Buffer.concat(chunks) }); });
      } else {
        file.resume(); // drain without storing
      }
    });

    bb.on('finish', () => resolve({ fields, pdfs }));
    bb.on('error', reject);
    req.pipe(bb);
  });
}

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const MAILGUN_WEBHOOK_SECRET = process.env.MAILGUN_WEBHOOK_SECRET || '';

// ── Mailgun signature verification ──────────────────────────────────────────
function verifyMailgunSignature(token, timestamp, signature) {
  if (!MAILGUN_WEBHOOK_SECRET) return true; // skip in dev
  const value = timestamp + token;
  const expected = crypto
    .createHmac('sha256', MAILGUN_WEBHOOK_SECRET)
    .update(value)
    .digest('hex');
  return expected === signature;
}

// ── Parse body text (strip noise) ────────────────────────────────────────────
function cleanEmailBody(body) {
  if (!body) return '';
  let text = body;
  // Strip HTML tags if this is HTML content
  text = text.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');
  text = text.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');
  text = text.replace(/<[^>]+>/g, ' ');
  // Decode HTML entities
  text = text.replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&#39;/g, "'").replace(/&quot;/g, '"');
  // Remove image artifact lines (Mailgun renders image filenames as text)
  const lines = text.split('\n');
  const cleaned = [];
  let skipQuote = false;
  for (const line of lines) {
    const t = line.trim();
    if (!t) continue;
    // Skip image reference artifacts
    if (/^Mail Attachment\.(png|jpe?g|gif|webp)$/i.test(t)) continue;
    if (/^\[image\]$/i.test(t)) continue;
    if (/^\[cid:[^\]]+\]$/i.test(t)) continue;
    // Skip "On [date] [person] wrote:" reply chains
    if (/^On .+ wrote:$/.test(t)) { skipQuote = true; continue; }
    if (skipQuote && line.startsWith('>')) continue;
    skipQuote = false;
    cleaned.push(t);
  }
  // Collapse multiple blank lines
  return cleaned.join('\n').replace(/\n{3,}/g, '\n\n').trim();
}

// ── Claude parsing ───────────────────────────────────────────────────────────
const SYSTEM = `You are an expert travel booking parser. You receive raw text from booking confirmation emails, e-tickets, hotel vouchers, car rental confirmations, train tickets, tour bookings — anything travel-related.

Your job: extract ALL relevant information and return it as a single JSON object.

REQUIRED top-level fields (always include these):
- "type": one of "flight" | "hotel" | "car" | "train" | "activity" | "other"
- "provider": the actual property/company name (hotel name, airline, car company — NOT the booking platform)
- "platform": the booking website if applicable (e.g. "Booking.com", "Airbnb", "Expedia") — null if direct booking
- "confirmation_code": the booking reference, PNR, or reservation number
- "from_location": origin city/airport (null if not applicable)
- "to_location": destination city/airport (null if not applicable)
- "departure_at": ISO 8601 datetime of first departure/check-in/pickup (null if unknown)
- "arrival_at": ISO 8601 datetime of last arrival/checkout/dropoff (null if unknown)
- "summary": one concise line describing the whole booking
- "trip_name_suggestion": suggested name for this trip (e.g. "Europe 2026", "Tokyo March 2027")
- "details": object with ALL other extracted information — be thorough

For "details", include whatever is relevant:
- Flights: passenger name, ticket number, total price, currency, segments array (each with flight_number, from, to, departure, arrival, seat, duration, baggage, fare_class, terminal, operated_by)
- Hotels: address, check_in_date, check_out_date, nights, room_type, guests, price, currency, cancellation_policy
- Cars: pickup_location, dropoff_location, pickup_date, dropoff_date, car_model, car_type, price, currency
- Trains: segments, class, seat, price, currency

CRITICAL rules — follow exactly:
- Return ONLY the raw JSON object. No markdown, no code fences, no explanation.
- Dates in ISO 8601 format (e.g. "2026-08-15T16:00:00").
- Use null for any field you cannot determine.
- For flights: ALWAYS populate details.segments[] with one object per leg. Each segment needs: flight_number, from, to, departure (ISO 8601), arrival (ISO 8601), seat, terminal, baggage, duration, fare_class.
- For hotels: "departure_at" = check-in datetime including the earliest check-in time if stated (e.g. "2026-08-21T15:00:00"), "arrival_at" = check-out datetime including the latest check-out time if stated (e.g. "2026-08-24T11:00:00"). BOTH must be set. Also store as details.check_in_date and details.check_out_date.
- For cars: "departure_at" = pickup datetime, "arrival_at" = dropoff datetime.

TIMELINE ENTRIES — always include details.timeline_entries[]:
An array of visual timeline display objects. Build it intelligently from the booking data.

UNIVERSAL LABEL RULE (applies to ALL entry types, always): The label must always be prefixed with the relevant name — airline for flights, platform for platform-booked hotels/cars/activities, tour operator for tours, train company for trains, provider name for direct bookings. Format: "Name: Description". Examples: "Avianca: SJO → BOG", "Booking.com: Welcome Hotel Paderborn", "Hertz: Compact SUV", "Viator: Flamenco Show Madrid", "Renfe: Madrid → Barcelona". If truly no provider/platform is identifiable, omit the prefix.

Each entry object:
- "date": "YYYY-MM-DD" — calendar date this item appears on
- "time": "HH:MM" 24h format — shown above the icon. Use null if genuinely unknown — NEVER write "00:00" for an unknown time.
- "icon": "flight" | "hotel" | "car" | "train" | "activity" | "layover" | "other"
- "label": main bold text line (e.g. "SJO → MAD", "Welcome Hotel Paderborn", "Hertz: Compact")
- "sublabel": small descriptive label (e.g. "AV 204", "Check in", "Check out", "Pick up", "Drop off") — null if not needed
- "details": array of info strings the traveler needs (e.g. ["Seat 23A", "Economy Light", "2h 45m", "Confirmation ANIHNA", "€329"])
- "is_layover": true only for layover entries between flight legs (shown differently)

Rules per booking type:
- FLIGHTS: one entry per segment. label = full airport names with IATA codes, e.g. "San José Juan Santamaría Intl (SJO) → Bogotá El Dorado Intl (BOG)" — NEVER abbreviate to just codes. sublabel = flight number (e.g. "AV 204"). details = [seat, fare class, duration, baggage, terminal if known, "Arrives HH:MM" from arrival datetime]. Add field "direction": "outbound" for legs flying toward the destination, "return" for legs flying back toward the origin (null if unclear). INSERT a layover entry (is_layover: true) between consecutive segments if gap < 24h — label = "Xh Ym layover in CITY", icon = "layover", date = arrival date of preceding segment, time = arrival time of preceding segment (HH:MM) so it sorts correctly right after that flight.
- HOTELS: exactly TWO entries. Check-in: date = check-in date, time = check-in time or null, label = if platform is set ALWAYS write "Platform: Hotel Name" (e.g. "Booking.com: Welcome Hotel Paderborn") — if no platform, just the hotel name. sublabel = "Check in", details = [address if known, room type, "X nights", "€XXX" if price known, "Confirmation XXXXX"]. Check-out: date = check-out date, time = check-out time or null, label = same label as check-in, sublabel = "Check out", details = ["Confirmation XXXXX"].
- CARS: TWO entries. Pickup entry: sublabel = "Pick up", label = "Provider: Model or car type", details = [location, price]. Dropoff entry: sublabel = "Drop off", label = same, details = [location].
- TRAINS: one entry per segment. label = "FROM → TO". sublabel = train number/name.
- ACTIVITIES: one entry. label = activity name. sublabel = provider or location. details = [date/time, duration, participants, price, meeting point].
- OTHER: one entry. label = provider. sublabel = type description. details = relevant info.`;

function extractJson(raw) {
  let s = raw.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/i, '').trim();
  const start = s.indexOf('{');
  if (start === -1) throw new Error('No JSON found');
  let depth = 0, end = -1;
  for (let i = start; i < s.length; i++) {
    if (s[i] === '{') depth++;
    else if (s[i] === '}') { depth--; if (depth === 0) { end = i; break; } }
  }
  return JSON.parse(s.substring(start, end + 1));
}

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

async function parseWithClaude(text, pdfs = []) {
  // Build content array — PDFs first, then text
  const userContent = [];

  // Attach PDFs natively (Claude Sonnet 4.6 reads PDFs directly)
  for (const pdf of pdfs) {
    userContent.push({
      type: 'document',
      source: {
        type: 'base64',
        media_type: 'application/pdf',
        data: pdf.data.toString('base64')
      }
    });
  }

  // Add text prompt
  const hasText = text && text.length > 50;
  const prompt = hasText
    ? `Parse this booking:\n\n${text.slice(0, 12000)}`
    : 'Parse the booking confirmation from the attached PDF document.';
  userContent.push({ type: 'text', text: prompt });

  if (userContent.length === 1 && !hasText) {
    throw new Error('No content to parse — no text body and no PDF found');
  }

  const message = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 4096,
    system: SYSTEM,
    messages: [{ role: 'user', content: userContent }]
  });
  return extractJson(message.content[0]?.text || '');
}

// ── Find or create the right trip for this booking ───────────────────────────
async function findOrCreateTrip(userId, parsed) {
  // Look for upcoming trips for this user
  const trips = await sb(
    `/logbook_trips?user_id=eq.${userId}&select=*&order=start_date.asc.nullslast,created_at.desc`
  ).catch(() => []);

  const now = new Date();

  // Find best matching trip:
  // 1. Trip whose dates overlap with the booking's departure date
  // 2. Or the most recent upcoming trip
  // 3. Or create a new one based on Claude's suggestion

  if (trips && trips.length > 0) {
    const depDate = parsed.departure_at ? new Date(parsed.departure_at) : null;

    // Try to find a trip whose dates contain the departure date
    if (depDate) {
      const match = trips.find(t => {
        if (!t.start_date || !t.end_date) return false;
        const s = new Date(t.start_date);
        const e = new Date(t.end_date);
        return depDate >= s && depDate <= e;
      });
      if (match) return match;
    }

    // Fall back to most recent upcoming trip
    const upcoming = trips.find(t => {
      if (!t.end_date) return true; // no end date = assume upcoming
      return new Date(t.end_date) >= now;
    });
    if (upcoming) return upcoming;
  }

  // Create a new trip based on Claude's suggestion
  const tripName = parsed.trip_name_suggestion || parsed.summary || 'New Trip';
  const startDate = parsed.departure_at ? parsed.departure_at.slice(0, 10) : null;
  const endDate = parsed.arrival_at ? parsed.arrival_at.slice(0, 10) : null;

  const created = await sb('/logbook_trips', {
    method: 'POST',
    body: {
      user_id: userId,
      name: tripName,
      destination: parsed.to_location || null,
      start_date: startDate,
      end_date: endDate,
      emoji: '✈️'
    }
  });

  return created[0];
}

// ── Main handler ─────────────────────────────────────────────────────────────
module.exports = async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).end();

  // Mailgun sends multipart/form-data — parse fields + PDF attachments
  let body = {}, pdfs = [];
  try {
    const result = await parseMultipart(req);
    body = result.fields;
    pdfs = result.pdfs;
  } catch (e) { body = req.body || {}; }

  // Verify Mailgun signature
  const { timestamp, token, signature } = body;
  if (timestamp && token && signature) {
    if (!verifyMailgunSignature(token, timestamp, signature)) {
      return res.status(401).json({ error: 'Invalid signature' });
    }
  }

  // Extract sender email (who forwarded this)
  const from = body.sender || body.from || '';
  const senderEmail = (from.match(/<([^>]+)>/) || [null, from])[1]?.trim().toLowerCase();

  if (!senderEmail) {
    return res.status(400).json({ error: 'Could not determine sender email' });
  }

  // Find user by sender email
  const users = await sb(`/logbook_users?email=eq.${encodeURIComponent(senderEmail)}&select=id,email`).catch(() => null);

  if (!users || users.length === 0) {
    // Unknown sender — silently ignore (don't expose user existence)
    console.log(`Inbound email from unknown sender: ${senderEmail}`);
    return res.status(200).json({ ok: true, note: 'sender not registered' });
  }

  const userId = users[0].id;

  // Get email body — pick whichever is longest (plain text vs stripped HTML)
  const plain = cleanEmailBody(body['body-plain'] || body['stripped-text'] || '');
  const html = cleanEmailBody(body['stripped-html'] || body['body-html'] || '');
  const emailText = html.length > plain.length ? html : (plain || html);

  // Parse with Claude — text + any PDF attachments
  const hasPdfs = pdfs.length > 0;
  if (emailText.length < 50 && !hasPdfs) {
    return res.status(200).json({ ok: true, note: 'email body too short and no PDF found' });
  }
  console.log(`Parsing email for ${senderEmail}: text=${emailText.length} chars, pdfs=${pdfs.length}`);

  let parsed;
  try {
    parsed = await parseWithClaude(emailText, pdfs);
  } catch (err) {
    console.error('Claude parse failed:', err.message);
    return res.status(200).json({ ok: true, note: 'could not parse booking' });
  }

  // Find or create the right trip
  const trip = await findOrCreateTrip(userId, parsed);

  // Save booking
  await sb('/logbook_bookings', {
    method: 'POST',
    body: {
      trip_id: trip.id,
      type: parsed.type || 'other',
      provider: parsed.provider || null,
      confirmation_code: parsed.confirmation_code || null,
      from_location: parsed.from_location || null,
      to_location: parsed.to_location || null,
      departure_at: parsed.departure_at || null,
      arrival_at: resolveArrivalAt(parsed),
      details: { ...(parsed.details || {}), ...(parsed.platform ? { platform: parsed.platform } : {}) },
      raw_text: emailText.slice(0, 5000)
    }
  });

  console.log(`Booking saved for ${senderEmail} → trip "${trip.name}"`);
  return res.status(200).json({ ok: true, trip: trip.name, type: parsed.type });
};
