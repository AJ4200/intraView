import { common, generate } from "commonfunlib";
import { appUrl, requireUser, unauthorized } from "@/lib/auth";
import { createInterview } from "@/lib/engine";
import { buildInviteEmail, buildMailto } from "@/lib/inviteEmail";
import { sendMail, smtpConfigured } from "@/lib/mailer";
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

  const input = {
    candidateName: name,
    jobTitle: job.title,
    link,
    timeLimitMinutes: job.timeLimitMinutes ?? null,
    dueAt: dueAt ?? null,
    recruiterName: user.name,
  };
  const message = buildInviteEmail({ ...input, qr });

  let emailInfo = null;
  if (email) {
    let sent = false;
    let sendError: string | undefined;
    if (smtpConfigured()) {
      try {
        await sendMail({
          to: email,
          subject: message.subject,
          text: message.text,
          html: buildInviteEmail({ ...input, qr: "cid:invite-qr" }).html,
          qrDataUrl: qr,
          replyTo: user.email,
        });
        sent = true;
      } catch (e) {
        console.error("Invite email failed", e);
        sendError = "The email could not be sent. Check the SMTP settings or send it manually.";
      }
    }
    emailInfo = {
      to: email,
      subject: message.subject,
      html: message.html,
      text: message.text,
      mailto: buildMailto(email, message.subject, message.text),
      smtp: smtpConfigured(),
      sent,
      sendError,
    };
  }

  return Response.json({ token: interview.token, link, qr, email: emailInfo }, { status: 201 });
}
