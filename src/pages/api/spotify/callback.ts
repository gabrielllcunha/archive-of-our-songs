import type { NextApiRequest, NextApiResponse } from "next";
import {
  clearOauthCookies,
  exchangeSpotifyAuthCode,
  readOauthCookies,
  writeSpotifyUserSession,
} from "@/utils/server/spotifyUserAuth";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const code = typeof req.query.code === "string" ? req.query.code : "";
  const state = typeof req.query.state === "string" ? req.query.state : "";
  const stored = readOauthCookies(req);
  clearOauthCookies(res);

  if (!code || !state || !stored.state || state !== stored.state || !stored.verifier) {
    return res.redirect(302, "/?spotify=error");
  }

  const session = await exchangeSpotifyAuthCode(req, code, stored.verifier);
  if (!session) {
    return res.redirect(302, "/?spotify=error");
  }

  writeSpotifyUserSession(res, session);
  return res.redirect(302, "/?spotify=connected");
}
