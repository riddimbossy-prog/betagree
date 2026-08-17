#!/bin/sh
# After a push, wait for GitHub Pages to finish, then verify betagree.com.
set -eu
REPO="${REPO:-riddimbossy-prog/betagree}"
WORKFLOW="${WORKFLOW:-pages.yml}"
URL="${URL:-https://betagree.com/}"
SHOT="${SHOT:-/workspace/screenshots/betagree-live.png}"
LOG="${LOG:-/tmp/betagree-live-check.log}"
WAIT_CDN="${WAIT_CDN:-45}"
TIMEOUT="${TIMEOUT:-240}"

run_id="${1:-}"
if [ -z "$run_id" ]; then
  # Give Actions a moment to register the push.
  sleep 6
  run_id=$(gh run list --repo "$REPO" --workflow "$WORKFLOW" --limit 1 --json databaseId --jq '.[0].databaseId')
fi

echo "wait-and-check: watching run $run_id" | tee -a "$LOG"
if ! gh run watch "$run_id" --repo "$REPO" --exit-status --timeout "$TIMEOUT"; then
  echo "wait-and-check: workflow $run_id failed" | tee -a "$LOG"
  gh run view "$run_id" --repo "$REPO" --json conclusion,displayTitle,headSha,url --jq . | tee -a "$LOG"
  exit 1
fi

echo "wait-and-check: deploy done, waiting ${WAIT_CDN}s for CDN" | tee -a "$LOG"
sleep "$WAIT_CDN"

node /workspace/scripts/check-live-betagree.mjs "$URL" "$SHOT" | tee -a "$LOG"
