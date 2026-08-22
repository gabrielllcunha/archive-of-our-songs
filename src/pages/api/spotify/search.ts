import type { NextApiRequest, NextApiResponse } from "next";
import { getSupabaseUserFromRequest } from "@/utils/server/getSupabaseUserFromRequest";
import { getSpotifySearchToken, isSpotifyConfigured } from "@/utils/server/spotifyUserAuth";

export type SpotifyTrackResult = {
  id: string;
  name: string;
  artists: string;
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const authUser = await getSupabaseUserFromRequest(req);
  if (!authUser) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  if (!isSpotifyConfigured()) {
    return res.status(503).json({ error: "Spotify is not configured", configured: false });
  }

  const q = typeof req.query.q === "string" ? req.query.q.trim() : "";
  if (q.length < 2) {
    return res.status(200).json({ tracks: [] as SpotifyTrackResult[], configured: true });
  }

  const token = await getSpotifySearchToken(req, res);
  if (!token) {
    return res.status(502).json({ error: "Could not reach Spotify" });
  }

  const params = new URLSearchParams({
    q,
    type: "track",
    limit: "8",
    market: "US",
  });
  const spotifyRes = await fetch(`https://api.spotify.com/v1/search?${params.toString()}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!spotifyRes.ok) {
    return res.status(502).json({ error: "Spotify search failed" });
  }

  const data = (await spotifyRes.json()) as {
    tracks?: { items?: Array<{ id?: string; name?: string; artists?: Array<{ name?: string }> }> };
  };
  const tracks: SpotifyTrackResult[] = (data.tracks?.items ?? [])
    .filter((item) => typeof item.id === "string" && typeof item.name === "string")
    .map((item) => ({
      id: item.id as string,
      name: item.name as string,
      artists: (item.artists ?? []).map((artist) => artist.name).filter(Boolean).join(", "),
    }));

  return res.status(200).json({ tracks, configured: true });
}
