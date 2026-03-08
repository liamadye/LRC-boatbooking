import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth";
import { parseISO, startOfDay, endOfDay } from "date-fns";

export async function GET(request: NextRequest) {
  const admin = await requirePermission("manage_bookings");
  if (!admin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const dateFrom = searchParams.get("dateFrom");
  const dateTo = searchParams.get("dateTo");
  const boatId = searchParams.get("boatId");
  const userId = searchParams.get("userId");

  const where: Record<string, unknown> = {};

  if (dateFrom && dateTo) {
    where.date = {
      gte: startOfDay(parseISO(dateFrom)),
      lte: endOfDay(parseISO(dateTo)),
    };
  } else if (dateFrom) {
    where.date = { gte: startOfDay(parseISO(dateFrom)) };
  }

  if (boatId) where.boatId = boatId;
  if (userId) where.userId = userId;

  const bookings = await prisma.booking.findMany({
    where,
    include: {
      boat: { select: { name: true, boatType: true } },
      equipment: { select: { type: true, number: true } },
      oarSet: { select: { name: true } },
      user: { select: { fullName: true, email: true } },
    },
    orderBy: [{ date: "desc" }, { startSlot: "asc" }],
    take: 200,
  });

  return NextResponse.json(bookings);
}
