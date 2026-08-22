import { createHash, randomBytes } from "crypto";
import type { NextApiRequest, NextApiResponse } from "next";
import { getSpotifyAppToken, isSpotifyConfigured } from "@/utils/server/spotifyAppToken";

const COOKIE_ACCESS = "sp_at";
const COOKIE_REFRESH = "sp_rt";
const COOKIE_EXPIRES = "sp_exp";
const COOKIE_PRODUCT = "sp_product";
const COOKIE_NAME = "sp_name";
const COOKIE_STATE = "sp_oauth_state";
const COOKIE_VERIFIER = "sp_oauth_verifier";

const AUTH_COOKIES = [COOKIE_ACCESS, COOKIE_REFRESH, COOKIE_EXPIRES, COOKIE_PRODUCT, COOKIE_NAME];

export type SpotifyProduct = "premium" | "free";

export type SpotifyUserSession = {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
  product: SpotifyProduct;
  displayName: string;
};

function parseCookies(req: NextApiRequest) {
  const header = req.headers.cookie ?? "";
  const out: Record<string, string> = {};
  for (const part of header.split(";")) {
    const trimmed = part.trim();
    if (!trimmed) continue;
    const index = trimmed.indexOf("=");
    if (index < 0) continue;
    out[decodeURIComponent(trimmed.slice(0, index))] = decodeURIComponent(trimmed.slice(index + 1));
  }
  return out;
}

function cookieString(name: string, value: string, maxAge: number) {
  const parts = [
    `${name}=${encodeURIComponent(value)}`,
    "Path=/",
    `Max-Age=${Math.max(0, maxAge)}`,
    "HttpOnly",
    "SameSite=Lax",
  ];
  if (process.env.NODE_ENV === "production") parts.push("Secure");
  return parts.join("; ");
}

function appendCookies(res: NextApiResponse, cookies: string[]) {
  const current = res.getHeader("Set-Cookie");
  const next = [
    ...(Array.isArray(current) ? current.map(String) : current ? [String(current)] : []),
    ...cookies,
  ];
  res.setHeader("Set-Cookie", next);
}

export function spotifyRedirectUri(req: NextApiRequest) {
  const fromEnv = process.env.SPOTIFY_REDIRECT_URI?.trim();
  if (fromEnv) return fromEnv.replace(/\/$/, "");
  const protoHeader = req.headers["x-forwarded-proto"];
  const proto = (Array.isArray(protoHeader) ? protoHeader[0] : protoHeader) || "http";
  return `${proto}://${req.headers.host}/api/spotify/callback`;
}

export function createPkcePair() {
  const verifier = randomBytes(64).toString("base64url");
  const challenge = createHash("sha256").update(verifier).digest("base64url");
  const state = randomBytes(16).toString("hex");
  return { verifier, challenge, state };
}

export function setOauthCookies(res: NextApiResponse, state: string, verifier: string) {
  appendCookies(res, [
    cookieString(COOKIE_STATE, state, 600),
    cookieString(COOKIE_VERIFIER, verifier, 600),
  ]);
}

export function readOauthCookies(req: NextApiRequest) {
  const cookies = parseCookies(req);
  return {
    state: cookies[COOKIE_STATE] ?? "",
    verifier: cookies[COOKIE_VERIFIER] ?? "",
  };
}

export function clearOauthCookies(res: NextApiResponse) {
  appendCookies(res, [
    cookieString(COOKIE_STATE, "", 0),
    cookieString(COOKIE_VERIFIER, "", 0),
  ]);
}

export function writeSpotifyUserSession(res: NextApiResponse, session: SpotifyUserSession) {
  const accessMaxAge = Math.max(30, Math.floor((session.expiresAt - Date.now()) / 1000));
  appendCookies(res, [
    cookieString(COOKIE_ACCESS, session.accessToken, accessMaxAge),
    cookieString(COOKIE_REFRESH, session.refreshToken, 60 * 60 * 24 * 365),
    cookieString(COOKIE_EXPIRES, String(session.expiresAt), accessMaxAge),
    cookieString(COOKIE_PRODUCT, session.product, 60 * 60 * 24 * 365),
    cookieString(COOKIE_NAME, session.displayName, 60 * 60 * 24 * 365),
  ]);
}

export function clearSpotifyUserSession(res: NextApiResponse) {
  appendCookies(res, AUTH_COOKIES.map((name) => cookieString(name, "", 0)));
}

export function readSpotifyUserSession(req: NextApiRequest): SpotifyUserSession | null {
  const cookies = parseCookies(req);
  const accessToken = cookies[COOKIE_ACCESS];
  const refreshToken = cookies[COOKIE_REFRESH];
  if (!refreshToken && !accessToken) return null;
  const expiresAt = Number(cookies[COOKIE_EXPIRES] ?? 0);
  return {
    accessToken: accessToken ?? "",
    refreshToken: refreshToken ?? "",
    expiresAt: Number.isFinite(expiresAt) ? expiresAt : 0,
    product: cookies[COOKIE_PRODUCT] === "premium" ? "premium" : "free",
    displayName: cookies[COOKIE_NAME] ?? "Spotify",
  };
}

async function fetchSpotifyProfile(accessToken: string) {
  const res = await fetch("https://api.spotify.com/v1/me", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) return null;
  const data = (await res.json()) as { display_name?: string; product?: string };
  return {
    displayName: data.display_name?.trim() || "Spotify",
    product: data.product === "premium" ? "premium" as const : "free" as const,
  };
}

export async function exchangeSpotifyAuthCode(req: NextApiRequest, code: string, verifier: string) {
  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;
  if (!clientId || !clientSecret) return null;

  const res = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`,
    },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: spotifyRedirectUri(req),
      client_id: clientId,
      code_verifier: verifier,
    }),
  });
  if (!res.ok) return null;
  const data = (await res.json()) as { access_token?: string; refresh_token?: string; expires_in?: number };
  if (!data.access_token || !data.refresh_token) return null;
  const profile = await fetchSpotifyProfile(data.access_token);
  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresAt: Date.now() + Math.max(60, data.expires_in ?? 3600) * 1000,
    product: profile?.product ?? "free",
    displayName: profile?.displayName ?? "Spotify",
  } satisfies SpotifyUserSession;
}

export async function refreshSpotifyUserSession(req: NextApiRequest, res: NextApiResponse, current: SpotifyUserSession) {
  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;
  if (!clientId || !clientSecret || !current.refreshToken) return null;

  const tokenRes = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`,
    },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: current.refreshToken,
    }),
  });
  if (!tokenRes.ok) {
    clearSpotifyUserSession(res);
    return null;
  }
  const data = (await tokenRes.json()) as { access_token?: string; refresh_token?: string; expires_in?: number };
  if (!data.access_token) {
    clearSpotifyUserSession(res);
    return null;
  }
  const next: SpotifyUserSession = {
    accessToken: data.access_token,
    refreshToken: data.refresh_token || current.refreshToken,
    expiresAt: Date.now() + Math.max(60, data.expires_in ?? 3600) * 1000,
    product: current.product,
    displayName: current.displayName,
  };
  const profile = await fetchSpotifyProfile(next.accessToken);
  if (profile) {
    next.product = profile.product;
    next.displayName = profile.displayName;
  }
  writeSpotifyUserSession(res, next);
  return next;
}

export async function getFreshSpotifyUserSession(req: NextApiRequest, res: NextApiResponse) {
  const current = readSpotifyUserSession(req);
  if (!current) return null;
  if (current.accessToken && Date.now() < current.expiresAt - 15_000) return current;
  return refreshSpotifyUserSession(req, res, current);
}

export async function getSpotifySearchToken(req: NextApiRequest, res: NextApiResponse) {
  const user = await getFreshSpotifyUserSession(req, res);
  if (user?.accessToken) return user.accessToken;
  return getSpotifyAppToken();
}

export { isSpotifyConfigured };
