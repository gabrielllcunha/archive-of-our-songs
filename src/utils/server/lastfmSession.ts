import { createHash } from 'crypto';

function md5(input: string) {
  return createHash('md5').update(input).digest('hex');
}

function createApiSignature(params: Record<string, string>, apiSecret: string) {
  const { format, cb, ...paramsForSig } = params;
  const keys = Object.keys(paramsForSig).sort();
  const base = keys.map((k) => `${k}${paramsForSig[k]}`).join('') + apiSecret;
  return md5(base);
}

export async function fetchLastfmUsernameFromToken(token: string): Promise<string> {
  const apiKey = process.env.NEXT_PUBLIC_API_KEY;
  const apiSecret = process.env.API_SECRET;
  if (!apiKey || !apiSecret) {
    throw new Error('Missing Last.fm server configuration');
  }

  const params: Record<string, string> = {
    method: 'auth.getSession',
    api_key: apiKey,
    token,
    format: 'json',
  };
  const api_sig = createApiSignature(params, apiSecret);
  const queryString =
    Object.entries(params)
      .map(([key, value]) => `${key}=${encodeURIComponent(value)}`)
      .join('&') + `&api_sig=${api_sig}`;

  const response = await fetch(`https://ws.audioscrobbler.com/2.0/?${queryString}`);
  const data = (await response.json().catch(() => null)) as {
    session?: { name?: string };
    error?: number;
    message?: string;
  } | null;

  if (!response.ok || !data?.session?.name) {
    throw new Error(data?.message ?? 'Last.fm session invalid');
  }

  return data.session.name;
}

export async function fetchLastfmRegisteredYear(username: string): Promise<number | null> {
  const apiKey = process.env.NEXT_PUBLIC_API_KEY;
  if (!apiKey || !username.trim()) {
    return null;
  }

  const query = new URLSearchParams({
    method: 'user.getInfo',
    user: username.trim(),
    api_key: apiKey,
    format: 'json',
  });

  try {
    const response = await fetch(`https://ws.audioscrobbler.com/2.0/?${query.toString()}`);
    const data = (await response.json().catch(() => null)) as {
      user?: { registered?: { unixtime?: string | number } };
      error?: number;
      message?: string;
    } | null;

    if (!response.ok || data?.error || !data?.user?.registered?.unixtime) {
      return null;
    }

    const unixtime = Number(data.user.registered.unixtime);
    if (!Number.isFinite(unixtime) || unixtime <= 0) {
      return null;
    }

    const year = new Date(unixtime * 1000).getUTCFullYear();
    return Number.isFinite(year) ? year : null;
  } catch {
    return null;
  }
}
