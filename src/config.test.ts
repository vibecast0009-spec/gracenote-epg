import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { readFileSync, writeFileSync, existsSync, unlinkSync } from "node:fs";
import { resolve } from "node:path";
import { loadConfig, saveConfig, isConfigReadyForGrab } from "./config.js";
import { DEFAULT_CONFIG } from "./config-schema.js";

const TEST_CONFIG_PATH = resolve(process.cwd(), "config.test.json");

describe("config", () => {
  const origEnv = { ...process.env };
  const origArgv = [...process.argv];

  beforeEach(() => {
    process.argv = ["node", "index.js"];
    delete process.env.GRABBER_CONFIG_PATH;
    if (existsSync(TEST_CONFIG_PATH)) unlinkSync(TEST_CONFIG_PATH);
  });

  afterEach(() => {
    process.env = { ...origEnv };
    process.argv = origArgv;
    if (existsSync(TEST_CONFIG_PATH)) unlinkSync(TEST_CONFIG_PATH);
  });

  it("loadConfig uses DEFAULT_CONFIG when no file", () => {
    process.argv = ["node", "index.js", `--config=${TEST_CONFIG_PATH}`];
    const c = loadConfig();
    expect(c.country).toBe(DEFAULT_CONFIG.country);
    expect(c.lineupId).toBe(DEFAULT_CONFIG.lineupId);
    expect(c.rateLimit.requestDelayMs).toBe(DEFAULT_CONFIG.rateLimit.requestDelayMs);
  });

  it("saveConfig and loadConfig roundtrip", () => {
    process.argv = ["node", "index.js", `--config=${TEST_CONFIG_PATH}`];
    const modified = { ...DEFAULT_CONFIG, country: "USA", postalCode: "90210" };
    saveConfig(modified);
    const c = loadConfig();
    expect(c.country).toBe("USA");
    expect(c.postalCode).toBe("90210");
  });

  it("env override", () => {
    process.argv = ["node", "index.js", `--config=${TEST_CONFIG_PATH}`];
    writeFileSync(TEST_CONFIG_PATH, JSON.stringify({ ...DEFAULT_CONFIG }), "utf-8");
    process.env.COUNTRY = "CAN";
    process.env.POSTAL_CODE = "M5V 1A1";
    const c = loadConfig();
    expect(c.country).toBe("CAN");
    expect(c.postalCode).toBe("M5V 1A1");
  });

  it("CLI override", () => {
    process.argv = ["node", "index.js", `--config=${TEST_CONFIG_PATH}`, "--country=USA", "--postalCode=10001"];
    writeFileSync(TEST_CONFIG_PATH, JSON.stringify({ ...DEFAULT_CONFIG }), "utf-8");
    const c = loadConfig();
    expect(c.country).toBe("USA");
    expect(c.postalCode).toBe("10001");
  });

  it("validate rejects invalid baseUrl", () => {
    process.argv = ["node", "index.js", `--config=${TEST_CONFIG_PATH}`];
    writeFileSync(
      TEST_CONFIG_PATH,
      JSON.stringify({ ...DEFAULT_CONFIG, baseUrl: "not-a-url" }),
      "utf-8"
    );
    expect(() => loadConfig()).toThrow();
  });
});

describe("isConfigReadyForGrab", () => {
  it("returns false for placeholder lineup (REPLACE-WITH-YOUR-*)", () => {
    expect(isConfigReadyForGrab({ ...DEFAULT_CONFIG })).toBe(false);
  });
  it("returns true when lineupId and headendId are set to real values", () => {
    expect(isConfigReadyForGrab({ ...DEFAULT_CONFIG, lineupId: "USA-OTA12345-X", headendId: "OTA12345" })).toBe(true);
    expect(isConfigReadyForGrab({ ...DEFAULT_CONFIG, lineupId: "CAN-ABC-DEFAULT", headendId: "ABC" })).toBe(true);
    expect(isConfigReadyForGrab({ ...DEFAULT_CONFIG, lineupId: "CAN-lineupId-DEFAULT", headendId: "lineupId" })).toBe(true);
  });
});
