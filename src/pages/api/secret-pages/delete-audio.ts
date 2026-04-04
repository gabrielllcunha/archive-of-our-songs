import type { NextApiRequest, NextApiResponse } from 'next';
import { getSupabaseAdmin } from '@/utils/supabaseAdmin';
import { getSupabaseUserFromRequest } from '@/utils/server/getSupabaseUserFromRequest';

const BUCKET = 'secret-pages-audio';

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

  const { year, month } = req.body as {
    year?: number;
    month?: string;
  };

  if (typeof year !== 'number' || !month) {
    return res.status(400).json({ error: 'Invalid payload' });
  }

  const userId = authUser.user.id;

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

  const path = row?.audio_storage_path as string | null | undefined;
  if (path) {
    const { error: rmErr } = await admin.storage.from(BUCKET).remove([path]);
    if (rmErr) {
      return res.status(502).json({ error: rmErr.message });
    }
  }

  const { error: upErr } = await admin
    .from('secret_pages')
    .update({
      audio_storage_path: null,
      audio_original_filename: null,
      audio_start_seconds: 0,
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', userId)
    .eq('year', year)
    .eq('month', month);

  if (upErr) {
    return res.status(502).json({ error: upErr.message });
  }

  return res.status(200).json({ ok: true });
}
