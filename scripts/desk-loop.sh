#!/bin/sh
# Live refresh every 30 minutes. Full next-day prep (board + crests)
# on the first pass and again after 20:00 UTC so tomorrow is ready tonight.
set -eu
cd "$(dirname "$0")/.."

prep() {
  hour=$(date -u +%H)
  if [ "$hour" -ge 20 ] || [ "${1:-}" = "force" ]; then
    node scripts/prepare-next-day.mjs >>/tmp/prepare-next-day.log 2>&1 || true
  else
    node scripts/refresh-board.mjs >>/tmp/desk-scrape.log 2>&1 || true
    node scripts/fetch-streaks.mjs >>/tmp/streaks-refresh.log 2>&1 || true
  fi
}

prep force
while true; do
  sleep 1800
  prep
done
