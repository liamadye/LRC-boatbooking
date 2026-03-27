import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getAuthenticatedUser } from "@/lib/auth";
import { serializeBooking } from "@/lib/booking-utils";
import { deriveBoatTypeLabel } from "@/lib/boats";
import { getSydneyToday } from "@/lib/sydney-time";
import { MyBookingsList } from "@/components/my-bookings-list";

export default async function MyBookingsPage() {
  const user = await getAuthenticatedUser();
  if (!user) redirect("/login");

  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    include: { squads: { select: { squadId: true } } },
  });

  if (!dbUser) redirect("/pending-approval");

  const userSquadIds = dbUser.squads.map((s) => s.squadId);

  const bookings = await prisma.booking.findMany({
    where: {
      date: { gte: getSydneyToday() },
      OR: [
        { userId: dbUser.id },
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

  const serialized = bookings.map((b) => ({
    ...serializeBooking(b),
    boat: b.boat
      ? { name: b.boat.name, boatTypeLabel: deriveBoatTypeLabel(b.boat) }
      : null,
  }));

  return <MyBookingsList initialBookings={serialized} />;
}
