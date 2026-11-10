/** A local calendar day as "YYYY-MM-DD". Local on purpose: "today" is the person's. */
export type UsageDay = string;

const DAY_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

function pad(value: number): string {
  return String(value).padStart(2, "0");
}

export function localDay(date: Date): UsageDay {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** True only for a real calendar day in the 20th or 21st century. */
export function isUsageDay(value: unknown): value is UsageDay {
  if (typeof value !== "string") return false;
  const match = DAY_PATTERN.exec(value);
  if (!match) return false;
  const [year, month, day] = [match[1], match[2], match[3]].map(Number);
  if (year < 1970 || year > 2200) return false;
  const check = new Date(Date.UTC(year, month - 1, day));
  return (
    check.getUTCFullYear() === year &&
    check.getUTCMonth() === month - 1 &&
    check.getUTCDate() === day
  );
}

/** The `count` days ending at `today`, newest first. Calendar math, not 24 h steps. */
export function lastDays(today: UsageDay, count: number): UsageDay[] {
  const match = DAY_PATTERN.exec(today);
  if (!match) return [];
  const [year, month, day] = [match[1], match[2], match[3]].map(Number);
  const days: UsageDay[] = [];
  for (let back = 0; back < count; back += 1) {
    const date = new Date(Date.UTC(year, month - 1, day - back));
    days.push(
      `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`,
    );
  }
  return days;
}
