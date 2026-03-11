import { NextRequest, NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth";
import { logAudit } from "@/lib/audit";

const PRIVATE_LIKE_CATEGORIES = new Set(["private", "syndicate"]);

function normalizeWeight(value: unknown) {
  if (value === "" || value === null || value === undefined) {
    return null;
  }

  const numericValue = typeof value === "number" ? value : Number(value);
  return Number.isFinite(numericValue) ? numericValue : NaN;
}

export async function POST(request: NextRequest) {
  const admin = await requirePermission("manage_boats");
  if (!admin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const name = typeof body.name === "string" ? body.name.trim() : "";
  const boatType = typeof body.boatType === "string" ? body.boatType.trim() : "";
  const category =
    body.category === "private" ||
    body.category === "syndicate" ||
    body.category === "tinny"
      ? body.category
      : "club";
  const classification = body.classification === "black" ? "black" : "green";
  const status = body.status === "not_in_use" ? "not_in_use" : "available";
  const responsibleSquadId =
    typeof body.responsibleSquadId === "string" && body.responsibleSquadId.length > 0
      ? body.responsibleSquadId
      : null;
  const ownerUserId =
    PRIVATE_LIKE_CATEGORIES.has(category) &&
    typeof body.ownerUserId === "string" &&
    body.ownerUserId.length > 0
      ? body.ownerUserId
      : null;
  const avgWeightKg = normalizeWeight(body.avgWeightKg);
  const privateBoatAccessUserIds =
    PRIVATE_LIKE_CATEGORIES.has(category) && Array.isArray(body.privateBoatAccessUserIds)
      ? body.privateBoatAccessUserIds.filter(
          (entry: unknown): entry is string => typeof entry === "string" && entry.length > 0
        )
      : [];

  if (name.length === 0) {
    return NextResponse.json({ error: "Boat name is required." }, { status: 400 });
  }

  if (boatType.length === 0) {
    return NextResponse.json({ error: "Boat type is required." }, { status: 400 });
  }

  if (Number.isNaN(avgWeightKg)) {
    return NextResponse.json({ error: "Boat weight must be numeric." }, { status: 400 });
  }

  const lastBoat = await prisma.boat.findFirst({
    orderBy: { displayOrder: "desc" },
    select: { displayOrder: true },
  });

  const boat = await prisma.$transaction(async (tx) => {
    const createdBoat = await tx.boat.create({
      data: {
        name,
        boatType,
        category,
        classification,
        status,
        responsibleSquadId,
        ownerUserId,
        avgWeightKg,
        displayOrder: (lastBoat?.displayOrder ?? 0) + 1,
      },
    });

    if (privateBoatAccessUserIds.length > 0) {
      await tx.privateBoatAccess.createMany({
        data: privateBoatAccessUserIds.map((userId: string) => ({
          boatId: createdBoat.id,
          userId,
        })),
        skipDuplicates: true,
      });
    }

    return tx.boat.findUniqueOrThrow({
      where: { id: createdBoat.id },
      include: {
        responsibleSquad: { select: { id: true, name: true } },
        privateBoatAccess: { select: { userId: true } },
      },
    });
  });

  await logAudit({
    userId: admin.id,
    action: "boat.create",
    targetType: "boat",
    targetId: boat.id,
    after: {
      name: boat.name,
      boatType: boat.boatType,
      category: boat.category,
      classification: boat.classification,
      status: boat.status,
      responsibleSquadId: boat.responsibleSquadId,
      ownerUserId: boat.ownerUserId,
      avgWeightKg: boat.avgWeightKg ? Number(boat.avgWeightKg) : null,
    },
  });

  revalidateTag("boats");

  return NextResponse.json(boat, { status: 201 });
}
