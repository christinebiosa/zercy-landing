// scripts/video/beatsheet.mjs
import Anthropic from '@anthropic-ai/sdk';

const LANGS = ['de', 'en', 'es'];

export function parseBeatSheet(text) {
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) throw new Error('Beat-Sheet enthielt kein JSON');
  let obj;
  try {
    obj = JSON.parse(match[0]);
  } catch (e) {
    throw new Error('Beat-Sheet-JSON nicht parsebar: ' + e.message);
  }
  if (!obj.cityName) throw new Error('Beat-Sheet ohne cityName');
  if (!Array.isArray(obj.beats) || obj.beats.length === 0) {
    throw new Error('Beat-Sheet ohne beats');
  }
  for (const [i, b] of obj.beats.entries()) {
    if (!b.kind || !b.query) throw new Error(`Beat ${i} ohne kind/query`);
    if (!('label' in b)) b.label = null;
  }
  for (const lang of LANGS) {
    const lines = obj.narration?.[lang];
    if (!Array.isArray(lines)) throw new Error(`narration.${lang} fehlt`);
    if (lines.length !== obj.beats.length) {
      throw new Error(`narration.${lang} hat ${lines.length} Zeilen, erwartet ${obj.beats.length}`);
    }
  }
  return obj;
}

const DOC_PROMPT = (cityName, deBody, enBody, esBody) => `Du schreibst das Drehbuch fuer eine 35-bis-40-Sekunden-Mikro-Doku ueber "Wo uebernachten in ${cityName}".

Stadt: ${cityName}

Auszuege der Artikel:
DE: ${deBody.slice(0, 800)}
EN: ${enBody.slice(0, 800)}
ES: ${esBody.slice(0, 800)}

Dramaturgie (Pflicht, "von hinten reinkommen"):
- coldOpen: eine raetselhafte, sinnliche Zeile, die erst der Reveal aufloest. Kein Hallo, keine Stadt nennen.
- thesis: die Idee, dass die Stadt mehrere Staedte ist und der Stadtteil entscheidet.
- neighborhood (3 bis 4 Stueck): je ein Viertel als Charakter, EIN Stimmungssatz, KEINE Hotelnamen, KEINE Preise.
- reveal: die eine Antwort, bindet an den coldOpen zurueck.

Ton: kurze Saetze, oft nur eine Aussage. Praesens, "du", sinnlich, sparsam. Keine Floskeln. KEINE Gedankenstriche (em-dash).

Antworte NUR mit JSON in genau dieser Struktur:
{
  "cityName": "${cityName}",
  "beats": [
    { "kind": "coldOpen", "query": "englischer Bildsuchbegriff", "label": null },
    { "kind": "thesis", "query": "...", "label": null },
    { "kind": "neighborhood", "query": "...", "label": "VIERTEL · BEZIRK" },
    { "kind": "reveal", "query": "...", "label": null }
  ],
  "narration": {
    "de": ["eine Zeile pro Beat, gleiche Reihenfolge"],
    "en": ["one line per beat"],
    "es": ["una linea por beat"]
  }
}
Wichtig: narration.de, narration.en und narration.es haben GENAU so viele Zeilen wie beats Eintraege.
"query" ist ein konkreter englischer Bildsuchbegriff fuer ein Hochformat-Foto. "label" ist der Chyron-Text, nur bei neighborhood gesetzt.`;

export async function generateBeatSheet({ cityName, deBody, enBody, esBody, apiKey }) {
  const anthropic = new Anthropic({ apiKey });
  const msg = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 2000,
    messages: [{ role: 'user', content: DOC_PROMPT(cityName, deBody, enBody, esBody) }],
  });
  return parseBeatSheet(msg.content[0].text);
}
