"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getHashAuthParams, hydrateSessionFromHash } from "@/lib/supabase/browser-auth";

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={<AuthCallbackLoading />}>
      <AuthCallbackHandler />
    </Suspense>
  );
}

function AuthCallbackLoading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-blue-600 text-white text-2xl font-bold">
            LRC
          </div>
          <CardTitle className="text-2xl">Completing sign-in</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-center text-muted-foreground">Please wait...</p>
        </CardContent>
      </Card>
    </div>
  );
}

function AuthCallbackHandler() {
  const searchParams = useSearchParams();
  const code = searchParams.get("code");
  const queryType = searchParams.get("type");
  const next = searchParams.get("next") ?? "/bookings";
  const supabase = useMemo(() => createClient(), []);

  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState("Completing sign-in...");

  useEffect(() => {
    let finished = false;

    const flowType = queryType ?? getHashAuthParams().type;

    function redirectTo(path: string) {
      if (finished) {
        return;
      }

      finished = true;
      window.location.replace(path);
    }

    function isRecoverablePkceExchangeError(error: unknown) {
      if (!(error instanceof Error)) {
        return false;
      }

      if ("code" in error && error.code === "pkce_code_verifier_not_found") {
        return true;
      }

      return error.message.includes("PKCE code verifier not found in storage");
    }

    async function finishWithSession() {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (flowType === "recovery") {
        redirectTo("/reset-password/update");
        return;
      }

      if (flowType === "invite") {
        const invitationToken = session?.user?.user_metadata?.invitation_token;
        redirectTo(
          typeof invitationToken === "string" && invitationToken.length > 0
            ? `/register?token=${encodeURIComponent(invitationToken)}`
            : "/register"
        );
        return;
      }

      if (session) {
        redirectTo(next);
        return;
      }

      throw new Error("No active session was created.");
    }

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (finished) {
        return;
      }

      if (
        (event === "SIGNED_IN" || event === "PASSWORD_RECOVERY" || event === "INITIAL_SESSION") &&
        (session || flowType === "recovery")
      ) {
        void finishWithSession().catch((callbackError) => {
          if (!finished) {
            setError(
              callbackError instanceof Error
                ? callbackError.message
                : "Failed to complete sign-in."
            );
          }
        });
      }
    });

    async function init() {
      try {
        if (code) {
          setStatus("Exchanging sign-in code...");
          const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
          if (exchangeError) {
            const {
              data: { session },
            } = await supabase.auth.getSession();

            if (session && isRecoverablePkceExchangeError(exchangeError)) {
              await finishWithSession();
              return;
            }

            throw exchangeError;
          }
          await finishWithSession();
          return;
        }

        const { hydrated, hasHashType } = await (async () => {
          const hash = getHashAuthParams();
          if (!hash.hasHash) {
            return { hydrated: false, hasHashType: false };
          }

          await hydrateSessionFromHash(supabase);
          return { hydrated: true, hasHashType: !!hash.type };
        })();

        if (hydrated || hasHashType) {
          setStatus("Preparing your session...");
          for (let attempt = 0; attempt < 12 && !finished; attempt += 1) {
            const {
              data: { session },
            } = await supabase.auth.getSession();

            if (session || flowType === "recovery") {
              await finishWithSession();
              return;
            }

            await new Promise((resolve) => setTimeout(resolve, 250));
          }

          throw new Error("This sign-in link is invalid or has expired.");
        }

        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (session) {
          await finishWithSession();
          return;
        }

        throw new Error("No sign-in credentials were provided.");
      } catch (callbackError) {
        if (!finished) {
          setError(
            callbackError instanceof Error
              ? callbackError.message
              : "Failed to complete sign-in."
          );
        }
      }
    }

    void init();

    return () => {
      finished = true;
      subscription.unsubscribe();
    };
  }, [code, next, queryType, supabase]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-blue-600 text-white text-2xl font-bold">
            LRC
          </div>
          <CardTitle className="text-2xl">Completing sign-in</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-center">
          {error ? (
            <>
              <p className="text-sm text-red-600">{error}</p>
              <div className="text-sm">
                <Link href="/login" className="text-blue-600 hover:underline">
                  Return to login
                </Link>
              </div>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">{status}</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
