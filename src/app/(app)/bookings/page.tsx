import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { BookingsClient } from "@/components/bookings-client";
import { startOfWeek, addDays, format, parseISO } from "date-fns";

export default async function BookingsPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  const params = await searchParams;
  const supabase = await createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  // Determine which date to show
  const selectedDate = params.date
    ? parseISO(params.date)
    : new Date();

  // Get Monday of the selected week
  const weekStart = startOfWeek(selectedDate, { weekStartsOn: 1 });
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  // Fetch all resources
  const [boats, equipment, oarSets, squads] = await Promise.all([
    prisma.boat.findMany({
      include: { responsibleSquad: true },
      orderBy: { displayOrder: "asc" },
    }),
    prisma.equipment.findMany({
      orderBy: [{ type: "asc" }, { number: "asc" }],
    }),
    prisma.oarSet.findMany({ orderBy: { name: "asc" } }),
    prisma.squad.findMany({ orderBy: { name: "asc" } }),
  ]);

  // Fetch bookings for the whole week
  const bookings = await prisma.booking.findMany({
    where: {
      date: {
        gte: weekStart,
        lte: addDays(weekStart, 6),
      },
    },
  });

  // Get or create user profile
  let userProfile = await prisma.user.findUnique({
    where: { email: authUser!.email! },
    include: { squads: { include: { squad: true } } },
  });

  if (!userProfile) {
    userProfile = await prisma.user.create({
      data: {
        email: authUser!.email!,
        fullName: authUser!.user_metadata?.full_name ?? authUser!.email!.split("@")[0],
      },
      include: { squads: { include: { squad: true } } },
    });
  }

  // Get the booking week config (if any)
  const bookingWeek = await prisma.bookingWeek.findUnique({
    where: { weekStart },
  });

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

  const allSquads = squads.map((s) => ({ id: s.id, name: s.name }));

  return (
    <BookingsClient
      boats={serializedBoats}
      equipment={equipment}
      oarSets={oarSets}
      bookings={serializedBookings}
      initialDate={format(selectedDate, "yyyy-MM-dd")}
      weekStart={weekStart}
      weekDays={weekDays}
      user={serializedUser}
      squads={allSquads}
      pymbleNotes={bookingWeek?.pymbleNotes}
    />
  );
}
