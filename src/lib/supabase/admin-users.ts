import type { User } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";

const PAGE_SIZE = 1000;
const MAX_PAGES = 50;

export async function findSupabaseAuthUsersByEmail(email: string) {
  const adminClient = createAdminClient();
  if (!adminClient) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY is not configured. Full user deletion is unavailable.");
  }

  const normalizedEmail = email.trim().toLowerCase();
  const matches: User[] = [];

  for (let page = 1; page <= MAX_PAGES; page += 1) {
    const { data, error } = await adminClient.auth.admin.listUsers({
      page,
      perPage: PAGE_SIZE,
    });

    if (error) {
      throw new Error(`Failed to query Supabase Auth users: ${error.message}`);
    }

    const pageMatches = data.users.filter((user) => user.email?.toLowerCase() === normalizedEmail);
    matches.push(...pageMatches);

    if (!data.nextPage || data.users.length < PAGE_SIZE) {
      break;
    }
  }

  return matches;
}

export async function deleteSupabaseAuthUserByEmail(email: string) {
  const adminClient = createAdminClient();
  if (!adminClient) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY is not configured. Full user deletion is unavailable.");
  }

  const matches = await findSupabaseAuthUsersByEmail(email);
  if (matches.length === 0) {
    return { deleted: false as const, authUserId: null };
  }

  if (matches.length > 1) {
    throw new Error(`Multiple Supabase Auth users matched ${email}. Refusing to delete ambiguously.`);
  }

  const authUser = matches[0];
  const { error } = await adminClient.auth.admin.deleteUser(authUser.id);

  if (error) {
    throw new Error(`Failed to delete Supabase Auth user: ${error.message}`);
  }

  return {
    deleted: true as const,
    authUserId: authUser.id,
  };
}
