"use client";

import dynamic from "next/dynamic";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BoatManagement } from "./boat-management";
import type {
  BoatWithRelations,
  InvitationSummary,
  SignupRequestSummary,
  SquadSummary,
} from "@/lib/types";

const MemberManagement = dynamic(() => import("./member-management").then(m => ({ default: m.MemberManagement })));
const BookingManagement = dynamic(() => import("./booking-management").then(m => ({ default: m.BookingManagement })));
const InviteManagement = dynamic(() => import("./invite-management").then(m => ({ default: m.InviteManagement })));
const ApplicationReview = dynamic(() => import("./application-review").then(m => ({ default: m.ApplicationReview })));
const AuditLogViewer = dynamic(() => import("./audit-log-viewer").then(m => ({ default: m.AuditLogViewer })));
const SquadManagement = dynamic(() => import("./squad-management").then(m => ({ default: m.SquadManagement })));

type AdminUser = {
  id: string;
  email: string;
  fullName: string;
  role: string;
  memberType: string;
  weightKg: number | null;
  hasBlackBoatEligibility: boolean;
  lastSignInAt: string | null;
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

export function AdminTabs({
  boats,
  squads,
  users,
  applications,
  invitations,
  signupRequests,
}: {
  boats: BoatWithRelations[];
  squads: SquadSummary[];
  users: AdminUser[];
  applications: Application[];
  invitations: InvitationSummary[];
  signupRequests: SignupRequestSummary[];
}) {
  return (
    <Tabs defaultValue="boats">
      <TabsList className="w-full overflow-x-auto flex-nowrap h-auto gap-1 justify-start">
        <TabsTrigger value="boats">
          Boats ({boats.length})
        </TabsTrigger>
        <TabsTrigger value="members">
          Members ({users.length})
        </TabsTrigger>
        <TabsTrigger value="invitations">
          Invitations
          {signupRequests.length > 0 && (
            <span className="ml-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] text-white">
              {signupRequests.length}
            </span>
          )}
        </TabsTrigger>
        <TabsTrigger value="bookings">
          All Bookings
        </TabsTrigger>
        {applications.length > 0 && (
          <TabsTrigger value="applications">
            Applications
            <span className="ml-1 inline-flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] text-white">
              {applications.length}
            </span>
          </TabsTrigger>
        )}
        <TabsTrigger value="squads">
          Squads
        </TabsTrigger>
        <TabsTrigger value="audit-log">
          Audit Log
        </TabsTrigger>
      </TabsList>

      <TabsContent value="boats">
        <BoatManagement boats={boats} squads={squads} users={users.map((u) => ({ id: u.id, fullName: u.fullName, email: u.email }))} />
      </TabsContent>

      <TabsContent value="members">
        <MemberManagement users={users} squads={squads} />
      </TabsContent>

      <TabsContent value="bookings">
        <BookingManagement />
      </TabsContent>

      <TabsContent value="invitations">
        <InviteManagement
          invitations={invitations}
          signupRequests={signupRequests}
          squads={squads}
        />
      </TabsContent>

      {applications.length > 0 && (
        <TabsContent value="applications">
          <ApplicationReview applications={applications} />
        </TabsContent>
      )}

      <TabsContent value="squads">
        <SquadManagement users={users} />
      </TabsContent>

      <TabsContent value="audit-log">
        <AuditLogViewer />
      </TabsContent>
    </Tabs>
  );
}
