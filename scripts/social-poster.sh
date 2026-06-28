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
  # geposteten Slug entfernen. grep -v gibt Exit 1, wenn die Queue dadurch leer wird
  # (nicht an && mv haengen, sonst bleibt ein erfolgreich geposteter letzter Eintrag stehen).
  grep -vxF "$CITY" "$QUEUE" > "$QUEUE.tmp"; GE=$?
  if [ "$GE" -le 1 ]; then mv "$QUEUE.tmp" "$QUEUE"; else rm -f "$QUEUE.tmp"; fi
  REMAIN=$(grep -c . "$QUEUE" 2>/dev/null); REMAIN=${REMAIN:-0}
  echo "$(date '+%Y-%m-%d %H:%M') — ✅ $CITY live (IG+FB). Verbleibend: $REMAIN" >> "$LOG"
  osascript -e "display alert \"Zercy Social\" message \"$CITY ist live auf Instagram + Facebook. Noch $REMAIN Staedte in der Queue.\"" 2>/dev/null || true
else
  # WICHTIG: fehlgeschlagenes Item ans ENDE der Queue schieben, NICHT oben lassen.
  # Sonst blockiert ein einziges kaputtes Item dauerhaft alle nachfolgenden Posts.
  grep -vxF "$CITY" "$QUEUE" > "$QUEUE.tmp"; echo "$CITY" >> "$QUEUE.tmp"; mv "$QUEUE.tmp" "$QUEUE"
  REMAIN=$(grep -c . "$QUEUE" 2>/dev/null); REMAIN=${REMAIN:-0}
  echo "$(date '+%Y-%m-%d %H:%M') — ❌ $CITY fehlgeschlagen (exit $EXIT). Ans Queue-Ende verschoben (nicht blockierend). Verbleibend: $REMAIN" >> "$LOG"
  osascript -e "display alert \"Zercy Social\" message \"$CITY fehlgeschlagen, ans Queue-Ende verschoben. Naechster Lauf nimmt das naechste Item. Log: ~/.zercy-analytics/social-poster.log\"" 2>/dev/null || true
fi
