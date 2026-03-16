/**
 * One-off script: fetch one grid chunk and write sample-grid.json.
 * Usage: npm run build && node dist/scripts/fetch-sample.js
 *        Or with config: node dist/scripts/fetch-sample.js --config=config.json
 */
import { writeFileSync } from "node:fs";
import { loadConfig } from "../config.js";
import { fetchGrid } from "../grid-fetcher.js";

async function main(): Promise<void> {
  const config = loadConfig();
  const now = Math.floor(Date.now() / 1000);
  const timespanHours = Math.min(6, parseInt(config.timespan, 10) || 3);
  console.error("Fetching grid sample...");
  const data = await fetchGrid(config, now, timespanHours);
  const path = "sample-grid.json";
  writeFileSync(path, JSON.stringify(data, null, 2), "utf-8");
  console.error(`Wrote ${path} (${data.channels.length} channels)`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
