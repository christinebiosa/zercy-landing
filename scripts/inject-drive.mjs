// Fügt das Travelpayouts-Drive-Script vor </head> in alle Seiten-Templates ein.
// Idempotent: überspringt Dateien, die es schon haben.
// Entfernen: node scripts/inject-drive.mjs --remove
import fs from 'fs';

const FILES = [
  'src/layouts/ZercyLayout.astro',
  'src/pages/blog/[slug].astro',
  'src/pages/en/blog/[slug].astro',
  'src/pages/es/blog/[slug].astro',
  'src/pages/blog/index.astro',
  'src/pages/en/blog/index.astro',
  'src/pages/es/blog/index.astro',
  'src/pages/about.astro',
  'src/pages/privacy.astro',
  'src/pages/terms.astro',
  'src/pages/impressum.astro',
  'src/pages/404.astro',
];

const MARKER = 'tp-em.com/NTQyNDQw.js';
const BLOCK = `  <!-- Travelpayouts Drive -->
  <script is:inline data-cfasync="false">
    (function () {
      var s = document.createElement("script");
      s.async = 1;
      s.src = "https://tp-em.com/NTQyNDQw.js?t=542440";
      document.head.appendChild(s);
    })();
  </script>
`;

const remove = process.argv.includes('--remove');
let changed = 0;

for (const f of FILES) {
  if (!fs.existsSync(f)) { console.log(`SKIP (fehlt): ${f}`); continue; }
  let src = fs.readFileSync(f, 'utf8');
  const has = src.includes(MARKER);

  if (remove) {
    if (!has) { console.log(`-  nicht drin: ${f}`); continue; }
    // Block entfernen (von Kommentar bis schließendem </script> der Drive-Zeile)
    src = src.replace(/\s*<!-- Travelpayouts Drive -->[\s\S]*?tp-em\.com[\s\S]*?<\/script>\n/, '\n');
    fs.writeFileSync(f, src);
    console.log(`✂  entfernt: ${f}`);
    changed++;
    continue;
  }

  if (has) { console.log(`=  schon drin: ${f}`); continue; }
  const idx = src.indexOf('</head>');
  if (idx === -1) { console.log(`!  kein </head>: ${f}`); continue; }
  src = src.slice(0, idx) + BLOCK + src.slice(idx);
  fs.writeFileSync(f, src);
  console.log(`✓  eingefügt: ${f}`);
  changed++;
}
console.log(`\n${remove ? 'Entfernt' : 'Eingefügt'} in ${changed} Dateien.`);
