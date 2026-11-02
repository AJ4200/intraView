export interface InviteEmailInput {
  candidateName: string;
  jobTitle: string;
  link: string;
  qr: string;
  timeLimitMinutes: number | null;
  dueAt: number | null;
  recruiterName: string;
}

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

const fmtDate = (ms: number) =>
  new Date(ms).toLocaleString("en-ZA", { dateStyle: "full", timeStyle: "short", timeZone: "Africa/Johannesburg" }) + " (SAST)";

export const durationText = (min: number | null) => {
  if (!min) return "No time limit";
  const h = Math.floor(min / 60);
  const m = min % 60;
  return [h ? `${h} hr` : "", m ? `${m} min` : ""].filter(Boolean).join(" ");
};

export function buildInviteEmail(i: InviteEmailInput) {
  const subject = `Your interview for ${i.jobTitle}`;
  const duration = durationText(i.timeLimitMinutes);
  const deadline = i.dueAt ? fmtDate(i.dueAt) : "No deadline set";

  const text = [
    `Hi ${i.candidateName},`,
    "",
    `You have been invited to interview for ${i.jobTitle}.`,
    "",
    `Interview link: ${i.link}`,
    `Duration: ${duration}${i.timeLimitMinutes ? " (the timer starts when you press Begin)" : ""}`,
    `Complete by: ${deadline}`,
    "",
    "Tips: use a quiet space, a modern browser and a working microphone if you want to dictate answers.",
    "",
    "Good luck!",
    i.recruiterName,
  ].join("\n");

  const row = (label: string, value: string) =>
    `<tr><td style="padding:10px 0;color:#6b5a6a;font-size:13px;text-transform:uppercase;letter-spacing:.08em;width:130px">${label}</td><td style="padding:10px 0;font-size:16px;font-weight:bold;color:#030402">${esc(value)}</td></tr>`;

  const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(subject)}</title></head>
<body style="margin:0;padding:0;background:#c57dc1;font-family:Georgia,'Times New Roman',serif;color:#030402">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#c57dc1;padding:32px 12px"><tr><td align="center">
<table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;background:#f3f4e6;border:2px solid #030402;border-radius:24px;overflow:hidden;box-shadow:8px 8px 0 #030402">
<tr><td style="background:#030402;padding:22px 28px;color:#f3f4e6;font-family:Impact,'Arial Narrow',sans-serif;font-size:28px;letter-spacing:.02em">Intra<span style="color:#7dc1c5">View</span></td></tr>
<tr><td style="padding:28px 28px 8px">
<p style="margin:0 0 6px;font-size:13px;color:#6b5a6a;text-transform:uppercase;letter-spacing:.1em">Interview invitation</p>
<h1 style="margin:0 0 12px;font-family:Impact,'Arial Narrow',sans-serif;font-weight:normal;font-size:30px;line-height:1.15">Hi ${esc(i.candidateName)}, you&rsquo;re invited to interview for ${esc(i.jobTitle)}</h1>
<p style="margin:0 0 18px;font-size:16px;line-height:1.55">${esc(i.recruiterName)} would like to learn more about you. The interview is taken online, at a time that suits you, before the deadline below.</p>
</td></tr>
<tr><td style="padding:0 28px"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-top:1px solid #0002;border-bottom:1px solid #0002">
${row("Duration", duration)}${row("Complete by", deadline)}${row("Format", "Questions on screen, answer by typing or voice")}
</table></td></tr>
<tr><td align="center" style="padding:26px 28px 8px"><a href="${esc(i.link)}" style="display:inline-block;background:#7dc1c5;color:#030402;text-decoration:none;font-family:Impact,'Arial Narrow',sans-serif;font-size:20px;padding:14px 34px;border:2px solid #030402;border-radius:40px;box-shadow:0 4px 0 #030402">Start my interview &rarr;</a></td></tr>
<tr><td align="center" style="padding:8px 28px 4px;font-size:12px;color:#6b5a6a;word-break:break-all">Or paste this link: <a href="${esc(i.link)}" style="color:#030402">${esc(i.link)}</a></td></tr>
<tr><td align="center" style="padding:18px 28px 6px"><img src="${i.qr}" width="140" height="140" alt="QR code for your interview" style="border:2px solid #030402;border-radius:16px;background:#fff;padding:6px"><p style="margin:8px 0 0;font-size:12px;color:#6b5a6a">Prefer your phone? Scan to open the interview.</p></td></tr>
<tr><td style="padding:18px 28px 28px"><p style="margin:0;font-size:14px;line-height:1.55;background:#fff;border-radius:14px;padding:12px 16px"><strong>Before you start:</strong> find a quiet space, use an up-to-date browser and allow your microphone if you want to dictate answers. The timer only starts when you press Begin.</p></td></tr>
<tr><td style="background:#030402;padding:16px 28px;color:#f3f4e6;font-size:12px">Sent via IntraView &middot; A better way to recruit</td></tr>
</table></td></tr></table></body></html>`;

  return { subject, text, html };
}

export const buildMailto = (to: string, subject: string, body: string) =>
  `mailto:${encodeURIComponent(to)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
