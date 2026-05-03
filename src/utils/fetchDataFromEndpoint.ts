import { getAccessTokenForFetch } from '@/utils/supabaseSession';

export const fetchDataFromEndpoint = async (
  endpoint: string,
  payload: Record<string, unknown>,
  signal?: AbortSignal
) => {
  try {
    const token = await getAccessTokenForFetch();
    const response = await fetch(`/api/${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(payload),
      signal,
    });

    if (!response.ok) {
      throw new Error("Failed to fetch data");
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error(`Error fetching from ${endpoint}:`, error);
    throw error;
  }
};