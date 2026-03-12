import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { AdminTabs } from "@/components/admin/admin-tabs";
import { getAuthenticatedUser } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { invitationInclude, serializeInvitation } from "@/lib/admin-invitations";
import { serializeBoat } from "@/lib/boat-serialization";
import { getCachedBoats } from "@/lib/reference-data";
import { serializeSignupRequest, signupRequestInclude } from "@/lib/signup-requests";
import { createAdminClient } from "@/lib/supabase/admin";

export default async function AdminPage() {
  const user = await getAuthenticatedUser();

  if (!user || !can(user.role, "view_admin")) {
    redirect("/bookings");
  }

  const [boats, squads, users, applications, invitations, signupRequests] = await Promise.all([
    getCachedBoats(),
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
    prisma.invitation.findMany({
      include: invitationInclude,
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
    prisma.signupRequest.findMany({
      where: { status: "pending" },
      include: signupRequestInclude,
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
  ]);

  // Fetch last sign-in times from Supabase Auth
  const lastSignInMap = new Map<string, string>();
  try {
    const adminClient = createAdminClient();
    if (adminClient) {
      let page = 1;
      const perPage = 1000;
      let hasMore = true;
      while (hasMore) {
        const { data } = await adminClient.auth.admin.listUsers({ page, perPage });
        if (data?.users) {
          for (const authUser of data.users) {
            if (authUser.email && authUser.last_sign_in_at) {
              lastSignInMap.set(authUser.email.toLowerCase(), authUser.last_sign_in_at);
            }
          }
          hasMore = "nextPage" in data && !!data.nextPage && data.users.length === perPage;
        } else {
          hasMore = false;
        }
        page++;
      }
    }
  } catch {
    // Silently continue without last sign-in data
  }

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">Admin Panel</h1>
      <AdminTabs
        boats={boats.map(serializeBoat)}
        squads={squads}
        users={users.map((u) => ({
          ...u,
          weightKg: u.weightKg ? Number(u.weightKg) : null,
          lastSignInAt: lastSignInMap.get(u.email.toLowerCase()) ?? null,
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
        invitations={invitations.map(serializeInvitation)}
        signupRequests={signupRequests.map(serializeSignupRequest)}
      />
    </div>
  );
}
