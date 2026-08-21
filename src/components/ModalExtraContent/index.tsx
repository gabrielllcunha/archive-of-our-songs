import { ArchiveIcon, ChevronLeftIcon, ChevronRightIcon, Cross2Icon, ImageIcon } from "@radix-ui/react-icons";
import { HiOutlinePaperClip } from "react-icons/hi";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { Album } from "@/models";
import { secretPagesStorage } from "@/services/secretPagesStorage";
import { yearlyDataStorage } from "@/services/yearlyDataStorage";
import { formatSecondsAsMmSs, parseTimeToSeconds } from "@/utils/audioStartTime";
import { InlineMarkdown, Skeleton, Spinner, useToast } from "@/components";
import { Dialog } from "../Dialog";
import { shouldIgnoreDialogDismiss } from "../Toast/dismissGuard";
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

const MOBILE_SWIPE_MQ = "(hover: none) and (pointer: coarse)";
const SWIPE_AXIS_LOCK_PX = 12;
const SWIPE_COMMIT_PX = 64;
const SWIPE_COMMIT_RATIO = 0.18;
const SWIPE_VELOCITY = 0.4;
const SWIPE_OUT_MS = 220;
const SWIPE_IN_MS = 340;
const EDGE_RESISTANCE = 0.22;

function isMobileSwipeDevice() {
  return window.matchMedia(MOBILE_SWIPE_MQ).matches;
}

function isMonthSwipeIgnoredTarget(target: EventTarget | null) {
  if (!(target instanceof Element)) return false;
  return Boolean(target.closest("button, input, textarea, select, a"));
}

function waitMs(ms: number) {
  return new Promise<void>((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

function useMobileMonthSwipe({
  open,
  onPrev,
  onNext,
  prevDisabled,
  nextDisabled,
}: {
  open: boolean;
  onPrev: () => void;
  onNext: () => void;
  prevDisabled: boolean;
  nextDisabled: boolean;
}) {
  const surfaceRef = useRef<HTMLDivElement | null>(null);
  const layerRef = useRef<HTMLDivElement | null>(null);
  const onPrevRef = useRef(onPrev);
  const onNextRef = useRef(onNext);
  const prevDisabledRef = useRef(prevDisabled);
  const nextDisabledRef = useRef(nextDisabled);
  onPrevRef.current = onPrev;
  onNextRef.current = onNext;
  prevDisabledRef.current = prevDisabled;
  nextDisabledRef.current = nextDisabled;

  useEffect(() => {
    if (!open) return;
    const surface = surfaceRef.current;
    const layer = layerRef.current;
    if (!surface || !layer) return;

    let cancelled = false;
    const state = {
      pointerId: -1,
      startX: 0,
      startY: 0,
      lastX: 0,
      lastT: 0,
      velocity: 0,
      axis: null as "h" | "v" | null,
      offset: 0,
      active: false,
      busy: false,
    };

    const prefersReducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const setOffset = (px: number, animateMs = 0) => {
      if (cancelled) return;
      state.offset = px;
      const width = Math.max(surface.clientWidth, 1);
      const fade = Math.min(Math.abs(px) / width * 0.28, 0.28);
      layer.style.transition = animateMs > 0
        ? `transform ${animateMs}ms cubic-bezier(0.22, 1, 0.36, 1), opacity ${animateMs}ms ease`
        : "none";
      layer.style.transform = `translate3d(${px}px, 0, 0)`;
      layer.style.opacity = px === 0 ? "1" : String(1 - fade);
    };

    const resetLayer = () => {
      layer.style.transition = "none";
      layer.style.transform = "";
      layer.style.opacity = "";
      state.offset = 0;
    };

    const resist = (dx: number) => {
      const blocked = (dx > 0 && prevDisabledRef.current) || (dx < 0 && nextDisabledRef.current);
      return blocked ? dx * EDGE_RESISTANCE : dx;
    };

    const finishSwipe = async (commitDir: "prev" | "next" | null) => {
      const width = Math.max(surface.clientWidth, 1);
      if (!commitDir) {
        setOffset(0, 280);
        await waitMs(300);
        if (!cancelled) resetLayer();
        return;
      }

      if (prefersReducedMotion()) {
        resetLayer();
        if (commitDir === "next") onNextRef.current();
        else onPrevRef.current();
        return;
      }

      setOffset(commitDir === "next" ? -width : width, SWIPE_OUT_MS);
      await waitMs(SWIPE_OUT_MS);
      if (cancelled) return;
      setOffset(commitDir === "next" ? width : -width, 0);
      if (commitDir === "next") onNextRef.current();
      else onPrevRef.current();
      await new Promise<void>((resolve) => {
        requestAnimationFrame(() => {
          requestAnimationFrame(() => resolve());
        });
      });
      if (cancelled) return;
      setOffset(0, SWIPE_IN_MS);
      await waitMs(SWIPE_IN_MS);
      if (!cancelled) resetLayer();
    };

    const onPointerDown = (event: PointerEvent) => {
      if (state.busy || state.active) return;
      if (!isMobileSwipeDevice()) return;
      if (event.pointerType !== "touch" && event.pointerType !== "mouse") return;
      if (event.button !== 0) return;
      if (isMonthSwipeIgnoredTarget(event.target)) return;

      state.active = true;
      state.axis = null;
      state.pointerId = event.pointerId;
      state.startX = event.clientX;
      state.startY = event.clientY;
      state.lastX = event.clientX;
      state.lastT = event.timeStamp;
      state.velocity = 0;
      state.offset = 0;
    };

    const onPointerMove = (event: PointerEvent) => {
      if (!state.active || event.pointerId !== state.pointerId) return;

      const dx = event.clientX - state.startX;
      const dy = event.clientY - state.startY;
      const dt = event.timeStamp - state.lastT;
      if (dt > 0) {
        state.velocity = (event.clientX - state.lastX) / dt;
      }
      state.lastX = event.clientX;
      state.lastT = event.timeStamp;

      if (!state.axis) {
        if (Math.abs(dx) < SWIPE_AXIS_LOCK_PX && Math.abs(dy) < SWIPE_AXIS_LOCK_PX) return;
        state.axis = Math.abs(dx) >= Math.abs(dy) ? "h" : "v";
        if (state.axis === "h") {
          surface.setPointerCapture(event.pointerId);
        }
      }

      if (state.axis !== "h") return;
      event.preventDefault();
      setOffset(resist(dx));
    };

    const onPointerUp = (event: PointerEvent) => {
      if (!state.active || event.pointerId !== state.pointerId) return;
      const wasHorizontal = state.axis === "h";
      const offset = state.offset;
      const velocity = state.velocity;
      state.active = false;
      state.axis = null;
      state.pointerId = -1;

      if (surface.hasPointerCapture(event.pointerId)) {
        surface.releasePointerCapture(event.pointerId);
      }

      if (!wasHorizontal) {
        resetLayer();
        return;
      }

      const width = Math.max(surface.clientWidth, 1);
      const threshold = Math.min(SWIPE_COMMIT_PX, width * SWIPE_COMMIT_RATIO);
      const dir: "prev" | "next" = offset < 0 ? "next" : "prev";
      const blocked = dir === "next" ? nextDisabledRef.current : prevDisabledRef.current;
      const distanceOk = Math.abs(offset) >= threshold;
      const velocityOk =
        (dir === "next" && velocity <= -SWIPE_VELOCITY) ||
        (dir === "prev" && velocity >= SWIPE_VELOCITY);
      const commit = !blocked && (distanceOk || (velocityOk && Math.abs(offset) > 16));

      state.busy = true;
      void finishSwipe(commit ? dir : null).finally(() => {
        state.busy = false;
      });
    };

    const onPointerCancel = (event: PointerEvent) => {
      if (!state.active || event.pointerId !== state.pointerId) return;
      state.active = false;
      state.axis = null;
      state.pointerId = -1;
      state.busy = true;
      void finishSwipe(null).finally(() => {
        state.busy = false;
      });
    };

    const onTouchMove = (event: TouchEvent) => {
      if (state.active && state.axis === "h") {
        event.preventDefault();
      }
    };

    surface.addEventListener("pointerdown", onPointerDown);
    surface.addEventListener("pointermove", onPointerMove, { passive: false });
    surface.addEventListener("pointerup", onPointerUp);
    surface.addEventListener("pointercancel", onPointerCancel);
    surface.addEventListener("touchmove", onTouchMove, { passive: false });

    return () => {
      cancelled = true;
      surface.removeEventListener("pointerdown", onPointerDown);
      surface.removeEventListener("pointermove", onPointerMove);
      surface.removeEventListener("pointerup", onPointerUp);
      surface.removeEventListener("pointercancel", onPointerCancel);
      surface.removeEventListener("touchmove", onTouchMove);
      resetLayer();
    };
  }, [open]);

  return { surfaceRef, layerRef };
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
  const { show: showToast } = useToast();
  const months = useMemo(() => [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
  ], []);
  const [view, setView] = useState({ year, monthIndex: 0 });
  const modalYear = view.year;
  const selectedMonthIndex = view.monthIndex;
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
  const keyboardFocusAnchorRef = useRef<HTMLDivElement | null>(null);
  const viewRevisionRef = useRef(0);
  const decryptFailedRef = useRef(false);
  const modalYearRef = useRef(modalYear);
  modalYearRef.current = modalYear;

  const resolvedMonthIndex = open && pendingMonthIndex !== null ? pendingMonthIndex : selectedMonthIndex;
  const selectedMonth = months[resolvedMonthIndex];
  const selectedAlbum = albumEntries.find((item) => item.month === selectedMonth);
  const backgroundImageUrl = savedAlbumCoverUrl ?? selectedAlbum?.imageUrl ?? null;

  const displayAudioName = audioUi.filename?.trim() || "Soundtrack";

  const stopAudioPlayback = useCallback(() => {
    const el = audioRef.current;
    if (!el) return;
    el.pause();
    el.removeAttribute("src");
    el.load();
  }, []);

  const goPrevMonth = useCallback(() => {
    if (selectedMonthIndex > 0) {
      setView((current) => ({ ...current, monthIndex: current.monthIndex - 1 }));
    } else if (modalYear > minYear) {
      const y = modalYear - 1;
      setView({ year: y, monthIndex: months.length - 1 });
      onYearChange(y);
    }
  }, [selectedMonthIndex, modalYear, minYear, months.length, onYearChange]);

  const goNextMonth = useCallback(() => {
    if (selectedMonthIndex < months.length - 1) {
      setView((current) => ({ ...current, monthIndex: current.monthIndex + 1 }));
    } else if (modalYear < maxYear) {
      const y = modalYear + 1;
      setView({ year: y, monthIndex: 0 });
      onYearChange(y);
    }
  }, [selectedMonthIndex, modalYear, maxYear, months.length, onYearChange]);

  const prevDisabled = resolvedMonthIndex === 0 && modalYear <= minYear;
  const nextDisabled = resolvedMonthIndex === months.length - 1 && modalYear >= maxYear;
  const { surfaceRef, layerRef } = useMobileMonthSwipe({
    open,
    onPrev: goPrevMonth,
    onNext: goNextMonth,
    prevDisabled,
    nextDisabled,
  });

  useEffect(() => {
    const username = localStorage.getItem("lastfm_username");
    if (!username) return;

    const yearToLoad = modalYear;
    let cancelled = false;

    void yearlyDataStorage.getYearlyData(username, yearToLoad, "albums")
      .then((data) => {
        if (cancelled || yearToLoad !== modalYearRef.current) return;
        setAlbumEntries(data && data.length > 0 ? (data as Album[]) : []);
      })
      .catch(() => {
        if (!cancelled && yearToLoad === modalYearRef.current) setAlbumEntries([]);
      });

    return () => {
      cancelled = true;
    };
  }, [modalYear]);

  useEffect(() => {
    setView((current) => (current.year === year ? current : { ...current, year }));
  }, [year]);

  useEffect(() => {
    setView((current) => ({ ...current, monthIndex: 0 }));
  }, [yearSelectRevision]);

  useEffect(() => {
    if (!open || pendingMonthIndex === null) return;
    setView((current) => ({ ...current, monthIndex: pendingMonthIndex }));
    onPendingMonthConsumed();
  }, [open, pendingMonthIndex, onPendingMonthConsumed]);

  useLayoutEffect(() => {
    setAlbumEntries([]);
  }, [modalYear]);

  useLayoutEffect(() => {
    if (!open) return;
    viewRevisionRef.current += 1;
    if (debounceRef.current) {
      window.clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }
    if (startTimeDebounceRef.current) {
      window.clearTimeout(startTimeDebounceRef.current);
      startTimeDebounceRef.current = null;
    }
    decryptFailedRef.current = false;
    setSavedAlbumCoverUrl(null);
    setContent("");
    setLoadingContent(true);
    setImageLoading(false);
    setAudioUi({ hasTrack: false, filename: null, startSeconds: 0 });
    setStartTimeDraft("0:00");
    setUploadError(null);
  }, [open, modalYear, selectedMonth]);

  useEffect(() => {
    if (open) {
      return;
    }
    stopAudioPlayback();
    setAudioSrc(null);
  }, [open, stopAudioPlayback]);

  useLayoutEffect(() => {
    if (!localStorage.getItem("lastfm_username")) return;
    if (audioBlobUrlRef.current) {
      URL.revokeObjectURL(audioBlobUrlRef.current);
      audioBlobUrlRef.current = null;
    }
    setAudioSrc(null);
  }, [modalYear, selectedMonth, audioReloadNonce]);

  useEffect(() => {
    if (!open) return;
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
    const revision = viewRevisionRef.current;

    setLoadingContent(true);
    setUploadError(null);
    setAudioSrc(null);

    (async () => {
      const rec = await secretPagesStorage.getSecretPage(username, modalYear, selectedMonth);
      if (cancelled || revision !== viewRevisionRef.current) return;
      decryptFailedRef.current = Boolean(rec.decryptFailed);
      setContent(rec.content);
      setSavedAlbumCoverUrl(rec.album_cover_url);
      if (rec.decryptFailed) {
        showToast({
          title: 'Could not load this note',
          description: 'Try the device where you last wrote it, or write a new note to replace it.',
          variant: 'warning',
          duration: 12000,
        });
      }
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
      const url = await secretPagesStorage.getAudioPlaybackUrl(modalYear, selectedMonth, rec);
      if (cancelled || revision !== viewRevisionRef.current) {
        if (url?.startsWith("blob:")) URL.revokeObjectURL(url);
        return;
      }
      if (url?.startsWith("blob:")) audioBlobUrlRef.current = url;
      setAudioSrc(url);
      setLoadingContent(false);
      setDialogPlaybackNonce((n) => n + 1);
    })();

    return () => {
      cancelled = true;
    };
  }, [open, modalYear, selectedMonth, audioReloadNonce, showToast]);

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
    const loadingVisuals = loadingContent || imageLoading;
    if (!open || !el || !audioSrc || loadingVisuals) {
      if (el && (!open || !audioSrc || loadingVisuals)) {
        el.pause();
        if (!open) {
          el.removeAttribute("src");
        }
      }
      return;
    }

    const startSec = Math.max(0, audioUi.startSeconds);

    const beginPlayback = () => {
      if (startSec > 0 && Number.isFinite(el.duration) && el.duration > 0) {
        el.currentTime = Math.min(startSec, Math.max(0, el.duration - 0.05));
      }
      void el.play().catch(() => { });
    };

    const onEnded = () => {
      if (resolvedMonthIndex >= months.length - 1) return;
      goNextMonth();
    };

    el.loop = false;
    el.src = audioSrc;
    el.load();
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
  }, [open, audioSrc, audioUi.startSeconds, dialogPlaybackNonce, loadingContent, imageLoading, goNextMonth, resolvedMonthIndex, months.length]);

  useLayoutEffect(() => {
    setImageLoading(Boolean(backgroundImageUrl));
  }, [backgroundImageUrl, modalYear, selectedMonth]);

  useEffect(() => {
    if (!editing || !textareaRef.current) return;
    textareaRef.current.focus();
    const length = textareaRef.current.value.length;
    textareaRef.current.setSelectionRange(length, length);
  }, [editing]);

  const saveContent = async (value: string) => {
    const username = localStorage.getItem("lastfm_username");
    if (!username) return;
    if (decryptFailedRef.current && !value.trim()) {
      return;
    }
    const cover = selectedAlbum?.imageUrl ?? null;
    await secretPagesStorage.storeSecretPage(username, modalYear, selectedMonth, {
      content: value,
      album_cover_url: cover,
    });
    if (decryptFailedRef.current && value.trim()) {
      decryptFailedRef.current = false;
    }
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

    const maxBytes = 3.3 * 1024 * 1024;
    if (file.size > maxBytes) {
      showToast({
        title: "File too large",
        description: "Soundtracks must be 3.3MB or smaller.",
        variant: "error",
      });
      return;
    }

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
      showToast({
        title: 'Soundtrack removed locally',
        description: 'The cloud copy may still exist. Try again if needed.',
        variant: 'warning',
      });
    } else {
      showToast({
        title: 'Soundtrack removed',
        variant: 'success',
      });
    }
    setRemoveBusy(false);
  };

  const focusKeyboardAnchor = useCallback(() => {
    keyboardFocusAnchorRef.current?.focus({ preventScroll: true });
  }, []);

  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;

      const target = event.target;
      const isTextEntryTarget =
        target instanceof HTMLTextAreaElement ||
        (target instanceof HTMLInputElement && target.type !== "file") ||
        (target instanceof HTMLElement && target.isContentEditable);
      if (isTextEntryTarget) {
        return;
      }

      if (event.key === "ArrowLeft") {
        if (prevDisabled) return;
        event.preventDefault();
        goPrevMonth();
        focusKeyboardAnchor();
      } else if (event.key === "ArrowRight") {
        if (nextDisabled) return;
        event.preventDefault();
        goNextMonth();
        focusKeyboardAnchor();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, prevDisabled, nextDisabled, goPrevMonth, goNextMonth, focusKeyboardAnchor]);

  return (
    <Dialog
      open={open}
      showCloseButton={false}
      contentClassName={styles.dialogContainer}
      onOpenAutoFocus={(event) => {
        event.preventDefault();
        focusKeyboardAnchor();
      }}
      onOpenChange={(nextOpen) => {
        if (nextOpen && pendingMonthIndex === null) {
          setView({ year, monthIndex: 0 });
        }
        onOpenChange(nextOpen);
      }}
      trigger={
        <div className={`${styles.secretIcon}${!open ? ` ${styles.secretIconMobileFixed}` : ` ${styles.secretIconMobileHidden}`}`}>
          <ArchiveIcon className={styles.archiveIconGlyph} />
        </div>
      }
    >
      <div
        ref={keyboardFocusAnchorRef}
        tabIndex={-1}
        className={styles.keyboardFocusAnchor}
        aria-hidden
      />
      <audio ref={audioRef} className={styles.hiddenAudio} playsInline preload="auto" />
      <input
        ref={fileInputRef}
        type="file"
        accept="audio/*"
        className={styles.hiddenFileInput}
        tabIndex={-1}
        onChange={handleAudioFileChange}
        aria-hidden
      />
      <div ref={surfaceRef} className={styles.dialogContent}>
        <button
          type="button"
          className={styles.mobileCloseButton}
          onClick={(event) => {
            if (shouldIgnoreDialogDismiss()) {
              event.preventDefault();
              event.stopPropagation();
              return;
            }
            onOpenChange(false);
          }}
          aria-label="Close"
        >
          <Cross2Icon width={18} height={18} />
        </button>
        <div ref={layerRef} className={styles.swipeLayer}>
        {backgroundImageUrl ? (
          <Image
            key={`${modalYear}-${selectedMonth}-${backgroundImageUrl}`}
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
          <div className={styles.imagePlaceholder} aria-label="No album cover for this month">
            <ImageIcon className={styles.placeholderIcon} aria-hidden />
          </div>
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
                onMouseDown={(event) => event.preventDefault()}
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
                onMouseDown={(event) => event.preventDefault()}
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
                <div className={styles.soundtrackRow}>
                  <span className={styles.soundtrackName} title={displayAudioName}>
                    {truncateFilename(displayAudioName, 36)}
                  </span>
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
            {loadingContent ? (
              <Skeleton className={styles.diarySkeleton} />
            ) : editing ? (
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
                  `${styles.diaryText}${!content ? ` ${styles.diaryTextPlaceholder}` : ""}`
                }
                onClick={() => setEditing(true)}
              >
                {content
                  ? (
                    <InlineMarkdown
                      text={content}
                      paragraphClassName={styles.markdownParagraph}
                      blockquoteClassName={styles.diaryBlockquote}
                    />
                  )
                  : "What did things in this month sound like?"}
              </div>
            )}
          </div>
          <div className={styles.rightSpacer} />
        </div>
        </div>
      </div>
    </Dialog>
  );
}
