import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import {
  findSignupRequestByEmail,
  getAuthDisplayName,
  getAuthProvider,
  serializeSignupRequest,
  upsertPendingGoogleSignupRequest,
} from "@/lib/signup-requests";

function fallbackName(email: string) {
  return email.split("@")[0] || "New member";
}

async function resolveCurrentStatus(createPendingRequest: boolean) {
  const supabase = await createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser?.email) {
    return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  }

  const existingUser = await prisma.user.findUnique({
    where: { email: authUser.email },
  });

  if (existingUser) {
    await prisma.signupRequest.updateMany({
      where: {
        email: authUser.email,
        status: "pending",
      },
      data: {
        status: "approved",
        reviewedAt: new Date(),
      },
    });
    return NextResponse.json({ status: "approved", hasProfile: true });
  }

  const invitation = await prisma.invitation.findFirst({
    where: {
      email: authUser.email,
      acceptedAt: null,
      expiresAt: { gt: new Date() },
    },
    include: {
      invitationSquads: { select: { squadId: true } },
    },
  });

  if (invitation) {
    const fullName = getAuthDisplayName(authUser) ?? fallbackName(authUser.email);

    await prisma.$transaction(async (tx) => {
      const user = await tx.user.upsert({
        where: { email: invitation.email },
        create: {
          email: invitation.email,
          fullName,
          role: invitation.role,
          memberType: invitation.memberType,
        },
        update: {
          fullName,
          role: invitation.role,
          memberType: invitation.memberType,
        },
      });

      if (invitation.invitationSquads.length > 0) {
        await tx.userSquad.createMany({
          data: invitation.invitationSquads.map((entry) => ({
            userId: user.id,
            squadId: entry.squadId,
          })),
          skipDuplicates: true,
        });
      }

      await tx.invitation.update({
        where: { id: invitation.id },
        data: { acceptedAt: new Date() },
      });

      await tx.signupRequest.updateMany({
        where: {
          email: invitation.email,
          status: "pending",
        },
        data: {
          status: "approved",
          reviewedAt: new Date(),
        },
      });
    });

    return NextResponse.json({ status: "approved", acceptedInvitation: true, hasProfile: true });
  }

  const provider = getAuthProvider(authUser);
  if (provider !== "google") {
    return NextResponse.json({
      status: "needs_invite",
      provider,
      email: authUser.email,
    });
  }

  const existingRequest = await findSignupRequestByEmail(authUser.email);
  if (!createPendingRequest && existingRequest) {
    return NextResponse.json({
      status: existingRequest.status,
      request: serializeSignupRequest(existingRequest),
    });
  }

  if (!createPendingRequest) {
    return NextResponse.json({
      status: "needs_request",
      provider,
      email: authUser.email,
    });
  }

  const { request, blocked } = await upsertPendingGoogleSignupRequest({
    email: authUser.email,
    fullName: getAuthDisplayName(authUser),
    supabaseUserId: authUser.id,
  });

  return NextResponse.json({
    status: blocked ? request.status : "pending",
    request: serializeSignupRequest(request),
    email: authUser.email,
  });
}

export async function GET() {
  return resolveCurrentStatus(false);
}

export async function POST() {
  return resolveCurrentStatus(true);
}
