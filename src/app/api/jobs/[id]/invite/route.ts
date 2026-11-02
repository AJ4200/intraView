import QRCode from "qrcode";
import { appUrl, requireUser, unauthorized } from "@/lib/auth";
import { createInterview } from "@/lib/engine";
import { readDb } from "@/lib/store";

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const user = await requireUser(req);
  if (!user) return unauthorized();
  const { id } = await ctx.params;
  const job = (await readDb()).jobs[id];
  if (!job || job.ownerId !== user.id) return Response.json({ error: "Job not found" }, { status: 404 });

  const body = await req.json().catch(() => ({}));
  const name = String(body.candidateName ?? "").trim().slice(0, 80) || "Candidate";
  const interview = await createInterview(job, name);
  const link = `${appUrl(req)}/i/${interview.token}`;
  const qr = await QRCode.toDataURL(link, { margin: 1, width: 320 });
  return Response.json({ token: interview.token, link, qr }, { status: 201 });
}
