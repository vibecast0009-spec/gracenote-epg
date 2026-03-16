import { describe, it, expect } from "vitest";
import {
  escapeXml,
  formatDate,
  normalizeImageUrl,
  TMS_IMAGE_BASE,
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

describe("normalizeImageUrl", () => {
  it("rewrites zap2it.tmsimg.com to zpmc.tmsimg.com", () => {
    expect(
      normalizeImageUrl("https://zap2it.tmsimg.com/assets/p123.jpg")
    ).toBe("https://zpmc.tmsimg.com/assets/p123.jpg");
  });
  it("rewrites protocol-relative zap2it URL to https zpmc", () => {
    expect(normalizeImageUrl("//zap2it.tmsimg.com/h3/NowShowing/1.png")).toBe(
      "https://zpmc.tmsimg.com/h3/NowShowing/1.png"
    );
  });
  it("leaves zpmc URLs unchanged", () => {
    const url = "https://zpmc.tmsimg.com/assets/p456.jpg";
    expect(normalizeImageUrl(url)).toBe(url);
  });
});

describe("TMS_IMAGE_BASE", () => {
  it("is zpmc.tmsimg.com", () => {
    expect(TMS_IMAGE_BASE).toBe("https://zpmc.tmsimg.com");
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

  it("uses zpmc.tmsimg.com for event thumbnail and contains no zap2it.tmsimg.com", () => {
    const gridWithThumb: GridApiResponse = {
      channels: [
        {
          ...minimalGrid.channels[0]!,
          events: [
            {
              ...minimalGrid.channels[0]!.events[0]!,
              thumbnail: "p20962079_b_v13_ac",
            },
          ],
        },
      ],
    };
    const xml = buildXmltv(gridWithThumb);
    expect(xml).toContain("zpmc.tmsimg.com/assets/p20962079_b_v13_ac.jpg");
    expect(xml).not.toContain("zap2it.tmsimg.com");
  });

  it("rewrites channel thumbnail from zap2it to zpmc when present", () => {
    const gridWithChannelThumb: GridApiResponse = {
      channels: [
        {
          ...minimalGrid.channels[0]!,
          thumbnail: "//zap2it.tmsimg.com/h3/NowShowing/42.png?w=55",
        },
      ],
    };
    const xml = buildXmltv(gridWithChannelThumb);
    expect(xml).toContain("zpmc.tmsimg.com/h3/NowShowing/42.png");
    expect(xml).not.toContain("zap2it.tmsimg.com");
  });

  it("rewrites full event thumbnail URL from zap2it to zpmc", () => {
    const gridWithFullUrlThumb: GridApiResponse = {
      channels: [
        {
          ...minimalGrid.channels[0]!,
          events: [
            {
              ...minimalGrid.channels[0]!.events[0]!,
              thumbnail:
                "https://zap2it.tmsimg.com/assets/p16370325_e_v13_aa.jpg",
            },
          ],
        },
      ],
    };
    const xml = buildXmltv(gridWithFullUrlThumb);
    expect(xml).toContain("zpmc.tmsimg.com/assets/p16370325_e_v13_aa.jpg");
    expect(xml).not.toContain("zap2it.tmsimg.com");
  });
});
