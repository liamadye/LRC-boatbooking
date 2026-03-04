"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";

type Application = {
  id: string;
  status: string;
  regattaResults: string | null;
  ergTimes: string | null;
  trainingRegime: string | null;
  racingTargets: string | null;
  equipmentCareNotes: string | null;
  applicant: { id: string; fullName: string; email: string };
};

export function ApplicationReview({
  applications,
}: {
  applications: Application[];
}) {
  const router = useRouter();
  const { toast } = useToast();

  async function handleReview(applicationId: string, status: "approved" | "denied") {
    const res = await fetch(`/api/admin/applications/${applicationId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });

    if (res.ok) {
      toast({
        title: status === "approved" ? "Application approved" : "Application denied",
      });
      router.refresh();
    }
  }

  if (applications.length === 0) {
    return (
      <p className="text-muted-foreground mt-4">No pending applications.</p>
    );
  }

  return (
    <div className="space-y-4 mt-4">
      {applications.map((app) => (
        <Card key={app.id}>
          <CardHeader>
            <CardTitle className="text-base">
              {app.applicant.fullName}
              <span className="text-sm font-normal text-muted-foreground ml-2">
                {app.applicant.email}
              </span>
              <Badge variant="secondary" className="ml-2">
                Pending
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {app.regattaResults && (
              <div>
                <strong>Regatta Results:</strong> {app.regattaResults}
              </div>
            )}
            {app.ergTimes && (
              <div>
                <strong>Erg Times:</strong> {app.ergTimes}
              </div>
            )}
            {app.trainingRegime && (
              <div>
                <strong>Training Regime:</strong> {app.trainingRegime}
              </div>
            )}
            {app.racingTargets && (
              <div>
                <strong>Racing Targets:</strong> {app.racingTargets}
              </div>
            )}
            {app.equipmentCareNotes && (
              <div>
                <strong>Equipment Care:</strong> {app.equipmentCareNotes}
              </div>
            )}

            <div className="flex gap-2 pt-2">
              <Button
                onClick={() => handleReview(app.id, "approved")}
                size="sm"
              >
                Approve
              </Button>
              <Button
                variant="destructive"
                onClick={() => handleReview(app.id, "denied")}
                size="sm"
              >
                Deny
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
