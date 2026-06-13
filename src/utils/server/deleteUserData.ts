import type { SupabaseClient } from '@supabase/supabase-js';

const AUDIO_BUCKET = 'secret-pages-audio';

export async function deleteAllUserData(
  admin: SupabaseClient,
  userId: string,
  lastfmUsername?: string | null
): Promise<string | undefined> {
  const { data: yearlyRows, error: yearlyListErr } = await admin
    .from('yearly_data')
    .select('id')
    .eq('user_id', userId);

  if (yearlyListErr) return yearlyListErr.message;

  const yearlyIds = (yearlyRows ?? []).map((row) => row.id as string);
  if (yearlyIds.length > 0) {
    const { error: entriesErr } = await admin
      .from('monthly_entries')
      .delete()
      .in('yearly_data_id', yearlyIds);
    if (entriesErr) return entriesErr.message;
  }

  const { error: yearlyErr } = await admin.from('yearly_data').delete().eq('user_id', userId);
  if (yearlyErr) return yearlyErr.message;

  const { data: secretRows, error: secretListErr } = await admin
    .from('secret_pages')
    .select('audio_storage_path')
    .eq('user_id', userId);

  if (secretListErr) return secretListErr.message;

  const audioPaths = (secretRows ?? [])
    .map((row) => row.audio_storage_path)
    .filter((path): path is string => typeof path === 'string' && path.length > 0);

  if (audioPaths.length > 0) {
    const { error: removeErr } = await admin.storage.from(AUDIO_BUCKET).remove(audioPaths);
    if (removeErr) return removeErr.message;
  }

  const { error: secretErr } = await admin.from('secret_pages').delete().eq('user_id', userId);
  if (secretErr) return secretErr.message;

  if (lastfmUsername) {
    const { error: scraperErr } = await admin
      .from('scraper_browser_sessions')
      .delete()
      .eq('account_username', lastfmUsername);
    if (scraperErr) return scraperErr.message;
  }

  const { error: profileErr } = await admin.from('users').delete().eq('id', userId);
  if (profileErr) return profileErr.message;

  const { error: authErr } = await admin.auth.admin.deleteUser(userId);
  if (authErr) return authErr.message;

  return undefined;
}
