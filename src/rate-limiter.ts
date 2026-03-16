import type { Config } from "./config-schema.js";

export interface RateLimiter {
  wait(): Promise<void>;
}

export function createRateLimiter(config: Config): RateLimiter {
  const delayMs = config.rateLimit.requestDelayMs;
  const maxPerMinute = config.rateLimit.maxRequestsPerMinute;
  const timestamps: number[] = [];

  return {
    async wait(): Promise<void> {
      const now = Date.now();
      const cutoff = now - 60_000;
      while (timestamps.length > 0 && timestamps[0]! < cutoff) {
        timestamps.shift();
      }
      if (timestamps.length >= maxPerMinute) {
        const waitUntil = timestamps[0]! + 60_000 - now;
        await sleep(Math.max(waitUntil, delayMs));
        return this.wait();
      }
      if (timestamps.length > 0) {
        const last = timestamps[timestamps.length - 1]!;
        const elapsed = now - last;
        if (elapsed < delayMs) await sleep(delayMs - elapsed);
      }
      timestamps.push(Date.now());
    },
  };
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}
