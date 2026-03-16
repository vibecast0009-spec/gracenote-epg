import { mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import type { Config } from "./config-schema.js";
import { DEFAULT_CONFIG } from "./config-schema.js";

const CONFIG_FILE_ENV = "GRABBER_CONFIG_PATH";
const CONFIG_FILE_CLI_FLAG = "--config=";

function getConfigFilePath(): string {
  const envPath = process.env[CONFIG_FILE_ENV];
  if (envPath) return resolve(envPath);
  const cli = process.argv.find((a) => a.startsWith(CONFIG_FILE_CLI_FLAG));
  if (cli) return resolve(cli.slice(CONFIG_FILE_CLI_FLAG.length));
  return resolve(process.cwd(), "config.json");
}

function parseEnvOrCli(key: string, envKey: string): string | undefined {
  const env = process.env[envKey];
  if (env !== undefined && env !== "") return env;
  const flag = `--${key}=`;
  const arg = process.argv.find((a) => a.startsWith(flag));
  return arg?.slice(flag.length);
}

function applyOverrides(config: Config): Config {
  const out = { ...config };
  const s = (v: string | undefined, def: string) => (v !== undefined && v !== "" ? v : def);
  const n = (v: string | undefined, def: number) => (v !== undefined && v !== "" ? Number(v) : def);
  out.lineupId = s(parseEnvOrCli("lineupId", "LINEUP_ID"), config.lineupId);
  out.timespan = s(parseEnvOrCli("timespan", "TIMESPAN"), config.timespan);
  out.headendId = s(parseEnvOrCli("headendId", "HEADEND_ID"), config.headendId);
  out.country = s(parseEnvOrCli("country", "COUNTRY"), config.country);
  out.timezone = s(parseEnvOrCli("timezone", "TZ") ?? process.env.TZ, config.timezone);
  out.device = s(parseEnvOrCli("device", "DEVICE"), config.device);
  out.postalCode = s(parseEnvOrCli("postalCode", "POSTAL_CODE"), config.postalCode);
  out.pref = s(parseEnvOrCli("pref", "PREF"), config.pref);
  out.userId = s(parseEnvOrCli("userId", "USER_ID"), config.userId);
  out.aid = s(parseEnvOrCli("aid", "AID"), config.aid);
  out.languagecode = s(parseEnvOrCli("languagecode", "LANGUAGE_CODE"), config.languagecode);
  out.outputFile = s(parseEnvOrCli("outputFile", "OUTPUT_FILE"), config.outputFile);
  out.cacheFile = s(parseEnvOrCli("cacheFile", "CACHE_FILE"), config.cacheFile);
  out.archiveDir = s(parseEnvOrCli("archiveDir", "ARCHIVE_DIR"), config.archiveDir);
  out.userAgent = s(parseEnvOrCli("userAgent", "USER_AGENT"), config.userAgent);
  const delay = parseEnvOrCli("requestDelayMs", "REQUEST_DELAY_MS");
  const rpm = parseEnvOrCli("maxRequestsPerMinute", "MAX_REQUESTS_PER_MINUTE");
  out.rateLimit = {
    requestDelayMs: n(delay, config.rateLimit.requestDelayMs),
    maxRequestsPerMinute: n(rpm, config.rateLimit.maxRequestsPerMinute),
  };
  const port = parseEnvOrCli("webUiPort", "WEB_UI_PORT");
  out.webUiPort = n(port, config.webUiPort);
  const servePort = parseEnvOrCli("servePort", "SERVE_PORT");
  out.servePort = n(servePort, config.servePort ?? 8766);
  return out;
}

function validate(config: Config): void {
  if (!config.baseUrl || !config.baseUrl.startsWith("http")) {
    throw new Error("config.baseUrl must be a valid HTTP(S) URL");
  }
  if (config.rateLimit.requestDelayMs < 0 || config.rateLimit.maxRequestsPerMinute < 1) {
    throw new Error("config.rateLimit values must be positive");
  }
  if (config.webUiPort < 0 || config.webUiPort > 65535) {
    throw new Error("config.webUiPort must be 0-65535");
  }
}

/** True if lineup looks configured (not the default placeholder). */
export function isConfigReadyForGrab(config: Config): boolean {
  const id = (config.lineupId || "").trim();
  const headend = (config.headendId || "").trim();
  if (!id || id.includes("lineupId") || headend === "lineupId") return false;
  return true;
}

export function loadConfig(): Config {
  const path = getConfigFilePath();
  let config: Config;
  if (existsSync(path)) {
    const raw = readFileSync(path, "utf-8");
    const parsed = JSON.parse(raw) as Partial<Config>;
    config = { ...DEFAULT_CONFIG, ...parsed };
    if (parsed.rateLimit && typeof parsed.rateLimit === "object") {
      config.rateLimit = { ...DEFAULT_CONFIG.rateLimit, ...parsed.rateLimit };
    }
  } else {
    config = { ...DEFAULT_CONFIG };
  }
  config = applyOverrides(config);
  validate(config);
  return config;
}

export function saveConfig(config: Config): void {
  const path = getConfigFilePath();
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, JSON.stringify(config, null, 2), "utf-8");
}

export function getConfigFilePathPublic(): string {
  return getConfigFilePath();
}
