import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { getAuthenticatedUser } from "@/lib/auth";
import { startOfWeek, addDays, format, parseISO } from "date-fns";
import { BookingsClient } from "@/components/bookings-client";
import { buildBookingWeekPayload } from "@/lib/booking-utils";
import { getSydneyDateString } from "@/lib/sydney-time";

export default async function BookingsPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  const params = await searchParams;

  // Determine which date to show (default to Sydney local date, not UTC)
  const selectedDate = params.date
    ? parseISO(params.date)
    : parseISO(getSydneyDateString());

  // Get Monday of the selected week
  const weekStart = startOfWeek(selectedDate, { weekStartsOn: 1 });
  // Fetch everything in parallel — static data once, week data once.
  const [boats, equipment, oarSets, userProfile, bookings, bookingWeek] =
    await Promise.all([
      prisma.boat.findMany({
        include: { responsibleSquad: true, privateBoatAccess: { select: { userId: true } } },
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

  // Filter private boats: only show to owner, users with explicit access, or admins
  const isPrivileged = ["admin", "captain", "vice_captain"].includes(userProfile.role);
  const visibleBoats = boats.filter((b) => {
    if (b.category !== "private") return true;
    if (isPrivileged) return true;
    if (b.ownerUserId === userProfile.id) return true;
    if (b.privateBoatAccess.some((a) => a.userId === userProfile.id)) return true;
    return false;
  });

  // Serialize data for client components
  const serializedBoats = visibleBoats.map((b) => ({
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
