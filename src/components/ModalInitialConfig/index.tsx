import { useEffect, useState, useCallback } from "react";
import { Dialog } from "@/components";
import styles from "./styles.module.scss";
import { createHash } from "crypto";
import { LockClosedIcon } from "@radix-ui/react-icons";

interface ModalInitialConfigProps {
  authenticatedWithLastfm: boolean;
  setAuthenticatedWithLastfm: (value: boolean) => void;
}

export function ModalInitialConfig({ authenticatedWithLastfm, setAuthenticatedWithLastfm }: ModalInitialConfigProps) {
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>("");
  const API_KEY = process?.env?.NEXT_PUBLIC_API_KEY;
  const API_SECRET = process?.env?.API_SECRET;

  const CALLBACK_URL = process?.env?.NEXT_PUBLIC_CALLBACK_URL;

  const generateApiSignature = (params: Record<string, string>) => {
    const { format, cb, ...paramsForSig } = params;
    const sortedParams = Object.keys(paramsForSig)
      .sort()
      .reduce((acc: Record<string, string>, key) => {
        acc[key] = params[key];
        return acc;
      }, {});

    const stringToHash = Object.entries(sortedParams)
      .map(([key, value]) => `${key}${value}`)
      .join("") + API_SECRET;

    return createHash("md5").update(stringToHash).digest("hex");
  };

  const checkSession = useCallback(async (token: string) => {
    try {
      const params = {
        method: "auth.getSession",
        api_key: API_KEY!,
        token: token,
        format: "json"
      };

      const apiSig = generateApiSignature(params);
      const queryString = Object.entries(params)
        .map(([key, value]) => `${key}=${encodeURIComponent(value)}`)
        .join("&") + `&api_sig=${apiSig}`;

      const response = await fetch(
        `https://ws.audioscrobbler.com/2.0/?${queryString}`
      );

      if (!response.ok) {
        const errorData = await response.json();
        console.error("Session error:", errorData);
        throw new Error("Failed to get session");
      }

      const data = await response.json();
      if (data.session?.name) {
        localStorage.setItem("lastfm_username", data.session.name);
        localStorage.removeItem("lastfm_token");
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
  }, [API_KEY, setAuthenticatedWithLastfm]);

  const handleAuthenticateWithLastfm = async () => {
    if (!API_KEY || !CALLBACK_URL) {
      setError("Missing API configuration");
      return;
    }

    try {
      setIsLoading(true);
      setError("");

      const response = await fetch(
        `https://ws.audioscrobbler.com/2.0/?method=auth.getToken&api_key=${API_KEY}&format=json`
      );

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
    if (token && !authenticatedWithLastfm) {
      checkSession(token);
    }
  }, [authenticatedWithLastfm, setAuthenticatedWithLastfm, checkSession]);

  return (
    <Dialog
      open={!authenticatedWithLastfm}
      allowClose={false}
      trigger={null}
      initialConfig
    >
      <div className={styles.dialogContent}>
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
      </div>
    </Dialog>
  );
}