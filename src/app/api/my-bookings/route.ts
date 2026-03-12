import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { serializeBooking } from "@/lib/booking-utils";
import { deriveBoatTypeLabel } from "@/lib/boats";
import { getSydneyToday } from "@/lib/sydney-time";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { email: authUser.email! },
    include: { squads: { select: { squadId: true } } },
  });

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const userSquadIds = user.squads.map((s) => s.squadId);

  const bookings = await prisma.booking.findMany({
    where: {
      date: { gte: getSydneyToday() },
      OR: [
        { userId: user.id },
        ...(userSquadIds.length > 0
          ? [{ squadId: { in: userSquadIds } }]
          : []),
      ],
    },
    include: {
      boat: {
        select: {
          name: true,
          boatClass: true,
          supportsSweep: true,
          supportsScull: true,
          isCoxed: true,
        },
      },
      squad: { select: { id: true, name: true } },
    },
    orderBy: [{ date: "asc" }, { startSlot: "asc" }],
  });

  return NextResponse.json(
    bookings.map((b) => ({
      ...serializeBooking(b),
      boat: b.boat
        ? {
            name: b.boat.name,
            boatTypeLabel: deriveBoatTypeLabel(b.boat),
          }
        : null,
    }))
  );
}
