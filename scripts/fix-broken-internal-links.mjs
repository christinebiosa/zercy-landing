// Repariert kaputte interne Blog-Links: mappt auf den korrekten existierenden Slug
// (eindeutiger Treffer per Prefix/Contains) oder entfernt den Link (unwrap zu Text).
// Usage: node scripts/fix-broken-internal-links.mjs --dry   (Vorschau)
//        node scripts/fix-broken-internal-links.mjs         (schreibt)
import fs from 'fs';
import path from 'path';

const DRY = process.argv.includes('--dry');
const DIRS = { de: 'src/content/blog', en: 'src/content/blogen', es: 'src/content/bloges' };
const dirFor = (lang) => DIRS[lang] || DIRS.de;

// Alle existierenden Slugs pro Sprache laden
const slugs = {};
for (const [lang, d] of Object.entries(DIRS)) slugs[lang] = new Set(fs.readdirSync(d).filter(f => f.endsWith('.md')).map(f => f.replace('.md', '')));
const exists = (lang, slug) => slugs[lang].has(slug);

// Beste eindeutige Ersetzung finden: existierender Slug, der mit badslug beginnt ODER badslug enthält.
function bestMatch(lang, bad) {
  const all = [...slugs[lang]];
  // 1) exakter Prefix ("reise-packliste" -> "reise-packliste-was-...")
  let cand = all.filter(s => s === bad || s.startsWith(bad + '-'));
  if (cand.length === 1) return cand[0];
  // 2) contains (eindeutig) -> "handgepaeck-vs-aufgegeben" in "...-aufgegebenes-gepaeck"
  cand = all.filter(s => s.includes(bad) || bad.includes(s));
  if (cand.length === 1) return cand[0];
  // 3) NUR sehr langer gemeinsamer Prefix (>= bad ohne die letzten 3 Zeichen), eindeutig.
  //    Verhindert Fehlmappings wie cape-town -> capadocia (zu kurzer gemeinsamer Prefix).
  const stem = bad.slice(0, bad.length - 3);
  if (stem.length >= 12) {
    cand = all.filter(s => s.startsWith(stem));
    if (cand.length === 1) return cand[0];
  }
  return null;
}

const linkRe = /\[([^\]]+)\]\((\/(?:en|es)?\/?blog\/[a-z0-9-]+)\/?\)/g;
const parse = (p) => { const m = p.match(/^\/(?:(en|es)\/)?blog\/([a-z0-9-]+)$/); return m ? { lang: m[1] || 'de', slug: m[2] } : null; };
const urlFor = (lang, slug) => (lang === 'de' ? `/blog/${slug}/` : `/${lang}/blog/${slug}/`);

let mapped = 0, unwrapped = 0, files = 0;
const report = { map: {}, unwrap: {} };

for (const [lang, d] of Object.entries(DIRS)) {
  for (const f of fs.readdirSync(d).filter(x => x.endsWith('.md'))) {
    const fp = path.join(d, f);
    let t = fs.readFileSync(fp, 'utf8');
    let changed = false;
    t = t.replace(linkRe, (whole, text, urlPath) => {
      const pr = parse(urlPath);
      if (!pr) return whole;
      if (exists(pr.lang, pr.slug)) return whole; // Link ok
      const fix = bestMatch(pr.lang, pr.slug);
      if (fix) {
        mapped++; changed = true;
        report.map[urlPath] = urlFor(pr.lang, fix);
        return `[${text}](${urlFor(pr.lang, fix)})`;
      } else {
        unwrapped++; changed = true;
        report.unwrap[urlPath] = (report.unwrap[urlPath] || 0) + 1;
        return text; // Link entfernen, Text behalten
      }
    });
    if (changed && !DRY) { fs.writeFileSync(fp, t); files++; }
  }
}

console.log(`${DRY ? '[DRY-RUN] ' : ''}Gemappt: ${mapped} | Entfernt (unwrap): ${unwrapped} | Dateien: ${DRY ? '(nicht geschrieben)' : files}`);
console.log('\n=== MAPPINGS (kaputt -> korrekt) ===');
for (const [bad, good] of Object.entries(report.map)) console.log(`  ${bad}  ->  ${good}`);
console.log('\n=== ENTFERNT (kein Treffer, Link raus) ===');
for (const [bad, n] of Object.entries(report.unwrap)) console.log(`  ${bad}  (x${n})`);
