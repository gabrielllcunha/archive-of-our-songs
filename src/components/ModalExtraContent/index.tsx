import { ArchiveIcon, ChevronLeftIcon, ChevronRightIcon, Cross2Icon } from "@radix-ui/react-icons";
import { HiOutlinePaperClip } from "react-icons/hi";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { Album } from "@/models";
import { secretPagesStorage } from "@/services/secretPagesStorage";
import { yearlyDataStorage } from "@/services/yearlyDataStorage";
import { formatSecondsAsMmSs, parseTimeToSeconds } from "@/utils/audioStartTime";
import { Spinner } from "@/components";
import { Dialog } from "../Dialog";
import styles from "./styles.module.scss";

interface ModalExtraContentProps {
  year: number;
  albums: Album[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  yearSelectRevision: number;
  onYearChange: (year: number) => void;
  minYear: number;
  maxYear: number;
  pendingMonthIndex: number | null;
  onPendingMonthConsumed: () => void;
}

function truncateFilename(name: string, maxLen: number) {
  if (name.length <= maxLen) return name;
  return `${name.slice(0, maxLen - 1)}…`;
}

export function ModalExtraContent({
  year,
  albums,
  open,
  onOpenChange,
  yearSelectRevision,
  onYearChange,
  minYear,
  maxYear,
  pendingMonthIndex,
  onPendingMonthConsumed,
}: ModalExtraContentProps) {
  const months = useMemo(() => [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
  ], []);
  const [selectedMonthIndex, setSelectedMonthIndex] = useState(0);
  const [modalYear, setModalYear] = useState(year);
  const [content, setContent] = useState("");
  const [loadingContent, setLoadingContent] = useState(false);
  const [editing, setEditing] = useState(false);
  const [albumEntries, setAlbumEntries] = useState<Album[]>(albums);
  const [imageLoading, setImageLoading] = useState(false);
  const [audioSrc, setAudioSrc] = useState<string | null>(null);
  const [audioReloadNonce, setAudioReloadNonce] = useState(0);
  const [dialogPlaybackNonce, setDialogPlaybackNonce] = useState(0);
  const [uploadBusy, setUploadBusy] = useState(false);
  const [removeBusy, setRemoveBusy] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [savedAlbumCoverUrl, setSavedAlbumCoverUrl] = useState<string | null>(null);
  const [audioUi, setAudioUi] = useState<{
    hasTrack: boolean;
    filename: string | null;
    startSeconds: number;
  }>({ hasTrack: false, filename: null, startSeconds: 0 });
  const [startTimeDraft, setStartTimeDraft] = useState("0:00");
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const debounceRef = useRef<number | null>(null);
  const startTimeDebounceRef = useRef<number | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioBlobUrlRef = useRef<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const selectedMonth = months[selectedMonthIndex];
  const selectedAlbum = albumEntries.find((item) => item.month === selectedMonth);
  const backgroundImageUrl = savedAlbumCoverUrl || selectedAlbum?.imageUrl;

  const displayAudioName = audioUi.filename?.trim() || "Soundtrack";

  useEffect(() => {
    setAlbumEntries(albums);
  }, [albums]);

  useEffect(() => {
    setModalYear(year);
  }, [year]);

  useEffect(() => {
    setSelectedMonthIndex(0);
  }, [yearSelectRevision]);

  useEffect(() => {
    if (!open || pendingMonthIndex === null) return;
    setSelectedMonthIndex(pendingMonthIndex);
    onPendingMonthConsumed();
  }, [open, pendingMonthIndex, onPendingMonthConsumed]);

  useEffect(() => {
    const username = localStorage.getItem("lastfm_username");
    if (!username) return;
    yearlyDataStorage.getYearlyData(username, modalYear, "albums")
      .then((data) => {
        if (data && data.length > 0) setAlbumEntries(data as Album[]);
      })
      .catch(() => { });
  }, [modalYear]);

  useLayoutEffect(() => {
    if (!localStorage.getItem("lastfm_username")) return;
    if (audioBlobUrlRef.current) {
      URL.revokeObjectURL(audioBlobUrlRef.current);
      audioBlobUrlRef.current = null;
    }
    setAudioSrc(null);
  }, [modalYear, selectedMonth, audioReloadNonce]);

  useEffect(() => {
    const username = localStorage.getItem("lastfm_username");
    if (!username) {
      setContent("");
      setSavedAlbumCoverUrl(null);
      setAudioSrc(null);
      setAudioUi({ hasTrack: false, filename: null, startSeconds: 0 });
      setStartTimeDraft("0:00");
      setLoadingContent(false);
      return;
    }

    let cancelled = false;

    setLoadingContent(true);
    setUploadError(null);

    (async () => {
      const rec = await secretPagesStorage.getSecretPage(username, modalYear, selectedMonth);
      if (cancelled) return;
      setContent(rec.content);
      setSavedAlbumCoverUrl(rec.album_cover_url);
      const hasTrack =
        Boolean(rec.audio_storage_path) ||
        Boolean(rec.audio_blob && rec.audio_blob.byteLength > 0);
      const startSec =
        typeof rec.audio_start_seconds === "number" && Number.isFinite(rec.audio_start_seconds)
          ? Math.max(0, rec.audio_start_seconds)
          : 0;
      setAudioUi({
        hasTrack,
        filename: rec.audio_original_filename,
        startSeconds: startSec,
      });
      setStartTimeDraft(formatSecondsAsMmSs(startSec));
      const url = await secretPagesStorage.getAudioPlaybackUrl(username, modalYear, selectedMonth, rec);
      if (cancelled) {
        if (url?.startsWith("blob:")) URL.revokeObjectURL(url);
        return;
      }
      if (url?.startsWith("blob:")) audioBlobUrlRef.current = url;
      setAudioSrc(url);
      setLoadingContent(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [modalYear, selectedMonth, audioReloadNonce]);

  useEffect(() => {
    return () => {
      if (audioBlobUrlRef.current) {
        URL.revokeObjectURL(audioBlobUrlRef.current);
        audioBlobUrlRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    const el = audioRef.current;
    if (!el || !audioSrc) {
      if (el && !audioSrc) {
        el.pause();
        el.removeAttribute("src");
      }
      return;
    }

    let phase: "first" | "loop" = "first";
    const startSec = Math.max(0, audioUi.startSeconds);

    const beginPlayback = () => {
      if (phase === "first" && startSec > 0 && Number.isFinite(el.duration) && el.duration > 0) {
        el.currentTime = Math.min(startSec, Math.max(0, el.duration - 0.05));
      }
      void el.play().catch(() => { });
    };

    const onEnded = () => {
      phase = "loop";
      el.currentTime = 0;
      void el.play().catch(() => { });
    };

    el.loop = false;
    el.src = audioSrc;
    el.addEventListener("ended", onEnded);

    if (el.readyState >= HTMLMediaElement.HAVE_METADATA) {
      beginPlayback();
    } else {
      el.addEventListener("loadedmetadata", beginPlayback, { once: true });
    }

    return () => {
      el.removeEventListener("ended", onEnded);
      el.removeEventListener("loadedmetadata", beginPlayback);
      el.pause();
    };
  }, [audioSrc, audioUi.startSeconds, dialogPlaybackNonce]);

  useEffect(() => {
    setImageLoading(Boolean(backgroundImageUrl));
  }, [backgroundImageUrl]);

  useEffect(() => {
    if (!editing || !textareaRef.current) return;
    textareaRef.current.focus();
    const length = textareaRef.current.value.length;
    textareaRef.current.setSelectionRange(length, length);
  }, [editing]);

  const saveContent = async (value: string) => {
    const username = localStorage.getItem("lastfm_username");
    if (!username) return;
    const cover = selectedAlbum?.imageUrl ?? null;
    await secretPagesStorage.storeSecretPage(username, modalYear, selectedMonth, {
      content: value,
      album_cover_url: cover,
    });
    setSavedAlbumCoverUrl(cover);
  };

  const saveAudioStartSeconds = useCallback(
    async (seconds: number) => {
      const username = localStorage.getItem("lastfm_username");
      if (!username || !audioUi.hasTrack) return;
      const clamped = Math.max(0, seconds);
      await secretPagesStorage.storeSecretPage(username, modalYear, selectedMonth, {
        audio_start_seconds: clamped,
      });
      setAudioUi((u) => ({ ...u, startSeconds: clamped }));
      setStartTimeDraft(formatSecondsAsMmSs(clamped));
    },
    [audioUi.hasTrack, selectedMonth, modalYear]
  );

  const handleChange = (value: string) => {
    setContent(value);
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    debounceRef.current = window.setTimeout(() => {
      void saveContent(value);
    }, 700);
  };

  const handleBlur = async () => {
    if (debounceRef.current) {
      window.clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }
    await saveContent(content);
    setEditing(false);
  };

  const flushStartTime = useCallback(() => {
    if (startTimeDebounceRef.current) {
      window.clearTimeout(startTimeDebounceRef.current);
      startTimeDebounceRef.current = null;
    }
    const parsed = parseTimeToSeconds(startTimeDraft);
    if (parsed === null) {
      setStartTimeDraft(formatSecondsAsMmSs(audioUi.startSeconds));
      return;
    }
    const el = audioRef.current;
    let max = Number.POSITIVE_INFINITY;
    if (el && Number.isFinite(el.duration) && el.duration > 0) {
      max = Math.max(0, el.duration - 0.05);
    }
    const clamped = Math.min(parsed, max);
    void saveAudioStartSeconds(clamped);
  }, [audioUi.startSeconds, startTimeDraft, saveAudioStartSeconds]);

  const handleStartTimeChange = (value: string) => {
    setStartTimeDraft(value);
    if (startTimeDebounceRef.current) window.clearTimeout(startTimeDebounceRef.current);
    startTimeDebounceRef.current = window.setTimeout(() => {
      const parsed = parseTimeToSeconds(value);
      if (parsed === null) return;
      const el = audioRef.current;
      let max = Number.POSITIVE_INFINITY;
      if (el && Number.isFinite(el.duration) && el.duration > 0) {
        max = Math.max(0, el.duration - 0.05);
      }
      void saveAudioStartSeconds(Math.min(parsed, max));
    }, 500);
  };

  const handleAudioFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    const username = localStorage.getItem("lastfm_username");
    if (!file || !username) return;
    setUploadBusy(true);
    setUploadError(null);
    try {
      await secretPagesStorage.uploadAudioFile(username, modalYear, selectedMonth, file);
      setAudioReloadNonce((n) => n + 1);
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "Upload failed");
      setAudioReloadNonce((n) => n + 1);
    } finally {
      setUploadBusy(false);
    }
  };

  const handleRemoveAudio = async () => {
    const username = localStorage.getItem("lastfm_username");
    if (!username) return;
    setRemoveBusy(true);
    setUploadError(null);
    const serverOk = await secretPagesStorage.removeAudioFile(username, modalYear, selectedMonth);
    setAudioReloadNonce((n) => n + 1);
    if (!serverOk) {
      setUploadError("Removed on this device; cloud copy may still exist. Try again if needed.");
    }
    setRemoveBusy(false);
  };

  const goPrevMonth = () => {
    if (selectedMonthIndex > 0) {
      setSelectedMonthIndex((prev) => prev - 1);
    } else if (modalYear > minYear) {
      const y = modalYear - 1;
      setModalYear(y);
      setSelectedMonthIndex(months.length - 1);
      onYearChange(y);
    }
  };

  const goNextMonth = () => {
    if (selectedMonthIndex < months.length - 1) {
      setSelectedMonthIndex((prev) => prev + 1);
    } else if (modalYear < maxYear) {
      const y = modalYear + 1;
      setModalYear(y);
      setSelectedMonthIndex(0);
      onYearChange(y);
    }
  };

  const prevDisabled = selectedMonthIndex === 0 && modalYear <= minYear;
  const nextDisabled = selectedMonthIndex === months.length - 1 && modalYear >= maxYear;

  return (
    <Dialog
      open={open}
      allowClose={false}
      contentClassName={styles.dialogContainer}
      onOpenChange={(nextOpen) => {
        onOpenChange(nextOpen);
        if (nextOpen) {
          setDialogPlaybackNonce((n) => n + 1);
        } else {
          audioRef.current?.pause();
        }
      }}
      trigger={
        <div className={styles.secretIcon}>
          <ArchiveIcon height={24} width={24} />
        </div>
      }
    >
      <audio ref={audioRef} className={styles.hiddenAudio} playsInline preload="auto" />
      <input
        ref={fileInputRef}
        type="file"
        accept="audio/*"
        className={styles.hiddenFileInput}
        onChange={handleAudioFileChange}
        aria-hidden
      />
      <div className={styles.dialogContent}>
        {backgroundImageUrl ? (
          <Image
            className={`${styles.albumBackgroundImage} ${imageLoading ? styles.albumImageLoading : ""}`}
            src={backgroundImageUrl}
            alt={selectedAlbum?.name || selectedMonth}
            fill
            sizes="(max-width: 1024px) 100vw, 86vh"
            unoptimized
            onLoad={() => setImageLoading(false)}
            onError={() => setImageLoading(false)}
          />
        ) : (
          <div className={styles.imagePlaceholder}>No album cover found for this month.</div>
        )}

        {imageLoading && backgroundImageUrl && (
          <div className={styles.imageLoadingOverlay}>
            <Spinner size="large" loading={imageLoading} />
          </div>
        )}

        <div className={styles.foregroundContent}>
          <div className={styles.leftPanel}>
            <div className={styles.monthHeader}>
              <button
                type="button"
                onClick={goPrevMonth}
                className={`${styles.monthArrow} ${styles.monthArrowLeft}`}
                aria-label="Previous month"
                disabled={prevDisabled}
              >
                <ChevronLeftIcon />
              </button>
              <span className={styles.monthTitle}>{selectedMonth}</span>
              <button
                type="button"
                onClick={goNextMonth}
                className={`${styles.monthArrow} ${styles.monthArrowRight}`}
                aria-label="Next month"
                disabled={nextDisabled}
              >
                <ChevronRightIcon />
              </button>
              <span className={styles.monthYear}>{modalYear}</span>
            </div>
            <div className={styles.mediaRow}>
              {audioUi.hasTrack ? (
                <>
                  <div className={styles.soundtrackRow}>
                    <span className={styles.soundtrackName} title={displayAudioName}>
                      {truncateFilename(displayAudioName, 36)}
                    </span>
                    <button
                      type="button"
                      className={styles.soundtrackRemove}
                      aria-label="Remove soundtrack"
                      disabled={removeBusy || uploadBusy}
                      onClick={() => void handleRemoveAudio()}
                    >
                      <Cross2Icon width={16} height={16} />
                    </button>
                  </div>
                  <div className={styles.startTimeRow}>
                    <label className={styles.startTimeLabel} htmlFor="secret-audio-start">
                      First play starts at
                    </label>
                    <input
                      id="secret-audio-start"
                      type="text"
                      className={styles.startTimeInput}
                      value={startTimeDraft}
                      onChange={(e) => handleStartTimeChange(e.target.value)}
                      onBlur={() => flushStartTime()}
                      placeholder="m:ss"
                      inputMode="numeric"
                      autoComplete="off"
                      aria-describedby="secret-audio-start-hint"
                    />
                  </div>
                </>
              ) : (
                <button
                  type="button"
                  className={styles.mediaButton}
                  disabled={uploadBusy}
                  onClick={() => fileInputRef.current?.click()}
                >
                  {uploadBusy ? (
                    "Uploading…"
                  ) : (
                    <>
                      <HiOutlinePaperClip className={styles.mediaButtonIcon} aria-hidden />
                      Attach Soundtrack
                    </>
                  )}
                </button>
              )}
              {uploadError && (
                <span className={styles.uploadHint} role="status">
                  {uploadError}
                </span>
              )}
            </div>
            {editing ? (
              <textarea
                ref={textareaRef}
                className={styles.diaryInput}
                value={content}
                onChange={(event) => handleChange(event.target.value)}
                onBlur={handleBlur}
                placeholder="What did things in this month sound like?"
              />
            ) : (
              <div
                className={
                  `${styles.diaryText}${
                    !loadingContent && !content ? ` ${styles.diaryTextPlaceholder}` : ""
                  }`
                }
                onClick={() => setEditing(true)}
              >
                {loadingContent ? "Loading..." : (content || "What did things in this month sound like?")}
              </div>
            )}
          </div>
          <div className={styles.rightSpacer} />
        </div>
      </div>
    </Dialog>
  );
}
