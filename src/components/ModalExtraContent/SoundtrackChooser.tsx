import { useEffect, useRef, useState } from "react";
import { ChevronLeftIcon, Cross2Icon } from "@radix-ui/react-icons";
import { HiOutlineMusicNote } from "react-icons/hi";
import { FaSpotify, FaYoutube } from "react-icons/fa";
import { Dialog, Spinner } from "@/components";
import { authenticatedFetch, UnauthorizedSessionError } from "@/utils/authenticatedFetch";
import {
  fetchYoutubeTitle,
  parseSpotifyTrackId,
  parseYoutubeVideoId,
} from "@/utils/soundtrackSource";
import type { SpotifyTrackResult } from "@/pages/api/spotify/search";
import styles from "./chooser.module.scss";

type ChooserStep = "choose" | "mp3" | "spotify" | "youtube";

interface SoundtrackChooserProps {
  open: boolean;
  busy: boolean;
  onOpenChange: (open: boolean) => void;
  onAttachMp3: (file: File) => Promise<void>;
  onAttachYoutube: (videoId: string, title: string) => Promise<void>;
  onAttachSpotify: (trackId: string, title: string) => Promise<void>;
}

const MAX_MP3_BYTES = 3.3 * 1024 * 1024;

function isMp3File(file: File) {
  return file.type === "audio/mpeg" || file.type === "audio/mp3" || /\.mp3$/i.test(file.name);
}

export function SoundtrackChooser({
  open,
  busy,
  onOpenChange,
  onAttachMp3,
  onAttachYoutube,
  onAttachSpotify,
}: SoundtrackChooserProps) {
  const [step, setStep] = useState<ChooserStep>("choose");
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [spotifyQuery, setSpotifyQuery] = useState("");
  const [spotifyUrl, setSpotifyUrl] = useState("");
  const [spotifyResults, setSpotifyResults] = useState<SpotifyTrackResult[]>([]);
  const [spotifyConfigured, setSpotifyConfigured] = useState(true);
  const [spotifySearching, setSpotifySearching] = useState(false);
  const [spotifyStatus, setSpotifyStatus] = useState<{
    connected: boolean;
    premium: boolean;
    displayName: string | null;
  } | null>(null);
  const [spotifyConnecting, setSpotifyConnecting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const searchTimerRef = useRef<number | null>(null);

  useEffect(() => {
    if (open) return;
    setStep("choose");
    setError(null);
    setDragOver(false);
    setYoutubeUrl("");
    setSpotifyQuery("");
    setSpotifyUrl("");
    setSpotifyResults([]);
    setSpotifySearching(false);
    setSpotifyConnecting(false);
  }, [open]);

  useEffect(() => {
    if (!open || step !== "spotify") return;
    let cancelled = false;
    void (async () => {
      try {
        const res = await authenticatedFetch("/api/spotify/status");
        const data = (await res.json().catch(() => ({}))) as {
          configured?: boolean;
          connected?: boolean;
          premium?: boolean;
          displayName?: string | null;
        };
        if (cancelled) return;
        setSpotifyConfigured(data.configured !== false);
        setSpotifyStatus({
          connected: Boolean(data.connected),
          premium: Boolean(data.premium),
          displayName: data.displayName ?? null,
        });
      } catch (err) {
        if (err instanceof UnauthorizedSessionError) return;
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, step]);

  useEffect(() => {
    if (!open || step !== "spotify" || !spotifyStatus?.connected) return;
    if (searchTimerRef.current) window.clearTimeout(searchTimerRef.current);
    const query = spotifyQuery.trim();
    if (query.length < 2) {
      setSpotifyResults([]);
      setSpotifySearching(false);
      return;
    }
    setSpotifySearching(true);
    searchTimerRef.current = window.setTimeout(() => {
      void (async () => {
        try {
          const res = await authenticatedFetch(`/api/spotify/search?q=${encodeURIComponent(query)}`);
          const data = (await res.json().catch(() => ({}))) as {
            tracks?: SpotifyTrackResult[];
            configured?: boolean;
            error?: string;
          };
          if (res.status === 503 || data.configured === false) {
            setSpotifyConfigured(false);
            setSpotifyResults([]);
            return;
          }
          setSpotifyConfigured(true);
          if (!res.ok) {
            setError(data.error ?? "Could not search Spotify");
            setSpotifyResults([]);
            return;
          }
          setError(null);
          setSpotifyResults(data.tracks ?? []);
        } catch (err) {
          if (err instanceof UnauthorizedSessionError) return;
          setError("Could not search Spotify");
        } finally {
          setSpotifySearching(false);
        }
      })();
    }, 350);
    return () => {
      if (searchTimerRef.current) window.clearTimeout(searchTimerRef.current);
    };
  }, [open, step, spotifyQuery, spotifyStatus?.connected]);

  const handleMp3File = async (file: File | undefined) => {
    if (!file || busy) return;
    if (!isMp3File(file)) {
      setError("Please choose an .mp3 file.");
      return;
    }
    if (file.size > MAX_MP3_BYTES) {
      setError("Soundtracks must be 3.3MB or smaller.");
      return;
    }
    setError(null);
    try {
      await onAttachMp3(file);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    }
  };

  const handleYoutubeSave = async () => {
    const videoId = parseYoutubeVideoId(youtubeUrl);
    if (!videoId) {
      setError("Paste a valid YouTube URL.");
      return;
    }
    setError(null);
    const title = (await fetchYoutubeTitle(videoId)) ?? "YouTube";
    try {
      await onAttachYoutube(videoId, title);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save YouTube soundtrack");
    }
  };

  const handleSpotifyUrlSave = async () => {
    const trackId = parseSpotifyTrackId(spotifyUrl);
    if (!trackId) {
      setError("Paste a valid Spotify track URL.");
      return;
    }
    setError(null);
    let title = "Spotify track";
    try {
      const res = await authenticatedFetch(`/api/spotify/search?q=${encodeURIComponent(`spotify:track:${trackId}`)}`);
      const data = (await res.json().catch(() => ({}))) as { tracks?: SpotifyTrackResult[] };
      const match = data.tracks?.find((track) => track.id === trackId) ?? data.tracks?.[0];
      if (match) {
        title = match.artists ? `${match.artists} - ${match.name}` : match.name;
      }
    } catch {
    }
    try {
      await onAttachSpotify(trackId, title);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save Spotify soundtrack");
    }
  };

  const title =
    step === "mp3" ? ".mp3" : step === "spotify" ? "Spotify" : step === "youtube" ? "YouTube" : "Add Soundtrack";

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      showCloseButton={false}
      contentClassName={styles.chooserDialog}
      overlayClassName={styles.chooserOverlay}
    >
      <div className={styles.chooserHeader}>
        {step !== "choose" ? (
          <button type="button" className={styles.headerButton} onClick={() => { setStep("choose"); setError(null); }} aria-label="Back">
            <ChevronLeftIcon />
          </button>
        ) : (
          <span className={styles.headerSpacer} />
        )}
        <h2 className={styles.chooserTitle}>{title}</h2>
        <button type="button" className={styles.headerButton} onClick={() => onOpenChange(false)} aria-label="Close">
          <Cross2Icon />
        </button>
      </div>

      {step === "choose" && (
        <div className={styles.sourceRow}>
          <button type="button" className={`${styles.sourceButton} ${styles.sourceMp3}`} onClick={() => setStep("mp3")}>
            <HiOutlineMusicNote className={styles.sourceIcon} aria-hidden />
            .mp3
          </button>
          <button type="button" className={`${styles.sourceButton} ${styles.sourceSpotify}`} onClick={() => setStep("spotify")}>
            <FaSpotify className={styles.sourceIcon} aria-hidden />
            Spotify
          </button>
          <button type="button" className={`${styles.sourceButton} ${styles.sourceYoutube}`} onClick={() => setStep("youtube")}>
            <FaYoutube className={styles.sourceIcon} aria-hidden />
            YouTube
          </button>
        </div>
      )}

      {step === "mp3" && (
        <div className={styles.stepBody}>
          <input
            ref={fileInputRef}
            type="file"
            accept=".mp3,audio/mpeg"
            className={styles.hiddenInput}
            onChange={(event) => {
              const file = event.target.files?.[0];
              event.target.value = "";
              void handleMp3File(file);
            }}
          />
          <button
            type="button"
            className={`${styles.dropzone}${dragOver ? ` ${styles.dropzoneActive}` : ""}`}
            disabled={busy}
            onClick={() => fileInputRef.current?.click()}
            onDragEnter={(event) => { event.preventDefault(); setDragOver(true); }}
            onDragOver={(event) => { event.preventDefault(); setDragOver(true); }}
            onDragLeave={(event) => { event.preventDefault(); setDragOver(false); }}
            onDrop={(event) => {
              event.preventDefault();
              setDragOver(false);
              void handleMp3File(event.dataTransfer.files?.[0]);
            }}
          >
            {busy ? "Uploading…" : "Drop an .mp3 here, or click to choose one"}
          </button>
          <p className={styles.hint}>Maximum size 3.3MB</p>
        </div>
      )}

      {step === "youtube" && (
        <div className={styles.stepBody}>
          <label className={styles.fieldLabel} htmlFor="soundtrack-youtube-url">
            YouTube URL
          </label>
          <input
            id="soundtrack-youtube-url"
            type="url"
            className={styles.textInput}
            value={youtubeUrl}
            onChange={(event) => setYoutubeUrl(event.target.value)}
            placeholder="https://www.youtube.com/watch?v=…"
            autoComplete="off"
          />
          <button type="button" className={styles.primaryButton} disabled={busy || !youtubeUrl.trim()} onClick={() => void handleYoutubeSave()}>
            {busy ? "Saving…" : "Use this URL"}
          </button>
        </div>
      )}

      {step === "spotify" && (
        <div className={styles.stepBody}>
          {spotifyStatus === null ? (
            <div className={styles.searchStatus}>
              <Spinner size="small" loading />
            </div>
          ) : spotifyStatus.connected ? (
            <>
              <div className={styles.accountRow}>
                <p className={styles.hint}>
                  Connected as {spotifyStatus.displayName || "Spotify"}. {spotifyStatus.premium ? "Premium — full songs will play." : "Free account — 30-second previews will play."}
                </p>
                <button
                  type="button"
                  className={styles.linkButton}
                  onClick={() => {
                    void (async () => {
                      await fetch("/api/spotify/disconnect", { method: "POST" });
                      setSpotifyStatus({ connected: false, premium: false, displayName: null });
                    })();
                  }}
                >
                  Disconnect
                </button>
              </div>
              {spotifyConfigured && (
                <>
                  <label className={styles.fieldLabel} htmlFor="soundtrack-spotify-search">
                    Search Spotify
                  </label>
                  <input
                    id="soundtrack-spotify-search"
                    type="search"
                    className={styles.textInput}
                    value={spotifyQuery}
                    onChange={(event) => setSpotifyQuery(event.target.value)}
                    placeholder="Song or artist"
                    autoComplete="off"
                  />
                  {spotifySearching && (
                    <div className={styles.searchStatus}>
                      <Spinner size="small" loading />
                    </div>
                  )}
                  {spotifyResults.length > 0 && (
                    <div className={styles.results}>
                      {spotifyResults.map((track) => (
                        <button
                          key={track.id}
                          type="button"
                          className={styles.resultButton}
                          disabled={busy}
                          onClick={() => {
                            void onAttachSpotify(
                              track.id,
                              track.artists ? `${track.artists} - ${track.name}` : track.name
                            ).catch((err) => {
                              setError(err instanceof Error ? err.message : "Could not save Spotify soundtrack");
                            });
                          }}
                        >
                          <span className={styles.resultName}>{track.name}</span>
                          {track.artists && <span className={styles.resultMeta}>{track.artists}</span>}
                        </button>
                      ))}
                    </div>
                  )}
                </>
              )}
              <label className={styles.fieldLabel} htmlFor="soundtrack-spotify-url">
                {spotifyConfigured ? "Or paste a track URL" : "Paste a Spotify track URL"}
              </label>
              <input
                id="soundtrack-spotify-url"
                type="url"
                className={styles.textInput}
                value={spotifyUrl}
                onChange={(event) => setSpotifyUrl(event.target.value)}
                placeholder="https://open.spotify.com/track/…"
                autoComplete="off"
              />
              <button type="button" className={styles.primaryButton} disabled={busy || !spotifyUrl.trim()} onClick={() => void handleSpotifyUrlSave()}>
                {busy ? "Saving…" : "Use this track"}
              </button>
            </>
          ) : (
            <div className={styles.accountRow}>
              <p className={styles.hint}>
                Connect your Spotify account to attach songs. Premium plays the full track; a free account plays a 30-second preview.
              </p>
              <button
                type="button"
                className={styles.primaryButton}
                disabled={!spotifyConfigured || spotifyConnecting}
                onClick={() => {
                  void (async () => {
                    setSpotifyConnecting(true);
                    setError(null);
                    try {
                      const res = await authenticatedFetch("/api/spotify/login-url");
                      const data = (await res.json().catch(() => ({}))) as { url?: string; error?: string };
                      if (!res.ok || !data.url) {
                        setError(data.error ?? "Could not start Spotify login");
                        return;
                      }
                      window.location.href = data.url;
                    } catch (err) {
                      if (err instanceof UnauthorizedSessionError) return;
                      setError("Could not start Spotify login");
                    } finally {
                      setSpotifyConnecting(false);
                    }
                  })();
                }}
              >
                {spotifyConnecting ? "Connecting…" : "Connect Spotify"}
              </button>
            </div>
          )}
        </div>
      )}

      {error && (
        <p className={styles.error} role="status">
          {error}
        </p>
      )}
    </Dialog>
  );
}
