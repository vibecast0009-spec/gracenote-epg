import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { loadConfig, isConfigReadyForGrab } from "./config.js";
import { createRateLimiter } from "./rate-limiter.js";
import { runIncremental, runFull } from "./tvlistings.js";
import { buildXmltv } from "./xmltv.js";
import { archiveCompletedDays } from "./archive.js";
import { startWebServer } from "./web-server.js";
import { startServeXmltv } from "./serve-xmltv.js";

function getArg(name: string): string | undefined {
  const flag = `--${name}=`;
  return process.argv.find((a) => a.startsWith(flag))?.slice(flag.length);
}
function hasFlag(name: string): boolean {
  return process.argv.includes(`--${name}`);
}

async function main(): Promise<void> {
  if (hasFlag("help") || hasFlag("h")) {
    console.log(`
Usage: gracenote-epg [options]
       (or: node dist/index.js [options] when run from source)

Modes (run one per invocation):
  --web-ui                 Start web config UI only (edit lineup, save config). Open http://127.0.0.1:8765/
  --run-once               Fetch EPG and write XMLTV once (incremental: head + tail 6h). Default if no mode given.
  --timer-trigger          Same as --run-once; use in systemd timer or cron.
  --full                   Full refill: rebuild 24h cache from scratch, then write XMLTV.

Other options:
  --serve                  After a run, serve xmltv.xml at http://host:8766/xmltv.xml for tvheadend URL
  --config=path            Config file path (default: config.json in current dir)
  --help                   Show this help

Examples:
  gracenote-epg --web-ui              # Configure lineup in browser
  gracenote-epg --run-once            # Update EPG now
  gracenote-epg --timer-trigger       # For systemd/cron (incremental run)
  gracenote-epg --full                # Force full 24h refill
`);
    process.exit(0);
  }

  let config;
  try {
    config = loadConfig();
  } catch (err) {
    console.error("gracenote-epg: could not load config.");
    console.error("  Run:  gracenote-epg --web-ui   to configure in browser, or copy config.example.json to config.json and edit.");
    console.error(String(err instanceof Error ? err.message : err));
    process.exit(1);
  }

  // User-friendly mode flags (and legacy --web)
  if (hasFlag("web-ui") || hasFlag("web")) {
    const port = config.webUiPort > 0 ? config.webUiPort : 8765;
    startWebServer(port);
    return;
  }

  // Grabs require a configured lineup; avoid crashing on bad API calls
  if (!isConfigReadyForGrab(config)) {
    console.error("gracenote-epg: config not set up. Set your lineup first.");
    console.error("  Run:  gracenote-epg --web-ui   and open http://127.0.0.1:8765/");
    console.error("  Or edit config.json with your lineupId, headendId, postalCode, country.");
    process.exit(1);
  }

  const limiter = createRateLimiter(config);

  // --full or --mode=full => full refill; otherwise incremental (--run-once, --timer-trigger, or default)
  const mode = hasFlag("full") ? "full" : (getArg("mode") ?? "incremental");

  let data;
  const ensureOutputDir = () => {
    const outPath = resolve(config.outputFile);
    mkdirSync(dirname(outPath), { recursive: true });
    return outPath;
  };

  try {
    if (mode === "full") {
      data = await runFull(config, limiter);
      const xml = buildXmltv({ channels: data.channels });
      writeFileSync(ensureOutputDir(), xml, "utf-8");
      console.error(`Wrote ${config.outputFile}`);
    } else {
      const result = await runIncremental(config, limiter);
      data = result.data;
      if (result.dirty) {
        const xml = buildXmltv({ channels: data.channels });
        writeFileSync(ensureOutputDir(), xml, "utf-8");
        console.error(`Wrote ${config.outputFile}`);
      }
    }

    archiveCompletedDays(data.channels, config.archiveDir);

    if (hasFlag("serve")) {
      const port = config.servePort > 0 ? config.servePort : 8766;
      startServeXmltv(config.outputFile, port);
    }
  } catch (err) {
    console.error("gracenote-epg: error:", formatError(err));
    process.exit(1);
  }
}

function formatError(err: unknown): string {
  if (err instanceof Error) {
    const code = (err as NodeJS.ErrnoException).code;
    return code ? `${err.message} (${code})` : err.message;
  }
  return String(err);
}

main().catch((err) => {
  console.error("gracenote-epg: error:", formatError(err));
  process.exit(1);
});
