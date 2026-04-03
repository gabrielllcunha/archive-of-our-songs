const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
] as const;

export function monthNameToIndex(month: string): number {
  const i = MONTHS.indexOf(month as (typeof MONTHS)[number]);
  return i >= 0 ? i + 1 : 1;
}

export function audioObjectPath(userId: string, year: number, month: string): string {
  const m = monthNameToIndex(month);
  return `${userId}/${year}/${String(m).padStart(2, '0')}.mp3`;
}
