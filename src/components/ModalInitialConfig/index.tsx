import { useEffect, useState } from "react";
import { Dialog } from "../Dialog";
import { LockClosedIcon } from "@radix-ui/react-icons";
import styles from "./styles.module.scss";
import crypto from "crypto";

interface ModalInitialConfigProps {
  authenticatedWithLastfm?: boolean;
  setAuthenticatedWithLastfm?: (value: boolean) => void;
}

const API_KEY = process?.env?.NEXT_PUBLIC_API_KEY;
const CALLBACK_URL = process?.env?.NEXT_PUBLIC_CALLBACK_URL;
const API_SECRET = process?.env?.API_SECRET;

const generateApiSig = (params: Record<string, string>, apiSecret: string): string => {
  const sortedKeys = Object.keys(params).sort();
  const concatenatedString = sortedKeys
    .map((key) => `${key}${params[key]}`)
    .join("") + apiSecret;
  return crypto.createHash("md5").update(concatenatedString).digest("hex");
};

const fetchSession = async (token: string) => {
  const params = {
    method: "auth.getSession",
    api_key: API_KEY!,
    token,
  };
  const apiSig = generateApiSig(params, API_SECRET!);
  const queryParams = new URLSearchParams({
    ...params,
    api_sig: apiSig,
    format: "json",
  }).toString();
  const response = await fetch(
    `https://ws.audioscrobbler.com/2.0/?${queryParams}`,
    { method: "GET" }
  );

  if (!response.ok) {
    const errorData = await response.json();
    console.error("Fetch Error Data:", errorData);
    throw new Error(`Error: ${response.statusText}`);
  }

  const data = await response.json();
  return data;
};

export function ModalInitialConfig({ authenticatedWithLastfm, setAuthenticatedWithLastfm }: ModalInitialConfigProps) {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const initialConfigDone = localStorage.getItem("initialConfigDone");
    if (initialConfigDone !== "true") {
      setIsOpen(true);
    }
  }, []);

  const handleClose = () => {
    setIsOpen(false);
    localStorage.setItem("initialConfigDone", "true");
  };

  const handleAuthenticateWithLastfm = () => {
    if (!CALLBACK_URL || !API_KEY) return;

    const authUrl = `https://www.last.fm/api/auth/?api_key=${API_KEY}&cb=${encodeURIComponent(CALLBACK_URL)}`;
    const popup = window.open(
      authUrl,
      "Last.fm Authentication",
      "width=850,height=650,scrollbars=yes,resizable=yes"
    );

    const interval = setInterval(() => {
      if (!popup || popup.closed) {
        clearInterval(interval);
        return;
      }

      try {
        const urlParams = new URLSearchParams(popup.location.search);
        const token = urlParams.get("token");

        if (token) {
          popup.close();
          fetchSession(token)
            .then((data) => {
              console.log(data);
              if (data?.session?.key) {
                localStorage.setItem("lastfmSessionKey", data.session.key);
                setAuthenticatedWithLastfm?.(true);
              }
            })
            .catch((error) => console.error("Error fetching session:", error));

          clearInterval(interval);
        }
      } catch (err) {
        console.error("Error during popup handling:", err);
      }
    }, 500);
  };

  return (
    <Dialog
      open={isOpen && !authenticatedWithLastfm}
      onOpenChange={setIsOpen}
      onClose={handleClose}
      allowClose={authenticatedWithLastfm}
      trigger={null}
      initialConfig
    >
      <div className={styles.dialogContent}>
        <span className={styles.dialogTitle}>Authorize the application to get started!</span>
        <button onClick={handleAuthenticateWithLastfm} className={styles.loginLastfm}>Log in with Last.fm</button>
        <div className={styles.dialogDesc}>
          <LockClosedIcon />
          <span>This is safely done over at Last.fm</span>
        </div>
      </div>
    </Dialog>
  );
}
