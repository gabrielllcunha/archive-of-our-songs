import { supabase } from '@/utils/supabase';
import type { SupabaseClient } from '@supabase/supabase-js';

export type YearlyDataType = 'albums' | 'artists' | 'songs';

function requireSupabase(): SupabaseClient {
  if (!supabase) {
    throw new Error('Supabase is not configured');
  }
  return supabase;
}

export interface MonthlyEntry {
  name: string;
  artist: string;
  scrobbles: number;
  imageUrl: string;
  month: string;
}

export const supabaseService = {
  async getYearlyData(lastfmUsername: string, year: number, type: YearlyDataType) {
    const sb = requireSupabase();
    const { data: user, error: userError } = await sb
      .from('users')
      .select('id')
      .eq('lastfm_username', lastfmUsername)
      .single();

    if (userError && userError.code !== 'PGRST116') {
      throw userError;
    }

    let userId = user?.id;
    if (!userId) {
      const { data: newUser, error: createError } = await sb
        .from('users')
        .insert({ lastfm_username: lastfmUsername })
        .select('id')
        .single();

      if (createError) throw createError;
      userId = newUser.id;
    }

    const { data: yearlyData, error: yearlyError } = await sb
      .from('yearly_data')
      .select('id')
      .eq('user_id', userId)
      .eq('year', year)
      .eq('type', type)
      .single();

    if (yearlyError && yearlyError.code !== 'PGRST116') {
      throw yearlyError;
    }

    if (!yearlyData) {
      return null;
    }

    const { data: entries, error: entriesError } = await sb
      .from('monthly_entries')
      .select('*')
      .eq('yearly_data_id', yearlyData.id)
      .order('month');

    if (entriesError) throw entriesError;

    return entries.map(entry => ({
      month: entry.month,
      name: entry.name,
      artist: entry.artist,
      imageUrl: entry.image_url,
      scrobbles: entry.scrobbles,
    }));
  },

  async storeYearlyData(lastfmUsername: string, year: number, type: YearlyDataType, entries: MonthlyEntry[]) {
    const sb = requireSupabase();
    const { data: user, error: userError } = await sb
      .from('users')
      .select('id')
      .eq('lastfm_username', lastfmUsername)
      .single();

    if (userError && userError.code !== 'PGRST116') {
      throw userError;
    }

    let userId = user?.id;
    if (!userId) {
      const { data: newUser, error: createError } = await sb
        .from('users')
        .insert({ lastfm_username: lastfmUsername })
        .select('id')
        .single();

      if (createError) throw createError;
      userId = newUser.id;
    }
    const { data: existingYearlyData, error: yearlyError } = await sb
      .from('yearly_data')
      .select('id')
      .eq('user_id', userId)
      .eq('year', year)
      .eq('type', type)
      .single();

    let yearlyDataId;
    if (yearlyError && yearlyError.code === 'PGRST116') {
      const { data: newYearlyData, error: insertError } = await sb
        .from('yearly_data')
        .insert({
          user_id: userId,
          year,
          type,
        })
        .select('id')
        .single();

      if (insertError) throw insertError;
      yearlyDataId = newYearlyData.id;
    } else if (yearlyError) {
      throw yearlyError;
    } else {
      yearlyDataId = existingYearlyData.id;
    }
    const { error: deleteError } = await sb
      .from('monthly_entries')
      .delete()
      .eq('yearly_data_id', yearlyDataId);

    if (deleteError) throw deleteError;
    const { error: entriesError } = await sb
      .from('monthly_entries')
      .insert(
        entries.map(entry => ({
          yearly_data_id: yearlyDataId,
          month: entry.month,
          name: entry.name,
          artist: entry.artist,
          image_url: entry.imageUrl,
          scrobbles: entry.scrobbles,
        }))
      );

    if (entriesError) throw entriesError;

    return entries;
  },
}; 