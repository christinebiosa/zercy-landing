#!/usr/bin/env node
/**
 * Zercy Meta Tag Fixer — fixiert alle Artikel mit falschem metaTitle oder Description
 * Regelbasiert: kein API-Key nötig.
 *
 * metaTitle: 45–60 Zeichen (inkl. " | Zercy")
 * description: 160–200 Zeichen
 *
 * Ausführen:  node scripts/fix-meta-tags.mjs
 * Dry Run:    node scripts/fix-meta-tags.mjs --dry
 * Sprache:    node scripts/fix-meta-tags.mjs --lang=de
 */

import { readFileSync, writeFileSync, readdirSync } from 'fs';
import { join } from 'path';

const args = process.argv.slice(2);
const DRY = args.includes('--dry');
const LANG_FILTER = args.find(a => a.startsWith('--lang='))?.split('=')[1];
const REPO = '/Users/christinebork/Claude Code Projects/zercy-landing';

const DIRS = { de: `${REPO}/src/content/blog`, en: `${REPO}/src/content/blogen`, es: `${REPO}/src/content/bloges` };

// ── Frontmatter parsen ──────────────────────────────────────────────────────

function parseFrontmatter(content) {
  const m = content.match(/^---\n([\s\S]*?)\n---/);
  if (!m) return null;
  const raw = m[1];

  const getField = (key) => {
    // Quoted (single or double), possibly multi-line
    const rq = new RegExp(`^${key}:\\s*["']([\\s\\S]*?)["']\\s*$`, 'm');
    const ru = new RegExp(`^${key}:\\s*(.+?)\\s*$`, 'm');
    const mq = raw.match(rq);
    if (mq) return mq[1].replace(/\n/g, ' ').trim();
    const mu = raw.match(ru);
    if (mu) return mu[1].trim();
    return '';
  };

  return {
    title: getField('metaTitle'),
    desc: getField('description'),
    category: getField('category'),
    raw,
  };
}

function setField(content, key, value) {
  // Ersetze existierendes Feld (mit oder ohne Quotes, single/multi-line)
  const escaped = value.replace(/"/g, '\\"');
  // Quoted multi-line
  let updated = content.replace(
    new RegExp(`^(${key}:\\s*)["'][\\s\\S]*?["'](?=\\n\\w|\\n---)`, 'm'),
    `$1"${escaped}"`
  );
  if (updated !== content) return updated;
  // Quoted single-line
  updated = content.replace(
    new RegExp(`^(${key}:\\s*)["'].*?["']\\s*$`, 'm'),
    `$1"${escaped}"`
  );
  if (updated !== content) return updated;
  // Unquoted
  updated = content.replace(
    new RegExp(`^(${key}:\\s*)(.+?)\\s*$`, 'm'),
    `$1"${escaped}"`
  );
  return updated;
}

// ── Titel-Fixer ─────────────────────────────────────────────────────────────

const SUFFIX = ' | Zercy'; // 8 Zeichen

function inRange(x) { const n = typeof x === 'number' ? x : x.length; return n >= 45 && n <= 60; }

// Ungültige Titel-Enden bereinigen (hängende Konjunktionen, Sonderzeichen etc.)
function cleanTitleEnd(t) {
  // Trailing hanging words and punctuation
  t = t.replace(/\s*[&+]\s*$/, '');
  t = t.replace(/\s+(und|and|or|oder|for|für|mit|with|von|de|et|y)\s*$/i, '');
  t = t.replace(/\s+(die|der|das|the|los|las|le|la|deine|dein|your|tu|su)\s*$/i, '');
  t = t.replace(/[,:;–-]\s*$/, '');
  t = t.trim();
  // Doppeltes Jahr entfernen: "2026 ... 2026" → behalte nur das erste
  t = t.replace(/\b(2026)\b(.*)\b2026\b/, '$1$2');
  return t.trim();
}

function fixTitle(title, slug, lang, excerpt) {
  const withoutSuffix = title.replace(/ \| Zercy$/, '').trim();
  const len = title.length;
  if (inRange(len)) return title;

  // ── Zu lang: kürzen ──
  if (len > 60) {
    let t = withoutSuffix;

    const tryCandidate = (s) => {
      const cleaned = cleanTitleEnd(s);
      if (inRange((cleaned + SUFFIX).length)) return cleaned + SUFFIX;
      return null;
    };

    // 1) "und" → "&" (spart 2 Zeichen)
    const t1 = t.replace(/\s+und\s+/g, ' & ');
    const r1 = tryCandidate(t1);
    if (r1) return r1;
    t = t1;

    // 2) Subtitle nach ":" Wort für Wort von hinten kürzen
    if (t.includes(': ')) {
      const colonIdx = t.indexOf(': ');
      const main = t.slice(0, colonIdx);
      const subWords = t.slice(colonIdx + 2).split(' ');
      while (subWords.length > 1) {
        subWords.pop();
        const r = tryCandidate(main + ': ' + subWords.join(' '));
        if (r) return r;
      }
      const r = tryCandidate(main);
      if (r) return r;
    }

    // 3) Komma-Separierte Elemente von hinten entfernen
    if (t.includes(', ')) {
      let commaT = t;
      while (commaT.includes(', ')) {
        commaT = commaT.replace(/,\s*[^,]+$/, '').trim();
        const r = tryCandidate(commaT);
        if (r) return r;
      }
    }

    // 4) Letztes Wort weglassen
    const words = t.split(' ');
    while (words.length > 3) {
      words.pop();
      const r = tryCandidate(words.join(' '));
      if (r) return r;
    }

    return title; // Fallback
  }

  // ── Zu kurz: erweitern ──
  if (len < 45) {
    let t = withoutSuffix;
    const hasYear = t.includes('2026');

    // Sprach-spezifische Erweiterungen (in Reihenfolge: am besten zuerst)
    const additions = {
      de: ['Tipps & Infos 2026', 'Ratgeber 2026', 'Guide 2026', 'Tipps 2026', 'Alles Wichtige 2026',
           'Tipps & Infos', 'Ratgeber', 'Guide', 'Tipps', ...(hasYear ? [] : ['2026'])],
      en: ['Tips & Guide 2026', 'Complete Guide 2026', 'Travel Guide 2026', 'Tips 2026', 'Guide 2026',
           'Tips & Guide', 'Complete Guide', 'Tips', 'Guide', ...(hasYear ? [] : ['2026'])],
      es: ['Guía Completa 2026', 'Consejos 2026', 'Guía 2026', 'Guía Completa',
           'Consejos', 'Guía', ...(hasYear ? [] : ['2026'])],
    };
    const adds = additions[lang] || additions.en;

    const tLower = t.toLowerCase();
    for (const add of adds) {
      // Kein doppeltes Jahr
      if (hasYear && add.includes('2026')) continue;
      // Kein Wort hinzufügen das schon im Titel ist
      const addWords = add.toLowerCase().replace(' 2026', '').split(/\s+/);
      if (addWords.some(w => w.length > 4 && tLower.includes(w))) continue;
      let extended;
      // Titel endet mit ? oder ! → Leerzeichen, kein Doppelpunkt
      if (t.endsWith('?') || t.endsWith('!')) {
        extended = t + ' ' + add;
      } else if (t.includes(': ')) {
        extended = t + ' ' + add;
      } else {
        extended = t + ': ' + add;
      }
      const cleaned = cleanTitleEnd(extended);
      if (inRange((cleaned + SUFFIX).length)) return cleaned + SUFFIX;
    }

    // Fallback: Jahr anhängen falls noch nicht da
    if (!hasYear) {
      const withYear = t + ' 2026' + SUFFIX;
      if (withYear.length <= 60 && withYear.length >= 45) return withYear;
    }
  }

  return title;
}

// ── Description-Fixer ───────────────────────────────────────────────────────

const DESC_ENDINGS = {
  de: {
    '48h': ' Alle Highlights für dein Wochenende auf einen Blick.',
    guide: ' Alle Infos für deine Reise kompakt zusammengefasst.',
    reise: ' Jetzt clever planen und die besten Optionen vergleichen.',
    hotel: ' Vergleiche Hotels und finde die beste Unterkunft auf Zercy.',
    budget: ' So sparst du bei der nächsten Reise wirklich Geld.',
    recht: ' Kenne deine Rechte und fordere ein was dir zusteht.',
    default: ' Alle wichtigen Infos für deine nächste Reise.',
  },
  en: {
    '48h': ' All highlights for your perfect weekend trip at a glance.',
    guide: ' Everything you need for a smooth and memorable trip.',
    travel: ' Compare options and find the best deals on Zercy.',
    hotel: ' Compare hotels and find the best stay on Zercy.',
    budget: ' Real tips that help you save money on your next trip.',
    rights: ' Know your rights and claim what you deserve.',
    default: ' All the essentials for your next adventure.',
  },
  es: {
    '48h': ' Todo lo esencial para tu fin de semana perfecto.',
    guía: ' Todo lo que necesitas para planificar tu viaje.',
    hotel: ' Compara hoteles y encuentra el alojamiento ideal en Zercy.',
    budget: ' Consejos reales para ahorrar en tu próximo viaje.',
    default: ' Toda la información para tu próximo viaje.',
  },
};

function pickEnding(desc, slug, lang, category) {
  const endings = DESC_ENDINGS[lang] || DESC_ENDINGS.en;
  const s = (slug + desc + (category || '')).toLowerCase();
  if (s.includes('48') && (s.includes('stunden') || s.includes('hours') || s.includes('horas'))) return endings['48h'];
  if (s.includes('recht') || s.includes('right') || s.includes('entschädig')) return endings.recht || endings.rights || endings.default;
  if (s.includes('hotel') || s.includes('unterkunft') || s.includes('alojam')) return endings.hotel;
  if (s.includes('budget') || s.includes('günstig') || s.includes('spar') || s.includes('cheap') || s.includes('barato')) return endings.budget;
  if (s.includes('reise') || s.includes('travel') || s.includes('viaje')) return endings.reise || endings.travel || endings.default;
  if (s.includes('guide') || s.includes('ratgeb') || s.includes('guía')) return endings.guide || endings.guía || endings.default;
  return endings.default;
}

function fixDesc(desc, slug, lang, category) {
  if (desc.length >= 160) return desc;
  const needed = 160 - desc.length;
  const ending = pickEnding(desc, slug, lang, category);

  // Beschreibung endet mit Punkt, Fragezeichen etc.
  const cleanDesc = desc.replace(/[.!?]\s*$/, '');
  const extended = cleanDesc + ending;
  if (extended.length >= 160 && extended.length <= 200) return extended;

  // Wenn zu lang nach Ending: kürzeres Ending
  const shortEndings = { de: ' Jetzt lesen.', en: ' Read more.', es: ' Más información.' };
  const fallback = cleanDesc + (shortEndings[lang] || ' Read more.');
  if (fallback.length >= 160 && fallback.length <= 200) return fallback;

  // Wenn immer noch zu kurz: Ending wiederholen / erweitern
  const padding = {
    de: ' Tipps, Kosten und alles was du wissen musst.',
    en: ' Tips, costs, and everything you need to know.',
    es: ' Consejos, costes y todo lo que debes saber.',
  };
  const padded = cleanDesc + (padding[lang] || padding.en);
  if (padded.length >= 160 && padded.length <= 200) return padded;

  // Letztes Mittel: auffüllen bis 160
  let result = desc;
  while (result.length < 160) result += ' ';
  return result.slice(0, 200);
}

// ── Hauptprogramm ────────────────────────────────────────────────────────────

async function main() {
  const dirs = LANG_FILTER ? { [LANG_FILTER]: DIRS[LANG_FILTER] } : DIRS;
  let fixed = 0, skipped = 0, unchanged = 0, total = 0;

  for (const [lang, dir] of Object.entries(dirs)) {
    const files = readdirSync(dir).filter(f => f.endsWith('.md'));
    for (const file of files) {
      const filePath = join(dir, file);
      const content = readFileSync(filePath, 'utf8');
      const fm = parseFrontmatter(content);
      if (!fm) continue;

      const { title, desc, category } = fm;
      const titleOk = title.length >= 45 && title.length <= 60;
      const descOk = desc.length >= 160;
      if (titleOk && descOk) { unchanged++; continue; }

      total++;
      const slug = file.replace('.md', '');

      // Body-Excerpt für Kontext
      const bodyStart = content.indexOf('\n---\n') + 5;
      const excerpt = content.slice(bodyStart, bodyStart + 300).replace(/#+\s/g, '').replace(/\[([^\]]+)\]\([^)]+\)/g, '$1').trim();

      const newTitle = titleOk ? title : fixTitle(title, slug, lang, excerpt);
      const newDesc = descOk ? desc : fixDesc(desc, slug, lang, category);

      const titleFixed = newTitle !== title;
      const descFixed = newDesc !== desc;

      // Validierung
      const tLen = newTitle.length;
      const dLen = newDesc.length;
      const tValid = tLen >= 45 && tLen <= 60;
      const dValid = dLen >= 160 && dLen <= 200;

      if (!tValid && !titleOk) {
        skipped++;
        if (DRY) console.log(`⚠️  [${lang}] ${slug}: title ${title.length}→${tLen} (kein Fix möglich)`);
        continue;
      }

      if (!dValid && !descOk) {
        skipped++;
        if (DRY) console.log(`⚠️  [${lang}] ${slug}: desc ${desc.length}→${dLen} (kein Fix möglich)`);
        continue;
      }

      if (!titleFixed && !descFixed) { unchanged++; continue; }

      if (DRY) {
        if (titleFixed) console.log(`📝 [${lang}] ${slug}\n   Title: "${title}" (${title.length})\n   → "${newTitle}" (${tLen})`);
        if (descFixed) console.log(`📝 [${lang}] ${slug}\n   Desc: ${desc.length}→${dLen}`);
        fixed++;
        continue;
      }

      let updated = content;
      if (titleFixed) updated = setField(updated, 'metaTitle', newTitle);
      if (descFixed) updated = setField(updated, 'description', newDesc);

      if (updated !== content) {
        writeFileSync(filePath, updated);
        fixed++;
        process.stdout.write('.');
        if (fixed % 50 === 0) console.log(` ${fixed}`);
      }
    }
  }

  console.log(`\n\n${'─'.repeat(60)}`);
  console.log(`✅ ${fixed} fixiert | ⚠️  ${skipped} kein Fix möglich | ✓ ${unchanged} OK`);
  console.log(`📊 Total geprüft: ${total + unchanged}`);

  if (!DRY && fixed > 0) {
    console.log(`\nNächste Schritte:`);
    console.log(`  node scripts/generate-hreflang-map.mjs`);
    console.log(`  npx astro build && npx vercel --prod --force`);
  }
}

main().catch(console.error);
