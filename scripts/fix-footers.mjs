// Lokalisiert + geo-/legal-korrigiert die Footer in den Blog-Templates.
// Idempotent: ersetzt nur, was noch nicht lokalisiert ist.
import fs from 'fs';

const NB = ' &nbsp;·&nbsp; '; // Trenner

function edit(file, replacements) {
  let t = fs.readFileSync(file, 'utf8');
  let n = 0;
  for (const [from, to] of replacements) {
    if (t.includes(from)) { t = t.split(from).join(to); n++; }
  }
  if (n > 0) fs.writeFileSync(file, t);
  console.log(`${n > 0 ? '✓' : '='} ${file}  (${n} Ersetzungen)`);
}

// --- DE-Blog-Templates: Links Englisch -> Deutsch, Copy + Tagline ---
const deLinks = [
  `<a href="/about">About</a>${NB}<a href="/blog">Blog</a>${NB}<a href="/privacy">Privacy Policy</a>${NB}<a href="/impressum">Impressum</a>${NB}<a href="/terms">Terms</a>`,
  `<a href="/about">Über uns</a>${NB}<a href="/blog">Blog</a>${NB}<a href="/privacy">Datenschutz</a>${NB}<a href="/impressum">Impressum</a>${NB}<a href="/terms">AGB</a>`,
];
for (const f of ['src/pages/blog/[slug].astro', 'src/pages/blog/index.astro']) {
  edit(f, [
    deLinks,
    ['Ob Reiseidee oder konkreter Plan — Zercy denkt mit.', 'Ob Reiseidee oder konkreter Plan, Zercy denkt mit.'],
    ['© 2026 Zercy. Made with love and a lot of AI.', '© 2026 Zercy. Mit Liebe und viel KI gemacht.'],
  ]);
}

// --- ES-Blog-Templates: pro Token (Footer war teils schon ES), Tagline ---
for (const f of ['src/pages/es/blog/[slug].astro', 'src/pages/es/blog/index.astro']) {
  edit(f, [
    ['<a href="/about">About</a>', '<a href="/about">Sobre nosotros</a>'],
    ['<a href="/privacy">Privacy Policy</a>', '<a href="/privacy">Privacidad</a>'],
    ['<a href="/impressum">Impressum</a>', '<a href="/impressum">Aviso legal</a>'],
    ['<a href="/terms">Terms</a>', '<a href="/terms">Términos</a>'],
    ['Idea de viaje o lista para reservar — Zercy lo piensa por ti.', 'Idea de viaje o lista para reservar, Zercy lo piensa por ti.'],
  ]);
}

// --- EN-Blog-Templates: Impressum -> Legal Notice (geo/legal), Tagline ---
for (const f of ['src/pages/en/blog/[slug].astro', 'src/pages/en/blog/index.astro']) {
  edit(f, [
    ['<a href="/impressum">Impressum</a>', '<a href="/impressum">Legal Notice</a>'],
    ['Travel idea or ready to book — Zercy thinks it through.', 'Travel idea or ready to book, Zercy thinks it through.'],
  ]);
}

// --- Standalone EN-/bilinguale Seiten: nur Impressum -> Legal Notice ---
for (const f of ['src/pages/about.astro', 'src/pages/terms.astro', 'src/pages/privacy.astro']) {
  edit(f, [['<a href="/impressum">Impressum</a>', '<a href="/impressum">Legal Notice</a>']]);
}

// --- impressum.astro ist deutsche Seite: kompletter deutscher Footer ---
edit('src/pages/impressum.astro', [[
  `<a href="/about">About</a>${NB}<a href="/blog">Blog</a>${NB}<a href="/privacy">Privacy Policy</a>${NB}<a href="/impressum">Impressum</a>${NB}<a href="/terms">Terms</a>`,
  `<a href="/about">Über uns</a>${NB}<a href="/blog">Blog</a>${NB}<a href="/privacy">Datenschutz</a>${NB}<a href="/impressum">Impressum</a>${NB}<a href="/terms">AGB</a>`,
]]);
