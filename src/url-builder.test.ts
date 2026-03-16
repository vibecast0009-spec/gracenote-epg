import { describe, it, expect } from "vitest";
import { buildGridUrl } from "./url-builder.js";
import { DEFAULT_CONFIG } from "./config-schema.js";

describe("url-builder", () => {
  it("includes all params and encodes pref", () => {
    const config = { ...DEFAULT_CONFIG, pref: "16,128" };
    const url = buildGridUrl(config, 1773671400, 3);
    expect(url).toContain("lineupId=CAN-lineupId-DEFAULT");
    expect(url).toContain("timespan=3");
    expect(url).toContain("headendId=lineupId");
    expect(url).toContain("country=CAN");
    expect(url).toContain("device=-");
    expect(url).toContain("postalCode=A1A1A1");
    expect(url).toContain("isOverride=true");
    expect(url).toContain("time=1773671400");
    expect(url).toContain("pref=16%2C128");
    expect(url).toContain("userId=-");
    expect(url).toContain("aid=orbebb");
    expect(url).toContain("languagecode=en-us");
  });

  it("uses empty timezone when set empty", () => {
    const config = { ...DEFAULT_CONFIG, timezone: "" };
    const url = buildGridUrl(config, 1000, 6);
    expect(url).toContain("timezone=");
  });
});
