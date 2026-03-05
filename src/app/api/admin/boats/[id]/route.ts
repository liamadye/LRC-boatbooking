import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth";

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

  const updateData: Record<string, unknown> = {};
  if (body.status) updateData.status = body.status;
  if (body.classification) updateData.classification = body.classification;
  if (body.responsibleSquadId !== undefined)
    updateData.responsibleSquadId = body.responsibleSquadId;

  const boat = await prisma.boat.update({
    where: { id },
    data: updateData,
  });

  return NextResponse.json(boat);
}
