# Testing on another computer

Ways to build and run gracenote-epg on a different machine (e.g. a server or another PC).

---

## 1. Release tarball (install script + systemd)

**On this machine (build):**

```bash
npm install
npm run release:prepare
```

This creates `release/gracenote-epg-1.0.0.tar.gz` (and `.zip` if `zip` is installed).

**Copy to the other machine** (USB, scp, or download from a GitHub Release):

```bash
scp release/gracenote-epg-1.0.0.tar.gz user@otherhost:/tmp/
```

**On the other machine:**

```bash
cd /tmp
tar xzf gracenote-epg-1.0.0.tar.gz
cd gracenote-epg-1.0.0
sudo ./install.sh
# Edit config, then:
gracenote-epg --web-ui    # or: node dist/index.js --web-ui
# When configured:
sudo systemctl enable --now gracenote-epg.timer
```

If Node isn’t installed there, install Node 20+ first (e.g. from nodejs.org or your distro).

---

## 2. npm install from a tarball (global command)

**On this machine (build):**

```bash
npm run build
npm pack
```

This creates `gracenote-epg-1.0.0.tgz` in the project root.

**Copy to the other machine**, then:

```bash
npm install -g ./gracenote-epg-1.0.0.tgz
```

Then create a directory with your config and run:

```bash
mkdir -p ~/gracenote-epg && cd ~/gracenote-epg
cp /path/to/config.example.json config.json
# Edit config.json, then:
gracenote-epg --web-ui
gracenote-epg --run-once
```

Systemd units are not included in the npm pack; use the release tarball (option 1) if you want the install script and systemd files.

---

## 3. Docker (run once or loop in background)

**On this machine (build the image):**

```bash
docker compose build
# Optional: save image to a file to copy to the other machine:
docker save gracenote-epg:latest -o gracenote-epg-docker.tar
# Copy gracenote-epg-docker.tar to the other machine (scp, USB, etc.)
```

**On the other machine:**

**Option A – image was copied:**

```bash
docker load -i gracenote-epg-docker.tar
# Create a directory for config and data
mkdir -p ~/epg-data
# Copy config.example.json there and edit as config.json
cp config.example.json ~/epg-data/config.json
# Run once
docker run --rm -v ~/epg-data:/data gracenote-epg:latest
# Or run in background, updating every 6 hours:
docker run -d --name gracenote-epg -v ~/epg-data:/data \
  gracenote-epg:latest sh -c "while true; do node dist/index.js; sleep 21600; done"
```

**Option B – clone repo on the other machine:**

Use a bind mount so you can put `config.json` in `./epg-data`:

```bash
git clone https://github.com/andrew867/gracenote-epg.git
cd gracenote-epg
docker compose build
mkdir -p ./epg-data
cp config.example.json ./epg-data/config.json
# Edit ./epg-data/config.json with your lineup (lineupId, postalCode, country)
# Run once:
docker compose -f docker-compose.yml -f docker-compose.bind-mount.yml run --rm gracenote-epg
# Run in background (update every 6h):
docker compose -f docker-compose.yml -f docker-compose.daemon.yml -f docker-compose.bind-mount.yml up -d
```

**Run as a daemon (background, update every 6h)** using the included override file:

```bash
docker compose -f docker-compose.yml -f docker-compose.daemon.yml up -d
# Stop later with:
docker compose -f docker-compose.yml -f docker-compose.daemon.yml down
```

Note: the default `docker-compose.yml` runs once and exits. Use `docker-compose.daemon.yml` with `up -d` for a long-running updater.

**Config:** The container expects `config.json` at `/data/config.json` (the mounted volume). Create it from `config.example.json` and edit lineupId, postalCode, country, etc. before running the grab.

---

## 4. Install from GitHub (source)

On the other machine (Node 20+ and git installed):

```bash
npm install -g github:andrew867/gracenote-epg
# Or: git clone https://github.com/andrew867/gracenote-epg.git && cd gracenote-epg && npm install && npm run build && npm install -g .
```

Then use `gracenote-epg` as in option 2. For a published npm package (after you run `npm publish`), use:

```bash
npm install -g gracenote-epg
```
