import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { token, fullName } = body;

  if (!token || !fullName) {
    return NextResponse.json({ error: "Token and full name are required" }, { status: 400 });
  }

  const invitation = await prisma.invitation.findUnique({
    where: { token },
  });

  if (!invitation) {
    return NextResponse.json({ error: "Invalid invitation" }, { status: 404 });
  }

  if (invitation.acceptedAt) {
    return NextResponse.json({ error: "Invitation already used" }, { status: 410 });
  }

  if (invitation.expiresAt < new Date()) {
    return NextResponse.json({ error: "Invitation expired" }, { status: 410 });
  }

  // Create the user profile with the role/memberType from the invitation
  await prisma.user.upsert({
    where: { email: invitation.email },
    create: {
      email: invitation.email,
      fullName,
      role: invitation.role,
      memberType: invitation.memberType,
    },
    update: {
      fullName,
      role: invitation.role,
      memberType: invitation.memberType,
    },
  });

  // Mark invitation as accepted
  await prisma.invitation.update({
    where: { id: invitation.id },
    data: { acceptedAt: new Date() },
  });

  return NextResponse.json({ success: true });
}
