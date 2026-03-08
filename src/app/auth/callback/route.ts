import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const type = searchParams.get("type");
  const next = searchParams.get("next") ?? "/bookings";

  if (code) {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      // Redirect to dedicated password reset page for recovery flow
      if (type === "recovery") {
        return NextResponse.redirect(`${origin}/reset-password/update`);
      }

      if (type === "invite") {
        let invitationToken =
          data.user?.user_metadata?.invitation_token ??
          data.session?.user?.user_metadata?.invitation_token;

        if (!invitationToken) {
          const {
            data: { user },
          } = await supabase.auth.getUser();
          invitationToken = user?.user_metadata?.invitation_token;
        }

        if (typeof invitationToken === "string" && invitationToken.length > 0) {
          return NextResponse.redirect(
            `${origin}/register?token=${encodeURIComponent(invitationToken)}`
          );
        }

        return NextResponse.redirect(`${origin}/register`);
      }

      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth_failed`);
}
