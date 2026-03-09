import nodemailer from "nodemailer";

type InviteEmailArgs = {
  to: string;
  inviteUrl: string;
};

function getMailConfig() {
  const host = process.env.SMTP_HOST;
  const port = process.env.SMTP_PORT ? Number(process.env.SMTP_PORT) : undefined;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const fromEmail = process.env.SMTP_FROM_EMAIL;
  const fromName = process.env.SMTP_FROM_NAME ?? "Leichhardt Rowing Club";
  const secure = process.env.SMTP_SECURE === "true" || port === 465;

  if (!host || !port || !fromEmail) {
    return null;
  }

  return {
    host,
    port,
    secure,
    user,
    pass,
    from: fromName ? `${fromName} <${fromEmail}>` : fromEmail,
  };
}

export function canSendInviteEmails() {
  return !!getMailConfig();
}

export function buildInviteEmailMessage({ inviteUrl }: { inviteUrl: string }) {
  const subject = "Your Leichhardt Rowing Club invitation";
  const text = [
    "You have been invited to the Leichhardt Rowing Club Boat Booking Portal.",
    "",
    "Use this link to finish setting up your access:",
    inviteUrl,
    "",
    "This invitation link expires in 7 days.",
  ].join("\n");

  const html = `
    <p>You have been invited to the <strong>Leichhardt Rowing Club Boat Booking Portal</strong>.</p>
    <p><a href="${inviteUrl}">Open your invitation link</a></p>
    <p>This invitation link expires in 7 days.</p>
  `;

  return { subject, text, html };
}

export async function sendInviteEmail({ to, inviteUrl }: InviteEmailArgs) {
  const config = getMailConfig();
  if (!config) {
    return { sent: false as const, reason: "not_configured" as const };
  }

  const transporter = nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure,
    auth: config.user && config.pass ? {
      user: config.user,
      pass: config.pass,
    } : undefined,
  });

  const message = buildInviteEmailMessage({ inviteUrl });

  await transporter.sendMail({
    from: config.from,
    to,
    subject: message.subject,
    text: message.text,
    html: message.html,
  });

  return { sent: true as const };
}
