import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { validateBooking } from "@/lib/validation";
import { isWeekend } from "@/lib/validation";
import { bookingsOverlap, getDefaultEndMinutes, getDefaultStartMinutes } from "@/lib/booking-times";
import { addDays, parseISO, startOfWeek, format } from "date-fns";
import { createRateLimiter } from "@/lib/rate-limit";
import {
  buildBookingWeekPayload,
  serializeBooking,
} from "@/lib/booking-utils";

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

  if (weekStart) {
    const start = parseISO(weekStart);
    const [bookings, bookingWeek] = await Promise.all([
      prisma.booking.findMany({
        where: { date: { gte: start, lte: addDays(start, 6) } },
        include: { squad: { select: { id: true, name: true } } },
        orderBy: [{ date: "asc" }, { startSlot: "asc" }],
      }),
      prisma.bookingWeek.findUnique({ where: { weekStart: start } }),
    ]);

    return NextResponse.json(
      buildBookingWeekPayload({
        bookings,
        bookingWeek,
        weekStart: start,
      })
    );
  }

  const where: Record<string, unknown> = {};
  if (date) {
    where.date = parseISO(date);
  }

  const bookings = await prisma.booking.findMany({
    where,
    include: { squad: { select: { id: true, name: true } } },
    orderBy: { startSlot: "asc" },
  });

  return NextResponse.json(bookings.map(serializeBooking));
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
    squadId,
    bookerName,
    crewCount,
    startSlot,
    endSlot,
    startMinutes,
    endMinutes,
    isRaceSpecific,
    raceDetails,
    notes,
  } = body;

  // Fetch user profile
  const user = await prisma.user.findUnique({
    where: { email: authUser.email! },
    include: { squads: { include: { squad: true } } },
  });

  if (!user) {
    return NextResponse.json({ error: "User profile not found" }, { status: 404 });
  }

  // Check booking window (if configured for this week)
  const bookingDate = parseISO(date);
  const requestedStartMinutes =
    typeof startMinutes === "number" ? startMinutes : getDefaultStartMinutes(startSlot);
  const requestedEndMinutes =
    typeof endMinutes === "number" ? endMinutes : getDefaultEndMinutes(endSlot);

  if (requestedEndMinutes <= requestedStartMinutes) {
    return NextResponse.json(
      { errors: [{ field: "timeSlot", message: "End time must be after start time." }] },
      { status: 400 }
    );
  }

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
    boat = await prisma.boat.findUnique({
      where: { id: resourceId },
      include: { privateBoatAccess: { select: { userId: true } } },
    });
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

  let bookingSquad = null;
  if (squadId) {
    bookingSquad = user.squads.find((entry) => entry.squad.id === squadId)?.squad ?? null;

    // Admins can book for any squad
    if (!bookingSquad && user.role === "admin") {
      bookingSquad = await prisma.squad.findUnique({
        where: { id: squadId },
        select: { id: true, name: true },
      });
    }

    if (!bookingSquad) {
      return NextResponse.json(
        { error: "You can only book on behalf of a squad you belong to." },
        { status: 403 }
      );
    }
  }

  // Run validation
  const validationErrors = validateBooking({
    boatType: boat?.boatType,
    boatClassification: boat?.classification as "black" | "green" | undefined,
    boatCategory: boat?.category as "club" | "private" | "syndicate" | "tinny" | undefined,
    boatStatus: boat?.status as "available" | "not_in_use" | undefined,
    boatAvgWeightKg: boat?.avgWeightKg ? Number(boat.avgWeightKg) : null,
    boatOwnerUserId: boat?.ownerUserId,
    privateBoatAccessUserIds: (boat as { privateBoatAccess?: { userId: string }[] } | null)?.privateBoatAccess?.map((a) => a.userId) ?? [],
    isOutside: boat?.isOutside,
    crewCount,
    crewAvgWeightKg: user.weightKg ? Number(user.weightKg) : null,
    startSlot,
    endSlot,
    userId: user.id,
    userRole: user.role,
    userMemberType: user.memberType as "senior_competitive" | "student" | "recreational",
    userHasBlackBoatEligibility: user.hasBlackBoatEligibility,
    isWeekend: isWeekend(bookingDate),
    isRaceSpecific,
    equipmentType: equipmentItem?.type as "erg" | "bike" | "gym" | undefined,
  });

  if (validationErrors.length > 0) {
    return NextResponse.json({ errors: validationErrors }, { status: 400 });
  }

  // Check for conflicts (double booking) — single range overlap query
  const conflictWhere: Record<string, unknown> = { date: bookingDate };
  if (resourceType === "boat") conflictWhere.boatId = resourceId;
  else if (resourceType === "equipment") conflictWhere.equipmentId = resourceId;
  else if (resourceType === "oar_set") conflictWhere.oarSetId = resourceId;

  const conflictCandidates = await prisma.booking.findMany({ where: conflictWhere });
  const conflict = conflictCandidates.find((existing) =>
    bookingsOverlap(
      {
        startSlot,
        endSlot,
        startMinutes: requestedStartMinutes,
        endMinutes: requestedEndMinutes,
      },
      existing
    )
  );
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
  let booking;
  try {
    booking = await prisma.booking.create({
      data: {
        date: bookingDate,
        resourceType,
        boatId: resourceType === "boat" ? resourceId : null,
        equipmentId: resourceType === "equipment" ? resourceId : null,
        oarSetId: resourceType === "oar_set" ? resourceId : null,
        userId: user.id,
        squadId: bookingSquad?.id ?? null,
        bookerName: bookingSquad?.name ?? bookerName,
        crewCount,
        startSlot,
        endSlot,
        startMinutes: requestedStartMinutes,
        endMinutes: requestedEndMinutes,
        isRaceSpecific,
        raceDetails,
        notes,
      },
      include: { squad: { select: { id: true, name: true } } },
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return NextResponse.json(
        {
          errors: [
            {
              field: "slot",
              message:
                "This environment is still enforcing an old single-booking rule for this slot. Apply the precise booking-time migration before allowing multiple daytime bookings.",
            },
          ],
        },
        { status: 409 }
      );
    }

    throw error;
  }

  return NextResponse.json(serializeBooking(booking), { status: 201 });
}
