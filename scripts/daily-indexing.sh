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
echo "$RESULT" >> "$LOG"
rm -f "$TMPFILE"

# Erfolgreiche URLs aus Queue entfernen
OK=$(echo "$RESULT" | grep -c "✅")
echo "$(date '+%Y-%m-%d %H:%M') — Eingereicht: $OK/$COUNT. Verbleibend in Queue: $(( $(wc -l < "$QUEUE") - OK ))" >> "$LOG"

# Erste 200 Zeilen aus Queue löschen
tail -n +201 "$QUEUE" > "$QUEUE.tmp" && mv "$QUEUE.tmp" "$QUEUE"

# macOS Notification
osascript -e "display alert \"Zercy Indexing\" message \"$OK URLs bei Google eingereicht. $(wc -l < "$QUEUE" | tr -d ' ') noch in der Queue.\"" 2>/dev/null || true
