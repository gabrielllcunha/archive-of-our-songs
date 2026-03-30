import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const apiKey = process.env.NEXT_PUBLIC_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'Missing NEXT_PUBLIC_API_KEY' });
  }

  try {
    const response = await fetch(
      `https://ws.audioscrobbler.com/2.0/?method=auth.getToken&api_key=${encodeURIComponent(apiKey)}&format=json`
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      return res.status(502).json({ error: 'Failed to get token', details: errorData });
    }

    const data = await response.json();
    return res.status(200).json({ token: data.token });
  } catch (error) {
    return res.status(500).json({ error: 'Unexpected error', details: String(error) });
  }
}

