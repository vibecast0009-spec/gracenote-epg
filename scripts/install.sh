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
  echo "Created $INSTALL_DIR/config.json (starter config). Edit lineupId, headendId, postalCode, country before running grabs."
fi

if [[ -d "$RELEASE_DIR/packaging/systemd" ]]; then
  mkdir -p "$INSTALL_DIR/packaging/systemd"
  cp "$RELEASE_DIR/packaging/systemd/gracenote-epg.service" \
     "$RELEASE_DIR/packaging/systemd/gracenote-epg-update.service" \
     "$RELEASE_DIR/packaging/systemd/gracenote-epg-update.timer" \
     "$INSTALL_DIR/packaging/systemd/"
  # Patch both services: WorkingDirectory and ExecStart for this install dir (works without npm -g)
  if command -v sed &>/dev/null; then
    for f in gracenote-epg.service gracenote-epg-update.service; do
      sed -i.bak "s|WorkingDirectory=.*|WorkingDirectory=$INSTALL_DIR|" "$INSTALL_DIR/packaging/systemd/$f"
      if [[ "$f" == "gracenote-epg.service" ]]; then
        sed -i.bak "s|ExecStart=.*|ExecStart=/usr/bin/node $INSTALL_DIR/dist/index.js --serve|" "$INSTALL_DIR/packaging/systemd/$f"
      else
        sed -i.bak "s|ExecStart=.*|ExecStart=/usr/bin/node $INSTALL_DIR/dist/index.js --timer-trigger|" "$INSTALL_DIR/packaging/systemd/$f"
      fi
      rm -f "$INSTALL_DIR/packaging/systemd/$f.bak"
    done
  fi
  # Install systemd units if we can
  if command -v systemctl &>/dev/null && [[ -d /etc/systemd/system ]]; then
    SUDO=""
    [[ "$(id -u)" -ne 0 ]] && SUDO="sudo"
    $SUDO cp "$INSTALL_DIR/packaging/systemd/gracenote-epg.service" \
            "$INSTALL_DIR/packaging/systemd/gracenote-epg-update.service" \
            "$INSTALL_DIR/packaging/systemd/gracenote-epg-update.timer" \
            /etc/systemd/system/
    $SUDO systemctl daemon-reload
    echo "Systemd units installed. Start serve: sudo systemctl enable --now gracenote-epg.service"
    echo "Enable 6h grab: sudo systemctl enable --now gracenote-epg-update.timer"
  else
    echo "Systemd units are in $INSTALL_DIR/packaging/systemd/. Copy to /etc/systemd/system/ and run systemctl daemon-reload."
    echo "Then: systemctl enable --now gracenote-epg.service  and  systemctl enable --now gracenote-epg-update.timer"
  fi
fi

echo ""
echo "Done. Next steps (run from $INSTALL_DIR or set GRABBER_CONFIG_PATH):"
echo "  1. Edit config:    $INSTALL_DIR/config.json  (lineupId, postalCode, country, etc.)"
echo "  2. Web config UI:  gracenote-epg --web-ui    (then open http://localhost:8765/)"
echo "     Or:            cd $INSTALL_DIR && node dist/index.js --web-ui"
echo "  3. Run once:      gracenote-epg --run-once  (or node dist/index.js --run-once)"
echo "  4. Systemd: sudo systemctl enable --now gracenote-epg.service  (serve xmltv at :8766)"
echo "             sudo systemctl enable --now gracenote-epg-update.timer  (grab every 6h)"
echo ""
echo "Until lineup is set in config, gracenote-epg --run-once and the timer will exit with 'config not set up' (use --web-ui to configure)."
echo "When using the global command, run from $INSTALL_DIR so config.json is found, or set GRABBER_CONFIG_PATH=$INSTALL_DIR/config.json"
echo "Optional: get a global 'gracenote-epg' command:  cd $INSTALL_DIR && npm install -g ."
