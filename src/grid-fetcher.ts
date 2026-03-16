import type { Config } from "./config-schema.js";
import type { GridApiResponse } from "./types.js";
import { buildGridUrl } from "./url-builder.js";

const DEFAULT_TIMEOUT_MS = 30_000;

export async function fetchGrid(
  config: Config,
  time: number,
  timespanHours: number,
  options?: { timeoutMs?: number }
): Promise<GridApiResponse> {
  const url = buildGridUrl(config, time, timespanHours);
  const timeoutMs = options?.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": config.userAgent,
      },
    });
    if (!res.ok) {
      throw new Error(`Grid fetch failed: ${res.status} ${res.statusText}`);
    }
    const data = (await res.json()) as GridApiResponse;
    logResponseShape(data);
    return data;
  } finally {
    clearTimeout(timeout);
  }
}

function logResponseShape(data: GridApiResponse): void {
  const channels = data.channels?.length ?? 0;
  const sample = data.channels?.[0];
  const eventKeys = sample?.events?.[0]
    ? Object.keys(sample.events[0]).join(", ")
    : "none";
  console.error(`[grid] channels=${channels} sample event keys: ${eventKeys}`);
}
