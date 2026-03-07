import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { getAuthenticatedUser } from "@/lib/auth";
import { BookingGrid } from "@/components/booking-grid";
import { WeekNav } from "@/components/week-nav";
import { startOfWeek, addDays, format, parseISO } from "date-fns";

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
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  // Fetch everything in parallel — all 6 queries are independent
  const [boats, equipment, oarSets, bookings, userProfile, bookingWeek] =
    await Promise.all([
      prisma.boat.findMany({
        include: { responsibleSquad: true },
        orderBy: { displayOrder: "asc" },
      }),
      prisma.equipment.findMany({
        orderBy: [{ type: "asc" }, { number: "asc" }],
      }),
      prisma.oarSet.findMany({ orderBy: { name: "asc" } }),
      prisma.booking.findMany({
        where: {
          date: { gte: weekStart, lte: addDays(weekStart, 6) },
        },
      }),
      getAuthenticatedUser().then(async (user) => {
        if (!user) return null;
        return prisma.user.findUnique({
          where: { id: user.id },
          include: { squads: { include: { squad: true } } },
        });
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

  const serializedBookings = bookings.map((b) => ({
    ...b,
    date: format(b.date, "yyyy-MM-dd"),
  }));

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <h1 className="text-lg sm:text-xl font-bold">
          Bookings — W/C {format(weekStart, "d MMM yyyy")}
        </h1>
        {bookingWeek?.pymbleNotes && (
          <div className="rounded-md bg-amber-50 border border-amber-200 px-3 py-1.5 text-sm text-amber-800">
            {bookingWeek.pymbleNotes}
          </div>
        )}
      </div>

      <WeekNav weekDays={weekDays} selectedDate={selectedDate} />

      <BookingGrid
        boats={serializedBoats}
        equipment={equipment}
        oarSets={oarSets}
        bookings={serializedBookings}
        selectedDate={format(selectedDate, "yyyy-MM-dd")}
        user={serializedUser}
        loadedAt={new Date().toISOString()}
      />
    </div>
  );
}
