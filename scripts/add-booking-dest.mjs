// Adds `bookingDest: "<city>"` to frontmatter of all city-guide articles.
// Slug-pattern detection: wo-uebernachten-X | where-to-stay-X | donde-alojarse-X
// Maps slug-suffix to Booking.com city search term (English city names work best).
//
// Usage: node scripts/add-booking-dest.mjs

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');

// Map slug-suffix to Booking.com search city. English/standard names = highest result quality.
const cityMap = {
  // EU
  'amsterdam': 'Amsterdam',
  'athen': 'Athens', 'athens': 'Athens',
  'barcelona': 'Barcelona',
  'berlin': 'Berlin',
  'edinburgh': 'Edinburgh',
  'lissabon': 'Lisbon', 'lisbon': 'Lisbon',
  'london': 'London',
  'madrid': 'Madrid',
  'marseille': 'Marseille',
  'paris': 'Paris',
  'prag': 'Prague', 'prague': 'Prague',
  'rom': 'Rome', 'rome': 'Rome',
  'sevilla': 'Seville', 'seville': 'Seville',
  'wien': 'Vienna', 'vienna': 'Vienna',
  // LATAM
  'bogota': 'Bogota',
  'buenos-aires': 'Buenos Aires',
  'cancun': 'Cancun',
  'cartagena': 'Cartagena',
  'cusco': 'Cusco',
  'lima': 'Lima',
  'medellin': 'Medellin',
  'mendoza': 'Mendoza',
  'mexico-city': 'Mexico City', 'ciudad-de-mexico': 'Mexico City',
  'miami': 'Miami',
  'rio-de-janeiro': 'Rio de Janeiro',
  'tulum': 'Tulum',
  // USA
  'las-vegas': 'Las Vegas',
  'los-angeles': 'Los Angeles',
  'new-orleans': 'New Orleans',
  'new-york': 'New York',
  'san-francisco': 'San Francisco',
  // Asia
  'bali': 'Bali',
  'bangkok': 'Bangkok',
  'hanoi': 'Hanoi',
  'hongkong': 'Hong Kong', 'hong-kong': 'Hong Kong',
  'seoul': 'Seoul',
  'singapur': 'Singapore', 'singapore': 'Singapore',
  'tokio': 'Tokyo', 'tokyo': 'Tokyo',
  // Africa
  'cape-town': 'Cape Town',
  'marrakesch': 'Marrakech', 'marrakech': 'Marrakech',
};

function getDestFromSlug(slug) {
  const prefixes = ['wo-uebernachten-', 'where-to-stay-', 'donde-alojarse-'];
  for (const prefix of prefixes) {
    if (slug.startsWith(prefix)) {
      const suffix = slug.slice(prefix.length);
      return cityMap[suffix] || null;
    }
  }
  return null;
}

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
  // Insert after readingTime (or after heroImage if exists)
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
let updated = 0, skipped = 0, noMatch = 0;
const updatedSlugs = [];

for (const dir of dirs) {
  const fullDir = path.join(ROOT, dir);
  if (!fs.existsSync(fullDir)) continue;
  for (const file of fs.readdirSync(fullDir).filter(f => f.endsWith('.md'))) {
    const slug = file.replace('.md', '');
    const dest = getDestFromSlug(slug);
    if (!dest) { noMatch++; continue; }
    const result = updateFrontmatter(path.join(fullDir, file), dest);
    if (result.updated) { updated++; updatedSlugs.push(`${slug} -> ${dest}`); }
    else skipped++;
  }
}

console.log(`bookingDest added: ${updated} files, ${skipped} skipped, ${noMatch} non-city-guide articles.`);
if (updated > 0 && updated <= 50) {
  console.log('\nUpdates:'); updatedSlugs.forEach(s => console.log(`  ${s}`));
}
