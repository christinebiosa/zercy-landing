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
# Robust: aus jeder ✅-Zeile die nackte URL ziehen (Emoji-/Variation-Selector-sicher).
echo "$RESULT" | grep '✅' | grep -oE 'https://[^[:space:]]+' > "$OKFILE"
OK=$(grep -c . "$OKFILE" 2>/dev/null); OK=${OK:-0}

if [ "$OK" -gt 0 ]; then
  # grep -v gibt Exit 1, wenn ALLE Zeilen rausgefiltert werden (leere Ausgabe = Queue komplett geleert).
  # Darum NICHT an "&& mv" haengen, sonst bleibt die Queue bei voller Einreichung stehen.
  grep -vxF -f "$OKFILE" "$QUEUE" > "$QUEUE.tmp"
  GREP_EXIT=$?
  if [ "$GREP_EXIT" -le 1 ]; then mv "$QUEUE.tmp" "$QUEUE"; else rm -f "$QUEUE.tmp"; fi
  REMAIN=$(wc -l < "$QUEUE" | tr -d ' ')
  echo "$(date '+%Y-%m-%d %H:%M') — Eingereicht: $OK/$COUNT, $OK aus Queue entfernt. Verbleibend: $REMAIN" >> "$LOG"
else
  REMAIN=$(wc -l < "$QUEUE" | tr -d ' ')
  echo "$(date '+%Y-%m-%d %H:%M') — 0 eingereicht (node exit $NODE_EXIT). Queue UNVERÄNDERT (kein Datenverlust). Verbleibend: $REMAIN" >> "$LOG"
fi
rm -f "$OKFILE"

# macOS Notification
osascript -e "display alert \"Zercy Indexing\" message \"$OK URLs bei Google eingereicht. $REMAIN noch in der Queue.\"" 2>/dev/null || true
