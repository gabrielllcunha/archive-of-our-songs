import type { NextApiRequest, NextApiResponse } from 'next';
import { randomBytes } from 'crypto';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { getSupabaseAdmin } from '@/utils/supabaseAdmin';
import { fetchLastfmUsernameFromToken } from '@/utils/server/lastfmSession';
import { isLastfmUsernameOnWhitelist } from '@/utils/server/lastfmWhitelist';
import { verifyTurnstileOptional } from '@/utils/server/verifyTurnstileOptional';
import { authEmailForLastfmUsername } from '@/utils/server/authEmailForLastfm';

async function syncPublicUserProfile(
  admin: SupabaseClient,
  authUserId: string,
  lastfmUsername: string
): Promise<string | undefined> {
  const { data: profileByName } = await admin
    .from('users')
    .select('id')
    .eq('lastfm_username', lastfmUsername)
    .maybeSingle();

  const profileId = profileByName?.id as string | undefined;
  const needMigrate = Boolean(profileId && profileId !== authUserId);

  const { data: rowByAuthId } = await admin.from('users').select('id').eq('id', authUserId).maybeSingle();

  if (!rowByAuthId) {
    if (needMigrate) {
      const tempName = `__bootstrap_${authUserId.replace(/-/g, '')}`;
      const { error: insTmp } = await admin
        .from('users')
        .insert({ id: authUserId, lastfm_username: tempName });
      if (insTmp) return insTmp.message;
    } else {
      const { error: ins } = await admin
        .from('users')
        .insert({ id: authUserId, lastfm_username: lastfmUsername });
      if (ins) return ins.message;
    }
  }

  if (needMigrate && profileId) {
    const { error: yErr } = await admin
      .from('yearly_data')
      .update({ user_id: authUserId })
      .eq('user_id', profileId);
    if (yErr) return yErr.message;

    const { error: sErr } = await admin
      .from('secret_pages')
      .update({ user_id: authUserId })
      .eq('user_id', profileId);
    if (sErr) return sErr.message;

    const { error: dErr } = await admin.from('users').delete().eq('id', profileId);
    if (dErr) return dErr.message;
  }

  const { error: finErr } = await admin
    .from('users')
    .update({ lastfm_username: lastfmUsername })
    .eq('id', authUserId);
  if (finErr) return finErr.message;

  return undefined;
}

async function resolveOrCreateAuthUserId(
  admin: SupabaseClient,
  email: string,
  password: string,
  lastfmUsername: string
): Promise<{ userId?: string; error?: string }> {
  const { data: created, error: createErr } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { lastfm_username: lastfmUsername },
  });

  if (createErr) {
    const msg = createErr.message ?? '';
    if (/already|registered|exists/i.test(msg)) {
      const { data: list, error: listErr } = await admin.auth.admin.listUsers({ page: 1, perPage: 200 });
      if (listErr) return { error: listErr.message };
      const found = list.users.find((u) => u.email?.toLowerCase() === email.toLowerCase());
      if (!found?.id) return { error: 'Auth user exists but could not be resolved' };
      const { error: pwdErr } = await admin.auth.admin.updateUserById(found.id, {
        password,
        user_metadata: { lastfm_username: lastfmUsername },
      });
      if (pwdErr) return { error: pwdErr.message };
      return { userId: found.id };
    }
    return { error: createErr.message };
  }

  if (!created.user?.id) return { error: 'Failed to create auth user' };
  return { userId: created.user.id };
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    return res.status(500).json({ error: 'Missing Supabase configuration' });
  }

  const admin = getSupabaseAdmin();
  if (!admin) {
    return res.status(500).json({ error: 'Missing Supabase service role' });
  }

  const { lastfm_token, turnstile_token } = (req.body ?? {}) as {
    lastfm_token?: string;
    turnstile_token?: string;
  };

  if (!lastfm_token?.trim()) {
    return res.status(400).json({ error: 'Missing lastfm_token' });
  }

  const turnstileOk = await verifyTurnstileOptional(turnstile_token, req);
  if (!turnstileOk) {
    return res.status(403).json({ error: 'Turnstile verification failed' });
  }

  let lastfmUsername: string;
  try {
    lastfmUsername = await fetchLastfmUsernameFromToken(lastfm_token.trim());
  } catch {
    return res.status(401).json({ error: 'Invalid or expired Last.fm token' });
  }

  if (!isLastfmUsernameOnWhitelist(lastfmUsername)) {
    return res.status(403).json({
      error: 'WHITELIST_DENIED',
      message: "Sorry but your username isn't on whitelist",
    });
  }

  const email = authEmailForLastfmUsername(lastfmUsername);
  const password = randomBytes(32).toString('hex');

  const { data: existingRow, error: rowErr } = await admin
    .from('users')
    .select('id')
    .eq('lastfm_username', lastfmUsername)
    .maybeSingle();

  if (rowErr) {
    return res.status(502).json({ error: rowErr.message });
  }

  let userId: string;

  if (existingRow?.id) {
    const { data: authLookup, error: authLookupErr } = await admin.auth.admin.getUserById(
      existingRow.id as string
    );
    if (!authLookupErr && authLookup.user?.id) {
      userId = authLookup.user.id;
      const { error: pwdErr } = await admin.auth.admin.updateUserById(userId, {
        password,
        user_metadata: { lastfm_username: lastfmUsername },
      });
      if (pwdErr) {
        return res.status(502).json({ error: pwdErr.message });
      }
    } else {
      const resolved = await resolveOrCreateAuthUserId(admin, email, password, lastfmUsername);
      if (resolved.error || !resolved.userId) {
        return res.status(502).json({ error: resolved.error ?? 'Auth resolution failed' });
      }
      userId = resolved.userId;
    }
  } else {
    const resolved = await resolveOrCreateAuthUserId(admin, email, password, lastfmUsername);
    if (resolved.error || !resolved.userId) {
      return res.status(502).json({ error: resolved.error ?? 'Auth resolution failed' });
    }
    userId = resolved.userId;
  }

  const syncErr = await syncPublicUserProfile(admin, userId, lastfmUsername);
  if (syncErr) {
    return res.status(502).json({
      error: syncErr,
      message:
        syncErr.includes('duplicate key') || syncErr.includes('unique')
          ? 'Data conflict: this account already has year/secret data under the new user id. Remove duplicates in Supabase or merge rows manually.'
          : undefined,
    });
  }

  const signClient = createClient(url, anonKey);
  const { data: signData, error: signErr } = await signClient.auth.signInWithPassword({
    email,
    password,
  });

  if (signErr || !signData.session) {
    return res.status(502).json({ error: signErr?.message ?? 'Sign-in failed' });
  }

  return res.status(200).json({
    access_token: signData.session.access_token,
    refresh_token: signData.session.refresh_token,
    expires_in: signData.session.expires_in,
    token_type: signData.session.token_type,
    lastfm_username: lastfmUsername,
  });
}
