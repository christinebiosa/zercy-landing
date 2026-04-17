/**
 * Zercy Logbook — Parse booking confirmations with Claude
 * POST { raw_text }
 *
 * Philosophy: let Claude decide the structure. We only enforce
 * a minimal envelope (type, provider, summary). Everything else
 * lives in `details` as Claude sees fit — segments[], nights,
 * whatever the booking needs. No rigid schema = no edge-case failures.
 */

const Anthropic = require('@anthropic-ai/sdk');
const { verifySession, setCors } = require('./_logbook-auth');

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const SYSTEM = `You are an expert travel booking parser. You receive raw text from booking confirmation emails, e-tickets, hotel vouchers, car rental confirmations, train tickets, tour bookings — OR informal manual notes in any language (English, German, French, Spanish, or mixed). Always try to extract a booking, never refuse.

Examples of valid informal inputs you must handle:
- "Mietwagen from Düsseldorf to Paderborn same day as hotel check-in" → type=car, pickup=Düsseldorf, dropoff=Paderborn
- "Train Köln→Frankfurt 14 Jul 09:15" → type=train
- "Airbnb Barcelona 3 nights €320 check-in 14 Jul" → type=hotel
- "Dinner at Nobu, Tokyo, 20:00 on arrival day" → type=activity
For informal notes: infer as much as possible, set unknown fields to null, and still produce valid JSON.

Your job: extract ALL relevant information and return it as a single JSON object.

REQUIRED top-level fields (always include these):
- "type": one of "flight" | "hotel" | "car" | "train" | "activity" | "other"
- "provider": the actual property/company name (hotel name, airline, car company — NOT the booking platform)
- "platform": the booking website if applicable (e.g. "Booking.com", "Airbnb", "Expedia", "Rentalcars") — null if direct booking
- "confirmation_code": the booking reference, PNR, or reservation number
- "from_location": origin city/airport (null if not applicable)
- "to_location": destination city/airport (null if not applicable)
- "departure_at": ISO 8601 datetime of first departure/check-in/pickup (null if unknown)
- "arrival_at": ISO 8601 datetime of last arrival/checkout/dropoff (null if unknown)
- "summary": one concise line describing the whole booking (e.g. "Avianca ANIHNA · SJO→MAD→SJO · 4 flights · 15 Aug–29 Oct 2026")
- "trip_name_suggestion": suggested name for this trip (e.g. "Europe 2026", "Tokyo March 2027")
- "details": object with ALL other extracted information — be thorough and creative here

For "details", include whatever is relevant. Examples:
- Flights: passenger name, ticket number, total price, currency, segments array (each with flight number, from, to, departure, arrival, seat, duration, baggage, fare class, operated by)
- Hotels: address, check_in_date, check_out_date, nights, room_type, guests, price, currency, amenities, cancellation policy
- Cars: pickup_location, dropoff_location, pickup_date, dropoff_date, car_model, car_type, price, currency, extras, insurance
- Trains: segments, class, seat, price, currency
- Activities: date, duration, meeting_point, participants, price, currency, included

CRITICAL rules — follow exactly:
- Return ONLY the raw JSON object. No markdown, no code fences, no explanation.
- Dates in ISO 8601 format (e.g. "2026-08-15T16:00:00"). No timezone needed if not provided.
- Use null for any field you cannot determine.
- For flights: ALWAYS populate details.segments[] with one object per leg. Each segment needs: flight_number, from, to, departure (ISO 8601), arrival (ISO 8601), seat, terminal, baggage, duration, fare_class.
- For hotels: "departure_at" = check-in datetime including the earliest check-in time if stated (e.g. "2026-08-21T15:00:00"), "arrival_at" = check-out datetime including the latest check-out time if stated (e.g. "2026-08-24T11:00:00"). BOTH must be set. Also store as details.check_in_date and details.check_out_date.
- For cars: "departure_at" = pickup datetime, "arrival_at" = dropoff datetime.
- Be as complete as possible — capture everything a traveler would want to know.

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
  if (end === -1) throw new Error('Unclosed JSON');
  return JSON.parse(s.substring(start, end + 1));
}

module.exports = async function handler(req, res) {
  setCors(req, res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const session = verifySession(req);
  if (!session) return res.status(401).json({ error: 'Not authenticated' });

  const { raw_text, trip_context } = req.body || {};
  if (!raw_text?.trim()) return res.status(400).json({ error: 'raw_text required' });

  let userMessage = `Parse this booking confirmation:\n\n${raw_text.slice(0, 12000)}`;
  if (trip_context && Array.isArray(trip_context) && trip_context.length > 0) {
    const ctxLines = trip_context.map(b =>
      `- ${b.type}: ${b.provider || '?'} | departs: ${b.departure_at || 'unknown'} | arrives: ${b.arrival_at || 'unknown'}${b.summary ? ` | ${b.summary}` : ''}`
    ).join('\n');
    userMessage += `\n\nExisting bookings already in this trip — use these to resolve any relative date references (e.g. "same day as hotel check-in", "day after flight", "on arrival day"):\n${ctxLines}`;
  }

  try {
    const message = await client.messages.create({
      model: 'claude-sonnet-4-6',  // Sonnet handles complex itineraries better than Haiku
      max_tokens: 4096,
      system: SYSTEM,
      messages: [{
        role: 'user',
        content: userMessage
      }]
    });

    const content = message.content[0]?.text || '';

    try {
      const parsed = extractJson(content);
      return res.status(200).json({ success: true, parsed });
    } catch {
      return res.status(422).json({
        error: 'Could not read AI response as JSON. Please try again.',
        debug: content.slice(0, 400)
      });
    }
  } catch (err) {
    return res.status(500).json({ error: `AI error: ${err.message}` });
  }
};
