import type { NextApiRequest, NextApiResponse } from 'next';
import type { SupabaseClient } from '@supabase/supabase-js';
import { getBearerAccessToken } from '@/utils/server/getBearerAccessToken';
import { createSupabaseForAccessToken } from '@/utils/server/createSupabaseForAccessToken';

export type BearerAuthedSupabase = { client: SupabaseClient; accessToken: string };

export function requireSupabaseAnonClientFromBearer(
  req: NextApiRequest,
  res: NextApiResponse
): BearerAuthedSupabase | null {
  const token = getBearerAccessToken(req);
  if (!token) {
    res.status(401).json({ error: 'Unauthorized' });
    return null;
  }
  const client = createSupabaseForAccessToken(token);
  if (!client) {
    res.status(500).json({ error: 'Missing Supabase configuration' });
    return null;
  }
  return { client, accessToken: token };
}
