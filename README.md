# gracenote-epg

Gracenote TV listings to XMLTV for tvheadend EPG. Fetches from the Gracenote tvlistings API, caches up to 24h with incremental head+tail updates, outputs XMLTV and optional daily archives.

## Installation

**From a release (recommended)**  
Download the latest [release](https://github.com/andrew867/gracenote-epg/releases) (tar.gz or zip), extract, then run from inside the extracted directory:

```bash
./install.sh                    # install to /opt/gracenote-epg (requires sudo)
./install.sh /path/to/install   # or install to a directory of your choice
```

Edit `config.json` in the install directory, then copy the systemd units and enable the timer — see [packaging/systemd/README.md](packaging/systemd/README.md).

**From npm**  
```bash
npm install -g gracenote-epg
gracenote-epg --help   # list commands
```

**From source**  
```bash
git clone https://github.com/andrew867/gracenote-epg.git && cd gracenote-epg
npm install && npm run build
# Run via: node dist/index.js ... or npm install -g . then gracenote-epg ...
```

## Commands

| Command | Description |
|--------|-------------|
| `gracenote-epg --web-ui` | Start web config UI (edit lineup in browser). Open http://127.0.0.1:8765/ |
| `gracenote-epg --run-once` | Fetch EPG and write XMLTV once (incremental). Default if no flag given. |
| `gracenote-epg --timer-trigger` | Same as --run-once; use in systemd timer or cron. |
| `gracenote-epg --full` | Full refill: rebuild 24h cache from scratch. |
| `gracenote-epg --serve` | After a run, serve xmltv.xml at http://host:8766/xmltv.xml (for tvheadend URL). |

Config path: use `--config=path` or set `GRABBER_CONFIG_PATH`. When using the global command, run from the directory that has `config.json` or set the path.

## Quick start

1. **Config:** Copy `config.example.json` to `config.json` and set your lineup (e.g. `lineupId`, `headendId`, `postalCode`, `country`). See [Retrieving Lineup ID](https://github.com/jef/zap2xml/wiki/Retrieving-Lineup-ID) for how to get values.
2. **Web UI:** `gracenote-epg --web-ui` then open http://127.0.0.1:8765/
3. **Run once:** `gracenote-epg --run-once` (or `gracenote-epg` with no args).
4. **Systemd:** Enable the timer so it runs every 6h: `sudo systemctl enable --now gracenote-epg.timer`

## Config file and web UI

- Config file: `config.json` (path via `--config=path` or `GRABBER_CONFIG_PATH`).
- All grid URL parameters are configurable: `lineupId`, `timespan`, `headendId`, `country`, `timezone`, `device`, `postalCode`, `isOverride`, `pref`, `userId`, `aid`, `languagecode`.
- App settings: `outputFile`, `cacheFile`, `archiveDir`, `rateLimit.requestDelayMs`, `rateLimit.maxRequestsPerMinute`, `webUiPort`, `servePort`.
- Run with `--web-ui` (or `--web`) to open the web config UI (default http://127.0.0.1:8765/). Edit and Save to write back to `config.json`. Bind to localhost only unless you protect the endpoint.

## Rate limiting

- `requestDelayMs`: minimum delay between API requests (default 1500).
- `maxRequestsPerMinute`: cap per minute (default 20).
- Applied to chunked and head/tail fetches.

## Full vs incremental run

- **Incremental (default):** Load cache, fetch head 6h (from now) and tail 6h (at end of cache), diff/merge, write XMLTV only if head changed. Extends the rolling 24h window.
- **Full:** Refill cache from scratch (24h of data in 6h chunks), then write XMLTV. Use when cache is missing or corrupted, or to force refresh.

## systemd

See [packaging/systemd/README.md](packaging/systemd/README.md). Copy `gracenote-epg.service` and `gracenote-epg.timer` to `/etc/systemd/system/`, set `WorkingDirectory` and `ExecStart`, then enable the timer for e.g. every 6h.

## Docker

- **Build:** `docker compose build`
- **Run once:** `docker compose run --rm gracenote-epg`
- **Run in background (update every 6h):** `docker compose -f docker-compose.yml -f docker-compose.daemon.yml up -d`
- Put `config.json` in the mounted volume (e.g. create `config.json` from `config.example.json` in the volume). Default paths in container: `/data/config.json`, `/data/xmltv.xml`, `/data/cache.json`, `/data/archive/`.
- See [docs/TEST-ON-ANOTHER-MACHINE.md](docs/TEST-ON-ANOTHER-MACHINE.md) for building a release tarball, npm install from tgz, and Docker install on another computer.

## Tvheadend

- **File:** In tvheadend: Configuration → EPG → EPG Grabbers → Internal XMLTV. Set the path to your `outputFile` (e.g. `/var/lib/gracenote-epg/xmltv.xml`).
- **URL:** Run with `--serve` so the app serves the XMLTV at `http://host:8766/xmltv.xml`. In tvheadend set the EPG URL to that address.

## Scripts

- `npm run build` – compile TypeScript
- `npm run start` – run incremental once
- `npm run fetch-sample` – fetch one grid chunk and write `sample-grid.json`
- `npm run test:run` – run tests
- `npm run release:prepare` – build and assemble release directory (for packaging)

## Build and release

- **CI:** GitHub Actions runs tests and build on push/PR to `main` or `master` (see [.github/workflows/ci.yml](.github/workflows/ci.yml)).
- **Releases:** Pushing a tag `v*` (e.g. `v1.0.0`) triggers [.github/workflows/release.yml](.github/workflows/release.yml): tests, build, then creation of a GitHub Release with `gracenote-epg-<version>.tar.gz` and `.zip` attached.
- **Local packaging:** Run `npm run release:prepare` to produce `release/gracenote-epg-<version>/` with the same layout as the release archive; you can then create a tarball manually or test `install.sh` locally.

## API params (canonical URL)

The app uses the same parameter set as the working browser request. See [docs/API-CHANGES.md](docs/API-CHANGES.md) for how this differs from zap2xml and the exact query string.

## License

MIT License. See [LICENSE](LICENSE). Copyright (c) 2026 Andrew Green.
