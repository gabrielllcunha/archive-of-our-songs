import type { NextApiRequest } from 'next';
import type { User } from '@supabase/supabase-js';
import { getSupabaseAdmin } from '@/utils/supabaseAdmin';
import { getBearerAccessToken } from '@/utils/server/getBearerAccessToken';

export async function getSupabaseUserFromRequest(
  req: NextApiRequest
): Promise<{ user: User; accessToken: string } | null> {
  const accessToken = getBearerAccessToken(req);
  if (!accessToken) return null;

  const admin = getSupabaseAdmin();
  if (!admin) return null;

  const { data, error } = await admin.auth.getUser(accessToken);
  if (error || !data.user) return null;

  return { user: data.user, accessToken };
}
