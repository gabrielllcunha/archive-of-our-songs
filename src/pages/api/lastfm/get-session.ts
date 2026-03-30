import type { NextApiRequest, NextApiResponse } from 'next';
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

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const apiKey = process.env.NEXT_PUBLIC_API_KEY;
  const apiSecret = process.env.API_SECRET;
  if (!apiKey || !apiSecret) {
    return res.status(500).json({ error: 'Missing Last.fm server configuration' });
  }

  const { token } = (req.body ?? {}) as { token?: string };
  if (!token) {
    return res.status(400).json({ error: 'Missing token' });
  }

  try {
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
    const data = await response.json().catch(() => null);

    if (!response.ok) {
      return res.status(502).json({ error: 'Failed to get session', details: data });
    }

    return res.status(200).json(data);
  } catch (error) {
    return res.status(500).json({ error: 'Unexpected error', details: String(error) });
  }
}

