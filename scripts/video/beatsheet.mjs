// scripts/video/beatsheet.mjs
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
