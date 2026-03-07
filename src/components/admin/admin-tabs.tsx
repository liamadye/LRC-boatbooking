"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BoatManagement } from "./boat-management";
import { MemberManagement } from "./member-management";
import { ApplicationReview } from "./application-review";
import { InviteUser } from "./invite-user";
import { BookingManagement } from "./booking-management";
import type { BoatWithRelations } from "@/lib/types";

type AdminUser = {
  id: string;
  email: string;
  fullName: string;
  role: string;
  memberType: string;
  weightKg: number | null;
  hasBlackBoatEligibility: boolean;
  squads: { id: string; name: string }[];
};

type Application = {
  id: string;
  status: string;
  regattaResults: string | null;
  ergTimes: string | null;
  trainingRegime: string | null;
  racingTargets: string | null;
  equipmentCareNotes: string | null;
  applicant: { id: string; fullName: string; email: string };
};

type Squad = {
  id: string;
  name: string;
};

export function AdminTabs({
  boats,
  squads,
  users,
  applications,
}: {
  boats: BoatWithRelations[];
  squads: Squad[];
  users: AdminUser[];
  applications: Application[];
}) {
  return (
    <Tabs defaultValue="boats">
      <TabsList>
        <TabsTrigger value="boats">
          Boats ({boats.length})
        </TabsTrigger>
        <TabsTrigger value="members">
          Members ({users.length})
        </TabsTrigger>
        <TabsTrigger value="applications">
          Applications
          {applications.length > 0 && (
            <span className="ml-1 inline-flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] text-white">
              {applications.length}
            </span>
          )}
        </TabsTrigger>
        <TabsTrigger value="bookings">
          Manage Bookings
        </TabsTrigger>
        <TabsTrigger value="invite">
          Invite User
        </TabsTrigger>
      </TabsList>

      <TabsContent value="boats">
        <BoatManagement boats={boats} squads={squads} />
      </TabsContent>

      <TabsContent value="members">
        <MemberManagement users={users} squads={squads} />
      </TabsContent>

      <TabsContent value="applications">
        <ApplicationReview applications={applications} />
      </TabsContent>

      <TabsContent value="bookings">
        <BookingManagement />
      </TabsContent>

      <TabsContent value="invite">
        <InviteUser squads={squads} />
      </TabsContent>
    </Tabs>
  );
}
