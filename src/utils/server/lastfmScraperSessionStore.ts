import type { BrowserContextOptions } from 'playwright-core';
import { getSupabaseAdmin } from '@/utils/supabaseAdmin';

type ScraperStorageState = NonNullable<BrowserContextOptions['storageState']>;

export async function getScraperStorageState(
  accountUsername: string
): Promise<ScraperStorageState | null> {
  const admin = getSupabaseAdmin();
  if (!admin) return null;

  try {
    const { data, error } = await admin
      .from('scraper_browser_sessions')
      .select('storage_state')
      .eq('account_username', accountUsername)
      .maybeSingle();

    if (error) {
      console.warn('Could not load scraper browser session:', error.message);
      return null;
    }

    if (!data?.storage_state || typeof data.storage_state !== 'object') {
      return null;
    }

    return data.storage_state as ScraperStorageState;
  } catch (error) {
    console.warn('Could not load scraper browser session:', error);
    return null;
  }
}

export async function saveScraperStorageState(
  accountUsername: string,
  storageState: ScraperStorageState
): Promise<void> {
  const admin = getSupabaseAdmin();
  if (!admin) return;

  try {
    const { error } = await admin
      .from('scraper_browser_sessions')
      .upsert(
        {
          account_username: accountUsername,
          storage_state: storageState,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'account_username' }
      );

    if (error) {
      console.warn('Could not save scraper browser session:', error.message);
    }
  } catch (error) {
    console.warn('Could not save scraper browser session:', error);
  }
}

export async function clearScraperStorageState(accountUsername: string): Promise<void> {
  const admin = getSupabaseAdmin();
  if (!admin) return;

  try {
    await admin
      .from('scraper_browser_sessions')
      .delete()
      .eq('account_username', accountUsername);
  } catch (error) {
    console.warn('Could not clear scraper browser session:', error);
  }
}
