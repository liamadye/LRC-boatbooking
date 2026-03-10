import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/prisma";

export const getCachedBoats = unstable_cache(
  async () =>
    prisma.boat.findMany({
      include: { responsibleSquad: true, privateBoatAccess: { select: { userId: true } } },
      orderBy: { displayOrder: "asc" },
    }),
  ["boats-reference"],
  {
    revalidate: 60,
    tags: ["boats"],
  }
);

export const getCachedEquipment = unstable_cache(
  async () =>
    prisma.equipment.findMany({
      orderBy: [{ type: "asc" }, { number: "asc" }],
    }),
  ["equipment-reference"],
  {
    revalidate: 300,
  }
);

export const getCachedOarSets = unstable_cache(
  async () =>
    prisma.oarSet.findMany({
      orderBy: { name: "asc" },
    }),
  ["oar-sets-reference"],
  {
    revalidate: 300,
  }
);
