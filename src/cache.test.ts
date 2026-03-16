import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { unlinkSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import {
  emptyCache,
  loadCache,
  saveCache,
  mergeChannels,
  eventsInWindow,
  sameEventsInWindow,
  replaceEventsInWindow,
  chunkStart6h,
  chunkEnd6h,
} from "./cache.js";
import type { Channel, Event, GridApiResponse } from "./types.js";

const CACHE_PATH = resolve(process.cwd(), "cache.test.json");

function mkEvent(startTime: string, programId: string): Event {
  return {
    callSign: "X",
    duration: "60",
    startTime,
    endTime: new Date(new Date(startTime).getTime() + 3600 * 1000).toISOString(),
    channelNo: "1",
    filter: [],
    seriesId: "",
    rating: "",
    flag: [],
    tags: [],
    thumbnail: "",
    program: {
      title: "P",
      id: programId,
      tmsId: programId,
      shortDesc: "",
      season: "0",
      episode: "0",
      episodeTitle: null,
      seriesId: "",
      isGeneric: "0",
      releaseYear: null,
    },
  };
}

describe("cache", () => {
  afterEach(() => {
    if (existsSync(CACHE_PATH)) unlinkSync(CACHE_PATH);
  });

  it("emptyCache has empty channels", () => {
    const c = emptyCache();
    expect(c.channels).toEqual([]);
    expect(c.meta.windowStart).toBeLessThanOrEqual(Date.now() / 1000 + 1);
  });

  it("save and load roundtrip", () => {
    const data = emptyCache();
    data.channels = [
      { channelId: "1", callSign: "A", channelNo: "1", events: [], affiliateName: "", affiliateCallSign: null, id: "1", stationGenres: [], stationFilters: [], thumbnail: "" },
    ];
    saveCache(CACHE_PATH, data);
    const loaded = loadCache(CACHE_PATH);
    expect(loaded?.channels.length).toBe(1);
    expect(loaded?.channels[0]?.channelId).toBe("1");
  });

  it("mergeChannels appends events by channelId", () => {
    const channels: Channel[] = [];
    const grid1: GridApiResponse = {
      channels: [
        { channelId: "1", callSign: "A", channelNo: "1", events: [mkEvent("2025-01-01T10:00:00Z", "EP1")], affiliateName: "", affiliateCallSign: null, id: "1", stationGenres: [], stationFilters: [], thumbnail: "" },
      ],
    };
    const grid2: GridApiResponse = {
      channels: [
        { channelId: "1", callSign: "A", channelNo: "1", events: [mkEvent("2025-01-01T12:00:00Z", "EP2")], affiliateName: "", affiliateCallSign: null, id: "1", stationGenres: [], stationFilters: [], thumbnail: "" },
      ],
    };
    mergeChannels(channels, grid1);
    mergeChannels(channels, grid2);
    expect(channels.length).toBe(1);
    expect(channels[0]!.events.length).toBe(2);
  });

  it("eventsInWindow filters by time", () => {
    const events = [
      mkEvent("2025-01-01T10:00:00Z", "a"),
      mkEvent("2025-01-01T14:00:00Z", "b"),
    ];
    const start = Math.floor(new Date("2025-01-01T12:00:00Z").getTime() / 1000);
    const end = start + 6 * 3600;
    const inWindow = eventsInWindow(events, start, end);
    expect(inWindow.length).toBe(1);
    expect(inWindow[0]!.program?.id ?? (inWindow[0] as Event).program.id).toBe("b");
  });

  it("sameEventsInWindow", () => {
    const a = [mkEvent("2025-01-01T10:00:00Z", "EP1")];
    const b = [mkEvent("2025-01-01T10:00:00Z", "EP1")];
    expect(sameEventsInWindow(a, b)).toBe(true);
    const c = [mkEvent("2025-01-01T10:00:00Z", "EP2")];
    expect(sameEventsInWindow(a, c)).toBe(false);
  });

  it("chunkStart6h aligns to 6h", () => {
    const t = Math.floor(new Date("2025-01-01T13:00:00Z").getTime() / 1000);
    const start = chunkStart6h(t);
    expect(start).toBe(Math.floor(new Date("2025-01-01T12:00:00Z").getTime() / 1000));
  });
});
