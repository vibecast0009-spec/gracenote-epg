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
  type CacheData,
} from "./cache.js";

const SIX_HOURS = 6 * 3600;
const CHUNK_HOURS = 6;

function getScheduleWindowHours(config: Config): number {
  const h = config.scheduleWindowHours ?? 24;
  return Math.max(1, Math.min(168, Math.floor(h)));
}

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

/** Full fill: fetch up to scheduleWindowHours in 6h chunks, merge, persist. --full uses config max. */
export async function fullFill(
  config: Config,
  limiter: RateLimiter
): Promise<CacheData> {
  const now = Math.floor(Date.now() / 1000);
  const start = chunkStart6h(now);
  const totalHours = getScheduleWindowHours(config);
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

/** Fetch head window (at least half of scheduleWindowHours from now), diff with cache, replace if changed. Returns true if cache was updated. */
export async function fetchHead(
  config: Config,
  data: CacheData,
  limiter: RateLimiter
): Promise<boolean> {
  const now = Math.floor(Date.now() / 1000);
  const windowHours = getScheduleWindowHours(config);
  const headHours = Math.max(CHUNK_HOURS, Math.ceil(windowHours / 2));
  const numHeadChunks = Math.ceil(headHours / CHUNK_HOURS);
  const headStart = chunkStart6h(now);
  const headEnd = headStart + numHeadChunks * SIX_HOURS;

  const mergedChannels: typeof data.channels = [];
  for (let i = 0; i < numHeadChunks; i++) {
    const t = headStart + i * SIX_HOURS;
    const grid = await fetchWithRetries(config, t, CHUNK_HOURS, limiter);
    mergeChannels(mergedChannels, grid);
  }
  const mergedGrid = { channels: mergedChannels };

  let changed = false;
  for (const ch of mergedGrid.channels) {
    const existing = data.channels.find((c) => c.channelId === ch.channelId);
    const cached = existing ? eventsInWindow(existing.events, headStart, headEnd) : [];
    const newEv = ch.events;
    if (!sameEventsInWindow(cached as { startTime: string; program: { id: string } }[], newEv)) {
      changed = true;
      break;
    }
  }
  if (changed) replaceEventsInWindow(data, headStart, headEnd, mergedGrid);
  return changed;
}

/** Fetch tail 6h chunks at end of cache until window covers scheduleWindowHours from now. */
export async function fetchTail(
  config: Config,
  data: CacheData,
  limiter: RateLimiter
): Promise<void> {
  const now = Math.floor(Date.now() / 1000);
  const targetEnd = now + getScheduleWindowHours(config) * 3600;
  while (data.meta.windowEnd < targetEnd) {
    const tailStart = data.meta.windowEnd;
    await limiter.wait();
    const grid = await fetchWithRetries(config, tailStart, CHUNK_HOURS, limiter);
    mergeChannels(data.channels, grid);
    data.meta.windowEnd = tailStart + SIX_HOURS;
    data.meta.updatedAt = Math.floor(Date.now() / 1000);
  }
}

/** Load cache or return null. */
export function loadCacheData(config: Config): CacheData | null {
  return loadCache(config.cacheFile);
}

/** Run incremental: refresh at least half the schedule window (head) and extend tail to full window. Returns true if cache dirty. */
export async function runIncremental(
  config: Config,
  limiter: RateLimiter
): Promise<{ dirty: boolean; data: CacheData }> {
  let data = loadCache(config.cacheFile);
  if (!data || data.channels.length === 0) {
    data = await fullFill(config, limiter);
    return { dirty: true, data };
  }
  const headChanged = await fetchHead(config, data, limiter);
  await fetchTail(config, data, limiter);
  saveCache(config.cacheFile, data);
  return { dirty: headChanged, data };
}

/** Run full: refill cache from scratch up to config.scheduleWindowHours (max 7 days). */
export async function runFull(config: Config, limiter: RateLimiter): Promise<CacheData> {
  const data = await fullFill(config, limiter);
  saveCache(config.cacheFile, data);
  return data;
}
