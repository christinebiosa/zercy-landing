#!/bin/bash
# Wöchentlicher Webmaster-Report für zercy.app
# Wird automatisch von ~/Library/LaunchAgents/com.zercy.weekly-report.plist ausgeführt
# Catch-up-Logik: triggert mehrmals pro Woche, läuft aber nur 1x dank Lock-Datei
# Manueller Run: ./scripts/weekly-report.sh
# Force-Run (ignore lock): ./scripts/weekly-report.sh --force

REPO_DIR="$HOME/Claude Code Projects/zercy-landing"
REPORT_DIR="$HOME/.zercy-analytics"
LOCK_FILE="$REPORT_DIR/.weekly-report-last-run"
MIN_DAYS_BETWEEN_RUNS=5
DATE=$(date +%Y-%m-%d)
LOG="$REPORT_DIR/webmaster.log"
NODE=$(which node)

mkdir -p "$REPORT_DIR"

# Catch-up-Logik: skip wenn letzter Run weniger als 5 Tage her (außer --force)
if [[ "$1" != "--force" ]] && [[ -f "$LOCK_FILE" ]]; then
  LAST_RUN=$(cat "$LOCK_FILE")
  NOW=$(date +%s)
  DIFF_DAYS=$(( (NOW - LAST_RUN) / 86400 ))
  if [[ $DIFF_DAYS -lt $MIN_DAYS_BETWEEN_RUNS ]]; then
    echo "$(date '+%Y-%m-%d %H:%M') — Letzter Report vor $DIFF_DAYS Tagen, skip." >> "$LOG"
    exit 0
  fi
fi

cd "$REPO_DIR" || exit 1

echo "$(date '+%Y-%m-%d %H:%M') — Starte Webmaster-Report..." >> "$LOG"
RESULT=$($NODE "$REPO_DIR/scripts/webmaster-report.mjs" 2>&1)
echo "$RESULT" >> "$LOG"

# Lock-Datei updaten
date +%s > "$LOCK_FILE"

# Extrahiere Impressionen-Zeile für Notification
SUMMARY=$(echo "$RESULT" | grep "Impressionen:" | head -1)
osascript -e "display notification \"$SUMMARY\" with title \"Zercy Webmaster-Report\" sound name \"Glass\"" 2>/dev/null || true

echo "$(date '+%Y-%m-%d %H:%M') — Report fertig." >> "$LOG"
