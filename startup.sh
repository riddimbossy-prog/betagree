#!/bin/sh
set -eu
cd /workspace
if [ -f scripts/ensure-crests.mjs ]; then
  node scripts/ensure-crests.mjs >>/tmp/crests.log 2>&1 &
fi
if [ -f scripts/prepare-next-day.mjs ]; then
  node scripts/prepare-next-day.mjs >>/tmp/prepare-next-day.log 2>&1 &
fi
if ! grep -q watch-push-betagree /proc/*/cmdline 2>/dev/null; then
  if [ -f scripts/watch-push-betagree.sh ]; then
    sh scripts/watch-push-betagree.sh >>/tmp/betagree-push.log 2>&1 &
  fi
fi
if [ -f scripts/refresh-form.mjs ]; then
  form_date=$(node -e "try{console.log(require('./public/data/form.json').date||'')}catch(e){console.log('')}" 2>/dev/null || true)
  today=$(date -u +%F)
  if [ "$form_date" != "$today" ]; then
    node scripts/refresh-form.mjs >>/tmp/form-refresh.log 2>&1 &
  fi
fi
if [ -f scripts/desk-loop.sh ] && ! grep -q desk-loop /proc/*/cmdline 2>/dev/null; then
  sh scripts/desk-loop.sh >>/tmp/desk-loop.log 2>&1 &
elif [ -f scripts/form-loop.sh ] && ! grep -q form-loop /proc/*/cmdline 2>/dev/null; then
  sh scripts/form-loop.sh >>/tmp/form-loop.log 2>&1 &
fi
if curl -sf -o /dev/null --max-time 2 http://127.0.0.1:8080/; then
  exit 0
fi
npm run dev >>/tmp/app-startup.log 2>&1 &
