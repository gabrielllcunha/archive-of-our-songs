import type { NextApiRequest, NextApiResponse } from "next";
import { clearSpotifyUserSession } from "@/utils/server/spotifyUserAuth";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }
  clearSpotifyUserSession(res);
  return res.status(200).json({ ok: true });
}
