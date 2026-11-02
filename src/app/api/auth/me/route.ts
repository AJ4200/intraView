import { currentUser, googleConfigured, publicUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await currentUser();
  return Response.json(
    { user: user ? publicUser(user) : null, providers: { google: googleConfigured() } },
    { headers: { "Cache-Control": "no-store" } }
  );
}
