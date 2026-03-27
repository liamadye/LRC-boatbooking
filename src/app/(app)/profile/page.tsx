import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getAuthenticatedUser } from "@/lib/auth";
import { ProfileForm } from "@/components/profile-form";
import type { UserProfile } from "@/lib/types";

export default async function ProfilePage() {
  const user = await getAuthenticatedUser();
  if (!user) redirect("/login");

  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    include: { squads: { include: { squad: true } } },
  });

  if (!dbUser) redirect("/pending-approval");

  const profile: UserProfile = {
    id: dbUser.id,
    email: dbUser.email,
    fullName: dbUser.fullName,
    role: dbUser.role,
    memberType: dbUser.memberType,
    weightKg: dbUser.weightKg ? Number(dbUser.weightKg) : null,
    hasBlackBoatEligibility: dbUser.hasBlackBoatEligibility,
    squads: dbUser.squads.map((us) => ({ id: us.squad.id, name: us.squad.name })),
  };

  return <ProfileForm initialProfile={profile} />;
}
