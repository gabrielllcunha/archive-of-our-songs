export type SoundtrackSource = "file" | "youtube" | "spotify";

const YOUTUBE_PREFIX = "youtube:";
const SPOTIFY_PREFIX = "spotify:";

export function getSoundtrackSource(path: string | null, hasBlob = false): SoundtrackSource | null {
  if (typeof path === "string" && path.startsWith(YOUTUBE_PREFIX)) return "youtube";
  if (typeof path === "string" && path.startsWith(SPOTIFY_PREFIX)) return "spotify";
  if (hasBlob || Boolean(path)) return "file";
  return null;
}

export function isStoredFileAudioPath(path: string | null | undefined): path is string {
  if (!path) return false;
  return !path.startsWith(YOUTUBE_PREFIX) && !path.startsWith(SPOTIFY_PREFIX);
}

export function encodeYoutubeSoundtrackPath(videoId: string): string {
  return `${YOUTUBE_PREFIX}${videoId}`;
}

export function encodeSpotifySoundtrackPath(trackId: string): string {
  return `${SPOTIFY_PREFIX}${trackId}`;
}

export function parseYoutubeSoundtrackId(path: string | null): string | null {
  if (!path?.startsWith(YOUTUBE_PREFIX)) return null;
  const id = path.slice(YOUTUBE_PREFIX.length).trim();
  return id || null;
}

export function parseSpotifySoundtrackId(path: string | null): string | null {
  if (!path?.startsWith(SPOTIFY_PREFIX)) return null;
  const id = path.slice(SPOTIFY_PREFIX.length).trim();
  return id || null;
}

export function parseYoutubeVideoId(input: string): string | null {
  const value = input.trim();
  if (!value) return null;
  if (/^[\w-]{11}$/.test(value)) return value;

  try {
    const url = new URL(value);
    const host = url.hostname.replace(/^www\./, "");
    if (host === "youtu.be") {
      const id = url.pathname.split("/").filter(Boolean)[0];
      return id && /^[\w-]{11}$/.test(id) ? id : null;
    }
    if (host === "youtube.com" || host === "m.youtube.com" || host === "music.youtube.com") {
      const fromQuery = url.searchParams.get("v");
      if (fromQuery && /^[\w-]{11}$/.test(fromQuery)) return fromQuery;
      const parts = url.pathname.split("/").filter(Boolean);
      if ((parts[0] === "embed" || parts[0] === "shorts" || parts[0] === "live") && parts[1] && /^[\w-]{11}$/.test(parts[1])) {
        return parts[1];
      }
    }
  } catch {
    return null;
  }
  return null;
}

export function parseSpotifyTrackId(input: string): string | null {
  const value = input.trim();
  if (!value) return null;
  if (/^[A-Za-z0-9]{22}$/.test(value)) return value;

  const uriMatch = value.match(/^spotify:track:([A-Za-z0-9]{22})$/);
  if (uriMatch) return uriMatch[1];

  try {
    const url = new URL(value);
    const host = url.hostname.replace(/^www\./, "");
    if (host !== "open.spotify.com") return null;
    const parts = url.pathname.split("/").filter(Boolean);
    const trackIndex = parts[0]?.startsWith("intl-") ? 1 : 0;
    if (parts[trackIndex] !== "track") return null;
    const id = parts[trackIndex + 1];
    return id && /^[A-Za-z0-9]{22}$/.test(id) ? id : null;
  } catch {
    return null;
  }
}

export async function fetchYoutubeTitle(urlOrId: string): Promise<string | null> {
  const videoId = parseYoutubeVideoId(urlOrId);
  if (!videoId) return null;
  const pageUrl = `https://www.youtube.com/watch?v=${videoId}`;
  try {
    const res = await fetch(`https://www.youtube.com/oembed?url=${encodeURIComponent(pageUrl)}&format=json`);
    if (!res.ok) return null;
    const data = (await res.json()) as { title?: string };
    return typeof data.title === "string" && data.title.trim() ? data.title.trim() : null;
  } catch {
    return null;
  }
}
