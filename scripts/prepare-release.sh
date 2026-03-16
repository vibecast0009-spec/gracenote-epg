#!/usr/bin/env bash
# Build and assemble release directory (same layout as GitHub Actions release).
# Run from repo root after npm run build. Creates release/gracenote-epg-<version>/

set -e

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

VERSION="${1:-$(node -p "require('./package.json').version")}"
OUT="release/gracenote-epg-${VERSION}"
rm -rf "$OUT"
mkdir -p "$OUT"

cp -r dist package.json package-lock.json config.example.json LICENSE README.md "$OUT/"
mkdir -p "$OUT/packaging/systemd"
cp packaging/systemd/gracenote-epg.service packaging/systemd/gracenote-epg-update.service packaging/systemd/gracenote-epg-update.timer packaging/systemd/README.md "$OUT/packaging/systemd/"
cp scripts/install.sh "$OUT/"
chmod +x "$OUT/install.sh"

echo "Release dir: $ROOT/$OUT"
tar czvf "$ROOT/release/gracenote-epg-${VERSION}.tar.gz" -C "$ROOT/release" "gracenote-epg-${VERSION}"
echo "Created release/gracenote-epg-${VERSION}.tar.gz"
if command -v zip &>/dev/null; then
  (cd "$ROOT/release" && zip -r "gracenote-epg-${VERSION}.zip" "gracenote-epg-${VERSION}")
  echo "Created release/gracenote-epg-${VERSION}.zip"
fi
