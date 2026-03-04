import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { AdminTabs } from "@/components/admin/admin-tabs";

export default async function AdminPage() {
  const supabase = await createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  const user = await prisma.user.findUnique({
    where: { email: authUser!.email! },
  });

  // Only admins, captains, and vice-captains can access
  const adminRoles = ["admin", "captain", "vice_captain"];
  if (!user || !adminRoles.includes(user.role)) {
    redirect("/bookings");
  }

  const [boats, squads, users, applications] = await Promise.all([
    prisma.boat.findMany({
      include: { responsibleSquad: true },
      orderBy: { displayOrder: "asc" },
    }),
    prisma.squad.findMany({ orderBy: { name: "asc" } }),
    prisma.user.findMany({
      include: { squads: { include: { squad: true } } },
      orderBy: { fullName: "asc" },
    }),
    prisma.blackBoatApplication.findMany({
      where: { status: "pending" },
      include: { applicant: true },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">Admin Panel</h1>
      <AdminTabs
        boats={boats.map((b) => ({
          ...b,
          avgWeightKg: b.avgWeightKg ? Number(b.avgWeightKg) : null,
        }))}
        squads={squads}
        users={users.map((u) => ({
          ...u,
          weightKg: u.weightKg ? Number(u.weightKg) : null,
          squads: u.squads.map((us) => ({
            id: us.squad.id,
            name: us.squad.name,
          })),
        }))}
        applications={applications.map((a) => ({
          ...a,
          applicant: {
            id: a.applicant.id,
            fullName: a.applicant.fullName,
            email: a.applicant.email,
          },
        }))}
      />
    </div>
  );
}
