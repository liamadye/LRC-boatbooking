import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";

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
    },
    orderBy: [{ date: "asc" }, { startSlot: "asc" }],
  });

  return NextResponse.json(
    bookings.map((b) => ({
      ...b,
      date: b.date.toISOString().split("T")[0],
    }))
  );
}
