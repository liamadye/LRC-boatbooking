"use client";

import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";

export default function RegisterPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    }>
      <RegisterForm />
    </Suspense>
  );
}

function RegisterForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validating, setValidating] = useState(true);
  const [valid, setValid] = useState(false);
  const [hasSession, setHasSession] = useState(false);

  const supabase = createClient();

  useEffect(() => {
    if (!token) {
      setValidating(false);
      setError("No invitation token provided. Please use the link from your invitation email.");
      return;
    }

    async function init() {
      // Check if user already has a session (from Supabase invite email flow)
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user?.email) {
        setHasSession(true);
        setEmail(session.user.email);
      }

      // Validate the invitation token
      const res = await fetch(`/api/register/validate?token=${token}`);
      const data = await res.json();

      if (data.error) {
        setError(data.error);
      } else {
        setValid(true);
        if (!session?.user?.email) {
          setEmail(data.email);
        }
      }
      setValidating(false);
    }

    init().catch(() => {
      setError("Failed to validate invitation.");
      setValidating(false);
    });
  }, [token]); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (hasSession) {
      // User came via Supabase invite email — already authenticated
      // Set their password so they can log in with email/password in future
      const { error: updateError } = await supabase.auth.updateUser({
        password,
        data: { full_name: fullName },
      });

      if (updateError) {
        setError(updateError.message);
        setLoading(false);
        return;
      }
    } else {
      // Manual link flow — create Supabase auth user
      const { error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: fullName },
        },
      });

      if (signUpError) {
        // If user already exists (from invite), try signing in instead
        if (signUpError.message.includes("already registered")) {
          const { error: signInError } = await supabase.auth.signInWithPassword({
            email,
            password,
          });
          if (signInError) {
            setError("This email was already registered via invite. Please set your password using the invite link from your email.");
            setLoading(false);
            return;
          }
        } else {
          setError(signUpError.message);
          setLoading(false);
          return;
        }
      }
    }

    // Accept the invitation (creates the user profile with correct role/memberType)
    const res = await fetch("/api/register/accept", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, fullName }),
    });

    if (!res.ok) {
      const data = await res.json();
      setError(data.error || "Failed to complete registration.");
      setLoading(false);
      return;
    }

    window.location.href = "/bookings";
  }

  if (validating) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <p className="text-muted-foreground">Validating invitation...</p>
      </div>
    );
  }

  if (!valid) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-blue-600 text-white text-2xl font-bold">
              LRC
            </div>
            <CardTitle className="text-2xl">Invalid Invitation</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-center text-muted-foreground">{error}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-blue-600 text-white text-2xl font-bold">
            LRC
          </div>
          <CardTitle className="text-2xl">Join Leichhardt Rowing Club</CardTitle>
          <p className="text-sm text-muted-foreground mt-1">
            You&apos;ve been invited to the Boat Booking Portal
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <form onSubmit={handleRegister} className="space-y-3">
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                disabled
                className="bg-gray-50"
              />
            </div>
            <div>
              <Label htmlFor="fullName">Full Name</Label>
              <Input
                id="fullName"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Your full name"
                required
              />
            </div>
            <div>
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={hasSession ? "Set your password" : "Choose a password"}
                required
                minLength={6}
              />
            </div>

            {error && (
              <p className="text-sm text-red-600">{error}</p>
            )}

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Creating account..." : "Create Account"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
