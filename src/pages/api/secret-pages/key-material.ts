import type { NextApiRequest, NextApiResponse } from 'next';
import { requireSupabaseAnonClientFromBearer } from '@/utils/server/requireSupabaseAnonFromBearer';
import {
  assertSecretPagesKeySecretConfigured,
  deriveSecretPagesKeyMaterial,
} from '@/utils/server/secretPagesKeyMaterial';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const auth = requireSupabaseAnonClientFromBearer(req, res);
  if (!auth) return;

  const {
    data: { user },
    error,
  } = await auth.client.auth.getUser(auth.accessToken);

  if (error || !user?.id) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (!assertSecretPagesKeySecretConfigured()) {
    return res.status(503).json({
      error: 'SECRET_PAGES_KEY_SECRET is not configured',
      secret_pages_key_material: null,
    });
  }

  const material = deriveSecretPagesKeyMaterial(user.id);
  return res.status(200).json({ secret_pages_key_material: material });
}
