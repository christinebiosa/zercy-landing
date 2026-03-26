const sharp = require('sharp');
const path = require('path');

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <defs>
    <radialGradient id="bg" cx="30%" cy="40%" r="70%">
      <stop offset="0%" stop-color="#1e1b4b"/>
      <stop offset="100%" stop-color="#0F172A"/>
    </radialGradient>
    <radialGradient id="glow1" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#4f46e5" stop-opacity="0.35"/>
      <stop offset="100%" stop-color="#4f46e5" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="glow2" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#0ea5e9" stop-opacity="0.25"/>
      <stop offset="100%" stop-color="#0ea5e9" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="orb" cx="35%" cy="35%" r="65%">
      <stop offset="0%" stop-color="#a78bfa"/>
      <stop offset="50%" stop-color="#4f46e5"/>
      <stop offset="100%" stop-color="#0ea5e9"/>
    </radialGradient>
  </defs>

  <!-- Background -->
  <rect width="1200" height="630" fill="url(#bg)"/>

  <!-- Atmospheric glows -->
  <ellipse cx="200" cy="300" rx="340" ry="320" fill="url(#glow1)"/>
  <ellipse cx="950" cy="400" rx="280" ry="260" fill="url(#glow2)"/>

  <!-- Orb -->
  <circle cx="180" cy="300" r="120" fill="url(#orb)" opacity="0.95"/>
  <!-- Orb shine -->
  <ellipse cx="148" cy="260" rx="36" ry="22" fill="white" opacity="0.18"/>
  <!-- Z eye -->
  <text x="130" y="315" font-family="Arial, sans-serif" font-size="54" font-weight="900" fill="white">Z</text>
  <!-- C eye -->
  <text x="178" y="315" font-family="Arial, sans-serif" font-size="54" font-weight="900" fill="white">C</text>
  <!-- Sparkles -->
  <circle cx="182" cy="172" r="8" fill="#f97316"/>
  <circle cx="305" cy="228" r="6" fill="#f97316"/>
  <circle cx="120" cy="412" r="5" fill="#f97316"/>

  <!-- Main text -->
  <text x="360" y="260" font-family="Arial, sans-serif" font-size="96" font-weight="900" fill="white" letter-spacing="-3">Zercy</text>

  <!-- Tagline -->
  <text x="362" y="330" font-family="Arial, sans-serif" font-size="32" font-weight="400" fill="#94a3b8">Your AI travel companion.</text>
  <text x="362" y="376" font-family="Arial, sans-serif" font-size="32" font-weight="400" fill="#94a3b8">Real flights. Real prices. No forms.</text>

  <!-- URL pill -->
  <rect x="362" y="430" width="180" height="44" rx="22" fill="#0ea5e9" opacity="0.2"/>
  <text x="452" y="458" font-family="Arial, sans-serif" font-size="22" font-weight="600" fill="#38bdf8" text-anchor="middle">zercy.app</text>

  <!-- Decorative dots -->
  <circle cx="1100" cy="100" r="4" fill="#4f46e5" opacity="0.6"/>
  <circle cx="1140" cy="140" r="3" fill="#0ea5e9" opacity="0.5"/>
  <circle cx="1060" cy="150" r="2.5" fill="#a78bfa" opacity="0.7"/>
  <circle cx="1120" cy="520" r="4" fill="#f97316" opacity="0.5"/>
  <circle cx="1160" cy="490" r="2.5" fill="#4f46e5" opacity="0.4"/>
</svg>`;

sharp(Buffer.from(svg))
  .resize(1200, 630)
  .png()
  .toFile(path.join(__dirname, 'public', 'og-image.png'))
  .then(() => console.log('✅ og-image.png generated'))
  .catch(err => { console.error('❌', err); process.exit(1); });
