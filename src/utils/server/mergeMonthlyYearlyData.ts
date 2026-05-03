import type { MonthlyEntry } from '@/services/supabaseService';

const emptyRow = (month: string): MonthlyEntry => ({
  month,
  name: '',
  artist: '',
  imageUrl: '',
  scrobbles: 0,
});

export function normalizeMonthlyEntry(
  row: Partial<MonthlyEntry> & { month: string }
): MonthlyEntry {
  return {
    month: row.month,
    name: row.name ?? '',
    artist: row.artist ?? '',
    imageUrl: row.imageUrl ?? '',
    scrobbles: row.scrobbles ?? 0,
  };
}

export function mergeMonthlyPayloadWithStored(
  allMonthNames: readonly string[],
  stored: MonthlyEntry[] | null,
  fetched: Array<Partial<MonthlyEntry> & { month: string }>
): MonthlyEntry[] {
  const storedBy = new Map((stored ?? []).map((e) => [e.month, e]));
  const fetchedBy = new Map(fetched.map((e) => [e.month, normalizeMonthlyEntry(e)]));
  return allMonthNames.map((month) => {
    const next = fetchedBy.get(month);
    if (next) return next;
    const prev = storedBy.get(month);
    if (prev) return prev;
    return emptyRow(month);
  });
}
