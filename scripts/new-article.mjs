#!/usr/bin/env node
/**
 * Zercy New-Article Scaffold
 * Legt einen dreisprachigen Artikel (DE/EN/ES) regelkonform an:
 *  - Duplikat-Check (Slugs + Topic-Key) gegen die echten Dateien
 *  - 3 .md-Dateien mit vollstaendigem Frontmatter + AEO-Skelett (FAQ, H2-Fragen)
 *  - photo-mapping.mjs: slugToTopic (3) + topicToQuery (1), eindeutiger Topic-Key
 *  - generate-hreflang-map.mjs
 *  - URLs oben in die Index-Queue (Automatik reicht sie ein)
 *
 * Usage:
 *   node scripts/new-article.mjs spec.json
 *   node scripts/new-article.mjs spec.json --dry-run     (nur pruefen, nichts schreiben)
 *   node scripts/new-article.mjs spec.json --photos      (zusaetzlich Foto via download-photos holen)
 *
 * spec.json:
 * {
 *   "topic": "lyon",                         // eindeutiger Topic-Key (Foto + hreflang)
 *   "query": "lyon france old town river",   // Unsplash-Suchbegriff
 *   "category": "stay",                       // Kategorie-ID (siehe CATEGORIES unten)
 *   "date": "2026-05-29",                     // optional, default heute
 *   "readingTime": 7,                          // optional, default 7
 *   "bookingDest": "Lyon",                    // optional (aktiviert Booking-CTA)
 *   "de": { "slug": "wo-uebernachten-lyon", "title": "...", "metaTitle": "...", "description": "..." },
 *   "en": { "slug": "where-to-stay-lyon",   "title": "...", "metaTitle": "...", "description": "..." },
 *   "es": { "slug": "donde-alojarse-lyon",  "title": "...", "metaTitle": "...", "description": "..." }
 * }
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import path from 'node:path';

const BASE = path.resolve(import.meta.dirname, '..');
const PHOTO_MAP = path.join(BASE, 'scripts/photo-mapping.mjs');
const QUEUE = path.join(BASE, 'scripts/indexing-queue.txt');
const DIRS = { de: 'src/content/blog', en: 'src/content/blogen', es: 'src/content/bloges' };
const SITE = 'https://www.zercy.app';
const URL_PREFIX = { de: `${SITE}/blog`, en: `${SITE}/en/blog`, es: `${SITE}/es/blog` };

// Kategorie-ID -> exakte Kategorie-Strings pro Sprache (verbindlich, verhindert Tippfehler)
const CATEGORIES = {
  tips:   { de: 'Reisetipps',          en: 'Travel Tips',     es: 'Consejos de viaje' },
  ai:     { de: 'KI & Reisen',         en: 'AI & Travel',     es: 'IA y viajes' },
  offmap: { de: 'Fernweh',             en: 'Off the Map',     es: 'Lugares lejanos' },
  move:   { de: 'Unterwegs',           en: 'On the Move',     es: 'En camino' },
  smart:  { de: 'Clever Reisen',       en: 'Smart Travel',    es: 'Viaje inteligente' },
  carry:  { de: 'Nur mit Handgepäck',  en: 'Carry-On Only',   es: 'Solo equipaje de mano' },
  stay:   { de: 'Wo übernachten',      en: 'Where to Stay',   es: 'Dónde alojarse' },
  biz:    { de: 'Business Travel',     en: 'Business Travel', es: 'Viajes de negocios' },
  green:  { de: 'Nachhaltig',          en: 'Travel Green',    es: 'Viaje sostenible' },
  hidden: { de: 'Geheimtipps',         en: 'Hidden Gems',     es: 'Joyas ocultas' },
  dest:   { de: 'Reiseziele',          en: 'Destinations',    es: 'Destinos' },
};

// Sprachspezifische Skelett-Bausteine (AEO-Struktur: FAQ-Heading + W-Wort-Fragen)
const SKELETON = {
  de: { faqHeading: 'Häufige Fragen', readMore: 'Mehr lesen',
        cta: 'Speichere die Auswahl im [Zercy Logbook](https://www.zercy.app/logbook), damit du beim Buchen alle Optionen zur Hand hast.',
        qs: ['Was solltest du zuerst beachten?', 'Wann ist die beste Zeit dafür?', 'Wie viel solltest du einplanen?', 'Welche Option lohnt sich?'] },
  en: { faqHeading: 'Frequently Asked Questions', readMore: 'Read more',
        cta: 'Save the shortlist in your [Zercy Logbook](https://www.zercy.app/logbook) so you have all options handy when booking.',
        qs: ['What should you consider first?', 'When is the best time for this?', 'How much should you budget?', 'Which option is worth it?'] },
  es: { faqHeading: 'Preguntas frecuentes', readMore: 'Más artículos',
        cta: 'Guarda la selección en tu [Zercy Logbook](https://www.zercy.app/logbook) para tener todas las opciones a mano al reservar.',
        qs: ['¿Qué deberías considerar primero?', '¿Cuándo es la mejor época para esto?', '¿Cuánto deberías presupuestar?', '¿Cuál opción vale la pena?'] },
};

// ── Helpers ──────────────────────────────────────────────────────────────────
function die(msg) { console.error(`❌ ${msg}`); process.exit(1); }
function warn(msg) { console.warn(`⚠️  ${msg}`); }

function buildBody(lang, data, topic) {
  const s = SKELETON[lang];
  const readMoreNote = lang === 'de' ? 'TODO: 3 interne Links zu passenden Artikeln'
    : lang === 'en' ? 'TODO: 3 internal links to related articles'
    : 'TODO: 3 enlaces internos a artículos relacionados';
  return `TODO: Intro (2 kurze Absätze, Hook + Versprechen).

## ${s.qs[0]}

TODO. (3-4 H2s, davon mind. 3 als Frage. 3-4 interne Links + 1-2 externe Autoritäts-Links im Fließtext.)

## ${s.qs[1]}

TODO.

## ${s.qs[2]}

TODO.

---

${s.cta}

**${s.readMore}:** ${readMoreNote}

## ${s.faqHeading}

### ${s.qs[0]}
TODO: 2-4 Sätze, direkt.

### ${s.qs[1]}
TODO.

### ${s.qs[2]}
TODO.

### ${s.qs[3]}
TODO.
`;
}

function frontmatter(lang, data, cat, topic, date, readingTime, bookingDest) {
  const metaTitle = data.metaTitle || `${data.title} | Zercy`;
  const lines = [
    '---',
    `title: ${JSON.stringify(data.title)}`,
    `metaTitle: ${JSON.stringify(metaTitle)}`,
    `description: ${JSON.stringify(data.description)}`,
    `pubDate: ${date}`,
    `category: ${JSON.stringify(cat[lang])}`,
    `readingTime: ${readingTime}`,
    `heroImage: "/img/blog/${topic}.jpg"`,
  ];
  if (bookingDest) lines.push(`bookingDest: ${JSON.stringify(bookingDest)}`);
  lines.push('---', '');
  return lines.join('\n');
}

// ── Main ─────────────────────────────────────────────────────────────────────
const args = process.argv.slice(2);
const specPath = args.find((a) => !a.startsWith('--'));
const dryRun = args.includes('--dry-run');
const withPhotos = args.includes('--photos');
if (!specPath) die('Usage: node scripts/new-article.mjs <spec.json> [--dry-run] [--photos]');

const spec = JSON.parse(readFileSync(specPath, 'utf8'));
const date = spec.date || new Date().toISOString().slice(0, 10);
const readingTime = spec.readingTime || 7;

// Validierung (hart)
if (!spec.topic) die('spec.topic fehlt');
if (!spec.query) die('spec.query fehlt');
const cat = CATEGORIES[spec.category];
if (!cat) die(`Unbekannte category-ID "${spec.category}". Gültig: ${Object.keys(CATEGORIES).join(', ')}`);
for (const lang of ['de', 'en', 'es']) {
  const d = spec[lang];
  if (!d || !d.slug || !d.title || !d.description) die(`spec.${lang} braucht slug, title, description`);
}

const photoMap = readFileSync(PHOTO_MAP, 'utf8');
// Duplikat-Check Topic-Key
if (new RegExp(`['"]${spec.topic}['"]\\s*:`).test(photoMap.split('export const topicToQuery')[1] || '')) {
  die(`Topic-Key "${spec.topic}" existiert bereits in topicToQuery (muss eindeutig sein, hreflang!).`);
}
// Duplikat-Check Slugs (gegen echte Dateien)
for (const lang of ['de', 'en', 'es']) {
  const f = path.join(BASE, DIRS[lang], `${spec[lang].slug}.md`);
  if (existsSync(f)) die(`Artikel existiert schon: ${DIRS[lang]}/${spec[lang].slug}.md`);
}

// Validierung (weich) — Meta-Längen
for (const lang of ['de', 'en', 'es']) {
  const d = spec[lang];
  const mt = (d.metaTitle || `${d.title} | Zercy`).length;
  if (mt < 45 || mt > 60) warn(`${lang}: metaTitle ${mt} Zeichen (Ziel 45–60)`);
  if (d.description.length < 160 || d.description.length > 200) warn(`${lang}: description ${d.description.length} Zeichen (Ziel 160–200)`);
}

console.log(`\n📄 Neuer Artikel "${spec.topic}" (${cat.de} / ${cat.en} / ${cat.es}), ${date}`);
for (const lang of ['de', 'en', 'es']) console.log(`   ${lang}: ${DIRS[lang]}/${spec[lang].slug}.md`);

if (dryRun) { console.log('\n(--dry-run: keine Dateien geschrieben, alle Checks bestanden ✓)'); process.exit(0); }

// 1. Markdown-Dateien
for (const lang of ['de', 'en', 'es']) {
  const f = path.join(BASE, DIRS[lang], `${spec[lang].slug}.md`);
  writeFileSync(f, frontmatter(lang, spec[lang], cat, spec.topic, date, readingTime, spec.bookingDest) + buildBody(lang, spec[lang], spec.topic));
  console.log(`  ✓ ${path.relative(BASE, f)}`);
}

// 2. photo-mapping.mjs — Einträge direkt nach den Opening-Braces einfügen
let pm = photoMap;
const slugLines = ['de', 'en', 'es'].map((l) => `  '${spec[l].slug}': '${spec.topic}',`).join('\n') + '\n';
pm = pm.replace('export const slugToTopic = {\n', `export const slugToTopic = {\n${slugLines}`);
pm = pm.replace('export const topicToQuery = {\n', `export const topicToQuery = {\n  '${spec.topic}': '${spec.query}',\n`);
writeFileSync(PHOTO_MAP, pm);
console.log('  ✓ photo-mapping.mjs (slugToTopic ×3 + topicToQuery ×1)');

// 3. hreflang-Map
execFileSync('node', ['scripts/generate-hreflang-map.mjs'], { cwd: BASE, stdio: 'inherit' });

// 4. Foto (optional)
if (withPhotos) {
  try { execFileSync('node', ['scripts/download-photos.mjs'], { cwd: BASE, stdio: 'inherit' }); }
  catch (e) { warn('download-photos fehlgeschlagen: ' + e.message); }
} else {
  console.log('  ℹ Foto nicht geholt — später: node scripts/download-photos.mjs');
}

// 5. Index-Queue (oben)
const urls = ['de', 'en', 'es'].map((l) => `${URL_PREFIX[l]}/${spec[l].slug}/`).join('\n') + '\n';
writeFileSync(QUEUE, urls + readFileSync(QUEUE, 'utf8'));
console.log('  ✓ 3 URLs oben in scripts/indexing-queue.txt (Automatik reicht ein)');

console.log(`\n✅ Gerüst steht. Nächste Schritte:`);
console.log(`   1. Body in den 3 Dateien schreiben (TODOs ersetzen, Regeln beachten).`);
console.log(`   2. Falls noch kein Foto: node scripts/download-photos.mjs`);
console.log(`   3. Build + Deploy: npx astro build && npx vercel --prod --force --archive=tgz && git add -A && git commit && git push`);
