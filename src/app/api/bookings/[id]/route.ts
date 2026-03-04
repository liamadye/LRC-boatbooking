import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";

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
  const isAdmin = user.role === "admin" || user.role === "captain" || user.role === "vice_captain";
  if (booking.userId !== user.id && !isAdmin) {
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

  const isAdmin = user.role === "admin" || user.role === "captain" || user.role === "vice_captain";
  if (booking.userId !== user.id && !isAdmin) {
    return NextResponse.json(
      { error: "You can only edit your own bookings" },
      { status: 403 }
    );
  }

  const body = await request.json();
  const updatedBooking = await prisma.booking.update({
    where: { id },
    data: {
      bookerName: body.bookerName ?? booking.bookerName,
      crewCount: body.crewCount ?? booking.crewCount,
      endSlot: body.endSlot ?? booking.endSlot,
      isRaceSpecific: body.isRaceSpecific ?? booking.isRaceSpecific,
      raceDetails: body.raceDetails ?? booking.raceDetails,
      notes: body.notes ?? booking.notes,
    },
  });

  return NextResponse.json(updatedBooking);
}
