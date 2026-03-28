import { NextResponse } from "next/server";
import { getCachedBoats, getCachedEquipment, getCachedOarSets } from "@/lib/reference-data";
import { serializeBoat } from "@/lib/boat-serialization";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [boats, equipment, oarSets, squads] = await Promise.all([
    getCachedBoats(),
    getCachedEquipment(),
    getCachedOarSets(),
    prisma.squad.findMany({ orderBy: { name: "asc" } }),
  ]);

  return NextResponse.json({
    boats: boats.map(serializeBoat),
    equipment,
    oarSets,
    squads: squads.map((s) => ({ id: s.id, name: s.name })),
    fetchedAt: new Date().toISOString(),
  });
}
