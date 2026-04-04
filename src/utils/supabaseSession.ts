import { supabase } from '@/utils/supabase';

export async function applyBootstrapSession(payload: {
  access_token: string;
  refresh_token: string;
}): Promise<void> {
  if (!supabase) {
    throw new Error('Supabase is not configured');
  }
  const { error } = await supabase.auth.setSession({
    access_token: payload.access_token,
    refresh_token: payload.refresh_token,
  });
  if (error) throw error;
}

export async function getAccessTokenForFetch(): Promise<string | null> {
  if (!supabase) return null;
  const { data: { session } } = await supabase.auth.getSession();
  return session?.access_token ?? null;
}
