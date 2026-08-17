#!/bin/sh
# Copy app files from this workspace into the betagree clone and push to GitHub.
set -eu
SRC="${SRC:-/workspace}"
DEST="${DEST:-/tmp/betagree}"

if [ ! -d "$DEST/.git" ]; then
  git clone https://github.com/riddimbossy-prog/betagree.git "$DEST"
fi

if [ -z "$(git -C "$DEST" config user.email || true)" ]; then
  git -C "$DEST" config user.email "41898282+riddimbossy-prog@users.noreply.github.com"
  git -C "$DEST" config user.name "riddimbossy-prog"
fi

cp -a "$SRC/src/." "$DEST/src/"
mkdir -p "$DEST/scripts" "$DEST/public/crests" "$DEST/public/data"
cp -a "$SRC/scripts/." "$DEST/scripts/"
cp -a "$SRC/public/crests/." "$DEST/public/crests/"
cp -a "$SRC/public/data/." "$DEST/public/data/"
[ -f "$SRC/startup.sh" ] && cp "$SRC/startup.sh" "$DEST/startup.sh"

cd "$DEST"
git add -A src scripts public/crests public/data startup.sh
# drop known bad crest hits if they sneak in
git reset -q -- public/crests/ss-205106.png public/crests/ss-1106597.png public/crests/ss-1219724.png 2>/dev/null || true

if git diff --cached --quiet; then
  echo "auto-push: nothing to commit"
  exit 0
fi

git commit -m "${1:-Sync preview changes to Betagree.}"
git push origin main
git log -1 --format='%h %s'
