import type { NextApiRequest, NextApiResponse } from 'next';
import { getSupabaseAdmin } from '@/utils/supabaseAdmin';

const BUCKET = 'secret-pages-audio';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const admin = getSupabaseAdmin();
  if (!admin) {
    return res.status(500).json({ error: 'Missing Supabase service configuration' });
  }

  const { lastfm_username, year, month } = req.body as {
    lastfm_username?: string;
    year?: number;
    month?: string;
  };

  if (!lastfm_username || typeof year !== 'number' || !month) {
    return res.status(400).json({ error: 'Invalid payload' });
  }

  const { data: userRow, error: userErr } = await admin
    .from('users')
    .select('id')
    .eq('lastfm_username', lastfm_username)
    .single();

  if (userErr || !userRow?.id) {
    return res.status(404).json({ error: 'User not found' });
  }

  const userId = userRow.id as string;

  const { data: row, error: rowErr } = await admin
    .from('secret_pages')
    .select('audio_storage_path')
    .eq('user_id', userId)
    .eq('year', year)
    .eq('month', month)
    .maybeSingle();

  if (rowErr) {
    return res.status(502).json({ error: rowErr.message });
  }

  const storagePath = row?.audio_storage_path as string | null | undefined;
  if (!storagePath) {
    return res.status(200).json({ url: null });
  }

  const { data: signed, error: signErr } = await admin.storage
    .from(BUCKET)
    .createSignedUrl(storagePath, 3600);

  if (signErr || !signed?.signedUrl) {
    return res.status(502).json({ error: signErr?.message ?? 'Sign failed' });
  }

  return res.status(200).json({ url: signed.signedUrl });
}
