#!/usr/bin/env python3
"""
zercy.app Indexing-Report
Liest die aktuelle Sitemap, prueft jede URL via Google URL Inspection API,
gibt einen sortierten Report aus.

Usage: python3 scripts/check-indexing.py [--quick]
  --quick: nur die 25 Top-Seiten aus Search Console (statt der ganzen Sitemap)

Voraussetzungen:
  - OAuth-Tokens in /Users/christinebork/.zercy-analytics/tokens.json
  - Search-Console-Property: sc-domain:zercy.app
"""

import json
import sys
import time
import urllib.request
import urllib.error
import xml.etree.ElementTree as ET
from datetime import date, timedelta

TOKENS_PATH = '/Users/christinebork/.zercy-analytics/tokens.json'
SITEMAP_URL = 'https://zercy.app/sitemap-index.xml'
SC_SITE = 'sc-domain:zercy.app'
QUICK = '--quick' in sys.argv


def get_access_token():
    with open(TOKENS_PATH) as f:
        t = json.load(f)
    data = json.dumps({
        'client_id': t['client_id'],
        'client_secret': t['client_secret'],
        'refresh_token': t['refresh_token'],
        'grant_type': 'refresh_token',
    }).encode()
    # OAuth wants form-urlencoded
    import urllib.parse
    data = urllib.parse.urlencode({
        'client_id': t['client_id'],
        'client_secret': t['client_secret'],
        'refresh_token': t['refresh_token'],
        'grant_type': 'refresh_token',
    }).encode()
    req = urllib.request.Request('https://oauth2.googleapis.com/token', data=data)
    return json.loads(urllib.request.urlopen(req).read())['access_token']


def fetch_sitemap_urls():
    """Liest sitemap-index.xml + alle Sub-Sitemaps -> Liste aller URLs."""
    ns = {'s': 'http://www.sitemaps.org/schemas/sitemap/0.9'}
    idx = ET.fromstring(urllib.request.urlopen(SITEMAP_URL).read())
    urls = []
    for sm in idx.findall('s:sitemap', ns):
        loc = sm.find('s:loc', ns).text
        sub = ET.fromstring(urllib.request.urlopen(loc).read())
        for u in sub.findall('s:url', ns):
            urls.append(u.find('s:loc', ns).text)
    return urls


def fetch_top_pages_from_sc(token, days=28, limit=25):
    end = date.today().isoformat()
    start = (date.today() - timedelta(days=days)).isoformat()
    body = {"startDate": start, "endDate": end, "dimensions": ["page"], "rowLimit": limit}
    req = urllib.request.Request(
        f'https://searchconsole.googleapis.com/webmasters/v3/sites/{urllib_quote(SC_SITE)}/searchAnalytics/query',
        data=json.dumps(body).encode(),
        headers={'Authorization': f'Bearer {token}', 'Content-Type': 'application/json'},
    )
    r = json.loads(urllib.request.urlopen(req).read())
    return [row['keys'][0] for row in r.get('rows', [])]


def urllib_quote(s):
    import urllib.parse
    return urllib.parse.quote(s, safe='')


def inspect(token, url):
    body = {"inspectionUrl": url, "siteUrl": SC_SITE}
    req = urllib.request.Request(
        'https://searchconsole.googleapis.com/v1/urlInspection/index:inspect',
        data=json.dumps(body).encode(),
        headers={'Authorization': f'Bearer {token}', 'Content-Type': 'application/json'},
    )
    try:
        r = json.loads(urllib.request.urlopen(req).read())
        return r.get('inspectionResult', {}).get('indexStatusResult', {})
    except urllib.error.HTTPError as e:
        return {'verdict': 'ERROR', 'coverageState': f'HTTP {e.code}'}
    except Exception as e:
        return {'verdict': 'ERROR', 'coverageState': str(e)[:50]}


def short(url):
    return url.replace('https://zercy.app', '').replace('https://www.zercy.app', '[www]') or '/'


def main():
    print('Hole Access Token...')
    token = get_access_token()

    if QUICK:
        print('Quick-Mode: Top-25-Seiten aus Search Console')
        urls = fetch_top_pages_from_sc(token)
    else:
        print(f'Lade Sitemap: {SITEMAP_URL}')
        urls = fetch_sitemap_urls()
        print(f'  {len(urls)} URLs gefunden')

    buckets = {
        'INDEXED': [],
        'CRAWLED_NOT_INDEXED': [],
        'DISCOVERED_NOT_INDEXED': [],
        'NEVER_CRAWLED': [],
        'ALTERNATE_CANONICAL': [],
        'REDIRECT': [],
        'OTHER': [],
        'ERROR': [],
    }

    print(f'\nPruefe {len(urls)} URLs (mit ~1 req/sek wegen Quota)...\n')
    for i, url in enumerate(urls, 1):
        idx = inspect(token, url)
        verdict = idx.get('verdict', 'UNKNOWN')
        cov = idx.get('coverageState', '')
        last = idx.get('lastCrawlTime', '')[:10]
        line = f'  [{verdict:^7}] {short(url):55}  {cov[:55]}'
        if last:
            line += f'  ({last})'

        if verdict == 'PASS':
            buckets['INDEXED'].append(line)
        elif verdict == 'ERROR':
            buckets['ERROR'].append(line)
        elif 'alternate' in cov.lower() and 'canonical' in cov.lower():
            buckets['ALTERNATE_CANONICAL'].append(line)
        elif 'redirect' in cov.lower():
            buckets['REDIRECT'].append(line)
        elif 'crawled' in cov.lower() and 'not indexed' in cov.lower():
            buckets['CRAWLED_NOT_INDEXED'].append(line)
        elif 'discovered' in cov.lower() and 'not indexed' in cov.lower():
            buckets['DISCOVERED_NOT_INDEXED'].append(line)
        elif not last or 'unknown to google' in cov.lower():
            buckets['NEVER_CRAWLED'].append((line, url))
        else:
            buckets['OTHER'].append(line)

        if i % 10 == 0:
            print(f'  ... {i}/{len(urls)} geprueft')
        time.sleep(0.4)  # ~150 reqs/min, weit unter Quota

    print(f'\n{"="*80}')
    print(f'INDEXIERT ({len(buckets["INDEXED"])}/{len(urls)})')
    print(f'{"="*80}')

    if buckets['NEVER_CRAWLED']:
        print(f'\n{"="*80}')
        print(f'NIE GECRAWLT ({len(buckets["NEVER_CRAWLED"])}) <- HIER MANUELL "Indexierung anfordern" klicken')
        print(f'{"="*80}')
        for line, _ in buckets['NEVER_CRAWLED']:
            print(line)
        print('\nDirekt-Link Search Console URL Inspection:')
        for _, url in buckets['NEVER_CRAWLED']:
            print(f'  https://search.google.com/search-console/inspect?resource_id={urllib_quote(SC_SITE)}&id={urllib_quote(url)}')

    if buckets['CRAWLED_NOT_INDEXED']:
        print(f'\n{"="*80}')
        print(f'GECRAWLT, NICHT INDEXIERT ({len(buckets["CRAWLED_NOT_INDEXED"])}) <- Content-Qualitaet pruefen')
        print(f'{"="*80}')
        for l in buckets['CRAWLED_NOT_INDEXED']:
            print(l)

    if buckets['DISCOVERED_NOT_INDEXED']:
        print(f'\n{"="*80}')
        print(f'GEFUNDEN, ABER NIE GECRAWLT ({len(buckets["DISCOVERED_NOT_INDEXED"])})')
        print(f'{"="*80}')
        for l in buckets['DISCOVERED_NOT_INDEXED']:
            print(l)

    if buckets['ALTERNATE_CANONICAL']:
        print(f'\nAlternate-Canonical (kein Problem): {len(buckets["ALTERNATE_CANONICAL"])} URLs')
    if buckets['REDIRECT']:
        print(f'Redirects: {len(buckets["REDIRECT"])} URLs')
    if buckets['OTHER']:
        print(f'\nSonstige: {len(buckets["OTHER"])}')
        for l in buckets['OTHER']:
            print(l)
    if buckets['ERROR']:
        print(f'\nFehler: {len(buckets["ERROR"])}')
        for l in buckets['ERROR']:
            print(l)

    total = len(urls)
    indexed = len(buckets['INDEXED'])
    print(f'\n{"="*80}')
    print(f'SUMMARY: {indexed}/{total} indexiert ({indexed/total*100:.0f}%)')
    print(f'{"="*80}')


if __name__ == '__main__':
    main()
