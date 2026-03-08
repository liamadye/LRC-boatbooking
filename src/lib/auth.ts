import { cache } from "react";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { can, type Action } from "@/lib/permissions";

/**
 * Get the authenticated user from Supabase + Prisma.
 * Wrapped with React.cache() to deduplicate within a single request/render pass.
 * Returns null if not authenticated or no DB profile.
 */
export const getAuthenticatedUser = cache(async () => {
  const supabase = await createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser?.email) return null;

  const user = await prisma.user.findUnique({
    where: { email: authUser.email },
  });

  return user;
});

/**
 * Require the user to be authenticated and have permission for the given action.
 * Returns the user if authorised, null otherwise.
 */
export async function requirePermission(action: Action) {
  const user = await getAuthenticatedUser();
  if (!user) return null;
  if (!can(user.role, action)) return null;
  return user;
}
