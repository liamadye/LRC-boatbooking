import { headers } from "next/headers";
import { createAdminClient } from "@/lib/supabase/admin";

export async function getInvitationUrls(email: string, token: string) {
  const headersList = await headers();
  const host = headersList.get("host") ?? "localhost:3000";
  const protocol = host.startsWith("localhost") ? "http" : "https";
  const origin = `${protocol}://${host}`;
  const registerPath = `/register?token=${token}`;
  const manualUrl = `${origin}${registerPath}`;
  const redirectTo = manualUrl;

  const adminClient = createAdminClient();
  if (!adminClient) {
    return {
      manualUrl,
      redirectTo,
      actionUrl: manualUrl,
      usedGeneratedLink: false,
    };
  }

  const { data, error } = await adminClient.auth.admin.generateLink({
    type: "invite",
    email,
    options: {
      redirectTo,
      data: { invitation_token: token },
    },
  });

  if (error || !data.properties?.action_link) {
    console.error("[invite-link] Failed to generate invite action link:", error?.message);
    return {
      manualUrl,
      redirectTo,
      actionUrl: manualUrl,
      usedGeneratedLink: false,
    };
  }

  return {
    manualUrl,
    redirectTo,
    actionUrl: data.properties.action_link,
    usedGeneratedLink: true,
  };
}
