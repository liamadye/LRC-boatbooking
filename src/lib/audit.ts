import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";

export async function logAudit({
  userId,
  action,
  targetType,
  targetId,
  before,
  after,
}: {
  userId: string;
  action: string;
  targetType: string;
  targetId: string;
  before?: Record<string, unknown> | null;
  after?: Record<string, unknown> | null;
}) {
  await prisma.auditLog.create({
    data: {
      userId,
      action,
      targetType,
      targetId,
      before: before as Prisma.InputJsonValue ?? undefined,
      after: after as Prisma.InputJsonValue ?? undefined,
    },
  });
}
