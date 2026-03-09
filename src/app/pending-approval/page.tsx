"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type PendingStatus =
  | "loading"
  | "pending"
  | "approved"
  | "denied"
  | "needs_invite"
  | "error";

type StatusResponse = {
  status: PendingStatus | "needs_request";
  email?: string;
  error?: string;
};

export default function PendingApprovalPage() {
  const supabase = useMemo(() => createClient(), []);
  const [status, setStatus] = useState<PendingStatus>("loading");
  const [message, setMessage] = useState("Checking your club access...");

  useEffect(() => {
    let cancelled = false;
    let intervalId: ReturnType<typeof setInterval> | null = null;

    async function refreshStatus(method: "GET" | "POST") {
      const res = await fetch("/api/signup-requests/me", {
        method,
        cache: "no-store",
      });

      const data = (await res.json()) as StatusResponse;
      if (cancelled) {
        return;
      }

      if (!res.ok) {
        setStatus("error");
        setMessage(data.error ?? "Could not determine your access status.");
        return;
      }

      if (data.status === "approved") {
        setStatus("approved");
        setMessage("Access approved. Taking you to bookings...");
        window.location.replace("/bookings");
        return;
      }

      if (data.status === "denied") {
        setStatus("denied");
        setMessage("Your Google sign-in request was denied. Please contact a club administrator.");
        return;
      }

      if (data.status === "pending") {
        setStatus("pending");
        setMessage(
          `Your Google sign-in${data.email ? ` for ${data.email}` : ""} is waiting for admin approval and squad assignment.`
        );
        return;
      }

      setStatus("needs_invite");
      setMessage("Your account does not have portal access yet. Ask an administrator to invite or approve you.");
    }

    void refreshStatus("POST");
    intervalId = setInterval(() => {
      void refreshStatus("GET");
    }, 10000);

    return () => {
      cancelled = true;
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, []);

  async function handleSignOut() {
    await supabase.auth.signOut();
    window.location.href = "/login";
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-blue-600 text-white text-2xl font-bold">
            LRC
          </div>
          <CardTitle className="text-2xl">
            {status === "pending" ? "Awaiting Approval" : status === "denied" ? "Access Denied" : "Account Setup"}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-center">
          <p className="text-muted-foreground">{message}</p>
          {status === "pending" && (
            <p className="text-xs text-muted-foreground">
              This page checks automatically. Once approved, you will be redirected into the portal.
            </p>
          )}
          <div className="flex flex-col gap-2 sm:flex-row sm:justify-center">
            <Button
              variant="outline"
              onClick={() => window.location.reload()}
              disabled={status === "loading" || status === "approved"}
            >
              Refresh status
            </Button>
            <Button variant="outline" onClick={handleSignOut}>
              Sign Out
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
