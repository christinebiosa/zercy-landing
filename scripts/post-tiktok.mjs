#!/usr/bin/env node
// scripts/post-tiktok.mjs
// Zercy TikTok Content Posting API - Poster + OAuth-Helfer.
// Creds + Tokens in ~/.zercy-analytics/tiktok-api.json (LOKAL, nie Git).
//
// Nutzung:
//   node scripts/post-tiktok.mjs --auth                 -> OAuth-Authorize-URL ausgeben (Browser, "Erlauben")
//   node scripts/post-tiktok.mjs --exchange "<url|code>" -> zurueckgeleitete URL ODER code eintauschen -> Tokens speichern
//   node scripts/post-tiktok.mjs --whoami               -> Token pruefen (creator_info)
//   node scripts/post-tiktok.mjs <slug>                 -> Slideshow als ENTWURF in TikTok-Postfach (video.upload)
//   node scripts/post-tiktok.mjs <slug> --direct        -> direkt oeffentlich posten (braucht Audit + video.publish)
//
// Video-Quelle: public/social/<slug>/slideshow-facebook.mp4 (FILE_UPLOAD, keine Domain-Verifizierung noetig).

import fs from 'fs';
import path from 'path';
import os from 'os';

const CFG_PATH = path.join(os.homedir(), '.zercy-analytics', 'tiktok-api.json');
const BASE = path.resolve('/Users/christinebork/Claude Code Projects/zercy-landing');
const API = 'https://open.tiktokapis.com/v2';

function loadCfg() { return JSON.parse(fs.readFileSync(CFG_PATH, 'utf8')); }
function saveCfg(c) { fs.writeFileSync(CFG_PATH, JSON.stringify(c, null, 2) + '\n'); }
function creds(c) { const e = c.active_env || 'sandbox'; return { ...c[e], env: e }; }

async function api(pathname, token, body) {
  const res = await fetch(`${API}${pathname}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json; charset=UTF-8' },
    body: JSON.stringify(body || {}),
  });
  const json = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, json };
}

// ── OAuth ────────────────────────────────────────────────────────────────────
function authUrl(c) {
  const { client_key } = creds(c);
  const p = new URLSearchParams({
    client_key,
    scope: c.scopes || 'user.info.basic,video.upload',
    response_type: 'code',
    redirect_uri: c.redirect_uri,
    state: 'zercy' + Math.floor(1000 + 8999 * 0.5), // statisch genug fuer manuellen Flow
  });
  return `https://www.tiktok.com/v2/auth/authorize/?${p.toString()}`;
}

function extractCode(input) {
  // akzeptiert kompletten Redirect-URL ODER nackten code
  if (input.includes('code=')) {
    const m = input.match(/[?&]code=([^&]+)/);
    if (m) return decodeURIComponent(m[1].replace(/#.*$/, ''));
  }
  return input.trim();
}

async function exchange(c, codeOrUrl) {
  const { client_key, client_secret } = creds(c);
  const code = extractCode(codeOrUrl);
  const res = await fetch(`${API}/oauth/token/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_key, client_secret, code,
      grant_type: 'authorization_code',
      redirect_uri: c.redirect_uri,
    }),
  });
  const j = await res.json();
  if (!j.access_token) throw new Error('Token-Tausch fehlgeschlagen: ' + JSON.stringify(j));
  c.access_token = j.access_token;
  c.refresh_token = j.refresh_token;
  c.open_id = j.open_id;
  c.token_expires_at = Math.floor(Date.now() / 1000) + (j.expires_in || 86400) - 120;
  saveCfg(c);
  return j;
}

async function refresh(c) {
  const { client_key, client_secret } = creds(c);
  const res = await fetch(`${API}/oauth/token/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_key, client_secret,
      grant_type: 'refresh_token',
      refresh_token: c.refresh_token,
    }),
  });
  const j = await res.json();
  if (!j.access_token) throw new Error('Token-Refresh fehlgeschlagen: ' + JSON.stringify(j));
  c.access_token = j.access_token;
  c.refresh_token = j.refresh_token || c.refresh_token;
  c.token_expires_at = Math.floor(Date.now() / 1000) + (j.expires_in || 86400) - 120;
  saveCfg(c);
  return j;
}

async function validToken(c) {
  if (!c.access_token) throw new Error('Kein Token. Erst: node scripts/post-tiktok.mjs --auth  (dann --exchange)');
  if ((c.token_expires_at || 0) < Math.floor(Date.now() / 1000)) { console.log('  ↻ Token abgelaufen, refresh...'); await refresh(c); }
  return c.access_token;
}

// ── Posten ───────────────────────────────────────────────────────────────────
function videoPath(slug) {
  for (const p of [`public/social/${slug}/slideshow-facebook.mp4`, `social-output/${slug}/slideshow-facebook.mp4`]) {
    const abs = path.join(BASE, p);
    if (fs.existsSync(abs)) return abs;
  }
  throw new Error(`Kein Video fuer "${slug}" (public/social/${slug}/slideshow-facebook.mp4)`);
}
function caption(slug) {
  const p = path.join(BASE, `social-output/${slug}/caption.txt`);
  return fs.existsSync(p) ? fs.readFileSync(p, 'utf8').trim() : '';
}

async function uploadBytes(uploadUrl, buf) {
  const res = await fetch(uploadUrl, {
    method: 'PUT',
    headers: {
      'Content-Type': 'video/mp4',
      'Content-Length': String(buf.length),
      'Content-Range': `bytes 0-${buf.length - 1}/${buf.length}`,
    },
    body: buf,
  });
  if (!res.ok) throw new Error(`Byte-Upload fehlgeschlagen: ${res.status} ${await res.text().catch(() => '')}`);
}

async function pollStatus(token, publishId) {
  for (let i = 0; i < 20; i++) {
    await new Promise((r) => setTimeout(r, 4000));
    const { json } = await api('/post/publish/status/fetch/', token, { publish_id: publishId });
    const st = json?.data?.status;
    if (st) console.log(`  …status: ${st}`);
    if (st === 'SEND_TO_USER_INBOX' || st === 'PUBLISH_COMPLETE') return st;
    if (st === 'FAILED') throw new Error('Verarbeitung FAILED: ' + JSON.stringify(json?.data));
  }
  return 'TIMEOUT';
}

async function post(c, slug, direct) {
  const token = await validToken(c);
  const buf = fs.readFileSync(videoPath(slug));
  const title = caption(slug).slice(0, 2200) || `Zercy: ${slug}`;
  const source_info = { source: 'FILE_UPLOAD', video_size: buf.length, chunk_size: buf.length, total_chunk_count: 1 };

  if (direct) {
    // Direkt oeffentlich -> braucht Audit + video.publish. privacy_level aus creator_info.
    const ci = await api('/post/publish/creator_info/query/', token, {});
    const opts = ci.json?.data?.privacy_level_options || [];
    const privacy = opts.includes('PUBLIC_TO_EVERYONE') ? 'PUBLIC_TO_EVERYONE' : (opts[0] || 'SELF_ONLY');
    console.log(`  🎬 Direct Post (privacy: ${privacy})...`);
    const init = await api('/post/publish/video/init/', token, {
      post_info: { title, privacy_level: privacy, disable_comment: false },
      source_info,
    });
    if (!init.json?.data?.publish_id) throw new Error('init fehlgeschlagen: ' + JSON.stringify(init.json));
    await uploadBytes(init.json.data.upload_url, buf);
    const st = await pollStatus(token, init.json.data.publish_id);
    console.log(`  ✅ Direct Post fertig (${st})`);
    return;
  }

  // Entwurf ins Postfach (video.upload) -> User tippt in der App "posten".
  console.log('  📥 Upload als Entwurf ins TikTok-Postfach...');
  const init = await api('/post/publish/inbox/video/init/', token, { source_info });
  if (!init.json?.data?.publish_id) throw new Error('inbox/init fehlgeschlagen: ' + JSON.stringify(init.json));
  await uploadBytes(init.json.data.upload_url, buf);
  const st = await pollStatus(token, init.json.data.publish_id);
  console.log(`  ✅ Entwurf im Postfach (${st}) - in der TikTok-App "Inbox" oeffnen, Sound + posten.`);
}

// ── CLI ──────────────────────────────────────────────────────────────────────
const args = process.argv.slice(2);
const c = loadCfg();
(async () => {
  if (args[0] === '--auth') {
    console.log('\n🔑 Oeffne diese URL im Browser (als @zercytravel), klick "Authorize/Erlauben":\n');
    console.log(authUrl(c));
    console.log('\nDanach landest du auf zercy.app mit ?code=... in der Adresszeile.');
    console.log('Die KOMPLETTE URL kopieren und an mich geben (oder: node scripts/post-tiktok.mjs --exchange "<url>")\n');
  } else if (args[0] === '--exchange') {
    const j = await exchange(c, args[1] || '');
    console.log('✅ Tokens gespeichert. open_id:', j.open_id, '| laeuft ab in', j.expires_in, 's (auto-refresh aktiv).');
  } else if (args[0] === '--whoami') {
    const token = await validToken(c);
    const ci = await api('/post/publish/creator_info/query/', token, {});
    console.log(JSON.stringify(ci.json, null, 2));
  } else if (args[0] && !args[0].startsWith('--')) {
    await post(c, args[0], args.includes('--direct'));
  } else {
    console.log('Usage: --auth | --exchange "<url>" | --whoami | <slug> [--direct]');
  }
})().catch((e) => { console.error('❌', e.message); process.exit(1); });
