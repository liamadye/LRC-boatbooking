import { NextRequest, NextResponse } from "next/server";
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
    include: { squads: { include: { squad: true } } },
  });

  if (!user) {
    return NextResponse.json({ error: "Profile not found" }, { status: 404 });
  }

  return NextResponse.json({
    id: user.id,
    email: user.email,
    fullName: user.fullName,
    role: user.role,
    memberType: user.memberType,
    weightKg: user.weightKg ? Number(user.weightKg) : null,
    hasBlackBoatEligibility: user.hasBlackBoatEligibility,
    squads: user.squads.map((us) => ({ id: us.squad.id, name: us.squad.name })),
  });
}

export async function PATCH(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();

  const user = await prisma.user.update({
    where: { email: authUser.email! },
    data: {
      fullName: body.fullName,
      weightKg: body.weightKg,
    },
    include: { squads: { include: { squad: true } } },
  });

  return NextResponse.json({
    id: user.id,
    email: user.email,
    fullName: user.fullName,
    role: user.role,
    memberType: user.memberType,
    weightKg: user.weightKg ? Number(user.weightKg) : null,
    hasBlackBoatEligibility: user.hasBlackBoatEligibility,
    squads: user.squads.map((us) => ({ id: us.squad.id, name: us.squad.name })),
  });
}
