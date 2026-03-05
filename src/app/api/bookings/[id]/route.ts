import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { validateBooking, isWeekend } from "@/lib/validation";
import { can } from "@/lib/permissions";

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

  const user = await prisma.user.findUnique({
    where: { email: authUser.email! },
  });

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const booking = await prisma.booking.findUnique({ where: { id } });

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

  const user = await prisma.user.findUnique({
    where: { email: authUser.email! },
  });

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const booking = await prisma.booking.findUnique({ where: { id } });
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
  const newCrewCount = body.crewCount ?? booking.crewCount;
  const newIsRaceSpecific = body.isRaceSpecific ?? booking.isRaceSpecific;

  // Re-run validation if booking a boat
  if (booking.boatId) {
    const boat = await prisma.boat.findUnique({ where: { id: booking.boatId } });
    if (boat) {
      const bookingDate = booking.date;
      const consecutiveBookings = await prisma.booking.count({
        where: {
          boatId: boat.id,
          id: { not: booking.id },
          date: {
            in: [
              new Date(bookingDate.getTime() - 86400000),
              new Date(bookingDate.getTime() + 86400000),
            ],
          },
        },
      });

      const validationErrors = validateBooking({
        boatType: boat.boatType,
        boatClassification: boat.classification as "black" | "green",
        boatCategory: boat.category as "club" | "private" | "syndicate" | "tinny",
        boatStatus: boat.status as "available" | "not_in_use",
        boatAvgWeightKg: boat.avgWeightKg ? Number(boat.avgWeightKg) : null,
        boatOwnerUserId: boat.ownerUserId,
        isOutside: boat.isOutside,
        crewCount: newCrewCount,
        crewAvgWeightKg: user.weightKg ? Number(user.weightKg) : null,
        startSlot: booking.startSlot,
        endSlot: newEndSlot,
        userId: user.id,
        userMemberType: user.memberType as "senior_competitive" | "student" | "recreational",
        userHasBlackBoatEligibility: user.hasBlackBoatEligibility,
        isWeekend: isWeekend(bookingDate),
        isRaceSpecific: newIsRaceSpecific,
        existingBookingsOnConsecutiveDays: consecutiveBookings,
      });

      if (validationErrors.length > 0) {
        return NextResponse.json({ errors: validationErrors }, { status: 400 });
      }
    }
  }

  // Check for slot conflicts if endSlot changed
  if (body.endSlot && body.endSlot !== booking.endSlot) {
    const resourceField = booking.boatId ? "boatId" : booking.equipmentId ? "equipmentId" : "oarSetId";
    const resourceId = booking.boatId ?? booking.equipmentId ?? booking.oarSetId;

    for (let s = booking.startSlot; s <= newEndSlot; s++) {
      const conflict = await prisma.booking.findFirst({
        where: {
          id: { not: booking.id },
          date: booking.date,
          [resourceField]: resourceId,
          startSlot: { lte: s },
          endSlot: { gte: s },
        },
      });
      if (conflict) {
        return NextResponse.json(
          { errors: [{ field: "slot", message: `Slot ${s} is already booked by ${conflict.bookerName}.` }] },
          { status: 409 }
        );
      }
    }
  }

  const updatedBooking = await prisma.booking.update({
    where: { id },
    data: {
      bookerName: body.bookerName ?? booking.bookerName,
      crewCount: newCrewCount,
      endSlot: newEndSlot,
      isRaceSpecific: newIsRaceSpecific,
      raceDetails: body.raceDetails ?? booking.raceDetails,
      notes: body.notes ?? booking.notes,
    },
  });

  return NextResponse.json(updatedBooking);
}
