#!/bin/sh
set -eu
cd /workspace
if [ -f scripts/ensure-crests.mjs ]; then
  node scripts/ensure-crests.mjs >>/tmp/crests.log 2>&1 &
fi
if ! grep -q watch-push-betagree /proc/*/cmdline 2>/dev/null; then
  if [ -f scripts/watch-push-betagree.sh ]; then
    sh scripts/watch-push-betagree.sh >>/tmp/betagree-push.log 2>&1 &
  fi
fi
if [ -f scripts/score-loop.mjs ] && ! grep -q score-loop /proc/*/cmdline 2>/dev/null; then
  node scripts/score-loop.mjs >>/tmp/score-loop.log 2>&1 &
fi
if curl -sf -o /dev/null --max-time 2 http://127.0.0.1:8080/; then
  exit 0
fi
npm run dev >>/tmp/app-startup.log 2>&1 &
