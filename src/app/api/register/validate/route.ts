import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get("token");

  if (!token) {
    return NextResponse.json({ error: "Token is required" }, { status: 400 });
  }

  const invitation = await prisma.invitation.findUnique({
    where: { token },
  });

  if (!invitation) {
    return NextResponse.json(
      { error: "Invalid invitation link. Please contact a club administrator." },
      { status: 404 }
    );
  }

  if (invitation.acceptedAt) {
    return NextResponse.json(
      { error: "This invitation has already been used." },
      { status: 410 }
    );
  }

  if (invitation.expiresAt < new Date()) {
    return NextResponse.json(
      { error: "This invitation has expired. Please contact a club administrator for a new invite." },
      { status: 410 }
    );
  }

  return NextResponse.json({ email: invitation.email });
}
