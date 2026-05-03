import { supabase } from '@/utils/supabase';
import type { SupabaseClient } from '@supabase/supabase-js';

export type YearlyDataType = 'albums' | 'artists' | 'songs';

function requireSupabase(): SupabaseClient {
  if (!supabase) {
    throw new Error('Supabase is not configured');
  }
  return supabase;
}

async function requireUserId(sb: SupabaseClient, bearerAccessToken?: string | null): Promise<string> {
  const jwt = bearerAccessToken?.trim();
  const { data: { user }, error } = jwt ? await sb.auth.getUser(jwt) : await sb.auth.getUser();
  if (error || !user) {
    throw new Error('Not authenticated');
  }
  return user.id;
}

export interface MonthlyEntry {
  name: string;
  artist: string;
  scrobbles: number;
  imageUrl: string;
  month: string;
}

export const supabaseService = {
  async getYearlyData(
    _lastfmUsername: string,
    year: number,
    type: YearlyDataType,
    client?: SupabaseClient,
    bearerAccessToken?: string | null
  ) {
    const sb = client ?? requireSupabase();
    const userId = await requireUserId(sb, client ? bearerAccessToken : undefined);

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

    return entries.map((entry) => ({
      month: entry.month,
      name: entry.name,
      artist: entry.artist,
      imageUrl: entry.image_url,
      scrobbles: entry.scrobbles,
    }));
  },

  async storeYearlyData(
    _lastfmUsername: string,
    year: number,
    type: YearlyDataType,
    entries: MonthlyEntry[],
    client?: SupabaseClient,
    bearerAccessToken?: string | null
  ) {
    const sb = client ?? requireSupabase();
    const userId = await requireUserId(sb, client ? bearerAccessToken : undefined);

    const { data: existingYearlyData, error: yearlyError } = await sb
      .from('yearly_data')
      .select('id')
      .eq('user_id', userId)
      .eq('year', year)
      .eq('type', type)
      .single();

    let yearlyDataId: string;
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
        entries.map((entry) => ({
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
