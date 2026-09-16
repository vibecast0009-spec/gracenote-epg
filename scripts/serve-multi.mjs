import http from "node:http";
import { createReadStream, promises as fs } from "node:fs";
import { spawn } from "node:child_process";

const PORT = Number(process.env.PORT || 8766);
const HOST = "0.0.0.0";
const XMLTV_FILE = process.env.XMLTV_FILE || "/data/xmltv.xml";

// Rebuild every 12 hours
const REFRESH_INTERVAL = 12 * 60 * 60 * 1000;

let building = false;
let lastBuildStarted = null;
let lastBuildFinished = null;
let lastBuildSuccessful = null;

async function xmlExists() {
  try {
    await fs.access(XMLTV_FILE);
    return true;
  } catch {
    return false;
  }
}

function rebuildGuide() {
  if (building) {
    console.log("EPG build already running; skipping duplicate build.");
    return;
  }

  building = true;
  lastBuildStarted = new Date();

  console.log("");
  console.log("========================================");
  console.log(`Starting multi-lineup EPG build: ${lastBuildStarted.toISOString()}`);
  console.log("========================================");

  const child = spawn(
    process.execPath,
    ["scripts/multi-lineup.mjs"],
    {
      stdio: "inherit",
      env: process.env
    }
  );

  child.on("error", error => {
    console.error("Unable to start multi-lineup builder:", error);
    building = false;
    lastBuildSuccessful = false;
    lastBuildFinished = new Date();
  });

  child.on("exit", code => {
    building = false;
    lastBuildFinished = new Date();

    if (code === 0) {
      lastBuildSuccessful = true;
      console.log("");
      console.log("========================================");
      console.log(`EPG build completed: ${lastBuildFinished.toISOString()}`);
      console.log("========================================");
    } else {
      lastBuildSuccessful = false;
      console.error(`EPG build exited with code ${code}`);
      console.error("Existing XMLTV file will continue to be served if available.");
    }
  });
}

const server = http.createServer(async (req, res) => {
  const url = new URL(
    req.url || "/",
    `http://${req.headers.host || "localhost"}`
  );

  // Render health check
  if (url.pathname === "/" || url.pathname === "/healthz") {
    const available = await xmlExists();

    res.writeHead(200, {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-cache"
    });

    res.end(
      [
        "Gracenote multi-lineup EPG is running",
        `XMLTV available: ${available}`,
        `Build running: ${building}`,
        `Last build started: ${lastBuildStarted?.toISOString() || "none"}`,
        `Last build finished: ${lastBuildFinished?.toISOString() || "none"}`,
        `Last build successful: ${
          lastBuildSuccessful === null ? "none" : lastBuildSuccessful
        }`
      ].join("\n") + "\n"
    );

    return;
  }

  // XMLTV feed
  if (url.pathname === "/xmltv.xml") {
    try {
      const stat = await fs.stat(XMLTV_FILE);

      res.writeHead(200, {
        "Content-Type": "application/xml; charset=utf-8",
        "Content-Length": stat.size,
        "Cache-Control": "no-cache"
      });

      const stream = createReadStream(XMLTV_FILE);

      stream.on("error", error => {
        console.error("XMLTV stream error:", error);

        if (!res.headersSent) {
          res.writeHead(500);
        }

        res.end();
      });

      stream.pipe(res);
    } catch (error) {
      console.error("XMLTV file unavailable:", error.message);

      res.writeHead(503, {
        "Content-Type": "text/plain; charset=utf-8"
      });

      res.end("XMLTV feed is currently being generated. Try again shortly.\n");
    }

    return;
  }

  res.writeHead(404, {
    "Content-Type": "text/plain; charset=utf-8"
  });

  res.end("Not Found\n");
});

server.listen(PORT, HOST, () => {
  console.log(`Multi-lineup XMLTV server listening on ${HOST}:${PORT}`);
  console.log(`Serving ${XMLTV_FILE} at /xmltv.xml`);

  // Start the build AFTER the server is listening.
  setTimeout(() => {
    rebuildGuide();
  }, 1000);

  // Rebuild every 12 hours.
  setInterval(() => {
    rebuildGuide();
  }, REFRESH_INTERVAL);
});
