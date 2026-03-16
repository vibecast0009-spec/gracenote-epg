import { describe, it, expect } from "vitest";
import {
  escapeXml,
  formatDate,
  buildChannelsXml,
  buildProgramsXml,
  buildXmltv,
} from "./xmltv.js";
import type { GridApiResponse } from "./types.js";

describe("escapeXml", () => {
  it("escapes & < > \" '", () => {
    expect(escapeXml("a & b")).toBe("a &amp; b");
    expect(escapeXml("<tag>")).toBe("&lt;tag&gt;");
    expect(escapeXml('"x"')).toBe("&quot;x&quot;");
  });
});

describe("formatDate", () => {
  it("formats ISO date to XMLTV", () => {
    expect(formatDate("2025-07-18T19:00:00Z")).toBe("20250718190000 +0000");
  });
});

const minimalGrid: GridApiResponse = {
  channels: [
    {
      channelId: "1",
      callSign: "ABC",
      channelNo: "4.1",
      affiliateName: "Test",
      affiliateCallSign: null,
      id: "1",
      stationGenres: [],
      stationFilters: [],
      thumbnail: "",
      events: [
        {
          callSign: "ABC",
          duration: "60",
          startTime: "2025-07-18T19:00:00Z",
          endTime: "2025-07-18T20:00:00Z",
          channelNo: "4.1",
          filter: [],
          seriesId: "",
          rating: "TV-PG",
          flag: [],
          tags: [],
          thumbnail: "",
          program: {
            title: "Show",
            id: "EP1",
            tmsId: "EP1",
            shortDesc: "Desc",
            season: "1",
            episode: "1",
            episodeTitle: null,
            seriesId: "",
            isGeneric: "0",
            releaseYear: null,
          },
        },
      ],
    },
  ],
};

describe("buildXmltv", () => {
  it("produces valid root and channel", () => {
    const xml = buildXmltv(minimalGrid);
    expect(xml).toContain('<?xml version="1.0" encoding="UTF-8"?>');
    expect(xml).toContain("<tv ");
    expect(xml).toContain("zap2tvheadend");
    expect(xml).toContain('<channel id="1">');
    expect(xml).toContain("<display-name>ABC</display-name>");
    expect(xml).toContain("<programme ");
    expect(xml).toContain("20250718190000 +0000");
    expect(xml).toContain("<title>Show</title>");
    expect(xml).toContain("</tv>");
  });
});
