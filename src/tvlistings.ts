import type { Config } from "./config-schema.js";
import type { GridApiResponse } from "./types.js";
import { fetchGrid } from "./grid-fetcher.js";
import type { RateLimiter } from "./rate-limiter.js";
import {
  loadCache,
  saveCache,
  emptyCache,
  mergeChannels,
  replaceEventsInWindow,
  eventsInWindow,
  sameEventsInWindow,
  chunkStart6h,
  chunkEnd6h,
  type CacheData,
} from "./cache.js";

const SIX_HOURS = 6 * 3600;
const MAX_FULL_HOURS = 24;
const CHUNK_HOURS = 6;

async function fetchWithRetries(
  config: Config,
  time: number,
  timespanHours: number,
  limiter: RateLimiter,
  retries = 3
): Promise<GridApiResponse> {
  let last: Error | null = null;
  for (let i = 0; i < retries; i++) {
    await limiter.wait();
    try {
      return await fetchGrid(config, time, timespanHours);
    } catch (e) {
      last = e instanceof Error ? e : new Error(String(e));
      if (i < retries - 1) await new Promise((r) => setTimeout(r, 1000 * (i + 1)));
    }
  }
  throw last ?? new Error("fetch failed");
}

/** Full fill: fetch 24+ hours in chunks, merge, persist. Returns cache data. */
export async function fullFill(
  config: Config,
  limiter: RateLimiter
): Promise<CacheData> {
  const now = Math.floor(Date.now() / 1000);
  const start = chunkStart6h(now);
  const totalHours = Math.min(MAX_FULL_HOURS, 24);
  let data: CacheData = emptyCache();
  data.meta.windowStart = start;
  data.meta.windowEnd = start;

  for (let offset = 0; offset < totalHours; offset += CHUNK_HOURS) {
    const t = start + offset * 3600;
    const grid = await fetchWithRetries(config, t, CHUNK_HOURS, limiter);
    mergeChannels(data.channels, grid);
    data.meta.windowEnd = t + SIX_HOURS;
  }
  data.meta.updatedAt = Math.floor(Date.now() / 1000);
  saveCache(config.cacheFile, data);
  return data;
}

/** Fetch head 6h (from now), diff with cache, merge if changed. Returns true if cache was updated. */
export async function fetchHead6h(
  config: Config,
  data: CacheData,
  limiter: RateLimiter
): Promise<boolean> {
  const now = Math.floor(Date.now() / 1000);
  const headStart = chunkStart6h(now);
  const headEnd = chunkEnd6h(headStart);

  const grid = await fetchWithRetries(config, headStart, CHUNK_HOURS, limiter);

  let changed = false;
  for (const ch of grid.channels) {
    const existing = data.channels.find((c) => c.channelId === ch.channelId);
    const cached = existing ? eventsInWindow(existing.events, headStart, headEnd) : [];
    const newEv = ch.events;
    if (!sameEventsInWindow(cached as { startTime: string; program: { id: string } }[], newEv)) {
      changed = true;
      break;
    }
  }
  if (changed) replaceEventsInWindow(data, headStart, headEnd, grid);
  return changed;
}

/** Fetch tail 6h at end of cache window and merge. */
export async function fetchTail6h(
  config: Config,
  data: CacheData,
  limiter: RateLimiter
): Promise<void> {
  const tailStart = data.meta.windowEnd;
  await limiter.wait();
  const grid = await fetchWithRetries(config, tailStart, CHUNK_HOURS, limiter);
  mergeChannels(data.channels, grid);
  data.meta.windowEnd = tailStart + SIX_HOURS;
  data.meta.updatedAt = Math.floor(Date.now() / 1000);
}

/** Load cache or return null. */
export function loadCacheData(config: Config): CacheData | null {
  return loadCache(config.cacheFile);
}

/** Run incremental: head 6h + tail 6h, optionally full fill if empty. Returns true if cache dirty. */
export async function runIncremental(
  config: Config,
  limiter: RateLimiter
): Promise<{ dirty: boolean; data: CacheData }> {
  let data = loadCache(config.cacheFile);
  if (!data || data.channels.length === 0) {
    data = await fullFill(config, limiter);
    return { dirty: true, data };
  }
  const headChanged = await fetchHead6h(config, data, limiter);
  await fetchTail6h(config, data, limiter);
  saveCache(config.cacheFile, data);
  return { dirty: headChanged, data };
}

/** Run full: refill cache from scratch (24h). */
export async function runFull(config: Config, limiter: RateLimiter): Promise<CacheData> {
  const data = await fullFill(config, limiter);
  saveCache(config.cacheFile, data);
  return data;
}
