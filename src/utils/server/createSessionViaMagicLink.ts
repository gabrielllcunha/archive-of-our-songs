import type { SupabaseClient } from '@supabase/supabase-js';

export async function createSessionViaMagicLink(
  admin: SupabaseClient,
  anonClient: SupabaseClient,
  email: string
): Promise<{
  access_token?: string;
  refresh_token?: string;
  expires_in?: number;
  token_type?: string;
  error?: string;
}> {
  const { data: linkData, error: linkErr } = await admin.auth.admin.generateLink({
    type: 'magiclink',
    email,
  });

  if (linkErr) {
    return { error: linkErr.message };
  }

  const tokenHash = linkData.properties?.hashed_token;
  if (!tokenHash) {
    return { error: 'Auth link did not include a token hash' };
  }

  const { data: otpData, error: otpErr } = await anonClient.auth.verifyOtp({
    type: 'email',
    token_hash: tokenHash,
  });

  if (otpErr || !otpData.session) {
    return { error: otpErr?.message ?? 'Failed to create session' };
  }

  return {
    access_token: otpData.session.access_token,
    refresh_token: otpData.session.refresh_token,
    expires_in: otpData.session.expires_in,
    token_type: otpData.session.token_type,
  };
}
