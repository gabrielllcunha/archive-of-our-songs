import type { NextApiRequest, NextApiResponse } from 'next';
import { getSupabaseAdmin } from '@/utils/supabaseAdmin';
import { getSupabaseUserFromRequest } from '@/utils/server/getSupabaseUserFromRequest';
import { deleteAllUserData } from '@/utils/server/deleteUserData';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
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

  const { data: profile } = await admin
    .from('users')
    .select('lastfm_username')
    .eq('id', userId)
    .maybeSingle();

  const lastfmUsername =
    (typeof profile?.lastfm_username === 'string' && profile.lastfm_username) ||
    (typeof metadataUsername === 'string' ? metadataUsername : null);

  const deleteErr = await deleteAllUserData(admin, userId, lastfmUsername);
  if (deleteErr) {
    return res.status(502).json({ error: deleteErr });
  }

  return res.status(200).json({ ok: true });
}
