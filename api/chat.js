const Anthropic = require('@anthropic-ai/sdk');
const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const { getZercySystemPrompt } = require('./_zercy-identity');

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

const HOTEL_KEYWORDS = ['hotel', 'hotels', 'stay', 'accommodation', 'resort', 'package', 'packages', 'booking', 'lodge', 'hostel', 'airbnb', 'where to sleep', 'place to stay'];

function isHotelQuery(message) {
  const lower = message.toLowerCase();
  return HOTEL_KEYWORDS.some(k => lower.includes(k));
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).end();

  const { message, history, destination, checkin, checkout, tripContext, planContext, uiLanguage } = req.body || {};
  if (!message) return res.status(400).json({ error: 'No message' });

  // Build the full session context — everything Zercy knows about this traveler
  const sessionLines = [];

  // 1. What the traveler actually said (full accumulated intent with all refinements)
  if (planContext?.userIntent) {
    sessionLines.push(`WHAT THE TRAVELER SAID (full conversation + refinements):\n"${planContext.userIntent}"`);
  }

  // 2. What Zercy understood and said in the planning phase
  if (planContext?.narrative) {
    sessionLines.push(`ZERCY'S UNDERSTANDING OF THIS TRIP:\n${planContext.narrative}`);
  }

  // 3. Smart insights Zercy already identified
  if (planContext?.smartInsights?.length) {
    sessionLines.push(`INSIGHTS ZERCY ALREADY SHARED:\n${planContext.smartInsights.map(i => `• ${i}`).join('\n')}`);
  }

  // 4. Structured trip facts
  if (tripContext) {
    const facts = [];
    if (tripContext.origin?.city) facts.push(`Origin: ${tripContext.origin.city} (${tripContext.origin.airport})`);
    if (tripContext.destination_intent) facts.push(`Destination: ${tripContext.destination_intent}`);
    if (tripContext.cabin) facts.push(`Cabin: ${tripContext.cabin}`);
    if (tripContext.outbound_date) facts.push(`Outbound: ${tripContext.outbound_date}`);
    if (tripContext.return_date) facts.push(`Return: ${tripContext.return_date}`);
    if (facts.length) sessionLines.push(`CONFIRMED TRIP FACTS:\n${facts.join('\n')}`);
  }

  const actualDest = tripContext?.destination_intent || destination;

  const systemPrompt = getZercySystemPrompt({ mode: 'chat', destination: actualDest }) +
    (sessionLines.length ? `\n\n${'═'.repeat(50)}\nFULL TRIP SESSION CONTEXT\n${'═'.repeat(50)}\n${sessionLines.join('\n\n')}` : '') +
    `\n\n${'═'.repeat(50)}\nHOW TO USE THIS CONTEXT\n${'═'.repeat(50)}\nYou ran the entire planning session above. You know this traveler's situation deeply.\n- NEVER re-ask anything already established — origin, destination, dates, cabin, routing are ALL settled.\n- Answer every question as the expert who planned this trip with them.\n- Reference specifics from the session naturally ("Since you're flying nonstop to Venice...", "Given your September dates...").\n- Focus entirely on being useful RIGHT NOW: hotels, activities, local tips, logistics, packing, whatever they ask.\n- When the destination is ${actualDest || 'their destination'} — be a knowledgeable local expert about it.\n- Keep answers concise (3-5 sentences max unless asked for more). Use bullet points for lists.` +
    (uiLanguage ? `\n\n${'═'.repeat(50)}\nLANGUAGE — NON-NEGOTIABLE\n${'═'.repeat(50)}\nThe user is on the '${uiLanguage}' version of the site. Your entire reply MUST be in '${uiLanguage}'. Ignore language hints from city names — they're just destinations. UI language wins, always.` : '');

  const messages = [
    ...(history || []),
    { role: 'user', content: message }
  ];

  try {
    const response = await withRetry(() => client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 900,
      system: systemPrompt,
      messages
    }));

    const reply = response.content[0].text;
    const showHotelLinks = isHotelQuery(message);

    // Build hotel search URLs if relevant
    let hotelLinks = null;
    const hotelDest = tripContext?.destination_intent || destination;
    if (showHotelLinks && hotelDest) {
      const dest = encodeURIComponent(hotelDest);
      const ci = checkin || '';
      const co = checkout || '';

      const fmtExpedia = d => d ? d.replace(/(\d{4})-(\d{2})-(\d{2})/, '$2/$3/$1') : '';

      hotelLinks = {
        expedia: `https://www.expedia.com/Hotel-Search?destination=${dest}${ci ? `&startDate=${fmtExpedia(ci)}` : ''}${co ? `&endDate=${fmtExpedia(co)}` : ''}&adults=2`,
        booking: `https://www.booking.com/searchresults.html?ss=${dest}${ci ? `&checkin=${ci}` : ''}${co ? `&checkout=${co}` : ''}&group_adults=2&no_rooms=1&nflt=class%3D4%3Bclass%3D5`
      };
    }

    res.status(200).json({ reply, hotelLinks });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
