import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { normalizeInvitationSquads } from "@/lib/admin-invitations";
import {
  finalizeSignupRequestApproval,
  markSignupRequestReviewed,
  serializeSignupRequest,
} from "@/lib/signup-requests";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await requirePermission("manage_users");
  if (!admin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const body = (await request.json()) as {
    status?: "approved" | "denied";
    role?: "member" | "squad_captain" | "vice_captain" | "captain" | "admin";
    memberType?: "senior_competitive" | "student" | "recreational";
    squadIds?: string[];
    fullName?: string;
  };

  if (!body.status || !["approved", "denied"].includes(body.status)) {
    return NextResponse.json({ error: "A valid review decision is required." }, { status: 400 });
  }

  if (body.status === "approved") {
    const squadIds = await normalizeInvitationSquads(body.squadIds);
    const fullName = body.fullName?.trim();

    if (!fullName) {
      return NextResponse.json({ error: "Full name is required for approval." }, { status: 400 });
    }

    try {
      const { user, signupRequest } = await finalizeSignupRequestApproval({
        requestId: id,
        fullName,
        role: body.role ?? "member",
        memberType: body.memberType ?? "recreational",
        squadIds,
        reviewedBy: admin.id,
      });

      await logAudit({
        userId: admin.id,
        action: "signup_request.approve",
        targetType: "signup_request",
        targetId: id,
        after: {
          email: signupRequest.email,
          userId: user.id,
          role: user.role,
          memberType: user.memberType,
          squadIds,
        },
      });

      return NextResponse.json({
        success: true,
        user: {
          id: user.id,
          email: user.email,
          fullName: user.fullName,
        },
        request: serializeSignupRequest(signupRequest),
      });
    } catch (error) {
      return NextResponse.json(
        { error: error instanceof Error ? error.message : "Failed to approve signup request." },
        { status: 400 }
      );
    }
  }

  try {
    const signupRequest = await markSignupRequestReviewed({
      requestId: id,
      status: "denied",
      reviewedBy: admin.id,
    });

    await logAudit({
      userId: admin.id,
      action: "signup_request.deny",
      targetType: "signup_request",
      targetId: id,
      after: {
        email: signupRequest.email,
        status: signupRequest.status,
      },
    });

    return NextResponse.json({ success: true, request: serializeSignupRequest(signupRequest) });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to deny signup request." },
      { status: 400 }
    );
  }
}
