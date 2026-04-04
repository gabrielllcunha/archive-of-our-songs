import { useEffect, useMemo, useState, useCallback, useRef } from "react";
import { Dialog, Spinner } from "@/components";
import styles from "./styles.module.scss";
import { CheckCircledIcon, LockClosedIcon } from "@radix-ui/react-icons";
import { supabase } from "@/utils/supabase";
import { applyBootstrapSession } from "@/utils/supabaseSession";

interface ModalInitialConfigProps {
  authenticatedWithLastfm: boolean;
  setAuthenticatedWithLastfm: (value: boolean) => void;
}

type ValidationStep = "idle" | "captcha" | "verifying" | "lastfm";

function loadTurnstileScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined") return reject(new Error("No window"));
    if ((window as any).turnstile) return resolve();

    const existing = document.querySelector('script[data-turnstile="true"]') as HTMLScriptElement | null;
    if (existing) {
      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener("error", () => reject(new Error("Failed to load Turnstile script")), { once: true });
      return;
    }

    const script = document.createElement("script");
    script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
    script.async = true;
    script.defer = true;
    script.dataset.turnstile = "true";
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Failed to load Turnstile script"));
    document.head.appendChild(script);
  });
}

export function ModalInitialConfig({ authenticatedWithLastfm, setAuthenticatedWithLastfm }: ModalInitialConfigProps) {
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>("");
  const API_KEY = process?.env?.NEXT_PUBLIC_API_KEY;
  const TURNSTILE_SITE_KEY = process?.env?.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
  const hasTurnstileConfigured = useMemo(() => Boolean(TURNSTILE_SITE_KEY), [TURNSTILE_SITE_KEY]);

  const [validationStep, setValidationStep] = useState<ValidationStep>("idle");
  const [pendingLastfmToken, setPendingLastfmToken] = useState<string | null>(null);
  const pendingLfTokenRef = useRef<string | null>(null);
  const bootstrapLockRef = useRef(false);

  const runBootstrap = useCallback(
    async (lastfmToken: string, tsToken?: string | null) => {
      if (bootstrapLockRef.current) return;
      bootstrapLockRef.current = true;
      setIsLoading(true);
      setError("");
      setValidationStep(hasTurnstileConfigured ? "verifying" : "lastfm");
      try {
        const res = await fetch("/api/auth/bootstrap-supabase", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            lastfm_token: lastfmToken,
            ...(tsToken ? { turnstile_token: tsToken } : {}),
          }),
        });
        const data = (await res.json().catch(() => ({}))) as {
          error?: string;
          message?: string;
          access_token?: string;
          refresh_token?: string;
          lastfm_username?: string;
        };

        if (res.status === 403 && data?.error === "WHITELIST_DENIED") {
          setError(data?.message ?? "Sorry but your username isn't on whitelist");
          setValidationStep("idle");
          setPendingLastfmToken(null);
          pendingLfTokenRef.current = null;
          localStorage.removeItem("lastfm_token");
          localStorage.removeItem("lastfm_auth_started");
          try {
            const url = new URL(window.location.href);
            url.searchParams.delete("token");
            window.history.replaceState({}, "", url.toString());
          } catch {

          }
          return;
        }

        if (!res.ok || !data.access_token || !data.refresh_token) {
          const apiHint =
            (typeof data.message === "string" && data.message.trim()) ||
            (typeof data.error === "string" && data.error.trim()) ||
            `Sign-in failed (HTTP ${res.status})`;
          setError(apiHint);
          setValidationStep("idle");
          return;
        }

        try {
          await applyBootstrapSession({
            access_token: data.access_token,
            refresh_token: data.refresh_token,
          });
        } catch (sessionErr) {
          console.error(sessionErr);
          setError(
            sessionErr instanceof Error
              ? sessionErr.message
              : "Could not save your session. Check Supabase URL/anon key."
          );
          setValidationStep("idle");
          return;
        }

        if (data.lastfm_username) {
          localStorage.setItem("lastfm_username", data.lastfm_username);
        }
        localStorage.removeItem("lastfm_token");
        localStorage.removeItem("lastfm_auth_started");
        try {
          const url = new URL(window.location.href);
          url.searchParams.delete("token");
          window.history.replaceState({}, "", url.toString());
        } catch {

        }
        setAuthenticatedWithLastfm(true);
      } catch (e) {
        console.error(e);
        setError(
          e instanceof Error && e.message
            ? e.message
            : "Failed to authenticate. Please try again."
        );
        setValidationStep("idle");
      } finally {
        setIsLoading(false);
        bootstrapLockRef.current = false;
      }
    },
    [hasTurnstileConfigured, setAuthenticatedWithLastfm]
  );

  useEffect(() => {
    if (authenticatedWithLastfm) return;

    let cancelled = false;

    (async () => {
      if (supabase) {
        const { data: { session } } = await supabase.auth.getSession();
        if (cancelled) return;
        if (session?.user) {
          const name = session.user.user_metadata?.lastfm_username as string | undefined;
          if (name) {
            localStorage.setItem("lastfm_username", name);
          }
          setAuthenticatedWithLastfm(true);
          return;
        }
      }

      localStorage.removeItem("lastfm_username");

      const urlParams = new URLSearchParams(window.location.search);
      const token = urlParams.get("token") || localStorage.getItem("lastfm_token");
      const authStarted = localStorage.getItem("lastfm_auth_started");
      if (!token) return;
      if (!authStarted) {
        try {
          const url = new URL(window.location.href);
          url.searchParams.delete("token");
          window.history.replaceState({}, "", url.toString());
        } catch {

        }
        setValidationStep("idle");
        return;
      }

      pendingLfTokenRef.current = token;
      setPendingLastfmToken(token);
      if (hasTurnstileConfigured) {
        setValidationStep("captcha");
      } else {
        await runBootstrap(token);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [authenticatedWithLastfm, hasTurnstileConfigured, runBootstrap, setAuthenticatedWithLastfm]);

  const handleAuthenticateWithLastfm = async () => {
    if (!API_KEY) {
      setError("Missing API configuration");
      return;
    }

    const explicitCb = process.env.NEXT_PUBLIC_CALLBACK_URL?.trim();
    const callbackUrl = explicitCb && explicitCb.length > 0 ? explicitCb : `${window.location.origin}/`;

    try {
      setIsLoading(true);
      setError("");
      localStorage.setItem("lastfm_auth_started", String(Date.now()));

      const response = await fetch("/api/lastfm/get-token", {
        method: "POST",
      });

      if (!response.ok) {
        throw new Error("Failed to get token");
      }

      const data = await response.json();
      const token = data.token;
      localStorage.setItem("lastfm_token", token);
      window.location.href = `https://www.last.fm/api/auth/?api_key=${API_KEY}&cb=${encodeURIComponent(callbackUrl)}`;
    } catch (error) {
      console.error("Error during authentication:", error);
      setError("Failed to authenticate. Please try again.");
      localStorage.removeItem("lastfm_auth_started");
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!hasTurnstileConfigured) return;
    if (validationStep !== "captcha") return;
    if (!pendingLastfmToken) return;

    let widgetId: string | number | null = null;
    let cancelled = false;

    (async () => {
      try {
        await loadTurnstileScript();
        if (cancelled) return;

        const container = document.getElementById("turnstile-container");
        if (!container) return;

        container.innerHTML = "";
        widgetId = (window as any).turnstile.render(container, {
          sitekey: TURNSTILE_SITE_KEY,
          callback: (t: string) => {
            const lf = pendingLfTokenRef.current;
            if (lf) {
              void runBootstrap(lf, t);
            }
          },
          "error-callback": () => setError("Robot validation failed. Please try again."),
          "expired-callback": () => setError("Robot validation expired. Please try again."),
          theme: "auto",
        });
      } catch (e) {
        console.error(e);
        setError("Could not load robot validation. Please try again.");
      }
    })();

    return () => {
      cancelled = true;
      try {
        if ((window as any).turnstile && widgetId !== null) {
          (window as any).turnstile.remove(widgetId);
        }
      } catch {

      }
    };
  }, [TURNSTILE_SITE_KEY, hasTurnstileConfigured, pendingLastfmToken, validationStep, runBootstrap]);

  return (
    <Dialog
      open={!authenticatedWithLastfm}
      allowClose={false}
      trigger={null}
      initialConfig
    >
      <div className={styles.dialogContent}>
        {validationStep === "idle" && (
          <>
            <span className={styles.dialogTitle}>Authorize the application to get started!</span>
            {error && <div className={styles.error}>{error}</div>}
            <button
              onClick={handleAuthenticateWithLastfm}
              disabled={isLoading}
              className={styles.loginLastfm}
            >
              {isLoading ? "Loading..." : "Log in with Last.fm"}
            </button>
            <div className={styles.dialogDesc}>
              <LockClosedIcon />
              <span>This is safely done over at Last.fm</span>
            </div>
          </>
        )}

        {validationStep !== "idle" && (
          <>
            <span className={styles.dialogTitle}>Validating data...</span>
            {error && <div className={styles.error}>{error}</div>}

            <div className={styles.dialogDesc} style={{ display: "grid", gap: 8 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                {validationStep === "captcha" ? (
                  <Spinner size="small" />
                ) : (
                  <CheckCircledIcon />
                )}
                <span>Are we human? or are we robots? 🤖</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                {validationStep === "lastfm" || validationStep === "verifying" ? (
                  <Spinner size="small" />
                ) : (
                  <CheckCircledIcon />
                )}
                <span>Signing you in securely</span>
              </div>
            </div>

            {hasTurnstileConfigured && (
              <div style={{ marginTop: 12 }}>
                <div id="turnstile-container" />
              </div>
            )}
          </>
        )}
      </div>
    </Dialog>
  );
}
