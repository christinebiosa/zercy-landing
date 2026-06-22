// Setzt kontextuelle Affiliate-Links (verbundene Travelpayouts-Programme) in alle Blog-Artikel.
// Drive (tp-em.com, Marker 542440) wandelt sie beim Klick automatisch in getrackte Links um.
//
// REGELN (SEO-sicher, kein Spam):
//  - max 3 Affiliate-Links pro Artikel
//  - nur die ERSTE Erwähnung eines Keywords wird verlinkt
//  - bestehende Markdown-Links werden NIE angefasst
//  - überspringt Artikel, die die Ziel-Domain schon enthalten (keine Dubletten)
//  - keine Überschriften-Zeilen
//  - idempotent: erneuter Lauf ändert nichts
//
// Usage: node scripts/inject-affiliate-links.mjs --dry   (nur Bericht)
//        node scripts/inject-affiliate-links.mjs         (schreibt)
import fs from 'fs';
import path from 'path';

const DRY = process.argv.includes('--dry');
const MAX_PER_ARTICLE = 3;

// Entfernen-Modus: node scripts/inject-affiliate-links.mjs --remove <domain>
// macht aus [Text](https://...domain...) wieder nur Text. Mehrere Domains kommagetrennt.
const removeIdx = process.argv.indexOf('--remove');
if (removeIdx !== -1) {
  const fs2 = await import('fs');
  const path2 = await import('path');
  const doms = (process.argv[removeIdx + 1] || '').split(',').map(s => s.trim()).filter(Boolean);
  const dirs = ['src/content/blog', 'src/content/blogen', 'src/content/bloges'];
  let removed = 0, files = 0;
  for (const dir of dirs) {
    for (const f of fs2.readdirSync(dir).filter(x => x.endsWith('.md'))) {
      const fp = path2.join(dir, f);
      let t = fs2.readFileSync(fp, 'utf8');
      let n = 0;
      for (const d of doms) {
        const re = new RegExp('\\[([^\\]]+)\\]\\(https?://[^)]*' + d.replace(/\./g, '\\.') + '[^)]*\\)', 'g');
        t = t.replace(re, (_m, txt) => { n++; return txt; });
      }
      if (n > 0) { fs2.writeFileSync(fp, t); removed += n; files++; }
    }
  }
  console.log(`Entfernt: ${removed} Links in ${files} Dateien (${doms.join(', ')})`);
  process.exit(0);
}

// Nur VERBUNDENE TP-Programme. Keyword (pro Sprache) -> Partner-Domain.
const RULES = {
  de: [
    { re: /\beSIMs?\b/i, url: 'https://www.airalo.com/', dom: 'airalo.com' },
    { re: /\bVPN\b/, url: 'https://nordvpn.com/', dom: 'nordvpn.com' },
    { re: /\bGepäckaufbewahrung\b/i, url: 'https://radicalstorage.com/', dom: 'radicalstorage.com' },
    { re: /\bFlughafentransfers?\b/i, url: 'https://www.welcomepickups.com/', dom: 'welcomepickups.com' },    { re: /\bFlugentschädigung\b/i, url: 'https://www.airhelp.com/', dom: 'airhelp.com' },
    { re: /\bCity ?Pass\b/i, url: 'https://gocity.com/', dom: 'gocity.com' },
    { re: /\bMietwagen\b/i, url: 'https://www.economybookings.com/', dom: 'economybookings.com' },
    { re: /\b(Sehenswürdigkeiten|geführte Touren?)\b/i, url: 'https://www.tiqets.com/', dom: 'tiqets.com' },
    { re: /\b(Flüge buchen|günstige Flüge|billige Flüge|Flüge vergleichen|Flüge finden)\b/i, url: 'https://www.aviasales.com/', dom: 'aviasales.com' },
  ],
  en: [
    { re: /\beSIMs?\b/i, url: 'https://www.airalo.com/', dom: 'airalo.com' },
    { re: /\bVPN\b/, url: 'https://nordvpn.com/', dom: 'nordvpn.com' },
    { re: /\bluggage storage\b/i, url: 'https://radicalstorage.com/', dom: 'radicalstorage.com' },
    { re: /\bairport transfers?\b/i, url: 'https://www.welcomepickups.com/', dom: 'welcomepickups.com' },    { re: /\bflight compensation\b/i, url: 'https://www.airhelp.com/', dom: 'airhelp.com' },
    { re: /\bcity pass\b/i, url: 'https://gocity.com/', dom: 'gocity.com' },
    { re: /\b(rental cars?|car rentals?|hire a car|car hire)\b/i, url: 'https://www.economybookings.com/', dom: 'economybookings.com' },
    { re: /\b(things to do|guided tours?)\b/i, url: 'https://www.tiqets.com/', dom: 'tiqets.com' },
    { re: /\b(book flights?|cheap flights|compare flights|find flights|flight deals)\b/i, url: 'https://www.aviasales.com/', dom: 'aviasales.com' },
  ],
  es: [
    { re: /\beSIMs?\b/i, url: 'https://www.airalo.com/', dom: 'airalo.com' },
    { re: /\bVPN\b/, url: 'https://nordvpn.com/', dom: 'nordvpn.com' },
    { re: /\b(consigna de equipaje|guardar equipaje)\b/i, url: 'https://radicalstorage.com/', dom: 'radicalstorage.com' },
    { re: /\btraslado(s)? (al|del) aeropuerto\b/i, url: 'https://www.welcomepickups.com/', dom: 'welcomepickups.com' },    { re: /\bcompensación (de|por) vuelo\b/i, url: 'https://www.airhelp.com/', dom: 'airhelp.com' },
    { re: /\bcity pass\b/i, url: 'https://gocity.com/', dom: 'gocity.com' },
    { re: /\b(alquiler de coche|coche de alquiler|alquiler de auto|renta de auto|alquiler de carro)\b/i, url: 'https://www.economybookings.com/', dom: 'economybookings.com' },
    { re: /\b(qué hacer|tours guiados?)\b/i, url: 'https://www.tiqets.com/', dom: 'tiqets.com' },
    { re: /\b(reservar vuelos?|vuelos baratos|comparar vuelos|buscar vuelos|encontrar vuelos)\b/i, url: 'https://www.aviasales.com/', dom: 'aviasales.com' },
  ],
};

const DIRS = { de: 'src/content/blog', en: 'src/content/blogen', es: 'src/content/bloges' };
const LINK_SPLIT = /(\[[^\]]*\]\([^)]*\))/g; // trennt bestehende Markdown-Links ab

const stats = { files: 0, links: 0, byDom: {}, examples: [] };

for (const [lang, dir] of Object.entries(DIRS)) {
  const rules = RULES[lang];
  for (const file of fs.readdirSync(dir).filter(f => f.endsWith('.md'))) {
    const fp = path.join(dir, file);
    let raw = fs.readFileSync(fp, 'utf8');
    const fm = raw.match(/^---\n[\s\S]*?\n---\n/);
    if (!fm) continue;
    const head = fm[0];
    let body = raw.slice(head.length);

    let added = 0;
    const addedDoms = [];
    for (const rule of rules) {
      if (added >= MAX_PER_ARTICLE) break;
      if (body.includes(rule.dom)) continue; // schon verlinkt/erwähnt -> skip

      const parts = body.split(LINK_SPLIT);
      let done = false;
      for (let i = 0; i < parts.length && !done; i++) {
        if (i % 2 === 1) continue; // ungerade = bestehender Link, nicht anfassen
        const seg = parts[i];
        const m = rule.re.exec(seg);
        rule.re.lastIndex = 0;
        if (!m) continue;
        // Überschriften-Zeile überspringen
        const lineStart = seg.lastIndexOf('\n', m.index) + 1;
        const lineText = seg.slice(lineStart, seg.indexOf('\n', m.index) === -1 ? undefined : seg.indexOf('\n', m.index));
        if (lineText.trimStart().startsWith('#')) continue;
        // ersten Treffer ersetzen
        parts[i] = seg.slice(0, m.index) + `[${m[0]}](${rule.url})` + seg.slice(m.index + m[0].length);
        body = parts.join('');
        added++; addedDoms.push(rule.dom);
        stats.byDom[rule.dom] = (stats.byDom[rule.dom] || 0) + 1;
        done = true;
      }
    }

    if (added > 0) {
      stats.files++; stats.links += added;
      if (stats.examples.length < 6) stats.examples.push(`${file}: +${added} (${addedDoms.join(', ')})`);
      if (!DRY) fs.writeFileSync(fp, head + body);
    }
  }
}

console.log(`${DRY ? '[DRY-RUN] ' : ''}Artikel geändert: ${stats.files} | Links gesetzt: ${stats.links}`);
console.log('Pro Programm:', JSON.stringify(stats.byDom, null, 0));
console.log('Beispiele:\n  ' + stats.examples.join('\n  '));
