import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await requirePermission("review_applications");
  if (!admin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const body = await request.json();

  const application = await prisma.blackBoatApplication.update({
    where: { id },
    data: {
      status: body.status,
      reviewedBy: admin.id,
      reviewedAt: new Date(),
    },
    include: { applicant: true },
  });

  // If approved, grant the user Black Boat eligibility
  if (body.status === "approved") {
    await prisma.user.update({
      where: { id: application.userId },
      data: { hasBlackBoatEligibility: true },
    });
  }

  return NextResponse.json(application);
}
