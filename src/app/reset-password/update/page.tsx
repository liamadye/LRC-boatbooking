"use client";

import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PasswordRequirements } from "@/components/password-requirements";
import { PASSWORD_MIN_LENGTH, validatePassword } from "@/lib/passwords";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { clearAuthRedirectState, getHashAuthParams, hydrateSessionFromHash } from "@/lib/supabase/browser-auth";

export default function UpdatePasswordPage() {
  const searchParams = useSearchParams();
  const authCode = searchParams.get("code");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [sessionReady, setSessionReady] = useState(false);

  const supabase = useMemo(() => createClient(), []);

  useEffect(() => {
    async function waitForSession(expectSession: boolean) {
      const attempts = expectSession ? 8 : 1;

      for (let attempt = 0; attempt < attempts; attempt += 1) {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (session || !expectSession) {
          return session;
        }

        await new Promise((resolve) => setTimeout(resolve, 250));
      }

      return null;
    }

    async function init() {
      const hashState = getHashAuthParams();
      if (hashState.accessToken && hashState.refreshToken) {
        await hydrateSessionFromHash(supabase);
      }

      const expectRecoverySession = !!authCode || hashState.hasHash;

      const session = await waitForSession(expectRecoverySession);
      if (session && expectRecoverySession) {
        clearAuthRedirectState();
      } else if (!session && expectRecoverySession) {
        setError("This password reset link is invalid or has expired. Please request a new one.");
      }
      setSessionReady(true);
    }

    init().catch(() => {
      setError("Failed to prepare the password reset session. Please request a new link.");
      setSessionReady(true);
    });
  }, [authCode, supabase]);

  async function handleUpdate(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const passwordError = validatePassword(password, confirmPassword);
    if (passwordError) {
      setError(passwordError);
      return;
    }

    setLoading(true);

    const { error } = await supabase.auth.updateUser({ password });

    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      setSuccess(true);
      setLoading(false);
      setTimeout(() => {
        window.location.href = "/bookings";
      }, 2000);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-blue-600 text-white text-2xl font-bold">
            LRC
          </div>
          <CardTitle className="text-2xl">Set New Password</CardTitle>
          <p className="text-sm text-muted-foreground mt-1">
            Enter your new password below
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {success ? (
            <div className="text-center space-y-3">
              <p className="text-sm text-green-600">
                Password updated successfully! Redirecting...
              </p>
            </div>
          ) : (
            <form onSubmit={handleUpdate} className="space-y-3">
              {!sessionReady ? (
                <p className="text-sm text-muted-foreground">Preparing reset session...</p>
              ) : null}
              <div>
                <Label htmlFor="password">New Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  minLength={PASSWORD_MIN_LENGTH}
                />
              </div>
              <div>
                <Label htmlFor="confirmPassword">Confirm Password</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  minLength={PASSWORD_MIN_LENGTH}
                />
              </div>
              <PasswordRequirements password={password} />

              {error && <p className="text-sm text-red-600">{error}</p>}

              <Button type="submit" className="w-full" disabled={loading || !sessionReady}>
                {loading ? "Updating..." : "Update Password"}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
