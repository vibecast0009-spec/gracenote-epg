# gracenote-epg

Gracenote TV listings to XMLTV for tvheadend EPG. Fetches from the Gracenote tvlistings API, caches up to 24h with incremental head+tail updates, outputs XMLTV and optional daily archives.

## Quick start

1. **Install:** `npm install` then `npm run build`.
2. **Config:** Copy `config.example.json` to `config.json` and set your lineup (e.g. `lineupId`, `headendId`, `postalCode`, `country`). See [Retrieving Lineup ID](https://github.com/jef/zap2xml/wiki/Retrieving-Lineup-ID) for how to get values.
3. **Run once (incremental):** `node dist/index.js`
4. **Run full refill:** `node dist/index.js --mode=full`
5. **Web config UI:** `node dist/index.js --web` then open http://127.0.0.1:8765/

## Config file and web UI

- Config file: `config.json` (path via `--config=path` or `GRABBER_CONFIG_PATH`).
- All grid URL parameters are configurable: `lineupId`, `timespan`, `headendId`, `country`, `timezone`, `device`, `postalCode`, `isOverride`, `pref`, `userId`, `aid`, `languagecode`.
- App settings: `outputFile`, `cacheFile`, `archiveDir`, `rateLimit.requestDelayMs`, `rateLimit.maxRequestsPerMinute`, `webUiPort`, `servePort`.
- Run with `--web` to open the web config UI (default http://127.0.0.1:8765/). Edit and Save to write back to `config.json`. Bind to localhost only unless you protect the endpoint.

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
- Put `config.json` in the mounted volume (e.g. `epg-data`). Default paths: `/data/config.json`, `/data/xmltv.xml`, `/data/cache.json`, `/data/archive/`.

## Tvheadend

- **File:** In tvheadend: Configuration → EPG → EPG Grabbers → Internal XMLTV. Set the path to your `outputFile` (e.g. `/var/lib/gracenote-epg/xmltv.xml`).
- **URL:** Run with `--serve` so the app serves the XMLTV at `http://host:8766/xmltv.xml`. In tvheadend set the EPG URL to that address.

## Scripts

- `npm run build` – compile TypeScript
- `npm run start` – run incremental once
- `npm run fetch-sample` – fetch one grid chunk and write `sample-grid.json`
- `npm run test:run` – run tests

## API params (canonical URL)

The app uses the same parameter set as the working browser request. See [docs/API-CHANGES.md](docs/API-CHANGES.md) for how this differs from zap2xml and the exact query string.
