/**
 * Config file schema for Gracenote grid API and app behaviour.
 * All grid URL parameters are configurable; defaults match the canonical browser URL.
 */
export interface GridConfig {
  /** e.g. CAN-lineupId-DEFAULT */
  lineupId: string;
  /** Hours per request (e.g. 3 or 6) */
  timespan: string;
  /** e.g. lineupId */
  headendId: string;
  /** USA | CAN */
  country: string;
  /** Timezone (can be empty) */
  timezone: string;
  /** e.g. - or X */
  device: string;
  /** Postal/zip code */
  postalCode: string;
  /** true | false */
  isOverride: string;
  /** e.g. 16,128 (comma-separated, no spaces in value) */
  pref: string;
  /** e.g. - */
  userId: string;
  /** e.g. orbebb */
  aid: string;
  /** e.g. en-us */
  languagecode: string;
}

export interface RateLimitConfig {
  /** Min delay between API requests in ms */
  requestDelayMs: number;
  /** Max requests per minute */
  maxRequestsPerMinute: number;
}

export interface AppConfig {
  /** Base URL for grid API (no query string) */
  baseUrl: string;
  /** User-Agent for HTTP requests */
  userAgent: string;
  /** Path to write live XMLTV output */
  outputFile: string;
  /** Path to cache file (rolling 24h JSON) */
  cacheFile: string;
  /** Directory for daily archive XMLTV files (YYYY-MM-DD.xml) */
  archiveDir: string;
  /** Rate limiting */
  rateLimit: RateLimitConfig;
  /** Web config UI port (0 = disabled) */
  webUiPort: number;
  /** Port for serving xmltv.xml (--serve mode, for tvheadend URL) */
  servePort: number;
}

export type Config = GridConfig & AppConfig;

/** Defaults matching canonical URL: CAN, A1A1A1, device=-, pref=16,128, languagecode=en-us */
export const DEFAULT_CONFIG: Config = {
  baseUrl: "https://tvlistings.gracenote.com/api/grid",
  userAgent:
    "Mozilla/5.0 (Windows NT 10.0; rv:109.0) Gecko/20100101 Firefox/115.0",
  lineupId: "CAN-lineupId-DEFAULT",
  timespan: "3",
  headendId: "lineupId",
  country: "CAN",
  timezone: "",
  device: "-",
  postalCode: "A1A1A1",
  isOverride: "true",
  pref: "16,128",
  userId: "-",
  aid: "orbebb",
  languagecode: "en-us",
  outputFile: "xmltv.xml",
  cacheFile: "cache.json",
  archiveDir: "archive",
  rateLimit: {
    requestDelayMs: 1500,
    maxRequestsPerMinute: 20,
  },
  webUiPort: 8765,
  servePort: 8766,
};
