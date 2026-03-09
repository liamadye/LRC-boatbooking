import { randomUUID } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { addDays } from "date-fns";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import {
  emailInvitationLink,
  getManualInvitationDelivery,
  invitationInclude,
  serializeInvitation,
} from "@/lib/admin-invitations";

export async function POST(
  request: NextRequest,
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

  const body = (await request.json().catch(() => ({}))) as { delivery?: "link" | "email" };
  const delivery = body.delivery ?? "link";
  const deliveryResult = delivery === "email"
    ? await emailInvitationLink({
        email: refreshed.email,
        token: refreshed.token,
      })
    : await getManualInvitationDelivery({
        email: refreshed.email,
        token: refreshed.token,
      });
  const emailSent = "emailSent" in deliveryResult ? deliveryResult.emailSent : false;

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
      delivery,
    },
  });

  return NextResponse.json({
    ...serializeInvitation(refreshed),
    ...deliveryResult,
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

  return NextResponse.json(await getManualInvitationDelivery({
    email: invitation.email,
    token: invitation.token,
  }));
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
