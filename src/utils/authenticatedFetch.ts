import { supabase } from '@/utils/supabase';
import { getAccessTokenForFetch } from '@/utils/supabaseSession';

export class UnauthorizedSessionError extends Error {
  constructor(message = 'Session expired or unauthorized') {
    super(message);
    this.name = 'UnauthorizedSessionError';
  }
}

type UnauthorizedListener = () => void;

const unauthorizedListeners = new Set<UnauthorizedListener>();
let logoutInProgress = false;

export function onUnauthorizedSession(listener: UnauthorizedListener): () => void {
  unauthorizedListeners.add(listener);
  return () => {
    unauthorizedListeners.delete(listener);
  };
}

function notifyUnauthorizedListeners() {
  unauthorizedListeners.forEach((listener) => {
    listener();
  });
}

export async function performUnauthorizedLogout(): Promise<void> {
  if (logoutInProgress) return;
  logoutInProgress = true;
  try {
    await supabase?.auth.signOut();
    localStorage.removeItem('lastfm_username');
    localStorage.removeItem('lastfm_token');
    localStorage.removeItem('lastfm_auth_started');
    notifyUnauthorizedListeners();
  } finally {
    logoutInProgress = false;
  }
}

export async function handleUnauthorizedResponse(response: Response): Promise<boolean> {
  if (response.status !== 401) return false;
  await performUnauthorizedLogout();
  return true;
}

export async function authenticatedFetch(
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<Response> {
  const token = await getAccessTokenForFetch();
  const headers = new Headers(init?.headers);

  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const response = await fetch(input, {
    ...init,
    headers,
  });

  if (await handleUnauthorizedResponse(response)) {
    throw new UnauthorizedSessionError();
  }

  return response;
}
