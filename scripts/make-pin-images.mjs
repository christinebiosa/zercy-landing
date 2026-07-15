// Erzeugt vertikale Pinterest-Pins (1000x1500, 2:3) mit Foto + Marken-Gradient +
// Titel-Overlay + zercy.app-Branding. Hostet sie unter public/pins/<lang>-<slug>.jpg
// (-> https://www.zercy.app/pins/...) und schreibt die Media-URL-Spalte einer
// Pinterest-Bulk-CSV auf diese vertikalen Pins um.
//
// Warum: Pinterest spielt fast nur vertikale Pins mit Text-Overlay aus. Quere
// Blog-Hero-Bilder floppen (Saves ~0). Siehe Memory feedback_zercy_social_media_professional.
//
// Usage:
//   node scripts/make-pin-images.mjs <pfad-zur-csv>        -> Pins bauen + CSV-Media-URL umschreiben
//   node scripts/make-pin-images.mjs <csv> --no-csv-write  -> nur Pins bauen, CSV nicht anfassen
//
// Voraussetzung: Google Chrome (headless) + macOS sips.
import fs from 'fs';
import path from 'path';
import os from 'os';
import { execFileSync } from 'child_process';
import { fileURLToPath } from 'url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const PINS_DIR = path.join(ROOT, 'public/pins');
const CONTENT = { de: 'src/content/blog', en: 'src/content/blogen', es: 'src/content/bloges' };
const CAT_LABEL = { // kurzer Pill-Text pro Sprache, falls keine Kategorie im Frontmatter
  de: 'Clever Reisen', en: 'Smart Travel', es: 'Viaje inteligente',
};

const csvPath = process.argv[2];
const writeCsv = !process.argv.includes('--no-csv-write');
if (!csvPath || !fs.existsSync(csvPath)) { console.error('CSV-Pfad fehlt/ungueltig:', csvPath); process.exit(1); }
if (!fs.existsSync(CHROME)) { console.error('Chrome nicht gefunden:', CHROME); process.exit(1); }
fs.mkdirSync(PINS_DIR, { recursive: true });

// --- Mini-CSV-Parser (quoted fields mit Kommas/Newlines) ---
function parseCsv(text) {
  const rows = []; let row = [], field = '', inQ = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQ) {
      if (c === '"' && text[i+1] === '"') { field += '"'; i++; }
      else if (c === '"') inQ = false;
      else field += c;
    } else {
      if (c === '"') inQ = true;
      else if (c === ',') { row.push(field); field = ''; }
      else if (c === '\n') { row.push(field); rows.push(row); row = []; field = ''; }
      else if (c === '\r') { /* skip */ }
      else field += c;
    }
  }
  if (field.length || row.length) { row.push(field); rows.push(row); }
  return rows;
}
function csvCell(s) { return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; }

function langSlug(link) {
  const m = link.match(/zercy\.app(\/(en|es))?\/blog\/([a-z0-9-]+)\/?/);
  if (!m) return null;
  return { lang: m[2] || 'de', slug: m[3] };
}
function readCategory(lang, slug) {
  const fp = path.join(ROOT, CONTENT[lang], slug + '.md');
  if (!fs.existsSync(fp)) return CAT_LABEL[lang];
  const m = fs.readFileSync(fp, 'utf8').match(/category:\s*"([^"]+)"/);
  return (m && m[1]) || CAT_LABEL[lang];
}
function titleSize(t) {
  const n = t.length;
  if (n <= 34) return 82; if (n <= 46) return 72; if (n <= 62) return 62;
  if (n <= 82) return 54; return 48;
}
function esc(s){ return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

function buildHtml({ dataUri, title, category }) {
  const fs2 = titleSize(title);
  return `<!doctype html><html><head><meta charset="utf-8"><style>
@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@600;700;800&display=swap');
*{margin:0;padding:0;box-sizing:border-box}
html,body{width:1000px;height:1500px}
.pin{position:relative;width:1000px;height:1500px;overflow:hidden;font-family:'Plus Jakarta Sans','Avenir Next','Helvetica Neue',Arial,sans-serif}
.bg{position:absolute;inset:0;background:#0F172A url('${dataUri}') center/cover no-repeat}
.grad{position:absolute;inset:0;background:linear-gradient(180deg,rgba(15,23,42,.28)0%,rgba(15,23,42,0)30%,rgba(15,23,42,.5)58%,rgba(15,23,42,.95)100%)}
.top{position:absolute;top:56px;left:64px;display:flex;align-items:center}
.brand{color:#fff;font-weight:800;font-size:36px;letter-spacing:4px}
.brand .d{color:#0EA5E9}
.acc{position:absolute;top:70px;right:64px;width:74px;height:8px;border-radius:8px;background:#F97316}
.bottom{position:absolute;left:64px;right:64px;bottom:150px}
.pill{display:inline-block;background:#0EA5E9;color:#fff;font-weight:800;font-size:25px;letter-spacing:1px;text-transform:uppercase;padding:11px 24px;border-radius:999px;margin-bottom:28px}
.title{color:#fff;font-weight:800;font-size:${fs2}px;line-height:1.09;text-shadow:0 3px 26px rgba(0,0,0,.4)}
.url{position:absolute;left:64px;bottom:66px;color:#fff;font-weight:700;font-size:32px;opacity:.96}
.url .d{color:#0EA5E9}
</style></head><body><div class="pin">
<div class="bg"></div><div class="grad"></div>
<div class="brand top">ZERCY<span class="d">.</span></div><div class="acc"></div>
<div class="bottom"><span class="pill">${esc(category)}</span><div class="title">${esc(title)}</div></div>
<div class="url">zercy<span class="d">.</span>app</div>
</div></body></html>`;
}

const rows = parseCsv(fs.readFileSync(csvPath, 'utf8'));
const header = rows[0];
const iMedia = header.indexOf('Media URL');
const iTitle = header.indexOf('Title');
const iLink = header.indexOf('Link');
if (iMedia < 0 || iTitle < 0 || iLink < 0) { console.error('CSV-Spalten Title/Media URL/Link nicht gefunden'); process.exit(1); }

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'zpin-'));
let made = 0;
for (let r = 1; r < rows.length; r++) {
  const row = rows[r];
  if (!row[iLink]) continue;
  const ls = langSlug(row[iLink]);
  if (!ls) { console.warn('  Link nicht parsebar:', row[iLink]); continue; }
  const { lang, slug } = ls;
  const oldMedia = row[iMedia]; // altes Blog-Hero
  const heroFile = path.join(ROOT, 'public', oldMedia.replace(/^https?:\/\/[^/]+/, ''));
  if (!fs.existsSync(heroFile)) { console.warn('  Hero-Bild fehlt:', heroFile); continue; }
  const dataUri = 'data:image/jpeg;base64,' + fs.readFileSync(heroFile).toString('base64');
  const category = readCategory(lang, slug);
  const html = buildHtml({ dataUri, title: row[iTitle], category });
  const htmlFile = path.join(tmpDir, `${lang}-${slug}.html`);
  fs.writeFileSync(htmlFile, html);
  const pngFile = path.join(tmpDir, `${lang}-${slug}.png`);
  const outJpg = path.join(PINS_DIR, `${lang}-${slug}.jpg`);
  execFileSync(CHROME, [
    '--headless=new', '--disable-gpu', '--no-sandbox', '--hide-scrollbars',
    '--force-device-scale-factor=2', '--window-size=1000,1500',
    '--virtual-time-budget=2600', `--screenshot=${pngFile}`, 'file://' + htmlFile,
  ], { stdio: 'ignore' });
  // 2000x3000 -> 1000x1500 JPG
  execFileSync('sips', ['-s', 'format', 'jpeg', '-s', 'formatOptions', '82', '-Z', '1500', pngFile, '--out', outJpg], { stdio: 'ignore' });
  if (writeCsv) row[iMedia] = `https://www.zercy.app/pins/${lang}-${slug}.jpg`;
  made++;
  console.log(`  ✓ ${lang}-${slug}.jpg  (${category})`);
}

if (writeCsv) {
  const out = rows.filter(r => r.length > 1 || (r.length === 1 && r[0] !== ''))
    .map(r => r.map(csvCell).join(',')).join('\n') + '\n';
  fs.writeFileSync(csvPath, out);
  console.log(`\n✅ ${made} Pins gebaut -> public/pins/  +  CSV Media-URLs umgeschrieben: ${csvPath}`);
} else {
  console.log(`\n✅ ${made} Pins gebaut -> public/pins/  (CSV unveraendert)`);
}
console.log('   Nach Deploy sind sie unter https://www.zercy.app/pins/<lang>-<slug>.jpg oeffentlich.');
