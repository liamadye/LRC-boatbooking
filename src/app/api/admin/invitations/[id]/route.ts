import { randomUUID } from "crypto";
import { headers } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { addDays } from "date-fns";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { logAudit } from "@/lib/audit";

async function sendInvitationEmail(email: string, token: string) {
  const adminClient = createAdminClient();
  if (!adminClient) {
    return false;
  }

  const headersList = await headers();
  const host = headersList.get("host") ?? "localhost:3000";
  const protocol = host.startsWith("localhost") ? "http" : "https";
  const origin = `${protocol}://${host}`;
  const redirectTo = `${origin}/auth/callback?next=${encodeURIComponent(`/register?token=${token}`)}`;

  const { error } = await adminClient.auth.admin.inviteUserByEmail(email, {
    redirectTo,
    data: { invitation_token: token },
  });

  if (error) {
    console.error("[invite-resend] Supabase invite email failed:", error.message);
    return false;
  }

  return true;
}

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await requirePermission("send_invites");
  if (!admin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;

  const invitation = await prisma.invitation.findUnique({ where: { id } });
  if (!invitation) {
    return NextResponse.json({ error: "Invitation not found" }, { status: 404 });
  }

  if (invitation.acceptedAt) {
    return NextResponse.json(
      { error: "Cannot resend an invitation that has already been accepted." },
      { status: 400 }
    );
  }

  const refreshed = await prisma.invitation.update({
    where: { id },
    data: {
      token: randomUUID(),
      invitedBy: admin.id,
      expiresAt: addDays(new Date(), 7),
    },
    include: { inviter: { select: { fullName: true } } },
  });

  const emailSent = await sendInvitationEmail(refreshed.email, refreshed.token);

  await logAudit({
    userId: admin.id,
    action: "invitation.resend",
    targetType: "invitation",
    targetId: refreshed.id,
    before: {
      expiresAt: invitation.expiresAt.toISOString(),
    },
    after: {
      expiresAt: refreshed.expiresAt.toISOString(),
      emailSent,
    },
  });

  return NextResponse.json({ ...refreshed, emailSent });
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await requirePermission("send_invites");
  if (!admin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const invitation = await prisma.invitation.findUnique({ where: { id } });

  if (!invitation) {
    return NextResponse.json({ error: "Invitation not found" }, { status: 404 });
  }

  if (invitation.acceptedAt) {
    return NextResponse.json(
      { error: "Accepted invitations cannot be deleted." },
      { status: 400 }
    );
  }

  await prisma.invitation.delete({ where: { id } });

  await logAudit({
    userId: admin.id,
    action: "invitation.delete",
    targetType: "invitation",
    targetId: id,
    before: {
      email: invitation.email,
      role: invitation.role,
      memberType: invitation.memberType,
      expiresAt: invitation.expiresAt.toISOString(),
    },
  });

  return NextResponse.json({ success: true });
}
