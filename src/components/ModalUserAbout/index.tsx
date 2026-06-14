import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Button, Dialog, Spinner } from "@/components";
import { authenticatedFetch, performUnauthorizedLogout, UnauthorizedSessionError } from "@/utils/authenticatedFetch";
import { clearUserLocalData } from "@/services/storage/clearUserLocalData";
import styles from "./styles.module.scss";

interface ModalUserAboutProps {
  username: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type UserProfile = {
  lastfm_username: string | null;
  created_at: string | null;
};

function formatMemberSince(value: string | null): string {
  if (!value) return "Unknown";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Unknown";
  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export function ModalUserAbout({ username, open, onOpenChange }: ModalUserAboutProps) {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileError, setProfileError] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  const resetState = useCallback(() => {
    setConfirmDelete(false);
    setDeleteBusy(false);
    setDeleteError("");
    setProfileError("");
  }, []);

  const handleOpenChange = useCallback(
    (nextOpen: boolean) => {
      if (!nextOpen) {
        resetState();
      }
      onOpenChange(nextOpen);
    },
    [onOpenChange, resetState]
  );

  useEffect(() => {
    if (!open) return;

    let cancelled = false;
    setProfileLoading(true);
    setProfileError("");

    void (async () => {
      try {
        const res = await authenticatedFetch("/api/user/profile");
        const data = (await res.json().catch(() => ({}))) as UserProfile & { error?: string };
        if (!res.ok) {
          if (!cancelled) {
            setProfileError(data.error ?? "Could not load profile");
          }
          return;
        }
        if (!cancelled) {
          setProfile(data);
        }
      } catch (error) {
        if (error instanceof UnauthorizedSessionError) return;
        if (!cancelled) {
          setProfileError("Could not load profile");
        }
      } finally {
        if (!cancelled) {
          setProfileLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [open]);

  const displayUsername = profile?.lastfm_username ?? username;

  const handleDeleteData = async () => {
    setDeleteBusy(true);
    setDeleteError("");
    try {
      const res = await authenticatedFetch("/api/user/delete-data", { method: "POST" });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setDeleteError(data.error ?? "Failed to delete your data");
        return;
      }

      await clearUserLocalData(displayUsername).catch(() => { });
      handleOpenChange(false);
      await performUnauthorizedLogout();
    } catch (error) {
      if (error instanceof UnauthorizedSessionError) return;
      setDeleteError("Failed to delete your data");
    } finally {
      setDeleteBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange} contentClassName={styles.dialogContent}>
      <h2 className={styles.title}>About your account</h2>

      <section className={styles.section}>
        <h3 className={styles.sectionTitle}>Your information</h3>
        {profileLoading ? (
          <div className={styles.loadingRow}>
            <Spinner size="small" />
            <span>Loading profile…</span>
          </div>
        ) : (
          <>
            <p className={styles.infoRow}>
              <span className={styles.infoLabel}>Last.fm username: </span>
              {displayUsername}
            </p>
            <p className={styles.infoRow}>
              <span className={styles.infoLabel}>Connected since: </span>
              {formatMemberSince(profile?.created_at ?? null)}
            </p>
          </>
        )}
        {profileError && <p className={styles.error}>{profileError}</p>}
      </section>

      <section className={styles.section}>
        <h3 className={styles.sectionTitle}>Data &amp; privacy</h3>
        <p className={styles.legalText}>
          Archive of Our Songs stores your Last.fm listening archive and any audio you upload so
          you can revisit your music year by year. Text you write in secret pages is{" "}
          <b>encrypted on your device</b> before it reaches our servers, so we cannot read your
          private notes.
        </p>
        <p className={styles.legalText}>
          You stay in control: you can sign out at any time, and permanently remove all data linked
          to your account from our servers using the option below.
        </p>
        <p className={styles.legalText}>
          See our{" "}
          <Link
            href="/legal?tab=privacy"
            className={styles.legalLink}
            onClick={() => onOpenChange(false)}
          >
            Privacy Policy
          </Link>{" "}
          and{" "}
          <Link
            href="/legal?tab=terms"
            className={styles.legalLink}
            onClick={() => onOpenChange(false)}
          >
            Terms of Service
          </Link>{" "}
          for more details.
        </p>
      </section>

      {confirmDelete ? (
        <div className={styles.confirmBox}>
          <p className={styles.confirmText}>
            This will permanently delete your archive, secret pages, uploaded audio, and account
            from our servers. This action cannot be undone.
          </p>
          {deleteError && <p className={styles.error}>{deleteError}</p>}
          <div className={styles.actions}>
            <Button
              variant="secondary"
              size="small"
              className={styles.actionButton}
              onClick={() => setConfirmDelete(false)}
              disabled={deleteBusy}
            >
              Cancel
            </Button>
            <Button
              variant="secondary"
              size="small"
              className={`${styles.actionButton} ${styles.deleteButton}`}
              onClick={handleDeleteData}
              disabled={deleteBusy}
            >
              {deleteBusy ? "Deleting…" : "Yes, delete everything"}
            </Button>
          </div>
        </div>
      ) : (
        <div className={styles.actions}>
          <Button
            variant="secondary"
            size="small"
            className={`${styles.actionButton} ${styles.deleteButton}`}
            onClick={() => setConfirmDelete(true)}
            disabled={profileLoading || deleteBusy}
          >
            Delete my data
          </Button>
        </div>
      )}
    </Dialog>
  );
}
