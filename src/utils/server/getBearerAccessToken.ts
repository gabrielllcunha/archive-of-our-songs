import type { NextApiRequest } from 'next';

export function getBearerAccessToken(req: NextApiRequest): string | null {
  const h = req.headers.authorization;
  if (!h || typeof h !== 'string') return null;
  const m = /^Bearer\s+(.+)$/i.exec(h.trim());
  return m?.[1]?.trim() || null;
}
