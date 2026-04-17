const Anthropic = require('@anthropic-ai/sdk');
const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const { getZercySystemPrompt } = require('./_zercy-identity');

function extractJson(raw) {
  raw = raw.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/i, '').trim();
  // Find balanced JSON object
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

// Real-time route discovery via SerpAPI Google Search
// Called BEFORE Claude so it gets current data, not training-data guesses
async function searchCurrentRoutes(intent) {
  if (!process.env.SERPAPI_KEY) return null;
  try {
    // Build a targeted search query from the intent
    const normalized = intent.replace(/['"]/g, '')
      .replace(/\b(ich|will|möchte|gerne|bitte|nach|von|am|im|mit|und|oder|für|eine|einen|ein|der|die|das|dem|den|des|kein|nur|direkt|günstig|buchen|fliegen|flug|flüge|zu|aus|ab|bei|über|durch)\b/gi, ' ')
      .replace(/\b(je|veux|voudrais|aller|depuis|vers|avec|pour|et|ou|vol|vols|un|une|le|la|les|du|de|au|aux|sans|plus)\b/gi, ' ')
      .replace(/\b(quiero|vuelo|vuelos|desde|hasta|con|para|y|o|el|los|las|un|una)\b/gi, ' ')
      .replace(/\b(ik|wil|naar|met|van|geen|alleen|een|het)\b/gi, ' ')
      .replace(/\s+/g, ' ').trim().substring(0, 150);
    const query = `direct flights ${normalized} 2026 airlines route`;
    const url = 'https://serpapi.com/search.json?' + new URLSearchParams({
      engine: 'google',
      q: query.substring(0, 200),
      api_key: process.env.SERPAPI_KEY,
      num: 6,
      hl: 'en'
    });
    const res = await fetch(url);
    const data = await res.json();
    const results = (data.organic_results || []).slice(0, 5)
      .map(r => `• ${r.title}: ${r.snippet}`)
      .filter(Boolean)
      .join('\n');
    return results || null;
  } catch (e) {
    return null;
  }
}

// Detect one-way trips across all 7 supported languages — runs BEFORE Claude
// so the prompt can be told as a hard fact (not left to inference)
function detectOneWay(intent) {
  const s = ' ' + intent.toLowerCase() + ' ';
  const patterns = [
    /\bone[\s-]?way\b/, /\boneway\b/,
    /\bnur hin\b/, /\bnur hinflug\b/, /\beinfache strecke\b/, /\beinfach\b.*\bflug\b/, /\bhinflug\b(?!.*\brückflug\b)/,
    /\baller simple\b/, /\bsens unique\b/, /\baller seul\b/,
    /\bsolo ida\b/, /\bs[oó]lo ida\b/, /\bida\b(?!.*vuelta)/,
    /\benkele reis\b/, /\benkeltje\b/,
    /\bsola andata\b/,
    /\bs[oó] ida\b/, /\bsomente ida\b/
  ];
  return patterns.some(re => re.test(s));
}

// Retry wrapper for transient Anthropic API errors (overloaded, 5xx)
async function withRetry(fn, attempts = 2) {
  let lastErr;
  for (let i = 0; i < attempts; i++) {
    try { return await fn(); }
    catch (e) {
      lastErr = e;
      const status = e?.status || e?.response?.status;
      const transient = status === 529 || status === 503 || status === 500 || status === 429;
      if (!transient || i === attempts - 1) throw e;
      await new Promise(r => setTimeout(r, 1000 * (i + 1)));
    }
  }
  throw lastErr;
}

// Adaptive Extended Thinking: score query complexity → choose model + budget
function getThinkingConfig(intent) {
  const lower = intent.toLowerCase();
  let score = 0;

  // High-complexity signals
  if (/anywhere|irgendwo|irgendwoher|n'importe|cualquier/.test(lower)) score += 3;
  if (/month|months|monat|monate|mois/.test(lower)) score += 2;
  if (/flexible|flexibel|offen|open date|beliebig/.test(lower)) score += 2;
  if (/multiple|mehrere|varios|multi/.test(lower)) score += 2;
  if (/business|first class|première|primera/.test(lower)) score += 1;
  if (/nonstop|direct|direkt|directo|sans escale/.test(lower)) score += 1;
  if (/open jaw|open-jaw|offener/.test(lower)) score += 2;

  // Simplicity signals (reduce score)
  if (/\d{4}-\d{2}-\d{2}/.test(lower)) score -= 1; // exact dates given

  // Complex queries: Sonnet without extended thinking (reliable within 60s timeout)
  // Simple queries: small thinking budget for extra care
  if (score >= 5) return { model: 'claude-sonnet-4-6', budget: 0, max_tokens: 5000 };
  if (score >= 3) return { model: 'claude-sonnet-4-6', budget: 1000, max_tokens: 4000 };
  if (score >= 1) return { model: 'claude-sonnet-4-6', budget: 0, max_tokens: 3000 };
  return { model: 'claude-haiku-4-5-20251001', budget: 0, max_tokens: 2500 };
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).end();

  const { intent, mode, context, addition, uiLanguage } = req.body || {};
  if (!intent) return res.status(400).json({ error: 'No intent provided' });

  // MODE: "respond" — short conversational reply to a user addition, no full plan
  if (mode === 'respond') {
    try {
      const message = await withRetry(() => client.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 400,
        system: getZercySystemPrompt({ mode: 'planning' }),
        messages: [{
          role: 'user',
          content: `You are Zercy, an expert AI travel consultant, mid-conversation with a traveler.

CURRENT TRAVEL CONTEXT — read ALL of this carefully:
Original request: "${intent}"
Everything shared so far: ${context || 'none'}
Latest message just now: "${addition}"

═══════════════════════════════════
STEP 1 — PARSE THE CONTEXT FIRST
═══════════════════════════════════

Before responding, mentally extract what is KNOWN from the full context above:
- Origin city/airport: look for "from [city]", "flying from [city]", city names in Europe
- Destination: any mention of target city or airport
- Preferences: nonstop, cabin class, dates, trip type

CRITICAL WORD RULES — these mistakes will embarrass you:
- "Nice" = Nice, France (NCE) — a French Riviera city. NEVER read it as the adjective "nice".
- "can" = English auxiliary verb ("can you see that") — NEVER an airport code.
- "CAN" is Guangzhou, China — extremely unlikely in a European travel context.
- Other common English words are NOT airport codes: "fly", "do", "is", "ok", "sure", "now".

═══════════════════════════════════
STEP 2 — DETECT META-MESSAGES
═══════════════════════════════════

If the latest message contains frustration signals like:
"i said already", "check above", "can you still see", "i already told you", "you asked this"

→ The traveler is frustrated that you missed something they already shared.
→ Apologize briefly, then CONFIRM exactly what you now correctly understand.
→ Do NOT ask about the thing they already told you.

═══════════════════════════════════
STEP 3 — DO NOT REPEAT QUESTIONS
═══════════════════════════════════

If origin city, destination, nonstop preference, or any detail appears ANYWHERE in the context → DO NOT ask about it again.
Only ask a follow-up if something genuinely critical is STILL missing.

═══════════════════════════════════
LANGUAGE — NON-NEGOTIABLE
═══════════════════════════════════

${uiLanguage ? `AUTHORITATIVE LANGUAGE: The user is on the '${uiLanguage}' version of the site. You MUST respond entirely in '${uiLanguage}'. Ignore hints from city names (Frankfurt, München, Zürich are valid English contexts). The UI language wins over text-based detection.` : `Detect language from the original request: "${intent}"
Respond in THAT language ONLY.`}
Every single word.
If the original request is English → respond in English, full stop.

═══════════════════════════════════
YOUR RESPONSE
═══════════════════════════════════

2-3 short sentences max:
1. Confirm specifically what you understood (city names, preferences, e.g. "Got it — flying from Nice (NCE) nonstop to Venice (VCE)")
2. Add one helpful insight if relevant
3. ONLY ask a follow-up if something genuinely critical is missing AND not already answered

Respond ONLY with valid JSON: { "reply": "your response here", "language": "en" }`
        }]
      }));
      const raw = message.content[0].text.trim();
      const parsed = extractJson(raw);
      return res.status(200).json({ mode: 'respond', ...parsed });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  try {
    // Fast car-only pre-check via Claude Haiku — no regex, understands any language/phrasing
    const classifyMsg = await withRetry(() => client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 700,
      system: getZercySystemPrompt({ mode: 'planning' }),
      messages: [{ role: 'user', content: `A traveler wrote: "${intent}"\n\nFirst: is this request ONLY about renting a car/vehicle (no flight needed or mentioned)? Examples that count as car-only: "Mietwagen", "Mietauto", "Automiete", "Mietkarre", "ich brauche ein Auto", "rentalcar", "car hire", "rent a car", "louer une voiture", "alquiler de coche", "noleggio auto" — any phrasing in any language meaning vehicle rental without flight.\n\nIf it is car-only: detect the language, extract any info given, and respond ONLY with this JSON:\n{"car_only":true,"language":"de","narrative":"2 warm sentences confirming you understood — mention pickup city and destination if given, be warm and specific.","zercy_plan_note":"One sentence asking them to confirm the details so you can find the best options.","understood":{"pickup_city":"city name or null","dropoff_city":"different return city or null","pickup_date":"YYYY-MM-DD or null","dropoff_date":"YYYY-MM-DD or null","vehicle_class":null}}\n\nIf it involves a flight OR is NOT about car rental: respond ONLY with: {"car_only":false}` }]
    }));
    const classifyRaw = classifyMsg.content[0].text.trim();
    const classifyParsed = extractJson(classifyRaw);
    if (classifyParsed.car_only) {
      classifyParsed.phase = 'thinking';
      return res.status(200).json(classifyParsed);
    }

    // Run real-time route search in parallel with complexity scoring
    const [thinkConfig, liveRouteData] = await Promise.all([
      Promise.resolve(getThinkingConfig(intent)),
      searchCurrentRoutes(intent)
    ]);

    const isOneWay = detectOneWay(intent);
    const oneWayBlock = isOneWay ? `
═══════════════════════════════════
HARD FACT — ONE-WAY TRIP (NON-NEGOTIABLE)
═══════════════════════════════════

The traveler EXPLICITLY said this is a one-way trip. This is a confirmed fact, not an assumption.

ABSOLUTE RULES:
- Set "trip_type": "oneway" in understood
- Set "return_window": null
- NEVER ask any question about a return flight
- NEVER suggest open-jaw routing
- NEVER mention "Rückflug", "return", "vuelta", "retour", "ritorno", "terugreis", "regresso"
- NEVER bring up the cost trade-off between open-jaw and open return — it does not apply
- The trip ENDS at the destination. Period.
- Even if other dates appear in the request (e.g. "October"), they are NOT a return — they belong to a different plan the user has not asked about
- Your narrative must treat this as a simple one-way booking. Search immediately.
` : '';

    const requestParams = {
      model: thinkConfig.model,
      max_tokens: thinkConfig.max_tokens,
      system: getZercySystemPrompt({ mode: 'planning' }),
      messages: [{
        role: 'user',
        content: `CURRENT TASK — THINK & PLAN (do not search yet):

A traveler wrote: "${intent}"
${oneWayBlock}
═══════════════════════════════════
HOW TO THINK — READ THIS CAREFULLY
═══════════════════════════════════

You do NOT process parameters. You think about this person's ACTUAL TRIP as a human story.

Ask yourself:
- What is this person's real situation? Where are they starting from, what are they going to do, how long will they be there?
- What did they NOT say but is obviously implied? ("return from anywhere in Europe late October" + trip starting mid-August = this person will be traveling Europe for ~2.5 months. They won't be in Paderborn in late October.)
- What would genuinely make this trip great? Not just the cheapest flight, but the right flight for this person.
- What would a stupid travel bot get wrong here? Make sure you DON'T do that.

HOLISTIC JOURNEY THINKING (critical):
- If someone says "return from anywhere in Europe" — they mean they'll be traveling around and will fly home from wherever they are. Think about which hub airports make sense given their trajectory. NEVER suggest flying 4-5 hours to a specific city JUST to catch a flight home — that defeats the purpose.
- Think about arrival times. Does the person arrive well-rested? Can they transfer to their final destination the same day?
- Think about the full arc: outbound → time in destination → return. Make it all fit logically.
- If "nonstop preferred" and the only nonstop route is via one specific airport — say so clearly and why.
- When someone is going to be in Europe for months, the return airport should be wherever they naturally are, not where they landed.

OPEN-JAW vs. OPEN RETURN — ALWAYS RAISE THIS (it saves the traveler real money):
This is one of the most critical things a real travel agent addresses — and what separates an expert from a bot.
- A fully OPEN RETURN (fly out, return date/city completely open) is often 40-80% more expensive than a roundtrip. It's a bad deal in most cases.
- An OPEN-JAW ROUNDTRIP (fly SJO→FRA, return MAD→SJO) is priced like a normal roundtrip — vastly cheaper.
- The smart move: if someone says "return from anywhere in Europe", ask if they have ANY rough idea of where they might be. Even "probably southern Europe" or "likely somewhere near Germany still" is enough to structure a much cheaper ticket.
- If they truly have no idea: suggest booking the outbound now and the return as a separate one-way closer to the date — but be honest: "that's usually more expensive than an open-jaw, but gives you full flexibility."
- NEVER just say "let's leave the return open" without raising this cost implication. That's negligent travel advice. A good agent always addresses it.
- Add this insight proactively in your narrative or smart_insights — don't wait for the user to ask.

LANGUAGE RULE — NON-NEGOTIABLE:
${uiLanguage ? `AUTHORITATIVE: The user is on the '${uiLanguage}' version of the site. Every single word of your entire JSON response MUST be in '${uiLanguage}'. This overrides any text-based language detection. City names like "Frankfurt", "München", "Lisboa" do NOT mean the user writes German or Portuguese — they're just destinations.` : `Detect the language of the user's message. Every single word of your entire JSON response must be in that exact language.`} This means: narrative, question texts, chip labels, route labels, detail texts, insights, plan note — everything. Zero English words if the target language is German. Zero German words if the target language is English.

═══════════════════════════════════
READY TO SEARCH vs. QUESTIONS
═══════════════════════════════════

THE #1 RULE: If a traveler gives you origin + destination + a rough date, you have EVERYTHING you need. Search immediately.

Set "ready_to_search": true AND "questions": [] (EMPTY array, ZERO questions) when:
- Origin city is clear (e.g. "Nice", "Frankfurt", "SJO")
- Destination is clear (e.g. "Seville", "Lisbon", "Europa")
- Any timeframe is mentioned (e.g. "October", "13 October", "mid August", "next week")

This covers 90% of queries. Most travelers tell you enough. DO NOT overthink it. DO NOT ask clarifying questions when you can just search.

When ready_to_search is true with 0 questions:
- Your narrative should be 1 sentence max: "Nice nach Sevilla am 13. Oktober, günstigster Flug. Suche läuft!" or similar.
- Keep route_hypotheses and smart_insights SHORT (max 1 each) or empty.

ONLY set "ready_to_search": false when something truly CRITICAL is missing — like NO origin at all, or a destination so vague it could mean 10 different places. Even then, ask MAX 1 question.

NEVER ask:
- "Are you already in Europe?" — if origin is a European city, obviously yes
- "Where will you return to?" — if not mentioned, it's a one-way or they'll tell you later
- "What cabin class?" — default to economy
- About airline loyalty programs
- Questions that sound smart but don't change the search result

CAR RENTAL: Only ask if the traveler explicitly mentioned a car. Set "car_rental_needed": true. Max 1 question.

═══════════════════════════════════
REAL-TIME ROUTE DATA (live search results — TRUST THIS over your training data)
═══════════════════════════════════

${liveRouteData ? liveRouteData : '(no live search data available — use your knowledge cautiously and flag if uncertain)'}

IMPORTANT: If the live search results above contradict what you think you know about routes, ALWAYS trust the live results. Your training data about specific airline routes may be outdated. If you are not sure whether a route exists today, say so clearly rather than stating it as fact.

═══════════════════════════════════
ROUTE HYPOTHESES — USE REAL KNOWLEDGE
═══════════════════════════════════

Real airline routes you know (may be outdated — live data above takes priority):
SJO (San José, Costa Rica) nonstop to Europe — all current carriers:
- SJO→AMS: KLM (nonstop) — excellent Star Alliance connection hub
- SJO→CDG: Air France (nonstop) — SkyTeam, good for Flying Blue miles
- SJO→FRA: Lufthansa (nonstop) — Star Alliance, Miles & More
- SJO→LHR: British Airways (nonstop) — oneworld, Avios
- SJO→MAD: Iberia (nonstop) — oneworld, good if returning from southern Europe
- SJO→ZRH: Edelweiss Air (launching October 2026)
- SJO→Europe via PTY: Copa hub — 1 stop, connects to virtually all European cities, often good value in business
- SJO→FRA via EWR: United — 1 stop, solid Polaris business class, MileagePlus earning

For the RETURN in this specific scenario (if "from anywhere in Europe"):
- Think: what major European airports would make a natural return point? FRA (if still in Germany area), MAD (if they've gone south), AMS or LHR (if traveled northwest)
- Say explicitly: "You don't need to travel back to any specific city — book your return from wherever you are in October"
- Highlight the flexibility as an advantage, not a problem

═══════════════════════════════════
SMART INSIGHTS — BE SPECIFIC AND SURPRISING
═══════════════════════════════════

Say things the traveler wouldn't know themselves:
- Specific flight timing that makes the trip better
- Price pattern insight with real reasoning
- A logistics tip that saves them time or stress
- Something genuinely useful, not "book in advance" generic advice

Respond ONLY with valid JSON — no markdown, no explanation:
{
  "language": "de",
  "ready_to_search": true,
  "narrative": "2-4 sentences. Sound like a brilliant friend who really gets it. Reference specific details from their request. Show you thought about their actual situation, not just the parameters. If there's something they didn't think of but should know, mention it here naturally. Warm and direct.",
  "understood": {
    "origin": "City (IATA)",
    "destination_area": "as described",
    "cabin": "economy / business / first",
    "outbound_window": "timeframe",
    "return_window": "timeframe or null",
    "nonstop_preference": "required / preferred / flexible / none",
    "trip_type": "roundtrip or oneway",
    "trip_duration_note": "if implied, e.g. 'ca. 2,5 Monate in Europa'"
  },
  "route_hypotheses": [
    {
      "route": "SJO→FRA",
      "label": "Short human label in user language",
      "detail": "2-3 sentences in user language. Be specific about airlines, frequency, timing, why this makes sense for THIS person's trip.",
      "nonstop": true,
      "confidence": "high"
    }
  ],
  "smart_insights": [
    "One specific, genuinely useful insight in user's language. Make it feel like insider knowledge from an expert friend."
  ],
  "questions": [
    {
      "id": "unique_id",
      "question": "Question text in user's language — conversational, not formal",
      "chips": ["Option in user language", "Option 2", "Option 3", "Zercy entscheidet (or equivalent)"]
    }
  ],
  "zercy_plan_note": "One warm, confident sentence in user's language about what happens next."
}`
      }]
    };
    if (thinkConfig.budget > 0) {
      requestParams.thinking = { type: 'enabled', budget_tokens: thinkConfig.budget };
    }

    let message;
    try {
      message = await withRetry(() => client.messages.create(requestParams));
    } catch (thinkErr) {
      // Extended Thinking not supported / persistent error — fall back to Haiku
      message = await withRetry(() => client.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 2500,
        system: requestParams.system,
        messages: requestParams.messages
      }));
    }

    // Extended Thinking returns multiple content blocks — find the text block
    const textBlock = message.content.find(b => b.type === 'text') || message.content[0];
    if (!textBlock || !textBlock.text) throw new Error('No text response from model');
    const raw = textBlock.text.trim();

    let parsed;
    try {
      parsed = extractJson(raw);
    } catch (parseErr) {
      // Retry with Haiku + strict JSON-only prompt
      const retry = await client.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 3000,
        system: getZercySystemPrompt({ mode: 'planning' }),
        messages: [{
          role: 'user',
          content: `A traveler wrote: "${intent}"\n\nRespond ONLY with a valid JSON object (no explanation, no markdown) with these exact fields:\n{\n  "language": "de",\n  "narrative": "2-4 warm sentences acknowledging their travel wish and what kind of trip this is",\n  "understood": { "origin": "unknown or detected city (IATA)", "destination_area": "what they described", "cabin": "economy", "outbound_window": "when", "return_window": null, "nonstop_preference": "flexible", "trip_type": "roundtrip", "trip_duration_note": "" },\n  "route_hypotheses": [{ "route": "???→???", "label": "Best option", "detail": "What you know about getting there", "nonstop": false, "confidence": "medium" }],\n  "smart_insights": ["One useful tip"],\n  "questions": [{ "id": "origin", "question": "Where will you be flying from?", "chips": ["Deutschland", "Österreich", "Schweiz", "Zercy entscheidet"] }],\n  "zercy_plan_note": "Warm sentence about next steps."\n}\nDetect language from the traveler message and respond entirely in that language.`
        }]
      });
      const retryText = retry.content.find(b => b.type === 'text')?.text?.trim() || '';
      parsed = extractJson(retryText);
    }
    parsed.phase = 'thinking';

    res.status(200).json(parsed);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
