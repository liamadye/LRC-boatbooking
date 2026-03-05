"use client";

import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function PendingApprovalPage() {
  const supabase = createClient();

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
          <CardTitle className="text-2xl">Account Not Found</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-center">
          <p className="text-muted-foreground">
            Your account has not been set up in the Boat Booking Portal.
            Please contact a club administrator to receive an invitation.
          </p>
          <Button variant="outline" onClick={handleSignOut}>
            Sign Out
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
