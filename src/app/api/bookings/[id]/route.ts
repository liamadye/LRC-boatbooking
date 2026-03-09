import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { validateBooking, isWeekend } from "@/lib/validation";
import { bookingsOverlap, getDefaultEndMinutes, getDefaultStartMinutes } from "@/lib/booking-times";
import { can } from "@/lib/permissions";
import { logAudit } from "@/lib/audit";
import { serializeBooking, supportsSquadBooking } from "@/lib/booking-utils";

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Parallel: user + booking lookups are independent
  const [user, booking] = await Promise.all([
    prisma.user.findUnique({
      where: { email: authUser.email! },
      include: { squads: { include: { squad: true } } },
    }),
    prisma.booking.findUnique({ where: { id } }),
  ]);

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  if (!booking) {
    return NextResponse.json({ error: "Booking not found" }, { status: 404 });
  }

  // Only the booker or admins can delete
  if (booking.userId !== user.id && !can(user.role, "manage_bookings")) {
    return NextResponse.json(
      { error: "You can only cancel your own bookings" },
      { status: 403 }
    );
  }

  await prisma.booking.delete({ where: { id } });

  // Log audit when admin cancels another user's booking
  if (booking.userId !== user.id) {
    await logAudit({
      userId: user.id,
      action: "booking.cancel",
      targetType: "booking",
      targetId: id,
      before: { bookerName: booking.bookerName, date: booking.date, startSlot: booking.startSlot, endSlot: booking.endSlot, boatId: booking.boatId },
    });
  }

  return NextResponse.json({ success: true });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Parallel: user + booking lookups are independent
  const [user, booking] = await Promise.all([
    prisma.user.findUnique({
      where: { email: authUser.email! },
      include: { squads: { include: { squad: true } } },
    }),
    prisma.booking.findUnique({ where: { id } }),
  ]);

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  if (!booking) {
    return NextResponse.json({ error: "Booking not found" }, { status: 404 });
  }

  if (booking.userId !== user.id && !can(user.role, "manage_bookings")) {
    return NextResponse.json(
      { error: "You can only edit your own bookings" },
      { status: 403 }
    );
  }

  const body = await request.json();

  const newEndSlot = body.endSlot ?? booking.endSlot;
  const newStartMinutes =
    typeof body.startMinutes === "number"
      ? body.startMinutes
      : booking.startMinutes ?? getDefaultStartMinutes(booking.startSlot);
  const newEndMinutes =
    typeof body.endMinutes === "number"
      ? body.endMinutes
      : booking.endMinutes ?? getDefaultEndMinutes(newEndSlot);
  const newCrewCount = body.crewCount ?? booking.crewCount;
  const newIsRaceSpecific = body.isRaceSpecific ?? booking.isRaceSpecific;
  const hasExplicitSquadChange = Object.prototype.hasOwnProperty.call(body, "squadId");
  const nextSquadId = hasExplicitSquadChange ? body.squadId ?? null : booking.squadId;
  let bookingSquad = null;

  // Re-run validation if booking a boat
  if (booking.boatId) {
    const boat = await prisma.boat.findUnique({
      where: { id: booking.boatId },
      include: { privateBoatAccess: { select: { userId: true } } },
    });

    if (boat) {
      if (nextSquadId) {
        if (!supportsSquadBooking(boat.boatType)) {
          return NextResponse.json(
            { error: "Squad bookings are only available for 4s and 8s." },
            { status: 400 }
          );
        }

        bookingSquad = user.squads.find((entry) => entry.squad.id === nextSquadId)?.squad ?? null;
        if (!bookingSquad) {
          return NextResponse.json(
            { error: "You can only book on behalf of a squad you belong to." },
            { status: 403 }
          );
        }
      }

      const validationErrors = validateBooking({
        boatType: boat.boatType,
        boatClassification: boat.classification as "black" | "green",
        boatCategory: boat.category as "club" | "private" | "syndicate" | "tinny",
        boatStatus: boat.status as "available" | "not_in_use",
        boatAvgWeightKg: boat.avgWeightKg ? Number(boat.avgWeightKg) : null,
        boatOwnerUserId: boat.ownerUserId,
        privateBoatAccessUserIds: (boat as { privateBoatAccess?: { userId: string }[] }).privateBoatAccess?.map((a) => a.userId) ?? [],
        isOutside: boat.isOutside,
        crewCount: newCrewCount,
        crewAvgWeightKg: user.weightKg ? Number(user.weightKg) : null,
        startSlot: booking.startSlot,
        endSlot: newEndSlot,
        userId: user.id,
        userRole: user.role,
        userMemberType: user.memberType as "senior_competitive" | "student" | "recreational",
        userHasBlackBoatEligibility: user.hasBlackBoatEligibility,
        isWeekend: isWeekend(booking.date),
        isRaceSpecific: newIsRaceSpecific,
      });

      if (validationErrors.length > 0) {
        return NextResponse.json({ errors: validationErrors }, { status: 400 });
      }
    }
  } else if (nextSquadId) {
    return NextResponse.json(
      { error: "Squad bookings are only available for boats." },
      { status: 400 }
    );
  }

  if (newEndMinutes <= newStartMinutes) {
    return NextResponse.json(
      { errors: [{ field: "timeSlot", message: "End time must be after start time." }] },
      { status: 400 }
    );
  }

  const resourceField = booking.boatId ? "boatId" : booking.equipmentId ? "equipmentId" : "oarSetId";
  const resourceId = booking.boatId ?? booking.equipmentId ?? booking.oarSetId;

  const conflictCandidates = await prisma.booking.findMany({
    where: {
      id: { not: booking.id },
      date: booking.date,
      [resourceField]: resourceId,
    },
  });
  const conflict = conflictCandidates.find((existing) =>
    bookingsOverlap(
      {
        startSlot: booking.startSlot,
        endSlot: newEndSlot,
        startMinutes: newStartMinutes,
        endMinutes: newEndMinutes,
      },
      existing
    )
  );
  if (conflict) {
    return NextResponse.json(
      { errors: [{ field: "slot", message: `This time slot overlaps with a booking by ${conflict.bookerName}.` }] },
      { status: 409 }
    );
  }

  let nextBookerName = body.bookerName ?? booking.bookerName;
  if (bookingSquad) {
    nextBookerName = bookingSquad.name;
  } else if (hasExplicitSquadChange && !nextSquadId && !body.bookerName) {
    nextBookerName = user.fullName;
  }

  const updatedBooking = await prisma.booking.update({
    where: { id },
    data: {
      squadId: nextSquadId,
      bookerName: nextBookerName,
      crewCount: newCrewCount,
      endSlot: newEndSlot,
      startMinutes: newStartMinutes,
      endMinutes: newEndMinutes,
      isRaceSpecific: newIsRaceSpecific,
      raceDetails: body.raceDetails ?? booking.raceDetails,
      notes: body.notes ?? booking.notes,
    },
    include: { squad: { select: { id: true, name: true } } },
  });

  return NextResponse.json(serializeBooking(updatedBooking));
}
