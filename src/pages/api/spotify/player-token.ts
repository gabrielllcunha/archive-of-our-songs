import type { NextApiRequest, NextApiResponse } from "next";
import { getSupabaseUserFromRequest } from "@/utils/server/getSupabaseUserFromRequest";
import { getFreshSpotifyUserSession } from "@/utils/server/spotifyUserAuth";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const authUser = await getSupabaseUserFromRequest(req);
  if (!authUser) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const session = await getFreshSpotifyUserSession(req, res);
  if (!session) {
    return res.status(200).json({ connected: false, access_token: null, premium: false });
  }

  return res.status(200).json({
    connected: true,
    access_token: session.accessToken,
    premium: session.product === "premium",
    displayName: session.displayName,
  });
}
