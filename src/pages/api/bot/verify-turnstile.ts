import type { NextApiRequest, NextApiResponse } from 'next';

type VerifyResponse = {
  success: boolean;
  'error-codes'?: string[];
  challenge_ts?: string;
  hostname?: string;
  action?: string;
  cdata?: string;
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) {
    return res.status(500).json({ error: 'Missing TURNSTILE_SECRET_KEY' });
  }

  const { token } = (req.body ?? {}) as { token?: string };
  if (!token) {
    return res.status(400).json({ error: 'Missing token' });
  }

  try {
    const formData = new FormData();
    formData.append('secret', secret);
    formData.append('response', token);

    const ip =
      (req.headers['cf-connecting-ip'] as string | undefined) ||
      (req.headers['x-forwarded-for'] as string | undefined)?.split(',')[0]?.trim();
    if (ip) formData.append('remoteip', ip);

    const verifyRes = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      body: formData,
    });

    const data = (await verifyRes.json()) as VerifyResponse;
    if (!data.success) {
      return res.status(403).json({ success: false, errorCodes: data['error-codes'] ?? [] });
    }

    return res.status(200).json({ success: true });
  } catch (error) {
    return res.status(500).json({ error: 'Unexpected error', details: String(error) });
  }
}

