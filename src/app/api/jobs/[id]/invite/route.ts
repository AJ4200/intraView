import QRCode from "qrcode";
import { isAdmin, unauthorized } from "@/lib/auth";
import { createInterview } from "@/lib/engine";
import { readDb } from "@/lib/store";

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  if (!isAdmin(req)) return unauthorized();
  const { id } = await ctx.params;
  const job = (await readDb()).jobs[id];
  if (!job) return Response.json({ error: "Job not found" }, { status: 404 });

  const body = await req.json().catch(() => ({}));
  const interview = await createInterview(job, String(body.candidateName ?? "Candidate"));
  const base = process.env.NEXT_PUBLIC_APP_URL ?? new URL(req.url).origin;
  const link = `${base}/i/${interview.token}`;
  const qr = await QRCode.toDataURL(link, { margin: 1, width: 320 });
  return Response.json({ token: interview.token, link, qr }, { status: 201 });
}
