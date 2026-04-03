import { openArchiveDb } from './openArchiveDb';
import { STORE_SECRET_PAGES } from './schema';

export type SecretPageIdbValue = {
  content: string;
  audio_storage_path: string | null;
  album_cover_url: string | null;
  audio_original_filename: string | null;
  audio_start_seconds: number;
  audio_blob?: ArrayBuffer | null;
};

function secretPageKey(lastfmUsername: string, year: number, month: string) {
  return `${lastfmUsername}::${year}::${month}`;
}

function num(v: unknown, fallback: number): number {
  return typeof v === 'number' && Number.isFinite(v) ? v : fallback;
}

function normalize(raw: unknown): SecretPageIdbValue {
  if (typeof raw === 'string') {
    return {
      content: raw,
      audio_storage_path: null,
      album_cover_url: null,
      audio_original_filename: null,
      audio_start_seconds: 0,
      audio_blob: null,
    };
  }
  if (raw && typeof raw === 'object') {
    const o = raw as Record<string, unknown>;
    return {
      content: typeof o.content === 'string' ? o.content : '',
      audio_storage_path: typeof o.audio_storage_path === 'string' ? o.audio_storage_path : null,
      album_cover_url: typeof o.album_cover_url === 'string' ? o.album_cover_url : null,
      audio_original_filename:
        typeof o.audio_original_filename === 'string' ? o.audio_original_filename : null,
      audio_start_seconds: num(o.audio_start_seconds, 0),
      audio_blob: o.audio_blob instanceof ArrayBuffer ? o.audio_blob : null,
    };
  }
  return {
    content: '',
    audio_storage_path: null,
    album_cover_url: null,
    audio_original_filename: null,
    audio_start_seconds: 0,
    audio_blob: null,
  };
}

export async function getSecretPageRecord(
  lastfmUsername: string,
  year: number,
  month: string
): Promise<SecretPageIdbValue> {
  try {
    const db = await openArchiveDb();
    return await new Promise<SecretPageIdbValue>((resolve, reject) => {
      const tx = db.transaction(STORE_SECRET_PAGES, 'readonly');
      const store = tx.objectStore(STORE_SECRET_PAGES);
      const req = store.get(secretPageKey(lastfmUsername, year, month));
      req.onerror = () => reject(req.error ?? new Error('IDB get failed'));
      req.onsuccess = () => resolve(normalize(req.result));
    });
  } catch {
    return normalize(null);
  }
}

export async function storeSecretPageRecord(
  lastfmUsername: string,
  year: number,
  month: string,
  value: SecretPageIdbValue
): Promise<void> {
  const db = await openArchiveDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_SECRET_PAGES, 'readwrite');
    const store = tx.objectStore(STORE_SECRET_PAGES);
    const payload: Record<string, unknown> = {
      content: value.content,
      audio_storage_path: value.audio_storage_path,
      album_cover_url: value.album_cover_url,
      audio_original_filename: value.audio_original_filename,
      audio_start_seconds: value.audio_start_seconds,
    };
    if (value.audio_blob && value.audio_blob.byteLength > 0) {
      payload.audio_blob = value.audio_blob;
    }
    store.put(payload, secretPageKey(lastfmUsername, year, month));
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error('IDB write failed'));
    tx.onabort = () => reject(tx.error ?? new Error('IDB transaction aborted'));
  });
}
