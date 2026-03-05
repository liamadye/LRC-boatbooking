import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth";
import { addDays } from "date-fns";

export async function GET() {
  const admin = await requirePermission("send_invites");
  if (!admin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const invitations = await prisma.invitation.findMany({
    include: { inviter: { select: { fullName: true } } },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(invitations);
}

export async function POST(request: NextRequest) {
  const admin = await requirePermission("send_invites");
  if (!admin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const { email, role, memberType } = body;

  if (!email) {
    return NextResponse.json({ error: "Email is required" }, { status: 400 });
  }

  // Check if user already exists
  const existingUser = await prisma.user.findUnique({
    where: { email },
  });
  if (existingUser) {
    return NextResponse.json(
      { error: "A user with this email already exists" },
      { status: 409 }
    );
  }

  // Check for existing pending invitation
  const existingInvite = await prisma.invitation.findFirst({
    where: { email, acceptedAt: null, expiresAt: { gt: new Date() } },
  });
  if (existingInvite) {
    return NextResponse.json(
      { error: "An active invitation already exists for this email" },
      { status: 409 }
    );
  }

  const invitation = await prisma.invitation.create({
    data: {
      email,
      role: role || "member",
      memberType: memberType || "recreational",
      invitedBy: admin.id,
      expiresAt: addDays(new Date(), 7),
    },
  });

  return NextResponse.json(invitation, { status: 201 });
}
