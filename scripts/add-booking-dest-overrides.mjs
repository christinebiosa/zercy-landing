// Adds bookingDest to thematically relevant non-city-guide articles.
// Strategy: only articles where a Booking-CTA fits naturally (city/region focus).
// Skip: AI/tool articles, generic tips, business travel (too generic), backpack/carry-on.
//
// Run: node scripts/add-booking-dest-overrides.mjs

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');

// slug -> bookingDest. Booking.com accepts cities, countries, and regions.
const overrides = {
  // FERNWEH / OFF THE MAP / HIDDEN GEMS
  'patagonien-3-wochen-route': 'Patagonia',
  'patagonia-3-week-route': 'Patagonia',
  'sansibar-stone-town-guide': 'Zanzibar',
  'zanzibar-stone-town-guide': 'Zanzibar',
  'tokio-foodie-reise': 'Tokyo',
  'tokyo-foodie-trip': 'Tokyo',
  'albania-riviera-hidden-coast': 'Albania',
  'albanien-riviera-geheimtipp': 'Albania',
  'faeroeer-inseln-guide': 'Faroe Islands',
  'faroe-islands-guide': 'Faroe Islands',
  'iceland-travel-guide': 'Iceland',
  'island-reiseguide': 'Iceland',
  'apulien-sueditalien-guide': 'Puglia',
  'puglia-southern-italy-guide': 'Puglia',
  'slowenien-geheimnis-2026': 'Slovenia',
  'slovenia-green-secret-2026': 'Slovenia',
  'nordlichter-2026-wo-wann-wie': 'Iceland',
  'northern-lights-2026-where-when-how': 'Iceland',
  'modena-ferrari-museum': 'Modena',
  'santiago-de-compostela': 'Santiago de Compostela',

  // UNTERWEGS / ON THE MOVE
  '48-stunden-rom': 'Rome',
  '48-hours-rome': 'Rome',
  'madrid-24-stunden': 'Madrid',
  'madrid-24-hours': 'Madrid',
  'costa-rica-rundreise-route': 'Costa Rica',
  'costa-rica-road-trip-route': 'Costa Rica',
  'costa-rica-surfen': 'Costa Rica',
  'costa-rica-surfing': 'Costa Rica',
  'lissabon-abseits-der-touristenpfade': 'Lisbon',
  'lisbon-beyond-the-tourist-trail': 'Lisbon',
  'porto-die-unterschaetzte-schwester': 'Porto',
  'porto-lisbons-underrated-sister': 'Porto',

  // REISETIPPS / TRAVEL TIPS — careful, only thematically strong
  'reisen-mit-baby-erste-fluege': 'Mallorca', // family-friendly destination
  'traveling-with-baby-first-flights': 'Mallorca',

  // NACHHALTIG / TRAVEL GREEN — only thematically strong
  'co2-kompensation-fliegen': 'Costa Rica', // eco destinations
  'flight-carbon-offsets-truth': 'Costa Rica',

  // BUSINESS TRAVEL / LIFESTYLE
  'workation-steuern-2026': 'Bali',
  'workation-tax-rules-2026': 'Bali',
  'sabbatical-planen-guide': 'Costa Rica',
  'sabbatical-planning-guide': 'Costa Rica',
  'mit-hund-europa-reisen': 'Austria', // pet-friendly Europe
  'traveling-with-dog-europe': 'Austria',
  'solo-reisen-frauen-sicher': 'Iceland', // safest country
  'solo-travel-women-safe-countries': 'Iceland',

  // SMART TRAVEL — Boutique
  'boutique-hotels': 'Tuscany', // boutique hotel paradise
  'riads-marokko-guide': 'Marrakech',
  'morocco-riads-guide': 'Marrakech',
};

function updateFrontmatter(filePath, dest) {
  const content = fs.readFileSync(filePath, 'utf8');
  const fmMatch = content.match(/^---\n([\s\S]*?)\n---\n/);
  if (!fmMatch) return { skipped: true, reason: 'no frontmatter' };

  const fm = fmMatch[1];
  if (fm.includes('bookingDest:')) {
    const updated = fm.replace(/^bookingDest:.*$/m, `bookingDest: "${dest}"`);
    if (updated === fm) return { skipped: true, reason: 'already same' };
    fs.writeFileSync(filePath, '---\n' + updated + '\n---\n' + content.slice(fmMatch[0].length));
    return { updated: true, action: 'replaced' };
  }
  let updated;
  if (fm.match(/^heroImage:.*$/m)) {
    updated = fm.replace(/(^heroImage:.*$)/m, `$1\nbookingDest: "${dest}"`);
  } else {
    updated = fm.replace(/(^readingTime:.*$)/m, `$1\nbookingDest: "${dest}"`);
  }
  if (updated === fm) return { skipped: true, reason: 'no anchor field' };
  fs.writeFileSync(filePath, '---\n' + updated + '\n---\n' + content.slice(fmMatch[0].length));
  return { updated: true, action: 'inserted' };
}

const dirs = ['src/content/blog', 'src/content/blogen', 'src/content/bloges'];
let updated = 0, skipped = 0, notFound = 0;

for (const [slug, dest] of Object.entries(overrides)) {
  let foundAny = false;
  for (const dir of dirs) {
    const filePath = path.join(ROOT, dir, slug + '.md');
    if (!fs.existsSync(filePath)) continue;
    foundAny = true;
    const result = updateFrontmatter(filePath, dest);
    if (result.updated) { updated++; console.log(`  ✓ ${slug} -> ${dest} (${result.action})`); }
    else { skipped++; }
  }
  if (!foundAny) { notFound++; console.log(`  ? ${slug} -> ${dest} (file not found)`); }
}

console.log(`\nDone: ${updated} updated, ${skipped} skipped, ${notFound} not found.`);
