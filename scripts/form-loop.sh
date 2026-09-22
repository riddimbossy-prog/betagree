#!/bin/sh
# Rebuild form + board links a few times a day.
set -eu
cd "$(dirname "$0")/.."
while true; do
  sleep 7200
  node scripts/refresh-form.mjs >>/tmp/form-refresh.log 2>&1 || true
  node scripts/refresh-trends.mjs >>/tmp/trends-refresh.log 2>&1 || true
  node scripts/refresh-odds.mjs >>/tmp/odds-refresh.log 2>&1 || true
done
