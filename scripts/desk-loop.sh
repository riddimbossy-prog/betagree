#!/bin/sh
# Form + streaks + odds. First pass now, then every 30 minutes so tomorrow is ready tonight.
set -eu
cd "$(dirname "$0")/.."
node scripts/scrape-desk.mjs >>/tmp/desk-scrape.log 2>&1 || true
node scripts/fetch-streaks.mjs >>/tmp/streaks-refresh.log 2>&1 || true
while true; do
  sleep 1800
  node scripts/scrape-desk.mjs >>/tmp/desk-scrape.log 2>&1 || true
done
