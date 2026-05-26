#!/usr/bin/env node
/**
 * Einmaliges Re-Auth-Script für Google Indexing API.
 * Fügt den `indexing` Scope zum gespeicherten Token hinzu.
 * Danach kann submit-indexing.mjs URLs bei Google einreichen.
 *
 * Ausführen: node scripts/reauth-indexing.mjs
 */

import { createServer } from 'http';
import { readFileSync, writeFileSync } from 'fs';
import { homedir } from 'os';
import { execSync } from 'child_process';

const TOKENS_FILE = `${homedir()}/.zercy-analytics/tokens.json`;
const tokens = JSON.parse(readFileSync(TOKENS_FILE, 'utf8'));

const CLIENT_ID = tokens.client_id;
const CLIENT_SECRET = tokens.client_secret;
const REDIRECT_URI = 'http://localhost:8888/callback';

const SCOPES = [
  'https://www.googleapis.com/auth/analytics.readonly',
  'https://www.googleapis.com/auth/webmasters.readonly',
  'https://www.googleapis.com/auth/indexing',
].join(' ');

const authUrl =
  `https://accounts.google.com/o/oauth2/v2/auth` +
  `?client_id=${CLIENT_ID}` +
  `&redirect_uri=${encodeURIComponent(REDIRECT_URI)}` +
  `&response_type=code` +
  `&scope=${encodeURIComponent(SCOPES)}` +
  `&access_type=offline` +
  `&prompt=consent`;

console.log('\n🔑 Starte Google Re-Autorisierung für Indexing API...\n');
console.log('Browser wird geöffnet. Klicke "Zulassen" / "Allow".\n');

// Browser öffnen
try {
  execSync(`open "${authUrl}"`);
} catch {
  console.log('Öffne diesen Link manuell im Browser:\n');
  console.log(authUrl);
}

// Lokalen Server starten um Callback abzufangen
const server = createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:8888`);
  const code = url.searchParams.get('code');

  if (!code) {
    res.end('Kein Code erhalten.');
    return;
  }

  res.end('<html><body><h2>✅ Autorisierung erfolgreich!</h2><p>Du kannst dieses Fenster schließen.</p></body></html>');

  // Code gegen Token tauschen
  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      redirect_uri: REDIRECT_URI,
      grant_type: 'authorization_code',
    }),
  });

  const tokenData = await tokenRes.json();

  if (tokenData.error) {
    console.error('\n❌ Token-Fehler:', tokenData.error, tokenData.error_description);
    server.close();
    return;
  }

  // Tokens speichern
  const newTokens = {
    client_id: CLIENT_ID,
    client_secret: CLIENT_SECRET,
    refresh_token: tokenData.refresh_token || tokens.refresh_token,
    access_token: tokenData.access_token,
  };

  writeFileSync(TOKENS_FILE, JSON.stringify(newTokens, null, 2));

  console.log('\n✅ Neuer Token gespeichert mit Indexing-Scope!');
  console.log('Du kannst jetzt `node scripts/submit-indexing.mjs` nutzen.\n');

  server.close();
});

server.listen(8888, () => {
  console.log('Warte auf Google-Callback auf Port 8888...');
});
