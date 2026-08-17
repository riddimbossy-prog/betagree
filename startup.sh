#!/bin/sh
set -eu
cd /workspace
if ! pgrep -f "scripts/score-loop.mjs" >/dev/null 2>&1; then
  node scripts/score-loop.mjs >>/tmp/score-loop.log 2>&1 &
fi
if ! pgrep -f "scripts/fetch-streaks.mjs" >/dev/null 2>&1; then
  if [ ! -f public/data/streaks.json ] || [ "$(($(date +%s) - $(stat -c %Y public/data/streaks.json)))" -gt 1800 ]; then
    node scripts/fetch-streaks.mjs >>/tmp/streaks.log 2>&1 &
  fi
fi
if ! grep -q watch-push-betagree /proc/*/cmdline 2>/dev/null; then
  sh scripts/watch-push-betagree.sh >>/tmp/betagree-push.log 2>&1 &
fi
if curl -sf -o /dev/null --max-time 2 http://127.0.0.1:8080/; then
  exit 0
fi
npm run dev >>/tmp/app-startup.log 2>&1 &
