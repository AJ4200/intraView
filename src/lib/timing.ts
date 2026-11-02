export const MIN_LIMIT = 5;
export const MAX_LIMIT = 240;

// ~6 minutes per requirement (two questions plus follow-ups) and 5 minutes of buffer, rounded up to 5.
export function recommendedMinutes(requirementCount: number): number {
  const n = Math.max(1, requirementCount);
  return Math.max(10, Math.ceil((n * 6 + 5) / 5) * 5);
}

export function clampLimit(value: unknown): number | null {
  const n = Number(value);
  if (value === null || value === undefined || !Number.isFinite(n) || n <= 0) return null;
  return Math.min(MAX_LIMIT, Math.max(MIN_LIMIT, Math.round(n)));
}

export function formatClock(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}
