# systemd setup for gracenote-epg

## Units

- **gracenote-epg.service** — Long-running: runs `gracenote-epg --serve`. Does one grab at start, then serves `xmltv.xml` at `http://0.0.0.0:8766/xmltv.xml`. Use this URL in tvheadend EPG (Internal XMLTV → URL).
- **gracenote-epg-update.service** — Oneshot: runs `gracenote-epg --timer-trigger` (incremental grab). Used by the timer.
- **gracenote-epg-update.timer** — Fires every 6 hours and starts `gracenote-epg-update.service` to refresh the cache and XMLTV file.

## Install

1. Copy the app (e.g. built `dist/` and `package.json`) to `/opt/gracenote-epg` or install via npm.
2. Create a working directory, e.g. `/var/lib/gracenote-epg`, and put `config.json` there (or copy from `config.example.json` and edit).
3. Copy the systemd units:
   ```bash
   sudo cp gracenote-epg.service gracenote-epg-update.service gracenote-epg-update.timer /etc/systemd/system/
   ```
4. Edit the service files if needed:
   - Set `WorkingDirectory` to the directory that contains your `config.json`.
   - Set `ExecStart` to the correct path to `node` and `dist/index.js` (e.g. `/opt/gracenote-epg/dist/index.js`). The main service must use `--serve`; the update service must use `--timer-trigger`.
   - Optionally set `User=` and `Group=` to match the user that runs tvheadend.
   - Optionally set `Environment=GRABBER_CONFIG_PATH=/etc/gracenote-epg/config.json` and use a config in `/etc`.
5. Reload, enable and start the serve service and the 6h timer:
   ```bash
   sudo systemctl daemon-reload
   sudo systemctl enable --now gracenote-epg.service
   sudo systemctl enable --now gracenote-epg-update.timer
   ```
6. Check timer: `sudo systemctl list-timers gracenote-epg-update.timer`
7. Run a grab once manually: `sudo systemctl start gracenote-epg-update.service`

## Tvheadend configuration

- In tvheadend: **Configuration → EPG → EPG Grabbers**.
- Add **Internal XMLTV** and set the URL: `http://<host>:8766/xmltv.xml` (replace `<host>` with the machine’s hostname or IP).
- Alternatively, use the file path: set the path to the `outputFile` from your `config.json` (e.g. `/var/lib/gracenote-epg/xmltv.xml`).
