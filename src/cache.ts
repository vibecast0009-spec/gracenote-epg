import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import type { Channel, GridApiResponse } from "./types.js";

export interface CacheMeta {
  /** Unix sec: start of cached window */
  windowStart: number;
  /** Unix sec: end of cached window */
  windowEnd: number;
  /** When cache was last updated */
  updatedAt: number;
}

export interface CacheData {
  meta: CacheMeta;
  channels: Channel[];
}

const SIX_HOURS = 6 * 3600;

export function emptyCache(): CacheData {
  const now = Math.floor(Date.now() / 1000);
  return {
    meta: {
      windowStart: now,
      windowEnd: now,
      updatedAt: now,
    },
    channels: [],
  };
}

export function gridToCacheData(grid: GridApiResponse, windowStart: number, windowEnd: number): CacheData {
  return {
    meta: {
      windowStart,
      windowEnd,
      updatedAt: Math.floor(Date.now() / 1000),
    },
    channels: grid.channels.map((c) => ({ ...c, events: [...c.events] })),
  };
}

export function loadCache(cachePath: string): CacheData | null {
  const path = resolve(cachePath);
  if (!existsSync(path)) return null;
  const raw = readFileSync(path, "utf-8");
  const data = JSON.parse(raw) as CacheData;
  if (!data.meta || !Array.isArray(data.channels)) return null;
  return data;
}

export function saveCache(cachePath: string, data: CacheData): void {
  const path = resolve(cachePath);
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, JSON.stringify(data, null, 0), "utf-8");
}

/** Merge channels from `grid` into `channels` by channelId; append events. */
export function mergeChannels(channels: Channel[], grid: GridApiResponse): void {
  for (const ch of grid.channels) {
    const existing = channels.find((c) => c.channelId === ch.channelId);
    if (!existing) {
      channels.push({ ...ch, events: [...ch.events] });
    } else {
      existing.events.push(...ch.events);
      existing.events.sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
    }
  }
}

/** Return events in [startSec, endSec) for a channel (by startTime). */
export function eventsInWindow(events: { startTime: string }[], startSec: number, endSec: number): { startTime: string }[] {
  return events.filter((e) => {
    const t = Math.floor(new Date(e.startTime).getTime() / 1000);
    return t >= startSec && t < endSec;
  });
}

/** Compare two event sets in a time window by (startTime, program.id); return true if same. */
export function sameEventsInWindow(
  a: { startTime: string; program: { id: string } }[],
  b: { startTime: string; program: { id: string } }[]
): boolean {
  if (a.length !== b.length) return false;
  const key = (e: { startTime: string; program: { id: string } }) => `${e.startTime}\t${e.program?.id ?? ""}`;
  const setA = new Set(a.map(key));
  for (const e of b) {
    if (!setA.has(key(e))) return false;
  }
  return true;
}

/** Get start of 6h chunk containing time (aligned to 0 mod 6h from some epoch). We align to midnight UTC for simplicity. */
export function chunkStart6h(unixSec: number): number {
  const d = new Date(unixSec * 1000);
  const dayStart = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()) / 1000;
  const hour = Math.floor((unixSec - dayStart) / 3600);
  const chunkHour = Math.floor(hour / 6) * 6;
  return dayStart + chunkHour * 3600;
}

export function chunkEnd6h(startSec: number): number {
  return startSec + SIX_HOURS;
}

/** Replace events in [startSec, endSec) with events from grid (per channel). Updates data in place. */
export function replaceEventsInWindow(
  data: CacheData,
  startSec: number,
  endSec: number,
  grid: GridApiResponse
): void {
  for (const ch of grid.channels) {
    const existing = data.channels.find((c) => c.channelId === ch.channelId);
    const newInWindow = ch.events.filter((e) => {
      const t = Math.floor(new Date(e.startTime).getTime() / 1000);
      return t >= startSec && t < endSec;
    });
    if (!existing) {
      data.channels.push({ ...ch, events: newInWindow });
      continue;
    }
    existing.events = existing.events.filter((e) => {
      const t = Math.floor(new Date(e.startTime).getTime() / 1000);
      return t < startSec || t >= endSec;
    });
    existing.events.push(...newInWindow);
    existing.events.sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
  }
  data.meta.updatedAt = Math.floor(Date.now() / 1000);
}
