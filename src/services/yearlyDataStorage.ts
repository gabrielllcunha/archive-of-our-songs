import { supabase } from '@/utils/supabase';
import {
  supabaseService,
  type MonthlyEntry,
  type YearlyDataType,
} from '@/services/supabaseService';
import * as idbYearly from '@/services/storage/idbYearlyData';

export type { MonthlyEntry, YearlyDataType };

function isBrowserIndexedDbAvailable() {
  return typeof window !== 'undefined' && typeof indexedDB !== 'undefined';
}

export const yearlyDataStorage = {
  async getYearlyData(
    lastfmUsername: string,
    year: number,
    type: YearlyDataType
  ): Promise<MonthlyEntry[] | null> {
    if (!isBrowserIndexedDbAvailable()) {
      return supabaseService.getYearlyData(lastfmUsername, year, type);
    }
    try {
      if (supabase) {
        const remote = await supabaseService.getYearlyData(lastfmUsername, year, type);
        if (remote !== null) return remote;
      }
    } catch {
      
    }
    return idbYearly.getYearlyData(lastfmUsername, year, type);
  },

  async storeYearlyData(
    lastfmUsername: string,
    year: number,
    type: YearlyDataType,
    entries: MonthlyEntry[]
  ): Promise<MonthlyEntry[]> {
    if (!isBrowserIndexedDbAvailable()) {
      return supabaseService.storeYearlyData(lastfmUsername, year, type, entries);
    }
    let wroteRemote = false;
    try {
      if (supabase) {
        await supabaseService.storeYearlyData(lastfmUsername, year, type, entries);
        wroteRemote = true;
      }
    } catch {
      wroteRemote = false;
    }
    if (!wroteRemote) {
      await idbYearly.storeYearlyData(lastfmUsername, year, type, entries);
      return entries;
    }
    await idbYearly.storeYearlyData(lastfmUsername, year, type, entries).catch(() => {});
    return entries;
  },
};
