import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth";
import { logAudit } from "@/lib/audit";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await requirePermission("manage_users");
  if (!admin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const body = await request.json();

  const before = await prisma.user.findUnique({ where: { id } });
  if (!before) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const updateData: Record<string, unknown> = {};
  if (body.role) updateData.role = body.role;
  if (body.memberType) updateData.memberType = body.memberType;
  if (body.hasBlackBoatEligibility !== undefined)
    updateData.hasBlackBoatEligibility = body.hasBlackBoatEligibility;

  const user = await prisma.user.update({
    where: { id },
    data: updateData,
  });

  await logAudit({
    userId: admin.id,
    action: "user.update",
    targetType: "user",
    targetId: id,
    before: { role: before.role, memberType: before.memberType, hasBlackBoatEligibility: before.hasBlackBoatEligibility },
    after: { role: user.role, memberType: user.memberType, hasBlackBoatEligibility: user.hasBlackBoatEligibility },
  });

  return NextResponse.json(user);
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await requirePermission("manage_users");
  if (!admin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  if (id === admin.id) {
    return NextResponse.json(
      { error: "You cannot delete your own account." },
      { status: 400 }
    );
  }

  const user = await prisma.user.findUnique({
    where: { id },
    select: { id: true, email: true, fullName: true, role: true, memberType: true },
  });

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  await prisma.$transaction(async (tx) => {
    // Clear FK references before deleting the user row.
    await tx.boat.updateMany({
      where: { ownerUserId: id },
      data: { ownerUserId: null },
    });
    await tx.blackBoatApplication.updateMany({
      where: { reviewedBy: id },
      data: { reviewedBy: null },
    });

    await tx.booking.deleteMany({ where: { userId: id } });
    await tx.userSquad.deleteMany({ where: { userId: id } });
    await tx.blackBoatApplication.deleteMany({ where: { userId: id } });
    await tx.invitation.deleteMany({
      where: {
        OR: [{ invitedBy: id }, { email: user.email }],
      },
    });
    await tx.auditLog.deleteMany({ where: { userId: id } });
    await tx.user.delete({ where: { id } });
  });

  await logAudit({
    userId: admin.id,
    action: "user.delete",
    targetType: "user",
    targetId: id,
    before: {
      email: user.email,
      fullName: user.fullName,
      role: user.role,
      memberType: user.memberType,
    },
  });

  return NextResponse.json({ success: true });
}
