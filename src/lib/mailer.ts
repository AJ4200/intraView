import nodemailer from "nodemailer";

const env = process.env;

export const smtpConfigured = () => Boolean(env.SMTP_HOST && env.SMTP_FROM);

export interface MailInput {
  to: string;
  subject: string;
  html: string;
  text: string;
  replyTo?: string;
  // Data URL embedded as the `cid:invite-qr` image referenced by the HTML.
  qrDataUrl?: string;
}

let transporter: nodemailer.Transporter | undefined;

function transport() {
  if (!transporter) {
    const port = Number(env.SMTP_PORT) || 587;
    transporter = nodemailer.createTransport({
      host: env.SMTP_HOST,
      port,
      // Port 465 uses implicit TLS; other ports upgrade with STARTTLS.
      secure: env.SMTP_SECURE ? env.SMTP_SECURE === "true" : port === 465,
      auth: env.SMTP_USER ? { user: env.SMTP_USER, pass: env.SMTP_PASS ?? "" } : undefined,
    });
  }
  return transporter;
}

export async function sendMail(m: MailInput): Promise<void> {
  await transport().sendMail({
    from: env.SMTP_FROM,
    to: m.to,
    replyTo: m.replyTo,
    subject: m.subject,
    text: m.text,
    html: m.html,
    attachments: m.qrDataUrl
      ? [{
          filename: "interview-qr.png",
          cid: "invite-qr",
          content: Buffer.from(m.qrDataUrl.split(",")[1] ?? "", "base64"),
          contentType: "image/png",
        }]
      : [],
  });
}
