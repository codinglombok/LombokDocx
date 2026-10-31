#!/usr/bin/env bash
# LombokDocx — staged version bump (LombokVector pattern, adapted to a
# root-manifest TypeScript reference; no rust/, python/ or typescript/ folder).
#
# Usage: scripts/bump_version.sh X.Y.Z
#
# Updates the manifest and the lock file, renames the docs/*_v<old>.md files,
# and rewrites the version references inside them. It does NOT write the
# CHANGELOG (human step), does NOT touch tags, commits, or git history, and
# never publishes anything.
set -euo pipefail

NEW="${1:?usage: bump_version.sh X.Y.Z}"
if ! [[ "$NEW" =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
  echo "ERROR: version must be MAJOR.MINOR.PACK (got: $NEW)"
  exit 1
fi

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

OLD="$(node -p "require('./package.json').version")"
if [ -z "$OLD" ]; then
  echo "ERROR: cannot read the current version from package.json"
  exit 1
fi
if [ "$OLD" = "$NEW" ]; then
  echo "Already at $NEW; nothing to do."
  exit 0
fi
echo "bump: $OLD -> $NEW"

# 1. manifest and lock file (both version spots of package-lock.json)
node - "$OLD" "$NEW" <<'EOF'
const fs = require('fs')
const [oldV, newV] = process.argv.slice(2)
for (const f of ['package.json', 'package-lock.json']) {
  const j = JSON.parse(fs.readFileSync(f, 'utf8'))
  let touched = false
  if (j.version === oldV) { j.version = newV; touched = true }
  if (j.packages && j.packages[''] && j.packages[''].version === oldV) { j.packages[''].version = newV; touched = true }
  if (touched) fs.writeFileSync(f, JSON.stringify(j, null, 2) + '\n')
}
EOF

# 2. documentation: rename the versioned files, then update version references
for f in docs/*_v"${OLD}".md; do
  [ -e "$f" ] || continue
  n="${f/_v${OLD}.md/_v${NEW}.md}"
  git mv "$f" "$n"
  sed -i "s/v${OLD}/v${NEW}/g; s/${OLD}\.x/${NEW}.x/g; s/LombokDocx ${OLD}/LombokDocx ${NEW}/g; s/| SPEC version | ${OLD} /| SPEC version | ${NEW} /" "$n"
done
for f in README.md; do
  [ -e "$f" ] && sed -i "s/v${OLD}/v${NEW}/g" "$f"
done

echo
echo "Mechanical bump done. Remaining human steps:"
echo "  1. Write the new top section in CHANGELOG.md (must be [${NEW}]; the"
echo "     doctor checks it)."
echo "  2. Run: npm ci && npm run check"
echo "  3. Commit, then tag v${NEW} to trigger the release workflow."
