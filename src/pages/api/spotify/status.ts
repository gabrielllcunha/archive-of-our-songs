import type { NextApiRequest, NextApiResponse } from "next";
import { getSupabaseUserFromRequest } from "@/utils/server/getSupabaseUserFromRequest";
import { getFreshSpotifyUserSession, isSpotifyConfigured } from "@/utils/server/spotifyUserAuth";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const configured = isSpotifyConfigured();
  const authUser = await getSupabaseUserFromRequest(req);
  if (!authUser) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const session = configured ? await getFreshSpotifyUserSession(req, res) : null;
  return res.status(200).json({
    configured,
    connected: Boolean(session),
    premium: session?.product === "premium",
    displayName: session?.displayName ?? null,
  });
}
