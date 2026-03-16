import { createServer } from "node:http";
import type { Config } from "./config-schema.js";
import { loadConfig, saveConfig } from "./config.js";
import { DEFAULT_CONFIG } from "./config-schema.js";
import { getConfigFormHtml } from "./web-ui.html.js";

function send(res: import("node:http").ServerResponse, status: number, body: string, contentType: string): void {
  res.writeHead(status, { "Content-Type": contentType });
  res.end(body);
}

function sendJson(res: import("node:http").ServerResponse, status: number, data: unknown): void {
  send(res, status, JSON.stringify(data), "application/json");
}

export function startWebServer(port: number): void {
  const server = createServer(async (req, res) => {
    const url = req.url ?? "/";
    if (req.method === "GET" && (url === "/" || url === "/index.html")) {
      send(res, 200, getConfigFormHtml(), "text/html; charset=utf-8");
      return;
    }
    if (req.method === "GET" && url === "/api/config") {
      try {
        const config = loadConfig();
        sendJson(res, 200, config);
      } catch (e) {
        sendJson(res, 500, { ok: false, error: String(e) });
      }
      return;
    }
    if (req.method === "POST" && url === "/api/config") {
      let body = "";
      for await (const chunk of req) body += chunk;
      try {
        const parsed = JSON.parse(body) as Partial<Config>;
        const merged: Config = { ...DEFAULT_CONFIG, ...parsed };
        if (parsed.rateLimit && typeof parsed.rateLimit === "object") {
          merged.rateLimit = { ...DEFAULT_CONFIG.rateLimit, ...parsed.rateLimit };
        }
        if (merged.rateLimit.requestDelayMs < 0 || merged.rateLimit.maxRequestsPerMinute < 1) {
          sendJson(res, 400, { ok: false, error: "Invalid rateLimit" });
          return;
        }
        if (merged.webUiPort < 0 || merged.webUiPort > 65535) {
          sendJson(res, 400, { ok: false, error: "Invalid webUiPort" });
          return;
        }
        const h = merged.scheduleWindowHours ?? 24;
        if (!Number.isFinite(h) || h < 1 || h > 168) {
          sendJson(res, 400, { ok: false, error: "scheduleWindowHours must be 1–168" });
          return;
        }
        saveConfig(merged);
        sendJson(res, 200, { ok: true });
      } catch (e) {
        sendJson(res, 400, { ok: false, error: String(e) });
      }
      return;
    }
    send(res, 404, "Not Found", "text/plain");
  });

  const host = "0.0.0.0";
  server.listen(port, host, () => {
    console.error(`Web config UI: http://localhost:${port}/ (listening on ${host})`);
  });
}
