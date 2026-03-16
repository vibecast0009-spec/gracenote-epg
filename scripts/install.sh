#!/usr/bin/env bash
# Install gracenote-epg from a release archive (run from inside the extracted directory).
# Usage: ./install.sh [install-dir]
# Default install-dir: /opt/gracenote-epg (requires sudo) or ./gracenote-epg for current dir.

set -e

INSTALL_DIR="${1:-/opt/gracenote-epg}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
RELEASE_DIR="$SCRIPT_DIR"

echo "Installing gracenote-epg to $INSTALL_DIR"

if [[ "$INSTALL_DIR" == /opt/* ]] && [[ "$(id -u)" -ne 0 ]]; then
  echo "Installing to $INSTALL_DIR requires root. Run: sudo $0 $INSTALL_DIR"
  exit 1
fi

mkdir -p "$INSTALL_DIR"
cp -r "$RELEASE_DIR/dist" "$RELEASE_DIR/package.json" "$RELEASE_DIR/package-lock.json" "$INSTALL_DIR/"
cp "$RELEASE_DIR/config.example.json" "$INSTALL_DIR/"
cp "$RELEASE_DIR/LICENSE" "$RELEASE_DIR/README.md" "$INSTALL_DIR/" 2>/dev/null || true

if [[ ! -f "$INSTALL_DIR/config.json" ]]; then
  cp "$INSTALL_DIR/config.example.json" "$INSTALL_DIR/config.json"
  echo "Created $INSTALL_DIR/config.json from config.example.json — please edit with your lineup."
fi

if [[ -d "$RELEASE_DIR/packaging/systemd" ]]; then
  mkdir -p "$INSTALL_DIR/packaging/systemd"
  cp "$RELEASE_DIR/packaging/systemd/gracenote-epg.service" "$RELEASE_DIR/packaging/systemd/gracenote-epg.timer" "$INSTALL_DIR/packaging/systemd/"
  # Patch service ExecStart to use install dir
  if command -v sed &>/dev/null; then
    sed -i.bak "s|/opt/gracenote-epg|$INSTALL_DIR|g" "$INSTALL_DIR/packaging/systemd/gracenote-epg.service"
    rm -f "$INSTALL_DIR/packaging/systemd/gracenote-epg.service.bak"
  fi
  echo "Systemd units copied to $INSTALL_DIR/packaging/systemd/"
  echo "To enable: sudo cp $INSTALL_DIR/packaging/systemd/gracenote-epg.service $INSTALL_DIR/packaging/systemd/gracenote-epg.timer /etc/systemd/system/"
  echo "           sudo systemctl daemon-reload && sudo systemctl enable --now gracenote-epg.timer"
fi

echo "Done. Edit $INSTALL_DIR/config.json then run: node $INSTALL_DIR/dist/index.js"
