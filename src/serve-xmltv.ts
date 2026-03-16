import { createServer } from "node:http";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

/**
 * Start a minimal HTTP server that serves the XMLTV file at GET /xmltv.xml (and GET /).
 * For tvheadend URL-based EPG import.
 */
export function startServeXmltv(outputFile: string, port: number, host = "0.0.0.0"): void {
  const path = resolve(outputFile);
  const server = createServer((req, res) => {
    const url = req.url ?? "/";
    if ((req.method === "GET" && url === "/xmltv.xml") || (req.method === "GET" && url === "/")) {
      if (!existsSync(path)) {
        res.writeHead(404, { "Content-Type": "text/plain" });
        res.end("xmltv.xml not found (run grab first)");
        return;
      }
      const xml = readFileSync(path, "utf-8");
      res.writeHead(200, { "Content-Type": "application/xml" });
      res.end(xml);
      return;
    }
    res.writeHead(404);
    res.end();
  });
  server.listen(port, host, () => {
    console.error(`Serving XMLTV at http://${host}:${port}/xmltv.xml`);
  });
}
