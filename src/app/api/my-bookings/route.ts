import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { serializeBooking } from "@/lib/booking-utils";

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
  });

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const bookings = await prisma.booking.findMany({
    where: {
      userId: user.id,
      date: { gte: new Date() },
    },
    include: {
      boat: { select: { name: true, boatType: true } },
      squad: { select: { id: true, name: true } },
    },
    orderBy: [{ date: "asc" }, { startSlot: "asc" }],
  });

  return NextResponse.json(
    bookings.map((b) => ({
      ...serializeBooking(b),
      boat: b.boat,
    }))
  );
}
