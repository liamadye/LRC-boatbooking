import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
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

  // Check for existing pending application
  const existing = await prisma.blackBoatApplication.findFirst({
    where: { userId: user.id, status: "pending" },
  });

  if (existing) {
    return NextResponse.json(
      { error: "You already have a pending application" },
      { status: 409 }
    );
  }

  const body = await request.json();

  const application = await prisma.blackBoatApplication.create({
    data: {
      userId: user.id,
      regattaResults: body.regattaResults,
      ergTimes: body.ergTimes,
      trainingRegime: body.trainingRegime,
      racingTargets: body.racingTargets,
      equipmentCareNotes: body.equipmentCareNotes,
    },
  });

  return NextResponse.json(application, { status: 201 });
}
