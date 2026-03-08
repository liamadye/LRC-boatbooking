import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { getAuthenticatedUser } from "@/lib/auth";
import { startOfWeek, addDays, format, parseISO } from "date-fns";
import { BookingsClient } from "@/components/bookings-client";
import { buildBookingWeekPayload } from "@/lib/booking-utils";

export default async function BookingsPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  const params = await searchParams;

  // Determine which date to show
  const selectedDate = params.date
    ? parseISO(params.date)
    : new Date();

  // Get Monday of the selected week
  const weekStart = startOfWeek(selectedDate, { weekStartsOn: 1 });
  // Fetch everything in parallel — static data once, week data once.
  const [boats, equipment, oarSets, userProfile, bookings, bookingWeek] =
    await Promise.all([
      prisma.boat.findMany({
        include: { responsibleSquad: true },
        orderBy: { displayOrder: "asc" },
      }),
      prisma.equipment.findMany({
        orderBy: [{ type: "asc" }, { number: "asc" }],
      }),
      prisma.oarSet.findMany({ orderBy: { name: "asc" } }),
      getAuthenticatedUser().then(async (user) => {
        if (!user) return null;
        return prisma.user.findUnique({
          where: { id: user.id },
          include: { squads: { include: { squad: true } } },
        });
      }),
      prisma.booking.findMany({
        where: {
          date: { gte: weekStart, lte: addDays(weekStart, 6) },
        },
        include: { squad: { select: { id: true, name: true } } },
        orderBy: [{ date: "asc" }, { startSlot: "asc" }],
      }),
      prisma.bookingWeek.findUnique({ where: { weekStart } }),
    ]);

  if (!userProfile) {
    redirect("/pending-approval");
  }

  // Serialize data for client components
  const serializedBoats = boats.map((b) => ({
    ...b,
    avgWeightKg: b.avgWeightKg ? Number(b.avgWeightKg) : null,
  }));

  const serializedUser = {
    id: userProfile.id,
    email: userProfile.email,
    fullName: userProfile.fullName,
    role: userProfile.role,
    memberType: userProfile.memberType,
    weightKg: userProfile.weightKg ? Number(userProfile.weightKg) : null,
    hasBlackBoatEligibility: userProfile.hasBlackBoatEligibility,
    squads: userProfile.squads.map((us) => ({
      id: us.squad.id,
      name: us.squad.name,
    })),
  };

  const initialWeekData = buildBookingWeekPayload({
    bookings,
    bookingWeek,
    weekStart,
  });

  return (
      <BookingsClient
        boats={serializedBoats}
        equipment={equipment}
        oarSets={oarSets}
        initialSelectedDate={format(selectedDate, "yyyy-MM-dd")}
        initialWeekData={initialWeekData}
        user={serializedUser}
      />
  );
}
