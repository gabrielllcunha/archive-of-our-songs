import { supabase } from '@/utils/supabase';
import { getAccessTokenForFetch } from '@/utils/supabaseSession';
import * as idbSecretPages from '@/services/storage/idbSecretPages';

export type SecretPageRecord = {
  content: string;
  audio_storage_path: string | null;
  album_cover_url: string | null;
  audio_original_filename: string | null;
  audio_start_seconds: number;
  audio_blob?: ArrayBuffer | null;
};

const emptyRecord = (): SecretPageRecord => ({
  content: '',
  audio_storage_path: null,
  album_cover_url: null,
  audio_original_filename: null,
  audio_start_seconds: 0,
  audio_blob: null,
});

async function requireSessionUserId(): Promise<string> {
  if (!supabase) throw new Error('Supabase is not configured');
  const { data: { session }, error } = await supabase.auth.getSession();
  if (error || !session?.user?.id) {
    throw new Error('Not authenticated');
  }
  return session.user.id;
}

function isBrowserIndexedDbAvailable() {
  return typeof window !== 'undefined' && typeof indexedDB !== 'undefined';
}

function mapRow(row: {
  content: string | null;
  audio_storage_path: string | null;
  album_cover_url: string | null;
  audio_original_filename: string | null;
  audio_start_seconds: number | null;
}): SecretPageRecord {
  const start = row.audio_start_seconds;
  return {
    content: row.content ?? '',
    audio_storage_path: row.audio_storage_path ?? null,
    album_cover_url: row.album_cover_url ?? null,
    audio_original_filename: row.audio_original_filename ?? null,
    audio_start_seconds: typeof start === 'number' && Number.isFinite(start) ? start : 0,
    audio_blob: null,
  };
}

async function fetchSupabaseSecretPage(
  lastfmUsername: string,
  year: number,
  month: string
): Promise<SecretPageRecord | null> {
  if (!supabase) return null;
  const userId = await requireSessionUserId();
  const { data, error } = await supabase
    .from('secret_pages')
    .select(
      'content, audio_storage_path, album_cover_url, audio_original_filename, audio_start_seconds'
    )
    .eq('user_id', userId)
    .eq('year', year)
    .eq('month', month)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;
  return mapRow(data);
}

async function upsertSupabaseSecretPage(
  lastfmUsername: string,
  year: number,
  month: string,
  record: SecretPageRecord
) {
  if (!supabase) throw new Error('Supabase is not configured');
  const userId = await requireSessionUserId();
  const { error } = await supabase.from('secret_pages').upsert(
    {
      user_id: userId,
      year,
      month,
      content: record.content,
      audio_storage_path: record.audio_storage_path,
      album_cover_url: record.album_cover_url,
      audio_original_filename: record.audio_original_filename,
      audio_start_seconds: record.audio_start_seconds,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id,year,month' }
  );
  if (error) throw error;
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const s = reader.result as string;
      const i = s.indexOf(',');
      resolve(i >= 0 ? s.slice(i + 1) : s);
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

function toIdbPayload(record: SecretPageRecord): idbSecretPages.SecretPageIdbValue {
  return {
    content: record.content,
    audio_storage_path: record.audio_storage_path,
    album_cover_url: record.album_cover_url,
    audio_original_filename: record.audio_original_filename,
    audio_start_seconds: record.audio_start_seconds,
    audio_blob: record.audio_blob ?? undefined,
  };
}

export const secretPagesStorage = {
  async getSecretPage(lastfmUsername: string, year: number, month: string): Promise<SecretPageRecord> {
    if (!isBrowserIndexedDbAvailable()) {
      if (!supabase) return emptyRecord();
      try {
        const row = await fetchSupabaseSecretPage(lastfmUsername, year, month);
        return row ?? emptyRecord();
      } catch {
        return emptyRecord();
      }
    }

    if (supabase) {
      try {
        const row = await fetchSupabaseSecretPage(lastfmUsername, year, month);
        if (row !== null) {
          return row;
        }
        return emptyRecord();
      } catch {
        const local = await idbSecretPages.getSecretPageRecord(lastfmUsername, year, month);
        return {
          content: local.content,
          audio_storage_path: local.audio_storage_path,
          album_cover_url: local.album_cover_url,
          audio_original_filename: local.audio_original_filename,
          audio_start_seconds: local.audio_start_seconds,
          audio_blob: local.audio_blob ?? null,
        };
      }
    }

    const local = await idbSecretPages.getSecretPageRecord(lastfmUsername, year, month);
    return {
      content: local.content,
      audio_storage_path: local.audio_storage_path,
      album_cover_url: local.album_cover_url,
      audio_original_filename: local.audio_original_filename,
      audio_start_seconds: local.audio_start_seconds,
      audio_blob: local.audio_blob ?? null,
    };
  },

  async storeSecretPage(
    lastfmUsername: string,
    year: number,
    month: string,
    patch: Partial<SecretPageRecord>
  ): Promise<void> {
    let base = emptyRecord();

    if (supabase) {
      try {
        const row = await fetchSupabaseSecretPage(lastfmUsername, year, month);
        if (row) base = { ...row };
      } catch {
        const local = await idbSecretPages.getSecretPageRecord(lastfmUsername, year, month);
        base = {
          content: local.content,
          audio_storage_path: local.audio_storage_path,
          album_cover_url: local.album_cover_url,
          audio_original_filename: local.audio_original_filename,
          audio_start_seconds: local.audio_start_seconds,
          audio_blob: local.audio_blob ?? null,
        };
      }
    } else if (isBrowserIndexedDbAvailable()) {
      const local = await idbSecretPages.getSecretPageRecord(lastfmUsername, year, month);
      base = {
        content: local.content,
        audio_storage_path: local.audio_storage_path,
        album_cover_url: local.album_cover_url,
        audio_original_filename: local.audio_original_filename,
        audio_start_seconds: local.audio_start_seconds,
        audio_blob: local.audio_blob ?? null,
      };
    }

    const next: SecretPageRecord = {
      ...base,
      ...patch,
      audio_blob: patch.audio_blob !== undefined ? patch.audio_blob : base.audio_blob,
      audio_start_seconds:
        patch.audio_start_seconds !== undefined ? patch.audio_start_seconds : base.audio_start_seconds,
      audio_original_filename:
        patch.audio_original_filename !== undefined
          ? patch.audio_original_filename
          : base.audio_original_filename,
    };

    if (!isBrowserIndexedDbAvailable()) {
      if (!supabase) return;
      try {
        await upsertSupabaseSecretPage(lastfmUsername, year, month, next);
      } catch {
        
      }
      return;
    }

    if (supabase) {
      try {
        await upsertSupabaseSecretPage(lastfmUsername, year, month, next);
        return;
      } catch {
        await idbSecretPages.storeSecretPageRecord(lastfmUsername, year, month, toIdbPayload(next));
        return;
      }
    }

    await idbSecretPages.storeSecretPageRecord(lastfmUsername, year, month, toIdbPayload(next));
  },

  async uploadAudioFile(lastfmUsername: string, year: number, month: string, file: File): Promise<void> {
    const looksAudio =
      !file.type ||
      file.type.startsWith('audio/') ||
      /\.(mp3|m4a|aac|wav|ogg|flac|webm)$/i.test(file.name);
    if (!looksAudio) {
      throw new Error('Only audio files are allowed');
    }
    const audioBase64 = await fileToBase64(file);
    const token = await getAccessTokenForFetch();
    if (!token) throw new Error('Not authenticated');
    const res = await fetch('/api/secret-pages/upload-audio', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        year,
        month,
        audioBase64,
        audio_filename: file.name,
      }),
    });

    if (!res.ok) {
      const buf = await file.arrayBuffer();
      await secretPagesStorage.storeSecretPage(lastfmUsername, year, month, {
        audio_blob: buf,
        audio_storage_path: null,
        audio_original_filename: file.name.slice(0, 240),
        audio_start_seconds: 0,
      });
      throw new Error('Upload failed; saved locally only');
    }

    await res.json().catch(() => ({}));
  },

  async removeAudioFile(lastfmUsername: string, year: number, month: string): Promise<boolean> {
    let serverOk = false;
    try {
      const token = await getAccessTokenForFetch();
      const res = await fetch('/api/secret-pages/delete-audio', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ year, month }),
      });
      serverOk = res.ok;
    } catch {
      serverOk = false;
    }

    await secretPagesStorage.storeSecretPage(lastfmUsername, year, month, {
      audio_storage_path: null,
      audio_blob: null,
      audio_original_filename: null,
      audio_start_seconds: 0,
    });

    return serverOk;
  },

  async getAudioPlaybackUrl(
    lastfmUsername: string,
    year: number,
    month: string,
    record: SecretPageRecord
  ): Promise<string | null> {
    if (record.audio_blob && record.audio_blob.byteLength > 0) {
      return URL.createObjectURL(new Blob([record.audio_blob], { type: 'audio/mpeg' }));
    }
    if (!record.audio_storage_path) return null;

    const token = await getAccessTokenForFetch();
    const res = await fetch('/api/secret-pages/audio-url', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ year, month }),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { url?: string | null };
    return data.url ?? null;
  },
};
