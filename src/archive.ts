import { writeFileSync, mkdirSync, existsSync } from "node:fs";
import { join, resolve } from "node:path";
import type { Channel, Event } from "./types.js";
import { buildXmltv } from "./xmltv.js";

/** Format: YYYY-MM-DD for a given UTC date. */
function dayKey(utcMs: number): string {
  const d = new Date(utcMs);
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Start of calendar day in UTC (ms). */
function dayStartUtc(dayKey: string): number {
  const [y, m, d] = dayKey.split("-").map(Number);
  return Date.UTC(y!, m! - 1, d!);
}

/** End of calendar day in UTC (ms, exclusive). */
function dayEndUtc(dayKey: string): number {
  return dayStartUtc(dayKey) + 24 * 3600 * 1000;
}

/** Return events that fall on the given calendar day (UTC). */
function eventsForDay(events: Event[], dayKeyStr: string): Event[] {
  const start = dayStartUtc(dayKeyStr);
  const end = dayEndUtc(dayKeyStr);
  return events.filter((e) => {
    const t = new Date(e.startTime).getTime();
    return t >= start && t < end;
  });
}

/** Build channels list with only events for the given day. */
function channelsForDay(channels: Channel[], dayKeyStr: string): Channel[] {
  return channels
    .map((ch) => ({
      ...ch,
      events: eventsForDay(ch.events, dayKeyStr),
    }))
    .filter((ch) => ch.events.length > 0);
}

/**
 * Write full day XMLTV to archiveDir/YYYY-MM-DD.xml.
 * Only writes days that are entirely in the past (dayEnd < now).
 */
export function archiveCompletedDays(
  channels: Channel[],
  archiveDir: string,
  nowMs: number = Date.now()
): void {
  const dir = resolve(archiveDir);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });

  const days = new Set<string>();
  for (const ch of channels) {
    for (const e of ch.events) {
      days.add(dayKey(new Date(e.startTime).getTime()));
    }
  }

  for (const dk of days) {
    const endMs = dayEndUtc(dk);
    if (endMs > nowMs) continue;
    const dayChannels = channelsForDay(channels, dk);
    if (dayChannels.length === 0) continue;
    const xml = buildXmltv({ channels: dayChannels });
    const path = join(dir, `${dk}.xml`);
    writeFileSync(path, xml, "utf-8");
  }
}
