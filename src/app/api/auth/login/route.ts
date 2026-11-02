import { publicUser, sameOrigin, startSession, verifyPassword } from "@/lib/auth";
import { clientIp, limited } from "@/lib/rateLimit";
import { readDb } from "@/lib/store";

// Used to keep response time similar when the email is unknown.
const DUMMY_HASH = "00".repeat(16) + ":" + "00".repeat(64);

export async function POST(req: Request) {
  if (!sameOrigin(req)) return Response.json({ error: "Forbidden" }, { status: 403 });
  const body = await req.json().catch(() => null);
  const email = String(body?.email ?? "").trim().toLowerCase();
  const password = String(body?.password ?? "");
  if (limited(`login:${clientIp(req)}:${email}`, 8)) {
    return Response.json({ error: "Too many attempts. Try again in a few minutes." }, { status: 429 });
  }

  const user = Object.values((await readDb()).users).find((u) => u.email === email);
  const ok = await verifyPassword(password.slice(0, 200), user?.passwordHash ?? DUMMY_HASH);
  if (!user || !user.passwordHash || !ok) {
    return Response.json({ error: "Invalid email or password" }, { status: 401 });
  }
  await startSession(user.id);
  return Response.json({ user: publicUser(user) });
}
