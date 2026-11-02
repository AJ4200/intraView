import { randomUUID } from "crypto";
import { hashPassword, publicUser, sameOrigin, startSession } from "@/lib/auth";
import { clientIp, limited } from "@/lib/rateLimit";
import { withDb, type User } from "@/lib/store";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(req: Request) {
  if (!sameOrigin(req)) return Response.json({ error: "Forbidden" }, { status: 403 });
  if (limited(`register:${clientIp(req)}`, 10)) {
    return Response.json({ error: "Too many attempts. Try again later." }, { status: 429 });
  }
  const body = await req.json().catch(() => null);
  const email = String(body?.email ?? "").trim().toLowerCase();
  const name = String(body?.name ?? "").trim().slice(0, 80);
  const password = String(body?.password ?? "");
  if (!name) return Response.json({ error: "Name is required" }, { status: 400 });
  if (!EMAIL.test(email) || email.length > 200) return Response.json({ error: "Enter a valid email" }, { status: 400 });
  if (password.length < 8 || password.length > 200) {
    return Response.json({ error: "Password must be 8–200 characters" }, { status: 400 });
  }

  const user: User = {
    id: randomUUID(),
    email,
    name,
    passwordHash: await hashPassword(password),
    createdAt: Date.now(),
  };
  const created = await withDb((db) => {
    if (Object.values(db.users).some((u) => u.email === email)) return false;
    db.users[user.id] = user;
    return true;
  });
  if (!created) return Response.json({ error: "An account with this email already exists" }, { status: 409 });

  await startSession(user.id);
  return Response.json({ user: publicUser(user) }, { status: 201 });
}
