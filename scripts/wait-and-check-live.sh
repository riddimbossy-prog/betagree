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
  sleep 6
  run_id=$(gh run list --repo "$REPO" --workflow "$WORKFLOW" --limit 1 --json databaseId --jq '.[0].databaseId')
fi

echo "wait-and-check: watching run $run_id" | tee -a "$LOG"

# gh run watch has no --timeout; poll conclusion ourselves.
elapsed=0
while [ "$elapsed" -lt "$TIMEOUT" ]; do
  status=$(gh run view "$run_id" --repo "$REPO" --json status,conclusion --jq '{s:.status,c:.conclusion}')
  echo "wait-and-check: $status (${elapsed}s)" | tee -a "$LOG"
  case "$status" in
    *'"s":"completed"'*)
      case "$status" in
        *'"c":"success"'*)
          echo "wait-and-check: deploy done, waiting ${WAIT_CDN}s for CDN" | tee -a "$LOG"
          sleep "$WAIT_CDN"
          node /workspace/scripts/check-live-betagree.mjs "$URL" "$SHOT" | tee -a "$LOG"
          exit 0
          ;;
        *)
          echo "wait-and-check: workflow $run_id failed" | tee -a "$LOG"
          gh run view "$run_id" --repo "$REPO" --json conclusion,displayTitle,headSha,url --jq . | tee -a "$LOG"
          exit 1
          ;;
      esac
      ;;
  esac
  sleep 8
  elapsed=$((elapsed + 8))
done

echo "wait-and-check: timed out waiting for run $run_id" | tee -a "$LOG"
exit 1
