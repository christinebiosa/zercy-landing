#!/bin/bash
# Wöchentlicher Indexing-Report für zercy.app
# Wird automatisch von ~/Library/LaunchAgents/com.zercy.weekly-report.plist ausgeführt
# Manueller Run: ./scripts/weekly-report.sh

set -e

REPO_DIR="$HOME/Claude Code Projects/zercy-landing"
REPORT_DIR="$HOME/Desktop/zercy-indexing-reports"
DATE=$(date +%Y-%m-%d)
REPORT_FILE="$REPORT_DIR/$DATE.txt"

mkdir -p "$REPORT_DIR"
cd "$REPO_DIR"

echo "Starte Indexing-Check für zercy.app..." | tee "$REPORT_FILE"
echo "Datum: $(date)" >> "$REPORT_FILE"
echo "" >> "$REPORT_FILE"

python3 scripts/check-indexing.py >> "$REPORT_FILE" 2>&1

# Extrahiere Summary für Notification
SUMMARY=$(grep "SUMMARY:" "$REPORT_FILE" | tail -1 | sed 's/.*SUMMARY: //')

# macOS Notification
osascript -e "display notification \"$SUMMARY\" with title \"Zercy Indexing-Report bereit\" subtitle \"Auf dem Desktop\" sound name \"Glass\""

echo ""
echo "Report gespeichert: $REPORT_FILE"
echo "Summary: $SUMMARY"
