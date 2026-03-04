import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";

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

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const body = await request.json();

  const updateData: Record<string, unknown> = {};
  if (body.role) updateData.role = body.role;
  if (body.memberType) updateData.memberType = body.memberType;
  if (body.hasBlackBoatEligibility !== undefined)
    updateData.hasBlackBoatEligibility = body.hasBlackBoatEligibility;

  const user = await prisma.user.update({
    where: { id },
    data: updateData,
  });

  return NextResponse.json(user);
}
