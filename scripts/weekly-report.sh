#!/bin/bash
# Wöchentlicher Indexing-Report für zercy.app
# Wird automatisch von ~/Library/LaunchAgents/com.zercy.weekly-report.plist ausgeführt
# Catch-up-Logik: triggert mehrmals pro Woche, läuft aber nur 1x dank Lock-Datei
# Manueller Run: ./scripts/weekly-report.sh
# Force-Run (ignore lock): ./scripts/weekly-report.sh --force

set -e

REPO_DIR="$HOME/Claude Code Projects/zercy-landing"
REPORT_DIR="$HOME/Desktop/zercy-indexing-reports"
LOCK_FILE="$REPORT_DIR/.last-run"
MIN_DAYS_BETWEEN_RUNS=5
DATE=$(date +%Y-%m-%d)
REPORT_FILE="$REPORT_DIR/$DATE.txt"

mkdir -p "$REPORT_DIR"

# Catch-up-Logik: skip wenn letzter Run weniger als 5 Tage her (außer --force)
if [[ "$1" != "--force" ]] && [[ -f "$LOCK_FILE" ]]; then
  LAST_RUN=$(cat "$LOCK_FILE")
  NOW=$(date +%s)
  DIFF_DAYS=$(( (NOW - LAST_RUN) / 86400 ))
  if [[ $DIFF_DAYS -lt $MIN_DAYS_BETWEEN_RUNS ]]; then
    echo "Letzter Report vor $DIFF_DAYS Tagen, skip (Mindestabstand: $MIN_DAYS_BETWEEN_RUNS Tage)."
    exit 0
  fi
fi

cd "$REPO_DIR"

echo "Starte Indexing-Check für zercy.app..." | tee "$REPORT_FILE"
echo "Datum: $(date)" >> "$REPORT_FILE"
echo "" >> "$REPORT_FILE"

python3 scripts/check-indexing.py >> "$REPORT_FILE" 2>&1

# Lock-Datei updaten (Timestamp des erfolgreichen Runs)
date +%s > "$LOCK_FILE"

# Extrahiere Summary für Notification
SUMMARY=$(grep "SUMMARY:" "$REPORT_FILE" | tail -1 | sed 's/.*SUMMARY: //')

# macOS Notification
osascript -e "display notification \"$SUMMARY\" with title \"Zercy Indexing-Report bereit\" subtitle \"Auf dem Desktop\" sound name \"Glass\""

echo ""
echo "Report gespeichert: $REPORT_FILE"
echo "Summary: $SUMMARY"
