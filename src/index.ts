import { writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { loadConfig } from "./config.js";
import { createRateLimiter } from "./rate-limiter.js";
import { runIncremental, runFull } from "./tvlistings.js";
import { buildXmltv } from "./xmltv.js";
import { archiveCompletedDays } from "./archive.js";
import { startWebServer } from "./web-server.js";

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
Usage: node dist/index.js [options]

Options:
  --mode=full|incremental   Full refill (24h) or incremental (head+tail 6h). Default: incremental
  --serve                  Start web config UI and (if output exists) serve xmltv.xml
  --config=path            Config file path (default: config.json)
  --help                   Show this help
`);
    process.exit(0);
  }

  const config = loadConfig();
  const mode = getArg("mode") ?? "incremental";

  if (hasFlag("web")) {
    const port = config.webUiPort > 0 ? config.webUiPort : 8765;
    startWebServer(port);
    return;
  }

  const limiter = createRateLimiter(config);

  let data;
  if (mode === "full") {
    data = await runFull(config, limiter);
    const xml = buildXmltv({ channels: data.channels });
    writeFileSync(resolve(config.outputFile), xml, "utf-8");
    console.error(`Wrote ${config.outputFile}`);
  } else {
    const result = await runIncremental(config, limiter);
    data = result.data;
    if (result.dirty) {
      const xml = buildXmltv({ channels: data.channels });
      writeFileSync(resolve(config.outputFile), xml, "utf-8");
      console.error(`Wrote ${config.outputFile}`);
    }
  }

  archiveCompletedDays(data.channels, config.archiveDir);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
