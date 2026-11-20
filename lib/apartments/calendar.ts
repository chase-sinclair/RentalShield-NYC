import type { DateWindow, ReportingWindow } from "./contracts";

const localParts = new Intl.DateTimeFormat("en-CA", {
  timeZone: "America/New_York",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});
const dateLabel = new Intl.DateTimeFormat("en-US", {
  dateStyle: "medium",
  timeZone: "UTC",
});
const departureLabel = new Intl.DateTimeFormat("en-US", {
  timeZone: "America/New_York",
  weekday: "short",
  month: "short",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
  timeZoneName: "short",
});

const dayMs = 24 * 60 * 60 * 1000;
const midnight = (day: string) => new Date(day + "T00:00:00Z");
const dayFromUtc = (date: Date) => date.toISOString().slice(0, 10);

function localDateTime(date: Date) {
  const { year, month, day, hour, minute } = Object.fromEntries(
    localParts.formatToParts(date).map(({ type, value }) => [type, value]),
  );
  return `${year}-${month}-${day}T${hour}:${minute}`;
}

export function nyDate(now: Date) {
  return localDateTime(now).slice(0, 10);
}

export function addCalendarDays(day: string, days: number) {
  return dayFromUtc(new Date(midnight(day).getTime() + days * dayMs));
}

export function reportingWindow(now: Date): ReportingWindow {
  const asOf = nyDate(now);
  const sameDay = midnight(asOf);
  const priorYear = sameDay.getUTCFullYear() - 1;
  const month = sameDay.getUTCMonth();
  const lastDay = new Date(Date.UTC(priorYear, month + 1, 0)).getUTCDate();
  const heatStart = new Date(Date.UTC(priorYear, month, Math.min(sameDay.getUTCDate(), lastDay)));
  return {
    asOf,
    heat: { start: dayFromUtc(heatStart), end: asOf },
    noise: { start: addCalendarDays(asOf, -90), end: asOf },
    bedbugs: [priorYear, priorYear - 1, priorYear - 2].map((year) => ({
      start: `${year - 1}-11-01`,
      end: `${year}-10-31`,
    })),
    radiusMeters: 300,
  };
}

export function nextWeekdayDeparture(now: Date) {
  let day = addCalendarDays(nyDate(now), 1);
  while ([0, 6].includes(midnight(day).getUTCDay())) day = addCalendarDays(day, 1);
  return day + "T08:30";
}

export function parseNYDeparture(value: string): string | null {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)) return null;
  const wallTime = Date.parse(value + "Z");
  if (!Number.isFinite(wallTime)) return null;

  // The offsets on either side of a transition are both possible for a wall time.
  const probes = [wallTime - dayMs, wallTime + dayMs];
  const offsets = new Set(probes.map((probe) => Date.parse(localDateTime(new Date(probe)) + "Z") - probe));
  const matches = [...offsets].map((offset) => new Date(wallTime - offset))
    .filter((candidate) => localDateTime(candidate) === value);
  return matches.length === 1 ? matches[0].toISOString() : null;
}

export function validDeparture(instant: string, now: Date) {
  const date = new Date(instant);
  return date > now && nyDate(date) <= addCalendarDays(nyDate(now), 14);
}

export function isMorning(departure?: string) {
  return departure ? Number(localDateTime(new Date(departure)).slice(11, 13)) < 12 : false;
}

export function formatDeparture(departure: string) {
  return departureLabel.format(new Date(departure));
}

export function formatDay(day: string) {
  return dateLabel.format(midnight(day));
}

export function formatPeriod(window: DateWindow, exclusiveEnd = false) {
  const end = exclusiveEnd ? addCalendarDays(window.end, -1) : window.end;
  return `${formatDay(window.start)} – ${formatDay(end)}`;
}
