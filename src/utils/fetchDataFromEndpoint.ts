import { authenticatedFetch, UnauthorizedSessionError } from '@/utils/authenticatedFetch';

export const fetchDataFromEndpoint = async (
  endpoint: string,
  payload: Record<string, unknown>,
  signal?: AbortSignal
) => {
  try {
    const response = await authenticatedFetch(`/api/${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
      signal,
    });

    if (!response.ok) {
      throw new Error('Failed to fetch data');
    }

    const data = await response.json();
    return data;
  } catch (error) {
    if (error instanceof UnauthorizedSessionError) {
      throw error;
    }
    console.error(`Error fetching from ${endpoint}:`, error);
    throw error;
  }
};
