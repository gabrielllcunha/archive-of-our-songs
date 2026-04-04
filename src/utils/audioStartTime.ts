export function parseTimeToSeconds(input: string): number | null {
  const t = input.trim();
  if (t === '') return 0;
  const parts = t.split(':').map((p) => p.trim()).filter(Boolean);
  if (parts.length === 0 || parts.some((p) => !/^\d+$/.test(p))) return null;
  const nums = parts.map((n) => Number(n));
  if (nums.length === 1) return nums[0];
  if (nums.length === 2) return nums[0] * 60 + nums[1];
  if (nums.length === 3) return nums[0] * 3600 + nums[1] * 60 + nums[2];
  return null;
}

export function formatSecondsAsMmSs(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${r.toString().padStart(2, '0')}`;
}
