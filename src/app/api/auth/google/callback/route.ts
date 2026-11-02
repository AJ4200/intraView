import { randomUUID } from "crypto";
import { cookies } from "next/headers";
import { appUrl, googleConfigured, startSession } from "@/lib/auth";
import { withDb } from "@/lib/store";

export async function GET(req: Request) {
  const base = appUrl(req);
  const fail = (code: string) => Response.redirect(`${base}/login?error=${code}`, 302);
  if (!googleConfigured()) return fail("google_not_configured");

  const url = new URL(req.url);
  const jar = await cookies();
  const expected = jar.get("iv_oauth_state")?.value;
  jar.delete("iv_oauth_state");
  const code = url.searchParams.get("code");
  if (!code || !expected || url.searchParams.get("state") !== expected) return fail("google_failed");

  try {
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: process.env.GOOGLE_CLIENT_ID!,
        client_secret: process.env.GOOGLE_CLIENT_SECRET!,
        redirect_uri: `${base}/api/auth/google/callback`,
        grant_type: "authorization_code",
      }),
      signal: AbortSignal.timeout(15_000),
    });
    if (!tokenRes.ok) return fail("google_failed");
    const { access_token } = await tokenRes.json();

    const infoRes = await fetch("https://openidconnect.googleapis.com/v1/userinfo", {
      headers: { Authorization: `Bearer ${access_token}` },
      signal: AbortSignal.timeout(15_000),
    });
    if (!infoRes.ok) return fail("google_failed");
    const info = await infoRes.json();
    if (!info.sub || !info.email || !info.email_verified) return fail("google_unverified");

    const email = String(info.email).toLowerCase();
    const userId = await withDb((db) => {
      const users = Object.values(db.users);
      const existing = users.find((u) => u.googleId === info.sub) ?? users.find((u) => u.email === email);
      if (existing) {
        // The password sign-up never verified this email, so drop it when Google (verified) claims the account.
        if (!existing.googleId) delete existing.passwordHash;
        existing.googleId ??= info.sub;
        return existing.id;
      }
      const id = randomUUID();
      db.users[id] = {
        id,
        email,
        name: String(info.name ?? email.split("@")[0]).slice(0, 80),
        googleId: info.sub,
        createdAt: Date.now(),
      };
      return id;
    });
    await startSession(userId);
    return Response.redirect(`${base}/dashboard`, 302);
  } catch {
    return fail("google_failed");
  }
}
