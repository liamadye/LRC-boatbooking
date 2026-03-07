import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { startOfDay, endOfDay, parseISO } from "date-fns";

async function requireAdmin() {
  const supabase = await createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) return null;

  const user = await prisma.user.findUnique({
    where: { email: authUser.email! },
  });

  const adminRoles = ["admin", "captain", "vice_captain"];
  if (!user || !adminRoles.includes(user.role)) return null;

  return user;
}

export async function GET(request: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const date = searchParams.get("date");
  const userId = searchParams.get("userId");

  const where: Record<string, unknown> = {};
  if (date) {
    const d = parseISO(date);
    where.date = { gte: startOfDay(d), lte: endOfDay(d) };
  }
  if (userId) {
    where.userId = userId;
  }

  const bookings = await prisma.booking.findMany({
    where,
    include: {
      boat: true,
      equipment: true,
      oarSet: true,
      user: { select: { fullName: true, email: true } },
    },
    orderBy: [{ date: "desc" }, { startSlot: "asc" }],
    take: 200,
  });

  return NextResponse.json(bookings);
}
