import { NextRequest, NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { deriveBoatTypeLabel, isPrivateLikeCategory, normalizeBoatSpec, validateBoatSpec, type BoatCategory, type BoatClass } from "@/lib/boats";
import { serializeBoat } from "@/lib/boat-serialization";

function normalizeWeight(value: unknown) {
  if (value === "" || value === null || value === undefined) {
    return null;
  }

  const numericValue = typeof value === "number" ? value : Number(value);
  return Number.isFinite(numericValue) ? numericValue : NaN;
}

function parseBoatSpec(body: Record<string, unknown>) {
  if (body.boatClass === undefined) {
    return { spec: null } as const;
  }

  if (!["eight", "four", "pair", "single", "tinny"].includes(String(body.boatClass))) {
    return { error: "Boat type is required." } as const;
  }

  const normalized = normalizeBoatSpec({
    boatClass: body.boatClass as BoatClass,
    supportsSweep: body.supportsSweep === true,
    supportsScull: body.supportsScull === true,
    isCoxed: body.isCoxed === true,
  });
  const specError = validateBoatSpec(normalized);
  if (specError) {
    return { error: specError } as const;
  }

  return { spec: normalized } as const;
}

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

  const before = await prisma.boat.findUnique({
    where: { id },
    include: {
      responsibleSquad: { select: { id: true, name: true } },
      privateBoatAccess: { select: { userId: true } },
    },
  });
  if (!before) {
    return NextResponse.json({ error: "Boat not found" }, { status: 404 });
  }

  const updateData: Record<string, unknown> = {};

  if (body.name !== undefined) {
    const name = typeof body.name === "string" ? body.name.trim() : "";
    if (name.length === 0) {
      return NextResponse.json({ error: "Boat name is required." }, { status: 400 });
    }
    updateData.name = name;
  }

  const parsedBoatSpec = parseBoatSpec(body);
  if ("error" in parsedBoatSpec) {
    return NextResponse.json({ error: parsedBoatSpec.error }, { status: 400 });
  }
  if (parsedBoatSpec.spec) {
    updateData.boatClass = parsedBoatSpec.spec.boatClass;
    updateData.supportsSweep = parsedBoatSpec.spec.supportsSweep;
    updateData.supportsScull = parsedBoatSpec.spec.supportsScull;
    updateData.isCoxed = parsedBoatSpec.spec.isCoxed;
    updateData.boatType = deriveBoatTypeLabel(parsedBoatSpec.spec);
  }

  if (body.category !== undefined) {
    if (!["club", "private", "syndicate", "tinny"].includes(body.category)) {
      return NextResponse.json({ error: "Invalid boat category." }, { status: 400 });
    }
    updateData.category = body.category;
  }

  if (body.status !== undefined) {
    if (!["available", "not_in_use"].includes(body.status)) {
      return NextResponse.json({ error: "Invalid boat status." }, { status: 400 });
    }
    updateData.status = body.status;
  }

  if (body.classification !== undefined) {
    if (!["black", "green"].includes(body.classification)) {
      return NextResponse.json({ error: "Invalid boat classification." }, { status: 400 });
    }
    updateData.classification = body.classification;
  }

  if (body.responsibleSquadId !== undefined) {
    updateData.responsibleSquadId = body.responsibleSquadId || null;
  }

  const nextCategory = ((updateData.category as BoatCategory | undefined) ?? before.category) as BoatCategory;
  const isPrivateLike = isPrivateLikeCategory(nextCategory);

  if (body.ownerUserId !== undefined) {
    updateData.ownerUserId = isPrivateLike && body.ownerUserId ? body.ownerUserId : null;
  } else if (!isPrivateLike) {
    updateData.ownerUserId = null;
  }

  if (body.avgWeightKg !== undefined) {
    const avgWeightKg = normalizeWeight(body.avgWeightKg);
    if (Number.isNaN(avgWeightKg)) {
      return NextResponse.json({ error: "Boat weight must be numeric." }, { status: 400 });
    }
    updateData.avgWeightKg = avgWeightKg;
  }

  const nextPrivateBoatAccessUserIds = isPrivateLike
    ? Array.isArray(body.privateBoatAccessUserIds)
      ? body.privateBoatAccessUserIds.filter(
          (entry: unknown): entry is string => typeof entry === "string" && entry.length > 0
        )
      : before.privateBoatAccess.map((entry) => entry.userId)
    : [];

  const boat = await prisma.$transaction(async (tx) => {
    if (!isPrivateLike || Array.isArray(body.privateBoatAccessUserIds)) {
      await tx.privateBoatAccess.deleteMany({ where: { boatId: id } });

      if (isPrivateLike && nextPrivateBoatAccessUserIds.length > 0) {
        await tx.privateBoatAccess.createMany({
          data: nextPrivateBoatAccessUserIds.map((userId: string) => ({ boatId: id, userId })),
          skipDuplicates: true,
        });
      }
    }

    await tx.boat.update({
      where: { id },
      data: updateData,
    });

    return tx.boat.findUniqueOrThrow({
      where: { id },
      include: {
        responsibleSquad: { select: { id: true, name: true } },
        privateBoatAccess: { select: { userId: true } },
      },
    });
  });

  await logAudit({
    userId: admin.id,
    action: "boat.update",
    targetType: "boat",
    targetId: id,
    before: {
      name: before.name,
      boatType: before.boatType,
      boatClass: before.boatClass,
      supportsSweep: before.supportsSweep,
      supportsScull: before.supportsScull,
      isCoxed: before.isCoxed,
      category: before.category,
      status: before.status,
      classification: before.classification,
      responsibleSquadId: before.responsibleSquadId,
      ownerUserId: before.ownerUserId,
      avgWeightKg: before.avgWeightKg ? Number(before.avgWeightKg) : null,
      privateBoatAccessUserIds: before.privateBoatAccess.map((entry) => entry.userId),
    },
    after: {
      name: boat.name,
      boatType: boat.boatType,
      boatClass: boat.boatClass,
      supportsSweep: boat.supportsSweep,
      supportsScull: boat.supportsScull,
      isCoxed: boat.isCoxed,
      category: boat.category,
      status: boat.status,
      classification: boat.classification,
      responsibleSquadId: boat.responsibleSquadId,
      ownerUserId: boat.ownerUserId,
      avgWeightKg: boat.avgWeightKg ? Number(boat.avgWeightKg) : null,
      privateBoatAccessUserIds: boat.privateBoatAccess.map((entry) => entry.userId),
    },
  });

  revalidateTag("boats");

  return NextResponse.json(serializeBoat(boat));
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await requirePermission("manage_boats");
  if (!admin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const boat = await prisma.boat.findUnique({
    where: { id },
    include: { privateBoatAccess: { select: { userId: true } } },
  });

  if (!boat) {
    return NextResponse.json({ error: "Boat not found" }, { status: 404 });
  }

  const bookingCount = await prisma.booking.count({ where: { boatId: id } });
  if (bookingCount > 0) {
    return NextResponse.json(
      {
        error: `Cannot delete ${boat.name} because it still has ${bookingCount} booking${bookingCount === 1 ? "" : "s"}. Disable it instead.`,
      },
      { status: 409 }
    );
  }

  await prisma.$transaction(async (tx) => {
    await tx.privateBoatAccess.deleteMany({ where: { boatId: id } });
    await tx.boat.delete({ where: { id } });
  });

  await logAudit({
    userId: admin.id,
    action: "boat.delete",
    targetType: "boat",
    targetId: id,
    before: {
      name: boat.name,
      boatType: boat.boatType,
      boatClass: boat.boatClass,
      supportsSweep: boat.supportsSweep,
      supportsScull: boat.supportsScull,
      isCoxed: boat.isCoxed,
      category: boat.category,
      classification: boat.classification,
      status: boat.status,
      responsibleSquadId: boat.responsibleSquadId,
      ownerUserId: boat.ownerUserId,
      avgWeightKg: boat.avgWeightKg ? Number(boat.avgWeightKg) : null,
      privateBoatAccessUserIds: boat.privateBoatAccess.map((entry) => entry.userId),
    },
  });

  revalidateTag("boats");

  return NextResponse.json({ success: true });
}
