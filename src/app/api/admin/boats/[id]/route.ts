import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth";
import { logAudit } from "@/lib/audit";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await requirePermission("manage_boats");
  if (!admin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const body = await request.json();

  const before = await prisma.boat.findUnique({ where: { id } });
  if (!before) {
    return NextResponse.json({ error: "Boat not found" }, { status: 404 });
  }

  const updateData: Record<string, unknown> = {};
  if (body.status) updateData.status = body.status;
  if (body.classification) updateData.classification = body.classification;
  if (body.responsibleSquadId !== undefined)
    updateData.responsibleSquadId = body.responsibleSquadId;
  if (body.ownerUserId !== undefined)
    updateData.ownerUserId = body.ownerUserId || null;

  // Handle private boat access list
  if (Array.isArray(body.privateBoatAccessUserIds)) {
    await prisma.privateBoatAccess.deleteMany({ where: { boatId: id } });
    if (body.privateBoatAccessUserIds.length > 0) {
      await prisma.privateBoatAccess.createMany({
        data: body.privateBoatAccessUserIds.map((userId: string) => ({
          boatId: id,
          userId,
        })),
        skipDuplicates: true,
      });
    }
  }

  const boat = await prisma.boat.update({
    where: { id },
    data: updateData,
    include: { privateBoatAccess: { select: { userId: true } } },
  });

  await logAudit({
    userId: admin.id,
    action: "boat.update",
    targetType: "boat",
    targetId: id,
    before: { status: before.status, classification: before.classification, responsibleSquadId: before.responsibleSquadId },
    after: { status: boat.status, classification: boat.classification, responsibleSquadId: boat.responsibleSquadId },
  });

  return NextResponse.json(boat);
}
