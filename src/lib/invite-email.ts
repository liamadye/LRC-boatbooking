import nodemailer from "nodemailer";

type InviteEmailArgs = {
  to: string;
  inviteUrl: string;
};

type ApprovalEmailArgs = {
  to: string;
  loginUrl: string;
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

async function sendPortalEmail(args: {
  to: string;
  subject: string;
  text: string;
  html: string;
}) {
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

  await transporter.sendMail({
    from: config.from,
    to: args.to,
    subject: args.subject,
    text: args.text,
    html: args.html,
  });

  return { sent: true as const };
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

export function buildSignupApprovalEmailMessage({ loginUrl }: { loginUrl: string }) {
  const subject = "Your Leichhardt Rowing Club access has been approved";
  const text = [
    "Your access to the Leichhardt Rowing Club Boat Booking Portal has been approved.",
    "",
    "You can now sign in using Google with the same email address here:",
    loginUrl,
  ].join("\n");

  const html = `
    <p>Your access to the <strong>Leichhardt Rowing Club Boat Booking Portal</strong> has been approved.</p>
    <p><a href="${loginUrl}">Open the portal and continue with Google</a></p>
    <p>Use the same Google account you signed up with.</p>
  `;

  return { subject, text, html };
}

export async function sendInviteEmail({ to, inviteUrl }: InviteEmailArgs) {
  const message = buildInviteEmailMessage({ inviteUrl });
  return sendPortalEmail({
    to,
    subject: message.subject,
    text: message.text,
    html: message.html,
  });
}

export async function sendSignupApprovalEmail({ to, loginUrl }: ApprovalEmailArgs) {
  const message = buildSignupApprovalEmailMessage({ loginUrl });
  return sendPortalEmail({
    to,
    subject: message.subject,
    text: message.text,
    html: message.html,
  });
}
