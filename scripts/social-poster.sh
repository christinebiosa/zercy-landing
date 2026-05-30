#!/bin/bash
# Zercy Social Poster — postet die naechste Stadt aus der Queue auf IG + FB.
# Laeuft via LaunchAgent 2x/Tag. Medien muessen vorher oeffentlich sein
# (prep-social-media.mjs + Deploy, oder social-pipeline.mjs).
# Bei Fehler bleibt die Stadt in der Queue -> naechster Lauf versucht erneut (kein Verlust).

REPO="$HOME/Claude Code Projects/zercy-landing"
QUEUE="$REPO/scripts/social-post-queue.txt"
LOG="$HOME/.zercy-analytics/social-poster.log"
NODE=/opt/homebrew/bin/node

cd "$REPO" || exit 1

if [ ! -f "$QUEUE" ] || [ ! -s "$QUEUE" ]; then
  echo "$(date '+%Y-%m-%d %H:%M') — Queue leer, nichts zu posten." >> "$LOG"
  exit 0
fi

CITY=$(grep -m1 . "$QUEUE" | tr -d '[:space:]')
[ -z "$CITY" ] && exit 0

echo "$(date '+%Y-%m-%d %H:%M') — Poste: $CITY" >> "$LOG"
RESULT=$($NODE "$REPO/scripts/post-social.mjs" "$CITY" 2>&1)
EXIT=$?
echo "$RESULT" >> "$LOG"

if [ $EXIT -eq 0 ]; then
  # geposteten Slug (erste nicht-leere Zeile) aus der Queue entfernen
  grep -vxF "$CITY" "$QUEUE" > "$QUEUE.tmp" && mv "$QUEUE.tmp" "$QUEUE"
  REMAIN=$(grep -c . "$QUEUE" 2>/dev/null || echo 0)
  echo "$(date '+%Y-%m-%d %H:%M') — ✅ $CITY live (IG+FB). Verbleibend: $REMAIN" >> "$LOG"
  osascript -e "display alert \"Zercy Social\" message \"$CITY ist live auf Instagram + Facebook. Noch $REMAIN Staedte in der Queue.\"" 2>/dev/null || true
else
  echo "$(date '+%Y-%m-%d %H:%M') — ❌ $CITY fehlgeschlagen (exit $EXIT). Bleibt in Queue." >> "$LOG"
  osascript -e "display alert \"Zercy Social\" message \"$CITY fehlgeschlagen, bleibt in der Queue. Log: ~/.zercy-analytics/social-poster.log\"" 2>/dev/null || true
fi
