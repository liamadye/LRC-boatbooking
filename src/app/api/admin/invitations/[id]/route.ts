import { randomUUID } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { addDays } from "date-fns";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { getInvitationUrls } from "@/lib/invitations";
import {
  invitationInclude,
  serializeInvitation,
} from "@/lib/admin-invitations";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await requirePermission("send_invites");
  if (!admin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;

  const invitation = await prisma.invitation.findUnique({
    where: { id },
    include: invitationInclude,
  });
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
    include: invitationInclude,
  });

  const urls = await getInvitationUrls(refreshed.email, refreshed.token);
  const emailSent = false;

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

  return NextResponse.json({
    ...serializeInvitation(refreshed),
    emailSent,
    inviteUrl: urls.actionUrl,
    deliveryMode: urls.usedGeneratedLink ? "manual_action_link" : "manual_register_link",
  });
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await requirePermission("send_invites");
  if (!admin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const invitation = await prisma.invitation.findUnique({
    where: { id },
    include: invitationInclude,
  });

  if (!invitation) {
    return NextResponse.json({ error: "Invitation not found" }, { status: 404 });
  }

  if (invitation.acceptedAt) {
    return NextResponse.json(
      { error: "Accepted invitations no longer have an invite link." },
      { status: 400 }
    );
  }

  const urls = await getInvitationUrls(invitation.email, invitation.token);

  return NextResponse.json({
    inviteUrl: urls.actionUrl,
    deliveryMode: urls.usedGeneratedLink ? "manual_action_link" : "manual_register_link",
  });
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
  const invitation = await prisma.invitation.findUnique({
    where: { id },
    include: invitationInclude,
  });

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
      squadIds: invitation.invitationSquads.map((entry) => entry.squad.id),
      expiresAt: invitation.expiresAt.toISOString(),
    },
  });

  return NextResponse.json({ success: true });
}
