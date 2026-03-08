import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth";
import { createRateLimiter } from "@/lib/rate-limit";
import { logAudit } from "@/lib/audit";
import {
  createInvitationRecord,
  deliverInvitation,
  invitationInclude,
  serializeInvitation,
} from "@/lib/admin-invitations";

const inviteLimiter = createRateLimiter({ windowMs: 60_000, maxRequests: 10 });

export async function GET() {
  const admin = await requirePermission("send_invites");
  if (!admin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const invitations = await prisma.invitation.findMany({
    include: invitationInclude,
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(invitations.map(serializeInvitation));
}

export async function POST(request: NextRequest) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0] ?? "unknown";
  const { allowed, retryAfter } = inviteLimiter.check(ip);
  if (!allowed) {
    return NextResponse.json(
      { error: "Too many requests" },
      { status: 429, headers: { "Retry-After": String(retryAfter) } }
    );
  }

  const admin = await requirePermission("send_invites");
  if (!admin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const {
    email,
    role = "member",
    memberType = "recreational",
    squadIds = [],
  } = body as {
    email?: string;
    role?: "member" | "squad_captain" | "vice_captain" | "captain" | "admin";
    memberType?: "senior_competitive" | "student" | "recreational";
    squadIds?: string[];
  };

  if (!email) {
    return NextResponse.json({ error: "Email is required" }, { status: 400 });
  }

  let invitationResult;
  try {
    invitationResult = await createInvitationRecord({
      email,
      role,
      memberType,
      invitedBy: admin.id,
      squadIds,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create invitation" },
      { status: 400 }
    );
  }

  if ("error" in invitationResult) {
    return NextResponse.json(
      { error: invitationResult.error },
      { status: invitationResult.status }
    );
  }

  const { invitation } = invitationResult;

  await logAudit({
    userId: admin.id,
    action: "invitation.send",
    targetType: "invitation",
    targetId: invitation.id,
    after: {
      email,
      role: invitation.role,
      memberType: invitation.memberType,
      squadIds: invitation.invitationSquads.map((entry) => entry.squad.id),
    },
  });

  const { emailSent, inviteUrl } = await deliverInvitation({
    email,
    token: invitation.token,
  });

  return NextResponse.json(
    { ...serializeInvitation(invitation), emailSent, inviteUrl },
    { status: 201 }
  );
}
