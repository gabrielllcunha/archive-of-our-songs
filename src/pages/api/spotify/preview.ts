import type { NextApiRequest, NextApiResponse } from "next";
import { getSupabaseUserFromRequest } from "@/utils/server/getSupabaseUserFromRequest";
import { getSpotifySearchToken } from "@/utils/server/spotifyUserAuth";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const authUser = await getSupabaseUserFromRequest(req);
  if (!authUser) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const id = typeof req.query.id === "string" ? req.query.id.trim() : "";
  if (!/^[A-Za-z0-9]{22}$/.test(id)) {
    return res.status(400).json({ error: "Invalid track id" });
  }

  const token = await getSpotifySearchToken(req, res);
  if (!token) {
    return res.status(503).json({ error: "Spotify is not configured", url: null });
  }

  const trackRes = await fetch(`https://api.spotify.com/v1/tracks/${id}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!trackRes.ok) {
    return res.status(502).json({ error: "Could not load Spotify track", url: null });
  }
  const data = (await trackRes.json()) as { preview_url?: string | null };
  return res.status(200).json({ url: data.preview_url ?? null });
}
