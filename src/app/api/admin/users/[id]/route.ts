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
