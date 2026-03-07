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

export async function POST(request: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const { email, fullName, memberType, role, squadIds } = body;

  if (!email || !fullName) {
    return NextResponse.json(
      { error: "Email and full name are required" },
      { status: 400 }
    );
  }

  // Check if user already exists
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json(
      { error: "A user with this email already exists" },
      { status: 409 }
    );
  }

  // Create user profile (they'll complete auth on first login via Supabase)
  const user = await prisma.user.create({
    data: {
      email,
      fullName,
      memberType: memberType || "recreational",
      role: role || "member",
      squads: squadIds?.length
        ? {
            create: squadIds.map((squadId: string) => ({ squadId })),
          }
        : undefined,
    },
    include: { squads: { include: { squad: true } } },
  });

  return NextResponse.json(user, { status: 201 });
}
