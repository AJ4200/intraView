import { createHmac, randomBytes, scrypt as scryptCb, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";
import { readDb, type User } from "./store";

const COOKIE = "iv_session";
const MAX_AGE_S = 7 * 24 * 60 * 60;

function secret(): string {
  const s = process.env.SESSION_SECRET;
  if (!s || s.length < 16) throw new Error("SESSION_SECRET must be set to at least 16 characters");
  return s;
}

const sign = (value: string) => createHmac("sha256", secret()).update(value).digest("base64url");

const scrypt = (password: string, salt: Buffer) =>
  new Promise<Buffer>((resolve, reject) =>
    scryptCb(password, salt, 64, (err, key) => (err ? reject(err) : resolve(key)))
  );

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  return `${salt.toString("hex")}:${(await scrypt(password, salt)).toString("hex")}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  const expected = Buffer.from(hash, "hex");
  const actual = await scrypt(password, Buffer.from(salt, "hex"));
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

export async function startSession(userId: string) {
  const payload = Buffer.from(JSON.stringify({ uid: userId, exp: Date.now() + MAX_AGE_S * 1000 })).toString("base64url");
  (await cookies()).set(COOKIE, `${payload}.${sign(payload)}`, {
    httpOnly: true,
    sameSite: "lax",
    secure: (process.env.NEXT_PUBLIC_APP_URL || "").startsWith("https://"),
    path: "/",
    maxAge: MAX_AGE_S,
  });
}

export async function endSession() {
  (await cookies()).delete(COOKIE);
}

export async function currentUser(): Promise<User | null> {
  const raw = (await cookies()).get(COOKIE)?.value;
  const [payload, sig] = raw?.split(".") ?? [];
  if (!payload || !sig) return null;
  const a = Buffer.from(sig);
  const b = Buffer.from(sign(payload));
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    const { uid, exp } = JSON.parse(Buffer.from(payload, "base64url").toString());
    if (typeof exp !== "number" || exp < Date.now()) return null;
    return (await readDb()).users[uid] ?? null;
  } catch {
    return null;
  }
}

export function sameOrigin(req: Request): boolean {
  const origin = req.headers.get("origin");
  if (!origin) return true;
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

// Returns the signed-in recruiter, or null. State-changing requests must also be same-origin.
export async function requireUser(req: Request): Promise<User | null> {
  if (req.method !== "GET" && req.method !== "HEAD" && !sameOrigin(req)) return null;
  return currentUser();
}

export const publicUser = (u: User) => ({ id: u.id, name: u.name, email: u.email });
export const unauthorized = () => Response.json({ error: "Unauthorized" }, { status: 401 });
export const googleConfigured = () => Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
export const appUrl = (req: Request) => process.env.NEXT_PUBLIC_APP_URL ?? new URL(req.url).origin;
