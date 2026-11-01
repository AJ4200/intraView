import { timingSafeEqual } from "crypto";

export function isAdmin(req: Request): boolean {
  const expected = process.env.ADMIN_KEY;
  const given = req.headers.get("x-admin-key") ?? new URL(req.url).searchParams.get("key") ?? "";
  if (!expected || given.length !== expected.length) return false;
  return timingSafeEqual(Buffer.from(given), Buffer.from(expected));
}

export const unauthorized = () => Response.json({ error: "Unauthorized" }, { status: 401 });
