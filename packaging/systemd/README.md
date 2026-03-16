# systemd setup for zap2tvheadend

## Install

1. Copy the app (e.g. built `dist/` and `package.json`) to `/opt/zap2tvheadend` or install via npm.
2. Create a working directory, e.g. `/var/lib/gracenote-epg`, and put `config.json` there (or copy from `config.example.json` and edit).
3. Copy the systemd units:
   ```bash
   sudo cp gracenote-epg.service gracenote-epg.timer /etc/systemd/system/
   ```
4. Edit `gracenote-epg.service` if needed:
   - Set `WorkingDirectory` to the directory that contains your `config.json`.
   - Set `ExecStart` to the correct path to `node` and `dist/index.js` (e.g. `/opt/zap2tvheadend/dist/index.js`).
   - Optionally set `User=` and `Group=` to match the user that runs tvheadend.
   - Optionally set `Environment=GRABBER_CONFIG_PATH=/etc/zap2tvheadend/config.json` and use a config in `/etc`.
5. Reload and enable the timer:
   ```bash
   sudo systemctl daemon-reload
   sudo systemctl enable gracenote-epg.timer
   sudo systemctl start gracenote-epg.timer
   ```
6. Check timer: `sudo systemctl list-timers gracenote-epg.timer`
7. Run once manually: `sudo systemctl start gracenote-epg.service`

## Tvheadend configuration

- In tvheadend: **Configuration → EPG → EPG Grabbers**.
- Add **Internal XMLTV** and set the path to the XMLTV file produced by the grabber.
- Use the `outputFile` path from your `config.json` (e.g. `/var/lib/gracenote-epg/xmltv.xml`).
- If you use the optional HTTP server (e.g. `--serve`), you can set the URL instead: `http://localhost:PORT/xmltv.xml`.
