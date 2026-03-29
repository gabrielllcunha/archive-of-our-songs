import type { MonthlyEntry, YearlyDataType } from '@/services/supabaseService';
import { openArchiveDb } from './openArchiveDb';
import { STORE_YEARLY_DATA } from './schema';

function yearlyKey(lastfmUsername: string, year: number, type: YearlyDataType) {
  return `${lastfmUsername}::${year}::${type}`;
}

export async function getYearlyData(
  lastfmUsername: string,
  year: number,
  type: YearlyDataType
): Promise<MonthlyEntry[] | null> {
  try {
    const db = await openArchiveDb();
    return await new Promise<MonthlyEntry[] | null>((resolve, reject) => {
      const tx = db.transaction(STORE_YEARLY_DATA, 'readonly');
      const store = tx.objectStore(STORE_YEARLY_DATA);
      const req = store.get(yearlyKey(lastfmUsername, year, type));
      req.onerror = () => reject(req.error ?? new Error('IDB get failed'));
      req.onsuccess = () => {
        const raw = req.result as MonthlyEntry[] | undefined;
        resolve(raw ?? null);
      };
    });
  } catch {
    return null;
  }
}

export async function storeYearlyData(
  lastfmUsername: string,
  year: number,
  type: YearlyDataType,
  entries: MonthlyEntry[]
): Promise<void> {
  const db = await openArchiveDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_YEARLY_DATA, 'readwrite');
    const store = tx.objectStore(STORE_YEARLY_DATA);
    store.put(entries, yearlyKey(lastfmUsername, year, type));
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error('IDB write failed'));
    tx.onabort = () => reject(tx.error ?? new Error('IDB transaction aborted'));
  });
}
