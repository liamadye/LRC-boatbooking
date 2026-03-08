import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth";

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
  const { name, addUserIds, removeUserIds } = body;

  const squad = await prisma.squad.findUnique({ where: { id } });
  if (!squad) {
    return NextResponse.json({ error: "Squad not found" }, { status: 404 });
  }

  // Rename
  if (name && name.trim() !== squad.name) {
    const existing = await prisma.squad.findUnique({ where: { name: name.trim() } });
    if (existing) {
      return NextResponse.json({ error: "A squad with this name already exists" }, { status: 409 });
    }
    await prisma.squad.update({ where: { id }, data: { name: name.trim() } });
  }

  // Add members
  if (addUserIds && addUserIds.length > 0) {
    await prisma.userSquad.createMany({
      data: addUserIds.map((userId: string) => ({ userId, squadId: id })),
      skipDuplicates: true,
    });
  }

  // Remove members
  if (removeUserIds && removeUserIds.length > 0) {
    await prisma.userSquad.deleteMany({
      where: { squadId: id, userId: { in: removeUserIds } },
    });
  }

  // Return updated squad
  const updated = await prisma.squad.findUnique({
    where: { id },
    include: {
      userSquads: {
        include: { user: { select: { id: true, fullName: true, email: true } } },
      },
    },
  });

  return NextResponse.json({
    id: updated!.id,
    name: updated!.name,
    members: updated!.userSquads.map((us) => us.user),
  });
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
  const squad = await prisma.squad.findUnique({ where: { id } });
  if (!squad) {
    return NextResponse.json({ error: "Squad not found" }, { status: 404 });
  }

  await prisma.$transaction(async (tx) => {
    await tx.boat.updateMany({
      where: { responsibleSquadId: id },
      data: { responsibleSquadId: null },
    });
    await tx.userSquad.deleteMany({ where: { squadId: id } });
    await tx.squad.delete({ where: { id } });
  });

  return NextResponse.json({ success: true });
}
