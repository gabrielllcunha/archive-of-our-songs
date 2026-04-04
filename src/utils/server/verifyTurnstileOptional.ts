import type { NextApiRequest } from 'next';

type VerifyResponse = {
  success: boolean;
  'error-codes'?: string[];
};

export async function verifyTurnstileOptional(
  token: string | undefined,
  req: NextApiRequest
): Promise<boolean> {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) {
    return true;
  }
  if (!token?.trim()) {
    return false;
  }

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
  return Boolean(data.success);
}
