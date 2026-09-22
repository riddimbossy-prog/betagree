#!/bin/sh
# Debounced push of source + crests. Ignores live scores.json churn.
set -eu
SRC="${SRC:-/workspace}"
STAMP=/tmp/betagree-push.stamp
HASH=/tmp/betagree-push.hash

fingerprint() {
  find "$SRC/src" "$SRC/scripts" "$SRC/public/crests/index.json" "$SRC/startup.sh" \
    -type f -print0 2>/dev/null | sort -z | xargs -0 md5sum 2>/dev/null | md5sum | awk '{print $1}'
}

while true; do
  now=$(fingerprint)
  prev=""
  [ -f "$HASH" ] && prev=$(cat "$HASH")
  if [ "$now" != "$prev" ]; then
    echo "$now" >"$HASH"
    # wait for edits to settle
    sleep 20
    now2=$(fingerprint)
    echo "$now2" >"$HASH"
    sh "$SRC/scripts/auto-push-betagree.sh" "Auto-sync preview changes to Betagree." >>/tmp/betagree-push.log 2>&1 || true
    date -u +%FT%TZ >"$STAMP"
  fi
  sleep 70
done
