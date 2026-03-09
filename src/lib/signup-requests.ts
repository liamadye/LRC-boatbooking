import type { ApplicationStatus, Prisma } from "@prisma/client";
import type { User as SupabaseUser } from "@supabase/supabase-js";
import { prisma } from "@/lib/prisma";
import type { SignupRequestSummary } from "@/lib/types";

export const signupRequestInclude = {
  reviewer: { select: { fullName: true } },
} satisfies Prisma.SignupRequestInclude;

export type SignupRequestWithRelations = Prisma.SignupRequestGetPayload<{
  include: typeof signupRequestInclude;
}>;

export function getAuthDisplayName(authUser: SupabaseUser) {
  const metadata = authUser.user_metadata;

  const fullName =
    metadata?.full_name ??
    metadata?.name ??
    metadata?.display_name ??
    metadata?.preferred_username ??
    null;

  if (typeof fullName === "string" && fullName.trim().length > 0) {
    return fullName.trim();
  }

  return authUser.email?.split("@")[0] ?? null;
}

export function getAuthProvider(authUser: SupabaseUser) {
  const provider = authUser.app_metadata?.provider;
  return typeof provider === "string" ? provider : null;
}

export function serializeSignupRequest(request: SignupRequestWithRelations): SignupRequestSummary {
  return {
    id: request.id,
    email: request.email,
    fullName: request.fullName,
    provider: request.provider,
    status: request.status,
    createdAt: request.createdAt.toISOString(),
    reviewedAt: request.reviewedAt?.toISOString() ?? null,
    reviewer: request.reviewer,
  };
}

export async function findSignupRequestByEmail(email: string) {
  return prisma.signupRequest.findUnique({
    where: { email },
    include: signupRequestInclude,
  });
}

export async function upsertPendingGoogleSignupRequest(args: {
  email: string;
  fullName: string | null;
  supabaseUserId: string;
}) {
  const existing = await findSignupRequestByEmail(args.email);

  if (existing?.status === "denied") {
    return { request: existing, created: false, blocked: true as const };
  }

  const request = await prisma.signupRequest.upsert({
    where: { email: args.email },
    create: {
      email: args.email,
      fullName: args.fullName,
      provider: "google",
      supabaseUserId: args.supabaseUserId,
    },
    update: {
      fullName: args.fullName,
      provider: "google",
      supabaseUserId: args.supabaseUserId,
      status: existing?.status === "approved" ? "approved" : "pending",
    },
    include: signupRequestInclude,
  });

  return {
    request,
    created: !existing,
    blocked: false as const,
  };
}

export async function finalizeSignupRequestApproval(args: {
  requestId: string;
  fullName: string;
  role: Prisma.UserCreateInput["role"];
  memberType: Prisma.UserCreateInput["memberType"];
  squadIds: string[];
  reviewedBy: string;
}) {
  return prisma.$transaction(async (tx) => {
    const request = await tx.signupRequest.findUnique({
      where: { id: args.requestId },
    });

    if (!request) {
      throw new Error("Signup request not found.");
    }

    if (request.status !== "pending") {
      throw new Error("Only pending signup requests can be approved.");
    }

    const user = await tx.user.upsert({
      where: { email: request.email },
      create: {
        email: request.email,
        fullName: args.fullName,
        role: args.role,
        memberType: args.memberType,
      },
      update: {
        fullName: args.fullName,
        role: args.role,
        memberType: args.memberType,
      },
    });

    await tx.userSquad.deleteMany({ where: { userId: user.id } });
    if (args.squadIds.length > 0) {
      await tx.userSquad.createMany({
        data: args.squadIds.map((squadId) => ({
          userId: user.id,
          squadId,
        })),
        skipDuplicates: true,
      });
    }

    await tx.invitation.deleteMany({
      where: {
        email: request.email,
        acceptedAt: null,
      },
    });

    const reviewedAt = new Date();
    const signupRequest = await tx.signupRequest.update({
      where: { id: request.id },
      data: {
        fullName: args.fullName,
        status: "approved",
        reviewedBy: args.reviewedBy,
        reviewedAt,
      },
      include: signupRequestInclude,
    });

    return { user, signupRequest, reviewedAt };
  });
}

export async function markSignupRequestReviewed(args: {
  requestId: string;
  status: Exclude<ApplicationStatus, "approved">;
  reviewedBy: string;
}) {
  const request = await prisma.signupRequest.findUnique({
    where: { id: args.requestId },
  });

  if (!request) {
    throw new Error("Signup request not found.");
  }

  if (request.status !== "pending") {
    throw new Error("Only pending signup requests can be denied.");
  }

  return prisma.signupRequest.update({
    where: { id: args.requestId },
    data: {
      status: args.status,
      reviewedBy: args.reviewedBy,
      reviewedAt: new Date(),
    },
    include: signupRequestInclude,
  });
}
