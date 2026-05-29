#!/bin/bash
# Zercy Daily Indexing — läuft automatisch via LaunchAgent
# Nimmt die ersten 200 URLs aus der Queue, reicht sie ein, entfernt sie aus der Queue

REPO="$HOME/Claude Code Projects/zercy-landing"
QUEUE="$REPO/scripts/indexing-queue.txt"
LOG="$HOME/.zercy-analytics/indexing.log"
NODE=/opt/homebrew/bin/node

cd "$REPO" || exit 1

# Queue leer?
if [ ! -f "$QUEUE" ] || [ ! -s "$QUEUE" ]; then
  echo "$(date '+%Y-%m-%d %H:%M') — Queue leer, nichts zu tun." >> "$LOG"
  exit 0
fi

# Erste 200 URLs in Temp-Datei schreiben
TMPFILE=$(mktemp /tmp/zercy-indexing-XXXX.txt)
head -200 "$QUEUE" > "$TMPFILE"
COUNT=$(wc -l < "$TMPFILE" | tr -d ' ')

echo "$(date '+%Y-%m-%d %H:%M') — Starte Einreichung: $COUNT URLs" >> "$LOG"

# Einreichen via --file
RESULT=$($NODE "$REPO/scripts/submit-indexing.mjs" --file "$TMPFILE" 2>&1)
NODE_EXIT=$?
echo "$RESULT" >> "$LOG"
rm -f "$TMPFILE"

# Nur die TATSÄCHLICH erfolgreich eingereichten URLs aus der Queue entfernen.
# Fehlgeschlagene bleiben in der Queue für den nächsten Lauf → kein Datenverlust.
OKFILE=$(mktemp /tmp/zercy-ok-XXXX.txt)
echo "$RESULT" | grep -E '^[[:space:]]+✅' | sed -E 's/^[[:space:]]+✅[[:space:]]+//' > "$OKFILE"
OK=$(grep -c . "$OKFILE" 2>/dev/null || echo 0)

if [ "$OK" -gt 0 ]; then
  grep -vxF -f "$OKFILE" "$QUEUE" > "$QUEUE.tmp" && mv "$QUEUE.tmp" "$QUEUE"
  REMAIN=$(wc -l < "$QUEUE" | tr -d ' ')
  echo "$(date '+%Y-%m-%d %H:%M') — Eingereicht: $OK/$COUNT, $OK aus Queue entfernt. Verbleibend: $REMAIN" >> "$LOG"
else
  REMAIN=$(wc -l < "$QUEUE" | tr -d ' ')
  echo "$(date '+%Y-%m-%d %H:%M') — 0 eingereicht (node exit $NODE_EXIT). Queue UNVERÄNDERT (kein Datenverlust). Verbleibend: $REMAIN" >> "$LOG"
fi
rm -f "$OKFILE"

# macOS Notification
osascript -e "display alert \"Zercy Indexing\" message \"$OK URLs bei Google eingereicht. $REMAIN noch in der Queue.\"" 2>/dev/null || true
