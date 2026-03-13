import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { validateBooking, isWeekend } from "@/lib/validation";
import { bookingsOverlap, getDefaultEndMinutes, getDefaultStartMinutes } from "@/lib/booking-times";
import { can } from "@/lib/permissions";
import { logAudit } from "@/lib/audit";
import { serializeBooking } from "@/lib/booking-utils";

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

  // Only the booker, squad members (for squad bookings), or admins can delete
  const isDeleteSquadMember =
    !!booking.squadId &&
    user.squads.some((entry) => entry.squad.id === booking.squadId);
  if (
    booking.userId !== user.id &&
    !isDeleteSquadMember &&
    !can(user.role, "manage_bookings")
  ) {
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

  // Only the booker, squad members (for squad bookings), or admins can edit
  const isEditSquadMember =
    !!booking.squadId &&
    user.squads.some((entry) => entry.squad.id === booking.squadId);
  if (
    booking.userId !== user.id &&
    !isEditSquadMember &&
    !can(user.role, "manage_bookings")
  ) {
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
        bookingSquad = user.squads.find((entry) => entry.squad.id === nextSquadId)?.squad ?? null;

        // Admins can book for any squad
        if (!bookingSquad && user.role === "admin") {
          bookingSquad = await prisma.squad.findUnique({
            where: { id: nextSquadId },
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

      const validationErrors = validateBooking({
        boatClass: boat.boatClass,
        boatSupportsSweep: boat.supportsSweep,
        boatSupportsScull: boat.supportsScull,
        boatIsCoxed: boat.isCoxed,
        boatTypeLabel: boat.boatType,
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

  try {
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

    console.error("Failed to update booking:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred while updating the booking." },
      { status: 500 }
    );
  }
}
