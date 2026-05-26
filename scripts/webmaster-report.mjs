#!/usr/bin/env node
/**
 * Zercy Webmaster — Wöchentlicher GSC-Report
 * Findet automatisch: Quick Wins, CTR-Probleme, Ranking-Veränderungen, neue Chancen
 *
 * Ausführen: node scripts/webmaster-report.mjs
 * Output: Konsole + speichert Ergebnis in /tmp/zercy-webmaster-report.json
 */

import { readFileSync, writeFileSync } from 'fs';
import { homedir } from 'os';

const TOKENS_FILE = `${homedir()}/.zercy-analytics/tokens.json`;
const SITE = 'sc-domain:zercy.app';

async function getToken() {
  const t = JSON.parse(readFileSync(TOKENS_FILE, 'utf8'));
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: t.client_id, client_secret: t.client_secret,
      refresh_token: t.refresh_token, grant_type: 'refresh_token',
    }),
  });
  const d = await res.json();
  if (d.error) throw new Error(d.error_description);
  t.access_token = d.access_token;
  writeFileSync(TOKENS_FILE, JSON.stringify(t, null, 2));
  return d.access_token;
}

function dateStr(daysAgo) {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return d.toISOString().split('T')[0];
}

async function queryGSC(token, body) {
  const res = await fetch(
    `https://searchconsole.googleapis.com/webmasters/v3/sites/${encodeURIComponent(SITE)}/searchAnalytics/query`,
    { method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify(body) }
  );
  const d = await res.json();
  if (d.error) throw new Error(JSON.stringify(d.error));
  return d.rows || [];
}

async function main() {
  console.log('\n🔍 Zercy Webmaster Report wird erstellt...\n');
  const token = await getToken();

  // Letzte 7 Tage vs. vorherige 7 Tage
  const [t1Start, t1End] = [dateStr(10), dateStr(4)];   // aktuelle Woche (mit Verzögerung)
  const [t2Start, t2End] = [dateStr(17), dateStr(11)];  // Vorwoche

  const [curQueries, prevQueries, curPages] = await Promise.all([
    queryGSC(token, { startDate: t1Start, endDate: t1End, dimensions: ['query'], rowLimit: 500 }),
    queryGSC(token, { startDate: t2Start, endDate: t2End, dimensions: ['query'], rowLimit: 500 }),
    queryGSC(token, { startDate: t1Start, endDate: t1End, dimensions: ['page'], rowLimit: 100,
      orderBy: [{ fieldName: 'impressions', sortOrder: 'descending' }] }),
  ]);

  // Map für Vorwoche
  const prevMap = {};
  for (const r of prevQueries) prevMap[r.keys[0]] = r;

  // Gewinner (Position verbessert ≥3 Plätze)
  const winners = curQueries
    .filter(r => prevMap[r.keys[0]] && prevMap[r.keys[0]].position - r.position >= 3 && r.impressions >= 3)
    .sort((a, b) => (prevMap[b.keys[0]].position - b.position) - (prevMap[a.keys[0]].position - a.position))
    .slice(0, 8);

  // Verlierer (Position verschlechtert ≥3 Plätze)
  const losers = curQueries
    .filter(r => prevMap[r.keys[0]] && r.position - prevMap[r.keys[0]].position >= 3 && r.impressions >= 3)
    .sort((a, b) => (b.position - prevMap[b.keys[0]].position) - (a.position - prevMap[a.keys[0]].position))
    .slice(0, 8);

  // Neue Queries (nicht in Vorwoche)
  const newQueries = curQueries
    .filter(r => !prevMap[r.keys[0]] && r.impressions >= 3)
    .sort((a, b) => b.impressions - a.impressions)
    .slice(0, 10);

  // Quick Wins: Pos 11-20, ≥5 Impressionen
  const quickWins = curQueries
    .filter(r => r.position > 10 && r.position <= 20 && r.impressions >= 5)
    .sort((a, b) => a.position - b.position)
    .slice(0, 10);

  // CTR-Problem: Pos ≤15, CTR <3%, ≥5 Impressionen
  const ctrProblems = curQueries
    .filter(r => r.position <= 15 && r.ctr < 0.03 && r.impressions >= 5)
    .sort((a, b) => b.impressions - a.impressions)
    .slice(0, 10);

  // Gesamtzahlen
  const totalImpr = curQueries.reduce((s, r) => s + r.impressions, 0);
  const totalClicks = curQueries.reduce((s, r) => s + r.clicks, 0);
  const prevTotalImpr = prevQueries.reduce((s, r) => s + r.impressions, 0);
  const prevTotalClicks = prevQueries.reduce((s, r) => s + r.clicks, 0);

  // Output
  const sep = '─'.repeat(60);
  console.log(`${sep}`);
  console.log(`ZERCY WEBMASTER REPORT — ${t1Start} bis ${t1End}`);
  console.log(`${sep}`);
  console.log(`Impressionen: ${totalImpr} (${totalImpr >= prevTotalImpr ? '+' : ''}${totalImpr - prevTotalImpr} vs. Vorwoche)`);
  console.log(`Klicks:       ${totalClicks} (${totalClicks >= prevTotalClicks ? '+' : ''}${totalClicks - prevTotalClicks} vs. Vorwoche)`);
  console.log(`Queries total: ${curQueries.length}`);

  if (quickWins.length) {
    console.log(`\n🎯 QUICK WINS (Pos 11-20 — kleiner Push bringt Seite 1):`);
    for (const r of quickWins) {
      const diff = prevMap[r.keys[0]] ? ` (war ${prevMap[r.keys[0]].position.toFixed(1)})` : '';
      console.log(`  Pos ${r.position.toFixed(1)}${diff} | ${r.impressions} imp | CTR ${(r.ctr*100).toFixed(0)}% | "${r.keys[0]}"`);
    }
  }

  if (ctrProblems.length) {
    console.log(`\n⚠️  CTR-PROBLEME (gute Position, kaum Klicks — Titel/Desc optimieren):`);
    for (const r of ctrProblems) {
      console.log(`  Pos ${r.position.toFixed(1)} | ${r.impressions} imp | CTR ${(r.ctr*100).toFixed(1)}% | "${r.keys[0]}"`);
    }
  }

  if (winners.length) {
    console.log(`\n📈 GEWINNER diese Woche:`);
    for (const r of winners) {
      const prev = prevMap[r.keys[0]].position.toFixed(1);
      console.log(`  ${prev} → ${r.position.toFixed(1)} (+${(prevMap[r.keys[0]].position - r.position).toFixed(1)}) | "${r.keys[0]}"`);
    }
  }

  if (losers.length) {
    console.log(`\n📉 VERLIERER diese Woche:`);
    for (const r of losers) {
      const prev = prevMap[r.keys[0]].position.toFixed(1);
      console.log(`  ${prev} → ${r.position.toFixed(1)} (-${(r.position - prevMap[r.keys[0]].position).toFixed(1)}) | "${r.keys[0]}"`);
    }
  }

  if (newQueries.length) {
    console.log(`\n🆕 NEUE QUERIES (diese Woche erstmals sichtbar):`);
    for (const r of newQueries) {
      console.log(`  Pos ${r.position.toFixed(1)} | ${r.impressions} imp | "${r.keys[0]}"`);
    }
  }

  console.log(`\n📄 TOP SEITEN nach Impressionen:`);
  for (const r of curPages.slice(0, 8)) {
    const page = r.keys[0].replace('https://www.zercy.app', '');
    console.log(`  ${r.impressions} imp | ${r.clicks} clicks | CTR ${(r.ctr*100).toFixed(1)}% | Pos ${r.position.toFixed(1)} | ${page}`);
  }

  console.log(`\n${sep}\n`);

  // JSON für Claude speichern
  const report = { generatedAt: new Date().toISOString(), period: { from: t1Start, to: t1End },
    totals: { impressions: totalImpr, clicks: totalClicks },
    quickWins, ctrProblems, winners, losers, newQueries, topPages: curPages.slice(0, 20) };
  writeFileSync('/tmp/zercy-webmaster-report.json', JSON.stringify(report, null, 2));
  console.log('Report gespeichert: /tmp/zercy-webmaster-report.json\n');
}

main().catch(console.error);
