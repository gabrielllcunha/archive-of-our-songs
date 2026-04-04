export function authEmailForLastfmUsername(lastfmUsername: string): string {
  const slug = lastfmUsername
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '')
    .slice(0, 60);

  const safe = slug.length > 0 ? slug : 'user';
  return `lfm.${safe}@whitelist.archive.local`;
}
