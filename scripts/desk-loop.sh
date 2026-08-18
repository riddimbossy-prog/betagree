#!/bin/sh
# Refresh today's board and prepare tomorrow (crests included) so the
# next day never goes live with empty shields.
set -eu
cd "$(dirname "$0")/.."
node scripts/prepare-next-day.mjs >>/tmp/desk-scrape.log 2>&1 || true
while true; do
  sleep 1800
  node scripts/prepare-next-day.mjs >>/tmp/desk-scrape.log 2>&1 || true
done
