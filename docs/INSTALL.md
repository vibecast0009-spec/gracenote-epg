# Installation guide

## From a release archive

1. Download the latest release from [Releases](https://github.com/andrew867/gracenote-epg/releases) (`gracenote-epg-*.tar.gz` or `.zip`).
2. Extract the archive.
3. From inside the extracted directory, run:
   - **Linux/macOS (system-wide):** `sudo ./install.sh`  
     Installs to `/opt/gracenote-epg` and creates `config.json` from `config.example.json` if missing.
   - **Custom directory:** `./install.sh /path/to/dir` (e.g. `./install.sh $HOME/gracenote-epg`).
4. Edit `config.json` with your lineup (see [Retrieving Lineup ID](https://github.com/jef/zap2xml/wiki/Retrieving-Lineup-ID)).
5. **systemd (Linux):** Copy the units and enable the timer:
   ```bash
   sudo cp /opt/gracenote-epg/packaging/systemd/gracenote-epg.service \
           /opt/gracenote-epg/packaging/systemd/gracenote-epg.timer \
           /etc/systemd/system/
   sudo systemctl daemon-reload
   sudo systemctl enable --now gracenote-epg.timer
   ```
6. Point tvheadend at the XMLTV file (e.g. `/opt/gracenote-epg/xmltv.xml` if `outputFile` is set to that path in config).

## From npm

```bash
npm install -g gracenote-epg
```

Then run `gracenote-epg` from anywhere. Create a `config.json` in the current directory or set `GRABBER_CONFIG_PATH`. For systemd, use the units from the release archive or from the repo under `packaging/systemd/` (set `ExecStart` to `npx gracenote-epg` or the path to your global node modules).

## From source

```bash
git clone https://github.com/andrew867/gracenote-epg.git
cd gracenote-epg
npm install
npm run build
cp config.example.json config.json
# Edit config.json, then:
node dist/index.js
```

