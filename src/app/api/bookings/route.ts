import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { validateBooking } from "@/lib/validation";
import { isWeekend } from "@/lib/validation";
import { addDays, subDays, parseISO, startOfWeek, format } from "date-fns";
import { createRateLimiter } from "@/lib/rate-limit";

const bookingLimiter = createRateLimiter({ windowMs: 60_000, maxRequests: 20 });

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const date = searchParams.get("date");
  const weekStart = searchParams.get("weekStart");

  const where: Record<string, unknown> = {};

  if (date) {
    where.date = parseISO(date);
  } else if (weekStart) {
    const start = parseISO(weekStart);
    where.date = { gte: start, lte: addDays(start, 6) };
  }

  const bookings = await prisma.booking.findMany({
    where,
    orderBy: { startSlot: "asc" },
  });

  return NextResponse.json(bookings);
}

export async function POST(request: NextRequest) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0] ?? "unknown";
  const { allowed, retryAfter } = bookingLimiter.check(ip);
  if (!allowed) {
    return NextResponse.json(
      { error: "Too many requests" },
      { status: 429, headers: { "Retry-After": String(retryAfter) } }
    );
  }

  const supabase = await createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const {
    date,
    resourceType,
    resourceId,
    bookerName,
    crewCount,
    startSlot,
    endSlot,
    isRaceSpecific,
    raceDetails,
    notes,
  } = body;

  // Fetch user profile
  const user = await prisma.user.findUnique({
    where: { email: authUser.email! },
  });

  if (!user) {
    return NextResponse.json({ error: "User profile not found" }, { status: 404 });
  }

  // Check booking window (if configured for this week)
  const bookingDate = parseISO(date);
  const weekStart = startOfWeek(bookingDate, { weekStartsOn: 1 });
  const bookingWeek = await prisma.bookingWeek.findUnique({
    where: { weekStart },
  });

  if (bookingWeek) {
    const now = new Date();
    if (now < bookingWeek.opensAt) {
      return NextResponse.json(
        {
          error: `Bookings for the week of ${format(weekStart, "d MMMM yyyy")} open on ${format(bookingWeek.opensAt, "EEEE d MMMM 'at' h:mma")}.`,
        },
        { status: 403 }
      );
    }
    if (bookingWeek.closesAt && now > bookingWeek.closesAt) {
      return NextResponse.json(
        { error: `Bookings for the week of ${format(weekStart, "d MMMM yyyy")} have closed.` },
        { status: 403 }
      );
    }
  }

  // Fetch resource details for validation
  let boat = null;
  let equipmentItem = null;

  if (resourceType === "boat") {
    boat = await prisma.boat.findUnique({ where: { id: resourceId } });
    if (!boat) {
      return NextResponse.json({ error: "Boat not found" }, { status: 404 });
    }
  } else if (resourceType === "equipment") {
    equipmentItem = await prisma.equipment.findUnique({
      where: { id: resourceId },
    });
    if (!equipmentItem) {
      return NextResponse.json({ error: "Equipment not found" }, { status: 404 });
    }
  } else if (resourceType === "oar_set") {
    const oarSet = await prisma.oarSet.findUnique({
      where: { id: resourceId },
    });
    if (!oarSet) {
      return NextResponse.json({ error: "Oar set not found" }, { status: 404 });
    }
  }

  // Check for consecutive day bookings (same boat, day before or after)
  let consecutiveDayCount = 0;
  if (boat) {
    const bookingDate = parseISO(date);
    const consecutiveBookings = await prisma.booking.count({
      where: {
        boatId: boat.id,
        date: {
          in: [subDays(bookingDate, 1), addDays(bookingDate, 1)],
        },
      },
    });
    consecutiveDayCount = consecutiveBookings;
  }

  // Run validation
  const validationErrors = validateBooking({
    boatType: boat?.boatType,
    boatClassification: boat?.classification as "black" | "green" | undefined,
    boatCategory: boat?.category as "club" | "private" | "syndicate" | "tinny" | undefined,
    boatStatus: boat?.status as "available" | "not_in_use" | undefined,
    boatAvgWeightKg: boat?.avgWeightKg ? Number(boat.avgWeightKg) : null,
    boatOwnerUserId: boat?.ownerUserId,
    isOutside: boat?.isOutside,
    crewCount,
    crewAvgWeightKg: user.weightKg ? Number(user.weightKg) : null,
    startSlot,
    endSlot,
    userId: user.id,
    userMemberType: user.memberType as "senior_competitive" | "student" | "recreational",
    userHasBlackBoatEligibility: user.hasBlackBoatEligibility,
    isWeekend: isWeekend(bookingDate),
    isRaceSpecific,
    equipmentType: equipmentItem?.type as "erg" | "bike" | "gym" | undefined,
    existingBookingsOnConsecutiveDays: consecutiveDayCount,
  });

  if (validationErrors.length > 0) {
    return NextResponse.json({ errors: validationErrors }, { status: 400 });
  }

  // Check for conflicts (double booking) — single range overlap query
  const conflictWhere: Record<string, unknown> = {
    date: bookingDate,
    startSlot: { lte: endSlot },
    endSlot: { gte: startSlot },
  };

  if (resourceType === "boat") conflictWhere.boatId = resourceId;
  else if (resourceType === "equipment") conflictWhere.equipmentId = resourceId;
  else if (resourceType === "oar_set") conflictWhere.oarSetId = resourceId;

  const conflict = await prisma.booking.findFirst({ where: conflictWhere });
  if (conflict) {
    return NextResponse.json(
      {
        errors: [
          {
            field: "slot",
            message: `This time slot overlaps with a booking by ${conflict.bookerName}.`,
          },
        ],
      },
      { status: 409 }
    );
  }

  // Create booking
  const booking = await prisma.booking.create({
    data: {
      date: bookingDate,
      resourceType,
      boatId: resourceType === "boat" ? resourceId : null,
      equipmentId: resourceType === "equipment" ? resourceId : null,
      oarSetId: resourceType === "oar_set" ? resourceId : null,
      userId: user.id,
      bookerName,
      crewCount,
      startSlot,
      endSlot,
      isRaceSpecific,
      raceDetails,
      notes,
    },
  });

  return NextResponse.json(booking, { status: 201 });
}
