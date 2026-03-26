const sharp = require('sharp');
const path = require('path');

const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <defs>
    <radialGradient id="orb" cx="35%" cy="35%" r="65%">
      <stop offset="0%" stop-color="#a78bfa"/>
      <stop offset="50%" stop-color="#4f46e5"/>
      <stop offset="100%" stop-color="#0ea5e9"/>
    </radialGradient>
  </defs>
  <circle cx="32" cy="32" r="30" fill="url(#orb)"/>
  <polyline points="14,18 34,18 14,38 34,38" stroke="white" stroke-width="4.5" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
  <circle cx="50" cy="14" r="4.5" fill="#f97316"/>
</svg>`;

const buf = Buffer.from(svg);

Promise.all([
  sharp(buf).resize(16,16).png().toFile(path.join(__dirname,'public','favicon-16.png')),
  sharp(buf).resize(32,32).png().toFile(path.join(__dirname,'public','favicon-32.png')),
  sharp(buf).resize(180,180).png().toFile(path.join(__dirname,'public','apple-touch-icon.png')),
  sharp(buf).resize(192,192).png().toFile(path.join(__dirname,'public','icon-192.png')),
]).then(() => console.log('✅ favicons generated')).catch(e => { console.error(e); process.exit(1); });
