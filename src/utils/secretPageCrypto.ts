const ALGORITHM = 'AES-GCM';
const IV_LENGTH = 12;
const KEY_BITS = 256;
const ENCRYPTED_PREFIX = 'enc:v1:';
const LEGACY_DEK_STORAGE_PREFIX = 'secret_pages_dek_';
const SYNC_DEK_STORAGE_PREFIX = 'secret_pages_sync_dek_';

function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i += 1) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function base64ToBytes(value: string): Uint8Array {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

function copyToArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  const buffer = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(buffer).set(bytes);
  return buffer;
}

function isBrowserCryptoAvailable(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof window.localStorage !== 'undefined' &&
    typeof crypto !== 'undefined' &&
    typeof crypto.subtle !== 'undefined'
  );
}

async function importRawKey(raw: Uint8Array): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    'raw',
    copyToArrayBuffer(raw),
    { name: ALGORITHM, length: KEY_BITS },
    false,
    ['encrypt', 'decrypt']
  );
}

export function applySecretPagesKeyMaterial(userId: string, materialBase64: string): void {
  if (!isBrowserCryptoAvailable() || !userId || !materialBase64) return;
  window.localStorage.setItem(`${SYNC_DEK_STORAGE_PREFIX}${userId}`, materialBase64);
}

export function getStoredSyncKeyMaterial(userId: string): string | null {
  if (!isBrowserCryptoAvailable()) return null;
  return window.localStorage.getItem(`${SYNC_DEK_STORAGE_PREFIX}${userId}`);
}

async function getLegacyOrCreateUserKey(userId: string): Promise<CryptoKey> {
  const storageKey = `${LEGACY_DEK_STORAGE_PREFIX}${userId}`;
  const stored = window.localStorage.getItem(storageKey);
  if (stored) {
    return importRawKey(base64ToBytes(stored));
  }

  const key = await crypto.subtle.generateKey({ name: ALGORITHM, length: KEY_BITS }, true, [
    'encrypt',
    'decrypt',
  ]);
  const exportedBuffer = await crypto.subtle.exportKey('raw', key);
  const exported = new Uint8Array(exportedBuffer);
  window.localStorage.setItem(storageKey, bytesToBase64(exported));
  return key;
}

async function getSyncKey(userId: string): Promise<CryptoKey | null> {
  const material = getStoredSyncKeyMaterial(userId);
  if (!material) return null;
  return importRawKey(base64ToBytes(material));
}

async function getPreferredEncryptKey(userId: string): Promise<CryptoKey> {
  const sync = await getSyncKey(userId);
  if (sync) return sync;
  return getLegacyOrCreateUserKey(userId);
}

async function decryptWithKey(key: CryptoKey, stored: string): Promise<string> {
  const combined = base64ToBytes(stored.slice(ENCRYPTED_PREFIX.length));
  const ivBuffer = copyToArrayBuffer(combined.subarray(0, IV_LENGTH));
  const iv = new Uint8Array(ivBuffer);
  const ciphertext = copyToArrayBuffer(combined.subarray(IV_LENGTH));
  const decrypted = await crypto.subtle.decrypt({ name: ALGORITHM, iv }, key, ciphertext);
  return new TextDecoder().decode(decrypted);
}

export function isEncryptedSecretPageContent(value: string): boolean {
  return value.startsWith(ENCRYPTED_PREFIX);
}

export type DecryptSecretPageResult = {
  plaintext: string;
  decryptFailed: boolean;
  needsReencryptWithSyncKey: boolean;
};

export async function decryptSecretPageContentDetailed(
  userId: string,
  stored: string
): Promise<DecryptSecretPageResult> {
  if (!stored) {
    return { plaintext: '', decryptFailed: false, needsReencryptWithSyncKey: false };
  }
  if (!isEncryptedSecretPageContent(stored)) {
    return { plaintext: stored, decryptFailed: false, needsReencryptWithSyncKey: false };
  }
  if (!isBrowserCryptoAvailable()) {
    return { plaintext: '', decryptFailed: true, needsReencryptWithSyncKey: false };
  }

  const syncKey = await getSyncKey(userId);
  if (syncKey) {
    try {
      const plaintext = await decryptWithKey(syncKey, stored);
      return { plaintext, decryptFailed: false, needsReencryptWithSyncKey: false };
    } catch {
    }
  }

  const legacyStored = window.localStorage.getItem(`${LEGACY_DEK_STORAGE_PREFIX}${userId}`);
  if (legacyStored) {
    try {
      const legacyKey = await importRawKey(base64ToBytes(legacyStored));
      const plaintext = await decryptWithKey(legacyKey, stored);
      return {
        plaintext,
        decryptFailed: false,
        needsReencryptWithSyncKey: Boolean(syncKey),
      };
    } catch {
    }
  }

  if (!syncKey) {
    try {
      const legacyKey = await getLegacyOrCreateUserKey(userId);
      const plaintext = await decryptWithKey(legacyKey, stored);
      return { plaintext, decryptFailed: false, needsReencryptWithSyncKey: false };
    } catch {
      return { plaintext: '', decryptFailed: true, needsReencryptWithSyncKey: false };
    }
  }

  return { plaintext: '', decryptFailed: true, needsReencryptWithSyncKey: false };
}

export async function decryptSecretPageContent(
  userId: string,
  stored: string
): Promise<string> {
  const result = await decryptSecretPageContentDetailed(userId, stored);
  if (result.decryptFailed) {
    throw new Error('Failed to decrypt secret page content');
  }
  return result.plaintext;
}

export async function encryptSecretPageContent(
  userId: string,
  plaintext: string
): Promise<string> {
  if (!plaintext) return '';
  if (!isBrowserCryptoAvailable()) return plaintext;

  const key = await getPreferredEncryptKey(userId);

  const ivBuffer = new ArrayBuffer(IV_LENGTH);
  const iv = new Uint8Array(ivBuffer);
  crypto.getRandomValues(iv);

  const encoded = copyToArrayBuffer(new TextEncoder().encode(plaintext));
  const ciphertext = await crypto.subtle.encrypt({ name: ALGORITHM, iv }, key, encoded);

  const cipherBytes = new Uint8Array(ciphertext);
  const combined = new Uint8Array(iv.length + cipherBytes.length);
  combined.set(iv);
  combined.set(cipherBytes, iv.length);
  return `${ENCRYPTED_PREFIX}${bytesToBase64(combined)}`;
}
