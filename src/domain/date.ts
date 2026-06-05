const DAY_MS = 24 * 60 * 60 * 1000;

export function parseDate(value: string): Date {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

export function formatDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function addDays(value: string, days: number): string {
  const date = parseDate(value);
  date.setUTCDate(date.getUTCDate() + days);
  return formatDate(date);
}

export function daysBetween(start: string, end: string): number {
  return Math.floor((parseDate(end).getTime() - parseDate(start).getTime()) / DAY_MS);
}

export function isWithin(value: string, startsOn: string, endsOn: string): boolean {
  return value >= startsOn && value <= endsOn;
}
