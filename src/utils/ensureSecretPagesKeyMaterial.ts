import { supabase } from '@/utils/supabase';
import { authenticatedFetch } from '@/utils/authenticatedFetch';
import {
  applySecretPagesKeyMaterial,
  getStoredSyncKeyMaterial,
} from '@/utils/secretPageCrypto';

export async function ensureSecretPagesKeyMaterial(): Promise<boolean> {
  if (!supabase) return false;

  const {
    data: { session },
  } = await supabase.auth.getSession();
  const userId = session?.user?.id;
  if (!userId) return false;

  if (getStoredSyncKeyMaterial(userId)) {
    return true;
  }

  try {
    const res = await authenticatedFetch('/api/secret-pages/key-material', {
      method: 'GET',
    });
    if (!res.ok) return false;
    const data = (await res.json()) as { secret_pages_key_material?: string | null };
    if (!data.secret_pages_key_material) return false;
    applySecretPagesKeyMaterial(userId, data.secret_pages_key_material);
    return true;
  } catch {
    return false;
  }
}
