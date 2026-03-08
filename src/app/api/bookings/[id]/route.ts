import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { validateBooking, isWeekend } from "@/lib/validation";
import { can } from "@/lib/permissions";
import { logAudit } from "@/lib/audit";

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
    prisma.user.findUnique({ where: { email: authUser.email! } }),
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
    prisma.user.findUnique({ where: { email: authUser.email! } }),
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
  const newCrewCount = body.crewCount ?? booking.crewCount;
  const newIsRaceSpecific = body.isRaceSpecific ?? booking.isRaceSpecific;

  // Re-run validation if booking a boat
  if (booking.boatId) {
    // Parallel: boat + consecutive count are independent
    const [boat, consecutiveBookings] = await Promise.all([
      prisma.boat.findUnique({ where: { id: booking.boatId } }),
      prisma.booking.count({
        where: {
          boatId: booking.boatId,
          id: { not: booking.id },
          date: {
            in: [
              new Date(booking.date.getTime() - 86400000),
              new Date(booking.date.getTime() + 86400000),
            ],
          },
        },
      }),
    ]);

    if (boat) {
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
        userRole: user.role,
        userMemberType: user.memberType as "senior_competitive" | "student" | "recreational",
        userHasBlackBoatEligibility: user.hasBlackBoatEligibility,
        isWeekend: isWeekend(booking.date),
        isRaceSpecific: newIsRaceSpecific,
        existingBookingsOnConsecutiveDays: consecutiveBookings,
      });

      if (validationErrors.length > 0) {
        return NextResponse.json({ errors: validationErrors }, { status: 400 });
      }
    }
  }

  // Check for slot conflicts if endSlot changed — single range overlap query
  if (body.endSlot && body.endSlot !== booking.endSlot) {
    const resourceField = booking.boatId ? "boatId" : booking.equipmentId ? "equipmentId" : "oarSetId";
    const resourceId = booking.boatId ?? booking.equipmentId ?? booking.oarSetId;

    const conflict = await prisma.booking.findFirst({
      where: {
        id: { not: booking.id },
        date: booking.date,
        [resourceField]: resourceId,
        startSlot: { lte: newEndSlot },
        endSlot: { gte: booking.startSlot },
      },
    });
    if (conflict) {
      return NextResponse.json(
        { errors: [{ field: "slot", message: `This time slot overlaps with a booking by ${conflict.bookerName}.` }] },
        { status: 409 }
      );
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
