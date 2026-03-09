import type { MemberType, Prisma, UserRole } from "@prisma/client";
import { addDays } from "date-fns";
import { prisma } from "@/lib/prisma";
import { createAdminClient } from "@/lib/supabase/admin";
import { getInvitationUrls } from "@/lib/invitations";
import { buildInviteEmailMessage, canSendInviteEmails, sendInviteEmail } from "@/lib/invite-email";
import type { InvitationSummary } from "@/lib/types";

export const invitationInclude = {
  inviter: { select: { fullName: true } },
  invitationSquads: {
    include: { squad: { select: { id: true, name: true } } },
  },
} satisfies Prisma.InvitationInclude;

export type InvitationWithRelations = Prisma.InvitationGetPayload<{
  include: typeof invitationInclude;
}>;

function dedupeSquadIds(squadIds: string[]) {
  return Array.from(new Set(squadIds.filter(Boolean)));
}

export async function normalizeInvitationSquads(squadIds?: string[]) {
  const normalized = dedupeSquadIds(squadIds ?? []);
  if (normalized.length === 0) {
    return [];
  }

  const squads = await prisma.squad.findMany({
    where: { id: { in: normalized } },
    select: { id: true },
  });

  if (squads.length !== normalized.length) {
    throw new Error("One or more selected squads are invalid.");
  }

  return normalized;
}

export async function createInvitationRecord(args: {
  email: string;
  role: UserRole;
  memberType: MemberType;
  invitedBy: string;
  squadIds?: string[];
}) {
  const squadIds = await normalizeInvitationSquads(args.squadIds);

  const [existingUser, existingInvite] = await Promise.all([
    prisma.user.findUnique({ where: { email: args.email } }),
    prisma.invitation.findFirst({
      where: {
        email: args.email,
        acceptedAt: null,
        expiresAt: { gt: new Date() },
      },
    }),
  ]);

  if (existingUser) {
    return { error: "A user with this email already exists", status: 409 as const };
  }

  if (existingInvite) {
    return { error: "An active invitation already exists for this email", status: 409 as const };
  }

  const invitation = await prisma.invitation.create({
    data: {
      email: args.email,
      role: args.role,
      memberType: args.memberType,
      invitedBy: args.invitedBy,
      expiresAt: addDays(new Date(), 7),
      invitationSquads: squadIds.length
        ? {
            create: squadIds.map((squadId) => ({
              squadId,
            })),
          }
        : undefined,
    },
    include: invitationInclude,
  });

  return { invitation };
}

export async function deliverInvitation(args: {
  email: string;
  token: string;
}) {
  let emailSent = false;
  let inviteUrl: string | null = null;

  const adminClient = createAdminClient();
  if (adminClient) {
    const { redirectTo } = await getInvitationUrls(args.email, args.token);
    const { error } = await adminClient.auth.admin.inviteUserByEmail(args.email, {
      redirectTo,
      data: { invitation_token: args.token },
    });

    if (error) {
      console.error("[invite] Supabase invite email failed:", error.message);
      const urls = await getInvitationUrls(args.email, args.token);
      inviteUrl = urls.actionUrl;
    } else {
      emailSent = true;
    }
  } else {
    console.warn("[invite] SUPABASE_SERVICE_ROLE_KEY not set — invite email not sent");
    const urls = await getInvitationUrls(args.email, args.token);
    inviteUrl = urls.actionUrl;
  }

  return { emailSent, inviteUrl };
}

export async function getManualInvitationDelivery(args: {
  email: string;
  token: string;
}) {
  const urls = await getInvitationUrls(args.email, args.token);
  const message = buildInviteEmailMessage({ inviteUrl: urls.actionUrl });
  const mailtoUrl = `mailto:${encodeURIComponent(args.email)}?subject=${encodeURIComponent(message.subject)}&body=${encodeURIComponent(message.text)}`;

  return {
    inviteUrl: urls.actionUrl,
    deliveryMode: urls.usedGeneratedLink ? "manual_action_link" as const : "manual_register_link" as const,
    canEmailFromServer: canSendInviteEmails(),
    mailtoUrl,
  };
}

export async function emailInvitationLink(args: {
  email: string;
  token: string;
}) {
  const manualDelivery = await getManualInvitationDelivery(args);

  try {
    const result = await sendInviteEmail({
      to: args.email,
      inviteUrl: manualDelivery.inviteUrl,
    });

    if (!result.sent) {
      return {
        ...manualDelivery,
        emailSent: false,
        emailConfigured: false,
      };
    }

    return {
      ...manualDelivery,
      emailSent: true,
      emailConfigured: true,
    };
  } catch (error) {
    console.error("[invite-email] Failed to send invite email:", error);
    return {
      ...manualDelivery,
      emailSent: false,
      emailConfigured: true,
      error: error instanceof Error ? error.message : "Failed to send invitation email.",
    };
  }
}

export function serializeInvitation(invitation: InvitationWithRelations): InvitationSummary {
  return {
    id: invitation.id,
    email: invitation.email,
    token: invitation.token,
    role: invitation.role,
    memberType: invitation.memberType,
    acceptedAt: invitation.acceptedAt?.toISOString() ?? null,
    expiresAt: invitation.expiresAt.toISOString(),
    createdAt: invitation.createdAt.toISOString(),
    inviter: invitation.inviter,
    squads: invitation.invitationSquads.map((entry) => entry.squad),
  };
}
