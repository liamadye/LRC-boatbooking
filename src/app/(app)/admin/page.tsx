import { Suspense } from "react";
import { unstable_cache } from "next/cache";
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

/** Fetch last sign-in times from Supabase Auth, cached for 5 minutes. */
const getCachedLastSignIns = unstable_cache(
  async (): Promise<Record<string, string>> => {
    const map: Record<string, string> = {};
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
                map[authUser.email.toLowerCase()] = authUser.last_sign_in_at;
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
    return map;
  },
  ["admin-last-sign-ins"],
  { revalidate: 300 }
);

type AdminTabsData = {
  boats: ReturnType<typeof serializeBoat>[];
  squads: Awaited<ReturnType<typeof prisma.squad.findMany>>;
  users: Awaited<ReturnType<typeof prisma.user.findMany<{ include: { squads: { include: { squad: true } } }; orderBy: { fullName: "asc" } }>>>;
  applications: Awaited<ReturnType<typeof prisma.blackBoatApplication.findMany<{ where: { status: "pending" }; include: { applicant: true } }>>>;
  invitations: ReturnType<typeof serializeInvitation>[];
  signupRequests: ReturnType<typeof serializeSignupRequest>[];
};

function serializeUsers(
  users: AdminTabsData["users"],
  lastSignIns: Record<string, string> | null,
) {
  return users.map((u) => ({
    ...u,
    weightKg: u.weightKg ? Number(u.weightKg) : null,
    lastSignInAt: lastSignIns?.[u.email.toLowerCase()] ?? null,
    squads: u.squads.map((us) => ({
      id: us.squad.id,
      name: us.squad.name,
    })),
  }));
}

function serializeApplications(applications: AdminTabsData["applications"]) {
  return applications.map((a) => ({
    ...a,
    applicant: {
      id: a.applicant.id,
      fullName: a.applicant.fullName,
      email: a.applicant.email,
    },
  }));
}

/** Async component that streams in last-sign-in data via Suspense. */
async function AdminTabsWithSignIns(props: AdminTabsData) {
  const lastSignIns = await getCachedLastSignIns();
  return (
    <AdminTabs
      boats={props.boats}
      squads={props.squads}
      users={serializeUsers(props.users, lastSignIns)}
      applications={serializeApplications(props.applications)}
      invitations={props.invitations}
      signupRequests={props.signupRequests}
    />
  );
}

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

  const serializedBoats = boats.map(serializeBoat);
  const serializedInvitations = invitations.map(serializeInvitation);
  const serializedSignupRequests = signupRequests.map(serializeSignupRequest);

  const sharedProps = {
    boats: serializedBoats,
    squads,
    users,
    applications,
    invitations: serializedInvitations,
    signupRequests: serializedSignupRequests,
  };

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">Admin Panel</h1>
      <Suspense
        fallback={
          <AdminTabs
            boats={serializedBoats}
            squads={squads}
            users={serializeUsers(users, null)}
            applications={serializeApplications(applications)}
            invitations={serializedInvitations}
            signupRequests={serializedSignupRequests}
          />
        }
      >
        <AdminTabsWithSignIns {...sharedProps} />
      </Suspense>
    </div>
  );
}
