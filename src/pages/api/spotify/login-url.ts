import type { NextApiRequest, NextApiResponse } from "next";
import { getSupabaseUserFromRequest } from "@/utils/server/getSupabaseUserFromRequest";
import {
  createPkcePair,
  isSpotifyConfigured,
  setOauthCookies,
  spotifyRedirectUri,
} from "@/utils/server/spotifyUserAuth";

const SCOPES = [
  "user-read-email",
  "user-read-private",
  "streaming",
  "user-modify-playback-state",
  "user-read-playback-state",
].join(" ");

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }
  if (!isSpotifyConfigured()) {
    return res.status(503).json({ error: "Spotify is not configured", configured: false });
  }
  const authUser = await getSupabaseUserFromRequest(req);
  if (!authUser) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const { verifier, challenge, state } = createPkcePair();
  setOauthCookies(res, state, verifier);
  const params = new URLSearchParams({
    client_id: process.env.SPOTIFY_CLIENT_ID as string,
    response_type: "code",
    redirect_uri: spotifyRedirectUri(req),
    scope: SCOPES,
    state,
    code_challenge_method: "S256",
    code_challenge: challenge,
  });
  return res.status(200).json({ url: `https://accounts.spotify.com/authorize?${params.toString()}` });
}
