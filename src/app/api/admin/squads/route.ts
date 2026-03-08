import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth";

export async function GET() {
  const admin = await requirePermission("manage_users");
  if (!admin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const squads = await prisma.squad.findMany({
    include: {
      userSquads: {
        include: { user: { select: { id: true, fullName: true, email: true } } },
      },
    },
    orderBy: { name: "asc" },
  });

  const result = squads.map((s) => ({
    id: s.id,
    name: s.name,
    members: s.userSquads.map((us) => us.user),
  }));

  return NextResponse.json(result);
}

export async function POST(request: NextRequest) {
  const admin = await requirePermission("manage_users");
  if (!admin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const { name } = body;

  if (!name || !name.trim()) {
    return NextResponse.json({ error: "Squad name is required" }, { status: 400 });
  }

  const existing = await prisma.squad.findUnique({ where: { name: name.trim() } });
  if (existing) {
    return NextResponse.json({ error: "A squad with this name already exists" }, { status: 409 });
  }

  const squad = await prisma.squad.create({ data: { name: name.trim() } });

  return NextResponse.json({ id: squad.id, name: squad.name, members: [] }, { status: 201 });
}
