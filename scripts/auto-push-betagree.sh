#!/bin/sh
# Copy app files from this workspace into the betagree clone and push to GitHub.
# After a real push, wait for Pages and verify https://betagree.com.
set -eu
SRC="${SRC:-/workspace}"
DEST="${DEST:-/tmp/betagree}"
SKIP_LIVE_CHECK="${SKIP_LIVE_CHECK:-0}"

if [ ! -d "$DEST/.git" ]; then
  git clone https://github.com/riddimbossy-prog/betagree.git "$DEST"
fi

if [ -z "$(git -C "$DEST" config user.email || true)" ]; then
  git -C "$DEST" config user.email "41898282+riddimbossy-prog@users.noreply.github.com"
  git -C "$DEST" config user.name "riddimbossy-prog"
fi

cp -a "$SRC/src/." "$DEST/src/"
mkdir -p "$DEST/scripts" "$DEST/public/crests" "$DEST/public/data" "$DEST/public/brand"
cp -a "$SRC/scripts/." "$DEST/scripts/"
cp -a "$SRC/public/crests/." "$DEST/public/crests/"
cp -a "$SRC/public/data/." "$DEST/public/data/"
cp -a "$SRC/public/brand/." "$DEST/public/brand/"
for f in favicon.svg logo.svg logo.png logo-mark.svg logo-mark.png sw.js; do
  [ -f "$SRC/public/$f" ] && cp -a "$SRC/public/$f" "$DEST/public/$f"
done
[ -f "$SRC/startup.sh" ] && cp "$SRC/startup.sh" "$DEST/startup.sh"

cd "$DEST"
git add -A src scripts public/crests public/data public/brand public/favicon.svg \
  public/logo.svg public/logo.png public/logo-mark.svg public/logo-mark.png \
  public/sw.js startup.sh
# drop known bad crest hits if they sneak in
git reset -q -- public/crests/ss-205106.png public/crests/ss-1106597.png public/crests/ss-1219724.png 2>/dev/null || true

if git diff --cached --quiet; then
  echo "auto-push: nothing to commit"
  exit 0
fi

git commit -m "${1:-Sync preview changes to Betagree.}"
git push origin main
git log -1 --format='%h %s'

if [ "$SKIP_LIVE_CHECK" = "1" ]; then
  echo "auto-push: live check skipped"
  exit 0
fi

sh "$SRC/scripts/wait-and-check-live.sh" || {
  echo "auto-push: betagree.com check failed — see /tmp/betagree-live-check.log" >&2
  exit 2
}
