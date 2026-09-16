import { spawn } from "node:child_process";
import { promises as fs } from "node:fs";
import path from "node:path";

const DATA_DIR = process.env.MULTI_DATA_DIR || "/data";
const BASE_CONFIG =
  process.env.GRABBER_CONFIG_PATH || "/etc/secrets/config.json";

const OUTPUT_FILE = path.join(DATA_DIR, "xmltv.xml");
const WORK_DIR = path.join(DATA_DIR, "multi-lineup");

const lineups = [
  { lineupId: "USA-GA67017-X", headendId: "GA67017", device: "X" },
  { lineupId: "USA-GA10425-X", headendId: "GA10425", device: "X" },
  { lineupId: "USA-GA55010-X", headendId: "GA55010", device: "X" },

  { lineupId: "USA-AFN-X", headendId: "AFN", device: "X" },
  { lineupId: "USA-DITV-X", headendId: "DITV", device: "X" },
  { lineupId: "USA-DITV524-X", headendId: "DITV524", device: "X" },
  { lineupId: "USA-DISH524-X", headendId: "DISH524", device: "X" },
  { lineupId: "USA-ECHOST-X", headendId: "ECHOST", device: "X" },
  { lineupId: "USA-GLRYSTR-X", headendId: "GLRYSTR", device: "X" },

  {
    lineupId: "USA-OTA30501-DEFAULT",
    headendId: "lineupId",
    device: "-"
  },

  { lineupId: "USA-AMZPV-X", headendId: "AMZPV", device: "X" },
  { lineupId: "USA-DTVNOW-X", headendId: "DTVNOW", device: "X" },
  { lineupId: "USA-DNOW524-X", headendId: "DNOW524", device: "X" },
  { lineupId: "USA-IMDBTV-X", headendId: "IMDBTV", device: "X" },
  { lineupId: "USA-FRNDLY-X", headendId: "FRNDLY", device: "X" },
  { lineupId: "USA-FUBOTV-X", headendId: "FUBOTV", device: "X" },
  { lineupId: "USA-FUBO524-X", headendId: "FUBO524", device: "X" },
  { lineupId: "USA-HULUTV-X", headendId: "HULUTV", device: "X" },
  { lineupId: "USA-HULU524-X", headendId: "HULU524", device: "X" },
  { lineupId: "USA-PEACOCK-X", headendId: "PEACOCK", device: "X" },
  { lineupId: "USA-PHILO-X", headendId: "PHILO", device: "X" },
  { lineupId: "USA-PLEX-X", headendId: "PLEX", device: "X" },
  { lineupId: "USA-PLUTOTV-X", headendId: "PLUTOTV", device: "X" },
  { lineupId: "USA-SAMSUNG-X", headendId: "SAMSUNG", device: "X" },
  { lineupId: "USA-SMSG524-X", headendId: "SMSG524", device: "X" },
  { lineupId: "USA-SLNG524-X", headendId: "SLNG524", device: "X" },
  { lineupId: "USA-TUBISTR-X", headendId: "TUBISTR", device: "X" },
  { lineupId: "USA-GNSTR-X", headendId: "GNSTR", device: "X" },
  { lineupId: "USA-VIZIO-X", headendId: "VIZIO", device: "X" },
  { lineupId: "USA-XFINSTR-X", headendId: "XFINSTR", device: "X" },
  { lineupId: "USA-XUMOTV-X", headendId: "XUMOTV", device: "X" },
  { lineupId: "USA-YTBE524-X", headendId: "YTBE524", device: "X" },
  { lineupId: "USA-YOUTUBE-X", headendId: "YOUTUBE", device: "X" }
];

function runGrabber(configPath) {
  return new Promise((resolve, reject) => {
    const child = spawn(
      process.execPath,
      ["dist/index.js", "--full", `--config=${configPath}`],
      { stdio: "inherit" }
    );

    child.on("error", reject);

    child.on("exit", code => {
      if (code === 0) resolve();
      else reject(new Error(`Grabber exited with code ${code}`));
    });
  });
}

function extract(xml, tag) {
  const regex = new RegExp(`<${tag}\\b[\\s\\S]*?<\\/${tag}>`, "g");
  return xml.match(regex) || [];
}

function channelId(block) {
  return block.match(/<channel\s+id="([^"]+)"/)?.[1] || null;
}

function programmeKey(block) {
  const match = block.match(
    /<programme\s+start="([^"]+)"\s+stop="([^"]+)"\s+channel="([^"]+)"/
  );

  if (!match) return block;

  return `${match[3]}|${match[1]}|${match[2]}`;
}

async function main() {
  console.log(`Starting multi-lineup build: ${lineups.length} lineups`);

  await fs.mkdir(WORK_DIR, { recursive: true });

  const base = JSON.parse(await fs.readFile(BASE_CONFIG, "utf8"));

  const channels = new Map();
  const programmes = new Map();

  let successful = 0;
  let failed = 0;

  for (let i = 0; i < lineups.length; i++) {
    const lineup = lineups[i];

    console.log("");
    console.log(
      `[${i + 1}/${lineups.length}] Fetching ${lineup.lineupId}`
    );

    const safeName = lineup.lineupId.replace(/[^a-zA-Z0-9_-]/g, "_");

    const configPath = path.join(WORK_DIR, `${safeName}.json`);
    const xmlPath = path.join(WORK_DIR, `${safeName}.xml`);

    const config = {
      ...base,

      lineupId: lineup.lineupId,
      headendId: lineup.headendId,
      device: lineup.device,

      country: "USA",
      postalCode: "30501",

      outputFile: xmlPath,
      cacheFile: path.join(WORK_DIR, `${safeName}-cache.json`),
      archiveDir: path.join(WORK_DIR, `${safeName}-archive`)
    };

    await fs.writeFile(
      configPath,
      JSON.stringify(config, null, 2),
      "utf8"
    );

    try {
      await runGrabber(configPath);

      const xml = await fs.readFile(xmlPath, "utf8");

      const lineupChannels = extract(xml, "channel");
      const lineupProgrammes = extract(xml, "programme");

      for (const block of lineupChannels) {
        const id = channelId(block);

        if (id && !channels.has(id)) {
          channels.set(id, block);
        }
      }

      for (const block of lineupProgrammes) {
        const key = programmeKey(block);

        if (!programmes.has(key)) {
          programmes.set(key, block);
        }
      }

      successful++;

      console.log(
        `Added ${lineupChannels.length} channels / ` +
        `${lineupProgrammes.length} programmes`
      );

      console.log(
        `Combined unique total: ${channels.size} channels / ` +
        `${programmes.size} programmes`
      );
    } catch (error) {
      failed++;

      console.error(
        `FAILED ${lineup.lineupId}: ${error.message}`
      );

      // Continue so one bad lineup does not kill the entire guide.
    }
  }

  const header =
    '<?xml version="1.0" encoding="UTF-8"?>\n' +
    '<tv generator-info-name="gracenote-epg-multi" ' +
    'generator-info-url="https://github.com/andrew867/gracenote-epg">';

  const output = [
    header,
    ...channels.values(),
    ...programmes.values(),
    "</tv>",
    ""
  ].join("\n");

  await fs.writeFile(OUTPUT_FILE, output, "utf8");

  console.log("");
  console.log("======================================");
  console.log("MULTI-LINEUP BUILD COMPLETE");
  console.log(`Successful lineups: ${successful}`);
  console.log(`Failed lineups:     ${failed}`);
  console.log(`Unique channels:    ${channels.size}`);
  console.log(`Unique programmes:  ${programmes.size}`);
  console.log(`Output: ${OUTPUT_FILE}`);
  console.log("======================================");

  if (successful === 0) {
    process.exitCode = 1;
  }
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
