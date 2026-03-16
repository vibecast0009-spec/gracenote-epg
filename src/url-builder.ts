import type { Config } from "./config-schema.js";

/**
 * Build grid API URL from config, matching exact browser URL.
 * time = Unix timestamp for start of window; timespan = hours for that request.
 */
export function buildGridUrl(config: Config, time: number, timespanHours: number): string {
  const params: Record<string, string> = {
    lineupId: config.lineupId,
    timespan: String(timespanHours),
    headendId: config.headendId,
    country: config.country,
    timezone: config.timezone ?? "",
    device: config.device,
    postalCode: config.postalCode,
    isOverride: config.isOverride,
    time: String(time),
    pref: config.pref,
    userId: config.userId,
    aid: config.aid,
    languagecode: config.languagecode,
  };
  const search = new URLSearchParams(params).toString();
  return `${config.baseUrl}?${search}`;
}
