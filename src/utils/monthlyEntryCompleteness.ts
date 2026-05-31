import type { MonthlyEntry, YearlyDataType } from '@/services/supabaseService';

function isPlaceholderValue(value: string | undefined | null): boolean {
  if (value == null) return true;
  const trimmed = value.trim();
  return trimmed === '' || trimmed.toUpperCase() === 'EMPTY';
}

export function isIncompleteMonthlyEntry(
  entry: Partial<MonthlyEntry>,
  type: YearlyDataType
): boolean {
  if (isPlaceholderValue(entry.name)) return true;
  if (type !== 'artists' && isPlaceholderValue(entry.artist)) return true;
  if ((entry.scrobbles ?? 0) === 0) return true;
  if (isPlaceholderValue(entry.imageUrl)) return true;
  return false;
}

export function getMonthsNeedingFetch(
  storedData: MonthlyEntry[] | null,
  allMonths: readonly string[],
  type: YearlyDataType,
  year: number,
  currentYear: number
): string[] {
  const monthOrder = new Map(allMonths.map((month, index) => [month, index]));
  const visibleMonths =
    year === currentYear
      ? allMonths.slice(0, new Date().getMonth() + 1)
      : [...allMonths];

  const incompleteMonths =
    storedData
      ?.filter((entry) => isIncompleteMonthlyEntry(entry, type))
      .map((entry) => entry.month) ?? [];

  const missingMonths = visibleMonths.filter(
    (month) => !storedData?.some((entry) => entry.month === month)
  );

  return Array.from(new Set([...incompleteMonths, ...missingMonths]))
    .filter((month) => visibleMonths.includes(month))
    .sort((a, b) => (monthOrder.get(a) ?? 0) - (monthOrder.get(b) ?? 0));
}
