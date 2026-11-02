import { randomBytes } from "crypto";
import { cookies } from "next/headers";
import { appUrl, googleConfigured } from "@/lib/auth";

export async function GET(req: Request) {
  const base = appUrl(req);
  if (!googleConfigured()) return Response.redirect(`${base}/login?error=google_not_configured`, 302);

  const state = randomBytes(16).toString("hex");
  (await cookies()).set("iv_oauth_state", state, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 600,
  });

  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID!,
    redirect_uri: `${base}/api/auth/google/callback`,
    response_type: "code",
    scope: "openid email profile",
    state,
    prompt: "select_account",
  });
  return Response.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params}`, 302);
}
