import type { NextApiRequest, NextApiResponse } from 'next';
import { getSupabaseAdmin } from '@/utils/supabaseAdmin';
import { getSupabaseUserFromRequest } from '@/utils/server/getSupabaseUserFromRequest';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const authUser = await getSupabaseUserFromRequest(req);
  if (!authUser) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const admin = getSupabaseAdmin();
  if (!admin) {
    return res.status(500).json({ error: 'Missing Supabase service configuration' });
  }

  const userId = authUser.user.id;
  const metadataUsername = authUser.user.user_metadata?.lastfm_username;

  const { data: profile, error: profileErr } = await admin
    .from('users')
    .select('lastfm_username, created_at')
    .eq('id', userId)
    .maybeSingle();

  if (profileErr) {
    return res.status(502).json({ error: profileErr.message });
  }

  const lastfmUsername =
    (typeof profile?.lastfm_username === 'string' && profile.lastfm_username) ||
    (typeof metadataUsername === 'string' ? metadataUsername : null);

  return res.status(200).json({
    lastfm_username: lastfmUsername,
    created_at: profile?.created_at ?? authUser.user.created_at ?? null,
  });
}
