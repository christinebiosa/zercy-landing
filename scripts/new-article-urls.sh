#!/bin/bash
# Zeigt Search-Console-Inspection-URLs für Artikel die kürzlich geändert wurden
# Usage: ./scripts/new-article-urls.sh [days]
#   days: optional, default 7

DAYS="${1:-7}"
REPO_DIR="$HOME/Claude Code Projects/zercy-landing"
SC_BASE="https://search.google.com/search-console/inspect?resource_id=sc-domain%3Azercy.app&id="

cd "$REPO_DIR"

echo "Artikel geändert in den letzten $DAYS Tagen:"
echo "============================================"
echo ""

# DE-Artikel
find src/content/blog -name "*.md" -newermt "$DAYS days ago" -type f 2>/dev/null | while read -r file; do
  slug=$(basename "$file" .md)
  url="https://www.zercy.app/blog/$slug"
  encoded=$(python3 -c "import urllib.parse; print(urllib.parse.quote('$url', safe=''))")
  echo "  📝 $url"
  echo "     SC: ${SC_BASE}${encoded}"
  echo ""
done

# EN-Artikel
find src/content/blogen -name "*.md" -newermt "$DAYS days ago" -type f 2>/dev/null | while read -r file; do
  slug=$(basename "$file" .md)
  url="https://www.zercy.app/en/blog/$slug"
  encoded=$(python3 -c "import urllib.parse; print(urllib.parse.quote('$url', safe=''))")
  echo "  📝 $url"
  echo "     SC: ${SC_BASE}${encoded}"
  echo ""
done

echo "============================================"
echo "Tipp: Klick einen SC-Link → Search Console öffnet die URL Inspection"
echo "      Dort dann auf 'Indexierung beantragen' klicken"
echo ""
echo "Quota: ~10 URLs pro Tag pro Property"
