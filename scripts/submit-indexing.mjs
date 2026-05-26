#!/usr/bin/env node
/**
 * Reicht URLs bei der Google Indexing API ein.
 * Entspricht dem manuellen "Request Indexing"-Button in der Search Console.
 *
 * Nutzung:
 *   node scripts/submit-indexing.mjs url1 url2 url3 ...
 *   node scripts/submit-indexing.mjs --file urls.txt   (eine URL pro Zeile)
 *
 * Voraussetzung: einmalig `node scripts/reauth-indexing.mjs` ausgeführt haben.
 */

import { readFileSync, writeFileSync } from 'fs';
import { homedir } from 'os';

const TOKENS_FILE = `${homedir()}/.zercy-analytics/tokens.json`;

async function getAccessToken() {
  const tokens = JSON.parse(readFileSync(TOKENS_FILE, 'utf8'));

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: tokens.client_id,
      client_secret: tokens.client_secret,
      refresh_token: tokens.refresh_token,
      grant_type: 'refresh_token',
    }),
  });

  const data = await res.json();

  if (data.error) {
    throw new Error(`Token-Fehler: ${data.error} — ${data.error_description}`);
  }

  // Access Token aktualisieren
  tokens.access_token = data.access_token;
  writeFileSync(TOKENS_FILE, JSON.stringify(tokens, null, 2));

  return data.access_token;
}

async function submitUrl(accessToken, url) {
  const res = await fetch(
    'https://indexing.googleapis.com/v3/urlNotifications:publish',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ url, type: 'URL_UPDATED' }),
    }
  );

  const data = await res.json();
  return { status: res.status, data };
}

async function main() {
  const args = process.argv.slice(2);

  let urls = [];

  if (args[0] === '--file' && args[1]) {
    urls = readFileSync(args[1], 'utf8')
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l.startsWith('http'));
  } else {
    urls = args.filter((a) => a.startsWith('http'));
  }

  if (urls.length === 0) {
    console.log('Nutzung: node scripts/submit-indexing.mjs https://... https://...');
    process.exit(1);
  }

  console.log(`\n📤 Reiche ${urls.length} URL(s) bei Google ein...\n`);

  let accessToken;
  try {
    accessToken = await getAccessToken();
  } catch (err) {
    console.error('❌', err.message);
    console.error('→ Zuerst: node scripts/reauth-indexing.mjs');
    process.exit(1);
  }

  let ok = 0;
  let fail = 0;

  for (const url of urls) {
    try {
      const { status, data } = await submitUrl(accessToken, url);

      if (status === 200) {
        console.log(`  ✅ ${url}`);
        ok++;
      } else {
        const reason = data.error?.message || JSON.stringify(data);
        console.log(`  ❌ ${url}`);
        console.log(`     → ${status}: ${reason}`);
        fail++;
      }
    } catch (err) {
      console.log(`  ❌ ${url} — ${err.message}`);
      fail++;
    }

    // kurze Pause zwischen Requests
    if (urls.length > 1) await new Promise((r) => setTimeout(r, 300));
  }

  console.log(`\n✅ ${ok} eingereicht, ❌ ${fail} fehlgeschlagen\n`);
}

main();
