#!/usr/bin/env node
// scripts/make-pinterest-csv.mjs
// Erzeugt eine Pinterest "Bulk Create Pins"-CSV aus Blog-Artikeln (DE/EN/ES).
// Pinterest-Upload: pinterest.com -> Settings -> Import content -> "Upload .csv or .txt file".
// Spalten (exakt, Pinterest-Vorgabe): Title, Media URL, Pinterest board, Thumbnail, Description, Link, Publish date, Keywords
//
// STANDARD-WORKFLOW (nach neuem Blog-Batch): einfach `node scripts/make-pinterest-csv.mjs`
//   -> nimmt alle Artikel mit pubDate == HEUTE (= der neue Batch), alle 3 Sprachen,
//      geplant 30/Tag ab morgen, CSV auf ~/Desktop. KEINE Dubletten (nur der heutige Batch).
//
// Optionen:
//   --date YYYY-MM-DD   nur Artikel mit genau diesem pubDate (default: heute)
//   --since YYYY-MM-DD  Artikel mit pubDate >= Datum (statt exakt)
//   --langs de,en,es    welche Sprachen (default: de,en,es)
//   --per-day N         Pins pro Tag bei Planung (default: 30)
//   --start YYYY-MM-DD  Startdatum der Planung (default: morgen)
//   --immediate         kein Publish date -> sofort veroeffentlichen
//   --out PFAD          Ausgabedatei (default: ~/Desktop/zercy-pinterest-<date>.csv)
import { readFileSync, readdirSync, writeFileSync, existsSync } from 'fs';
import path from 'path';
import { homedir } from 'os';

const BASE = path.resolve('/Users/christinebork/Claude Code Projects/zercy-landing');
const LANGS = {
  de: { dir: 'src/content/blog',   base: 'https://www.zercy.app/blog/' },
  en: { dir: 'src/content/blogen', base: 'https://www.zercy.app/en/blog/' },
  es: { dir: 'src/content/bloges', base: 'https://www.zercy.app/es/blog/' },
};
const arg = (k, d) => { const i = process.argv.indexOf(k); return i > -1 ? process.argv[i + 1] : d; };
const has = (k) => process.argv.includes(k);
const fm = (md, k) => { const m = md.match(new RegExp(`^${k}:\\s*"?([^"\\n]+)"?`, 'm')); return m ? m[1].trim() : ''; };
const isCity = (s) => /^(wo-uebernachten|where-to-stay|donde-alojarse)-/.test(s);
const is48 = (s) => /^(48-stunden|48-hours|48-horas)-/.test(s);
const isRoute = (s) => /(rundreise-route|road-trip-route|ruta-completa|reiseguide-highlights|travel-guide-highlights|guia-viaje-highlights)/.test(s);
const board = (s) => isCity(s) ? 'Where to Stay Worldwide' : is48(s) ? '48h City Trips' : isRoute(s) ? 'Country Guides & Road Trips' : 'Travel Tips & Hacks';
const iso = (d) => d.toISOString().slice(0, 10);

const today = iso(new Date());
const dateExact = arg('--date', has('--since') ? null : today);
const since = arg('--since', null);
const langs = arg('--langs', 'de,en,es').split(',').map((x) => x.trim());
const perDay = parseInt(arg('--per-day', '30'), 10);
const immediate = has('--immediate');
const startStr = arg('--start', null);
const start = startStr ? new Date(startStr + 'T13:00:00Z') : (() => { const d = new Date(); d.setUTCDate(d.getUTCDate() + 1); d.setUTCHours(13, 0, 0, 0); return d; })();

const items = [];
for (const lang of langs) {
  const L = LANGS[lang]; if (!L) continue;
  for (const f of readdirSync(path.join(BASE, L.dir)).sort()) {
    if (!f.endsWith('.md')) continue;
    const md = readFileSync(path.join(BASE, L.dir, f), 'utf8');
    const pd = fm(md, 'pubDate');
    if (since ? pd < since : pd !== dateExact) continue;
    const s = f.replace(/\.md$/, '');
    const topic = (fm(md, 'heroImage').match(/blog\/(.+)\.jpg/) || [])[1];
    if (!topic) continue;
    items.push({ lang, s, topic, title: fm(md, 'title'), desc: fm(md, 'description'), board: board(s), link: L.base + s + '/' });
  }
}

const pad = (n) => String(n).padStart(2, '0');
const sched = (i) => { const d = new Date(start.getTime()); d.setUTCDate(d.getUTCDate() + Math.floor(i / perDay)); d.setUTCMinutes(d.getUTCMinutes() + (i % perDay) * 20); return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}T${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:00`; };
const esc = (v) => /[",\n]/.test(v) ? `"${String(v).replace(/"/g, '""')}"` : v;
const rows = [['Title', 'Media URL', 'Pinterest board', 'Thumbnail', 'Description', 'Link', 'Publish date', 'Keywords']];
items.forEach((it, i) => rows.push([it.title, `https://www.zercy.app/img/blog/${it.topic}.jpg`, it.board, '', it.desc, it.link, immediate ? '' : sched(i), '']));

if (items.length > 200) console.warn(`⚠️  ${items.length} Pins > 200 (Pinterest-CSV-Limit). Mehrere Dateien noetig oder Sprachen/Batch aufteilen.`);
const label = since ? `since-${since}` : dateExact;
const out = arg('--out', path.join(homedir(), 'Desktop', `zercy-pinterest-${label}.csv`));
writeFileSync(out, rows.map((r) => r.map(esc).join(',')).join('\r\n') + '\r\n');
const byBoard = {}; for (const it of items) byBoard[it.board] = (byBoard[it.board] || 0) + 1;
console.log(`✅ ${items.length} Pins -> ${out}`);
console.log(`   Sprachen: ${langs.join('+')} | Boards: ${JSON.stringify(byBoard)}`);
console.log(immediate ? '   Modus: sofort veroeffentlichen' : `   Geplant ${perDay}/Tag ab ${iso(start)} (${rows[1]?.[6]} ... ${rows[rows.length - 1]?.[6]})`);
console.log(`\n👉 Christine: pinterest.com -> Settings -> Import content -> "Upload .csv or .txt file" -> diese Datei hochladen.`);
