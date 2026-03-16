import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { writeFileSync, unlinkSync, existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { buildXmltv } from "./xmltv.js";
import { emptyCache, saveCache, loadCache } from "./cache.js";
import type { Channel, Event } from "./types.js";

function mkEvent(start: string, id: string): Event {
  return {
    callSign: "X",
    duration: "60",
    startTime: start,
    endTime: new Date(new Date(start).getTime() + 3600 * 1000).toISOString(),
    channelNo: "1",
    filter: [],
    seriesId: "",
    rating: "TV-PG",
    flag: [],
    tags: [],
    thumbnail: "",
    program: {
      title: "Show",
      id,
      tmsId: id,
      shortDesc: "",
      season: "1",
      episode: "1",
      episodeTitle: null,
      seriesId: "",
      isGeneric: "0",
      releaseYear: null,
    },
  };
}

const CACHE_PATH = resolve(process.cwd(), "cache.integration.test.json");

describe("integration: cache persistence and XMLTV", () => {
  afterEach(() => {
    if (existsSync(CACHE_PATH)) unlinkSync(CACHE_PATH);
  });

  it("cache roundtrip and XMLTV structure", () => {
    const data = emptyCache();
    const ch: Channel = {
      channelId: "42",
      callSign: "TEST",
      channelNo: "4.2",
      affiliateName: "Test Net",
      affiliateCallSign: null,
      id: "42",
      stationGenres: [],
      stationFilters: [],
      thumbnail: "",
      events: [
        mkEvent("2025-06-01T18:00:00Z", "EP1"),
        mkEvent("2025-06-01T19:00:00Z", "EP2"),
      ],
    };
    data.channels = [ch];
    data.meta.windowEnd = Math.floor(new Date("2025-06-02T00:00:00Z").getTime() / 1000);
    saveCache(CACHE_PATH, data);

    const loaded = loadCache(CACHE_PATH);
    expect(loaded).not.toBeNull();
    expect(loaded!.channels.length).toBe(1);
    expect(loaded!.channels[0]!.events.length).toBe(2);

    const xml = buildXmltv({ channels: loaded!.channels });
    expect(xml).toContain("<tv ");
    expect(xml).toContain('<channel id="42">');
    expect(xml).toContain("<programme ");
    expect(xml).toContain("20250601180000 +0000");
    expect(xml).toContain("</tv>");
  });
});
