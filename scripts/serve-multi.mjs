import http from "node:http";
import { createReadStream, promises as fs } from "node:fs";

const PORT = Number(process.env.PORT || 8766);
const HOST = "0.0.0.0";
const XMLTV_FILE = process.env.XMLTV_FILE || "/data/xmltv.xml";

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url || "/", `http://${req.headers.host || "localhost"}`);

  // Health check
  if (url.pathname === "/" || url.pathname === "/healthz") {
    res.writeHead(200, {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-cache"
    });
    res.end("Gracenote multi-lineup EPG is running\n");
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

      res.end("XMLTV feed is not ready\n");
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
});
