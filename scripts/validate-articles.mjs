// Vor-Deploy-Qualitaets-Gate fuer Blog-Artikel. Deterministisch, blockierend.
// Prueft jeden Artikel gegen die SEO/AEO/Stil-Regeln aus CLAUDE.md und gibt
// bei JEDEM Verstoss Exit-Code 1 zurueck (= Deploy stoppen).
//
// Usage:
//   node scripts/validate-articles.mjs                 -> prueft alle Artikel mit pubDate == heute
//   node scripts/validate-articles.mjs <datei> ...     -> prueft genau diese Dateien
//   node scripts/validate-articles.mjs --today=YYYY-MM-DD
//
// Damit haengt Qualitaet nicht mehr am Gedaechtnis. PFLICHT vor jedem Deploy.
import fs from 'fs';
import path from 'path';

const DIRS = { 'src/content/blog': 'de', 'src/content/blogen': 'en', 'src/content/bloges': 'es' };

const FAQ = { de: '## Häufige Fragen', en: '## Frequently Asked Questions', es: '## Preguntas frecuentes' };
const TLDR = { de: 'Kurze Antwort:', en: 'Short answer:', es: 'Respuesta corta:' };
const QWORD = {
  de: /^(¿)?\s*(Was|Wann|Wie|Wo|Warum|Welche[rsn]?|Wer|Wen|Wem|Wofür|Woran|Wieviel|Wie viel)\b/i,
  en: /^(What|When|How|Where|Why|Which|Who|Whom)\b/i,
  es: /^¿\s*(Qué|Cuándo|Cómo|Dónde|Por qué|Cuál(es)?|Cuánto[as]?|Para qué|Quién(es)?)(?=\s|\?|$)/i,
};
const VALID_CAT = {
  de: ['Reisetipps','KI & Reisen','Fernweh','Unterwegs','Clever Reisen','Nur mit Handgepäck','Wo übernachten','Business Travel','Nachhaltig','Geheimtipps','Reise-Gadgets','Reise-Kleidung','Gepäck & Packen','Reise-Komfort'],
  en: ['Travel Tips','AI & Travel','Off the Map','On the Move','Smart Travel','Carry-On Only','Where to Stay','Business Travel','Travel Green','Hidden Gems','Travel Gear','Travel Clothing','Luggage & Packing','Travel Comfort'],
  es: ['Consejos de viaje','IA y viajes','Lugares lejanos','En camino','Viaje inteligente','Solo equipaje de mano','Dónde alojarse','Viajes de negocios','Viaje sostenible','Joyas ocultas','Equipo de viaje','Ropa de viaje','Equipaje y organización','Comodidad y bienestar'],
};
// DE: typische ASCII-gefoldete Umlaute, die in Prosa NIE vorkommen duerfen (nicht in Slugs).
const FOLD = /\b(fuer|ueber|muessen|koennen|wuerde|wuerden|natuerlich|haeufig|moechte|groesse|groesser|zurueck|fuehl|fuehr|taeglich|moeglich|fuenf|ueblich|gehoeren)\b/i;

const args = process.argv.slice(2);
const todayArg = (args.find(a => a.startsWith('--today=')) || '').split('=')[1];
const explicit = args.filter(a => !a.startsWith('--'));
const today = todayArg || new Date(Date.now() - new Date().getTimezoneOffset()*60000).toISOString().slice(0,10);

// Exakte Verzeichnis-Erkennung (bloges/blogen VOR blog pruefen, sonst Substring-Falle).
function langOf(file){
  if (/\/bloges(\/|$)/.test(file)) return 'es';
  if (/\/blogen(\/|$)/.test(file)) return 'en';
  if (/\/blog(\/|$)/.test(file)) return 'de';
  return null;
}

let targets = [];
if (explicit.length) {
  targets = explicit;
} else {
  for (const d in DIRS) for (const f of fs.readdirSync(d)) {
    if (!f.endsWith('.md')) continue;
    const fp = path.join(d, f);
    if (fs.readFileSync(fp,'utf8').includes(`pubDate: ${today}`)) targets.push(fp);
  }
}

if (!targets.length){ console.log(`Keine Artikel zu pruefen (pubDate ${today}). Tipp: Dateien als Argumente uebergeben.`); process.exit(0); }

let totalErrors = 0;
for (const file of targets) {
  const lang = langOf(file);
  const errs = [];
  if (!lang){ console.log(`?  ${file}  (Sprache unklar, uebersprungen)`); continue; }
  const t = fs.readFileSync(file, 'utf8');
  const fmMatch = t.match(/^---\n([\s\S]*?)\n---\n/);
  if (!fmMatch){ console.log(`❌ ${file}\n   - kein Frontmatter`); totalErrors++; continue; }
  const fm = fmMatch[1];
  const body = t.slice(fmMatch[0].length);
  const g = (k) => (fm.match(new RegExp(k + ':\\s*"(.*)"')) || [])[1];

  // Frontmatter
  const mt = g('metaTitle') || '';
  const ds = g('description') || '';
  const cat = g('category') || '';
  const hero = g('heroImage') || '';
  if (!g('title')) errs.push('title fehlt');
  if (mt.length < 45 || mt.length > 60) errs.push(`metaTitle ${mt.length} Zeichen (Soll 45-60): "${mt}"`);
  if (ds.length < 160 || ds.length > 200) errs.push(`description ${ds.length} Zeichen (Soll 160-200)`);
  if (!VALID_CAT[lang].includes(cat)) errs.push(`category ungueltig: "${cat}"`);
  if (!hero) errs.push('heroImage fehlt');
  else if (!fs.existsSync('public' + hero)) errs.push(`heroImage-Datei fehlt: public${hero}`);
  if (!/pubDate:\s*\d{4}-\d{2}-\d{2}/.test(fm)) errs.push('pubDate fehlt/falsch');

  // Em-Dashes / Folds
  if (/[—–]/.test(body)) errs.push(`Em-Dash/Gedankenstrich gefunden (${(body.match(/[—–]/g)||[]).length}x)`);
  if (lang === 'de') {
    const folds = [...new Set((body.split('\n').filter(l=>!l.includes('](')).join('\n').match(new RegExp(FOLD,'gi'))||[]))];
    if (folds.length) errs.push(`ASCII-gefoldete Umlaute: ${folds.join(', ')}`);
  }

  // TL;DR-Box (erste nicht-leere Body-Zeile)
  const firstLine = body.split('\n').find(l => l.trim().length) || '';
  if (!firstLine.includes(TLDR[lang])) errs.push(`TL;DR-Box "${TLDR[lang]}" fehlt als erste Zeile`);

  // Frage-H2s (AEO)
  const h2 = body.split('\n').filter(l => /^## /.test(l));
  const qH2 = h2.filter(l => /\?\s*$/.test(l)).length;
  if (qH2 < 3) errs.push(`nur ${qH2} Frage-H2 (Soll min. 3 fuer AEO)`);

  // FAQ-Heading + 4 W-Fragen
  const faqIdx = body.indexOf(FAQ[lang]);
  if (faqIdx === -1) errs.push(`FAQ-Heading "${FAQ[lang]}" fehlt (kein FAQPage-Schema!)`);
  else {
    const faqBlock = body.slice(faqIdx);
    const q = faqBlock.split('\n').filter(l => /^### /.test(l)).map(l => l.replace(/^###\s+/, ''));
    if (q.length < 4) errs.push(`nur ${q.length} FAQ-Fragen (Soll 4)`);
    const badQ = q.filter(x => !QWORD[lang].test(x));
    if (badQ.length) errs.push(`FAQ-Frage ohne W-Wort: "${badQ[0]}"`);
  }

  // Interne Links: trailing slash + Mindestanzahl
  const internal = body.match(/\]\(\/[a-z]{0,3}\/?blog\/[a-z0-9-]+\/?\)/g) || [];
  const noSlash = internal.filter(l => !l.endsWith('/)'));
  if (noSlash.length) errs.push(`${noSlash.length} interne(r) Link(s) OHNE trailing slash: ${noSlash[0]}`);
  if (internal.length < 3) errs.push(`nur ${internal.length} interne Links (Soll min. 3)`);

  // Externer Autoritaets-Link
  const ext = (body.match(/\]\(https?:\/\/(?!www\.zercy\.app|www\.economybookings|www\.welcomepickups|www\.airalo|nordvpn|radicalstorage|gocity|tiqets|aviasales|www\.airhelp)[^)]+\)/g) || []);
  if (ext.length < 1) errs.push('kein externer Autoritaets-Link (Soll min. 1)');

  if (errs.length){ totalErrors += errs.length; console.log(`❌ ${file}\n   - ${errs.join('\n   - ')}`); }
  else console.log(`✅ ${file}`);
}

console.log(`\n${totalErrors === 0 ? '✅ ALLE CHECKS BESTANDEN' : '❌ ' + totalErrors + ' FEHLER , DEPLOY STOPPEN, erst fixen'}`);
process.exit(totalErrors === 0 ? 0 : 1);
