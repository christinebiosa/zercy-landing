#!/bin/bash
# Wrapper für vollständigen Zercy-Deploy:
# 1. Build
# 2. Deploy auf Vercel Production
# 3. Git commit + push (falls uncommitted changes)
# 4. Zeigt Search-Console-Inspection-URLs für neue Artikel
#
# Usage: ./scripts/deploy.sh ["Commit-Message"]

set -e

REPO_DIR="$HOME/Claude Code Projects/zercy-landing"
cd "$REPO_DIR"

COMMIT_MSG="${1:-Deploy update}"

echo "==========================================="
echo "Zercy Deploy startet..."
echo "==========================================="
echo ""

# 1. Build
echo "→ Astro build..."
npx astro build 2>&1 | tail -3

echo ""

# 2. Deploy
echo "→ Vercel deploy production..."
DEPLOY_OUTPUT=$(npx vercel --prod --force 2>&1 | tail -5)
echo "$DEPLOY_OUTPUT"

echo ""

# 3. Git commit + push (nur wenn es Änderungen gibt)
if [[ -n $(git status --porcelain) ]]; then
  echo "→ Uncommitted changes gefunden, committe + pushe..."
  git add -A
  git commit -m "$COMMIT_MSG"
  git push
  echo "  ✓ Pushed to GitHub"
else
  echo "→ Keine Git-Änderungen, skip commit"
fi

echo ""
echo "==========================================="
echo "✓ Deploy fertig!"
echo "==========================================="
echo ""

# 4. Zeige neue Artikel-URLs
./scripts/new-article-urls.sh 1
