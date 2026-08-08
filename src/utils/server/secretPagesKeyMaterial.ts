import { createHmac, randomBytes } from 'crypto';

export function deriveSecretPagesKeyMaterial(userId: string): string | null {
  const secret = process.env.SECRET_PAGES_KEY_SECRET?.trim();
  if (!secret) return null;
  return createHmac('sha256', secret).update(`secret-pages-dek:v1:${userId}`).digest('base64');
}

export function assertSecretPagesKeySecretConfigured(): boolean {
  return Boolean(process.env.SECRET_PAGES_KEY_SECRET?.trim());
}

export function randomAuthPassword(): string {
  return randomBytes(32).toString('hex');
}
