import { common, generate } from "commonfunlib";
import { appUrl, requireUser, unauthorized } from "@/lib/auth";
import { createInterview } from "@/lib/engine";
import { buildInviteEmail, buildMailto } from "@/lib/inviteEmail";
import { readDb } from "@/lib/store";

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const user = await requireUser(req);
  if (!user) return unauthorized();
  const { id } = await ctx.params;
  const job = (await readDb()).jobs[id];
  if (!job || job.ownerId !== user.id) return Response.json({ error: "Job not found" }, { status: 404 });

  const body = await req.json().catch(() => ({}));
  const name = String(body.candidateName ?? "").trim().slice(0, 80) || "Candidate";

  const email = String(body.candidateEmail ?? "").trim().slice(0, 254);
  if (email && !common.isValidEmail(email)) return Response.json({ error: "Enter a valid candidate email" }, { status: 400 });

  let dueAt: number | undefined;
  if (body.dueAt) {
    dueAt = new Date(String(body.dueAt)).getTime();
    if (!Number.isFinite(dueAt) || dueAt <= Date.now()) {
      return Response.json({ error: "The deadline must be a future date" }, { status: 400 });
    }
  }

  const interview = await createInterview(job, name, { candidateEmail: email || undefined, dueAt });
  const link = `${appUrl(req)}/i/${interview.token}`;
  const qr = await generate.qrCode(link, { margin: 1, width: 320 });

  const message = buildInviteEmail({
    candidateName: name,
    jobTitle: job.title,
    link,
    qr,
    timeLimitMinutes: job.timeLimitMinutes ?? null,
    dueAt: dueAt ?? null,
    recruiterName: user.name,
  });

  return Response.json(
    {
      token: interview.token,
      link,
      qr,
      email: email
        ? { to: email, subject: message.subject, html: message.html, text: message.text, mailto: buildMailto(email, message.subject, message.text) }
        : null,
    },
    { status: 201 }
  );
}
