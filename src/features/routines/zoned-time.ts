/**
 * Wall-clock arithmetic in a named time zone with Intl only, so the routines
 * domain needs no date library and stays correct across daylight saving.
 */

export type WallClock = {
  year: number;
  month: number; // 1-12
  day: number;
  hour: number;
  minute: number;
  weekday: number; // 0 = Sunday
};

const formatters = new Map<string, Intl.DateTimeFormat>();

function formatter(timeZone: string): Intl.DateTimeFormat {
  let found = formatters.get(timeZone);
  if (!found) {
    found = new Intl.DateTimeFormat("en-US", {
      timeZone,
      hourCycle: "h23",
      year: "numeric",
      month: "numeric",
      day: "numeric",
      hour: "numeric",
      minute: "numeric",
      second: "numeric",
      weekday: "short",
    });
    formatters.set(timeZone, found);
  }
  return found;
}

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/** The wall clock an instant shows in a time zone. */
export function wallClockAt(instant: Date, timeZone: string): WallClock {
  const parts: Record<string, string> = {};
  for (const part of formatter(timeZone).formatToParts(instant)) {
    parts[part.type] = part.value;
  }
  return {
    year: Number(parts.year),
    month: Number(parts.month),
    day: Number(parts.day),
    hour: Number(parts.hour),
    minute: Number(parts.minute),
    weekday: WEEKDAYS.indexOf(parts.weekday),
  };
}

function offsetMs(instant: Date, timeZone: string): number {
  const wall = wallClockAt(instant, timeZone);
  const asUtc = Date.UTC(
    wall.year,
    wall.month - 1,
    wall.day,
    wall.hour,
    wall.minute,
  );
  const truncated = Math.floor(instant.getTime() / 60_000) * 60_000;
  return asUtc - truncated;
}

/**
 * The instant a wall-clock time happens in a time zone. A time skipped by a
 * spring-forward gap moves forward by the gap (02:30 becomes 03:30); a time repeated
 * by a fall-back resolves to its first occurrence.
 */
export function instantAt(
  date: { year: number; month: number; day: number },
  time: { hour: number; minute: number },
  timeZone: string,
): Date {
  const naive = Date.UTC(
    date.year,
    date.month - 1,
    date.day,
    time.hour,
    time.minute,
  );
  const before = offsetMs(new Date(naive - 12 * 3_600_000), timeZone);
  const after = offsetMs(new Date(naive + 12 * 3_600_000), timeZone);
  // Earliest candidate first: the larger offset gives the earlier instant.
  const candidates = [
    naive - Math.max(before, after),
    naive - Math.min(before, after),
  ];
  for (const candidate of candidates) {
    const wall = wallClockAt(new Date(candidate), timeZone);
    if (
      wall.year === date.year &&
      wall.month === date.month &&
      wall.day === date.day &&
      wall.hour === time.hour &&
      wall.minute === time.minute
    ) {
      return new Date(candidate);
    }
  }
  // In a gap the wall time never happens: shift it forward by the gap.
  return new Date(naive - Math.min(before, after));
}

/** The calendar date `days` after the given one (pure calendar arithmetic). */
export function addDays(
  date: { year: number; month: number; day: number },
  days: number,
): { year: number; month: number; day: number } {
  const shifted = new Date(
    Date.UTC(date.year, date.month - 1, date.day + days),
  );
  return {
    year: shifted.getUTCFullYear(),
    month: shifted.getUTCMonth() + 1,
    day: shifted.getUTCDate(),
  };
}
