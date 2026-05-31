import type { NextApiRequest, NextApiResponse } from 'next';
import { requireSupabaseAnonClientFromBearer } from '@/utils/server/requireSupabaseAnonFromBearer';
import { isLastfmUsernameAllowedCurrentYear } from '@/utils/server/lastfmWhitelist';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const auth = requireSupabaseAnonClientFromBearer(req, res);
  if (!auth) return;

  const { data: { user }, error } = await auth.client.auth.getUser(auth.accessToken);
  if (error || !user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const lastfmUsername = user.user_metadata?.lastfm_username;
  const canAccessCurrentYear =
    typeof lastfmUsername === 'string' &&
    isLastfmUsernameAllowedCurrentYear(lastfmUsername);

  return res.status(200).json({ canAccessCurrentYear });
}
