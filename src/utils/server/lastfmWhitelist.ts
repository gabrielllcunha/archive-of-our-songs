export function parseAllowedLastfmUsernames(): Set<string> {
  const raw = process.env.ALLOWED_LASTFM_USERNAMES;
  if (!raw?.trim()) {
    return new Set();
  }
  return new Set(
    raw
      .split(',')
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean)
  );
}

export function isLastfmUsernameOnWhitelist(username: string): boolean {
  const allowed = parseAllowedLastfmUsernames();
  if (allowed.size === 0) {
    return false;
  }
  return allowed.has(username.trim().toLowerCase());
}
