const Anthropic = require('@anthropic-ai/sdk');
const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const { getZercySystemPrompt } = require('./zercy-identity');

function extractJson(raw) {
  raw = raw.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/i, '').trim();
  const start = raw.indexOf('{');
  if (start === -1) throw new Error('No JSON found in response');
  let depth = 0, end = -1;
  for (let i = start; i < raw.length; i++) {
    if (raw[i] === '{') depth++;
    else if (raw[i] === '}') { depth--; if (depth === 0) { end = i; break; } }
  }
  const jsonStr = end !== -1 ? raw.substring(start, end + 1) : raw.substring(start);

  const repair = (s) => s
    .replace(/,\s*([}\]])/g, '$1')
    .replace(/([{,]\s*)([a-zA-Z_$][a-zA-Z0-9_$]*)\s*:/g, '$1"$2":');

  // Escape literal control chars (newline, tab, CR) inside JSON string values
  const repairControlChars = (s) => {
    let out = '', inStr = false, esc = false;
    for (let i = 0; i < s.length; i++) {
      const ch = s[i];
      if (esc) { out += ch; esc = false; continue; }
      if (ch === '\\' && inStr) { out += ch; esc = true; continue; }
      if (ch === '"') { inStr = !inStr; out += ch; continue; }
      if (inStr) {
        if (ch === '\n') { out += '\\n'; continue; }
        if (ch === '\r') { out += '\\r'; continue; }
        if (ch === '\t') { out += '\\t'; continue; }
      }
      out += ch;
    }
    return out;
  };

  // Try 1: as-is
  try { return JSON.parse(jsonStr); } catch(e) {}
  // Try 2: basic repairs
  try { return JSON.parse(repair(jsonStr)); } catch(e) {}
  // Try 3: escape control chars, then repair
  try { return JSON.parse(repair(repairControlChars(jsonStr))); } catch(e) {}
  // Try 4: control chars + single-quote strings
  try {
    const r4 = repair(repairControlChars(jsonStr)).replace(/:\s*'([^']*)'/g, ': "$1"');
    return JSON.parse(r4);
  } catch(e) {
    throw new Error('JSON parse failed: ' + e.message + ' | raw: ' + jsonStr.substring(0, 300));
  }
}

async function searchFlights(origin, destination, outboundDate, returnDate, cabin, nonstopPreferred) {
  if (!process.env.SERPAPI_KEY) return [];
  const cabinMap = { economy: '1', business: '2', first: '3', 'premium economy': '4' };
  const cabinCode = cabinMap[(cabin || 'economy').toLowerCase()] || '1';

  const params = {
    engine: 'google_flights',
    departure_id: origin,
    arrival_id: destination,
    outbound_date: outboundDate,
    currency: 'EUR',
    hl: 'en',
    travel_class: cabinCode,
    api_key: process.env.SERPAPI_KEY
  };
  if (returnDate) params.return_date = returnDate;
  else params.type = '2';
  if (nonstopPreferred) params.stops = '0';

  const doSearch = async (p) => {
    const res = await fetch('https://serpapi.com/search.json?' + new URLSearchParams(p).toString());
    if (!res.ok) return [];
    const data = await res.json();
    if (data.error) return [];
    return [...(data.best_flights || []), ...(data.other_flights || [])];
  };

  let flights = await doSearch(params);

  // If nonstop filter gave nothing, retry without it
  if (flights.length === 0 && nonstopPreferred) {
    const p2 = { ...params }; delete p2.stops;
    flights = await doSearch(p2);
  }

  // If still nothing and we have a return date, try one-way
  if (flights.length === 0 && returnDate) {
    const p3 = { ...params }; delete p3.return_date; delete p3.stops; p3.type = '2';
    flights = await doSearch(p3);
  }

  return flights.slice(0, 3).map(f => ({
    price: f.price,
    duration: f.total_duration,
    stops: f.flights ? f.flights.length - 1 : 0,
    airline: f.flights?.[0]?.airline || '',
    departure: f.flights?.[0]?.departure_airport?.time || '',
    arrival: f.flights?.[f.flights.length - 1]?.arrival_airport?.time || ''
  }));
}

function getDefaultDates() {
  const out = new Date();
  out.setMonth(out.getMonth() + 2);
  const ret = new Date(out);
  ret.setDate(ret.getDate() + 10);
  return {
    outbound: out.toISOString().split('T')[0],
    return: ret.toISOString().split('T')[0]
  };
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).end();

  const { intent, planContext } = req.body || {};
  if (!intent) return res.status(400).json({ error: 'No intent provided' });

  try {
    // Sonnet when no Phase-1 context (cold start — needs strong extraction), Haiku when we already have context
    const hasPhase1Context = !!(planContext?.understood?.origin || planContext?.understood?.destination_area);
    const parseModel = hasPhase1Context ? 'claude-haiku-4-5-20251001' : 'claude-sonnet-4-6';

    // Step 1: Parse intent with Claude
    const message = await client.messages.create({
      model: parseModel,
      max_tokens: 3000,
      system: getZercySystemPrompt({ mode: 'planning' }),
      messages: [{
        role: 'user',
        content: `Extract structured flight search data from the following travel request: "${intent}"

LANGUAGE RULE — NON-NEGOTIABLE: Detect the language of the travel request above. Every single text field in your JSON response (summary, zercy_insight, refinement_chips, date_reasoning, reason fields in suggested_airports) must be written in that exact language. If the request is in German → respond entirely in German. If English → English. Zero exceptions.

CAR-ONLY DETECTION: If the request is ONLY about renting a car (no flight needed or mentioned), respond with this simpler JSON instead of the flight JSON:
{
  "car_only": true,
  "summary": "One warm, direct sentence in detected language — like a smart friend confirming the booking. Be specific with cities and dates. NO em-dashes (— or –), use a comma or new sentence instead. NO technical jargon. Example DE: 'Du holst den Wagen am 5. Oktober in Frankfurt ab und gibst ihn am 20. Oktober in Düsseldorf zurück.' Dates in summary must exactly match the date fields below.",
  "pickup": {
    "city": "city name only, e.g. Frankfurt",
    "location": "ONE specific location — pick the most likely one. For airports use format: 'Flughafen [City] ([IATA])'. For city center use: '[City] Hauptbahnhof' or '[City] Innenstadt'. NEVER list alternatives with 'oder' or 'or'. Pick one and commit.",
    "date": "YYYY-MM-DD — extract exactly from user's stated pickup date"
  },
  "dropoff": {
    "city": "city name only",
    "location": "ONE specific location, same rules as pickup. NEVER use 'oder' or 'or'.",
    "date": "YYYY-MM-DD — extract exactly from user's stated return date"
  },
  "refinement_chips": ["short label 1", "short label 2", "short label 3", "short label 4"]
}
If the request mentions BOTH flights AND a car, use the normal flight JSON and additionally set "car_rental_needed": true at the top level.

NOTE: The request above may contain conversational additions like "Additional: going from nice" or meta-phrases like "i said already", "check above", "can you still see that". Ignore the meta-phrases entirely — they are conversation noise. Focus ONLY on the actual travel intent.

CRITICAL WORD RULES:
- "Nice" = Nice, France (NCE) — a major French city on the Côte d'Azur. NEVER read it as the adjective.
- "can" = English auxiliary verb — NEVER an airport code. CAN is Guangzhou, China and extremely unlikely in European travel.
- Extract origin city from phrases like "going from [city]", "flying from [city]", "from [city]".

IMPORTANT RULES:
- Always suggest SPECIFIC dates (never null). Consider holidays (Easter 2026 = April 5, school holidays, peak seasons) and recommend avoiding them unless requested. Prefer Tue/Wed departures for cheaper fares.
- Always include the correct cabin class in search_queries.
- Be smart: if user says "late April" and Easter is April 5, suggest April 14-24 to avoid holiday surcharges.
- zercy_insight should mention specific date reasoning (e.g. "Avoid April 5 Easter weekend — prices spike 40%. Tue April 14 departure saves ~€300").
${planContext ? `- PLANNING SESSION CONTEXT — THIS IS CRITICAL, use these values directly:
  Zercy's narrative: ${planContext.narrative || 'n/a'}
  Insights already shared in Phase 1: ${(planContext.smartInsights || []).join(' | ') || 'none'}
  USE THESE UNDERSTOOD VALUES EXACTLY — do NOT re-derive from scratch:
  ${planContext.understood?.origin ? `  Origin city+airport: "${planContext.understood.origin}" — use this IATA code for the origin field` : ''}
  ${planContext.understood?.destination_area ? `  Destination: "${planContext.understood.destination_area}"` : ''}
  ${planContext.understood?.cabin ? `  Cabin class: "${planContext.understood.cabin}"` : ''}
  ${planContext.understood?.nonstop_preference ? `  Nonstop preference: "${planContext.understood.nonstop_preference}"` : ''}
` : ''}- zercy_insight MUST NOT make any claims about whether specific routes exist or don't exist — your training data is outdated and you WILL be wrong. Never write "nonstop does NOT exist", "this route doesn't operate", or similar. Route availability comes from live search results, not from you. Focus zercy_insight ONLY on: booking timing, price patterns, seasonal tips, miles/points strategies, or logistics advice.
- NONSTOP PRIORITY: If the user mentions "nonstop", "direct", or "no stops", set nonstop_preferred: true AND sort suggested_airports so airports with known nonstop routes from the origin appear FIRST. Example: SJO to Europe nonstop → FRA (Condor/Lufthansa), MAD (Iberia) have direct flights — list these before airports only reachable with connections.
- CABIN CLASS REFINEMENTS: If the traveler previously searched economy and then adds "business class" as a refinement, this is NOT a conflict — they are simply exploring an alternative. Use the most recently stated cabin class. NEVER write "CONFLICT DETECTED" or similar warnings in zercy_insight. If you want to note a price difference, do it briefly and neutrally (e.g., "Business class runs ~€800–1,200 vs. €250 economy — here are your options").

Respond ONLY with valid JSON:
{
  "summary": "one sentence summary",
  "origin": { "city": "city", "airport": "IATA", "country": "country" },
  "cabin": "economy or business or first",
  "outbound": {
    "destination_intent": "what traveler said",
    "suggested_airports": [{"code":"IATA","city":"city","reason":"1-2 sentences: describe ONLY the airport's geographic location and why it serves the destination area well. NEVER mention routes, airlines, connections, or whether flights exist — only geography and proximity to the destination. No em-dashes.","ground_transport":{"destination":"actual destination city (not airport city)","distance_km":40,"options":[{"icon":"🚂","label":"Zug + Bus","duration":"90 min","cost":"€10–15","tip":"kurze Beschreibung","maps_mode":"transit"},{"icon":"🚕","label":"Taxi","duration":"45 min","cost":"€55–70","tip":null,"maps_mode":"driving"},{"icon":"🚐","label":"Shuttle","duration":"60 min","cost":"€25–35","tip":"Buchung beim Hotel","maps_mode":"driving"}]}}],
    "recommended_date": "YYYY-MM-DD",
    "date_reasoning": "why this date is smart",
    "nonstop_preferred": true,
    "flexibility": "exact or flexible or open"
  },
  "return": {
    "origin_intent": "return description",
    "suggested_airports": [{"code":"IATA","city":"city","reason":"1-2 sentences: describe ONLY the airport's geographic location and why it is convenient for reaching the departure point. NEVER mention routes, airlines, connections, or whether flights exist. No em-dashes.","ground_transport":{"destination":"the travel destination city the traveler is staying at (e.g. Abano Terme) — NOT the return airport city. This describes how to get FROM the destination TO this return airport.","distance_km":40,"options":[{"icon":"🚂","label":"Zug + Bus","duration":"90 min","cost":"€10–15","tip":"kurze Beschreibung der Route","maps_mode":"transit"},{"icon":"🚕","label":"Taxi","duration":"45 min","cost":"€55–70","tip":null,"maps_mode":"driving"}]}}],
    "recommended_date": "YYYY-MM-DD",
    "timeframe": "description",
    "nonstop_preferred": true,
    "flexibility": "exact or flexible or open"
  },
  "search_queries": [{"route":"XXX-YYY","cabin":"economy or business or first","dates":"YYYY-MM-DD to YYYY-MM-DD","departure_date":"YYYY-MM-DD","return_date":"YYYY-MM-DD or null","type":"roundtrip or oneway"}],
  "zercy_insight": "smart date/price tip with specific reasoning",
  "refinement_chips": ["short label 1", "short label 2", "short label 3", "short label 4"]
}

For refinement_chips: suggest 4 short, actionable follow-up ideas the traveler might want. Examples: "🌴 Add Caribbean", "🏖 Costa Rica", "✈ Nonstop only", "🇵🇹 Stopover Lisbon", "💼 Upgrade to First", "🗓 One week earlier". Make them specific to this search.`
      }]
    });

    const raw = message.content[0].text.trim();
    const parsed = extractJson(raw);

    // Car-only: skip flight search entirely
    if (parsed.car_only) {
      return res.status(200).json(parsed);
    }

    // Step 2: Search real flights for top airports
    const defaults = getDefaultDates();
    // Phase 1 IATA code is most reliable — use it directly, Claude re-extraction is secondary
    const phase1IataCode = planContext?.understood?.origin?.match(/\(([A-Z]{3})\)/)?.[1]
      || planContext?.understood?.origin?.match(/\b([A-Z]{3})\b/)?.[1]
      || null;
    const originCode = phase1IataCode || parsed.origin?.airport || null;
    const outDate = parsed.outbound?.recommended_date || parsed.outbound?.latest_date || defaults.outbound;
    const retDate = parsed.return?.recommended_date || (parsed.return?.timeframe ? defaults.return : null);
    const cabin = parsed.cabin || 'economy';

    // DEBUG: always include in response so we can diagnose
    parsed._debug = { originCode, outDate, retDate, cabin, hasSerpKey: !!process.env.SERPAPI_KEY };

    if (originCode && parsed.outbound?.suggested_airports?.length > 0) {
      const nonstopPreferred = parsed.outbound?.nonstop_preferred || false;
      const topAirports = parsed.outbound.suggested_airports.slice(0, 5);
      const flightResults = await Promise.allSettled(
        topAirports.map(a => searchFlights(originCode, a.code, outDate, retDate, cabin, nonstopPreferred))
      );

      // DEBUG: add raw result counts
      parsed._debug.flightResults = flightResults.map((r, i) => ({
        airport: topAirports[i]?.code,
        status: r.status,
        count: r.value?.length ?? 0,
        error: r.reason?.message || null
      }));

      parsed.outbound.suggested_airports = parsed.outbound.suggested_airports.map((a, i) => {
        const result = flightResults[i];
        if (result?.status === 'fulfilled' && result.value?.length > 0) {
          a.flights = result.value;
        }
        return a;
      });

      // Remove airports with no flight results from the top — keep ones with real data first
      const withFlights = parsed.outbound.suggested_airports.filter(a => a.flights?.length);
      const withoutFlights = parsed.outbound.suggested_airports.filter(a => !a.flights?.length);
      parsed.outbound.suggested_airports = [...withFlights, ...withoutFlights];

      // Sort airports: nonstop results (stops === 0) first when nonstop is preferred
      if (nonstopPreferred) {
        parsed.outbound.suggested_airports.sort((a, b) => {
          const aMinStops = Math.min(...(a.flights || []).map(f => f.stops ?? 99));
          const bMinStops = Math.min(...(b.flights || []).map(f => f.stops ?? 99));
          return aMinStops - bMinStops;
        });
      }
    }

    // Search return flights for open-jaw scenarios (return airport ≠ outbound airport)
    if (retDate && originCode && parsed.return?.suggested_airports?.length > 0) {
      const outboundCodes = new Set((parsed.outbound?.suggested_airports || []).map(a => a.code));
      const retAirports = parsed.return.suggested_airports.slice(0, 5);
      const retFlightResults = await Promise.allSettled(
        retAirports.map(a => {
          if (outboundCodes.has(a.code)) return Promise.resolve([]);
          return searchFlights(a.code, originCode, retDate, null, cabin, false);
        })
      );
      parsed.return.suggested_airports = parsed.return.suggested_airports.map((a, i) => {
        if (outboundCodes.has(a.code)) {
          a.isRoundtripSameAirport = true;
        } else {
          const result = retFlightResults[i];
          if (result?.status === 'fulfilled' && result.value?.length > 0) {
            a.flights = result.value;
          }
        }
        return a;
      });
    }

    res.status(200).json(parsed);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
