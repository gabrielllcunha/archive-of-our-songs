import { useEffect, useMemo, useState, useCallback } from "react";
import { Dialog } from "@/components";
import styles from "./styles.module.scss";
import { CheckCircledIcon, LockClosedIcon, ReloadIcon } from "@radix-ui/react-icons";

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
  const CALLBACK_URL = process?.env?.NEXT_PUBLIC_CALLBACK_URL;
  const TURNSTILE_SITE_KEY = process?.env?.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

  const hasTurnstileConfigured = useMemo(() => Boolean(TURNSTILE_SITE_KEY), [TURNSTILE_SITE_KEY]);

  const [validationStep, setValidationStep] = useState<ValidationStep>("idle");
  const [pendingLastfmToken, setPendingLastfmToken] = useState<string | null>(null);
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const [turnstileVerified, setTurnstileVerified] = useState(false);

  const checkSession = useCallback(async (token: string) => {
    try {
      setValidationStep("lastfm");
      const response = await fetch("/api/lastfm/get-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error("Session error:", errorData);
        throw new Error("Failed to get session");
      }

      const data = await response.json();
      if (data.session?.name) {
        localStorage.setItem("lastfm_username", data.session.name);
        localStorage.removeItem("lastfm_token");
        localStorage.removeItem("lastfm_auth_started");
        try {
          const url = new URL(window.location.href);
          url.searchParams.delete("token");
          window.history.replaceState({}, "", url.toString());
        } catch {
        
        }
        setAuthenticatedWithLastfm(true);
      } else {
        throw new Error("No session name found");
      }
    } catch (error) {
      console.error("Error checking session:", error);
      setError("Failed to authenticate. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }, [setAuthenticatedWithLastfm]);

  const verifyTurnstile = useCallback(async (token: string) => {
    setValidationStep("verifying");
    const response = await fetch("/api/bot/verify-turnstile", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    });

    if (!response.ok) {
      const data = await response.json().catch(() => null);
      console.error("Turnstile verification failed:", data);
      throw new Error("Turnstile verification failed");
    }

    setTurnstileVerified(true);
  }, []);

  const handleAuthenticateWithLastfm = async () => {
    if (!API_KEY || !CALLBACK_URL) {
      setError("Missing API configuration");
      return;
    }

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
      window.location.href = `https://www.last.fm/api/auth/?api_key=${API_KEY}&cb=${encodeURIComponent(CALLBACK_URL)}`;
    } catch (error) {
      console.error("Error during authentication:", error);
      setError("Failed to authenticate. Please try again.");
      localStorage.removeItem("lastfm_auth_started");
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const username = localStorage.getItem("lastfm_username");
    if (username) {
      setAuthenticatedWithLastfm(true);
      return;
    }

    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get("token") || localStorage.getItem("lastfm_token");
    const authStarted = localStorage.getItem("lastfm_auth_started");
    if (token && !authenticatedWithLastfm) {
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
      setPendingLastfmToken(token);
      if (hasTurnstileConfigured) {
        setValidationStep("captcha");
      } else {
        setValidationStep("lastfm");
        checkSession(token);
      }
    }
  }, [authenticatedWithLastfm, setAuthenticatedWithLastfm, checkSession, hasTurnstileConfigured]);

  useEffect(() => {
    if (!hasTurnstileConfigured) return;
    if (validationStep !== "captcha") return;
    if (!pendingLastfmToken) return;
    if (turnstileVerified) return;

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
          callback: (token: string) => setTurnstileToken(token),
          "error-callback": () => setError("Robot validation failed. Please try again."),
          "expired-callback": () => setTurnstileToken(null),
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
  }, [TURNSTILE_SITE_KEY, hasTurnstileConfigured, pendingLastfmToken, turnstileVerified, validationStep]);

  useEffect(() => {
    if (!hasTurnstileConfigured) return;
    if (!pendingLastfmToken) return;
    if (!turnstileToken) return;
    if (turnstileVerified) return;

    (async () => {
      try {
        setIsLoading(true);
        setError("");
        await verifyTurnstile(turnstileToken);
        await checkSession(pendingLastfmToken);
      } catch (e) {
        console.error(e);
        setError("Validation failed. Please try again.");
        setTurnstileToken(null);
        setTurnstileVerified(false);
        setValidationStep("captcha");
      } finally {
        setIsLoading(false);
      }
    })();
  }, [checkSession, hasTurnstileConfigured, pendingLastfmToken, turnstileToken, turnstileVerified, verifyTurnstile]);

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
                  <ReloadIcon className={styles.spinningIcon} />
                ) : (
                  <CheckCircledIcon />
                )}
                <span>Are we human? or are we robots? 🤖</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                {validationStep === "lastfm" ? (
                  <ReloadIcon className={styles.spinningIcon} />
                ) : (
                  <CheckCircledIcon />
                )}
                <span>Validating token with Last.fm</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                {validationStep === "lastfm" ? (
                  <ReloadIcon className={styles.spinningIcon} />
                ) : (
                  <CheckCircledIcon />
                )}
                <span>Getting user details</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                {validationStep === "verifying" ? (
                  <ReloadIcon className={styles.spinningIcon} />
                ) : (
                  <CheckCircledIcon />
                )}
                <span>Retrieving your preferences</span>
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