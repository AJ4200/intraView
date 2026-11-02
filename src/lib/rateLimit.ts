const hits = new Map<string, { count: number; reset: number }>();

// In-memory limiter for sign-in attempts; resets when the server restarts.
export function limited(key: string, max = 10, windowMs = 10 * 60 * 1000): boolean {
  const now = Date.now();
  const entry = hits.get(key);
  if (!entry || entry.reset < now) {
    hits.set(key, { count: 1, reset: now + windowMs });
    return false;
  }
  entry.count += 1;
  return entry.count > max;
}

export const clientIp = (req: Request) =>
  req.headers.get("x-forwarded-for")?.split(",")[0].trim() ?? "local";
