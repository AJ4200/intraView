import { generate } from "commonfunlib";
import { appUrl, requireUser, unauthorized } from "@/lib/auth";
import { readDb } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function GET(req: Request, ctx: { params: Promise<{ token: string }> }) {
  const user = await requireUser(req);
  if (!user) return unauthorized();
  const { token } = await ctx.params;
  const interview = (await readDb()).interviews[token];
  if (!interview || interview.ownerId !== user.id) {
    return Response.json({ error: "Interview not found" }, { status: 404 });
  }

  const link = `${appUrl(req).replace(/\/+$/, "")}/i/${interview.token}`;
  const qr = await generate.qrCode(link, { margin: 1, width: 320 });
  return Response.json({ qr }, { headers: { "Cache-Control": "private, no-store" } });
}
